import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  correspondances,
  type Designable,
  distance,
  normaliserNom,
} from '../conversation/designation'
import { creerCopie, type TableCopie } from '../echappee/copie'
import type { Instantane } from '../echappee/echappee'
import { contient } from '../echappee/reponse'
import { executerGeste, liaisonDe } from './action-apprise'
import {
  clesDe,
  type DeclarationsGeste,
  type GesteAppris,
  personneDuTest,
  type TestAppris,
  verifierGabarit,
} from './geste-appris'

// La vérification en code d'un geste appris (PLAN-PROMOTION.md § 6.2, gardée
// après le retrait de la promotion automatique) : gabarit sur une copie vide
// (1), rejeu de chaque test sur son instantané (3), aucune valeur en dur venue
// d'une consigne (4), description distincte des gestes existants (5).
// L'atelier (`verifierGesteAppris`) et `pnpm evals gestes` passent par ici.

/** Deux descriptions à cette distance normalisée (Damerau) ou moins se ressemblent (§ 6.2, écart 5). */
export const RESSEMBLANCE_MAX = 0.5

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

/** Une modification en une ligne, pour le modèle et pour un écart : ses valeurs jointes par « → » (exemple : `V-03 → A-11`). */
export const enLigne = (m: unknown) => Object.values(m as Record<string, unknown>).join(' → ')

/**
 * Le rejeu d'un test sur son instantané : le texte rendu et ce qui y manque,
 * ou l'erreur. Pour un geste qui écrit (PLAN-PROMOTION.md § 10,
 * PLAN-METIER-2.md M6), le texte est la liste des modifications rendues :
 * l'objet de chaque modification du test doit y être (`manque` sinon :
 * l'objet), et chaque modification rendue doit être égale à une modification
 * validée, dans ce test ou un autre du geste, pour un objet du test, et une
 * seule par objet (`enTrop` sinon) : deux modifications validées pour le même
 * objet ont été acceptées toutes les deux.
 */
export async function rejouerTest(
  geste: GesteAppris,
  test: TestAppris,
  dossierClient: string,
  declarations: DeclarationsGeste,
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
    const personne = personneDuTest(test)
    const identite = { role: test.role, ...(personne !== null ? { personne } : {}) }
    const { operation } = declarations
    const e = await executerGeste(
      geste,
      copie,
      liaisonDe(geste, identite, test.params, declarations),
      operation,
    )
    if ('erreur' in e) {
      return { erreur: e.erreur, ...(e.requete !== undefined ? { requete: e.requete } : {}) }
    }
    if (e.modifications === undefined || !operation) {
      return {
        texte: e.texte,
        manque: test.contient.filter((mot) => !contient(e.texte, mot)),
        enTrop: [],
      }
    }
    const lues = z.array(operation.modification)
    const attendues = lues.safeParse(test.modifications ?? [])
    const validees = lues.safeParse(geste.tests.flatMap((t) => t.modifications ?? []))
    if (!attendues.success || !validees.success) {
      return { erreur: 'une modification attendue n’a pas la forme de l’opération' }
    }
    const objets = attendues.data.map((m) => operation.objet(m))
    const rendues = e.modifications
    return {
      texte: rendues.length > 0 ? rendues.map(enLigne).join(', ') : 'aucune modification',
      manque: objets.filter((o) => !rendues.some((m) => operation.objet(m) === o)),
      enTrop: rendues
        .filter(
          (m, i) =>
            !objets.includes(operation.objet(m)) ||
            !validees.data.some((v) => operation.egal(v, m)) ||
            rendues.findIndex((x) => operation.objet(x) === operation.objet(m)) !== i,
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
    declarations: DeclarationsGeste
    gestesExistants: { id: string; description: string }[]
  },
): Promise<{ ecarts: EcartGeste[]; rejeu: Rejeu }> {
  const ecarts: EcartGeste[] = []
  const rejeu: Rejeu = { ok: 0, total: geste.tests.length }

  // 1. Le gabarit, puis les colonnes de chaque requête, lues sur la copie vide.
  const statiques = verifierGabarit(contexte.declarations, geste)
  const vide = creerCopie(contexte.copieVide)
  let colonnes: Map<string, string[]> | undefined = new Map()
  try {
    const nuls = Object.fromEntries(clesDe(geste).map((c) => [c, null]))
    const e = await executerGeste(geste, vide, nuls, contexte.declarations.operation)
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
    ...(colonnes ? verifierGabarit(contexte.declarations, geste, colonnes) : statiques).map(
      (texte) => ({
        texte,
      }),
    ),
  )
  // Une requête qui ne s'exécute même pas sur la copie vide : rien d'autre à vérifier.
  if (!colonnes) return { ecarts, rejeu }

  // 3. Chaque test rejoué sur son instantané.
  for (const t of geste.tests) {
    const r = await rejouerTest(geste, t, contexte.dossierClient, contexte.declarations)
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
