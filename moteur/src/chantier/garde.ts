import { parse } from 'yaml'
import type { Designable } from '../conversation/designation'
import { type CasTraduire, FichierTraduire } from '../evals/evals'
import { BRANCHE_PRINCIPALE, type Commande, git } from './arbre'
import { DOSSIER_MEMOIRE, FICHIER_CONVENTIONS, interdits } from './memoire'

// La garde du diff d'un chantier (PLAN-RONDE.md § 6.2, R5 (4) ;
// PLAN-GENERAL.md G1, conditions 1, 2 et 7) : la hiérarchie de Lionel
// appliquée par le code, pas promise par un prompt. Le diff de la branche
// depuis `main` : chaque fichier dans les chemins autorisés d'`agence.yaml`,
// la mémoire touchée seulement par des lignes ajoutées à `CONVENTIONS.md`
// (jamais retirées, jamais un nom) ; aucun fichier de test supprimé, aucun
// test de moins dans un fichier de test existant, aucun `.skip` ni `.only` de
// plus, aucun mis en commentaire ; aucun cas d'éval existant supprimé ni
// réécrit (sauf une demande nouvelle qui devient le geste de la branche) ; au
// plus `lignes_max` lignes ; jamais un chemin interdit (les contrôles des
// règles, même dans la bande). Et le compte des cas de traduction de chaque
// geste nouveau (condition 4, première moitié).

const FICHIER_TEST = /\.test\.ts$/
/** Un test (`it(`, `test(`, `it.each(`) ; `it.skip(` n'en est pas un. */
const MOTIF_TEST = /\b(?:it|test)(?:\.each)?\s*\(/g
/** Ce qui fait taire un test ou tous les autres. */
const MOTIF_TAIRE = /\.(?:skip|only|todo)\s*\(/g
const CONVENTIONS = `${DOSSIER_MEMOIRE}/${FICHIER_CONVENTIONS}`
export const FICHIER_CONSIGNES = 'evals/consignes.yaml'

/** Un chemin autorisé d'`agence.yaml` en expression : `**` traverse les dossiers, `*` non. */
export function motifChemin(glob: string): RegExp {
  const corps = glob
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')
  return new RegExp(`^${corps}$`)
}

export interface Garde {
  /** Condition 1 : tout le diff est dans la bande, la mémoire en ajout seul. */
  chemins: { ok: boolean; horsBande: string[]; memoire: string[] }
  /** Condition 2 : aucun test existant n'a disparu ni ne s'est tu. */
  tests: { ok: boolean; disparus: string[] }
  /** Condition 7 : lignes ajoutées et retirées. */
  lignes: { ok: boolean; total: number; max: number }
  fichiers: { statut: string; chemin: string }[]
  /** Les fichiers de test ajoutés ou modifiés. */
  testsTouches: string[]
}

const compter = (texte: string, motif: RegExp) => texte.match(motif)?.length ?? 0

/** Le code sans ses commentaires : un test mis en commentaire n'est plus un test. */
const sansCommentaires = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

/** Le contenu d'un fichier à une révision, vide s'il n'y existe pas. */
const aRevision = (c: Commande, arbre: string, rev: string, chemin: string) => {
  const r = c(arbre, 'git', ['show', `${rev}:${chemin}`])
  return r.code === 0 ? r.sortie : ''
}

/** La garde du diff commis de la branche (`main...HEAD`), dans l'arbre de travail. */
export function garderDiff(
  c: Commande,
  arbre: string,
  config: { chemins_autorises: string[]; chemins_interdits: string[]; lignes_max: number },
  personnes: Designable[],
): Garde {
  const base = git(c, arbre, ['merge-base', BRANCHE_PRINCIPALE, 'HEAD']).trim()
  const fichiers = git(c, arbre, ['diff', '--name-status', '--no-renames', base, 'HEAD'])
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const [statut = '', chemin = ''] = l.split('\t')
      return { statut, chemin }
    })
  // Les interdits l'emportent : les contrôles des règles vivent dans la bande métier, jamais au chantier.
  const motifs = config.chemins_autorises.map(motifChemin)
  const interditsChemins = config.chemins_interdits.map(motifChemin)
  const horsBande = fichiers
    .map((f) => f.chemin)
    .filter(
      (chemin) =>
        !motifs.some((m) => m.test(chemin)) || interditsChemins.some((m) => m.test(chemin)),
    )

  // La mémoire est écrite par le code ; le modèle peut seulement ajouter une ligne aux conventions (R10).
  const numstat = new Map(
    git(c, arbre, ['diff', '--numstat', '--no-renames', base, 'HEAD'])
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        const [ajoutees = '', retirees = '', chemin = ''] = l.split('\t')
        return [chemin, { ajoutees: Number(ajoutees), retirees: Number(retirees) }] as const
      }),
  )
  const memoire: string[] = []
  for (const f of fichiers.filter((x) => x.chemin.startsWith(`${DOSSIER_MEMOIRE}/`))) {
    if (f.chemin !== CONVENTIONS) {
      memoire.push(`${f.chemin} : écrit par le code seulement`)
      continue
    }
    if ((numstat.get(f.chemin)?.retirees ?? 0) !== 0 || f.statut === 'D') {
      memoire.push(`${f.chemin} : une convention ne se retire jamais`)
    }
    const ajout = git(c, arbre, ['diff', base, 'HEAD', '--', f.chemin])
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .join('\n')
    if (interdits(ajout, personnes).length > 0) {
      memoire.push(`${f.chemin} : une ligne ajoutée porte un nom ou un identifiant`)
    }
  }

  const disparus: string[] = []
  const testsTouches: string[] = []
  for (const f of fichiers.filter((x) => FICHIER_TEST.test(x.chemin))) {
    if (f.statut === 'D') {
      disparus.push(`${f.chemin} : supprimé`)
      continue
    }
    testsTouches.push(f.chemin)
    if (f.statut !== 'M') continue
    const avant = sansCommentaires(aRevision(c, arbre, base, f.chemin))
    const apres = sansCommentaires(aRevision(c, arbre, 'HEAD', f.chemin))
    if (compter(apres, MOTIF_TEST) < compter(avant, MOTIF_TEST)) {
      disparus.push(
        `${f.chemin} : ${compter(avant, MOTIF_TEST)} tests avant, ${compter(apres, MOTIF_TEST)} après`,
      )
    }
    if (compter(apres, MOTIF_TAIRE) > compter(avant, MOTIF_TAIRE)) {
      disparus.push(`${f.chemin} : un .skip, .only ou .todo de plus`)
    }
  }

  // Les cas d'éval existants sont des tests aussi : aucun ne disparaît ni ne change (§ 6.4 de la méthode).
  disparus.push(...casModifies(c, arbre, base))

  // Un fichier binaire (« - ») compte comme hors borne : il n'a rien à faire dans la bande métier.
  const total = [...numstat.values()].reduce(
    (s, n) =>
      s +
      (Number.isNaN(n.ajoutees) || Number.isNaN(n.retirees)
        ? config.lignes_max + 1
        : n.ajoutees + n.retirees),
    0,
  )
  return {
    chemins: {
      ok: fichiers.length > 0 && horsBande.length === 0 && memoire.length === 0,
      horsBande,
      memoire,
    },
    tests: { ok: disparus.length === 0, disparus },
    lignes: { ok: total <= config.lignes_max, total, max: config.lignes_max },
    fichiers,
    testsTouches,
  }
}

/** Les cas d'un fichier d'éval, par identifiant (vide s'il ne se lit pas). */
function casParId(texte: string): Map<string, CasTraduire> {
  const lu = FichierTraduire.safeParse(parse(texte))
  return new Map(lu.success ? lu.data.cas.map((x) => [x.id, x]) : [])
}

/**
 * Les cas de traduction de `main` qui ont disparu ou changé sur la branche.
 * Un seul changement est permis : une demande nouvelle (`sorte: nouvelle`)
 * qui devient un geste nouveau de la branche, sa consigne et son rôle
 * intacts (une factorisation sert désormais la demande).
 */
function casModifies(c: Commande, arbre: string, base: string): string[] {
  const avant = casParId(aRevision(c, arbre, base, FICHIER_CONSIGNES))
  const apres = casParId(aRevision(c, arbre, 'HEAD', FICHIER_CONSIGNES))
  const nouveaux = new Set(casParGesteNouveau(c, arbre).map((g) => g.geste))
  const ecarts: string[] = []
  for (const [id, a] of avant) {
    const b = apres.get(id)
    if (!b) {
      ecarts.push(`${FICHIER_CONSIGNES} : le cas ${id} a disparu`)
      continue
    }
    const { attendu: attenduA, ...restA } = a
    const { attendu: attenduB, ...restB } = b
    if (JSON.stringify(restA) !== JSON.stringify(restB)) {
      ecarts.push(`${FICHIER_CONSIGNES} : le cas ${id} a changé de consigne ou de rôle`)
    } else if (JSON.stringify(attenduA) !== JSON.stringify(attenduB)) {
      const devientGeste =
        [attenduA.sorte].flat().includes('nouvelle') &&
        attenduB.sorte === 'action' &&
        attenduB.action !== undefined &&
        nouveaux.has(attenduB.action)
      if (!devientGeste)
        ecarts.push(`${FICHIER_CONSIGNES} : l'étiquette du cas ${id} a été réécrite`)
    }
  }
  return ecarts
}

/** Les cas de traduction par action attendue, dans un `consignes.yaml` (vide s'il ne se lit pas). */
function casParAction(texte: string): Map<string, number> {
  const lu = FichierTraduire.safeParse(parse(texte))
  const n = new Map<string, number>()
  if (!lu.success) return n
  for (const cas of lu.data.cas) {
    if (cas.attendu.action) n.set(cas.attendu.action, (n.get(cas.attendu.action) ?? 0) + 1)
  }
  return n
}

/**
 * Les gestes nouveaux de la branche (une action attendue par `consignes.yaml`
 * qui ne l'était pas sur `main`) et leurs cas de traduction : G1 en exige au
 * moins trois par geste nouveau (condition 4).
 */
export function casParGesteNouveau(c: Commande, arbre: string): { geste: string; cas: number }[] {
  const base = git(c, arbre, ['merge-base', BRANCHE_PRINCIPALE, 'HEAD']).trim()
  const avant = casParAction(aRevision(c, arbre, base, FICHIER_CONSIGNES))
  const apres = casParAction(aRevision(c, arbre, 'HEAD', FICHIER_CONSIGNES))
  return [...apres].filter(([geste]) => !avant.has(geste)).map(([geste, cas]) => ({ geste, cas }))
}
