import { describe, expect, it } from 'vitest'
import { OPERATION_REAFFECTER } from './operation-reaffecter'

// L'opération `reaffecter` de la sécurité privée (PLAN-METIER-2.md § 3.4,
// M6) : une réaffectation se lit par son schéma strict, son objet est la
// vacation (l'éval d'échappée compare ainsi les propositions).

describe('OPERATION_REAFFECTER', () => {
  it('lit une réaffectation (vacation, agent) et refuse une autre forme ; l’objet est la vacation', () => {
    const { modification, objet } = OPERATION_REAFFECTER
    const lue = modification.parse({ vacation: 'V-03', agent: 'A-9' })
    expect(objet(lue)).toBe('V-03')
    expect(modification.safeParse({ vacation: 'V-03' }).success).toBe(false)
    expect(modification.safeParse({ vacation: '', agent: 'A-9' }).success).toBe(false)
  })
})
