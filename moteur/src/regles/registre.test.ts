import { describe, expect, it } from 'vitest'
import { regenererFiche, rendreStatut, rendreTable } from './fiche'
import { codesCites, incoherences, incoherencesDuCode } from './registre'
import { Interdit, type Registre, Scenario } from './schema'

const interdit = Interdit.parse({
  id: 'I-01',
  interdit: 'Aucun agent sans carte valide à la date de la vacation',
  etapes: ['5', '7'],
  consequence: 'sanction',
  verifiable_par: 'code',
  statut: 'texte',
  relu: '2026-09-29',
  source: 'R631-15',
})
const scenario = Scenario.parse({
  id: 'T-01',
  etant_donne: 'une carte qui expire',
  quand: 'on affecte',
  alors: 'refus, escalade E-02',
  interdits: ['I-01'],
  statut: 'hypothèse',
  source: 'conçu depuis l’interdit',
})
const escalade = {
  id: 'E-02',
  declencheur: 'aucun remplaçant',
  etapes: ['7'],
  qui: 'exploitation',
  delai: 'avant la prise de poste',
  presentation: 'les plus proches',
  statut: 'hypothèse' as const,
}
const registre = (r: Partial<Registre> = {}): Registre => ({
  interdits: [interdit],
  escalades: [escalade],
  scenarios: [scenario],
  ...r,
})

describe('schéma', () => {
  it('refuse un ✓ sur une hypothèse', () => {
    expect(Scenario.safeParse({ ...scenario, relu: '2026-09-29' }).success).toBe(false)
  })
})

describe('incohérences', () => {
  it('un registre complet est cohérent', () => {
    expect(incoherences(registre())).toEqual([])
  })
  it('un interdit sans test', () => {
    expect(incoherences(registre({ scenarios: [] }))).toContain("I-01 n'a aucun test")
  })
  it('un test qui couvre un interdit inconnu', () => {
    const r = registre({ scenarios: [scenario, { ...scenario, id: 'T-02', interdits: ['I-99'] }] })
    expect(incoherences(r)).toContain("T-02 couvre I-99, qui n'existe pas")
  })
  it('un code cité qui n’existe pas', () => {
    const r = registre({ scenarios: [{ ...scenario, alors: 'escalade E-07' }] })
    expect(incoherences(r)).toContain("T-01 cite E-07, qui n'existe pas")
  })
  it('un identifiant en double', () => {
    expect(incoherences(registre({ interdits: [interdit, interdit] }))).toContain(
      'I-01 : identifiant en double',
    )
  })
})

describe('fiche', () => {
  it('rend le statut comme la grille', () => {
    expect(rendreStatut(interdit)).toBe('`texte` ✓')
    expect(
      rendreStatut({ statut: 'texte', relu: '2026-09-29', avertissement: '12 h ou 11 h' }),
    ).toBe('`texte` ✓ ⚠ 12 h ou 11 h')
    expect(rendreStatut({ statut: 'hypothèse', suite: '(pratique de l’INRS)' })).toBe(
      '`hypothèse` (pratique de l’INRS)',
    )
  })
  it('remplace seulement ce qui est entre les marqueurs', () => {
    const table = (t: 'interdits' | 'tests' | 'escalades') =>
      `<!-- registre:${t} ancien -->\nvieux\n<!-- /registre:${t} -->`
    const fiche = `avant\n${table('interdits')}\nmilieu\n${table('tests')}\n${table('escalades')}\naprès`
    const r = regenererFiche(fiche, registre())
    expect(r).toContain(rendreTable('interdits', registre()))
    expect(r.startsWith('avant\n')).toBe(true)
    expect(r.endsWith('\naprès')).toBe(true)
    expect(r).not.toContain('vieux')
  })
  it('lève si un marqueur manque', () => {
    expect(() => regenererFiche('rien', registre())).toThrow(/marqueurs/)
  })
  it('extrait les codes cités', () => {
    expect(codesCites('voir I-01, T-06b et G-03 ; pas AI-Act')).toEqual(['I-01', 'T-06b', 'G-03'])
  })
})

describe('cohérence du code', () => {
  const code = (regle = 'I-01') => ({ CONTROLES: [{ regle }] })
  it('un scénario d’interdit codé sans cas ni cas_absent', () => {
    expect(incoherencesDuCode(registre(), code())).toContain(
      'T-01 couvre un interdit codé, sans cas rejouable ni cas_absent',
    )
  })
  it('un cas ou un cas_absent suffit (le rejeu est l’affaire des tests du métier)', () => {
    expect(
      incoherencesDuCode(registre({ scenarios: [{ ...scenario, cas_absent: 'phase 4' }] }), code()),
    ).toEqual([])
    expect(incoherencesDuCode(registre({ scenarios: [{ ...scenario, cas: {} }] }), code())).toEqual(
      [],
    )
  })
  it('un contrôle sans interdit, ou d’un interdit humain', () => {
    expect(incoherencesDuCode(registre(), code('I-99'))).toContain(
      "le contrôle I-99 n'a pas d'interdit au registre",
    )
    const humain = registre({ interdits: [{ ...interdit, verifiable_par: 'humain' }] })
    expect(incoherencesDuCode(humain, code())[0]).toMatch(/vérifiable par « humain »/)
  })
})
