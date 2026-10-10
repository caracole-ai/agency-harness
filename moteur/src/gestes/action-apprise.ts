import { z } from 'zod'
import type { Action, Identite, Resultat } from '../conversation/actions'
import { type Copie, creerCopie, type TableCopie } from '../echappee/copie'
import { executerRequete, type ParametresRequete, type ResultatRequete } from '../echappee/requete'
import type { Temporal } from '../temps/temporal'
import { CLES_PERIODE, type GesteAppris, rendre } from './geste-appris'

// Un geste appris devient une action comme les autres (PLAN-PROMOTION.md
// § 5.3) : la traduction le choisit, puis tout est déterministe et sans
// modèle (P2) : la copie du rôle, les requêtes avec leurs paramètres liés
// (P3), le texte rendu par le code. Pour le rôle `agent`, un paramètre
// `agent` vaut toujours celui qui parle (D4), comme pour les gestes codés.
// L'exécution sur une copie (`executerGeste`) est la même que celle du rejeu
// d'un test sur son instantané (§ 6.2).

/** Le texte montré quand une requête ou le rendu échoue ; le détail va au journal. */
export const LECTURE_IMPOSSIBLE = "Je n'ai pas pu lire les données"

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/** Le schéma des paramètres d'un geste appris, à plat : une période donne `du` et `au`. Chaque champ décrit, aucun optionnel (`nullable` pour l'agent). */
export function parametresAppris(geste: GesteAppris): z.ZodObject {
  const champs: Record<string, z.ZodType> = {}
  for (const [nom, p] of Object.entries(geste.parametres)) {
    switch (p.type) {
      case 'agent':
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
      case 'site':
      case 'poste':
        champs[nom] = z.string().min(1).describe(p.description)
        break
      case 'nombre':
        champs[nom] = z.number().int().describe(p.description)
        break
    }
  }
  return z.strictObject(champs)
}

/** Les paramètres qui désignent une personne : la mention que le modèle écrit, résolue par le moteur. */
function personnesDe(geste: GesteAppris): Record<string, string> | undefined {
  const personnes = Object.fromEntries(
    Object.entries(geste.parametres)
      .filter(([, p]) => p.type === 'agent')
      .map(([nom, p]) => [nom, p.description]),
  )
  return Object.keys(personnes).length > 0 ? personnes : undefined
}

/** Les valeurs à lier : les paramètres relus, un agent valant celui qui parle pour le rôle `agent`. */
export function liaisonDe(
  geste: GesteAppris,
  identite: Identite,
  params: Record<string, unknown>,
): ParametresRequete {
  const liaison: ParametresRequete = {}
  for (const [cle, v] of Object.entries(params)) {
    liaison[cle] = typeof v === 'string' || typeof v === 'number' ? v : null
  }
  if (identite.role === 'agent') {
    for (const [nom, p] of Object.entries(geste.parametres)) {
      if (p.type === 'agent') liaison[nom] = identite.agent ?? null
    }
  }
  return liaison
}

/** Une requête du geste telle qu'exécutée : ce qui va au journal. */
export interface RequeteExecutee {
  nom: string
  sql: string
  lignes?: number
  erreur?: string
}

/** Ce qu'une exécution laisse : le texte rendu et ses résultats, ou l'erreur (celle d'une requête nommée, ou du rendu). */
export type ExecutionGeste =
  | { texte: string; requetes: RequeteExecutee[]; resultats: Record<string, ResultatRequete> }
  | { erreur: string; requete?: string; requetes: RequeteExecutee[] }

/** Les requêtes du geste sur une copie, avec leurs valeurs liées, puis le rendu par le code ; rien d'autre (P2, P3). */
export async function executerGeste(
  geste: GesteAppris,
  copie: Copie,
  liaison: ParametresRequete,
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
    return { texte: rendre(geste, liaison, resultats), requetes, resultats }
  } catch (erreur) {
    return { erreur: message(erreur), requetes }
  }
}

export function actionApprise<S>(
  geste: GesteAppris,
  copie: (s: S, identite: Identite, maintenant: Temporal.ZonedDateTime) => TableCopie[],
): Action<S, Record<string, unknown>> {
  const personnes = personnesDe(geste)
  return {
    id: geste.id,
    description: geste.description,
    parametres: parametresAppris(geste) as z.ZodType<Record<string, unknown>>,
    ...(personnes ? { personnes } : {}),
    roles: [...geste.roles],
    ecrit: false,
    // Jamais montré : un geste appris lit, il n'attend pas de « oui ».
    reformuler: () => `Je réponds à : ${geste.description}.`,
    executer: async (s, identite, params, maintenant): Promise<Resultat> => {
      const c = creerCopie(copie(s, identite, maintenant))
      try {
        const e = await executerGeste(geste, c, liaisonDe(geste, identite, params))
        if ('erreur' in e) {
          const erreur =
            e.requete !== undefined ? `requête « ${e.requete} » : ${e.erreur}` : e.erreur
          return {
            texte: `${LECTURE_IMPOSSIBLE} : ${erreur}`,
            donnees: { echappee: null, requetes: e.requetes, erreur },
          }
        }
        return { texte: e.texte, donnees: { echappee: null, requetes: e.requetes } }
      } finally {
        c.fermer()
      }
    },
  }
}
