import { fileURLToPath } from 'node:url'
import { chargerRegistre, Temporal, veiller } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { DATE_REFERENCE } from './cli/fictif'
import { ConfigAgenceWeb } from './config'
import { type FichiersAgenceWeb, lireAgenceWeb } from './connecteurs/csv-exports'
import { ECHEANCES, echeancesAgenceWeb, echeancesDues, INTERDIT_DE_L_ECHEANCE } from './echeances'
import { contexte, NOMS_TABLES, type Tables } from './modele'
import { configFictive } from './veille.test.fixture'

// Les échéances de l'agence web (PLAN-METIER-2.md M13, § 7.4) : la limite de
// chacune des neuf clés, la date inconnue, et la liste complète au
// 2026-10-12 sur le client fictif, écrite à la main.

const EXEMPLE = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const FICHIERS = Object.fromEntries(NOMS_TABLES.map((t) => [t, `${t}.csv`])) as FichiersAgenceWeb
const veille = configFictive().veiller
const registre = chargerRegistre(fileURLToPath(new URL('../..', import.meta.url)))
const REF = Temporal.PlainDate.from(DATE_REFERENCE)
const lire = () => lireAgenceWeb(EXEMPLE, FICHIERS)

/** Toutes les échéances du § 8, portées ou non par un interdit, sous le nom de leur clé. */
const toutes = (jour: Temporal.PlainDate, ctx = lire()) =>
  veiller(
    echeancesDues(ctx, veille, registre).map(({ cle, ...e }) => ({ regle: cle, ...e })),
    jour,
  ).map((a) => `${a.regle} ${a.objet} ${a.niveau}`)

const vide = (): Tables => Object.fromEntries(NOMS_TABLES.map((t) => [t, []])) as unknown as Tables

describe('les neuf échéances de la config', () => {
  it('une par clé de `veiller.echeances`, dans le même ordre', () => {
    expect([...ECHEANCES]).toEqual(Object.keys(ConfigAgenceWeb.shape.veiller.shape.echeances.shape))
  })
  it('celles qu’un interdit porte sont remises à la veille, chacune à un interdit du registre', () => {
    const portees = Object.entries(INTERDIT_DE_L_ECHEANCE).filter(([, r]) => r !== null)
    expect(Object.fromEntries(portees)).toEqual({
      fin_tma: 'I-04',
      domaine: 'I-13',
      certificat: 'I-13',
      attestation_urssaf: 'I-09',
      pv_non_signe: 'I-01',
    })
    for (const [, r] of portees) expect(registre.interdits.some((i) => i.id === r)).toBe(true)
  })
})

describe('la limite de chaque échéance', () => {
  const limite = (objet: string) =>
    echeancesDues(lire(), veille, registre)
      .find((e) => e.objet === objet)
      ?.limite?.toString()
  it('facture : le lendemain de l’échéance (J+1, premier rappel)', () => {
    expect(limite('FAC-2026-031/echeance')).toBe('2026-08-31')
  })
  it('PV : quinze jours après la recette', () => {
    expect(limite('LOT-042/pv')).toBe('2026-09-08')
  })
  it('devis : dix jours après l’envoi', () => {
    expect(limite('DEV-2026-022/relance')).toBe('2026-09-24')
  })
  it('attestation : six mois après la dernière', () => {
    expect(limite('ST-01/attestation')).toBe('2026-08-10')
  })
  it('TMA : la fin moins le préavis', () => {
    expect(limite('TMA-08/fin')).toBe('2026-11-01')
    expect(limite('TMA-02/fin')).toBe('2026-12-01')
  })
  it('garantie, domaine, certificat, fin de support : la date elle-même', () => {
    expect(limite('PRJ-06/garantie')).toBe('2026-11-18')
    expect(limite('DOM-23/domaine')).toBe('2026-10-03')
    expect(limite('DOM-07/certificat')).toBe('2026-10-22')
    expect(limite('PRJ-15/support/cms')).toBe('2027-02-28')
  })
  it('rien pour une facture payée, un devis signé, un sous-traitant sous le seuil, un projet sous TMA', () => {
    const objets = echeancesDues(lire(), veille, registre).map((e) => e.objet)
    expect(objets).not.toContain('FAC-2026-001/echeance')
    expect(objets).not.toContain('DEV-2026-010/relance')
    expect(objets).not.toContain('ST-03/attestation')
    // PRJ-18 est clos ; PRJ-06 est en garantie sans contrat TMA
    expect(objets.filter((o) => o.endsWith('/garantie')).sort()).toEqual([
      'PRJ-06/garantie',
      'PRJ-07/garantie',
    ])
  })
})

describe('une date inconnue est une alerte, jamais un silence', () => {
  it('un domaine sans date d’expiration ni de certificat', () => {
    const t = vide()
    t.domaines = [
      {
        id: 'DOM-01',
        nom: 'site-a.example',
        client: undefined,
        registrar: undefined,
        expire_le: undefined,
        certificat_expire_le: undefined,
      },
    ]
    const alertes = veiller(echeancesAgenceWeb(contexte(t), veille, registre), REF)
    expect(alertes.map((a) => `${a.regle} ${a.objet} ${a.niveau}`)).toEqual([
      'I-13 DOM-01/domaine alerte',
      'I-13 DOM-01/certificat alerte',
    ])
    expect(alertes[0]?.motif).toBe(
      "date inconnue : renseigner la date d'expiration du domaine DOM-01 ; sans renouvellement, le site et les mails sont coupés",
    )
  })
  it('un sous-traitant au-delà du seuil sans attestation, un autre au montant inconnu', () => {
    const t = vide()
    t.sous_traitants = [
      { id: 'ST-01', nom: 'A', montant_annuel_ht_eur: 9000, attestation_urssaf_le: undefined },
      { id: 'ST-02', nom: 'B', montant_annuel_ht_eur: undefined, attestation_urssaf_le: undefined },
    ]
    expect(
      veiller(echeancesAgenceWeb(contexte(t), veille, registre), REF).map(
        (a) => `${a.objet} ${a.niveau}`,
      ),
    ).toEqual(['ST-01/attestation alerte', 'ST-02/attestation alerte'])
  })
})

describe('client fictif : la liste complète au 2026-10-12', () => {
  it('les neuf clés, portées ou non par un interdit', () => {
    expect(toutes(REF).sort()).toEqual(
      [
        'facture_echeance FAC-2026-031/echeance escalade',
        'facture_echeance FAC-2026-042/echeance escalade',
        // TMA-08 : fin le 31/12/2026, préavis de 60 jours ; TMA-02 (préavis de 30 jours) pas encore
        'fin_tma TMA-08/fin escalade',
        'domaine DOM-23/domaine escalade',
        'certificat DOM-07/certificat alerte',
        'fin_support PRJ-03/support/langage serveur alerte',
        'fin_support PRJ-15/support/cms alerte',
        'attestation_urssaf ST-01/attestation escalade',
        'pv_non_signe LOT-042/pv escalade',
        'devis_sans_reponse DEV-2026-022/relance escalade',
        'devis_sans_reponse DEV-2026-023/relance escalade',
      ].sort(),
    )
  })
  it('celles que la veille remet au rapport', () => {
    expect(
      veiller(echeancesAgenceWeb(lire(), veille, registre), REF)
        .map((a) => `${a.regle} ${a.objet} ${a.niveau}`)
        .sort(),
    ).toEqual(
      [
        'I-13 DOM-23/domaine escalade',
        'I-13 DOM-07/certificat alerte',
        'I-09 ST-01/attestation escalade',
        'I-01 LOT-042/pv escalade',
        // la fin d'un contrat TMA met fin aux accès de l'agence qu'il justifiait (I-04)
        'I-04 TMA-08/fin escalade',
      ].sort(),
    )
  })
  it('un mois plus tard, TMA-02 et la garantie de PRJ-06 arrivent', () => {
    const plusTard = toutes(REF.add({ months: 1 }))
    expect(plusTard).toContain('fin_tma TMA-02/fin escalade')
    expect(plusTard).toContain('fin_garantie PRJ-06/garantie escalade')
  })
})

describe('les valeurs des textes viennent du registre', () => {
  it('I-09 lit son seuil dans regles.yaml : à 9 000 €, ST-01 (8 000 €) ne doit plus d’attestation', () => {
    const avec9000 = {
      ...registre,
      interdits: registre.interdits.map((i) =>
        i.id === 'I-09' ? { ...i, parametres: { ...i.parametres, seuil_annuel_eur_ht: 9000 } } : i,
      ),
    }
    const objets = (r: typeof registre) => echeancesDues(lire(), veille, r).map((e) => e.objet)
    expect(objets(registre)).toContain('ST-01/attestation')
    expect(objets(avec9000)).not.toContain('ST-01/attestation')
  })
})

describe('I-04 : la fin d’un contrat TMA arrive au rapport', () => {
  it('TMA-04 fini le 2026-09-30 : les accès de l’agence à PRJ-18 sont à révoquer', () => {
    const ctx = lire()
    const c = ctx.contrats_tma.get('TMA-04')
    if (!c) throw new Error('TMA-04')
    c.fin = '2026-09-30'
    const alerte = veiller(echeancesAgenceWeb(ctx, veille, registre), REF).find(
      (a) => a.objet === 'TMA-04/fin',
    )
    expect(alerte?.regle).toBe('I-04')
    expect(alerte?.niveau).toBe('escalade')
    expect(alerte?.motif).toMatch(/révoquer les accès/)
  })
})

describe('une relance se prépare en dix minutes (entretien § 8)', () => {
  it('le jour de la limite, une alerte ; le lendemain, une escalade', () => {
    const jour = Temporal.PlainDate.from('2026-10-20')
    expect(toutes(jour)).toContain('pv_non_signe LOT-023/pv alerte')
    expect(toutes(jour.add({ days: 1 }))).toContain('pv_non_signe LOT-023/pv escalade')
  })
})

describe('un délai de la maison « fin de mois » (PLAN-METIER-2.md § 8, M13)', () => {
  it('se lit par `ajouter` du moteur : les jours, puis le dernier jour du mois atteint', () => {
    const finDeMois = {
      ...veille,
      delais: { ...veille.delais, pv_non_signe: { jours: 45, fin_de_mois: true as const } },
    }
    // LOT-042 recetté le 24/08/2026 : + 45 jours, le 08/10/2026 ; fin de mois, le 31/10/2026
    expect(
      echeancesDues(lire(), finDeMois, registre)
        .find((e) => e.objet === 'LOT-042/pv')
        ?.limite?.toString(),
    ).toBe('2026-10-31')
  })
})
