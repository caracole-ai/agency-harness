// Seul point d'entrée de Temporal dans le moteur : le jour où Node l'aura en
// natif, on retire le polyfill ici et nulle part ailleurs.
import { Temporal } from '@js-temporal/polyfill'

export { Temporal }

/** Le fuseau de référence : les textes comptent en heure légale française. */
export const FUSEAU = 'Europe/Paris'

/** Une date comme on l'écrit en France : 01/10/2026. */
export const dateFr = (d: { day: number; month: number; year: number }) =>
  `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`

/** Une heure murale de Paris, `AAAA-MM-JJTHH:MM` (PLAN-METIER-2.md M10 : le moteur la donne à l'interface). */
export const aParis = (s: string) => Temporal.PlainDateTime.from(s).toZonedDateTime(FUSEAU)

/** Le jour d'un horodatage du journal, en heure de Paris. */
export const jourDe = (horodatage: string) =>
  Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU).toPlainDate()
