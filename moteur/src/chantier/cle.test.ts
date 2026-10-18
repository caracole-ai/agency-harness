import { describe, expect, it } from 'vitest'
import { cleChantier, estCle, lireCle, nomArbre } from './cle'

// La clé d'un chantier (REFLEXIONS.md, décidé le 2026-10-18) : `<métier>/<id>`,
// lue et écrite d'une seule façon ; un identifiant nu n'en est pas une.

describe('la clé <métier>/<id>', () => {
  it('s’écrit, se relit, et se refuse quand elle est mal formée', () => {
    expect(cleChantier('securite-privee', 'heures_par_agent')).toBe(
      'securite-privee/heures_par_agent',
    )
    expect(lireCle('securite-privee/heures_par_agent')).toEqual({
      metier: 'securite-privee',
      id: 'heures_par_agent',
    })
    expect(estCle('agence-web/marge_projet')).toBe(true)
    for (const mauvaise of ['heures_par_agent', 'Metier/x', 'a/b/c', 'a/B', '/x', 'a/']) {
      expect(estCle(mauvaise), mauvaise).toBe(false)
      expect(() => lireCle(mauvaise)).toThrow(/<métier>\/<id>/)
    }
  })

  it('nomme un arbre de travail sans barre', () => {
    expect(nomArbre('chantier', 'securite-privee/heures_par_agent')).toBe(
      'chantier-securite-privee-heures_par_agent',
    )
    expect(nomArbre('retrait', 'heures_par_agent')).toBe('retrait-heures_par_agent')
  })
})
