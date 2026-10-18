import { z } from 'zod'
import { EFFORTS, type PrixModele } from '../modele/modele'

// La section `conversation` de la config d'un client : le modèle, ses prix,
// l'effort par usage, les plafonds (par demande et par mois). Validée au
// démarrage : un plafond absent n'est jamais « infini »
// (PLAN-ESPACES.md § 4.5).

/** La variable d'environnement de la clé quand la config ne nomme pas de binaire. */
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
     * L'abonnement claude.ai par le binaire de Claude Code (son nom ou un
     * chemin ; aucune clé, ANTHROPIC_API_KEY absente : PLAN-RONDE.md § 0.a).
     * Absent : l'API d'Anthropic, la clé dans `ANTHROPIC_API_KEY`. Un seul
     * fournisseur, aucun autre point d'accès (2026-10-18).
     */
    acces: z.strictObject({ binaire: z.string().min(1) }).optional(),
  }),
  plafonds: z.strictObject({
    par_demande: z.strictObject({
      tours: z.number().int().positive(),
      tokens_sortie: z.number().int().positive(),
      secondes: z.number().int().positive(),
    }),
    par_mois_usd: z.number().positive(),
  }),
})
export type ConfigConversation = z.infer<typeof ConversationSchema>

/** Les prix de la config, dans les noms du moteur. */
export const prixDe = (c: ConfigConversation): PrixModele => {
  const p = c.modele.prix_par_million_usd
  return { entree: p.entree, sortie: p.sortie, cacheEcrit: p.cache_ecrit, cacheLu: p.cache_lu }
}
