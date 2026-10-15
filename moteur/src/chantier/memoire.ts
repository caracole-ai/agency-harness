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
import type { Temporal } from '../temps/temporal'

// La mémoire de la nuit, dans le dépôt (PLAN-RONDE.md R10, PLAN-GENERAL.md
// décision 2) : `memoire/INDEX.md` (une ligne par événement), `rondes/`,
// `chantiers/`, `CONVENTIONS.md` (on y ajoute, on n'en retire jamais),
// `MESURES.md` (une ligne par nuit). Écrite par le code ; le texte libre d'un
// modèle y passe nettoyé. Rien n'y entre qui porte un nom de salarié, un
// identifiant de personne, de conversation ou d'échappée : ceux-là restent
// chez le client. Une écriture qui en porterait un lève, rien n'est écrit.

export const DOSSIER_MEMOIRE = 'memoire'
export const FICHIER_INDEX = 'INDEX.md'
export const FICHIER_CONVENTIONS = 'CONVENTIONS.md'
export const FICHIER_MESURES = 'MESURES.md'
export const DOSSIER_RONDES_MEMOIRE = 'rondes'
export const DOSSIER_CHANTIERS_MEMOIRE = 'chantiers'

/** Ce que la mémoire raconte (R10). */
export const SORTES_MEMOIRE = [
  'ronde',
  'chantier',
  'fusion',
  'refus',
  'retrait',
  'mise à jour',
] as const
export type SorteMemoire = (typeof SORTES_MEMOIRE)[number]

/** « ce que j'ai appris » : au plus tant de lignes (R10). */
export const APPRIS_LIGNES_MAX = 20

/** Le séparateur des colonnes d'une ligne de l'index. */
const SEP = ' · '

export interface EvenementMemoire {
  /** AAAA-MM-JJ */
  date: string
  client: string
  sorte: SorteMemoire
  /** La date d'une ronde, l'identifiant (slug) d'une mission. */
  id: string
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
  return `- ${[e.date, e.client, e.sorte, e.id, e.titre, e.issue, e.cout ? coutEcrit(e.cout) : '—']
    .map(colonne)
    .join(SEP)}`
}

const dossier = (racine: string, ...sous: string[]) => join(racine, DOSSIER_MEMOIRE, ...sous)

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
      const [date, client, sorte, id, titre, issue] = l.slice(2).split(SEP)
      if (!date || !client || !id || !SORTES_MEMOIRE.includes(sorte as SorteMemoire)) return []
      return [
        { date, client, sorte: sorte as SorteMemoire, id, titre: titre ?? '', issue: issue ?? '' },
      ]
    })
}

/** Ce que la ronde d'un jour retient pour la mémoire : des missions, par slug et par types ; rien de ce qui est chez le client. */
export interface RondeMemoire {
  date: string
  client: string
  missions: {
    id: string
    sorte: string
    /** Texte du modèle : nettoyé avant d'entrer. */
    titre: string
    intentions: string[]
    /** `à faire`, `écartée`, `question pour l'atelier`… */
    statut: string
    /** Écrite par le code. */
    raison?: string
  }[]
  /** `faite`, `rien à signaler`, `rapport refusé : …`, `échouée : …` */
  issue: string
  cout?: { usd: number; estime: boolean }
}

/** Écrit `memoire/rondes/<date>-<client>.md` (remplacé si la ronde est refaite) et sa ligne d'index ; rend le chemin. */
export function ecrireRonde(racine: string, r: RondeMemoire, personnes: Designable[]): string {
  const missions = r.missions.map(
    (m) =>
      `- \`${m.id}\` (${m.sorte}) : ${nettoyer(m.titre, personnes)} ; intentions : ${
        m.intentions.length > 0 ? m.intentions.join(', ') : 'aucune'
      } ; ${m.statut}${m.raison ? ` (${m.raison})` : ''}`,
  )
  const contenu = [
    `# Ronde du ${r.date} — ${r.client}`,
    '',
    `Issue : ${r.issue}${r.cout ? ` ; coût : ${coutEcrit(r.cout)}` : ''}.`,
    '',
    '## Missions',
    '',
    ...(missions.length > 0 ? missions : ['Aucune.']),
    '',
  ].join('\n')
  exigerPropre(contenu, personnes, 'la ronde')
  const chemin = dossier(racine, DOSSIER_RONDES_MEMOIRE, `${r.date}-${slugClient(r.client)}.md`)
  mkdirSync(join(chemin, '..'), { recursive: true })
  writeFileSync(chemin, contenu)
  const retenues = r.missions.filter((m) => m.statut !== 'écartée').length
  ajouterIndex(
    racine,
    {
      date: r.date,
      client: r.client,
      sorte: 'ronde',
      id: r.date,
      titre: `${r.missions.length} mission(s) proposée(s), ${retenues} retenue(s)`,
      issue: r.issue,
      ...(r.cout ? { cout: r.cout } : {}),
    },
    personnes,
  )
  return chemin
}

/** Ce qu'un chantier laisse à la mémoire (R10) ; écrit au lot 2. */
export interface ChantierMemoire {
  date: string
  client: string
  id: string
  titre: string
  /** Mission, plan, fichiers touchés, tests, constats, raison de la fusion ou du refus : écrits par le code. */
  sections: { titre: string; texte: string }[]
  /** « Ce que j'ai appris », du modèle d'implémentation : nettoyé ligne à ligne, borné à APPRIS_LIGNES_MAX. */
  appris: string
  sorte: Extract<SorteMemoire, 'chantier' | 'fusion' | 'refus'>
  issue: string
  cout?: { usd: number; estime: boolean }
}

/** Écrit `memoire/chantiers/<date>-<id>.md` et sa ligne d'index ; rend le chemin. */
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
    `# Chantier ${c.id} — ${c.date}`,
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
  const chemin = dossier(racine, DOSSIER_CHANTIERS_MEMOIRE, `${c.date}-${c.id}.md`)
  mkdirSync(join(chemin, '..'), { recursive: true })
  writeFileSync(chemin, contenu)
  ajouterIndex(
    racine,
    {
      date: c.date,
      client: c.client,
      sorte: c.sorte,
      id: c.id,
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

/** Ajoute la ligne d'une nuit à `MESURES.md` : des comptes, écrits par le code. */
export function ajouterMesure(
  racine: string,
  date: string,
  client: string,
  comptes: Record<string, number | string>,
  personnes: Designable[],
): void {
  const ligne = `- ${date}${SEP}${colonne(client)}${SEP}${Object.entries(comptes)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')}`
  exigerPropre(ligne, personnes, 'la mesure')
  ajouter(dossier(racine, FICHIER_MESURES), ligne)
}

/** Les lignes de `MESURES.md` : la date et le client de chaque nuit. */
export function lireMesures(racine: string): { date: string; client: string }[] {
  const chemin = dossier(racine, FICHIER_MESURES)
  if (!existsSync(chemin)) return []
  return readFileSync(chemin, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('- ') && l.includes(SEP))
    .map((l) => {
      const [date = '', client = ''] = l.slice(2).split(SEP)
      return { date, client }
    })
}

/** `CONVENTIONS.md`, tel quel (vide s'il n'existe pas). */
export function lireConventions(racine: string): string {
  const chemin = dossier(racine, FICHIER_CONVENTIONS)
  return existsSync(chemin) ? readFileSync(chemin, 'utf8') : ''
}

/** Une mission retirée (G2) : son identifiant et ses intentions, car la ronde donne au même travail un autre nom d'une nuit à l'autre. */
export interface MissionRetiree {
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
    client: string
    id: string
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
      client: r.client,
      sorte: 'retrait',
      id: r.id,
      titre: `${nettoyer(r.titre, personnes).replaceAll(';', ',')} ; intentions : ${r.intentions.join(', ')}`,
      issue: `retiré : ${nettoyer(r.motif, personnes)}`,
    },
    personnes,
  )
}

/** Les missions retirées (G2) : la ronde ne les repropose jamais, ni sous un autre nom. */
export const missionsRetirees = (racine: string): MissionRetiree[] =>
  lireIndex(racine)
    .filter((e) => e.sorte === 'retrait')
    .map((e) => ({
      id: e.id,
      intentions: (INTENTIONS_RETRAIT.exec(e.titre)?.[1] ?? '')
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0),
    }))

/** Ce que la ronde lit de la mémoire (R10), pour un client : sans le nom d'aucun client. */
export interface MemoirePourRonde {
  /** Les dernières lignes de l'index de ce client avant aujourd'hui, sans la colonne du client. */
  index: string[]
  conventions: string
  /** Les rondes de ce client des derniers jours, avant aujourd'hui. */
  rondes: string[]
  retirees: MissionRetiree[]
}

export function pourRonde(
  racine: string,
  client: string,
  aujourdhui: Temporal.PlainDate,
  bornes: { index_lignes: number; rondes_jours: number },
): MemoirePourRonde {
  // Ce qui s'est passé avant aujourd'hui : une ronde refaite ne relit pas ses passes du jour.
  const index = lireIndex(racine)
    .filter((e) => e.client === colonne(client) && e.date < aujourdhui.toString())
    .slice(-bornes.index_lignes)
    .map((e) => [e.date, e.sorte, e.id, e.titre, e.issue].join(SEP))
  const slug = slugClient(client)
  const depuis = aujourdhui.subtract({ days: bornes.rondes_jours }).toString()
  const avant = aujourdhui.toString()
  const dossierRondes = dossier(racine, DOSSIER_RONDES_MEMOIRE)
  const rondes = existsSync(dossierRondes)
    ? readdirSync(dossierRondes)
        .filter((f) => f.endsWith(`-${slug}.md`))
        .filter((f) => {
          const date = f.slice(0, 10)
          return date >= depuis && date < avant
        })
        .sort()
        .map((f) =>
          readFileSync(join(dossierRondes, f), 'utf8')
            // Le titre porte le nom du client : la ronde ne le reçoit pas (R2).
            .replace(/^# Ronde du (\S+) — .*$/m, '# Ronde du $1'),
        )
    : []
  return {
    index,
    conventions: lireConventions(racine),
    rondes,
    retirees: missionsRetirees(racine),
  }
}

/** Ce que le plan d'un chantier lit de la mémoire (R10) : l'index sans la colonne du client, les conventions, les chantiers qui citent ses intentions. */
export function pourChantier(
  racine: string,
  mots: string[],
  indexLignes: number,
): { index: string[]; conventions: string; chantiers: string[] } {
  return {
    index: lireIndex(racine)
      .slice(-indexLignes)
      .map((e) => [e.date, e.sorte, e.id, e.titre, e.issue].join(SEP)),
    conventions: lireConventions(racine),
    chantiers: chantiersCitant(racine, mots),
  }
}

/** Les entrées de chantier qui citent l'un des mots (intentions, gestes) : ce que le plan relit (R10). */
export function chantiersCitant(racine: string, mots: string[]): string[] {
  const d = dossier(racine, DOSSIER_CHANTIERS_MEMOIRE)
  if (!existsSync(d)) return []
  return readdirSync(d)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(join(d, f), 'utf8'))
    .filter((texte) => mots.some((m) => texte.includes(m)))
}
