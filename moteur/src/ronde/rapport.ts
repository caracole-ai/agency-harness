import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { interdits, type MissionRetiree } from '../chantier/memoire'
import { FORMAT_INTENTION, schemaJson } from '../conversation/actions'
import type { Designable } from '../conversation/designation'
import { type Domaine, motifPourTester } from '../conversation/domaine'
import type { Catalogue, Resume } from './resume'

// Le rapport de la ronde (PLAN-RONDE.md § 5.2, R3) : un schéma strict, l'outil
// (ou la sortie structurée du binaire, § 0.a) et la revalidation en code. Une
// faute du modèle (une échappée qui n'est pas dans la fenêtre, une
// consigne-type qui porte un identifiant ou un nom, un rapport incohérent) fait
// refuser tout le rapport : il est écrit quand même, sans mission. L'état du
// catalogue (un geste actif, une mission déjà ouverte ou retirée) écarte une
// mission, en le disant.

export const OUTIL_RAPPORT = 'rapport_de_ronde'

export const SORTES_MISSION = [
  'intention_nouvelle',
  'geste_code',
  'factorisation',
  'question_pour_l_atelier',
] as const
export type SorteMission = (typeof SORTES_MISSION)[number]

export const ESTIMATIONS = ['petite', 'moyenne', 'grande'] as const

export const OBSERVATIONS_MAX = 10
export const OBSERVATION_LONGUEUR_MAX = 300

export const MissionRonde = z.strictObject({
  id: z
    .string()
    .regex(FORMAT_INTENTION)
    .describe('un slug en snake_case ASCII, le nom du geste ou de la mission'),
  sorte: z.enum(SORTES_MISSION),
  titre: z.string().min(1).max(120).describe('la mission en une phrase courte'),
  pourquoi: z
    .string()
    .min(1)
    .max(600)
    .describe('pourquoi elle mérite un chantier, avec les comptes du résumé'),
  echappees: z
    .array(z.string())
    .max(20)
    .describe('les identifiants E-… des échappées de la fenêtre qui la justifient'),
  intentions: z
    .array(z.string().regex(FORMAT_INTENTION))
    .max(10)
    .describe('les intentions du catalogue concernées, ou un slug neuf'),
  consignes_types: z.array(z.string().min(1).max(200)).min(1).max(5),
  ecrit: z.boolean().describe('vrai si la demande modifie les données'),
  estimation: z.enum(ESTIMATIONS),
})
export type MissionRonde = z.infer<typeof MissionRonde>

/** La mission telle que le modèle la voit : ses consignes-types citent les places du métier (PLAN-METIER-2.md M7). */
const missionRonde = (places: string[]) =>
  MissionRonde.extend({
    consignes_types: MissionRonde.shape.consignes_types.describe(
      `la demande réécrite avec des places entre chevrons (${places.join(', ')}), sans aucun identifiant ni nom`,
    ),
  })

/** Le schéma du rapport, borné par la config (`ronde.missions_max`), avec les places du métier. */
export const schemaRapport = (missionsMax: number, places: string[]) =>
  z.strictObject({
    observations: z
      .array(z.string().max(OBSERVATION_LONGUEUR_MAX))
      .max(OBSERVATIONS_MAX)
      .describe('ce que la ronde a remarqué, en phrases courtes'),
    missions: z.array(missionRonde(places)).max(missionsMax),
    rien_a_signaler: z.boolean().describe('vrai si et seulement si aucune mission'),
  })
export type RapportDeRonde = z.infer<ReturnType<typeof schemaRapport>>

const DESCRIPTION_OUTIL =
  'Rends le rapport de la ronde : observations, missions désignées par identifiants, ou rien à signaler.'

/** L'outil de la ronde sous acces: anthropic (un seul appel, schéma strict). */
export const outilRapport = (missionsMax: number, places: string[]): Anthropic.Tool => ({
  name: OUTIL_RAPPORT,
  description: DESCRIPTION_OUTIL,
  input_schema: schemaJson(schemaRapport(missionsMax, places)),
  strict: true,
})

/** Le même schéma, pour `--json-schema` du binaire (§ 0.a). */
export const schemaJsonRapport = (missionsMax: number, places: string[]) =>
  schemaJson(schemaRapport(missionsMax, places))

/** Deux listes d'intentions non vides, aux mêmes éléments. */
export const memesIntentions = (a: string[], b: string[]) =>
  a.length > 0 && a.length === b.length && a.every((x) => b.includes(x))

/** Ce que devient une mission revalidée. */
export const STATUTS_MISSION = {
  a_faire: 'à faire',
  question: "question pour l'atelier",
  ecartee: 'écartée',
} as const
export type StatutMission = (typeof STATUTS_MISSION)[keyof typeof STATUTS_MISSION]

export interface MissionRevalidee {
  mission: MissionRonde
  statut: StatutMission
  /** Écrite par le code : pourquoi ce statut. */
  raison?: string
}

export type Revalidation =
  | { sorte: 'accepte'; missions: MissionRevalidee[] }
  | { sorte: 'refuse'; ecarts: string[] }

/**
 * Les règles de R3, en code. `retirees` : les missions retirées (mémoire,
 * G2), reconnues par leur identifiant ou par leurs intentions ; `personnes` :
 * toutes celles du client, pour qu'aucune consigne-type ne porte un nom ou un
 * identifiant ; `domaine` : le motif des identifiants du métier.
 */
export function revalider(
  rapport: RapportDeRonde,
  resume: Resume,
  catalogue: Catalogue,
  config: {
    missionsMax: number
    retirees: MissionRetiree[]
    personnes: Designable[]
    domaine: Domaine
  },
): Revalidation {
  const ecarts: string[] = []
  const identifiant = motifPourTester(config.domaine)
  const vues = new Set(
    resume.demandes.flatMap((d) =>
      d.devenue.sorte === 'demande_nouvelle' ? [d.devenue.echappee] : [],
    ),
  )
  if (rapport.missions.length > config.missionsMax) {
    ecarts.push(`${rapport.missions.length} missions, au plus ${config.missionsMax}`)
  }
  if (rapport.rien_a_signaler !== (rapport.missions.length === 0)) {
    ecarts.push('« rien à signaler » ne dit pas la même chose que la liste des missions')
  }
  const ids = rapport.missions.map((m) => m.id)
  if (new Set(ids).size !== ids.length) ecarts.push('deux missions ont le même identifiant')
  for (const m of rapport.missions) {
    for (const e of m.echappees) {
      if (!vues.has(e)) ecarts.push(`${m.id} : l'échappée ${e} n'est pas dans la fenêtre`)
    }
    for (const c of m.consignes_types) {
      const trouves = interdits(c, config.personnes)
      // R3 : `fuites`, les identifiants connus, et toute forme d'identifiant du métier.
      if (trouves.length > 0 || identifiant.test(c)) {
        ecarts.push(`${m.id} : une consigne-type porte un identifiant ou un nom`)
        break
      }
    }
  }
  if (ecarts.length > 0) return { sorte: 'refuse', ecarts }

  const intentions = new Map(catalogue.intentions.map((i) => [i.id, i]))
  const ouvertes = new Set(catalogue.missions_ouvertes.map((m) => m.id))
  const actifs = new Set([
    ...catalogue.appris.filter((a) => a.statut === 'actif').map((a) => a.id),
    ...catalogue.gestes.map((g) => g.id),
  ])
  const missions = rapport.missions.map((m): MissionRevalidee => {
    const ecartee = (raison: string): MissionRevalidee => ({
      mission: m,
      statut: STATUTS_MISSION.ecartee,
      raison,
    })
    // Retirée sous ce nom ou sous un autre : les mêmes intentions (G2).
    const retiree = config.retirees.find(
      (r) => r.id === m.id || memesIntentions(r.intentions, m.intentions),
    )
    if (retiree) return ecartee(`mission retirée (mémoire, ${retiree.id}) : jamais reproposée`)
    if (ouvertes.has(m.id)) return ecartee('mission déjà ouverte par une ronde précédente')
    // Le même travail sous un autre nom : les mêmes intentions qu'une mission ouverte.
    const meme = catalogue.missions_ouvertes.find((o) =>
      memesIntentions(o.intentions, m.intentions),
    )
    if (meme) return ecartee(`mêmes intentions que la mission ouverte ${meme.id}`)
    if (actifs.has(m.id)) return ecartee('un geste actif porte déjà cet identifiant')
    const avecGeste = m.intentions.filter((i) => intentions.get(i)?.geste_actif || actifs.has(i))
    if (avecGeste.length > 0) {
      return ecartee(`l'intention ${avecGeste.join(', ')} a déjà un geste actif`)
    }
    if (m.sorte === 'question_pour_l_atelier')
      return { mission: m, statut: STATUTS_MISSION.question }
    return { mission: m, statut: STATUTS_MISSION.a_faire }
  })
  return { sorte: 'accepte', missions }
}
