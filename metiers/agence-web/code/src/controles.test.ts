import { fileURLToPath } from 'node:url'
import { chargerRegistre, executer, plafond } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { type FichiersAgenceWeb, lireAgenceWeb } from './connecteurs/csv-exports'
import { CONTROLES, type ContexteVeille } from './controles'
import { NOMS_TABLES } from './modele'
import { revocationsDues } from './semantique'
import { configFictive } from './veille.test.fixture'

// Les contrôles de l'agence web (PLAN-METIER-2.md M15, § 7.3, § 7.4) sur les
// CSV commis du client fictif : chaque erreur posée est retrouvée, et la liste
// complète des constats est celle écrite ici à la main.

const registre = chargerRegistre(fileURLToPath(new URL('../..', import.meta.url)))
const EXEMPLE = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const FICHIERS = Object.fromEntries(NOMS_TABLES.map((t) => [t, `${t}.csv`])) as FichiersAgenceWeb
const config = configFictive()
const lire = (): ContexteVeille => ({ ...lireAgenceWeb(EXEMPLE, FICHIERS), seuils: config.seuils })

const nonConformes = (ctx: ContexteVeille) =>
  executer(CONTROLES, ctx, registre)
    .filter((c) => c.verdict !== 'ok')
    .map((c) => `${c.regle} ${c.objet} ${c.verdict}`)

const constat = (ctx: ContexteVeille, regle: string, objet: string) =>
  executer(CONTROLES, ctx, registre).find((c) => c.regle === regle && c.objet === objet)

describe('les contrôles codés', () => {
  it('chacun a son interdit au registre, et aucun ne peut refuser en v1 (M15)', () => {
    for (const c of CONTROLES) {
      const interdit = registre.interdits.find((i) => i.id === c.regle)
      expect(interdit, c.regle).toBeDefined()
      if (interdit) expect(plafond(interdit), c.regle).toBe('à vérifier')
    }
    expect(CONTROLES.map((c) => c.regle)).toEqual([
      'I-01',
      'I-02',
      'I-03',
      'I-04',
      'I-07',
      'I-10',
      'I-11',
      'I-12',
      'I-14',
    ])
  })
})

describe('client fictif : chaque erreur posée du § 7.3 est retrouvée', () => {
  const ctx = lire()
  it('1. PRJ-10 à 150 % des jours vendus (I-12)', () => {
    expect(constat(ctx, 'I-12', 'PRJ-10')).toMatchObject({
      verdict: 'à vérifier',
      motif: 'PRJ-10 : 36 j consommés sur 24 vendus (150 %), au-delà de 110 %',
    })
  })
  it('3. ST-02 sur le dépôt prj-18-web, projet clos (I-04)', () => {
    expect(constat(ctx, 'I-04', 'ST-02/depot/prj-18-web')?.verdict).toBe('à vérifier')
  })
  it('4. FAC-2026-042 sur LOT-042, sans PV signé (I-01)', () => {
    expect(constat(ctx, 'I-01', 'FAC-2026-042')).toMatchObject({
      verdict: 'à vérifier',
      motif: 'facture du 01/09/2026 sur le lot LOT-042, recetté le 24/08/2026, sans PV signé',
    })
  })
  it('5. TK-0978, évolution rattachée à rien sur un projet en garantie (I-02)', () => {
    expect(constat(ctx, 'I-02', 'TK-0978')?.verdict).toBe('à vérifier')
    // 3 h, moins d'une demi-journée de 7 h : à facturer ou à offrir, mais signalée quand même
    expect(constat(ctx, 'I-02', 'TK-0978')?.motif).toMatch(/moins d'une demi-journée/)
  })
  it('8. FAC-2026-011 à 90 jours, sans pénalités (I-07)', () => {
    expect(constat(ctx, 'I-07', 'FAC-2026-011')).toMatchObject({
      verdict: 'à vérifier',
      motif: 'délai de paiement de 90 jours, au-delà de 60 ; pénalités de retard non mentionnées',
    })
  })
  it('9. DEV-2026-008 à 15 % de remise, signé par la commerciale (I-11)', () => {
    expect(constat(ctx, 'I-11', 'DEV-2026-008')?.motif).toBe(
      'devis engagé par M-02 (commercial), pas par le dirigeant, remise de 15 % (au-delà de 10 %)',
    )
  })
  it('10. la mise en production de PRJ-15 du 24/09/2026, sauvegarde du 17/09 (I-03)', () => {
    expect(constat(ctx, 'I-03', 'PRJ-15/mise-en-prod/2026-09-24')?.verdict).toBe('à vérifier')
  })
})

describe('client fictif : la liste complète des constats', () => {
  it('est exactement celle-ci', () => {
    expect(nonConformes(lire()).sort()).toEqual(
      [
        'I-01 FAC-2026-042 à vérifier',
        'I-02 TK-0978 à vérifier',
        // une évolution rattachée à un contrat TMA (« c'est dans la maintenance », entretien § 5, § 22)
        'I-02 TK-0761 à vérifier',
        'I-02 TK-0778 à vérifier',
        'I-02 TK-0781 à vérifier',
        'I-02 TK-0794 à vérifier',
        'I-02 TK-0798 à vérifier',
        'I-02 TK-0809 à vérifier',
        'I-02 TK-0858 à vérifier',
        'I-02 TK-0883 à vérifier',
        'I-02 TK-0884 à vérifier',
        'I-02 TK-0906 à vérifier',
        'I-02 TK-0934 à vérifier',
        'I-02 TK-0962 à vérifier',
        'I-02 TK-0965 à vérifier',
        'I-02 TK-0970 à vérifier',
        'I-02 TK-0987 à vérifier',
        'I-02 TK-0988 à vérifier',
        'I-02 TK-1023 à vérifier',
        'I-03 PRJ-15/mise-en-prod/2026-09-24 à vérifier',
        // I-04 : un accès non révoqué à une ressource dont les projets sont clos ;
        // pas celui d'une personne de l'agence qu'un contrat TMA justifie
        // (M-05 et M-06 sur PRJ-01, 02, 03, 15, 18 ; DOM-11 et DOM-06)
        'I-04 M-05/depot/prj-05-web à vérifier',
        'I-04 ST-02/depot/prj-18-web à vérifier',
        'I-07 FAC-2026-011 à vérifier',
        'I-11 DEV-2026-008 à vérifier',
        'I-12 PRJ-10 à vérifier',
      ].sort(),
    )
  })
  it('un contrat TMA garde l’accès de l’agence, jamais celui d’un sous-traitant', () => {
    const ctx = lire()
    expect(constat(ctx, 'I-04', 'M-05/depot/prj-05-web')?.motif).toBe(
      'projet PRJ-05 clos, accès non révoqué : à révoquer à la fin du projet',
    )
    expect(constat(ctx, 'I-04', 'M-06/depot/prj-02-web')).toBeUndefined()
    expect(constat(ctx, 'I-04', 'ST-02/depot/prj-18-web')?.motif).toMatch(/TMA-04/)
  })
})

describe('I-04 à la lettre', () => {
  it('révoque au départ d’une personne et à la fin du projet, agence comme sous-traitant', () => {
    const ctx = lire()
    const motifs = revocationsDues(ctx).map((r) => `${r.acces.personne} ${r.acces.ressource}`)
    expect(motifs).toContain('M-05 prj-05-web')
    expect(motifs).toContain('ST-02 prj-18-web')
    // un compte de registrar n'a pas de projet : il ne se ferme qu'au départ
    expect(motifs.some((m) => m.includes('registrar'))).toBe(false)
    ctx.acces.push({
      ressource: 'registrar-a',
      sorte: 'registrar',
      personne: 'M-09',
      depuis: '2024-01-08',
      jusqua: undefined,
      revoque_le: undefined,
    })
    expect(constat(ctx, 'I-04', 'M-09/registrar/registrar-a')?.motif).toBe(
      "M-09 n'est plus ni dans l'équipe ni sous-traitant, accès non révoqué",
    )
  })
  it('un collaborateur de dépôt révoqué au registre est signalé', () => {
    const ctx = lire()
    const depot = ctx.depots.get('prj-05-web')
    if (!depot) throw new Error('prj-05-web')
    depot.collaborateurs = ['M-05', 'ST-01']
    expect(constat(ctx, 'I-04', 'ST-01/depot/prj-05-web')?.motif).toBe(
      'révoqué au registre le 20/03/2026, encore collaborateur du dépôt prj-05-web',
    )
  })
})

describe('données absentes : à vérifier, jamais ok', () => {
  it('une facture sans délai ni mentions', () => {
    const ctx = lire()
    const f = ctx.factures.get('FAC-2026-050')
    if (!f) throw new Error('FAC-2026-050')
    ctx.factures.set(f.id, {
      ...f,
      delai_jours: undefined,
      penalites_mentionnees: undefined,
      indemnite_40_mentionnee: undefined,
    })
    expect(constat(ctx, 'I-07', f.id)?.verdict).toBe('à vérifier')
    expect(constat(ctx, 'I-07', f.id)?.motif).toMatch(/^donnée absente : délai de paiement/)
  })
  it('un devis signé sans signataire, un forfait sans jours vendus', () => {
    const ctx = lire()
    const d = ctx.devis.get('DEV-2026-010')
    if (!d) throw new Error('DEV-2026-010')
    ctx.devis.set(d.id, { ...d, signataire: undefined })
    expect(constat(ctx, 'I-11', d.id)?.motif).toMatch(/^donnée absente : signataire/)
    for (const l of ctx.lots.values()) if (l.projet === 'PRJ-12') l.jours_vendus = undefined
    for (const a of ctx.avenants.values()) if (a.projet === 'PRJ-12') a.jours = undefined
    expect(constat(ctx, 'I-12', 'PRJ-12')?.motif).toMatch(/^donnée absente : jours vendus/)
  })
  it('un forfait dont un avenant retire plus de jours qu’il n’en reste de vendus', () => {
    const ctx = lire()
    for (const l of ctx.lots.values()) if (l.projet === 'PRJ-12') l.jours_vendus = undefined
    const a = [...ctx.avenants.values()].find((x) => x.projet === 'PRJ-12')
    if (!a) throw new Error('avenant de PRJ-12')
    // AVE-2026-004, le seul avenant de PRJ-12
    ctx.avenants.set(a.id, { ...a, etat: 'signe', jours: -2 })
    expect(constat(ctx, 'I-12', 'PRJ-12')).toMatchObject({ verdict: 'à vérifier' })
    expect(constat(ctx, 'I-12', 'PRJ-12')?.motif).toMatch(/^donnée absente : jours vendus/)
  })
  it('un PV signé après la facture', () => {
    const ctx = lire()
    const lot = ctx.lots.get('LOT-020')
    if (!lot) throw new Error('LOT-020')
    lot.pv_signe_le = '2026-09-30'
    expect(constat(ctx, 'I-01', 'FAC-2026-047')?.motif).toBe(
      'facture du 27/09/2026, avant le PV du lot LOT-020 signé le 30/09/2026',
    )
  })
})

describe('les seuils viennent de la config', () => {
  it('un seuil de forfait relevé à 160 % ne signale plus PRJ-10', () => {
    const ctx: ContexteVeille = { ...lire(), seuils: { ...config.seuils, forfait_refus: 1.6 } }
    expect(constat(ctx, 'I-12', 'PRJ-10')?.verdict).toBe('ok')
  })
  it('I-12 à son seuil pile : PRJ-10 à 150 % pour un refus à 150 % est conforme (« ne dépasse pas »)', () => {
    const pile: ContexteVeille = { ...lire(), seuils: { ...config.seuils, forfait_refus: 1.5 } }
    expect(constat(pile, 'I-12', 'PRJ-10')?.verdict).toBe('ok')
    const juste: ContexteVeille = { ...lire(), seuils: { ...config.seuils, forfait_refus: 1.49 } }
    expect(constat(juste, 'I-12', 'PRJ-10')).toMatchObject({
      verdict: 'à vérifier',
      motif: 'PRJ-10 : 36 j consommés sur 24 vendus (150 %), au-delà de 149 %',
    })
  })
  it('une remise permise à 20 % : DEV-2026-008 reste signalé, signé par la commerciale', () => {
    const ctx: ContexteVeille = { ...lire(), seuils: { ...config.seuils, remise_max: 0.2 } }
    expect(constat(ctx, 'I-11', 'DEV-2026-008')?.motif).toBe(
      'devis engagé par M-02 (commercial), pas par le dirigeant',
    )
  })
  it('des jours de 6 h : l’évolution de 3 h fait une demi-journée', () => {
    const ctx: ContexteVeille = { ...lire(), seuils: { ...config.seuils, heures_par_jour: 6 } }
    expect(constat(ctx, 'I-02', 'TK-0978')?.motif).toMatch(/une demi-journée ou plus/)
  })
})

describe('les valeurs des textes viennent du registre', () => {
  it('I-07 lit son délai au plus dans regles.yaml : à 95 jours, la facture de 90 jours passe', () => {
    const avec95 = {
      ...registre,
      interdits: registre.interdits.map((i) =>
        i.id === 'I-07'
          ? { ...i, parametres: { ...i.parametres, delai_paiement_max_jours: 95 } }
          : i,
      ),
    }
    const c = executer(CONTROLES, lire(), avec95).find(
      (x) => x.regle === 'I-07' && x.objet === 'FAC-2026-011',
    )
    expect(c?.motif).not.toMatch(/délai de paiement/)
    expect(c?.motif).toMatch(/pénalités de retard non mentionnées/)
  })
})

describe('I-02 : une évolution n’est couverte que par un lot ou un avenant de son projet', () => {
  it('rattachée à un contrat TMA, elle est à vérifier', () => {
    expect(constat(lire(), 'I-02', 'TK-0761')?.verdict).toBe('à vérifier')
    expect(constat(lire(), 'I-02', 'TK-0761')?.motif).toMatch(/TMA-08/)
  })
  it('rattachée au lot d’un autre projet, elle est à vérifier', () => {
    const ctx = lire()
    const t = ctx.tickets.get('TK-0978')
    if (!t) throw new Error('TK-0978')
    const ailleurs = [...ctx.lots.values()].find((l) => l.projet !== t.projet)
    if (!ailleurs) throw new Error('un lot d’un autre projet')
    t.rattache_a = ailleurs.id
    expect(constat(ctx, 'I-02', 'TK-0978')?.motif).toMatch(new RegExp(ailleurs.id))
    expect(constat(ctx, 'I-02', 'TK-0978')?.verdict).toBe('à vérifier')
  })
})
