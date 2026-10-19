import { describe, expect, it } from 'vitest'
import {
  ambigue,
  CANDIDATS_MAX,
  choisirParmi,
  clePhonetique,
  correspondances,
  distance,
  formes,
  normaliserNom,
  proches,
  refuse,
} from './designation'

// Des listes synthétiques : aucune donnée du client fictif.
const AICHA = { id: 'P-1', nom: 'Aïcha Traoré', sorte: 'personne' as const }
const ALICIA = { id: 'P-2', nom: 'Alicia Martin', sorte: 'personne' as const }
const JEAN_PIERRE = { id: 'P-3', nom: 'Jean-Pierre Le Goff', sorte: 'personne' as const }
const AICHA_BIS = { id: 'P-4', nom: 'Aïcha Mansouri', sorte: 'personne' as const }
const EQUIPE = [
  AICHA,
  ALICIA,
  JEAN_PIERRE,
  { id: 'P-5', nom: 'Karim Haddad', sorte: 'personne' as const },
]

const ids = (ps: { id: string }[]) => ps.map((p) => p.id)

describe('normaliserNom', () => {
  it('ramène pleine chasse, ligatures, invisibles et apostrophes typographiques', () => {
    expect(normaliserNom('Ａｉ\u200Bcha\u00A0 Tra\u00ADoré')).toBe('aicha traore')
    expect(normaliserNom('Dʼangelo D‘Angelo D’Angelo')).toBe("d'angelo d'angelo d'angelo")
  })
})

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

describe('la liste courte de la question, qui ne doit pas rater le bon nom', () => {
  it('une faute de frappe ou d’oreille retrouve le bon nom en tête', () => {
    expect(ids(proches('Aisha', EQUIPE))[0]).toBe('P-1')
    expect(ids(proches('Traore A.', EQUIPE))[0]).toBe('P-1')
    expect(ids(proches('Carim', EQUIPE))[0]).toBe('P-5')
    expect(ids(proches('Jean', EQUIPE))).toContain('P-3')
  })
  it('« Alisha » propose aussi Alicia, à deux lettres : c’est à l’humain de trancher, jamais au modèle', () => {
    expect(ids(proches('Alisha', EQUIPE))).toEqual(expect.arrayContaining(['P-1', 'P-2']))
  })
  it('rien qui ressemble : liste vide ; jamais plus de trois', () => {
    expect(proches('Bidule', EQUIPE)).toEqual([])
    const many = Array.from({ length: 6 }, (_, i) => ({
      id: `Q-${i}`,
      nom: `Aicha Nom${i}`,
      sorte: 'personne' as const,
    }))
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
  it('un rang, en mots ou en chiffres, au-delà de trois aussi', () => {
    expect(choisirParmi('1', candidats)?.id).toBe('P-1')
    expect(choisirParmi('la deuxième', candidats)?.id).toBe('P-4')
    expect(choisirParmi('La première.', candidats)?.id).toBe('P-1')
    expect(choisirParmi('2e', candidats)?.id).toBe('P-4')
    expect(choisirParmi('3', candidats)).toBeUndefined()
    const quatre = [...candidats, ALICIA, JEAN_PIERRE]
    expect(choisirParmi('4', quatre)?.id).toBe('P-3')
    expect(choisirParmi('5', quatre)).toBeUndefined()
  })
  it('« oui » accepte le seul candidat ; avec plusieurs, il ne désigne personne', () => {
    expect(choisirParmi('oui', [AICHA])?.id).toBe('P-1')
    expect(choisirParmi('Oui.', [AICHA])?.id).toBe('P-1')
    expect(choisirParmi('oui', candidats)).toBeUndefined()
  })
  it('deux candidats au même nom complet : l’identifiant tranche', () => {
    const jumeaux = [AICHA, { id: 'P-9', nom: 'Aïcha Traoré', sorte: 'personne' as const }]
    expect(choisirParmi('Aïcha Traoré', jumeaux)).toBeUndefined()
    expect(choisirParmi('P-9', jumeaux)?.id).toBe('P-9')
  })
  it('ce qui ne désigne pas un seul candidat : rien', () => {
    expect(choisirParmi('Aïcha', candidats)).toBeUndefined()
    expect(choisirParmi('et Karim, il est où ?', candidats)).toBeUndefined()
  })
  it('ambiguë : une réponse que plusieurs candidats portent ; pas une consigne nouvelle', () => {
    expect(ambigue('Aïcha', candidats)).toBe(true)
    expect(ambigue('Traoré', candidats)).toBe(false)
    expect(ambigue('et Karim, il est où ?', candidats)).toBe(false)
  })
  it('« non » refuse, quelle que soit la ponctuation ; le reste non', () => {
    expect(refuse('non')).toBe(true)
    expect(refuse('Non !')).toBe(true)
    expect(refuse('non, Traoré')).toBe(false)
    expect(refuse('oui')).toBe(false)
  })
})
