import { spawn } from 'node:child_process'
import { z } from 'zod'
import { type Agence, type Executer, executerSync, preflight } from '../agence/config'
import type { Effort } from '../modele/modele'

// Le binaire `claude` en mode non interactif (PLAN-RONDE.md § 6.2, § 0.a) :
// le préflight de l'abonnement, la ligne de commande, un délai mural de la
// config, le JSON lu par un schéma minimal. La ronde s'en sert (sortie
// structurée `--json-schema`, aucun outil) ; le chantier (lot 2) aussi. Le coût
// est celui que le binaire rapporte : une estimation, jamais une mesure.

export interface LancementClaude {
  modele: string
  effort: Effort
  /** Le message, passé sur l'entrée standard. */
  prompt: string
  /** Remplace le système de Claude Code (la ronde : le sien, rien d'autre). */
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
   * true : ni réglages (donc ni hooks ni `CLAUDE.md` de l'utilisateur), ni
   * serveur MCP, ni session gardée ; ce que le modèle lit est ce qu'on lui
   * donne. La ronde l'exige (R2).
   */
  isole?: boolean
}

export interface IssueClaude {
  ok: boolean
  /** `result` : le texte final, ou le message d'échec. */
  texte: string
  /** `structured_output`, quand un schéma a été donné. */
  sortie?: unknown
  /** `total_cost_usd` : estimé par le binaire. */
  cout: number
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
})

/** Lance le binaire avec ses arguments et son entrée ; rend code, sorties, ou `delai` si le délai mural a tué le processus. */
export type Lancer = (
  binaire: string,
  args: string[],
  entree: string,
  cwd: string,
  delaiMs: number,
) => Promise<{ code: number | null; sortie: string; erreur: string; delai: boolean }>

export const lancerProcessus: Lancer = (binaire, args, entree, cwd, delaiMs) =>
  new Promise((resolve) => {
    const enfant = spawn(binaire, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
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
    ...(l.isole
      ? ['--setting-sources', '', '--strict-mcp-config', '--no-session-persistence']
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
  const r = await lancer(agence.claude.binaire, argumentsClaude(l), l.prompt, l.cwd, l.delaiMs)
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
