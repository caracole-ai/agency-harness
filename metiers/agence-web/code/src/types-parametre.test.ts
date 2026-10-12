import { fileURLToPath } from 'node:url'
import { copieClient, TYPES_MOTEUR, typeDe } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { CONVERSATION } from './conversation'
import { TYPES_PARAMETRE } from './types-parametre'

// Les types de paramètre de l'agence web et la résolution d'une entité
// (PLAN-METIER-2.md § 3.3, M5), sur une copie du client fictif : l'identifiant
// exact, sinon le nom exact, sinon tous les candidats.

const exemple = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const s = CONVERSATION.ouvrir(copieClient(exemple))
const resoudre = (type: string, mention: string) => {
  const t = typeDe(TYPES_PARAMETRE, type)
  if (!t.resoudre) throw new Error(`${type} sans resoudre`)
  return t.resoudre(mention, s).map((d) => d.id)
}

describe('les types déclarés', () => {
  it('personne est une personne ; les six entités sont résolues par le métier ; le moteur garde les siens', () => {
    expect(typeDe(TYPES_PARAMETRE, 'personne').sorte).toBe('personne')
    for (const nom of ['projet', 'client', 'ticket', 'lot', 'facture', 'devis']) {
      const t = typeDe(TYPES_PARAMETRE, nom)
      expect(t.sorte).toBe('entite')
      expect(t.resoudre).toBeTypeOf('function')
    }
    for (const nom of TYPES_MOTEUR) expect(typeDe(TYPES_PARAMETRE, nom).sorte).toBe(nom)
    expect(() => typeDe(TYPES_PARAMETRE, 'vacation')).toThrow('type de paramètre inconnu')
  })
})

describe('résoudre une entité', () => {
  it("l'identifiant exact, à la casse près", () => {
    expect(resoudre('projet', 'PRJ-12')).toEqual(['PRJ-12'])
    expect(resoudre('projet', 'prj-12')).toEqual(['PRJ-12'])
    expect(resoudre('facture', 'FAC-2026-031')).toEqual(['FAC-2026-031'])
    expect(resoudre('ticket', 'TK-1042')).toEqual(['TK-1042'])
    expect(resoudre('client', 'CLI-07')).toEqual(['CLI-07'])
    expect(resoudre('devis', 'DEV-2025-001')).toEqual(['DEV-2025-001'])
  })
  it('le nom exact, aux accents et à la casse près', () => {
    expect(resoudre('client', 'ceramiques orsini')).toEqual(['CLI-11'])
  })
  it('à l’oral, par le client ou son secteur : « la boulangerie », « le cabinet d’avocats »', () => {
    expect(resoudre('projet', 'la boulangerie')).toEqual(['PRJ-12'])
    expect(resoudre('projet', 'le site de la boulangerie')).toEqual(['PRJ-12'])
    expect(resoudre('client', "le cabinet d'avocats")).toEqual(['CLI-05'])
  })
  it('plusieurs candidats : tous, le geste demandera lequel ; aucun : vide', () => {
    expect(resoudre('projet', 'le site').length).toBeGreaterThan(1)
    const lots = resoudre('lot', 'le lot 2 de PRJ-12')
    expect(lots.length).toBeGreaterThan(1)
    expect(lots.every((id) => s.ctx.lots.get(id)?.projet === 'PRJ-12')).toBe(true)
    expect(resoudre('projet', 'zzz')).toEqual([])
  })
})
