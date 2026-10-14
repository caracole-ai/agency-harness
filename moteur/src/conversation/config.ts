import { z } from 'zod'
import { EFFORTS, type PrixModele } from '../modele/modele'

// La section `conversation` de la config d'un client : le modèle, ses prix,
// l'effort par usage, les plafonds (par demande et par mois) et le seuil de
// promotion. Validée au démarrage : un plafond absent n'est jamais « infini »
// (PLAN-ESPACES.md § 4.5).

/** Comment la clé se présente : l'en-tête d'Anthropic, ou `Authorization: Bearer`. */
export const AUTHENTIFICATIONS = ['x-api-key', 'bearer'] as const

/** La variable d'environnement de la clé quand la config ne nomme pas de point d'accès. */
export const VARIABLE_CLE_ANTHROPIC = 'ANTHROPIC_API_KEY'

export const ConversationSchema = z.strictObject({
  modele: z.strictObject({
    fournisseur: z.literal('anthropic'),
    id: z.string().min(1),
    prix_par_million_usd: z.strictObject({
      entree: z.number().nonnegative(),
      sortie: z.number().nonnegative(),
      cache_ecrit: z.number().nonnegative(),
      cache_lu: z.number().nonnegative(),
    }),
    effort: z.strictObject({ traduire: z.enum(EFFORTS), echappee: z.enum(EFFORTS) }),
    /**
     * Un point d'accès au format Anthropic autre que celui d'Anthropic (GMI Cloud…).
     * Absent : l'API d'Anthropic, la clé dans `ANTHROPIC_API_KEY`.
     */
    acces: z
      .strictObject({
        url: z.url(),
        authentification: z.enum(AUTHENTIFICATIONS),
        /** Le nom de la variable d'environnement qui porte la clé, jamais la clé elle-même. */
        variable_cle: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
      })
      .optional(),
  }),
  plafonds: z.strictObject({
    par_demande: z.strictObject({
      tours: z.number().int().positive(),
      tokens_sortie: z.number().int().positive(),
      secondes: z.number().int().positive(),
    }),
    /**
     * Le plafond d'une fabrication de geste appris (PLAN-PROMOTION.md § 6.1), à
     * part de celui d'une demande : sa réflexion relit chaque réponse montrée et
     * dépasse celle d'une échappée. Absent, celui de la demande.
     */
    fabrication: z.strictObject({ tokens_sortie: z.number().int().positive() }).optional(),
    par_mois_usd: z.number().positive(),
  }),
  promotion: z.strictObject({
    occurrences: z.number().int().positive(),
    jours: z.number().int().positive(),
    /** Combien de jours un instantané d'échappée (`echappees/<id>.json`) est gardé avant la purge (PLAN-PROMOTION.md P8). */
    conservation_jours: z.number().int().positive().default(90),
  }),
})
export type ConfigConversation = z.infer<typeof ConversationSchema>

/** Les tokens de sortie laissés à une fabrication : son plafond s'il est déclaré, sinon celui de la demande. */
export const plafondFabrication = (c: ConfigConversation): number =>
  c.plafonds.fabrication?.tokens_sortie ?? c.plafonds.par_demande.tokens_sortie

/** Les prix de la config, dans les noms du moteur. */
export const prixDe = (c: ConfigConversation): PrixModele => {
  const p = c.modele.prix_par_million_usd
  return { entree: p.entree, sortie: p.sortie, cacheEcrit: p.cache_ecrit, cacheLu: p.cache_lu }
}
