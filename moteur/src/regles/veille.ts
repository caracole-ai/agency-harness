import { Temporal } from '../temps/temporal'
import type { Registre } from './schema'

// La veille des textes (`REFLEXIONS.md`, piste F) : chaque texte relu l'est
// de nouveau une fois par mois. Elle s'adresse à l'ingénieur du harnais, qui
// décide de ce qui change dans le harnais ; jamais au client, chez qui un
// doute né d'une relecture en retard n'a rien à faire.

export const PERIODE_VEILLE_TEXTES = { months: 1 } as const

export interface RelectureEnRetard {
  id: string
  relu: string
  /** Le jour où la relecture suivante était due. */
  due: string
}

/** Les règles relues dont la relecture mensuelle est dépassée à cette date. */
export function relecturesEnRetard(
  registre: Registre,
  aujourdhui: Temporal.PlainDate,
): RelectureEnRetard[] {
  return [...registre.interdits, ...registre.escalades].flatMap((r) => {
    if (!r.relu) return []
    const due = Temporal.PlainDate.from(r.relu).add(PERIODE_VEILLE_TEXTES)
    return Temporal.PlainDate.compare(aujourdhui, due) > 0
      ? [{ id: r.id, relu: r.relu, due: due.toString() }]
      : []
  })
}
