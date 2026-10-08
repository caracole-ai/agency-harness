// Trouver la personne qu'une consigne désigne, sans que le modèle voie la
// liste des noms (REFLEXIONS.md, décidé le 2026-10-08). Le modèle rend la mention telle
// qu'écrite (« Aicha ») ; le code la compare aux personnes que le rôle peut
// désigner. Niveau 1 : une seule correspondance exacte, aux accents, à la
// casse, aux espaces et aux tirets près, décide. Niveau 2 : une liste courte
// de noms ressemblants, au seuil large, que le modèle départage ; elle ne
// décide jamais seule. Le reste (niveau 3) revient à l'humain.

/** Une personne que le rôle peut désigner : son identifiant et son nom complet. */
export interface Designable {
  id: string
  nom: string
}

/** Au plus ce nombre de candidats proposés au niveau 2. */
export const CANDIDATS_MAX = 3

/** Sans accents ni casse, les espaces et les tirets réduits à une espace. */
export const normaliserNom = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[\s\p{Pd}]+/gu, ' ')
    .trim()

/**
 * Les façons sûres d'écrire un nom : complet, le prénom seul, le nom seul, le
 * nom puis le prénom. La coupure prénom / nom tombe sur une espace du nom
 * tel qu'il est écrit dans les données (« Jean-Pierre » reste un prénom).
 */
export function formes(nom: string): string[] {
  const parties = nom.trim().split(/\s+/)
  const toutes = [parties.join(' ')]
  for (let k = 1; k < parties.length; k++) {
    const prenom = parties.slice(0, k).join(' ')
    const famille = parties.slice(k).join(' ')
    toutes.push(prenom, famille, `${famille} ${prenom}`)
  }
  return [...new Set(toutes.map(normaliserNom))]
}

/** Niveau 1 : les personnes que la mention désigne exactement (par une forme sûre, ou par l'identifiant écrit tel quel). */
export function correspondances<P extends Designable>(mention: string, personnes: P[]): P[] {
  const m = normaliserNom(mention)
  const id = mention.trim().toUpperCase()
  return personnes.filter((p) => p.id.toUpperCase() === id || formes(p.nom).includes(m))
}

/**
 * Une clé phonétique française simple : deux écritures qui se prononcent de
 * même (« Aisha », « Aïcha ») ont la même clé. Elle rapproche, elle ne décide
 * pas.
 */
export function clePhonetique(texte: string): string {
  const s = normaliserNom(texte)
    .replace(/[^a-z]/g, '')
    .replace(/sch|sh|ch/g, 'S')
    .replace(/ph/g, 'f')
    .replace(/gn/g, 'n')
    .replace(/qu|ck|q/g, 'k')
    .replace(/th/g, 't')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/h/g, '')
  const consonnes = s.charAt(0) + s.slice(1).replace(/[aeiou]/g, '')
  const sansDoubles = consonnes.replace(/(.)\1+/g, '$1')
  return sansDoubles.length > 1 ? sansDoubles.replace(/[dtsx]$/, '') : sansDoubles
}

/** La distance de Damerau-Levenshtein (transpositions adjacentes comprises) entre deux textes. */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  const at = (i: number, j: number) => d[i]?.[j] ?? Number.POSITIVE_INFINITY
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cout)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, at(i - 2, j - 2) + 1)
      }
      const ligne = d[i]
      if (ligne) ligne[j] = v
    }
  }
  return at(a.length, b.length)
}

/** Au niveau 2, chaque mot du nom compte aussi (« Jean » rapproche « Jean-Pierre »), sauf les mots de moins de 3 lettres. */
const formesLarges = (nom: string) => [
  ...new Set([
    ...formes(nom),
    ...normaliserNom(nom)
      .split(' ')
      .filter((mot) => mot.length >= 3),
  ]),
]

/** Le seuil de ressemblance, volontairement large : 2 lettres, ou 40 % de la forme comparée. */
const seuil = (forme: string) => Math.max(2, Math.ceil(forme.length * 0.4))

/**
 * Niveau 2 : les personnes dont un nom ressemble à la mention (même clé
 * phonétique, ou distance sous le seuil), les plus proches d'abord, au plus
 * `CANDIDATS_MAX`. Une liste vide : personne ne ressemble.
 */
export function proches<P extends Designable>(mention: string, personnes: P[]): P[] {
  const m = normaliserNom(mention)
  const cle = clePhonetique(m)
  return personnes
    .map((p) => {
      const scores = formesLarges(p.nom).map((f) => ({
        phonetique: cle !== '' && clePhonetique(f) === cle,
        distance: distance(m, f),
        seuil: seuil(f),
      }))
      const retenus = scores.filter((s) => s.phonetique || s.distance <= s.seuil)
      return {
        p,
        retenu: retenus.length > 0,
        phonetique: retenus.some((s) => s.phonetique),
        distance: Math.min(...scores.map((s) => s.distance)),
      }
    })
    .filter((x) => x.retenu)
    .sort(
      (x, y) =>
        Number(y.phonetique) - Number(x.phonetique) ||
        x.distance - y.distance ||
        x.p.nom.localeCompare(y.p.nom, 'fr'),
    )
    .slice(0, CANDIDATS_MAX)
    .map((x) => x.p)
}

const ORDINAUX: [RegExp, number][] = [
  [/^(1|1er|1re|1ere|premier|premiere)$/, 1],
  [/^(2|2e|2eme|deuxieme|second|seconde)$/, 2],
  [/^(3|3e|3eme|troisieme)$/, 3],
]

/**
 * La réponse à « vous parlez de qui ? » : un nom que le niveau 1 retrouve
 * parmi les candidats, ou leur rang (« 1 », « la première »). Rien d'autre :
 * une réponse qui ne désigne pas un seul candidat est une nouvelle consigne.
 */
export function choisirParmi<P extends Designable>(reponse: string, candidats: P[]): P | undefined {
  const exacts = correspondances(reponse, candidats)
  if (exacts.length === 1) return exacts[0]
  const mot = normaliserNom(reponse)
    .replace(/^(le|la|l')\s*/, '')
    .replace(/[.!]+$/, '')
    .trim()
  const rang = ORDINAUX.find(([forme]) => forme.test(mot))?.[1]
  return rang === undefined ? undefined : candidats[rang - 1]
}
