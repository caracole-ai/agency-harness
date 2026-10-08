import { describe, expect, it } from 'vitest'
import {
  CANDIDATS_MAX,
  choisirParmi,
  clePhonetique,
  correspondances,
  distance,
  formes,
  proches,
} from './designation'

// Des listes synthétiques : aucune donnée du client fictif.
const AICHA = { id: 'P-1', nom: 'Aïcha Traoré' }
const ALICIA = { id: 'P-2', nom: 'Alicia Martin' }
const JEAN_PIERRE = { id: 'P-3', nom: 'Jean-Pierre Le Goff' }
const AICHA_BIS = { id: 'P-4', nom: 'Aïcha Mansouri' }
const EQUIPE = [AICHA, ALICIA, JEAN_PIERRE, { id: 'P-5', nom: 'Karim Haddad' }]

const ids = (ps: { id: string }[]) => ps.map((p) => p.id)

describe('niveau 1 : la correspondance exacte décide', () => {
  it('sans accents ni casse, espaces et tirets réduits', () => {
    expect(ids(correspondances('Aicha', EQUIPE))).toEqual(['P-1'])
    expect(ids(correspondances('  AÏCHA  ', EQUIPE))).toEqual(['P-1'])
    expect(ids(correspondances('jean pierre', EQUIPE))).toEqual(['P-3'])
    expect(ids(correspondances('Jean–Pierre  le-goff', EQUIPE))).toEqual(['P-3'])
  })
  it('le prénom, le nom, les deux dans un ordre ou l’autre', () => {
    for (const m of ['Traoré', 'Aïcha Traoré', 'Traore Aicha']) {
      expect(ids(correspondances(m, EQUIPE))).toEqual(['P-1'])
    }
    expect(ids(correspondances('Le Goff', EQUIPE))).toEqual(['P-3'])
    expect(ids(correspondances('Le Goff Jean-Pierre', EQUIPE))).toEqual(['P-3'])
  })
  it('l’identifiant écrit tel quel', () => {
    expect(ids(correspondances('P-2', EQUIPE))).toEqual(['P-2'])
    expect(ids(correspondances('p-2', EQUIPE))).toEqual(['P-2'])
  })
  it('aucune approximation : une faute, un morceau de prénom composé, une liste vide ne correspondent pas', () => {
    expect(correspondances('Aisha', EQUIPE)).toEqual([])
    expect(correspondances('Jean', EQUIPE)).toEqual([])
    expect(correspondances('Aïcha', [])).toEqual([])
  })
  it('un homonyme : deux correspondances, rien n’est décidé', () => {
    expect(ids(correspondances('Aïcha', [...EQUIPE, AICHA_BIS]))).toEqual(['P-1', 'P-4'])
  })
  it('formes : le nom tel qu’écrit, coupé seulement aux espaces', () => {
    expect(formes('Aïcha Traoré')).toEqual(['aicha traore', 'aicha', 'traore', 'traore aicha'])
  })
})

describe('niveau 2 : la liste courte, qui ne doit pas rater le bon nom', () => {
  it('une faute de frappe ou d’oreille retrouve le bon nom en tête', () => {
    expect(ids(proches('Aisha', EQUIPE))[0]).toBe('P-1')
    expect(ids(proches('Traore A.', EQUIPE))[0]).toBe('P-1')
    expect(ids(proches('Carim', EQUIPE))[0]).toBe('P-5')
    expect(ids(proches('Jean', EQUIPE))).toContain('P-3')
  })
  it('« Aisha » propose aussi Alicia, à deux lettres : c’est au modèle, puis à l’humain, de trancher', () => {
    expect(ids(proches('Alisha', EQUIPE))).toEqual(expect.arrayContaining(['P-1', 'P-2']))
  })
  it('rien qui ressemble : liste vide ; jamais plus de trois', () => {
    expect(proches('Bidule', EQUIPE)).toEqual([])
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `Q-${i}`, nom: `Aicha Nom${i}` }))
    expect(proches('Aisha', many)).toHaveLength(CANDIDATS_MAX)
  })
  it('la clé phonétique rapproche les écritures d’un même son', () => {
    expect(clePhonetique('Aisha')).toBe(clePhonetique('Aïcha'))
    expect(clePhonetique('Mehdi')).toBe(clePhonetique('Medhi'))
    expect(clePhonetique('Karim')).toBe(clePhonetique('Carim'))
    expect(clePhonetique('Aïcha')).not.toBe(clePhonetique('Alicia'))
  })
  it('la distance compte une transposition pour une', () => {
    expect(distance('medhi', 'mehdi')).toBe(1)
    expect(distance('aisha', 'aicha')).toBe(1)
    expect(distance('', 'abc')).toBe(3)
  })
})

describe('niveau 3 : la réponse à « vous parlez de qui ? »', () => {
  const candidats = [AICHA, AICHA_BIS]
  it('un nom que le niveau 1 retrouve parmi les candidats', () => {
    expect(choisirParmi('Aïcha Mansouri', candidats)?.id).toBe('P-4')
    expect(choisirParmi('traore', candidats)?.id).toBe('P-1')
  })
  it('un rang', () => {
    expect(choisirParmi('1', candidats)?.id).toBe('P-1')
    expect(choisirParmi('la deuxième', candidats)?.id).toBe('P-4')
    expect(choisirParmi('La première.', candidats)?.id).toBe('P-1')
    expect(choisirParmi('3', candidats)).toBeUndefined()
  })
  it('deux candidats au même nom complet : l’identifiant tranche', () => {
    const jumeaux = [AICHA, { id: 'P-9', nom: 'Aïcha Traoré' }]
    expect(choisirParmi('Aïcha Traoré', jumeaux)).toBeUndefined()
    expect(choisirParmi('P-9', jumeaux)?.id).toBe('P-9')
  })
  it('ce qui ne désigne pas un seul candidat : rien', () => {
    expect(choisirParmi('Aïcha', candidats)).toBeUndefined()
    expect(choisirParmi('et Karim, il est où ?', candidats)).toBeUndefined()
  })
})
