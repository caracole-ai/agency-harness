import { describe, expect, it } from 'vitest'
import { decrireEcart, depasse, type Ecart, taux } from './ecarts'

// PLAN-METIER-2.md § 3.7 et § 8 (M12) : le taux, le seuil, les mots. Les
// attendus sont écrits à la main.

const jours = (consomme: number, vendu: number): Ecart => ({
  objet: 'PRJ-12',
  mesure: 'jours consommés / vendus',
  consomme,
  vendu,
  unite: 'jours',
  seuil: 0.9,
})
const heures = (consomme: number, vendu: number): Ecart => ({
  objet: 'TMA-04/2026-10',
  mesure: 'heures consommées / vendues',
  consomme,
  vendu,
  unite: 'heures',
  seuil: 0.8,
})

describe('taux', () => {
  it('rien de vendu : null, sans division', () => {
    expect(taux(jours(3, 0))).toBeNull()
    expect(taux(jours(0, 0))).toBeNull()
  })
  it('le consommé sur le vendu', () => {
    expect(taux(jours(27, 18))).toBe(1.5)
  })
})

describe('depasse', () => {
  it('un forfait à 150 % dépasse un seuil de 90 %', () => {
    expect(depasse(jours(27, 18))).toBe(true)
  })
  it('un contrat d’heures à 80 % pile atteint un seuil de 80 %', () => {
    expect(depasse(heures(16, 20))).toBe(true)
  })
  it('à 80 % pile même quand le flottant tombe juste en dessous (2,4 / 3)', () => {
    expect(depasse(heures(2.4, 3))).toBe(true)
  })
  it('sous le seuil : non', () => {
    expect(depasse(jours(12, 18))).toBe(false)
    expect(depasse(heures(15, 20))).toBe(false)
  })
  it('un taux inconnu ne dépasse rien', () => {
    expect(depasse(jours(3, 0))).toBe(false)
  })
})

describe('decrireEcart', () => {
  it('l’exemple du plan', () => {
    expect(decrireEcart(jours(23.5, 18))).toBe('PRJ-12 : 23,5 j consommés sur 18 vendus (131 %)')
  })
  it('le forfait à 150 %', () => {
    expect(decrireEcart(jours(27, 18))).toBe('PRJ-12 : 27 j consommés sur 18 vendus (150 %)')
  })
  it('des heures, au féminin', () => {
    expect(decrireEcart(heures(16, 20))).toBe(
      'TMA-04/2026-10 : 16 h consommées sur 20 vendues (80 %)',
    )
    expect(decrireEcart(heures(2.4, 3))).toBe(
      'TMA-04/2026-10 : 2,4 h consommées sur 3 vendues (80 %)',
    )
  })
  it('sous le seuil, le pourcentage arrondi à l’entier', () => {
    expect(decrireEcart(jours(12, 18))).toBe('PRJ-12 : 12 j consommés sur 18 vendus (67 %)')
  })
  it('rien de vendu : pas de pourcentage', () => {
    expect(decrireEcart(jours(3, 0))).toBe('PRJ-12 : 3 j consommés sur 0 vendu')
  })
  it('au singulier sous deux', () => {
    expect(decrireEcart(jours(1.5, 1))).toBe('PRJ-12 : 1,5 j consommé sur 1 vendu (150 %)')
  })
  it('des euros : milliers groupés, jamais un flottant brut', () => {
    const facture: Ecart = {
      objet: 'PRJ-03',
      mesure: 'euros facturés / vendus',
      consomme: 12500,
      vendu: 15000,
      unite: 'euros',
      seuil: 0.9,
    }
    expect(decrireEcart(facture)).toBe('PRJ-03 : 12 500 € consommés sur 15 000 vendus (83 %)')
    expect(decrireEcart({ ...facture, consomme: 0.1 + 0.2 })).toBe(
      'PRJ-03 : 0,3 € consommé sur 15 000 vendus (0 %)',
    )
  })
})
