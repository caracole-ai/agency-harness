import { z } from 'zod'

/** Statuts d'un fait (`GRILLE.md` § Statuts). */
export const STATUTS = ['texte', 'déclaré', 'constaté', 'confirmé', 'hypothèse'] as const

/** Moments du harnais où un contrôle s'attache (`REFLEXIONS.md`, piste A). */
export const MOMENTS = ['pre-tool', 'post-tool', 'pre-response', 'stop'] as const

/** Levée d'un interdit (`REFLEXIONS.md`, piste B). Sans mention : jamais. */
export const LEVEE_PAR_DEFAUT = 'jamais'

const DateIso = z.iso.date()

/**
 * Le statut d'une ligne de fiche, découpé pour que le moteur le lise :
 * `relu` (la date de la relecture mot à mot, le ✓) et `avertissement` (le ⚠)
 * décident du verdict maximal d'un contrôle. `suite` est la précision libre,
 * rendue telle quelle dans la fiche.
 */
const qualification = {
  statut: z.enum(STATUTS),
  relu: DateIso.optional(),
  avertissement: z.string().optional(),
  suite: z.string().optional(),
}

const reluSeulementSurTexte = (q: { statut: string; relu?: string | undefined }) =>
  q.relu === undefined || q.statut === 'texte'
const MESSAGE_RELU = 'seule une ligne `texte` peut être relue à la source (✓)'

/**
 * Une lecture d'une règle ⚠ : un texte en vigueur et les paramètres qu'il
 * fixe. Une seule est la référence, qui décide du verdict (par défaut la loi
 * générale) ; les autres sont signalées en note quand elles concluent
 * autrement. La config client pourra désigner une autre référence : c'est sa
 * politique, recueillie au premier rendez-vous (décision du 2026-10-05).
 */
export const Lecture = z.object({
  id: z.string(),
  source: z.string(),
  reference: z.boolean().optional(),
  parametres: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
})

export const Interdit = z
  .object({
    id: z.string().regex(/^I-\d{2}$/),
    interdit: z.string(),
    etapes: z.array(z.string()).min(1),
    consequence: z.string(),
    verifiable_par: z.string(),
    ...qualification,
    source: z.string(),
    moment: z.enum(MOMENTS).optional(),
    levee: z.string().default(LEVEE_PAR_DEFAUT),
    /** Paramètres communs à toutes les lectures ; une lecture les surcharge. */
    parametres: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    lectures: z.array(Lecture).min(2).optional(),
  })
  .refine(reluSeulementSurTexte, MESSAGE_RELU)
  .refine((i) => !i.lectures || i.lectures.filter((l) => l.reference).length === 1, {
    message: 'des lectures déclarées en portent exactement une de référence (`reference: true`)',
  })

export const Escalade = z
  .object({
    id: z.string().regex(/^E-\d{2}$/),
    declencheur: z.string(),
    etapes: z.array(z.string()).min(1),
    qui: z.string(),
    delai: z.string(),
    presentation: z.string(),
    ...qualification,
  })
  .refine(reluSeulementSurTexte, MESSAGE_RELU)

export const Scenario = z
  .object({
    id: z.string().regex(/^T-\d{2}[a-z]?$/),
    etant_donne: z.string(),
    quand: z.string(),
    alors: z.string(),
    interdits: z.array(z.string().regex(/^I-\d{2}$/)).min(1),
    ...qualification,
    source: z.string(),
    /** Les données du cas, rejouables ; leur forme est celle du métier, qui les valide. */
    cas: z.unknown().optional(),
    /** Pourquoi ce scénario ne se rejoue pas encore, quand il couvre un interdit codé. */
    cas_absent: z.string().optional(),
  })
  .refine(reluSeulementSurTexte, MESSAGE_RELU)

export const Regles = z.object({
  interdits: z.array(Interdit),
  escalades: z.array(Escalade),
})

export type Interdit = z.infer<typeof Interdit>
export type Escalade = z.infer<typeof Escalade>
export type Scenario = z.infer<typeof Scenario>
export type Lecture = z.infer<typeof Lecture>

/** Le registre d'un métier : ce qui fait foi pour les rubriques 1, 2 et 4 de sa fiche. */
export interface Registre {
  interdits: Interdit[]
  escalades: Escalade[]
  scenarios: Scenario[]
}
