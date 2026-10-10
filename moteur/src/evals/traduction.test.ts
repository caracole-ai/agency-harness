import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ecrireInstantane } from '../echappee/echappee'
import { GESTE_EXEMPLE } from '../gestes/geste-appris.exemple'
import { casDuFichier, casDuGeste } from './traduction'

// Les cas de traduction prêts à jouer (PLAN-PROMOTION.md § 7.1, P13) : ceux
// du fichier, et les tests d'un geste appris, au moment de leur échappée.

describe('casDuGeste', () => {
  it('chaque test devient un cas : la consigne, au moment de l’instantané, doit choisir le geste avec ses paramètres ; pour un agent, l’agent n’est pas comparé', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'traduction-'))
    for (const [n, id] of ['E-1', 'E-2', 'E-3'].entries()) {
      ecrireInstantane(dossier, {
        echappee: id,
        horodatage: `2026-10-1${n}T19:40:00Z`,
        role: 'patron',
        tables: [],
      })
    }
    const geste = {
      ...GESTE_EXEMPLE,
      tests: GESTE_EXEMPLE.tests.map((t, n) => ({
        ...t,
        instantane: `echappees/E-${n + 1}.json`,
        ...(n === 2 ? { role: 'agent' as const, agent: 'A-2' } : {}),
      })),
    }
    const cas = casDuGeste(geste, dossier)
    expect(cas.map((c) => c.id)).toEqual([
      'G-heures_par_agent-1',
      'G-heures_par_agent-2',
      'G-heures_par_agent-3',
    ])
    expect(cas[0]).toMatchObject({
      strict: false,
      role: 'patron',
      consigne: 'Combien d’heures a fait Julien ?',
      attendu: {
        sorte: 'action',
        action: 'heures_par_agent',
        params: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
      },
    })
    expect(cas[0]?.quand.toString()).toBe('2026-10-10T21:40:00+02:00[Europe/Paris]')
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[2]).toMatchObject({
      role: 'agent',
      agent: 'A-2',
      attendu: { params: { du: '2026-10-05', au: '2026-10-11' } },
    })
    expect(() => casDuGeste(GESTE_EXEMPLE, mkdtempSync(join(tmpdir(), 'vide-')))).toThrow(
      'instantané absent',
    )
  })
})

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
            agent: 'A-2',
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
      agent: 'A-2',
    })
    expect(cas[0]?.quand.hour).toBe(21)
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[1]?.strict).toBe(false)
  })
})
