import { Temporal } from './temporal'

// Jours fériés : C. trav. L3133-1 ; Alsace-Moselle : C. trav. L3134-13.
// `texte`, pas encore relu mot à mot (à ajouter à la prochaine vérification).

export interface OptionsFeries {
  /**
   * Bas-Rhin, Haut-Rhin, Moselle : 26 décembre, et Vendredi saint dans les
   * communes qui ont un temple protestant ou une église mixte. Le moteur ne
   * connaît pas la commune : c'est la config client qui le dit.
   */
  alsaceMoselle?: { vendrediSaint: boolean }
}

/** Dimanche de Pâques, calendrier grégorien (algorithme de Meeus, Jones et Butcher). */
export function paques(annee: number): Temporal.PlainDate {
  const a = annee % 19
  const b = Math.floor(annee / 100)
  const c = annee % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31)
  const jour = ((h + l - 7 * m + 114) % 31) + 1
  return Temporal.PlainDate.from({ year: annee, month: mois, day: jour })
}

export function joursFeries(annee: number, options: OptionsFeries = {}): Temporal.PlainDate[] {
  const fixe = (month: number, day: number) => Temporal.PlainDate.from({ year: annee, month, day })
  const p = paques(annee)
  const feries = [
    fixe(1, 1),
    p.add({ days: 1 }), // lundi de Pâques
    fixe(5, 1),
    fixe(5, 8),
    p.add({ days: 39 }), // Ascension
    p.add({ days: 50 }), // lundi de Pentecôte
    fixe(7, 14),
    fixe(8, 15),
    fixe(11, 1),
    fixe(11, 11),
    fixe(12, 25),
  ]
  if (options.alsaceMoselle) {
    feries.push(fixe(12, 26))
    if (options.alsaceMoselle.vendrediSaint) feries.push(p.subtract({ days: 2 }))
  }
  return feries.sort(Temporal.PlainDate.compare)
}

export function estFerie(date: Temporal.PlainDate, options: OptionsFeries = {}): boolean {
  return joursFeries(date.year, options).some((f) => f.equals(date))
}
