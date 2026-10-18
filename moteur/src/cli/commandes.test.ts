// Les commandes sont écrites une fois : la table « Les commandes » de
// GLOSSAIRE.md (REFLEXIONS.md, 2026-10-18, « Le poids »). Ce test tient la
// table et les scripts de package.json ensemble : un script sans ligne dans
// la table, ou une ligne sans script, fait échouer `pnpm check`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RACINE = join(import.meta.dirname, '..', '..', '..')
/** Les commandes de pnpm lui-même, qui ne sont pas des scripts. */
const COMMANDES_PNPM = new Set(['install', '--filter'])
/** Le titre de la section du glossaire qui porte la table. */
const SECTION = '## Les commandes'

function scriptsDeLaRacine(): string[] {
  const paquet = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>
  }
  return Object.keys(paquet.scripts ?? {})
}

/** Les noms de commande (`pnpm <nom>`) que la table du glossaire cite, chacun une fois. */
function commandesDuGlossaire(): string[] {
  const texte = readFileSync(join(RACINE, 'GLOSSAIRE.md'), 'utf8')
  const debut = texte.indexOf(SECTION)
  expect(debut, `la section « ${SECTION} » existe`).toBeGreaterThanOrEqual(0)
  const suite = texte.indexOf('\n## ', debut + SECTION.length)
  const section = texte.slice(debut, suite === -1 ? undefined : suite)
  const noms: string[] = []
  for (const ligne of section.split('\n')) {
    if (!ligne.startsWith('| `pnpm')) continue
    const cellule = ligne.slice(1).split(/(?<!\\)\|/)[0] ?? ''
    for (const [, commande] of cellule.matchAll(/`pnpm ([^`\s]+)/g)) {
      if (commande && !COMMANDES_PNPM.has(commande)) noms.push(commande)
    }
  }
  return noms
}

describe('la table des commandes du glossaire', () => {
  it('cite chaque script de package.json, et seulement eux', () => {
    const scripts = scriptsDeLaRacine().sort()
    // Un script peut tenir plusieurs lignes (`chantier --mission`, `chantier retirer`).
    const table = [...new Set(commandesDuGlossaire())].sort()
    expect(table).toEqual(scripts)
  })
})
