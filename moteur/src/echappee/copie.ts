import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// La copie de l'échappée : les données que le modèle peut interroger, posées
// dans une base SQLite jetable, rouverte en lecture seule avant qu'il ne la
// voie. Sa description pour le modèle est générée du même objet que la base :
// elle ne peut pas dériver (PLAN-ESPACES.md § 6.1).

export interface ColonneCopie {
  nom: string
  type: 'TEXT' | 'INTEGER' | 'REAL'
  description: string
  /** Une colonne qui porte le nom d'une personne : sa description dans la copie masquée, où l'identifiant tient lieu de nom (PLAN-PSEUDONYMES.md S2). */
  masquee?: string
  /** Des euros : une colonne `REAL` dont les valeurs sont arrondies à deux décimales dans la copie, et décrites comme telles (PLAN-METIER-2.md § 1, M11). */
  decimales?: 2
}

export interface TableCopie {
  nom: string
  description: string
  colonnes: ColonneCopie[]
  lignes: Record<string, string | number | null>[]
}

export interface Copie {
  chemin: string
  db: DatabaseSync
  description: string
  fermer(): void
}

/** Les noms de tables et de colonnes viennent du code ; ils sont validés quand même. */
const NOM_SQL = /^[a-z_][a-z0-9_]*$/

function validerNom(nom: string): string {
  if (!NOM_SQL.test(nom)) throw new Error(`copie : nom de table ou de colonne refusé : « ${nom} »`)
  return nom
}

/** Construit la copie dans un fichier temporaire, puis la rouvre en lecture seule. */
export function creerCopie(tables: TableCopie[]): Copie {
  for (const table of tables) {
    validerNom(table.nom)
    for (const colonne of table.colonnes) {
      validerNom(colonne.nom)
      if (colonne.decimales !== undefined && colonne.type !== 'REAL') {
        throw new Error(`copie : « ${colonne.nom} » a des décimales sans être REAL`)
      }
    }
  }
  const dossier = mkdtempSync(join(tmpdir(), 'copie-'))
  const chemin = join(dossier, 'copie.sqlite')
  try {
    const ecriture = new DatabaseSync(chemin)
    try {
      ecriture.exec('BEGIN')
      for (const table of tables) remplir(ecriture, table)
      ecriture.exec('COMMIT')
    } finally {
      ecriture.close()
    }
    const db = new DatabaseSync(chemin, { readOnly: true })
    db.exec('PRAGMA query_only = 1')
    return {
      chemin,
      db,
      description: decrireTables(tables),
      fermer() {
        db.close()
        rmSync(dossier, { recursive: true, force: true })
      },
    }
  } catch (erreur) {
    rmSync(dossier, { recursive: true, force: true })
    throw erreur
  }
}

function remplir(db: DatabaseSync, table: TableCopie): void {
  const noms = table.colonnes.map((c) => c.nom)
  db.exec(
    `CREATE TABLE ${table.nom} (${table.colonnes.map((c) => `${c.nom} ${c.type}`).join(', ')}) STRICT`,
  )
  const inserer = db.prepare(
    `INSERT INTO ${table.nom} (${noms.join(', ')}) VALUES (${noms.map(() => '?').join(', ')})`,
  )
  for (const ligne of table.lignes) {
    const inconnue = Object.keys(ligne).find((cle) => !noms.includes(cle))
    if (inconnue !== undefined) {
      throw new Error(`copie : colonne « ${inconnue} » absente de la table « ${table.nom} »`)
    }
    inserer.run(
      ...table.colonnes.map((c) => {
        const v = ligne[c.nom] ?? null
        return c.decimales !== undefined && typeof v === 'number' ? Math.round(v * 100) / 100 : v
      }),
    )
  }
}

/** Le texte pour le modèle : une section par table, `nom (type) : description` par colonne, et le nombre de lignes. Généré du même objet que la base : il ne peut pas dériver. */
export function decrireTables(tables: TableCopie[]): string {
  return tables
    .map((table) => {
      const n = table.lignes.length
      return [
        `Table ${table.nom} : ${table.description} (${n} ligne${n > 1 ? 's' : ''})`,
        ...table.colonnes.map(
          (c) =>
            `- ${c.nom} (${c.type}${c.decimales !== undefined ? ', en euros, deux décimales' : ''}) : ${c.description}`,
        ),
      ].join('\n')
    })
    .join('\n\n')
}
