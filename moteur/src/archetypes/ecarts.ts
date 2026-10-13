// Rapprocher, v1 minimale (PLAN-METIER-2.md § 3.7, M12) : ce qui a été
// consommé contre ce qui a été vendu, et le seuil où l'on prévient. Le métier
// calcule ses écarts et en fait une section du rapport (`MetierVeiller.sections`) ;
// ses seuils vivent dans sa config. Ce fichier ne dit que le taux et les mots.

export interface Ecart {
  /** Ce sur quoi porte l'écart. */
  objet: string // exemple : 'PRJ-12', 'PRJ-12/LOT-003', 'TMA-04/2026-10'
  /** Ce qu'on rapproche. */
  mesure: string // exemple : « jours consommés / vendus »
  consomme: number
  vendu: number
  unite: 'jours' | 'heures' | 'euros'
  /** Le taux à partir duquel on prévient. */
  seuil: number // exemple : 0.9
}

/** L'abréviation de chaque unité, et l'accord de ce qu'on en dit (« 16 h consommées »). */
const UNITES: Record<Ecart['unite'], { abreviation: string; feminin: boolean }> = {
  jours: { abreviation: 'j', feminin: false },
  heures: { abreviation: 'h', feminin: true },
  euros: { abreviation: '€', feminin: false },
}

// un taux calculé en flottant (2,4 / 3 = 0,7999…) ne doit pas manquer un seuil atteint pile
const TOLERANCE = 1e-9

/**
 * Le consommé sur le vendu ; `null` quand rien n'a été vendu, sans jamais
 * diviser par zéro, ni rendre un taux négatif pour un vendu négatif.
 */
export const taux = (e: Ecart): number | null => (e.vendu <= 0 ? null : e.consomme / e.vendu)

export const depasse = (e: Ecart): boolean => {
  const t = taux(e)
  // un taux inconnu (rien de vendu) n'atteint aucun seuil : à la section du métier de le dire
  return t !== null && t >= e.seuil - TOLERANCE
}

/** Un nombre à la française : deux décimales au plus, sans zéro de fin, milliers groupés (`12 500`, `23,5`). */
function nombre(n: number): string {
  const [entier = '', decimales] = String(Number(n.toFixed(2))).split('.')
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${decimales ? `,${decimales}` : ''}`
}

/** Le participe accordé : au pluriel à partir de deux, comme on l'écrit (« 1,5 j consommé »). */
const accorde = (participe: string, n: number, feminin: boolean) =>
  `${participe}${feminin ? 'e' : ''}${Math.abs(n) >= 2 ? 's' : ''}`

/** Une ligne du rapport, exemple : « PRJ-12 : 23,5 j consommés sur 18 vendus (131 %) ». */
export function decrireEcart(e: Ecart): string {
  const { abreviation, feminin } = UNITES[e.unite]
  const t = taux(e)
  const pourcentage = t === null ? '' : ` (${Math.round(t * 100)} %)`
  return `${e.objet} : ${nombre(e.consomme)} ${abreviation} ${accorde('consommé', e.consomme, feminin)} sur ${nombre(e.vendu)} ${accorde('vendu', e.vendu, feminin)}${pourcentage}`
}
