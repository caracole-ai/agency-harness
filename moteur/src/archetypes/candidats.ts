import { type Controle, executer } from '../controles/controle'
import type { Registre } from '../regles/schema'
import { type Constat, VERDICTS, type Verdict } from '../regles/verdict'

// Choisir quelqu'un pour une tâche (un remplaçant, un chauffeur…) : chaque
// candidat est essayé sur un contexte hypothétique, passé aux mêmes contrôles
// que la veille. Aucune règle n'est réécrite pour l'occasion : ce sont les
// interdits du registre qui écartent, avec leurs motifs.

export type Issue = 'possible' | 'écarté' | 'exclu'

export interface Evaluation {
  candidat: string
  /** `exclu` : un interdit s'y oppose ; `écarté` : une donnée manque ou l'exploitation doit décider. */
  issue: Issue
  /** Les constats que ce choix ferait apparaître (vides si possible). */
  constats: Constat[]
}

const rang = (v: Verdict) => VERDICTS.indexOf(v)
const cle = (c: Constat) => `${c.regle} ${c.objet}`

/**
 * Évalue chaque candidat : les constats non conformes que son affectation
 * ferait apparaître, ou aggraverait, par rapport au contexte de départ. Un
 * contrôle qui échoue refuse (le moteur échoue fermé) : le candidat est exclu.
 */
export function evaluerCandidats<Contexte>(
  controles: Controle<Contexte>[],
  registre: Registre,
  depart: Contexte,
  candidats: string[],
  affecter: (candidat: string) => Contexte,
): Evaluation[] {
  const avant = new Map(executer(controles, depart, registre).map((c) => [cle(c), c.verdict]))
  return candidats.map((candidat) => {
    const constats = executer(controles, affecter(candidat), registre).filter(
      (c) => c.verdict !== 'ok' && rang(c.verdict) > rang(avant.get(cle(c)) ?? 'ok'),
    )
    const issue: Issue = constats.some((c) => c.verdict === 'refus')
      ? 'exclu'
      : constats.length > 0
        ? 'écarté'
        : 'possible'
    return { candidat, issue, constats }
  })
}

/**
 * Trie selon des critères dans l'ordre de préférence (plus petit = mieux),
 * puis par un départage stable (le nom) : même entrée, même ordre.
 */
export function classer<T>(
  items: T[],
  criteres: ((item: T) => number)[],
  departage: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    for (const critere of criteres) {
      const d = critere(a) - critere(b)
      if (d !== 0) return d
    }
    return departage(a).localeCompare(departage(b), 'fr')
  })
}
