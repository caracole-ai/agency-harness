import { describe, expect, it } from 'vitest'
import { TYPES_EXEMPLE } from './geste-appris.test.fixture'
import { TYPES_MOTEUR, typeDe } from './types-parametre'

// Le type d'un paramètre appris (PLAN-METIER-2.md § 3.3, M5) : du moteur (sa
// sorte est son nom), du métier (tel que déclaré), ou inconnu (lève).

describe('typeDe', () => {
  it('un type du moteur : sa sorte est son nom, ses mots ceux de la fabrication', () => {
    expect(TYPES_MOTEUR).toEqual(['date', 'periode', 'nombre'])
    expect(typeDe(TYPES_EXEMPLE, 'date')).toEqual({
      nom: 'date',
      sorte: 'date',
      enMots: 'un jour, AAAA-MM-JJ',
    })
    expect(typeDe(TYPES_EXEMPLE, 'periode').enMots).toBe(
      "deux bornes, du et au, AAAA-MM-JJ, les deux incluses ; un geste n'en a qu'une",
    )
    expect(typeDe([], 'nombre')).toMatchObject({ sorte: 'nombre', enMots: 'un entier' })
  })
  it('un type du métier : tel qu’il le déclare', () => {
    expect(typeDe(TYPES_EXEMPLE, 'agent')).toBe(TYPES_EXEMPLE[0])
    expect(typeDe(TYPES_EXEMPLE, 'site').sorte).toBe('texte')
  })
  it('un type que ni le moteur ni le métier ne déclare : lève', () => {
    expect(() => typeDe(TYPES_EXEMPLE, 'projet')).toThrow('type de paramètre inconnu : projet')
    expect(() => typeDe([], 'agent')).toThrow('type de paramètre inconnu : agent')
  })
})
