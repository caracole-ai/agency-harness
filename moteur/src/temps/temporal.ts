// Seul point d'entrée de Temporal dans le moteur : le jour où Node l'aura en
// natif, on retire le polyfill ici et nulle part ailleurs.
export { Temporal } from '@js-temporal/polyfill'

/** Le fuseau de référence : les textes comptent en heure légale française. */
export const FUSEAU = 'Europe/Paris'
