import type { Identite } from '../conversation/actions'
import { type ConfigConversation, prixDe } from '../conversation/config'
import { FRONTIERE } from '../conversation/traduire'
import type { Evenement, Journal } from '../journal/journal'
import { evenementAppel } from '../modele/compteur'
import { cout, type Modele, USAGE_NUL } from '../modele/modele'
import type { Temporal } from '../temps/temporal'
import { boucle, type EvenementBoucle, type IssueEchappee, type OutilsEchappee } from './boucle'
import { creerCopie, type TableCopie } from './copie'
import { executerRequete } from './requete'

// Le point d'entrée de l'échappée : la copie des données à l'échelle du rôle,
// le système, la boucle, et ce qui en reste au journal (chaque appel, chaque
// outil, l'issue). La copie est détruite à la fin, quoi qu'il arrive
// (PLAN-ESPACES.md § 6.5 et § 6.7).

export const TYPE_OUTIL_ECHAPPEE = 'outil_echappee'
export const TYPE_ECHAPPEE = 'echappee'

/** Où l'échappée tourne : chez quel client, dans quelle conversation, pour qui. */
export interface CadreEchappee {
  client: string
  conversation: string
  journal: Journal
  config: ConfigConversation
  /** « le patron », « l'agent Julien Lefèvre (A-2) » */
  quiParle: string
}

/** Ce que le métier fournit à une échappée. */
export interface EchappeeDuMetier<Modif> {
  tables: TableCopie[]
  outils: Omit<OutilsEchappee<Modif>, 'requete'>
  /** Les interdits codés, ceux qu'une proposition doit respecter. */
  regles: { id: string; nom: string }[]
  /** Les préférences du patron, en mots : des critères de qualité, pas de validité. */
  preferences: string
  /** Les noms des personnes visibles : ceux qu'une réponse cite doivent venir des données. */
  nomsConnus: string[]
}

/** Le signature d'une échappée telle que la conversation l'appelle. */
export type Echappee<Session> = (
  s: Session,
  identite: Identite,
  conversation: string,
  consigne: string,
  intention: string,
  maintenant: Temporal.ZonedDateTime,
  modele: Modele,
) => Promise<IssueEchappee>

/** Le motif d'une ligne de journal : l'entrée d'un outil, tronquée. */
export const MOTIF_MAX = 300

export function systemeEchappee(
  quiParle: string,
  tables: string,
  regles: { id: string; nom: string }[],
  preferences: string,
  proposer: boolean,
): string {
  return [
    `Tu travailles pour ${quiParle} sur une copie de ses données. Rien de ce que tu fais ne modifie quoi que ce soit : tu proposes, une personne décide.`,
    '',
    'Tu ne calcules rien de tête. Chaque chiffre de ta réponse vient d’un résultat de requete : fais faire les sommes et les comptes par SQL. Si tu n’as pas la donnée, tu le dis. Recopie les nombres, les dates et les heures tels que les résultats les écrivent.',
    proposer
      ? 'Tu finis toujours par repondre, proposer ou abandonner. Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.'
      : 'Tu finis toujours par repondre ou abandonner. Tu ne peux rien proposer de changer.',
    '',
    'Les tables (SQLite) :',
    tables,
    ...(proposer
      ? [
          '',
          'Les règles qu’une proposition doit respecter :',
          ...regles.map((r) => `- ${r.id} — ${r.nom}`),
          'verifier te dit ce qu’une modification enfreint ; une proposition qui enfreint une règle est refusée.',
          '',
          `Les préférences du patron, pour choisir entre des propositions qui respectent toutes les règles : ${preferences}.`,
        ]
      : []),
    '',
    FRONTIERE,
  ].join('\n')
}

const tronquer = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s)

export async function echappee<Modif>(
  cadre: CadreEchappee,
  metier: EchappeeDuMetier<Modif>,
  consigne: string,
  intention: string,
  maintenant: Temporal.ZonedDateTime,
  modele: Modele,
): Promise<IssueEchappee> {
  const horodatage = maintenant.toInstant().toString()
  const prix = prixDe(cadre.config)
  const ecrire = (e: Omit<Evenement, 'client' | 'objet'>) =>
    cadre.journal.ecrire([{ ...e, client: cadre.client, objet: cadre.conversation }], horodatage)
  const journaliser = (e: EvenementBoucle) => {
    if (e.sorte === 'appel') {
      cadre.journal.ecrire(
        [evenementAppel(cadre.client, cadre.conversation, 'echappee', e.tour, e.reponse, prix)],
        horodatage,
      )
      return
    }
    ecrire({
      type: TYPE_OUTIL_ECHAPPEE,
      issue: e.nom,
      motif: tronquer(JSON.stringify(e.entree), MOTIF_MAX),
      donnees: {
        tour: e.tour,
        entree: e.entree,
        sortie: e.sortie,
        ...(e.erreur !== undefined ? { erreur: e.erreur } : {}),
      },
    })
  }

  let copie: ReturnType<typeof creerCopie> | undefined
  try {
    copie = creerCopie(metier.tables)
    const ouverte = copie
    const { plafonds, modele: m } = cadre.config
    const issue = await boucle(
      modele,
      m.effort.echappee,
      systemeEchappee(
        cadre.quiParle,
        ouverte.description,
        metier.regles,
        metier.preferences,
        metier.outils.proposer,
      ),
      consigne,
      intention,
      maintenant,
      { ...metier.outils, requete: (sql) => executerRequete(ouverte, sql) },
      {
        tours: plafonds.par_demande.tours,
        tokensSortie: plafonds.par_demande.tokens_sortie,
        secondes: plafonds.par_demande.secondes,
      },
      journaliser,
      [],
      metier.nomsConnus,
    )
    ecrire({
      type: TYPE_ECHAPPEE,
      issue: issue.sorte,
      motif: consigne,
      donnees: {
        intention,
        tours: issue.tours,
        usage: issue.usage,
        cout_usd: cout(issue.usage, prix),
        ...(issue.sorte === 'abandon' ? { abandon: issue.motif } : {}),
        ...(issue.sorte === 'proposition'
          ? { modifications: issue.modifications, constats: issue.constats }
          : {}),
        ...(issue.sorte === 'reponse' ? { controle_reponse: issue.controle } : {}),
      },
    })
    return issue
  } catch (erreur) {
    // Une échappée qui n'a pas pu tourner reste au journal, comptée comme un abandon.
    ecrire({
      type: TYPE_ECHAPPEE,
      issue: 'abandon',
      motif: consigne,
      donnees: {
        intention,
        tours: 0,
        usage: USAGE_NUL,
        cout_usd: 0,
        abandon: (erreur as Error).message,
      },
    })
    throw erreur
  } finally {
    copie?.fermer()
  }
}
