import type { ColonneCopie, Identite, TableCopie } from '@harnais/moteur'
import type { Session } from './conversation'
import { colonnes, NOMS_TABLES, type Table, type Tables } from './modele'
import { vueDe } from './roles'

// Les tables de la copie de l'échappée, à l'échelle du rôle (PLAN-METIER-2.md
// § 7.4 ; entretien § 10) : trois niveaux de vue. Tout (`voit_tout`) : les
// vingt tables. Le commerce : clients, contacts, projets sans la PO, lots sans
// les jours, devis, avenants, factures, paiements, relances, contrats TMA,
// domaines ; jamais le temps, jamais une personne de l'agence (ni son coût,
// ni son TJM). Soi : ses tickets, son temps, les projets de ses tickets, ses
// accès, les dépôts de ces projets ; jamais un montant. C'est la copie qui ne
// contient que ses données, pas un filtre sur la requête (PLAN-ESPACES.md
// § 6.2, D4). Les colonnes qui portent un nom sont masquées par le moteur :
// l'identifiant tient lieu de nom (PLAN-PSEUDONYMES.md S2).

const INCONNU = '`null` = inconnu, rien n’est supposé.'

type Colonne = Omit<ColonneCopie, 'nom'>
const texte = (description: string): Colonne => ({ type: 'TEXT', description })
const reel = (description: string): Colonne => ({ type: 'REAL', description })
const euros = (description: string): Colonne => ({ type: 'REAL', description, decimales: 2 })
const date = (description: string) => texte(`${description}, AAAA-MM-JJ`)
const ouiNon = (description: string) => texte(`${description} : oui ou non`)
const nom = (description: string, masquee: string): Colonne => ({
  type: 'TEXT',
  description,
  masquee,
})

/** Chaque table et chacune de ses colonnes, décrites pour le modèle ; les clés sont exactement les colonnes du § 7.2. */
const DEFINITIONS: {
  [T in Table]: { description: string; colonnes: { [C in keyof Tables[T][number]]-?: Colonne } }
} = {
  personnes: {
    description: "les personnes de l'agence",
    colonnes: {
      id: texte("l'identifiant de la personne (M-01)"),
      nom: nom('prénom et nom', "l'identifiant de la personne, qui tient lieu de nom"),
      role: texte('dirigeant, commercial, po, graphiste ou developpeur'),
      tjm_vente_eur: euros('le TJM de vente, HT'),
      cout_journalier_eur: euros('le coût journalier, confidentiel'),
      entree_le: date("l'entrée dans l'agence"),
    },
  },
  clients: {
    description: "les clients de l'agence",
    colonnes: {
      id: texte("l'identifiant du client (CLI-01)"),
      nom: nom('le nom du client', "l'identifiant du client, qui tient lieu de nom"),
      secteur: texte("le secteur d'activité"),
      nda: ouiNon('un accord de confidentialité est signé'),
      contrat_art28: ouiNon('un contrat de sous-traitance RGPD (article 28) est signé'),
      bon_de_commande_obligatoire: ouiNon('le client exige un bon de commande avant facture'),
      portail_fournisseur: ouiNon('le client exige ses factures sur son portail fournisseur'),
    },
  },
  contacts: {
    description: 'les contacts chez les clients',
    colonnes: {
      id: texte("l'identifiant du contact (CT-01)"),
      client: texte('le client (clients.id)'),
      nom: nom('prénom et nom', "l'identifiant du contact, qui tient lieu de nom"),
      fonction: texte('sa fonction chez le client'),
    },
  },
  projets: {
    description: 'les projets : un devis signé et ce qui en découle, jusqu’à la garantie',
    colonnes: {
      id: texte("l'identifiant du projet (PRJ-01)"),
      client: texte('le client (clients.id) ; null pour un projet interne'),
      nom: texte('le nom du projet'),
      type: texte('forfait, regie ou interne'),
      etat: texte('cadrage, en_cours, recette, livre, garantie ou clos'),
      debut: date('le début'),
      fin_prevue: date('la fin prévue'),
      mise_en_prod_le: date('la mise en production'),
      garantie_fin: date('la fin de la garantie'),
      po: texte('la PO du projet (personnes.id)'),
    },
  },
  lots: {
    description: 'les lots : une partie du devis, facturable séparément',
    colonnes: {
      id: texte("l'identifiant du lot (LOT-001)"),
      projet: texte('le projet (projets.id)'),
      nom: texte('le nom du lot'),
      jours_vendus: reel('les jours vendus'),
      montant_ht_eur: euros('le montant HT'),
      recette_le: date('la recette'),
      pv_signe_le: date('la signature du PV de recette'),
    },
  },
  devis: {
    description: 'les devis',
    colonnes: {
      id: texte("l'identifiant du devis (DEV-2026-001)"),
      client: texte('le client (clients.id)'),
      projet: texte('le projet né du devis (projets.id)'),
      date: date('la date du devis'),
      montant_ht_eur: euros('le montant HT'),
      jours: reel('les jours vendus'),
      etat: texte('brouillon, envoye, signe, refuse ou expire'),
      signataire: texte('qui a signé pour l’agence (personnes.id)'),
      remise: reel('la remise, en fraction (0.1 pour 10 %)'),
      clause_cession: ouiNon('le devis porte la clause de cession des droits'),
      envoye_le: date("l'envoi"),
      signe_le: date('la signature'),
    },
  },
  avenants: {
    description: 'les avenants : un devis complémentaire signé, rattaché au projet',
    colonnes: {
      id: texte("l'identifiant de l'avenant (AVE-2026-001)"),
      devis: texte('le devis complété (devis.id)'),
      projet: texte('le projet (projets.id)'),
      date: date("la date de l'avenant"),
      montant_ht_eur: euros('le montant HT'),
      jours: reel('les jours vendus'),
      etat: texte('brouillon, envoye, signe, refuse ou expire'),
      signataire: texte('qui a signé pour l’agence (personnes.id)'),
      motif: texte('ce que l’avenant ajoute'),
    },
  },
  tickets: {
    description: 'les tickets : une unité de travail, rattachée à un lot ou à un contrat TMA',
    colonnes: {
      cle: texte('la clé du ticket (TK-0001)'),
      projet: texte('le projet (projets.id)'),
      lot: texte('le lot (lots.id)'),
      contrat_tma: texte('le contrat de maintenance (contrats_tma.id)'),
      resume: texte('le résumé'),
      type: texte('bug, evolution ou tache ; null quand le ticket n’est pas qualifié'),
      etat: texte('a_faire, en_cours, en_revue ou resolu'),
      assigne: texte('à qui il est assigné (personnes.id, ou un sous-traitant ST-)'),
      estimation_h: reel("l'estimation, en heures"),
      cree_le: date('la création'),
      resolu_le: date('la résolution'),
      rattache_a: texte(
        'ce qui couvre le travail : un lot (LOT-), un avenant (AVE-) ou un contrat (TMA-)',
      ),
    },
  },
  temps: {
    description:
      'le temps saisi : une ligne par personne, par projet (ou contrat TMA) et par jour, jamais par ticket',
    colonnes: {
      personne: texte('qui a saisi (personnes.id)'),
      projet: texte('le projet (projets.id) ou le contrat TMA (contrats_tma.id)'),
      date: date('le jour'),
      heures: reel('les heures saisies'),
      commentaire: texte('le commentaire libre'),
    },
  },
  factures: {
    description: 'les factures',
    colonnes: {
      id: texte("l'identifiant de la facture (FAC-2026-001)"),
      client: texte('le client (clients.id)'),
      projet: texte('le projet (projets.id)'),
      lot: texte('le lot facturé (lots.id)'),
      date: date("l'émission"),
      montant_ht_eur: euros('le montant HT'),
      tva: reel('le taux de TVA, en fraction (0.2 pour 20 %)'),
      montant_ttc_eur: euros('le montant TTC'),
      echeance: date("l'échéance"),
      delai_jours: reel('le délai de paiement, en jours'),
      fin_de_mois: ouiNon('le délai court jusqu’à la fin du mois'),
      etat: texte('emise ou payee'),
      payee_le: date('le paiement complet'),
      penalites_mentionnees: ouiNon('la facture mentionne les pénalités de retard'),
      indemnite_40_mentionnee: ouiNon(
        "la facture mentionne l'indemnité forfaitaire de recouvrement",
      ),
    },
  },
  paiements: {
    description: 'les paiements reçus',
    colonnes: {
      facture: texte('la facture payée (factures.id)'),
      date: date('la date du paiement'),
      montant_eur: euros('le montant reçu, TTC'),
    },
  },
  relances: {
    description: 'les relances des factures impayées',
    colonnes: {
      facture: texte('la facture relancée (factures.id)'),
      date: date('la date de la relance'),
      niveau: { type: 'INTEGER', description: 'le niveau : 1, 2 ou 3' },
      par: texte('qui a relancé (personnes.id)'),
    },
  },
  contrats_tma: {
    description: 'les contrats de maintenance (TMA) : des heures incluses chaque mois',
    colonnes: {
      id: texte("l'identifiant du contrat (TMA-01)"),
      client: texte('le client (clients.id)'),
      projet: texte('le projet maintenu (projets.id)'),
      heures_incluses_mois: reel('les heures incluses par mois'),
      montant_ht_mois_eur: euros('le montant HT par mois'),
      debut: date('le début'),
      fin: date('la fin'),
      preavis_jours: reel('le préavis, en jours'),
    },
  },
  recettes: {
    description: 'les recettes des lots par le client',
    colonnes: {
      projet: texte('le projet (projets.id)'),
      lot: texte('le lot (lots.id)'),
      date: date('la recette'),
      pv_signe_le: date('la signature du PV'),
      reserves: texte('les réserves du client'),
      bloquante: ouiNon('une réserve est bloquante'),
    },
  },
  acces: {
    description: 'le registre des accès : qui a accès à quelle ressource, depuis quand',
    colonnes: {
      ressource: texte('le dépôt (depots.nom), le domaine (domaines.nom) ou le compte'),
      sorte: texte('depot, hebergeur, registrar, admin_site ou tiers'),
      personne: texte('qui a l’accès (personnes.id, ou un sous-traitant ST-)'),
      depuis: date("le début de l'accès"),
      jusqua: date("la fin prévue de l'accès"),
      revoque_le: date('la révocation'),
    },
  },
  depots: {
    description: 'les dépôts de code',
    colonnes: {
      nom: texte('le nom du dépôt'),
      projet: texte('le projet (projets.id)'),
      collaborateurs: texte('qui y a accès (personnes.id ou ST-), séparés par « , »'),
      derniere_mise_en_prod_le: date('la dernière mise en production'),
      par: texte('qui l’a faite (personnes.id ou ST-)'),
    },
  },
  sauvegardes: {
    description: 'les sauvegardes faites avant une mise en production',
    colonnes: {
      projet: texte('le projet (projets.id)'),
      date: date('la sauvegarde'),
      par: texte('qui l’a faite (personnes.id ou ST-)'),
    },
  },
  domaines: {
    description: "les noms de domaine et les certificats gérés par l'agence",
    colonnes: {
      id: texte("l'identifiant du domaine (DOM-01)"),
      nom: nom('le nom de domaine', "l'identifiant du domaine, qui tient lieu de nom"),
      client: texte('le client (clients.id)'),
      registrar: texte('le registrar'),
      expire_le: date("l'expiration du domaine"),
      certificat_expire_le: date("l'expiration du certificat"),
    },
  },
  sous_traitants: {
    description: "les sous-traitants de l'agence",
    colonnes: {
      id: texte("l'identifiant du sous-traitant (ST-01)"),
      nom: nom('prénom et nom', "l'identifiant du sous-traitant, qui tient lieu de nom"),
      montant_annuel_ht_eur: euros("le montant payé dans l'année, HT"),
      attestation_urssaf_le: date("l'attestation de vigilance URSSAF"),
    },
  },
  versions: {
    description: 'les versions des composants des projets et leur fin de support',
    colonnes: {
      projet: texte('le projet (projets.id)'),
      composant: texte('le composant (cms, framework, langage serveur…)'),
      version: texte('la version'),
      fin_de_support_le: date('la fin de support'),
    },
  },
}

type Cellule = string | number | null

/** Une cellule de la copie : un oui/non en mots, une liste séparée par « , », inconnu en `null`. */
function cellule(v: unknown): Cellule {
  if (v === undefined || v === null) return null
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (Array.isArray(v)) return v.join(',')
  if (typeof v === 'number' || typeof v === 'string') return v
  throw new Error(`copie : cellule illisible (${typeof v})`)
}

/** Les lignes d'une table du contexte, dans l'ordre du fichier. */
function lignesDe<T extends Table>(s: Session, t: T): Tables[T] {
  const v = s.ctx[t]
  return (v instanceof Map ? [...v.values()] : v) as Tables[T]
}

/** Une table de la copie : ses colonnes (moins `sans`), ses lignes. */
function table<T extends Table>(t: T, lignes: Tables[T], sans: string[] = []): TableCopie {
  const def = DEFINITIONS[t]
  const noms = colonnes(t).filter((c) => !sans.includes(c))
  const decrites = def.colonnes as Record<string, Colonne>
  return {
    nom: t,
    description: `${def.description}. ${INCONNU}`,
    colonnes: noms.map((c) => {
      const d = decrites[c]
      if (!d) throw new Error(`copie : la colonne ${t}.${c} n'est pas décrite`)
      return { nom: c, ...d }
    }),
    lignes: lignes.map((l) => {
      const ligne = l as Record<string, unknown>
      return Object.fromEntries(noms.map((c) => [c, cellule(ligne[c])]))
    }),
  }
}

/** Les tables du commerce, et les colonnes qu'il ne voit pas (§ 7.4). */
const COMMERCE: { table: Table; sans?: string[] }[] = [
  { table: 'clients' },
  { table: 'contacts' },
  { table: 'projets', sans: ['po'] },
  { table: 'lots', sans: ['jours_vendus'] },
  { table: 'devis' },
  { table: 'avenants' },
  { table: 'factures' },
  { table: 'paiements' },
  { table: 'relances' },
  { table: 'contrats_tma' },
  { table: 'domaines' },
]

/** Les projets d'une personne : ceux de ses tickets. */
export function projetsDe(s: Session, personne: string): Set<string> {
  const projets = new Set<string>()
  for (const t of s.ctx.tickets.values()) {
    if (t.assigne === personne && t.projet !== undefined) projets.add(t.projet)
  }
  return projets
}

export function tablesPour(s: Session, identite: Identite): TableCopie[] {
  const vue = vueDe(identite)
  if (vue === 'tout') return NOMS_TABLES.map((t) => table(t, lignesDe(s, t)))
  if (vue === 'commerce') return COMMERCE.map((c) => table(c.table, lignesDe(s, c.table), c.sans))
  // Soi-même : sans identifiant, rien (échec fermé).
  const moi = identite.personne
  const siens = moi === undefined ? new Set<string>() : projetsDe(s, moi)
  return [
    table(
      'tickets',
      lignesDe(s, 'tickets').filter((t) => t.assigne === moi),
    ),
    table(
      'temps',
      lignesDe(s, 'temps').filter((t) => t.personne === moi),
    ),
    table(
      'projets',
      lignesDe(s, 'projets').filter((p) => siens.has(p.id)),
    ),
    table(
      'acces',
      lignesDe(s, 'acces').filter((a) => a.personne === moi),
    ),
    table(
      'depots',
      lignesDe(s, 'depots').filter((d) => siens.has(d.projet)),
    ),
  ]
}
