import {
  type Action,
  type Choix,
  dateFr,
  dureeHeures,
  type Identite,
  passerVeille,
  Temporal,
  veilleDuClient,
} from '@harnais/moteur'
import { z } from 'zod'
import { DOMAINE } from './domaine'
import { NOMS_ACTIVITES } from './modele'
import {
  attendus,
  commencee,
  type Etape2,
  type Reaffectation,
  reaffectation,
  reaffectationsRecues,
  repondreReaffectation,
  STATUT_R,
  statutReaffectation,
  suivreReaffectation,
} from './reaffectation'
import {
  agentSollicite,
  decrireEtape,
  dejaSollicites,
  evaluer,
  METIER,
  repondre,
  type Session,
  STATUT,
  signalerAbsence,
  statut,
  suivre,
  vacationDe,
  valider,
} from './remplacement'
import { intervalleDe } from './semantique'
import { decrire, VEILLER } from './veille'

// Les gestes du quotidien de la sécurité privée (espace 1) : la liste fermée
// que le modèle choisit et que le code exécute. Pour le rôle `agent`, chaque
// geste travaille sur `identite.personne` et ignore tout autre agent demandé :
// c'est structurel, pas un filtre (PLAN-ESPACES.md § 5.2, D4). Un paramètre
// qui désigne une personne (`personnes`) est montré au modèle comme la
// mention écrite ; le moteur la résout en identifiant (REFLEXIONS.md, décidé le 2026-10-08).

const IdAgent = z.string().regex(/^A-\d+$/)
const Jour = z.iso.date()

/** L'absent d'une déclaration : un agent ne déclare que la sienne ; le patron nomme l'absent. */
function absentVise(identite: Identite, demande: string | null): string | undefined {
  if (identite.role === 'agent' && demande !== null && demande !== identite.personne) {
    throw new Error('Tu ne peux déclarer que ta propre absence.')
  }
  return agentVise(identite, demande)
}

/** L'agent sur qui porte un geste : soi-même pour un agent, celui que nomme le patron sinon. */
function agentVise(identite: Identite, demande: string | null): string | undefined {
  return identite.role === 'agent' ? identite.personne : (demande ?? undefined)
}

const nomDe = (s: Session, agent: string) => s.ctx.agent(agent).nom

/** Une vacation dite à un agent : quand, quel poste, quel site ; jamais qui la tient (D4). */
function vacationPourAgent(s: Session, id: string): string {
  const v = s.ctx.planning.vacations.find((x) => x.id === id)
  if (!v) throw new Error(`vacation ${id} inconnue`)
  const poste = s.ctx.poste(v.poste)
  return `${v.id}, ${decrire(s.ctx, v.id).split(' · ').at(-1) ?? ''}, ${poste.id} (${poste.site})`
}

/** Ce qu'un agent lit après avoir répondu : sa réponse, et seulement ce qui le concerne. */
function reponseEnregistree(oui: boolean, statut: string, demande: string): string {
  return oui
    ? `Ta réponse est enregistrée (${demande} : ${statut}).`
    : 'Ta réponse est enregistrée : tu as dit non, sans aucune conséquence.'
}

/** Lève si la sollicitation de cette demande ne vise pas cet agent. */
function exigerSollicite(s: Session, identite: Identite, demande: string): void {
  if (!identite.personne || agentSollicite(s, demande) !== identite.personne) {
    throw new Error('cette sollicitation ne vous est pas adressée')
  }
}

/** Le premier remplaçant possible d'une demande, qui doit exister. */
function premierPossible(s: Session, demande: string): string {
  const v = vacationDe(s, demande)
  const premier = evaluer(s, demande, v, dejaSollicites(s, demande)).possibles[0]
  if (!premier) throw new Error(`${demande} : aucun remplaçant possible`)
  return premier.agent
}

/**
 * Les décisions du patron sur une demande proposée, à cliquer sans modèle :
 * valider le remplaçant proposé, ou prendre un autre possible ; chacune
 * `valider_remplacement` avec son agent, dont le « oui » reste à donner. Les
 * mêmes sur la demande dans « à valider » et sous le résultat du geste.
 */
export function choixRemplacement(s: Session, demande: string): Choix[] {
  if (statut(s, demande) !== STATUT.proposee) return []
  const v = vacationDe(s, demande)
  const [propose, ...autres] = evaluer(s, demande, v, dejaSollicites(s, demande)).possibles
  if (!propose) return []
  const choix = (libelle: string, agent: string): Choix => ({
    libelle,
    action: validerRemplacement.id,
    params: { demande, agent },
  })
  return [
    choix(`Valider ${propose.nom}`, propose.agent),
    ...autres.map((c) => choix(`Prendre ${c.nom} à la place`, c.agent)),
  ]
}

/** Les alertes de la veille du jour, chacune décrite pour le client. */
function alertes(s: Session, maintenant: Temporal.ZonedDateTime, agent?: string): string[] {
  return passerVeille(VEILLER, METIER, s.dossier, maintenant.toPlainDate())
    .alertes.filter((a) => agent === undefined || a.objet.startsWith(`${agent}/`))
    .map((a) => `${decrire(s.ctx, a.objet)} — ${a.niveau} : ${a.motif}`)
}

const periode = (v: { du: string; au?: string | undefined }) =>
  `du ${dateFr(Temporal.PlainDate.from(v.du))}${v.au ? ` au ${dateFr(Temporal.PlainDate.from(v.au))}` : ''}`

/** Les titres renseignés d'un agent, une ligne chacun ; « non renseigné » quand la donnée manque. */
function titres(s: Session, agent: string): string[] {
  const a = s.ctx.agent(agent)
  const carte = a.cartePro?.validites.at(-1)
  return [
    `Carte professionnelle : ${
      a.cartePro && carte
        ? `${a.cartePro.activites.map((x) => NOMS_ACTIVITES[x]).join(', ')}, ${periode(carte)}`
        : 'non renseigné'
    }`,
    `Récépissé de renouvellement : ${a.recepisse ? periode(a.recepisse) : 'non renseigné'}`,
    `MAC : ${a.mac ? `suivi le ${dateFr(Temporal.PlainDate.from(a.mac))}` : 'non renseigné'}`,
    `SSIAP : ${
      a.ssiap
        ? `niveau ${a.ssiap.niveau}, diplôme du ${dateFr(Temporal.PlainDate.from(a.ssiap.diplome))}`
        : 'non renseigné'
    }`,
    `Secourisme : ${
      a.secourisme
        ? `qualification du ${dateFr(Temporal.PlainDate.from(a.secourisme.qualification))}`
        : 'non renseigné'
    }`,
    `Habilitation électrique : ${a.habilitationElectrique ? periode(a.habilitationElectrique) : 'non renseigné'}`,
  ]
}

const GererAbsence = z.strictObject({
  agent: IdAgent.nullable().describe(
    "l'identifiant de l'agent absent (A-11) ; null quand c'est l'agent qui parle de lui-même",
  ),
  jour: Jour.describe('le jour de la vacation manquée, AAAA-MM-JJ'),
})
const gererAbsence: Action<Session, z.infer<typeof GererAbsence>> = {
  id: 'gerer_absence',
  description:
    "Gérer l'absence d'un agent un jour donné : l'outil retrouve sa vacation, cherche et propose un remplaçant au patron.",
  parametres: GererAbsence,
  personnes: {
    agent:
      "l'agent absent, tel qu'il est écrit dans la consigne (prénom, nom, ou les deux) ; null quand c'est l'agent qui parle de lui-même",
  },
  roles: ['patron', 'agent'],
  ecrit: false,
  reformuler: (s, identite, p) => {
    const agent = absentVise(identite, p.agent)
    return `Je déclare l'absence de ${agent ? nomDe(s, agent) : "l'agent"} le ${dateFr(Temporal.PlainDate.from(p.jour))} et je cherche un remplaçant.`
  },
  executer: (s, identite, p, maintenant) => {
    const agent = absentVise(identite, p.agent)
    if (!agent) throw new Error("Précisez l'agent absent.")
    const r = signalerAbsence(s, agent, Temporal.PlainDate.from(p.jour), maintenant)
    return {
      texte:
        identite.role === 'patron'
          ? `Demande ${r.demande}\n${decrireEtape(s, r, r.demande)}`
          : `Ton absence du ${dateFr(Temporal.PlainDate.from(p.jour))} est enregistrée (demande ${r.demande}). Le patron s'occupe de ton remplacement.`,
      donnees: { demande: r.demande, statut: r.statut },
      ...(identite.role === 'patron' ? { choix: choixRemplacement(s, r.demande) } : {}),
    }
  },
}

const ValiderRemplacement = z.strictObject({
  demande: z.string().describe('la demande de remplacement, ex. D-V-17'),
  agent: z
    .string()
    .nullable()
    .describe(
      'un autre remplaçant possible choisi par le patron (A-1), ou null pour la proposition',
    ),
})
const validerRemplacement: Action<Session, z.infer<typeof ValiderRemplacement>> = {
  id: 'valider_remplacement',
  description:
    "Le patron valide la proposition de remplaçant d'une demande, ou choisit un autre remplaçant possible.",
  parametres: ValiderRemplacement,
  personnes: {
    agent:
      "un autre remplaçant choisi par le patron, tel qu'il est écrit dans la consigne ; null pour la proposition",
  },
  roles: ['patron'],
  ecrit: true,
  reformuler: (s, _identite, p) => {
    const v = vacationDe(s, p.demande)
    const agent = p.agent ?? premierPossible(s, p.demande)
    return `Valider ${nomDe(s, agent)} (${agent}) pour ${decrire(s.ctx, v.id)} ?`
  },
  executer: (s, _identite, p, maintenant) => {
    const e = valider(s, p.demande, maintenant, p.agent ?? undefined)
    return { texte: decrireEtape(s, e, p.demande), donnees: { statut: e.statut } }
  },
}

// La clé s'appelle `accepte`, pas `oui` : un fournisseur essayé le 2026-10-08
// déformait la clé courte (`ouI`, `ouѝ`, `ouo</arg_value>…`) ; une clé persistée ne se renomme pas.
const RepondreSollicitation = z.strictObject({
  demande: z.string().describe('la demande de remplacement reçue, ex. D-V-17'),
  accepte: z.boolean().describe("true si l'agent accepte la vacation, false s'il refuse"),
})
const repondreSollicitation: Action<Session, z.infer<typeof RepondreSollicitation>> = {
  id: 'repondre_sollicitation',
  description:
    "L'agent accepte ou refuse, pour lui-même, la demande de remplacement (D-…) qu'on lui a envoyée ; jamais pour valider ou choisir un autre agent. Dire non n'a aucune conséquence.",
  parametres: RepondreSollicitation,
  roles: ['agent'],
  ecrit: true,
  reformuler: (s, identite, p) => {
    exigerSollicite(s, identite, p.demande)
    return `Tu confirmes : ${p.accepte ? 'OUI' : 'NON'} pour ${vacationPourAgent(s, vacationDe(s, p.demande).id)} ?`
  },
  executer: (s, identite, p, maintenant) => {
    exigerSollicite(s, identite, p.demande)
    const e = repondre(s, p.demande, p.accepte, maintenant)
    const texte =
      p.accepte && e.statut === STATUT.ecrite
        ? `C'est confirmé : ${vacationPourAgent(s, vacationDe(s, p.demande).id)}. Merci.`
        : reponseEnregistree(p.accepte, e.statut, p.demande)
    return { texte, donnees: { statut: e.statut } }
  },
}

/** Ce qu'une étape de réaffectation dit au demandeur. */
function decrireEtape2(id: string, e: Etape2): string {
  if (e.statut === STATUT_R.ecrite) {
    return ['Planning mis à jour.', ...(e.messages ?? []).map((m) => `Message : « ${m} »`)].join(
      '\n',
    )
  }
  return `${id} : ${e.statut}. ${e.motif}`
}

/** Lève si cette réaffectation n'attend pas la réponse de cet agent. */
function exigerAttendu(s: Session, identite: Identite, id: string): void {
  if (
    !identite.personne ||
    statutReaffectation(s, id) !== STATUT_R.demandee ||
    !attendus(s, id).includes(identite.personne)
  ) {
    throw new Error('cette sollicitation ne vous est pas adressée')
  }
}

const RepondreReaffectation = z.strictObject({
  reaffectation: z.string().describe('la réaffectation reçue, ex. R-20261010T2140-3fa2'),
  accepte: z.boolean().describe("true si l'agent accepte, false s'il refuse"),
})
const repondreAReaffectation: Action<Session, z.infer<typeof RepondreReaffectation>> = {
  id: 'repondre_reaffectation',
  description:
    "L'agent accepte ou refuse, pour lui-même, la réaffectation (R-…) qu'on lui a demandée ; jamais pour valider ou choisir un autre agent. Dire non n'a aucune conséquence.",
  parametres: RepondreReaffectation,
  roles: ['agent'],
  ecrit: true,
  reformuler: (s, identite, p) => {
    exigerAttendu(s, identite, p.reaffectation)
    const vacations = reaffectation(s, p.reaffectation)
      .modifications.filter((m) => m.agent === identite.personne)
      .map((m) => vacationPourAgent(s, m.vacation))
    return `Tu confirmes : ${p.accepte ? 'OUI' : 'NON'} pour ${vacations.join(' et ')} ?`
  },
  executer: (s, identite, p, maintenant) => {
    exigerAttendu(s, identite, p.reaffectation)
    const agent = identite.personne ?? ''
    const e = repondreReaffectation(s, p.reaffectation, agent, p.accepte, maintenant)
    const siens = reaffectation(s, p.reaffectation)
      .modifications.filter((m) => m.agent === agent)
      .map((m) => vacationPourAgent(s, m.vacation))
    const texte =
      p.accepte && e.statut === STATUT_R.ecrite
        ? `C'est confirmé : ${siens.join(' et ')}. Merci.`
        : p.accepte && e.statut === STATUT_R.demandee
          ? "Ta réponse est enregistrée : on attend encore l'accord d'autres agents avant d'écrire le planning."
          : reponseEnregistree(p.accepte, e.statut, p.reaffectation)
    return { texte, donnees: { statut: e.statut } }
  },
}

const ChangerRemplacant = z.strictObject({
  demande: z
    .string()
    .nullable()
    .describe('la réaffectation proposée (R-…), ou null quand la consigne ne la nomme pas'),
  vacation: z
    .string()
    .nullable()
    .describe('la vacation à changer (V-03), ou null quand la consigne dit son jour'),
  jour: Jour.nullable().describe(
    'le jour de la vacation à changer, AAAA-MM-JJ, ou null quand la consigne dit la vacation',
  ),
  agent: IdAgent.nullable().describe("l'agent qui prend la vacation à la place (A-11)"),
})
type ChangerRemplacant = z.infer<typeof ChangerRemplacant>

/** Le jour où commence une vacation, AAAA-MM-JJ. */
function jourDe(s: Session, id: string): string | undefined {
  const v = s.ctx.planning.vacations.find((x) => x.id === id)
  return v ? intervalleDe(v).debut.toPlainDate().toString() : undefined
}

/**
 * La réaffectation reçue que vise le patron, et la vacation à y changer :
 * nommées, ou retrouvées sans ambiguïté parmi celles qui attendent son
 * « oui ». Lève sinon, en disant laquelle choisir.
 */
function aChanger(
  s: Session,
  p: ChangerRemplacant,
): { reaffectation: Reaffectation; vacation: string; agent: string } {
  const quoi =
    p.vacation ?? (p.jour ? `de vacation le ${dateFr(Temporal.PlainDate.from(p.jour))}` : null)
  if (quoi === null) throw new Error('Précisez la vacation à changer (V-…) ou son jour.')
  if (p.demande !== null) {
    const st = statutReaffectation(s, p.demande)
    if (st === undefined) throw new Error(`${p.demande} : réaffectation inconnue`)
    if (st !== STATUT_R.recue) throw new Error(`${p.demande} : ${st}, elle ne se change plus`)
  }
  const vise = (r: Reaffectation) =>
    r.modifications
      .filter((m) =>
        p.vacation !== null ? m.vacation === p.vacation : jourDe(s, m.vacation) === p.jour,
      )
      .map((m) => ({ reaffectation: r, vacation: m.vacation, agent: m.agent }))
  const trouvees = (
    p.demande !== null ? [reaffectation(s, p.demande)] : reaffectationsRecues(s)
  ).flatMap(vise)
  const ids = [...new Set(trouvees.map((t) => t.reaffectation.id))]
  const [une] = trouvees
  if (!une) {
    throw new Error(
      p.demande !== null
        ? `${p.demande} ne contient pas ${quoi}`
        : `aucune réaffectation en attente de validation ne contient ${quoi}`,
    )
  }
  if (ids.length > 1) {
    throw new Error(
      `plusieurs réaffectations en attente contiennent ${quoi} : laquelle (${ids.join(', ')}) ?`,
    )
  }
  if (trouvees.length > 1) {
    throw new Error(
      `${une.reaffectation.id} a plusieurs vacations ce jour-là : laquelle (${trouvees.map((t) => t.vacation).join(', ')}) ?`,
    )
  }
  return une
}

const changerRemplacant: Action<Session, ChangerRemplacant> = {
  id: 'changer_remplacant',
  description:
    "Le patron prend un autre agent pour une vacation d'une réaffectation proposée (R-…), avant de la valider (« oui mais tel agent pour V-03 », « plutôt tel autre mardi »).",
  parametres: ChangerRemplacant,
  personnes: {
    agent:
      "l'agent qui prend la vacation à la place, tel qu'il est écrit dans la consigne (prénom, nom, ou les deux)",
  },
  roles: ['patron'],
  ecrit: true,
  propose: true,
  reformuler: (s, _identite, p) =>
    `Je prends ${p.agent ? nomDe(s, p.agent) : 'un autre agent'} pour ${p.vacation ?? 'cette vacation'} et je refais la proposition.`,
  executer: (s, _identite, p, maintenant) => {
    if (!p.agent) throw new Error("Précisez l'agent qui prend la vacation.")
    const { reaffectation: r, vacation, agent } = aChanger(s, p)
    if (commencee(s, r.id, maintenant)) {
      throw new Error(`${r.id} : une vacation a commencé, trop tard pour la changer`)
    }
    if (agent === p.agent) throw new Error(`${nomDe(s, agent)} est déjà proposé pour ${vacation}`)
    const nouvel = p.agent
    return {
      texte: `${vacation} : ${nomDe(s, nouvel)} à la place de ${nomDe(s, agent)} (${r.id}).`,
      donnees: { demande: r.id, vacation },
      modifications: r.modifications.map((m) =>
        m.vacation === vacation ? { ...m, agent: nouvel } : m,
      ),
      corrige: r.id,
    }
  },
}

const SuivreDemande = z.strictObject({
  demande: z
    .string()
    .describe('la demande à suivre : un remplacement (D-V-17) ou une réaffectation (R-…)'),
})
const suivreDemande: Action<Session, z.infer<typeof SuivreDemande>> = {
  id: 'suivre_demande',
  description:
    "Où en est une demande (remplacement D-…, réaffectation R-…) : la fait avancer sans réponse à temps, ou s'il est trop tard.",
  parametres: SuivreDemande,
  roles: ['patron'],
  ecrit: false,
  reformuler: (_s, _identite, p) => `Je regarde où en est ${p.demande}.`,
  executer: (s, _identite, p, maintenant) => {
    if (p.demande.startsWith('R-')) {
      const e = suivreReaffectation(s, p.demande, maintenant)
      return {
        texte: e
          ? decrireEtape2(p.demande, e)
          : `${p.demande} : ${statutReaffectation(s, p.demande) ?? 'demande inconnue'}`,
      }
    }
    const e = suivre(s, p.demande, maintenant)
    return {
      texte: e
        ? decrireEtape(s, e, p.demande)
        : `${p.demande} : ${statut(s, p.demande) ?? 'demande inconnue'}`,
    }
  },
}

/** Les bornes d'une période demandée ; une borne nulle ne borne pas. */
const bornes = (p: { du: string | null; au: string | null }) => ({
  du: p.du ? Temporal.PlainDate.from(p.du) : undefined,
  au: p.au ? Temporal.PlainDate.from(p.au) : undefined,
})

/** Une vacation est dans la période quand son jour de début est entre `du` et `au` inclus. */
function dansPeriode(
  debut: Temporal.ZonedDateTime,
  du: Temporal.PlainDate | undefined,
  au: Temporal.PlainDate | undefined,
): boolean {
  const jour = debut.toPlainDate()
  return (
    (!du || Temporal.PlainDate.compare(jour, du) >= 0) &&
    (!au || Temporal.PlainDate.compare(jour, au) <= 0)
  )
}

const VoirPlanning = z.strictObject({
  agent: z
    .string()
    .nullable()
    .describe("l'agent dont on veut le planning (A-1), ou null pour tous"),
  du: Jour.nullable().describe('premier jour inclus, AAAA-MM-JJ, ou null'),
  au: Jour.nullable().describe('dernier jour inclus, AAAA-MM-JJ, ou null'),
})
const voirPlanning: Action<Session, z.infer<typeof VoirPlanning>> = {
  id: 'voir_planning',
  description: "Montrer le planning : les vacations d'un agent ou de tous, entre deux dates.",
  parametres: VoirPlanning,
  personnes: {
    agent:
      "l'agent dont on veut le planning, tel qu'il est écrit dans la consigne ; null pour tous, ou pour soi-même quand c'est un agent qui parle",
  },
  roles: ['patron', 'agent'],
  ecrit: false,
  reformuler: (s, identite, p) => {
    const agent = agentVise(identite, p.agent)
    return `Je montre le planning${agent ? ` de ${nomDe(s, agent)}` : ''}.`
  },
  executer: (s, identite, p) => {
    const agent = agentVise(identite, p.agent)
    const { du, au } = bornes(p)
    const vacations = (agent ? s.ctx.vacationsDe(agent) : s.ctx.planning.vacations)
      .map((v) => ({ v, debut: intervalleDe(v).debut }))
      .filter(({ debut }) => dansPeriode(debut, du, au))
      .sort((a, b) => Temporal.ZonedDateTime.compare(a.debut, b.debut))
    // Le nom complet de l'agent visé, même sans vacation : le patron voit qui l'outil a compris.
    return {
      texte:
        vacations.length > 0
          ? vacations.map(({ v }) => decrire(s.ctx, v.id)).join('\n')
          : identite.role === 'patron' && agent
            ? `Aucune vacation pour ${nomDe(s, agent)}.`
            : 'Aucune vacation.',
    }
  },
}

/** La période dite en mots : ses deux bornes, ou celle qui manque. */
function enMots(p: { du: string | null; au: string | null }): string {
  const jour = (j: string) => dateFr(Temporal.PlainDate.from(j))
  if (p.du && p.au) return `du ${jour(p.du)} au ${jour(p.au)}`
  if (p.du) return `depuis le ${jour(p.du)}`
  if (p.au) return `jusqu'au ${jour(p.au)}`
  return 'sur tout le planning'
}

const enHeures = (h: number) => `${Math.round(h * 10) / 10} h`

const HeuresParAgent = z.strictObject({
  agent: z
    .string()
    .nullable()
    .describe("l'agent dont on compte les heures (A-1), ou null pour tous"),
  du: Jour.nullable().describe('premier jour inclus, AAAA-MM-JJ, ou null (sans borne)'),
  au: Jour.nullable().describe('dernier jour inclus, AAAA-MM-JJ, ou null (sans borne)'),
})
const heuresParAgent: Action<Session, z.infer<typeof HeuresParAgent>> = {
  id: 'heures_par_agent',
  description:
    "Compter les heures de vacation d'un agent, ou de tous, entre deux dates, d'après le planning (faites ou à venir), sans le montrer vacation par vacation.",
  parametres: HeuresParAgent,
  personnes: {
    agent:
      "l'agent dont on compte les heures, tel qu'il est écrit dans la consigne ; null pour tous, ou pour soi-même quand c'est un agent qui parle",
  },
  roles: ['patron', 'agent'],
  ecrit: false,
  reformuler: (s, identite, p) => {
    const agent = agentVise(identite, p.agent)
    return `Je compte les heures${agent ? ` de ${nomDe(s, agent)}` : ' de chaque agent'}.`
  },
  executer: (s, identite, p) => {
    const { du, au } = bornes(p)
    if (du && au && Temporal.PlainDate.compare(du, au) > 0) {
      throw new Error('La période est inversée.')
    }
    // Une vacation compte entière sur son jour de début, comme `voir_planning` et la copie de l'échappée.
    const heures = (agent: string) =>
      s.ctx
        .vacationsDe(agent)
        .map((v) => intervalleDe(v))
        .filter((i) => dansPeriode(i.debut, du, au))
        .reduce((total, i) => total + dureeHeures(i), 0)
    const quand = enMots(p)
    const agent = agentVise(identite, p.agent)
    if (agent) {
      const h = heures(agent)
      return {
        texte:
          identite.role === 'patron'
            ? `${nomDe(s, agent)} : ${enHeures(h)} ${quand}.`
            : `Tes heures ${quand} : ${enHeures(h)}.`,
        donnees: { heures: h },
      }
    }
    // Tous, du moins d'heures au plus ; à égalité, l'ordre du planning (le tri est stable).
    const parAgent = s.ctx.planning.agents
      .map((a) => ({ agent: a.id, nom: a.nom, heures: heures(a.id) }))
      .sort((a, b) => a.heures - b.heures)
    return {
      texte: [
        `Les heures de chaque agent ${quand} :`,
        ...parAgent.map((a) => `${a.nom} : ${enHeures(a.heures)}`),
      ].join('\n'),
      donnees: { heures: parAgent.map(({ agent, heures }) => ({ agent, heures })) },
    }
  },
}

const SansParametre = z.strictObject({})

const voirEcheances: Action<Session, z.infer<typeof SansParametre>> = {
  id: 'voir_echeances',
  description:
    'Montrer les échéances proches ou dépassées des titres des agents : cartes, MAC, recyclages, habilitations.',
  parametres: SansParametre,
  roles: ['patron'],
  ecrit: false,
  reformuler: () => 'Je montre les échéances des titres des agents.',
  executer: (s, _identite, _p, maintenant) => {
    const lignes = alertes(s, maintenant)
    return { texte: lignes.length > 0 ? lignes.join('\n') : 'Aucune échéance proche.' }
  },
}

const mesTitres: Action<Session, z.infer<typeof SansParametre>> = {
  id: 'mes_titres',
  description:
    "Montrer à l'agent ses titres (carte professionnelle, MAC, SSIAP, secourisme, habilitation) et leurs échéances.",
  parametres: SansParametre,
  roles: ['agent'],
  ecrit: false,
  reformuler: () => 'Je montre tes titres et leurs échéances.',
  executer: (s, identite, _p, maintenant) => {
    const agent = identite.personne
    if (!agent) throw new Error('agent inconnu')
    return { texte: [...alertes(s, maintenant, agent), ...titres(s, agent)].join('\n') }
  },
}

const LancerVeille = z.strictObject({
  date: Jour.nullable().describe("le jour de la veille, AAAA-MM-JJ, ou null pour aujourd'hui"),
})
const lancerVeille: Action<Session, z.infer<typeof LancerVeille>> = {
  id: 'lancer_veille',
  description:
    'Lancer la veille : vérifier tout le planning contre les règles et rendre le rapport des écarts et des échéances.',
  parametres: LancerVeille,
  roles: ['patron'],
  ecrit: false,
  reformuler: () => 'Je lance la veille du planning et des échéances.',
  executer: (s, _identite, p, maintenant) => {
    const jour = p.date ? Temporal.PlainDate.from(p.date) : maintenant.toPlainDate()
    return {
      texte: veilleDuClient(VEILLER, METIER, s.dossier, jour, s.journal, DOMAINE.rienASignaler)
        .rapport,
    }
  },
}

/** Les gestes de la sécurité privée, dans l'ordre où le modèle les lit. */
export const ACTIONS: Action<Session, unknown>[] = [
  gererAbsence,
  validerRemplacement,
  repondreSollicitation,
  repondreAReaffectation,
  changerRemplacant,
  suivreDemande,
  voirPlanning,
  heuresParAgent,
  voirEcheances,
  mesTitres,
  lancerVeille,
] as Action<Session, unknown>[]
