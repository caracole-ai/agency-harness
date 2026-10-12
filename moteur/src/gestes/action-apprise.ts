import { z } from 'zod'
import type { Action, Identite, Resultat } from '../conversation/actions'
import { aCapacite, type RoleDeclare } from '../conversation/roles'
import { type Copie, creerCopie, type TableCopie } from '../echappee/copie'
import { executerRequete, type ParametresRequete, type ResultatRequete } from '../echappee/requete'
import type { Temporal } from '../temps/temporal'
import {
  CLES_PERIODE,
  ecritDe,
  type GesteAppris,
  OPERATION_REAFFECTER,
  type Reaffectation,
  reaffectationsDe,
  rendre,
  SansCandidat,
} from './geste-appris'

// Un geste appris devient une action comme les autres (PLAN-PROMOTION.md
// § 5.3) : la traduction le choisit, puis tout est déterministe et sans
// modèle (P2) : la copie du rôle, les requêtes avec leurs paramètres liés
// (P3), le texte rendu par le code. Pour le rôle `agent`, un paramètre
// `agent` vaut toujours celui qui parle (D4), comme pour les gestes codés.
// L'exécution sur une copie (`executerGeste`) est la même que celle du rejeu
// d'un test sur son instantané (§ 6.2). Un geste qui écrit ne fait que
// calculer ses réaffectations : il ne touche à rien, la conversation les
// traite comme une proposition d'échappée (PLAN-PROMOTION.md § 10).

/** Le texte montré quand une requête ou le rendu échoue ; le détail va au journal. */
export const LECTURE_IMPOSSIBLE = "Je n'ai pas pu lire les données"
/** Le texte montré quand un geste qui écrit ne trouve personne pour une vacation : les données sont lues, rien n'est proposé. */
export const RIEN_A_PROPOSER = "Je n'ai rien à proposer"

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

/** Les valeurs à lier : les paramètres relus, une personne valant celui qui parle pour un rôle qui ne désigne pas autrui (PLAN-METIER-2.md M3). */
export function liaisonDe(
  geste: GesteAppris,
  identite: Identite,
  params: Record<string, unknown>,
  roles: RoleDeclare[],
): ParametresRequete {
  const liaison: ParametresRequete = {}
  for (const [cle, v] of Object.entries(params)) {
    liaison[cle] = typeof v === 'string' || typeof v === 'number' ? v : null
  }
  if (!aCapacite(roles, identite, 'designe_autrui')) {
    for (const [nom, p] of Object.entries(geste.parametres)) {
      if (p.type === 'agent') liaison[nom] = identite.personne ?? null
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

/** Ce qu'une exécution laisse : le texte rendu et ses résultats (et, pour un geste qui écrit, ses réaffectations), ou l'erreur (celle d'une requête nommée, ou du rendu : les résultats sont là, le gabarit se vérifie dessus). */
export type ExecutionGeste =
  | {
      texte: string
      requetes: RequeteExecutee[]
      resultats: Record<string, ResultatRequete>
      reaffectations?: Reaffectation[]
    }
  | {
      erreur: string
      requete?: string
      /** Un geste qui écrit n'a trouvé personne pour une vacation. */
      sansCandidat?: true
      requetes: RequeteExecutee[]
      resultats?: Record<string, ResultatRequete>
    }

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
    const texte = rendre(geste, liaison, resultats)
    return ecritDe(geste)
      ? { texte, requetes, resultats, reaffectations: reaffectationsDe(geste, resultats) }
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
  roles: RoleDeclare[],
): Action<S, Record<string, unknown>> {
  const personnes = personnesDe(geste)
  const ecrit = ecritDe(geste)
  return {
    id: geste.id,
    description: geste.description,
    parametres: parametresAppris(geste) as z.ZodType<Record<string, unknown>>,
    ...(personnes ? { personnes } : {}),
    roles: [...geste.roles],
    ecrit,
    ...(ecrit ? { propose: true as const } : {}),
    // Jamais montré : un geste appris qui lit n'attend pas de « oui », un geste
    // qui écrit attend celui de sa proposition.
    reformuler: () => `Je réponds à : ${geste.description}.`,
    executer: async (s, identite, params, maintenant): Promise<Resultat> => {
      const c = creerCopie(copie(s, identite, maintenant))
      try {
        const e = await executerGeste(geste, c, liaisonDe(geste, identite, params, roles))
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
        if (e.reaffectations === undefined || e.reaffectations.length === 0) {
          return { texte: e.texte, donnees }
        }
        return {
          texte: e.texte,
          donnees,
          modifications: e.reaffectations.map((r) => ({ type: OPERATION_REAFFECTER, ...r })),
        }
      } finally {
        c.fermer()
      }
    },
  }
}
