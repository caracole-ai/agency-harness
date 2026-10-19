import type { Evenement, Journal } from '../journal/journal'
import { cout, type PrixModele, type ReponseModele } from './modele'

// Le coût de l'IA, lu dans le journal : chaque appel au modèle y est une ligne
// `appel_modele` avec ses tokens et son coût ; le mois se somme de là, et le
// plafond du mois se compare à cette somme (PLAN-ESPACES.md § 4.4 et § 4.6).

export const TYPE_APPEL = 'appel_modele'

/**
 * Ce qui a demandé l'appel : traduire une consigne, désigner la personne
 * qu'elle nomme (REFLEXIONS.md, décidé le 2026-10-08), une échappée.
 */
export type UsageAppel = 'traduire' | 'echappee' | 'verifier'

/** Les appels d'un mois `AAAA-MM`, lus dans les lignes `appel_modele` du journal. */
export function coutDuMois(journal: Journal, mois: string): { usd: number; appels: number } {
  const lignes = journal
    .lire()
    .filter((l) => l.type === TYPE_APPEL && l.horodatage.startsWith(mois))
  const usd = lignes.reduce(
    (somme, l) =>
      somme + (l.donnees ? ((JSON.parse(l.donnees) as { cout_usd?: number }).cout_usd ?? 0) : 0),
    0,
  )
  return { usd: Math.round(usd * 1_000_000) / 1_000_000, appels: lignes.length }
}

/** Le plafond est atteint dès que le coût du mois l'égale. */
export function plafondAtteint(usdDuMois: number, plafondUsd: number): boolean {
  return usdDuMois >= plafondUsd
}

/** L'événement à écrire pour chaque appel au modèle. */
export function evenementAppel(
  client: string,
  conversation: string,
  usage: UsageAppel,
  tour: number,
  reponse: ReponseModele,
  prix: PrixModele,
  /** Ce que l'appel garde en plus (la consigne telle qu'elle est partie, pour la traduction). */
  plus: Record<string, unknown> = {},
): Evenement {
  return {
    type: TYPE_APPEL,
    client,
    objet: conversation,
    issue: usage,
    donnees: {
      tour,
      modele: reponse.message.model,
      usage: reponse.usage,
      cout_usd: cout(reponse.usage, prix),
      duree_ms: reponse.dureeMs,
      stop_reason: reponse.message.stop_reason,
      ...plus,
    },
  }
}
