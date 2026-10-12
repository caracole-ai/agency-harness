import { describe, expect, it } from 'vitest'
import { colonnes, contexte, NOMS_TABLES, type Tables } from './modele'

// Le modèle porte les colonnes exactes de PLAN-METIER-2.md § 7.2, recopiées
// ici telles que le plan les écrit : un écart est un écart au plan.

const PLAN: Record<string, string> = {
  personnes: 'id;nom;role;tjm_vente_eur;cout_journalier_eur;entree_le',
  clients: 'id;nom;secteur;nda;contrat_art28;bon_de_commande_obligatoire;portail_fournisseur',
  contacts: 'id;client;nom;fonction',
  projets: 'id;client;nom;type;etat;debut;fin_prevue;mise_en_prod_le;garantie_fin;po',
  lots: 'id;projet;nom;jours_vendus;montant_ht_eur;recette_le;pv_signe_le',
  devis:
    'id;client;projet;date;montant_ht_eur;jours;etat;signataire;remise;clause_cession;envoye_le;signe_le',
  avenants: 'id;devis;projet;date;montant_ht_eur;jours;etat;signataire;motif',
  tickets:
    'cle;projet;lot;contrat_tma;resume;type;etat;assigne;estimation_h;cree_le;resolu_le;rattache_a',
  temps: 'personne;projet;date;heures;commentaire',
  factures:
    'id;client;projet;lot;date;montant_ht_eur;tva;montant_ttc_eur;echeance;delai_jours;fin_de_mois;etat;payee_le;penalites_mentionnees;indemnite_40_mentionnee',
  paiements: 'facture;date;montant_eur',
  relances: 'facture;date;niveau;par',
  contrats_tma: 'id;client;projet;heures_incluses_mois;montant_ht_mois_eur;debut;fin;preavis_jours',
  recettes: 'projet;lot;date;pv_signe_le;reserves;bloquante',
  acces: 'ressource;sorte;personne;depuis;jusqua;revoque_le',
  depots: 'nom;projet;collaborateurs;derniere_mise_en_prod_le;par',
  sauvegardes: 'projet;date;par',
  domaines: 'id;nom;client;registrar;expire_le;certificat_expire_le',
  sous_traitants: 'id;nom;montant_annuel_ht_eur;attestation_urssaf_le',
  versions: 'projet;composant;version;fin_de_support_le',
}

const vides = (): Tables => Object.fromEntries(NOMS_TABLES.map((t) => [t, []])) as unknown as Tables

describe('modèle', () => {
  it('les vingt tables du plan, colonnes exactes et dans leur ordre', () => {
    expect(NOMS_TABLES).toEqual(Object.keys(PLAN))
    for (const t of NOMS_TABLES) expect(colonnes(t).join(';'), t).toBe(PLAN[t])
  })

  it('un identifiant en double arrête la lecture', () => {
    const t = vides()
    const client = {
      id: 'CLI-01',
      nom: 'x',
      secteur: undefined,
      nda: undefined,
      contrat_art28: undefined,
      bon_de_commande_obligatoire: undefined,
      portail_fournisseur: undefined,
    }
    t.clients = [client, client]
    expect(() => contexte(t)).toThrow(/clients : identifiant CLI-01 en double/)
  })

  it('un renvoi vers un projet inconnu arrête la lecture', () => {
    const t = vides()
    t.sauvegardes = [{ projet: 'PRJ-99', date: '2026-10-01', par: undefined }]
    expect(() => contexte(t)).toThrow(/sauvegardes : projet PRJ-99 inconnu/)
  })
})
