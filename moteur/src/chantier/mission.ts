import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { FORMAT_INTENTION, type Intention } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { type Domaine, motifPourMasquer } from '../conversation/domaine'
import { MOTIF_ID_CONVERSATION } from '../conversation/id'
import type { Identite } from '../conversation/roles'
import type { IssueEchappee } from '../echappee/boucle'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import { fuites } from '../echappee/pseudonymes'
import { ErreurAtelier } from '../gestes/atelier'
import { lireFichiersGestes } from '../gestes/charger'
import {
  commanderGeste,
  type DemandeSansGeste,
  demandeACommander,
  demandesSansGeste,
  TYPE_GESTE_COMMANDE,
} from '../gestes/commande'
import { ecritDe, gesteDe } from '../gestes/geste-appris'
import type { Ligne } from '../journal/journal'
import { FUSEAU, jourDe, type Temporal } from '../temps/temporal'
import type { MissionRetiree } from './memoire'

// La mission d'un chantier (REFLEXIONS.md, décidé le 2026-10-15) : un geste
// codé que le patron a commandé (« Créer ce geste »). Le code l'écrit chez le
// client (`missions/<date>/<id>.yaml`, `commanderMission`), la nuit la prend,
// le chantier la relit par un schéma strict et décide en code avant tout
// appel : une mission retirée, ou dont l'intention a déjà un geste actif, ne
// lance rien. Ce qui part au modèle du chantier n'est jamais la mission
// entière : ni ses échappées ni le client, des types seulement.

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
  metier: z.string().min(1),
  statut: z.string().min(1),
})
export type Mission = z.infer<typeof Mission>

/** Deux listes d'intentions non vides, aux mêmes éléments. */
export const memesIntentions = (a: string[], b: string[]) =>
  a.length > 0 && a.length === b.length && a.every((x) => b.includes(x))

/** Ce que le code sait du catalogue pour décider d'une mission : des identifiants, aucune donnée. */
export interface Catalogue {
  gestes: { id: string; description: string; ecrit: boolean }[]
  appris: { id: string; description: string; ecrit: boolean; statut: string }[]
  intentions: {
    id: string
    description: string
    ecrit: boolean
    /** Un geste appris actif porte cette intention. */
    geste_actif?: true
  }[]
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

/** Les missions déjà écrites chez le client, toutes dates. */
function missionsOuvertes(dossierClient: string): Catalogue['missions_ouvertes'] {
  const racine = join(dossierClient, DOSSIER_MISSIONS)
  if (!existsSync(racine)) return []
  return readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(racine, d.name))
        .filter((f) => f.endsWith('.yaml'))
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

/** Le catalogue d'un client : gestes codés, gestes appris, intentions connues, missions déjà écrites. */
export function construireCatalogue<S>(m: MetierConversation<S>, dossierClient: string): Catalogue {
  const appris = lireFichiersGestes(dossierClient).flatMap((f) =>
    f.contenu
      ? [
          {
            id: f.contenu.id,
            description: f.contenu.description,
            ecrit: ecritDe(gesteDe(f.contenu)),
            statut: f.contenu.statut,
          },
        ]
      : [],
  )
  const actifs = new Set(appris.filter((a) => a.statut === 'actif').map((a) => a.id))
  return {
    gestes: m.actions.map((a) => ({ id: a.id, description: a.description, ecrit: a.ecrit })),
    appris,
    intentions: m.intentions.map((i) => ({
      id: i.id,
      description: i.description,
      ecrit: i.ecrit,
      ...(actifs.has(i.id) ? { geste_actif: true as const } : {}),
    })),
    missions_ouvertes: missionsOuvertes(dossierClient),
  }
}

export interface MissionLue {
  mission: Mission
  /** Le dossier du client : la mission est dans `<dossier>/missions/<date>/`. */
  dossierClient: string
  /** Le nom du dossier du client, pour le dossier de chantier seulement. */
  client: string
}

/** Lit `<client>/missions/<date>/<id>.yaml` ; lève si le fichier n'est pas une mission. */
export function lireMission(chemin: string): MissionLue {
  const dossierDate = dirname(chemin)
  const dossierMissions = dirname(dossierDate)
  if (basename(dossierMissions) !== DOSSIER_MISSIONS) {
    throw new Error(
      `${chemin} : une mission vit dans <client>/${DOSSIER_MISSIONS}/<date>/<id>.yaml`,
    )
  }
  const lu = Mission.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!lu.success) throw new Error(`${chemin} : mission invalide (${z.prettifyError(lu.error)})`)
  if (`${lu.data.id}.yaml` !== basename(chemin) || lu.data.date !== basename(dossierDate)) {
    throw new Error(`${chemin} : l'identifiant ou la date ne sont pas ceux du chemin`)
  }
  const dossierClient = dirname(dossierMissions)
  return { mission: lu.data, dossierClient, client: basename(dossierClient) }
}

export type Decision = { sorte: 'chantier' } | { sorte: 'ecartee'; motif: string }

/**
 * Ce que devient la mission au moment du chantier, sur le catalogue du jour
 * (l'état a pu changer depuis la commande) et les retraits de la mémoire (G2).
 */
export function decider(m: Mission, catalogue: Catalogue, retirees: MissionRetiree[]): Decision {
  const retiree = retirees.find((r) => r.id === m.id || memesIntentions(r.intentions, m.intentions))
  if (retiree)
    return { sorte: 'ecartee', motif: `mission retirée (${retiree.id}) : jamais refaite` }
  const intentions = new Map(catalogue.intentions.map((i) => [i.id, i]))
  const avecGeste = m.intentions.filter((i) => intentions.get(i)?.geste_actif)
  if (avecGeste.length > 0) {
    return { sorte: 'ecartee', motif: `${avecGeste.join(', ')} : un geste actif existe déjà` }
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
  if (decision.sorte !== 'chantier') throw new ErreurAtelier(`${intention} : ${decision.motif}`)
  return mission
}

/** Écrit la mission là où la nuit la lit (`<client>/missions/<date>/<id>.yaml`) ; rend le chemin. */
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
): { intention: string; le: string } {
  const journal = m.journal(s)
  const declaree = m.intentions.find((i) => i.id === intention)
  const mission = missionCommandee(intention, journal.lire(), {
    catalogue: construireCatalogue(m, dossierClient),
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
