import { z } from 'zod'
import type { Action, Identite, Resultat } from '../conversation/actions'
import { aCapacite } from '../conversation/roles'
import { type Copie, creerCopie, type TableCopie } from '../echappee/copie'
import { executerRequete, type ParametresRequete, type ResultatRequete } from '../echappee/requete'
import type { Temporal } from '../temps/temporal'
import {
  CLES_PERIODE,
  type DeclarationsGeste,
  ecritDe,
  type GesteAppris,
  modificationsDe,
  rendre,
  SansCandidat,
} from './geste-appris'
import type { OperationApprise } from './operation'
import { typeDe } from './types-parametre'

// Un geste appris devient une action comme les autres (PLAN-PROMOTION.md
// § 5.3) : la traduction le choisit, puis tout est déterministe et sans
// modèle (P2) : la copie du rôle, les requêtes avec leurs paramètres liés
// (P3), le texte rendu par le code. Pour un rôle qui ne désigne pas autrui,
// un paramètre qui désigne une personne vaut toujours celui qui parle (D4),
// comme pour les gestes codés ; une entité est résolue par le métier
// (PLAN-METIER-2.md M5). L'exécution sur une copie (`executerGeste`) est la
// même que celle du rejeu d'un test sur son instantané (§ 6.2). Un geste qui
// écrit ne fait que calculer ses modifications, par l'opération du métier
// (M6) : il ne touche à rien, la conversation les traite comme une
// proposition d'échappée (PLAN-PROMOTION.md § 10).

/** Le texte montré quand une requête ou le rendu échoue ; le détail va au journal. */
export const LECTURE_IMPOSSIBLE = "Je n'ai pas pu lire les données"
/** Le texte montré quand un geste qui écrit ne trouve rien à proposer pour une ligne : les données sont lues, rien n'est proposé. */
export const RIEN_A_PROPOSER = "Je n'ai rien à proposer"
/** Le texte montré quand une entité nommée ne désigne pas exactement un objet, suivi des identifiants des candidats ; rien n'est exécuté. */
export const LEQUEL = 'Lequel ?'

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/** Le schéma des paramètres d'un geste appris, à plat, par la sorte de chaque type : une période donne `du` et `au`. Chaque champ décrit, aucun optionnel (`nullable` pour une personne). */
export function parametresAppris(geste: GesteAppris, declarations: DeclarationsGeste): z.ZodObject {
  const champs: Record<string, z.ZodType> = {}
  for (const [nom, p] of Object.entries(geste.parametres)) {
    switch (typeDe(declarations.typesParametre, p.type).sorte) {
      case 'personne':
        champs[nom] = z.string().nullable().describe(p.description)
        break
      case 'date':
        champs[nom] = z.iso.date().describe(`${p.description}, AAAA-MM-JJ`)
        break
      case 'periode': {
        const [du, au] = CLES_PERIODE
        champs[du] = z.iso.date().describe(`${p.description} : le premier jour, AAAA-MM-JJ`)
        champs[au] = z.iso.date().describe(`${p.description} : le dernier jour, AAAA-MM-JJ`)
        break
      }
      case 'entite':
      case 'texte':
        champs[nom] = z.string().min(1).describe(p.description)
        break
      case 'nombre':
        champs[nom] = z.number().int().describe(p.description)
        break
    }
  }
  return z.strictObject(champs)
}

/** Les paramètres d'une sorte : leur nom et leur description. */
const deSorte = (
  geste: GesteAppris,
  declarations: DeclarationsGeste,
  sorte: 'personne' | 'entite',
): [string, string][] =>
  Object.entries(geste.parametres)
    .filter(([, p]) => typeDe(declarations.typesParametre, p.type).sorte === sorte)
    .map(([nom, p]) => [nom, p.description])

/** Les paramètres qui désignent une personne : la mention que le modèle écrit, résolue par le moteur. */
function personnesDe(
  geste: GesteAppris,
  declarations: DeclarationsGeste,
): Record<string, string> | undefined {
  const personnes = Object.fromEntries(deSorte(geste, declarations, 'personne'))
  return Object.keys(personnes).length > 0 ? personnes : undefined
}

/** Les valeurs à lier : les paramètres relus, une personne valant celui qui parle pour un rôle qui ne désigne pas autrui (PLAN-METIER-2.md M3, M5). */
export function liaisonDe(
  geste: GesteAppris,
  identite: Identite,
  params: Record<string, unknown>,
  declarations: DeclarationsGeste,
): ParametresRequete {
  const liaison: ParametresRequete = {}
  for (const [cle, v] of Object.entries(params)) {
    liaison[cle] = typeof v === 'string' || typeof v === 'number' ? v : null
  }
  if (!aCapacite(declarations.roles, identite, 'designe_autrui')) {
    for (const [nom] of deSorte(geste, declarations, 'personne')) {
      liaison[nom] = identite.personne ?? null
    }
  }
  return liaison
}

/**
 * Les entités nommées, résolues par le métier (PLAN-METIER-2.md M5) : un seul
 * candidat, son identifiant remplace la mention ; sinon, les identifiants des
 * candidats, et rien ne s'exécute. Un type sans `resoudre` garde la mention.
 */
function resoudreEntites(
  geste: GesteAppris,
  declarations: DeclarationsGeste,
  liaison: ParametresRequete,
  s: unknown,
): { liaison: ParametresRequete } | { candidats: string[] } {
  const resolue: ParametresRequete = { ...liaison }
  for (const [nom] of deSorte(geste, declarations, 'entite')) {
    const p = geste.parametres[nom]
    const mention = resolue[nom]
    const resoudre = p && typeDe(declarations.typesParametre, p.type).resoudre
    if (!resoudre || typeof mention !== 'string') continue
    const candidats = resoudre(mention, s)
    const [seul] = candidats
    if (candidats.length !== 1 || !seul) return { candidats: candidats.map((c) => c.id) }
    resolue[nom] = seul.id
  }
  return { liaison: resolue }
}

/** Une requête du geste telle qu'exécutée : ce qui va au journal. */
export interface RequeteExecutee {
  nom: string
  sql: string
  lignes?: number
  erreur?: string
}

/** Ce qu'une exécution laisse : le texte rendu et ses résultats (et, pour un geste qui écrit, ses modifications), ou l'erreur (celle d'une requête nommée, ou du rendu : les résultats sont là, le gabarit se vérifie dessus). */
export type ExecutionGeste =
  | {
      texte: string
      requetes: RequeteExecutee[]
      resultats: Record<string, ResultatRequete>
      modifications?: unknown[]
    }
  | {
      erreur: string
      requete?: string
      /** Un geste qui écrit n'a rien trouvé à proposer pour une ligne. */
      sansCandidat?: true
      requetes: RequeteExecutee[]
      resultats?: Record<string, ResultatRequete>
    }

/** Les requêtes du geste sur une copie, avec leurs valeurs liées, puis le rendu par le code ; rien d'autre (P2, P3). Un geste qui écrit fait ses modifications par l'opération du métier. */
export async function executerGeste(
  geste: GesteAppris,
  copie: Copie,
  liaison: ParametresRequete,
  operation: OperationApprise<unknown> | undefined,
): Promise<ExecutionGeste> {
  const requetes: RequeteExecutee[] = []
  const resultats: Record<string, ResultatRequete> = {}
  for (const r of geste.requetes) {
    const resultat = await executerRequete(copie, r.sql, liaison)
    if ('erreur' in resultat) {
      requetes.push({ nom: r.nom, sql: r.sql, erreur: resultat.erreur })
      return { erreur: resultat.erreur, requete: r.nom, requetes }
    }
    resultats[r.nom] = resultat
    requetes.push({ nom: r.nom, sql: r.sql, lignes: resultat.lignes.length })
  }
  try {
    const texte = rendre(geste, liaison, resultats)
    return ecritDe(geste)
      ? { texte, requetes, resultats, modifications: modificationsDe(geste, resultats, operation) }
      : { texte, requetes, resultats }
  } catch (erreur) {
    return {
      erreur: message(erreur),
      ...(erreur instanceof SansCandidat ? { sansCandidat: true as const } : {}),
      requetes,
      resultats,
    }
  }
}

export function actionApprise<S>(
  geste: GesteAppris,
  copie: (s: S, identite: Identite, maintenant: Temporal.ZonedDateTime) => TableCopie[],
  declarations: DeclarationsGeste,
): Action<S, Record<string, unknown>> {
  const personnes = personnesDe(geste, declarations)
  const ecrit = ecritDe(geste)
  const { operation } = declarations
  return {
    id: geste.id,
    description: geste.description,
    parametres: parametresAppris(geste, declarations) as z.ZodType<Record<string, unknown>>,
    ...(personnes ? { personnes } : {}),
    roles: [...geste.roles],
    ecrit,
    ...(ecrit ? { propose: true as const } : {}),
    // Jamais montré : un geste appris qui lit n'attend pas de « oui », un geste
    // qui écrit attend celui de sa proposition.
    reformuler: () => `Je réponds à : ${geste.description}.`,
    executer: async (s, identite, params, maintenant): Promise<Resultat> => {
      const resolue = resoudreEntites(
        geste,
        declarations,
        liaisonDe(geste, identite, params, declarations),
        s,
      )
      if ('candidats' in resolue) {
        return {
          texte:
            resolue.candidats.length > 0 ? `${LEQUEL} ${resolue.candidats.join(', ')}` : LEQUEL,
          donnees: { echappee: null, requetes: [], candidats: resolue.candidats },
        }
      }
      const c = creerCopie(copie(s, identite, maintenant))
      try {
        const e = await executerGeste(geste, c, resolue.liaison, operation)
        if ('erreur' in e) {
          const erreur =
            e.requete !== undefined ? `requête « ${e.requete} » : ${e.erreur}` : e.erreur
          return {
            texte: `${e.sansCandidat ? RIEN_A_PROPOSER : LECTURE_IMPOSSIBLE} : ${erreur}`,
            donnees: { echappee: null, requetes: e.requetes, erreur },
          }
        }
        const donnees = { echappee: null, requetes: e.requetes }
        // Aucune ligne : rien à proposer, le texte `vide` le dit.
        if (e.modifications === undefined || e.modifications.length === 0 || !operation) {
          return { texte: e.texte, donnees }
        }
        return {
          texte: e.texte,
          donnees,
          modifications: e.modifications.map((m) => ({ type: operation.nom, ...(m as object) })),
        }
      } finally {
        c.fermer()
      }
    },
  }
}
