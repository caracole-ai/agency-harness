import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CATEGORIE_AGENT_PATRON,
  DESCRIPTION_MAX,
  FichierEchappee,
  FichierGestes,
  FichierTraduire,
  FORMAT_INTENTION,
  type GesteAppris,
  gesteDe,
  lireFichiersGestes,
  personneDuTest,
  TESTS_MIN,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ACTIONS } from './actions'
import { INTENTIONS } from './conversation'
import { OPERATION_REAFFECTER } from './operation-reaffecter'

// Les fichiers d'étiquettes des évals (`evals/`) se lisent et couvrent ce que
// le plan exige (PLAN-ESPACES.md § 9.1) : sans appel au modèle, cette garde
// tourne dans `pnpm check`. Les gestes appris (de l'éval de rejeu, et ceux du
// client fictif s'il en a) passent le même test d'honnêteté que les gestes
// codés (PLAN-PROMOTION.md § 7.3, P13).

const evals = fileURLToPath(new URL('../../evals', import.meta.url))
const fictif = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const traduire = FichierTraduire.parse(parse(readFileSync(`${evals}/consignes.yaml`, 'utf8')))
const echappee = FichierEchappee.parse(parse(readFileSync(`${evals}/echappees.yaml`, 'utf8')))
const sortes = (a: { sorte: string | string[] }) => (Array.isArray(a.sorte) ? a.sorte : [a.sorte])
const agentsFictif = readFileSync(`${fictif}/agents.csv`, 'utf8')

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
    for (const c of traduire.cas.filter((x) => x.personne))
      expect(agentsFictif, c.id).toContain(`${c.personne};`)
  })
})

describe('les gestes appris (PLAN-PROMOTION.md § 7.3)', () => {
  const gestes: GesteAppris[] = [
    ...FichierGestes.parse(parse(readFileSync(`${evals}/gestes.yaml`, 'utf8'))).gestes,
    ...lireFichiersGestes(fictif).flatMap((f) => {
      expect(f.erreur, f.fichier).toBeUndefined()
      return f.contenu ? [gesteDe(f.contenu)] : []
    }),
  ]
  it('au moins un à l’éval de rejeu', () => {
    expect(gestes.length).toBeGreaterThanOrEqual(1)
  })
  it('chacun a au moins trois tests, de rôles qu’il ouvre, aux échappées distinctes, chacun avec de quoi vérifier', () => {
    for (const g of gestes) {
      expect(g.tests.length, g.id).toBeGreaterThanOrEqual(TESTS_MIN)
      expect(new Set(g.tests.map((t) => t.echappee)).size, g.id).toBe(g.tests.length)
      for (const t of g.tests) {
        expect(g.roles, `${g.id} ${t.echappee} (${t.role})`).toContain(t.role)
        // Un geste qui lit attend un texte ; un geste qui écrit, les réaffectations validées (PLAN-PROMOTION.md § 10).
        expect(
          g.modifications === undefined ? t.contient.length : (t.modifications?.length ?? 0),
          `${g.id} ${t.echappee}`,
        ).toBeGreaterThan(0)
        expect(
          t.role === 'agent' ? personneDuTest(t) !== null : personneDuTest(t) === null,
          `${g.id} ${t.echappee}`,
        ).toBe(true)
      }
    }
  })
  it('sa description tient en 200 caractères ; son identifiant est une intention du catalogue, qui écrit si le geste écrit, jamais un geste codé (P14, P15, § 10)', () => {
    for (const g of gestes) {
      expect(g.description.length, g.id).toBeLessThanOrEqual(DESCRIPTION_MAX)
      const intention = INTENTIONS.find((i) => i.id === g.id)
      expect(intention, g.id).toBeDefined()
      expect(intention?.ecrit, g.id).toBe(g.modifications !== undefined)
      expect(
        ACTIONS.map((a) => a.id),
        g.id,
      ).not.toContain(g.id)
    }
  })
  it('les agents de ses tests existent au client fictif', () => {
    for (const g of gestes) {
      for (const t of g.tests) {
        const reaffectes = (t.modifications ?? []).map(
          (m) => OPERATION_REAFFECTER.modification.parse(m).agent,
        )
        for (const id of [personneDuTest(t), ...Object.values(t.params), ...reaffectes].filter(
          (v): v is string => typeof v === 'string' && /^A-\d+$/.test(v),
        )) {
          expect(agentsFictif, `${g.id} ${t.echappee}`).toContain(`${id};`)
        }
      }
    }
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
