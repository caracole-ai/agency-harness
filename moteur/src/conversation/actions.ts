import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Temporal } from '../temps/temporal'

// Les gestes du quotidien (espace 1) : une liste fermée d'actions codées, que
// le modèle ne fait que choisir. Le métier les écrit (`ACTIONS`) ; ce fichier
// dit leur forme, qui peut quoi, et ce qu'on envoie au modèle : un outil par
// action, en mode strict, plus deux méta-outils pour « demande nouvelle » et
// « je ne sais pas » (PLAN-ESPACES.md § 5.1 et § 5.3). Un paramètre qui
// désigne une personne est montré au modèle comme une mention en texte libre,
// jamais comme un identifiant : le modèle ne voit aucun nom, le moteur trouve
// la personne (REFLEXIONS.md, décidé le 2026-10-08, `designation.ts`).

export const ROLES = ['patron', 'agent'] as const
export type Role = (typeof ROLES)[number]

/** Qui parle. `agent` est obligatoire pour le rôle `agent` et doit exister dans le planning. */
export interface Identite {
  role: Role
  agent?: string
}

export interface Resultat {
  /** Rendu par le code, montré tel quel au demandeur. */
  texte: string
  /** Ce qui a servi au texte ; va au journal. */
  donnees?: unknown
  /** Des modifications calculées sans rien écrire (un geste appris qui écrit) : la conversation les traite comme une proposition d'échappée (PLAN-PROMOTION.md § 10). */
  modifications?: unknown[]
}

export interface Action<Session, Params> {
  /** snake_case ASCII : `gerer_absence`. C'est le nom de l'outil envoyé au modèle. */
  id: string
  /** Une phrase pour le modèle, en français, 200 caractères au plus. */
  description: string
  /** `z.strictObject` ; chaque champ porte `.describe()`. Pas de champ optionnel : `nullable()` quand il peut manquer. */
  parametres: z.ZodType<Params>
  /**
   * Les paramètres qui désignent une personne, et ce que le modèle y met à la
   * place de l'identifiant : la mention telle qu'écrite, ou null (avec son
   * sens pour ce geste). Le moteur résout la mention en identifiant avant
   * l'exécution. Les exemples ne citent aucun nom des données.
   */
  personnes?: Record<string, string>
  roles: Role[]
  /** true : l'action inscrit une validation ou écrit chez le client → elle n'est exécutée qu'après un « oui » explicite à sa reformulation (ou, avec `propose`, à sa proposition). */
  ecrit: boolean
  /**
   * true : l'exécution ne fait que calculer des modifications, sans rien
   * écrire ; elles passent par la proposition du métier (contrôles, oui du
   * patron, oui de chaque agent, clé sur la liste exacte), exactement comme
   * une proposition d'échappée. Un geste appris qui écrit (PLAN-PROMOTION.md § 10).
   */
  propose?: true
  /** La phrase de confirmation, rendue par le code. Lève si l'action est impossible pour ce demandeur. */
  reformuler(s: Session, identite: Identite, params: Params): string
  /** Synchrone pour les gestes codés ; un geste appris lit sa copie dans un processus enfant et rend une promesse (PLAN-PROMOTION.md § 5.3). */
  executer(
    s: Session,
    identite: Identite,
    params: Params,
    maintenant: Temporal.ZonedDateTime,
  ): Resultat | Promise<Resultat>
}

export const DESCRIPTION_MAX = 200

/** Les actions ouvertes à ce rôle. */
export function actionsDe<S>(actions: Action<S, unknown>[], role: Role): Action<S, unknown>[] {
  return actions.filter((a) => a.roles.includes(role))
}

/**
 * Le schéma JSON d'un outil strict : le fournisseur exige
 * `additionalProperties: false` et toutes les clés dans `required` (d'où des
 * champs `nullable()` plutôt qu'`optional()`).
 */
export function schemaJson(schema: z.ZodType<unknown>): Anthropic.Tool['input_schema'] {
  const { $schema: _, ...json } = z.toJSONSchema(schema) as Record<string, unknown>
  const properties = (json.properties ?? {}) as Record<string, unknown>
  return {
    ...json,
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

const outil = (name: string, description: string, schema: z.ZodType<unknown>): Anthropic.Tool => {
  if (description.length > DESCRIPTION_MAX) {
    throw new Error(`l'outil ${name} a une description de plus de ${DESCRIPTION_MAX} caractères`)
  }
  return { name, description, input_schema: schemaJson(schema), strict: true }
}

export const DEMANDE_NOUVELLE = 'demande_nouvelle'
export const JE_NE_SAIS_PAS = 'je_ne_sais_pas'

/** La forme d'un mot-clé d'intention : snake_case ASCII, 60 caractères au plus. */
export const FORMAT_INTENTION = /^[a-z0-9_]{1,60}$/

/**
 * Une sorte de demande nouvelle que le métier connaît déjà : le mot-clé que le
 * modèle réutilise, et ce qu'il désigne. La promotion compte par mot-clé exact
 * (§ 8) : sans vocabulaire montré, la même demande reçoit un mot différent
 * d'une fois sur l'autre.
 */
export interface Intention {
  /** Au format `FORMAT_INTENTION` : `liberer_un_jour`. */
  id: string
  /** Une phrase pour le modèle, en français. */
  description: string
  /** true : la demande écrit dans les données ; la promotion en fabrique un geste qui propose des réaffectations (PLAN-PROMOTION.md § 10). */
  ecrit: boolean
}

export const DemandeNouvelle = z.strictObject({
  intention: z
    .string()
    .regex(FORMAT_INTENTION)
    .describe(
      'un mot-clé en snake_case : l’une des intentions connues quand elle convient, sinon un mot nouveau, le même d’une fois sur l’autre pour la même sorte de demande',
    ),
  resume: z.string().describe('la demande reformulée en une phrase, sans rien inventer'),
})
export type DemandeNouvelle = z.infer<typeof DemandeNouvelle>

export const JeNeSaisPas = z.strictObject({
  raison: z.string().describe('pourquoi la consigne ne peut pas être traduite'),
})
export type JeNeSaisPas = z.infer<typeof JeNeSaisPas>

/** Les deux méta-outils : ce que le modèle choisit quand aucune action ne convient. */
export const META_OUTILS: Anthropic.Tool[] = [
  outil(
    DEMANDE_NOUVELLE,
    'La consigne est claire mais aucune action ne la couvre : une question sur les données, une simulation, une réorganisation.',
    DemandeNouvelle,
  ),
  outil(
    JE_NE_SAIS_PAS,
    'La consigne est inintelligible, trop vague pour choisir, ou demande autre chose que du travail sur le planning et les agents.',
    JeNeSaisPas,
  ),
]

/**
 * Le schéma que le modèle voit pour une action : celui de l'exécution, où
 * chaque paramètre qui désigne une personne devient une mention (texte ou
 * null). C'est aussi le schéma qui lit sa réponse.
 */
export function schemaMontre<S>(action: Action<S, unknown>): z.ZodType<unknown> {
  const personnes = Object.entries(action.personnes ?? {})
  if (personnes.length === 0) return action.parametres
  const objet = action.parametres
  if (!(objet instanceof z.ZodObject)) {
    throw new Error(`${action.id} : des personnes dans des paramètres qui ne sont pas un objet`)
  }
  const mentions: Record<string, z.ZodType> = {}
  for (const [champ, description] of personnes) {
    if (!(champ in objet.shape)) throw new Error(`${action.id} : pas de paramètre ${champ}`)
    mentions[champ] = z.string().nullable().describe(description)
  }
  return z.strictObject({ ...objet.shape, ...mentions })
}

/** Les outils à envoyer au modèle : un par action du rôle, `strict: true`, plus les deux méta-outils. */
export function outilsDe<S>(actions: Action<S, unknown>[], role: Role): Anthropic.Tool[] {
  return [
    ...actionsDe(actions, role).map((a) => outil(a.id, a.description, schemaMontre(a))),
    ...META_OUTILS,
  ]
}
