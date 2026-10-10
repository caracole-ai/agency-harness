import { stringify } from 'yaml'
import { prixDe } from '../conversation/config'
import type { MetierConversation } from '../conversation/conversation'
import type { BilanTraduction } from '../evals/traduction'
import { ISSUE_GESTE, lireFichiersGestes, TYPE_GESTE_APPRIS } from '../gestes/charger'
import { empreinteGeste, type GesteAppris } from '../gestes/geste-appris'
import { coutDuMois, evenementAppel, plafondAtteint } from '../modele/compteur'
import { cout, type Modele } from '../modele/modele'
import type { Temporal } from '../temps/temporal'
import { copieVideDe, journaliserVerification } from './atelier'
import { APRES_RELANCE, ecrireGeste, fabriquerGeste } from './fabriquer'
import {
  debutFenetre,
  echappeesDe,
  ecrireDossier,
  type Fabrication,
  type IntentionComptee,
} from './promotion'

// Ce que `pnpm promotions` fait d'une intention au seuil (PLAN-PROMOTION.md
// § 6.3) : hors du catalogue ou une intention qui écrit, rien que le dossier
// (P15) ; sinon la fabrication (relance comprise), la vérification en code,
// l'écriture du geste au statut `propose` si zéro écart, puis la passe de
// traduction avec modèle, parce que c'est le patron qui active (P6) : il ne
// doit voir que du vérifié. Tout est dit au dossier et au journal.

export interface OptionsPromotion {
  /** Absent (`--sans-modele`) : le dossier seul, sans fabrication. */
  modele?: Modele
  /** La passe de traduction avec modèle sur le geste écrit ; absente (évals de fabrication), le geste reste proposé, non activable. */
  traduction?: (geste: GesteAppris, fichier: string) => Promise<BilanTraduction>
}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/**
 * Une intention au seuil : fabrique, vérifie, écrit, mesure la traduction
 * (selon les options), puis écrit le dossier et la ligne `promotion proposée`.
 * Rend le chemin du dossier et ce que la fabrication a donné.
 */
export async function promouvoir<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  i: IntentionComptee,
  maintenant: Temporal.ZonedDateTime,
  fenetreJours: number,
  options: OptionsPromotion,
): Promise<{ dossier: string; fabrication?: Fabrication }> {
  const journal = m.journal(s)
  const client = m.client(s)
  const { modele } = options
  if (!modele) {
    return { dossier: ecrireDossier(dossierClient, client, i, journal, maintenant, fenetreJours) }
  }
  const fabrication = await fabriquer(
    m,
    s,
    dossierClient,
    i,
    maintenant,
    fenetreJours,
    modele,
    options,
  )
  return {
    dossier: ecrireDossier(
      dossierClient,
      client,
      i,
      journal,
      maintenant,
      fenetreJours,
      fabrication,
    ),
    fabrication,
  }
}

async function fabriquer<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  i: IntentionComptee,
  maintenant: Temporal.ZonedDateTime,
  fenetreJours: number,
  modele: Modele,
  options: OptionsPromotion,
): Promise<Fabrication> {
  const journal = m.journal(s)
  const client = m.client(s)
  const config = m.config(s)
  const prix = prixDe(config)
  const horodatage = maintenant.toInstant().toString()
  const sans = (sorte: Fabrication['sorte'], raison?: string): Fabrication => ({
    sorte,
    relance: false,
    ...(raison !== undefined ? { raison } : {}),
    cout_usd: 0,
  })

  const intention = m.intentions.find((x) => x.id === i.intention)
  if (!intention) return sans('hors_catalogue')
  if (intention.ecrit) return sans('attend_lot_4')
  const mois = maintenant.toPlainDate().toPlainYearMonth().toString()
  if (plafondAtteint(coutDuMois(journal, mois).usd, config.plafonds.par_mois_usd)) {
    return sans('plafond')
  }

  const echappees = echappeesDe(journal, i.intention, debutFenetre(maintenant, fenetreJours))
  const copieVide = copieVideDe(
    dossierClient,
    echappees.map((e) => e.instantane),
  )
  if (!copieVide) return sans('echec', 'aucun instantané lisible')
  const gestesExistants = [
    ...m.actions.map((a) => ({ id: a.id, description: a.description })),
    ...lireFichiersGestes(dossierClient).flatMap((f) =>
      f.contenu && f.contenu.statut !== 'retire'
        ? [{ id: f.contenu.id, description: f.contenu.description }]
        : [],
    ),
  ]

  const issue = await fabriquerGeste({
    modele,
    effort: config.modele.effort.echappee,
    maxTokens: config.plafonds.par_demande.tokens_sortie,
    intention,
    echappees,
    gestesExistants,
    personnes: m.vocabulaire(s, { role: 'patron' }).agents,
    dossierClient,
    copieVide,
    fabriqueLe: maintenant.toPlainDate().toString(),
    cout: (usage) => cout(usage, prix),
    journaliser: (reponse, relance) => {
      const e = evenementAppel(client, i.intention, 'fabriquer', relance ? 2 : 1, reponse, prix)
      journal.ecrire(
        [{ ...e, donnees: { ...(e.donnees as Record<string, unknown>), relance } }],
        horodatage,
      )
    },
  })
  const cout_usd = cout(issue.usage, prix)
  const borne = issue.usageBorne ? { cout_borne: true as const } : {}
  if (issue.sorte === 'echec') {
    return {
      sorte: 'echec',
      relance: issue.relance,
      raison: issue.raison,
      cout_usd,
      ...borne,
      ...(issue.injoignable ? { injoignable: true as const } : {}),
    }
  }
  if (issue.sorte === 'ecarts') {
    return {
      sorte: 'ecarts',
      relance: issue.relance,
      ecarts: issue.ecarts.map((e) => e.texte),
      rejeu: issue.rejeu,
      proposition: stringify(issue.propose),
      cout_usd,
      ...borne,
    }
  }

  const { geste } = issue
  const fichier = ecrireGeste(dossierClient, geste)
  const jeton = empreinteGeste(geste)
  journal.ecrire(
    [
      {
        type: TYPE_GESTE_APPRIS,
        client,
        objet: geste.id,
        issue: ISSUE_GESTE.propose,
        motif: geste.description,
        donnees: { fichier, jeton, ecarts: [] },
      },
    ],
    horodatage,
  )
  const ecrit: Fabrication = {
    sorte: 'ecrit',
    relance: issue.relance,
    rejeu: issue.rejeu,
    fichier,
    jeton,
    activable: false,
    cout_usd,
    ...borne,
  }
  if (!options.traduction) return ecrit

  let bilan: BilanTraduction
  try {
    bilan = await options.traduction(geste, fichier)
  } catch (erreur) {
    return {
      ...ecrit,
      traduction: { ok: 0, total: 0, taux: 0, cout_usd: 0, stricts: [], erreur: message(erreur) },
    }
  }
  const traduction = {
    ok: bilan.ok,
    total: bilan.total,
    taux: bilan.taux,
    cout_usd: bilan.coutUsd,
    stricts: bilan.stricts,
  }
  // Le taux seul décide (§ 6.3) ; un cas strict en écart se lit au dossier, il ne vient pas du geste.
  const { activable } = journaliserVerification(journal, client, geste, [], horodatage, {
    bilan,
    modele: modele.id,
  })
  return { ...ecrit, traduction, activable }
}

/** Un échec de forme : un échec de fabrication qui n'est pas « aucun instantané » ni « trop peu de réponses » (ce sont des échecs avant tout appel). */
export const echecDeForme = (f: Fabrication) => f.sorte === 'echec' && f.cout_usd > 0

/** Le compte d'une passe de promotions, pour le § 8 : au seuil, non tentées, tentées, écrites, activables ; les échecs de forme à part des écarts de fond. */
export function compterFabrications(fabrications: Fabrication[]): string[] {
  const n = (f: (x: Fabrication) => boolean) => fabrications.filter(f).length
  return [
    `Intentions au seuil : ${fabrications.length}`,
    `Non tentées (hors catalogue, écriture, plafond) : ${n((f) => ['hors_catalogue', 'attend_lot_4', 'plafond'].includes(f.sorte))}`,
    `Tentées : ${n((f) => ['echec', 'ecarts', 'ecrit'].includes(f.sorte))}`,
    `Écrites sans écart : ${n((f) => f.sorte === 'ecrit')}, dont après relance : ${n((f) => f.sorte === 'ecrit' && f.relance)}`,
    `Activables : ${n((f) => f.activable === true)}`,
    `Échecs de forme ou d'exécution ${APRES_RELANCE} : ${n(echecDeForme)}`,
    `Écarts de fond : ${n((f) => f.sorte === 'ecarts')}`,
  ]
}
