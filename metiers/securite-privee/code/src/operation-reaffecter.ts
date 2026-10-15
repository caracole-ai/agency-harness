import type { Operation } from '@harnais/moteur'
import { z } from 'zod'

// L'opération d'écriture de la sécurité privée (PLAN-METIER-2.md § 3.4, M6) :
// réaffecter une vacation à un autre agent, la seule modification que
// l'échappée propose (D7). Le moteur la lit sans la connaître : l'éval
// d'échappée compare les modifications d'une proposition vacation par vacation.

/** Une réaffectation telle qu'une proposition la porte : des identifiants. */
const Reaffectation = z.strictObject({
  vacation: z.string().min(1),
  agent: z.string().min(1),
})
type Reaffectation = z.infer<typeof Reaffectation>

export const OPERATION_REAFFECTER: Operation<Reaffectation> = {
  nom: 'reaffecter',
  modification: Reaffectation,
  objet: (m) => m.vacation,
}
