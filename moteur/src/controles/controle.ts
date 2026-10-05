import type { Interdit, Registre } from '../regles/schema'
import { type Constat, moinsGrave, plafond } from '../regles/verdict'

/**
 * Un interdit codé : une fonction pure qui rend ses constats. Elle n'applique
 * jamais elle-même le plafond de son statut, le moteur le fait pour toutes.
 */
export interface Controle<Contexte> {
  regle: string
  /** Ce que la règle demande et que ce code ne vérifie pas encore : visible, pas silencieux. */
  nonCouvert?: string[]
  verifier(contexte: Contexte, interdit: Interdit): Constat[]
}

/**
 * Exécute des contrôles sur un contexte. Chaque verdict est plafonné par le
 * statut de sa règle. Un contrôle qui lève rend `refus` : le moteur échoue
 * fermé, jamais « laisse passer par défaut ».
 */
export function executer<Contexte>(
  controles: Controle<Contexte>[],
  contexte: Contexte,
  registre: Registre,
): Constat[] {
  return controles.flatMap((c) => {
    const interdit = registre.interdits.find((i) => i.id === c.regle)
    if (!interdit)
      throw new Error(`le contrôle ${c.regle} ne correspond à aucun interdit du registre`)
    const max = plafond(interdit)
    try {
      return c.verifier(contexte, interdit).map((constat) => ({
        ...constat,
        verdict: moinsGrave(constat.verdict, max),
      }))
    } catch (erreur) {
      return [
        {
          regle: c.regle,
          objet: '*',
          verdict: 'refus' as const,
          motif: `le contrôle a échoué, le moteur refuse : ${(erreur as Error).message}`,
        },
      ]
    }
  })
}
