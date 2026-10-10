import { z } from 'zod'
import { empreinte } from '../approbation/jeton'
import { DESCRIPTION_MAX, FORMAT_INTENTION, ROLES } from '../conversation/actions'
import {
  type ParametresRequete,
  parametresNommes,
  type ResultatRequete,
  rendreResultat,
  SQL_MAX,
} from '../echappee/requete'

// Un geste appris est une donnée, pas du code (PLAN-PROMOTION.md § 5.1, P1) :
// des paramètres d'une liste fermée de types, des requêtes SQL paramétrées
// sur la copie du rôle, un gabarit de réponse rendu par le code, et ses
// tests. Ce fichier dit sa forme (schéma zod fermé), ce qu'un gabarit peut
// citer, comment il se rend, et son empreinte (celle que la clé d'activation
// scelle, P7).

/** Le dossier des gestes appris, dans le dossier du client. */
export const DOSSIER_GESTES = 'gestes'

export const TYPES_PARAMETRE = ['agent', 'date', 'periode', 'site', 'poste', 'nombre'] as const
export type TypeParametre = (typeof TYPES_PARAMETRE)[number]

/** Un nom de paramètre ou de requête : minuscule, chiffres, souligné. */
export const FORMAT_NOM = /^[a-z][a-z0-9_]*$/
/** Les deux clés liées d'une période (`:du`, `:au`) : un geste n'a qu'une période. */
export const CLES_PERIODE = ['du', 'au'] as const
export const LIGNE_MAX = 400
export const VIDE_MAX = 200
/** Un geste naît avec trois tests au moins : les échappées qui l'ont fait naître (P13). */
export const TESTS_MIN = 3

export const ParametreAppris = z.strictObject({
  type: z.enum(TYPES_PARAMETRE),
  description: z.string().min(1).max(DESCRIPTION_MAX),
})
export type ParametreAppris = z.infer<typeof ParametreAppris>

export const RequeteApprise = z.strictObject({
  nom: z.string().regex(FORMAT_NOM),
  sql: z.string().min(1).max(SQL_MAX),
})

/** Deux formes et pas plus (P12) : une ligne qui ne cite que `{{requete.colonne}}` et `{{param}}`, ou une requête rendue en tableau ; `vide` quand il n'y a aucune ligne. */
export const ReponseApprise = z.strictObject({
  ligne: z.string().max(LIGNE_MAX).nullable(),
  tableau: z.string().regex(FORMAT_NOM).nullable(),
  vide: z.string().min(1).max(VIDE_MAX),
})

export const TestAppris = z.strictObject({
  /** L'identifiant de l'échappée d'origine. */
  echappee: z.string().min(1),
  consigne: z.string().min(1),
  role: z.enum(ROLES),
  agent: z.string().nullable(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  /** `echappees/<id>.json` */
  instantane: z.string().min(1),
  /** Les nombres et les noms du texte validé, que le rejeu doit reproduire. */
  contient: z.array(z.string()).min(1),
})
export type TestAppris = z.infer<typeof TestAppris>

export const GesteAppris = z.strictObject({
  id: z.string().regex(FORMAT_INTENTION),
  description: z.string().min(1).max(DESCRIPTION_MAX),
  roles: z.array(z.enum(ROLES)).min(1),
  parametres: z.record(z.string().regex(FORMAT_NOM), ParametreAppris),
  requetes: z.array(RequeteApprise).min(1).max(5),
  reponse: ReponseApprise,
  tests: z.array(TestAppris).min(TESTS_MIN),
  origine: z.strictObject({
    fabrique_le: z.iso.date(),
    modele: z.string(),
    cout_usd: z.number(),
    conversations: z.array(z.string()),
  }),
})
export type GesteAppris = z.infer<typeof GesteAppris>

/** Le statut écrit dans le fichier YAML, hors du geste lui-même. */
export const STATUTS_GESTE = ['propose', 'actif', 'retire'] as const
export type StatutGeste = (typeof STATUTS_GESTE)[number]

/** Le fichier `gestes/<id>.yaml` : le geste, plus deux clés que le CLI écrit et que le modèle ne voit jamais. */
export const FichierGeste = GesteAppris.extend({
  statut: z.enum(STATUTS_GESTE),
  validation: z
    .strictObject({ par: z.string().min(1), le: z.iso.date(), jeton: z.string().min(1) })
    .optional(),
})
export type FichierGeste = z.infer<typeof FichierGeste>

/** Le geste seul, sans `statut` ni `validation`. */
export function gesteDe(fichier: FichierGeste): GesteAppris {
  const { statut: _statut, validation: _validation, ...geste } = fichier
  return geste
}

/** Les clés liées d'un geste : chaque paramètre par son nom, une période par `du` et `au`. Ce sont les clés que le SQL et le gabarit citent. */
export function clesDe(geste: Pick<GesteAppris, 'parametres'>): string[] {
  return Object.entries(geste.parametres).flatMap(([nom, p]) =>
    p.type === 'periode' ? [...CLES_PERIODE] : [nom],
  )
}

/** `{{heures.total}}` (la première ligne d'une requête) ou `{{agent}}` (un paramètre). */
const REFERENCE = /\{\{([a-z][a-z0-9_]*)(?:\.([a-z_][a-z0-9_]*))?\}\}/g

/**
 * Ce qu'un geste a de travers, en phrases, sans rien exécuter : une forme de
 * réponse et une seule ; une période au plus, et `du`, `au` réservés ; des
 * noms de requêtes uniques ; chaque référence du gabarit vers une requête ou
 * un paramètre qui existe ; chaque paramètre nommé dans un SQL déclaré. Avec
 * `colonnes` (celles que chaque requête rend, lues sur une copie vide), les
 * colonnes citées sont vérifiées aussi.
 */
export function verifierGabarit(
  geste: GesteAppris,
  colonnes?: ReadonlyMap<string, readonly string[]>,
): string[] {
  const ecarts: string[] = []
  const { reponse } = geste
  if ((reponse.ligne === null) === (reponse.tableau === null)) {
    ecarts.push('la réponse est une ligne ou un tableau, pas les deux ni aucun')
  }
  const periodes = Object.entries(geste.parametres).filter(([, p]) => p.type === 'periode')
  if (periodes.length > 1) ecarts.push('un geste n’a qu’une période (du, au)')
  for (const nom of Object.keys(geste.parametres)) {
    if ((CLES_PERIODE as readonly string[]).includes(nom)) {
      ecarts.push(`le paramètre « ${nom} » porte un nom réservé à la période`)
    }
  }
  const noms = geste.requetes.map((r) => r.nom)
  for (const nom of noms.filter((n, i) => noms.indexOf(n) !== i)) {
    ecarts.push(`deux requêtes nommées « ${nom} »`)
  }
  const cles = clesDe(geste)
  for (const r of geste.requetes) {
    for (const p of parametresNommes(r.sql).filter((p) => !cles.includes(p))) {
      ecarts.push(`la requête « ${r.nom} » nomme un paramètre inconnu : ${p}`)
    }
  }
  if (reponse.tableau !== null && !noms.includes(reponse.tableau)) {
    ecarts.push(`le tableau cite une requête inconnue : ${reponse.tableau}`)
  }
  for (const [, requete, colonne] of (reponse.ligne ?? '').matchAll(REFERENCE)) {
    if (colonne === undefined) {
      if (!cles.includes(requete as string)) {
        ecarts.push(`la ligne cite un paramètre inconnu : {{${requete}}}`)
      }
      continue
    }
    if (!noms.includes(requete as string)) {
      ecarts.push(`la ligne cite une requête inconnue : {{${requete}.${colonne}}}`)
    } else if (colonnes && !colonnes.get(requete as string)?.includes(colonne)) {
      ecarts.push(`la ligne cite une colonne que « ${requete} » ne rend pas : ${colonne}`)
    }
  }
  return ecarts
}

const valeur = (v: unknown) => (v === null ? 'null' : String(v))

/**
 * Le texte d'une réponse, rendu par le code (D10) : la ligne du gabarit sur la
 * première ligne de chaque requête citée, ou le tableau d'une requête ; `vide`
 * dès qu'une requête citée ne rend aucune ligne. Lève sur une référence
 * inconnue ou une requête en erreur : rien ne s'invente.
 */
export function rendre(
  geste: GesteAppris,
  params: ParametresRequete,
  resultats: Readonly<Record<string, ResultatRequete>>,
): string {
  const resultat = (nom: string) => {
    const r = resultats[nom]
    if (!r) throw new Error(`requête « ${nom} » sans résultat`)
    if ('erreur' in r) throw new Error(`requête « ${nom} » en erreur : ${r.erreur}`)
    return r
  }
  const { reponse } = geste
  if (reponse.tableau !== null) {
    const r = resultat(reponse.tableau)
    return r.lignes.length === 0 ? reponse.vide : rendreResultat(r)
  }
  if (reponse.ligne === null) throw new Error('réponse sans ligne ni tableau')
  let vide = false
  const texte = reponse.ligne.replace(
    REFERENCE,
    (_tout, requete: string, colonne: string | undefined) => {
      if (colonne === undefined) {
        if (!(requete in params)) throw new Error(`paramètre inconnu : ${requete}`)
        return valeur(params[requete])
      }
      const r = resultat(requete)
      const i = r.colonnes.indexOf(colonne)
      if (i < 0) throw new Error(`la requête « ${requete} » ne rend pas de colonne ${colonne}`)
      const premiere = r.lignes[0]
      if (!premiere) {
        vide = true
        return ''
      }
      return valeur(premiere[i])
    },
  )
  return vide ? reponse.vide : texte
}

/** Un JSON aux clés triées à tous les niveaux : la même donnée, la même chaîne. */
function canonique(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonique).join(',')}]`
  if (typeof x === 'object' && x !== null) {
    const o = x as Record<string, unknown>
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonique(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(x)
}

/** L'empreinte d'un geste, celle que la clé d'activation scelle (P7) : le geste seul, jamais `statut` ni `validation`. */
export function empreinteGeste(geste: GesteAppris): string {
  return empreinte({ geste: canonique(GesteAppris.parse(geste)) })
}
