import type { z } from 'zod'
import type { Journal } from '../journal/journal'

// L'opération d'écriture d'un geste appris (PLAN-METIER-2.md § 3.4, M6) : le
// métier la déclare, le moteur ne sait pas ce qu'elle modifie. Un geste qui
// écrit en produit une par ligne de sa requête `pour_chaque` ; ses tests les
// attendent, le rejeu les compare par leur objet et `egal`. Un métier sans
// opération n'écrit pas par un geste appris.

/** L'écart d'un geste qui écrit chez un métier sans opération : il ne se fabrique ni ne se charge. */
export const SANS_OPERATION = 'ce métier n’écrit pas par un geste appris'

export interface OperationApprise<Modif> {
  nom: string
  /** Pour la fabrication : ce que fait une modification, en une phrase sans nom. */
  enMots: string
  /** Les colonnes de `pour_chaque` que l'opération lit, par clé ; chaque clé décrite pour la fabrication. */
  colonnes: z.ZodType<Record<string, string>>
  /** Une modification telle qu'un test l'attend ou qu'un rejeu la rend. */
  modification: z.ZodType<Modif>
  /**
   * Fabrique la modification d'une ligne de `pour_chaque` (ses cellules par
   * colonne). Lève `SansCandidat` quand la ligne n'a rien à proposer ; lève
   * une autre erreur, sur la fin d'une phrase que le moteur préfixe par « la
   * ligne n de « requête » », quand la ligne ne fait pas une modification.
   */
  depuisLigne(ligne: Record<string, unknown>, colonnes: Record<string, string>): Modif
  /** Les modifications validées, relues dans le journal pour une conversation. */
  relire(journal: Journal, conversation: string): Modif[]
  egal(a: Modif, b: Modif): boolean
  /** L'identifiant de l'objet modifié : une modification par objet, au plus. */
  objet(m: Modif): string
}
