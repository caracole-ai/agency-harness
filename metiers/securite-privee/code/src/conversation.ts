import { join } from 'node:path'
import {
  type Choix,
  type ConfigConversation,
  type CriteresProposition,
  chargerConfig,
  type DemandeTableau,
  echappee,
  FICHIER_CONFIG,
  type Identite,
  type Intention,
  Journal,
  type Ligne,
  type MetierConversation,
  quiParle,
} from '@harnais/moteur'
import { z } from 'zod'
import { ACTIONS, aDecider } from './actions'
import { CONTROLES } from './controles'
import { tablesPour } from './copie'
import { DOMAINE } from './domaine'
import { constatsNouveaux, decrireModifications, Modification } from './modifications'
import { OPERATION_REAFFECTER } from './operation-reaffecter'
import {
  corrigerReaffectation,
  ouvrirReaffectation,
  reaffectation,
  reaffectationFinie,
  STATUT_R,
  statutReaffectation,
  validerReaffectation,
} from './reaffectation'
import {
  absentDe,
  evaluer,
  ouvrir,
  remplacantDe,
  remplacementFini,
  type Session,
  STATUT,
  statut,
  TYPE_DELEGATION_PROPOSEE,
  titreRemplacement,
  vacationDe,
} from './remplacement'
import { ROLES } from './roles'
import { ConfigSecurite, decrire, type PREFERENCES, vacationEnBref } from './veille'

// Ce que la sécurité privée fournit à la conversation : ouvrir un client (ou
// son journal seul), ses gestes, les personnes que chaque rôle peut désigner
// (jamais montrées au modèle de traduction), et la cohérence
// de qui parle avec ses données (PLAN-ESPACES.md § 5.6). Qui a le droit de
// parler, c'est le registre d'accès du harnais qui le dit (REFLEXIONS.md, décidé le 2026-10-08).

/**
 * Les préférences du patron, dites en mots pour le modèle, comme
 * `remplacement.ts` les calcule : sans la définition, deux échappées lisent
 * « la semaine » à leur façon et choisissent deux remplaçants (2026-10-14).
 */
const PREFERENCES_EN_MOTS: Record<(typeof PREFERENCES)[number], string> = {
  connait_site:
    'un agent qui connaît déjà le site (il y a fait une vacation, finie avant le début de celle-ci)',
  moins_d_heures_semaine:
    "celui qui a le moins d'heures dans la semaine de la vacation (ses autres vacations, comptées du lundi 0 h au lundi suivant 0 h)",
}

/**
 * Le départage déclaré quand les préférences laissent des agents à égalité :
 * sans lui, chaque échappée prend un des ex æquo, et un geste appris ne peut
 * pas reproduire ce choix (`liberer_un_jour`, 2026-10-14). Par identifiant, pas
 * par nom : le modèle ne voit que les identifiants.
 */
const DEPARTAGE = "à égalité, le numéro d'agent le plus bas (A-2 avant A-10)"

/**
 * Les sortes de demandes nouvelles déjà connues : le mot-clé que le modèle
 * réutilise, pour que la ronde et le compte des demandes sans geste voient la
 * même demande sous le même mot. Liste écrite à la main depuis les cas des
 * évals ; une intention devenue geste en sort, une intention nouvelle qui
 * revient y entre.
 */
export const INTENTIONS: Intention[] = [
  {
    id: 'compter_vacations',
    description: 'compter des vacations (de nuit, par site, par agent)',
    ecrit: false,
  },
  {
    id: 'qui_travaille',
    description: 'qui tient un poste ou un site, un jour donné',
    ecrit: false,
  },
  {
    id: 'agents_disponibles',
    description: 'les agents sans vacation sur une période',
    ecrit: false,
  },
  {
    id: 'agents_sans_carte',
    description: 'les agents dont la carte professionnelle n’est pas renseignée',
    ecrit: false,
  },
  {
    id: 'cartes_expirees',
    description: 'les agents dont la carte professionnelle est expirée',
    ecrit: false,
  },
  {
    id: 'liberer_un_jour',
    description: 'libérer un agent de ses vacations d’une journée',
    ecrit: true,
  },
  { id: 'reorganiser_semaine', description: 'refaire la semaine d’un agent', ecrit: true },
  { id: 'reaffecter_vacation', description: 'donner une vacation à un autre agent', ecrit: true },
  // Les deux simulations demandent les règles, pas une requête : elles ne
  // s'écrivent pas en geste appris, mais elles ne modifient rien (P15).
  {
    id: 'simuler_changement_de_site',
    description: 'et si un agent passait sur un autre site',
    ecrit: false,
  },
  {
    id: 'simuler_absence',
    description: 'une absence hypothétique, longue : qui pourrait reprendre les vacations',
    ecrit: false,
  },
]

/** Les autres possibles de chaque vacation d'une proposition, dans l'ordre des préférences, l'agent proposé exclu. */
function autresPossibles(s: Session, id: string, modifications: Modification[]) {
  return modifications.map((m) => {
    const v = s.ctx.planning.vacations.find((x) => x.id === m.vacation)
    if (!v) throw new Error(`vacation ${m.vacation} inconnue`)
    return { vacation: m.vacation, possibles: evaluer(s, id, v, [m.agent]).possibles }
  })
}

/** Chaque autre possible d'une proposition, à prendre d'un clic : `changer_remplacant`, sans modèle (PLAN-CHOIX.md, lot 3). */
const choixProposition = (s: Session, id: string): Choix[] =>
  statutReaffectation(s, id) !== STATUT_R.recue
    ? []
    : autresPossibles(s, id, reaffectation(s, id).modifications).flatMap(
        ({ vacation, possibles }) =>
          possibles.map((c) => ({
            libelle: `Prendre ${c.nom} pour ${vacation}`,
            action: 'changer_remplacant',
            params: { demande: id, vacation, jour: null, agent: c.agent },
          })),
      )

/** Le texte d'une proposition, rendu par le code : ce qui change, les autres possibles de chaque vacation, ce qui reste à décider. */
function decrireProposition(
  s: Session,
  id: string,
  modifications: Modification[],
  remplace?: string,
): string {
  const autres = autresPossibles(s, id, modifications).map(({ vacation, possibles }) => {
    const noms = possibles.map((c) => c.nom)
    return `${vacation} — autres possibles : ${noms.length > 0 ? noms.join(', ') : 'aucun'}`
  })
  const aVerifier = constatsNouveaux(s, modifications).filter((c) => c.verdict === 'à vérifier')
  return [
    `Proposition ${id}${remplace !== undefined ? ` (remplace ${remplace})` : ''}`,
    decrireModifications(s, modifications),
    '',
    ...autres,
    ...(aVerifier.length > 0
      ? [
          '',
          `À décider par l'exploitation : ${aVerifier.map((c) => `${c.objet} : ${c.motif}`).join(' ; ')}`,
        ]
      : []),
  ].join('\n')
}

// Ce que l'interface montre de la sécurité privée (PLAN-METIER-2.md § 3.6,
// M10) : déplacé de `interface/src/app.ts` et `interface/public`.

/** Des exemples de consignes, à cliquer : pour une démo, ils montrent ce que l'outil comprend. */
const SUGGESTIONS: Record<string, string[]> = {
  patron: [
    'Aïcha ne vient pas demain',
    'Montre-moi le planning de Karim cette semaine',
    'Quelles échéances arrivent ?',
    'Lance la veille',
  ],
  agent: ['Mon planning de la semaine', 'Mes titres', 'Je ne pourrai pas venir demain'],
}

/** Les conditions d'une délégation de remplacement, dites en mots (catalogue du métier, veille.ts) ; `{v}` est la valeur. */
const CONDITIONS: Record<string, string> = {
  connait_site: 'le remplaçant connaît déjà le site',
  prevenu_avant_heures: "l'absence est signalée au moins {v} h avant la vacation",
}

const conditions = (c: Record<string, boolean | number> | undefined) =>
  Object.entries(c ?? {}).map(([k, v]) => CONDITIONS[k]?.replace('{v}', String(v)) ?? `${k} : ${v}`)

/** Ce qu'une délégation de remplacement ne lève pas (remplacement.ts : proposer, solliciter, ecrire). */
const INCHANGE = [
  'Les règles écartent toujours qui ne peut pas remplacer',
  'Le remplaçant doit toujours accepter avant que le planning change',
  'Hors de ces conditions, la décision vous revient',
]

/** Le remplacement réussi d'où vient une délégation proposée : qui, pour qui, quand et où. */
function apresRemplacement(s: Session, demande: string): string {
  const remplacant = remplacantDe(s, demande)
  const quiPourQui =
    remplacant === undefined
      ? titreRemplacement(s, demande)
      : `${s.ctx.agent(remplacant).nom} pour ${s.ctx.agent(absentDe(s, demande)).nom}`
  return `Après ce remplacement réussi : ${quiPourQui}, ${vacationEnBref(s.ctx, vacationDe(s, demande).id)}.`
}

const nomDe = (s: Session, identite: Identite) =>
  identite.role === 'patron' ? 'le patron' : s.ctx.agent(identite.personne ?? '').nom

/** Les demandes de remplacement (D-) et de réaffectation (R-) qui ne sont pas finies, les plus récentes d'abord. */
function demandesEnCours(s: Session, lignes: Ligne[]): DemandeTableau[] {
  const ids = [
    ...new Set(
      lignes
        .map((l) => l.objet)
        .filter((o): o is string => o !== null && (o.startsWith('D-') || o.startsWith('R-'))),
    ),
  ].reverse()
  const derniere = (id: string) => s.journal.historique(id).at(-1)
  /** La description, puis le motif de la dernière étape : la proposition, le message envoyé… */
  const texte = (description: string, id: string) =>
    [description, derniere(id)?.motif ?? ''].filter((t) => t !== '').join('\n')
  return ids.flatMap((id): DemandeTableau[] => {
    if (id.startsWith('D-')) {
      const st = statut(s, id)
      if (st === undefined || remplacementFini(s, id)) return []
      const quandOu = vacationEnBref(s.ctx, vacationDe(s, id).id)
      // Proposée : la décision porte le proposé ; ailleurs, le motif de la dernière étape suit.
      const { phrase, choix, replis } = aDecider(s, id)
      return [
        {
          id,
          sorte: 'remplacement',
          titre: titreRemplacement(s, id),
          statut: st,
          texte:
            st === STATUT.proposee
              ? [quandOu, phrase].filter((t) => t !== undefined).join('\n')
              : texte(quandOu, id),
          depuis: derniere(id)?.horodatage ?? '',
          choix,
          replis,
        },
      ]
    }
    const st = statutReaffectation(s, id)
    if (st === undefined || reaffectationFinie(s, id)) return []
    return [
      {
        id,
        sorte: 'réaffectation',
        statut: st,
        texte: texte(decrireModifications(s, reaffectation(s, id).modifications), id),
        depuis: derniere(id)?.horodatage ?? '',
      },
    ]
  })
}

/** Les règles codées et les préférences du client : l'échappée qui propose les montre, la fabrication d'un geste qui écrit aussi. */
const criteres = (s: Session): CriteresProposition => {
  const codees = new Set(CONTROLES.map((c) => c.regle))
  const preferences = (s.config.remplacement?.preferences ?? []).map((p) => PREFERENCES_EN_MOTS[p])
  return {
    regles: s.registre.interdits
      .filter((i) => codees.has(i.id))
      .map((i) => ({ id: i.id, nom: i.nom })),
    preferences: `${preferences.length > 0 ? `d'abord ${preferences.join(', puis ')} ; ` : ''}${DEPARTAGE}`,
  }
}

const configDe = (s: Pick<Session, 'dossier' | 'config'>): ConfigConversation => {
  if (!s.config.conversation) {
    throw new Error(`${s.dossier} : la config n'a pas de section « conversation »`)
  }
  return s.config.conversation
}

export const CONVERSATION: MetierConversation<Session> = {
  ouvrir: (dossier) => {
    const s = ouvrir(dossier)
    try {
      configDe(s)
    } catch (erreur) {
      s.journal.fermer()
      throw erreur
    }
    return s
  },
  fermer: (s) => s.journal.fermer(),
  config: configDe,
  client: (s) => s.config.client,
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => {
    const config = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigSecurite)
    const conversation = configDe({ dossier, config })
    return {
      client: config.client,
      journal: new Journal(join(dossier, config.journal)),
      config: conversation,
    }
  },
  actions: ACTIONS,
  intentions: INTENTIONS,
  roles: ROLES,
  domaine: DOMAINE,
  operation: OPERATION_REAFFECTER,
  vocabulaire: (s, identite) => ({
    noms: s.ctx.planning.agents
      .filter((a) => identite.role === 'patron' || a.id === identite.personne)
      .map((a) => ({ id: a.id, nom: a.nom, sorte: 'personne' })),
  }),
  noms: (s) => s.ctx.planning.agents.map((a) => ({ id: a.id, nom: a.nom, sorte: 'personne' })),
  verifierIdentite: (s, identite: Identite) => {
    if (identite.role === 'agent') s.ctx.agent(identite.personne ?? '')
  },
  proposition: {
    ouvrir: (s, conversation, modifications, maintenant, corrige) => {
      const modifs = z.array(Modification).parse(modifications)
      const { id } =
        corrige === undefined
          ? ouvrirReaffectation(s, conversation, modifs, maintenant)
          : corrigerReaffectation(s, corrige, modifs, maintenant)
      return { id, texte: decrireProposition(s, id, modifs, corrige) }
    },
    valider: (s, id, maintenant) => {
      const { messages } = validerReaffectation(s, id, maintenant)
      return `Validé. Message envoyé à ${messages.length} agent(s) : ${messages.map((m) => `« ${m} »`).join(' ; ')}`
    },
    criteres,
    choix: choixProposition,
  },
  echappee: (s, identite, conversation, consigne, intention, maintenant, modele, precisions) => {
    const personne = (a: { id: string; nom: string }) => ({
      id: a.id,
      nom: a.nom,
      sorte: 'personne' as const,
    })
    const visibles = s.ctx.planning.agents.filter(
      (a) => identite.role === 'patron' || a.id === identite.personne,
    )
    return echappee(
      {
        client: s.config.client,
        conversation,
        journal: s.journal,
        config: configDe(s),
        identite,
        quiParle: quiParle(ROLES, identite),
        domaine: DOMAINE,
      },
      {
        tables: tablesPour(s, identite, maintenant),
        outils: {
          schemaModifications: z.array(Modification),
          verifier: (modifications) => ({
            constats: constatsNouveaux(s, modifications),
            description: decrireModifications(s, modifications),
          }),
          decrire: (modifications) => decrireModifications(s, modifications),
          nomRegle: (id) => s.registre.interdits.find((i) => i.id === id)?.nom ?? id,
          proposer: identite.role === 'patron',
        },
        ...criteres(s),
        personnes: visibles.map(personne),
        toutes: s.ctx.planning.agents.map(personne),
      },
      consigne,
      intention,
      maintenant,
      modele,
      precisions,
    )
  },
  // Un titre d'agent (`A-4/carte`), une vacation (`V-05`), une demande de remplacement (`D-V-17`).
  nommer: (s, objet) => {
    if (objet.startsWith('D-')) {
      try {
        return `${titreRemplacement(s, objet)} · ${vacationEnBref(s.ctx, vacationDe(s, objet).id)}`
      } catch {
        return undefined
      }
    }
    const v = s.ctx.planning.vacations.find((x) => x.id === objet)
    if (v) return `${s.ctx.agent(v.agent).nom} · ${vacationEnBref(s.ctx, v.id)}`
    const [agent, titre] = objet.split('/')
    if (titre !== undefined && s.ctx.planning.agents.some((a) => a.id === agent)) {
      return decrire(s.ctx, objet)
    }
    return undefined
  },
  tableau: (s, identite) => {
    const lignes = s.journal.lire()
    const nom = nomDe(s, identite)
    return {
      demandes: demandesEnCours(s, lignes),
      // Les délégations proposées au patron, après un remplacement réussi.
      enAttente: lignes
        .filter((l) => l.type === TYPE_DELEGATION_PROPOSEE)
        .reverse()
        .map((l) => {
          const d = l.donnees
            ? (JSON.parse(l.donnees) as { conditions: Record<string, boolean | number> })
            : undefined
          const demande = l.objet ?? ''
          return {
            id: demande,
            titre: 'Solliciter le remplaçant proposé sans attendre votre oui',
            texte: apresRemplacement(s, demande),
            depuis: l.horodatage,
            replis: [
              {
                titre: 'Seulement quand',
                lignes: conditions(d?.conditions).map((c) => ({
                  titre: c.charAt(0).toUpperCase() + c.slice(1),
                })),
                ouvert: true,
              },
              {
                titre: 'Ce qui ne change pas',
                lignes: INCHANGE.map((c) => ({ titre: c })),
                ouvert: true,
              },
            ],
          }
        }),
      nom,
      textes: {
        suggestions: SUGGESTIONS[identite.role] ?? [],
        accueil:
          identite.role === 'patron'
            ? 'Bonjour. Dites-moi ce qui se passe, avec vos mots : une absence, un planning à voir, une échéance.\nCe qui touche au planning attend toujours votre oui.'
            : `Bonjour ${nom.split(' ')[0]}. Vous pouvez voir votre planning, vos titres, déclarer une absence ou répondre à une demande.`,
        vide: 'Une absence déclarée ouvre une demande de remplacement, suivie ici jusqu’au planning mis à jour.',
        conditions: CONDITIONS,
      },
    }
  },
  registre: (s) => s.registre,
}
