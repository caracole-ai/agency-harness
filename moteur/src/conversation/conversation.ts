import { empreinte } from '../approbation/jeton'
import type { Echappee } from '../echappee/echappee'
import type { Evenement, Journal } from '../journal/journal'
import { coutDuMois, evenementAppel, plafondAtteint } from '../modele/compteur'
import type { Modele } from '../modele/modele'
import type { Temporal } from '../temps/temporal'
import { type Action, actionsDe, type Identite, outilsDe } from './actions'
import { type ConfigConversation, prixDe } from './config'
import { type Demande, systemeTraduire, traduire, type Vocabulaire } from './traduire'

// Le déroulé d'un tour de conversation : qui parle, le plafond du mois, la
// traduction, puis l'action (tout de suite si elle ne fait que lire, après
// un « oui » à sa reformulation si elle écrit). Chaque sortie laisse sa ligne
// au journal (PLAN-ESPACES.md § 5.4).

export const TYPE_CONSIGNE = 'consigne'
export const TYPE_CONFIRMATION_ATTENDUE = 'confirmation_attendue'
export const TYPE_CONFIRMATION = 'confirmation'

/** Ce qu'un métier fournit pour converser chez un de ses clients (export `CONVERSATION`). */
export interface MetierConversation<Session> {
  ouvrir(dossierClient: string): Session
  fermer(s: Session): void
  config(s: Session): ConfigConversation
  client(s: Session): string
  journal(s: Session): Journal
  actions: Action<Session, unknown>[]
  vocabulaire(s: Session, identite: Identite): Vocabulaire
  /** Lève si l'identité n'existe pas (agent inconnu). */
  verifierIdentite(s: Session, identite: Identite): void
  /** Absente, toute demande nouvelle finit en « je ne sais pas encore faire ça ». */
  echappee?: Echappee<Session>
}

export type Reponse =
  | { sorte: 'resultat'; texte: string }
  | { sorte: 'confirmation'; texte: string; empreinte: string }
  | { sorte: 'je_ne_sais_pas'; texte: string }
  | { sorte: 'refus'; texte: string }

export interface Tour {
  identite: Identite
  consigne: string
  maintenant: Temporal.ZonedDateTime
  conversation: string
}

/** Ce qu'une confirmation en attente garde : qui, quoi, et l'empreinte de ce quoi. */
interface Attente {
  identite: Identite
  demande: { sorte: 'action'; action: string; params: Record<string, unknown> }
  empreinte: string
}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/** Une identité comparable : le rôle, et l'agent ou rien. */
const memeIdentite = (a: Identite, b: Identite) =>
  a.role === b.role && (a.agent ?? null) === (b.agent ?? null)

function ecrire<S>(
  m: MetierConversation<S>,
  s: S,
  tour: Tour,
  evenements: Omit<Evenement, 'client'>[],
) {
  m.journal(s).ecrire(
    evenements.map((e) => ({ ...e, client: m.client(s) })),
    tour.maintenant.toInstant().toString(),
  )
}

/** La ligne `consigne` : la consigne mot pour mot, ce qu'elle est devenue. */
const ligneConsigne = (
  tour: Tour,
  issue: Demande['sorte'] | 'refus',
  donnees: Record<string, unknown> = {},
): Omit<Evenement, 'client'> => ({
  type: TYPE_CONSIGNE,
  objet: tour.conversation,
  issue,
  motif: tour.consigne,
  donnees: { identite: tour.identite, ...donnees },
})

/** Un tour : une consigne, une réponse. */
export async function traiterConsigne<S>(
  m: MetierConversation<S>,
  s: S,
  modele: Modele,
  tour: Tour,
): Promise<Reponse> {
  const refuser = (texte: string, donnees: Record<string, unknown> = {}): Reponse => {
    ecrire(m, s, tour, [ligneConsigne(tour, 'refus', { ...donnees, erreur: texte })])
    return { sorte: 'refus', texte }
  }

  try {
    m.verifierIdentite(s, tour.identite)
  } catch (erreur) {
    return refuser(message(erreur))
  }

  const config = m.config(s)
  const mois = tour.maintenant.toString().slice(0, 7)
  if (plafondAtteint(coutDuMois(m.journal(s), mois).usd, config.plafonds.par_mois_usd)) {
    return refuser(
      "Le plafond d'IA du mois est atteint : les gestes du quotidien restent possibles par l'interface, la conversation reprend le mois prochain.",
    )
  }

  const actions = actionsDe(m.actions, tour.identite.role)
  const schemas = new Map(actions.map((a) => [a.id, a.parametres]))
  let traduite: Awaited<ReturnType<typeof traduire>>
  try {
    traduite = await traduire(
      modele,
      config.modele.effort.traduire,
      systemeTraduire(tour.identite, m.vocabulaire(s, tour.identite), actions),
      outilsDe(m.actions, tour.identite.role),
      tour.consigne,
      tour.maintenant,
      schemas,
    )
  } catch (erreur) {
    ecrire(m, s, tour, [ligneConsigne(tour, 'refus', { erreur: message(erreur) })])
    return {
      sorte: 'je_ne_sais_pas',
      texte: `Je n'arrive pas à joindre le modèle : ${message(erreur)}`,
    }
  }
  const { demande, reponse } = traduite
  const appel = evenementAppel(
    m.client(s),
    tour.conversation,
    'traduire',
    1,
    reponse,
    prixDe(config),
  )
  ecrire(m, s, tour, [appel])

  switch (demande.sorte) {
    case 'inconnue':
      ecrire(m, s, tour, [ligneConsigne(tour, 'inconnue', { demande })])
      return {
        sorte: 'je_ne_sais_pas',
        texte: `Je ne sais pas faire ça : ${demande.raison}. Vous pouvez reformuler, ou demander : ${actions
          .map((a) => a.description)
          .join(' ; ')}`,
      }
    case 'nouvelle': {
      ecrire(m, s, tour, [ligneConsigne(tour, 'nouvelle', { demande })])
      if (!m.echappee) return { sorte: 'je_ne_sais_pas', texte: 'Je ne sais pas encore faire ça.' }
      let issue: Awaited<ReturnType<Echappee<S>>>
      try {
        issue = await m.echappee(
          s,
          tour.identite,
          tour.conversation,
          tour.consigne,
          demande.intention,
          tour.maintenant,
          modele,
        )
      } catch (erreur) {
        return { sorte: 'je_ne_sais_pas', texte: `Je n'y arrive pas : ${message(erreur)}.` }
      }
      if (issue.sorte === 'reponse') return { sorte: 'resultat', texte: issue.texte }
      if (issue.sorte === 'abandon') {
        return { sorte: 'je_ne_sais_pas', texte: `Je n'y arrive pas : ${issue.motif}.` }
      }
      return {
        sorte: 'resultat',
        texte: `${issue.texte}\n(l'écriture d'une proposition arrive au lot 4)`,
      }
    }
    case 'action': {
      const action = actions.find((a) => a.id === demande.action)
      if (!action)
        return refuser(`l'action ${demande.action} n'est pas ouverte à ce rôle`, { demande })
      if (!action.ecrit) {
        const r = executer(action, s, tour.identite, demande.params, tour.maintenant)
        ecrire(m, s, tour, [ligneConsigne(tour, 'action', { demande, ...erreurDe(r) })])
        return r
      }
      let texte: string
      try {
        texte = action.reformuler(s, tour.identite, demande.params)
      } catch (erreur) {
        ecrire(m, s, tour, [ligneConsigne(tour, 'action', { demande, erreur: message(erreur) })])
        return { sorte: 'refus', texte: message(erreur) }
      }
      const e = empreinte({
        conversation: tour.conversation,
        action: action.id,
        params: JSON.stringify(demande.params),
      })
      ecrire(m, s, tour, [
        ligneConsigne(tour, 'action', { demande }),
        {
          type: TYPE_CONFIRMATION_ATTENDUE,
          objet: tour.conversation,
          issue: action.id,
          motif: texte,
          donnees: { identite: tour.identite, demande, empreinte: e } satisfies Attente,
        },
      ])
      return { sorte: 'confirmation', texte: `${texte} (oui / non)`, empreinte: e }
    }
  }
}

/** Le message d'un refus, à garder au journal. */
const erreurDe = (r: Reponse) => (r.sorte === 'refus' ? { erreur: r.texte } : {})

/** Exécute une action ; ses messages d'erreur sont écrits pour le client, ils sont rendus tels quels. */
function executer<S>(
  action: Action<S, unknown>,
  s: S,
  identite: Identite,
  params: unknown,
  maintenant: Temporal.ZonedDateTime,
): Reponse {
  try {
    return { sorte: 'resultat', texte: action.executer(s, identite, params, maintenant).texte }
  } catch (erreur) {
    return { sorte: 'refus', texte: message(erreur) }
  }
}

/** La réponse à une confirmation en attente : la dernière de la conversation, du même demandeur, au même contenu. */
export function confirmer<S>(
  m: MetierConversation<S>,
  s: S,
  identite: Identite,
  conversation: string,
  empreinteRecue: string,
  oui: boolean,
  maintenant: Temporal.ZonedDateTime,
): Reponse {
  const tour = { identite, consigne: oui ? 'oui' : 'non', maintenant, conversation }
  const derniere = m
    .journal(s)
    .historique(conversation)
    .filter((l) => l.type === TYPE_CONFIRMATION_ATTENDUE || l.type === TYPE_CONFIRMATION)
    .at(-1)
  const attente =
    derniere?.type === TYPE_CONFIRMATION_ATTENDUE && derniere.donnees
      ? (JSON.parse(derniere.donnees) as Attente)
      : undefined
  if (
    !attente ||
    attente.empreinte !== empreinteRecue ||
    !memeIdentite(attente.identite, identite)
  ) {
    return { sorte: 'refus', texte: 'aucune confirmation en attente pour ce contenu' }
  }
  const action = actionsDe(m.actions, identite.role).find((a) => a.id === attente.demande.action)
  const params = action?.parametres.safeParse(attente.demande.params)
  const r: Reponse = !oui
    ? { sorte: 'resultat', texte: "D'accord, rien n'est fait." }
    : !action
      ? { sorte: 'refus', texte: `l'action ${attente.demande.action} n'est pas ouverte à ce rôle` }
      : !params?.success
        ? { sorte: 'refus', texte: 'paramètres invalides' }
        : executer(action, s, identite, params.data, maintenant)
  ecrire(m, s, tour, [
    {
      type: TYPE_CONFIRMATION,
      objet: conversation,
      issue: oui ? 'oui' : 'non',
      donnees: { empreinte: empreinteRecue, ...erreurDe(r) },
    },
  ])
  return r
}
