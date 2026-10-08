import type { ConfigConversation, Identite, MetierConversation } from '@harnais/moteur'
import { ACTIONS } from './actions'
import { ouvrir, type Session } from './remplacement'

// Ce que la sécurité privée fournit à la conversation : ouvrir un client, ses
// gestes, le vocabulaire montré au modèle (limité au rôle), et qui a le droit
// de parler (PLAN-ESPACES.md § 5.6).

const configDe = (s: Session): ConfigConversation => {
  if (!s.config.conversation) {
    throw new Error(`${s.dossier} : la config n'a pas de section « conversation »`)
  }
  return s.config.conversation
}

export const CONVERSATION: MetierConversation<Session> = {
  ouvrir: (dossier) => {
    const s = ouvrir(dossier)
    try {
      configDe(s)
    } catch (erreur) {
      s.journal.fermer()
      throw erreur
    }
    return s
  },
  fermer: (s) => s.journal.fermer(),
  config: configDe,
  client: (s) => s.config.client,
  journal: (s) => s.journal,
  actions: ACTIONS,
  vocabulaire: (s, identite) => ({
    agents: s.ctx.planning.agents
      .filter((a) => identite.role === 'patron' || a.id === identite.agent)
      .map((a) => ({ id: a.id, nom: a.nom })),
    postes: s.ctx.planning.postes.map((p) => ({ id: p.id, site: p.site })),
  }),
  verifierIdentite: (s, identite: Identite) => {
    if (identite.role === 'patron') {
      if (identite.agent !== undefined) {
        throw new Error("le patron parle en son nom : pas d'identifiant d'agent")
      }
      return
    }
    if (identite.agent === undefined) throw new Error('un agent doit dire qui il est (--agent A-…)')
    s.ctx.agent(identite.agent)
  },
}
