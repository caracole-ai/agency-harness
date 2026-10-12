import { FUSEAU, Temporal } from './temporal'

// Le temps des personnes et des titres : intervalles comptés en instants
// réels, affichés en heure de Paris (exemple : une vacation 21 h – 7 h dure
// 11 h la nuit du passage à l'heure d'hiver, 9 h celle du passage à l'heure
// d'été).

export interface Intervalle {
  debut: Temporal.ZonedDateTime
  fin: Temporal.ZonedDateTime
}

/** Un intervalle à partir de deux heures murales de Paris (`2026-10-24T21:00`). */
export function intervalle(debut: string, fin: string): Intervalle {
  const i = {
    debut: Temporal.PlainDateTime.from(debut).toZonedDateTime(FUSEAU),
    fin: Temporal.PlainDateTime.from(fin).toZonedDateTime(FUSEAU),
  }
  if (Temporal.ZonedDateTime.compare(i.debut, i.fin) >= 0) {
    throw new Error(`intervalle vide ou inversé : ${debut} → ${fin}`)
  }
  return i
}

const heures = (a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime) =>
  a.until(b, { largestUnit: 'hours' }).total({ unit: 'hours' })

/** Durée réelle, en heures. */
export const dureeHeures = (i: Intervalle) => heures(i.debut, i.fin)

/** Le repos entre la fin d'un intervalle et le début du suivant, en heures réelles. */
export const reposHeures = (avant: Intervalle, apres: Intervalle) => heures(avant.fin, apres.debut)

const max = (a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime) =>
  Temporal.ZonedDateTime.compare(a, b) >= 0 ? a : b
const min = (a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime) =>
  Temporal.ZonedDateTime.compare(a, b) <= 0 ? a : b

// Les sommes se font en minutes entières : des heures fractionnaires additionnées ne se comparent pas à coup sûr.
const minutes = (a: Temporal.ZonedDateTime, b: Temporal.ZonedDateTime) =>
  a.until(b, { largestUnit: 'minutes' }).total({ unit: 'minutes' })

function minutesDans(intervalles: Intervalle[], fenetre: Intervalle): number {
  return intervalles.reduce((total, i) => {
    const debut = max(i.debut, fenetre.debut)
    const fin = min(i.fin, fenetre.fin)
    return Temporal.ZonedDateTime.compare(debut, fin) < 0 ? total + minutes(debut, fin) : total
  }, 0)
}

/** Les heures de ces intervalles qui tombent dans la fenêtre (une semaine civile, 7 jours glissants…). */
export const heuresDans = (intervalles: Intervalle[], fenetre: Intervalle) =>
  minutesDans(intervalles, fenetre) / 60

/**
 * Une période de validité d'un titre, bornes incluses, en dates civiles.
 * Sans `au`, elle court jusqu'à nouvel ordre (un récépissé vaut jusqu'à la
 * décision, R612-17).
 */
export interface Validite {
  du: Temporal.PlainDate
  au?: Temporal.PlainDate
}

export function valideLe(validites: Validite[], date: Temporal.PlainDate): boolean {
  return validites.some(
    (v) =>
      Temporal.PlainDate.compare(v.du, date) <= 0 &&
      (v.au === undefined || Temporal.PlainDate.compare(date, v.au) <= 0),
  )
}

export type Couverture = 'entière' | 'partielle' | 'aucune'

/**
 * Ce que des validités couvrent d'un intervalle. « partielle » est le cas
 * d'un titre qui expire pendant l'intervalle (exemple : une vacation de nuit) : le moteur ne tranche
 * pas, la règle dit ce qu'elle en fait (une lecture par interprétation).
 */
export function couverture(validites: Validite[], i: Intervalle): Couverture {
  const enInstants = validites
    .map((v) => {
      const debut = v.du.toZonedDateTime({ timeZone: FUSEAU })
      // une validité ouverte couvre au moins jusqu'au-delà de l'intervalle examiné
      const fin = v.au
        ? v.au.add({ days: 1 }).toZonedDateTime({ timeZone: FUSEAU })
        : max(debut, i.fin).add({ days: 1 })
      return { debut, fin }
    })
    .sort((a, b) => Temporal.ZonedDateTime.compare(a.debut, b.debut))
  // fusion des validités qui se touchent ou se chevauchent (un renouvellement qui prend la suite)
  const fusion: Intervalle[] = []
  for (const v of enInstants) {
    const dernier = fusion.at(-1)
    if (dernier && Temporal.ZonedDateTime.compare(v.debut, dernier.fin) <= 0) {
      dernier.fin = max(dernier.fin, v.fin)
    } else {
      fusion.push({ ...v })
    }
  }
  const couvert = minutesDans(fusion, i)
  if (couvert === 0) return 'aucune'
  return couvert === minutes(i.debut, i.fin) ? 'entière' : 'partielle'
}
