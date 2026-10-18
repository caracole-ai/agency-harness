import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Executer } from '../agence/config'
import { VARIABLE_CLE_SIGNATURE } from '../livraison/version'
import {
  argumentsClaude,
  envEnfant,
  type LancementClaude,
  type Lancer,
  lancerClaude,
} from './claude'

// PLAN-RONDE.md § 6.2 et § 0.a : le binaire `claude` simulé par un script qui
// rend un JSON connu. Le préflight passe avant tout lancement ; la ligne de
// commande de la ronde n'a aucun outil, aucun réglage, et un schéma.

const ENV = { PATH: process.env.PATH }
const connecte: Executer = () => ({ code: 0, sortie: '{"loggedIn":true}', erreur: '' })
const dossier = mkdtempSync(join(tmpdir(), 'claude-'))

/** Un faux binaire : il répond à `auth status`, écrit ses arguments et son entrée, et rend `sortie`. */
/** Un binaire simulé ; une chaîne est écrite telle quelle (un flux), un objet en JSON. */
function binaire(sortie: unknown, opts: { code?: number; attendreMs?: number } = {}): string {
  const texte = typeof sortie === 'string' ? sortie : JSON.stringify(sortie)
  const chemin = join(dossier, `claude-${Math.random().toString(16).slice(2)}.mjs`)
  writeFileSync(
    chemin,
    `#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
const args = process.argv.slice(2)
if (args[0] === 'auth') { console.log(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' })); process.exit(0) }
let entree = ''
process.stdin.on('data', (d) => { entree += d })
process.stdin.on('end', () => {
  writeFileSync(${JSON.stringify(`${chemin}.recu.json`)}, JSON.stringify({ args, entree }))
  setTimeout(() => { process.stdout.write(${JSON.stringify(texte)}); process.exit(${opts.code ?? 0}) }, ${opts.attendreMs ?? 0})
})
`,
  )
  chmodSync(chemin, 0o755)
  return chemin
}

const recu = (chemin: string) =>
  JSON.parse(readFileSync(`${chemin}.recu.json`, 'utf8')) as { args: string[]; entree: string }

const resultat = (x: Record<string, unknown> = {}) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: '{"a":1}',
  structured_output: { a: 1 },
  total_cost_usd: 0.0123,
  num_turns: 2,
  ...x,
})

const lancement = (x: Partial<LancementClaude> = {}): LancementClaude => ({
  modele: 'modele-essai',
  effort: 'high',
  prompt: 'le résumé',
  systeme: 'le système',
  outils: [],
  cwd: dossier,
  schemaJson: { type: 'object' },
  delaiMs: 10_000,
  reglages: 'aucun',
  ...x,
})

describe('argumentsClaude', () => {
  it('la ronde : aucun outil, isolée, sortie structurée, système remplacé', () => {
    const a = argumentsClaude(lancement())
    expect(a.slice(0, 3)).toEqual(['-p', '--output-format', 'json'])
    expect(a[a.indexOf('--tools') + 1]).toBe('')
    expect(a).not.toContain('--allowedTools')
    expect(a[a.indexOf('--json-schema') + 1]).toBe('{"type":"object"}')
    expect(a[a.indexOf('--system-prompt') + 1]).toBe('le système')
    expect(a[a.indexOf('--setting-sources') + 1]).toBe('')
    expect(a).toContain('--strict-mcp-config')
    expect(a).toContain('--no-session-persistence')
  })

  it('le chantier : les outils par nom, les règles par --allowedTools, les bornes, les réglages du projet', () => {
    const a = argumentsClaude(
      lancement({
        outils: ['Read', 'Bash(pnpm check)', 'Bash(git diff*)'],
        systeme: undefined,
        systemeAjouteFichier: 'methode/chantier.md',
        permission: 'dontAsk',
        toursMax: 60,
        budgetUsd: 10,
        schemaJson: undefined,
        reglages: 'projet',
      }),
    )
    expect(a[a.indexOf('--tools') + 1]).toBe('Read,Bash')
    expect(a.slice(a.indexOf('--allowedTools') + 1, a.indexOf('--allowedTools') + 4)).toEqual([
      'Read',
      'Bash(pnpm check)',
      'Bash(git diff*)',
    ])
    expect(a).toEqual(expect.arrayContaining(['--max-turns', '60', '--max-budget-usd', '10']))
    expect(a).not.toContain('--json-schema')
    // Les réglages de l'arbre seulement : ni hooks ni CLAUDE.md de l'utilisateur.
    expect(a[a.indexOf('--setting-sources') + 1]).toBe('project')
    expect(a).toContain('--strict-mcp-config')
  })
})

describe('lancerClaude, avec un binaire simulé', () => {
  it('en flux : le résultat de la dernière ligne, et les outils tentés hors de la sortie structurée', async () => {
    const flux = [
      { type: 'system', subtype: 'init' },
      {
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'requete', input: { sql: 'SELECT 1' } }] },
      },
      {
        type: 'user',
        message: { content: [{ type: 'tool_result', content: 'No such tool available: requete' }] },
      },
      {
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'StructuredOutput', input: { a: 1 } }] },
      },
      resultat(),
    ]
      .map((e) => JSON.stringify(e))
      .join('\n')
    const b = binaire(flux)
    const r = await lancerClaude(lancement({ flux: true }), { claude: { binaire: b } }, ENV)
    expect(r).toMatchObject({ ok: true, sortie: { a: 1 }, tours: 2 })
    expect(r.tentatives).toEqual([{ nom: 'requete', entree: { sql: 'SELECT 1' } }])
    const a = recu(b).args
    expect(a.slice(0, 4)).toEqual(['-p', '--output-format', 'stream-json', '--verbose'])
  })

  it('rend la sortie structurée, le coût et les tours ; le prompt part sur l’entrée standard', async () => {
    const b = binaire(resultat())
    const r = await lancerClaude(lancement(), { claude: { binaire: b } }, ENV)
    expect(r).toMatchObject({
      ok: true,
      sortie: { a: 1 },
      cout: 0.0123,
      tours: 2,
      sousType: 'success',
    })
    expect(recu(b).entree).toBe('le résumé')
    expect(recu(b).args).toContain('modele-essai')
  })

  it('sortie structurée absente, sous-type d’échec, code non nul : ok faux, coût gardé', async () => {
    const sans = await lancerClaude(
      lancement(),
      { claude: { binaire: binaire(resultat({ structured_output: undefined })) } },
      ENV,
    )
    expect(sans).toMatchObject({ ok: false, raison: 'sortie structurée absente', cout: 0.0123 })
    const tours = await lancerClaude(
      lancement(),
      { claude: { binaire: binaire(resultat({ subtype: 'error_max_turns', is_error: true })) } },
      ENV,
    )
    expect(tours).toMatchObject({ ok: false, sousType: 'error_max_turns' })
    const code = await lancerClaude(
      lancement(),
      { claude: { binaire: binaire(resultat(), { code: 1 }) } },
      ENV,
    )
    expect(code).toMatchObject({ ok: false, raison: 'code de sortie 1' })
  })

  it('une sortie illisible : ok faux, en le disant', async () => {
    const r = await lancerClaude(lancement(), { claude: { binaire: binaire('pas du json') } }, ENV)
    expect(r.ok).toBe(false)
    expect(r.raison).toMatch(/illisible/)
  })

  it('le délai mural tue le processus', async () => {
    const r = await lancerClaude(
      lancement({ delaiMs: 200 }),
      { claude: { binaire: binaire(resultat(), { attendreMs: 5000 }) } },
      ENV,
    )
    expect(r).toMatchObject({ ok: false })
    expect(r.raison).toMatch(/délai mural/)
  })

  it('ANTHROPIC_API_KEY présente : refus avant tout lancement', async () => {
    let lance = false
    const lancer: Lancer = async () => {
      lance = true
      return { code: 0, sortie: JSON.stringify(resultat()), erreur: '', delai: false }
    }
    await expect(
      lancerClaude(
        lancement(),
        { claude: { binaire: 'claude' } },
        { ANTHROPIC_API_KEY: 'k' },
        lancer,
        connecte,
      ),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/)
    expect(lance).toBe(false)
  })
})

describe('envEnfant', () => {
  it('retire les variables npm_* du script parent : un pnpm -s ne rend pas muet le pnpm check du chantier', () => {
    expect(
      envEnfant({ PATH: '/bin', npm_config_loglevel: 'silent', npm_lifecycle_event: 'chantier' }),
    ).toEqual({ PATH: '/bin' })
  })

  it('retire la clé de signature de l’agence (PLAN-LIVRAISON.md § 0.4)', () => {
    expect(
      envEnfant({
        PATH: '/bin',
        [VARIABLE_CLE_SIGNATURE]: '/cles/agence',
        SSH_AUTH_SOCK: '/tmp/agent.1',
      }),
    ).toEqual({ PATH: '/bin' })
  })
})
