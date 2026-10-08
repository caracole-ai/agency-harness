import { empreinte } from '../approbation/jeton'
import type { Echappee } from '../echappee/echappee'
import { verifierReponse } from '../echappee/reponse'
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
/** Une proposition de l'échappée que le métier a refusé d'ouvrir (une règle s'y oppose au moment de l'écrire). */
export const TYPE_PROPOSITION_REFUSEE = 'proposition refusée'

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
  /** Absente, une proposition de l'échappée est montrée sans pouvoir être écrite. */
  proposition?: PropositionMetier<Session>
}

/** Comment le métier écrit une proposition de l'échappée : validée par le patron, acceptée par les agents (PLAN-ESPACES.md § 7.2). */
export interface PropositionMetier<Session> {
  /** Ouvre la demande d'écriture ; rend son identifiant et le texte à montrer, rendu par le code. Lève si une règle s'y oppose. */
  ouvrir(
    s: Session,
    conversation: string,
    modifications: unknown[],
    maintenant: Temporal.ZonedDateTime,
  ): { id: string; texte: string }
  /** Le patron a dit oui : la clé sur le contenu exact, puis la demande d'accord aux agents. Rend le texte. */
  valider(s: Session, id: string, maintenant: Temporal.ZonedDateTime): string
}

export type Reponse =
  | { sorte: 'resultat'; texte: string }
  | { sorte: 'confirmation'; texte: string; empreinte: string }
  | { sorte: 'proposition'; texte: string; empreinte: string }
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
  demande:
    | { sorte: 'action'; action: string; params: Record<string, unknown> }
    | { sorte: 'reaffectation'; id: string }
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
    case 'inconnue': {
      ecrire(m, s, tour, [ligneConsigne(tour, 'inconnue', { demande })])
      // La raison peut venir du modèle : montrée seulement si elle ne cite rien d'autre que la consigne.
      const noms = m.vocabulaire(s, tour.identite).agents.map((a) => a.nom)
      const raison = verifierReponse(demande.raison, [tour.consigne], noms).ok
        ? demande.raison
        : 'la consigne ne correspond à aucun geste'
      return {
        sorte: 'je_ne_sais_pas',
        texte: `Je ne sais pas faire ça : ${raison}. Vous pouvez reformuler, ou demander : ${actions
          .map((a) => a.description)
          .join(' ; ')}`,
      }
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
      if (!m.proposition) return { sorte: 'resultat', texte: issue.texte }
      let ouverte: { id: string; texte: string }
      try {
        ouverte = m.proposition.ouvrir(s, tour.conversation, issue.modifications, tour.maintenant)
      } catch (erreur) {
        ecrire(m, s, tour, [
          { type: TYPE_PROPOSITION_REFUSEE, objet: tour.conversation, motif: message(erreur) },
        ])
        return { sorte: 'je_ne_sais_pas', texte: message(erreur) }
      }
      const e = empreinte({
        conversation: tour.conversation,
        id: ouverte.id,
        modifications: JSON.stringify(issue.modifications),
      })
      const attente: Attente = {
        identite: tour.identite,
        demande: { sorte: 'reaffectation', id: ouverte.id },
        empreinte: e,
      }
      ecrire(m, s, tour, [
        {
          type: TYPE_CONFIRMATION_ATTENDUE,
          objet: tour.conversation,
          issue: ouverte.id,
          motif: ouverte.texte,
          donnees: attente,
        },
      ])
      return {
        sorte: 'proposition',
        texte: `${ouverte.texte}\nValider ? (oui / non)`,
        empreinte: e,
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
  const r: Reponse = !oui
    ? { sorte: 'resultat', texte: "D'accord, rien n'est fait." }
    : executerAttente(m, s, identite, attente.demande, maintenant)
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

/** Ce qu'un « oui » déclenche : l'action reformulée, ou la validation d'une proposition. */
function executerAttente<S>(
  m: MetierConversation<S>,
  s: S,
  identite: Identite,
  demande: Attente['demande'],
  maintenant: Temporal.ZonedDateTime,
): Reponse {
  if (demande.sorte === 'reaffectation') {
    if (!m.proposition) return { sorte: 'refus', texte: "ce métier n'écrit pas de proposition" }
    try {
      return { sorte: 'resultat', texte: m.proposition.valider(s, demande.id, maintenant) }
    } catch (erreur) {
      return { sorte: 'refus', texte: message(erreur) }
    }
  }
  const action = actionsDe(m.actions, identite.role).find((a) => a.id === demande.action)
  if (!action)
    return { sorte: 'refus', texte: `l'action ${demande.action} n'est pas ouverte à ce rôle` }
  const params = action.parametres.safeParse(demande.params)
  if (!params.success) return { sorte: 'refus', texte: 'paramètres invalides' }
  return executer(action, s, identite, params.data, maintenant)
}
