import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { metierDe } from '../cli/metier'
import { FICHIER_CONFIG } from '../config'
import type { Designable } from '../conversation/designation'
import { copieClient } from '../evals/traduction'

// Pour les tests de fuite (PLAN-RONDE.md § 4.3, R10 ; PLAN-METIER-2.md M9) et
// pour l'agence (PLAN-LIVRAISON.md L3) : les clients fictifs du dépôt, et les
// noms de chacun que rien ne doit citer (la carte, la mémoire, ce qui part au
// chantier), lus par son métier sans le connaître. À l'agence, ce sont les
// seuls noms connus.

export const RACINE_DEPOT = fileURLToPath(new URL('../../..', import.meta.url))
const DOSSIER_EXEMPLES = join(RACINE_DEPOT, 'exemples')

/** Les dossiers des clients fictifs : chaque dossier d'`exemples/` qui a un `config.yaml`. */
export const CLIENTS_FICTIFS: string[] = readdirSync(DOSSIER_EXEMPLES)
  .map((d) => join(DOSSIER_EXEMPLES, d))
  .filter((d) => existsSync(join(d, FICHIER_CONFIG)))

/** Les noms d'un client fictif qui ne partent jamais au modèle (`m.noms`), lus sur une copie : ouvrir écrit un journal. */
export async function personnesFictives(dossierClient: string): Promise<Designable[]> {
  const m = await metierDe(dossierClient)
  const copie = copieClient(dossierClient)
  try {
    const s = m.ouvrir(copie)
    try {
      return m.noms(s)
    } finally {
      m.fermer(s)
    }
  } finally {
    rmSync(copie, { recursive: true, force: true })
  }
}

/** Les noms des clients fictifs de ces métiers (`agence.yaml: evals_clients`, relatifs à `racine`). */
export async function nomsFictifs(
  evalsClients: Record<string, string>,
  racine: string,
  metiers: string[],
): Promise<Designable[]> {
  const clients = metiers.flatMap((x) => evalsClients[x] ?? [])
  return (await Promise.all(clients.map((d) => personnesFictives(join(racine, d))))).flat()
}
