// Le contrôle de la réponse de l'échappée : le modèle ne calcule rien de tête.
// Chaque nombre, chaque date et chaque nom connu que cite sa réponse doit se
// retrouver dans les sorties d'outils de cette échappée ; sinon, le code
// retire son résumé (PLAN-ESPACES.md § 6.6).

/** `JJ/MM` ou `JJ/MM/AAAA`, isolée des autres chiffres et barres obliques. */
const DATE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])/g
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

function datesEtNombres(texte: string, sources: string, intrus: Intrus[]): void {
  const masquees: [number, number][] = []
  for (const m of texte.matchAll(DATE)) {
    const [ecrite, jour = '', mois = '', annee] = m
    if (Number(mois) < 1 || Number(mois) > 12 || Number(jour) < 1 || Number(jour) > 31) continue
    const iso = `${annee ?? ''}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
    masquees.push([m.index, m.index + ecrite.length])
    if (!sources.includes(iso)) intrus.push({ position: m.index, texte: ecrite })
  }
  for (const m of texte.matchAll(NOMBRE)) {
    if (masquees.some(([debut, fin]) => m.index >= debut && m.index < fin)) continue
    const point = m[0].replace(',', '.')
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

/** Chaque nombre du texte et chaque nom connu cité doivent apparaître dans les sources (les sorties d'outils de cette échappée). */
export function verifierReponse(
  texte: string,
  sources: string[],
  nomsConnus: string[],
): { ok: true } | { ok: false; intrus: string[] } {
  const brutes = sources.join('\n')
  const intrus: Intrus[] = []
  datesEtNombres(texte, brutes, intrus)
  noms(texte, normaliser(brutes), nomsConnus, intrus)
  if (intrus.length === 0) return { ok: true }
  const ordonnes = intrus.sort((a, b) => a.position - b.position).map((i) => i.texte)
  return { ok: false, intrus: [...new Set(ordonnes)] }
}
