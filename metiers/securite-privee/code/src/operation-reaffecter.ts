import { type OperationApprise, SansCandidat, TYPE_ECHAPPEE } from '@harnais/moteur'
import { z } from 'zod'

// L'opération d'écriture des gestes appris de la sécurité privée
// (PLAN-METIER-2.md § 3.4, M6), déplacée du moteur : réaffecter une vacation
// à un autre agent, la seule modification que l'échappée propose (D7). Une
// ligne de `pour_chaque` en fait une, lue dans deux de ses colonnes ; le
// rejeu compare vacation par vacation.

/** Une réaffectation telle qu'un test l'attend ou qu'un rejeu la rend : des identifiants. */
const Reaffectation = z.strictObject({
  vacation: z.string().min(1),
  agent: z.string().min(1),
})
type Reaffectation = z.infer<typeof Reaffectation>

export const OPERATION_REAFFECTER: OperationApprise<Reaffectation> = {
  nom: 'reaffecter',
  enMots: 'réaffecter une vacation à un autre agent',
  colonnes: z.strictObject({
    vacation: z.string().describe('vacations.id'),
    agent: z.string().describe('agents.id de celui qui la prend'),
  }),
  modification: Reaffectation,
  /** Une cellule vide lève (`SansCandidat` quand c'est l'agent qui manque) : rien ne s'invente. */
  depuisLigne: (ligne, colonnes) => {
    const vacation = ligne[colonnes.vacation ?? '']
    const agent = ligne[colonnes.agent ?? '']
    if (typeof vacation !== 'string' || vacation === '') {
      throw new Error('n’a pas de vacation')
    }
    if (typeof agent !== 'string' || agent === '') {
      throw new SansCandidat(`aucun agent trouvé pour ${vacation}`)
    }
    return { vacation, agent }
  },
  /** Les réaffectations de la proposition de cette conversation, lues sans connaître le reste de la ligne ; rien si elles n'en ont pas la forme. */
  relire: (journal, conversation) => {
    const ligne = journal
      .historique(conversation)
      .filter((l) => l.type === TYPE_ECHAPPEE && l.issue === 'proposition')
      .at(-1)
    const lu = z
      .array(z.looseObject({ vacation: z.string().min(1), agent: z.string().min(1) }))
      .min(1)
      .safeParse(
        ligne?.donnees
          ? (JSON.parse(ligne.donnees) as { modifications?: unknown }).modifications
          : undefined,
      )
    return lu.success ? lu.data.map(({ vacation, agent }) => ({ vacation, agent })) : []
  },
  egal: (a, b) => a.vacation === b.vacation && a.agent === b.agent,
  objet: (m) => m.vacation,
}
