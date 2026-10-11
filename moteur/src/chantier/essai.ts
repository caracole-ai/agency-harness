import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { stringify } from 'yaml'
import { type Agence, chargerAgence } from '../agence/config'
import { RACINE_DEPOT } from '../agence/fictif'
import { dossierEssai } from '../ronde/essai'
import { FICHIER_CARTE } from '../ronde/ronde'
import { type Commande, commandeSync } from './arbre'
import { FICHIER_METHODE } from './chantier'
import type { Mission } from './mission'

// Pour les tests du chantier (PLAN-RONDE.md § 6.4, PLAN-GENERAL.md G1 à G3) :
// trois dépôts git réels et jetables (un dépôt nu qui joue `origin`, le clone
// de la nuit, l'arbre « courant » d'un humain), un binaire `claude` simulé par
// un script qui écrit un diff connu dans son dossier et rend un JSON, et
// `pnpm` simulé (install, check, evals) ; git, lui, tourne pour de vrai, et
// chaque commande émise se capture.

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout
}

/** Ce que le faux dépôt contient au départ : de quoi lire, tester et compter. */
export const CONSIGNES_ESSAI = `maintenant: "2026-10-10T21:40"
cas:
  - { id: P-1, role: patron, consigne: "planning", attendu: { sorte: action, action: voir_planning } }
`
export const TEST_ESSAI = `import { it } from 'vitest'
it('un', () => {})
it('deux', () => {})
`

export interface Depots {
  /** Le dépôt nu qui joue `origin`. */
  origine: string
  /** Le clone de la nuit (G3). */
  depot: string
  /** L'arbre d'un humain : le code qui tourne. */
  racine: string
}

/** Un dépôt nu, un arbre humain qui y pousse `main`, et le clone de la nuit. */
export function creerDepots(): Depots {
  const base = mkdtempSync(join(tmpdir(), 'chantier-'))
  const origine = join(base, 'origine.git')
  const racine = join(base, 'humain')
  const depot = join(base, 'nuit')
  git(base, 'init', '-q', '--bare', '-b', 'main', origine)
  mkdirSync(racine)
  git(racine, 'init', '-q', '-b', 'main')
  const fichiers: Record<string, string> = {
    [FICHIER_METHODE]: readFileSync(join(RACINE_DEPOT, FICHIER_METHODE), 'utf8'),
    [FICHIER_CARTE]: readFileSync(join(RACINE_DEPOT, FICHIER_CARTE), 'utf8'),
    'memoire/INDEX.md': '# index\n',
    'memoire/CONVENTIONS.md': '# conventions\n',
    'evals/consignes.yaml': CONSIGNES_ESSAI,
    'metiers/essai/code/src/actions.ts': 'export const ACTIONS = []\n',
    'metiers/essai/code/src/actions.test.ts': TEST_ESSAI,
    'moteur/src/moteur.ts': 'export const MOTEUR = 1\n',
  }
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true })
    writeFileSync(join(racine, chemin), contenu)
  }
  for (const d of [racine]) {
    git(d, 'config', 'user.email', 'essai@exemple.invalid')
    git(d, 'config', 'user.name', 'essai')
  }
  git(racine, 'add', '-A')
  git(racine, 'commit', '-q', '-m', 'départ')
  git(racine, 'remote', 'add', 'origin', origine)
  git(racine, 'push', '-q', 'origin', 'main')
  git(base, 'clone', '-q', origine, depot)
  git(depot, 'config', 'user.email', 'nuit@exemple.invalid')
  git(depot, 'config', 'user.name', 'nuit')
  return { origine, depot, racine }
}

/** Ce que joue le binaire simulé, appel après appel. */
export interface Scenario {
  plan?: { faisable: boolean; raison: string; plan: string }
  /** Une entrée par implémentation (puis reprise) : les fichiers écrits ou supprimés, l'issue. */
  implementations?: {
    ecrire?: Record<string, string>
    supprimer?: string[]
    subtype?: string
    texte?: string
  }[]
  /** Une entrée par relecture. */
  relectures?: { constats: { niveau: string; fichier: string; ligne: number; texte: string }[] }[]
  /** Le coût rapporté par appel. */
  cout?: number
}

export const TEXTE_IMPLEMENTATION = `Fait.

## Vérifié
- pnpm check vert

## Non vérifié, risque
- rien d'autre : la mission ne touche qu'un geste

## Ce que j'ai appris
- un geste nouveau a ses trois cas dès sa naissance
`

/**
 * Un faux binaire `claude` : `auth status` connecté ; sinon il lit son rôle
 * dans ses arguments (`--json-schema` du plan ou de la relecture, aucun pour
 * l'implémentation), joue l'entrée suivante du scénario dans son dossier de
 * travail, et note chaque appel (rôle, arguments, message) dans `appels`.
 */
export function binaireSimule(scenario: Scenario): { binaire: string; appels: () => Appel[] } {
  const d = mkdtempSync(join(tmpdir(), 'claude-simule-'))
  const binaire = join(d, 'claude.mjs')
  const etat = join(d, 'appels.json')
  writeFileSync(join(d, 'scenario.json'), JSON.stringify(scenario))
  writeFileSync(
    binaire,
    `#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
const args = process.argv.slice(2)
if (args[0] === 'auth') { console.log(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' })); process.exit(0) }
const scenario = JSON.parse(readFileSync(${JSON.stringify(join(d, 'scenario.json'))}, 'utf8'))
const etat = ${JSON.stringify(etat)}
let entree = ''
process.stdin.on('data', (x) => { entree += x })
process.stdin.on('end', () => {
  const appels = existsSync(etat) ? JSON.parse(readFileSync(etat, 'utf8')) : []
  const schema = args.includes('--json-schema') ? args[args.indexOf('--json-schema') + 1] : ''
  const role = schema.includes('faisable') ? 'plan' : schema.includes('constats') ? 'relecture' : 'implementation'
  const n = appels.filter((a) => a.role === role).length
  appels.push({ role, args, entree, cwd: process.cwd() })
  writeFileSync(etat, JSON.stringify(appels))
  const sortie = { type: 'result', subtype: 'success', is_error: false, result: 'ok', total_cost_usd: scenario.cout ?? 0.5, num_turns: 3 }
  if (role === 'plan') sortie.structured_output = scenario.plan
  if (role === 'relecture') sortie.structured_output = { constats: [], resume: 'relu', ...(scenario.relectures ?? [])[n] }
  if (role === 'implementation') {
    const i = (scenario.implementations ?? [])[n] ?? {}
    for (const [chemin, contenu] of Object.entries(i.ecrire ?? {})) {
      mkdirSync(dirname(join(process.cwd(), chemin)), { recursive: true })
      writeFileSync(join(process.cwd(), chemin), contenu)
    }
    for (const chemin of i.supprimer ?? []) rmSync(join(process.cwd(), chemin))
    sortie.result = i.texte ?? ${JSON.stringify(TEXTE_IMPLEMENTATION)}
    if (i.subtype) { sortie.subtype = i.subtype; sortie.is_error = true }
  }
  process.stdout.write(JSON.stringify(sortie))
})
`,
  )
  chmodSync(binaire, 0o755)
  return {
    binaire,
    appels: () => (existsSync(etat) ? (JSON.parse(readFileSync(etat, 'utf8')) as Appel[]) : []),
  }
}

export interface Appel {
  role: 'plan' | 'implementation' | 'relecture'
  args: string[]
  entree: string
  cwd: string
}

/** Ce que rend `pnpm` simulé. */
export interface PnpmSimule {
  /** Le code de `pnpm check`, appel après appel (le dernier se répète). */
  check?: number[]
  /** La sortie de `pnpm evals traduire` et son code. */
  evals?: { sortie: string; code: number }
}

export const EVALS_AU_SEUIL = {
  sortie: '\n61/62 (98 %, seuil 95 %), fuite 0 cas (seuil 0), coût 0.1200 $\nSeuil atteint.',
  code: 0,
}

/** git pour de vrai, `pnpm` simulé ; chaque commande émise est notée. */
export function commandeSimulee(p: PnpmSimule = {}): {
  commande: Commande
  emises: { cwd: string; commande: string; args: string[] }[]
} {
  const emises: { cwd: string; commande: string; args: string[] }[] = []
  let checks = 0
  const commande: Commande = (cwd, nom, args, env) => {
    emises.push({ cwd, commande: nom, args })
    if (nom !== 'pnpm') return commandeSync(cwd, nom, args, env)
    if (args[0] === 'check') {
      const codes = p.check ?? [0]
      const code = codes[Math.min(checks++, codes.length - 1)] ?? 0
      return { code, sortie: code === 0 ? 'vert' : 'rouge : 1 test en échec', erreur: '' }
    }
    if (args[0] === 'evals') {
      const e = p.evals ?? EVALS_AU_SEUIL
      return { code: e.code, sortie: e.sortie, erreur: '' }
    }
    return { code: 0, sortie: '', erreur: '' }
  }
  return { commande, emises }
}

/** L'agence du dépôt, avec le binaire simulé et le clone de la nuit d'essai. */
export function agenceEssai(
  binaire: string,
  depot: string,
  x: Partial<Agence['chantier']> = {},
): Agence {
  const a = chargerAgence(RACINE_DEPOT)
  return {
    ...a,
    claude: { binaire },
    depot_nuit: depot,
    chantier: { ...a.chantier, ...x },
  }
}

export const MISSION_ESSAI: Mission = {
  id: 'simuler_absence',
  sorte: 'geste_code',
  titre: 'Coder la simulation d’absence',
  pourquoi: 'deux échappées le même jour (E-20261010T0900-0005)',
  echappees: ['E-20261010T0900-0005', 'E-20261010T1000-0006'],
  intentions: ['simuler_absence'],
  consignes_types: ['et si <agent> était absent du <du> au <au>, qui reprendrait ?'],
  ecrit: false,
  estimation: 'moyenne',
  date: '2026-10-10',
  metier: 'essai',
  statut: 'à faire',
}

/** Un dossier client d'essai (celui de la ronde) qui porte une mission ; rend le chemin du fichier. */
export function clientAvecMission(mission: Mission = MISSION_ESSAI): {
  dossier: string
  fichier: string
} {
  const dossier = dossierEssai()
  const d = join(dossier, 'rondes', mission.date)
  mkdirSync(d, { recursive: true })
  const fichier = join(d, `${mission.id}.yaml`)
  writeFileSync(fichier, stringify(mission))
  return { dossier, fichier }
}

/** Un geste nouveau, ses trois cas et son test : ce qu'une implémentation verte écrit. */
export function gesteVert(id = 'simuler_absence_code'): Record<string, string> {
  return {
    'metiers/essai/code/src/simulation.ts': `export const ${id.toUpperCase()} = '${id}'\n`,
    'metiers/essai/code/src/simulation.test.ts': `import { it } from 'vitest'\nit('simule', () => {})\n`,
    'evals/consignes.yaml': `${CONSIGNES_ESSAI}${[1, 2, 3]
      .map(
        (n) =>
          `  - { id: S-${n}, role: patron, consigne: "et si ${n}", attendu: { sorte: action, action: ${id} } }\n`,
      )
      .join('')}`,
  }
}
