import { fileURLToPath } from 'node:url'
import { chargerRegistre, executer } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { rejouer } from './cas'
import { CONTROLES } from './controles'
import { Planning } from './modele'
import { contexte } from './semantique'

const registre = chargerRegistre(fileURLToPath(new URL('../..', import.meta.url)))

describe('scénarios du registre', () => {
  const rejouables = registre.scenarios.filter((s) => s.cas !== undefined)
  it('il y en a', () => {
    expect(rejouables.length).toBeGreaterThan(0)
  })
  for (const s of rejouables) {
    it(`${s.id} : ${s.alors}`, () => {
      expect(rejouer(s, registre).ecarts).toEqual([])
    })
  }
})

// Cas qui ne sont pas des T-xx de la fiche : ils éprouvent les choix de conception.
const verdicts = (brut: unknown, regle: string) =>
  Object.fromEntries(
    executer(CONTROLES, contexte(Planning.parse(brut)), registre)
      .filter((c) => c.regle === regle)
      .map((c) => [c.objet, c.verdict]),
  )
const poste = { id: 'P-1', site: 'S-1', activite: 'surveillance-humaine' }

describe('I-05, choix de conception', () => {
  it('nature du service inconnue : la loi décide (refus sous 11 h), la CCN 7.01 est notée', () => {
    const planning = {
      agents: [{ id: 'A-1', nom: 'A' }],
      postes: [poste],
      vacations: [
        {
          id: 'V-1',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-05T21:00',
          fin: '2026-10-06T07:00',
        },
        {
          id: 'V-2',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-06T17:30',
          fin: '2026-10-06T21:00',
        },
      ],
    }
    expect(verdicts(planning, 'I-05')['V-2']).toBe('refus')
  })
  it('13 h d’affilée sur deux jours civils : à vérifier, pas un refus', () => {
    const planning = {
      agents: [{ id: 'A-1', nom: 'A' }],
      postes: [poste],
      vacations: [
        {
          id: 'V-1',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-05T19:00',
          fin: '2026-10-06T08:00',
        },
      ],
    }
    expect(verdicts(planning, 'I-05')['V-1']).toBe('à vérifier')
  })
  it('deux vacations qui se chevauchent : refus', () => {
    const planning = {
      agents: [{ id: 'A-1', nom: 'A' }],
      postes: [poste],
      vacations: [
        {
          id: 'V-1',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-05T08:00',
          fin: '2026-10-05T16:00',
        },
        {
          id: 'V-2',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-05T15:00',
          fin: '2026-10-05T18:00',
        },
      ],
    }
    expect(verdicts(planning, 'I-05')['V-2']).toBe('refus')
  })
})

describe('données absentes (G-02)', () => {
  it('sans carte connue, ni refus ni ok : à vérifier', () => {
    const planning = {
      agents: [{ id: 'A-1', nom: 'A' }],
      postes: [poste],
      vacations: [
        {
          id: 'V-1',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-06T08:00',
          fin: '2026-10-06T16:00',
        },
      ],
    }
    for (const regle of ['I-01', 'I-02', 'I-03', 'I-20']) {
      expect(verdicts(planning, regle)['V-1']).toBe('à vérifier')
    }
  })
  it('un poste purement SSIAP ne demande pas de carte professionnelle', () => {
    const planning = {
      agents: [{ id: 'A-1', nom: 'A' }],
      postes: [{ id: 'P-1', site: 'S-1', ssiap: 1 }],
      vacations: [
        {
          id: 'V-1',
          agent: 'A-1',
          poste: 'P-1',
          debut: '2026-10-06T08:00',
          fin: '2026-10-06T16:00',
        },
      ],
    }
    expect(verdicts(planning, 'I-01')).toEqual({})
  })
})
