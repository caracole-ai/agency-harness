import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Temporal } from '@harnais/moteur'
import { afterAll, describe, expect, it } from 'vitest'
import { type FichiersAgenceWeb, lireAgenceWeb } from '../connecteurs/csv-exports'
import { IDENTIFIANTS, NOMS_TABLES } from '../modele'
import { accesARevoquer, consommeVendu, perimetreRecette } from '../semantique'
import {
  DATE_REFERENCE,
  ecrireAgenceWeb,
  HEURES_PAR_JOUR_FICTIF,
  verifierDestination,
} from './fictif'

// Le client fictif de l'agence web (PLAN-METIER-2.md § 7.1 à § 7.3, M16,
// M17), lu dans ses CSV commis : les volumes de l'entretien § 7, chacune des
// dix erreurs posées (et une seule fois), les ancres des phrases de
// l'entretien § 12, et le générateur qui rejoue les mêmes octets.

const RACINE = fileURLToPath(new URL('../../../../..', import.meta.url))
const EXEMPLE = join(RACINE, 'exemples', 'agence-web-fictive')
const FICHIERS = Object.fromEntries(NOMS_TABLES.map((t) => [t, `${t}.csv`])) as FichiersAgenceWeb
const ctx = lireAgenceWeb(EXEMPLE, FICHIERS)
const REF = Temporal.PlainDate.from(DATE_REFERENCE)
const J = (s: string) => Temporal.PlainDate.from(s)
const avant = (a: string, b: Temporal.PlainDate) => Temporal.PlainDate.compare(J(a), b) < 0

const projets = [...ctx.projets.values()]
const lots = [...ctx.lots.values()]
const tickets = [...ctx.tickets.values()]
const factures = [...ctx.factures.values()]
const domaines = [...ctx.domaines.values()]
const roleDe = (id: string | undefined) => (id ? ctx.personnes.get(id)?.role : undefined)

const temporaires: string[] = []
afterAll(() => {
  for (const d of temporaires) rmSync(d, { recursive: true, force: true })
})
const temporaire = () => {
  const d = mkdtempSync(join(tmpdir(), 'agence-web-fictif-'))
  temporaires.push(d)
  return d
}

describe('client fictif : les volumes (entretien § 7)', () => {
  it('chaque table a le volume du plan', () => {
    const volumes = Object.fromEntries(
      NOMS_TABLES.map((t) => {
        const table = ctx[t]
        return [t, Array.isArray(table) ? table.length : table.size]
      }),
    )
    expect(volumes).toMatchObject({
      personnes: 6,
      clients: 25,
      contacts: 30,
      projets: 18,
      lots: 45,
      devis: 40,
      avenants: 6,
      tickets: 300,
      temps: 1500,
      factures: 60,
      contrats_tma: 12,
      recettes: 20,
      acces: 40,
      depots: 18,
      sauvegardes: 30,
      domaines: 30,
      sous_traitants: 3,
      versions: 18,
    })
    expect(projets.filter((p) => p.etat === 'en_cours')).toHaveLength(8)
  })

  it('six personnes, les cinq rôles de M3', () => {
    expect([...ctx.personnes.values()].map((p) => `${p.id} ${p.role}`)).toEqual([
      'M-01 dirigeant',
      'M-02 commercial',
      'M-03 po',
      'M-04 graphiste',
      'M-05 developpeur',
      'M-06 developpeur',
    ])
  })

  it('douze mois de temps avant la date de référence, aucun après', () => {
    const debut = REF.subtract({ months: 12 })
    for (const t of ctx.temps) {
      expect(avant(t.date, debut)).toBe(false)
      expect(Temporal.PlainDate.compare(J(t.date), REF) <= 0).toBe(true)
    }
  })

  it('les identifiants de M17 seulement, factures en numérotation continue', () => {
    const texte = NOMS_TABLES.map((t) => readFileSync(join(EXEMPLE, FICHIERS[t]), 'utf8')).join(
      '\n',
    )
    expect(texte).not.toMatch(/(^|[;,])[DETORAV]-\d/m)
    for (const [champ, ids] of [
      ['client', [...ctx.clients.keys()]],
      ['contact', [...ctx.contacts.keys()]],
      ['projet', [...ctx.projets.keys()]],
      ['lot', [...ctx.lots.keys()]],
      ['devis', [...ctx.devis.keys()]],
      ['avenant', [...ctx.avenants.keys()]],
      ['facture', [...ctx.factures.keys()]],
      ['ticket', [...ctx.tickets.keys()]],
      ['contrat_tma', [...ctx.contrats_tma.keys()]],
      ['sous_traitant', [...ctx.sous_traitants.keys()]],
      ['domaine', [...ctx.domaines.keys()]],
    ] as const) {
      for (const id of ids) expect(id).toMatch(IDENTIFIANTS[champ])
    }
    for (const annee of ['2025', '2026']) {
      const numeros = factures
        .filter((f) => f.id.startsWith(`FAC-${annee}-`))
        .map((f) => Number(f.id.slice(-3)))
      const premier = numeros[0] ?? 0
      expect(numeros).toEqual(numeros.map((_, i) => premier + i))
    }
  })
})

describe('client fictif : les dix erreurs posées (PLAN-METIER-2.md § 7.3), chacune une fois', () => {
  it('1. un forfait à 150 % des jours vendus, le seul au-delà de 90 %', () => {
    const parts = projets
      .filter((p) => p.type === 'forfait')
      .map((p) => consommeVendu(ctx, p.id, HEURES_PAR_JOUR_FICTIF))
      .filter((c) => (c.part ?? 0) > 0.9)
    expect(parts.map((c) => [c.projet, c.part])).toEqual([['PRJ-10', 1.5]])
  })

  it('2. un domaine expiré, un certificat qui expire dans dix jours, rien d’autre dans les trente jours', () => {
    const dans30 = REF.add({ days: 30 })
    expect(
      domaines.filter((d) => d.expire_le && avant(d.expire_le, dans30)).map((d) => d.id),
    ).toEqual(['DOM-23'])
    expect(avant(ctx.domaines.get('DOM-23')?.expire_le ?? '', REF)).toBe(true)
    expect(
      domaines.filter((d) => d.certificat_expire_le && avant(d.certificat_expire_le, dans30)),
    ).toMatchObject([{ id: 'DOM-07', certificat_expire_le: REF.add({ days: 10 }).toString() }])
  })

  it('3. un accès au dépôt d’un sous-traitant jamais révoqué sur un projet clos', () => {
    const r = accesARevoquer(ctx)
    expect(r).toHaveLength(1)
    expect(r[0]?.acces).toMatchObject({ sorte: 'depot', personne: 'ST-02', revoque_le: undefined })
    expect(ctx.projets.get(ctx.depots.get(r[0]?.acces.ressource ?? '')?.projet ?? '')?.etat).toBe(
      'clos',
    )
  })

  it('4. une facture de solde sur un lot sans PV signé', () => {
    const sansPv = factures.filter((f) => {
      if (!f.lot) return false
      const pv = ctx.lots.get(f.lot)?.pv_signe_le
      return pv === undefined || !avant(pv, J(f.date).add({ days: 1 }))
    })
    expect(sansPv).toHaveLength(1)
    const lot = ctx.lots.get(sansPv[0]?.lot ?? '')
    expect(lot).toMatchObject({ projet: 'PRJ-16', nom: 'Notifications clients' })
    expect(lot?.recette_le).toBeDefined()
  })

  it('5. une évolution résolue, rattachée à rien, sur un projet en garantie', () => {
    const libres = tickets.filter((t) => t.type === 'evolution' && t.rattache_a === undefined)
    expect(libres).toHaveLength(1)
    expect(libres[0]?.etat).toBe('resolu')
    expect(ctx.projets.get(libres[0]?.projet ?? '')?.etat).toBe('garantie')
  })

  it('6. un bug sur un lot sans recette, TK-1050', () => {
    const p = perimetreRecette(ctx)
    const hors = tickets.filter((t) => t.type === 'bug' && (t.lot === undefined || !p.has(t.lot)))
    expect(hors.map((t) => t.cle)).toEqual(['TK-1050'])
    expect(ctx.recettes.some((r) => r.lot === hors[0]?.lot)).toBe(false)
  })

  it('7. une attestation URSSAF de plus de six mois pour un sous-traitant à 8 000 €', () => {
    const sixMois = REF.subtract({ months: 6 })
    const fautifs = [...ctx.sous_traitants.values()].filter(
      (s) =>
        (s.montant_annuel_ht_eur ?? 0) > 5000 &&
        (s.attestation_urssaf_le === undefined || avant(s.attestation_urssaf_le, sixMois)),
    )
    expect(fautifs).toMatchObject([{ montant_annuel_ht_eur: 8000 }])
  })

  it('8. une facture à 90 jours sans pénalités mentionnées', () => {
    const fautives = factures.filter(
      (f) =>
        (f.delai_jours ?? 0) > (f.fin_de_mois ? 45 : 60) ||
        f.penalites_mentionnees !== true ||
        f.indemnite_40_mentionnee !== true,
    )
    expect(fautives).toMatchObject([{ delai_jours: 90, penalites_mentionnees: false }])
  })

  it('9. un devis à 15 % de remise signé par la commerciale', () => {
    const engages = [...ctx.devis.values(), ...ctx.avenants.values()].filter(
      (d) => d.etat === 'signe',
    )
    const fautifs = engages.filter(
      (d) => roleDe(d.signataire) !== 'dirigeant' || ('remise' in d && (d.remise ?? 0) > 0.1),
    )
    expect(fautifs).toHaveLength(1)
    expect(fautifs[0]).toMatchObject({ remise: 0.15 })
    expect(roleDe(fautifs[0]?.signataire)).toBe('commercial')
  })

  it('10. une mise en production sans sauvegarde de moins de 24 h', () => {
    const sauvegardee = (projet: string, date: string) =>
      ctx.sauvegardes.some(
        (s) =>
          s.projet === projet &&
          !avant(s.date, J(date).subtract({ days: 1 })) &&
          !avant(date, J(s.date)),
      )
    const miseEnProd = [
      ...projets.flatMap((p) => (p.mise_en_prod_le ? [[p.id, p.mise_en_prod_le] as const] : [])),
      ...[...ctx.depots.values()].flatMap((d) =>
        d.derniere_mise_en_prod_le ? [[d.projet, d.derniere_mise_en_prod_le] as const] : [],
      ),
    ]
    expect(miseEnProd.filter(([p, d]) => !sauvegardee(p, d))).toEqual([['PRJ-15', '2026-09-24']])
  })
})

describe('client fictif : les ancres de l’entretien § 12', () => {
  it('la boulangerie : PRJ-12 au forfait, en cours, lots, temps, mise en prod, version', () => {
    const p = ctx.projets.get('PRJ-12')
    expect(p).toMatchObject({ type: 'forfait', etat: 'en_cours' })
    expect(ctx.clients.get(p?.client ?? '')?.secteur).toBe('boulangerie')
    expect(lots.filter((l) => l.projet === 'PRJ-12').length).toBeGreaterThanOrEqual(2)
    expect(ctx.temps.some((t) => t.projet === 'PRJ-12')).toBe(true)
    expect([...ctx.depots.values()].find((d) => d.projet === 'PRJ-12')).toMatchObject({
      derniere_mise_en_prod_le: expect.any(String),
      par: expect.stringMatching(IDENTIFIANTS.personne),
    })
    expect(ctx.versions.some((v) => v.projet === 'PRJ-12')).toBe(true)
  })

  it('un cabinet d’avocats en TMA, avec des heures ce mois', () => {
    const cabinet = [...ctx.clients.values()].find((c) => c.secteur === "cabinet d'avocats")
    const contrat = [...ctx.contrats_tma.values()].find((t) => t.client === cabinet?.id)
    expect(contrat).toBeDefined()
    expect(ctx.temps.some((t) => t.projet === contrat?.id && t.date.startsWith('2026-10'))).toBe(
      true,
    )
  })

  it('un client e-commerce : accès admin_site et hébergeur, tickets d’un développeur', () => {
    const ecommerce = [...ctx.clients.values()].filter((c) => c.secteur === 'e-commerce')
    const leurs = (c: string) => [...domaines.filter((d) => d.client === c).map((d) => d.nom)]
    const client = ecommerce.find((c) => {
      const noms = leurs(c.id)
      const sortes = new Set(
        ctx.acces.filter((a) => noms.includes(a.ressource)).map((a) => a.sorte),
      )
      return sortes.has('admin_site') && sortes.has('hebergeur')
    })
    expect(client).toBeDefined()
    const contrats = [...ctx.contrats_tma.values()].filter((t) => t.client === client?.id)
    const siens = tickets.filter(
      (t) =>
        roleDe(t.assigne) === 'developpeur' &&
        (contrats.some((c) => c.id === t.contrat_tma) ||
          ctx.projets.get(t.projet ?? '')?.client === client?.id),
    )
    expect(siens.length).toBeGreaterThan(0)
    expect(siens.some((t) => t.etat !== 'resolu')).toBe(true)
  })

  it('CLI-07 a des factures cette année', () => {
    expect(
      factures.filter((f) => f.client === 'CLI-07' && f.date.startsWith('2026')).length,
    ).toBeGreaterThan(0)
  })

  it('FAC-2026-031 est échue, impayée et relancée', () => {
    const f = ctx.factures.get('FAC-2026-031')
    expect(f?.etat).toBe('emise')
    expect(f?.payee_le).toBeUndefined()
    expect(avant(f?.echeance ?? '', REF)).toBe(true)
    expect(ctx.paiements.some((p) => p.facture === 'FAC-2026-031')).toBe(false)
    expect(ctx.relances.filter((r) => r.facture === 'FAC-2026-031').length).toBeGreaterThan(0)
  })

  it('TK-1042 est assigné à Julie ; TK-1050 est un bug sur un lot jamais recetté', () => {
    const julie = ctx.personnes.get(ctx.tickets.get('TK-1042')?.assigne ?? '')
    expect(julie?.nom.split(' ')[0]).toBe('Julie')
    // Un prénom ne désigne qu'une personne : aucun contact ni sous-traitant ne s'appelle Julie.
    const noms = [
      ...[...ctx.personnes.values()].map((p) => p.nom),
      ...[...ctx.contacts.values()].map((c) => c.nom),
      ...[...ctx.sous_traitants.values()].map((s) => s.nom),
    ]
    expect(noms.filter((n) => n.startsWith('Julie '))).toEqual([julie?.nom])
    expect(new Set(noms.map((n) => n.split(' ')[0])).size).toBe(noms.length)
    const tk = ctx.tickets.get('TK-1050')
    expect(tk?.type).toBe('bug')
    expect(perimetreRecette(ctx).has(tk?.lot ?? '')).toBe(false)
  })

  it('PRJ-09 a du temps du graphiste ce mois', () => {
    expect(
      ctx.temps.some(
        (t) =>
          t.projet === 'PRJ-09' &&
          roleDe(t.personne) === 'graphiste' &&
          t.date.startsWith('2026-10'),
      ),
    ).toBe(true)
  })

  it('un projet livré en mars 2026, dont un développeur est encore collaborateur du dépôt', () => {
    const mars = projets.filter((p) => p.mise_en_prod_le?.startsWith('2026-03'))
    expect(
      mars.some((p) =>
        [...ctx.depots.values()].some(
          (d) =>
            d.projet === p.id && (d.collaborateurs ?? []).some((c) => roleDe(c) === 'developpeur'),
        ),
      ),
    ).toBe(true)
  })
})

describe('le générateur', () => {
  it('rejoué dans un dossier temporaire, il rend les CSV commis octet pour octet', () => {
    const d = temporaire()
    const ecrits = ecrireAgenceWeb(d)
    expect(ecrits.sort()).toEqual(readdirSync(EXEMPLE).sort())
    for (const f of ecrits) {
      expect(readFileSync(join(d, f)).equals(readFileSync(join(EXEMPLE, f))), f).toBe(true)
    }
  })

  it('le dossier commis ne porte que les CSV (config et personnes arrivent au lot 2b)', () => {
    expect(readdirSync(EXEMPLE).sort()).toEqual(NOMS_TABLES.map((t) => `${t}.csv`).sort())
  })

  it('refuse le client fictif de la sécurité', () => {
    expect(() => verifierDestination(join(RACINE, 'exemples', 'client-fictif'))).toThrow(
      /client fictif de la sécurité, refusé/,
    )
  })

  it('refuse un dossier dont la config est celle d’un autre métier, accepte la sienne', () => {
    const autre = temporaire()
    writeFileSync(join(autre, 'config.yaml'), 'client: x\nmetier: securite-privee\n')
    expect(() => ecrireAgenceWeb(autre)).toThrow(/un autre métier, refusé/)
    expect(readdirSync(autre)).toEqual(['config.yaml'])
    const sienne = temporaire()
    writeFileSync(join(sienne, 'config.yaml'), 'client: x\nmetier: agence-web\n')
    expect(() => verifierDestination(sienne)).not.toThrow()
  })
})
