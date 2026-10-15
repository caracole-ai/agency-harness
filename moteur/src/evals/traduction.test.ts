import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { casDuFichier, copieClient } from './traduction'

// Les cas de traduction prêts à jouer, du fichier `consignes.yaml`, et la
// copie fraîche du client sur laquelle chacun tourne.

describe('casDuFichier', () => {
  it('garde l’identifiant, la variante, la catégorie stricte, et calcule le moment', () => {
    const cas = casDuFichier(
      {
        maintenant: '2026-10-10T21:40',
        variantes: { homonyme: { fichier: 'agents.csv', remplacer: 'a', par: 'b' } },
        cas: [
          {
            id: 'X',
            role: 'agent',
            personne: 'A-2',
            variante: 'homonyme',
            categorie: 'agent_patron',
            consigne: 'x',
            attendu: { sorte: 'inconnue' },
          },
          {
            id: 'Y',
            role: 'patron',
            maintenant: '2026-10-11T08:00',
            consigne: 'y',
            attendu: { sorte: 'inconnue' },
          },
        ],
      },
      new Set(['X', 'Y']),
    )
    expect(cas[0]).toMatchObject({
      id: 'X',
      strict: true,
      piege: { fichier: 'agents.csv' },
      personne: 'A-2',
    })
    expect(cas[0]?.quand.hour).toBe(21)
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[1]?.strict).toBe(false)
  })
})

describe('copieClient', () => {
  it('écarte le journal et le rapport du client', () => {
    const source = join(mkdtempSync(join(tmpdir(), 'copie-')), 'client')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'config.yaml'), 'client: x\n')
    writeFileSync(join(source, 'journal.sqlite'), '')
    writeFileSync(join(source, 'rapport-demo.md'), '')
    const copie = copieClient(source)
    expect(existsSync(join(copie, 'config.yaml'))).toBe(true)
    expect(existsSync(join(copie, 'journal.sqlite'))).toBe(false)
    expect(existsSync(join(copie, 'rapport-demo.md'))).toBe(false)
  })
})
