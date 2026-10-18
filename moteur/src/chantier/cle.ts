import { NOM_METIER } from '../config'
import { FORMAT_INTENTION } from '../conversation/actions'

// La clé d'un chantier dans le dépôt de l'agence (REFLEXIONS.md, décidé le
// 2026-10-18) : `<métier>/<id>`. Deux clients de métiers différents peuvent
// commander le même identifiant ; sans le métier, ils partageraient la
// branche `chantier/<id>`, son étiquette, sa mémoire et ses retraits. La clé
// nomme la branche (`chantier/<métier>/<id>`), l'étiquette de la fusion, les
// arbres de travail (la barre devient un tiret), l'entrée de mémoire
// (`memoire/chantiers/<métier>/<date>-<id>.md`) et la colonne « identifiant »
// de l'index. Chez le client, la mission garde son seul identifiant : il n'a
// qu'un métier.

export interface CleChantier {
  metier: string
  id: string
}

const sansAncres = (motif: RegExp) => motif.source.replace(/^\^|\$$/g, '')
/** `<métier>/<id>` : un nom de métier, une barre, un identifiant d'intention. */
const MOTIF_CLE = new RegExp(`^(${sansAncres(NOM_METIER)})/(${sansAncres(FORMAT_INTENTION)})$`)

/** La clé d'une mission : `<métier>/<id>`. */
export const cleChantier = (metier: string, id: string): string => `${metier}/${id}`

/** Une clé bien formée, ou non (un identifiant nu n'en est pas une). */
export const estCle = (cle: string): boolean => MOTIF_CLE.test(cle)

/** Le métier et l'identifiant d'une clé ; lève sur ce qui n'en est pas une. */
export function lireCle(cle: string): CleChantier {
  const m = MOTIF_CLE.exec(cle)
  if (!m?.[1] || !m[2]) throw new Error(`${cle} : une clé de chantier s'écrit <métier>/<id>`)
  return { metier: m[1], id: m[2] }
}

/** Le nom d'un arbre de travail pour une clé : `<préfixe>-<métier>-<id>` (un dossier, sans barre). */
export const nomArbre = (prefixe: string, cle: string): string =>
  `${prefixe}-${cle.replaceAll('/', '-')}`
