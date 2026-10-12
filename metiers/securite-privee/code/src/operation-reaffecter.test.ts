import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FichierGestes,
  Journal,
  modificationsDe,
  SansCandidat,
  TYPE_ECHAPPEE,
  verifierGabarit,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { OPERATION_REAFFECTER } from './operation-reaffecter'
import { ROLES } from './roles'
import { TYPES_PARAMETRE } from './types-parametre'

// L'opération `reaffecter` de la sécurité privée (PLAN-METIER-2.md § 3.4,
// M6) : une ligne de `pour_chaque` en fait une, le journal rend les
// réaffectations validées d'une conversation, deux réaffectations sont égales
// vacation et agent compris ; les gestes de l'éval de rejeu, écrits sous
// l'ancienne forme, passent le gabarit avec ces déclarations.

const evals = fileURLToPath(new URL('../../../../evals', import.meta.url))
const COLONNES = { vacation: 'vacation', agent: 'agent' }

describe('OPERATION_REAFFECTER', () => {
  it('depuisLigne : la vacation et l’agent des colonnes dites ; une cellule vide lève, SansCandidat pour l’agent', () => {
    const { depuisLigne } = OPERATION_REAFFECTER
    expect(depuisLigne({ vacation: 'V-03', agent: 'A-9', jour: '2026-10-13' }, COLONNES)).toEqual({
      vacation: 'V-03',
      agent: 'A-9',
    })
    expect(depuisLigne({ v: 'V-03', a: 'A-9' }, { vacation: 'v', agent: 'a' })).toEqual({
      vacation: 'V-03',
      agent: 'A-9',
    })
    expect(() => depuisLigne({ vacation: 'V-03', agent: null }, COLONNES)).toThrow(
      new SansCandidat('aucun agent trouvé pour V-03'),
    )
    expect(() => depuisLigne({ vacation: '', agent: 'A-9' }, COLONNES)).toThrow(
      'n’a pas de vacation',
    )
  })
  it('relire : les réaffectations de la dernière proposition de la conversation, sans le reste de la ligne', () => {
    const journal = new Journal(join(mkdtempSync(join(tmpdir(), 'reaffecter-')), 'journal.sqlite'))
    const proposition = (objet: string, modifications: unknown) => ({
      type: TYPE_ECHAPPEE,
      client: 'fictif',
      objet,
      issue: 'proposition',
      donnees: { echappee: 'E-1', modifications },
    })
    journal.ecrire([
      proposition('C-1', [{ type: 'reaffecter', vacation: 'V-01', agent: 'A-2' }]),
      proposition('C-1', [{ type: 'reaffecter', vacation: 'V-03', agent: 'A-9' }]),
      proposition('C-2', [{ type: 'reaffecter', vacation: 'V-07', agent: 'A-11' }]),
      { type: TYPE_ECHAPPEE, client: 'fictif', objet: 'C-3', issue: 'réponse', donnees: {} },
      proposition('C-4', [{ vacation: 'V-07' }]),
    ])
    expect(OPERATION_REAFFECTER.relire(journal, 'C-1')).toEqual([
      { vacation: 'V-03', agent: 'A-9' },
    ])
    expect(OPERATION_REAFFECTER.relire(journal, 'C-2')).toEqual([
      { vacation: 'V-07', agent: 'A-11' },
    ])
    expect(OPERATION_REAFFECTER.relire(journal, 'C-3')).toEqual([])
    expect(OPERATION_REAFFECTER.relire(journal, 'C-4')).toEqual([])
    expect(OPERATION_REAFFECTER.relire(journal, 'C-9')).toEqual([])
    journal.fermer()
  })
  it('egal et objet : la vacation et l’agent ; l’objet est la vacation', () => {
    const { egal, objet } = OPERATION_REAFFECTER
    expect(egal({ vacation: 'V-03', agent: 'A-9' }, { vacation: 'V-03', agent: 'A-9' })).toBe(true)
    expect(egal({ vacation: 'V-03', agent: 'A-9' }, { vacation: 'V-03', agent: 'A-2' })).toBe(false)
    expect(objet({ vacation: 'V-03', agent: 'A-9' })).toBe('V-03')
  })
  it('les gestes de l’éval de rejeu (ancienne forme comprise) passent le gabarit ; le moteur fait les réaffectations par l’opération', () => {
    const { gestes } = FichierGestes.parse(parse(readFileSync(`${evals}/gestes.yaml`, 'utf8')))
    const declarations = {
      roles: ROLES,
      typesParametre: TYPES_PARAMETRE,
      operation: OPERATION_REAFFECTER,
    }
    for (const g of gestes) expect(verifierGabarit(declarations, g)).toEqual([])
    const liberer = gestes.find((g) => g.modifications !== undefined)
    if (!liberer) throw new Error('evals/gestes.yaml sans geste qui écrit')
    const resultats = {
      liberer: { colonnes: ['vacation', 'agent'], lignes: [['V-03', 'A-11']], tronque: false },
    }
    expect(modificationsDe(liberer, resultats, OPERATION_REAFFECTER)).toEqual([
      { vacation: 'V-03', agent: 'A-11' },
    ])
  })
})
