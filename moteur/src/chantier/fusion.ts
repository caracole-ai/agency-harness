import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { Designable } from '../conversation/designation'
import {
  BRANCHE_PRINCIPALE,
  brancheExiste,
  type Commande,
  DISTANT,
  git,
  ouvrirArbreDetache,
  REF_DISTANTE,
  refBranche,
  retirerArbre,
  verifierBase,
} from './arbre'
import { DOSSIER_MEMOIRE, interdits, missionsRetirees } from './memoire'

// La fusion automatique et son retrait (PLAN-GENERAL.md G1, G2 ;
// PLAN-LIVRAISON.md L2). Le seul module qui fusionne et qui pousse, et
// seulement dans un arbre détaché sur `origin/main` frais, jeté après : ni
// `main` du dépôt de base ni l'arbre d'un humain ne bougent, le push vise
// `main` du distant. Huit conditions, toutes mesurées en code, aucune par un
// prompt ; une seule rouge et rien n'est fusionné : la branche reste, la
// mémoire dit pourquoi. La mémoire se commet toujours à part, après la
// fusion : `git revert -m 1` de la fusion ne la défait jamais. Un push refusé
// (quelqu'un a poussé entre-temps) : une reprise depuis un `origin/main`
// refetché, pas deux. Le retrait défait la fusion, pousse, et la mémoire
// garde le motif et les intentions (le même travail n'est jamais refait).

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

/** `memoire` : le chemin de l'entrée dans le dépôt (`memoire/chantiers/<date>-<id>.md`). */
export type IssueFusion =
  | { sorte: 'fusionne'; fusion: string; memoire: string }
  | { sorte: 'refuse'; rouges: Condition[]; memoire: string }
  | { sorte: 'echec'; raison: string }

/** Une ligne d'issue, pour la mémoire, le dossier et le journal. */
export const raisonRefus = (rouges: Condition[]) =>
  `refusé : ${rouges.map((r) => `${CONDITIONS[r.id]} (${r.mesure})`).join(' ; ')}`

/** `git add memoire/` dans l'arbre, un commit s'il y a lieu, rend true s'il y en a eu un. */
function commettreMemoire(c: Commande, arbre: string, message: string): boolean {
  git(c, arbre, ['add', '--', DOSSIER_MEMOIRE])
  if (c(arbre, 'git', ['diff', '--cached', '--quiet']).code === 0) return false
  git(c, arbre, ['commit', '-m', message])
  return true
}

/** La mémoire de l'arbre revenue à `origin/main` : une entrée à moitié écrite ne part pas avec le refus. */
function oublierMemoire(c: Commande, arbre: string): void {
  git(c, arbre, ['checkout', '-q', 'HEAD', '--', DOSSIER_MEMOIRE])
  git(c, arbre, ['clean', '-f', '-d', '-q', '--', DOSSIER_MEMOIRE])
}

/**
 * Pousse HEAD de l'arbre détaché sur `main` du distant, avec ces étiquettes,
 * tout ou rien (`--atomic` : une étiquette ne part jamais sans sa fusion) ;
 * rend l'erreur si le distant refuse.
 */
function pousser(c: Commande, arbre: string, etiquettes: string[]): string | undefined {
  const r = c(arbre, 'git', [
    'push',
    '--atomic',
    '--quiet',
    DISTANT,
    `HEAD:refs/heads/${BRANCHE_PRINCIPALE}`,
    ...etiquettes,
  ])
  return r.code === 0 ? undefined : (r.erreur || r.sortie).trim().slice(0, 300)
}

/** Une tentative dans un arbre détaché : finie, ou son push refusé par le distant. */
type Tentative<T> = { fini: T } | { pushRefuse: string }

/**
 * `travail` dans un arbre détaché sur `origin/main` frais
 * (`.claude/worktrees/<nom>`, après `verifierBase`) ; un push refusé : une
 * reprise depuis un `origin/main` refetché, puis `enEchec`. L'arbre est
 * retiré dans tous les cas : il n'y a jamais rien à restaurer.
 */
function avecReprise<T>(
  c: Commande,
  racine: string,
  nom: string,
  travail: (arbre: string) => Tentative<T>,
  enEchec: (raison: string) => T,
): T {
  let raison = ''
  for (let essai = 0; essai < 2; essai++) {
    verifierBase(c, racine)
    const arbre = ouvrirArbreDetache(c, racine, nom)
    try {
      const r = travail(arbre)
      if ('fini' in r) return r.fini
      raison = r.pushRefuse
    } finally {
      retirerArbre(c, racine, arbre)
    }
  }
  return enEchec(raison)
}

/**
 * Conclut un chantier : dans un arbre détaché sur `origin/main`.
 * `conditions` : les sept premières, mesurées par le chantier ; la huitième
 * se mesure ici, sur l'entrée de mémoire écrite par `ecrireEntree` dans cet
 * arbre. Huit vertes : `git merge --no-ff` de `chantier/<id>`, l'étiquette
 * `chantier/<id>` sur la fusion, la mémoire commise à part, `git push` sur
 * `main` du distant avec l'étiquette. Sinon : rien de fusionné, la mémoire
 * du refus commise et poussée.
 */
export function conclure(o: {
  commande: Commande
  /** Le dépôt de base (L2). */
  racine: string
  id: string
  titre: string
  conditions: Condition[]
  /** Écrit l'entrée de mémoire dans cet arbre avec cette sorte et cette issue ; rend son chemin, lève si elle porterait un nom. */
  ecrireEntree: (arbre: string, sorte: 'fusion' | 'refus', issue: string) => string
  personnes: Designable[]
}): IssueFusion {
  const c = o.commande
  if (!brancheExiste(c, o.racine, o.id)) {
    return { sorte: 'echec', raison: `branche ${refBranche(o.id)} absente` }
  }
  const sept = IDS_CONDITIONS.filter((id) => id !== 'memoire').map(
    (id): Condition =>
      o.conditions.find((x) => x.id === id) ?? { id, ok: false, mesure: 'non mesurée' },
  )
  const rouges = sept.filter((x) => !x.ok)
  const etiquette = refEtiquette(o.id).replace('refs/tags/', '')
  let enRoute = 'fusion défaite'

  const refuser = (arbre: string, toutes: Condition[]): Tentative<IssueFusion> => {
    enRoute = 'mémoire du refus non poussée'
    const rougesToutes = toutes.filter((x) => !x.ok)
    const memoire = o.ecrireEntree(arbre, 'refus', raisonRefus(rougesToutes))
    commettreMemoire(c, arbre, `Mémoire : chantier ${o.id} refusé`)
    const refus = pousser(c, arbre, [])
    return refus === undefined
      ? { fini: { sorte: 'refuse', rouges: rougesToutes, memoire: relative(arbre, memoire) } }
      : { pushRefuse: refus }
  }

  return avecReprise(
    c,
    o.racine,
    `fusion-${o.id}`,
    (arbre): Tentative<IssueFusion> => {
      if (rouges.length > 0) {
        return refuser(arbre, [...sept, { id: 'memoire', ok: true, mesure: 'non mesurée (refus)' }])
      }
      // Condition 8 : l'entrée existe et ne porte aucun nom ; écrite avant la fusion, commise après.
      let memoire: string
      try {
        memoire = o.ecrireEntree(arbre, 'fusion', 'fusionné')
      } catch (erreur) {
        oublierMemoire(c, arbre)
        return refuser(arbre, [
          ...sept,
          { id: 'memoire', ok: false, mesure: (erreur as Error).message.slice(0, 200) },
        ])
      }
      const propre =
        existsSync(memoire) && interdits(readFileSync(memoire, 'utf8'), o.personnes).length === 0
      if (!propre) {
        oublierMemoire(c, arbre)
        return refuser(arbre, [
          ...sept,
          { id: 'memoire', ok: false, mesure: "l'entrée manque ou porte un nom" },
        ])
      }

      enRoute = 'fusion défaite'
      const message = `Chantier ${o.id} : ${o.titre}\n\nFusion automatique (PLAN-GENERAL.md G1) : huit conditions vertes.`
      const fusion = c(arbre, 'git', ['merge', '--no-ff', '-m', message, refBranche(o.id)])
      if (fusion.code !== 0) {
        return {
          fini: {
            sorte: 'echec',
            raison: `fusion impossible : ${(fusion.erreur || fusion.sortie).trim().slice(0, 300)}`,
          },
        }
      }
      try {
        const sha = git(c, arbre, ['rev-parse', 'HEAD']).trim()
        git(c, arbre, ['tag', etiquette, sha])
        commettreMemoire(c, arbre, `Mémoire : chantier ${o.id} fusionné`)
        const refus = pousser(c, arbre, [refEtiquette(o.id)])
        if (refus === undefined) {
          return { fini: { sorte: 'fusionne', fusion: sha, memoire: relative(arbre, memoire) } }
        }
        // L'étiquette n'existe que si la fusion est sur le distant : la reprise la reposera.
        c(arbre, 'git', ['tag', '-d', etiquette])
        return { pushRefuse: refus }
      } catch (erreur) {
        c(arbre, 'git', ['tag', '-d', etiquette])
        return {
          fini: {
            sorte: 'echec',
            raison: `fusion défaite : ${(erreur as Error).message.slice(0, 300)}`,
          },
        }
      }
    },
    (raison) => ({ sorte: 'echec', raison: `${enRoute} : push refusé deux fois (${raison})` }),
  )
}

/**
 * Le retrait (G2), dans un arbre détaché sur `origin/main` : `git revert -m
 * 1` de la fusion étiquetée `chantier/<id>`, la ligne `retrait` de la mémoire
 * (écrite par `ecrireRetrait` dans cet arbre) dans le même commit, puis `git
 * push` sur `main` du distant. Lève si la mission n'a pas été fusionnée, si
 * elle a déjà été retirée (la mémoire d'`origin/main` le dit), ou si le
 * retrait n'a pas pu être poussé : alors rien n'est retiré.
 */
export function retirerFusion(o: {
  commande: Commande
  /** Le dépôt de base (L2). */
  racine: string
  id: string
  motif: string
  ecrireRetrait: (arbre: string) => void
}): { revert: string } {
  const c = o.commande
  return avecReprise(
    c,
    o.racine,
    `retrait-${o.id}`,
    (arbre): Tentative<{ revert: string }> => {
      if (missionsRetirees(arbre).some((x) => x.id === o.id)) {
        throw new Error(`${o.id} : déjà retirée (mémoire)`)
      }
      const etiquette = c(arbre, 'git', [
        'rev-parse',
        '--verify',
        '--quiet',
        `${refEtiquette(o.id)}^{commit}`,
      ])
      if (etiquette.code !== 0) {
        throw new Error(`${o.id} : aucune fusion à retirer (pas d'étiquette)`)
      }
      const sha = etiquette.sortie.trim()
      const parents = git(c, arbre, ['rev-list', '--parents', '-n', '1', sha]).trim().split(' ')
      if (parents.length !== 3)
        throw new Error(`${o.id} : l'étiquette ne pointe pas sur une fusion`)
      if (c(arbre, 'git', ['merge-base', '--is-ancestor', sha, 'HEAD']).code !== 0) {
        throw new Error(`${o.id} : la fusion n'est pas sur ${REF_DISTANTE}`)
      }
      try {
        git(c, arbre, ['revert', '-m', '1', '--no-commit', sha])
        o.ecrireRetrait(arbre)
        git(c, arbre, ['add', '--', DOSSIER_MEMOIRE])
        git(c, arbre, [
          'commit',
          '-m',
          `Chantier ${o.id} : retiré\n\nRetrait (PLAN-GENERAL.md G2) : git revert -m 1 de ${sha.slice(0, 12)}. Motif : ${o.motif}`,
        ])
      } catch (erreur) {
        // Un conflit, une mémoire qui porterait un nom : l'arbre est jeté, rien n'est retiré.
        throw new Error(`${o.id} : retrait défait (${(erreur as Error).message.slice(0, 300)})`)
      }
      const revert = git(c, arbre, ['rev-parse', 'HEAD']).trim()
      const refus = pousser(c, arbre, [])
      return refus === undefined ? { fini: { revert } } : { pushRefuse: refus }
    },
    (raison) => {
      throw new Error(`${o.id} : retrait défait (push refusé deux fois : ${raison})`)
    },
  )
}
