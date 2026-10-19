import { APOSTROPHES, type Designable, formes, proches } from '../conversation/designation'
import type { TableCopie } from './copie'

// Les pseudonymes (PLAN-PSEUDONYMES.md § 4) : le fournisseur ne reçoit jamais
// le nom d'un salarié. L'identifiant (`A-7`) tient lieu de nom dans ce qui part
// au modèle ; le code le remplace par le nom dans ce qui est montré ; une fuite
// se mesure en code. Fonctions pures : ni disque ni journal. Les formes d'un
// nom sont celles de `designation.ts` (prénom, nom, les deux, à l'endroit et à
// l'envers ; accents, casse, espaces et tirets près), au mot près.

/** Une personne et les façons de l'écrire, normalisées comme `normaliserNom`. */
export interface FormesPersonne {
  id: string
  formes: string[]
}

/** Une forme de moins de trois lettres (« Al ») ne se cherche pas : elle masquerait « al ». */
const LETTRES_MIN = 3

const lettres = (forme: string) => (forme.match(/\p{L}/gu) ?? []).length

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Les formes de chaque personne, sans celles de moins de trois lettres. */
export function formesConnues(personnes: Designable[]): FormesPersonne[] {
  return personnes.map((p) => ({
    id: p.id,
    formes: formes(p.nom).filter((f) => lettres(f) >= LETTRES_MIN),
  }))
}

/**
 * Un texte normalisé comme `normaliserNom` (sans le `trim`), chaque caractère
 * relié à sa plage dans l'original : on cherche dans l'un, on remplace dans
 * l'autre.
 */
function suivre(texte: string): { normal: string; debut: number[]; fin: number[] } {
  let normal = ''
  const debut: number[] = []
  const fin: number[] = []
  for (const m of texte.matchAll(/\P{M}\p{M}*|\p{M}+/gu)) {
    const n = m[0]
      .normalize('NFKD')
      .replace(/[\p{M}\p{Cf}]/gu, '')
      .toLowerCase()
      .replace(APOSTROPHES, "'")
      .replace(/[\s\p{Pd}]/gu, ' ')
    const bout = m.index + m[0].length
    for (const c of n) {
      if (c === ' ' && normal.endsWith(' ')) {
        fin[fin.length - 1] = bout
        continue
      }
      for (let k = 0; k < c.length; k++) {
        debut.push(m.index)
        fin.push(bout)
      }
      normal += c
    }
  }
  return { normal, debut, fin }
}

interface Forme {
  forme: string
  /** Les personnes qui s'écrivent ainsi : une seule, la forme se masque ; plusieurs, elle reste. */
  ids: string[]
  motif: RegExp
}

/** Chaque forme connue, une fois, avec ses personnes et son motif au mot près ; les plus longues d'abord. */
function compiler(personnes: Designable[]): Forme[] {
  const parForme = new Map<string, Set<string>>()
  for (const p of formesConnues(personnes)) {
    for (const f of p.formes) parForme.set(f, (parForme.get(f) ?? new Set()).add(p.id))
  }
  return [...parForme]
    .map(([forme, ids]) => ({
      forme,
      ids: [...ids],
      motif: new RegExp(`(?<![\\p{L}\\p{N}])${echapper(forme)}(?![\\p{L}\\p{N}])`, 'gu'),
    }))
    .sort((a, b) => b.forme.length - a.forme.length)
}

interface Trouvee {
  debut: number
  fin: number
  forme: Forme
}

/** Les formes trouvées dans le texte, sans chevauchement (la plus longue l'emporte), dans l'ordre du texte. */
function trouver(texte: string, compilees: Forme[]): Trouvee[] {
  const s = suivre(texte)
  const prises: Trouvee[] = []
  for (const forme of compilees) {
    for (const m of s.normal.matchAll(forme.motif)) {
      const debut = s.debut[m.index]
      const fin = s.fin[m.index + m[0].length - 1]
      if (debut === undefined || fin === undefined) continue
      if (prises.some((p) => debut < p.fin && p.debut < fin)) continue
      prises.push({ debut, fin, forme })
    }
  }
  return prises.sort((a, b) => a.debut - b.debut)
}

function masquerAvec(texte: string, compilees: Forme[]): string {
  let sortie = texte
  for (const t of trouver(texte, compilees).reverse()) {
    const [id] = t.forme.ids
    if (t.forme.ids.length !== 1 || id === undefined) continue
    sortie = sortie.slice(0, t.debut) + id + sortie.slice(t.fin)
  }
  return sortie
}

/**
 * Remplace chaque forme connue d'un nom par l'identifiant de la personne, au
 * mot près, la plus longue d'abord (« Karim Haddad » avant « Karim »). Une
 * forme que deux personnes partagent (un prénom) reste telle quelle : elle ne
 * désigne pas une seule personne, et `fuites` la signale. Idempotent.
 */
export function masquerTexte(texte: string, personnes: Designable[]): string {
  return masquerAvec(texte, compiler(personnes))
}

/** Les formes connues trouvées dans le texte, telles qu'écrites : vide, pas de fuite. */
function fuitesAvec(texte: string, compilees: Forme[]): string[] {
  return [...new Set(trouver(texte, compilees).map((t) => texte.slice(t.debut, t.fin)))]
}

/** Les formes connues d'un nom trouvées dans un texte, telles qu'écrites (partagées comprises) ; vide : pas de fuite. */
export function fuites(texte: string, personnes: Designable[]): string[] {
  return fuitesAvec(texte, compiler(personnes))
}

/**
 * La copie masquée : chaque cellule `TEXT` de chaque table passe
 * `masquerTexte`. Une colonne qui porte le nom d'une personne (`masquee`)
 * prend sa description masquée, et chacune de ses cellules doit devenir un
 * identifiant : sinon (deux personnes au même nom complet, un nom de moins de
 * trois lettres) tout s'arrête, rien ne part. Ne modifie pas l'entrée.
 */
export function masquerTables(tables: TableCopie[], personnes: Designable[]): TableCopie[] {
  const compilees = compiler(personnes)
  const ids = new Set(personnes.map((p) => p.id))
  return tables.map((table) => {
    const textes = table.colonnes.filter((c) => c.type === 'TEXT')
    return {
      ...table,
      colonnes: table.colonnes.map((c) =>
        c.masquee === undefined ? { ...c } : { ...c, description: c.masquee },
      ),
      lignes: table.lignes.map((ligne) => {
        const masquee = { ...ligne }
        for (const c of textes) {
          const v = ligne[c.nom]
          if (typeof v !== 'string') continue
          const m = masquerAvec(v, compilees)
          if (c.masquee !== undefined && !ids.has(m)) {
            throw new Error(
              `copie : la colonne ${table.nom}.${c.nom} garde un nom après le masque (deux personnes au même nom ?)`,
            )
          }
          masquee[c.nom] = m
        }
        return masquee
      }),
    }
  })
}

/**
 * Remplace chaque identifiant connu (au mot près : `A-7`, pas `A-71`) par le
 * nom complet de la personne. Un identifiant inconnu reste tel quel.
 */
export function restituer(texte: string, personnes: Designable[]): string {
  const parId = new Map(personnes.map((p) => [p.id, p.nom]))
  if (parId.size === 0) return texte
  const ids = [...parId.keys()]
    .sort((a, b) => b.length - a.length)
    .map(echapper)
    .join('|')
  return texte.replace(
    new RegExp(`(?<![\\p{L}\\p{N}-])(?:${ids})(?![\\p{N}]|-[\\p{L}\\p{N}])`, 'gu'),
    (id) => parId.get(id) ?? id,
  )
}

/** La réponse à « vous parlez de qui ? » avant une échappée : la mention telle qu'écrite, et la personne choisie. */
export interface Precision {
  mention: string
  id: string
}

/** Une suite de mots à majuscule initiale (« Kareem », « Kareem Hadad ») : ce qui peut être un nom mal écrit. */
const MOTS_A_MAJUSCULE = /(?<![\p{L}\p{N}])\p{Lu}[\p{Ll}\p{M}]+(?:[ -]\p{Lu}[\p{Ll}\p{M}]+)*/gu

/** Un mot seul en tête de phrase plus court ne se compare pas : « Le », « La », « Ce » sonnent comme « Léa ». */
const LETTRES_EN_TETE = 4

/** Le texte avant une position finit une phrase (ou il n'y a rien avant). */
const debutDePhrase = (texte: string, position: number) =>
  /^$|[.!?…:;]$/u.test(texte.slice(0, position).replace(/[\s«"“(]+$/u, ''))

/** Une mention à faire préciser : où elle est dans le texte, telle qu'écrite, et qui elle peut désigner. */
interface APreciser {
  debut: number
  fin: number
  mention: string
  candidats: Designable[]
}

/**
 * Les mentions qu'un texte (déjà masqué de ses formes sûres) laisse à
 * préciser : d'abord chaque forme que plusieurs personnes partagent (un
 * prénom), puis chaque mot à majuscule initiale qui ressemble à un nom
 * (`proches`). Un mot seul en tête de phrase peut être un mot de la langue
 * (« Parmi » ressemble à « Karim ») : il n'est retenu que s'il a quatre lettres
 * au moins, et s'il sonne **et** s'écrit presque comme un nom (« Aisha »,
 * `proches` exigeant).
 */
function aPreciser(texte: string, compilees: Forme[], personnes: Designable[]): APreciser[] {
  const partagees = trouver(texte, compilees)
    .filter((t) => t.forme.ids.length > 1)
    .map((t) => ({
      debut: t.debut,
      fin: t.fin,
      mention: texte.slice(t.debut, t.fin),
      candidats: personnes.filter((p) => t.forme.ids.includes(p.id)),
    }))
  const ressemblants = [...texte.matchAll(MOTS_A_MAJUSCULE)].flatMap((m) => {
    if (partagees.some((p) => m.index < p.fin && p.debut < m.index + m[0].length)) return []
    const enTete = !m[0].includes(' ') && !m[0].includes('-') && debutDePhrase(texte, m.index)
    if (enTete && lettres(m[0]) < LETTRES_EN_TETE) return []
    const candidats = proches(m[0], personnes, enTete)
    return candidats.length > 0
      ? [{ debut: m.index, fin: m.index + m[0].length, mention: m[0], candidats }]
      : []
  })
  return [...partagees, ...ressemblants]
}

/**
 * La consigne telle qu'elle part à l'échappée (S3) : chaque forme sûre d'un
 * nom (niveau 1), puis les précisions déjà données (la mention, là où le
 * masque l'a laissée) remplacées par leur identifiant. Rend aussi, s'il y en a une, la première mention à faire
 * préciser avant tout appel (`aPreciser`). Le reste passe tel quel.
 */
export function masquerConsigne(
  consigne: string,
  personnes: Designable[],
  precisions: Precision[] = [],
): { texte: string; precision?: { mention: string; candidats: Designable[] } } {
  const compilees = compiler(personnes)
  let texte = masquerAvec(consigne, compilees)
  for (const p of precisions) {
    const motif = new RegExp(`(?<![\\p{L}\\p{N}])${echapper(p.mention)}(?![\\p{L}\\p{N}])`, 'gu')
    texte = texte.replace(motif, p.id)
  }
  const [premiere] = aPreciser(texte, compilees, personnes)
  return premiere
    ? { texte, precision: { mention: premiere.mention, candidats: premiere.candidats } }
    : { texte }
}

/** La consigne telle qu'elle part à la traduction, et de quoi reprendre chaque mention masquée : remplaçant → mention telle qu'écrite. */
export interface ConsigneMasquee {
  texte: string
  mentions: Map<string, string>
}

/** Le jeton d'une mention à préciser : il ne désigne personne, le code la reprend après l'appel. */
const jeton = (n: number) => `NOM-${n}`

/**
 * La consigne telle qu'elle part à la traduction, le premier appel : chaque
 * forme sûre d'un nom devient l'identifiant de la personne ; chaque mention à
 * préciser (`aPreciser` : un prénom partagé, un mot qui ressemble à un nom)
 * devient un jeton, `NOM-1`, le même pour la même mention. Rien n'est
 * demandé ici : `reprendreMentions` rend au code la mention telle qu'écrite,
 * qui se résout ou se fait préciser comme avant. Échec fermé : une forme
 * connue qui resterait lève, et rien ne part.
 */
export function masquerPourModele(consigne: string, personnes: Designable[]): ConsigneMasquee {
  const compilees = compiler(personnes)
  const mentions = new Map<string, string>()
  const remplacer = (texte: string, plages: { debut: number; fin: number; par: string }[]) => {
    let sortie = texte
    for (const p of [...plages].sort((a, b) => b.debut - a.debut)) {
      if (!mentions.has(p.par)) mentions.set(p.par, texte.slice(p.debut, p.fin))
      sortie = sortie.slice(0, p.debut) + p.par + sortie.slice(p.fin)
    }
    return sortie
  }
  const sures = trouver(consigne, compilees).flatMap((t) => {
    const [id] = t.forme.ids
    return t.forme.ids.length === 1 && id !== undefined
      ? [{ debut: t.debut, fin: t.fin, par: id }]
      : []
  })
  const texte = remplacer(consigne, sures)
  const parMention = new Map<string, string>()
  const aJeton = aPreciser(texte, compilees, personnes).map((a) => {
    const cle = a.mention.toLowerCase()
    const par = parMention.get(cle) ?? jeton(parMention.size + 1)
    parMention.set(cle, par)
    return { debut: a.debut, fin: a.fin, par }
  })
  const masque = remplacer(texte, aJeton)
  const restees = fuites(masque, personnes)
  if (restees.length > 0) {
    throw new Error(`masque : ${restees.length} forme(s) d'un nom resteraient dans la consigne`)
  }
  return { texte: masque, mentions }
}

/**
 * Rend à chaque remplaçant (identifiant ou jeton) de `masquerPourModele` la
 * mention telle qu'écrite, dans chaque chaîne d'une valeur (les paramètres
 * d'une demande traduite), au mot près. Un jeton se reconnaît malgré la casse
 * et le séparateur (`nom-1`, `NOM 1`, `NOM_1`) ; un identifiant tapé par le
 * demandeur, absent de la table, reste tel quel.
 */
export function reprendreMentions<T>(valeur: T, mentions: Map<string, string>): T {
  if (mentions.size === 0) return valeur
  const motifs = [...mentions].map(([par, mention]) => {
    const jetonNumero = /^NOM-(\d+)$/.exec(par)?.[1]
    const corps = jetonNumero !== undefined ? `NOM[\\s_-]?${jetonNumero}` : echapper(par)
    return {
      motif: new RegExp(
        `(?<![\\p{L}\\p{N}-])${corps}(?![\\p{N}]|-[\\p{L}\\p{N}])`,
        jetonNumero !== undefined ? 'giu' : 'gu',
      ),
      mention,
    }
  })
  const reprendre = (v: unknown): unknown => {
    if (typeof v === 'string')
      return motifs.reduce((t, m) => t.replace(m.motif, () => m.mention), v)
    if (Array.isArray(v)) return v.map(reprendre)
    if (v !== null && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, reprendre(x)]))
    }
    return v
  }
  return reprendre(valeur) as T
}
