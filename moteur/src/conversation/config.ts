import { z } from 'zod'
import { EFFORTS, type PrixModele } from '../modele/modele'

// La section `conversation` de la config d'un client : le modèle, ses prix,
// l'effort par usage, les plafonds (par demande et par mois) et le seuil de
// promotion. Validée au démarrage : un plafond absent n'est jamais « infini »
// (PLAN-ESPACES.md § 4.5).

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
  }),
  plafonds: z.strictObject({
    par_demande: z.strictObject({
      tours: z.number().int().positive(),
      tokens_sortie: z.number().int().positive(),
      secondes: z.number().int().positive(),
    }),
    par_mois_usd: z.number().positive(),
  }),
  promotion: z.strictObject({
    occurrences: z.number().int().positive(),
    jours: z.number().int().positive(),
  }),
})
export type ConfigConversation = z.infer<typeof ConversationSchema>

/** Les prix de la config, dans les noms du moteur. */
export const prixDe = (c: ConfigConversation): PrixModele => {
  const p = c.modele.prix_par_million_usd
  return { entree: p.entree, sortie: p.sortie, cacheEcrit: p.cache_ecrit, cacheLu: p.cache_lu }
}
