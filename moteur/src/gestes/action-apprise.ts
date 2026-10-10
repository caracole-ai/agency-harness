import { z } from 'zod'
import type { Action, Identite, Resultat } from '../conversation/actions'
import { creerCopie, type TableCopie } from '../echappee/copie'
import { executerRequete, type ParametresRequete, type ResultatRequete } from '../echappee/requete'
import type { Temporal } from '../temps/temporal'
import { CLES_PERIODE, type GesteAppris, rendre } from './geste-appris'

// Un geste appris devient une action comme les autres (PLAN-PROMOTION.md
// § 5.3) : la traduction le choisit, puis tout est déterministe et sans
// modèle (P2) : la copie du rôle, les requêtes avec leurs paramètres liés
// (P3), le texte rendu par le code. Pour le rôle `agent`, un paramètre
// `agent` vaut toujours celui qui parle (D4), comme pour les gestes codés.

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
function liaisonDe(
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
      const liaison = liaisonDe(geste, identite, params)
      const requetes: { nom: string; sql: string; lignes?: number; erreur?: string }[] = []
      const echec = (erreur: string): Resultat => ({
        texte: `${LECTURE_IMPOSSIBLE} : ${erreur}`,
        donnees: { echappee: null, requetes, erreur },
      })
      const c = creerCopie(copie(s, identite, maintenant))
      try {
        const resultats: Record<string, ResultatRequete> = {}
        for (const r of geste.requetes) {
          const resultat = await executerRequete(c, r.sql, liaison)
          if ('erreur' in resultat) {
            requetes.push({ nom: r.nom, sql: r.sql, erreur: resultat.erreur })
            return echec(`requête « ${r.nom} » : ${resultat.erreur}`)
          }
          resultats[r.nom] = resultat
          requetes.push({ nom: r.nom, sql: r.sql, lignes: resultat.lignes.length })
        }
        try {
          return { texte: rendre(geste, liaison, resultats), donnees: { echappee: null, requetes } }
        } catch (erreur) {
          return echec(message(erreur))
        }
      } finally {
        c.fermer()
      }
    },
  }
}
