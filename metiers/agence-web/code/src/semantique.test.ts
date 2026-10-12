import { fileURLToPath } from 'node:url'
import { Temporal } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { HEURES_PAR_JOUR_FICTIF } from './cli/fictif'
import { type FichiersAgenceWeb, lireAgenceWeb } from './connecteurs/csv-exports'
import { NOMS_TABLES } from './modele'
import {
  accesARevoquer,
  consommeVendu,
  heuresTma,
  joursVendus,
  perimetreRecette,
  projetsDeRessource,
} from './semantique'

// Les notions de l'agence web (PLAN-METIER-2.md § 7.1), sur le client fictif.

const EXEMPLE = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const FICHIERS = Object.fromEntries(NOMS_TABLES.map((t) => [t, `${t}.csv`])) as FichiersAgenceWeb
const lire = () => lireAgenceWeb(EXEMPLE, FICHIERS)

describe('sémantique', () => {
  it('les jours vendus : les lots, plus les avenants signés seulement', () => {
    const ctx = lire()
    expect(joursVendus(ctx, 'PRJ-12')).toBe(8 + 12 + 6 + 3)
    // PRJ-08 : un avenant refusé ne compte pas ; PRJ-09 : un avenant envoyé non plus.
    expect(joursVendus(ctx, 'PRJ-08')).toBe(12 + 14 + 10)
    expect(joursVendus(ctx, 'PRJ-09')).toBe(6 + 14 + 8)
    expect(joursVendus(ctx, 'PRJ-17')).toBe(0)
  })

  it('le consommé : les heures du projet en jours, par personne, et la part du vendu', () => {
    const ctx = lire()
    const c = consommeVendu(ctx, 'PRJ-12', HEURES_PAR_JOUR_FICTIF)
    const heures = ctx.temps.filter((t) => t.projet === 'PRJ-12').reduce((s, t) => s + t.heures, 0)
    expect(c.consommes).toBeCloseTo(heures / HEURES_PAR_JOUR_FICTIF, 9)
    expect(c.parPersonne.reduce((s, p) => s + p.jours, 0)).toBeCloseTo(c.consommes, 9)
    expect(c.part).toBeCloseTo(c.consommes / c.vendus, 9)
    // Les heures d'un jour sont celles du client : le même temps en jours de 8 h.
    expect(consommeVendu(ctx, 'PRJ-12', 8).consommes).toBeCloseTo(heures / 8, 9)
    expect(consommeVendu(ctx, 'PRJ-17', HEURES_PAR_JOUR_FICTIF).part).toBeUndefined()
    expect(() => consommeVendu(ctx, 'PRJ-12', 0)).toThrow(/heures par jour/)
  })

  it('le périmètre recetté : recette et PV, ni l’un sans l’autre', () => {
    const ctx = lire()
    const lots = [...ctx.lots.values()]
    const lot = (projet: string, nom: string) =>
      lots.find((l) => l.projet === projet && l.nom === nom)?.id ?? ''
    const p = perimetreRecette(ctx)
    expect(p.has(lot('PRJ-12', 'Maquettes et vitrine'))).toBe(true)
    expect(p.has(lot('PRJ-12', 'Commande en ligne'))).toBe(false)
    // Recetté sans PV : hors du périmètre.
    expect(p.has(lot('PRJ-08', 'Espace agents'))).toBe(false)
  })

  it('les projets d’une ressource : le dépôt, ou le client du domaine', () => {
    const ctx = lire()
    const de = (ressource: string) => {
      const a = ctx.acces.find((x) => x.ressource === ressource)
      if (!a) throw new Error(ressource)
      return projetsDeRessource(ctx, a)
    }
    expect(de('prj-18-web')).toEqual(['PRJ-18'])
    expect(de('fournil-des-saules.example')).toEqual(['PRJ-12'])
    expect(de('registrar-a')).toEqual([])
  })

  it('les accès à révoquer : un sous-traitant sur un projet clos, une personne partie', () => {
    const ctx = lire()
    expect(
      accesARevoquer(ctx).map((r) => `${r.acces.personne} ${r.acces.ressource} ${r.motif}`),
    ).toEqual(['ST-02 prj-18-web sous_traitant_projet_clos'])
    ctx.acces.push({
      ressource: 'registrar-c',
      sorte: 'registrar',
      personne: 'M-09',
      depuis: '2024-01-08',
      jusqua: undefined,
      revoque_le: undefined,
    })
    expect(accesARevoquer(ctx).map((r) => r.motif)).toContain('personne_partie')
  })

  it('les heures TMA d’un mois', () => {
    const ctx = lire()
    const mois = Temporal.PlainYearMonth.from('2026-10')
    const attendu = ctx.temps
      .filter((t) => t.projet === 'TMA-02' && t.date.startsWith('2026-10'))
      .reduce((s, t) => s + t.heures, 0)
    expect(attendu).toBeGreaterThan(0)
    expect(heuresTma(ctx, 'TMA-02', mois)).toBe(attendu)
    expect(heuresTma(ctx, 'TMA-02', Temporal.PlainYearMonth.from('2024-01'))).toBe(0)
    expect(() => heuresTma(ctx, 'TMA-99', mois)).toThrow(/TMA-99 inconnu/)
  })
})
