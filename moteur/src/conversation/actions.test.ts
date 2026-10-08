import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  type Action,
  actionsDe,
  DEMANDE_NOUVELLE,
  JE_NE_SAIS_PAS,
  outilsDe,
  schemaJson,
} from './actions'

// La forme des gestes et ce qu'on envoie au modèle (PLAN-ESPACES.md § 5.7).

const action = (id: string, roles: Action<null, unknown>['roles']): Action<null, unknown> => ({
  id,
  description: `l'action ${id}`,
  parametres: z.strictObject({ x: z.string().describe('un champ') }),
  roles,
  ecrit: false,
  reformuler: () => id,
  executer: () => ({ texte: id }),
})
const ACTIONS = [
  action('declarer_absence', ['patron', 'agent']),
  action('valider_remplacement', ['patron']),
  action('repondre_sollicitation', ['agent']),
]

describe('schemaJson', () => {
  it('rend un schéma strict : sans propriété en plus, toutes les clés requises, sans $schema', () => {
    const json = schemaJson(z.strictObject({ a: z.string(), b: z.number().nullable() }))
    expect(json.additionalProperties).toBe(false)
    expect(json.required).toEqual(['a', 'b'])
    expect(json).not.toHaveProperty('$schema')
    expect(json.type).toBe('object')
  })
  it('un objet vide reste un objet strict', () => {
    expect(schemaJson(z.strictObject({}))).toMatchObject({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    })
  })
})

describe('outilsDe', () => {
  it('un agent ne reçoit pas les gestes du patron, et reçoit les deux méta-outils', () => {
    const noms = outilsDe(ACTIONS, 'agent').map((o) => o.name)
    expect(noms).toEqual([
      'declarer_absence',
      'repondre_sollicitation',
      DEMANDE_NOUVELLE,
      JE_NE_SAIS_PAS,
    ])
    expect(noms).not.toContain('valider_remplacement')
  })
  it('chaque outil est strict', () => {
    for (const o of outilsDe(ACTIONS, 'patron')) expect(o.strict).toBe(true)
  })
  it('une description trop longue arrête', () => {
    const longue = { ...action('trop_long', ['patron']), description: 'x'.repeat(201) }
    expect(() => outilsDe([longue], 'patron')).toThrow(/200 caractères/)
  })
  it('actionsDe filtre par rôle', () => {
    expect(actionsDe(ACTIONS, 'patron').map((a) => a.id)).toEqual([
      'declarer_absence',
      'valider_remplacement',
    ])
  })
})
