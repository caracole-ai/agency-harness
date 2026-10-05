import { describe, expect, it } from 'vitest'
import { type Controle, executer } from '../controles/controle'
import { Interdit, type Registre } from './schema'
import { parametresDe, plafond, selonReference } from './verdict'

const interdit = (champs: Record<string, unknown> = {}) =>
  Interdit.parse({
    id: 'I-01',
    interdit: 'jamais X',
    etapes: ['5'],
    consequence: 'sanction',
    verifiable_par: 'code',
    statut: 'texte',
    relu: '2026-10-05',
    source: 'R1',
    ...champs,
  })

const lectures = [
  { id: 'loi', source: 'loi', reference: true, parametres: { seuil: 11 } },
  { id: 'accord', source: 'accord', parametres: { seuil: 12 } },
  { id: 'ccn', source: 'ccn', parametres: { seuil: 10 } },
]

describe('plafond par statut', () => {
  it('un texte relu récemment peut refuser', () => {
    expect(plafond(interdit())).toBe('refus')
  })
  it('un texte non relu rend au plus « à vérifier »', () => {
    expect(plafond(interdit({ relu: undefined }))).toBe('à vérifier')
  })
  it('l’âge d’une relecture ne change jamais le verdict du client', () => {
    expect(plafond(interdit({ relu: '2020-01-02' }))).toBe('refus')
  })
  it('une règle ⚠ sans lectures ne refuse pas ; avec ses lectures, si', () => {
    expect(plafond(interdit({ avertissement: '12 h ou 11 h' }))).toBe('à vérifier')
    expect(plafond(interdit({ avertissement: '12 h ou 11 h', lectures }))).toBe('refus')
  })
  it('une déclaration du client ne refuse pas, une règle constatée si', () => {
    expect(plafond(interdit({ statut: 'déclaré', relu: undefined }))).toBe('à vérifier')
    expect(plafond(interdit({ statut: 'constaté', relu: undefined }))).toBe('refus')
  })
  it('une hypothèse ne devient pas un contrôle', () => {
    expect(() => plafond(interdit({ statut: 'hypothèse', relu: undefined }))).toThrow(/hypothèse/)
  })
})

describe('lectures', () => {
  const regle = interdit({ avertissement: '12 h ou 11 h', lectures })
  it('la lecture de référence décide seule ; les autres ne font que des notes', () => {
    const r = selonReference(regle, { loi: 'ok', accord: 'refus', ccn: 'ok' })
    expect(r.verdict).toBe('ok')
    expect(r.divergentes.map((d) => d.lecture.id)).toEqual(['accord'])
    const s = selonReference(regle, { loi: 'refus', accord: 'refus', ccn: 'ok' })
    expect(s.verdict).toBe('refus')
    expect(s.divergentes.map((d) => d.lecture.id)).toEqual(['ccn'])
  })
  it('une lecture non évaluée lève (le moteur refuse alors)', () => {
    expect(() => selonReference(regle, { loi: 'ok' })).toThrow()
  })
  it('des lectures sans référence, ou avec deux, sont refusées au chargement', () => {
    const sans = lectures.map(({ reference: _, ...l }) => l)
    expect(Interdit.safeParse({ ...regle, lectures: sans }).success).toBe(false)
    const deux = lectures.map((l) => ({ ...l, reference: true }))
    expect(Interdit.safeParse({ ...regle, lectures: deux }).success).toBe(false)
  })
  it('les paramètres d’une lecture surchargent les communs', () => {
    const i = interdit({ parametres: { seuil: 9, duree: 12 }, avertissement: '⚠', lectures })
    expect(parametresDe(i, i.lectures?.[1])).toEqual({ seuil: 12, duree: 12 })
  })
})

describe('exécution', () => {
  const registre = (i = interdit()): Registre => ({ interdits: [i], escalades: [], scenarios: [] })
  const refuse: Controle<null> = {
    regle: 'I-01',
    verifier: () => [{ regle: 'I-01', objet: 'V-1', verdict: 'refus', motif: 'carte expirée' }],
  }
  it('plafonne le verdict d’un contrôle par le statut de sa règle', () => {
    expect(executer([refuse], null, registre())[0]?.verdict).toBe('refus')
    expect(executer([refuse], null, registre(interdit({ relu: undefined })))[0]?.verdict).toBe(
      'à vérifier',
    )
  })
  it('un contrôle qui lève refuse : le moteur échoue fermé', () => {
    const casse: Controle<null> = {
      regle: 'I-01',
      verifier: () => {
        throw new Error('donnée corrompue')
      },
    }
    const [constat] = executer([casse], null, registre())
    expect(constat?.verdict).toBe('refus')
    expect(constat?.motif).toMatch(/donnée corrompue/)
  })
  it('un contrôle sans interdit au registre lève', () => {
    expect(() => executer([{ ...refuse, regle: 'I-99' }], null, registre())).toThrow()
  })
})
