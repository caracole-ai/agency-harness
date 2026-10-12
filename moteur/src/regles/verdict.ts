import type { Interdit, Lecture } from './schema'

/** Les trois verdicts d'un contrôle (`presentation/`, § 05). Seul le code rend `refus`. */
export const VERDICTS = ['ok', 'à vérifier', 'refus'] as const
export type Verdict = (typeof VERDICTS)[number]

const rang = (v: Verdict) => VERDICTS.indexOf(v)
export const plusGrave = (a: Verdict, b: Verdict): Verdict => (rang(a) >= rang(b) ? a : b)
export const moinsGrave = (a: Verdict, b: Verdict): Verdict => (rang(a) <= rang(b) ? a : b)

/** Ce qu'un contrôle constate sur un objet (exemple : une vacation, un agent…). */
export interface Constat {
  regle: string
  objet: string
  verdict: Verdict
  motif: string
  /** Ce que disent les autres textes quand ils concluent autrement que la référence. */
  notes?: string[]
}

export function lectureDeReference(interdit: Interdit): Lecture {
  const reference = interdit.lectures?.find((l) => l.reference)
  if (!reference) throw new Error(`${interdit.id} : aucune lecture de référence`)
  return reference
}

/**
 * Une règle ⚠ se lit de plusieurs façons. La lecture de référence décide
 * seule du verdict ; celles qui concluent autrement sont rendues pour être
 * signalées en note, sans changer le verdict.
 */
export function selonReference(
  interdit: Interdit,
  parLecture: Record<string, Verdict>,
): { verdict: Verdict; divergentes: { lecture: Lecture; verdict: Verdict }[] } {
  const reference = lectureDeReference(interdit)
  const verdict = parLecture[reference.id]
  if (verdict === undefined)
    throw new Error(`${interdit.id} : la lecture de référence n'a pas été évaluée`)
  const divergentes = (interdit.lectures ?? [])
    .filter((l) => l.id !== reference.id)
    .flatMap((lecture) => {
      const v = parLecture[lecture.id]
      if (v === undefined)
        throw new Error(`${interdit.id} : la lecture ${lecture.id} n'a pas été évaluée`)
      return v === verdict ? [] : [{ lecture, verdict: v }]
    })
  return { verdict, divergentes }
}

/** Les paramètres d'une lecture : les communs de l'interdit, surchargés par ceux de la lecture. */
export function parametresDe(interdit: Interdit, lecture?: Lecture): Record<string, unknown> {
  return { ...interdit.parametres, ...lecture?.parametres }
}

/**
 * Le verdict le plus grave qu'une règle peut rendre, d'après son statut
 * (`GRILLE.md` § Statuts) : seul un texte relu mot à mot, ou une règle
 * constatée chez le client, peut refuser. Une hypothèse ne devient jamais un
 * contrôle. Une règle ⚠ sans lectures déclarées ne refuse pas.
 *
 * L'âge d'une relecture n'entre pas ici : la veille des textes est l'affaire
 * de l'ingénieur du harnais, pas du client (`veille.ts`). Un client ne voit
 * jamais un doute né d'une relecture en retard.
 */
export function plafond(interdit: Interdit): Verdict {
  switch (interdit.statut) {
    case 'hypothèse':
      throw new Error(`${interdit.id} est une hypothèse : une question à poser, pas un contrôle`)
    case 'constaté':
    case 'confirmé':
      return 'refus'
    case 'déclaré':
      return 'à vérifier'
    case 'texte': {
      if (!interdit.relu) return 'à vérifier'
      if (interdit.avertissement && !interdit.lectures) return 'à vérifier'
      return 'refus'
    }
  }
}
