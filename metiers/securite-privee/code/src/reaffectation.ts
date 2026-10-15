import { join } from 'node:path'
import {
  type Contenu,
  empreinte,
  exigerValidation,
  FUSEAU,
  type Ligne,
  Temporal,
  VALIDEE,
} from '@harnais/moteur'
import { reaffecterAgents } from './connecteurs/csv-agence'
import type { Vacation } from './modele'
import { constatsNouveaux, type Modification } from './modifications'
import type { Session } from './remplacement'
import { intervalleDe } from './semantique'
import { decrire } from './veille'

// La réaffectation groupée : une proposition de l'échappée, validée par le
// patron, acceptée par chaque agent qui reçoit une vacation, puis écrite d'un
// coup. Même forme que le remplacement : chaque statut est un événement du
// journal, une table refuse les sauts, l'écriture exige la clé d'accord sur
// la liste exacte des réaffectations. Aucune délégation : une demande
// nouvelle ne se délègue jamais (PLAN-ESPACES.md § 7.1, D8, D9).

export const TYPE_REAFFECTATION = 'reaffectation'

export const STATUT_R = {
  recue: 'reçue',
  validee: VALIDEE,
  demandee: 'demandée aux agents',
  acceptee: 'acceptée',
  ecrite: 'écrite',
  refusee: 'refusée par un agent',
  sansReponse: 'sans réponse',
  tropTard: 'trop tard',
  remplacee: 'remplacée',
} as const
export type Statut2 = (typeof STATUT_R)[keyof typeof STATUT_R]

/**
 * Ce qui peut suivre chaque statut. « Demandée aux agents » peut se suivre
 * elle-même : chaque « oui » qui laisse des agents à attendre s'inscrit ainsi.
 */
const SUIVANTS: Record<Statut2, Statut2[]> = {
  // Le patron change un agent avant de valider : une autre R-… la remplace (PLAN-CHOIX.md C2).
  [STATUT_R.recue]: [STATUT_R.validee, STATUT_R.tropTard, STATUT_R.remplacee],
  [STATUT_R.validee]: [STATUT_R.demandee],
  [STATUT_R.demandee]: [
    STATUT_R.demandee,
    STATUT_R.acceptee,
    STATUT_R.refusee,
    STATUT_R.sansReponse,
    STATUT_R.tropTard,
  ],
  // Une écriture refusée (clé, règle) laisse « acceptée » : le temps la clôt.
  [STATUT_R.acceptee]: [STATUT_R.ecrite, STATUT_R.tropTard],
  [STATUT_R.ecrite]: [],
  [STATUT_R.refusee]: [],
  [STATUT_R.sansReponse]: [],
  [STATUT_R.tropTard]: [],
  [STATUT_R.remplacee]: [],
}
const finie = (s: Statut2 | undefined) => s !== undefined && SUIVANTS[s].length === 0

/** Une réaffectation finie (écrite, refusée, sans réponse, trop tard, remplacée) ne bouge plus. */
export const reaffectationFinie = (s: Session, id: string) => finie(statutReaffectation(s, id))

export interface Reaffectation {
  id: string
  conversation: string
  modifications: Modification[]
}

export type Etape2 = { statut: Statut2; motif: string; messages?: string[] }

const historique = (s: Session, id: string) =>
  s.journal.historique(id).filter((l) => l.type === TYPE_REAFFECTATION)
const donnees = <T>(l: Ligne | undefined) => (l?.donnees ? (JSON.parse(l.donnees) as T) : undefined)
const dernier = (lignes: Ligne[], statut: Statut2) =>
  lignes.filter((l) => l.issue === statut).at(-1)
const prenom = (nom: string) => nom.split(' ')[0] ?? nom

export function statutReaffectation(s: Session, id: string): Statut2 | undefined {
  return historique(s, id).at(-1)?.issue as Statut2 | undefined
}

/** La réaffectation telle qu'elle a été reçue. Lève si elle est inconnue. */
export function reaffectation(s: Session, id: string): Reaffectation {
  const recue = donnees<{ conversation: string; modifications: Modification[] }>(
    dernier(historique(s, id), STATUT_R.recue),
  )
  if (!recue) throw new Error(`${id} : réaffectation inconnue`)
  return { id, conversation: recue.conversation, modifications: recue.modifications }
}

/** Les agents qu'on attend encore : ceux de la dernière sollicitation. */
export function attendus(s: Session, id: string): string[] {
  return (
    donnees<{ attendus: string[] }>(dernier(historique(s, id), STATUT_R.demandee))?.attendus ?? []
  )
}

/** Inscrit un statut, si la table le permet depuis le statut actuel. */
function passer(
  s: Session,
  id: string,
  suivant: Statut2,
  maintenant: Temporal.ZonedDateTime,
  detail: { motif?: string; donnees?: unknown } = {},
): void {
  const actuel = statutReaffectation(s, id)
  const permis = actuel === undefined ? [STATUT_R.recue] : SUIVANTS[actuel]
  if (!permis.includes(suivant)) {
    throw new Error(`${id} : « ${suivant} » impossible depuis « ${actuel ?? 'rien'} »`)
  }
  s.journal.ecrire(
    [{ type: TYPE_REAFFECTATION, client: s.config.client, objet: id, issue: suivant, ...detail }],
    maintenant.toInstant().toString(),
  )
}

const vacation = (s: Session, id: string): Vacation => {
  const v = s.ctx.planning.vacations.find((x) => x.id === id)
  if (!v) throw new Error(`vacation ${id} inconnue`)
  return v
}

/** « dim. 11/10 08:00 → dim. 11/10 20:00 » */
const quand = (s: Session, v: Vacation) => decrire(s.ctx, v.id).split(' · ').at(-1) ?? ''

/**
 * Le contenu que la clé protège : chaque réaffectation avec le poste, le
 * début et la fin de sa vacation au moment de la validation, triées par
 * vacation. Si l'une bouge avant l'écriture, la clé ne correspond plus.
 */
export const contenuReaffectation = (
  s: Session,
  id: string,
  modifications: Modification[],
): Contenu => ({
  reaffectation: id,
  modifications: JSON.stringify(
    [...modifications]
      .sort((a, b) => a.vacation.localeCompare(b.vacation))
      .map((m) => {
        const v = vacation(s, m.vacation)
        return {
          vacation: m.vacation,
          de: v.agent,
          agent: m.agent,
          poste: v.poste,
          debut: v.debut,
          fin: v.fin,
        }
      }),
  ),
})

/** Lève si les réaffectations font apparaître un refus : un interdit ne se lève pas. */
function exigerSansRefus(s: Session, modifications: Modification[]): void {
  const refus = constatsNouveaux(s, modifications).find((c) => c.verdict === 'refus')
  if (refus) {
    const nom = s.registre.interdits.find((i) => i.id === refus.regle)?.nom ?? refus.regle
    throw new Error(`la réaffectation enfreint ${nom} (${refus.regle}) : ${refus.motif}`)
  }
}

/** Ouvre une réaffectation depuis une proposition : `R-` suivi de l'identifiant de la conversation. */
export function ouvrirReaffectation(
  s: Session,
  conversation: string,
  modifications: Modification[],
  maintenant: Temporal.ZonedDateTime,
): { id: string } {
  if (modifications.length === 0) throw new Error('une réaffectation sans modification')
  exigerSansRefus(s, modifications)
  const base = `R-${conversation.replace(/^C-/, '')}`
  let n = 1
  const id = (k: number) => (k === 1 ? base : `${base}-${k}`)
  while (statutReaffectation(s, id(n)) !== undefined) n++
  passer(s, id(n), STATUT_R.recue, maintenant, {
    motif: `${modifications.length} réaffectation(s) proposée(s)`,
    donnees: { conversation, modifications },
  })
  return { id: id(n) }
}

/**
 * Le patron change des agents d'une réaffectation reçue (PLAN-CHOIX.md C2) :
 * une nouvelle s'ouvre, rattachée à la même conversation (celle de la
 * proposition d'origine), avec les mêmes contrôles ;
 * l'ancienne passe à « remplacée » et ne se valide plus. Un refus des
 * contrôles laisse l'ancienne telle quelle.
 */
export function corrigerReaffectation(
  s: Session,
  ancienne: string,
  modifications: Modification[],
  maintenant: Temporal.ZonedDateTime,
): { id: string } {
  const st = statutReaffectation(s, ancienne)
  if (st !== STATUT_R.recue) throw new Error(`${ancienne} : ${st ?? 'réaffectation inconnue'}`)
  const { id } = ouvrirReaffectation(
    s,
    reaffectation(s, ancienne).conversation,
    modifications,
    maintenant,
  )
  passer(s, ancienne, STATUT_R.remplacee, maintenant, {
    motif: `remplacée par ${id}`,
    donnees: { par: id },
  })
  return { id }
}

/** Les réaffectations reçues, pas encore validées ni remplacées, dans l'ordre du journal. */
export function reaffectationsRecues(s: Session): Reaffectation[] {
  const ids = new Set(
    s.journal
      .lire()
      .filter((l) => l.type === TYPE_REAFFECTATION && l.objet !== null)
      .map((l) => l.objet as string),
  )
  return [...ids]
    .filter((id) => statutReaffectation(s, id) === STATUT_R.recue)
    .map((id) => reaffectation(s, id))
}

/** La première vacation d'une réaffectation a commencé : plus rien ne s'y change. Ne journalise rien. */
export function commencee(s: Session, id: string, maintenant: Temporal.ZonedDateTime): boolean {
  return reaffectation(s, id).modifications.some(
    (m) =>
      Temporal.ZonedDateTime.compare(maintenant, intervalleDe(vacation(s, m.vacation)).debut) >= 0,
  )
}

/** La première vacation modifiée a commencé : il est trop tard, rien ne s'écrit. */
function tropTard(s: Session, id: string, maintenant: Temporal.ZonedDateTime): Etape2 | null {
  if (!commencee(s, id, maintenant)) return null
  const motif = 'une vacation modifiée a commencé : rien n’est écrit'
  passer(s, id, STATUT_R.tropTard, maintenant, { motif })
  return { statut: STATUT_R.tropTard, motif }
}

/** Les agents qui reçoivent une vacation, dédoublonnés, et le message à chacun. */
function sollicitations(
  s: Session,
  modifications: Modification[],
): { agent: string; message: string }[] {
  const agents = [...new Set(modifications.map((m) => m.agent))]
  return agents.map((agent) => {
    const quoi = modifications
      .filter((m) => m.agent === agent)
      .map((m) => {
        const v = vacation(s, m.vacation)
        const poste = s.ctx.poste(v.poste)
        return `${quand(s, v)}, ${poste.id} (${poste.site})`
      })
      .join(' et ')
    return {
      agent,
      message: `${prenom(s.ctx.agent(agent).nom)}, peux-tu prendre ${quoi} ? Réponds OUI ou NON.`,
    }
  })
}

/** Le patron valide : la clé sur le contenu exact, puis la demande à chaque agent qui reçoit. */
export function validerReaffectation(
  s: Session,
  id: string,
  maintenant: Temporal.ZonedDateTime,
): { agents: string[]; messages: string[] } {
  const { modifications } = reaffectation(s, id)
  const par = donnees<{ par: string }>(dernier(historique(s, id), STATUT_R.remplacee))?.par
  if (par !== undefined) throw new Error(`${id} : remplacée par ${par}, à valider à sa place`)
  const trop = tropTard(s, id, maintenant)
  if (trop) throw new Error(`${id} : ${trop.motif}`)
  exigerSansRefus(s, modifications)
  passer(s, id, STATUT_R.validee, maintenant, {
    motif: 'réaffectation validée par le patron',
    donnees: { par: 'patron', jeton: empreinte(contenuReaffectation(s, id, modifications)) },
  })
  const demandes = sollicitations(s, modifications)
  const agents = demandes.map((d) => d.agent)
  passer(s, id, STATUT_R.demandee, maintenant, {
    motif: demandes.map((d) => d.message).join(' / '),
    donnees: { agents, attendus: agents, messages: demandes },
  })
  return { agents, messages: demandes.map((d) => d.message) }
}

/** La réponse d'un agent. Non : la réaffectation s'arrête, sans conséquence pour lui. Oui du dernier attendu : on écrit. */
export function repondreReaffectation(
  s: Session,
  id: string,
  agent: string,
  oui: boolean,
  maintenant: Temporal.ZonedDateTime,
): Etape2 {
  const trop = finie(statutReaffectation(s, id)) ? null : tropTard(s, id, maintenant)
  if (trop) return trop
  if (statutReaffectation(s, id) !== STATUT_R.demandee || !attendus(s, id).includes(agent)) {
    throw new Error('cette sollicitation ne vous est pas adressée')
  }
  const nom = s.ctx.agent(agent).nom
  if (!oui) {
    const motif = `${nom} a dit non (sans aucune conséquence)`
    passer(s, id, STATUT_R.refusee, maintenant, { motif, donnees: { agent } })
    return { statut: STATUT_R.refusee, motif }
  }
  const restent = attendus(s, id).filter((a) => a !== agent)
  if (restent.length > 0) {
    const motif = `${nom} a dit oui ; on attend encore ${restent.map((a) => s.ctx.agent(a).nom).join(', ')}`
    passer(s, id, STATUT_R.demandee, maintenant, { motif, donnees: { agent, attendus: restent } })
    return { statut: STATUT_R.demandee, motif }
  }
  passer(s, id, STATUT_R.acceptee, maintenant, {
    motif: `${nom} a dit oui ; tous les agents ont donné leur accord (gardé au journal)`,
    donnees: { agent, attendus: [] },
  })
  return ecrireReaffectation(s, id, maintenant)
}

/** Écrit toutes les réaffectations d'un coup. La clé d'abord, puis les accords, puis les règles. */
export function ecrireReaffectation(
  s: Session,
  id: string,
  maintenant: Temporal.ZonedDateTime,
): Etape2 {
  const { modifications } = reaffectation(s, id)
  const jeton = exigerValidation(historique(s, id), contenuReaffectation(s, id, modifications))
  if (statutReaffectation(s, id) !== STATUT_R.acceptee) {
    throw new Error(`${id} : écriture refusée, tous les agents n'ont pas donné leur accord`)
  }
  exigerSansRefus(s, modifications)
  reaffecterAgents(join(s.dossier, s.config.donnees.planning), modifications)
  const messages = modifications.flatMap((m) => {
    const v = vacation(s, m.vacation)
    const poste = s.ctx.poste(v.poste)
    const ou = `${quand(s, v)}, ${poste.id} (${poste.site})`
    return [
      `À ${s.ctx.agent(m.agent).nom} : c'est confirmé, ${ou}. Merci.`,
      `À ${s.ctx.agent(v.agent).nom} : ta vacation du ${ou} est confiée à ${s.ctx.agent(m.agent).nom}.`,
    ]
  })
  const motif = `planning mis à jour : ${modifications.map((m) => `${m.vacation} → ${s.ctx.agent(m.agent).nom}`).join(', ')}`
  passer(s, id, STATUT_R.ecrite, maintenant, { motif, donnees: { jeton } })
  s.journal.ecrire(
    messages.map((motif) => ({ type: 'message', client: s.config.client, objet: id, motif })),
    maintenant.toInstant().toString(),
  )
  return { statut: STATUT_R.ecrite, motif, messages }
}

/** Fait avancer une réaffectation dans le temps : trop tard, ou sans réponse après l'attente. */
export function suivreReaffectation(
  s: Session,
  id: string,
  maintenant: Temporal.ZonedDateTime,
): Etape2 | null {
  if (finie(statutReaffectation(s, id))) return null
  const trop = tropTard(s, id, maintenant)
  if (trop) return trop
  if (statutReaffectation(s, id) !== STATUT_R.demandee) return null
  const sollicite = dernier(historique(s, id), STATUT_R.demandee)
  const depuis = Temporal.Instant.from(sollicite?.horodatage ?? '').toZonedDateTimeISO(FUSEAU)
  const attente = { minutes: s.config.remplacement?.attente_reponse_minutes ?? 0 }
  if (Temporal.ZonedDateTime.compare(maintenant, depuis.add(attente)) < 0) return null
  const motif = `pas de réponse de ${attendus(s, id)
    .map((a) => s.ctx.agent(a).nom)
    .join(', ')} après ${attente.minutes} min : rien n'est écrit`
  passer(s, id, STATUT_R.sansReponse, maintenant, { motif })
  return { statut: STATUT_R.sansReponse, motif }
}
