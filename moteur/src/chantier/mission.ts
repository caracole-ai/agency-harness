import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { ConfigBase, chargerConfig, FICHIER_CONFIG, MOTIF_SLUG, NOM_METIER } from '../config'
import { FORMAT_INTENTION, type Intention } from '../conversation/actions'
import { type MetierConversation, TYPE_CONSIGNE } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { type Domaine, motifPourMasquer } from '../conversation/domaine'
import { MOTIF_ID_CONVERSATION } from '../conversation/id'
import { type Identite, IdentiteSchema } from '../conversation/roles'
import type { IssueEchappee } from '../echappee/boucle'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import { fuites } from '../echappee/pseudonymes'
import {
  commanderGeste,
  type DemandeSansGeste,
  demandeACommander,
  demandesSansGeste,
  ErreurCommande,
  NOUVELLE,
  TYPE_GESTE_COMMANDE,
} from '../gestes/commande'
import type { Ligne } from '../journal/journal'
import { MOTIF_VERSION } from '../livraison/version'
import { FUSEAU, jourDe, type Temporal } from '../temps/temporal'
import { interdits, type MissionRetiree, slugClient } from './memoire'

// La mission d'un chantier (REFLEXIONS.md, décidé le 2026-10-15) : un geste
// codé que le patron a commandé (« Créer ce geste »). Le code l'écrit chez le
// client (`missions/<date>/<id>.yaml`, `commanderMission`), relue avant de
// partir (aucun nom, aucun identifiant : PLAN-LIVRAISON.md L3) ; le chantier,
// à l'agence, la relit par un schéma strict et décide en code avant tout
// appel : une mission retirée, ou dont l'intention a déjà un geste actif, ne
// lance rien. Ce qui part au modèle du chantier n'est jamais la mission
// entière : ni ses échappées ni le client, des types seulement. Le chantier
// rend un statut (`<id>.statut.yaml`, L7) : une donnée, lue par un schéma
// strict.

/** La ligne d'un chantier au journal : l'identifiant de la mission en objet, l'issue. */
export const TYPE_CHANTIER = 'chantier'
/** Où vivent les missions chez le client : `<client>/missions/<date>/<id>.yaml`. */
export const DOSSIER_MISSIONS = 'missions'
/** La seule sorte de mission : un geste codé, sur commande du patron. */
export const SORTE_MISSION = 'geste_code'
export const STATUTS_MISSION = { a_faire: 'à faire' } as const
export const ECHAPPEES_MAX = 20
export const CONSIGNES_TYPES_MAX = 5
export const CONSIGNE_TYPE_LONGUEUR_MAX = 200
/** Ce que dit le `pourquoi` d'une intention commandée que le métier ne déclare pas. */
export const HORS_VOCABULAIRE = 'hors du vocabulaire du métier'

export const Mission = z.strictObject({
  id: z.string().regex(FORMAT_INTENTION),
  sorte: z.literal(SORTE_MISSION),
  titre: z.string().min(1).max(120),
  pourquoi: z.string().min(1).max(600),
  echappees: z.array(z.string()).max(ECHAPPEES_MAX),
  intentions: z.array(z.string().regex(FORMAT_INTENTION)).min(1).max(10),
  consignes_types: z
    .array(z.string().min(1).max(CONSIGNE_TYPE_LONGUEUR_MAX))
    .min(1)
    .max(CONSIGNES_TYPES_MAX),
  ecrit: z.boolean(),
  date: z.iso.date(),
  metier: z.string().regex(NOM_METIER),
  statut: z.string().min(1),
})
export type Mission = z.infer<typeof Mission>

/** Deux listes d'intentions non vides, aux mêmes éléments. */
export const memesIntentions = (a: string[], b: string[]) =>
  a.length > 0 && a.length === b.length && a.every((x) => b.includes(x))

/** Ce que le code sait du catalogue pour décider d'une mission : des identifiants, aucune donnée. */
export interface Catalogue {
  /** Les gestes codés du métier. */
  gestes: { id: string }[]
  /** Les missions déjà écrites dans `missions/` du client. */
  missions_ouvertes: {
    id: string
    sorte: string
    date: string
    statut: string
    intentions: string[]
  }[]
}

/** Une mission écrite chez le client, telle que le catalogue la relit (une ancienne peut différer du schéma). */
const MissionEcrite = z.looseObject({
  id: z.string(),
  sorte: z.string(),
  date: z.string(),
  statut: z.string(),
  intentions: z.array(z.string()).default([]),
})

/** Les missions déjà écrites chez le client, toutes dates (un statut à côté n'en est pas une). */
export function missionsOuvertes(dossierClient: string): Catalogue['missions_ouvertes'] {
  const racine = join(dossierClient, DOSSIER_MISSIONS)
  if (!existsSync(racine)) return []
  return readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(racine, d.name))
        .filter((f) => f.endsWith('.yaml') && !f.endsWith(SUFFIXE_STATUT))
        .flatMap((f) => {
          const lu = MissionEcrite.safeParse(parse(readFileSync(join(racine, d.name, f), 'utf8')))
          return lu.success
            ? [
                {
                  id: lu.data.id,
                  sorte: lu.data.sorte,
                  date: lu.data.date,
                  statut: lu.data.statut,
                  intentions: lu.data.intentions,
                },
              ]
            : []
        }),
    )
}

/** Le catalogue : les gestes codés du métier, les missions déjà écrites (`missionsOuvertes` chez le client, aucune au chantier). */
export function construireCatalogue<S>(
  m: MetierConversation<S>,
  missions_ouvertes: Catalogue['missions_ouvertes'],
): Catalogue {
  return { gestes: m.actions.map((a) => ({ id: a.id })), missions_ouvertes }
}

export interface MissionLue {
  mission: Mission
  /** Le client, en slug (le nom de son dossier) ; ni la mémoire ni la version ne le citent (décidé le 2026-10-20). */
  client: string
}

/**
 * Lit une mission, chez le client (`<client>/missions/<date>/<id>.yaml`) ou
 * dans sa file à l'agence (`<slug>/<date>/<id>.yaml`, PLAN-LIVRAISON.md
 * L6) ; lève si le fichier n'est pas une mission, ou n'est pas à sa place.
 */
export function lireMission(chemin: string): MissionLue {
  const dossierDate = dirname(chemin)
  const file = dirname(dossierDate)
  const client =
    basename(file) === DOSSIER_MISSIONS ? slugClient(basename(dirname(file))) : basename(file)
  if (!MOTIF_SLUG.test(client)) {
    throw new Error(
      `${chemin} : une mission vit dans <client>/${DOSSIER_MISSIONS}/<date>/<id>.yaml, ou <slug>/<date>/<id>.yaml dans une file`,
    )
  }
  const lu = Mission.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!lu.success) throw new Error(`${chemin} : mission invalide (${z.prettifyError(lu.error)})`)
  if (`${lu.data.id}.yaml` !== basename(chemin) || lu.data.date !== basename(dossierDate)) {
    throw new Error(`${chemin} : l'identifiant ou la date ne sont pas ceux du chemin`)
  }
  return { mission: lu.data, client }
}

export type Decision = { sorte: 'chantier' } | { sorte: 'ecartee'; motif: string }

/**
 * Ce que devient la mission au moment du chantier, sur le catalogue du jour
 * (l'état a pu changer depuis la commande) et les retraits de la mémoire (G2).
 */
export function decider(m: Mission, catalogue: Catalogue, retirees: MissionRetiree[]): Decision {
  // Un retrait ne vaut que pour son métier : un autre métier peut porter le même identifiant.
  const retiree = retirees.find(
    (r) => r.metier === m.metier && (r.id === m.id || memesIntentions(r.intentions, m.intentions)),
  )
  if (retiree)
    return { sorte: 'ecartee', motif: `mission retirée (${retiree.id}) : jamais refaite` }
  const codes = new Set(catalogue.gestes.map((g) => g.id))
  const avecGeste = m.intentions.filter((i) => codes.has(i))
  if (avecGeste.length > 0) {
    return { sorte: 'ecartee', motif: `${avecGeste.join(', ')} : un geste codé existe déjà` }
  }
  return { sorte: 'chantier' }
}

/** Les identifiants d'échappée, de conversation ou de personne (le motif du métier) qu'un texte citerait : remplacés par un type. */
const sansIdentifiant = (texte: string, domaine: Domaine) =>
  texte
    .replace(MOTIF_ID_CONVERSATION, '<échappée>')
    .replace(motifPourMasquer(domaine), '<personne>')

/** La mission telle qu'elle part au modèle du chantier : des types, ni échappées, ni client (R3). */
export function missionPourModele(m: Mission, domaine: Domaine): string {
  const sans = (texte: string) => sansIdentifiant(texte, domaine)
  return [
    `- identifiant : \`${m.id}\` ; sorte : ${m.sorte} ; métier : ${m.metier} ; écrit : ${m.ecrit ? 'oui' : 'non'}`,
    `- titre : ${sans(m.titre)}`,
    `- pourquoi : ${sans(m.pourquoi)}`,
    `- intentions : ${m.intentions.length > 0 ? m.intentions.map((i) => `\`${i}\``).join(', ') : 'aucune'}`,
    '- consignes-types (les demandes, réécrites avec des places) :',
    ...m.consignes_types.map((c) => `  - « ${sans(c)} »`),
  ].join('\n')
}

/** La fin d'une échappée qui a proposé une modification. */
const PROPOSITION: IssueEchappee['sorte'] = 'proposition'

/** Ce qu'une ligne `echappee` dit d'elle-même, pour la mission commandée. */
const DonneesEchappee = z.looseObject({
  echappee: z.string(),
  intention: z.string(),
  consigne_modele: z.string().optional(),
})

/** Ce que le code lit pour écrire une mission commandée, en plus du journal. */
export interface ContexteCommande {
  catalogue: Catalogue
  /** L'intention telle que le métier la déclare, s'il la déclare. */
  declaree?: Intention
  personnes: Designable[]
  domaine: Domaine
  metier: string
  /** Le jour de la commande, en heure de Paris. */
  date: Temporal.PlainDate
}

/**
 * La mission `geste_code` d'une intention que le patron commande, écrite par
 * le code depuis le journal, sans modèle : les échappées de cette intention
 * (toutes issues, les plus récentes d'abord) et leurs consignes version
 * modèle, identifiants remplacés par un type, gardées seulement si aucun nom
 * n'y reste. Jamais `par`, jamais le résumé d'une demande (il peut porter un
 * nom). Lève (`ErreurCommande`) : une intention sans demande ou déjà commandée,
 * un geste codé du même nom, une mission du même nom déjà ouverte, aucune
 * consigne utilisable, une décision du chantier qui ne serait pas `chantier`.
 */
export function missionCommandee(intention: string, lignes: Ligne[], c: ContexteCommande): Mission {
  const demande = demandeACommander(lignes, intention)
  const date = c.date.toString()
  if (c.catalogue.gestes.some((g) => g.id === intention)) {
    throw new ErreurCommande(`${intention} : un geste codé porte déjà ce nom`)
  }
  // Une mission `geste_code` du jour sous ce nom, sans ligne `geste commandé` : la commande
  // d'un clic dont le journal a échoué ; ce clic-ci la réécrit à l'identique.
  const ouverte = c.catalogue.missions_ouvertes.find(
    (o) => o.id === intention && !(o.sorte === 'geste_code' && o.date === date),
  )
  if (ouverte) {
    throw new ErreurCommande(
      `${intention} : une mission de ce nom est déjà ouverte (${ouverte.date}, ${ouverte.statut})`,
    )
  }
  const echappees: string[] = []
  const consignes: string[] = []
  let proposee = false
  for (const l of [...lignes].reverse()) {
    if (l.type !== TYPE_ECHAPPEE || l.donnees === null) continue
    const lu = DonneesEchappee.safeParse(JSON.parse(l.donnees))
    if (!lu.success || lu.data.intention !== intention) continue
    if (l.issue === PROPOSITION) proposee = true
    if (!echappees.includes(lu.data.echappee)) echappees.push(lu.data.echappee)
    const texte =
      lu.data.consigne_modele === undefined
        ? ''
        : sansIdentifiant(lu.data.consigne_modele, c.domaine).trim()
    if (
      texte !== '' &&
      texte.length <= CONSIGNE_TYPE_LONGUEUR_MAX &&
      !consignes.includes(texte) &&
      fuites(texte, c.personnes).length === 0
    ) {
      consignes.push(texte)
    }
  }
  if (consignes.length === 0) {
    throw new ErreurCommande(
      `${intention} : aucune consigne utilisable (demandes trop anciennes, ou qui portent un nom) ; rien n'est commandé`,
    )
  }
  const mission = Mission.parse({
    id: intention,
    sorte: SORTE_MISSION,
    titre: `Geste commandé par le patron : ${intention}`,
    pourquoi: `Commandé par le patron le ${date} ; ${demande.compte} demande(s) sans geste sous cette intention : ${c.declaree?.description ?? HORS_VOCABULAIRE}`,
    echappees: echappees.slice(0, ECHAPPEES_MAX),
    intentions: [intention],
    consignes_types: consignes.slice(0, CONSIGNES_TYPES_MAX),
    ecrit: c.declaree?.ecrit ?? proposee,
    date,
    metier: c.metier,
    statut: STATUTS_MISSION.a_faire,
  })
  const decision = decider(mission, c.catalogue, [])
  if (decision.sorte !== 'chantier') throw new ErreurCommande(`${intention} : ${decision.motif}`)
  // Ce qui part du client (L3) : le texte entier relu contre les noms, là où ils sont.
  if (interdits(missionPourModele(mission, c.domaine), c.personnes).length > 0) {
    throw new ErreurCommande(
      `${intention} : la mission porterait un nom ou un identifiant ; rien n'est commandé`,
    )
  }
  return mission
}

/** Écrit la mission chez le client (`<client>/missions/<date>/<id>.yaml`) ; rend le chemin. */
export function ecrireMission(dossierClient: string, mission: Mission): string {
  const dossier = join(dossierClient, DOSSIER_MISSIONS, mission.date)
  mkdirSync(dossier, { recursive: true })
  const chemin = join(dossier, `${mission.id}.yaml`)
  writeFileSync(chemin, stringify(mission))
  return chemin
}

/**
 * « Créer ce geste » : les contrôles, la mission écrite sur disque, puis la
 * ligne `geste commandé` (`commanderGeste`). Le fichier avant la ligne : un
 * journal en panne laisse une mission que le clic suivant réécrit ; l'inverse
 * laisserait une commande sans mission. `par` est l'identité vérifiée.
 */
export function commanderMission<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  intention: string,
  par: Identite,
  maintenant: Temporal.ZonedDateTime,
): { intention: string; le: string; chemin: string } {
  const journal = m.journal(s)
  const mission = missionCommandee(
    intention,
    journal.lire(),
    contexteCommande(m, s, dossierClient, intention, maintenant),
  )
  const chemin = ecrireMission(dossierClient, mission)
  return { ...commanderGeste(journal, m.client(s), intention, par, maintenant), chemin }
}

/** Ce que le code lit chez le client pour écrire la mission d'une intention, le jour dit. */
function contexteCommande<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  intention: string,
  maintenant: Temporal.ZonedDateTime,
): ContexteCommande {
  const declaree = m.intentions.find((i) => i.id === intention)
  return {
    catalogue: construireCatalogue(m, missionsOuvertes(dossierClient)),
    ...(declaree ? { declaree } : {}),
    personnes: m.noms(s),
    domaine: m.domaine,
    metier: chargerConfig(join(dossierClient, FICHIER_CONFIG), ConfigBase).metier,
    date: maintenant.withTimeZone(FUSEAU).toPlainDate(),
  }
}

/** Combien de demandes le détail d'une demande sans geste montre, de la plus récente à la plus ancienne. */
export const DEMANDES_DETAIL_MAX = 10

/** Une demande reçue sous une intention : quand, qui, les mots tapés, et ce que la question libre en a fait. */
export interface DemandeRecue {
  /** L'horodatage de la consigne (instant ISO). */
  le: string
  identite: Identite
  consigne: string
  /** L'issue de la question libre qui a suivi (`reponse`, `proposition`, `abandon`) ; absente sans question libre. */
  echappee?: string
}

/** Une étape d'une commande : la commande elle-même, puis chaque statut de chantier reçu, au jour de Paris. */
export type EtapeCommande =
  | { sorte: 'commande'; le: string; par: Identite }
  | { sorte: 'chantier'; le: string; issue: string; version?: string }

/** Le détail d'une demande sans geste, pour le patron (l'onglet « Gestes », le volet). */
export interface DetailSansGeste {
  intention: string
  /** Toutes les demandes, et le jour de la première. */
  compte: number
  premiere: string
  /** Les dernières demandes (`DEMANDES_DETAIL_MAX`), de la plus récente à la plus ancienne. */
  demandes: DemandeRecue[]
  /** La dernière commande et ce qui l'a suivie, dans l'ordre ; vide sans commande. */
  etapes: EtapeCommande[]
  /**
   * Ce qui part à l'agence : la mission écrite (commandée), ou celle que la
   * commande écrirait (pas encore commandée) ; absente si elle n'est pas
   * relue (une ancienne mission) ou si la commande serait refusée (`refus`).
   */
  mission?: { consignes_types: string[]; ecrit: boolean }
  /** Pourquoi « Créer ce geste » serait refusé aujourd'hui, en clair (`ErreurCommande`). */
  refus?: string
}

/** Les `donnees` d'une ligne, lues telles quelles (null si absentes) : un schéma les relit ensuite. */
const donneesDe = (l: Ligne): unknown => JSON.parse(l.donnees ?? 'null')

/** Ce qu'une ligne `consigne` finie en demande nouvelle dit d'elle-même : qui, et l'intention. */
const DonneesConsigne = z.looseObject({
  identite: IdentiteSchema,
  demande: z.looseObject({ intention: z.string() }),
})
/** Ce qu'une ligne `geste commandé` dit de qui a commandé. */
const DonneesCommande = z.looseObject({ par: IdentiteSchema })

/** La mission écrite le jour de la commande, relue par le schéma strict ; absente ou illisible : undefined. */
function missionEcrite(
  dossierClient: string,
  jour: string,
  intention: string,
): Mission | undefined {
  const chemin = join(dossierClient, DOSSIER_MISSIONS, jour, `${intention}.yaml`)
  if (!existsSync(chemin)) return undefined
  return Mission.safeParse(parse(readFileSync(chemin, 'utf8'))).data
}

/**
 * Le détail d'une demande sans geste, lu dans le journal sans modèle : les
 * demandes (qui, quand, les mots tapés, l'issue de la question libre qui a
 * suivi dans la même conversation), les étapes de la dernière commande, et
 * ce qui part à l'agence : la mission écrite, ou, avant la commande, celle
 * que `missionCommandee` écrirait (ses refus deviennent `refus`). Lève
 * (`ErreurCommande`) : une intention mal formée ou sans demande.
 */
export function detailSansGeste<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  intention: string,
  maintenant: Temporal.ZonedDateTime,
): DetailSansGeste {
  if (!FORMAT_INTENTION.test(intention)) {
    throw new ErreurCommande('intention attendue : le mot-clé de la demande, en snake_case')
  }
  const lignes = m.journal(s).lire()
  const demande = demandesSansGeste(lignes).find((d) => d.intention === intention)
  if (!demande) throw new ErreurCommande(`${intention} : aucune demande sans geste sous ce mot`)

  const demandes: DemandeRecue[] = []
  // La demande d'une conversation qui attend encore sa question libre.
  const enAttente = new Map<string, DemandeRecue>()
  let etapes: EtapeCommande[] = []
  for (const l of lignes) {
    if (l.type === TYPE_CONSIGNE && l.issue === NOUVELLE && l.objet !== null) {
      const lue = DonneesConsigne.safeParse(donneesDe(l)).data
      if (lue?.demande.intention !== intention) continue
      const recue = { le: l.horodatage, identite: lue.identite, consigne: l.motif ?? '' }
      demandes.push(recue)
      enAttente.set(l.objet, recue)
    } else if (l.type === TYPE_ECHAPPEE && l.objet !== null && l.issue !== null) {
      const recue = enAttente.get(l.objet)
      if (!recue || DonneesEchappee.safeParse(donneesDe(l)).data?.intention !== intention) continue
      recue.echappee = l.issue
      enAttente.delete(l.objet)
    } else if (l.type === TYPE_GESTE_COMMANDE && l.objet === intention) {
      const par = DonneesCommande.safeParse(donneesDe(l)).data?.par
      // Une commande nouvelle (après un retrait) repart de zéro, comme `demandesAvecEtat`.
      etapes = par ? [{ sorte: 'commande', le: jourDe(l.horodatage).toString(), par }] : []
    } else if (l.type === TYPE_CHANTIER && l.objet === intention && l.issue !== null) {
      const version = DonneesChantier.safeParse(donneesDe(l)).data?.version
      etapes.push({
        sorte: 'chantier',
        le: jourDe(l.horodatage).toString(),
        issue: l.issue,
        ...(version ? { version } : {}),
      })
    }
  }

  let mission: Mission | undefined
  let refus: string | undefined
  if (demande.commande) {
    mission = missionEcrite(dossierClient, demande.commande.le, intention)
  } else {
    try {
      mission = missionCommandee(
        intention,
        lignes,
        contexteCommande(m, s, dossierClient, intention, maintenant),
      )
    } catch (erreur) {
      if (!(erreur instanceof ErreurCommande)) throw erreur
      refus = erreur.message
    }
  }
  return {
    intention,
    compte: demande.compte,
    premiere: demandes[0] ? jourDe(demandes[0].le).toString() : demande.derniere,
    demandes: demandes.reverse().slice(0, DEMANDES_DETAIL_MAX),
    etapes,
    ...(mission
      ? { mission: { consignes_types: mission.consignes_types, ecrit: mission.ecrit } }
      : {}),
    ...(refus ? { refus } : {}),
  }
}

/** Ce que le chantier rend d'une mission (L7) : `en cours` et `en attente` sont écrits par `pnpm agence`. */
export const STATUTS_CHANTIER = [
  'en cours',
  'fusionné',
  'refusé',
  'écartée',
  'échoué',
  'en attente',
  'retiré',
] as const
export type StatutChantier = (typeof STATUTS_CHANTIER)[number]
/** Le statut d'une mission, à côté d'elle : `<date>/<id>.statut.yaml`. */
export const SUFFIXE_STATUT = '.statut.yaml'
/** Le dossier d'un chantier, à côté de son statut : `<id>.chantier.md`. */
export const SUFFIXE_DOSSIER = '.chantier.md'

export const Statut = z.strictObject({
  statut: z.enum(STATUTS_CHANTIER),
  issue: z.string().min(1),
  /** L'étiquette de la version qui porte la fusion ou le retrait (PLAN-LIVRAISON.md L4). */
  version: z.string().regex(MOTIF_VERSION).optional(),
  cout_usd: z.number().nonnegative(),
  le: z.iso.datetime(),
})
export type Statut = z.infer<typeof Statut>

/** Écrit `<dossier>/<id>.statut.yaml` ; rend son chemin. */
export function ecrireStatut(dossier: string, id: string, statut: Statut): string {
  mkdirSync(dossier, { recursive: true })
  const chemin = join(dossier, `${id}${SUFFIXE_STATUT}`)
  writeFileSync(chemin, stringify(Statut.parse(statut)))
  return chemin
}

/** Lit un statut par le schéma strict : une donnée venue d'ailleurs, jamais une instruction ; absent : undefined, invalide : lève. */
export function lireStatut(chemin: string): Statut | undefined {
  if (!existsSync(chemin)) return undefined
  const lu = Statut.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!lu.success) throw new Error(`${chemin} : statut invalide (${z.prettifyError(lu.error)})`)
  return lu.data
}

/** Ce que devient une commande : le dernier chantier qui l'a suivie, et si le geste est dans le catalogue. */
export interface EtatCommande {
  par: Identite
  le: string
  /** Le dernier statut du chantier (L7) ; `version` : l'étiquette qui porte la fusion ou le retrait. */
  chantier?: { issue: string; le: string; version?: string }
  /** Un geste codé du métier porte l'identifiant de l'intention (`methode/chantier.md`). */
  disponible: boolean
}
export type DemandeAvecEtat = Omit<DemandeSansGeste, 'commande'> & { commande?: EtatCommande }

/** Ce qu'une ligne `chantier` garde du statut qu'elle dit (L7) : son heure, sa version s'il en a une. */
export const DonneesChantier = z.looseObject({
  le: z.string().optional(),
  version: z.string().optional(),
})

/**
 * Les demandes sans geste, chaque commande avec son état : la dernière ligne
 * `chantier` de l'intention écrite après la commande (son issue, son jour), et
 * `disponible` si un geste codé du métier porte l'intention.
 */
export function demandesAvecEtat(lignes: Ligne[], gestesCodes: string[]): DemandeAvecEtat[] {
  const chantiers = new Map<string, NonNullable<EtatCommande['chantier']>>()
  for (const l of lignes) {
    if (l.objet === null) continue
    if (l.type === TYPE_GESTE_COMMANDE) chantiers.delete(l.objet)
    if (l.type === TYPE_CHANTIER && l.issue !== null) {
      const version = DonneesChantier.safeParse(JSON.parse(l.donnees ?? 'null')).data?.version
      chantiers.set(l.objet, {
        issue: l.issue,
        le: jourDe(l.horodatage).toString(),
        ...(version ? { version } : {}),
      })
    }
  }
  const codes = new Set(gestesCodes)
  return demandesSansGeste(lignes).map(({ commande, ...d }) => {
    if (!commande) return d
    const chantier = chantiers.get(d.intention)
    return {
      ...d,
      commande: {
        ...commande,
        ...(chantier ? { chantier } : {}),
        disponible: codes.has(d.intention),
      },
    }
  })
}
