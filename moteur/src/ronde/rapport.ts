import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { interdits } from '../chantier/memoire'
import { FORMAT_INTENTION, schemaJson } from '../conversation/actions'
import type { Designable } from '../conversation/designation'
import { A_L_ATELIER, type Catalogue, PROMOTION_EN_COURS, type Resume } from './resume'

// Le rapport de la ronde (PLAN-RONDE.md § 5.2, R3) : un schéma strict, l'outil
// (ou la sortie structurée du binaire, § 0.a) et la revalidation en code. Une
// faute du modèle (une échappée qui n'est pas dans la fenêtre, une
// consigne-type qui porte un identifiant ou un nom, un rapport incohérent) fait
// refuser tout le rapport : il est écrit quand même, sans mission. L'état du
// catalogue (un geste actif, une mission déjà ouverte ou retirée) écarte une
// mission, en le disant ; une intention au seuil de promotion la marque
// « promotion en cours » (§ 0.b) : aucun chantier.

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
  consignes_types: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(5)
    .describe(
      'la demande réécrite avec des places entre chevrons (<agent>, <du>, <au>, <site>), sans aucun identifiant ni nom',
    ),
  ecrit: z.boolean().describe('vrai si la demande modifie le planning'),
  estimation: z.enum(ESTIMATIONS),
})
export type MissionRonde = z.infer<typeof MissionRonde>

/** Le schéma du rapport, borné par la config (`ronde.missions_max`). */
export const schemaRapport = (missionsMax: number) =>
  z.strictObject({
    observations: z
      .array(z.string().max(OBSERVATION_LONGUEUR_MAX))
      .max(OBSERVATIONS_MAX)
      .describe('ce que la ronde a remarqué, en phrases courtes'),
    missions: z.array(MissionRonde).max(missionsMax),
    rien_a_signaler: z.boolean().describe('vrai si et seulement si aucune mission'),
  })
export type RapportDeRonde = z.infer<ReturnType<typeof schemaRapport>>

const DESCRIPTION_OUTIL =
  'Rends le rapport de la ronde : observations, missions désignées par identifiants, ou rien à signaler.'

/** L'outil de la ronde sous acces: anthropic (un seul appel, schéma strict). */
export const outilRapport = (missionsMax: number): Anthropic.Tool => ({
  name: OUTIL_RAPPORT,
  description: DESCRIPTION_OUTIL,
  input_schema: schemaJson(schemaRapport(missionsMax)),
  strict: true,
})

/** Le même schéma, pour `--json-schema` du binaire (§ 0.a). */
export const schemaJsonRapport = (missionsMax: number) => schemaJson(schemaRapport(missionsMax))

/** Deux listes d'intentions non vides, aux mêmes éléments. */
const memesIntentions = (a: string[], b: string[]) =>
  a.length > 0 && a.length === b.length && a.every((x) => b.includes(x))

/** Ce que devient une mission revalidée. */
export const STATUTS_MISSION = {
  a_faire: 'à faire',
  promotion: PROMOTION_EN_COURS,
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
 * G2) ; `personnes` : toutes celles du client, pour qu'aucune consigne-type
 * ne porte un nom ou un identifiant.
 */
export function revalider(
  rapport: RapportDeRonde,
  resume: Resume,
  catalogue: Catalogue,
  config: { missionsMax: number; retirees: string[]; personnes: Designable[] },
): Revalidation {
  const ecarts: string[] = []
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
      // R3 : `fuites`, les identifiants connus, et toute forme d'identifiant d'agent.
      if (trouves.length > 0 || /\bA-\d+\b/.test(c)) {
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
    if (config.retirees.includes(m.id))
      return ecartee('mission retirée (mémoire) : jamais reproposée')
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
    // Les intentions du catalogue au seuil, sans échec de fabrication : la promotion les prend (§ 0.b, R3).
    // Une factorisation dont une intention seulement est au seuil reste un chantier.
    const enCours = m.intentions.filter((i) => intentions.get(i)?.promotion === PROMOTION_EN_COURS)
    if (enCours.length > 0 && enCours.length === m.intentions.length) {
      return {
        mission: m,
        statut: STATUTS_MISSION.promotion,
        raison: `${enCours.join(', ')} : au seuil de promotion, pnpm promotions la prend`,
      }
    }
    const atelier = m.intentions.filter((i) => intentions.get(i)?.promotion === A_L_ATELIER)
    return {
      mission: m,
      statut: STATUTS_MISSION.a_faire,
      ...(atelier.length > 0
        ? { raison: `${atelier.join(', ')} : fabrication échouée, à coder à l'atelier` }
        : {}),
    }
  })
  return { sorte: 'accepte', missions }
}
