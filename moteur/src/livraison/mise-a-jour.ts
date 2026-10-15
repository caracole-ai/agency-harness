import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { type Commande, commandeSync, git } from '../chantier/arbre'
import { envEnfant } from '../chantier/claude'
import type { MetierConversation } from '../conversation/conversation'
import type { Ligne } from '../journal/journal'
import { jourDe, type Temporal } from '../temps/temporal'
import { type Livraison, lireLivraison } from './config'
import { type Rattrapage, rattraperStatuts } from './missions'
import {
  etiquettesCandidates,
  FICHIER_SIGNATAIRES,
  lireVersion,
  verifierEtiquette,
  versions,
} from './version'

// La mise à jour chez le client (PLAN-LIVRAISON.md L8, L9) : le harnais tire
// lui-même ses versions. Dans son installation (hors du dossier client) :
// `depot/` (un clone nu du dépôt du produit, en lecture seule),
// `versions/<tag>/` (un arbre par version), `courant` et `precedent` (des
// liens). Préparer : la plus récente des versions qui descendent de la
// courante, vérifiée (signature de l'agence, nom, lignée), installée à côté,
// `pnpm check` rejoué dans son arbre ; alors `.prete` et le lien
// `courant.suivant`. Rien de ce qui tourne n'est touché : la bascule se fait
// au redémarrage, par le lanceur (`harnais.ts`), à un moment calme. Deux
// versions gardées (la courante, la précédente), plus celle qui attend.

/** La ligne d'une mise à jour au journal du client : objet, la version ; issue, l'une de `ISSUES_MISE_A_JOUR`. */
export const TYPE_MISE_A_JOUR = 'mise à jour'
export const ISSUES_MISE_A_JOUR = {
  faite: 'faite',
  refusee: 'refusée',
  retour: 'retour arrière',
} as const
/** Le code de sortie de l'interface qui demande au lanceur de basculer sur la version prête. */
export const CODE_RELANCE = 75
/** Le calme : aucune requête depuis tant de secondes, et aucun rattrapage en cours. */
export const CALME_SECONDES = 60
/** À la racine d'un arbre de version : son étiquette, écrite à la préparation. */
export const FICHIER_VERSION = 'VERSION'
/** À la racine d'un arbre de version : préparée, vérifiée, `pnpm check` vert. */
export const FICHIER_PRETE = '.prete'
/** Dans l'installation : le lanceur est revenu en arrière ; l'interface le dit au journal à son démarrage. */
export const FICHIER_RETOUR = 'retour-arriere.yaml'
export const LIENS = {
  courant: 'courant',
  precedent: 'precedent',
  suivant: 'courant.suivant',
} as const
export const DOSSIER_DEPOT = 'depot'
export const DOSSIER_VERSIONS = 'versions'

/** Le marqueur d'un retour arrière : d'où, vers où, pourquoi. */
export const RetourArriere = z.strictObject({
  de: z.string().min(1),
  vers: z.string().min(1),
  raison: z.string().min(1),
})
export type RetourArriere = z.infer<typeof RetourArriere>

/** La cible d'un lien de l'installation, résolue ; undefined s'il n'existe pas. */
export function cible(installation: string, lien: string): string | undefined {
  try {
    return realpathSync(join(installation, lien))
  } catch {
    return undefined
  }
}

/** L'étiquette d'un arbre de version (son fichier `VERSION`) ; undefined sans fichier. */
export function versionDeLArbre(arbre: string | undefined): string | undefined {
  if (!arbre || !existsSync(join(arbre, FICHIER_VERSION))) return undefined
  const v = readFileSync(join(arbre, FICHIER_VERSION), 'utf8').trim()
  return lireVersion(v) ? v : undefined
}

/** Fait pointer `lien` (dans l'installation) sur `vers`, d'un coup : un lien temporaire, puis `rename`. */
export function lier(installation: string, lien: string, vers: string): void {
  const tmp = join(installation, `${lien}.${process.pid}.tmp`)
  rmSync(tmp, { force: true })
  symlinkSync(vers, tmp)
  renameSync(tmp, join(installation, lien))
}

/** Ce qu'un passage de préparation a fait : la version prête (ou qui attend déjà), et les versions refusées, chacune avec sa raison. */
export interface Preparation {
  prete?: { version: string; deja: boolean }
  refusees: { version: string; raison: string }[]
}

/** Le clone nu du dépôt du produit, à jour de ses étiquettes ; créé au besoin. */
function depotAJour(c: Commande, l: Livraison): string {
  const depot = join(l.installation, DOSSIER_DEPOT)
  if (!existsSync(depot)) {
    mkdirSync(l.installation, { recursive: true })
    git(c, l.installation, ['clone', '--bare', '--quiet', l.depot, depot])
  } else {
    // Sans `--force` : une étiquette qui changerait sous le même nom fait échouer le fetch.
    git(c, depot, ['fetch', '--quiet', '--tags', 'origin'])
  }
  return depot
}

/**
 * Prépare la prochaine version (L8) : des versions plus récentes que la
 * courante, de la plus récente à la plus ancienne, la première qui descend de
 * la courante, dont la signature est admise et dont `pnpm check` est vert dans
 * son arbre, installé à côté. Une plus récente d'une autre lignée, une
 * signature refusée : dites, la suivante est essayée ; un `pnpm check` rouge :
 * dit, son arbre retiré, rien d'autre n'est essayé à ce passage. `exclues` :
 * les versions déjà refusées ou dont le redémarrage a échoué, jamais
 * reprises. Sans version courante (la première installation), toutes sont
 * candidates.
 */
export function preparer(
  dossierClient: string,
  l: Livraison,
  env: Record<string, string | undefined>,
  exclues: string[] = [],
  c: Commande = commandeSync,
): Preparation {
  const depot = depotAJour(c, l)
  const courante = versionDeLArbre(cible(l.installation, LIENS.courant))
  const { candidates, refusees: autres } = courante
    ? etiquettesCandidates(c, depot, courante)
    : { candidates: versions(c, depot).reverse(), refusees: [] }
  const refusees: Preparation['refusees'] = autres
    .filter((t) => !exclues.includes(t))
    .map((version) => ({ version, raison: `ne descend pas de ${courante}` }))
  for (const version of candidates.filter((t) => !exclues.includes(t))) {
    const arbre = join(l.installation, DOSSIER_VERSIONS, version)
    if (
      existsSync(join(arbre, FICHIER_PRETE)) &&
      cible(l.installation, LIENS.suivant) === realpathSync(arbre)
    ) {
      return { prete: { version, deja: true }, refusees }
    }
    const signature = verifierEtiquette(c, depot, version, join(dossierClient, FICHIER_SIGNATAIRES))
    if (signature) {
      refusees.push({ version, raison: signature })
      continue
    }
    const retirer = () => {
      if (existsSync(arbre)) git(c, depot, ['worktree', 'remove', '--force', arbre])
      git(c, depot, ['worktree', 'prune'])
    }
    retirer()
    mkdirSync(dirname(arbre), { recursive: true })
    git(c, depot, ['worktree', 'add', '--detach', '--quiet', arbre, `${version}^{commit}`])
    writeFileSync(join(arbre, FICHIER_VERSION), `${version}\n`)
    const enfant = envEnfant(env)
    for (const etape of [['install', '--frozen-lockfile', '--prefer-offline'], ['check']]) {
      const r = c(arbre, 'pnpm', etape, enfant)
      if (r.code !== 0) {
        retirer()
        refusees.push({
          version,
          raison: `pnpm ${etape[0]} rouge dans la version (${(r.erreur || r.sortie).trim().split('\n').at(-1)?.slice(0, 160) ?? '?'})`,
        })
        return { refusees }
      }
    }
    writeFileSync(join(arbre, FICHIER_PRETE), '')
    lier(l.installation, LIENS.suivant, arbre)
    elaguer(l, c)
    return { prete: { version, deja: false }, refusees }
  }
  return { refusees }
}

/** La première installation (aucune version courante) : la version préparée devient la courante ; rend son nom. */
export function installerPremiere(l: Livraison): string {
  if (cible(l.installation, LIENS.courant)) throw new Error('une version est déjà installée')
  const suivant = cible(l.installation, LIENS.suivant)
  if (!suivant || !existsSync(join(suivant, FICHIER_PRETE))) {
    throw new Error('aucune version préparée à installer')
  }
  lier(l.installation, LIENS.courant, suivant)
  rmSync(join(l.installation, LIENS.suivant), { force: true })
  return versionDeLArbre(suivant) ?? suivant
}

/** Seules restent les versions que pointent `courant`, `precedent` et `courant.suivant` (L8). */
export function elaguer(l: Livraison, c: Commande = commandeSync): void {
  const dossier = join(l.installation, DOSSIER_VERSIONS)
  if (!existsSync(dossier)) return
  const gardees = new Set(
    Object.values(LIENS)
      .map((x) => cible(l.installation, x))
      .filter((x): x is string => x !== undefined),
  )
  const depot = join(l.installation, DOSSIER_DEPOT)
  for (const v of readdirSync(dossier)) {
    const arbre = realpathSync(join(dossier, v))
    if (gardees.has(arbre)) continue
    git(c, depot, ['worktree', 'remove', '--force', arbre])
  }
  git(c, depot, ['worktree', 'prune'])
}

/** La dernière ligne `mise à jour` du journal, sous cette issue (toutes si absente). */
const derniere = (lignes: Ligne[], issue?: string) =>
  lignes
    .filter((x) => x.type === TYPE_MISE_A_JOUR && (issue === undefined || x.issue === issue))
    .at(-1)

export interface Rattrapement {
  statuts: Rattrapage
  preparation?: Preparation
}

/**
 * Le rattrapage du client (L7, L8) : les statuts, puis, s'il est livré, la
 * prochaine version préparée ; chaque version refusée est dite au journal
 * (`mise à jour : refusée`), une fois : refusée ou revenue en arrière, une
 * version n'est plus jamais reprise.
 */
export function rattraper<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  maintenant: Temporal.ZonedDateTime,
  env: Record<string, string | undefined>,
  c: Commande = commandeSync,
): Rattrapement {
  // La file et les versions sont indépendantes : une file injoignable n'empêche pas une version.
  let statuts: Rattrapage
  try {
    statuts = rattraperStatuts(m, s, dossierClient, maintenant, c)
  } catch (erreur) {
    statuts = { nouveaux: 0, poussees: 0, aPousser: 0, problemes: [(erreur as Error).message] }
  }
  const l = lireLivraison(dossierClient)
  if (!l) return { statuts }
  const journal = m.journal(s)
  const exclues = journal
    .lire()
    .filter(
      (x) =>
        x.type === TYPE_MISE_A_JOUR &&
        (x.issue === ISSUES_MISE_A_JOUR.retour || x.issue === ISSUES_MISE_A_JOUR.refusee),
    )
    .flatMap((x) => (x.objet ? [x.objet] : []))
  const preparation = preparer(dossierClient, l, env, exclues, c)
  // Chaque refus se dit une fois : une version refusée n'est plus jamais reprise.
  if (preparation.refusees.length > 0) {
    journal.ecrire(
      preparation.refusees.map((r) => ({
        type: TYPE_MISE_A_JOUR,
        client: m.client(s),
        objet: r.version,
        issue: ISSUES_MISE_A_JOUR.refusee,
        motif: r.raison,
      })),
      maintenant.toInstant().toString(),
    )
  }
  return { statuts, preparation }
}

/**
 * Au démarrage de l'interface d'un client livré (L9) : le marqueur d'un
 * retour arrière laissé par le lanceur devient la ligne `mise à jour : retour
 * arrière` (le marqueur est ôté) ; sinon, une version qui n'est pas celle de
 * la dernière ligne `faite` devient `mise à jour : faite`. Rend la ligne
 * écrite, s'il y en a une.
 */
export function noterDemarrage<S>(
  m: MetierConversation<S>,
  s: S,
  l: Livraison,
  version: string | undefined,
  maintenant: Temporal.ZonedDateTime,
): string | undefined {
  const journal = m.journal(s)
  const le = maintenant.toInstant().toString()
  const marqueur = join(l.installation, FICHIER_RETOUR)
  if (existsSync(marqueur)) {
    const lu = RetourArriere.safeParse(parse(readFileSync(marqueur, 'utf8')))
    rmSync(marqueur, { force: true })
    if (lu.success) {
      journal.ecrire(
        [
          {
            type: TYPE_MISE_A_JOUR,
            client: m.client(s),
            objet: lu.data.de,
            issue: ISSUES_MISE_A_JOUR.retour,
            motif: `${lu.data.de} → ${lu.data.vers} : ${lu.data.raison}`,
            donnees: lu.data,
          },
        ],
        le,
      )
      return ISSUES_MISE_A_JOUR.retour
    }
  }
  if (!version) return undefined
  if (derniere(journal.lire(), ISSUES_MISE_A_JOUR.faite)?.objet === version) return undefined
  journal.ecrire(
    [
      {
        type: TYPE_MISE_A_JOUR,
        client: m.client(s),
        objet: version,
        issue: ISSUES_MISE_A_JOUR.faite,
      },
    ],
    le,
  )
  return ISSUES_MISE_A_JOUR.faite
}

/** Écrit le marqueur d'un retour arrière, pour l'interface qui redémarre. */
export const marquerRetour = (installation: string, r: RetourArriere) =>
  writeFileSync(join(installation, FICHIER_RETOUR), stringify(RetourArriere.parse(r)))

/** La version d'un arbre de code (`<racine>/VERSION`) et le jour (Paris) de sa dernière mise à jour faite, pour `/api/version`. */
export function etatVersion(
  lignes: Ligne[],
  version: string | undefined,
): { version?: string; le?: string } {
  const l = derniere(lignes, ISSUES_MISE_A_JOUR.faite)
  return {
    ...(version ? { version } : {}),
    ...(l && l.objet === version ? { le: jourDe(l.horodatage).toString() } : {}),
  }
}
