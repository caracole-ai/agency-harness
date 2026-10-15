import type { z } from 'zod'

// L'opération d'écriture du métier, telle que le moteur la lit sans la
// connaître (PLAN-METIER-2.md § 3.4, M6) : le schéma d'une modification et
// l'objet qu'elle modifie. L'éval d'échappée s'en sert pour lire les
// modifications d'une proposition (critère `modifications`).

export interface Operation<Modif> {
  nom: string
  /** Une modification telle qu'une proposition la porte. */
  modification: z.ZodType<Modif>
  /** L'identifiant de l'objet modifié : une modification par objet, au plus. */
  objet(m: Modif): string
}
