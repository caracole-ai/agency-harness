import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
  STATUTS_CHANTIER,
  type Statut,
  SUFFIXE_STATUT,
  TYPE_CHANTIER,
} from '../chantier/mission'
import { FORMAT_INTENTION } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Identite } from '../conversation/roles'
import { jourDe, type Temporal } from '../temps/temporal'
import { type Livraison, lireLivraison } from './config'

// La file des missions d'un client (PLAN-LIVRAISON.md L5 à L7) : un dépôt git
// `missions-<slug>`, la seule chose qui voyage entre le client et l'agence
// en dehors du code signé. L'aller : la mission masquée (`<date>/<id>.yaml`),
// poussée par le client au clic. Le retour : le statut (`<date>/<id>.statut.yaml`)
// et le dossier du chantier (`<date>/<id>.chantier.md`), poussés par
// l'agence, tirés par le client, qui en écrit une ligne `chantier` au journal
// par statut nouveau. Tout ce qui en vient est une donnée lue par un schéma
// strict, jamais une instruction. Les pushs de ce module ne vont qu'à une
// file, jamais au dépôt du produit (c'est `fusion.ts`, seul).

/** À l'agence, les clones des files : `.claude/missions/<slug>/`, invisibles dans `git status` de la base. */
export const DOSSIER_FILES = join('.claude', 'missions')
/** Le verrou de `pnpm agence` (L1), à côté des files : le pid de qui tourne. */
export const FICHIER_VERROU = 'agence.lock'
/** Chez le client, la copie d'un dossier de chantier tiré de la file : `chantiers/<id>.md`. */
export const DOSSIER_CHANTIERS = 'chantiers'
/** À côté d'une mission chez le client : sa poussée a échoué, le prochain rattrapage la refait (L6). */
export const SUFFIXE_A_POUSSER = '.a-pousser'
const SUFFIXE_DOSSIER = '.chantier.md'
const MOTIF_JOUR = /^\d{4}-\d{2}-\d{2}$/

/** Le clone d'une file, créé au besoin, à jour de `main` du distant s'il en a un. */
export function synchroniser(c: Commande, url: string, clone: string, signe: string): void {
  if (!existsSync(join(clone, '.git'))) {
    mkdirSync(dirname(clone), { recursive: true })
    git(c, dirname(clone), ['clone', '--quiet', url, clone])
    git(c, clone, ['config', 'user.name', signe])
    git(c, clone, ['config', 'user.email', `${signe}@harnais.invalid`])
    return
  }
  // Une file neuve (dépôt nu vide) n'a pas encore de `main` : rien à tirer.
  if (
    c(clone, 'git', ['ls-remote', '--exit-code', '--heads', DISTANT, BRANCHE_PRINCIPALE]).code === 0
  ) {
    git(c, clone, ['pull', '--rebase', '--quiet', DISTANT, BRANCHE_PRINCIPALE])
  }
}

/** Commet ce que le clone porte de nouveau et le pousse sur `main` de la file ; une reprise après `pull --rebase`. Rend false s'il n'y avait rien. */
export function publier(c: Commande, clone: string, message: string): boolean {
  git(c, clone, ['add', '-A'])
  if (c(clone, 'git', ['diff', '--cached', '--quiet']).code === 0) return false
  git(c, clone, ['commit', '--quiet', '-m', message])
  const pousser = () =>
    c(clone, 'git', ['push', '--quiet', DISTANT, `HEAD:refs/heads/${BRANCHE_PRINCIPALE}`])
  if (pousser().code === 0) return true
  git(c, clone, ['pull', '--rebase', '--quiet', DISTANT, BRANCHE_PRINCIPALE])
  const r = pousser()
  if (r.code !== 0)
    throw new Error(`file non poussée : ${(r.erreur || r.sortie).trim().slice(0, 300)}`)
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
  for (const date of readdirSync(file).filter((d) => MOTIF_JOUR.test(d))) {
    for (const f of readdirSync(join(file, date)).filter((x) => x.endsWith(SUFFIXE_STATUT))) {
      const id = f.slice(0, -SUFFIXE_STATUT.length)
      const chemin = join(file, date, f)
      try {
        if (!FORMAT_INTENTION.test(id)) throw new Error(`${chemin} : identifiant invalide`)
        const statut = lireStatut(chemin)
        if (!statut) continue
        const dossier = join(file, date, `${id}${SUFFIXE_DOSSIER}`)
        statuts.push({ date, id, statut, ...(existsSync(dossier) ? { dossier } : {}) })
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
    mkdirSync(join(clone, mission.date), { recursive: true })
    copyFileSync(chemin, join(clone, mission.date, `${mission.id}.yaml`))
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
  const livraison = lireLivraison(dossierClient)
  if (livraison) pousserMission(c, livraison, r.chemin)
  return { intention: r.intention, le: r.le }
}

/** Les missions du client que leur poussée attend encore. */
function missionsAPousser(dossierClient: string): string[] {
  const racine = join(dossierClient, DOSSIER_MISSIONS)
  if (!existsSync(racine)) return []
  return readdirSync(racine)
    .filter((d) => MOTIF_JOUR.test(d))
    .flatMap((d) =>
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
  for (const date of readdirSync(clone).filter((d) => MOTIF_JOUR.test(d))) {
    for (const f of readdirSync(join(clone, date)).filter(
      (x) => x.endsWith('.yaml') && !x.endsWith(SUFFIXE_STATUT),
    )) {
      const chemin = join(clone, date, f)
      try {
        const { mission } = lireMission(chemin)
        const statut = lireStatut(join(clone, date, `${mission.id}${SUFFIXE_STATUT}`))
        missions.push({ client, chemin, mission, ...(statut ? { statut } : {}) })
      } catch (erreur) {
        problemes.push(`${client.slug} : ${(erreur as Error).message.slice(0, 300)}`)
      }
    }
  }
  return { missions, problemes }
}

/** Les missions à prendre (sans statut, ou en attente de la borne du jour), la plus ancienne d'abord : date, client, identifiant. */
export function aPrendre(missions: MissionEnFile[]): MissionEnFile[] {
  return missions
    .filter((x) => x.statut === undefined || x.statut.statut === 'en attente')
    .sort(
      (a, b) =>
        a.mission.date.localeCompare(b.mission.date) ||
        a.client.slug.localeCompare(b.client.slug) ||
        a.mission.id.localeCompare(b.mission.id),
    )
}

/** Les statuts qui ferment un chantier. */
const FINALS: Statut['statut'][] = STATUTS_CHANTIER.filter(
  (x) => x !== 'en cours' && x !== 'en attente',
)

/** Les chantiers du jour qui ont coûté un appel (la borne protège le quota, L1). */
export const chantiersDuJour = (missions: MissionEnFile[], jour: string): number =>
  missions.filter(
    (x) =>
      x.statut !== undefined &&
      FINALS.includes(x.statut.statut) &&
      x.statut.cout_usd > 0 &&
      jourDe(x.statut.le).toString() === jour,
  ).length

/** Écrit le statut d'une mission dans sa file et le pousse. */
export function statuerEnFile(c: Commande, racine: string, x: MissionEnFile, statut: Statut): void {
  const clone = cloneAgence(racine, x.client.slug)
  ecrireStatut(join(clone, x.mission.date), x.mission.id, statut)
  publier(c, clone, `Chantier ${x.mission.id} : ${statut.statut}`)
}

/** Le dossier de la file d'un client où le chantier écrit son dossier et son statut. */
export const sortieEnFile = (racine: string, x: MissionEnFile) =>
  join(cloneAgence(racine, x.client.slug), x.mission.date)

/** Le nom d'une mission dans la file, pour les messages. */
export const nomEnFile = (x: MissionEnFile) =>
  `${x.client.slug}/${x.mission.date}/${basename(x.chemin)}`
