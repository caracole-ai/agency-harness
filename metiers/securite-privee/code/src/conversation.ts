import { join } from 'node:path'
import {
  type ConfigConversation,
  chargerConfig,
  echappee,
  FICHIER_CONFIG,
  type Identite,
  type Intention,
  Journal,
  type MetierConversation,
  quiParle,
} from '@harnais/moteur'
import { z } from 'zod'
import { ACTIONS } from './actions'
import { CONTROLES } from './controles'
import { tablesPour } from './copie'
import { DOMAINE } from './domaine'
import { constatsNouveaux, decrireModifications, Modification } from './modifications'
import { OPERATION_REAFFECTER } from './operation-reaffecter'
import { ouvrirReaffectation, validerReaffectation } from './reaffectation'
import { evaluer, ouvrir, type Session } from './remplacement'
import { ROLES } from './roles'
import { TYPES_PARAMETRE } from './types-parametre'
import { ConfigSecurite, type PREFERENCES } from './veille'

// Ce que la sécurité privée fournit à la conversation : ouvrir un client (ou
// son journal seul), ses gestes, les personnes que chaque rôle peut désigner
// (jamais montrées au modèle de traduction), et la cohérence
// de qui parle avec ses données (PLAN-ESPACES.md § 5.6). Qui a le droit de
// parler, c'est le registre d'accès du harnais qui le dit (REFLEXIONS.md, décidé le 2026-10-08).

/** Les préférences du patron, dites en mots pour le modèle. */
const PREFERENCES_EN_MOTS: Record<(typeof PREFERENCES)[number], string> = {
  connait_site: 'un agent qui connaît déjà le site',
  moins_d_heures_semaine: "celui qui a le moins d'heures dans la semaine",
}

/**
 * Les sortes de demandes nouvelles déjà connues : le mot-clé que le modèle
 * réutilise, pour que la promotion (§ 8) compte la même demande sous le même
 * mot. Liste écrite à la main depuis les cas des évals ; une intention promue
 * en geste en sort, une intention nouvelle qui revient y entre.
 */
export const INTENTIONS: Intention[] = [
  {
    id: 'heures_par_agent',
    description: 'les heures faites par un agent, ou par tous, sur une période',
    ecrit: false,
  },
  {
    id: 'compter_vacations',
    description: 'compter des vacations (de nuit, par site, par agent)',
    ecrit: false,
  },
  {
    id: 'qui_travaille',
    description: 'qui tient un poste ou un site, un jour donné',
    ecrit: false,
  },
  {
    id: 'agents_disponibles',
    description: 'les agents sans vacation sur une période',
    ecrit: false,
  },
  {
    id: 'agents_sans_carte',
    description: 'les agents dont la carte professionnelle n’est pas renseignée',
    ecrit: false,
  },
  {
    id: 'cartes_expirees',
    description: 'les agents dont la carte professionnelle est expirée',
    ecrit: false,
  },
  {
    id: 'liberer_un_jour',
    description: 'libérer un agent de ses vacations d’une journée',
    ecrit: true,
  },
  { id: 'reorganiser_semaine', description: 'refaire la semaine d’un agent', ecrit: true },
  { id: 'reaffecter_vacation', description: 'donner une vacation à un autre agent', ecrit: true },
  // Les deux simulations demandent les règles, pas une requête : elles ne
  // s'écrivent pas en geste appris, mais elles ne modifient rien (P15).
  {
    id: 'simuler_changement_de_site',
    description: 'et si un agent passait sur un autre site',
    ecrit: false,
  },
  {
    id: 'simuler_absence',
    description: 'une absence hypothétique, longue : qui pourrait reprendre les vacations',
    ecrit: false,
  },
]

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

const configDe = (s: Pick<Session, 'dossier' | 'config'>): ConfigConversation => {
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
  ouvrirJournal: (dossier) => {
    const config = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigSecurite)
    const conversation = configDe({ dossier, config })
    return {
      client: config.client,
      journal: new Journal(join(dossier, config.journal)),
      config: conversation,
    }
  },
  actions: ACTIONS,
  intentions: INTENTIONS,
  roles: ROLES,
  domaine: DOMAINE,
  typesParametre: TYPES_PARAMETRE,
  operation: OPERATION_REAFFECTER,
  copie: tablesPour,
  vocabulaire: (s, identite) => ({
    noms: s.ctx.planning.agents
      .filter((a) => identite.role === 'patron' || a.id === identite.personne)
      .map((a) => ({ id: a.id, nom: a.nom, sorte: 'personne' })),
  }),
  noms: (s) => s.ctx.planning.agents.map((a) => ({ id: a.id, nom: a.nom, sorte: 'personne' })),
  verifierIdentite: (s, identite: Identite) => {
    if (identite.role === 'agent') s.ctx.agent(identite.personne ?? '')
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
  echappee: (s, identite, conversation, consigne, intention, maintenant, modele, precisions) => {
    const personne = (a: { id: string; nom: string }) => ({
      id: a.id,
      nom: a.nom,
      sorte: 'personne' as const,
    })
    const visibles = s.ctx.planning.agents.filter(
      (a) => identite.role === 'patron' || a.id === identite.personne,
    )
    const codees = new Set(CONTROLES.map((c) => c.regle))
    const preferences = (s.config.remplacement?.preferences ?? []).map(
      (p) => PREFERENCES_EN_MOTS[p],
    )
    return echappee(
      {
        client: s.config.client,
        dossierClient: s.dossier,
        conversation,
        journal: s.journal,
        config: configDe(s),
        identite,
        quiParle: quiParle(ROLES, identite),
        domaine: DOMAINE,
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
        personnes: visibles.map(personne),
        toutes: s.ctx.planning.agents.map(personne),
      },
      consigne,
      intention,
      maintenant,
      modele,
      precisions,
    )
  },
}
