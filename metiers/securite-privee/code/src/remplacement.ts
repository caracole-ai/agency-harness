import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appliquerPolitique,
  type Contenu,
  chargerConfig,
  chargerRegistre,
  classer,
  type Evaluation,
  empreinte,
  evaluerCandidats,
  exigerValidation,
  FICHIER_CONFIG,
  FUSEAU,
  heuresDans,
  type Intervalle,
  Journal,
  type Ligne,
  type Registre,
  Temporal,
  VALIDEE,
} from '@harnais/moteur'
import { remplacerAgent } from './connecteurs/csv-agence'
import { CONTROLES, donneeAbsente } from './controles'
import type { Vacation } from './modele'
import { type Contexte, contexte, intervalleDe } from './semantique'
import { ConfigSecurite, decrire, type PREFERENCES, VEILLER } from './veille'

// Le remplacement d'un agent absent, validé par le patron (PLAN.md, étape 5).
// Une demande vit dans le journal : chaque statut y est un événement, et une
// petite table refuse les sauts (écrire avant d'avoir validé…). Les
// candidats passent les mêmes contrôles que la veille ; l'écriture exige la
// clé d'accord ; l'accord de l'agent est toujours demandé (plus strict
// qu'I-06, qui ne l'exige que sous 7 jours ou 48 h).

const METIER = fileURLToPath(new URL('../..', import.meta.url))
const TYPE = 'remplacement'

export const STATUT = {
  recue: 'reçue',
  proposee: 'proposée',
  validee: VALIDEE,
  demandee: "demandée à l'agent",
  acceptee: 'acceptée',
  ecrite: 'écrite',
  refusee: "refusée par l'agent",
  sansReponse: 'sans réponse',
  tropTard: 'trop tard',
  escaladee: 'escaladée',
} as const
export type Statut = (typeof STATUT)[keyof typeof STATUT]

/** Ce qui peut suivre chaque statut. Une demande finie (écrite, trop tard, escaladée) ne bouge plus. */
const SUIVANTS: Record<Statut, Statut[]> = {
  [STATUT.recue]: [STATUT.proposee, STATUT.escaladee, STATUT.tropTard],
  [STATUT.proposee]: [STATUT.validee, STATUT.tropTard],
  [STATUT.validee]: [STATUT.demandee],
  [STATUT.demandee]: [STATUT.acceptee, STATUT.refusee, STATUT.sansReponse, STATUT.tropTard],
  [STATUT.acceptee]: [STATUT.ecrite],
  [STATUT.refusee]: [STATUT.proposee, STATUT.escaladee],
  [STATUT.sansReponse]: [STATUT.proposee, STATUT.escaladee],
  [STATUT.ecrite]: [],
  [STATUT.tropTard]: [],
  [STATUT.escaladee]: [],
}
const finie = (s: Statut | undefined) => s !== undefined && SUIVANTS[s].length === 0

/** Un client ouvert pour un remplacement : sa config, son registre, son planning, son journal. */
export interface Session {
  dossier: string
  config: ConfigSecurite
  registre: Registre
  ctx: Contexte
  journal: Journal
}

export function ouvrir(dossier: string): Session {
  const config = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigSecurite)
  if (!config.remplacement)
    throw new Error(`${dossier} : la config n'a pas de section « remplacement »`)
  return {
    dossier,
    config,
    registre: appliquerPolitique(chargerRegistre(METIER), config.politique),
    ctx: VEILLER.lire(dossier, config),
    journal: new Journal(join(dossier, config.journal)),
  }
}

/** Une heure murale de Paris (`2026-10-10T21:40`) comme instant. */
export const aParis = (s: string) => Temporal.PlainDateTime.from(s).toZonedDateTime(FUSEAU)

export interface Candidat {
  agent: string
  nom: string
  /** Pour un possible : ce qui fonde son rang ; sinon, les constats qui l'écartent. */
  raisons: string[]
  regles: string[]
}

export interface Proposition {
  demande: string
  vacation: string
  /** Les possibles, dans l'ordre des préférences du patron ; le premier est proposé. */
  possibles: Candidat[]
  exclus: Candidat[]
  ecartes: Candidat[]
}

const historique = (s: Session, demande: string) =>
  s.journal.historique(demande).filter((l) => l.type === TYPE)
const donnees = <T>(l: Ligne | undefined) => (l?.donnees ? (JSON.parse(l.donnees) as T) : undefined)
const dernier = (lignes: Ligne[], statut: Statut) => lignes.filter((l) => l.issue === statut).at(-1)

export function statut(s: Session, demande: string): Statut | undefined {
  return historique(s, demande).at(-1)?.issue as Statut | undefined
}

/** Inscrit un statut, si la table le permet depuis le statut actuel. */
function passer(
  s: Session,
  demande: string,
  suivant: Statut,
  maintenant: Temporal.ZonedDateTime,
  detail: { motif?: string; donnees?: unknown } = {},
): void {
  const actuel = statut(s, demande)
  const permis = actuel === undefined ? [STATUT.recue] : SUIVANTS[actuel]
  if (!permis.includes(suivant)) {
    throw new Error(`${demande} : « ${suivant} » impossible depuis « ${actuel ?? 'rien'} »`)
  }
  s.journal.ecrire(
    [{ type: TYPE, client: s.config.client, objet: demande, issue: suivant, ...detail }],
    maintenant.toInstant().toString(),
  )
}

const vacationDe = (s: Session, demande: string): Vacation => {
  const id = donnees<{ vacation: string }>(dernier(historique(s, demande), STATUT.recue))?.vacation
  const v = s.ctx.planning.vacations.find((x) => x.id === id)
  if (!v) throw new Error(`${demande} : demande inconnue`)
  return v
}

/** « dim. 11/10 08:00 → dim. 11/10 20:00 » : la fin de la description du rapport. */
const quand = (s: Session, v: Vacation) => decrire(s.ctx, v.id).split(' · ').at(-1) ?? ''

const prenom = (nom: string) => nom.split(' ')[0] ?? nom

/** Le contenu exact d'une affectation : ce que la clé d'accord protège. */
export const contenuDe = (demande: string, v: Vacation, agent: string): Contenu => ({
  demande,
  vacation: v.id,
  agent,
  poste: v.poste,
  debut: v.debut,
  fin: v.fin,
})

/** Les critères du patron, dans son ordre, et ce qu'ils disent de chaque agent. */
function criteres(s: Session, v: Vacation) {
  const debut = intervalleDe(v).debut
  const site = s.ctx.poste(v.poste).site
  const lundi = debut.toPlainDate().subtract({ days: debut.dayOfWeek - 1 })
  const semaine: Intervalle = {
    debut: lundi.toZonedDateTime({ timeZone: FUSEAU }),
    fin: lundi.add({ days: 7 }).toZonedDateTime({ timeZone: FUSEAU }),
  }
  const connait = (agent: string) =>
    s.ctx
      .vacationsDe(agent)
      .some(
        (x) =>
          x.id !== v.id &&
          s.ctx.poste(x.poste).site === site &&
          Temporal.ZonedDateTime.compare(intervalleDe(x).fin, debut) <= 0,
      )
  const heures = (agent: string) =>
    heuresDans(
      s.ctx
        .vacationsDe(agent)
        .filter((x) => x.id !== v.id)
        .map(intervalleDe),
      semaine,
    )
  const catalogue: Record<
    (typeof PREFERENCES)[number],
    { rang: (a: string) => number; raison: (a: string) => string }
  > = {
    connait_site: {
      rang: (a) => (connait(a) ? 0 : 1),
      raison: (a) => (connait(a) ? 'connaît le site' : 'pas encore venu sur ce site'),
    },
    moins_d_heures_semaine: {
      rang: heures,
      raison: (a) => `${Math.round(heures(a) * 10) / 10} h cette semaine`,
    },
  }
  return (s.config.remplacement?.preferences ?? []).map((p) => catalogue[p])
}

/** Les candidats d'une vacation, sauf l'absent et ceux qui ont déjà dit non ou n'ont pas répondu. */
export function evaluer(s: Session, demande: string, v: Vacation, exclure: string[]): Proposition {
  const candidats = s.ctx.planning.agents
    .map((a) => a.id)
    .filter((id) => id !== v.agent && !exclure.includes(id))
  const evaluations = evaluerCandidats(CONTROLES, s.registre, s.ctx, candidats, (agent) =>
    contexte({
      ...s.ctx.planning,
      vacations: s.ctx.planning.vacations.map((x) => (x.id === v.id ? { ...x, agent } : x)),
    }),
  )
  const nom = (agent: string) => s.ctx.agent(agent).nom
  const nomRegle = (id: string) => s.registre.interdits.find((i) => i.id === id)?.nom ?? id
  /** Ce qui décide de l'issue (les refus d'un exclu, les doutes d'un écarté), sans redite. */
  const ecarte = (e: Evaluation): Candidat => {
    const decisifs = e.constats.filter(
      (c) => c.verdict === (e.issue === 'exclu' ? 'refus' : 'à vérifier'),
    )
    const manquantes = [
      ...new Set(decisifs.map((c) => donneeAbsente(c.motif)).filter((x) => x !== undefined)),
    ]
    return {
      agent: e.candidat,
      nom: nom(e.candidat),
      raisons: [
        ...new Set(
          decisifs
            .filter((c) => donneeAbsente(c.motif) === undefined)
            .map((c) => `${nomRegle(c.regle)} : ${c.motif}`),
        ),
        ...(manquantes.length > 0 ? [`à renseigner : ${manquantes.join(', ')}`] : []),
      ],
      regles: [...new Set(decisifs.map((c) => c.regle))].sort(),
    }
  }
  const cs = criteres(s, v)
  const possibles = classer(
    evaluations.filter((e) => e.issue === 'possible').map((e) => e.candidat),
    cs.map((c) => c.rang),
    nom,
  ).map((agent) => ({
    agent,
    nom: nom(agent),
    raisons: cs.map((c) => c.raison(agent)),
    regles: [],
  }))
  return {
    demande,
    vacation: v.id,
    possibles,
    exclus: evaluations.filter((e) => e.issue === 'exclu').map(ecarte),
    ecartes: evaluations.filter((e) => e.issue === 'écarté').map(ecarte),
  }
}

const dejaSollicites = (s: Session, demande: string) =>
  historique(s, demande)
    .filter((l) => l.issue === STATUT.refusee || l.issue === STATUT.sansReponse)
    .map((l) => donnees<{ agent: string }>(l)?.agent)
    .filter((a): a is string => a !== undefined)

export type Etape =
  | { statut: typeof STATUT.proposee; proposition: Proposition }
  | { statut: typeof STATUT.demandee; agent: string; message: string }
  | { statut: typeof STATUT.ecrite; agent: string; messages: string[] }
  | { statut: typeof STATUT.escaladee | typeof STATUT.tropTard; motif: string }

function proposer(s: Session, demande: string, maintenant: Temporal.ZonedDateTime): Etape {
  const v = vacationDe(s, demande)
  const p = evaluer(s, demande, v, dejaSollicites(s, demande))
  const premier = p.possibles[0]
  if (!premier) {
    const motif = "aucun remplaçant possible : à traiter par l'exploitation (E-02)"
    passer(s, demande, STATUT.escaladee, maintenant, { motif })
    return { statut: STATUT.escaladee, motif }
  }
  passer(s, demande, STATUT.proposee, maintenant, {
    motif: `${premier.nom} proposé`,
    donnees: {
      proposition: premier.agent,
      possibles: p.possibles.map((c) => c.agent),
      exclus: p.exclus.map((c) => c.agent),
      ecartes: p.ecartes.map((c) => c.agent),
    },
  })
  return { statut: STATUT.proposee, proposition: p }
}

/** Passé le début de la vacation, il est trop tard : la demande s'arrête et l'exploitation reprend la main. */
function tropTard(s: Session, demande: string, maintenant: Temporal.ZonedDateTime): Etape | null {
  const debut = intervalleDe(vacationDe(s, demande)).debut
  if (Temporal.ZonedDateTime.compare(maintenant, debut) < 0) return null
  const motif = "la vacation a commencé sans remplaçant : à traiter par l'exploitation"
  passer(s, demande, STATUT.tropTard, maintenant, { motif })
  return { statut: STATUT.tropTard, motif }
}

/** Un agent se déclare absent un jour donné : le harnais retrouve sa vacation et propose un remplaçant. */
export function signalerAbsence(
  s: Session,
  agent: string,
  jour: Temporal.PlainDate,
  maintenant: Temporal.ZonedDateTime,
): Etape & { demande: string } {
  const vacations = s.ctx
    .vacationsDe(agent)
    .filter((v) => intervalleDe(v).debut.toPlainDate().equals(jour))
  const nom = s.ctx.agent(agent).nom
  if (vacations.length !== 1) {
    throw new Error(
      vacations.length === 0
        ? `${nom} n'a aucune vacation qui commence le ${jour.toString()}`
        : `${nom} a plusieurs vacations ce jour-là : à préciser par l'exploitation`,
    )
  }
  const v = vacations[0] as Vacation
  let n = 1
  const id = (k: number) => (k === 1 ? `D-${v.id}` : `D-${v.id}-${k}`)
  while (statut(s, id(n)) !== undefined) {
    if (!finie(statut(s, id(n)))) throw new Error(`${id(n)} : une demande est déjà en cours`)
    n++
  }
  const demande = id(n)
  passer(s, demande, STATUT.recue, maintenant, {
    motif: `absence de ${nom}`,
    donnees: { vacation: v.id, agent },
  })
  const etape = tropTard(s, demande, maintenant) ?? proposer(s, demande, maintenant)
  return { ...etape, demande }
}

/**
 * Le patron valide : la proposition, ou un autre possible de son choix. La
 * validation est la clé d'accord, liée au contenu exact. Un agent exclu ou
 * écarté ne peut pas être choisi : un interdit ne se lève pas.
 */
export function valider(
  s: Session,
  demande: string,
  maintenant: Temporal.ZonedDateTime,
  choisi?: string,
): Etape {
  const trop = tropTard(s, demande, maintenant)
  if (trop) return trop
  const v = vacationDe(s, demande)
  const p = evaluer(s, demande, v, dejaSollicites(s, demande))
  const propose = p.possibles[0]?.agent
  const agent = choisi ?? propose
  if (!agent || !p.possibles.some((c) => c.agent === agent)) {
    const refus = [...p.exclus, ...p.ecartes].find((c) => c.agent === agent)
    throw new Error(
      refus
        ? `${refus.nom} ne peut pas recevoir cette vacation : ${refus.raisons.join(' ; ')}. Un interdit ne se lève pas.`
        : `${agent ?? 'personne'} n'est pas parmi les remplaçants possibles`,
    )
  }
  passer(s, demande, STATUT.validee, maintenant, {
    motif: `${s.ctx.agent(agent).nom} validé par le patron`,
    donnees: {
      agent,
      par: 'patron',
      jeton: empreinte(contenuDe(demande, v, agent)),
      ...(agent !== propose ? { propose } : {}),
    },
  })
  const nom = s.ctx.agent(agent).nom
  const poste = s.ctx.poste(v.poste)
  const message = `${prenom(nom)}, peux-tu remplacer ${quand(s, v)}, ${poste.id} (${poste.site}) ? Réponds OUI ou NON.`
  passer(s, demande, STATUT.demandee, maintenant, { motif: message, donnees: { agent } })
  return { statut: STATUT.demandee, agent, message }
}

/** La réponse de l'agent sollicité. Oui : on écrit. Non : on propose le suivant au patron. */
export function repondre(
  s: Session,
  demande: string,
  oui: boolean,
  maintenant: Temporal.ZonedDateTime,
): Etape {
  const trop = tropTard(s, demande, maintenant)
  if (trop) return trop
  const agent = donnees<{ agent: string }>(dernier(historique(s, demande), STATUT.demandee))?.agent
  if (!agent) throw new Error(`${demande} : aucun agent n'a été sollicité`)
  if (!oui) {
    passer(s, demande, STATUT.refusee, maintenant, {
      motif: `${s.ctx.agent(agent).nom} a dit non (aucune conséquence pour lui)`,
      donnees: { agent },
    })
    return proposer(s, demande, maintenant)
  }
  passer(s, demande, STATUT.acceptee, maintenant, {
    motif: `${s.ctx.agent(agent).nom} a dit oui (accord gardé au journal)`,
    donnees: { agent },
  })
  return ecrire(s, demande, agent, maintenant)
}

/**
 * Écrit l'affectation dans les outils du client. La clé d'abord : sans
 * validation de ce contenu exact au journal, rien ne s'écrit.
 */
export function ecrire(
  s: Session,
  demande: string,
  agent: string,
  maintenant: Temporal.ZonedDateTime,
): Etape {
  const v = vacationDe(s, demande)
  const jeton = exigerValidation(historique(s, demande), contenuDe(demande, v, agent))
  if (statut(s, demande) !== STATUT.acceptee) {
    throw new Error(`${demande} : écriture refusée, l'agent n'a pas donné son accord`)
  }
  remplacerAgent(join(s.dossier, s.config.donnees.planning), v.id, agent)
  const absent = s.ctx.agent(v.agent).nom
  const remplacant = s.ctx.agent(agent).nom
  const poste = s.ctx.poste(v.poste)
  const messages = [
    `À ${remplacant} : c'est confirmé, ${quand(s, v)}, ${poste.id} (${poste.site}). Merci.`,
    `À ${absent} : bien reçu, ta vacation du ${quand(s, v)} est remplacée.`,
  ]
  passer(s, demande, STATUT.ecrite, maintenant, {
    motif: `planning mis à jour : ${v.id} confiée à ${remplacant}`,
    donnees: { agent, jeton },
  })
  s.journal.ecrire(
    [
      {
        type: 'absence',
        client: s.config.client,
        objet: v.agent,
        motif: `absence sur ${v.id}, à reporter en paie`,
        donnees: { vacation: v.id, demande },
      },
      ...messages.map((motif) => ({
        type: 'message',
        client: s.config.client,
        objet: demande,
        motif,
      })),
    ],
    maintenant.toInstant().toString(),
  )
  return { statut: STATUT.ecrite, agent, messages }
}

/** Fait avancer une demande dans le temps : sans réponse après l'attente, ou trop tard. */
export function suivre(
  s: Session,
  demande: string,
  maintenant: Temporal.ZonedDateTime,
): Etape | null {
  if (finie(statut(s, demande))) return null
  const trop = tropTard(s, demande, maintenant)
  if (trop) return trop
  if (statut(s, demande) !== STATUT.demandee) return null
  const sollicite = dernier(historique(s, demande), STATUT.demandee)
  const depuis = Temporal.Instant.from(sollicite?.horodatage ?? '').toZonedDateTimeISO(FUSEAU)
  const attente = { minutes: s.config.remplacement?.attente_reponse_minutes ?? 0 }
  if (Temporal.ZonedDateTime.compare(maintenant, depuis.add(attente)) < 0) return null
  const agent = donnees<{ agent: string }>(sollicite)?.agent
  passer(s, demande, STATUT.sansReponse, maintenant, {
    motif: `pas de réponse de ${agent ? s.ctx.agent(agent).nom : '?'} après ${attente.minutes} min`,
    donnees: { agent },
  })
  return proposer(s, demande, maintenant)
}
