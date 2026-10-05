import { type Intervalle, intervalle, Temporal, type Validite } from '@harnais/moteur'
import type { Agent, Planning, Poste, Vacation } from './modele'

// Les notions de la sécurité privée, définies une fois, au-dessus du modèle.
// Un contrôle ne recalcule jamais une notion : il la demande ici.

export const date = (s: string) => Temporal.PlainDate.from(s)

export const validite = (v: { du: string; au?: string | undefined }): Validite =>
  v.au === undefined ? { du: date(v.du) } : { du: date(v.du), au: date(v.au) }

export const intervalleDe = (v: Vacation): Intervalle => intervalle(v.debut, v.fin)

/** Ce qui permet de travailler sous carte : la carte, et le récépissé qui prend sa suite (R612-17). */
export function titresDeCarte(agent: Agent): Validite[] {
  const titres = (agent.cartePro?.validites ?? []).map(validite)
  if (agent.recepisse) titres.push(validite(agent.recepisse))
  return titres
}

/** Une période qui finit à une date limite incluse (recyclage, habilitation). */
export const jusquau = (du: Temporal.PlainDate, au: Temporal.PlainDate): Validite => ({ du, au })

/** Le planning, indexé pour les contrôles. */
export interface Contexte {
  planning: Planning
  agent(id: string): Agent
  poste(id: string): Poste
  /** Les vacations d'un agent, dans l'ordre chronologique. */
  vacationsDe(agentId: string): Vacation[]
}

export function contexte(planning: Planning): Contexte {
  const agents = new Map(planning.agents.map((a) => [a.id, a]))
  const postes = new Map(planning.postes.map((p) => [p.id, p]))
  const trouver = <T>(m: Map<string, T>, id: string, quoi: string) => {
    const x = m.get(id)
    if (!x) throw new Error(`${quoi} ${id} inconnu`)
    return x
  }
  return {
    planning,
    agent: (id) => trouver(agents, id, 'agent'),
    poste: (id) => trouver(postes, id, 'poste'),
    vacationsDe: (agentId) =>
      planning.vacations
        .filter((v) => v.agent === agentId)
        .sort((a, b) =>
          Temporal.ZonedDateTime.compare(intervalleDe(a).debut, intervalleDe(b).debut),
        ),
  }
}

/** Les vacations soumises aux règles de la carte : celles d'un poste qui porte une activité de sécurité privée. */
export const sousCarte = (ctx: Contexte) =>
  ctx.planning.vacations.filter((v) => ctx.poste(v.poste).activite !== undefined)
