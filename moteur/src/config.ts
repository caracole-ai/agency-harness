import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z } from 'zod'
import type { Registre } from './regles/schema'

// La config d'un client (`clients/<slug>/config.yaml`, jamais versionnée ;
// `exemples/<slug>/` pour les clients fictifs). C'est elle, le sur-mesure.
// Validée au démarrage : un réglage manquant arrête tout, il ne devient pas
// un comportement silencieux.

export const PolitiqueSchema = z.strictObject({
  /** La lecture qui décide du verdict, par interdit : la politique du client, recueillie chez lui. */
  lectures_reference: z.record(z.string().regex(/^I-\d{2}$/), z.string()).optional(),
})
export type Politique = z.infer<typeof PolitiqueSchema>

/**
 * Une délégation (G-01) : le client confie au harnais une action précise, dans
 * des conditions écrites ; toutes doivent tenir, sinon la décision revient en
 * validation. Révocable en la retirant de la config. Le métier fixe le
 * catalogue des conditions ; une condition inconnue arrête le démarrage.
 */
export const DelegationSchema = z.strictObject({
  action: z.string().min(1),
  conditions: z.record(z.string(), z.union([z.boolean(), z.number()])),
  accordee_le: z.iso.date(),
  par: z.string().min(1),
})
export type Delegation = z.infer<typeof DelegationSchema>

/** Les conditions d'une délégation qui ne tiennent pas dans ce cas (vide : elle s'applique). */
export function conditionsManquantes(
  delegation: Delegation,
  tient: (condition: string, valeur: boolean | number) => boolean,
): string[] {
  return Object.entries(delegation.conditions)
    .filter(([condition, valeur]) => !tient(condition, valeur))
    .map(([condition]) => condition)
}

/** Ce que toute config porte, quel que soit le métier. Le métier valide le reste. */
export const ConfigBase = z.looseObject({
  client: z.string().min(1),
  metier: z.string().min(1),
})

export const FICHIER_CONFIG = 'config.yaml'

export function chargerConfig<T>(chemin: string, schema: z.ZodType<T>): T {
  const resultat = schema.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!resultat.success) {
    throw new Error(
      `config invalide, démarrage refusé : ${chemin}\n${z.prettifyError(resultat.error)}`,
    )
  }
  return resultat.data
}

/**
 * Le registre tel que ce client l'applique : sa politique déplace la lecture
 * de référence d'une règle ⚠ (par défaut la loi générale). Une lecture qui
 * n'existe pas au registre arrête tout.
 */
export function appliquerPolitique(registre: Registre, politique?: Politique): Registre {
  const choix = politique?.lectures_reference ?? {}
  for (const [id, lecture] of Object.entries(choix)) {
    const interdit = registre.interdits.find((i) => i.id === id)
    if (!interdit?.lectures?.some((l) => l.id === lecture)) {
      throw new Error(`politique du client : ${id} n'a pas de lecture « ${lecture} » au registre`)
    }
  }
  return {
    ...registre,
    interdits: registre.interdits.map((i) => {
      const lecture = choix[i.id]
      if (!lecture || !i.lectures) return i
      return { ...i, lectures: i.lectures.map((l) => ({ ...l, reference: l.id === lecture })) }
    }),
  }
}
