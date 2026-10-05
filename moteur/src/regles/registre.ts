import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { type Registre, Regles, Scenario } from './schema'

export const FICHIER_REGLES = 'regles.yaml'
export const DOSSIER_SCENARIOS = 'scenarios'

function lireYaml<T>(chemin: string, schema: z.ZodType<T>): T {
  const resultat = schema.safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!resultat.success) throw new Error(`${chemin}\n${z.prettifyError(resultat.error)}`)
  return resultat.data
}

/** Charge et valide le registre d'un métier (`metiers/<métier>/`). Lève à la première erreur de forme. */
export function chargerRegistre(dossierMetier: string): Registre {
  const regles = lireYaml(join(dossierMetier, FICHIER_REGLES), Regles)
  const dossier = join(dossierMetier, DOSSIER_SCENARIOS)
  const scenarios = readdirSync(dossier)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => {
      const s = lireYaml(join(dossier, f), Scenario)
      if (`${s.id}.yaml` !== f)
        throw new Error(
          `${join(dossier, f)} : l'identifiant ${s.id} ne correspond pas au nom du fichier`,
        )
      return s
    })
  return { ...regles, scenarios }
}

/** Les codes de règle cités dans un texte : I-01, E-02, T-06b, G-03, O-01, D-01, B-02. */
export const CODE_CITE = /\b([BDEGIOT])-(\d{2}[a-z]?)\b/g

export function codesCites(texte: string): string[] {
  return [...texte.matchAll(CODE_CITE)].map((m) => `${m[1]}-${m[2]}`)
}

/**
 * Les incohérences internes d'un registre, en phrases. Vide si tout tient :
 * identifiants uniques, chaque test couvre des interdits qui existent, chaque
 * interdit a au moins un test (`GRILLE.md` § 2), chaque code cité existe.
 */
export function incoherences(registre: Registre): string[] {
  const erreurs: string[] = []
  const ids = [...registre.interdits, ...registre.escalades, ...registre.scenarios].map((r) => r.id)
  const connus = new Set(ids)
  for (const id of connus) {
    if (ids.filter((x) => x === id).length > 1) erreurs.push(`${id} : identifiant en double`)
  }

  const couverts = new Set(registre.scenarios.flatMap((s) => s.interdits))
  for (const s of registre.scenarios) {
    for (const i of s.interdits) {
      if (!connus.has(i)) erreurs.push(`${s.id} couvre ${i}, qui n'existe pas`)
    }
  }
  for (const i of registre.interdits) {
    if (!couverts.has(i.id)) erreurs.push(`${i.id} n'a aucun test`)
  }

  for (const r of [...registre.interdits, ...registre.escalades, ...registre.scenarios]) {
    for (const code of codesCites(
      Object.values(r)
        .filter((v) => typeof v === 'string')
        .join(' '),
    )) {
      if (/^[IET]-/.test(code) && !connus.has(code))
        erreurs.push(`${r.id} cite ${code}, qui n'existe pas`)
    }
  }
  return erreurs
}
