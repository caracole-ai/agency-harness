import { isAbsolute } from 'node:path'
import { z } from 'zod'
import { empreinte } from '../approbation/jeton'
import { DESCRIPTION_MAX, FORMAT_INTENTION } from '../conversation/actions'
import { aCapacite, type RoleDeclare } from '../conversation/roles'
import {
  type ParametresRequete,
  parametresNommes,
  type ResultatRequete,
  rendreResultat,
  SQL_MAX,
} from '../echappee/requete'
import { type OperationApprise, SANS_OPERATION } from './operation'
import { type TypeParametreDeclare, typeDe } from './types-parametre'

// Un geste appris est une donnée, pas du code (PLAN-PROMOTION.md § 5.1, P1) :
// des paramètres de types déclarés (ceux du moteur et ceux du métier,
// PLAN-METIER-2.md M5), des requêtes SQL paramétrées sur la copie du rôle, un
// gabarit de réponse rendu par le code, et ses tests. Ce fichier dit sa forme
// (schéma zod fermé), ce qu'un gabarit peut citer, comment il se rend, et son
// empreinte (celle que la clé d'activation scelle, P7). Un geste qui écrit
// porte en plus `modifications` : une modification de l'opération déclarée
// par le métier (M6) par ligne d'une de ses requêtes, proposée comme une
// proposition d'échappée ; ses tests attendent ces modifications, pas un
// texte (PLAN-PROMOTION.md § 10, PLAN-GENERAL.md G5).

/** Le dossier des gestes appris, dans le dossier du client. */
export const DOSSIER_GESTES = 'gestes'

/** Un nom de paramètre ou de requête : minuscule, chiffres, souligné. */
export const FORMAT_NOM = /^[a-z][a-z0-9_]*$/
/** Les deux clés liées d'une période (`:du`, `:au`) : un geste n'a qu'une période. */
export const CLES_PERIODE = ['du', 'au'] as const
export const LIGNE_MAX = 400
export const VIDE_MAX = 200
/** Un geste naît avec trois tests au moins : les échappées qui l'ont fait naître (P13). */
export const TESTS_MIN = 3

export const ParametreAppris = z.strictObject({
  /** Un type du moteur ou du métier, vérifié par `verifierGabarit` (PLAN-METIER-2.md M5). */
  type: z.string().regex(FORMAT_NOM),
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

/** Les colonnes de `pour_chaque` qu'une opération lit, par clé de l'opération. */
const ColonnesOperation = z.record(z.string().regex(FORMAT_NOM), z.string().regex(FORMAT_NOM))

/** Ce qu'un geste qui écrit propose : une modification de l'opération du métier par ligne de la requête `pour_chaque`, lue dans ses colonnes (PLAN-PROMOTION.md § 10, PLAN-METIER-2.md M6). */
export const ModificationsOperation = z.strictObject({
  pour_chaque: z.string().regex(FORMAT_NOM),
  operation: z.string().regex(FORMAT_NOM),
  colonnes: ColonnesOperation,
})
export type ModificationsOperation = z.infer<typeof ModificationsOperation>

/** La forme d'avant M6 : le nom de l'opération en clé, ses colonnes en valeur (exemple : `reaffecter: { vacation, agent }`). Se lit, ne s'écrit plus. */
const ModificationsAnciennes = z
  .record(z.string().regex(FORMAT_NOM), z.union([z.string().regex(FORMAT_NOM), ColonnesOperation]))
  .refine(
    (m) =>
      Object.keys(m).length === 2 &&
      Object.entries(m).every(([cle, v]) => (cle === 'pour_chaque') === (typeof v === 'string')),
    { message: 'pour_chaque et une opération, pas plus' },
  )

/**
 * Les deux formes, lues sans conversion : le geste parsé garde celle de son
 * fichier, son empreinte ne change pas (PLAN-METIER-2.md M6). Le code lit la
 * forme normalisée, `modificationsNormalisees`.
 */
export const ModificationsApprises = z.union([ModificationsOperation, ModificationsAnciennes])
export type ModificationsApprises = z.infer<typeof ModificationsApprises>

export const TestAppris = z
  .strictObject({
    /** L'identifiant de l'échappée d'origine. */
    echappee: z.string().min(1),
    consigne: z.string().min(1),
    role: z.string().min(1),
    /** Qui a fait la demande d'origine (null : un rôle non identifié). Les tests d'avant l'écrivent `agent` (PLAN-METIER-2.md M2) : la graphie lue n'est jamais réécrite, l'empreinte d'un geste ne change pas. */
    personne: z.string().nullable().optional(),
    agent: z.string().nullable().optional(),
    params: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
    /** `echappees/<id>.json`, relatif au dossier du client : ni absolu, ni `..`. */
    instantane: z
      .string()
      .min(1)
      .refine((p) => !isAbsolute(p) && !p.split(/[\\/]/).includes('..'), {
        message: 'un chemin relatif au dossier du client, sans « .. »',
      }),
    /** Les nombres et les noms du texte validé, que le rejeu doit reproduire ; vide pour un geste qui écrit. */
    contient: z.array(z.string()),
    /** Un geste qui écrit : les modifications validées, que le rejeu doit reproduire exactement ; leur forme est celle de l'opération du métier (`verifierGabarit`). */
    modifications: z.array(z.unknown()).min(1).optional(),
  })
  .refine((t) => (t.personne === undefined) !== (t.agent === undefined), {
    message:
      'un test dit qui a fait la demande : personne (ou agent, la graphie d’avant), pas les deux',
  })
export type TestAppris = z.infer<typeof TestAppris>

/** Qui a fait la demande d'origine d'un test, quelle que soit sa graphie (PLAN-METIER-2.md M2). */
export const personneDuTest = (t: Pick<TestAppris, 'personne' | 'agent'>): string | null =>
  t.personne !== undefined ? t.personne : (t.agent ?? null)

export const GesteAppris = z.strictObject({
  id: z.string().regex(FORMAT_INTENTION),
  description: z.string().min(1).max(DESCRIPTION_MAX),
  roles: z.array(z.string().min(1)).min(1),
  parametres: z.record(z.string().regex(FORMAT_NOM), ParametreAppris),
  requetes: z.array(RequeteApprise).min(1).max(5),
  reponse: ReponseApprise,
  tests: z.array(TestAppris).min(TESTS_MIN),
  /** Absent : le geste lit. Présent : il propose des modifications (PLAN-PROMOTION.md § 10). */
  modifications: ModificationsApprises.optional(),
  origine: z.strictObject({
    fabrique_le: z.iso.date(),
    modele: z.string(),
    cout_usd: z.number(),
    conversations: z.array(z.string()),
  }),
})
export type GesteAppris = z.infer<typeof GesteAppris>

/** Un geste qui écrit : il propose des modifications, qui passent par la proposition du métier. */
export const ecritDe = (geste: Pick<GesteAppris, 'modifications'>) =>
  geste.modifications !== undefined

/** Ce qu'un métier déclare pour ses gestes appris (PLAN-METIER-2.md M1, M5, M6) ; `MetierConversation` y satisfait. */
export interface DeclarationsGeste {
  roles: RoleDeclare[]
  typesParametre: TypeParametreDeclare[]
  operation?: OperationApprise<unknown>
}

/** Les modifications d'un geste qui écrit sous leur forme d'aujourd'hui, quelle que soit celle de son fichier ; rien pour un geste qui lit. */
export function modificationsNormalisees(
  geste: Pick<GesteAppris, 'modifications'>,
): ModificationsOperation | undefined {
  const m = geste.modifications
  if (m === undefined) return undefined
  const aujourdhui = ModificationsOperation.safeParse(m)
  if (aujourdhui.success) return aujourdhui.data
  const { pour_chaque } = m
  const [operation, colonnes] = Object.entries(m).find(([cle]) => cle !== 'pour_chaque') ?? []
  if (typeof pour_chaque !== 'string' || operation === undefined || typeof colonnes !== 'object') {
    throw new Error('des modifications sans opération')
  }
  return { pour_chaque, operation, colonnes }
}

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

/** `{{heures.total}}` (la première ligne d'une requête) ou `{{personne}}` (un paramètre). */
const REFERENCE = /\{\{([a-z][a-z0-9_]*)(?:\.([a-z_][a-z0-9_]*))?\}\}/g

/** Des accolades qui restent hors des références valides (`{{ heures.total }}`, `{{Heures.nom}}`) : un gabarit mal formé. */
const malForme = (ligne: string) => /\{\{|\}\}/.test(ligne.replace(REFERENCE, ''))

/**
 * Ce qu'un geste a de travers, en phrases, sans rien exécuter : une forme de
 * réponse et une seule ; une période au plus, et `du`, `au` réservés ; des
 * noms de requêtes uniques ; chaque référence du gabarit vers une requête ou
 * un paramètre qui existe ; chaque paramètre nommé dans un SQL déclaré ; des
 * tests qui attendent un texte (un geste qui lit) ou des modifications (un
 * geste qui écrit, ouvert aux seuls rôles qui ont la capacité `ecrit`, dont
 * la réponse est le tableau de sa requête `pour_chaque`, par l'opération que
 * le métier déclare) ; des rôles et des types de paramètre que le métier
 * déclare (PLAN-METIER-2.md M1, M5, M6). Avec `colonnes` (celles que chaque
 * requête rend, lues sur une copie vide), les colonnes citées sont vérifiées
 * aussi.
 */
export function verifierGabarit(
  declarations: DeclarationsGeste,
  geste: GesteAppris,
  colonnes?: ReadonlyMap<string, readonly string[]>,
): string[] {
  const ecarts: string[] = []
  for (const r of geste.roles.filter((r) => !declarations.roles.some((d) => d.id === r))) {
    ecarts.push(`rôle inconnu : ${r}`)
  }
  for (const p of Object.values(geste.parametres)) {
    try {
      typeDe(declarations.typesParametre, p.type)
    } catch (erreur) {
      ecarts.push((erreur as Error).message)
    }
  }
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
  if (reponse.ligne !== null && malForme(reponse.ligne)) {
    ecarts.push(
      'la ligne contient une référence mal formée : {{requete.colonne}} ou {{parametre}}, en minuscules, sans espace',
    )
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
  ecarts.push(...ecartsEcriture(geste, declarations, noms, colonnes))
  return ecarts
}

/** Ce que `verifierGabarit` exige de plus selon que le geste lit ou écrit. */
function ecartsEcriture(
  geste: GesteAppris,
  declarations: DeclarationsGeste,
  noms: string[],
  colonnes?: ReadonlyMap<string, readonly string[]>,
): string[] {
  const m = modificationsNormalisees(geste)
  if (m === undefined) {
    return geste.tests.some((t) => t.contient.length === 0 || t.modifications !== undefined)
      ? ['un geste qui lit : chaque test attend un texte (contient), pas des modifications']
      : []
  }
  const { operation } = declarations
  if (operation === undefined) return [SANS_OPERATION]
  const ecarts: string[] = []
  if (m.operation !== operation.nom) {
    ecarts.push(`l’opération « ${m.operation} » n’est pas celle du métier (${operation.nom})`)
  } else {
    const lues = operation.colonnes.safeParse(m.colonnes)
    if (!lues.success) {
      ecarts.push(`les colonnes de l’opération : ${z.prettifyError(lues.error)}`)
    }
  }
  if (!geste.roles.every((role) => aCapacite(declarations.roles, { role }, 'ecrit'))) {
    ecarts.push('un geste qui écrit n’est ouvert qu’aux rôles qui écrivent')
  }
  if (!noms.includes(m.pour_chaque)) {
    ecarts.push(`les modifications citent une requête inconnue : ${m.pour_chaque}`)
  } else {
    const rendues = colonnes?.get(m.pour_chaque)
    for (const c of Object.values(m.colonnes)) {
      if (rendues && !rendues.includes(c)) {
        ecarts.push(
          `les modifications citent une colonne que « ${m.pour_chaque} » ne rend pas : ${c}`,
        )
      }
    }
  }
  if (geste.reponse.tableau !== m.pour_chaque) {
    ecarts.push(`la réponse d’un geste qui écrit est le tableau de sa requête « ${m.pour_chaque} »`)
  }
  if (geste.tests.some((t) => t.modifications === undefined)) {
    ecarts.push('un geste qui écrit : chaque test attend des modifications')
  } else if (
    geste.tests.some((t) => !z.array(operation.modification).safeParse(t.modifications).success)
  ) {
    ecarts.push('un geste qui écrit : chaque modification attendue a la forme de l’opération')
  }
  return ecarts
}

/** Une ligne de `pour_chaque` pour laquelle la requête n'a trouvé personne ni rien : les données sont lues, il n'y a rien à proposer. */
export class SansCandidat extends Error {}

/**
 * Les modifications qu'un geste qui écrit propose : une par ligne de sa
 * requête `pour_chaque`, faite par l'opération du métier sur les colonnes
 * qu'elle lit. Lève sur une requête absente ou en erreur, une colonne
 * absente, une ligne que l'opération refuse (`SansCandidat` quand il n'y a
 * rien à proposer) : rien ne s'invente.
 */
export function modificationsDe(
  geste: GesteAppris,
  resultats: Readonly<Record<string, ResultatRequete>>,
  operation: OperationApprise<unknown> | undefined,
): unknown[] {
  const m = modificationsNormalisees(geste)
  if (m === undefined) throw new Error(`${geste.id} : un geste qui lit ne propose rien`)
  if (operation === undefined) throw new Error(SANS_OPERATION)
  const r = resultats[m.pour_chaque]
  if (!r) throw new Error(`requête « ${m.pour_chaque} » sans résultat`)
  if ('erreur' in r) throw new Error(`requête « ${m.pour_chaque} » en erreur : ${r.erreur}`)
  if (r.tronque) throw new Error(`la requête « ${m.pour_chaque} » rend trop de lignes`)
  for (const colonne of Object.values(m.colonnes)) {
    if (!r.colonnes.includes(colonne)) {
      throw new Error(`la requête « ${m.pour_chaque} » ne rend pas de colonne ${colonne}`)
    }
  }
  return r.lignes.map((ligne, n) => {
    try {
      return operation.depuisLigne(
        Object.fromEntries(r.colonnes.map((c, i) => [c, ligne[i]])),
        m.colonnes,
      )
    } catch (erreur) {
      if (erreur instanceof SansCandidat) throw erreur
      throw new Error(`la ligne ${n + 1} de « ${m.pour_chaque} » ${(erreur as Error).message}`)
    }
  })
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
  if (malForme(reponse.ligne)) throw new Error('référence mal formée dans la ligne')
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
