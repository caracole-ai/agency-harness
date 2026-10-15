import { spawn } from 'node:child_process'
import { z } from 'zod'
import { type Agence, type Executer, executerSync, preflight } from '../agence/config'
import { VARIABLE_CLE_SIGNATURE } from '../livraison/version'
import type { Effort, UsageModele } from '../modele/modele'

// Le binaire `claude` en mode non interactif (PLAN-RONDE.md § 6.2, § 0.a) :
// le préflight de l'abonnement, la ligne de commande, un délai mural de la
// config, le JSON lu par un schéma minimal. Le chantier s'en sert, et la
// conversation sous l'abonnement (sortie structurée `--json-schema`). Le coût
// est celui que le binaire rapporte : une estimation, jamais une mesure.

export interface LancementClaude {
  modele: string
  effort: Effort
  /** Le message, passé sur l'entrée standard. */
  prompt: string
  /** Remplace le système de Claude Code (le sien, rien d'autre). */
  systeme?: string
  /** Un fichier ajouté au système de Claude Code (le chantier : `methode/chantier.md`). */
  systemeAjouteFichier?: string
  /** Les outils permis ; vide : aucun (`--tools ""`). */
  outils: string[]
  permission?: string
  toursMax?: number
  budgetUsd?: number
  cwd: string
  /** Une sortie structurée à ce schéma JSON ; elle revient dans `sortie`. */
  schemaJson?: unknown
  delaiMs: number
  /**
   * Les réglages chargés ; dans les deux cas, ni serveur MCP ni session
   * gardée. `aucun` : ni réglages, ni hooks, ni `CLAUDE.md` ; ce que le modèle
   * lit est ce qu'on lui donne (la ronde, R2). `projet` : ceux de l'arbre
   * seulement, son `CLAUDE.md` compris, jamais ceux de l'utilisateur (ni ses
   * hooks ni son `CLAUDE.md`) : le chantier (§ 4.2). Absent : ceux du binaire.
   */
  reglages?: 'aucun' | 'projet'
}

export interface IssueClaude {
  ok: boolean
  /** `result` : le texte final, ou le message d'échec. */
  texte: string
  /** `structured_output`, quand un schéma a été donné. */
  sortie?: unknown
  /** `total_cost_usd` : estimé par le binaire. */
  cout: number
  /** `usage` : les tokens comptés par le binaire, quand il les rend. */
  usage?: UsageModele
  tours: number
  /** `success`, `error_max_turns`, `error_max_budget_usd`… */
  sousType?: string
  /** Pourquoi `ok` est faux. */
  raison?: string
  dureeMs: number
}

/** Ce que le JSON de `claude -p --output-format json` doit porter, au minimum (§ 4.2). */
const SortieClaude = z.looseObject({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  total_cost_usd: z.number().nonnegative(),
  num_turns: z.number().int().nonnegative(),
  usage: z
    .looseObject({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      cache_creation_input_tokens: z.number().int().nonnegative().optional(),
      cache_read_input_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

/** Ce qu'un enfant ne reçoit jamais : la clé de signature de l'agence et l'agent SSH qui pourrait la porter. */
const RETENUES = new Set([VARIABLE_CLE_SIGNATURE, 'SSH_AUTH_SOCK'])

/**
 * L'environnement d'un processus enfant : celui donné, sans les variables
 * `npm_*` du script qui tourne (`pnpm -s chantier` passerait son
 * `npm_config_loglevel=silent` au `pnpm check` du modèle et du code, qui
 * sortirait en échec sans rien dire : vu le 2026-10-11), sans la clé de
 * signature de l'agence ni l'agent SSH (PLAN-LIVRAISON.md § 0.4). Cela ne
 * suffit pas contre du code écrit par le modèle : il tourne sous le même
 * utilisateur et peut lire le fichier de la clé (ouvert, PLAN-LIVRAISON.md
 * lot 2).
 */
export const envEnfant = (env: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(sansNpm(env)).filter(([k]) => !RETENUES.has(k)))

/** L'environnement sans les variables `npm_*` du script qui tourne : pour un processus du harnais lui-même (l'interface, le rattrapage d'un client, qui garde son agent SSH pour ses clés de déploiement). */
export const sansNpm = (env: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(env).filter(([k]) => !/^npm_/i.test(k)))

/** Lance le binaire avec ses arguments et son entrée ; rend code, sorties, ou `delai` si le délai mural a tué le processus. */
export type Lancer = (
  binaire: string,
  args: string[],
  entree: string,
  cwd: string,
  delaiMs: number,
  env: Record<string, string | undefined>,
) => Promise<{ code: number | null; sortie: string; erreur: string; delai: boolean }>

export const lancerProcessus: Lancer = (binaire, args, entree, cwd, delaiMs, env) =>
  new Promise((resolve) => {
    const enfant = spawn(binaire, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let sortie = ''
    let erreur = ''
    let delai = false
    const minuterie = setTimeout(() => {
      delai = true
      enfant.kill('SIGTERM')
    }, delaiMs)
    enfant.stdout.on('data', (d: Buffer) => {
      sortie += d.toString()
    })
    enfant.stderr.on('data', (d: Buffer) => {
      erreur += d.toString()
    })
    enfant.on('error', (e) => {
      clearTimeout(minuterie)
      resolve({ code: null, sortie, erreur: e.message, delai })
    })
    enfant.on('close', (code) => {
      clearTimeout(minuterie)
      resolve({ code, sortie, erreur, delai })
    })
    enfant.stdin.end(entree)
  })

/** La ligne de commande (§ 4.2) ; le prompt part sur l'entrée standard. */
export function argumentsClaude(l: LancementClaude): string[] {
  return [
    '-p',
    '--output-format',
    'json',
    '--model',
    l.modele,
    '--effort',
    l.effort,
    // `--tools` prend des noms d'outils ; `--allowedTools` les règles (« Bash(pnpm check) »).
    '--tools',
    [...new Set(l.outils.map((o) => o.replace(/\(.*$/, '')))].join(','),
    ...(l.outils.length > 0 ? ['--allowedTools', ...l.outils] : []),
    ...(l.systeme !== undefined ? ['--system-prompt', l.systeme] : []),
    ...(l.systemeAjouteFichier !== undefined
      ? ['--append-system-prompt-file', l.systemeAjouteFichier]
      : []),
    ...(l.permission !== undefined ? ['--permission-mode', l.permission] : []),
    ...(l.toursMax !== undefined ? ['--max-turns', String(l.toursMax)] : []),
    ...(l.budgetUsd !== undefined ? ['--max-budget-usd', String(l.budgetUsd)] : []),
    ...(l.schemaJson !== undefined ? ['--json-schema', JSON.stringify(l.schemaJson)] : []),
    ...(l.reglages !== undefined
      ? [
          '--setting-sources',
          l.reglages === 'projet' ? 'project' : '',
          '--strict-mcp-config',
          '--no-session-persistence',
        ]
      : []),
  ]
}

const echec = (raison: string, dureeMs: number, extra: Partial<IssueClaude> = {}): IssueClaude => ({
  ok: false,
  texte: '',
  cout: 0,
  tours: 0,
  raison,
  dureeMs,
  ...extra,
})

/**
 * Le préflight (§ 0.a), puis un lancement. Un code de sortie non nul, un
 * `is_error`, un sous-type autre que `success`, une sortie structurée absente
 * quand un schéma a été donné : `ok` faux, avec la raison (un échec interne
 * est imprimé comme résultat : on lit les deux). Le coût rapporté est gardé
 * même en échec.
 */
export async function lancerClaude(
  l: LancementClaude,
  agence: Pick<Agence, 'claude'>,
  env: Record<string, string | undefined>,
  lancer: Lancer = lancerProcessus,
  executer: Executer = executerSync,
): Promise<IssueClaude> {
  preflight('claude', agence, env, executer)
  const debut = Date.now()
  const r = await lancer(
    agence.claude.binaire,
    argumentsClaude(l),
    l.prompt,
    l.cwd,
    l.delaiMs,
    envEnfant(env),
  )
  const dureeMs = Date.now() - debut
  if (r.delai) return echec(`délai mural dépassé (${Math.round(l.delaiMs / 1000)} s)`, dureeMs)
  let json: z.infer<typeof SortieClaude> | undefined
  try {
    json = SortieClaude.parse(JSON.parse(r.sortie))
  } catch {
    json = undefined
  }
  if (!json) {
    const detail = (r.erreur || r.sortie).trim().slice(0, 300)
    return echec(
      `sortie du binaire illisible (code ${r.code ?? '?'})${detail ? ` : ${detail}` : ''}`,
      dureeMs,
    )
  }
  const issue = {
    texte: json.result ?? '',
    cout: json.total_cost_usd,
    tours: json.num_turns,
    sousType: json.subtype,
    dureeMs,
    ...(json.usage
      ? {
          usage: {
            entree: json.usage.input_tokens,
            sortie: json.usage.output_tokens,
            cacheEcrit: json.usage.cache_creation_input_tokens ?? 0,
            cacheLu: json.usage.cache_read_input_tokens ?? 0,
          },
        }
      : {}),
    ...(json.structured_output !== undefined ? { sortie: json.structured_output } : {}),
  }
  const raison =
    r.code !== 0
      ? `code de sortie ${r.code ?? '?'}`
      : json.is_error
        ? `erreur rapportée par le binaire (${json.subtype})`
        : json.subtype !== 'success'
          ? json.subtype
          : l.schemaJson !== undefined && json.structured_output === undefined
            ? 'sortie structurée absente'
            : undefined
  return raison === undefined ? { ok: true, ...issue } : { ok: false, raison, ...issue }
}
