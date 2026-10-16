import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { z } from 'zod'
import { chargerConfig } from '../config'

// La livraison d'un client (PLAN-LIVRAISON.md L5) : `<dossier client>/livraison.yaml`,
// un fichier à part (les schémas des métiers ne bougent pas). Sans lui, le
// harnais n'est pas livré : tout reste local (la mission s'écrit chez le
// client, `pnpm chantier --mission` la prend à la main, ses statuts se lisent à
// côté d'elle) ; c'est le seul interrupteur (L12). Les clés SSH des deux
// dépôts sont dans la config SSH de la machine, jamais ici.

export const FICHIER_LIVRAISON = 'livraison.yaml'

export const Livraison = z.strictObject({
  /** Le dépôt du produit (l'`origin` de l'agence), en lecture seule : les versions (lot 4). */
  depot: z.string().min(1),
  /** La file du client (`missions-<slug>`), en lecture et écriture : missions, statuts, dossiers. */
  missions: z.string().min(1),
  /** Hors du dossier client : `depot/`, `versions/<tag>/`, `courant`, `precedent`, `missions/` (le clone de la file). */
  installation: z.string().refine(isAbsolute, { message: 'un chemin absolu' }),
  /** Le pas du rattrapage (statuts, versions), en minutes. */
  intervalle_minutes: z.number().int().positive(),
})
export type Livraison = z.infer<typeof Livraison>

/** `<dossier>/livraison.yaml`, validé ; undefined sans fichier (le client n'est pas livré). Lève si l'installation est dans le dossier client. */
export function lireLivraison(dossier: string): Livraison | undefined {
  const chemin = join(dossier, FICHIER_LIVRAISON)
  if (!existsSync(chemin)) return undefined
  const l = chargerConfig(chemin, Livraison)
  const dedans = relative(resolve(dossier), resolve(l.installation))
  if (!dedans.startsWith('..') && !isAbsolute(dedans)) {
    throw new Error(
      `${chemin} : l'installation (${l.installation}) doit être hors du dossier client`,
    )
  }
  return l
}
