import { accessSync, constants, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { assertEnv, type Executer, executerSync } from '../agence/config'
import { type Commande, git } from '../chantier/arbre'

// Une version = une étiquette git signée (PLAN-LIVRAISON.md L4) :
// `v<AAAA-MM-JJ>-<n>`, posée en code par l'agence après une fusion ou un
// retrait (ou à la main, `pnpm versionner`), signée avec la clé SSH de
// l'agence (`AGENCE_CLE_SIGNATURE`, un chemin hors du dépôt, jamais dans
// l'environnement d'un modèle). Son message est le manifeste en clair. Chez
// le client, `git verify-tag` contre le fichier `signataires` livré avec son
// dossier : seule l'agence peut publier, et le commit couvre tout l'arbre.
// Aucune cryptographie à nous : git et `ssh-keygen -Y` font tout.

/** La variable qui désigne la clé privée de signature de l'agence (un chemin). */
export const VARIABLE_CLE_SIGNATURE = 'AGENCE_CLE_SIGNATURE'
/** Le fichier des clés publiques admises, dans le dossier du client : `agence <clé publique>`. */
export const FICHIER_SIGNATAIRES = 'signataires'
/** `v2026-10-15-1` : le jour, puis le rang dans le jour. */
export const MOTIF_VERSION = /^v(\d{4}-\d{2}-\d{2})-([1-9]\d*)$/
/** OpenSSH sait signer et vérifier (`ssh-keygen -Y`) depuis la 8.2. */
const OPENSSH_MIN = [8, 2] as const

/** Le jour et le rang d'une étiquette de version ; undefined si elle n'en est pas une. */
export function lireVersion(tag: string): { jour: string; rang: number } | undefined {
  const m = MOTIF_VERSION.exec(tag)
  return m?.[1] && m[2] ? { jour: m[1], rang: Number(m[2]) } : undefined
}

/** L'ordre des versions : le jour, puis le rang (négatif : `a` avant `b`). */
export function comparerVersions(a: string, b: string): number {
  const x = lireVersion(a)
  const y = lireVersion(b)
  if (!x || !y) throw new Error(`${x ? b : a} : pas une étiquette de version`)
  return x.jour === y.jour ? x.rang - y.rang : x.jour < y.jour ? -1 : 1
}

/** Les étiquettes de version que ce dépôt connaît, de la plus ancienne à la plus récente. */
export function versions(c: Commande, depot: string): string[] {
  return git(c, depot, ['tag', '--list', 'v*'])
    .split('\n')
    .map((l) => l.trim())
    .filter((t) => lireVersion(t) !== undefined)
    .sort(comparerVersions)
}

/**
 * La prochaine étiquette du jour (`date` : AAAA-MM-JJ) : le plus haut rang du
 * jour, plus un ; et toujours après la plus récente que le dépôt connaisse
 * (un chantier commencé avant minuit, une horloge en retard) : les noms
 * suivent l'ordre où les versions sont posées, le client les ordonne ainsi.
 */
export function prochaineEtiquette(c: Commande, depot: string, date: string): string {
  const toutes = versions(c, depot)
  const rangs = toutes.flatMap((t) => {
    const v = lireVersion(t)
    return v && v.jour === date ? [v.rang] : []
  })
  const prochaine = `v${date}-${Math.max(0, ...rangs) + 1}`
  const derniere = toutes.at(-1)
  const d = derniere ? lireVersion(derniere) : undefined
  return derniere && d && comparerVersions(prochaine, derniere) <= 0
    ? `v${d.jour}-${d.rang + 1}`
    : prochaine
}

/** Ce qu'une version dit d'elle-même, en clair dans son message. */
export interface Manifeste {
  /** `chantier` : une fusion ; `retrait` : une fusion défaite ; `manuelle` : `origin/main` tel quel. */
  sorte: 'chantier' | 'retrait' | 'manuelle'
  /** Le commit étiqueté. */
  commit: string
  /** La clé de la mission : `<métier>/<id>`. */
  chantier?: string
  /** Le geste ajouté ou retiré : l'identifiant de la mission. */
  geste?: string
  /** Le métier de la mission : tous les clients lisent le manifeste, aucun client n'y est nommé. */
  metier?: string
}

/** Le message de l'étiquette : une ligne de titre, puis une ligne `clé: valeur` par champ. */
export function rendreManifeste(tag: string, m: Manifeste): string {
  const verbe = m.sorte === 'chantier' ? 'ajouté' : m.sorte === 'retrait' ? 'retiré' : undefined
  return [
    `Version ${tag}`,
    '',
    `sorte: ${m.sorte}`,
    ...(m.chantier ? [`chantier: ${m.chantier}`] : []),
    ...(m.metier ? [`metier: ${m.metier}`] : []),
    ...(m.geste && verbe ? [`geste: ${m.geste} (${verbe})`] : []),
    `commit: ${m.commit}`,
    '',
  ].join('\n')
}

/** Pose l'étiquette signée (SSH) sur `commit`, dans cet arbre ; lève si git refuse, sans dire le chemin de la clé (le message peut partir dans un statut). */
export function signerEtiquette(
  c: Commande,
  arbre: string,
  tag: string,
  commit: string,
  message: string,
  cle: string,
): void {
  const r = c(arbre, 'git', [
    '-c',
    'gpg.format=ssh',
    '-c',
    `user.signingkey=${cle}`,
    'tag',
    '-s',
    '-m',
    message,
    tag,
    commit,
  ])
  if (r.code !== 0) {
    throw new Error(
      `signature de ${tag} refusée par git : ${(r.erreur || r.sortie).replaceAll(cle, '<clé>').trim().slice(0, 300)}`,
    )
  }
}

/** Le début d'une signature SSH dans un objet tag ; tout autre format (OpenPGP, X.509) est refusé. */
const SIGNATURE_SSH = '-----BEGIN SSH SIGNATURE-----'

/**
 * L'étiquette est une version signée par une clé de `signataires` : un objet
 * tag annoté qui porte ce nom-là (une ref renommée qui pointerait sur une
 * autre version signée est refusée), une signature SSH et aucune autre (un
 * trousseau OpenPGP ou X.509 de la machine ne compte pas), vérifiée par `git
 * verify-tag`. Rend la raison du refus, ou undefined si elle est admise.
 */
export function verifierEtiquette(
  c: Commande,
  depot: string,
  tag: string,
  signataires: string,
): string | undefined {
  if (!lireVersion(tag)) return `${tag} : pas une étiquette de version`
  if (!existsSync(signataires)) return `fichier des signataires introuvable : ${signataires}`
  const objet = c(depot, 'git', ['cat-file', 'tag', tag])
  if (objet.code !== 0) return `${tag} : pas une étiquette annotée`
  const nom = /^tag (.*)$/m.exec(objet.sortie)?.[1]
  if (nom !== tag) return `${tag} : l'étiquette signée s'appelle ${nom ?? '?'}`
  if (
    !objet.sortie.includes(SIGNATURE_SSH) ||
    /-----BEGIN (PGP|SIGNED MESSAGE)/.test(objet.sortie)
  ) {
    return `${tag} : pas une signature SSH`
  }
  const r = c(depot, 'git', [
    '-c',
    `gpg.ssh.allowedSignersFile=${signataires}`,
    '-c',
    'gpg.minTrustLevel=fully',
    '-c',
    'gpg.openpgp.program=false',
    '-c',
    'gpg.x509.program=false',
    'verify-tag',
    tag,
  ])
  return r.code === 0
    ? undefined
    : `signature refusée (${(r.erreur || r.sortie).trim().split('\n').at(-1)?.slice(0, 200) ?? '?'})`
}

/**
 * L'étiquette est une version signée par cette clé privée (un chemin) : sa
 * publique tirée par `ssh-keygen -y`, admise seule, le temps de
 * `verifierEtiquette`. À l'agence, qui n'a que sa clé privée. Rend la raison
 * du refus, ou undefined ; jamais le chemin de la clé.
 */
export function verifierParLaCle(
  c: Commande,
  depot: string,
  tag: string,
  cle: string,
): string | undefined {
  const publique = c(depot, 'ssh-keygen', ['-y', '-P', '', '-f', cle])
  if (publique.code !== 0) return 'la clé publique de l’agence ne se lit pas (ssh-keygen -y)'
  const d = mkdtempSync(join(tmpdir(), 'signataires-'))
  try {
    const signataires = join(d, FICHIER_SIGNATAIRES)
    writeFileSync(signataires, `agence ${publique.sortie.trim()}\n`)
    return verifierEtiquette(c, depot, tag, signataires)
  } finally {
    rmSync(d, { recursive: true, force: true })
  }
}

/**
 * Les versions plus récentes que `courante` (L8) : `candidates`, celles qui
 * en descendent, de la plus récente à la plus ancienne ; `refusees`, celles
 * qui n'en descendent pas (une autre lignée : on ne revient jamais en
 * arrière). Les versions plus anciennes ne sont ni l'une ni l'autre.
 */
export function etiquettesCandidates(
  c: Commande,
  depot: string,
  courante: string,
): { candidates: string[]; refusees: string[] } {
  const plusRecentes = versions(c, depot)
    .filter((t) => comparerVersions(t, courante) > 0)
    .reverse()
  const descend = (t: string) =>
    c(depot, 'git', ['merge-base', '--is-ancestor', `${courante}^{commit}`, `${t}^{commit}`])
      .code === 0
  return {
    candidates: plusRecentes.filter(descend),
    refusees: plusRecentes.filter((t) => !descend(t)),
  }
}

/**
 * Avant de signer (`pnpm agence`, `pnpm chantier`, `pnpm versionner`) : la
 * clé désignée par `AGENCE_CLE_SIGNATURE`, lisible et hors du dépôt
 * (`racine`) ; OpenSSH 8.2 au moins. Rend le chemin de la clé ; lève sinon.
 */
export function preflightSignature(
  env: Record<string, string | undefined>,
  racine: string,
  executer: Executer = executerSync,
): string {
  const cle = resolve(assertEnv(VARIABLE_CLE_SIGNATURE, env))
  try {
    accessSync(cle, constants.R_OK)
  } catch {
    throw new Error(`${VARIABLE_CLE_SIGNATURE} : clé illisible (${cle})`)
  }
  const dedans = relative(resolve(racine), cle)
  if (!dedans.startsWith('..') && !isAbsolute(dedans)) {
    throw new Error(
      `${VARIABLE_CLE_SIGNATURE} : la clé est dans le dépôt (${cle}) ; elle vit hors du dépôt`,
    )
  }
  const r = executer('ssh', ['-V'])
  const v = /OpenSSH_(\d+)\.(\d+)/.exec(`${r.sortie}${r.erreur}`)
  const [majeure, mineure] = [Number(v?.[1]), Number(v?.[2])]
  if (!v || majeure < OPENSSH_MIN[0] || (majeure === OPENSSH_MIN[0] && mineure < OPENSSH_MIN[1])) {
    throw new Error(
      `OpenSSH ${OPENSSH_MIN.join('.')} au moins (ssh-keygen -Y) : ${v ? `${majeure}.${mineure}` : 'introuvable'}`,
    )
  }
  return cle
}
