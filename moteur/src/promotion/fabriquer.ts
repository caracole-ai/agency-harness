import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { stringify } from 'yaml'
import { z } from 'zod'
import { DESCRIPTION_MAX, type Intention, type Role, schemaJson } from '../conversation/actions'
import {
  correspondances,
  type Designable,
  distance,
  normaliserNom,
} from '../conversation/designation'
import { entreDonnees, FRONTIERE, jourSemaine } from '../conversation/traduire'
import { semaineDe } from '../echappee/boucle'
import { creerCopie, type TableCopie } from '../echappee/copie'
import type { Instantane } from '../echappee/echappee'
import { citations, contient } from '../echappee/reponse'
import { executerGeste, liaisonDe } from '../gestes/action-apprise'
import {
  CLES_PERIODE,
  clesDe,
  DOSSIER_GESTES,
  type FichierGeste,
  GesteAppris,
  ModificationsApprises,
  type Reaffectation,
  TESTS_MIN,
  type TestAppris,
  TYPES_PARAMETRE,
  verifierGabarit,
} from '../gestes/geste-appris'
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
// depuis les propositions validées par le patron : le geste rend une
// réaffectation par ligne, et le rejeu compare les réaffectations, pas un
// texte (PLAN-PROMOTION.md § 10, PLAN-GENERAL.md G5).

export const OUTIL_PROPOSER_GESTE = 'proposer_geste'
/** Deux appels au plus : le premier, et une relance (P5). */
export const APPELS_MAX = 2
/** Deux descriptions à cette distance normalisée (Damerau) ou moins se ressemblent (§ 6.2, écart 5). */
export const RESSEMBLANCE_MAX = 0.5
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
            'les valeurs que cette demande donne aux paramètres, par clé (du et au pour une période) ; pour un agent, la personne telle que la demande l’écrit, ou null',
          ),
      }),
    )
    .min(1)
    .describe('une entrée par demande ci-dessous'),
})
export type GestePropose = z.infer<typeof GestePropose>

/** Ce que le modèle propose pour une intention qui écrit : le même geste, plus ses modifications. */
export const GesteProposeEcriture = GestePropose.extend({
  modifications: ModificationsApprises.describe(
    'pour_chaque : la requête qui rend une ligne par réaffectation ; reaffecter : ses deux colonnes, vacation (vacations.id) et agent (agents.id de celui qui la prend)',
  ),
})
export type GesteProposeEcriture = z.infer<typeof GesteProposeEcriture>

/** Un écart de la vérification, en une phrase ; `erreur` quand une requête a levé : l'écart d'exécution, celui qui relance (P5). */
export interface EcartGeste {
  texte: string
  requete?: string
  erreur?: string
}

/** Le rejeu des tests : combien reproduisent le texte validé, sur combien. */
export interface Rejeu {
  ok: number
  total: number
}

export interface CadreFabrication {
  modele: Modele
  effort: Effort
  /** Le plafond par demande de la config, jamais un nombre en dur. */
  maxTokens: number
  intention: Intention
  /** Les échappées finies proprement de cette intention ; seules les réponses servent, ou les propositions validées pour une intention qui écrit. */
  echappees: EchappeeJournalisee[]
  gestesExistants: { id: string; description: string }[]
  /** Les personnes que le patron peut désigner : pour résoudre un agent des tests et extraire les noms cités. */
  personnes: Designable[]
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

const TYPES_EN_MOTS: Record<(typeof TYPES_PARAMETRE)[number], string> = {
  agent:
    'une personne nommée dans la demande, ou null pour celui qui parle ; liée par son identifiant (agents.id)',
  date: 'un jour, AAAA-MM-JJ',
  periode: `deux bornes, ${CLES_PERIODE.join(' et ')}, AAAA-MM-JJ, les deux incluses ; un geste n'en a qu'une`,
  site: 'un site, tel que les données l’écrivent',
  poste: 'un poste, tel que les données l’écrivent',
  nombre: 'un entier',
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

/** Le système de la fabrication (§ 6.1). Rien de volatil : il se met en cache. Aucune donnée du client, seulement le schéma des tables. */
export function systemeFabriquer(
  intention: Intention,
  roles: Role[],
  tables: string,
  gestesExistants: { id: string; description: string }[],
): string {
  const { ecrit } = intention
  return [
    ecrit
      ? "Tu fabriques un geste pour l'outil de planning d'une entreprise de sécurité privée. La même sorte de demande est revenue plusieurs fois ; chaque fois, un modèle a lu une copie des données par des requêtes SQL, a proposé des réaffectations de vacations, et le patron les a validées. Le geste proposera désormais ces réaffectations sans modèle, pour ces demandes et celles de la même sorte : des requêtes SQL paramétrées, dont une rend une ligne par réaffectation ; le code fait passer la proposition par les règles, puis par l'accord du patron et de chaque agent."
      : "Tu fabriques un geste pour l'outil de planning d'une entreprise de sécurité privée. La même sorte de demande est revenue plusieurs fois ; chaque fois, un modèle a lu une copie des données par des requêtes SQL et a répondu. Le geste répondra désormais sans modèle, à ces demandes et à celles de la même sorte : des requêtes SQL paramétrées, un gabarit rendu par le code.",
    '',
    `Le geste : ${intention.id} : ${intention.description}. Sa description, en une phrase de ${DESCRIPTION_MAX} caractères au plus, garde toute cette portée et ne ressemble à aucun geste existant :`,
    ...gestesExistants.map((g) => `- ${g.id} : ${g.description}`),
    '',
    `Les paramètres, d'une liste fermée de types, pas de texte libre : ${TYPES_PARAMETRE.map((t) => `${t} (${TYPES_EN_MOTS[t]})`).join(' ; ')}. Chaque paramètre a un nom en minuscules et une description pour le modèle qui lira la demande.`,
    '',
    `Les requêtes, une à cinq, nommées : SQLite, en lecture (SELECT ou WITH), sur les tables ci-dessous. Chaque valeur qui vient de la demande est un paramètre lié (:agent, :${CLES_PERIODE.join(', :')}, :nom_du_parametre), jamais une valeur en dur : ni identifiant, ni nom, ni date, ni site. Fais faire les sommes et les comptes par SQL.`,
    '',
    ...(ecrit
      ? [
          'Les modifications : pour_chaque, le nom de la requête qui rend une ligne par réaffectation ; reaffecter, les noms de ses deux colonnes : vacation (vacations.id, V-07) et agent (agents.id de l’agent qui la prend, A-9). Pour chaque demande, le geste propose exactement les vacations validées, chacune à un agent que le patron a validé pour elle ; aucune de plus. Ce qui a fait choisir l’agent (qui est libre, ce que les vérifications ont refusé, les préférences du patron) se code en SQL.',
          '',
          'La réponse : tableau, le nom de la requête de pour_chaque, ligne à null ; et vide, la phrase montrée quand elle ne rend aucune ligne (rien à changer).',
          '',
          'Les rôles : patron seulement ; un agent ne propose pas de réaffectation.',
          '',
          'Les tests : une entrée par demande, avec les valeurs que cette demande donne à chaque paramètre.',
          '',
          'Dans les demandes, une personne est écrite par son identifiant (A-1), qui tient lieu de son nom ; la colonne agent rend agents.id, jamais agents.nom.',
        ]
      : [
          'La réponse, une forme et une seule : ligne, une phrase qui cite {{requete.colonne}} (la première ligne du résultat de cette requête) et {{parametre}} ({{du}}, {{au}} pour une période), tableau à null ; ou tableau, le nom d’une requête rendue en tableau, ligne à null. Et vide : la phrase montrée quand une requête citée ne rend aucune ligne. Pas de condition, pas de boucle, pas de calcul dans le gabarit. Chaque nombre et chaque nom de chaque réponse montrée doit apparaître dans ce que le geste rend ; si une réponse détaille, choisis un tableau qui rend le détail.',
          '',
          `Les rôles : ceux des demandes (${roles.join(', ')}), au moins ; agent seulement si la demande a un sens pour un agent, qui ne voit que ses propres données.`,
          '',
          'Les tests : une entrée par demande, avec les valeurs que cette demande donne à chaque paramètre.',
          '',
          'Dans les demandes et les réponses, une personne est écrite par son identifiant (A-1), qui tient lieu de son nom ; les données que le geste lira portent les vrais noms (agents.nom) : là où une réponse cite une personne, le geste rend agents.nom.',
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

/** L'outil de la fabrication : le schéma du geste proposé, strict ; avec ses modifications pour une intention qui écrit. */
export function outilProposerGeste(ecrit = false): Anthropic.Tool {
  return {
    name: OUTIL_PROPOSER_GESTE,
    description: ecrit
      ? 'Proposer le geste : ses paramètres, ses requêtes, ses modifications, sa réponse, ses tests.'
      : 'Proposer le geste : ses paramètres, ses requêtes, sa réponse, ses tests.',
    input_schema: schemaJson(ecrit ? GesteProposeEcriture : GestePropose),
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

/** Les réaffectations d'une proposition journalisée, lues sans connaître le métier ; rien si elles n'en ont pas la forme. */
function reaffectationsJournalisees(e: EchappeeJournalisee): Reaffectation[] | undefined {
  const lu = z
    .array(z.looseObject({ vacation: z.string().min(1), agent: z.string().min(1) }))
    .min(1)
    .safeParse(e.modifications)
  return lu.success ? lu.data.map(({ vacation, agent }) => ({ vacation, agent })) : undefined
}

/** Une réaffectation en une ligne, pour le modèle et pour un écart : `V-03 → A-11`. */
const enLigne = (r: Reaffectation) => `${r.vacation} → ${r.agent}`

/**
 * Le message : les échappées entières entre les balises des données, telles
 * que le modèle de l'échappée les a lues et écrites, sans aucun nom (P10,
 * PLAN-PSEUDONYMES.md S5).
 */
export function messageFabriquer(echappees: EchappeeMasquee[]): string {
  const blocs = echappees.map((e) => {
    const z = aParis(e.horodatage)
    const { lundi, dimanche } = semaineDe(z)
    const moment = `${z.toPlainDate().toString()}T${deux(z.hour)}:${deux(z.minute)} (${jourSemaine(z)}) ; semaine en cours du ${lundi} au ${dimanche}`
    return [
      `### ${e.echappee}`,
      `Demandeur : ${e.role === 'patron' ? 'le patron' : `l'agent ${e.agent ?? '?'}`}`,
      `Moment : ${moment}`,
      `Consigne : ${e.consigneModele}`,
      ...e.requetes.flatMap((r, i) => [
        `Requête ${i + 1} :`,
        r.sql,
        `Résultat ${i + 1} :`,
        r.erreur !== undefined ? `erreur : ${r.erreur}` : r.sortie,
      ]),
      ...(e.verifications ?? []).flatMap((v, i) => [
        `Vérification ${i + 1} :`,
        v.modifications,
        `Résultat de la vérification ${i + 1} :`,
        v.erreur !== undefined ? `erreur : ${v.erreur}` : v.sortie,
      ]),
      ...('texteModele' in e
        ? ['Réponse montrée :', e.texteModele]
        : [
            'Réaffectations validées par le patron (vacation → agent) :',
            ...(reaffectationsJournalisees(e) ?? []).map(enLigne),
          ]),
    ].join('\n')
  })
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
function lire(message: Anthropic.Message, ecrit: boolean): Lecture {
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
  const lu = (ecrit ? GesteProposeEcriture : GestePropose).safeParse(relireNuls(bloc.input))
  return lu.success
    ? { ok: true, propose: lu.data }
    : { ok: false, raison: `forme : ${z.prettifyError(lu.error)}`, relance: true }
}

const estId = (v: unknown, personnes: Designable[]) =>
  typeof v === 'string' && personnes.some((p) => p.id === v)

/**
 * Complète la proposition en un geste (§ 6.1) : l'identifiant est
 * l'intention ; chaque test cite une échappée d'origine, dont il reçoit la
 * consigne, le rôle, l'agent, l'instantané, et `contient` : les nombres et
 * les noms du texte montré que la consigne ne portait pas déjà ; pour un
 * geste qui écrit, `modifications` : les réaffectations que le patron a
 * validées. Un agent des paramètres est résolu comme pour les gestes codés ;
 * pour le rôle `agent`, c'est celui qui parle (D4). Chaque échappée d'origine
 * a son test (écart 2).
 */
export function completerGeste(
  propose: GestePropose | GesteProposeEcriture,
  intention: string,
  echappees: EchappeeJournalisee[],
  personnes: Designable[],
  origine: GesteAppris['origine'],
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
      const type = propose.parametres[cle]?.type
      if (type !== 'agent') {
        params[cle] = v
        continue
      }
      if (e.role === 'agent') {
        params[cle] = e.agent ?? null
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
      agent: e.agent ?? null,
      params,
      instantane: e.instantane,
    }
    if ('modifications' in propose) {
      const validees = reaffectationsJournalisees(e)
      if (!validees) {
        ecart(`${e.echappee} : aucune réaffectation validée à reproduire`)
        continue
      }
      tests.push({ ...test, contient: [], modifications: validees })
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
 * Le rejeu d'un test sur son instantané : le texte rendu et ce qui y manque,
 * ou l'erreur. Pour un geste qui écrit (PLAN-PROMOTION.md § 10), le texte est
 * la liste des réaffectations rendues : chaque vacation du test doit y être
 * (`manque` sinon), et chaque réaffectation rendue doit être une que le
 * patron a validée pour cette vacation, dans ce test ou un autre du geste
 * (`enTrop` sinon, comme une vacation de plus) : le patron qui a validé deux
 * agents pour la même vacation les a acceptés tous les deux.
 */
export async function rejouerTest(
  geste: GesteAppris,
  test: TestAppris,
  dossierClient: string,
): Promise<
  { texte: string; manque: string[]; enTrop: string[] } | { erreur: string; requete?: string }
> {
  const chemin = join(dossierClient, test.instantane)
  if (!existsSync(chemin)) return { erreur: `instantané absent : ${test.instantane}` }
  const instantane = JSON.parse(readFileSync(chemin, 'utf8')) as Instantane
  if (!Array.isArray(instantane.tables)) {
    return { erreur: `instantané sans tables : ${test.instantane}` }
  }
  const copie = creerCopie(instantane.tables)
  try {
    const identite = { role: test.role, ...(test.agent !== null ? { agent: test.agent } : {}) }
    const e = await executerGeste(geste, copie, liaisonDe(geste, identite, test.params))
    if ('erreur' in e) {
      return { erreur: e.erreur, ...(e.requete !== undefined ? { requete: e.requete } : {}) }
    }
    if (e.reaffectations === undefined) {
      return {
        texte: e.texte,
        manque: test.contient.filter((mot) => !contient(e.texte, mot)),
        enTrop: [],
      }
    }
    const attendues = test.modifications ?? []
    const vacations = attendues.map((r) => r.vacation)
    const validees = new Set(geste.tests.flatMap((t) => (t.modifications ?? []).map(enLigne)))
    const rendues = e.reaffectations
    return {
      texte: rendues.length > 0 ? rendues.map(enLigne).join(', ') : 'aucune réaffectation',
      manque: attendues.filter((a) => !rendues.some((r) => r.vacation === a.vacation)).map(enLigne),
      enTrop: rendues
        .filter(
          (r, i) =>
            !vacations.includes(r.vacation) ||
            !validees.has(enLigne(r)) ||
            rendues.findIndex((x) => x.vacation === r.vacation) !== i,
        )
        .map(enLigne),
    }
  } finally {
    copie.fermer()
  }
}

/** Une chaîne SQL entre apostrophes, `''` compris. */
const LITTERAL = /'((?:[^']|'')*)'/g
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Ce qu'un geste a de travers, en code (§ 6.2) : gabarit sur la copie vide (1), rejeu de chaque test (3), valeurs en dur (4), description (5). */
export async function verifierGeste(
  geste: GesteAppris,
  contexte: {
    dossierClient: string
    copieVide: TableCopie[]
    consignes: string[]
    personnes: Designable[]
    gestesExistants: { id: string; description: string }[]
  },
): Promise<{ ecarts: EcartGeste[]; rejeu: Rejeu }> {
  const ecarts: EcartGeste[] = []
  const rejeu: Rejeu = { ok: 0, total: geste.tests.length }

  // 1. Le gabarit, puis les colonnes de chaque requête, lues sur la copie vide.
  const statiques = verifierGabarit(geste)
  const vide = creerCopie(contexte.copieVide)
  let colonnes: Map<string, string[]> | undefined = new Map()
  try {
    const nuls = Object.fromEntries(clesDe(geste).map((c) => [c, null]))
    const e = await executerGeste(geste, vide, nuls)
    if ('erreur' in e && e.requete !== undefined) {
      ecarts.push({
        texte: `la requête « ${e.requete} » échoue : ${e.erreur}`,
        requete: e.requete,
        erreur: e.erreur,
      })
      colonnes = undefined
    } else if (e.resultats) {
      // Les requêtes ont tourné, même si le rendu a levé : les colonnes se lisent, l'écart sera précis.
      for (const [nom, r] of Object.entries(e.resultats)) {
        if (!('erreur' in r)) colonnes.set(nom, r.colonnes)
      }
    }
  } finally {
    vide.fermer()
  }
  ecarts.push(
    ...(colonnes ? verifierGabarit(geste, colonnes) : statiques).map((texte) => ({ texte })),
  )
  // Une requête qui ne s'exécute même pas sur la copie vide : rien d'autre à vérifier.
  if (!colonnes) return { ecarts, rejeu }

  // 3. Chaque test rejoué sur son instantané.
  for (const t of geste.tests) {
    const r = await rejouerTest(geste, t, contexte.dossierClient)
    if ('erreur' in r) {
      ecarts.push({
        texte: `${t.echappee} : ${r.requete !== undefined ? `la requête « ${r.requete} » échoue : ` : ''}${r.erreur}`,
        ...(r.requete !== undefined ? { requete: r.requete, erreur: r.erreur } : {}),
      })
      continue
    }
    if (r.manque.length > 0 || r.enTrop.length > 0) {
      const parties = [
        ...(r.manque.length > 0
          ? [`ne contient pas ${r.manque.map((m) => `« ${m} »`).join(', ')}`]
          : []),
        ...(r.enTrop.length > 0
          ? [`propose ${r.enTrop.map((m) => `« ${m} »`).join(', ')}, jamais validé`]
          : []),
      ]
      ecarts.push({
        texte: `${t.echappee} : le rejeu ${parties.join(' et ')} (rendu : « ${r.texte} »)`,
      })
      continue
    }
    rejeu.ok += 1
  }

  // 4. Aucune valeur en dur venue d'une consigne, aucune date, aucune personne.
  const consignes = contexte.consignes.map(normaliserNom)
  for (const r of geste.requetes) {
    for (const [, brut] of r.sql.matchAll(LITTERAL)) {
      const litteral = (brut ?? '').replace(/''/g, "'").replace(/[%_]/g, '').trim()
      if (litteral.length < 2) continue
      if (DATE_ISO.test(litteral)) {
        ecarts.push({ texte: `la requête « ${r.nom} » code une date en dur : '${litteral}'` })
      } else if (correspondances(litteral, contexte.personnes).length > 0) {
        ecarts.push({ texte: `la requête « ${r.nom} » code une personne en dur : '${litteral}'` })
      } else if (consignes.some((c) => c.includes(normaliserNom(litteral)))) {
        ecarts.push({
          texte: `la requête « ${r.nom} » code une valeur venue d'une consigne : '${litteral}'`,
        })
      }
    }
  }

  // 5. Une description qui ne ressemble à aucun geste existant.
  const description = normaliserNom(geste.description)
  for (const g of contexte.gestesExistants.filter((x) => x.id !== geste.id)) {
    const autre = normaliserNom(g.description)
    const d = distance(description, autre) / Math.max(description.length, autre.length, 1)
    if (d <= RESSEMBLANCE_MAX) {
      ecarts.push({
        texte: `la description ressemble à celle de ${g.id} (distance ${d.toFixed(2)})`,
      })
    }
  }
  return { ecarts, rejeu }
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
  )
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: messageFabriquer(reponses) }]
  const conversations = [...new Set(reponses.map((e) => e.conversation))]
  const consignes = reponses.map((e) => e.consigne)

  for (let appel = 1; appel <= APPELS_MAX; appel++) {
    const relance = appel > 1
    let reponse: ReponseModele
    try {
      reponse = await cadre.modele.appeler({
        systeme,
        messages,
        outils: [outilProposerGeste(ecrit)],
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

    const lu = lire(reponse.message, ecrit)
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
      )
      let rejeu: Rejeu = { ok: 0, total: lu.propose.tests.length }
      if (geste) {
        const v = await verifierGeste(geste, {
          dossierClient: cadre.dossierClient,
          copieVide: cadre.copieVide,
          consignes,
          personnes: cadre.personnes,
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
