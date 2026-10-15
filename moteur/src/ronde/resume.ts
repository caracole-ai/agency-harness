import { VALIDEE } from '../approbation/jeton'
import type { Role } from '../conversation/actions'
import { TYPE_CONSIGNE, TYPE_PRECISION_ATTENDUE } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { CONTROLE_OK, MOTIFS_ABANDON } from '../echappee/boucle'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import { fuites, masquerConsigne } from '../echappee/pseudonymes'
import type { Journal, Ligne } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import { FUSEAU, Temporal } from '../temps/temporal'

// Le résumé du journal pour la ronde de nuit, fait en code, sans modèle
// (PLAN-RONDE.md § 5.1, R2) : ce qui a été demandé et comment ça a fini,
// jamais une donnée. Une demande nouvelle se montre par sa consigne version
// modèle (`consigne_modele`, PLAN-PSEUDONYMES.md S5), où un identifiant tient
// lieu de nom ; une échappée qui ne l'a pas (d'avant les pseudonymes) est
// comptée, pas montrée. Un geste se montre par son identifiant et ses
// paramètres, sans valeur de personne ni texte libre. Ni instantané, ni
// résultat de requête, ni texte montré, ni texte libre d'un modèle, ni nom.

/** Ce qu'une demande est devenue. */
export type Devenue =
  | {
      sorte: 'geste'
      geste: string
      /** Chaque paramètre : une date, un nombre, ou `<personne>`, `<texte>`, `<valeur>`. */
      parametres: Record<string, string>
      /** Le geste a refusé (paramètres, droits, règle) : le motif n'est pas montré. */
      refuse?: true
    }
  | {
      sorte: 'demande_nouvelle'
      echappee: string
      intention: string
      fin: 'reponse' | 'proposition' | 'abandon'
      /** `reponse` : le résumé du modèle a passé le contrôle, ou il a été retiré. */
      controle?: 'ok' | 'retiré'
      /** `proposition` : la suite que le demandeur lui a donnée. */
      suite?: string
      /** `abandon` : le motif, par catégorie (jamais le texte du modèle). */
      abandon?: string
      tours: number
      cout_usd: number
    }
  | { sorte: 'je_ne_sais_pas' }
  | { sorte: 'refus' }

export interface DemandeResumee {
  /** AAAA-MM-JJ, heure de Paris. */
  jour: string
  role: Role
  /** La consigne telle que le modèle l'a lue, un identifiant à la place d'un nom ; absente pour un geste. */
  consigne?: string
  devenue: Devenue
  /** Les « vous parlez de qui ? » posés dans la même conversation. */
  precisions: number
}

export interface ComptesRonde {
  jours: number
  /** Les échappées par intention, et comment elles ont fini. */
  par_intention: {
    intention: string
    echappees: number
    reponses_ok: number
    propositions_validees: number
    abandons: number
  }[]
  par_geste: { geste: string; fois: number; refus: number }[]
  abandons_par_motif: { motif: string; fois: number }[]
  je_ne_sais_pas: number
  refus: number
  precisions: number
  plafond: { mois: string; usd: number; plafond_usd: number }
}

export interface Resume {
  fenetre: { du: string; au: string }
  demandes: DemandeResumee[]
  /** Les conversations de la fenêtre. */
  conversations: number
  /** Les demandes de la fenêtre comptées sans être montrées (échappée sans `consigne_modele`, consigne ambiguë). */
  non_montrees: number
  comptes: ComptesRonde
}

/** La catégorie d'un motif d'abandon : un motif du code, ou « le modèle a abandonné ». */
export const MOTIF_DU_MODELE = 'le modèle a abandonné'
export function categorieAbandon(motif: unknown): string {
  if (typeof motif !== 'string') return MOTIF_DU_MODELE
  return Object.values(MOTIFS_ABANDON).find((m) => motif.startsWith(m)) ?? MOTIF_DU_MODELE
}

const donnees = (l: Ligne): Record<string, unknown> => {
  if (!l.donnees) return {}
  const d: unknown = JSON.parse(l.donnees)
  return typeof d === 'object' && d !== null && !Array.isArray(d)
    ? (d as Record<string, unknown>)
    : {}
}

/** Le jour d'un horodatage, heure de Paris. */
/** Le statut d'une proposition écrite dans les données (remplacement, réaffectation). */
export const ECRITE = 'écrite'
export const SUITE_NON_VALIDEE = 'non validée'

/** La suite donnée à la proposition d'une conversation : lue sur les objets (`R-…`) qui la citent. */
export function suiteDe(lignes: Ligne[], conversation: string): string {
  const objets = new Set(
    lignes
      .filter((l) => l.objet !== null && donnees(l).conversation === conversation)
      .map((l) => l.objet),
  )
  const issues = lignes.filter((l) => objets.has(l.objet)).map((l) => l.issue)
  if (issues.includes(ECRITE)) return ECRITE
  if (issues.includes(VALIDEE)) return VALIDEE
  return SUITE_NON_VALIDEE
}

export const jourDe = (horodatage: string) =>
  Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU).toPlainDate()

const dans = (l: Ligne, du: Temporal.PlainDate, au: Temporal.PlainDate) => {
  const j = jourDe(l.horodatage)
  return Temporal.PlainDate.compare(j, du) >= 0 && Temporal.PlainDate.compare(j, au) <= 0
}

/** Le résumé ne connaît pas le métier : un rôle est une chaîne non vide (PLAN-METIER-2.md M1). */
const estRole = (r: unknown): r is Role => typeof r === 'string' && r.length > 0

/** Une date, une heure, un nombre : rien d'autre ne passe tel quel. */
const SUR = /^[0-9][0-9:T\-/ .,+Z]*$/

/** La valeur d'un paramètre de geste, telle que la ronde peut la lire. */
function valeur(v: unknown, personnes: Designable[]): string {
  if (v === null) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v !== 'string') return '<valeur>'
  if (personnes.some((p) => p.id === v) || fuites(v, personnes).length > 0) return '<personne>'
  return SUR.test(v) ? v : '<texte>'
}

const roleDe = (d: Record<string, unknown>): Role | undefined => {
  const identite = d.identite as { role?: unknown } | undefined
  return estRole(identite?.role) ? identite.role : estRole(d.role) ? d.role : undefined
}

/**
 * Le résumé d'une fenêtre de jours (`du` et `au` inclus, heure de Paris), et
 * les comptes sur `comptes.jours` jours finissant à `au`. Une ligne après `au`
 * n'est jamais lue.
 */
export function resumerJournal(
  journal: Journal,
  fenetre: { du: Temporal.PlainDate; au: Temporal.PlainDate },
  personnes: Designable[],
  comptes: { jours: number; plafondMoisUsd: number },
): Resume {
  const toutes = journal.lire()
  const debutComptes = fenetre.au.subtract({ days: comptes.jours - 1 })
  const lignes = toutes.filter((l) => dans(l, debutComptes, fenetre.au))

  const precisionsPar = new Map<string, number>()
  for (const l of lignes) {
    if (l.type === TYPE_PRECISION_ATTENDUE && l.objet !== null) {
      precisionsPar.set(l.objet, (precisionsPar.get(l.objet) ?? 0) + 1)
    }
  }

  /** Chaque demande des 30 jours, avec son jour ; `montrable` : dans la fenêtre et sans rien d'interdit. */
  const vues: { demande: DemandeResumee; ligne: Ligne; montree: boolean }[] = []
  for (const l of lignes) {
    const d = donnees(l)
    const role = roleDe(d)
    if (role === undefined) continue
    const base = {
      jour: jourDe(l.horodatage).toString(),
      role,
      precisions: l.objet !== null ? (precisionsPar.get(l.objet) ?? 0) : 0,
    }
    let demande: DemandeResumee | undefined
    let montree = true
    if (
      l.type === TYPE_ECHAPPEE &&
      typeof d.echappee === 'string' &&
      typeof d.intention === 'string'
    ) {
      const fin = l.issue
      if (fin !== 'reponse' && fin !== 'proposition' && fin !== 'abandon') continue
      const devenue: Devenue = {
        sorte: 'demande_nouvelle',
        echappee: d.echappee,
        intention: d.intention,
        fin,
        ...(fin === 'reponse'
          ? {
              controle:
                d.controle_reponse === undefined || d.controle_reponse === CONTROLE_OK
                  ? ('ok' as const)
                  : ('retiré' as const),
            }
          : {}),
        ...(fin === 'proposition' && l.objet !== null ? { suite: suiteDe(toutes, l.objet) } : {}),
        ...(fin === 'abandon' ? { abandon: categorieAbandon(d.abandon) } : {}),
        tours: typeof d.tours === 'number' ? d.tours : 0,
        cout_usd: typeof d.cout_usd === 'number' ? d.cout_usd : 0,
      }
      const consigne = typeof d.consigne_modele === 'string' ? d.consigne_modele : undefined
      montree = consigne !== undefined && fuites(consigne, personnes).length === 0
      demande = { ...base, ...(montree && consigne ? { consigne } : {}), devenue }
    } else if (l.type === TYPE_CONSIGNE) {
      const demandee = d.demande as
        | { sorte?: unknown; action?: unknown; params?: unknown }
        | undefined
      if (demandee?.sorte === 'action' && typeof demandee.action === 'string') {
        // Une question « vous parlez de qui ? » a suivi : le geste se compte à la réponse.
        if (d.params === undefined && d.erreur === undefined) continue
        const params = (d.params ?? demandee.params ?? {}) as Record<string, unknown>
        demande = {
          ...base,
          devenue: {
            sorte: 'geste',
            geste: demandee.action,
            parametres: Object.fromEntries(
              Object.entries(params).map(([k, v]) => [k, valeur(v, personnes)]),
            ),
            ...(d.erreur !== undefined ? { refuse: true as const } : {}),
          },
        }
      } else if (l.issue === 'inconnue') {
        // La consigne masquée comme l'échappée la masquerait ; ambiguë, elle n'est pas montrée.
        const masquee = masquerConsigne(l.motif ?? '', personnes)
        montree = masquee.precision === undefined && fuites(masquee.texte, personnes).length === 0
        demande = {
          ...base,
          ...(montree ? { consigne: masquee.texte } : {}),
          devenue: { sorte: 'je_ne_sais_pas' },
        }
      } else if (l.issue === 'refus') {
        demande = { ...base, devenue: { sorte: 'refus' } }
      }
    }
    if (demande) vues.push({ demande, ligne: l, montree })
  }

  const fenetreVues = vues.filter((v) => dans(v.ligne, fenetre.du, fenetre.au))
  const nonMontrees = fenetreVues.filter((v) => !v.montree).length
  const conversations = new Set(
    lignes
      .filter((l) => dans(l, fenetre.du, fenetre.au) && l.type === TYPE_CONSIGNE)
      .map((l) => l.objet),
  ).size

  const parIntention = new Map<string, ComptesRonde['par_intention'][number]>()
  const parGeste = new Map<string, ComptesRonde['par_geste'][number]>()
  const abandons = new Map<string, number>()
  let jnsp = 0
  let refus = 0
  for (const { demande } of vues) {
    const dv = demande.devenue
    if (dv.sorte === 'demande_nouvelle') {
      const c = parIntention.get(dv.intention) ?? {
        intention: dv.intention,
        echappees: 0,
        reponses_ok: 0,
        propositions_validees: 0,
        abandons: 0,
      }
      c.echappees++
      if (dv.fin === 'reponse' && dv.controle === 'ok') c.reponses_ok++
      if (dv.fin === 'proposition' && dv.suite !== undefined && dv.suite !== 'non validée') {
        c.propositions_validees++
      }
      if (dv.fin === 'abandon') {
        c.abandons++
        const motif = dv.abandon ?? MOTIF_DU_MODELE
        abandons.set(motif, (abandons.get(motif) ?? 0) + 1)
      }
      parIntention.set(dv.intention, c)
    } else if (dv.sorte === 'geste') {
      const c = parGeste.get(dv.geste) ?? { geste: dv.geste, fois: 0, refus: 0 }
      c.fois++
      if (dv.refuse) c.refus++
      parGeste.set(dv.geste, c)
    } else if (dv.sorte === 'je_ne_sais_pas') {
      jnsp++
    } else {
      refus++
    }
  }
  const mois = fenetre.au.toPlainYearMonth().toString()
  const parNombre = <T extends { fois?: number; echappees?: number }>(a: T, b: T) =>
    (b.fois ?? b.echappees ?? 0) - (a.fois ?? a.echappees ?? 0)

  return {
    fenetre: { du: fenetre.du.toString(), au: fenetre.au.toString() },
    demandes: fenetreVues.map((v) => v.demande),
    conversations,
    non_montrees: nonMontrees,
    comptes: {
      jours: comptes.jours,
      par_intention: [...parIntention.values()].sort(parNombre),
      par_geste: [...parGeste.values()].sort(parNombre),
      abandons_par_motif: [...abandons].map(([motif, fois]) => ({ motif, fois })),
      je_ne_sais_pas: jnsp,
      refus,
      precisions: [...precisionsPar.values()].reduce((a, b) => a + b, 0),
      plafond: {
        mois,
        // Le coût du mois jusqu'à `au` inclus : une ligne d'après n'est pas lue.
        usd:
          Math.round(
            toutes
              .filter(
                (l) =>
                  l.type === TYPE_APPEL &&
                  jourDe(l.horodatage).toPlainYearMonth().toString() === mois &&
                  Temporal.PlainDate.compare(jourDe(l.horodatage), fenetre.au) <= 0,
              )
              .reduce((somme, l) => {
                const c = donnees(l).cout_usd
                return somme + (typeof c === 'number' ? c : 0)
              }, 0) * 1_000_000,
          ) / 1_000_000,
        plafond_usd: comptes.plafondMoisUsd,
      },
    },
  }
}

/** L'état d'une intention du catalogue vis-à-vis de la promotion (PLAN-RONDE.md § 0.b, R3). */
export const PROMOTION_EN_COURS = 'promotion en cours'
export const A_L_ATELIER = "à coder à l'atelier"

/** Ce que la ronde sait du catalogue (R2) : des identifiants et des descriptions, aucune donnée. */
export interface Catalogue {
  gestes: { id: string; description: string; ecrit: boolean; roles: Role[] }[]
  appris: { id: string; description: string; ecrit: boolean; statut: string }[]
  intentions: {
    id: string
    description: string
    ecrit: boolean
    /** `promotion en cours` (au seuil, sans échec de fabrication), ou `à coder à l'atelier`. */
    promotion?: typeof PROMOTION_EN_COURS | typeof A_L_ATELIER
    /** Un geste appris actif porte cette intention. */
    geste_actif?: true
  }[]
  /** Les missions déjà écrites par une ronde, dans `rondes/<date>/` du client. */
  missions_ouvertes: {
    id: string
    sorte: string
    date: string
    statut: string
    intentions: string[]
  }[]
}
