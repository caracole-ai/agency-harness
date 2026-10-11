import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

// L'arbre de travail d'un chantier (PLAN-RONDE.md § 6.2, R11 ; PLAN-GENERAL.md
// G3) : le clone de la nuit vérifié (jamais l'arbre courant, jamais un arbre
// sale), remis à `origin/main` au début d'une nuit, un `git worktree` par
// mission sur la branche `chantier/<id>`, ses dépendances, un commit signé du
// modèle. Ce module ne fusionne ni ne pousse jamais : c'est `fusion.ts`, seul.

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

/** La branche principale du clone de la nuit, celle où la fusion se fait. */
export const BRANCHE_PRINCIPALE = 'main'
/** Le dépôt d'où le clone se remet à jour et où la fusion pousse. */
export const DISTANT = 'origin'
export const branche = (id: string) => `chantier/${id}`
export const refBranche = (id: string) => `refs/heads/${branche(id)}`
/** Les arbres de chantier, dans le clone de la nuit (R5). */
export const DOSSIER_ARBRES = join('.claude', 'worktrees')
export const cheminArbre = (depot: string, id: string) =>
  join(depot, DOSSIER_ARBRES, `chantier-${id}`)

const reel = (chemin: string) => realpathSync(chemin)

/** Le dossier commun (`.git`) d'un arbre, absolu : deux arbres d'un même dépôt le partagent. */
function dossierCommun(c: Commande, arbre: string): string {
  const d = git(c, arbre, ['rev-parse', '--git-common-dir']).trim()
  return reel(isAbsolute(d) ? d : resolve(arbre, d))
}

/**
 * Le clone de la nuit, tel que R11 l'exige, avant toute écriture : un dépôt
 * git à sa racine, qui n'est ni l'arbre courant ni un arbre du même dépôt,
 * sur `main`, et propre (`git status` vide ; `saufMemoire` : seul `memoire/`
 * peut avoir changé, la mémoire qu'on s'apprête à commettre). Lève sinon.
 */
export function verifierDepot(
  c: Commande,
  depot: string,
  racineCourante: string,
  options: { saufMemoire?: boolean } = {},
): void {
  if (!existsSync(depot)) throw new Error(`clone de la nuit introuvable : ${depot}`)
  const haut = git(c, depot, ['rev-parse', '--show-toplevel']).trim()
  if (reel(haut) !== reel(depot)) {
    throw new Error(`${depot} n'est pas la racine d'un dépôt git (racine : ${haut})`)
  }
  if (dossierCommun(c, depot) === dossierCommun(c, racineCourante)) {
    throw new Error(
      `${depot} est l'arbre courant ou un arbre du même dépôt : la nuit a son propre clone (G3)`,
    )
  }
  const tete = git(c, depot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
  if (tete !== BRANCHE_PRINCIPALE) {
    throw new Error(`le clone de la nuit est sur ${tete}, pas sur ${BRANCHE_PRINCIPALE}`)
  }
  const sales = git(c, depot, ['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .filter((l) => !(options.saufMemoire && l.slice(3).startsWith('memoire/')))
  if (sales.length > 0) {
    throw new Error(
      `le clone de la nuit n'est pas propre (${sales.length} fichier(s), dont ${sales[0]?.slice(3)}) : rien n'est fait`,
    )
  }
}

/** Le début d'une nuit (R11) : le clone vérifié, puis `fetch` et remis à `origin/main`, ce clone seulement. */
export function remettreAOrigine(c: Commande, depot: string, racineCourante: string): string {
  verifierDepot(c, depot, racineCourante)
  git(c, depot, ['fetch', DISTANT])
  git(c, depot, ['reset', '--hard', `${DISTANT}/${BRANCHE_PRINCIPALE}`])
  return git(c, depot, ['rev-parse', 'HEAD']).trim()
}

export const brancheExiste = (c: Commande, depot: string, id: string): boolean =>
  c(depot, 'git', ['rev-parse', '--verify', '--quiet', refBranche(id)]).code === 0

/** Les arbres de chantier ne se voient pas dans `git status` du clone : une exclusion locale, idempotente. */
function exclureArbres(c: Commande, depot: string): void {
  const info = join(dossierCommun(c, depot), 'info')
  const exclude = join(info, 'exclude')
  const ligne = `/${DOSSIER_ARBRES}/`
  mkdirSync(info, { recursive: true })
  const actuel = existsSync(exclude) ? readFileSync(exclude, 'utf8') : ''
  if (!actuel.split('\n').includes(ligne)) {
    appendFileSync(exclude, `${actuel.endsWith('\n') || actuel === '' ? '' : '\n'}${ligne}\n`)
  }
}

export type ArbreOuvert = { sorte: 'ouvert'; chemin: string } | { sorte: 'deja_tentee' }

/**
 * `git worktree add <depot>/.claude/worktrees/chantier-<id> -b chantier/<id>
 * main`. Une branche qui existe : la mission a déjà été tentée, rien n'est
 * fait, sauf `refaire`, qui supprime l'arbre (pas la branche) et le rouvre
 * sur la branche telle qu'elle est.
 */
export function ouvrirArbre(c: Commande, depot: string, id: string, refaire = false): ArbreOuvert {
  exclureArbres(c, depot)
  const chemin = cheminArbre(depot, id)
  const existe = brancheExiste(c, depot, id)
  if (existe && !refaire) return { sorte: 'deja_tentee' }
  if (existsSync(chemin)) git(c, depot, ['worktree', 'remove', '--force', chemin])
  git(c, depot, ['worktree', 'prune'])
  git(
    c,
    depot,
    existe
      ? ['worktree', 'add', chemin, branche(id)]
      : ['worktree', 'add', chemin, '-b', branche(id), BRANCHE_PRINCIPALE],
  )
  return { sorte: 'ouvert', chemin }
}

/** Retire l'arbre de travail ; la branche reste (elle porte le travail, fusionné ou non). */
export function fermerArbre(c: Commande, depot: string, id: string): void {
  const chemin = cheminArbre(depot, id)
  if (existsSync(chemin)) git(c, depot, ['worktree', 'remove', '--force', chemin])
  git(c, depot, ['worktree', 'prune'])
}

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
