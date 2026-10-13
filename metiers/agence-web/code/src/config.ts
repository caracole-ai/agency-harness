import { ConversationSchema, DureeSchema, FenetreSchema, PolitiqueSchema } from '@harnais/moteur'
import { z } from 'zod'

// La config d'un client de l'agence web (PLAN-METIER-2.md § 7.1, M12, M13) :
// où sont ses exports, ses seuils, quand prévenir de chaque échéance. Elle vit
// ici plutôt que dans `veille.ts` pour que la veille, la copie et les gestes
// du lot 2b la lisent sans dépendre l'un de l'autre.

/** Le nom du métier, tel que `config.yaml: metier` l'écrit. */
export const METIER = 'agence-web'

/** Une fraction positive : `0.9` pour 90 %. */
const Fraction = z.number().positive()

export const ConfigAgenceWeb = z.strictObject({
  client: z.string().min(1),
  metier: z.literal(METIER),
  politique: PolitiqueSchema.optional(),
  /** Le fichier de chaque table du § 7.2, relatif au dossier du client. */
  donnees: z.strictObject({
    personnes: z.string(),
    clients: z.string(),
    contacts: z.string(),
    projets: z.string(),
    lots: z.string(),
    devis: z.string(),
    avenants: z.string(),
    tickets: z.string(),
    temps: z.string(),
    factures: z.string(),
    paiements: z.string(),
    relances: z.string(),
    contrats_tma: z.string(),
    recettes: z.string(),
    acces: z.string(),
    depots: z.string(),
    sauvegardes: z.string(),
    domaines: z.string(),
    sous_traitants: z.string(),
    versions: z.string(),
  }),
  journal: z.string(),
  seuils: z.strictObject({
    /** La part des jours vendus d'un forfait à partir de laquelle on prévient (`0.9`). */
    forfait_alerte: Fraction,
    /** La part au-delà de laquelle le dépassement est un écart à I-12 (`1.1`). */
    forfait_refus: Fraction,
    /** La part des heures incluses d'un contrat TMA, dans le mois, à partir de laquelle on prévient. */
    tma_alerte: Fraction,
    /**
     * La part du vendu d'un projet (devis et avenants signés, en euros HT)
     * au-delà de laquelle le facturé est un écart (`veille.ts`, `sectionEcarts`).
     */
    facture_alerte: Fraction,
    /** Le plafond d'engagement de la PO en l'absence du dirigeant, en euros HT (I-11). */
    delegation_eur_ht: z.number().positive(),
    /** La remise au-delà de laquelle seul le dirigeant engage (I-11). */
    remise_max: Fraction,
    /**
     * Les heures d'un jour : le temps se saisit en heures, les devis se
     * vendent en jours. Une valeur du client, jamais une constante.
     */
    heures_par_jour: z.number().positive(),
  }),
  /** La conversation avec l'outil (PLAN-ESPACES.md) ; absente, `pnpm parler` refuse de démarrer. */
  conversation: ConversationSchema.optional(),
  veiller: z.strictObject({
    echeances: z.strictObject({
      facture_echeance: FenetreSchema,
      fin_garantie: FenetreSchema,
      fin_tma: FenetreSchema,
      domaine: FenetreSchema,
      certificat: FenetreSchema,
      fin_support: FenetreSchema,
      attestation_urssaf: FenetreSchema,
      pv_non_signe: FenetreSchema,
      devis_sans_reponse: FenetreSchema,
    }),
    /** Les délais de la maison qui font la limite d'une échéance (entretien § 8, § 39). */
    delais: z.strictObject({
      /** Le premier rappel d'une facture impayée, après son échéance (J+1). */
      relance_facture: DureeSchema,
      /** La relance d'un PV non signé, après la recette (J+15). */
      pv_non_signe: DureeSchema,
      /** La première relance d'un devis sans réponse, après l'envoi (J+10). */
      devis_sans_reponse: DureeSchema,
    }),
  }),
})
export type ConfigAgenceWeb = z.infer<typeof ConfigAgenceWeb>
