import { z } from 'zod'

// Le modèle canonique de la sécurité privée : ce que les contrôles lisent.
// Un connecteur (CSV, logiciel du client) le remplit ; il ne dépend d'aucun.
// Un champ absent est une donnée inconnue, jamais une valeur par défaut
// (G-02) : le contrôle qui en a besoin rend « à vérifier ».

/**
 * Les activités au titre desquelles une carte professionnelle est délivrée :
 * les formations spécifiques de l'arrêté du 01/09/2025, art. 4 (tronc commun
 * exclu). `texte` sans ✓ : l'arrêté qui « définit les spécialités » au sens de
 * R612-14, 2° n'est pas identifié (`verification-2026-10-05.md`, point 2).
 */
export const ACTIVITES = [
  'surveillance-humaine',
  'telesurveillance',
  'avec-arme',
  'cynophile',
  'detection-explosifs-cynophile',
  'videoprotection',
  'surveillance-renforcee',
  'transport-de-fonds',
  'protection-physique',
  'protection-physique-armee',
] as const
export const Activite = z.enum(ACTIVITES)

/** Le nom d'une activité tel que le lit le client, dans les mots d'I-02. */
export const NOMS_ACTIVITES: Record<(typeof ACTIVITES)[number], string> = {
  'surveillance-humaine': 'surveillance humaine ou gardiennage',
  telesurveillance: 'télésurveillance',
  'avec-arme': 'surveillance avec arme',
  cynophile: 'surveillance avec chien',
  'detection-explosifs-cynophile': "détection d'explosifs avec chien",
  videoprotection: 'vidéoprotection',
  'surveillance-renforcee': 'surveillance renforcée',
  'transport-de-fonds': 'transport de fonds',
  'protection-physique': 'protection physique des personnes',
  'protection-physique-armee': 'protection physique des personnes, armée',
}

const DateIso = z.iso.date()
/** Une heure murale de Paris : `2026-10-05T21:00`. */
const HeureMurale = z.iso.datetime({ local: true })
const NiveauSsiap = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const ValiditeIso = z.object({ du: DateIso, au: DateIso.optional() })

export const Agent = z.object({
  id: z.string(),
  nom: z.string(),
  cartePro: z
    .object({
      activites: z.array(Activite).min(1),
      /** Les périodes de validité successives (R612-13 : 5 ans). */
      validites: z.array(ValiditeIso).min(1),
    })
    .optional(),
  /** Le récépissé d'une demande de renouvellement complète, ouvert jusqu'à la décision (R612-17). */
  recepisse: ValiditeIso.optional(),
  /**
   * Le dernier stage MAC suivi (maintien et actualisation des compétences) :
   * son attestation accompagne la demande de renouvellement (R612-17).
   */
  mac: DateIso.optional(),
  /** La carte professionnelle propre à l'entreprise (R612-18). */
  carteEntrepriseRemise: z.boolean().optional(),
  ssiap: z
    .object({
      niveau: NiveauSsiap,
      diplome: DateIso,
      recyclages: z.array(DateIso).default([]),
      heuresActivite36Mois: z.number().nonnegative().optional(),
      /**
       * Les établissements où l'agent a fait ses doublures. Présente, la liste
       * fait foi (un site absent = jamais fait) ; absente, on ne sait pas.
       */
      etablissementsTenus: z.array(z.string()).optional(),
    })
    .optional(),
  secourisme: z
    .object({ qualification: DateIso, recyclages: z.array(DateIso).default([]) })
    .optional(),
  habilitationElectrique: ValiditeIso.optional(),
  /** Déclaré et tenu à jour dans Dracar Ultimate (R631-15). */
  declareDracar: z.boolean().optional(),
})

export const Poste = z
  .object({
    id: z.string(),
    /** Le site, c'est-à-dire l'établissement au sens de l'arrêté SSIAP. */
    site: z.string(),
    /** L'activité de sécurité privée du poste ; absente pour un poste purement SSIAP. */
    activite: Activite.optional(),
    /** Le niveau SSIAP requis par le poste. */
    ssiap: NiveauSsiap.optional(),
  })
  .refine((p) => p.activite !== undefined || p.ssiap !== undefined, {
    message: 'un poste porte une activité, un niveau SSIAP, ou les deux',
  })

export const Vacation = z.object({
  id: z.string(),
  agent: z.string(),
  poste: z.string(),
  debut: HeureMurale,
  fin: HeureMurale,
  /** Service de jour ou de nuit, tel que le planning du client le qualifie (CCN 7.01). */
  nature: z.enum(['jour', 'nuit']).optional(),
  doublure: z.boolean().default(false),
})

export const Planning = z
  .object({
    agents: z.array(Agent),
    postes: z.array(Poste),
    vacations: z.array(Vacation),
  })
  .superRefine((p, ctx) => {
    const agents = new Set(p.agents.map((a) => a.id))
    const postes = new Set(p.postes.map((x) => x.id))
    for (const v of p.vacations) {
      if (!agents.has(v.agent))
        ctx.addIssue({ code: 'custom', message: `${v.id} : agent ${v.agent} inconnu` })
      if (!postes.has(v.poste))
        ctx.addIssue({ code: 'custom', message: `${v.id} : poste ${v.poste} inconnu` })
    }
  })

export type Activite = z.infer<typeof Activite>
export type Agent = z.infer<typeof Agent>
export type Poste = z.infer<typeof Poste>
export type Vacation = z.infer<typeof Vacation>
export type Planning = z.infer<typeof Planning>
