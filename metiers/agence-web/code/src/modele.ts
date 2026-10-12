import { z } from 'zod'

// Le modèle canonique de l'agence web (PLAN-METIER-2.md § 7.1 et § 7.2) : ce
// que les contrôles, les échéances et les gestes lisent. Un zod par table, sur
// les cellules telles qu'un export CSV les donne (des chaînes), qui rend des
// lignes typées : les clés sont les colonnes exactes du § 7.2, dans leur
// ordre, et l'ordre des clés est celui des colonnes du fichier.
// Une cellule vide est une donnée inconnue, jamais une valeur par défaut
// (G-02) : le contrôle qui en a besoin rend « à vérifier ».

/** Les rôles de l'agence (M3) : la colonne `role` de `personnes.csv` porte exactement ces mots. */
export const ROLES = ['dirigeant', 'commercial', 'po', 'graphiste', 'developpeur'] as const
export const TYPES_PROJET = ['forfait', 'regie', 'interne'] as const
export const ETATS_PROJET = ['cadrage', 'en_cours', 'recette', 'livre', 'garantie', 'clos'] as const
/** Les états d'un devis, et d'un avenant (un devis complémentaire). */
export const ETATS_DEVIS = ['brouillon', 'envoye', 'signe', 'refuse', 'expire'] as const
/** Un type vide est une cellule vide : le ticket n'est pas qualifié. */
export const TYPES_TICKET = ['bug', 'evolution', 'tache'] as const
export const ETATS_TICKET = ['a_faire', 'en_cours', 'en_revue', 'resolu'] as const
export const ETATS_FACTURE = ['emise', 'payee'] as const
export const SORTES_ACCES = ['depot', 'hebergeur', 'registrar', 'admin_site', 'tiers'] as const
export const NIVEAUX_RELANCE = ['1', '2', '3'] as const

/** Les identifiants de l'agence (M17). Jamais `D-`, `E-`, `T-`, `O-`, `R-`, `A-`, `V-`. */
export const IDENTIFIANTS = {
  personne: /^M-\d{2}$/,
  client: /^CLI-\d{2}$/,
  contact: /^CT-\d{2}$/,
  projet: /^PRJ-\d{2}$/,
  lot: /^LOT-\d{3}$/,
  devis: /^DEV-\d{4}-\d{3}$/,
  avenant: /^AVE-\d{4}-\d{3}$/,
  facture: /^FAC-\d{4}-\d{3}$/,
  ticket: /^TK-\d{4}$/,
  contrat_tma: /^TMA-\d{2}$/,
  sous_traitant: /^ST-\d{2}$/,
  domaine: /^DOM-\d{2}$/,
} as const

const motif = (...r: RegExp[]) => new RegExp(r.map((x) => `(${x.source})`).join('|'))
/** Qui agit : une personne de l'agence, ou un sous-traitant. */
const INTERVENANT = motif(IDENTIFIANTS.personne, IDENTIFIANTS.sous_traitant)
/** Ce sur quoi on saisit du temps : un projet, ou un contrat TMA (la maille de Notion). */
const IMPUTATION = motif(IDENTIFIANTS.projet, IDENTIFIANTS.contrat_tma)
/** Ce qui couvre le travail d'un ticket : un lot vendu, un avenant, un contrat TMA. */
const COUVERTURE = motif(IDENTIFIANTS.lot, IDENTIFIANTS.avenant, IDENTIFIANTS.contrat_tma)

const vide = (v: string) => (v === '' ? undefined : v)

/** Une cellule obligatoire ; vide, la ligne est illisible. */
const Texte = z.string().min(1)
const Id = (r: RegExp) => z.string().regex(r)
const Enum = <T extends readonly [string, ...string[]]>(valeurs: T) => z.enum(valeurs)
const DateIso = z.iso.date()
/** Un nombre écrit avec un point décimal : `12.5`. */
const Nombre = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .transform(Number)
/** Des euros : un nombre à deux décimales au plus (M11). */
const Euros = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/)
  .transform(Number)
const OuiNon = z.enum(['oui', 'non']).transform((v) => v === 'oui')
/** Des identifiants séparés par « , » dans une cellule. */
const Liste = (r: RegExp) =>
  z
    .string()
    .transform((v) => v.split(',').map((x) => x.trim()))
    .pipe(z.array(z.string().regex(r)).min(1))

/** Une cellule qui peut être vide : vide, elle vaut `undefined`. */
const facultatif = <S extends z.ZodType<unknown, string>>(schema: S) =>
  z.string().transform(vide).pipe(schema.optional())

export const Personne = z.strictObject({
  id: Id(IDENTIFIANTS.personne),
  nom: Texte,
  role: Enum(ROLES),
  tjm_vente_eur: facultatif(Euros),
  cout_journalier_eur: facultatif(Euros),
  entree_le: facultatif(DateIso),
})

export const Client = z.strictObject({
  id: Id(IDENTIFIANTS.client),
  nom: Texte,
  secteur: facultatif(Texte),
  nda: facultatif(OuiNon),
  contrat_art28: facultatif(OuiNon),
  bon_de_commande_obligatoire: facultatif(OuiNon),
  portail_fournisseur: facultatif(OuiNon),
})

export const Contact = z.strictObject({
  id: Id(IDENTIFIANTS.contact),
  client: Id(IDENTIFIANTS.client),
  nom: Texte,
  fonction: facultatif(Texte),
})

export const Projet = z.strictObject({
  id: Id(IDENTIFIANTS.projet),
  /** Vide pour un projet interne. */
  client: facultatif(Id(IDENTIFIANTS.client)),
  nom: Texte,
  type: Enum(TYPES_PROJET),
  etat: Enum(ETATS_PROJET),
  debut: facultatif(DateIso),
  fin_prevue: facultatif(DateIso),
  mise_en_prod_le: facultatif(DateIso),
  garantie_fin: facultatif(DateIso),
  po: facultatif(Id(IDENTIFIANTS.personne)),
})

export const Lot = z.strictObject({
  id: Id(IDENTIFIANTS.lot),
  projet: Id(IDENTIFIANTS.projet),
  nom: Texte,
  jours_vendus: facultatif(Nombre),
  montant_ht_eur: facultatif(Euros),
  recette_le: facultatif(DateIso),
  pv_signe_le: facultatif(DateIso),
})

export const Devis = z.strictObject({
  id: Id(IDENTIFIANTS.devis),
  client: Id(IDENTIFIANTS.client),
  /** Vide tant qu'aucun projet n'est né du devis. */
  projet: facultatif(Id(IDENTIFIANTS.projet)),
  date: DateIso,
  montant_ht_eur: Euros,
  jours: facultatif(Nombre),
  etat: Enum(ETATS_DEVIS),
  signataire: facultatif(Id(IDENTIFIANTS.personne)),
  /** Une fraction : `0.1` pour 10 %. */
  remise: facultatif(Nombre),
  clause_cession: facultatif(OuiNon),
  envoye_le: facultatif(DateIso),
  signe_le: facultatif(DateIso),
})

export const Avenant = z.strictObject({
  id: Id(IDENTIFIANTS.avenant),
  devis: Id(IDENTIFIANTS.devis),
  projet: Id(IDENTIFIANTS.projet),
  date: DateIso,
  montant_ht_eur: Euros,
  jours: facultatif(Nombre),
  etat: Enum(ETATS_DEVIS),
  signataire: facultatif(Id(IDENTIFIANTS.personne)),
  motif: facultatif(Texte),
})

export const Ticket = z.strictObject({
  cle: Id(IDENTIFIANTS.ticket),
  /** Vide pour un ticket de TMA dont le site n'est pas un projet de l'export. */
  projet: facultatif(Id(IDENTIFIANTS.projet)),
  lot: facultatif(Id(IDENTIFIANTS.lot)),
  contrat_tma: facultatif(Id(IDENTIFIANTS.contrat_tma)),
  resume: Texte,
  type: facultatif(Enum(TYPES_TICKET)),
  etat: Enum(ETATS_TICKET),
  assigne: facultatif(Id(INTERVENANT)),
  estimation_h: facultatif(Nombre),
  cree_le: DateIso,
  resolu_le: facultatif(DateIso),
  rattache_a: facultatif(Id(COUVERTURE)),
})

/** Une ligne de temps : la maille de Notion, par projet (ou contrat TMA), jamais par ticket. */
export const Temps = z.strictObject({
  personne: Id(IDENTIFIANTS.personne),
  projet: Id(IMPUTATION),
  date: DateIso,
  heures: Nombre,
  commentaire: facultatif(Texte),
})

export const Facture = z.strictObject({
  id: Id(IDENTIFIANTS.facture),
  client: Id(IDENTIFIANTS.client),
  projet: facultatif(Id(IDENTIFIANTS.projet)),
  lot: facultatif(Id(IDENTIFIANTS.lot)),
  date: DateIso,
  montant_ht_eur: Euros,
  /** Le taux : `0.2` pour 20 %. */
  tva: Nombre,
  montant_ttc_eur: Euros,
  echeance: facultatif(DateIso),
  delai_jours: facultatif(Nombre),
  fin_de_mois: facultatif(OuiNon),
  etat: Enum(ETATS_FACTURE),
  payee_le: facultatif(DateIso),
  penalites_mentionnees: facultatif(OuiNon),
  indemnite_40_mentionnee: facultatif(OuiNon),
})

export const Paiement = z.strictObject({
  facture: Id(IDENTIFIANTS.facture),
  date: DateIso,
  montant_eur: Euros,
})

export const Relance = z.strictObject({
  facture: Id(IDENTIFIANTS.facture),
  date: DateIso,
  niveau: Enum(NIVEAUX_RELANCE).transform(Number),
  par: facultatif(Id(IDENTIFIANTS.personne)),
})

export const ContratTma = z.strictObject({
  id: Id(IDENTIFIANTS.contrat_tma),
  client: Id(IDENTIFIANTS.client),
  /** Vide pour un site que l'agence n'a pas construit dans la période de l'export. */
  projet: facultatif(Id(IDENTIFIANTS.projet)),
  heures_incluses_mois: Nombre,
  montant_ht_mois_eur: Euros,
  debut: DateIso,
  fin: facultatif(DateIso),
  preavis_jours: facultatif(Nombre),
})

export const Recette = z.strictObject({
  projet: Id(IDENTIFIANTS.projet),
  lot: Id(IDENTIFIANTS.lot),
  date: DateIso,
  pv_signe_le: facultatif(DateIso),
  reserves: facultatif(Texte),
  bloquante: facultatif(OuiNon),
})

/** Une ligne du registre des accès. `ressource` : le nom d'un dépôt, d'un domaine, d'un compte. */
export const Acces = z.strictObject({
  ressource: Texte,
  sorte: Enum(SORTES_ACCES),
  personne: Id(INTERVENANT),
  depuis: facultatif(DateIso),
  jusqua: facultatif(DateIso),
  revoque_le: facultatif(DateIso),
})

export const Depot = z.strictObject({
  nom: Texte,
  projet: Id(IDENTIFIANTS.projet),
  collaborateurs: facultatif(Liste(INTERVENANT)),
  derniere_mise_en_prod_le: facultatif(DateIso),
  par: facultatif(Id(INTERVENANT)),
})

export const Sauvegarde = z.strictObject({
  projet: Id(IDENTIFIANTS.projet),
  date: DateIso,
  par: facultatif(Id(INTERVENANT)),
})

export const Domaine = z.strictObject({
  id: Id(IDENTIFIANTS.domaine),
  nom: Texte,
  client: facultatif(Id(IDENTIFIANTS.client)),
  registrar: facultatif(Texte),
  expire_le: facultatif(DateIso),
  certificat_expire_le: facultatif(DateIso),
})

export const SousTraitant = z.strictObject({
  id: Id(IDENTIFIANTS.sous_traitant),
  nom: Texte,
  montant_annuel_ht_eur: facultatif(Euros),
  attestation_urssaf_le: facultatif(DateIso),
})

/** Fournie par le client, jamais devinée. */
export const Version = z.strictObject({
  projet: Id(IDENTIFIANTS.projet),
  composant: Texte,
  version: Texte,
  fin_de_support_le: facultatif(DateIso),
})

/** Les tables du § 7.2 : le nom de chacune est la clé de `donnees` dans la config et le nom de son fichier d'exemple. */
export const TABLES = {
  personnes: Personne,
  clients: Client,
  contacts: Contact,
  projets: Projet,
  lots: Lot,
  devis: Devis,
  avenants: Avenant,
  tickets: Ticket,
  temps: Temps,
  factures: Facture,
  paiements: Paiement,
  relances: Relance,
  contrats_tma: ContratTma,
  recettes: Recette,
  acces: Acces,
  depots: Depot,
  sauvegardes: Sauvegarde,
  domaines: Domaine,
  sous_traitants: SousTraitant,
  versions: Version,
} as const
export type Table = keyof typeof TABLES
export const NOMS_TABLES = Object.keys(TABLES) as Table[]

/** Les colonnes exactes d'une table, dans l'ordre du fichier. */
export const colonnes = (t: Table): string[] => Object.keys(TABLES[t].shape)

export type Personne = z.output<typeof Personne>
export type Client = z.output<typeof Client>
export type Contact = z.output<typeof Contact>
export type Projet = z.output<typeof Projet>
export type Lot = z.output<typeof Lot>
export type Devis = z.output<typeof Devis>
export type Avenant = z.output<typeof Avenant>
export type Ticket = z.output<typeof Ticket>
export type Temps = z.output<typeof Temps>
export type Facture = z.output<typeof Facture>
export type Paiement = z.output<typeof Paiement>
export type Relance = z.output<typeof Relance>
export type ContratTma = z.output<typeof ContratTma>
export type Recette = z.output<typeof Recette>
export type Acces = z.output<typeof Acces>
export type Depot = z.output<typeof Depot>
export type Sauvegarde = z.output<typeof Sauvegarde>
export type Domaine = z.output<typeof Domaine>
export type SousTraitant = z.output<typeof SousTraitant>
export type Version = z.output<typeof Version>

/** Les lignes de chaque table, dans l'ordre du fichier. */
export type Tables = { [T in Table]: z.output<(typeof TABLES)[T]>[] }

/**
 * Les données d'un client, indexées par identifiant là où la table en a un
 * (`tickets` par `cle`, `depots` par `nom`) ; les autres tables restent des
 * listes. Une `Map` garde l'ordre du fichier.
 */
export interface Contexte {
  personnes: Map<string, Personne>
  clients: Map<string, Client>
  contacts: Map<string, Contact>
  projets: Map<string, Projet>
  lots: Map<string, Lot>
  devis: Map<string, Devis>
  avenants: Map<string, Avenant>
  tickets: Map<string, Ticket>
  temps: Temps[]
  factures: Map<string, Facture>
  paiements: Paiement[]
  relances: Relance[]
  contrats_tma: Map<string, ContratTma>
  recettes: Recette[]
  acces: Acces[]
  depots: Map<string, Depot>
  sauvegardes: Sauvegarde[]
  domaines: Map<string, Domaine>
  sous_traitants: Map<string, SousTraitant>
  versions: Version[]
}

function indexer<T>(table: string, lignes: T[], cle: (x: T) => string): Map<string, T> {
  const m = new Map<string, T>()
  for (const l of lignes) {
    const id = cle(l)
    if (m.has(id)) throw new Error(`${table} : identifiant ${id} en double`)
    m.set(id, l)
  }
  return m
}

/**
 * Indexe les tables et vérifie les renvois entre elles : un projet, un lot, un
 * client, un contrat, une facture cités existent. Les renvois vers une
 * personne ne sont pas vérifiés : le registre des accès cite aussi des
 * personnes parties, et c'est ce qu'on y cherche.
 */
export function contexte(t: Tables): Contexte {
  const ctx: Contexte = {
    personnes: indexer('personnes', t.personnes, (x) => x.id),
    clients: indexer('clients', t.clients, (x) => x.id),
    contacts: indexer('contacts', t.contacts, (x) => x.id),
    projets: indexer('projets', t.projets, (x) => x.id),
    lots: indexer('lots', t.lots, (x) => x.id),
    devis: indexer('devis', t.devis, (x) => x.id),
    avenants: indexer('avenants', t.avenants, (x) => x.id),
    tickets: indexer('tickets', t.tickets, (x) => x.cle),
    temps: t.temps,
    factures: indexer('factures', t.factures, (x) => x.id),
    paiements: t.paiements,
    relances: t.relances,
    contrats_tma: indexer('contrats_tma', t.contrats_tma, (x) => x.id),
    recettes: t.recettes,
    acces: t.acces,
    depots: indexer('depots', t.depots, (x) => x.nom),
    sauvegardes: t.sauvegardes,
    domaines: indexer('domaines', t.domaines, (x) => x.id),
    sous_traitants: indexer('sous_traitants', t.sous_traitants, (x) => x.id),
    versions: t.versions,
  }
  const erreurs: string[] = []
  const renvoi = (
    ou: string,
    id: string | undefined,
    table: Map<string, unknown>,
    quoi: string,
  ) => {
    if (id !== undefined && !table.has(id)) erreurs.push(`${ou} : ${quoi} ${id} inconnu`)
  }
  for (const x of t.contacts) renvoi(`contacts ${x.id}`, x.client, ctx.clients, 'client')
  for (const x of t.projets) renvoi(`projets ${x.id}`, x.client, ctx.clients, 'client')
  for (const x of t.lots) renvoi(`lots ${x.id}`, x.projet, ctx.projets, 'projet')
  for (const x of t.devis) {
    renvoi(`devis ${x.id}`, x.client, ctx.clients, 'client')
    renvoi(`devis ${x.id}`, x.projet, ctx.projets, 'projet')
  }
  for (const x of t.avenants) {
    renvoi(`avenants ${x.id}`, x.devis, ctx.devis, 'devis')
    renvoi(`avenants ${x.id}`, x.projet, ctx.projets, 'projet')
  }
  for (const x of t.tickets) {
    renvoi(`tickets ${x.cle}`, x.projet, ctx.projets, 'projet')
    renvoi(`tickets ${x.cle}`, x.lot, ctx.lots, 'lot')
    renvoi(`tickets ${x.cle}`, x.contrat_tma, ctx.contrats_tma, 'contrat')
    if (x.rattache_a !== undefined && !ctx.lots.has(x.rattache_a)) {
      if (!ctx.avenants.has(x.rattache_a) && !ctx.contrats_tma.has(x.rattache_a))
        erreurs.push(`tickets ${x.cle} : rattaché à ${x.rattache_a}, inconnu`)
    }
  }
  for (const x of t.temps) {
    if (!ctx.projets.has(x.projet) && !ctx.contrats_tma.has(x.projet))
      erreurs.push(`temps ${x.personne} ${x.date} : ${x.projet} inconnu`)
  }
  for (const x of t.factures) {
    renvoi(`factures ${x.id}`, x.client, ctx.clients, 'client')
    renvoi(`factures ${x.id}`, x.projet, ctx.projets, 'projet')
    renvoi(`factures ${x.id}`, x.lot, ctx.lots, 'lot')
  }
  for (const x of t.paiements) renvoi('paiements', x.facture, ctx.factures, 'facture')
  for (const x of t.relances) renvoi('relances', x.facture, ctx.factures, 'facture')
  for (const x of t.contrats_tma) {
    renvoi(`contrats_tma ${x.id}`, x.client, ctx.clients, 'client')
    renvoi(`contrats_tma ${x.id}`, x.projet, ctx.projets, 'projet')
  }
  for (const x of t.recettes) {
    renvoi('recettes', x.projet, ctx.projets, 'projet')
    renvoi('recettes', x.lot, ctx.lots, 'lot')
  }
  for (const x of t.depots) renvoi(`depots ${x.nom}`, x.projet, ctx.projets, 'projet')
  for (const x of t.sauvegardes) renvoi('sauvegardes', x.projet, ctx.projets, 'projet')
  for (const x of t.domaines) renvoi(`domaines ${x.id}`, x.client, ctx.clients, 'client')
  for (const x of t.versions) renvoi('versions', x.projet, ctx.projets, 'projet')
  if (erreurs.length > 0)
    throw new Error(`renvois illisibles\n${erreurs.map((e) => `- ${e}`).join('\n')}`)
  return ctx
}
