// Seul point d'entrée de Temporal dans le moteur : le jour où Node l'aura en
// natif, on retire le polyfill ici et nulle part ailleurs.
export { Temporal } from '@js-temporal/polyfill'

/** Le fuseau de référence : les textes comptent en heure légale française. */
export const FUSEAU = 'Europe/Paris'

/** Une date comme on l'écrit en France : 01/10/2026. */
export const dateFr = (d: { day: number; month: number; year: number }) =>
  `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`
