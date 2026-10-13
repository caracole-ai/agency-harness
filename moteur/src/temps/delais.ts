import { z } from 'zod'
import { estFerie, type OptionsFeries } from './feries'
import { Temporal } from './temporal'

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

/** Une durée sans fin de mois : ce qu'on sait aussi retrancher d'une date. */
export type DureeSimple = { jours: number } | { mois: number } | { ans: number }
/** Les jours, puis la fin du mois atteint (PLAN-METIER-2.md M13), exemple : « 45 jours fin de mois ». */
export type DureeFinDeMois = { jours: number; fin_de_mois: true }
export type Duree = DureeSimple | DureeFinDeMois

const entier = z.number().int().nonnegative()
/** Une durée sans fin de mois, la seule qu'une fenêtre de veille accepte : `{ mois: 2 }`. */
export const DureeSimpleSchema: z.ZodType<DureeSimple> = z.union([
  z.strictObject({ jours: entier }),
  z.strictObject({ mois: entier }),
  z.strictObject({ ans: entier }),
])
/** Une durée telle qu'une config ou un registre l'écrit : `{ mois: 2 }`, `{ jours: 45, fin_de_mois: true }`. */
export const DureeSchema: z.ZodType<Duree> = z.union([
  DureeSimpleSchema,
  z.strictObject({ jours: entier, fin_de_mois: z.literal(true) }),
])

// `'jours' in duree` attrape aussi la fin de mois : chaque fonction la traite avant.
const estFinDeMois = (duree: Duree): duree is DureeFinDeMois => 'fin_de_mois' in duree

/**
 * Une date plus une durée, au calendrier, sans règle de décompte : le même
 * quantième en mois ou en années, ou le dernier jour du mois à défaut ; une
 * fin de mois ajoute les jours, puis va au dernier jour du mois atteint.
 */
export function ajouter(date: Temporal.PlainDate, duree: Duree): Temporal.PlainDate {
  if (estFinDeMois(duree)) {
    const atteint = date.add({ days: duree.jours })
    return atteint.with({ day: atteint.daysInMonth })
  }
  if ('jours' in duree) return date.add({ days: duree.jours })
  return date.add('mois' in duree ? { months: duree.mois } : { years: duree.ans })
}

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
  // aucun texte lu ne dit comment une fin de mois se combine aux jours sautés ni au report
  if (estFinDeMois(duree)) {
    throw new Error('un délai fin de mois sous une règle de décompte : cas non défini (`ajouter`)')
  }
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
  if (estFinDeMois(duree)) throw new Error('avant une fin de mois : cas non défini')
  if ('jours' in duree) return echeance.subtract({ days: duree.jours })
  return echeance.subtract('mois' in duree ? { months: duree.mois } : { years: duree.ans })
}

const multiple = (date: Temporal.PlainDate, duree: DureeSimple, k: number) =>
  'jours' in duree
    ? date.add({ days: duree.jours * k })
    : 'mois' in duree
      ? date.add({ months: duree.mois * k })
      : date.add({ years: duree.ans * k })

/**
 * Le dernier jour valide d'une obligation périodique due au plus tard à
 * chaque date anniversaire de `base` (recyclage SSIAP : tous les 3 ans depuis
 * le diplôme ; secourisme : tous les 2 ans depuis sa qualification ; arrêté du
 * 02/05/2005, art. 7). Le jour de l'échéance est encore valide. Une réalisation
 * faite au plus tard à l'échéance k couvre jusqu'à l'échéance k + 1 ; une
 * réalisation faite après une échéance dépassée ne rattrape rien (le texte
 * exige alors une remise à niveau, qui n'est pas modélisée ici).
 */
export function limitePeriodique(
  base: Temporal.PlainDate,
  periode: Duree,
  realisations: Temporal.PlainDate[],
): Temporal.PlainDate {
  if (estFinDeMois(periode)) throw new Error('une période fin de mois : cas non défini')
  let limite = multiple(base, periode, 1)
  for (const r of [...realisations].sort(Temporal.PlainDate.compare)) {
    if (Temporal.PlainDate.compare(r, limite) > 0) break
    let k = 1
    while (Temporal.PlainDate.compare(multiple(base, periode, k), r) < 0) k++
    const couvreJusqua = multiple(base, periode, k + 1)
    if (Temporal.PlainDate.compare(couvreJusqua, limite) > 0) limite = couvreJusqua
  }
  return limite
}
