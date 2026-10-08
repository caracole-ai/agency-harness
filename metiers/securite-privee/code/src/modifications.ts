import { type Constat, constatsApparus } from '@harnais/moteur'
import { z } from 'zod'
import { CONTROLES } from './controles'
import type { Planning } from './modele'
import type { Session } from './remplacement'
import { contexte } from './semantique'
import { decrire } from './veille'

// Ce que l'échappée peut proposer de changer : réaffecter une vacation à un
// autre agent, rien d'autre (D7). Le planning modifié passe les mêmes
// contrôles que la veille ; ce qui change se décrit par le code
// (PLAN-ESPACES.md § 6.4).

export const Modification = z.strictObject({
  type: z.literal('reaffecter'),
  vacation: z.string().describe('identifiant de la vacation, ex. V-07'),
  agent: z.string().describe("identifiant de l'agent qui la prend, ex. A-9"),
})
export type Modification = z.infer<typeof Modification>

/** Un nouveau planning ; lève si une vacation ou un agent est inconnu, si une vacation apparaît deux fois, ou si elle ne change pas d'agent. */
export function appliquer(planning: Planning, modifications: Modification[]): Planning {
  const vues = new Set<string>()
  const parVacation = new Map<string, string>()
  for (const m of modifications) {
    if (vues.has(m.vacation)) throw new Error(`${m.vacation} apparaît deux fois`)
    vues.add(m.vacation)
    if (!planning.vacations.some((v) => v.id === m.vacation)) {
      throw new Error(`vacation ${m.vacation} inconnue`)
    }
    if (!planning.agents.some((a) => a.id === m.agent)) throw new Error(`agent ${m.agent} inconnu`)
    if (planning.vacations.some((v) => v.id === m.vacation && v.agent === m.agent)) {
      throw new Error(`${m.vacation} est déjà tenue par ${m.agent}`)
    }
    parVacation.set(m.vacation, m.agent)
  }
  return {
    ...planning,
    vacations: planning.vacations.map((v) => {
      const agent = parVacation.get(v.id)
      return agent === undefined ? v : { ...v, agent }
    }),
  }
}

/** Les constats que les modifications font apparaître ou aggraver, par rapport au planning de départ. */
export function constatsNouveaux(s: Session, modifications: Modification[]): Constat[] {
  const apres = contexte(appliquer(s.ctx.planning, modifications))
  return constatsApparus(
    CONTROLES,
    s.registre,
    s.ctx,
    apres,
    modifications.map((m) => m.vacation),
  )
}

/**
 * Ce qui change, rendu par le code : une ligne par vacation
 * `V-07 · mer. 14/10 08:00 → 20:00 · Accueil (Galerie des Tilleuls) : Sophie Marchand → Mehdi Saïdi`,
 * puis le nombre de vacations qui ne bougent pas.
 */
export function decrireModifications(s: Session, modifications: Modification[]): string {
  appliquer(s.ctx.planning, modifications)
  const lignes = modifications.map((m) => {
    const v = s.ctx.planning.vacations.find((x) => x.id === m.vacation)
    if (!v) throw new Error(`vacation ${m.vacation} inconnue`)
    const poste = s.ctx.poste(v.poste)
    const quand = decrire(s.ctx, v.id).split(' · ').at(-1) ?? ''
    return `${v.id} · ${quand} · ${poste.id} (${poste.site}) : ${s.ctx.agent(v.agent).nom} → ${s.ctx.agent(m.agent).nom}`
  })
  const autres = s.ctx.planning.vacations.length - modifications.length
  return [...lignes, `${autres} autres vacations ne bougent pas`].join('\n')
}
