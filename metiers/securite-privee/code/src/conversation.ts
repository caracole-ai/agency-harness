import {
  type ConfigConversation,
  echappee,
  type Identite,
  type MetierConversation,
  quiParle,
} from '@harnais/moteur'
import { z } from 'zod'
import { ACTIONS } from './actions'
import { CONTROLES } from './controles'
import { tablesPour } from './copie'
import { constatsNouveaux, decrireModifications, Modification } from './modifications'
import { ouvrirReaffectation, validerReaffectation } from './reaffectation'
import { evaluer, ouvrir, type Session } from './remplacement'
import type { PREFERENCES } from './veille'

// Ce que la sécurité privée fournit à la conversation : ouvrir un client, ses
// gestes, le vocabulaire montré au modèle (limité au rôle), et qui a le droit
// de parler (PLAN-ESPACES.md § 5.6).

/** Les préférences du patron, dites en mots pour le modèle. */
const PREFERENCES_EN_MOTS: Record<(typeof PREFERENCES)[number], string> = {
  connait_site: 'un agent qui connaît déjà le site',
  moins_d_heures_semaine: "celui qui a le moins d'heures dans la semaine",
}

/** Le texte d'une proposition, rendu par le code : ce qui change, les autres possibles de chaque vacation, ce qui reste à décider. */
function decrireProposition(s: Session, id: string, modifications: Modification[]): string {
  const autres = modifications.map((m) => {
    const v = s.ctx.planning.vacations.find((x) => x.id === m.vacation)
    if (!v) throw new Error(`vacation ${m.vacation} inconnue`)
    const possibles = evaluer(s, id, v, [m.agent]).possibles.map((c) => c.nom)
    return `${m.vacation} — autres possibles : ${possibles.length > 0 ? possibles.join(', ') : 'aucun'}`
  })
  const aVerifier = constatsNouveaux(s, modifications).filter((c) => c.verdict === 'à vérifier')
  return [
    `Proposition ${id}`,
    decrireModifications(s, modifications),
    '',
    ...autres,
    ...(aVerifier.length > 0
      ? [
          '',
          `À décider par l'exploitation : ${aVerifier.map((c) => `${c.objet} : ${c.motif}`).join(' ; ')}`,
        ]
      : []),
  ].join('\n')
}

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
  proposition: {
    ouvrir: (s, conversation, modifications, maintenant) => {
      const modifs = z.array(Modification).parse(modifications)
      const { id } = ouvrirReaffectation(s, conversation, modifs, maintenant)
      return { id, texte: decrireProposition(s, id, modifs) }
    },
    valider: (s, id, maintenant) => {
      const { messages } = validerReaffectation(s, id, maintenant)
      return `Validé. Message envoyé à ${messages.length} agent(s) : ${messages.map((m) => `« ${m} »`).join(' ; ')}`
    },
  },
  echappee: (s, identite, conversation, consigne, intention, maintenant, modele) => {
    const visibles = s.ctx.planning.agents.filter(
      (a) => identite.role === 'patron' || a.id === identite.agent,
    )
    const codees = new Set(CONTROLES.map((c) => c.regle))
    const preferences = (s.config.remplacement?.preferences ?? []).map(
      (p) => PREFERENCES_EN_MOTS[p],
    )
    return echappee(
      {
        client: s.config.client,
        conversation,
        journal: s.journal,
        config: configDe(s),
        quiParle: quiParle(identite, visibles),
      },
      {
        tables: tablesPour(s, identite, maintenant),
        outils: {
          schemaModifications: z.array(Modification),
          verifier: (modifications) => ({
            constats: constatsNouveaux(s, modifications),
            description: decrireModifications(s, modifications),
          }),
          decrire: (modifications) => decrireModifications(s, modifications),
          nomRegle: (id) => s.registre.interdits.find((i) => i.id === id)?.nom ?? id,
          proposer: identite.role === 'patron',
        },
        regles: s.registre.interdits
          .filter((i) => codees.has(i.id))
          .map((i) => ({ id: i.id, nom: i.nom })),
        preferences: preferences.length > 0 ? `d'abord ${preferences.join(', puis ')}` : 'aucune',
        nomsConnus: visibles.map((a) => a.nom),
      },
      consigne,
      intention,
      maintenant,
      modele,
    )
  },
}
