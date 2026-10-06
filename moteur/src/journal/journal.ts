import { DatabaseSync } from 'node:sqlite'

// Le journal : ce que le harnais a constaté, quand, et sur quelle règle.
// SQLite en ajout seul, chez le client. Le « seul » est tenu par la base
// elle-même (deux déclencheurs refusent toute modification et toute
// suppression), pas par la bonne volonté du code.

export interface Evenement {
  /** `veille`, `constat`, `alerte`… */
  type: string
  client: string
  regle?: string
  objet?: string
  /** Le verdict d'un constat, ou le niveau d'une alerte. */
  issue?: string
  motif?: string
  donnees?: unknown
}

export interface Ligne extends Required<Pick<Evenement, 'type' | 'client'>> {
  id: number
  horodatage: string
  regle: string | null
  objet: string | null
  issue: string | null
  motif: string | null
  donnees: string | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  horodatage TEXT NOT NULL,
  type TEXT NOT NULL,
  client TEXT NOT NULL,
  regle TEXT,
  objet TEXT,
  issue TEXT,
  motif TEXT,
  donnees TEXT
);
CREATE TRIGGER IF NOT EXISTS journal_sans_modification BEFORE UPDATE ON journal
BEGIN SELECT RAISE(ABORT, 'journal en ajout seul : aucune modification'); END;
CREATE TRIGGER IF NOT EXISTS journal_sans_suppression BEFORE DELETE ON journal
BEGIN SELECT RAISE(ABORT, 'journal en ajout seul : aucune suppression'); END;
`

export class Journal {
  private readonly db: DatabaseSync

  constructor(chemin: string) {
    this.db = new DatabaseSync(chemin)
    this.db.exec(SCHEMA)
  }

  /** Ajoute des événements, tous ou aucun. */
  ecrire(evenements: Evenement[], horodatage = new Date().toISOString()): void {
    const inserer = this.db.prepare(
      'INSERT INTO journal (horodatage, type, client, regle, objet, issue, motif, donnees) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    this.db.exec('BEGIN')
    try {
      for (const e of evenements) {
        inserer.run(
          horodatage,
          e.type,
          e.client,
          e.regle ?? null,
          e.objet ?? null,
          e.issue ?? null,
          e.motif ?? null,
          e.donnees === undefined ? null : JSON.stringify(e.donnees),
        )
      }
      this.db.exec('COMMIT')
    } catch (erreur) {
      this.db.exec('ROLLBACK')
      throw erreur
    }
  }

  lire(): Ligne[] {
    return this.db.prepare('SELECT * FROM journal ORDER BY id').all() as unknown as Ligne[]
  }

  /** Pour les tests et les outils : exécute une requête brute (une modification y échouera). */
  executer(sql: string): void {
    this.db.exec(sql)
  }

  fermer(): void {
    this.db.close()
  }
}
