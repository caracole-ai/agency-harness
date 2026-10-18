import { type ResultatRequete, rendreValeur } from './requete'

// La phrase à trous de l'échappée (REFLEXIONS.md, 2026-10-18) : le modèle ne
// retape jamais un nombre ni un identifiant. Sa réponse est une phrase dont
// chaque trou désigne une cellule d'un résultat de requête qu'il a reçu, et
// le code remplit. Un trou s'écrit `{T2.3.heures}` (le tableau T2, sa ligne 3,
// sa colonne `heures` ; la colonne peut aussi se donner par son rang, `{T2.3.2}`)
// ou `{T2.n}` (le nombre de lignes de T2). Une cellule tient lieu de valeur
// telle que le modèle l'a lue (`rendreValeur`) ; un trou qui ne se résout
// pas retire la réponse, comme un chiffre inventé l'aurait fait.

/** Un trou : `{T<tableau>.<ligne>.<colonne>}` ou `{T<tableau>.n}`. */
export const TROU = /\{T(\d+)\.(n|\d+)(?:\.([^{}]+))?\}/g

export type Remplissage =
  | { ok: true; texte: string; valeurs: string[] }
  | { ok: false; motif: string }

/** La colonne d'un résultat, par son nom (sans casse ni espaces de bord) ou par son rang à partir de 1. */
function rangColonne(colonnes: string[], colonne: string): number {
  const nom = colonne.trim().toLowerCase()
  const parNom = colonnes.findIndex((c) => c.trim().toLowerCase() === nom)
  if (parNom !== -1) return parNom
  if (/^\d+$/.test(nom)) {
    const rang = Number(nom) - 1
    if (rang >= 0 && rang < colonnes.length) return rang
  }
  return -1
}

/**
 * Remplit chaque trou de la phrase avec la cellule qu'il désigne, dans les
 * résultats des requêtes réussies, dans l'ordre (`T1` est le premier). Rend
 * aussi les valeurs écrites, pour les sources du contrôle.
 */
export function remplirPhrase(phrase: string, resultats: ResultatRequete[]): Remplissage {
  const valeurs: string[] = []
  let motif: string | undefined
  const texte = phrase.replace(TROU, (trou, tableau: string, ligne: string, colonne?: string) => {
    if (motif !== undefined) return trou
    const r = resultats[Number(tableau) - 1]
    if (r === undefined || 'erreur' in r) {
      motif = `${trou} : le tableau T${tableau} n'existe pas`
      return trou
    }
    if (ligne === 'n') {
      if (r.tronque) {
        motif = `${trou} : T${tableau} est tronqué, son nombre de lignes n'est pas connu`
        return trou
      }
      const n = String(r.lignes.length)
      valeurs.push(n)
      return n
    }
    const rangee = r.lignes[Number(ligne) - 1]
    if (rangee === undefined) {
      motif = `${trou} : T${tableau} n'a pas de ligne ${ligne}`
      return trou
    }
    if (colonne === undefined) {
      motif = `${trou} : la colonne manque`
      return trou
    }
    const rang = rangColonne(r.colonnes, colonne)
    if (rang === -1) {
      motif = `${trou} : T${tableau} n'a pas de colonne « ${colonne.trim()} »`
      return trou
    }
    const v = rendreValeur(rangee[rang])
    valeurs.push(v)
    return v
  })
  return motif === undefined ? { ok: true, texte, valeurs } : { ok: false, motif }
}

/** La phrase sans ses trous (un espace à leur place) : ce que le modèle a écrit lui-même. */
export function sansTrous(phrase: string): string {
  return phrase.replace(TROU, ' ')
}
