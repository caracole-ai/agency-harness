import { fileURLToPath } from 'node:url'
import { decrireEcart, depasse, type Ecart, Temporal, taux } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { DATE_REFERENCE, HEURES_PAR_JOUR_FICTIF } from './cli/fictif'
import { type FichiersAgenceWeb, lireAgenceWeb } from './connecteurs/csv-exports'
import {
  type Avenant,
  type ContratTma,
  contexte,
  type Devis,
  type Facture,
  type Lot,
  NOMS_TABLES,
  type Projet,
  type Tables,
  type Temps,
} from './modele'
import {
  accesARevoquer,
  consommeParLot,
  consommeVendu,
  ecarts,
  factureVendu,
  heuresTma,
  joursVendus,
  MESURES,
  perimetreRecette,
  projetsDeRessource,
} from './semantique'
import { configFictive } from './veille.test.fixture'

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

// ---------------------------------------------------------------------------
// Rapprocher (PLAN-METIER-2.md § 8, M12) : les écarts, sur des contextes
// construits à la main et sur le client fictif. Attendus écrits à la main.

const REF = Temporal.PlainDate.from(DATE_REFERENCE)
const seuils = configFictive().seuils

const vide = (): Tables => Object.fromEntries(NOMS_TABLES.map((t) => [t, []])) as unknown as Tables
const projet = (id: string, type: Projet['type']): Projet => ({
  id,
  client: 'CLI-01',
  nom: `projet ${id}`,
  type,
  etat: 'en_cours',
  debut: undefined,
  fin_prevue: undefined,
  mise_en_prod_le: undefined,
  garantie_fin: undefined,
  po: undefined,
})
const lot = (id: string, p: string, jours_vendus: number | undefined): Lot => ({
  id,
  projet: p,
  nom: `lot ${id}`,
  jours_vendus,
  montant_ht_eur: undefined,
  recette_le: undefined,
  pv_signe_le: undefined,
})
const temps = (p: string, date: string, heures: number, commentaire?: string): Temps => ({
  personne: 'M-01',
  projet: p,
  date,
  heures,
  commentaire,
})
const devis = (id: string, p: string, montant: number, etat: Devis['etat']): Devis => ({
  id,
  client: 'CLI-01',
  projet: p,
  date: '2026-01-05',
  montant_ht_eur: montant,
  jours: undefined,
  etat,
  signataire: undefined,
  remise: undefined,
  clause_cession: undefined,
  envoye_le: undefined,
  signe_le: undefined,
})
const avenant = (id: string, p: string, montant: number, etat: Avenant['etat']): Avenant => ({
  id,
  devis: 'DEV-2026-001',
  projet: p,
  date: '2026-04-01',
  montant_ht_eur: montant,
  jours: undefined,
  etat,
  signataire: undefined,
  motif: undefined,
})
const facture = (
  id: string,
  p: string,
  l: string | undefined,
  date: string,
  montant: number,
): Facture => ({
  id,
  client: 'CLI-01',
  projet: p,
  lot: l,
  date,
  montant_ht_eur: montant,
  tva: 0.2,
  montant_ttc_eur: montant * 1.2,
  echeance: undefined,
  delai_jours: undefined,
  fin_de_mois: undefined,
  etat: 'emise',
  payee_le: undefined,
  penalites_mentionnees: undefined,
  indemnite_40_mentionnee: undefined,
})
const tma = (id: string, p: string | undefined, heures: number, debut: string): ContratTma => ({
  id,
  client: 'CLI-01',
  projet: p,
  heures_incluses_mois: heures,
  montant_ht_mois_eur: 500,
  debut,
  fin: undefined,
  preavis_jours: undefined,
})
/** Des tables avec un client : chaque projet, devis, facture et contrat y renvoie. */
const tables = (): Tables => {
  const t = vide()
  t.clients = [
    {
      id: 'CLI-01',
      nom: 'Client A',
      secteur: undefined,
      nda: undefined,
      contrat_art28: undefined,
      bon_de_commande_obligatoire: undefined,
      portail_fournisseur: undefined,
    },
  ]
  return t
}
const ecart = (es: Ecart[], mesure: string, objet: string) => {
  const e = es.find((x) => x.mesure === mesure && x.objet === objet)
  if (!e) throw new Error(`${mesure} ${objet} absent`)
  return e
}

describe('le consommé par lot, quand le commentaire du temps le nomme', () => {
  const t = tables()
  t.projets = [projet('PRJ-01', 'forfait'), projet('PRJ-02', 'forfait')]
  t.lots = [
    lot('LOT-001', 'PRJ-01', 10),
    lot('LOT-002', 'PRJ-01', undefined),
    lot('LOT-003', 'PRJ-02', 5),
  ]
  t.temps = [
    temps('PRJ-01', '2026-09-01', 14, 'recette du LOT-001'),
    temps('PRJ-01', '2026-09-02', 7, 'divers'),
    temps('PRJ-01', '2026-09-03', 3.5, 'suite du lot-001'),
    temps('PRJ-01', '2026-09-04', 7, 'LOT-001 et LOT-002'),
    temps('PRJ-01', '2026-09-07', 7, 'reprise du LOT-003'),
    temps('PRJ-01', '2026-09-08', 7, 'LOT-002'),
    temps('PRJ-01', '2026-09-09', 7),
  ]
  const ctx = contexte(t)

  it('un lot cité seul compte ; aucun, deux, ou celui d’un autre projet : le projet seulement', () => {
    // LOT-001 : 14 h + 3,5 h = 17,5 h, soit 2,5 j ; LOT-002 : 7 h, 1 j, sans jours vendus
    expect(consommeParLot(ctx, 7)).toEqual([
      { lot: 'LOT-001', projet: 'PRJ-01', vendus: 10, consommes: 2.5 },
      { lot: 'LOT-002', projet: 'PRJ-01', vendus: 0, consommes: 1 },
    ])
    // le projet garde toutes ses heures : 52,5 h, soit 7,5 j
    expect(consommeVendu(ctx, 'PRJ-01', 7).consommes).toBe(7.5)
  })

  it('en écart, sous le projet, au seuil des forfaits', () => {
    const es = ecarts(ctx, seuils, REF)
    const l1 = ecart(es, MESURES.lot, 'PRJ-01/LOT-001')
    expect(l1).toMatchObject({
      consomme: 2.5,
      vendu: 10,
      unite: 'jours',
      seuil: seuils.forfait_alerte,
    })
    expect(depasse(l1)).toBe(false)
    // un lot sans jours vendus : aucun taux, aucune division
    const l2 = ecart(es, MESURES.lot, 'PRJ-01/LOT-002')
    expect(taux(l2)).toBeNull()
    expect(depasse(l2)).toBe(false)
    expect(decrireEcart(l2)).toBe('PRJ-01/LOT-002 : 1 j consommé sur 0 vendu')
    expect(es.some((e) => e.objet.endsWith('/LOT-003'))).toBe(false)
  })
})

describe('les écarts des forfaits', () => {
  it('PRJ-10, l’erreur posée 1 : 150 % des jours vendus, au-delà du seuil de 90 %', () => {
    const e = ecart(ecarts(lire(), seuils, REF), MESURES.forfait, 'PRJ-10')
    expect(depasse(e)).toBe(true)
    expect(decrireEcart(e)).toBe('PRJ-10 : 36 j consommés sur 24 vendus (150 %)')
  })
  it('un forfait sans jours vendus : pas d’écart chiffré, pas de division ; une régie n’en a pas', () => {
    const t = tables()
    t.projets = [projet('PRJ-01', 'forfait'), projet('PRJ-02', 'regie')]
    t.temps = [temps('PRJ-01', '2026-10-01', 7), temps('PRJ-02', '2026-10-01', 70)]
    const es = ecarts(contexte(t), seuils, REF)
    const e = ecart(es, MESURES.forfait, 'PRJ-01')
    expect(taux(e)).toBeNull()
    expect(depasse(e)).toBe(false)
    expect(decrireEcart(e)).toBe('PRJ-01 : 1 j consommé sur 0 vendu')
    expect(es.some((x) => x.mesure === MESURES.forfait && x.objet === 'PRJ-02')).toBe(false)
  })
})

describe('les heures TMA du mois courant', () => {
  const avec = (heuresOctobre: number[]) => {
    const t = tables()
    t.contrats_tma = [tma('TMA-01', undefined, 10, '2026-01-01')]
    t.temps = [
      temps('TMA-01', '2026-09-30', 6),
      ...heuresOctobre.map((h, i) => temps('TMA-01', `2026-10-0${i + 1}`, h)),
    ]
    return ecart(ecarts(contexte(t), seuils, REF), MESURES.tma, 'TMA-01/2026-10')
  }
  it('8 h sur 10 incluses en octobre : 80 % pile, l’écart est dû', () => {
    const e = avec([5, 3])
    expect(e).toMatchObject({ consomme: 8, vendu: 10, unite: 'heures', seuil: seuils.tma_alerte })
    expect(depasse(e)).toBe(true)
    expect(decrireEcart(e)).toBe('TMA-01/2026-10 : 8 h consommées sur 10 vendues (80 %)')
  })
  it('7,5 h : pas encore ; les heures de septembre ne comptent pas', () => {
    expect(depasse(avec([5, 2.5]))).toBe(false)
  })
})

describe('le facturé contre le vendu, en euros HT', () => {
  const t = tables()
  t.projets = [projet('PRJ-01', 'forfait')]
  t.lots = [lot('LOT-001', 'PRJ-01', 20)]
  t.devis = [
    devis('DEV-2026-001', 'PRJ-01', 10000, 'signe'),
    devis('DEV-2026-002', 'PRJ-01', 4000, 'refuse'),
  ]
  t.avenants = [
    avenant('AVE-2026-001', 'PRJ-01', 2000, 'signe'),
    avenant('AVE-2026-002', 'PRJ-01', 1500, 'envoye'),
  ]
  t.contrats_tma = [tma('TMA-01', 'PRJ-01', 4, '2026-09-01')]
  t.factures = [
    facture('FAC-2026-001', 'PRJ-01', undefined, '2026-02-01', 3000),
    facture('FAC-2026-002', 'PRJ-01', 'LOT-001', '2026-06-01', 6000),
    // sans lot, pendant le contrat TMA du projet, trois mensualités de 500 : la TMA, pas le projet
    facture('FAC-2026-003', 'PRJ-01', undefined, '2026-09-01', 1500),
  ]

  it('vendu : devis et avenants signés ; facturé : acompte et lot, pas la TMA', () => {
    expect(factureVendu(contexte(t), 'PRJ-01')).toEqual({
      projet: 'PRJ-01',
      vendus: 10000 + 2000,
      factures: 3000 + 6000,
    })
    const e = ecart(ecarts(contexte(t), seuils, REF), MESURES.facture, 'PRJ-01')
    expect(e).toMatchObject({ unite: 'euros', seuil: seuils.facture_alerte })
    expect(depasse(e)).toBe(false)
  })
  it('une facture sans lot qui n’est pas des mensualités, ou après la fin du contrat : au projet', () => {
    const u = {
      ...t,
      contrats_tma: [{ ...tma('TMA-01', 'PRJ-01', 4, '2026-09-01'), fin: '2026-12-31' }],
      factures: [
        ...t.factures,
        // une part de l'avenant AVE-2026-001, sans lot (un avenant porte un projet, jamais un lot)
        facture('FAC-2026-004', 'PRJ-01', undefined, '2026-10-01', 1750),
        // quatre mensualités, mais après la fin du contrat
        facture('FAC-2027-001', 'PRJ-01', undefined, '2027-01-15', 2000),
      ],
    }
    expect(factureVendu(contexte(u), 'PRJ-01')).toEqual({
      projet: 'PRJ-01',
      vendus: 12000,
      factures: 3000 + 6000 + 1750 + 2000,
    })
  })
  it('tout le vendu facturé : le seuil est atteint (la section ne montre que l’au-delà)', () => {
    const u = {
      ...t,
      factures: [...t.factures, facture('FAC-2026-004', 'PRJ-01', 'LOT-001', '2026-10-01', 3000)],
    }
    const e = ecart(ecarts(contexte(u), seuils, REF), MESURES.facture, 'PRJ-01')
    expect(depasse(e)).toBe(true)
    expect(decrireEcart(e)).toBe('PRJ-01 : 12 000 € consommés sur 12 000 vendus (100 %)')
  })
  it('client fictif : la facture annuelle de TMA-05 ne compte pas à PRJ-15', () => {
    // les trois lots de PRJ-15 à 70 % ; FAC-2026-008 (6 120 €, le jour du début de TMA-05) est la TMA
    expect(factureVendu(lire(), 'PRJ-15')).toEqual({
      projet: 'PRJ-15',
      vendus: 15600,
      factures: 3360 + 5040 + 2520,
    })
  })
})
