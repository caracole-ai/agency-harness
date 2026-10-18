import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { Designable } from '../conversation/designation'
import {
  comparerVersions,
  lireVersion,
  type Manifeste,
  prochaineEtiquette,
  rendreManifeste,
  signerEtiquette,
  versions,
} from '../livraison/version'
import {
  BRANCHE_PRINCIPALE,
  branche,
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
import { lireCle, nomArbre } from './cle'
import {
  cheminEntree,
  DOSSIER_MEMOIRE,
  interdits,
  lireIndex,
  missionFusionnee,
  missionsRetirees,
  resoudreCle,
} from './memoire'

// La fusion automatique et son retrait (PLAN-GENERAL.md G1, G2 ;
// PLAN-LIVRAISON.md L2). Le seul module qui fusionne et qui pousse, et
// seulement dans un arbre détaché sur `origin/main` frais, jeté après : ni
// `main` du dépôt de base ni l'arbre d'un humain ne bougent, le push vise
// `main` du distant. Neuf conditions, toutes mesurées en code, aucune par un
// prompt ; une seule rouge et rien n'est fusionné : la branche reste, la
// mémoire dit pourquoi. La mémoire se commet toujours à part, après la
// fusion : `git revert -m 1` de la fusion ne la défait jamais. Un push refusé
// (quelqu'un a poussé entre-temps) : une reprise depuis un `origin/main`
// refetché, pas deux. Le retrait défait la fusion, pousse, et la mémoire
// garde le motif et les intentions (le même travail n'est jamais refait).
// Une fusion et un retrait posent chacun une version signée
// (PLAN-LIVRAISON.md L4), poussée avec eux, tout ou rien ; `versionner`
// étiquette `origin/main` tel quel. Un refus n'en pose pas : rien n'a changé
// dans le code.

/** Les neuf conditions de G1, dans l'ordre du plan ; la neuvième, le rejeu, décidée le 2026-10-18, suit l'honnêteté. */
export const CONDITIONS = {
  chemins: 'le diff est dans les chemins autorisés',
  tests: "aucun test existant n'a disparu",
  check: 'pnpm check vert, rejoué par le code',
  honnetete: 'trois cas de traduction par geste nouveau, traduction au seuil',
  rejeu: "chaque nombre que l'échappée cite se retrouve dans ce que le geste rend",
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

/** L'étiquette posée sur une fusion (G1), par la clé de la mission : `refs/tags/chantier/<métier>/<id>`. */
export const refEtiquette = (cle: string) => `refs/tags/chantier/${cle}`

/**
 * `memoire` : le chemin de l'entrée dans le dépôt (`memoire/chantiers/<métier>/<date>-<id>.md`) ;
 * `version` : l'étiquette signée posée sur la fusion (absente d'une fusion d'avant les versions).
 */
export type IssueFusion =
  | { sorte: 'fusionne'; fusion: string; memoire: string; version?: string }
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

/** HEAD de l'arbre détaché sur `main` du distant. */
const SUR_MAIN = `HEAD:refs/heads/${BRANCHE_PRINCIPALE}`
const refTag = (tag: string) => `refs/tags/${tag}`

/**
 * Pousse ces refs sur le distant, tout ou rien (`--atomic` : une étiquette ne
 * part jamais sans sa fusion, ni une fusion sans sa version) ; rend l'erreur
 * si le distant refuse.
 */
function pousser(c: Commande, arbre: string, refs: string[]): string | undefined {
  const r = c(arbre, 'git', ['push', '--atomic', '--quiet', DISTANT, ...refs])
  return r.code === 0 ? undefined : (r.erreur || r.sortie).trim().slice(0, 300)
}

/** De quoi poser une version (L4) : la clé privée de l'agence (un chemin hors du dépôt), le jour (AAAA-MM-JJ). */
export interface OptionsVersion {
  cle: string
  jour: string
}

/** Pose dans l'arbre la prochaine version du jour, signée, sur `commit` ; rend son nom. */
function poserVersion(
  c: Commande,
  arbre: string,
  commit: string,
  v: OptionsVersion,
  m: Omit<Manifeste, 'commit'>,
): string {
  oterVersionsOrphelines(c, arbre)
  // Les versions du distant, même hors de `main` (une étiquette refusée chez les clients prend quand même son nom).
  git(c, arbre, ['fetch', '--quiet', DISTANT, 'refs/tags/v*:refs/tags/v*'])
  const tag = prochaineEtiquette(c, arbre, v.jour)
  signerEtiquette(c, arbre, tag, commit, rendreManifeste(tag, { ...m, commit }), v.cle)
  return tag
}

/** Les étiquettes locales posées par une tentative qui ne part pas : la reprise les reposera. */
const oterEtiquettes = (c: Commande, arbre: string, tags: (string | undefined)[]) => {
  for (const t of tags) if (t) c(arbre, 'git', ['tag', '-d', t])
}

/**
 * Les versions locales que le distant n'a pas (une tentative tuée entre
 * `tag -s` et le push) : ôtées, pour qu'aucune ne passe pour posée ni ne
 * prenne un rang. Une version n'existe que poussée, avec sa fusion.
 */
function oterVersionsOrphelines(c: Commande, arbre: string): void {
  const distantes = new Set(
    git(c, arbre, ['ls-remote', '--tags', '--refs', DISTANT, 'refs/tags/v*'])
      .split('\n')
      .map((l) => l.split('\t')[1]?.replace('refs/tags/', ''))
      .filter((t): t is string => t !== undefined),
  )
  for (const t of versions(c, arbre)) if (!distantes.has(t)) c(arbre, 'git', ['tag', '-d', t])
}

/** La version déjà posée sur ce commit, s'il y en a une (la plus récente). */
const versionDe = (c: Commande, arbre: string, commit: string): string | undefined =>
  git(c, arbre, ['tag', '--points-at', commit, '--list', 'v*'])
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => lireVersion(t) !== undefined)
    .sort(comparerVersions)
    .at(-1)

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
    let r: Tentative<T>
    try {
      r = travail(arbre)
    } catch (erreur) {
      try {
        retirerArbre(c, racine, arbre)
      } catch {
        // L'erreur du travail est celle qui compte ; le prochain `ouvrirArbreDetache` retire l'arbre.
      }
      throw erreur
    }
    try {
      retirerArbre(c, racine, arbre)
    } catch (erreur) {
      // Un arbre qui ne se retire pas ne défait rien de ce qui est poussé : le prochain
      // `ouvrirArbreDetache` le retire. Il n'arrête qu'une reprise.
      if (!('fini' in r)) throw erreur
    }
    if ('fini' in r) return r.fini
    raison = r.pushRefuse
  }
  return enEchec(raison)
}

/**
 * Conclut un chantier : dans un arbre détaché sur `origin/main`.
 * `conditions` : les huit premières, mesurées par le chantier ; la neuvième
 * se mesure ici, sur l'entrée de mémoire écrite par `ecrireEntree` dans cet
 * arbre. Neuf vertes : `git merge --no-ff` du commit gardé de
 * `chantier/<métier>/<id>` (jamais la pointe de la branche : le code du modèle
 * tourne après la garde, dans `pnpm check` et `pnpm evals`), l'étiquette
 * `chantier/<métier>/<id>` sur la fusion, la mémoire commise à part, `git
 * push` sur `main` du distant avec l'étiquette. Sinon : rien de fusionné, la
 * mémoire du refus commise et poussée.
 */
export function conclure(o: {
  commande: Commande
  /** Le dépôt de base (L2). */
  racine: string
  /** La clé de la mission : `<métier>/<id>`. */
  cle: string
  titre: string
  /** Le commit de `chantier/<métier>/<id>` sur lequel la garde a porté : lui seul se fusionne. */
  commit: string | undefined
  conditions: Condition[]
  /** Écrit l'entrée de mémoire dans cet arbre avec cette sorte et cette issue ; rend son chemin, lève si elle porterait un nom. */
  ecrireEntree: (arbre: string, sorte: 'fusion' | 'refus', issue: string) => string
  personnes: Designable[]
  /** La version que pose une fusion, et le client (slug) que son manifeste nomme. */
  version: OptionsVersion & { client: string }
}): IssueFusion {
  const c = o.commande
  if (!brancheExiste(c, o.racine, o.cle)) {
    return { sorte: 'echec', raison: `branche ${refBranche(o.cle)} absente` }
  }
  const avantMemoire = IDS_CONDITIONS.filter((id) => id !== 'memoire').map(
    (id): Condition =>
      o.conditions.find((x) => x.id === id) ?? { id, ok: false, mesure: 'non mesurée' },
  )
  const rouges = avantMemoire.filter((x) => !x.ok)
  const etiquette = refEtiquette(o.cle).replace('refs/tags/', '')
  let enRoute = 'fusion défaite'

  const refuser = (arbre: string, toutes: Condition[]): Tentative<IssueFusion> => {
    enRoute = 'mémoire du refus non poussée'
    const rougesToutes = toutes.filter((x) => !x.ok)
    const memoire = o.ecrireEntree(arbre, 'refus', raisonRefus(rougesToutes))
    commettreMemoire(c, arbre, `Mémoire : chantier ${o.cle} refusé`)
    const refus = pousser(c, arbre, [SUR_MAIN])
    return refus === undefined
      ? { fini: { sorte: 'refuse', rouges: rougesToutes, memoire: relative(arbre, memoire) } }
      : { pushRefuse: refus }
  }

  return avecReprise(
    c,
    o.racine,
    nomArbre('fusion', o.cle),
    (arbre): Tentative<IssueFusion> => {
      if (rouges.length > 0) {
        return refuser(arbre, [
          ...avantMemoire,
          { id: 'memoire', ok: true, mesure: 'non mesurée (refus)' },
        ])
      }
      // Condition 9 : l'entrée existe et ne porte aucun nom ; écrite avant la fusion, commise après.
      let memoire: string
      try {
        memoire = o.ecrireEntree(arbre, 'fusion', 'fusionné')
      } catch (erreur) {
        oublierMemoire(c, arbre)
        return refuser(arbre, [
          ...avantMemoire,
          { id: 'memoire', ok: false, mesure: (erreur as Error).message.slice(0, 200) },
        ])
      }
      const propre =
        existsSync(memoire) && interdits(readFileSync(memoire, 'utf8'), o.personnes).length === 0
      if (!propre) {
        oublierMemoire(c, arbre)
        return refuser(arbre, [
          ...avantMemoire,
          { id: 'memoire', ok: false, mesure: "l'entrée manque ou porte un nom" },
        ])
      }

      enRoute = 'fusion défaite'
      if (!o.commit) {
        return { fini: { sorte: 'echec', raison: 'aucun commit gardé à fusionner' } }
      }
      // Le commit gardé déjà dans `origin/main` (un push accepté dont la réponse s'est perdue, un
      // `--refaire` d'une branche fusionnée) : rien ne se refusionne, l'étiquette dit ce qui l'est.
      if (c(arbre, 'git', ['merge-base', '--is-ancestor', o.commit, 'HEAD']).code === 0) {
        const posee = c(arbre, 'git', [
          'rev-parse',
          '--verify',
          '--quiet',
          `${refEtiquette(o.cle)}^{commit}`,
        ])
        const entree = lireIndex(arbre)
          .filter((e) => e.sorte === 'fusion' && e.cle === o.cle)
          .at(-1)
        oublierMemoire(c, arbre)
        if (
          posee.code === 0 &&
          entree &&
          c(arbre, 'git', ['merge-base', '--is-ancestor', posee.sortie.trim(), 'HEAD']).code === 0
        ) {
          const version = versionDe(c, arbre, posee.sortie.trim())
          return {
            fini: {
              sorte: 'fusionne',
              fusion: posee.sortie.trim(),
              ...(version ? { version } : {}),
              memoire: cheminEntree(entree.date, o.cle),
            },
          }
        }
        return {
          fini: {
            sorte: 'echec',
            raison: `${branche(o.cle)} est déjà dans ${REF_DISTANTE} sans fusion étiquetée : rien n'est refait`,
          },
        }
      }
      const message = `Chantier ${o.cle} : ${o.titre}\n\nFusion automatique (PLAN-GENERAL.md G1) : neuf conditions vertes.`
      const fusion = c(arbre, 'git', ['merge', '--no-ff', '-m', message, o.commit])
      if (fusion.code !== 0) {
        return {
          fini: {
            sorte: 'echec',
            raison: `fusion impossible : ${(fusion.erreur || fusion.sortie).trim().slice(0, 300)}`,
          },
        }
      }
      let version: string | undefined
      try {
        const sha = git(c, arbre, ['rev-parse', 'HEAD']).trim()
        if (
          git(c, arbre, ['rev-list', '--parents', '-n', '1', sha]).trim().split(' ').length !== 3
        ) {
          return { fini: { sorte: 'echec', raison: "la fusion n'a pas fait de commit de fusion" } }
        }
        // `-f` : une étiquette restée locale (une tentative tuée avant le push) ne bloque pas la reprise ;
        // une étiquette déjà sur le distant (une branche refusionnée après coup) n'est jamais remplacée :
        // le push atomique la refuse, et rien ne part.
        git(c, arbre, ['tag', '-f', etiquette, sha])
        version = poserVersion(c, arbre, sha, o.version, {
          sorte: 'chantier',
          chantier: o.cle,
          geste: lireCle(o.cle).id,
          client: o.version.client,
        })
        commettreMemoire(c, arbre, `Mémoire : chantier ${o.cle} fusionné`)
        const refus = pousser(c, arbre, [SUR_MAIN, refEtiquette(o.cle), refTag(version)])
        if (refus === undefined) {
          return {
            fini: { sorte: 'fusionne', fusion: sha, memoire: relative(arbre, memoire), version },
          }
        }
        // Les étiquettes n'existent que si la fusion est sur le distant : la reprise les reposera.
        oterEtiquettes(c, arbre, [etiquette, version])
        return { pushRefuse: refus }
      } catch (erreur) {
        oterEtiquettes(c, arbre, [etiquette, version])
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
 * 1` de la fusion étiquetée `chantier/<métier>/<id>`, la ligne `retrait` de
 * la mémoire (écrite par `ecrireRetrait` dans cet arbre) dans le même commit,
 * sa version signée, puis `git push` sur `main` du distant. La mission se
 * nomme par sa clé, ou par son seul identifiant quand un seul métier l'a
 * fusionné (`resoudreCle`, sur la mémoire d'`origin/main`). Lève si la
 * mission n'a pas été fusionnée, si elle a déjà été retirée (la mémoire
 * d'`origin/main` le dit), ou si le retrait n'a pas pu être poussé : alors
 * rien n'est retiré.
 */
export function retirerFusion(o: {
  commande: Commande
  /** Le dépôt de base (L2). */
  racine: string
  /** La clé `<métier>/<id>`, ou l'identifiant seul s'il ne désigne qu'une fusion. */
  cle: string
  motif: string
  /** Écrit la ligne `retrait` dans cet arbre, pour la mission de cette clé. */
  ecrireRetrait: (arbre: string, cle: string) => void
  version: OptionsVersion
}): { revert: string; version: string; cle: string } {
  const c = o.commande
  return avecReprise(
    c,
    o.racine,
    nomArbre('retrait', o.cle),
    (arbre): Tentative<{ revert: string; version: string; cle: string }> => {
      const cle = resoudreCle(arbre, o.cle)
      if (missionsRetirees(arbre).some((x) => x.cle === cle)) {
        throw new Error(`${cle} : déjà retirée (mémoire)`)
      }
      const etiquette = c(arbre, 'git', [
        'rev-parse',
        '--verify',
        '--quiet',
        `${refEtiquette(cle)}^{commit}`,
      ])
      if (etiquette.code !== 0) {
        throw new Error(`${cle} : aucune fusion à retirer (pas d'étiquette)`)
      }
      const sha = etiquette.sortie.trim()
      const parents = git(c, arbre, ['rev-list', '--parents', '-n', '1', sha]).trim().split(' ')
      if (parents.length !== 3) throw new Error(`${cle} : l'étiquette ne pointe pas sur une fusion`)
      if (c(arbre, 'git', ['merge-base', '--is-ancestor', sha, 'HEAD']).code !== 0) {
        throw new Error(`${cle} : la fusion n'est pas sur ${REF_DISTANTE}`)
      }
      try {
        git(c, arbre, ['revert', '-m', '1', '--no-commit', sha])
        o.ecrireRetrait(arbre, cle)
        git(c, arbre, ['add', '--', DOSSIER_MEMOIRE])
        git(c, arbre, [
          'commit',
          '-m',
          `Chantier ${cle} : retiré\n\nRetrait (PLAN-GENERAL.md G2) : git revert -m 1 de ${sha.slice(0, 12)}. Motif : ${o.motif}`,
        ])
      } catch (erreur) {
        // Un conflit, une mémoire qui porterait un nom : l'arbre est jeté, rien n'est retiré.
        throw new Error(`${cle} : retrait défait (${(erreur as Error).message.slice(0, 300)})`)
      }
      const revert = git(c, arbre, ['rev-parse', 'HEAD']).trim()
      const client = missionFusionnee(arbre, cle)?.client
      const version = poserVersion(c, arbre, revert, o.version, {
        sorte: 'retrait',
        chantier: cle,
        geste: lireCle(cle).id,
        ...(client ? { client } : {}),
      })
      const refus = pousser(c, arbre, [SUR_MAIN, refTag(version)])
      if (refus === undefined) return { fini: { revert, version, cle } }
      oterEtiquettes(c, arbre, [version])
      return { pushRefuse: refus }
    },
    (raison) => {
      throw new Error(`${o.cle} : retrait défait (push refusé deux fois : ${raison})`)
    },
  )
}

/**
 * `pnpm versionner` (L4) : une version signée sur `origin/main` tel quel,
 * pour livrer un changement du moteur sans chantier ; seule l'étiquette est
 * poussée. Un `origin/main` qui porte déjà une version : rien n'est posé.
 */
export function versionner(o: {
  commande: Commande
  /** Le dépôt de base (L2). */
  racine: string
  version: OptionsVersion
}): { sorte: 'posee' | 'deja'; version: string; commit: string } {
  const c = o.commande
  return avecReprise(
    c,
    o.racine,
    'version',
    (arbre): Tentative<{ sorte: 'posee' | 'deja'; version: string; commit: string }> => {
      const commit = git(c, arbre, ['rev-parse', 'HEAD']).trim()
      oterVersionsOrphelines(c, arbre)
      const deja = versionDe(c, arbre, commit)
      if (deja) return { fini: { sorte: 'deja', version: deja, commit } }
      const version = poserVersion(c, arbre, commit, o.version, { sorte: 'manuelle' })
      const refus = pousser(c, arbre, [refTag(version)])
      if (refus === undefined) return { fini: { sorte: 'posee', version, commit } }
      oterEtiquettes(c, arbre, [version])
      return { pushRefuse: refus }
    },
    (raison) => {
      throw new Error(`version non poussée (push refusé deux fois : ${raison})`)
    },
  )
}
