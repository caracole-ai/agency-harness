import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import {
  assertEnv,
  chargerAgence,
  type Executer,
  FICHIER_AGENCE,
  PLACE_METIER,
  preflight,
  prixAgence,
} from './config'

// PLAN-RONDE.md § 4.1 : le schéma strict d'agence.yaml, et le préflight au
// moment de l'appel (§ 0.a), jamais au chargement.

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const brut = () =>
  parse(readFileSync(join(RACINE, FICHIER_AGENCE), 'utf8')) as Record<string, unknown>

/** Une racine temporaire qui porte un agence.yaml donné. */
function racineAvec(contenu: unknown): string {
  const d = mkdtempSync(join(tmpdir(), 'agence-'))
  writeFileSync(join(d, FICHIER_AGENCE), stringify(contenu))
  return d
}

const statut =
  (sortie: unknown, code = 0): Executer =>
  () => ({
    code,
    sortie: JSON.stringify(sortie),
    erreur: '',
  })

describe('agence.yaml', () => {
  it("celui du dépôt se charge : les trois rôles du chantier sous l'abonnement", () => {
    const a = chargerAgence(RACINE)
    expect(a.modeles.chantier.plan.acces).toBe('claude')
    expect(a.modeles.chantier.implementation.acces).toBe('claude')
    expect(prixAgence(a, a.modeles.chantier.plan.modele).sortie).toBeGreaterThan(0)
  })

  it('un champ inconnu refuse', () => {
    expect(() => chargerAgence(racineAvec({ ...brut(), inconnu: 1 }))).toThrow(/invalide/)
  })

  it('un réglage manquant refuse', () => {
    const { agence: _agence, ...sans } = brut()
    expect(() => chargerAgence(racineAvec(sans))).toThrow(/invalide/)
  })

  it('le client des évals de chaque métier est un client de ce métier (PLAN-METIER-2.md M9)', () => {
    const { evals_clients } = chargerAgence(RACINE).chantier
    expect(Object.keys(evals_clients)).toContain('securite-privee')
    for (const [metier, client] of Object.entries(evals_clients)) {
      expect(chargerConfig(join(RACINE, client, FICHIER_CONFIG), ConfigBase).metier).toBe(metier)
    }
  })

  it('un chemin autorisé sous metiers/ sans la place du métier refuse (PLAN-METIER-2.md M9)', () => {
    const a = brut() as { chantier: { chemins_autorises: string[] } }
    expect(a.chantier.chemins_autorises.some((c) => c.includes(PLACE_METIER))).toBe(true)
    a.chantier.chemins_autorises = [...a.chantier.chemins_autorises, 'metiers/*/code/src/**']
    expect(() => chargerAgence(racineAvec(a))).toThrow(/porte/)
  })

  it('un modèle sous acces: anthropic sans prix refuse', () => {
    const a = brut() as { modeles: { chantier: { plan: Record<string, unknown> } } }
    a.modeles.chantier.plan = { acces: 'anthropic', modele: 'modele-sans-prix', effort: 'high' }
    expect(() => chargerAgence(racineAvec(a))).toThrow(/aucun prix/)
  })

  it("le chargement n'exige aucune variable d'environnement", () => {
    const a = brut() as { modeles: { chantier: { plan: Record<string, unknown> } } }
    a.modeles.chantier.plan = { ...a.modeles.chantier.plan, acces: 'anthropic' }
    expect(() => chargerAgence(racineAvec(a))).not.toThrow()
  })
})

describe('préflight (§ 0.a)', () => {
  const agence = { claude: { binaire: 'claude' } }

  it('acces: claude, connecté, sans clé : passe', () => {
    expect(
      preflight('claude', agence, {}, statut({ loggedIn: true, authMethod: 'claude.ai' })),
    ).toEqual({})
  })

  it("acces: claude refuse si ANTHROPIC_API_KEY est dans l'environnement, avant d'appeler le binaire", () => {
    let appele = false
    const executer: Executer = () => {
      appele = true
      return { code: 0, sortie: '{"loggedIn":true}', erreur: '' }
    }
    expect(() => preflight('claude', agence, { ANTHROPIC_API_KEY: 'x' }, executer)).toThrow(
      /ANTHROPIC_API_KEY est dans l'environnement/,
    )
    expect(appele).toBe(false)
  })

  it("acces: claude refuse si le binaire n'est pas connecté", () => {
    expect(() => preflight('claude', agence, {}, statut({ loggedIn: false }))).toThrow(
      /pas connecté/,
    )
  })

  it('acces: claude refuse si le binaire échoue ou parle mal', () => {
    expect(() => preflight('claude', agence, {}, statut({}, 1))).toThrow(/a échoué/)
    expect(() =>
      preflight('claude', agence, {}, () => ({ code: 0, sortie: 'pas du json', erreur: '' })),
    ).toThrow(/illisible/)
  })

  it('acces: anthropic exige la clé, au moment de l’appel seulement', () => {
    expect(() => preflight('anthropic', agence, {})).toThrow(/ANTHROPIC_API_KEY absente/)
    expect(preflight('anthropic', agence, { ANTHROPIC_API_KEY: 'k' })).toEqual({ cle: 'k' })
  })

  it('assertEnv refuse une variable vide', () => {
    expect(() => assertEnv('X', { X: '' })).toThrow(/X absente/)
    expect(assertEnv('X', { X: 'v' })).toBe('v')
  })
})
