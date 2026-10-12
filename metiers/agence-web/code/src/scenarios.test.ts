import { fileURLToPath } from 'node:url'
import { chargerRegistre, incoherencesDuCode } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { rejouer } from './cas'
import { CONTROLES } from './controles'
import { VEILLES } from './echeances'
import { configFictive } from './veille.test.fixture'

// Les scénarios T-xx de l'agence web (PLAN-METIER-2.md M15, § 7.4) : chaque
// `cas` se rejoue sous les seuils et les fenêtres du client fictif, et le
// registre est cohérent avec les contrôles et les veilles de ce paquet (ce
// que `registre:verifier` dira quand `index.ts` les exportera).

const registre = chargerRegistre(fileURLToPath(new URL('../..', import.meta.url)))
const config = configFictive()

describe('scénarios du registre', () => {
  const rejouables = registre.scenarios.filter((s) => s.cas !== undefined)
  it('chaque interdit codé a au moins un scénario rejouable', () => {
    const codes = [...CONTROLES, ...VEILLES].map((c) => c.regle)
    for (const r of codes) {
      expect(
        rejouables.some((s) => s.interdits.includes(r)),
        r,
      ).toBe(true)
    }
  })
  for (const s of rejouables) {
    it(`${s.id} : ${s.alors}`, () => {
      expect(rejouer(s, registre, config).ecarts).toEqual([])
    })
  }
})

describe('le registre et le code', () => {
  it('aucune incohérence entre les interdits, les scénarios et les règles codées', () => {
    expect(incoherencesDuCode(registre, { CONTROLES, VEILLES })).toEqual([])
  })
  it('les interdits humains ne sont pas codés (I-05, I-06, I-15) ; I-08 attend la facture émise', () => {
    const codes = new Set([...CONTROLES, ...VEILLES].map((c) => c.regle))
    for (const r of ['I-05', 'I-06', 'I-08', 'I-15']) expect(codes.has(r), r).toBe(false)
    expect(codes.size).toBe(11)
  })
})
