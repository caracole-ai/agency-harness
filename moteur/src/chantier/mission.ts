import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { Intention } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { type Domaine, motifPourMasquer } from '../conversation/domaine'
import { MOTIF_ID_CONVERSATION } from '../conversation/id'
import type { Identite } from '../conversation/roles'
import type { IssueEchappee } from '../echappee/boucle'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import { fuites } from '../echappee/pseudonymes'
import { ErreurAtelier } from '../gestes/atelier'
import {
  commanderGeste,
  type DemandeSansGeste,
  demandeACommander,
  demandesSansGeste,
  TYPE_GESTE_COMMANDE,
} from '../gestes/commande'
import type { Ligne } from '../journal/journal'
import {
  CONSIGNE_TYPE_LONGUEUR_MAX,
  CONSIGNES_TYPES_MAX,
  ECHAPPEES_MAX,
  ESTIMATIONS,
  MissionRonde,
  memesIntentions,
  SORTES_MISSION,
  type SorteMission,
  STATUTS_MISSION,
} from '../ronde/rapport'
import { type Catalogue, jourDe } from '../ronde/resume'
import { construireCatalogue, DOSSIER_RONDES, HORS_VOCABULAIRE } from '../ronde/ronde'
import { FUSEAU, type Temporal } from '../temps/temporal'
import type { MissionRetiree } from './memoire'

// La mission d'un chantier (PLAN-RONDE.md § 6.1, amendé § 0.b) : celle que la
// ronde a écrite chez le client (`rondes/<date>/<id>.yaml`), ou celle que le
// code écrit à la commande du patron (un geste codé : `commanderMission`),
// relue par un schéma strict, puis la décision prise en code avant tout appel : une question
// pour l'atelier ne lance rien ; une mission écartée, retirée ou dont une
// intention a déjà un geste actif non plus. Ce qui part au
// modèle du chantier n'est jamais la mission entière : ni ses échappées ni le
// client, des types seulement (R3).

/** La ligne d'un chantier au journal : l'identifiant de la mission en objet, l'issue. */
export const TYPE_CHANTIER = 'chantier'

/** Ce que dit une mission sans estimation : celle que le code écrit, sans modèle. */
const NON_ESTIMEE = 'non estimée (mission écrite par le code, sur commande du patron)'

export const Mission = z.strictObject({
  ...MissionRonde.shape,
  sorte: z.enum(SORTES_MISSION),
  /** Absente d'une mission commandée : le code ne devine pas la taille. */
  estimation: z.enum(ESTIMATIONS).optional(),
  date: z.iso.date(),
  metier: z.string().min(1),
  statut: z.string().min(1),
  raison: z.string().optional(),
})
export type Mission = z.infer<typeof Mission>

export interface MissionLue {
  mission: Mission
  /** Le dossier du client : la mission est dans `<dossier>/rondes/<date>/`. */
  dossierClient: string
  /** Le nom du dossier du client, pour le dossier de chantier seulement (§ 6.1). */
  client: string
}

/** Lit `<client>/rondes/<date>/<id>.yaml` ; lève si le fichier n'est pas une mission d'une ronde. */
export function lireMission(chemin: string): MissionLue {
  const dossierDate = dirname(chemin)
  const dossierRondes = dirname(dossierDate)
  if (basename(dossierRondes) !== DOSSIER_RONDES) {
    throw new Error(`${chemin} : une mission vit dans <client>/${DOSSIER_RONDES}/<date>/<id>.yaml`)
  }
  const lu = Mission.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!lu.success) throw new Error(`${chemin} : mission invalide (${z.prettifyError(lu.error)})`)
  if (`${lu.data.id}.yaml` !== basename(chemin) || lu.data.date !== basename(dossierDate)) {
    throw new Error(`${chemin} : l'identifiant ou la date ne sont pas ceux du chemin`)
  }
  const dossierClient = dirname(dossierRondes)
  return { mission: lu.data, dossierClient, client: basename(dossierClient) }
}

export type Decision =
  | { sorte: 'chantier'; raison?: string }
  | { sorte: 'question'; motif: string }
  | { sorte: 'ecartee'; motif: string }

/**
 * Ce que devient la mission au moment du chantier, sur le catalogue du jour
 * (l'état a pu changer depuis la ronde) et les retraits de la mémoire (G2).
 */
export function decider(m: Mission, catalogue: Catalogue, retirees: MissionRetiree[]): Decision {
  if (m.statut === STATUTS_MISSION.ecartee) {
    return { sorte: 'ecartee', motif: `écartée par la ronde${m.raison ? ` : ${m.raison}` : ''}` }
  }
  const retiree = retirees.find((r) => r.id === m.id || memesIntentions(r.intentions, m.intentions))
  if (retiree)
    return { sorte: 'ecartee', motif: `mission retirée (${retiree.id}) : jamais refaite` }
  if (m.sorte === 'question_pour_l_atelier') {
    return { sorte: 'question', motif: STATUTS_MISSION.question }
  }
  const intentions = new Map(catalogue.intentions.map((i) => [i.id, i]))
  const avecGeste = m.intentions.filter((i) => intentions.get(i)?.geste_actif)
  if (avecGeste.length > 0) {
    return { sorte: 'ecartee', motif: `${avecGeste.join(', ')} : un geste actif existe déjà` }
  }
  return { sorte: 'chantier' }
}

/** Les identifiants d'échappée, de conversation ou de personne (le motif du métier) qu'un texte de la ronde citerait : remplacés par un type. */
const sansIdentifiant = (texte: string, domaine: Domaine) =>
  texte
    .replace(MOTIF_ID_CONVERSATION, '<échappée>')
    .replace(motifPourMasquer(domaine), '<personne>')

/** La mission telle qu'elle part au modèle du chantier : des types, ni échappées, ni client (R3). */
export function missionPourModele(m: Mission, domaine: Domaine): string {
  const sans = (texte: string) => sansIdentifiant(texte, domaine)
  return [
    `- identifiant : \`${m.id}\` ; sorte : ${m.sorte} ; métier : ${m.metier} ; écrit : ${m.ecrit ? 'oui' : 'non'} ; estimation : ${m.estimation ?? NON_ESTIMEE}`,
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
 * nom). Lève (`ErreurAtelier`) : une intention sans demande ou déjà commandée,
 * un geste codé du même nom, une mission du même nom déjà ouverte, aucune
 * consigne utilisable, une décision du chantier qui ne serait pas `chantier`.
 */
export function missionCommandee(intention: string, lignes: Ligne[], c: ContexteCommande): Mission {
  const demande = demandeACommander(lignes, intention)
  const date = c.date.toString()
  if (c.catalogue.gestes.some((g) => g.id === intention)) {
    throw new ErreurAtelier(`${intention} : un geste codé porte déjà ce nom`)
  }
  // Une mission `geste_code` du jour sous ce nom, sans ligne `geste commandé` : la commande
  // d'un clic dont le journal a échoué ; ce clic-ci la réécrit à l'identique.
  const ouverte = c.catalogue.missions_ouvertes.find(
    (o) => o.id === intention && !(o.sorte === 'geste_code' && o.date === date),
  )
  if (ouverte) {
    throw new ErreurAtelier(
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
    throw new ErreurAtelier(
      `${intention} : aucune consigne utilisable (demandes trop anciennes, ou qui portent un nom) ; rien n'est commandé`,
    )
  }
  const sorte: SorteMission = 'geste_code'
  const mission = Mission.parse({
    id: intention,
    sorte,
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
  if (decision.sorte !== 'chantier') throw new ErreurAtelier(`${intention} : ${decision.motif}`)
  return mission
}

/** Écrit la mission là où la nuit la lit (`<client>/rondes/<date>/<id>.yaml`) ; rend le chemin. */
export function ecrireMission(dossierClient: string, mission: Mission): string {
  const dossier = join(dossierClient, DOSSIER_RONDES, mission.date)
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
): { intention: string; le: string } {
  const journal = m.journal(s)
  const declaree = m.intentions.find((i) => i.id === intention)
  const mission = missionCommandee(intention, journal.lire(), {
    catalogue: construireCatalogue(m, dossierClient, journal),
    ...(declaree ? { declaree } : {}),
    personnes: m.noms(s),
    domaine: m.domaine,
    metier: chargerConfig(join(dossierClient, FICHIER_CONFIG), ConfigBase).metier,
    date: maintenant.withTimeZone(FUSEAU).toPlainDate(),
  })
  ecrireMission(dossierClient, mission)
  return commanderGeste(journal, m.client(s), intention, par, maintenant)
}

/** Ce que devient une commande : le dernier chantier qui l'a suivie, et si le geste est dans le catalogue. */
export interface EtatCommande {
  par: Identite
  le: string
  chantier?: { issue: string; le: string }
  /** Un geste codé du métier porte l'identifiant de l'intention (`methode/chantier.md`). */
  disponible: boolean
}
export type DemandeAvecEtat = Omit<DemandeSansGeste, 'commande'> & { commande?: EtatCommande }

/**
 * Les demandes sans geste, chaque commande avec son état : la dernière ligne
 * `chantier` de l'intention écrite après la commande (son issue, son jour), et
 * `disponible` si un geste codé du métier porte l'intention.
 */
export function demandesAvecEtat(lignes: Ligne[], gestesCodes: string[]): DemandeAvecEtat[] {
  const chantiers = new Map<string, { issue: string; le: string }>()
  for (const l of lignes) {
    if (l.objet === null) continue
    if (l.type === TYPE_GESTE_COMMANDE) chantiers.delete(l.objet)
    if (l.type === TYPE_CHANTIER && l.issue !== null) {
      chantiers.set(l.objet, { issue: l.issue, le: jourDe(l.horodatage).toString() })
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
