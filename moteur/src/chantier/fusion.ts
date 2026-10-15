import { existsSync, readFileSync } from 'node:fs'
import type { Designable } from '../conversation/designation'
import {
  BRANCHE_PRINCIPALE,
  brancheExiste,
  type Commande,
  DISTANT,
  git,
  refBranche,
  verifierDepot,
} from './arbre'
import { DOSSIER_MEMOIRE, interdits } from './memoire'

// La fusion automatique et son retrait (PLAN-GENERAL.md G1, G2, G3 ;
// PLAN-RONDE.md R5 (8), R11). Le seul module qui fusionne et qui pousse, et
// seulement dans le clone de la nuit (`verifierDepot` : jamais l'arbre
// courant, jamais un arbre sale, toujours sur `main`). Huit conditions, toutes
// mesurées en code, aucune par un prompt ; une seule rouge et rien n'est
// fusionné : la branche reste, la mémoire dit pourquoi. La mémoire se commet
// toujours à part, après la fusion : `git revert -m 1` de la fusion ne la
// défait jamais. Le retrait défait la fusion, pousse, et la mémoire garde le
// motif et les intentions (le même travail n'est jamais refait).

/** Les huit conditions de G1, dans l'ordre du plan. */
export const CONDITIONS = {
  chemins: 'le diff est dans les chemins autorisés',
  tests: "aucun test existant n'a disparu",
  check: 'pnpm check vert, rejoué par le code',
  honnetete: 'trois cas de traduction par geste nouveau, traduction au seuil',
  relecture: 'aucun bloquant après au plus une reprise',
  bornes: 'tours et budget dans les bornes',
  lignes: 'le diff ne dépasse pas lignes_max',
  memoire: "l'entrée de mémoire existe et ne porte aucun nom",
} as const
export type IdCondition = keyof typeof CONDITIONS
export const IDS_CONDITIONS = Object.keys(CONDITIONS) as IdCondition[]

export interface Condition {
  id: IdCondition
  ok: boolean
  /** La mesure, en mots : ce qui a été compté ou lancé, et ce qui en est sorti. */
  mesure: string
}

/** Le préfixe des étiquettes posées sur une fusion (G1). */
export const refEtiquette = (id: string) => `refs/tags/chantier/${id}`

export type IssueFusion =
  | { sorte: 'fusionne'; fusion: string; memoire: string }
  | { sorte: 'refuse'; rouges: Condition[]; memoire: string }
  | { sorte: 'echec'; raison: string }

/** Une ligne d'issue, pour la mémoire, le dossier et le journal. */
export const raisonRefus = (rouges: Condition[]) =>
  `refusé : ${rouges.map((r) => `${CONDITIONS[r.id]} (${r.mesure})`).join(' ; ')}`

/**
 * Le clone de la nuit remis à `avant` après un échec en route (fusion,
 * retrait, push refusé) : opération abandonnée, `main` revenu, la mémoire non
 * commise retirée, l'étiquette posée ôtée. Sans quoi le clone resterait sale
 * et toutes les nuits suivantes s'arrêteraient (R11). Le clone seulement :
 * l'appelant l'a vérifié.
 */
function restaurer(c: Commande, depot: string, avant: string, etiquette?: string): void {
  c(depot, 'git', ['merge', '--abort'])
  c(depot, 'git', ['revert', '--abort'])
  git(c, depot, ['reset', '--hard', avant])
  git(c, depot, ['clean', '-f', '-q', '--', DOSSIER_MEMOIRE])
  if (etiquette) c(depot, 'git', ['tag', '-d', etiquette])
}

/** `git add memoire/`, un commit s'il y a lieu, rend true s'il y en a eu un. */
function commettreMemoire(c: Commande, depot: string, message: string): boolean {
  git(c, depot, ['add', '--', DOSSIER_MEMOIRE])
  if (c(depot, 'git', ['diff', '--cached', '--quiet']).code === 0) return false
  git(c, depot, ['commit', '-m', message])
  return true
}

/**
 * Conclut un chantier dans le clone de la nuit. `conditions` : les sept
 * premières, mesurées par le chantier ; la huitième se mesure ici, sur
 * l'entrée de mémoire écrite par `ecrireEntree`. Huit vertes : `git merge
 * --no-ff` de `chantier/<id>` dans `main`, l'étiquette `chantier/<id>` sur la
 * fusion, la mémoire commise à part, `git push` de `main` et de l'étiquette.
 * Sinon : rien de fusionné, la mémoire du refus commise et poussée.
 */
export function conclure(o: {
  commande: Commande
  depot: string
  racineCourante: string
  id: string
  titre: string
  conditions: Condition[]
  /** Écrit l'entrée de mémoire (dans `depot`) avec cette sorte et cette issue ; rend son chemin, lève si elle porterait un nom. */
  ecrireEntree: (sorte: 'fusion' | 'refus', issue: string) => string
  personnes: Designable[]
}): IssueFusion {
  const c = o.commande
  verifierDepot(c, o.depot, o.racineCourante)
  if (!brancheExiste(c, o.depot, o.id)) {
    return { sorte: 'echec', raison: `branche ${refBranche(o.id)} absente du clone` }
  }
  const sept = IDS_CONDITIONS.filter((id) => id !== 'memoire').map(
    (id): Condition =>
      o.conditions.find((x) => x.id === id) ?? { id, ok: false, mesure: 'non mesurée' },
  )
  const rouges = sept.filter((x) => !x.ok)

  const avant = git(c, o.depot, ['rev-parse', 'HEAD']).trim()
  const refuser = (toutes: Condition[]): IssueFusion => {
    const issue = raisonRefus(toutes.filter((x) => !x.ok))
    try {
      const memoire = o.ecrireEntree('refus', issue)
      commettreMemoire(c, o.depot, `Mémoire : chantier ${o.id} refusé`)
      git(c, o.depot, ['push', DISTANT, BRANCHE_PRINCIPALE])
      return { sorte: 'refuse', rouges: toutes.filter((x) => !x.ok), memoire }
    } catch (erreur) {
      restaurer(c, o.depot, avant)
      throw erreur
    }
  }
  if (rouges.length > 0) {
    return refuser([...sept, { id: 'memoire', ok: true, mesure: 'non mesurée (refus)' }])
  }

  // Condition 8 : l'entrée existe et ne porte aucun nom ; écrite avant la fusion, commise après.
  let memoire: string
  try {
    memoire = o.ecrireEntree('fusion', 'fusionné')
  } catch (erreur) {
    restaurer(c, o.depot, avant)
    return refuser([
      ...sept,
      { id: 'memoire', ok: false, mesure: (erreur as Error).message.slice(0, 200) },
    ])
  }
  const propre =
    existsSync(memoire) && interdits(readFileSync(memoire, 'utf8'), o.personnes).length === 0
  if (!propre) {
    restaurer(c, o.depot, avant)
    return refuser([
      ...sept,
      { id: 'memoire', ok: false, mesure: "l'entrée manque ou porte un nom" },
    ])
  }

  const message = `Chantier ${o.id} : ${o.titre}\n\nFusion automatique (PLAN-GENERAL.md G1) : huit conditions vertes.`
  const fusion = c(o.depot, 'git', ['merge', '--no-ff', '-m', message, refBranche(o.id)])
  if (fusion.code !== 0) {
    restaurer(c, o.depot, avant)
    return {
      sorte: 'echec',
      raison: `fusion impossible : ${(fusion.erreur || fusion.sortie).trim().slice(0, 300)}`,
    }
  }
  const etiquette = refEtiquette(o.id).replace('refs/tags/', '')
  try {
    const sha = git(c, o.depot, ['rev-parse', 'HEAD']).trim()
    git(c, o.depot, ['tag', etiquette, sha])
    commettreMemoire(c, o.depot, `Mémoire : chantier ${o.id} fusionné`)
    git(c, o.depot, ['push', DISTANT, BRANCHE_PRINCIPALE, refEtiquette(o.id)])
    return { sorte: 'fusionne', fusion: sha, memoire }
  } catch (erreur) {
    restaurer(c, o.depot, avant, etiquette)
    return { sorte: 'echec', raison: `fusion défaite : ${(erreur as Error).message.slice(0, 300)}` }
  }
}

/**
 * Le retrait (G2) : `git revert -m 1` de la fusion étiquetée `chantier/<id>`
 * sur `main` du clone, la ligne `retrait` de la mémoire (écrite par
 * `ecrireRetrait`) dans le même commit, puis `git push`. Lève si la mission
 * n'a pas été fusionnée, ou si elle a déjà été retirée.
 */
export function retirerFusion(o: {
  commande: Commande
  depot: string
  racineCourante: string
  id: string
  motif: string
  dejaRetiree: boolean
  ecrireRetrait: () => void
}): { revert: string } {
  const c = o.commande
  verifierDepot(c, o.depot, o.racineCourante)
  if (o.dejaRetiree) throw new Error(`${o.id} : déjà retirée (mémoire)`)
  const etiquette = c(o.depot, 'git', [
    'rev-parse',
    '--verify',
    '--quiet',
    `${refEtiquette(o.id)}^{commit}`,
  ])
  if (etiquette.code !== 0) throw new Error(`${o.id} : aucune fusion à retirer (pas d'étiquette)`)
  const sha = etiquette.sortie.trim()
  const parents = git(c, o.depot, ['rev-list', '--parents', '-n', '1', sha]).trim().split(' ')
  if (parents.length !== 3) throw new Error(`${o.id} : l'étiquette ne pointe pas sur une fusion`)
  if (c(o.depot, 'git', ['merge-base', '--is-ancestor', sha, BRANCHE_PRINCIPALE]).code !== 0) {
    throw new Error(`${o.id} : la fusion n'est pas sur ${BRANCHE_PRINCIPALE}`)
  }
  const avant = git(c, o.depot, ['rev-parse', 'HEAD']).trim()
  try {
    git(c, o.depot, ['revert', '-m', '1', '--no-commit', sha])
    o.ecrireRetrait()
    git(c, o.depot, ['add', '--', DOSSIER_MEMOIRE])
    git(c, o.depot, [
      'commit',
      '-m',
      `Chantier ${o.id} : retiré\n\nRetrait (PLAN-GENERAL.md G2) : git revert -m 1 de ${sha.slice(0, 12)}. Motif : ${o.motif}`,
    ])
    git(c, o.depot, ['push', DISTANT, BRANCHE_PRINCIPALE])
    return { revert: git(c, o.depot, ['rev-parse', 'HEAD']).trim() }
  } catch (erreur) {
    // Un conflit, un push refusé : le clone revient d'où il partait, rien n'est retiré.
    restaurer(c, o.depot, avant)
    throw new Error(`${o.id} : retrait défait (${(erreur as Error).message.slice(0, 300)})`)
  }
}

/** La mémoire écrite hors d'un chantier (la ligne de la nuit), commise seule et poussée ; rend true s'il y avait à commettre. */
export function publierMemoire(o: {
  commande: Commande
  depot: string
  racineCourante: string
  message: string
}): boolean {
  verifierDepot(o.commande, o.depot, o.racineCourante, { saufMemoire: true })
  if (!commettreMemoire(o.commande, o.depot, o.message)) return false
  git(o.commande, o.depot, ['push', DISTANT, BRANCHE_PRINCIPALE])
  return true
}
