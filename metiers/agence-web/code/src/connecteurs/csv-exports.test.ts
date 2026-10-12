import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { NOMS_TABLES } from '../modele'
import { type FichiersAgenceWeb, lireAgenceWeb } from './csv-exports'

// Le connecteur CSV de l'agence web (PLAN-METIER-2.md § 7.1) : il lit chaque
// table du client fictif, et refuse un fichier dont les colonnes s'écartent
// du § 7.2.

const EXEMPLE = fileURLToPath(
  new URL('../../../../../exemples/agence-web-fictive', import.meta.url),
)
const FICHIERS = Object.fromEntries(NOMS_TABLES.map((t) => [t, `${t}.csv`])) as FichiersAgenceWeb

const copies: string[] = []
afterEach(() => {
  for (const d of copies.splice(0)) rmSync(d, { recursive: true, force: true })
})
/** Une copie du client fictif dont un fichier est réécrit : jamais d'écriture dans `exemples/`. */
function copieAvec(fichier: string, transformer: (texte: string) => string): string {
  const d = mkdtempSync(join(tmpdir(), 'agence-web-'))
  copies.push(d)
  cpSync(EXEMPLE, d, { recursive: true })
  writeFileSync(join(d, fichier), transformer(readFileSync(join(d, fichier), 'utf8')))
  return d
}
/** Retire une colonne d'un CSV, en-tête et cellules. */
const sansColonne = (colonne: string) => (texte: string) => {
  const lignes = texte
    .trimEnd()
    .split('\n')
    .map((l) => l.split(';'))
  const i = (lignes[0] ?? []).indexOf(colonne)
  return `${lignes.map((l) => l.filter((_, k) => k !== i).join(';')).join('\n')}\n`
}

describe('lireAgenceWeb', () => {
  it('lit chaque table du client fictif, une entrée par ligne de son fichier', () => {
    const ctx = lireAgenceWeb(EXEMPLE, FICHIERS)
    for (const t of NOMS_TABLES) {
      const lignes =
        readFileSync(join(EXEMPLE, FICHIERS[t]), 'utf8').trimEnd().split('\n').length - 1
      const table = ctx[t]
      expect(Array.isArray(table) ? table.length : table.size, t).toBe(lignes)
    }
  })

  it('rend des valeurs typées : euros, nombres, oui/non, listes, cellules vides', () => {
    const ctx = lireAgenceWeb(EXEMPLE, FICHIERS)
    const lot = [...ctx.lots.values()][0]
    expect(typeof lot?.montant_ht_eur).toBe('number')
    expect(typeof ctx.clients.get('CLI-01')?.contrat_art28).toBe('boolean')
    expect(ctx.depots.get('prj-12-web')?.collaborateurs).toEqual(['M-05', 'M-06'])
    expect(ctx.projets.get('PRJ-17')?.client).toBeUndefined()
  })

  it('une colonne manquante lève, avec le fichier et la colonne', () => {
    const d = copieAvec('lots.csv', sansColonne('pv_signe_le'))
    expect(() => lireAgenceWeb(d, FICHIERS)).toThrow(
      /lots\.csv : colonnes « pv_signe_le » manquante/,
    )
  })

  it('une colonne en trop lève, avec le fichier et la colonne', () => {
    const d = copieAvec('temps.csv', (t) =>
      t
        .trimEnd()
        .split('\n')
        .map((l, i) => `${l};${i === 0 ? 'ticket' : ''}`)
        .join('\n'),
    )
    expect(() => lireAgenceWeb(d, FICHIERS)).toThrow(/temps\.csv : colonnes « ticket » inconnue/)
  })

  it('une cellule illisible lève, avec le fichier et la ligne', () => {
    const d = copieAvec('factures.csv', (t) => t.replace(/;0\.2;/, ';vingt;'))
    expect(() => lireAgenceWeb(d, FICHIERS)).toThrow(/factures\.csv, ligne 2 : tva/)
  })

  it('un fichier vide lève : son en-tête manque', () => {
    const d = copieAvec('versions.csv', () => '')
    expect(() => lireAgenceWeb(d, FICHIERS)).toThrow(/versions\.csv : fichier vide/)
  })
})
