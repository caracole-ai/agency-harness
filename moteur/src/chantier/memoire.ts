import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import type { Designable } from '../conversation/designation'
import { MOTIF_ID_CONVERSATION } from '../conversation/id'
import { fuites } from '../echappee/pseudonymes'
import { estCle, lireCle } from './cle'

// La mémoire des chantiers, dans le dépôt (PLAN-RONDE.md R10, PLAN-GENERAL.md
// décision 2) : `memoire/INDEX.md` (une ligne par événement),
// `chantiers/<métier>/`, `CONVENTIONS.md` (on y ajoute, on n'en retire jamais).
// Une mission y est connue par sa clé `<métier>/<id>` (`cle.ts`) : deux
// métiers peuvent avoir commandé le même identifiant.
// Écrite par le code, dans l'arbre détaché de la fusion ou du retrait
// (PLAN-LIVRAISON.md L2) ; le texte libre d'un modèle y passe nettoyé. Rien
// n'y entre qui porte un nom de salarié, un identifiant de personne, de
// conversation ou d'échappée : ceux-là restent chez le client. Une écriture
// qui en porterait un lève, rien n'est écrit. Aucun client non plus (décidé le
// 2026-10-20) : tous les clients tirent la mémoire avec la version ; l'index
// nomme le métier, le client reste au registre local de l'agence
// (`.claude/missions/chantiers.log`).

export const DOSSIER_MEMOIRE = 'memoire'
export const FICHIER_INDEX = 'INDEX.md'
export const FICHIER_CONVENTIONS = 'CONVENTIONS.md'
export const DOSSIER_CHANTIERS_MEMOIRE = 'chantiers'

/** Ce que la mémoire raconte (R10). */
export const SORTES_MEMOIRE = ['chantier', 'fusion', 'refus', 'retrait', 'mise à jour'] as const
export type SorteMemoire = (typeof SORTES_MEMOIRE)[number]

/** « ce que j'ai appris » : au plus tant de lignes (R10). */
export const APPRIS_LIGNES_MAX = 20

/** Le séparateur des colonnes d'une ligne de l'index. */
const SEP = ' · '

export interface EvenementMemoire {
  /** AAAA-MM-JJ */
  date: string
  /** Le métier de la mission, jamais son client. */
  metier: string
  sorte: SorteMemoire
  /** La clé de la mission : `<métier>/<id>`. */
  cle: string
  titre: string
  issue: string
  /** En dollars ; `estime` : rapporté par le binaire `claude`, une estimation (PLAN-RONDE.md § 0.a). */
  cout?: { usd: number; estime: boolean }
}

/** Ce qu'un texte porte qu'il ne doit pas : noms, identifiants de personnes, de conversations, d'échappées. Vide : rien. */
export function interdits(texte: string, personnes: Designable[]): string[] {
  const ids = personnes
    .map((p) => p.id)
    .filter((id) =>
      new RegExp(`(?<![\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(texte),
    )
  return [...fuites(texte, personnes), ...ids, ...(texte.match(MOTIF_ID_CONVERSATION) ?? [])]
}

/** Le texte libre d'un modèle, gardé s'il ne porte rien d'interdit, sur une ligne ; sinon une mention qui le dit. */
export function nettoyer(texte: string, personnes: Designable[]): string {
  const ligne = texte.replace(/\s+/g, ' ').trim()
  return interdits(ligne, personnes).length === 0
    ? ligne
    : '(texte retiré : il citait un nom ou un identifiant)'
}

/** Un texte de plusieurs lignes : chaque ligne qui porte un nom ou un identifiant est remplacée par une mention qui le dit. */
export function nettoyerLignes(texte: string, personnes: Designable[]): string {
  return texte
    .split('\n')
    .map((l) =>
      interdits(l, personnes).length === 0
        ? l
        : '(ligne retirée : elle citait un nom ou un identifiant)',
    )
    .join('\n')
}

/** Lève si le texte porte un nom ou un identifiant : rien n'est écrit (échec fermé). */
function exigerPropre(texte: string, personnes: Designable[], ou: string): void {
  const trouves = interdits(texte, personnes)
  if (trouves.length > 0) {
    throw new Error(
      `mémoire : ${ou} porterait ${trouves.length} nom(s) ou identifiant(s), rien n'est écrit`,
    )
  }
}

/** Un nom de client en nom de fichier (exemple : `client fictif (sécurité privée)` → `client-fictif-securite-privee`). */
export const slugClient = (client: string) =>
  client
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const colonne = (s: string) => s.replace(/\s+/g, ' ').replaceAll('·', ',').trim()

/** `0,12 $ (estimé par le binaire)` */
export const coutEcrit = (c: { usd: number; estime: boolean }) =>
  `${c.usd.toFixed(2).replace('.', ',')} $${c.estime ? ' (estimé par le binaire)' : ''}`

function ligneIndex(e: EvenementMemoire): string {
  return `- ${[e.date, e.metier, e.sorte, e.cle, e.titre, e.issue, e.cout ? coutEcrit(e.cout) : '—']
    .map(colonne)
    .join(SEP)}`
}

const dossier = (racine: string, ...sous: string[]) => join(racine, DOSSIER_MEMOIRE, ...sous)

/** L'entrée d'un chantier, relative au dépôt : `memoire/chantiers/<métier>/<date>-<id>.md`. */
export function cheminEntree(date: string, cle: string): string {
  const { metier, id } = lireCle(cle)
  return join(DOSSIER_MEMOIRE, DOSSIER_CHANTIERS_MEMOIRE, metier, `${date}-${id}.md`)
}

function ajouter(chemin: string, ligne: string): void {
  mkdirSync(join(chemin, '..'), { recursive: true })
  appendFileSync(chemin, `${ligne}\n`)
}

/** Ajoute une ligne à `INDEX.md`. */
export function ajouterIndex(racine: string, e: EvenementMemoire, personnes: Designable[]): void {
  const ligne = ligneIndex(e)
  exigerPropre(ligne, personnes, "l'index")
  ajouter(dossier(racine, FICHIER_INDEX), ligne)
}

/** Les lignes de l'index, dans l'ordre ; une ligne qui n'a pas la forme est ignorée. */
export function lireIndex(racine: string): EvenementMemoire[] {
  const chemin = dossier(racine, FICHIER_INDEX)
  if (!existsSync(chemin)) return []
  return readFileSync(chemin, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('- ') && l.includes(SEP))
    .flatMap((l) => {
      const [date, metier, sorte, cle, titre, issue] = l.slice(2).split(SEP)
      if (!date || !metier || !cle || !SORTES_MEMOIRE.includes(sorte as SorteMemoire)) return []
      return [
        { date, metier, sorte: sorte as SorteMemoire, cle, titre: titre ?? '', issue: issue ?? '' },
      ]
    })
}

/**
 * La clé d'une mission fusionnée, depuis une clé entière ou un identifiant
 * nu (`pnpm chantier retirer <id>`) : un identifiant nu se cherche parmi les
 * fusions de l'index ; lève s'il n'en désigne aucune ou plusieurs (deux
 * métiers), sans deviner.
 */
export function resoudreCle(racine: string, idOuCle: string): string {
  if (estCle(idOuCle)) return idOuCle
  const cles = [
    ...new Set(
      lireIndex(racine)
        .filter((e) => e.sorte === 'fusion' && estCle(e.cle) && lireCle(e.cle).id === idOuCle)
        .map((e) => e.cle),
    ),
  ]
  const [seule] = cles
  if (cles.length === 1 && seule) return seule
  if (cles.length === 0) throw new Error(`${idOuCle} : aucune fusion de ce nom dans la mémoire`)
  throw new Error(
    `${idOuCle} : plusieurs métiers ont fusionné ce nom (${cles.join(', ')}) : donner la clé <métier>/<id>`,
  )
}

/** Ce qu'un chantier laisse à la mémoire (R10) ; écrit au lot 2. */
export interface ChantierMemoire {
  date: string
  /** `<métier>/<id>` : la ligne d'index en tire le métier. */
  cle: string
  titre: string
  /** Mission, plan, fichiers touchés, tests, constats, raison de la fusion ou du refus : écrits par le code. */
  sections: { titre: string; texte: string }[]
  /** « Ce que j'ai appris », du modèle d'implémentation : nettoyé ligne à ligne, borné à APPRIS_LIGNES_MAX. */
  appris: string
  sorte: Extract<SorteMemoire, 'chantier' | 'fusion' | 'refus'>
  issue: string
  cout?: { usd: number; estime: boolean }
}

/** Écrit `memoire/chantiers/<métier>/<date>-<id>.md` et sa ligne d'index ; rend le chemin. */
export function ecrireChantier(
  racine: string,
  c: ChantierMemoire,
  personnes: Designable[],
): string {
  const appris = c.appris
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, APPRIS_LIGNES_MAX)
    .map((l) => nettoyer(l, personnes))
  const contenu = [
    `# Chantier ${c.cle} — ${c.date}`,
    '',
    `${nettoyer(c.titre, personnes)} ; issue : ${c.issue}${c.cout ? ` ; coût : ${coutEcrit(c.cout)}` : ''}.`,
    '',
    ...c.sections.flatMap((s) => [`## ${s.titre}`, '', s.texte.trimEnd(), '']),
    "## Ce que j'ai appris",
    '',
    ...(appris.length > 0 ? appris : ['Rien.']),
    '',
  ].join('\n')
  exigerPropre(contenu, personnes, 'le chantier')
  const chemin = join(racine, cheminEntree(c.date, c.cle))
  mkdirSync(join(chemin, '..'), { recursive: true })
  writeFileSync(chemin, contenu)
  ajouterIndex(
    racine,
    {
      date: c.date,
      metier: lireCle(c.cle).metier,
      sorte: c.sorte,
      cle: c.cle,
      titre: nettoyer(c.titre, personnes),
      issue: c.issue,
      ...(c.cout ? { cout: c.cout } : {}),
    },
    personnes,
  )
  return chemin
}

/** Ajoute une convention à `CONVENTIONS.md` ; jamais n'en retire (R10). */
export function ajouterConvention(
  racine: string,
  convention: string,
  personnes: Designable[],
): void {
  const ligne = `- ${convention.replace(/\s+/g, ' ').trim()}`
  exigerPropre(ligne, personnes, 'la convention')
  ajouter(dossier(racine, FICHIER_CONVENTIONS), ligne)
}

/** `CONVENTIONS.md`, tel quel (vide s'il n'existe pas). */
export function lireConventions(racine: string): string {
  const chemin = dossier(racine, FICHIER_CONVENTIONS)
  return existsSync(chemin) ? readFileSync(chemin, 'utf8') : ''
}

/** Une mission retirée (G2) : sa clé, son métier, son identifiant et ses intentions, car le même travail peut revenir sous un autre nom. */
export interface MissionRetiree {
  cle: string
  metier: string
  id: string
  intentions: string[]
}

/** La fin du titre d'une ligne `retrait` : les intentions de la mission. */
const INTENTIONS_RETRAIT = / ; intentions : ([a-z0-9_, ]*)$/

/** Ajoute la ligne `retrait` d'une mission défaite (G2), ses intentions comprises. */
export function ecrireRetrait(
  racine: string,
  r: {
    date: string
    /** `<métier>/<id>` : la ligne d'index en tire le métier. */
    cle: string
    titre: string
    intentions: string[]
    motif: string
  },
  personnes: Designable[],
): void {
  ajouterIndex(
    racine,
    {
      date: r.date,
      metier: lireCle(r.cle).metier,
      sorte: 'retrait',
      cle: r.cle,
      titre: `${nettoyer(r.titre, personnes).replaceAll(';', ',')} ; intentions : ${r.intentions.join(', ')}`,
      issue: `retiré : ${nettoyer(r.motif, personnes)}`,
    },
    personnes,
  )
}

/** Les missions retirées (G2), tous métiers : jamais refaites, ni sous un autre nom ; une ligne dont la clé n'en est pas une est ignorée. */
export const missionsRetirees = (racine: string): MissionRetiree[] =>
  lireIndex(racine)
    .filter((e) => e.sorte === 'retrait' && estCle(e.cle))
    .map((e) => ({
      cle: e.cle,
      ...lireCle(e.cle),
      intentions: (INTENTIONS_RETRAIT.exec(e.titre)?.[1] ?? '')
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0),
    }))

/** La ligne de la mission dans la section « La mission » d'une entrée (`missionPourModele`). */
const INTENTIONS_MISSION = /^- intentions : (.*)$/m

/**
 * Ce que la mémoire garde d'une mission fusionnée, pour son retrait (G2) :
 * la dernière ligne `fusion` de l'index (date, titre) et les intentions de
 * son entrée ; undefined si la mémoire n'en a pas. Le client n'y est pas : il
 * se lit au registre de l'agence (`clientDuChantier`).
 */
export function missionFusionnee(
  racine: string,
  cle: string,
): { date: string; titre: string; intentions: string[] } | undefined {
  const e = lireIndex(racine)
    .filter((x) => x.sorte === 'fusion' && x.cle === cle)
    .at(-1)
  if (!e) return undefined
  const chemin = join(racine, cheminEntree(e.date, cle))
  const ligne = existsSync(chemin)
    ? INTENTIONS_MISSION.exec(readFileSync(chemin, 'utf8'))?.[1]
    : undefined
  if (ligne === undefined) return undefined
  return {
    date: e.date,
    titre: e.titre,
    intentions: [...ligne.matchAll(/`([^`]+)`/g)].flatMap((x) => (x[1] ? [x[1]] : [])),
  }
}

/** Ce que le plan d'un chantier lit de la mémoire (R10) : l'index sans la colonne du métier, les conventions, les chantiers de ce métier qui citent ses intentions. */
export function pourChantier(
  racine: string,
  mots: string[],
  indexLignes: number,
  metier: string,
): { index: string[]; conventions: string; chantiers: string[] } {
  return {
    index: lireIndex(racine)
      .slice(-indexLignes)
      .map((e) => [e.date, e.sorte, e.cle, e.titre, e.issue].join(SEP)),
    conventions: lireConventions(racine),
    chantiers: chantiersCitant(racine, mots, metier),
  }
}

/** Les entrées de chantier d'un métier qui citent l'un des mots (intentions, gestes) : ce que le plan relit (R10). */
export function chantiersCitant(racine: string, mots: string[], metier: string): string[] {
  const d = dossier(racine, DOSSIER_CHANTIERS_MEMOIRE, metier)
  if (!existsSync(d)) return []
  return readdirSync(d)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(join(d, f), 'utf8'))
    .filter((texte) => mots.some((m) => texte.includes(m)))
}
