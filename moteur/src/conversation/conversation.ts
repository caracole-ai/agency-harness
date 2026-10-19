import { empreinte } from '../approbation/jeton'
import type { ControleReponse } from '../echappee/boucle'
import type { CriteresProposition, Echappee } from '../echappee/echappee'
import {
  masquerConsigne,
  masquerPourModele,
  type Precision,
  reprendreMentions,
} from '../echappee/pseudonymes'
import { verifierReponse } from '../echappee/reponse'
import type { Evenement, Journal } from '../journal/journal'
import { coutDuMois, evenementAppel, plafondAtteint } from '../modele/compteur'
import type { Modele, ReponseModele } from '../modele/modele'
import { chargerPersonnes, type IdentiteVerifiee, recevoir } from '../personnes/personnes'
import type { Registre } from '../regles/schema'
import type { Temporal } from '../temps/temporal'
import {
  type Action,
  actionsDe,
  type Identite,
  type Intention,
  outilsDe,
  schemaMontre,
} from './actions'
import { type ConfigConversation, prixDe } from './config'
import {
  ambigue,
  choisirParmi,
  correspondances,
  type Designable,
  normaliserNom,
  proches,
  refuse,
} from './designation'
import type { Domaine } from './domaine'
import type { Operation } from './operation'
import { aCapacite, IdentiteSchema, type RoleDeclare, roleDe } from './roles'
import type { Choix, Repli, Tableau } from './tableau'
import { type Demande, surUneLigne, systemeTraduire, traduire, type Vocabulaire } from './traduire'

// Le déroulé d'un tour de conversation (PLAN-ESPACES.md § 5.4, REFLEXIONS.md (2026-10-08)) :
// la porte (qui parle, avant toute ouverture du dossier) ; sur le journal
// seul, le plafond du mois ; puis le dossier s'ouvre, la traduction reçoit la
// phrase masquée (aucun nom, `masquerPourModele`), le moteur trouve la personne
// nommée (ou pose la question), puis l'action (tout de suite si elle ne fait que
// lire, après un « oui » à sa reformulation si elle écrit). Chaque sortie
// laisse sa ligne au journal. Une demande nouvelle d'un rôle qui désigne autrui et nomme
// quelqu'un d'ambigu reçoit sa question avant tout appel d'échappée : le nom
// ne part jamais au modèle (PLAN-PSEUDONYMES.md § 5.3, S3). Un geste codé
// qui propose calcule ses modifications sans modèle, puis elles suivent le
// chemin d'une proposition d'échappée.

export const TYPE_CONSIGNE = 'consigne'
export const TYPE_CONFIRMATION_ATTENDUE = 'confirmation_attendue'
export const TYPE_CONFIRMATION = 'confirmation'
/** Une proposition de l'échappée que le métier a refusé d'ouvrir (une règle s'y oppose au moment de l'écrire). */
export const TYPE_PROPOSITION_REFUSEE = 'proposition refusée'
/** La question « vous parlez de qui ? » attend sa réponse ; la ligne garde de quoi reprendre le geste. */
export const TYPE_PRECISION_ATTENDUE = 'precision_attendue'
/** Une demande refusée à la porte : l'identité reçue n'est pas au registre d'accès. */
export const TYPE_ACCES_REFUSE = 'accès refusé'

/** Par où une demande arrive ; il est écrit avec un refus à la porte. */
export const CANAUX = ['terminal', 'web'] as const
export type Canal = (typeof CANAUX)[number]

/** Ce qu'un métier fournit pour converser chez un de ses clients (export `CONVERSATION`). */
export interface MetierConversation<Session> {
  ouvrir(dossierClient: string): Session
  fermer(s: Session): void
  config(s: Session): ConfigConversation
  client(s: Session): string
  journal(s: Session): Journal
  /**
   * Le journal et la config de la conversation, sans rien lire des données
   * du client : pour un refus à la porte, le plafond du mois et
   * la traduction, avant l'ouverture du dossier. L'appelant ferme le journal.
   */
  ouvrirJournal(dossierClient: string): {
    client: string
    journal: Journal
    config: ConfigConversation
  }
  actions: Action<Session, unknown>[]
  /** Les sortes de demandes nouvelles déjà connues, que le modèle réutilise comme mot-clé d'intention. */
  intentions: Intention[]
  /** Les rôles que le métier déclare, avec leurs capacités (PLAN-METIER-2.md § 3.1, M1, M3). */
  roles: RoleDeclare[]
  vocabulaire(s: Session, identite: Identite): Vocabulaire
  /** Tout nom qui ne part jamais au modèle (PLAN-METIER-2.md § 3.2, M4). */
  noms(s: Session): Designable[]
  /** L'opération d'écriture du métier, que l'éval d'échappée lit ; absente, une proposition n'a pas de modification lisible (PLAN-METIER-2.md § 3.4, M6). */
  operation?: Operation<unknown>
  /** Le domaine que disent les prompts du moteur (PLAN-METIER-2.md § 3.5, M7). */
  domaine: Domaine
  /**
   * Contrôle de cohérence, en seconde ligne : l'identité, déjà passée par le
   * registre d'accès, existe encore dans les données du client. Lève sinon. Il
   * ne décide pas de l'accès.
   */
  verifierIdentite(s: Session, identite: Identite): void
  /** Absente, toute demande nouvelle finit en « je ne sais pas encore faire ça ». */
  echappee?: Echappee<Session>
  /** Absente, une proposition de l'échappée est montrée sans pouvoir être écrite. */
  proposition?: PropositionMetier<Session>
  /** Ce que l'interface montre, rendu par le métier (PLAN-METIER-2.md § 3.6, M10). Absent, l'interface n'a ni demandes ni textes du métier. */
  tableau?: (s: Session, identite: Identite, maintenant: Temporal.ZonedDateTime) => Tableau
  /** Les règles du métier, pour l'onglet Règles de l'interface (PLAN-METIER-2.md § 3.6, M10). Absent, l'onglet est vide. */
  registre?: (s: Session) => Registre
  /**
   * L'objet d'une ligne du journal, en clair, pour la page (une personne et
   * son titre, une vacation, une demande) ; `undefined` : l'identifiant reste.
   * Il ne part jamais au modèle.
   */
  nommer?: (s: Session, objet: string) => string | undefined
}

/** Comment le métier écrit une proposition de l'échappée : validée par le demandeur, puis les accords que le métier exige (PLAN-ESPACES.md § 7.2). */
export interface PropositionMetier<Session> {
  /** Ouvre la demande d'écriture ; rend son identifiant et le texte à montrer, rendu par le code. Lève si une règle s'y oppose. Avec `corrige`, elle remplace cette proposition-là. */
  ouvrir(
    s: Session,
    conversation: string,
    modifications: unknown[],
    maintenant: Temporal.ZonedDateTime,
    corrige?: string,
  ): { id: string; texte: string }
  /** Le demandeur a dit oui : la clé sur le contenu exact, puis les demandes d'accord du métier. Rend le texte. */
  valider(s: Session, id: string, maintenant: Temporal.ZonedDateTime): string
  /** Les règles et les préférences d'une proposition, celles que l'échappée montre. */
  criteres(s: Session): CriteresProposition
  /** Les autres choix d'une proposition ouverte (exemple : un autre agent pour une vacation), chacun un geste ; absent, aucun. */
  choix?(s: Session, id: string): Choix[]
}

export type Reponse =
  /** `controle` : une réponse d'échappée dit si le code a relu ses chiffres ou retiré le résumé ; absent sur le résultat d'un geste codé. `choix` : les décisions qu'offre le résultat d'un geste, chacune appelée par `traiterGeste` ; `replis` : son détail, montré replié. */
  | {
      sorte: 'resultat'
      texte: string
      controle?: ControleReponse
      choix?: Choix[]
      replis?: Repli[]
    }
  | { sorte: 'confirmation'; texte: string; empreinte: string }
  /** `choix` : les autres choix que le métier offre sur cette proposition, chacun appelé par `traiterGeste`. */
  | { sorte: 'proposition'; texte: string; empreinte: string; choix?: Choix[] }
  | { sorte: 'je_ne_sais_pas'; texte: string }
  | { sorte: 'refus'; texte: string }
  /** Une personne nommée que le code n'a pas trouvée seul : la question, et les candidats à choisir (vides : personne ne ressemble). */
  | { sorte: 'precision'; texte: string; candidats: Designable[] }

export interface Tour {
  identite: IdentiteVerifiee
  consigne: string
  maintenant: Temporal.ZonedDateTime
  conversation: string
}

/** Ce qu'une confirmation en attente garde : qui, quoi, et l'empreinte de ce quoi. */
interface Attente {
  identite: Identite
  demande:
    | { sorte: 'action'; action: string; params: Record<string, unknown> }
    /** `corrige` : la proposition qu'elle remplace, que l'interface ne montre plus en attente. */
    | { sorte: 'reaffectation'; id: string; corrige?: string }
  empreinte: string
}

/** Ce qu'une question « vous parlez de qui ? » garde pour un geste : qui, le geste, ses paramètres, la personne à préciser et ses candidats. */
interface PrecisionGeste {
  identite: Identite
  action: string
  /** En identifiants pour les personnes déjà trouvées (`resolus`), en mentions pour les autres. */
  params: Record<string, unknown>
  resolus: string[]
  champ: string
  candidats: Designable[]
  /** La question a déjà été reposée une fois, après une réponse ambiguë : la prochaine clôt. */
  relancee?: true
}

/** Ce qu'elle garde pour une demande nouvelle, avant l'échappée : la consigne d'origine, l'intention, la mention et les réponses déjà données. */
interface PrecisionEchappee {
  identite: Identite
  candidats: Designable[]
  echappee: { consigne: string; intention: string; mention: string; precisions: Precision[] }
  relancee?: true
}

type PrecisionAttendue = PrecisionGeste | PrecisionEchappee

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/** Ce que la porte a reçu, pour un refus : l'identité telle quelle, bornée (elle vient de l'extérieur). */
const identiteRecue = (demandeur: unknown) => (JSON.stringify(demandeur) ?? 'rien').slice(0, 200)

/**
 * La porte, avant toute ouverture du dossier : le registre d'accès décide qui
 * parle. Un refus est écrit au journal seul, avec l'identité reçue, le canal,
 * l'heure et le motif ; aucune donnée du client n'est lue.
 */
export function accueillir<S>(
  m: MetierConversation<S>,
  dossier: string,
  demande: {
    demandeur: unknown
    canal: Canal
    maintenant: Temporal.ZonedDateTime
    conversation?: string
  },
): ReturnType<typeof recevoir> {
  const accueil = recevoir(m.roles, chargerPersonnes(dossier, m.roles), demande.demandeur)
  if (accueil.sorte === 'refus') {
    const { client, journal } = m.ouvrirJournal(dossier)
    try {
      journal.ecrire(
        [
          {
            type: TYPE_ACCES_REFUSE,
            client,
            ...(demande.conversation ? { objet: demande.conversation } : {}),
            motif: accueil.motif,
            donnees: { identite: identiteRecue(demande.demandeur), canal: demande.canal },
          },
        ],
        demande.maintenant.toInstant().toString(),
      )
    } finally {
      journal.fermer()
    }
  }
  return accueil
}

/** Au démarrage : chaque personne du registre d'accès existe dans les données du client, sinon rien ne démarre. */
export function verifierRegistre<S>(m: MetierConversation<S>, s: S, personnes: Identite[]): void {
  for (const p of personnes) {
    try {
      m.verifierIdentite(s, p)
    } catch (erreur) {
      throw new Error(`registre d'accès : ${message(erreur)}`)
    }
  }
}

/**
 * Une session par échange, fermée quoi qu'il arrive. Elle ne s'ouvre que pour
 * une identité passée par la porte : le dossier n'est jamais lu pour un inconnu.
 */
export async function avecSession<S, T>(
  m: MetierConversation<S>,
  dossier: string,
  _identite: IdentiteVerifiee,
  f: (s: S) => T | Promise<T>,
): Promise<T> {
  const s = m.ouvrir(dossier)
  try {
    return await f(s)
  } finally {
    m.fermer(s)
  }
}

/** Une identité comparable : le rôle, et la personne ou rien. */
const memeIdentite = (a: Identite, b: Identite) =>
  a.role === b.role && (a.personne ?? null) === (b.personne ?? null)

/** Une identité relue au journal, sous l'une ou l'autre graphie (PLAN-METIER-2.md, M2), comparée à celle-ci. */
const memeIdentiteLue = (lue: unknown, b: Identite) => {
  const r = IdentiteSchema.safeParse(lue)
  return r.success && memeIdentite(r.data, b)
}

/** Où écrire : le journal du client, ouvert seul (avant le dossier) ou par la session. */
interface Cible {
  client: string
  journal: Journal
}
const cibleDe = <S>(m: MetierConversation<S>, s: S): Cible => ({
  client: m.client(s),
  journal: m.journal(s),
})

function ecrire(cible: Cible, tour: Tour, evenements: Omit<Evenement, 'client'>[]) {
  cible.journal.ecrire(
    evenements.map((e) => ({ ...e, client: cible.client })),
    tour.maintenant.toInstant().toString(),
  )
}

/** La ligne `consigne` : la consigne mot pour mot, ce qu'elle est devenue (`precision` : la réponse à « vous parlez de qui ? »). */
const ligneConsigne = (
  tour: Tour,
  issue: Demande['sorte'] | 'refus' | 'precision',
  donnees: Record<string, unknown> = {},
): Omit<Evenement, 'client'> => ({
  type: TYPE_CONSIGNE,
  objet: tour.conversation,
  issue,
  motif: tour.consigne,
  donnees: { identite: tour.identite, ...donnees },
})

/**
 * Un geste appelé directement, sans traduction (un choix offert par le
 * métier, cliqué dans l'interface) : la même suite qu'une demande traduite
 * (le rôle, les personnes, les contrôles, le « oui »), rien de plus ; la
 * consigne journalisée est le libellé du choix. Aucun appel au modèle tant
 * que les personnes sont données par leur identifiant (PLAN-CHOIX.md, lot 3).
 */
export async function traiterGeste<S>(
  m: MetierConversation<S>,
  dossier: string,
  modele: Modele,
  tour: Tour,
  choix: Omit<Choix, 'libelle'>,
): Promise<Reponse> {
  return avecSession(m, dossier, tour.identite, (s) =>
    apresLeDossier(m, s, modele, tour, {
      sorte: 'traduite',
      demande: { sorte: 'action', action: choix.action, params: choix.params },
    }),
  )
}

/** Un tour : une consigne, une réponse. Le dossier ne s'ouvre qu'après le plafond et la question en attente ; la traduction a besoin des noms à masquer. */
export async function traiterConsigne<S>(
  m: MetierConversation<S>,
  dossier: string,
  modele: Modele,
  tour: Tour,
): Promise<Reponse> {
  const avant = avantLeDossier(m, dossier, tour)
  if (avant.sorte === 'reponse') return avant.reponse
  return avecSession(m, dossier, tour.identite, async (s) => {
    if (avant.sorte === 'precisee') return apresLeDossier(m, s, modele, tour, avant)
    const traduite = await traduireLeTour(m, s, modele, tour)
    if (traduite.sorte === 'reponse') return traduite.reponse
    return apresLeDossier(m, s, modele, tour, traduite)
  })
}

/** Ce qui se décide sur le journal seul : une réponse déjà, la réponse à une question en attente, ou une consigne à traduire. */
type Avant =
  | { sorte: 'reponse'; reponse: Reponse }
  | { sorte: 'a_traduire' }
  | { sorte: 'precisee'; precision: PrecisionAttendue; choix: Designable }

/** Une consigne traduite, ou déjà la réponse (le modèle injoignable, le masque en échec). */
type Traduite = { sorte: 'reponse'; reponse: Reponse } | { sorte: 'traduite'; demande: Demande }

/** La question en attente dans cette conversation, posée à ce demandeur et pas encore suivie d'une autre de ses consignes. */
function precisionEnAttente(journal: Journal, tour: Tour): PrecisionAttendue | undefined {
  const derniere = journal
    .historique(tour.conversation)
    .filter((l) => l.type === TYPE_CONSIGNE || l.type === TYPE_PRECISION_ATTENDUE)
    .map((l) => ({ type: l.type, donnees: l.donnees ? JSON.parse(l.donnees) : undefined }))
    .filter((l) => l.donnees?.identite && memeIdentiteLue(l.donnees.identite, tour.identite))
    .at(-1)
  return derniere?.type === TYPE_PRECISION_ATTENDUE
    ? (derniere.donnees as PrecisionAttendue)
    : undefined
}

/** La mention que la question fait préciser : en paramètre du geste, ou celle de l'échappée. */
const mentionDe = (attendue: PrecisionAttendue) =>
  'echappee' in attendue ? attendue.echappee.mention : String(attendue.params[attendue.champ])

/** Ce que la question sert, pour la ligne du journal : le geste, ou l'intention de l'échappée. */
const objetDe = (attendue: PrecisionAttendue) =>
  'echappee' in attendue ? attendue.echappee.intention : attendue.action

/**
 * La réponse à « vous parlez de qui ? » qui ne choisit pas un candidat : « non »,
 * ou un nom que plusieurs candidats portent (le prénom partagé). La question se
 * repose une fois, numérotée ; au second échec, ou sur « non », l'abandon est
 * dit et la question est close. Tout autre texte est une nouvelle consigne,
 * qui se traduit comme avant : rien ici (décidé le 2026-10-18).
 */
function suiteDeLaQuestion<S>(
  m: MetierConversation<S>,
  ici: Cible,
  tour: Tour,
  attendue: PrecisionAttendue,
): Avant | undefined {
  const non = refuse(tour.consigne)
  if (!non && !ambigue(tour.consigne, attendue.candidats)) return undefined
  if (!non && !attendue.relancee) {
    const texte = question(m.roles, tour, mentionDe(attendue), attendue.candidats, true)
    ecrire(ici, tour, [
      ligneConsigne(tour, 'precision'),
      {
        type: TYPE_PRECISION_ATTENDUE,
        objet: tour.conversation,
        issue: objetDe(attendue),
        motif: texte,
        donnees: { ...attendue, relancee: true },
      },
    ])
    return {
      sorte: 'reponse',
      reponse: { sorte: 'precision', texte, candidats: attendue.candidats },
    }
  }
  const tu = roleDe(m.roles, tour.identite).tutoie === true
  const texte = `Je n'ai pas compris de qui ${tu ? 'tu parles' : 'vous parlez'}. ${tu ? 'Redis' : 'Redites'} la consigne avec le prénom et le nom.`
  ecrire(ici, tour, [ligneConsigne(tour, 'precision', { erreur: texte })])
  return { sorte: 'reponse', reponse: { sorte: 'je_ne_sais_pas', texte } }
}

/**
 * Avant le dossier : le plafond du mois, la réponse à une question en attente
 * (comparée à ses candidats, sans appel). Le plafond se vérifie ici
 * seulement, une fois par consigne : une consigne admise va à son terme
 * (l'échappée), le dépassement est d'une consigne au plus, bornée par les
 * plafonds par demande.
 */
function avantLeDossier<S>(m: MetierConversation<S>, dossier: string, tour: Tour): Avant {
  const { client, journal, config } = m.ouvrirJournal(dossier)
  const ici: Cible = { client, journal }
  try {
    const mois = tour.maintenant.toString().slice(0, 7)
    if (plafondAtteint(coutDuMois(journal, mois).usd, config.plafonds.par_mois_usd)) {
      const texte =
        "Le plafond d'IA du mois est atteint : les gestes du quotidien restent possibles par l'interface, la conversation reprend le mois prochain."
      ecrire(ici, tour, [ligneConsigne(tour, 'refus', { erreur: texte })])
      return { sorte: 'reponse', reponse: { sorte: 'refus', texte } }
    }

    const attendue = precisionEnAttente(journal, tour)
    if (attendue) {
      const choix = choisirParmi(tour.consigne, attendue.candidats)
      if (choix) return { sorte: 'precisee', precision: attendue, choix }
      const suite = suiteDeLaQuestion(m, ici, tour, attendue)
      if (suite) return suite
    }
    return { sorte: 'a_traduire' }
  } finally {
    journal.fermer()
  }
}

/**
 * La traduction, le premier appel au modèle : la consigne masquée avec tous
 * les noms du client (`masquerPourModele` : un nom sûr devient l'identifiant,
 * un nom partagé ou ressemblant un jeton), le rôle, ses gestes et la date ;
 * puis chaque remplaçant redevient la mention telle qu'écrite
 * (`reprendreMentions`), que la suite résout ou fait préciser comme si le
 * modèle l'avait lue. Partagée par la conversation et l'éval de traduction.
 * Lève sur un masque en échec ou un fournisseur injoignable : rien n'est parti.
 */
export async function traduireConsigne<S>(
  m: MetierConversation<S>,
  s: S,
  modele: Modele,
  identite: Identite,
  consigne: string,
  maintenant: Temporal.ZonedDateTime,
): Promise<{ demande: Demande; reponse: ReponseModele; consigneModele: string }> {
  const masque = masquerPourModele(consigne, m.noms(s))
  const config = m.config(s)
  const actions = actionsDe(m.actions, identite.role)
  const traduite = await traduire(
    modele,
    config.modele.effort.traduire,
    config.plafonds.par_demande.tokens_sortie,
    systemeTraduire(roleDe(m.roles, identite), m.domaine, actions, m.intentions),
    outilsDe(m.actions, identite.role, m.domaine),
    masque.texte,
    maintenant,
    new Map(actions.map((a) => [a.id, schemaMontre(a)])),
  )
  return {
    demande: reprendreMentions(traduite.demande, masque.mentions),
    reponse: traduite.reponse,
    consigneModele: masque.texte,
  }
}

/** La traduction d'un tour, au journal : l'appel et la consigne telle qu'elle est partie ; un échec est dit. */
async function traduireLeTour<S>(
  m: MetierConversation<S>,
  s: S,
  modele: Modele,
  tour: Tour,
): Promise<Traduite> {
  const ici = cibleDe(m, s)
  let traduite: Awaited<ReturnType<typeof traduireConsigne>>
  try {
    traduite = await traduireConsigne(m, s, modele, tour.identite, tour.consigne, tour.maintenant)
  } catch (erreur) {
    ecrire(ici, tour, [ligneConsigne(tour, 'refus', { erreur: message(erreur) })])
    return {
      sorte: 'reponse',
      reponse: {
        sorte: 'je_ne_sais_pas',
        texte: `Je n'arrive pas à joindre le modèle : ${message(erreur)}`,
      },
    }
  }
  ecrire(ici, tour, [
    evenementAppel(
      ici.client,
      tour.conversation,
      'traduire',
      1,
      traduite.reponse,
      prixDe(m.config(s)),
      {
        consigne_modele: traduite.consigneModele,
      },
    ),
  ])
  return { sorte: 'traduite', demande: traduite.demande }
}

/** Le dossier ouvert : la cohérence de qui parle, puis la demande traduite (ou reprise après une question). */
async function apresLeDossier<S>(
  m: MetierConversation<S>,
  s: S,
  modele: Modele,
  tour: Tour,
  avant:
    | Exclude<Avant, { sorte: 'reponse' | 'a_traduire' }>
    | Exclude<Traduite, { sorte: 'reponse' }>,
): Promise<Reponse> {
  const ici = cibleDe(m, s)
  const refuser = (texte: string, donnees: Record<string, unknown> = {}): Reponse => {
    ecrire(ici, tour, [ligneConsigne(tour, 'refus', { ...donnees, erreur: texte })])
    return { sorte: 'refus', texte }
  }

  try {
    m.verifierIdentite(s, tour.identite)
  } catch (erreur) {
    return refuser(message(erreur))
  }

  const actions = actionsDe(m.actions, tour.identite.role)
  if (avant.sorte === 'precisee') {
    const { precision, choix } = avant
    if ('echappee' in precision) {
      const { consigne, intention, mention, precisions } = precision.echappee
      return echapper(m, s, modele, tour, 'precision', consigne, intention, [
        ...precisions,
        { mention, id: choix.id },
      ])
    }
    const action = actions.find((a) => a.id === precision.action)
    if (!action) return refuser(`l'action ${precision.action} n'est pas ouverte à ce rôle`)
    const demande = {
      sorte: 'action' as const,
      action: action.id,
      params: { ...precision.params, [precision.champ]: choix.id },
    }
    return agir(m, s, tour, action, demande, [...precision.resolus, precision.champ])
  }

  const { demande } = avant
  switch (demande.sorte) {
    case 'inconnue': {
      ecrire(ici, tour, [ligneConsigne(tour, 'inconnue', { demande })])
      // La raison peut venir du modèle : montrée seulement si elle ne cite rien d'autre que la consigne.
      const noms = m.vocabulaire(s, tour.identite).noms.map((a) => a.nom)
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
    case 'nouvelle':
      return echapper(m, s, modele, tour, 'nouvelle', tour.consigne, demande.intention, [], {
        demande,
      })
    case 'action': {
      const action = actions.find((a) => a.id === demande.action)
      if (!action)
        return refuser(`l'action ${demande.action} n'est pas ouverte à ce rôle`, { demande })
      return agir(m, s, tour, action, demande)
    }
  }
}

/**
 * Une demande nouvelle, vers l'échappée : la ligne `consigne` (`nouvelle`, ou
 * `precision` quand la consigne est la réponse à « vous parlez de qui ? »),
 * puis, pour un rôle qui désigne autrui, la consigne masquée : une mention ambiguë reçoit sa
 * question avant tout appel au modèle ; sinon l'échappée, avec la consigne
 * d'origine et les réponses déjà données. Un rôle qui ne désigne pas autrui
 * n'a pas de question : il ne désigne que lui-même, et aucun nom de collègue
 * ne lui est proposé.
 */
async function echapper<S>(
  m: MetierConversation<S>,
  s: S,
  modele: Modele,
  tour: Tour,
  issueLigne: 'nouvelle' | 'precision',
  consigne: string,
  intention: string,
  precisions: Precision[],
  donnees: Record<string, unknown> = {},
): Promise<Reponse> {
  const ici = cibleDe(m, s)
  if (!m.echappee) {
    ecrire(ici, tour, [ligneConsigne(tour, issueLigne, donnees)])
    return { sorte: 'je_ne_sais_pas', texte: 'Je ne sais pas encore faire ça.' }
  }
  if (aCapacite(m.roles, tour.identite, 'designe_autrui')) {
    const personnes = m.vocabulaire(s, tour.identite).noms
    const { precision } = masquerConsigne(consigne, personnes, precisions)
    if (precision) {
      const texte = question(m.roles, tour, precision.mention, precision.candidats)
      const attendue: PrecisionEchappee = {
        identite: tour.identite,
        candidats: precision.candidats,
        echappee: { consigne, intention, mention: precision.mention, precisions },
      }
      ecrire(ici, tour, [
        ligneConsigne(tour, issueLigne, donnees),
        {
          type: TYPE_PRECISION_ATTENDUE,
          objet: tour.conversation,
          issue: intention,
          motif: texte,
          donnees: attendue,
        },
      ])
      return { sorte: 'precision', texte, candidats: precision.candidats }
    }
  }
  ecrire(ici, tour, [ligneConsigne(tour, issueLigne, donnees)])
  let issue: Awaited<ReturnType<Echappee<S>>>
  try {
    issue = await m.echappee(
      s,
      tour.identite,
      tour.conversation,
      consigne,
      intention,
      tour.maintenant,
      modele,
      precisions,
    )
  } catch (erreur) {
    return { sorte: 'je_ne_sais_pas', texte: `Je n'y arrive pas : ${message(erreur)}.` }
  }
  if (issue.sorte === 'reponse') {
    return { sorte: 'resultat', texte: issue.texte, controle: issue.controle }
  }
  if (issue.sorte === 'abandon') {
    return { sorte: 'je_ne_sais_pas', texte: `Je n'y arrive pas : ${issue.motif}.` }
  }
  if (!m.proposition) return { sorte: 'resultat', texte: issue.texte }
  return ouvrirProposition(m, s, tour, m.proposition, issue.modifications)
}

/**
 * Une proposition, de l'échappée ou d'un geste codé qui propose : le métier
 * l'ouvre (ses contrôles ; un refus est au journal), puis la confirmation
 * attend le « oui » du demandeur, sur l'empreinte de la liste exacte ; ensuite
 * l'écriture du métier (ses accords, sa clé). PLAN-ESPACES.md § 7.2.
 */
function ouvrirProposition<S>(
  m: MetierConversation<S>,
  s: S,
  tour: Tour,
  proposition: PropositionMetier<S>,
  modifications: unknown[],
  corrige?: string,
): Reponse {
  const ici = cibleDe(m, s)
  let ouverte: { id: string; texte: string }
  try {
    ouverte = proposition.ouvrir(s, tour.conversation, modifications, tour.maintenant, corrige)
  } catch (erreur) {
    ecrire(ici, tour, [
      { type: TYPE_PROPOSITION_REFUSEE, objet: tour.conversation, motif: message(erreur) },
    ])
    return { sorte: 'je_ne_sais_pas', texte: message(erreur) }
  }
  const e = empreinte({
    conversation: tour.conversation,
    id: ouverte.id,
    modifications: JSON.stringify(modifications),
  })
  const attente: Attente = {
    identite: tour.identite,
    demande: {
      sorte: 'reaffectation',
      id: ouverte.id,
      ...(corrige !== undefined ? { corrige } : {}),
    },
    empreinte: e,
  }
  ecrire(ici, tour, [
    {
      type: TYPE_CONFIRMATION_ATTENDUE,
      objet: tour.conversation,
      issue: ouverte.id,
      motif: ouverte.texte,
      donnees: attente,
    },
  ])
  const choix = proposition.choix?.(s, ouverte.id) ?? []
  return {
    sorte: 'proposition',
    texte: `${ouverte.texte}\nValider ? (oui / non)`,
    empreinte: e,
    ...(choix.length > 0 ? { choix } : {}),
  }
}

/** L'issue de la résolution : les paramètres en identifiants, ou la personne qu'il faut faire préciser. */
export type Resolution =
  | { sorte: 'resolue'; params: Record<string, unknown> }
  | ({ sorte: 'precision'; mention: string } & Omit<PrecisionGeste, 'identite' | 'action'>)

/**
 * Trouve les personnes que nomment les paramètres d'une action, parmi celles
 * que ce rôle peut désigner : le code décide si c'est sûr (niveau 1) ; sinon
 * l'humain tranche, sur une question qui porte la liste courte des noms
 * ressemblants, ou rien si personne ne ressemble. Aucun nom ne part au
 * modèle, même proche (décidé le 2026-10-18 : le second appel qui départageait
 * la liste est retiré). Un homonyme exact va droit à la question.
 */
export function resoudre<S>(
  m: MetierConversation<S>,
  s: S,
  tour: Tour,
  action: Action<S, unknown>,
  params: Record<string, unknown>,
  resolus: string[] = [],
): Resolution {
  const personnes = m.vocabulaire(s, tour.identite).noms.filter((n) => n.sorte === 'personne')
  const p = { ...params }
  const faits = [...resolus]
  for (const champ of Object.keys(action.personnes ?? {})) {
    if (faits.includes(champ)) continue
    const mention = p[champ]
    const precision = (candidats: Designable[]): Resolution => ({
      sorte: 'precision',
      mention: String(mention),
      params: p,
      resolus: faits,
      champ,
      candidats,
    })
    // null : soi-même ou tous, selon le geste ; le geste en décide.
    if (typeof mention === 'string') {
      const exacts = correspondances(mention, personnes)
      if (exacts.length > 1) return precision(exacts)
      const trouve = exacts[0]
      // Un rôle qui ne désigne pas autrui ne désigne que lui-même (D4) : aucun
      // collègue au nom proche ne lui est proposé.
      if (!trouve && !aCapacite(m.roles, tour.identite, 'designe_autrui')) return precision([])
      if (!trouve) return precision(proches(mention, personnes))
      p[champ] = trouve.id
    }
    faits.push(champ)
  }
  return { sorte: 'resolue', params: p }
}

/** La mention, citée seulement si elle est dans la consigne : jamais un nom venu d'ailleurs. */
const citer = (tour: Tour, mention: string) =>
  normaliserNom(tour.consigne).includes(normaliserNom(mention))
    ? `« ${surUneLigne(mention)} »`
    : 'la personne nommée'

/**
 * La question « vous parlez de qui ? », rendue par le code : un seul candidat
 * se confirme d'un oui ; plusieurs se choisissent par leur numéro ou leur nom.
 * `relance` : la même question, reposée après une réponse ambiguë.
 */
function question(
  roles: RoleDeclare[],
  tour: Tour,
  mention: string,
  candidats: Designable[],
  relance = false,
): string {
  const tu = roleDe(roles, tour.identite).tutoie === true
  if (candidats.length === 0) {
    return `Je ne trouve personne qui corresponde à ${citer(tour, mention)}. ${tu ? 'Redis' : 'Redites'} la consigne avec le prénom et le nom.`
  }
  // Deux candidats au même nom complet : l'identifiant les distingue (il se tape aussi en réponse).
  const noms = candidats.map((c) =>
    candidats.filter((x) => x.nom === c.nom).length > 1 ? `${c.nom} (${c.id})` : c.nom,
  )
  const debut = relance ? "Je n'ai pas compris. " : ''
  const parles = tu ? 'Tu parles' : 'Vous parlez'
  const seul = noms.length === 1 ? noms[0] : undefined
  if (seul !== undefined) return `${debut}${parles} de « ${seul} » ? (oui / non)`
  const liste = noms.map((n, i) => `${i + 1}. ${n}`).join(', ')
  return `${debut}${parles} de qui : ${liste} ? ${tu ? 'Réponds' : 'Répondez'} par le numéro ou le nom.`
}

/**
 * Une action choisie : ses personnes trouvées (ou la question), ses
 * paramètres relus par le schéma de l'exécution, puis tout de suite si elle
 * lit, après un « oui » si elle écrit. `resolus` : les personnes déjà
 * trouvées, quand le geste reprend après une question.
 */
async function agir<S>(
  m: MetierConversation<S>,
  s: S,
  tour: Tour,
  action: Action<S, unknown>,
  demande: Extract<Demande, { sorte: 'action' }>,
  resolus?: string[],
): Promise<Reponse> {
  const ici = cibleDe(m, s)
  const issue = resolus === undefined ? 'action' : 'precision'
  const r = resoudre(m, s, tour, action, demande.params, resolus)
  if (
    r.sorte === 'precision' &&
    r.candidats.length === 0 &&
    !aCapacite(m.roles, tour.identite, 'designe_autrui')
  ) {
    // Un rôle qui ne désigne pas autrui ne désigne que lui-même (D4) : rien à lui proposer, rien à lui apprendre.
    const texte = `Tu ne peux désigner que toi-même : ${citer(tour, r.mention)} ne te désigne pas.`
    ecrire(ici, tour, [ligneConsigne(tour, issue, { demande, erreur: texte })])
    return { sorte: 'refus', texte }
  }
  if (r.sorte === 'precision') {
    const texte = question(m.roles, tour, r.mention, r.candidats)
    const attendue: PrecisionGeste = {
      identite: tour.identite,
      action: action.id,
      params: r.params,
      resolus: r.resolus,
      champ: r.champ,
      candidats: r.candidats,
    }
    ecrire(ici, tour, [
      ligneConsigne(tour, issue, { demande }),
      {
        type: TYPE_PRECISION_ATTENDUE,
        objet: tour.conversation,
        issue: action.id,
        motif: texte,
        donnees: attendue,
      },
    ])
    return { sorte: 'precision', texte, candidats: r.candidats }
  }
  const lus = action.parametres.safeParse(r.params)
  if (!lus.success) {
    const texte = 'paramètres invalides'
    ecrire(ici, tour, [ligneConsigne(tour, issue, { demande, erreur: texte })])
    return { sorte: 'refus', texte }
  }
  const params = lus.data as Record<string, unknown>
  // Un geste qui propose ne fait que calculer : il s'exécute avant le « oui », qui porte sur sa proposition.
  if (!action.ecrit || action.propose) {
    const fait = await executer(action, s, tour.identite, params, tour.maintenant)
    ecrire(ici, tour, [
      ligneConsigne(tour, issue, {
        demande,
        params,
        ...erreurDe(fait.reponse),
        ...(fait.donnees !== undefined ? { resultat: fait.donnees } : {}),
      }),
    ])
    if (!action.propose || fait.modifications === undefined) return fait.reponse
    if (!m.proposition) return { sorte: 'refus', texte: "ce métier n'écrit pas de proposition" }
    return ouvrirProposition(m, s, tour, m.proposition, fait.modifications, fait.corrige)
  }
  let texte: string
  try {
    texte = action.reformuler(s, tour.identite, params)
  } catch (erreur) {
    ecrire(ici, tour, [ligneConsigne(tour, issue, { demande, params, erreur: message(erreur) })])
    return { sorte: 'refus', texte: message(erreur) }
  }
  const e = empreinte({
    conversation: tour.conversation,
    action: action.id,
    params: JSON.stringify(params),
  })
  ecrire(ici, tour, [
    ligneConsigne(tour, issue, { demande, params }),
    {
      type: TYPE_CONFIRMATION_ATTENDUE,
      objet: tour.conversation,
      issue: action.id,
      motif: texte,
      donnees: {
        identite: tour.identite,
        demande: { sorte: 'action', action: action.id, params },
        empreinte: e,
      } satisfies Attente,
    },
  ])
  return { sorte: 'confirmation', texte: `${texte} (oui / non)`, empreinte: e }
}

/** Le message d'un refus, à garder au journal. */
const erreurDe = (r: Reponse) => (r.sorte === 'refus' ? { erreur: r.texte } : {})

/** Exécute une action ; ses messages d'erreur sont écrits pour le client, ils sont rendus tels quels. Ce qui a servi au texte (`donnees`) va au journal ; les modifications d'un geste qui propose sont rendues à part. */
async function executer<S>(
  action: Action<S, unknown>,
  s: S,
  identite: Identite,
  params: unknown,
  maintenant: Temporal.ZonedDateTime,
): Promise<{ reponse: Reponse; donnees?: unknown; modifications?: unknown[]; corrige?: string }> {
  try {
    const { texte, donnees, modifications, corrige, choix, replis } = await action.executer(
      s,
      identite,
      params,
      maintenant,
    )
    return {
      reponse: {
        sorte: 'resultat',
        texte,
        ...(choix !== undefined ? { choix } : {}),
        ...(replis !== undefined ? { replis } : {}),
      },
      ...(donnees !== undefined ? { donnees } : {}),
      ...(modifications !== undefined ? { modifications } : {}),
      ...(corrige !== undefined ? { corrige } : {}),
    }
  } catch (erreur) {
    return { reponse: { sorte: 'refus', texte: message(erreur) } }
  }
}

/** La réponse à une confirmation en attente : la dernière de la conversation, du même demandeur, au même contenu. Le demandeur doit encore exister dans les données. */
export async function confirmer<S>(
  m: MetierConversation<S>,
  s: S,
  identite: IdentiteVerifiee,
  conversation: string,
  empreinteRecue: string,
  oui: boolean,
  maintenant: Temporal.ZonedDateTime,
): Promise<Reponse> {
  try {
    m.verifierIdentite(s, identite)
  } catch (erreur) {
    return { sorte: 'refus', texte: message(erreur) }
  }
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
    !memeIdentiteLue(attente.identite, identite)
  ) {
    return { sorte: 'refus', texte: 'aucune confirmation en attente pour ce contenu' }
  }
  const r: Reponse = !oui
    ? { sorte: 'resultat', texte: "D'accord, rien n'est fait." }
    : await executerAttente(m, s, identite, attente.demande, maintenant)
  ecrire(cibleDe(m, s), tour, [
    {
      type: TYPE_CONFIRMATION,
      objet: conversation,
      issue: oui ? 'oui' : 'non',
      donnees: { empreinte: empreinteRecue, ...erreurDe(r) },
    },
  ])
  return r
}

/** Ce qu'un « oui » déclenche : l'action reformulée (le « oui » d'un geste qui propose porte sur sa proposition), ou la validation d'une proposition. */
async function executerAttente<S>(
  m: MetierConversation<S>,
  s: S,
  identite: Identite,
  demande: Attente['demande'],
  maintenant: Temporal.ZonedDateTime,
): Promise<Reponse> {
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
  // Le « oui » d'une action qui propose porte sur sa proposition, jamais sur elle.
  if (action.propose) {
    return { sorte: 'refus', texte: `l'action ${demande.action} ne s'exécute pas sur un « oui »` }
  }
  const params = action.parametres.safeParse(demande.params)
  if (!params.success) return { sorte: 'refus', texte: 'paramètres invalides' }
  return (await executer(action, s, identite, params.data, maintenant)).reponse
}
