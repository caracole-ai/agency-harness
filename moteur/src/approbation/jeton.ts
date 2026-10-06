import { createHash } from 'node:crypto'
import type { Ligne } from '../journal/journal'

// La clé d'accord : une validation humaine (ou une délégation) porte sur un
// contenu exact. L'écriture vérifie, dans le journal, que la dernière
// validation de la demande porte bien ce contenu ; sinon elle refuse. Le vrai
// verrou des droits d'écriture chez le fournisseur viendra avec les
// connecteurs réels (décision du 2026-10-05) : ici, la preuve est le journal.

/** Le statut qu'inscrit une validation, et dont l'écriture a besoin. */
export const VALIDEE = 'validée'

/** Le contenu exact d'une décision : ce qui sera écrit, rien d'autre. */
export type Contenu = Record<string, string>

/** L'empreinte d'un contenu : ses clés triées, puis SHA-256. */
export function empreinte(contenu: Contenu): string {
  const canonique = JSON.stringify(
    Object.keys(contenu)
      .sort()
      .map((k) => [k, contenu[k]]),
  )
  return createHash('sha256').update(canonique).digest('hex')
}

/**
 * Lève si la dernière validation de cet historique ne porte pas ce contenu
 * exact. Rend le jeton, à inscrire avec l'écriture.
 */
export function exigerValidation(historique: Ligne[], contenu: Contenu): string {
  const jeton = empreinte(contenu)
  const derniere = historique.filter((l) => l.issue === VALIDEE).at(-1)
  const valide = derniere?.donnees
    ? (JSON.parse(derniere.donnees) as { jeton?: string }).jeton
    : undefined
  if (valide !== jeton) {
    throw new Error(
      derniere
        ? 'écriture refusée : le contenu diffère de celui qui a été validé'
        : 'écriture refusée : aucune validation inscrite au journal',
    )
  }
  return jeton
}
