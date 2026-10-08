import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creerCopie, decrireTables, type TableCopie } from './copie'

// La copie de l'échappée : construite, en lecture seule, décrite, supprimée
// (PLAN-ESPACES.md § 6.8).

const TABLES: TableCopie[] = [
  {
    nom: 'agents',
    description: 'les agents de la société',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: "identifiant de l'agent" },
      { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
      { nom: 'ssiap_niveau', type: 'INTEGER', description: 'niveau SSIAP, null = inconnu' },
    ],
    lignes: [
      { id: 'A-1', nom: 'Mehdi Saïdi', ssiap_niveau: 1 },
      { id: 'A-2', nom: 'Thomas Girard', ssiap_niveau: null },
    ],
  },
  {
    nom: 'vacations',
    description: 'les vacations du planning',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: 'identifiant de la vacation' },
      { nom: 'heures', type: 'REAL', description: 'durée en heures' },
    ],
    lignes: [{ id: 'V-01', heures: 12 }],
  },
]

describe('creerCopie', () => {
  it('pose les lignes, lisibles par SELECT', () => {
    const copie = creerCopie(TABLES)
    expect(copie.db.prepare('SELECT id, nom, ssiap_niveau FROM agents ORDER BY id').all()).toEqual([
      { id: 'A-1', nom: 'Mehdi Saïdi', ssiap_niveau: 1 },
      { id: 'A-2', nom: 'Thomas Girard', ssiap_niveau: null },
    ])
    expect(copie.db.prepare('SELECT heures FROM vacations').get()).toEqual({ heures: 12 })
    copie.fermer()
  })
  it('écrire directement dans la copie lève : elle est réellement en lecture seule', () => {
    const copie = creerCopie(TABLES)
    expect(() => copie.db.exec("INSERT INTO agents (id) VALUES ('A-9')")).toThrow()
    expect(() => copie.db.exec('DELETE FROM agents')).toThrow()
    expect(copie.db.prepare('SELECT count(*) AS n FROM agents').get()).toEqual({ n: 2 })
    copie.fermer()
  })
  it('fermer supprime le dossier temporaire', () => {
    const copie = creerCopie(TABLES)
    const dossier = dirname(copie.chemin)
    expect(existsSync(copie.chemin)).toBe(true)
    copie.fermer()
    expect(existsSync(dossier)).toBe(false)
  })
  it('un nom de table ou de colonne hors du motif lève', () => {
    const [agents] = TABLES
    if (!agents) throw new Error('jeu de test vide')
    expect(() => creerCopie([{ ...agents, nom: 'agents; DROP' }])).toThrow(/nom .* refusé/)
    expect(() =>
      creerCopie([
        { ...agents, colonnes: [{ nom: 'Nom', type: 'TEXT', description: 'majuscule' }] },
      ]),
    ).toThrow(/nom .* refusé/)
  })
  it('une ligne portant une colonne inconnue lève', () => {
    const [agents] = TABLES
    if (!agents) throw new Error('jeu de test vide')
    expect(() =>
      creerCopie([{ ...agents, lignes: [{ id: 'A-1', nom: 'X', ssiap_niveau: 1, age: 30 }] }]),
    ).toThrow(/colonne « age » absente/)
  })
})

describe('decrireTables', () => {
  it('chaque colonne avec son type et sa description, et le nombre de lignes', () => {
    const texte = decrireTables(TABLES)
    for (const table of TABLES) {
      expect(texte).toContain(`Table ${table.nom} : ${table.description}`)
      for (const c of table.colonnes)
        expect(texte).toContain(`${c.nom} (${c.type}) : ${c.description}`)
    }
    expect(texte).toContain('(2 lignes)')
    expect(texte).toContain('(1 ligne)')
  })
  it('la copie porte la même description', () => {
    const copie = creerCopie(TABLES)
    expect(copie.description).toBe(decrireTables(TABLES))
    copie.fermer()
  })
})
