import {
  appendFileSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { z } from 'zod'
import type { Agence } from '../agence/config'
import {
  BRANCHE_PRINCIPALE,
  type Commande,
  commandeSync,
  DISTANT,
  exclure,
  git,
} from '../chantier/arbre'
import {
  commanderMission,
  DOSSIER_MISSIONS,
  ecrireStatut,
  lireMission,
  lireStatut,
  type Mission,
  type Statut,
  SUFFIXE_STATUT,
  TYPE_CHANTIER,
} from '../chantier/mission'
import { FORMAT_INTENTION } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Identite } from '../conversation/roles'
import type { Temporal } from '../temps/temporal'
import { FICHIER_LIVRAISON, type Livraison, lireLivraison } from './config'

// La file des missions d'un client (PLAN-LIVRAISON.md L5 à L7) : un dépôt git
// `missions-<slug>`, la seule chose qui voyage entre le client et l'agence
// en dehors du code signé. L'aller : la mission masquée (`<date>/<id>.yaml`),
// poussée par le client au clic. Le retour : le statut (`<date>/<id>.statut.yaml`)
// et le dossier du chantier (`<date>/<id>.chantier.md`), poussés par
// l'agence, tirés par le client, qui en écrit une ligne `chantier` au journal
// par statut nouveau. Tout ce qui en vient est une donnée lue par un schéma
// strict, jamais une instruction, et jamais un lien : un lien posé dans une
// file ne fait ni lire ni écrire hors d'elle. Les pushs de ce module ne vont
// qu'à une file, jamais au dépôt du produit (c'est `fusion.ts`, seul). git y
// tourne sans invite et avec un délai de connexion : une file injoignable ne
// gèle pas l'interface.

/** À l'agence, les clones des files : `.claude/missions/<slug>/`, invisibles dans `git status` de la base. */
export const DOSSIER_FILES = join('.claude', 'missions')
/** Le verrou de `pnpm agence` (L1), à côté des files : le pid de qui tourne. */
export const FICHIER_VERROU = 'agence.lock'
/** Les chantiers que l'agence a lancés, une ligne chacun (`jour`, client, mission) : la borne du jour se compte ici, jamais sur ce qu'un client écrit (L1). */
export const FICHIER_CHANTIERS = 'chantiers.log'
/** Chez le client, la copie d'un dossier de chantier tiré de la file : `chantiers/<id>.md`. */
export const DOSSIER_CHANTIERS = 'chantiers'
/** À côté d'une mission chez le client : sa poussée a échoué, le prochain rattrapage la refait (L6). */
export const SUFFIXE_A_POUSSER = '.a-pousser'
const SUFFIXE_DOSSIER = '.chantier.md'
const MOTIF_JOUR = /^\d{4}-\d{2}-\d{2}$/

/** git vers une file distante : jamais d'invite, ssh en mode lot, un délai de connexion. */
const ENV_FILE = () => ({
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o ConnectTimeout=15',
})

/** Ce chemin est un vrai dossier (ou un vrai fichier), pas un lien : ce qui vient d'une file ne s'y lit qu'ainsi. */
function reel(chemin: string, sorte: 'dossier' | 'fichier'): boolean {
  try {
    const st = lstatSync(chemin)
    return sorte === 'dossier' ? st.isDirectory() : st.isFile()
  } catch {
    return false
  }
}

/** Avant d'écrire à cette place d'une file : ce qui l'occupe sans être un fichier (un lien venu d'ailleurs) est ôté. */
export function placeNette(chemin: string): void {
  try {
    if (!lstatSync(chemin).isFile()) rmSync(chemin, { recursive: true, force: true })
  } catch {
    // Rien à cette place.
  }
}

/** Un dossier de date d'une file, vrai dossier, créé au besoin ; un lien à sa place est ôté. */
function dossierDate(clone: string, date: string): string {
  const d = join(clone, date)
  if (!reel(d, 'dossier')) {
    rmSync(d, { recursive: true, force: true })
    mkdirSync(d, { recursive: true })
  }
  return d
}

/** Les dossiers de date d'une file : de vrais dossiers ; un lien est écarté et dit. */
function datesDe(file: string, problemes: string[]): string[] {
  return readdirSync(file)
    .filter((d) => MOTIF_JOUR.test(d))
    .filter((d) => {
      if (reel(join(file, d), 'dossier')) return true
      problemes.push(`${join(file, d)} : pas un dossier (un lien ?), écarté`)
      return false
    })
}

/** `git pull --rebase` de `main` ; un conflit est abandonné (le clone reste lisible) et dit. */
function tirer(c: Commande, clone: string): void {
  const r = c(
    clone,
    'git',
    ['pull', '--rebase', '--quiet', DISTANT, BRANCHE_PRINCIPALE],
    ENV_FILE(),
  )
  if (r.code !== 0) {
    c(clone, 'git', ['rebase', '--abort'])
    throw new Error(`file non tirée : ${(r.erreur || r.sortie).trim().slice(0, 300)}`)
  }
}

/** Le clone d'une file, créé au besoin, à jour de `main` du distant s'il en a un. */
export function synchroniser(c: Commande, url: string, clone: string, signe: string): void {
  if (!existsSync(join(clone, '.git'))) {
    mkdirSync(dirname(clone), { recursive: true })
    git(c, dirname(clone), ['clone', '--quiet', url, clone], ENV_FILE())
    git(c, clone, ['config', 'user.name', signe])
    git(c, clone, ['config', 'user.email', `${signe}@harnais.invalid`])
    return
  }
  // Une file neuve (dépôt nu vide) n'a pas encore de `main` (code 2) : rien à tirer.
  const distant = c(
    clone,
    'git',
    ['ls-remote', '--exit-code', '--heads', DISTANT, BRANCHE_PRINCIPALE],
    ENV_FILE(),
  )
  if (distant.code === 0) tirer(c, clone)
  else if (distant.code !== 2) {
    throw new Error(`file injoignable : ${(distant.erreur || distant.sortie).trim().slice(0, 300)}`)
  }
}

/** Le clone a des commits que la file n'a pas (un push échoué la fois d'avant). */
function enAvance(c: Commande, clone: string): boolean {
  if (c(clone, 'git', ['rev-parse', '--verify', '--quiet', 'HEAD']).code !== 0) return false
  const r = c(clone, 'git', ['rev-list', '--count', `${DISTANT}/${BRANCHE_PRINCIPALE}..HEAD`])
  return r.code !== 0 || Number(r.sortie.trim()) > 0
}

/**
 * Commet ce que le clone porte de nouveau et pousse sur `main` de la file
 * tout ce qu'elle n'a pas encore (un commit d'un push échoué compris) ; une
 * reprise après `pull --rebase`. Rend false s'il n'y avait rien à pousser.
 */
export function publier(c: Commande, clone: string, message: string): boolean {
  git(c, clone, ['add', '-A'])
  if (c(clone, 'git', ['diff', '--cached', '--quiet']).code !== 0) {
    git(c, clone, ['commit', '--quiet', '-m', message])
  }
  if (!enAvance(c, clone)) return false
  const pousser = () =>
    c(
      clone,
      'git',
      ['push', '--quiet', DISTANT, `HEAD:refs/heads/${BRANCHE_PRINCIPALE}`],
      ENV_FILE(),
    )
  if (pousser().code === 0) return true
  tirer(c, clone)
  const r = pousser()
  if (r.code !== 0) {
    throw new Error(`file non poussée : ${(r.erreur || r.sortie).trim().slice(0, 300)}`)
  }
  return true
}

/** Un statut de la file, à sa place (`<date>/<id>.statut.yaml`), et le dossier du chantier s'il y est. */
export interface StatutEnFile {
  date: string
  id: string
  statut: Statut
  dossier?: string
}

/** Les statuts d'une file, lus par le schéma strict ; un fichier mal formé ou mal placé est écarté et dit. */
export function statutsDe(file: string): { statuts: StatutEnFile[]; problemes: string[] } {
  const statuts: StatutEnFile[] = []
  const problemes: string[] = []
  if (!existsSync(file)) return { statuts, problemes }
  for (const date of datesDe(file, problemes)) {
    for (const f of readdirSync(join(file, date)).filter((x) => x.endsWith(SUFFIXE_STATUT))) {
      const id = f.slice(0, -SUFFIXE_STATUT.length)
      const chemin = join(file, date, f)
      try {
        if (!FORMAT_INTENTION.test(id)) throw new Error(`${chemin} : identifiant invalide`)
        if (!reel(chemin, 'fichier')) throw new Error(`${chemin} : pas un fichier (un lien ?)`)
        const statut = lireStatut(chemin)
        if (!statut) continue
        const dossier = join(file, date, `${id}${SUFFIXE_DOSSIER}`)
        statuts.push({ date, id, statut, ...(reel(dossier, 'fichier') ? { dossier } : {}) })
      } catch (erreur) {
        problemes.push((erreur as Error).message.slice(0, 300))
      }
    }
  }
  return { statuts: statuts.sort((a, b) => a.statut.le.localeCompare(b.statut.le)), problemes }
}

// ─── Chez le client ────────────────────────────────────────────────────────

/** Le clone de la file d'un client livré, dans son installation. */
export const cloneDuClient = (l: Livraison) => join(l.installation, DOSSIER_MISSIONS)

/**
 * L'aller (L6) : la mission, telle qu'elle est écrite chez le client et relue
 * par le schéma strict, copiée dans sa file et poussée. Un échec (réseau)
 * ne fait pas échouer le clic : la mission est marquée `à pousser` (la
 * raison dans la marque) et le prochain rattrapage la pousse.
 */
export function pousserMission(
  c: Commande,
  livraison: Livraison,
  chemin: string,
): 'poussee' | 'a_pousser' {
  const marque = `${chemin}${SUFFIXE_A_POUSSER}`
  try {
    const { mission } = lireMission(chemin)
    const clone = cloneDuClient(livraison)
    synchroniser(c, livraison.missions, clone, 'harnais')
    const place = join(dossierDate(clone, mission.date), `${mission.id}.yaml`)
    placeNette(place)
    copyFileSync(chemin, place)
    publier(c, clone, `Mission ${mission.id} (${mission.date})`)
    rmSync(marque, { force: true })
    return 'poussee'
  } catch (erreur) {
    writeFileSync(marque, `${(erreur as Error).message.slice(0, 500)}\n`)
    return 'a_pousser'
  }
}

/**
 * « Créer ce geste » chez un client (L6) : la mission écrite et la ligne
 * `geste commandé` (`commanderMission`), puis, si le client est livré, la
 * mission poussée dans sa file (ou marquée `à pousser`). Rend l'intention et
 * le jour de la commande, rien de la machine.
 */
export function commanderEtLivrer<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  intention: string,
  par: Identite,
  maintenant: Temporal.ZonedDateTime,
  c: Commande = commandeSync,
): { intention: string; le: string } {
  const r = commanderMission(m, s, dossierClient, intention, par, maintenant)
  if (existsSync(join(dossierClient, FICHIER_LIVRAISON))) {
    // La marque d'abord : une config illisible ou un arrêt brutal laissent une mission que le rattrapage poussera.
    const marque = `${r.chemin}${SUFFIXE_A_POUSSER}`
    writeFileSync(marque, 'à pousser\n')
    try {
      const livraison = lireLivraison(dossierClient)
      if (livraison) pousserMission(c, livraison, r.chemin)
    } catch (erreur) {
      writeFileSync(marque, `${(erreur as Error).message.slice(0, 500)}\n`)
    }
  }
  return { intention: r.intention, le: r.le }
}

/** Les missions du client que leur poussée attend encore. */
function missionsAPousser(dossierClient: string): string[] {
  const racine = join(dossierClient, DOSSIER_MISSIONS)
  if (!existsSync(racine)) return []
  return datesDe(racine, []).flatMap((d) =>
    readdirSync(join(racine, d))
      .filter((f) => f.endsWith(SUFFIXE_A_POUSSER))
      .map((f) => join(racine, d, f.slice(0, -SUFFIXE_A_POUSSER.length))),
  )
}

/** Ce qu'une ligne `chantier` écrite au rattrapage garde du statut. */
const DonneesStatut = z.looseObject({ le: z.string() })

export interface Rattrapage {
  /** Les lignes `chantier` écrites (un statut nouveau chacune). */
  nouveaux: number
  /** Les missions poussées à ce rattrapage, et celles qui attendent encore. */
  poussees: number
  aPousser: number
  /** Ce qui, dans la file, n'a pas été lu (mal formé, mal placé). */
  problemes: string[]
}

/**
 * Le retour (L7), chez le client : la file tirée (livré), ou le dossier
 * `missions/` du client (non livré : `pnpm chantier` y écrit les statuts à
 * côté des missions) ; une ligne `chantier` au journal par statut nouveau
 * (objet : la mission, issue : le statut, `donnees.le` et `version`), jamais
 * deux fois la même ; le dossier du chantier copié dans `chantiers/<id>.md`.
 * Livré, l'aller en retard part d'abord (les missions `à pousser`).
 */
export function rattraperStatuts<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  maintenant: Temporal.ZonedDateTime,
  c: Commande = commandeSync,
): Rattrapage {
  const livraison = lireLivraison(dossierClient)
  let poussees = 0
  let file = join(dossierClient, DOSSIER_MISSIONS)
  if (livraison) {
    file = cloneDuClient(livraison)
    synchroniser(c, livraison.missions, file, 'harnais')
    for (const chemin of missionsAPousser(dossierClient)) {
      if (pousserMission(c, livraison, chemin) === 'poussee') poussees++
    }
  }
  const { statuts, problemes } = statutsDe(file)
  const journal = m.journal(s)
  const vus = new Set(
    journal
      .lire()
      .filter((l) => l.type === TYPE_CHANTIER && l.objet !== null && l.donnees !== null)
      .flatMap((l) => {
        const d = DonneesStatut.safeParse(JSON.parse(l.donnees ?? 'null'))
        return d.success ? [`${l.objet}|${l.issue}|${d.data.le}`] : []
      }),
  )
  const client = m.client(s)
  let nouveaux = 0
  for (const x of statuts) {
    const cle = `${x.id}|${x.statut.statut}|${x.statut.le}`
    if (vus.has(cle)) continue
    vus.add(cle)
    journal.ecrire(
      [
        {
          type: TYPE_CHANTIER,
          client,
          objet: x.id,
          issue: x.statut.statut,
          donnees: {
            le: x.statut.le,
            cout_usd: x.statut.cout_usd,
            ...(x.statut.version ? { version: x.statut.version } : {}),
          },
        },
      ],
      maintenant.toInstant().toString(),
    )
    nouveaux++
    if (x.dossier) {
      mkdirSync(join(dossierClient, DOSSIER_CHANTIERS), { recursive: true })
      copyFileSync(x.dossier, join(dossierClient, DOSSIER_CHANTIERS, `${x.id}.md`))
    }
  }
  return {
    nouveaux,
    poussees,
    aPousser: livraison ? missionsAPousser(dossierClient).length : 0,
    problemes,
  }
}

// ─── À l'agence ────────────────────────────────────────────────────────────

export type ClientAgence = Agence['agence']['clients'][number]

/** Le clone de la file d'un client, dans le dépôt de l'agence. */
export const cloneAgence = (racine: string, slug: string) => join(racine, DOSSIER_FILES, slug)

/** Une mission de la file d'un client, lue par le schéma strict, et son statut s'il en a un. */
export interface MissionEnFile {
  client: ClientAgence
  chemin: string
  mission: Mission
  statut?: Statut
}

/** La file d'un client, tirée ; ses missions lues par le schéma strict ; une mission mal formée est écartée et dite. */
export function lireFile(
  c: Commande,
  racine: string,
  client: ClientAgence,
): { missions: MissionEnFile[]; problemes: string[] } {
  exclure(c, racine, DOSSIER_FILES)
  const clone = cloneAgence(racine, client.slug)
  synchroniser(c, client.missions, clone, 'agence')
  const missions: MissionEnFile[] = []
  const problemes: string[] = []
  // Ce qu'un tour d'avant n'a pas pu pousser (un statut) part d'abord.
  try {
    publier(c, clone, 'Statuts en retard')
  } catch (erreur) {
    problemes.push(`${client.slug} : ${(erreur as Error).message.slice(0, 300)}`)
  }
  for (const date of datesDe(clone, problemes)) {
    for (const f of readdirSync(join(clone, date)).filter(
      (x) => x.endsWith('.yaml') && !x.endsWith(SUFFIXE_STATUT),
    )) {
      const chemin = join(clone, date, f)
      try {
        if (!reel(chemin, 'fichier')) throw new Error(`${chemin} : pas un fichier (un lien ?)`)
        const { mission } = lireMission(chemin)
        const placeStatut = join(clone, date, `${mission.id}${SUFFIXE_STATUT}`)
        if (existsSync(placeStatut) && !reel(placeStatut, 'fichier')) {
          throw new Error(`${placeStatut} : pas un fichier (un lien ?)`)
        }
        const statut = lireStatut(placeStatut)
        missions.push({ client, chemin, mission, ...(statut ? { statut } : {}) })
      } catch (erreur) {
        problemes.push(`${client.slug} : ${(erreur as Error).message.slice(0, 300)}`)
      }
    }
  }
  return { missions, problemes }
}

/**
 * Les missions à prendre (sans statut, ou en attente de la borne du jour) :
 * d'abord le client qui a eu le moins de chantiers aujourd'hui (un client ne
 * prend pas la borne de tous), puis la plus ancienne (date, client,
 * identifiant).
 */
export function aPrendre(
  missions: MissionEnFile[],
  parClient: Map<string, number> = new Map(),
): MissionEnFile[] {
  return missions
    .filter((x) => x.statut === undefined || x.statut.statut === 'en attente')
    .sort(
      (a, b) =>
        (parClient.get(a.client.slug) ?? 0) - (parClient.get(b.client.slug) ?? 0) ||
        a.mission.date.localeCompare(b.mission.date) ||
        a.client.slug.localeCompare(b.client.slug) ||
        a.mission.id.localeCompare(b.mission.id),
    )
}

/** Note un chantier lancé par l'agence (L1) : le jour, le client, la mission. */
export function noterChantier(racine: string, jour: string, slug: string, id: string): void {
  mkdirSync(join(racine, DOSSIER_FILES), { recursive: true })
  appendFileSync(join(racine, DOSSIER_FILES, FICHIER_CHANTIERS), `${jour}\t${slug}\t${id}\n`)
}

/** Les chantiers que l'agence a lancés ce jour, en tout et par client : son propre registre, jamais une file. */
export function chantiersDuJour(
  racine: string,
  jour: string,
): { total: number; parClient: Map<string, number> } {
  const chemin = join(racine, DOSSIER_FILES, FICHIER_CHANTIERS)
  const parClient = new Map<string, number>()
  if (!existsSync(chemin)) return { total: 0, parClient }
  let total = 0
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const [j, slug] = ligne.split('\t')
    if (j !== jour || !slug) continue
    total++
    parClient.set(slug, (parClient.get(slug) ?? 0) + 1)
  }
  return { total, parClient }
}

/** Les deux places qu'un chantier écrit dans la file (son statut, son dossier) : nettes, dans un vrai dossier de date ; rend ce dossier. */
export function preparerSortie(racine: string, x: MissionEnFile): string {
  const d = dossierDate(cloneAgence(racine, x.client.slug), x.mission.date)
  placeNette(join(d, `${x.mission.id}${SUFFIXE_STATUT}`))
  placeNette(join(d, `${x.mission.id}${SUFFIXE_DOSSIER}`))
  return d
}

/** Écrit le statut d'une mission dans sa file, sans le pousser (`publier` le fait, ou le tour suivant). */
export function ecrireEnFile(racine: string, x: MissionEnFile, statut: Statut): void {
  ecrireStatut(preparerSortie(racine, x), x.mission.id, statut)
}

/** Écrit le statut d'une mission dans sa file et le pousse. */
export function statuerEnFile(c: Commande, racine: string, x: MissionEnFile, statut: Statut): void {
  ecrireEnFile(racine, x, statut)
  publier(c, cloneAgence(racine, x.client.slug), `Chantier ${x.mission.id} : ${statut.statut}`)
}

/** Le nom d'une mission dans la file, pour les messages. */
export const nomEnFile = (x: MissionEnFile) =>
  `${x.client.slug}/${x.mission.date}/${basename(x.chemin)}`
