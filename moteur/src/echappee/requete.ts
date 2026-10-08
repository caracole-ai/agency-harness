import type { Copie } from './copie'

// L'outil `requete` de l'échappée : une lecture SQL sur la copie, bornée en
// longueur et en lignes, rendue en tableau texte pour le modèle. Un refus ou
// une erreur SQLite reviennent en `{ erreur }`, jamais levés. La copie est
// déjà en lecture seule ; la liste de mots refusés est une ceinture en plus
// (PLAN-ESPACES.md § 6.3).

export const LIGNES_MAX = 200
export const SQL_MAX = 2000

export type ResultatRequete =
  | { colonnes: string[]; lignes: unknown[][]; tronque: boolean }
  | { erreur: string }

const DEBUT_LECTURE = /^(select|with)\b/i
const MOTS_REFUSES =
  /\b(attach|detach|pragma|insert|update|delete|drop|create|alter|replace|vacuum|reindex)\b/i

export function executerRequete(copie: Copie, sql: string): ResultatRequete {
  if (sql.length > SQL_MAX) {
    return { erreur: `requête trop longue : ${sql.length} caractères, ${SQL_MAX} au plus` }
  }
  const lecture = sql.trim().replace(/;$/, '')
  if (!DEBUT_LECTURE.test(lecture)) {
    return { erreur: 'seules les lectures sont permises : la requête commence par SELECT ou WITH' }
  }
  if (lecture.includes(';')) {
    return { erreur: 'une seule requête à la fois : « ; » seulement en fin' }
  }
  const mot = MOTS_REFUSES.exec(lecture)
  if (mot) return { erreur: `mot refusé dans une lecture : ${mot[1]}` }
  try {
    const requete = copie.db.prepare(`SELECT * FROM (${lecture}) LIMIT ${LIGNES_MAX + 1}`)
    // Lu ligne à ligne et arrêté à LIGNES_MAX + 1 : un commentaire dans la
    // requête peut neutraliser le LIMIT ci-dessus, pas cette borne-ci.
    const lues: Record<string, unknown>[] = []
    for (const ligne of requete.iterate()) {
      lues.push(ligne)
      if (lues.length > LIGNES_MAX) break
    }
    const [premiere] = lues
    const colonnes = premiere
      ? Object.keys(premiere)
      : requete.columns().map((colonne) => colonne.name)
    return {
      colonnes,
      lignes: lues.slice(0, LIGNES_MAX).map((ligne) => colonnes.map((nom) => ligne[nom])),
      tronque: lues.length > LIGNES_MAX,
    }
  } catch (erreur) {
    return { erreur: erreur instanceof Error ? erreur.message : String(erreur) }
  }
}

/** Le résultat pour le modèle : `col | col`, puis une ligne par résultat ; ou `erreur : …`. */
export function rendreResultat(r: ResultatRequete): string {
  if ('erreur' in r) return `erreur : ${r.erreur}`
  const texte = [
    r.colonnes.join(' | '),
    ...r.lignes.map((ligne) => ligne.map((v) => (v === null ? 'null' : String(v))).join(' | ')),
  ]
  if (r.lignes.length === 0) texte.push('(aucune ligne)')
  if (r.tronque) texte.push(`(tronqué à ${LIGNES_MAX} lignes)`)
  return texte.join('\n')
}
