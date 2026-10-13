import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FICHIER_CONFIG, Journal, Temporal, veilleDuClient } from '@harnais/moteur'
import { afterAll, describe, expect, it } from 'vitest'
import { DATE_REFERENCE } from './cli/fictif'
import { NOMS_TABLES } from './modele'
import { decrire, SECTIONS, sectionEcarts, sectionHorsRegles, VEILLER } from './veille'
import { CONFIG_FICTIVE, configFictive } from './veille.test.fixture'

// La veille de l'agence web de bout en bout (PLAN-METIER-2.md § 7.4) : les CSV
// du client fictif copiés avec sa config dans un dossier temporaire, puis ce
// que `pnpm veiller` appelle, au 2026-10-12. Le rapport porte les erreurs
// posées du § 7.3 au bon verdict ; le ticket de I-05 (TK-1050) n'arrive qu'à
// la section du métier, à qualifier par un humain (PLAN-METIER-2.md § 8).

const METIER = fileURLToPath(new URL('../..', import.meta.url))
const EXEMPLE = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const REF = Temporal.PlainDate.from(DATE_REFERENCE)
/** La phrase d'un rapport sans refus : celle du domaine du métier, branché à l'assemblage. */
const RIEN = 'Rien à corriger.'

const dossier = mkdtempSync(join(tmpdir(), 'agence-web-veille-'))
afterAll(() => rmSync(dossier, { recursive: true, force: true }))
for (const t of NOMS_TABLES) copyFileSync(join(EXEMPLE, `${t}.csv`), join(dossier, `${t}.csv`))
writeFileSync(join(dossier, FICHIER_CONFIG), CONFIG_FICTIVE)

const journal = new Journal(join(dossier, 'journal.sqlite'))
const { passe, rapport } = (() => {
  try {
    return veilleDuClient(VEILLER, METIER, dossier, REF, journal, RIEN)
  } finally {
    journal.fermer()
  }
})()

/** Les lignes du rapport sous un titre de partie, jusqu'au titre suivant. */
const partie = (titre: string) => {
  const lignes = rapport.split('\n')
  const debut = lignes.findIndex((l) => l.startsWith(`## ${titre}`))
  if (debut < 0) throw new Error(`partie « ${titre} » absente`)
  const fin = lignes.findIndex((l, i) => i > debut && l.startsWith('## '))
  return lignes.slice(debut + 1, fin < 0 ? undefined : fin).join('\n')
}

describe('pnpm veiller chez le client fictif, au 2026-10-12', () => {
  it('lit les exports et nomme le client', () => {
    expect(rapport.split('\n')[0]).toBe('# Veille du 12/10/2026 — agence web fictive')
    expect(rapport).toContain(
      'Lu : 18 projets, 45 lots, 300 tickets, 1500 lignes de temps, 60 factures, 40 accès, 30 domaines.',
    )
  })

  it('rien à refuser : tout est déclaré ou adossé à un texte non relu (M15)', () => {
    expect(passe.constats.some((c) => c.verdict === 'refus')).toBe(false)
    expect(partie('À corriger (0)')).toContain(RIEN)
  })

  it('les erreurs posées des contrôles sont à décider, au bon objet', () => {
    const aDecider = partie("À décider par l'exploitation")
    for (const [objet, regle] of [
      ['PRJ-10 · ', 'I-12'],
      ['Tariq Barbier — dépôt prj-18-web (PRJ-18)', 'I-04'],
      ['FAC-2026-042 (CLI-07, PRJ-16)', 'I-01'],
      ['TK-0978 · ', 'I-02'],
      ['FAC-2026-011 (CLI-18, PRJ-13)', 'I-07'],
      ['DEV-2026-008 (CLI-12, PRJ-07)', 'I-11'],
      [
        'PRJ-15 · Site vitrine et devis en ligne (CLI-20) — mise en production du 24/09/2026',
        'I-03',
      ],
    ] as const) {
      const bloc = aDecider.split('\n- **').find((b) => b.startsWith(objet))
      expect(bloc, objet).toBeDefined()
      expect(bloc, objet).toContain(`*${regle}*`)
    }
  })

  it('les erreurs posées des échéances : à traiter maintenant, ou à préparer', () => {
    const maintenant = partie('Échéances à traiter maintenant')
    expect(maintenant).toContain(
      '- **DOM-23 · jardins-de-lune.example (CLI-23, registrar-c) — domaine** — renouveler le domaine DOM-23 : la limite du 03/10/2026 est dépassée',
    )
    expect(maintenant).toMatch(
      /- \*\*Aïcha Hoarau — attestation de vigilance URSSAF\*\* — .*\*I-09\*/,
    )
    expect(maintenant).toMatch(
      /- \*\*LOT-042 · Notifications clients \(PRJ-16\) — PV de recette\*\*/,
    )
    expect(partie('Échéances à préparer')).toContain(
      '- **DOM-07 · camping-genets-bleus.example (CLI-06, registrar-a) — certificat** — renouveler le certificat du domaine DOM-07 au plus tard le 22/10/2026. *I-13*',
    )
  })

  it('le ticket de I-05 n’est que dans la section du métier : la qualification est humaine', () => {
    expect(rapport.slice(0, rapport.indexOf(`## ${SECTIONS.horsRegles}`))).not.toContain('TK-1050')
    expect(partie(SECTIONS.horsRegles)).toContain(
      "- **Bugs hors du périmètre recetté, à qualifier par un humain (bug ou évolution)** (1)\n  - **TK-1050 · Le formulaire d'inscription ne s'envoie pas (PRJ-14)** — le lot LOT-036 n'a pas de PV de recette signé. *I-05*",
    )
  })

  it('les comptes des parties', () => {
    expect(rapport).toContain(`## À décider par l'exploitation (${passe.constats.length})`)
    // 8, plus les 17 évolutions rattachées à un contrat TMA (I-02)
    expect(passe.constats).toHaveLength(25)
    expect(rapport).toContain('## Échéances à traiter maintenant (4)')
    expect(rapport).toContain('## Échéances à préparer (1)')
  })

  it('le journal porte la veille, ses constats et ses alertes', () => {
    const j = new Journal(join(dossier, 'journal.sqlite'))
    try {
      const types = j.lire().map((l) => l.type)
      expect(types.filter((t) => t === 'veille')).toHaveLength(1)
      expect(types.filter((t) => t === 'constat')).toHaveLength(25)
      expect(types.filter((t) => t === 'alerte')).toHaveLength(5)
      // ni personne ni client par son nom dans ce qui est journalisé
      const ctx = passe.ctx
      const noms = [
        ...[...ctx.personnes.values()].map((p) => p.nom),
        ...[...ctx.sous_traitants.values()].map((x) => x.nom),
        ...[...ctx.clients.values()].map((c) => c.nom),
        ...[...ctx.contacts.values()].map((c) => c.nom),
      ]
      const texte = JSON.stringify(j.lire())
      for (const n of noms) expect(texte).not.toContain(n)
    } finally {
      j.fermer()
    }
  })
})

describe('les sections du métier, après « Sources » (PLAN-METIER-2.md M12, § 8)', () => {
  it('« Écarts » : PRJ-10 à 150 % ; PRJ-06 et PRJ-07, facturés à 100 % pile, n’y sont pas', () => {
    expect(rapport.indexOf(`## ${SECTIONS.ecarts}`)).toBeGreaterThan(rapport.indexOf('## Sources'))
    expect(partie(SECTIONS.ecarts)).toBe(
      [
        '',
        '- **Jours consommés / vendus, par forfait, dès 90 %** (1)',
        '  - PRJ-10 : 36 j consommés sur 24 vendus (150 %)',
        '',
      ].join('\n'),
    )
  })

  it('le facturé au-delà du vendu y arrive, même sans lot, sous un contrat TMA', () => {
    const ctx = structuredClone(passe.ctx)
    // 9 000 € sans lot pendant TMA-05 : pas un nombre entier de mensualités, donc au projet
    const tma = ctx.factures.get('FAC-2026-008')
    if (!tma) throw new Error('FAC-2026-008')
    ctx.factures.set('FAC-2026-099', {
      ...tma,
      id: 'FAC-2026-099',
      date: '2026-07-01',
      montant_ht_eur: 9000,
      montant_ttc_eur: 10800,
    })
    // PRJ-15 : 3 360 + 5 040 + 2 520 + 9 000 = 19 920 € facturés sur 15 600 vendus
    expect(sectionEcarts(ctx, configFictive(), REF).lignes).toEqual([
      '- **Jours consommés / vendus, par forfait, dès 90 %** (1)',
      '  - PRJ-10 : 36 j consommés sur 24 vendus (150 %)',
      '- **Euros HT facturés / vendus, par projet (le consommé est le facturé), au-delà de 100 %** (1)',
      '  - PRJ-15 : 19 920 € consommés sur 15 600 vendus (128 %)',
    ])
  })

  it('« À suivre » : les quatre échéances sans interdit, à leur niveau, puis le bug à qualifier', () => {
    const suivre = partie(SECTIONS.horsRegles)
    expect(rapport.indexOf(`## ${SECTIONS.horsRegles}`)).toBeGreaterThan(
      rapport.indexOf(`## ${SECTIONS.ecarts}`),
    )
    expect(suivre).toContain('- **Échéances à traiter maintenant** (4)')
    expect(suivre).toContain(
      '  - **FAC-2026-031 (CLI-18, PRJ-13) — échéance de paiement** — préparer la relance de la facture FAC-2026-031, échue le 30/08/2026, à faire valider par le dirigeant : la limite du 31/08/2026 est dépassée ; dernière relance : niveau 2, le 29/09/2026.',
    )
    expect(suivre).toContain('  - **FAC-2026-042 (CLI-07, PRJ-16) — échéance de paiement** — ')
    expect(suivre).toContain(
      '  - **DEV-2026-022 (CLI-07) — relance du devis** — relancer le devis DEV-2026-022, envoyé le 14/09/2026 : la limite du 24/09/2026 est dépassée.',
    )
    expect(suivre).toContain('  - **DEV-2026-023 (CLI-25) — relance du devis** — ')
    expect(suivre).toContain('- **Échéances à préparer** (2)')
    expect(suivre).toContain(
      '  - **PRJ-03 · Boutique en ligne (CLI-11) — fin de support : langage serveur** — ',
    )
    expect(suivre).toContain(
      '  - **PRJ-15 · Site vitrine et devis en ligne (CLI-20) — fin de support : cms** — ',
    )
    // une échéance qu'un interdit porte reste dans les parties du moteur, pas ici
    expect(suivre).not.toContain('DOM-23')
  })

  it('la fin de garantie de PRJ-06 (18/11/2026) y arrive un mois avant', () => {
    const lignes = sectionHorsRegles(
      passe.ctx,
      configFictive(),
      Temporal.PlainDate.from('2026-10-20'),
    ).lignes
    expect(lignes).toContain(
      '  - **PRJ-06 · Site et prise de contact (CLI-09) — fin de garantie** — proposer un contrat TMA avant la fin de la garantie au plus tard le 18/11/2026 ; après elle, les bugs ne sont plus gratuits.',
    )
  })

  it('aucun nom de client ni de personne dans les sections', () => {
    const ctx = passe.ctx
    const sections = rapport.slice(rapport.indexOf(`## ${SECTIONS.ecarts}`))
    for (const n of [
      ...[...ctx.clients.values()].map((c) => c.nom),
      ...[...ctx.personnes.values()].map((p) => p.nom),
      ...[...ctx.contacts.values()].map((c) => c.nom),
    ])
      expect(sections).not.toContain(n)
  })

  it('un TMA à 80 % du mois et un forfait sans jours vendus y arrivent', () => {
    const ctx = structuredClone(passe.ctx)
    // TMA-01 : 1,5 h saisies en octobre sur 6 incluses ; 3,3 h de plus font 4,8 h, 80 % pile
    ctx.temps.push({
      personne: 'M-05',
      projet: 'TMA-01',
      date: '2026-10-09',
      heures: 3.3,
      commentaire: undefined,
    })
    for (const l of ctx.lots.values()) if (l.projet === 'PRJ-12') l.jours_vendus = undefined
    for (const a of ctx.avenants.values()) if (a.projet === 'PRJ-12') a.jours = undefined
    const lignes = sectionEcarts(ctx, configFictive(), REF).lignes
    expect(lignes).toContain('  - TMA-01/2026-10 : 4,8 h consommées sur 6 vendues (80 %)')
    // 126 h saisies sur PRJ-12 ; rien de vendu dans les données : pas de taux, rien de supposé
    expect(lignes).toContain("  - PRJ-12 : aucun vendu dans les données, rien n'est supposé")
  })
})

describe('decrire', () => {
  const ctx = passe.ctx
  it('nomme les personnes, désigne les clients par leur identifiant', () => {
    expect(decrire(ctx, 'ST-01/attestation')).toBe('Aïcha Hoarau — attestation de vigilance URSSAF')
    expect(decrire(ctx, 'M-05/admin_site/DOM-11')).toBe(
      'Bilal Kowalski — administration du site DOM-11 · ceramiques-orsini.example (CLI-11, registrar-b)',
    )
    expect(decrire(ctx, 'CLI-11')).toBe('CLI-11')
    expect(decrire(ctx, 'TMA-08/fin')).toBe('TMA-08 (CLI-13) — fin du contrat')
    expect(decrire(ctx, 'PRJ-03/support/langage serveur')).toBe(
      'PRJ-03 · Boutique en ligne (CLI-11) — fin de support : langage serveur',
    )
    expect(decrire(ctx, '*')).toBe('*')
  })
  it('aucun nom de client dans ce qui est décrit', () => {
    const noms = [...ctx.clients.values()].map((c) => c.nom)
    const objets = [...passe.constats, ...passe.alertes].map((x) => decrire(ctx, x.objet))
    for (const n of noms) for (const o of objets) expect(o).not.toContain(n)
  })
})
