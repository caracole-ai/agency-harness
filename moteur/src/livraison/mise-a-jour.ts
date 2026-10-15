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
import { poserVerrou } from './verrou'
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
/** Dans l'installation : le lanceur est revenu en arrière ; l'interface le dit au journal. */
export const FICHIER_RETOUR = 'retour-arriere.yaml'
/** Dans l'installation : le lanceur a basculé et la sonde a répondu ; l'interface le dit au journal (« faite »). */
export const FICHIER_BASCULE = 'bascule.yaml'
/** Dans l'installation : une préparation, une bascule ou un retour arrière à la fois. */
export const FICHIER_VERROU_INSTALLATION = '.verrou'
/** Posée par le lanceur dans l'environnement de l'interface : seule une interface qu'il relancera sort au calme. */
export const VARIABLE_LANCEUR = 'HARNAIS_LANCEUR'
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

/** Le marqueur d'une bascule réussie (la sonde a répondu). */
export const Bascule = z.strictObject({ de: z.string().min(1), vers: z.string().min(1) })
export type Bascule = z.infer<typeof Bascule>

/** Le verrou de l'installation, ou undefined s'il est tenu (une autre préparation, une bascule). */
export const verrouInstallation = (installation: string) =>
  poserVerrou(join(installation, FICHIER_VERROU_INSTALLATION))

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

/**
 * Ce qu'un passage de préparation a fait : la version prête (ou qui attend
 * déjà), les versions refusées avec leur raison (`definitif` : signature,
 * lignée, `pnpm check` rouge ; sinon une panne, réseau ou config, qui se
 * retente), ou `occupee` : une autre préparation tient l'installation.
 */
export interface Preparation {
  prete?: { version: string; deja: boolean }
  refusees: { version: string; raison: string; definitif: boolean }[]
  occupee?: true
}

/** Le clone nu du dépôt du produit, à jour de ses seules versions ; créé au besoin. */
function depotAJour(c: Commande, l: Livraison): string {
  const depot = join(l.installation, DOSSIER_DEPOT)
  if (!existsSync(depot)) {
    mkdirSync(l.installation, { recursive: true })
    git(c, l.installation, ['clone', '--bare', '--quiet', l.depot, depot])
  } else {
    // Les seules étiquettes v* (une autre étiquette réécrite ne bloque rien) ; sans `--force` : une
    // version qui changerait sous le même nom fait échouer le fetch, et le rattrapage le dit.
    git(c, depot, ['fetch', 'origin', 'refs/tags/v*:refs/tags/v*'])
  }
  return depot
}

/**
 * Prépare la prochaine version (L8), sous le verrou de l'installation : des
 * versions plus récentes que la courante, de la plus récente à la plus
 * ancienne, la première qui descend de la courante, dont la signature est
 * admise et dont `pnpm check` est vert dans son arbre, installé à côté. Une
 * plus récente d'une autre lignée, une signature refusée : dites, la suivante
 * est essayée ; un `pnpm install` ou un `pnpm check` rouge : dit, son arbre
 * retiré, rien d'autre n'est essayé à ce passage. Jamais l'arbre de la
 * courante ni de la précédente n'est touché. `exclues` : les versions
 * refusées pour de bon ou revenues en arrière. Sans version courante (la
 * première installation), toutes sont candidates. Lève sur une panne (dépôt
 * injoignable, fichier `signataires` absent).
 */
export function preparer(
  dossierClient: string,
  l: Livraison,
  env: Record<string, string | undefined>,
  exclues: string[] = [],
  c: Commande = commandeSync,
): Preparation {
  const rendre = verrouInstallation(l.installation)
  if (!rendre) return { refusees: [], occupee: true }
  try {
    const signataires = join(dossierClient, FICHIER_SIGNATAIRES)
    if (!existsSync(signataires))
      throw new Error(`${signataires} absent : aucune version ne peut être vérifiée`)
    const depot = depotAJour(c, l)
    const courante = versionDeLArbre(cible(l.installation, LIENS.courant))
    const enService = [LIENS.courant, LIENS.precedent]
      .map((x) => cible(l.installation, x))
      .filter((x): x is string => x !== undefined)
    const { candidates, refusees: autres } = courante
      ? etiquettesCandidates(c, depot, courante)
      : { candidates: versions(c, depot).reverse(), refusees: [] }
    const refusees: Preparation['refusees'] = autres
      .filter((t) => !exclues.includes(t))
      .map((version) => ({ version, raison: `ne descend pas de ${courante}`, definitif: true }))
    for (const version of candidates.filter((t) => !exclues.includes(t))) {
      const arbre = join(l.installation, DOSSIER_VERSIONS, version)
      const reel = existsSync(arbre) ? realpathSync(arbre) : undefined
      if (reel && enService.includes(reel)) continue
      if (existsSync(join(arbre, FICHIER_PRETE)) && cible(l.installation, LIENS.suivant) === reel) {
        return { prete: { version, deja: true }, refusees }
      }
      const signature = verifierEtiquette(c, depot, version, signataires)
      if (signature) {
        refusees.push({ version, raison: signature, definitif: true })
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
            // Un install rouge peut être le réseau : il se retente ; un check rouge, non.
            definitif: etape[0] === 'check',
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
  } finally {
    rendre()
  }
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

/** Seules restent les versions que pointent `courant`, `precedent` et `courant.suivant` (L8) ; sous le verrou de l'installation (`preparer`). */
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
  /** Une panne de la préparation (dépôt injoignable, `signataires` absent, une version réécrite) : dite, retentée au passage suivant. */
  erreur?: string
}

/** Ce qu'une ligne `mise à jour : refusée` garde : le refus est-il définitif. */
const DonneesRefus = z.looseObject({ definitif: z.boolean() })

/** Le marqueur de l'installation, lu par son schéma ; undefined s'il n'y est pas ou ne se lit pas. */
function lireMarqueur<T>(
  installation: string,
  fichier: string,
  schema: z.ZodType<T>,
): T | undefined {
  const chemin = join(installation, fichier)
  if (!existsSync(chemin)) return undefined
  const lu = schema.safeParse(parse(readFileSync(chemin, 'utf8')))
  return lu.success ? lu.data : undefined
}

/**
 * Le rattrapage du client (L7, L8) : les statuts, puis, s'il est livré, la
 * prochaine version préparée. Jamais reprises : une version refusée pour de
 * bon, une version revenue en arrière (au journal, ou dont le marqueur
 * attend encore d'y être écrit : un `retirer` à la main). Un refus
 * définitif est dit une fois ; une panne d'une version (un install rouge) est
 * dite une fois par raison et se retente.
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
  const lignes = journal.lire().filter((x) => x.type === TYPE_MISE_A_JOUR)
  const retour = lireMarqueur(l.installation, FICHIER_RETOUR, RetourArriere)
  const exclues = [
    ...lignes
      .filter(
        (x) =>
          x.issue === ISSUES_MISE_A_JOUR.retour ||
          (x.issue === ISSUES_MISE_A_JOUR.refusee &&
            DonneesRefus.safeParse(JSON.parse(x.donnees ?? 'null')).data?.definitif === true),
      )
      .flatMap((x) => (x.objet ? [x.objet] : [])),
    ...(retour ? [retour.de] : []),
  ]
  let preparation: Preparation
  try {
    preparation = preparer(dossierClient, l, env, exclues, c)
  } catch (erreur) {
    return { statuts, erreur: (erreur as Error).message.slice(0, 500) }
  }
  const nouveaux = preparation.refusees.filter(
    (r) =>
      !lignes.some(
        (x) =>
          x.objet === r.version && x.issue === ISSUES_MISE_A_JOUR.refusee && x.motif === r.raison,
      ),
  )
  if (nouveaux.length > 0) {
    journal.ecrire(
      nouveaux.map((r) => ({
        type: TYPE_MISE_A_JOUR,
        client: m.client(s),
        objet: r.version,
        issue: ISSUES_MISE_A_JOUR.refusee,
        motif: r.raison,
        donnees: { definitif: r.definitif },
      })),
      maintenant.toInstant().toString(),
    )
  }
  return { statuts, preparation }
}

/**
 * Ce que le lanceur a laissé dans l'installation (L9), écrit au journal par
 * l'interface : une bascule dont la sonde a répondu devient `mise à jour :
 * faite` ; un retour arrière, `mise à jour : retour arrière`. La ligne
 * d'abord, le marqueur ôté ensuite : un journal occupé laisse le marqueur pour
 * la fois suivante. Rend les lignes écrites.
 */
export function noterLivraison<S>(
  m: MetierConversation<S>,
  s: S,
  l: Livraison,
  maintenant: Temporal.ZonedDateTime,
): string[] {
  const journal = m.journal(s)
  const le = maintenant.toInstant().toString()
  const ecrites: string[] = []
  const retour = lireMarqueur(l.installation, FICHIER_RETOUR, RetourArriere)
  if (retour) {
    journal.ecrire(
      [
        {
          type: TYPE_MISE_A_JOUR,
          client: m.client(s),
          objet: retour.de,
          issue: ISSUES_MISE_A_JOUR.retour,
          motif: `${retour.de} → ${retour.vers} : ${retour.raison}`,
          donnees: retour,
        },
      ],
      le,
    )
    rmSync(join(l.installation, FICHIER_RETOUR), { force: true })
    ecrites.push(`${ISSUES_MISE_A_JOUR.retour} (${retour.de} → ${retour.vers})`)
  }
  const bascule = lireMarqueur(l.installation, FICHIER_BASCULE, Bascule)
  if (bascule) {
    journal.ecrire(
      [
        {
          type: TYPE_MISE_A_JOUR,
          client: m.client(s),
          objet: bascule.vers,
          issue: ISSUES_MISE_A_JOUR.faite,
          motif: `${bascule.de} → ${bascule.vers}`,
        },
      ],
      le,
    )
    rmSync(join(l.installation, FICHIER_BASCULE), { force: true })
    ecrites.push(`${ISSUES_MISE_A_JOUR.faite} (${bascule.vers})`)
  }
  return ecrites
}

/** Écrit le marqueur d'un retour arrière, pour l'interface qui redémarre. */
export const marquerRetour = (installation: string, r: RetourArriere) =>
  writeFileSync(join(installation, FICHIER_RETOUR), stringify(RetourArriere.parse(r)))

/** Écrit le marqueur d'une bascule réussie, pour l'interface qui tourne. */
export const marquerBascule = (installation: string, b: Bascule) =>
  writeFileSync(join(installation, FICHIER_BASCULE), stringify(Bascule.parse(b)))

/**
 * L'interface d'un client livré sort-elle pour la bascule (L8) : lancée par
 * le lanceur, une version prête, aucune requête en cours ni depuis
 * `CALME_SECONDES`, aucun rattrapage en cours.
 */
export function doitRelancer(x: {
  lanceeParLeLanceur: boolean
  suivantePrete: boolean
  requetesEnCours: number
  derniereActiviteMs: number
  maintenantMs: number
  rattrapageEnCours: boolean
}): boolean {
  return (
    x.lanceeParLeLanceur &&
    x.suivantePrete &&
    x.requetesEnCours === 0 &&
    !x.rattrapageEnCours &&
    x.maintenantMs - x.derniereActiviteMs > CALME_SECONDES * 1000
  )
}

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
