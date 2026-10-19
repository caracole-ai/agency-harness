import { z } from 'zod'
import { auPlusTardAvant, type Duree, DureeSimpleSchema } from '../temps/delais'
import { dateFr, Temporal } from '../temps/temporal'

// L'archétype Veiller (`methode/archetypes.md`) : connaître les dates qui
// comptent, et prévenir assez tôt pour qu'on puisse encore agir. Tout en code.
// Le métier dit quelles échéances existent ; ce fichier dit quand on prévient.

/**
 * Quand prévenir, et combien de temps il faut pour faire ce que l'échéance
 * exige. Une fin de mois ne se retranche pas d'une limite : refusée dès la
 * lecture de la config, jamais au milieu d'une veille (PLAN-METIER-2.md M13).
 */
export const FenetreSchema = z.strictObject({
  /** On prévient à partir de la limite moins cette durée. */
  alerter: DureeSimpleSchema,
  /** Le temps qu'il faut pour agir : en dessous, l'alerte est escaladée. */
  preparation: DureeSimpleSchema,
})
export type Fenetre = z.infer<typeof FenetreSchema>

export interface Echeance {
  regle: string
  /** Ce sur quoi porte l'échéance : `A-3/carte`, `A-3/mac`… */
  objet: string
  /** Ce qu'il faut faire avant la limite : « déposer le renouvellement de la carte ». */
  action: string
  /** Le dernier jour pour agir. Absente : la date est inconnue, ce qui n'est pas une date lointaine. */
  limite?: Temporal.PlainDate
  fenetre: Fenetre
  /** Une précision pour celui qui agit (la suite si rien n'est fait). */
  precision?: string
}

export const NIVEAUX = ['alerte', 'escalade'] as const
export type Niveau = (typeof NIVEAUX)[number]

export interface Alerte {
  regle: string
  objet: string
  niveau: Niveau
  /** La phrase entière, pour le journal et le rapport. */
  motif: string
  limite?: string
  /** Ce qu'il faut faire, et sa précision, à part : pour qui montre l'alerte autrement qu'en une phrase. */
  action: string
  precision?: string
}

const fr = dateFr

const avant = (d: Temporal.PlainDate, duree: Duree) => auPlusTardAvant(d, duree)
const apres = (a: Temporal.PlainDate, b: Temporal.PlainDate) => Temporal.PlainDate.compare(a, b) > 0

/**
 * Les alertes du jour. Rien avant la fenêtre d'alerte ; une alerte dans la
 * fenêtre ; une escalade quand le temps restant est plus court que la
 * préparation, ou quand la limite est passée. Une date inconnue est toujours
 * une alerte, jamais un silence.
 */
export function veiller(echeances: Echeance[], aujourdhui: Temporal.PlainDate): Alerte[] {
  return echeances.flatMap((e): Alerte[] => {
    const base = {
      regle: e.regle,
      objet: e.objet,
      action: e.action,
      ...(e.precision ? { precision: e.precision } : {}),
    }
    const suite = e.precision ? ` ; ${e.precision}` : ''
    if (!e.limite) {
      return [{ ...base, niveau: 'alerte', motif: `date inconnue : ${e.action}${suite}` }]
    }
    const limite = e.limite.toString()
    if (apres(aujourdhui, e.limite)) {
      return [
        {
          ...base,
          niveau: 'escalade',
          limite,
          motif: `${e.action} : la limite du ${fr(e.limite)} est dépassée${suite}`,
        },
      ]
    }
    if (apres(aujourdhui, avant(e.limite, e.fenetre.preparation))) {
      return [
        {
          ...base,
          niveau: 'escalade',
          limite,
          motif: `${e.action} au plus tard le ${fr(e.limite)} : il reste moins que le temps de préparation${suite}`,
        },
      ]
    }
    if (!apres(avant(e.limite, e.fenetre.alerter), aujourdhui)) {
      return [
        {
          ...base,
          niveau: 'alerte',
          limite,
          motif: `${e.action} au plus tard le ${fr(e.limite)}${suite}`,
        },
      ]
    }
    return []
  })
}
