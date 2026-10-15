import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

// Les arbres de travail du chantier (PLAN-LIVRAISON.md L2) : le dépôt de base
// est celui de l'agence (la racine du code qui tourne), qui peut être l'arbre
// d'un humain. Le code n'y fait que `fetch`, `worktree add/remove/prune` et
// `rev-parse` (la fusion pose ses étiquettes et pousse depuis ses arbres) :
// jamais il n'y extrait, ne remet, ne fusionne ni ne nettoie ; son arbre et
// sa branche `main` ne bougent pas. Un chantier part d'`origin/main` frais, dans
// `.claude/worktrees/chantier-<id>` sur la branche `chantier/<id>` ; la fusion
// et le retrait se font dans un arbre détaché sur `origin/main`, jeté après.
// Ce module ne fusionne ni ne pousse jamais : c'est `fusion.ts`, seul.

/** Lance une commande, rend son code et ses sorties ; injectable pour les tests (les commandes émises se capturent). */
export type Commande = (
  cwd: string,
  commande: string,
  args: string[],
  env?: Record<string, string | undefined>,
) => { code: number | null; sortie: string; erreur: string }

export const commandeSync: Commande = (cwd, commande, args, env) => {
  const r = spawnSync(commande, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...(env ? { env } : {}),
  })
  if (r.error) return { code: null, sortie: '', erreur: r.error.message }
  return { code: r.status, sortie: r.stdout, erreur: r.stderr }
}

/** `git <args>` dans `cwd` ; lève avec la sortie d'erreur si le code n'est pas 0. */
export function git(c: Commande, cwd: string, args: string[]): string {
  const r = c(cwd, 'git', args)
  if (r.code !== 0) {
    throw new Error(`git ${args.join(' ')} : ${(r.erreur || r.sortie).trim().slice(0, 500)}`)
  }
  return r.sortie
}

/** La branche principale du distant : là où la fusion pousse. */
export const BRANCHE_PRINCIPALE = 'main'
/** Le dépôt d'où les arbres partent et où la fusion pousse. */
export const DISTANT = 'origin'
/** Le point de départ de tout arbre : `main` du distant, tel que le dernier `fetch` l'a vu. */
export const REF_DISTANTE = `${DISTANT}/${BRANCHE_PRINCIPALE}`
export const branche = (id: string) => `chantier/${id}`
export const refBranche = (id: string) => `refs/heads/${branche(id)}`
/** Les arbres de travail, dans le dépôt de base. */
export const DOSSIER_ARBRES = join('.claude', 'worktrees')
/** L'arbre d'un chantier, ou un arbre détaché nommé (`fusion-<id>`, `retrait-<id>`). */
export const cheminArbre = (racine: string, nom: string) => join(racine, DOSSIER_ARBRES, nom)
const nomChantier = (id: string) => `chantier-${id}`

const reel = (chemin: string) => realpathSync(chemin)

/** Le dossier commun (`.git`) d'un arbre, absolu : deux arbres d'un même dépôt le partagent. */
function dossierCommun(c: Commande, arbre: string): string {
  const d = git(c, arbre, ['rev-parse', '--git-common-dir']).trim()
  return reel(isAbsolute(d) ? d : resolve(arbre, d))
}

/**
 * Le dépôt de base avant tout arbre (L2) : la racine d'un dépôt git, un
 * distant `origin` qui répond (`fetch` de `main` : `origin/main` frais), les
 * arbres disparus oubliés (`worktree prune`). Lève sinon. Rien d'autre n'y
 * est touché : ni son arbre, ni ses branches.
 */
export function verifierBase(c: Commande, racine: string): void {
  if (!existsSync(racine)) throw new Error(`dépôt de base introuvable : ${racine}`)
  const haut = git(c, racine, ['rev-parse', '--show-toplevel']).trim()
  if (reel(haut) !== reel(racine)) {
    throw new Error(`${racine} n'est pas la racine d'un dépôt git (racine : ${haut})`)
  }
  git(c, racine, [
    'fetch',
    '--quiet',
    DISTANT,
    `+refs/heads/${BRANCHE_PRINCIPALE}:refs/remotes/${REF_DISTANTE}`,
  ])
  git(c, racine, ['worktree', 'prune'])
}

export const brancheExiste = (c: Commande, racine: string, id: string): boolean =>
  c(racine, 'git', ['rev-parse', '--verify', '--quiet', refBranche(id)]).code === 0

/** Ce dossier de la base (relatif) ne se voit pas dans `git status` : une exclusion locale, idempotente (`.git/info/exclude`). */
export function exclure(c: Commande, racine: string, dossier: string): void {
  const info = join(dossierCommun(c, racine), 'info')
  const exclude = join(info, 'exclude')
  const ligne = `/${dossier}/`
  mkdirSync(info, { recursive: true })
  const actuel = existsSync(exclude) ? readFileSync(exclude, 'utf8') : ''
  if (!actuel.split('\n').includes(ligne)) {
    appendFileSync(exclude, `${actuel.endsWith('\n') || actuel === '' ? '' : '\n'}${ligne}\n`)
  }
}

/** Les arbres de travail ne se voient pas dans `git status` de la base. */
const exclureArbres = (c: Commande, racine: string) => exclure(c, racine, DOSSIER_ARBRES)

/** `branche` : l'arbre est déjà sur `chantier/<id>` (`refaire`) ; sinon il est détaché, et `brancher` crée la branche une fois le chantier décidé. */
export type ArbreOuvert =
  | { sorte: 'ouvert'; chemin: string; branche: boolean }
  | { sorte: 'deja_tentee' }

/**
 * `git worktree add --detach .claude/worktrees/chantier-<id> origin/main`,
 * après `verifierBase` : la mémoire d'`origin/main` s'y lit avant que la
 * branche existe (une mission écartée ne laisse rien). Une branche
 * `chantier/<id>` qui existe : la mission a déjà été tentée, rien n'est
 * fait, sauf `refaire`, qui supprime l'arbre (pas la branche) et le rouvre
 * sur la branche telle qu'elle est.
 */
export function ouvrirArbre(c: Commande, racine: string, id: string, refaire = false): ArbreOuvert {
  exclureArbres(c, racine)
  const chemin = cheminArbre(racine, nomChantier(id))
  const existe = brancheExiste(c, racine, id)
  if (existe && !refaire) return { sorte: 'deja_tentee' }
  retirerArbre(c, racine, chemin)
  git(
    c,
    racine,
    existe
      ? ['worktree', 'add', chemin, branche(id)]
      : ['worktree', 'add', '--detach', chemin, REF_DISTANTE],
  )
  return { sorte: 'ouvert', chemin, branche: existe }
}

/** Le chantier décidé : la branche `chantier/<id>` créée dans son arbre, là où il est (`origin/main`). */
export function brancher(c: Commande, arbre: string, id: string): void {
  git(c, arbre, ['switch', '--quiet', '--no-track', '--create', branche(id)])
}

/** Un arbre détaché sur `origin/main` (`.claude/worktrees/<nom>`), après `verifierBase` : la fusion et le retrait s'y font, sans qu'aucune branche locale ne bouge. */
export function ouvrirArbreDetache(c: Commande, racine: string, nom: string): string {
  exclureArbres(c, racine)
  const chemin = cheminArbre(racine, nom)
  retirerArbre(c, racine, chemin)
  git(c, racine, ['worktree', 'add', '--detach', chemin, REF_DISTANTE])
  return chemin
}

/** Retire un arbre de travail s'il est là ; une branche qu'il portait reste. */
export function retirerArbre(c: Commande, racine: string, chemin: string): void {
  if (existsSync(chemin)) git(c, racine, ['worktree', 'remove', '--force', chemin])
  git(c, racine, ['worktree', 'prune'])
}

/** Retire l'arbre d'un chantier ; la branche reste (elle porte le travail, fusionné ou non). */
export const fermerArbre = (c: Commande, racine: string, id: string): void =>
  retirerArbre(c, racine, cheminArbre(racine, nomChantier(id)))

/**
 * Tout ce que l'arbre porte de nouveau, en un commit sur sa branche, avec la
 * ligne du modèle qui l'a écrit ; rend false s'il n'y avait rien à commettre.
 */
export function commettre(c: Commande, arbre: string, message: string, coauteur: string): boolean {
  git(c, arbre, ['add', '-A'])
  if (c(arbre, 'git', ['diff', '--cached', '--quiet']).code === 0) return false
  git(c, arbre, ['commit', '-m', `${message}\n\nCo-Authored-By: ${coauteur}`])
  return true
}
