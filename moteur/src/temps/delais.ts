import { estFerie, type OptionsFeries } from './feries'
import type { Temporal } from './temporal'

// Le calcul d'un délai (`methode/socle.md` § 2). Chaque métier ne fournit que
// sa règle de décompte ; les cas limites se codent une fois, ici.

export type SorteDeJour = 'samedi' | 'dimanche' | 'férié'

export interface RegleDeDecompte {
  /** Le jour de l'événement ne compte pas (CPC 641, L133-3, CMR art. 30 § 4). */
  jourDeDepartExclu: boolean
  /** Jours sautés pendant le décompte d'un délai en jours (CMR art. 30 : dimanches et fériés). */
  nonComptes: SorteDeJour[]
  /** Un délai qui finit un de ces jours est prorogé au premier jour qui n'en est pas un (CPC 642). */
  reportSi: SorteDeJour[]
  feries?: OptionsFeries
}

export type Duree = { jours: number } | { mois: number } | { ans: number }

const SAMEDI = 6
const DIMANCHE = 7

export function sortesDuJour(date: Temporal.PlainDate, feries: OptionsFeries = {}): SorteDeJour[] {
  const sortes: SorteDeJour[] = []
  if (date.dayOfWeek === SAMEDI) sortes.push('samedi')
  if (date.dayOfWeek === DIMANCHE) sortes.push('dimanche')
  if (estFerie(date, feries)) sortes.push('férié')
  return sortes
}

const estUnDe = (date: Temporal.PlainDate, sortes: SorteDeJour[], feries?: OptionsFeries) =>
  sortesDuJour(date, feries).some((s) => sortes.includes(s))

/**
 * Le dernier jour d'un délai qui court à partir d'un événement.
 * En mois ou en années : le même quantième, ou le dernier jour du mois à
 * défaut (CPC 641 : le 31 janvier plus un mois donne le 28 ou le 29 février).
 */
export function echeance(
  depart: Temporal.PlainDate,
  duree: Duree,
  regle: RegleDeDecompte,
): Temporal.PlainDate {
  let fin: Temporal.PlainDate
  if ('jours' in duree) {
    if (!regle.jourDeDepartExclu && regle.nonComptes.length > 0) {
      throw new Error(
        'un décompte qui inclut le jour de départ et saute des jours : cas non défini',
      )
    }
    fin = regle.jourDeDepartExclu ? depart : depart.subtract({ days: 1 })
    let comptes = 0
    while (comptes < duree.jours) {
      fin = fin.add({ days: 1 })
      if (!estUnDe(fin, regle.nonComptes, regle.feries)) comptes++
    }
  } else {
    fin = depart.add('mois' in duree ? { months: duree.mois } : { years: duree.ans })
  }
  while (estUnDe(fin, regle.reportSi, regle.feries)) fin = fin.add({ days: 1 })
  return fin
}

/**
 * La date limite pour agir avant une échéance (« au moins trois mois avant la
 * date d'expiration »). Trois mois ne font pas 90 jours : le 31/01 moins trois
 * mois donne le 31/10, quand J-90 donne le 02/11.
 */
export function auPlusTardAvant(echeance: Temporal.PlainDate, duree: Duree): Temporal.PlainDate {
  if ('jours' in duree) return echeance.subtract({ days: duree.jours })
  return echeance.subtract('mois' in duree ? { months: duree.mois } : { years: duree.ans })
}
