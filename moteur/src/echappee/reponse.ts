// Le contrôle de la réponse de l'échappée : le modèle ne calcule rien de tête.
// Chaque nombre, chaque date et chaque nom connu que cite sa réponse doit se
// retrouver dans les sorties d'outils de cette échappée ; sinon, le code
// retire son résumé (PLAN-ESPACES.md § 6.6). Les dates que le harnais lui-même
// a dites au modèle (le jour, les bornes de la semaine) se citent comme dates
// et par leur année, jamais comme nombres : « 10 » ne devient pas citable
// parce qu'on est en octobre (evals/erreurs-2026-10-08.md, passes 5 et 6).

/** `JJ/MM` ou `JJ/MM/AAAA`, isolée des autres chiffres et barres obliques. */
const DATE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])/g
/** `AAAA-MM-JJ`, isolée des autres chiffres et tirets (une heure peut suivre : `2026-10-11T08:00`). */
const DATE_ISO = /(?<![\d-])\d{4}-\d{2}-\d{2}(?![\d-])/g
const NOMBRE = /\d+(?:[.,]\d+)?/g
const MOT = /[\p{L}\p{M}\p{N}]+/gu
const MOT_DE_NOM = /^\p{L}{3,}$/u

interface Intrus {
  position: number
  texte: string
}

/** Sans accents ni casse. */
function normaliser(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Le nombre apparaît dans les sources comme nombre entier, pas comme fragment d'un autre. */
function nombreTrouve(sources: string, ecritures: string[]): boolean {
  return ecritures.some((e) => new RegExp(`(?<!\\d)${echapper(e)}(?!\\d)`).test(sources))
}

/** Les mots se suivent dans les sources (déjà normalisées), sur mots entiers. */
function motsTrouves(sources: string, mots: string[]): boolean {
  const suite = mots.map(echapper).join('[^\\p{L}\\p{N}]+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${suite}(?![\\p{L}\\p{N}])`, 'u').test(sources)
}

interface DateEcrite {
  position: number
  fin: number
  ecrite: string
  /** `AAAA-MM-JJ`, ou `-MM-JJ` quand l'année manque. */
  iso: string
}

/** Les dates écrites dans un texte, ISO ou `JJ/MM[/AAAA]`, avec leur plage. */
function datesDe(texte: string): DateEcrite[] {
  const dates: DateEcrite[] = []
  for (const m of texte.matchAll(DATE_ISO)) {
    dates.push({ position: m.index, fin: m.index + m[0].length, ecrite: m[0], iso: m[0] })
  }
  for (const m of texte.matchAll(DATE)) {
    const [ecrite, jour = '', mois = '', annee] = m
    if (Number(mois) < 1 || Number(mois) > 12 || Number(jour) < 1 || Number(jour) > 31) continue
    dates.push({
      position: m.index,
      fin: m.index + ecrite.length,
      ecrite,
      iso: `${annee ?? ''}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`,
    })
  }
  return dates
}

/** Les nombres d'un texte qui ne font pas partie d'une date, tels qu'écrits. */
function nombresHorsDates(texte: string, dates: DateEcrite[]): RegExpExecArray[] {
  return [...texte.matchAll(NOMBRE)].filter(
    (m) => !dates.some((d) => m.index >= d.position && m.index < d.fin),
  )
}

function datesEtNombres(
  texte: string,
  sources: string,
  datesConnues: string[],
  intrus: Intrus[],
): void {
  const connues = datesConnues.join('\n')
  const dateTrouvee = (iso: string) => sources.includes(iso) || connues.includes(iso)
  /** L'année d'une date connue n'est pas une quantité : elle se cite. */
  const annees = datesConnues.map((d) => d.slice(0, 4))
  const dates = datesDe(texte)
  for (const d of dates) {
    if (!dateTrouvee(d.iso)) intrus.push({ position: d.position, texte: d.ecrite })
  }
  for (const m of nombresHorsDates(texte, dates)) {
    const point = m[0].replace(',', '.')
    if (annees.includes(point)) continue
    if (!nombreTrouve(sources, [point, point.replace('.', ',')])) {
      intrus.push({ position: m.index, texte: m[0] })
    }
  }
}

function noms(texte: string, sources: string, nomsConnus: string[], intrus: Intrus[]): void {
  const motsDuTexte = [...texte.matchAll(MOT)].map((m) => ({
    position: m.index,
    fin: m.index + m[0].length,
    normal: normaliser(m[0]),
  }))
  for (const nom of nomsConnus) {
    const mots = [...nom.matchAll(MOT)].map((m) => normaliser(m[0]))
    const longs = mots.filter((mot) => MOT_DE_NOM.test(mot))
    if (longs.length > 0) {
      // Chaque mot du nom (prénom, nom de famille) cité dans le texte se cherche seul.
      for (const cite of motsDuTexte.filter((m) => longs.includes(m.normal))) {
        if (!motsTrouves(sources, [cite.normal])) {
          intrus.push({ position: cite.position, texte: texte.slice(cite.position, cite.fin) })
        }
      }
      continue
    }
    // Un nom sans mot de 3 lettres (un identifiant) n'est cité qu'en entier.
    if (mots.length === 0) continue
    for (let i = 0; i + mots.length <= motsDuTexte.length; i++) {
      const suite = motsDuTexte.slice(i, i + mots.length)
      const [premier] = suite
      const dernier = suite.at(-1)
      if (!premier || !dernier || suite.some((m, j) => m.normal !== mots[j])) continue
      if (!motsTrouves(sources, mots)) {
        intrus.push({
          position: premier.position,
          texte: texte.slice(premier.position, dernier.fin),
        })
      }
    }
  }
}

/**
 * Chaque nombre du texte et chaque nom connu cité doivent apparaître dans les sources
 * (les sorties d'outils de cette échappée) ; une date peut aussi venir de `datesConnues`,
 * les dates ISO que le harnais a dites au modèle.
 */
export function verifierReponse(
  texte: string,
  sources: string[],
  nomsConnus: string[],
  datesConnues: string[] = [],
): { ok: true } | { ok: false; intrus: string[] } {
  const brutes = sources.join('\n')
  const intrus: Intrus[] = []
  datesEtNombres(texte, brutes, datesConnues, intrus)
  noms(texte, normaliser(brutes), nomsConnus, intrus)
  if (intrus.length === 0) return { ok: true }
  const ordonnes = intrus.sort((a, b) => a.position - b.position).map((i) => i.texte)
  return { ok: false, intrus: [...new Set(ordonnes)] }
}

/** Ce qui n'est pas une quantité : un identifiant (`V-04`, `A-11`, `D-V-17`), une date avec son heure, une heure (`20:00`, `8h30`), une année (`2026`), un jour écrit avec son zéro (`le 07`). */
const NON_QUANTITES =
  /\b[A-Z]+(?:-[A-Z]+)*-\d+\b|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|\b\d{1,2}:\d{2}\b|\b\d{1,2}h(?:\d{2})?\b|\b(?:19|20)\d{2}\b|\b0\d+\b/g

/** Les plages d'un texte qui ne sont pas des quantités : dates, heures, identifiants, années. */
function nonQuantites(texte: string): DateEcrite[] {
  return [
    ...datesDe(texte),
    ...[...texte.matchAll(NON_QUANTITES)].map((m) => ({
      position: m.index,
      fin: m.index + m[0].length,
      ecrite: m[0],
      iso: '',
    })),
  ]
}

/**
 * Ce qu'un texte cite et qu'un rejeu doit reproduire (PLAN-PROMOTION.md § 6.2) :
 * ses nombres, tels qu'écrits, hors dates, heures et identifiants, et les mots
 * d'au moins trois lettres des noms connus qu'il cite. Les dates n'en sont
 * pas : elles sont des paramètres, ou dites par le harnais, et un gabarit les
 * rend à sa façon ; un identifiant, une heure, une année, un jour écrit avec
 * son zéro ne sont pas des quantités (vu sur les réponses de GLM, passe 14).
 */
export function citations(texte: string, nomsConnus: string[]): string[] {
  const nombres = nombresHorsDates(texte, nonQuantites(texte)).map((m) => m[0])
  const longs = new Set(
    nomsConnus.flatMap((nom) =>
      [...nom.matchAll(MOT)].map((m) => normaliser(m[0])).filter((mot) => MOT_DE_NOM.test(mot)),
    ),
  )
  const noms = [...texte.matchAll(MOT)].map((m) => m[0]).filter((mot) => longs.has(normaliser(mot)))
  return [...new Set([...nombres, ...noms])]
}

/**
 * Un mot attendu se cherche tel quel, sans accents ni casse ; un nombre se
 * cherche entier (« 4 » n'est pas dans « V-14 », « 16 » pas dans « 16,5 »),
 * hors des plages qui ne sont pas des quantités, comme `citations` (« 11 »
 * n'est pas dans « 2026-10-11 »).
 */
export function contient(texte: string, mot: string): boolean {
  const m = normaliser(mot)
  if (!/^\d+(?:[.,]\d+)?$/.test(m)) return normaliser(texte).includes(m)
  let masque = texte
  for (const p of nonQuantites(texte)) {
    masque = masque.slice(0, p.position) + ' '.repeat(p.fin - p.position) + masque.slice(p.fin)
  }
  const t = normaliser(masque)
  return new RegExp(`(?<![\\d.,])${m.replace(/[.,]/, '[.,]')}(?![\\d]|[.,]\\d)`).test(t)
}
