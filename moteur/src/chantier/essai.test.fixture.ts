import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { stringify } from 'yaml'
import { type Agence, chargerAgence } from '../agence/config'
import { RACINE_DEPOT } from '../agence/fictif'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { FICHIER_SIGNATAIRES, VARIABLE_CLE_SIGNATURE } from '../livraison/version'
import { FUSEAU, Temporal } from '../temps/temporal'
import { type Commande, commandeSync } from './arbre'
import { FICHIER_CARTE, FICHIER_METHODE } from './chantier'
import { fichierConsignes } from './garde'
import { CLIENT_ESSAI, dossierEssai, METIER_ESSAI } from './metier-essai.test.fixture'
import { commanderMission, DOSSIER_MISSIONS, type Mission } from './mission'

// Pour les tests du chantier (PLAN-RONDE.md § 6.4, PLAN-GENERAL.md G1, G2 ;
// PLAN-LIVRAISON.md L2) : deux dépôts git réels et jetables (un dépôt nu qui
// joue `origin`, le dépôt de l'agence, qui est l'arbre d'un humain), un
// binaire `claude` simulé par un script qui écrit un diff connu dans son
// dossier et rend un JSON, et `pnpm` simulé (install, check, evals) ; git,
// lui, tourne pour de vrai, et chaque commande émise se capture.

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

/** Une paire de clés ed25519 sans phrase de passe, dans un dossier temporaire, et le fichier `signataires` qui admet sa publique. */
export function cleEssai(nom = 'agence'): {
  privee: string
  publique: string
  signataires: string
} {
  const d = mkdtempSync(join(tmpdir(), 'cle-'))
  const privee = join(d, nom)
  const r = spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', nom, '-f', privee])
  if (r.status !== 0) throw new Error(`ssh-keygen : ${r.stderr}`)
  const publique = readFileSync(`${privee}.pub`, 'utf8').trim()
  const signataires = join(d, FICHIER_SIGNATAIRES)
  writeFileSync(signataires, `${nom} ${publique}\n`)
  return { privee, publique, signataires }
}

/** La clé de signature des tests (L4), hors de tout dépôt. */
export const CLE_ESSAI = cleEssai()

/** L'environnement des processus lancés par un test : le `PATH` (le faux binaire est un script node) et la clé de signature. */
export const ENV_ESSAI: Record<string, string | undefined> = {
  PATH: process.env.PATH,
  [VARIABLE_CLE_SIGNATURE]: CLE_ESSAI.privee,
}

export interface Depots {
  /** Le dépôt nu qui joue `origin`. */
  origine: string
  /** Le dépôt de l'agence, arbre d'un humain sur `main` : le code qui tourne, la base des arbres. */
  racine: string
}

/** Un dépôt nu, et un arbre humain qui y pousse `main`. */
export function creerDepots(): Depots {
  const base = mkdtempSync(join(tmpdir(), 'chantier-'))
  const origine = join(base, 'origine.git')
  const racine = join(base, 'humain')
  git(base, 'init', '-q', '--bare', '-b', 'main', origine)
  mkdirSync(racine)
  git(racine, 'init', '-q', '-b', 'main')
  const fichiers: Record<string, string> = {
    [FICHIER_METHODE]: readFileSync(join(RACINE_DEPOT, FICHIER_METHODE), 'utf8'),
    [FICHIER_CARTE]: readFileSync(join(RACINE_DEPOT, FICHIER_CARTE), 'utf8'),
    'memoire/INDEX.md': '# index\n',
    'memoire/CONVENTIONS.md': '# conventions\n',
    [fichierConsignes(MISSION_ESSAI.metier)]: CONSIGNES_ESSAI,
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
  return { origine, racine }
}

/** Un clone jetable du distant : ce que `main` d'`origin` porte (la mémoire, le code). */
export function cloneDuDistant(origine: string): string {
  const d = join(mkdtempSync(join(tmpdir(), 'distant-')), 'clone')
  git(tmpdir(), 'clone', '-q', origine, d)
  return d
}

/** Ce qui doit rester identique dans l'arbre d'un humain : sa tête, sa branche, son `main`, son état. */
export const etatHumain = (racine: string) => ({
  tete: git(racine, 'rev-parse', 'HEAD'),
  branche: git(racine, 'rev-parse', '--abbrev-ref', 'HEAD'),
  main: git(racine, 'rev-parse', 'refs/heads/main'),
  statut: git(racine, 'status', '--porcelain', '--untracked-files=all'),
})

/** Le distant refuse tout push (`pre-receive` rend 1), ou seulement les `fois` premiers. */
export function refuserPush(origine: string, fois?: number): void {
  const hook = join(origine, 'hooks', 'pre-receive')
  const compte = join(origine, 'refus-restants')
  writeFileSync(
    hook,
    fois === undefined
      ? '#!/bin/sh\nexit 1\n'
      : `#!/bin/sh\nn=$(cat "${compte}")\nif [ "$n" -gt 0 ]; then echo $((n - 1)) > "${compte}"; exit 1; fi\nexit 0\n`,
  )
  if (fois !== undefined) writeFileSync(compte, `${fois}\n`)
  chmodSync(hook, 0o755)
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
  appels.push({ role, args, entree, cwd: process.cwd(), cle: process.env.${VARIABLE_CLE_SIGNATURE} !== undefined })
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
  /** La clé de signature était-elle dans son environnement (§ 0.4 : jamais). */
  cle: boolean
}

/** Ce que rend `pnpm` simulé. */
export interface PnpmSimule {
  /** Le code de `pnpm check`, appel après appel (le dernier se répète). */
  check?: number[]
  /** La sortie de `pnpm evals traduire` et son code. */
  evals?: { sortie: string; code: number }
}

export const EVALS_AU_SEUIL = {
  sortie:
    'P-1 : ok\nR-2 : écart (le modèle a dit autre chose)\n\n61/62 (98 %, seuil 95 %), fuite 0 cas (seuil 0), coût 0.1200 $\nSeuil atteint.',
  code: 0,
}

/** Une commande émise : où, quoi, et les noms des variables qu'elle a reçues quand on lui en a passé. */
export interface Emise {
  cwd: string
  commande: string
  args: string[]
  variables?: string[]
}

/** git pour de vrai, `pnpm` simulé ; chaque commande émise est notée. */
export function commandeSimulee(p: PnpmSimule = {}): { commande: Commande; emises: Emise[] } {
  const emises: Emise[] = []
  let checks = 0
  const commande: Commande = (cwd, nom, args, env) => {
    emises.push({ cwd, commande: nom, args, ...(env ? { variables: Object.keys(env) } : {}) })
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

/** Le client des évals du métier d'essai : jamais lu, `pnpm` est simulé ; la commande émise le porte. */
export const CLIENT_EVALS_ESSAI = 'exemples/client-essai'

/** L'agence du dépôt, avec le binaire simulé et le client des évals du métier d'essai. */
export function agenceEssai(binaire: string, x: Partial<Agence['chantier']> = {}): Agence {
  const a = chargerAgence(RACINE_DEPOT)
  return {
    ...a,
    claude: { binaire },
    chantier: {
      ...a.chantier,
      evals_clients: { [MISSION_ESSAI.metier]: CLIENT_EVALS_ESSAI },
      ...x,
    },
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
  date: '2026-10-10',
  metier: 'essai',
  statut: 'à faire',
}

/** Un dossier client d'essai qui porte une mission ; rend le chemin du fichier. */
export function clientAvecMission(mission: Mission = MISSION_ESSAI): {
  dossier: string
  fichier: string
} {
  const dossier = dossierEssai()
  const d = join(dossier, DOSSIER_MISSIONS, mission.date)
  mkdirSync(d, { recursive: true })
  const fichier = join(d, `${mission.id}.yaml`)
  writeFileSync(fichier, stringify(mission))
  return { dossier, fichier }
}

/**
 * Un dossier client d'essai dont le patron a commandé le geste de
 * `liberer_un_jour` le 2026-10-10 (une demande nouvelle, l'échappée du
 * dossier d'essai) : la mission écrite par `commanderMission` ; rend son chemin.
 */
export function clientAvecCommande(): { dossier: string; fichier: string } {
  const intention = 'liberer_un_jour'
  const dossier = dossierEssai()
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    s.journal.ecrire(
      [
        {
          type: TYPE_CONSIGNE,
          client: CLIENT_ESSAI,
          objet: 'C-11',
          issue: 'nouvelle',
          motif: 'Libère Rosalie mardi.',
          donnees: {
            identite: { role: 'patron' },
            demande: { sorte: 'nouvelle', intention, resume: 'libérer Rosalie mardi' },
          },
        },
      ],
      '2026-10-10T11:00:00Z',
    )
    const le = Temporal.ZonedDateTime.from(`2026-10-10T15:00[${FUSEAU}]`)
    commanderMission(METIER_ESSAI, s, dossier, intention, { role: 'patron' }, le)
  } finally {
    METIER_ESSAI.fermer(s)
  }
  return { dossier, fichier: join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${intention}.yaml`) }
}

/** Un geste nouveau, ses trois cas et son test : ce qu'une implémentation verte écrit. */
export function gesteVert(id = 'simuler_absence_code'): Record<string, string> {
  return {
    'metiers/essai/code/src/simulation.ts': `export const ${id.toUpperCase()} = '${id}'\n`,
    'metiers/essai/code/src/simulation.test.ts': `import { it } from 'vitest'\nit('simule', () => {})\n`,
    [fichierConsignes(MISSION_ESSAI.metier)]: `${CONSIGNES_ESSAI}${[1, 2, 3]
      .map(
        (n) =>
          `  - { id: S-${n}, role: patron, consigne: "et si ${n}", attendu: { sorte: action, action: ${id} } }\n`,
      )
      .join('')}`,
  }
}
