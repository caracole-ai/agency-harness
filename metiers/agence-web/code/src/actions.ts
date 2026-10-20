import {
  type Action,
  aCapacite,
  ajouter,
  dateFr,
  type Identite,
  LEQUEL,
  type Repli,
  Temporal,
} from '@harnais/moteur'
import { z } from 'zod'
import type { Session } from './conversation'
import { projetsDe } from './copie'
import {
  type ETATS_PROJET,
  type ETATS_TICKET,
  type Facture,
  IDENTIFIANTS,
  NIVEAUX_RELANCE,
  type Projet,
  type Ticket,
} from './modele'
import { ROLES_DECLARES, rolesQui, TOUS_LES_ROLES, vueDe } from './roles'
import { consommeVendu, recetteDuLot } from './semantique'
import { type Entite, entites, resoudreEntite, type SorteEntite } from './types-parametre'

// Les huit gestes de l'agence web (PLAN-METIER-2.md § 7.5, M14) : la liste
// fermée que le modèle choisit et que le code exécute ; les vingt-trois autres
// demandes de l'entretien vont à l'échappée, c'est la mesure. Rien ne s'écrit
// chez l'agence en v1 : une absence est une proposition montrée, une relance
// un brouillon gardé au journal, jamais envoyé (I-15). Un graphiste ou un
// développeur ne travaille que sur ses tickets, son temps et ses projets, et
// ne lit jamais un montant ni des jours vendus ; c'est structurel, pas un
// filtre (PLAN-ESPACES.md § 5.2, D4). Une entité nommée (« la boulangerie »,
// « PRJ-12 ») est résolue par le métier (`types-parametre.ts`) ; plusieurs
// candidats : le geste répond « lequel ? » avec leurs identifiants. Les textes
// sont rendus par le code, chaque chiffre cité des données.

/** Une absence proposée par `declarer_absence` : la ligne du journal que `disponibilites` relit. */
export const TYPE_ABSENCE_PROPOSEE = 'absence proposée'
/** Un brouillon de relance gardé après le « oui » : jamais envoyé. */
export const TYPE_BROUILLON = 'brouillon'

/** Le refus d'un geste pour un rôle qui n'en a pas la capacité. */
export const PAS_OUVERT = "ce geste n'est pas ouvert à votre rôle"

const Jour = z.iso.date()

// --- Les mots et les nombres, rendus par le code ---

const ETATS_PROJET_EN_MOTS: Record<(typeof ETATS_PROJET)[number], string> = {
  cadrage: 'en cadrage',
  en_cours: 'en cours',
  recette: 'en recette',
  livre: 'livré',
  garantie: 'en garantie',
  clos: 'clos',
}
const ETATS_TICKET_EN_MOTS: Record<(typeof ETATS_TICKET)[number], string> = {
  a_faire: 'à faire',
  en_cours: 'en cours',
  en_revue: 'en revue',
  resolu: 'résolu',
}

/** Un nombre à deux décimales au plus, à la française : `23,5`. */
const nombre = (n: number) => String(Number(n.toFixed(2))).replace('.', ',')

/** Des euros à deux décimales, à la française : `12 500,00 €`. */
export function enEuros(n: number): string {
  const [entier = '', decimales = ''] = n.toFixed(2).split('.')
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${decimales} €`
}

const jour = (iso: string) => Temporal.PlainDate.from(iso)
const date = (iso: string) => dateFr(jour(iso))
const periode = (du: string, au: string) =>
  du === au ? `le ${date(du)}` : `du ${date(du)} au ${date(au)}`
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

// --- Qui, et sur quoi ---

/** La personne qui parle : tous les rôles de l'agence sont identifiés. */
function moi(identite: Identite): string {
  if (identite.personne === undefined) throw new Error("l'identité n'a pas de personne")
  return identite.personne
}

const nomDe = (s: Session, personne: string) => s.ctx.personnes.get(personne)?.nom ?? personne

const AUCUN: Record<SorteEntite, string> = {
  projet: 'Aucun projet',
  client: 'Aucun client',
  ticket: 'Aucun ticket',
  lot: 'Aucun lot',
  facture: 'Aucune facture',
  devis: 'Aucun devis',
}

/**
 * L'entité qu'une mention désigne, parmi celles que le geste peut viser
 * (`visible`) ; plusieurs : « lequel ? » avec leurs identifiants. Une mention
 * qui ne désigne que des entités hors de portée est refusée par le code, avec
 * le motif `refus`.
 */
function une(
  s: Session,
  sorte: SorteEntite,
  mention: string,
  visible: (id: string) => boolean = () => true,
  refus: (ids: string[]) => string = () => PAS_OUVERT,
): Entite | { lequel: string } {
  const toutes = entites(s, sorte)
  const candidats = resoudreEntite(
    mention,
    toutes.filter((e) => visible(e.id)),
  )
  const [seule] = candidats
  if (candidats.length === 1 && seule) return seule
  if (candidats.length > 1) return { lequel: `${LEQUEL} ${candidats.map((c) => c.id).join(', ')}` }
  const horsDePortee = resoudreEntite(mention, toutes)
  if (horsDePortee.length > 0) throw new Error(refus(horsDePortee.map((e) => e.id)))
  throw new Error(`${AUCUN[sorte]} ne correspond à « ${mention} ».`)
}

/** Le projet d'un geste : tous pour le commerce et `voit_tout`, ceux de ses tickets pour soi. */
function projetVise(s: Session, identite: Identite, mention: string): Projet | { lequel: string } {
  const siens = vueDe(identite) === 'soi' ? projetsDe(s, moi(identite)) : undefined
  const e = une(
    s,
    'projet',
    mention,
    (id) => siens === undefined || siens.has(id),
    () => `${PAS_OUVERT} que sur vos projets`,
  )
  if ('lequel' in e) return e
  const p = s.ctx.projets.get(e.id)
  if (!p) throw new Error(`projet ${e.id} inconnu`)
  return p
}

/** Ce qui reste dû sur une facture : le TTC moins les paiements reçus. */
function resteDu(s: Session, f: Facture): number {
  const paye = s.ctx.paiements
    .filter((p) => p.facture === f.id)
    .reduce((somme, p) => somme + p.montant_eur, 0)
  return Math.round((f.montant_ttc_eur - paye) * 100) / 100
}

const relancesDe = (s: Session, facture: string) =>
  s.ctx.relances
    .filter((r) => r.facture === facture)
    .sort((a, b) => Temporal.PlainDate.compare(jour(a.date), jour(b.date)))

/** Ce sur quoi un ticket ou une ligne de temps est imputé : un projet, un contrat TMA, ou rien. */
function imputation(s: Session, id: string | undefined): string {
  if (id === undefined) return 'Sans projet'
  const p = s.ctx.projets.get(id)
  if (p) return `${p.id} — ${p.nom}${p.fin_prevue ? ` (fin prévue le ${date(p.fin_prevue)})` : ''}`
  return s.ctx.contrats_tma.has(id) ? `${id} — contrat de maintenance` : id
}

const ouvert = (t: Ticket) => t.etat !== 'resolu'

function exigerPeriode(du: string, au: string): void {
  if (Temporal.PlainDate.compare(jour(du), jour(au)) > 0) {
    throw new Error(`la période est à l'envers : du ${date(du)} au ${date(au)}`)
  }
}

// --- etat_projet ---

const EtatProjet = z.strictObject({
  projet: z
    .string()
    .min(1)
    .describe(
      'le projet tel qu’il est écrit dans la consigne : son identifiant (PRJ-…), son nom, ou le nom ou le secteur de son client',
    ),
})
const etatProjet: Action<Session, z.infer<typeof EtatProjet>> = {
  id: 'etat_projet',
  description:
    'Où en est un projet : son état, le lot en cours, les PV en attente, la prochaine échéance (et, pour qui voit tout, les jours consommés et vendus).',
  parametres: EtatProjet,
  roles: TOUS_LES_ROLES,
  ecrit: false,
  reformuler: (s, identite, p) => {
    const projet = projetVise(s, identite, p.projet)
    return 'lequel' in projet ? projet.lequel : `Je montre où en est ${projet.id}.`
  },
  executer: (s, identite, p, maintenant) => {
    const projet = projetVise(s, identite, p.projet)
    if ('lequel' in projet) return { texte: projet.lequel }
    const aujourdhui = maintenant.toPlainDate()
    const client = projet.client === undefined ? undefined : s.ctx.clients.get(projet.client)
    const lots = [...s.ctx.lots.values()].filter((l) => l.projet === projet.id)
    // la même lecture que I-01 (`semantique.ts`) : un geste et un contrôle ne divergent pas
    const enCours = lots.find((l) => recetteDuLot(s.ctx, l.id).pv_signe_le === undefined)
    const enAttente = lots.flatMap((l) => {
      const r = recetteDuLot(s.ctx, l.id)
      return r.recette_le !== undefined && r.pv_signe_le === undefined
        ? [`${l.id} (recette du ${date(r.recette_le)})`]
        : []
    })
    const echeances = [
      { quoi: 'fin prévue', le: projet.fin_prevue },
      { quoi: 'fin de garantie', le: projet.garantie_fin },
    ]
      .flatMap((e) => (e.le === undefined ? [] : [{ quoi: e.quoi, le: jour(e.le) }]))
      .filter((e) => Temporal.PlainDate.compare(e.le, aujourdhui) >= 0)
      .sort((a, b) => Temporal.PlainDate.compare(a.le, b.le))
    const prochaine = echeances[0]
    const lignes = [
      `${projet.id} — ${projet.nom}${client ? ` (${client.nom})` : ''}`,
      `État : ${ETATS_PROJET_EN_MOTS[projet.etat]} (${projet.type})`,
      `Lot en cours : ${
        enCours
          ? `${enCours.id} — ${enCours.nom}`
          : lots.length > 0
            ? 'aucun, chaque lot a son PV signé'
            : 'aucun lot'
      }`,
    ]
    let donnees: Record<string, unknown> = { projet: projet.id }
    // Les jours consommés et vendus : pour qui voit tout, seulement (§ 7.5).
    if (aCapacite(ROLES_DECLARES, identite, 'voit_tout')) {
      const c = consommeVendu(s.ctx, projet.id, s.config.seuils.heures_par_jour)
      lignes.push(
        c.vendus > 0
          ? `Jours : ${nombre(c.consommes)} consommés sur ${nombre(c.vendus)} vendus (${Math.round((c.part ?? 0) * 100)} %)`
          : `Jours : ${nombre(c.consommes)} consommés, aucun jour vendu`,
      )
      donnees = { ...donnees, consommes: c.consommes, vendus: c.vendus }
    }
    lignes.push(
      `PV en attente : ${enAttente.length > 0 ? enAttente.join(', ') : 'aucun'}`,
      `Prochaine échéance : ${prochaine ? `${prochaine.quoi} le ${dateFr(prochaine.le)}` : 'aucune à venir'}`,
    )
    return { texte: lignes.join('\n'), donnees }
  },
}

// --- factures_en_retard ---

const FacturesEnRetard = z.strictObject({
  client: z
    .string()
    .nullable()
    .describe(
      'le client tel qu’il est écrit dans la consigne (identifiant CLI-…, nom ou secteur), ou null pour tous',
    ),
})
const facturesEnRetard: Action<Session, z.infer<typeof FacturesEnRetard>> = {
  id: 'factures_en_retard',
  description:
    'Les factures échues et pas encore payées, de tous les clients ou d’un seul : montant, jours de retard, dernière relance.',
  parametres: FacturesEnRetard,
  roles: [...rolesQui('voit_tout'), 'commercial'],
  ecrit: false,
  reformuler: () => 'Je montre les factures en retard.',
  executer: (s, _identite, p, maintenant) => {
    const client = p.client === null ? undefined : une(s, 'client', p.client)
    if (client && 'lequel' in client) return { texte: client.lequel }
    const aujourdhui = maintenant.toPlainDate()
    const retards = [...s.ctx.factures.values()]
      .filter((f) => f.etat === 'emise' && (client === undefined || f.client === client.id))
      .map((f) => ({
        f,
        reste: resteDu(s, f),
        retard:
          f.echeance === undefined
            ? undefined
            : jour(f.echeance).until(aujourdhui, { largestUnit: 'days' }).days,
      }))
      .filter((x) => x.reste > 0 && (x.retard === undefined || x.retard > 0))
      // Les plus en retard d'abord ; une échéance inconnue à la fin (rien n'est supposé).
      .sort((a, b) => (b.retard ?? -1) - (a.retard ?? -1))
    if (retards.length === 0)
      return { texte: 'Aucune facture en retard.', donnees: { factures: [] } }
    // Une phrase de compte, puis les factures en deux groupes, ce qui décide d'une relance : déjà relancées ou non.
    const ligne = ({ f, reste, retard }: (typeof retards)[number]) => {
      const derniere = relancesDe(s, f.id).at(-1)
      return {
        titre: `${s.ctx.clients.get(f.client)?.nom ?? f.client} · ${enEuros(f.montant_ttc_eur)} TTC${reste !== f.montant_ttc_eur ? `, reste dû ${enEuros(reste)}` : ''}`,
        detail: [
          f.id,
          f.echeance === undefined || retard === undefined
            ? 'échéance inconnue'
            : `échue le ${date(f.echeance)}, ${pluriel(retard, 'jour')} de retard`,
          ...(derniere ? [`relance niveau ${derniere.niveau} le ${date(derniere.date)}`] : []),
        ].join(' · '),
      }
    }
    const sans = retards.filter((x) => relancesDe(s, x.f.id).length === 0)
    const relancees = retards.filter((x) => relancesDe(s, x.f.id).length > 0)
    const du = retards.reduce((somme, x) => somme + x.reste, 0)
    return {
      texte: `${pluriel(retards.length, 'facture')} en retard : ${enEuros(du)} restant dû.`,
      replis: [
        ...(sans.length > 0
          ? [
              {
                titre: `Jamais relancées (${sans.length})`,
                icone: 'alerte' as const,
                lignes: sans.map(ligne),
                ouvert: true,
              },
            ]
          : []),
        ...(relancees.length > 0
          ? [
              {
                titre: `Déjà relancées (${relancees.length})`,
                icone: 'horloge' as const,
                lignes: relancees.map(ligne),
                ouvert: true,
              },
            ]
          : []),
      ],
      donnees: { factures: retards.map((x) => x.f.id) },
    }
  },
}

// --- mes_tickets ---

const MesTickets = z.strictObject({
  du: Jour.nullable().describe('premier jour inclus, AAAA-MM-JJ, ou null pour les tickets ouverts'),
  au: Jour.nullable().describe('dernier jour inclus, AAAA-MM-JJ, ou null'),
})
const mesTickets: Action<Session, z.infer<typeof MesTickets>> = {
  id: 'mes_tickets',
  description:
    'Les tickets de celui qui parle, par projet, avec leur état et leur estimation : ouverts, ou actifs sur une période.',
  parametres: MesTickets,
  roles: TOUS_LES_ROLES,
  ecrit: false,
  reformuler: () => 'Je montre vos tickets.',
  executer: (s, identite, p) => {
    const personne = moi(identite)
    if (p.du !== null && p.au !== null) exigerPeriode(p.du, p.au)
    const tickets = [...s.ctx.tickets.values()].filter((t) => {
      if (t.assigne !== personne) return false
      if (p.du === null && p.au === null) return ouvert(t)
      // Actif sur la période : créé avant sa fin, pas résolu avant son début.
      const cree = p.au === null || Temporal.PlainDate.compare(jour(t.cree_le), jour(p.au)) <= 0
      const pasFini =
        t.resolu_le === undefined ||
        p.du === null ||
        Temporal.PlainDate.compare(jour(t.resolu_le), jour(p.du)) >= 0
      return cree && pasFini
    })
    if (tickets.length === 0) return { texte: 'Aucun ticket.', donnees: { tickets: [] } }
    const parImputation = new Map<string, Ticket[]>()
    for (const t of tickets) {
      const ou = imputation(s, t.projet ?? t.contrat_tma)
      parImputation.set(ou, [...(parImputation.get(ou) ?? []), t])
    }
    // Une phrase de compte, puis un groupe par projet ou contrat : le ticket en mots, son état et son estimation dessous.
    const estimees = tickets.reduce((somme, t) => somme + (t.estimation_h ?? 0), 0)
    const replis: Repli[] = [...parImputation].map(([ou, ts]) => ({
      titre: ou,
      lignes: ts.map((t) => ({
        titre: t.resume,
        detail: [
          ETATS_TICKET_EN_MOTS[t.etat],
          t.estimation_h === undefined ? 'sans estimation' : `${nombre(t.estimation_h)} h estimées`,
          t.cle,
        ].join(' · '),
      })),
      ouvert: true,
    }))
    return {
      texte: `${pluriel(tickets.length, 'ticket')}, ${nombre(estimees)} h estimées, sur ${parImputation.size} ${parImputation.size > 1 ? 'projets ou contrats' : 'projet ou contrat'}.`,
      replis,
      donnees: { tickets: tickets.map((t) => t.cle) },
    }
  },
}

// --- mon_temps ---

const MonTemps = z.strictObject({
  personne: z
    .string()
    .regex(IDENTIFIANTS.personne)
    .nullable()
    .describe('la personne dont on veut les heures (M-01) ; null pour celui qui parle'),
  du: Jour.describe('premier jour inclus, AAAA-MM-JJ'),
  au: Jour.describe('dernier jour inclus, AAAA-MM-JJ'),
})

/** La personne dont on lit le temps : soi-même ; une autre, pour qui voit tout seulement (refus du code sinon). */
function tempsDeQui(identite: Identite, demande: string | null): string {
  const soi = moi(identite)
  if (demande === null || demande === soi) return soi
  if (!aCapacite(ROLES_DECLARES, identite, 'voit_tout')) {
    throw new Error(`${PAS_OUVERT} : le temps d'une autre personne`)
  }
  return demande
}

const monTemps: Action<Session, z.infer<typeof MonTemps>> = {
  id: 'mon_temps',
  description:
    'Les heures saisies sur une période, par projet : celles de celui qui parle, ou celles d’une autre personne pour qui voit tout.',
  parametres: MonTemps,
  personnes: {
    personne:
      'la personne dont on veut les heures, telle qu’elle est écrite dans la consigne ; null pour celui qui parle',
  },
  roles: TOUS_LES_ROLES,
  ecrit: false,
  reformuler: (s, identite, p) => {
    const qui = tempsDeQui(identite, p.personne)
    return `Je montre les heures de ${nomDe(s, qui)} ${periode(p.du, p.au)}.`
  },
  executer: (s, identite, p) => {
    const qui = tempsDeQui(identite, p.personne)
    exigerPeriode(p.du, p.au)
    const du = jour(p.du)
    const au = jour(p.au)
    const heures = new Map<string, number>()
    for (const t of s.ctx.temps) {
      const d = jour(t.date)
      if (
        t.personne === qui &&
        Temporal.PlainDate.compare(d, du) >= 0 &&
        Temporal.PlainDate.compare(d, au) <= 0
      ) {
        heures.set(t.projet, (heures.get(t.projet) ?? 0) + t.heures)
      }
    }
    const enJours = (h: number) => nombre(h / s.config.seuils.heures_par_jour)
    const titre = `Heures de ${nomDe(s, qui)} ${periode(p.du, p.au)}`
    if (heures.size === 0)
      return { texte: `${titre} : aucune.`, donnees: { personne: qui, heures: {} } }
    const total = [...heures.values()].reduce((a, b) => a + b, 0)
    // Le total d'abord ; le détail par projet, le plus d'heures en tête.
    return {
      texte: `${titre} : ${nombre(total)} h (${enJours(total)} j).`,
      replis: [
        {
          titre: `Par projet ou contrat (${heures.size})`,
          lignes: [...heures]
            .sort((a, b) => b[1] - a[1])
            .map(([ou, h]) => ({
              titre: imputation(s, ou),
              detail: `${nombre(h)} h (${enJours(h)} j)`,
            })),
          ouvert: true,
        },
      ],
      donnees: { personne: qui, heures: Object.fromEntries(heures) },
    }
  },
}

// --- disponibilites ---

const Periode = z.strictObject({
  du: Jour.describe('premier jour inclus, AAAA-MM-JJ'),
  au: Jour.describe('dernier jour inclus, AAAA-MM-JJ'),
})

/** Ce qu'une ligne d'absence proposée garde. */
const AbsenceProposee = z.object({ personne: z.string(), du: Jour, au: Jour })

/** Les absences proposées au journal qui recouvrent la période. */
function absences(s: Session, du: string, au: string): z.infer<typeof AbsenceProposee>[] {
  return s.journal
    .lire()
    .filter((l) => l.type === TYPE_ABSENCE_PROPOSEE && l.donnees !== null)
    .flatMap((l) => {
      const a = AbsenceProposee.safeParse(JSON.parse(l.donnees ?? 'null'))
      return a.success ? [a.data] : []
    })
    .filter(
      (a) =>
        Temporal.PlainDate.compare(jour(a.du), jour(au)) <= 0 &&
        Temporal.PlainDate.compare(jour(a.au), jour(du)) >= 0,
    )
}

const disponibilites: Action<Session, z.infer<typeof Periode>> = {
  id: 'disponibilites',
  description:
    "La charge de chaque personne de l'agence sur une période : les heures estimées de ses tickets ouverts, et ses absences proposées.",
  parametres: Periode,
  roles: [...rolesQui('voit_tout'), 'commercial'],
  ecrit: false,
  reformuler: (_s, _identite, p) => `Je montre qui est disponible ${periode(p.du, p.au)}.`,
  executer: (s, _identite, p) => {
    exigerPeriode(p.du, p.au)
    const absentes = absences(s, p.du, p.au)
    // Du plus disponible au plus chargé : la charge en heures estimées, et les absences, sous chaque nom.
    const charges = [...s.ctx.personnes.values()].map((personne) => {
      const ouverts = [...s.ctx.tickets.values()].filter(
        (t) => t.assigne === personne.id && ouvert(t),
      )
      const estimees = ouverts.reduce((somme, t) => somme + (t.estimation_h ?? 0), 0)
      const sans = ouverts.filter((t) => t.estimation_h === undefined).length
      const siennes = absentes.filter((a) => a.personne === personne.id)
      return {
        estimees,
        ligne: {
          titre: personne.nom,
          detail: [
            `${nombre(estimees)} h estimées sur ${pluriel(ouverts.length, 'ticket')} ouvert${ouverts.length > 1 ? 's' : ''}${sans > 0 ? ` (${sans} sans estimation)` : ''}`,
            siennes.length > 0
              ? `absence proposée ${siennes.map((a) => periode(a.du, a.au)).join(', ')}`
              : 'aucune absence connue',
          ].join(' · '),
        },
      }
    })
    return {
      texte: `Disponibilités ${periode(p.du, p.au)}, du plus disponible au plus chargé.`,
      replis: [
        {
          titre: `Charge de chacun (${charges.length})`,
          icone: 'personnes',
          lignes: charges.sort((a, b) => a.estimees - b.estimees).map((c) => c.ligne),
          ouvert: true,
        },
      ],
    }
  },
}

// --- domaines_expirant ---

const DomainesExpirant = z.strictObject({
  jours: z
    .number()
    .int()
    .min(0)
    .describe('le nombre de jours à venir : 60 pour « dans les 60 jours »'),
})
const domainesExpirant: Action<Session, z.infer<typeof DomainesExpirant>> = {
  id: 'domaines_expirant',
  description:
    'Les noms de domaine et les certificats qui expirent dans un nombre de jours donné, ou déjà expirés ; une date inconnue en tête.',
  parametres: DomainesExpirant,
  roles: [...rolesQui('voit_tout'), 'developpeur'],
  ecrit: false,
  reformuler: (_s, _identite, p) =>
    `Je montre les domaines et certificats qui expirent dans les ${p.jours} jours.`,
  executer: (s, _identite, p, maintenant) => {
    const aujourdhui = maintenant.toPlainDate()
    const limite = aujourdhui.add({ days: p.jours })
    // Trois groupes, ce qu'ils demandent : date à renseigner, déjà expirés, à renouveler ; le site en titre.
    const inconnues: Repli['lignes'] = []
    const datees: { le: Temporal.PlainDate; passe: boolean; ligne: Repli['lignes'][number] }[] = []
    for (const d of s.ctx.domaines.values()) {
      const client = d.client === undefined ? undefined : s.ctx.clients.get(d.client)
      const chez = `${client?.nom ?? 'client inconnu'}, ${d.registrar ?? 'registrar inconnu'}`
      for (const [quoi, le] of [
        ['domaine', d.expire_le],
        ['certificat', d.certificat_expire_le],
      ] as const) {
        const titre = `${d.nom} · ${quoi}`
        if (le === undefined) {
          inconnues.push({ titre, detail: chez })
          continue
        }
        const date = jour(le)
        if (Temporal.PlainDate.compare(date, limite) > 0) continue
        const passe = Temporal.PlainDate.compare(date, aujourdhui) < 0
        datees.push({
          le: date,
          passe,
          ligne: {
            titre,
            detail: `${passe ? 'expiré le' : 'expire le'} ${dateFr(date)} · ${chez}`,
          },
        })
      }
    }
    datees.sort((a, b) => Temporal.PlainDate.compare(a.le, b.le))
    const expires = datees.filter((d) => d.passe).map((d) => d.ligne)
    const aVenir = datees.filter((d) => !d.passe).map((d) => d.ligne)
    // Une date inconnue en tête : elle n'est pas lointaine, elle est à renseigner.
    const groupes = [
      {
        titre: 'Date à renseigner',
        compte: () => 'date à renseigner',
        icone: 'calendrier' as const,
        lignes: inconnues,
      },
      {
        titre: 'Déjà expirés',
        compte: (n: number) => (n > 1 ? 'expirés' : 'expiré'),
        icone: 'alerte' as const,
        lignes: expires,
      },
      {
        titre: `À renouveler dans les ${p.jours} jours`,
        compte: () => 'à renouveler',
        icone: 'horloge' as const,
        lignes: aVenir,
      },
    ].filter((g) => g.lignes.length > 0)
    const total = groupes.reduce((n, g) => n + g.lignes.length, 0)
    return total === 0
      ? { texte: `Aucun domaine ni certificat n'expire dans les ${p.jours} jours.` }
      : {
          texte: `${total} ${total > 1 ? 'domaines ou certificats' : 'domaine ou certificat'} : ${groupes.map((g) => `${g.lignes.length} ${g.compte(g.lignes.length)}`).join(', ')}.`,
          replis: groupes.map((g) => ({
            titre: `${g.titre} (${g.lignes.length})`,
            icone: g.icone,
            lignes: g.lignes,
            ouvert: true,
          })),
        }
  },
}

// --- declarer_absence ---

const DeclarerAbsence = z.strictObject({
  du: Jour.describe('premier jour d’absence, AAAA-MM-JJ'),
  au: Jour.describe('dernier jour d’absence, AAAA-MM-JJ ; le même pour un seul jour'),
})
const declarerAbsence: Action<Session, z.infer<typeof DeclarerAbsence>> = {
  id: 'declarer_absence',
  description:
    "Celui qui parle déclare son absence sur une période : l'outil la propose, avec ses tickets ouverts à reprendre ; rien n'est écrit.",
  parametres: DeclarerAbsence,
  roles: TOUS_LES_ROLES,
  ecrit: true,
  propose: true,
  reformuler: (_s, _identite, p) => `Je propose votre absence ${periode(p.du, p.au)}.`,
  executer: (s, identite, p, maintenant) => {
    const personne = moi(identite)
    exigerPeriode(p.du, p.au)
    const tickets = [...s.ctx.tickets.values()].filter(
      (t) =>
        t.assigne === personne &&
        ouvert(t) &&
        Temporal.PlainDate.compare(jour(t.cree_le), jour(p.au)) <= 0,
    )
    const phrase = `Proposition : absence de ${nomDe(s, personne)} ${periode(p.du, p.au)}. Rien n'est écrit : la PO la reprend.`
    const texte = [
      phrase,
      ...(tickets.length > 0
        ? [
            'Tickets ouverts à reprendre :',
            ...tickets.map(
              (t) => `  ${t.cle} — ${t.resume} (${t.projet ?? t.contrat_tma ?? 'sans projet'})`,
            ),
          ]
        : ['Aucun ticket ouvert à reprendre.']),
    ].join('\n')
    // La proposition reste au journal, pour la PO et pour `disponibilites` ; rien d'autre ne s'écrit.
    s.journal.ecrire(
      [
        {
          type: TYPE_ABSENCE_PROPOSEE,
          client: s.config.client,
          objet: personne,
          motif: texte,
          donnees: { personne, du: p.du, au: p.au, tickets: tickets.map((t) => t.cle) },
        },
      ],
      maintenant.toInstant().toString(),
    )
    // La page : la phrase, puis les tickets à reprendre en liste (le ticket en mots, sa clé et son projet dessous).
    return {
      texte: tickets.length > 0 ? phrase : `${phrase}\nAucun ticket ouvert à reprendre.`,
      ...(tickets.length > 0
        ? {
            replis: [
              {
                titre: `Tickets ouverts à reprendre (${tickets.length})`,
                lignes: tickets.map((t) => ({
                  titre: t.resume,
                  detail: `${t.cle} · ${imputation(s, t.projet ?? t.contrat_tma)}`,
                })),
                ouvert: true,
              },
            ],
          }
        : {}),
      donnees: { personne, du: p.du, au: p.au, tickets: tickets.map((t) => t.cle) },
    }
  },
}

// --- brouillon_relance ---

const BrouillonRelance = z.strictObject({
  facture: z
    .string()
    .min(1)
    .describe(
      'la facture telle qu’elle est écrite dans la consigne : FAC-…, ou le nom de son client',
    ),
})

/** Les factures qu'une relance peut viser : émises, avec un reste dû. */
const aRelancer = (s: Session) => (id: string) => {
  const f = s.ctx.factures.get(id)
  return f !== undefined && f.etat === 'emise' && resteDu(s, f) > 0
}

/**
 * Le brouillon d'une relance, rendu par le code : son niveau suit
 * `relances.csv` ; il n'est jamais envoyé. Une facture sans échéance connue
 * n'en a pas : rien ne dit qu'elle est échue (la veille demande de la
 * renseigner), rien n'est supposé.
 */
function brouillon(
  s: Session,
  mention: string,
): { facture: Facture; echeance: string; niveau: number; texte: string } {
  const e = une(
    s,
    'facture',
    mention,
    aRelancer(s),
    (ids) => `${ids.join(', ')} : rien à relancer, la facture est payée.`,
  )
  if ('lequel' in e) throw new Error(e.lequel)
  const f = s.ctx.factures.get(e.id)
  if (!f) throw new Error(`facture ${e.id} inconnue`)
  const echeance = f.echeance
  if (echeance === undefined) {
    throw new Error(`${f.id} : son échéance est inconnue ; elle se renseigne avant toute relance.`)
  }
  const relances = relancesDe(s, f.id)
  const niveau = Math.min(NIVEAUX_RELANCE.length, (relances.at(-1)?.niveau ?? 0) + 1)
  const client = s.ctx.clients.get(f.client)
  const contact = [...s.ctx.contacts.values()].find((c) => c.client === f.client)
  const reste = resteDu(s, f)
  const facture = `la facture ${f.id} du ${date(f.date)}, d'un montant de ${enEuros(f.montant_ttc_eur)} TTC, à échéance du ${date(echeance)}`
  const du = reste !== f.montant_ttc_eur ? ` (reste dû : ${enEuros(reste)})` : ''
  const deja = relances.map((r) => date(r.date)).join(', ')
  const corps =
    niveau === 1
      ? `Sauf erreur de notre part, ${facture}, reste à régler${du}. Pourriez-vous nous indiquer la date de son règlement ? Si le paiement est déjà parti, merci de ne pas tenir compte de ce message.`
      : niveau === 2
        ? `Malgré notre relance du ${deja}, ${facture}, reste impayée${du}. Nous vous remercions de procéder à son règlement dans les meilleurs délais.`
        : `Malgré nos relances (${deja}), ${facture}, reste impayée${du}. Sans règlement de votre part, nous engagerons les démarches de recouvrement prévues${
            f.penalites_mentionnees
              ? ', avec les pénalités de retard mentionnées sur la facture'
              : ''
          }.`
  const texte = [
    `Brouillon de relance, niveau ${niveau}, pour ${f.id} (${client?.nom ?? f.client}). Il n'est jamais envoyé par l'outil : l'envoi au client attend le oui du dirigeant.`,
    '---',
    ...(contact
      ? [
          `À l'attention de ${contact.nom}${contact.fonction ? `, ${contact.fonction}` : ''} — ${client?.nom ?? f.client}`,
        ]
      : []),
    `Objet : facture ${f.id}`,
    'Madame, Monsieur,',
    corps,
    'Cordialement.',
    '---',
  ].join('\n')
  return { facture: f, echeance, niveau, texte }
}

/**
 * Le premier jour où la relance d'une facture peut se garder : son échéance
 * plus le délai du premier rappel de la maison (`veiller.delais.relance_facture`),
 * la date que la veille annonce (`echeances.ts`).
 */
const relancableLe = (s: Session, echeance: string) =>
  ajouter(jour(echeance), s.config.veiller.delais.relance_facture)

const brouillonRelance: Action<Session, z.infer<typeof BrouillonRelance>> = {
  id: 'brouillon_relance',
  description:
    "Préparer le brouillon de relance d'une facture impayée, au niveau qui suit la dernière relance ; il n'est jamais envoyé.",
  parametres: BrouillonRelance,
  roles: [...rolesQui('voit_tout'), 'commercial'],
  ecrit: true,
  // La reformulation montre le brouillon : le « oui » le garde au journal, rien ne part. Elle ne
  // connaît pas la date du jour (contrat du moteur) : elle dit l'échéance, et l'exécution, qui la
  // connaît, refuse avant elle.
  reformuler: (s, _identite, p) => {
    const b = brouillon(s, p.facture)
    return `${b.texte}\nUne relance ne se garde qu'à partir du ${dateFr(relancableLe(s, b.echeance))}, premier rappel après l'échéance.\nGarder ce brouillon au journal ?`
  },
  executer: (s, identite, p, maintenant) => {
    const b = brouillon(s, p.facture)
    const le = relancableLe(s, b.echeance)
    if (Temporal.PlainDate.compare(maintenant.toPlainDate(), le) < 0) {
      throw new Error(
        `${b.facture.id} : son échéance est le ${date(b.echeance)} ; rien n'est gardé, une relance se garde à partir du ${dateFr(le)}.`,
      )
    }
    s.journal.ecrire(
      [
        {
          type: TYPE_BROUILLON,
          client: s.config.client,
          objet: b.facture.id,
          issue: `niveau ${b.niveau}`,
          motif: b.texte,
          donnees: { facture: b.facture.id, niveau: b.niveau, par: moi(identite) },
        },
      ],
      maintenant.toInstant().toString(),
    )
    return {
      texte: `Brouillon gardé au journal pour ${b.facture.id} (niveau ${b.niveau}). Il n'est pas envoyé : l'envoi au client attend le oui du dirigeant.`,
      donnees: { facture: b.facture.id, niveau: b.niveau },
    }
  },
}

/** Les huit gestes de l'agence web, dans l'ordre où le modèle les lit. */
export const ACTIONS: Action<Session, unknown>[] = [
  etatProjet,
  facturesEnRetard,
  mesTickets,
  monTemps,
  disponibilites,
  domainesExpirant,
  declarerAbsence,
  brouillonRelance,
] as Action<Session, unknown>[]
