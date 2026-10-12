import { type Ecart, Temporal } from '@harnais/moteur'
import type { ConfigAgenceWeb } from './config'
import { type Acces, type Contexte, IDENTIFIANTS } from './modele'

// Les notions de l'agence web, définies une fois, au-dessus du modèle
// (PLAN-METIER-2.md § 2 et § 7.1) : le lot 3 les étend (§ 8, M12 : les
// écarts). Un contrôle, une échéance ou un geste ne recalcule jamais une
// notion : il la demande ici. Des fonctions pures sur le contexte.

/**
 * Les jours vendus d'un projet : ceux de ses lots, plus ceux de ses avenants
 * signés. Un lot sans jours vendus ne compte pas : on ne les devine pas.
 */
export function joursVendus(ctx: Contexte, projet: string): number {
  let jours = 0
  for (const l of ctx.lots.values()) if (l.projet === projet) jours += l.jours_vendus ?? 0
  for (const a of ctx.avenants.values()) {
    if (a.projet === projet && a.etat === 'signe') jours += a.jours ?? 0
  }
  return jours
}

export interface ConsommeVendu {
  projet: string
  vendus: number
  /** Les heures saisies sur le projet, en jours (heures / `seuils.heures_par_jour`). */
  consommes: number
  /** Consommé / vendu ; absent si rien n'est vendu (projet interne). */
  part?: number
  /** Le consommé de chaque personne, en jours, dans l'ordre du fichier des temps. */
  parPersonne: { personne: string; jours: number }[]
}

/** Le consommé et le vendu d'un projet, en jours, à la maille du projet (celle des temps). */
export function consommeVendu(ctx: Contexte, projet: string, heuresParJour: number): ConsommeVendu {
  if (!(heuresParJour > 0)) throw new Error(`heures par jour invalides : ${heuresParJour}`)
  const heures = new Map<string, number>()
  for (const t of ctx.temps) {
    if (t.projet === projet) heures.set(t.personne, (heures.get(t.personne) ?? 0) + t.heures)
  }
  const parPersonne = [...heures].map(([personne, h]) => ({ personne, jours: h / heuresParJour }))
  const consommes = parPersonne.reduce((s, p) => s + p.jours, 0)
  const vendus = joursVendus(ctx, projet)
  return vendus > 0
    ? { projet, vendus, consommes, part: consommes / vendus, parPersonne }
    : { projet, vendus, consommes, parPersonne }
}

/**
 * Le périmètre recetté : les lots qui ont une recette et un PV signé, que
 * l'information vienne de `lots.csv` ou de `recettes.csv`. Un bug ne se
 * traite comme tel que sur ce périmètre (I-05).
 */
export function perimetreRecette(ctx: Contexte): Set<string> {
  const lots = new Set<string>()
  for (const l of ctx.lots.values()) {
    if (l.recette_le !== undefined && l.pv_signe_le !== undefined) lots.add(l.id)
  }
  for (const r of ctx.recettes) if (r.pv_signe_le !== undefined) lots.add(r.lot)
  return lots
}

/**
 * Les projets d'une ressource du registre des accès : le projet d'un dépôt ;
 * pour l'administration ou l'hébergement d'un site, les projets du client du
 * domaine. Un compte de registrar ou un service tiers n'en a pas.
 */
export function projetsDeRessource(ctx: Contexte, acces: Acces): string[] {
  if (acces.sorte === 'depot') {
    const depot = ctx.depots.get(acces.ressource)
    return depot ? [depot.projet] : []
  }
  if (acces.sorte === 'admin_site' || acces.sorte === 'hebergeur') {
    const domaine = [...ctx.domaines.values()].find((d) => d.nom === acces.ressource)
    if (domaine?.client === undefined) return []
    return [...ctx.projets.values()].filter((p) => p.client === domaine.client).map((p) => p.id)
  }
  return []
}

export type MotifRevocation = 'personne_partie' | 'sous_traitant_projet_clos'

/**
 * Les accès qui devraient être révoqués et ne le sont pas (I-04) : celui
 * d'une personne partie (ni dans `personnes.csv` ni dans
 * `sous_traitants.csv`), celui d'un sous-traitant dont tous les projets de la
 * ressource sont clos.
 */
export function accesARevoquer(ctx: Contexte): { acces: Acces; motif: MotifRevocation }[] {
  const resultat: { acces: Acces; motif: MotifRevocation }[] = []
  for (const a of ctx.acces) {
    if (a.revoque_le !== undefined) continue
    if (!ctx.personnes.has(a.personne) && !ctx.sous_traitants.has(a.personne)) {
      resultat.push({ acces: a, motif: 'personne_partie' })
      continue
    }
    if (!a.personne.startsWith('ST-')) continue
    const projets = projetsDeRessource(ctx, a)
    if (projets.length > 0 && projets.every((p) => ctx.projets.get(p)?.etat === 'clos')) {
      resultat.push({ acces: a, motif: 'sous_traitant_projet_clos' })
    }
  }
  return resultat
}

export type MotifRevocationDue = 'personne_partie' | 'projet_clos'

/**
 * Les accès qu'I-04 dit révoqués et qui ne le sont pas, à la lettre (lot 2b,
 * PLAN-METIER-2.md § 7.4) : « un accès est révoqué au départ d'une personne
 * ou à la fin du projet », pour une personne de l'agence comme pour un
 * sous-traitant. `accesARevoquer` (lot 2a) ne garde des projets clos que les
 * sous-traitants ; cette lecture-ci est celle du contrôle. Un projet est fini
 * quand il est `clos` ; une ressource sans projet (registrar, service tiers)
 * ne se ferme qu'au départ de la personne.
 */
export function revocationsDues(
  ctx: Contexte,
): { acces: Acces; motif: MotifRevocationDue; projets: string[] }[] {
  const resultat: { acces: Acces; motif: MotifRevocationDue; projets: string[] }[] = []
  for (const a of ctx.acces) {
    if (a.revoque_le !== undefined) continue
    const projets = projetsDeRessource(ctx, a)
    if (!ctx.personnes.has(a.personne) && !ctx.sous_traitants.has(a.personne)) {
      resultat.push({ acces: a, motif: 'personne_partie', projets })
    } else if (projets.length > 0 && projets.every((p) => ctx.projets.get(p)?.etat === 'clos')) {
      resultat.push({ acces: a, motif: 'projet_clos', projets })
    }
  }
  return resultat
}

/** Le domaine du registre qui porte ce nom, s'il y en a un. */
export const domaineNomme = (ctx: Contexte, nom: string) =>
  [...ctx.domaines.values()].find((d) => d.nom === nom)

export interface RecetteDuLot {
  /** La date de recette, de `lots.csv` à défaut de `recettes.csv` (la plus récente). */
  recette_le?: string
  /** La signature du PV, de `lots.csv` à défaut de `recettes.csv`. */
  pv_signe_le?: string
  /** Une réserve bloquante empêche la facture ; absente des données : `undefined`. */
  bloquante?: boolean
  reserves?: string
}

/**
 * La recette d'un lot et son PV, d'où qu'ils viennent : `lots.csv` porte les
 * dates, `recettes.csv` les dates et les réserves (I-01). Les deux tables se
 * complètent ; aucune date n'est devinée.
 */
export function recetteDuLot(ctx: Contexte, lot: string): RecetteDuLot {
  const l = ctx.lots.get(lot)
  const lignes = ctx.recettes
    .filter((r) => r.lot === lot)
    .sort((a, b) => a.date.localeCompare(b.date))
  const derniere = lignes.at(-1)
  const recette_le = l?.recette_le ?? derniere?.date
  const pv_signe_le = l?.pv_signe_le ?? lignes.find((r) => r.pv_signe_le)?.pv_signe_le
  return {
    ...(recette_le ? { recette_le } : {}),
    ...(pv_signe_le ? { pv_signe_le } : {}),
    ...(derniere?.bloquante !== undefined ? { bloquante: derniere.bloquante } : {}),
    ...(derniere?.reserves ? { reserves: derniere.reserves } : {}),
  }
}

export interface MiseEnProduction {
  projet: string
  date: string
  /** Le dépôt d'où elle vient ; absent pour la première mise en prod, lue dans `projets.csv`. */
  depot?: string
}

/**
 * Les mises en production connues, une par projet et par jour : la première
 * (`projets.mise_en_prod_le`) et la dernière de chaque dépôt
 * (`depots.derniere_mise_en_prod_le`). Les exports les datent au jour.
 */
export function misesEnProduction(ctx: Contexte): MiseEnProduction[] {
  const vues = new Map<string, MiseEnProduction>()
  for (const p of ctx.projets.values()) {
    if (p.mise_en_prod_le) {
      vues.set(`${p.id}/${p.mise_en_prod_le}`, { projet: p.id, date: p.mise_en_prod_le })
    }
  }
  for (const d of ctx.depots.values()) {
    const date = d.derniere_mise_en_prod_le
    if (date && !vues.has(`${d.projet}/${date}`)) {
      vues.set(`${d.projet}/${date}`, { projet: d.projet, date, depot: d.nom })
    }
  }
  return [...vues.values()]
}

/** Les heures saisies sur un contrat TMA pendant un mois. */
export function heuresTma(ctx: Contexte, contrat: string, mois: Temporal.PlainYearMonth): number {
  if (!ctx.contrats_tma.has(contrat)) throw new Error(`contrat ${contrat} inconnu`)
  return ctx.temps
    .filter(
      (t) =>
        t.projet === contrat && Temporal.PlainDate.from(t.date).toPlainYearMonth().equals(mois),
    )
    .reduce((s, t) => s + t.heures, 0)
}

// ---------------------------------------------------------------------------
// Rapprocher (PLAN-METIER-2.md M12, § 8 ; entretien § 36) : le consommé contre
// le vendu, par projet, par lot, par contrat TMA dans le mois ; le facturé
// contre le vendu. Les seuils sont ceux du client (`config.yaml: seuils`).

/** Les seuils du client (`config.yaml: seuils`). */
type Seuils = ConfigAgenceWeb['seuils']

/** Un identifiant de lot cité dans un texte libre, tiré du motif de `IDENTIFIANTS` (jamais recopié). */
const LOT_CITE = new RegExp(`\\b${IDENTIFIANTS.lot.source.replace(/^\^|\$$/g, '')}\\b`, 'gi')

export interface ConsommeLot {
  lot: string
  projet: string
  /** Les jours vendus du lot ; 0 s'ils sont inconnus (un avenant porte un projet, jamais un lot). */
  vendus: number
  /** Les heures dont le commentaire cite ce lot, en jours. */
  consommes: number
}

/**
 * Le consommé par lot, là où le temps le dit (la maille de Notion est le
 * projet) : une ligne de temps dont le commentaire cite un seul lot, et un
 * lot de son projet, lui est comptée ; une ligne qui n'en cite aucun, en cite
 * plusieurs ou cite celui d'un autre projet ne compte qu'au projet. Rendus
 * dans l'ordre de `lots.csv`, sans les lots qu'aucune ligne ne cite.
 */
export function consommeParLot(ctx: Contexte, heuresParJour: number): ConsommeLot[] {
  if (!(heuresParJour > 0)) throw new Error(`heures par jour invalides : ${heuresParJour}`)
  const heures = new Map<string, number>()
  for (const t of ctx.temps) {
    const cites = new Set((t.commentaire?.match(LOT_CITE) ?? []).map((l) => l.toUpperCase()))
    const [lot] = cites
    if (cites.size !== 1 || lot === undefined || ctx.lots.get(lot)?.projet !== t.projet) continue
    heures.set(lot, (heures.get(lot) ?? 0) + t.heures)
  }
  return [...ctx.lots.values()].flatMap((l) => {
    const h = heures.get(l.id)
    if (h === undefined) return []
    return [
      { lot: l.id, projet: l.projet, vendus: l.jours_vendus ?? 0, consommes: h / heuresParJour },
    ]
  })
}

export interface FactureVendu {
  projet: string
  /** Ses devis signés et ses avenants signés, en euros HT. */
  vendus: number
  /** Ses factures, émises ou payées, hors TMA, en euros HT. */
  factures: number
}

/**
 * Le facturé et le vendu d'un projet, en euros HT. Vendu : ses devis signés,
 * plus ses avenants signés (un devis envoyé, refusé ou expiré ne vend rien).
 * Facturé : ses factures, émises comme payées ; le modèle n'a ni avoir ni
 * facture annulée (`ETATS_FACTURE`), un avoir s'y écrirait en montant négatif
 * et se retrancherait. La TMA n'est pas du vendu du projet : le modèle ne
 * relie pas une facture à un contrat, et une facture sans lot d'un projet
 * sous contrat TMA, datée du début du contrat ou après, est tenue pour celle
 * de la TMA (un acompte précède le contrat, un lot porte son lot).
 */
export function factureVendu(ctx: Contexte, projet: string): FactureVendu {
  const signes = [...ctx.devis.values(), ...ctx.avenants.values()].filter(
    (d) => d.projet === projet && d.etat === 'signe',
  )
  const tma = [...ctx.contrats_tma.values()].filter((c) => c.projet === projet)
  const deLaTma = (date: string, lot: string | undefined) =>
    lot === undefined && tma.some((c) => c.debut <= date)
  const factures = [...ctx.factures.values()].filter(
    (f) => f.projet === projet && !deLaTma(f.date, f.lot),
  )
  return {
    projet,
    vendus: signes.reduce((s, d) => s + d.montant_ht_eur, 0),
    factures: factures.reduce((s, f) => s + f.montant_ht_eur, 0),
  }
}

/** Ce que rapproche chaque sorte d'écart : la section du rapport les regroupe par ces mots. */
export const MESURES = {
  forfait: 'jours consommés / vendus, par forfait',
  lot: 'jours consommés / vendus, par lot de forfait',
  tma: 'heures consommées dans le mois / incluses, par contrat TMA',
  facture: 'euros HT facturés / vendus, par projet (le consommé est le facturé)',
} as const

/** L'écart d'un forfait, à la maille du projet, au seuil donné : `forfait_alerte` pour prévenir, `forfait_refus` pour I-12. */
export function ecartForfait(
  ctx: Contexte,
  projet: string,
  heuresParJour: number,
  seuil: number,
): Ecart {
  const c = consommeVendu(ctx, projet, heuresParJour)
  return {
    objet: projet,
    mesure: MESURES.forfait,
    consomme: c.consommes,
    vendu: c.vendus,
    unite: 'jours',
    seuil,
  }
}

/**
 * Tous les écarts de l'agence au jour dit, chacun à son seuil ; `depasse`
 * (moteur) dit lesquels prévenir. Les forfaits (`forfait_alerte`) et leurs
 * lots dont le temps est cité (une régie se facture au réel : son vendu n'est
 * pas une limite) ; chaque contrat TMA sur le mois d'`aujourdhui`
 * (`tma_alerte`) ; le facturé de chaque projet (`facture_alerte`).
 */
export function ecarts(ctx: Contexte, seuils: Seuils, aujourdhui: Temporal.PlainDate): Ecart[] {
  const forfaits = [...ctx.projets.values()].filter((p) => p.type === 'forfait')
  const auForfait = new Set(forfaits.map((p) => p.id))
  const mois = aujourdhui.toPlainYearMonth()
  return [
    ...forfaits.map((p) => ecartForfait(ctx, p.id, seuils.heures_par_jour, seuils.forfait_alerte)),
    ...consommeParLot(ctx, seuils.heures_par_jour)
      .filter((l) => auForfait.has(l.projet))
      .map(
        (l): Ecart => ({
          objet: `${l.projet}/${l.lot}`,
          mesure: MESURES.lot,
          consomme: l.consommes,
          vendu: l.vendus,
          unite: 'jours',
          seuil: seuils.forfait_alerte,
        }),
      ),
    ...[...ctx.contrats_tma.values()].map(
      (c): Ecart => ({
        objet: `${c.id}/${mois.toString()}`,
        mesure: MESURES.tma,
        consomme: heuresTma(ctx, c.id, mois),
        vendu: c.heures_incluses_mois,
        unite: 'heures',
        seuil: seuils.tma_alerte,
      }),
    ),
    ...[...ctx.projets.values()].map((p): Ecart => {
      const f = factureVendu(ctx, p.id)
      return {
        objet: p.id,
        mesure: MESURES.facture,
        consomme: f.factures,
        vendu: f.vendus,
        unite: 'euros',
        seuil: seuils.facture_alerte,
      }
    }),
  ]
}
