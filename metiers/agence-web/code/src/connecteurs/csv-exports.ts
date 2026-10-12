import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import {
  type Contexte,
  colonnes,
  contexte,
  NOMS_TABLES,
  TABLES,
  type Table,
  type Tables,
} from '../modele'

// Le connecteur de lecture de l'agence web (PLAN-METIER-2.md § 7.1, M13) : les
// exports CSV de ses outils (tickets, temps, devis et factures, registre des
// accès, dépôts, registrar), un fichier par table du § 7.2, au séparateur
// « ; » (celui d'Excel en français), en-tête en première ligne. Lecture
// seule : rien ne s'écrit chez le client en v1. Une cellule vide est une
// donnée inconnue, jamais une valeur par défaut.

/** Le fichier de chaque table, relatif au dossier du client (`config.yaml: donnees`). */
export type FichiersAgenceWeb = Record<Table, string>

type Ligne = Record<string, string>

/** Lit un CSV et rend ses lignes ; une colonne manquante ou en trop arrête, avec le fichier et la colonne. */
function lireCsv(chemin: string, attendues: readonly string[]): Ligne[] {
  const [entete, ...lignes] = parse(readFileSync(chemin, 'utf8'), {
    delimiter: ';',
    trim: true,
    skip_empty_lines: true,
  }) as string[][]
  if (!entete) throw new Error(`${chemin} : fichier vide, l'en-tête manque`)
  const inconnues = entete.filter((c) => !attendues.includes(c))
  const manquantes = attendues.filter((c) => !entete.includes(c))
  if (inconnues.length > 0 || manquantes.length > 0) {
    throw new Error(
      `${chemin} : colonnes ${[
        ...inconnues.map((c) => `« ${c} » inconnue`),
        ...manquantes.map((c) => `« ${c} » manquante`),
      ].join(', ')}`,
    )
  }
  return lignes.map((cellules) => Object.fromEntries(entete.map((c, i) => [c, cellules[i] ?? ''])))
}

function lireTable<T extends Table>(dossier: string, fichier: string, table: T): Tables[T] {
  const chemin = join(dossier, fichier)
  const schema = TABLES[table]
  return lireCsv(chemin, colonnes(table)).map((l, i) => {
    const r = schema.safeParse(l)
    if (!r.success) {
      throw new Error(
        `${fichier}, ligne ${i + 2} : ${r.error.issues.map((x) => `${x.path.join('.')} : ${x.message}`).join(' ; ')}`,
      )
    }
    return r.data
  }) as Tables[T]
}

/** Lit les CSV d'un client et rend son contexte, validé par le modèle canonique. */
export function lireAgenceWeb(dossier: string, fichiers: FichiersAgenceWeb): Contexte {
  const tables = Object.fromEntries(
    NOMS_TABLES.map((t) => [t, lireTable(dossier, fichiers[t], t)]),
  ) as Tables
  return contexte(tables)
}
