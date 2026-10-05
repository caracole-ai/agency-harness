import { describe, expect, it } from 'vitest'
import { Temporal } from '../temps/temporal'
import { Interdit, type Registre } from './schema'
import { relecturesEnRetard } from './veille'

const interdit = (id: string, relu?: string) =>
  Interdit.parse({
    id,
    interdit: 'jamais X',
    etapes: ['5'],
    consequence: 'sanction',
    verifiable_par: 'code',
    statut: 'texte',
    relu,
    source: 'R1',
  })
const registre: Registre = {
  interdits: [interdit('I-01', '2026-10-05'), interdit('I-02', '2026-09-01'), interdit('I-03')],
  escalades: [],
  scenarios: [],
}

describe('veille des textes', () => {
  it('signale les relectures dont le mois est dépassé, et seulement celles-là', () => {
    expect(relecturesEnRetard(registre, Temporal.PlainDate.from('2026-10-05'))).toEqual([
      { id: 'I-02', relu: '2026-09-01', due: '2026-10-01' },
    ])
  })
  it('le jour même de l’échéance, la relecture n’est pas encore en retard', () => {
    expect(relecturesEnRetard(registre, Temporal.PlainDate.from('2026-11-05'))).toEqual([
      { id: 'I-02', relu: '2026-09-01', due: '2026-10-01' },
    ])
  })
})
