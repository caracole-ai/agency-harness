import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { stringify } from 'yaml'
import { z } from 'zod'
import { DESCRIPTION_MAX, type Intention, type Role, schemaJson } from '../conversation/actions'
import { correspondances, type Designable } from '../conversation/designation'
import type { Domaine } from '../conversation/domaine'
import { aCapacite, type Capacite, quiParle, type RoleDeclare } from '../conversation/roles'
import { entreDonnees, FRONTIERE, jourSemaine } from '../conversation/traduire'
import { semaineDe } from '../echappee/boucle'
import type { TableCopie } from '../echappee/copie'
import {
  type CriteresProposition,
  preferencesEnMots,
  REGLES_EN_TETE,
  reglesEnMots,
} from '../echappee/echappee'
import { citations, contient } from '../echappee/reponse'
import {
  CLES_PERIODE,
  clesDe,
  type DeclarationsGeste,
  DOSSIER_GESTES,
  type FichierGeste,
  GesteAppris,
  ModificationsOperation,
  TESTS_MIN,
  type TestAppris,
} from '../gestes/geste-appris'
import { type OperationApprise, SANS_OPERATION } from '../gestes/operation'
import { TYPES_MOTEUR, typeDe } from '../gestes/types-parametre'
import { type EcartGeste, enLigne, type Rejeu, verifierGeste } from '../gestes/verifier'
import type { Journal } from '../journal/journal'
import {
  additionner,
  type Effort,
  type Modele,
  type ReponseModele,
  USAGE_NUL,
  type UsageModele,
} from '../modele/modele'
import { FUSEAU, Temporal } from '../temps/temporal'
import type { EchappeeJournalisee } from './promotion'

// La fabrication d'un geste appris (PLAN-PROMOTION.md § 6, P5) : fabriqué par
// le modèle en un appel (un outil, `proposer_geste`, dont le schéma est celui
// du geste), relancé une fois au plus sur un échec de forme ou une requête qui
// ne s'exécute pas ; vérifié par le code (schéma, gabarit sur une copie vide,
// rejeu de chaque test sur son instantané, aucune valeur en dur venue d'une
// consigne, description distincte des gestes existants) ; écrit en
// `gestes/<id>.yaml` au statut `propose`. Un écart de fond ne relance pas :
// l'atelier le lit. Le modèle reçoit les échappées entières, jamais
// l'instantané (P10). Une intention qui écrit se fabrique de la même façon,
// depuis les propositions validées : le geste rend une modification de
// l'opération du métier par ligne, et le rejeu compare les modifications, pas
// un texte (PLAN-PROMOTION.md § 10, PLAN-GENERAL.md G5, PLAN-METIER-2.md M6).
// Le prompt dit le domaine, l'opération et les types que le métier déclare
// (M5, M7) : aucune phrase d'un métier n'est écrite ici.

export const OUTIL_PROPOSER_GESTE = 'proposer_geste'
/** Deux appels au plus : le premier, et une relance (P5). */
export const APPELS_MAX = 2
export const APRES_RELANCE = 'après relance'
/** Le modèle n'a pas répondu (réseau, passerelle, flux coupé) : une panne, pas un verdict. */
export const INJOIGNABLE = 'le modèle est injoignable'

const ValeurParam = z.union([z.string(), z.number(), z.null()])

/**
 * Ce que le modèle propose : le geste sans identifiant (c'est l'intention) ni
 * origine, ses tests réduits à l'échappée d'origine et aux valeurs des
 * paramètres ; le code complète consigne, rôle, instantané et `contient`.
 */
export const GestePropose = z.strictObject({
  description: GesteAppris.shape.description.describe(
    `une phrase de ${DESCRIPTION_MAX} caractères au plus, qui garde toute la portée de l'intention et ne ressemble à aucun geste existant`,
  ),
  roles: GesteAppris.shape.roles.describe(
    'les rôles qui peuvent demander ce geste : ceux des demandes, au moins',
  ),
  parametres: GesteAppris.shape.parametres.describe(
    'les paramètres, par nom (minuscules, chiffres, souligné), chacun avec son type et une description pour le modèle qui lira la demande',
  ),
  requetes: GesteAppris.shape.requetes.describe(
    'une à cinq requêtes SQLite en lecture, nommées ; chaque valeur venue de la demande est un paramètre lié (:nom), jamais une valeur en dur',
  ),
  reponse: GesteAppris.shape.reponse.describe(
    'ligne (un gabarit qui cite {{requete.colonne}} et {{parametre}}) ou tableau (le nom d’une requête), l’autre à null ; et vide, la phrase quand il n’y a aucune ligne',
  ),
  tests: z
    .array(
      z.strictObject({
        echappee: z.string().min(1).describe("l'identifiant de la demande (E-…)"),
        params: z
          .record(z.string(), ValeurParam)
          .describe(
            'les valeurs que cette demande donne aux paramètres, par clé (du et au pour une période) ; pour une personne, telle que la demande l’écrit, ou null',
          ),
      }),
    )
    .min(1)
    .describe('une entrée par demande ci-dessous'),
})
export type GestePropose = z.infer<typeof GestePropose>

/** Ce que le modèle propose pour une intention qui écrit : le même geste, plus ses modifications (l'opération et ses colonnes : `schemaPropose`). */
export const GesteProposeEcriture = GestePropose.extend({
  modifications: ModificationsOperation.describe(
    'pour_chaque : la requête qui rend une ligne par modification ; operation : le nom de l’opération ; colonnes : pour chaque clé de l’opération, la colonne de cette requête qui la rend',
  ),
})
export type GesteProposeEcriture = z.infer<typeof GesteProposeEcriture>

export interface CadreFabrication {
  modele: Modele
  effort: Effort
  /** Le plafond de la fabrication dans la config (`plafondFabrication`), jamais un nombre en dur. */
  maxTokens: number
  intention: Intention
  /** Les échappées finies proprement de cette intention ; seules les réponses servent, ou les propositions validées pour une intention qui écrit. */
  echappees: EchappeeJournalisee[]
  gestesExistants: { id: string; description: string }[]
  /** Tous les noms du client (`m.noms`) : pour résoudre une personne des tests et extraire les noms cités. */
  personnes: Designable[]
  /** Les rôles, les types de paramètre et l'opération que le métier déclare (PLAN-METIER-2.md M1, M5, M6). */
  declarations: DeclarationsGeste
  /** Le domaine que le prompt dit (PLAN-METIER-2.md M7). */
  domaine: Domaine
  /** Pour une intention qui écrit : les règles et les préférences que l'échappée a montrées (`PropositionMetier.criteres`). */
  criteres?: CriteresProposition
  /** Pour une intention qui écrit : les modifications validées y sont relues par l'opération (M6). */
  journal: Journal
  dossierClient: string
  /** Les tables de la copie, sans ligne : le gabarit s'y vérifie. */
  copieVide: TableCopie[]
  /** Pour `origine` : le jour (AAAA-MM-JJ) et le coût d'un usage. */
  fabriqueLe: string
  cout: (usage: UsageModele) => number
  /** Chaque appel au modèle, pour le journal (`relance` sur le second). */
  journaliser: (reponse: ReponseModele, relance: boolean) => void
}

/** `usageBorne` : au moins un appel n'a pas été compté par le fournisseur, `usage` (et le coût de l'origine) est une borne haute. */
export type IssueFabrication = {
  usage: UsageModele
  usageBorne: boolean
  appels: number
  relance: boolean
} & (
  | { sorte: 'geste'; geste: GesteAppris; rejeu: Rejeu }
  | { sorte: 'ecarts'; propose: GestePropose; ecarts: EcartGeste[]; rejeu: Rejeu }
  /** `injoignable` : une panne de transport (le modèle n'a pas répondu), pas un verdict sur le geste. */
  | { sorte: 'echec'; raison: string; injoignable: boolean }
)

/** Les types de paramètre en mots, ceux du métier puis ceux du moteur (PLAN-METIER-2.md M5). */
const typesEnMots = (declarations: DeclarationsGeste) =>
  [...declarations.typesParametre.map((t) => t.nom), ...TYPES_MOTEUR]
    .map((nom) => `${nom} (${typeDe(declarations.typesParametre, nom).enMots})`)
    .join(' ; ')

/** Les rôles qui ont une capacité. */
const rolesQui = (roles: RoleDeclare[], c: Capacite) =>
  roles.filter((r) => aCapacite(roles, { role: r.id }, c))

/** Ceux qui valident une proposition, en mots, pour le prompt. */
const valideurs = (roles: RoleDeclare[]) =>
  rolesQui(roles, 'valide')
    .map((r) => r.enMots)
    .join(' ou ')

/** Les colonnes que l'opération lit, chacune avec la description que le métier lui donne. */
function colonnesEnMots(operation: OperationApprise<unknown>): string {
  const { properties = {} } = z.toJSONSchema(operation.colonnes) as {
    properties?: Record<string, { description?: string }>
  }
  return Object.entries(properties)
    .map(([cle, p]) => (p.description ? `${cle} (${p.description})` : cle))
    .join(', ')
}

/** Les tables pour le modèle de fabrication : noms, colonnes, descriptions ; aucune ligne, aucun compte. */
export function schemaDesTables(tables: TableCopie[]): string {
  return tables
    .map((t) =>
      [
        `Table ${t.nom} : ${t.description}`,
        ...t.colonnes.map((c) => `- ${c.nom} (${c.type}) : ${c.description}`),
      ].join('\n'),
    )
    .join('\n\n')
}

/**
 * Le système de la fabrication (§ 6.1). Rien de volatil : il se met en cache.
 * Aucune donnée du client, seulement le schéma des tables ; le domaine,
 * l'opération, les types et les rôles sont ceux que le métier déclare
 * (PLAN-METIER-2.md M5 à M7).
 */
export function systemeFabriquer(
  intention: Intention,
  roles: Role[],
  tables: string,
  gestesExistants: { id: string; description: string }[],
  declarations: DeclarationsGeste,
  domaine: Domaine,
  criteres?: CriteresProposition,
): string {
  const { ecrit } = intention
  const { operation } = declarations
  if (ecrit && !operation) throw new Error(SANS_OPERATION)
  const qui = valideurs(declarations.roles)
  const sansTout = declarations.roles.filter(
    (r) => !aCapacite(declarations.roles, { role: r.id }, 'voit_tout'),
  )
  return [
    ecrit
      ? `Tu fabriques un geste pour ${domaine.cadre}. La même sorte de demande est revenue plusieurs fois ; chaque fois, un modèle a lu une copie des données par des requêtes SQL, a proposé des modifications (${operation?.enMots}), et ${qui} les a validées. Le geste proposera désormais ces modifications sans modèle, pour ces demandes et celles de la même sorte : des requêtes SQL paramétrées, dont une rend une ligne par modification ; le code fait passer la proposition par les règles, puis par les accords qu'elle demande.`
      : `Tu fabriques un geste pour ${domaine.cadre}. La même sorte de demande est revenue plusieurs fois ; chaque fois, un modèle a lu une copie des données par des requêtes SQL et a répondu. Le geste répondra désormais sans modèle, à ces demandes et à celles de la même sorte : des requêtes SQL paramétrées, un gabarit rendu par le code.`,
    '',
    `Le geste : ${intention.id} : ${intention.description}. Sa description, en une phrase de ${DESCRIPTION_MAX} caractères au plus, garde toute cette portée et ne ressemble à aucun geste existant :`,
    ...gestesExistants.map((g) => `- ${g.id} : ${g.description}`),
    '',
    `Les paramètres, d'une liste fermée de types, pas de texte libre : ${typesEnMots(declarations)}. Chaque paramètre a un nom en minuscules et une description pour le modèle qui lira la demande.`,
    '',
    `Les requêtes, une à cinq, nommées : SQLite, en lecture (SELECT ou WITH), sur les tables ci-dessous. Chaque valeur qui vient de la demande est un paramètre lié (:nom_du_parametre, :${CLES_PERIODE.join(', :')} pour une période), jamais une valeur en dur : ni identifiant, ni nom, ni date, ni aucune autre valeur de la demande. Fais faire les sommes et les comptes par SQL.`,
    '',
    ...(ecrit && operation
      ? [
          `Les modifications : pour_chaque, le nom de la requête qui rend une ligne par modification ; operation, ${operation.nom} ; colonnes, pour chaque clé de l’opération, le nom de la colonne de cette requête qui la rend : ${colonnesEnMots(operation)}. Pour chaque demande, le geste propose exactement les modifications validées, chacune telle que ${qui} l’a validée ; aucune de plus. Si ${qui} a validé, dans des demandes différentes, des modifications différentes de la même chose, chacune convient : le geste en rend une seule, n’importe laquelle, et ne cherche pas de règle qui les reproduise toutes. Ce qui a fait choisir chaque valeur (ce que les données permettent, ce que les vérifications ont refusé, les préférences exprimées) se code en SQL.`,
          ...(criteres
            ? [
                '',
                REGLES_EN_TETE,
                ...reglesEnMots(criteres.regles),
                '',
                preferencesEnMots(criteres.preferences),
              ]
            : []),
          '',
          'La réponse : tableau, le nom de la requête de pour_chaque, ligne à null ; et vide, la phrase montrée quand elle ne rend aucune ligne (rien à changer).',
          '',
          `Les rôles : ${rolesQui(declarations.roles, 'ecrit')
            .map((r) => r.id)
            .join(', ')} seulement ; les autres ne proposent pas de modification.`,
          '',
          'Les tests : une entrée par demande, avec les valeurs que cette demande donne à chaque paramètre.',
          '',
          'Dans les demandes, une personne est écrite par son identifiant, qui tient lieu de son nom ; une colonne de l’opération qui désigne une personne rend son identifiant, jamais son nom.',
        ]
      : [
          'La réponse, une forme et une seule : ligne, une phrase qui cite {{requete.colonne}} (la première ligne du résultat de cette requête) et {{parametre}} ({{du}}, {{au}} pour une période), tableau à null ; ou tableau, le nom d’une requête rendue en tableau, ligne à null. Et vide : la phrase montrée quand une requête citée ne rend aucune ligne. Pas de condition, pas de boucle, pas de calcul dans le gabarit. Chaque nombre et chaque nom de chaque réponse montrée doit apparaître dans ce que le geste rend ; si une réponse détaille, choisis un tableau qui rend le détail.',
          '',
          `Les rôles : ceux des demandes (${roles.join(', ')}), au moins${sansTout.map((r) => ` ; ${r.id} seulement si la demande a un sens pour ${r.enMots}, qui ne voit que ses propres données`).join('')}.`,
          '',
          'Les tests : une entrée par demande, avec les valeurs que cette demande donne à chaque paramètre.',
          '',
          'Dans les demandes et les réponses, une personne est écrite par son identifiant, qui tient lieu de son nom ; les données que le geste lira portent les vrais noms : là où une réponse cite une personne, le geste rend son nom tel que les données l’écrivent.',
        ]),
    '',
    'Les tables (SQLite) :',
    tables,
    '',
    FRONTIERE,
    '',
    `Réponds par un seul appel de ${OUTIL_PROPOSER_GESTE}, jamais par du texte.`,
  ].join('\n')
}

/** Le schéma de la proposition ; pour une intention qui écrit, ses modifications portent l'opération du métier et ses colonnes (PLAN-METIER-2.md M6). */
function schemaPropose(declarations: DeclarationsGeste, ecrit: boolean) {
  if (!ecrit) return GestePropose
  const { operation } = declarations
  if (!operation) throw new Error(SANS_OPERATION)
  return GesteProposeEcriture.extend({
    modifications: ModificationsOperation.extend({
      operation: z.literal(operation.nom),
      colonnes: operation.colonnes,
    }).describe(GesteProposeEcriture.shape.modifications.description ?? ''),
  })
}

/** L'outil de la fabrication : le schéma du geste proposé, strict ; avec ses modifications pour une intention qui écrit ; ses rôles, ceux que le métier déclare (PLAN-METIER-2.md M1). */
export function outilProposerGeste(declarations: DeclarationsGeste, ecrit = false): Anthropic.Tool {
  const declares = z
    .array(z.enum(declarations.roles.map((r) => r.id)))
    .min(1)
    .describe(GestePropose.shape.roles.description ?? '')
  return {
    name: OUTIL_PROPOSER_GESTE,
    description: ecrit
      ? 'Proposer le geste : ses paramètres, ses requêtes, ses modifications, sa réponse, ses tests.'
      : 'Proposer le geste : ses paramètres, ses requêtes, sa réponse, ses tests.',
    input_schema: schemaJson(schemaPropose(declarations, ecrit).extend({ roles: declares })),
    strict: true,
  }
}

const aParis = (horodatage: string) => Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU)

const deux = (n: number) => String(n).padStart(2, '0')

/**
 * Une échappée faite depuis les pseudonymes : ce que le modèle a lu et écrit,
 * sans aucun nom, est au journal : le texte d'une réponse, ou les
 * modifications d'une proposition (des identifiants).
 */
export type EchappeeMasquee = EchappeeJournalisee & { consigneModele: string } & (
    | { texteModele: string }
    | { modifications: unknown[] }
  )

/** Le motif d'une échappée d'avant les pseudonymes : on ne refabrique pas avec des noms (PLAN-PSEUDONYMES.md § 6). */
export const ANTERIEURE = 'échappée antérieure aux pseudonymes'

const estMasquee = (e: EchappeeJournalisee): e is EchappeeMasquee =>
  e.consigneModele !== undefined &&
  (e.issue === 'proposition' ? e.modifications !== undefined : e.texteModele !== undefined)

/** Les modifications validées d'une échappée qui a proposé, relues par l'opération du métier (`OperationApprise.relire`). */
export type ValideesDe = (e: EchappeeJournalisee) => unknown[]

/**
 * Le message : les échappées entières entre les balises des données, telles
 * que le modèle de l'échappée les a lues et écrites, sans aucun nom (P10,
 * PLAN-PSEUDONYMES.md S5).
 */
export function messageFabriquer(
  echappees: EchappeeMasquee[],
  declarations: DeclarationsGeste,
  validees: ValideesDe,
): string {
  const blocs = echappees.map((e) => {
    const z = aParis(e.horodatage)
    const { lundi, dimanche } = semaineDe(z)
    const moment = `${z.toPlainDate().toString()}T${deux(z.hour)}:${deux(z.minute)} (${jourSemaine(z)}) ; semaine en cours du ${lundi} au ${dimanche}`
    return [
      `### ${e.echappee}`,
      `Demandeur : ${quiParle(declarations.roles, { role: e.role, ...(e.personne !== undefined ? { personne: e.personne } : {}) })}`,
      `Moment : ${moment}`,
      `Consigne : ${e.consigneModele}`,
      ...e.requetes.flatMap((r, i) => [
        `Requête ${i + 1} :`,
        r.sql,
        `Résultat ${i + 1} :`,
        r.erreur !== undefined ? `erreur : ${r.erreur}` : r.sortie,
      ]),
      // Une réponse : son texte ; une proposition (une intention qui écrit) : ses vérifications, puis ce qui a été validé.
      ...('texteModele' in e ? ['Réponse montrée :', e.texteModele] : proposition(e)),
    ].join('\n')
  })
  function proposition(e: EchappeeMasquee): string[] {
    const modifications = validees(e)
    const [premiere] = modifications
    const cles = premiere ? ` (${Object.keys(premiere as object).join(' → ')})` : ''
    return [
      ...(e.verifications ?? []).flatMap((v, i) => [
        `Vérification ${i + 1} :`,
        v.modifications,
        `Résultat de la vérification ${i + 1} :`,
        v.erreur !== undefined ? `erreur : ${v.erreur}` : v.sortie,
      ]),
      `Modifications validées par ${valideurs(declarations.roles)}${cles} :`,
      ...modifications.map(enLigne),
    ]
  }
  return [
    `Les demandes (${echappees.length}), dans l'ordre, avec ce qui a été fait et la réponse montrée :`,
    entreDonnees(blocs.join('\n\n')),
    'Propose le geste.',
  ].join('\n')
}

/** `"null"` ou `"None"` écrit en texte (GMI ignore `strict`) se relit comme `null`, comme pour la traduction. */
const nulEnTexte = (v: unknown) => (v === 'null' || v === 'None' ? null : v)

function relireNuls(entree: unknown): unknown {
  if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) return entree
  const o = entree as Record<string, unknown>
  const reponse = o.reponse
  const tests = o.tests
  return {
    ...o,
    ...(typeof reponse === 'object' && reponse !== null
      ? {
          reponse: Object.fromEntries(
            Object.entries(reponse).map(([k, v]) => [k, k === 'vide' ? v : nulEnTexte(v)]),
          ),
        }
      : {}),
    ...(Array.isArray(tests)
      ? {
          tests: tests.map((t: unknown) =>
            typeof t === 'object' && t !== null && 'params' in t
              ? {
                  ...t,
                  params:
                    typeof t.params === 'object' && t.params !== null
                      ? Object.fromEntries(
                          Object.entries(t.params).map(([k, v]) => [k, nulEnTexte(v)]),
                        )
                      : t.params,
                }
              : t,
          ),
        }
      : {}),
  }
}

/** `relance` : un échec de forme (schéma, zéro ou deux outils) se relance une fois (P5) ; un refus ou une troncature, non : le modèle n'a pas pu finir, il ne finira pas mieux. */
type Lecture =
  | { ok: true; propose: GestePropose | GesteProposeEcriture }
  | { ok: false; raison: string; relance: boolean }

/** Lit la réponse du modèle, comme `traduire.lire` : refus, troncature, zéro ou deux outils, forme → échec. */
function lire(message: Anthropic.Message, schema: ReturnType<typeof schemaPropose>): Lecture {
  if (message.stop_reason === 'refusal') {
    return { ok: false, raison: 'le modèle a refusé', relance: false }
  }
  if (message.stop_reason === 'max_tokens') {
    return { ok: false, raison: 'réponse tronquée', relance: false }
  }
  const blocs = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (blocs.length > 1) {
    return { ok: false, raison: `${blocs.length} appels d'outil au lieu d'un`, relance: true }
  }
  const bloc = blocs[0]
  if (!bloc) return { ok: false, raison: "aucun appel d'outil", relance: true }
  if (bloc.name !== OUTIL_PROPOSER_GESTE) {
    return { ok: false, raison: `outil inconnu : ${bloc.name}`, relance: true }
  }
  const lu = schema.safeParse(relireNuls(bloc.input))
  return lu.success
    ? { ok: true, propose: lu.data }
    : { ok: false, raison: `forme : ${z.prettifyError(lu.error)}`, relance: true }
}

const estId = (v: unknown, personnes: Designable[]) =>
  typeof v === 'string' && personnes.some((p) => p.id === v)

/** Un paramètre proposé qui désigne une personne ; un type inconnu, non (`verifierGabarit` le dira). */
function designePersonne(declarations: DeclarationsGeste, type: string | undefined): boolean {
  if (type === undefined) return false
  try {
    return typeDe(declarations.typesParametre, type).sorte === 'personne'
  } catch {
    return false
  }
}

/**
 * Complète la proposition en un geste (§ 6.1) : l'identifiant est
 * l'intention ; chaque test cite une échappée d'origine, dont il reçoit la
 * consigne, le rôle, qui a demandé, l'instantané, et `contient` : les nombres
 * et les noms du texte montré que la consigne ne portait pas déjà ; pour un
 * geste qui écrit, `modifications` : celles qui ont été validées (`validees`).
 * Une personne des paramètres est résolue comme pour les gestes codés ; pour
 * un rôle qui ne désigne pas autrui, c'est celui qui parle (D4,
 * PLAN-METIER-2.md M3, M5). Chaque échappée d'origine a son test (écart 2).
 */
export function completerGeste(
  propose: GestePropose | GesteProposeEcriture,
  intention: string,
  echappees: EchappeeJournalisee[],
  personnes: Designable[],
  origine: GesteAppris['origine'],
  declarations: DeclarationsGeste,
  validees: ValideesDe,
): { geste?: GesteAppris; ecarts: EcartGeste[] } {
  const ecarts: EcartGeste[] = []
  const ecart = (texte: string) => ecarts.push({ texte })
  const noms = personnes.map((p) => p.nom)
  const cles = clesDe(propose)
  const tests: TestAppris[] = []
  const vus = new Set<string>()
  for (const t of propose.tests) {
    const e = echappees.find((x) => x.echappee === t.echappee)
    if (!e) {
      ecart(`un test cite une échappée inconnue : ${t.echappee}`)
      continue
    }
    if (vus.has(e.echappee)) {
      ecart(`deux tests pour ${e.echappee}`)
      continue
    }
    vus.add(e.echappee)
    if (!propose.roles.includes(e.role)) {
      ecart(`${e.echappee} est une demande du rôle ${e.role}, que le geste n'ouvre pas`)
      continue
    }
    const params: TestAppris['params'] = {}
    let valide = true
    for (const cle of cles) {
      const v = t.params[cle] ?? null
      if (!designePersonne(declarations, propose.parametres[cle]?.type)) {
        params[cle] = v
        continue
      }
      if (!aCapacite(declarations.roles, { role: e.role }, 'designe_autrui')) {
        params[cle] = e.personne ?? null
      } else if (v === null || estId(v, personnes)) {
        params[cle] = v
      } else {
        const trouves = correspondances(String(v), personnes)
        const [seul] = trouves
        if (trouves.length === 1 && seul) {
          params[cle] = seul.id
        } else {
          ecart(
            `${e.echappee} : « ${String(v)} » ne désigne ${trouves.length === 0 ? 'personne' : 'pas une seule personne'}`,
          )
          valide = false
        }
      }
    }
    if (!valide) continue
    const test = {
      echappee: e.echappee,
      consigne: e.consigne,
      role: e.role,
      personne: e.personne ?? null,
      params,
      instantane: e.instantane,
    }
    if ('modifications' in propose) {
      const modifications = validees(e)
      if (modifications.length === 0) {
        ecart(`${e.echappee} : aucune modification validée à reproduire`)
        continue
      }
      tests.push({ ...test, contient: [], modifications })
      continue
    }
    const attendus = citations(e.texte, noms).filter((c) => !contient(e.consigne, c))
    if (attendus.length === 0) {
      ecart(`${e.echappee} : rien à vérifier dans le texte montré (ni nombre ni nom)`)
      continue
    }
    tests.push({ ...test, contient: attendus })
  }
  for (const e of echappees.filter((x) => !vus.has(x.echappee))) {
    ecart(`l'échappée ${e.echappee} n'a pas de test`)
  }
  const { tests: _tests, ...reste } = propose
  const lu = GesteAppris.safeParse({ id: intention, ...reste, tests, origine })
  if (!lu.success) {
    ecart(`schéma : ${z.prettifyError(lu.error)}`)
    return { ecarts }
  }
  return { geste: lu.data, ecarts }
}

/**
 * Écrit `gestes/<id>.yaml` au statut `propose`, sans `validation`, et rend
 * son chemin relatif. Un fichier déjà là pour cet identifiant n'est jamais
 * écrasé : le nouveau s'écrit en `<id>-<date>.yaml`.
 */
export function ecrireGeste(dossierClient: string, geste: GesteAppris): string {
  const dossier = join(dossierClient, DOSSIER_GESTES)
  mkdirSync(dossier, { recursive: true })
  let nom = `${geste.id}.yaml`
  if (existsSync(join(dossier, nom))) {
    const base = `${geste.id}-${geste.origine.fabrique_le}`
    nom = `${base}.yaml`
    for (let n = 2; existsSync(join(dossier, nom)); n++) nom = `${base}-${n}.yaml`
  }
  const fichier: FichierGeste = { ...geste, statut: 'propose' }
  writeFileSync(join(dossier, nom), stringify(fichier))
  return join(DOSSIER_GESTES, nom)
}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

const relanceLecture = (raison: string) =>
  `La proposition précédente n'a pas pu être lue : ${raison}. Propose à nouveau.`
const relanceRequete = (nom: string, erreur: string) =>
  `La requête « ${nom} » a échoué : ${erreur}. Propose à nouveau.`

/**
 * Le message de relance : un `tool_result` en erreur par appel d'outil de la
 * réponse précédente (le protocole l'exige), le motif dans chacun ; du texte
 * simple quand la réponse n'appelait aucun outil.
 */
export function messageRelance(
  contenu: Anthropic.ContentBlock[],
  motif: string,
): Anthropic.MessageParam['content'] {
  const appels = contenu.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (appels.length === 0) return motif
  return appels.map((b) => ({
    type: 'tool_result' as const,
    tool_use_id: b.id,
    is_error: true,
    content: motif,
  }))
}

/**
 * La fabrication : un appel, relancé une fois au plus sur un échec de forme ou
 * une requête qui lève (P5) ; vérifiée en code à chaque proposition lue. Rend
 * le geste prêt à écrire (zéro écart), la proposition et ses écarts de fond,
 * ou l'échec. Jamais plus de deux appels.
 */
export async function fabriquerGeste(cadre: CadreFabrication): Promise<IssueFabrication> {
  const { ecrit } = cadre.intention
  const toutes = cadre.echappees.filter((e) => e.issue === (ecrit ? 'proposition' : 'reponse'))
  const reponses = toutes.filter(estMasquee)
  const anciennes = toutes.filter((e) => !estMasquee(e)).map((e) => e.echappee)
  let usage = USAGE_NUL
  let usageBorne = false
  let appels = 0
  const echec = (raison: string, injoignable = false): IssueFabrication => ({
    sorte: 'echec',
    raison,
    injoignable,
    usage,
    usageBorne,
    appels,
    relance: appels > 1,
  })
  if (ecrit && !cadre.declarations.operation) return echec(SANS_OPERATION)
  if (reponses.length < TESTS_MIN) {
    const ecartees = anciennes.length > 0 ? ` (${ANTERIEURE} : ${anciennes.join(', ')})` : ''
    return echec(
      `${reponses.length} ${ecrit ? 'proposition(s) validée(s)' : 'réponse(s) finie(s) proprement'}, ${TESTS_MIN} au moins${ecartees}`,
    )
  }
  const roles = [...new Set(reponses.map((e) => e.role))]
  const systeme = systemeFabriquer(
    cadre.intention,
    roles,
    schemaDesTables(cadre.copieVide),
    cadre.gestesExistants,
    cadre.declarations,
    cadre.domaine,
    cadre.criteres,
  )
  const validees: ValideesDe = (e) =>
    cadre.declarations.operation?.relire(cadre.journal, e.conversation) ?? []
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: messageFabriquer(reponses, cadre.declarations, validees) },
  ]
  const schema = schemaPropose(cadre.declarations, ecrit)
  const conversations = [...new Set(reponses.map((e) => e.conversation))]
  const consignes = reponses.map((e) => e.consigne)

  for (let appel = 1; appel <= APPELS_MAX; appel++) {
    const relance = appel > 1
    let reponse: ReponseModele
    try {
      reponse = await cadre.modele.appeler({
        systeme,
        messages,
        outils: [outilProposerGeste(cadre.declarations, ecrit)],
        effort: cadre.effort,
        maxTokens: cadre.maxTokens,
        unSeulOutil: true,
        flux: true,
      })
    } catch (erreur) {
      return echec(`${INJOIGNABLE} : ${message(erreur)}`, true)
    }
    appels++
    usage = additionner(usage, reponse.usage)
    if (reponse.usageBorne) usageBorne = true
    cadre.journaliser(reponse, relance)

    const lu = lire(reponse.message, schema)
    let motif: string
    let raison: string
    if (!lu.ok) {
      if (!lu.relance) return echec(relance ? `${lu.raison}, ${APRES_RELANCE}` : lu.raison)
      motif = relanceLecture(lu.raison)
      raison = lu.raison
    } else {
      const { geste, ecarts } = completerGeste(
        lu.propose,
        cadre.intention.id,
        reponses,
        cadre.personnes,
        {
          fabrique_le: cadre.fabriqueLe,
          modele: cadre.modele.id,
          cout_usd: cadre.cout(usage),
          conversations,
        },
        cadre.declarations,
        validees,
      )
      let rejeu: Rejeu = { ok: 0, total: lu.propose.tests.length }
      if (geste) {
        const v = await verifierGeste(geste, {
          dossierClient: cadre.dossierClient,
          copieVide: cadre.copieVide,
          consignes,
          personnes: cadre.personnes,
          declarations: cadre.declarations,
          gestesExistants: cadre.gestesExistants,
        })
        ecarts.push(...v.ecarts)
        rejeu = v.rejeu
      }
      const execution = ecarts.find((e) => e.erreur !== undefined)
      if (!execution) {
        return geste && ecarts.length === 0
          ? { sorte: 'geste', geste, rejeu, usage, usageBorne, appels, relance }
          : {
              sorte: 'ecarts',
              propose: lu.propose,
              ecarts,
              rejeu,
              usage,
              usageBorne,
              appels,
              relance,
            }
      }
      motif = relanceRequete(execution.requete ?? '?', execution.erreur ?? '?')
      raison = execution.texte
    }
    if (relance) return echec(`${raison}, ${APRES_RELANCE}`)
    messages.push(
      { role: 'assistant', content: reponse.message.content },
      { role: 'user', content: messageRelance(reponse.message.content, motif) },
    )
  }
  return echec('aucun appel')
}
