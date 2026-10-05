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

/** Ce que le code d'un métier expose au registre (`metiers/<métier>/code/src/index.ts`). */
export interface CodeMetier {
  CONTROLES: { regle: string; nonCouvert?: string[] }[]
  rejouer(scenario: Registre['scenarios'][number], registre: Registre): { ecarts: string[] }
}

/**
 * Les incohérences entre le registre et le code qui l'applique : un contrôle
 * sans interdit, un interdit codé que le registre dit vérifiable par un humain
 * ou tenu pour hypothèse, un scénario d'interdit codé qui ne se rejoue pas
 * (sans `cas` ni `cas_absent`), un scénario rejoué qui échoue.
 */
export function incoherencesDuCode(registre: Registre, code: CodeMetier): string[] {
  const erreurs: string[] = []
  const codes = new Set(code.CONTROLES.map((c) => c.regle))
  for (const regle of codes) {
    const interdit = registre.interdits.find((i) => i.id === regle)
    if (!interdit) erreurs.push(`le contrôle ${regle} n'a pas d'interdit au registre`)
    else if (!interdit.verifiable_par.startsWith('code')) {
      erreurs.push(
        `${regle} est codé, mais le registre le dit vérifiable par « ${interdit.verifiable_par} »`,
      )
    } else if (interdit.statut === 'hypothèse') {
      erreurs.push(`${regle} est codé, mais c'est une hypothèse`)
    }
  }
  for (const s of registre.scenarios) {
    if (!s.interdits.some((i) => codes.has(i))) continue
    if (s.cas === undefined && s.cas_absent === undefined) {
      erreurs.push(`${s.id} couvre un interdit codé, sans cas rejouable ni cas_absent`)
    } else if (s.cas !== undefined) {
      for (const e of code.rejouer(s, registre).ecarts) erreurs.push(`${s.id} : ${e}`)
    }
  }
  return erreurs
}
