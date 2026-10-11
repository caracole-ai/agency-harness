import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Designable } from '../conversation/designation'

// Pour les tests de fuite (PLAN-RONDE.md § 4.3, R10) : les personnes du client
// fictif, lues dans son fichier des agents, sans ouvrir le métier. Ce que la
// carte et la mémoire ne doivent jamais citer.

export const RACINE_DEPOT = fileURLToPath(new URL('../../..', import.meta.url))

/** `exemples/client-fictif/agents.csv` : identifiant et nom de chaque agent. */
export function personnesFictives(): Designable[] {
  const lignes = readFileSync(join(RACINE_DEPOT, 'exemples', 'client-fictif', 'agents.csv'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
  const entete = (lignes[0] ?? '').split(';')
  const id = entete.indexOf('id')
  const nom = entete.indexOf('nom')
  if (id < 0 || nom < 0) throw new Error('agents.csv : colonnes id et nom attendues')
  return lignes.slice(1).map((l) => {
    const c = l.split(';')
    return { id: c[id] ?? '', nom: c[nom] ?? '' }
  })
}
