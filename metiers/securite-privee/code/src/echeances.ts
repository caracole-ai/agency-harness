import {
  auPlusTardAvant,
  dateFr,
  type Echeance,
  type Fenetre,
  type Interdit,
  limitePeriodique,
  parametresDe,
  Temporal,
} from '@harnais/moteur'
import type { Agent } from './modele'
import { type Contexte, date } from './semantique'

// I-17 : les échéances réglementaires d'un agent, d'où l'archétype Veiller
// tire ses alertes. Les durées viennent du registre (paramètres d'I-17, textes
// relus) ; les fenêtres d'alerte et de préparation, de la config du client.

export const ECHEANCES = [
  'depot_renouvellement',
  'mac',
  'recyclage_ssiap',
  'secourisme',
  'habilitation_electrique',
] as const
export type Fenetres = Record<(typeof ECHEANCES)[number], Fenetre>

function nombre(parametres: Record<string, unknown>, cle: string): number {
  const v = parametres[cle]
  if (typeof v !== 'number') throw new Error(`I-17 : paramètre ${cle} absent du registre`)
  return v
}

const fr = dateFr
const apres = (a: Temporal.PlainDate, b: Temporal.PlainDate) => Temporal.PlainDate.compare(a, b) > 0

function carteEtMac(
  agent: Agent,
  fenetres: Fenetres,
  p: Record<string, unknown>,
  aujourdhui: Temporal.PlainDate,
): Echeance[] {
  const carte = agent.cartePro
  if (!carte) return []
  const objet = (t: string) => `${agent.id}/${t}`
  const fins = carte.validites.map((v) => v.au)
  if (fins.some((f) => f === undefined)) {
    return [
      {
        regle: 'I-17',
        objet: objet('carte'),
        action: "renseigner la date d'expiration de la carte professionnelle",
        fenetre: fenetres.depot_renouvellement,
      },
    ]
  }
  // un récépissé : la demande de renouvellement est déposée et complète (R612-17)
  if (agent.recepisse) return []
  const expiration = (fins as string[]).map(date).sort(Temporal.PlainDate.compare).at(-1)
  if (!expiration) return []
  const depot = auPlusTardAvant(expiration, { mois: nombre(p, 'depot_renouvellement_avant_mois') })
  const echeances: Echeance[] = [
    {
      regle: 'I-17',
      objet: objet('carte'),
      action: `déposer la demande de renouvellement de la carte professionnelle, qui expire le ${fr(expiration)}`,
      limite: depot,
      fenetre: fenetres.depot_renouvellement,
      precision: apres(aujourdhui, expiration)
        ? 'carte expirée : sans récépissé, aucune vacation sous carte possible'
        : "sans récépissé à l'expiration, l'agent ne pourra plus être affecté",
    },
  ]
  const seulementTelesurveillance = carte.activites.every((a) => a === 'telesurveillance')
  const fenetreMac = nombre(
    p,
    seulementTelesurveillance ? 'mac_fenetre_telesurveillance_mois' : 'mac_fenetre_mois',
  )
  const debutFenetreMac = auPlusTardAvant(expiration, { mois: fenetreMac })
  const macValable = agent.mac !== undefined && !apres(debutFenetreMac, date(agent.mac))
  if (!macValable) {
    echeances.push({
      regle: 'I-17',
      objet: objet('mac'),
      action: `faire suivre le MAC, à organiser et financer par l'employeur, sur le temps de travail (aucun MAC enregistré dans les ${fenetreMac} mois avant l'expiration de la carte)`,
      limite: depot,
      fenetre: fenetres.mac,
      precision: 'son attestation est jointe à la demande de renouvellement',
    })
  }
  return echeances
}

/** Une formation à recycler à chaque date anniversaire de sa base (arrêté du 02/05/2005, art. 7). */
function recyclage(
  agent: Agent,
  quoi: 'recyclage-ssiap' | 'secourisme',
  base: string,
  recyclages: string[],
  ans: number,
  fenetre: Fenetre,
  action: string,
  precision: string,
): Echeance {
  return {
    regle: 'I-17',
    objet: `${agent.id}/${quoi}`,
    action,
    limite: limitePeriodique(date(base), { ans }, recyclages.map(date)),
    fenetre,
    precision,
  }
}

const inconnue = (agent: Agent, quoi: string, action: string, fenetre: Fenetre): Echeance => ({
  regle: 'I-17',
  objet: `${agent.id}/${quoi}`,
  action,
  fenetre,
})

/**
 * Les échéances de chaque agent. Un titre absent n'est une échéance (inconnue)
 * que si le planning le rend nécessaire : une carte pour un poste sous
 * activité, le SSIAP, le secourisme et l'habilitation pour un poste incendie.
 * Non couvert : l'agrément du dirigeant (donnée de l'entreprise, texte non relu).
 */
export function echeancesSecurite(
  ctx: Contexte,
  fenetres: Fenetres,
  interdit: Interdit,
  aujourdhui: Temporal.PlainDate,
): Echeance[] {
  const p = parametresDe(interdit)
  return ctx.planning.agents.flatMap((agent) => {
    const postes = ctx.vacationsDe(agent.id).map((v) => ctx.poste(v.poste))
    const sousCarte = postes.some((x) => x.activite !== undefined)
    const incendie = postes.some((x) => x.ssiap !== undefined)
    const e: Echeance[] = []

    if (agent.cartePro) e.push(...carteEtMac(agent, fenetres, p, aujourdhui))
    else if (sousCarte) {
      e.push(
        inconnue(
          agent,
          'carte',
          "renseigner la date d'expiration de la carte professionnelle",
          fenetres.depot_renouvellement,
        ),
      )
    }

    if (agent.ssiap) {
      e.push(
        recyclage(
          agent,
          'recyclage-ssiap',
          agent.ssiap.diplome,
          agent.ssiap.recyclages,
          nombre(p, 'recyclage_ssiap_ans'),
          fenetres.recyclage_ssiap,
          'faire le recyclage SSIAP',
          'au-delà, remise à niveau nécessaire avant tout poste incendie',
        ),
      )
    } else if (incendie) {
      e.push(
        inconnue(
          agent,
          'recyclage-ssiap',
          'renseigner le diplôme SSIAP et ses recyclages',
          fenetres.recyclage_ssiap,
        ),
      )
    }

    if (agent.secourisme) {
      e.push(
        recyclage(
          agent,
          'secourisme',
          agent.secourisme.qualification,
          agent.secourisme.recyclages,
          nombre(p, 'recyclage_secourisme_ans'),
          fenetres.secourisme,
          'faire le recyclage du secourisme',
          "au-delà, plus de poste incendie tant qu'il n'est pas fait",
        ),
      )
    } else if (incendie) {
      e.push(
        inconnue(
          agent,
          'secourisme',
          'renseigner la qualification de secourisme',
          fenetres.secourisme,
        ),
      )
    }

    const habilitation = agent.habilitationElectrique
    if (habilitation?.au) {
      e.push({
        regle: 'I-17',
        objet: `${agent.id}/habilitation`,
        action: "renouveler l'habilitation électrique",
        limite: date(habilitation.au),
        fenetre: fenetres.habilitation_electrique,
      })
    } else if (!habilitation && incendie) {
      e.push(
        inconnue(
          agent,
          'habilitation',
          "renseigner l'habilitation électrique",
          fenetres.habilitation_electrique,
        ),
      )
    }
    return e
  })
}

export const VEILLES = [{ regle: 'I-17', nonCouvert: ['agrément du dirigeant'] }]
