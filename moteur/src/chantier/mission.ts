import { readFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { type Domaine, motifPourMasquer } from '../conversation/domaine'
import { MOTIF_ID_CONVERSATION } from '../conversation/id'
import { MissionRonde, memesIntentions, STATUTS_MISSION } from '../ronde/rapport'
import type { Catalogue } from '../ronde/resume'
import { DOSSIER_RONDES } from '../ronde/ronde'
import type { MissionRetiree } from './memoire'

// La mission d'un chantier (PLAN-RONDE.md § 6.1, amendé § 0.b) : celle que la
// ronde a écrite chez le client (`rondes/<date>/<id>.yaml`), relue par un
// schéma strict, puis la décision prise en code avant tout appel : une question
// pour l'atelier ne lance rien ; une mission écartée, retirée ou dont une
// intention a déjà un geste actif non plus. Ce qui part au
// modèle du chantier n'est jamais la mission entière : ni ses échappées ni le
// client, des types seulement (R3).

export const Mission = z.strictObject({
  ...MissionRonde.shape,
  date: z.iso.date(),
  metier: z.string().min(1),
  statut: z.string().min(1),
  raison: z.string().optional(),
})
export type Mission = z.infer<typeof Mission>

export interface MissionLue {
  mission: Mission
  /** Le dossier du client : la mission est dans `<dossier>/rondes/<date>/`. */
  dossierClient: string
  /** Le nom du dossier du client, pour le dossier de chantier seulement (§ 6.1). */
  client: string
}

/** Lit `<client>/rondes/<date>/<id>.yaml` ; lève si le fichier n'est pas une mission d'une ronde. */
export function lireMission(chemin: string): MissionLue {
  const dossierDate = dirname(chemin)
  const dossierRondes = dirname(dossierDate)
  if (basename(dossierRondes) !== DOSSIER_RONDES) {
    throw new Error(`${chemin} : une mission vit dans <client>/${DOSSIER_RONDES}/<date>/<id>.yaml`)
  }
  const lu = Mission.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!lu.success) throw new Error(`${chemin} : mission invalide (${z.prettifyError(lu.error)})`)
  if (`${lu.data.id}.yaml` !== basename(chemin) || lu.data.date !== basename(dossierDate)) {
    throw new Error(`${chemin} : l'identifiant ou la date ne sont pas ceux du chemin`)
  }
  const dossierClient = dirname(dossierRondes)
  return { mission: lu.data, dossierClient, client: basename(dossierClient) }
}

export type Decision =
  | { sorte: 'chantier'; raison?: string }
  | { sorte: 'question'; motif: string }
  | { sorte: 'ecartee'; motif: string }

/**
 * Ce que devient la mission au moment du chantier, sur le catalogue du jour
 * (l'état a pu changer depuis la ronde) et les retraits de la mémoire (G2).
 */
export function decider(m: Mission, catalogue: Catalogue, retirees: MissionRetiree[]): Decision {
  if (m.statut === STATUTS_MISSION.ecartee) {
    return { sorte: 'ecartee', motif: `écartée par la ronde${m.raison ? ` : ${m.raison}` : ''}` }
  }
  const retiree = retirees.find((r) => r.id === m.id || memesIntentions(r.intentions, m.intentions))
  if (retiree)
    return { sorte: 'ecartee', motif: `mission retirée (${retiree.id}) : jamais refaite` }
  if (m.sorte === 'question_pour_l_atelier') {
    return { sorte: 'question', motif: STATUTS_MISSION.question }
  }
  const intentions = new Map(catalogue.intentions.map((i) => [i.id, i]))
  const avecGeste = m.intentions.filter((i) => intentions.get(i)?.geste_actif)
  if (avecGeste.length > 0) {
    return { sorte: 'ecartee', motif: `${avecGeste.join(', ')} : un geste actif existe déjà` }
  }
  return { sorte: 'chantier' }
}

/** Les identifiants d'échappée, de conversation ou de personne (le motif du métier) qu'un texte de la ronde citerait : remplacés par un type. */
const sansIdentifiant = (texte: string, domaine: Domaine) =>
  texte
    .replace(MOTIF_ID_CONVERSATION, '<échappée>')
    .replace(motifPourMasquer(domaine), '<personne>')

/** La mission telle qu'elle part au modèle du chantier : des types, ni échappées, ni client (R3). */
export function missionPourModele(m: Mission, domaine: Domaine): string {
  const sans = (texte: string) => sansIdentifiant(texte, domaine)
  return [
    `- identifiant : \`${m.id}\` ; sorte : ${m.sorte} ; métier : ${m.metier} ; écrit : ${m.ecrit ? 'oui' : 'non'} ; estimation : ${m.estimation}`,
    `- titre : ${sans(m.titre)}`,
    `- pourquoi : ${sans(m.pourquoi)}`,
    `- intentions : ${m.intentions.length > 0 ? m.intentions.map((i) => `\`${i}\``).join(', ') : 'aucune'}`,
    '- consignes-types (les demandes, réécrites avec des places) :',
    ...m.consignes_types.map((c) => `  - « ${sans(c)} »`),
  ].join('\n')
}
