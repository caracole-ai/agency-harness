import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FICHIER_CONFIG, Journal, Temporal, veilleDuClient } from '@harnais/moteur'
import { afterAll, describe, expect, it } from 'vitest'
import { DATE_REFERENCE } from './cli/fictif'
import { NOMS_TABLES } from './modele'
import { decrire, VEILLER } from './veille'
import { CONFIG_FICTIVE } from './veille.test.fixture'

// La veille de l'agence web de bout en bout (PLAN-METIER-2.md § 7.4) : les CSV
// du client fictif copiés avec sa config dans un dossier temporaire, puis ce
// que `pnpm veiller` appelle, au 2026-10-12. Le rapport porte les erreurs
// posées du § 7.3 au bon verdict ; le ticket de I-05 (TK-1050) n'y est pas,
// I-05 est à l'humain.

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

  it('le ticket de I-05 n’est pas au rapport : la qualification est humaine', () => {
    expect(rapport).not.toContain('TK-1050')
  })

  it('les comptes des parties', () => {
    expect(rapport).toContain(`## À décider par l'exploitation (${passe.constats.length})`)
    expect(passe.constats).toHaveLength(19)
    expect(rapport).toContain('## Échéances à traiter maintenant (3)')
    expect(rapport).toContain('## Échéances à préparer (1)')
  })

  it('le journal porte la veille, ses constats et ses alertes', () => {
    const j = new Journal(join(dossier, 'journal.sqlite'))
    try {
      const types = j.lire().map((l) => l.type)
      expect(types.filter((t) => t === 'veille')).toHaveLength(1)
      expect(types.filter((t) => t === 'constat')).toHaveLength(19)
      expect(types.filter((t) => t === 'alerte')).toHaveLength(4)
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
