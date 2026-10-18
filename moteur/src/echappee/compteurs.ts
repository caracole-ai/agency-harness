import type { Ligne } from '../journal/journal'
import { Temporal } from '../temps/temporal'
import { CONTROLE_OK, CONTROLE_RETIRE } from './boucle'
import { TYPE_ECHAPPEE } from './echappee'

// Les échappées comptées depuis le journal, sans modèle : le contrôle des
// chiffres est du code, sa mesure en vrai ne coûte rien et porte sur toutes
// les vraies questions, pas sur un jeu d'évals (REFLEXIONS.md, décidé le
// 2026-10-18). Une fenêtre glissante, en jours, lue dans l'état de la page.

/** La fenêtre des compteurs, en jours avant l'instant de la lecture. */
export const FENETRE_JOURS = 30

export interface CompteursEchappees {
  jours: number
  /** Les échappées finies dans la fenêtre, quelle que soit leur issue. */
  echappees: number
  /** Les réponses dont chaque chiffre et chaque nom venaient des données : le résumé du modèle a été montré. */
  relues: number
  /** Les réponses dont le résumé du modèle a été retiré : le demandeur a lu les tableaux. */
  retirees: number
  propositions: number
  abandons: number
}

/** Les lignes `echappee` du journal depuis `jours` jours, comptées par issue ; un journal vide donne des zéros. */
export function compteursEchappees(
  lignes: Ligne[],
  maintenant: Temporal.ZonedDateTime,
  jours = FENETRE_JOURS,
): CompteursEchappees {
  const depuis = maintenant.subtract({ days: jours }).toInstant()
  const c: CompteursEchappees = {
    jours,
    echappees: 0,
    relues: 0,
    retirees: 0,
    propositions: 0,
    abandons: 0,
  }
  for (const l of lignes) {
    if (l.type !== TYPE_ECHAPPEE) continue
    if (Temporal.Instant.compare(Temporal.Instant.from(l.horodatage), depuis) < 0) continue
    c.echappees++
    if (l.issue === 'abandon') c.abandons++
    else if (l.issue === 'proposition') c.propositions++
    else if (l.issue === 'reponse') {
      // Une ligne d'avant le contrôle n'a pas de `controle_reponse` : comptée comme échappée, dans aucune des deux colonnes.
      const controle = l.donnees
        ? (JSON.parse(l.donnees) as { controle_reponse?: string }).controle_reponse
        : undefined
      if (controle === CONTROLE_OK) c.relues++
      else if (controle === CONTROLE_RETIRE) c.retirees++
    }
  }
  return c
}
