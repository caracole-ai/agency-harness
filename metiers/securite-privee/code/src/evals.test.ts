import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CATEGORIE_AGENT_PATRON,
  DESCRIPTION_MAX,
  FichierEchappee,
  FichierTraduire,
  FORMAT_INTENTION,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ACTIONS } from './actions'
import { INTENTIONS } from './conversation'

// Les fichiers d'étiquettes des évals (`evals/`) se lisent et couvrent ce que
// le plan exige (PLAN-ESPACES.md § 9.1) : sans appel au modèle, cette garde
// tourne dans `pnpm check`.

const evals = fileURLToPath(new URL('../../../../evals', import.meta.url))
const traduire = FichierTraduire.parse(parse(readFileSync(`${evals}/consignes.yaml`, 'utf8')))
const echappee = FichierEchappee.parse(parse(readFileSync(`${evals}/echappees.yaml`, 'utf8')))
const sortes = (a: { sorte: string | string[] }) => (Array.isArray(a.sorte) ? a.sorte : [a.sorte])

describe('les consignes de l’éval de traduction', () => {
  it('au moins 40, aux identifiants uniques', () => {
    expect(traduire.cas.length).toBeGreaterThanOrEqual(40)
    expect(new Set(traduire.cas.map((c) => c.id)).size).toBe(traduire.cas.length)
  })
  it('chaque geste, au moins trois formulations, ouvert au rôle qui le demande', () => {
    for (const a of ACTIONS) {
      const cas = traduire.cas.filter((c) => c.attendu.action === a.id)
      expect(cas.length, a.id).toBeGreaterThanOrEqual(3)
      for (const c of cas) expect(a.roles, `${c.id} (${c.role})`).toContain(c.role)
    }
  })
  it('8 demandes nouvelles, 4 tentatives d’un agent sur un geste du patron, jamais attendues en action', () => {
    expect(
      traduire.cas.filter((c) => sortes(c.attendu).includes('nouvelle') && c.attendu.intention)
        .length,
    ).toBeGreaterThanOrEqual(8)
    const tentatives = traduire.cas.filter((c) => c.categorie === CATEGORIE_AGENT_PATRON)
    expect(tentatives.length).toBeGreaterThanOrEqual(4)
    for (const c of tentatives) {
      expect(c.role).toBe('agent')
      expect(sortes(c.attendu)).not.toContain('action')
    }
  })
  it('les intentions attendues sont des intentions connues du métier, elles-mêmes bien formées', () => {
    const ids = INTENTIONS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const i of INTENTIONS) {
      expect(i.id).toMatch(FORMAT_INTENTION)
      expect(i.description.length, i.id).toBeLessThanOrEqual(DESCRIPTION_MAX)
    }
    for (const c of traduire.cas) {
      for (const mot of c.attendu.intention ?? []) expect(ids, c.id).toContain(mot)
    }
  })
  it('les agents nommés existent au client fictif', () => {
    const agents = readFileSync(
      fileURLToPath(new URL('../../../../exemples/client-fictif/agents.csv', import.meta.url)),
      'utf8',
    )
    for (const c of traduire.cas.filter((x) => x.agent))
      expect(agents, c.id).toContain(`${c.agent};`)
  })
})

describe('les cas de l’éval de l’échappée', () => {
  it('au moins 10, dont 2 piégés, aux identifiants uniques', () => {
    expect(echappee.cas.length).toBeGreaterThanOrEqual(10)
    expect(echappee.cas.filter((c) => c.piege).length).toBeGreaterThanOrEqual(2)
    expect(new Set(echappee.cas.map((c) => c.id)).size).toBe(echappee.cas.length)
  })
  it('le piège porte sur une cellule qui existe', () => {
    const fichier = readFileSync(
      fileURLToPath(
        new URL(`../../../../exemples/client-fictif/${echappee.piege.fichier}`, import.meta.url),
      ),
      'utf8',
    )
    expect(fichier).toContain(echappee.piege.remplacer)
  })
})
