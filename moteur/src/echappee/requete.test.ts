import { afterAll, describe, expect, it } from 'vitest'
import { creerCopie, type TableCopie } from './copie'
import {
  executerRequete,
  LIGNES_MAX,
  parametresNommes,
  rendreResultat,
  rendreResultatNumerote,
  SQL_MAX,
} from './requete'

// L'outil `requete` : les lectures passent, tout le reste revient en erreur,
// et la copie reste intacte (PLAN-ESPACES.md § 6.8). Les paramètres sont
// liés, jamais collés dans le SQL.

const TABLES: TableCopie[] = [
  {
    nom: 'agents',
    description: 'les agents',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: 'identifiant' },
      { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
    ],
    lignes: [
      { id: 'A-1', nom: 'Mehdi Saïdi' },
      { id: 'A-2', nom: 'Thomas Girard' },
    ],
  },
  {
    nom: 'vacations',
    description: 'les vacations',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: 'identifiant' },
      { nom: 'heures', type: 'REAL', description: 'durée en heures' },
    ],
    lignes: Array.from({ length: 250 }, (_, i) => ({ id: `V-${i + 1}`, heures: 12 })),
  },
]

const copie = creerCopie(TABLES)
afterAll(() => copie.fermer())

const TEMOIN = 'SELECT id, nom FROM agents ORDER BY id'

describe('executerRequete : refus', () => {
  const avant = executerRequete(copie, TEMOIN)
  it.each([
    "INSERT INTO agents (id, nom) VALUES ('A-9', 'Karim Haddad')",
    "UPDATE agents SET nom = 'X'",
    'DROP TABLE agents',
    'PRAGMA query_only = 0',
    "ATTACH DATABASE '/tmp/autre.sqlite' AS autre",
    'WITH x AS (SELECT 1) DELETE FROM agents',
    'SELECT * FROM agents WHERE id IN (SELECT id FROM agents) AND 1 = 1 OR replace(nom, 1, 2)',
  ])('%s → erreur, base intacte', async (sql) => {
    expect(await executerRequete(copie, sql)).toHaveProperty('erreur')
    expect(await executerRequete(copie, TEMOIN)).toEqual(await avant)
  })
  it('deux requêtes séparées par « ; » → erreur', async () => {
    expect(await executerRequete(copie, 'SELECT 1; SELECT 2')).toHaveProperty('erreur')
  })
  it('un « ; » final, suivi d’espaces, est toléré', async () => {
    expect(await executerRequete(copie, '  select 1 AS un;  ')).toEqual({
      colonnes: ['un'],
      lignes: [[1]],
      tronque: false,
    })
  })
  it(`une requête de ${SQL_MAX + 1} caractères → erreur`, async () => {
    const sql = `SELECT 1 AS un${' '.repeat(SQL_MAX + 1 - 'SELECT 1 AS un'.length)}`
    expect(sql).toHaveLength(SQL_MAX + 1)
    expect(await executerRequete(copie, sql)).toEqual({
      erreur: expect.stringMatching(/trop longue/),
    })
  })
  it('une table inconnue → erreur SQLite rendue, sans exception', async () => {
    expect(await executerRequete(copie, 'SELECT * FROM inconnue')).toEqual({
      erreur: expect.stringMatching(/no such table/),
    })
  })
})

describe('executerRequete : lectures', () => {
  it('SELECT : colonnes et lignes', async () => {
    expect(await executerRequete(copie, TEMOIN)).toEqual({
      colonnes: ['id', 'nom'],
      lignes: [
        ['A-1', 'Mehdi Saïdi'],
        ['A-2', 'Thomas Girard'],
      ],
      tronque: false,
    })
  })
  it('WITH x AS (…) SELECT → accepté', async () => {
    expect(
      await executerRequete(copie, 'WITH x AS (SELECT id FROM agents) SELECT count(*) AS n FROM x'),
    ).toEqual({ colonnes: ['n'], lignes: [[2]], tronque: false })
  })
  it(`250 lignes → tronque, ${LIGNES_MAX} rendues`, async () => {
    const r = await executerRequete(copie, 'SELECT id FROM vacations')
    expect(r).toMatchObject({ tronque: true })
    if ('erreur' in r) throw new Error(r.erreur)
    expect(r.lignes).toHaveLength(LIGNES_MAX)
  })
  it('un commentaire qui neutralise le LIMIT ne lève pas la borne de lignes', async () => {
    const r = await executerRequete(
      copie,
      'WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c) SELECT n FROM c) /*',
    )
    expect(r).toMatchObject({ tronque: true })
    if ('erreur' in r) throw new Error(r.erreur)
    expect(r.lignes).toHaveLength(LIGNES_MAX)
  })
  it('aucune ligne : les colonnes viennent de la requête', async () => {
    expect(await executerRequete(copie, "SELECT id, nom FROM agents WHERE id = 'A-9'")).toEqual({
      colonnes: ['id', 'nom'],
      lignes: [],
      tronque: false,
    })
  })
})

describe('executerRequete : paramètres liés', () => {
  const PAR_ID = 'SELECT id, nom FROM agents WHERE id = :agent'
  it('`:agent` est lié à la valeur, avec une clé nue (Node 22.22)', async () => {
    expect(await executerRequete(copie, PAR_ID, { agent: 'A-2' })).toEqual({
      colonnes: ['id', 'nom'],
      lignes: [['A-2', 'Thomas Girard']],
      tronque: false,
    })
  })
  it('un paramètre nommé dans la requête et absent des paramètres → erreur, pas null en silence', async () => {
    expect(await executerRequete(copie, PAR_ID, {})).toEqual({
      erreur: expect.stringMatching(/« agent ».*sans valeur/),
    })
  })
  it('une clé que la requête ne nomme pas est tolérée : un geste passe tous ses paramètres', async () => {
    expect(
      await executerRequete(copie, PAR_ID, { agent: 'A-1', du: '2026-10-05', au: '2026-10-11' }),
    ).toMatchObject({ lignes: [['A-1', 'Mehdi Saïdi']] })
  })
  it("un paramètre qui contient « '; DROP » est une valeur, pas du SQL", async () => {
    const avant = await executerRequete(copie, TEMOIN)
    expect(await executerRequete(copie, PAR_ID, { agent: "'; DROP TABLE agents" })).toEqual({
      colonnes: ['id', 'nom'],
      lignes: [],
      tronque: false,
    })
    expect(await executerRequete(copie, TEMOIN)).toEqual(avant)
  })
  it('null et nombre se lient aussi', async () => {
    expect(
      await executerRequete(copie, 'SELECT :n AS n, :rien AS rien', { n: 16, rien: null }),
    ).toEqual({ colonnes: ['n', 'rien'], lignes: [[16, null]], tronque: false })
  })
  it('sans paramètres, rien ne change : une requête sans `:nom` passe comme avant', async () => {
    expect(await executerRequete(copie, TEMOIN)).toEqual(await executerRequete(copie, TEMOIN, {}))
  })
})

describe('parametresNommes', () => {
  it('lit `:agent`, `@du` et `$au`, une fois chacun, hors chaînes et identifiants entre guillemets', () => {
    expect(
      parametresNommes(
        `SELECT "a:b", ':pas_un', :agent, @du, $au FROM t WHERE x = :agent AND h = '08:00'`,
      ),
    ).toEqual(['agent', 'du', 'au'])
  })
})

describe('executerRequete : le temps', () => {
  it('une récursion sans fin sous un agrégat est arrêtée au délai, sans figer le processus', async () => {
    const debut = Date.now()
    const r = await executerRequete(
      copie,
      'WITH RECURSIVE t(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM t) SELECT count(*) FROM t',
      undefined,
      300,
    )
    expect(r).toEqual({ erreur: expect.stringMatching(/^requête arrêtée/) })
    expect(Date.now() - debut).toBeLessThan(3000)
  })
  it('randomblob et zeroblob sont refusés', async () => {
    expect(await executerRequete(copie, 'SELECT hex(randomblob(500000000))')).toHaveProperty(
      'erreur',
    )
    expect(await executerRequete(copie, 'SELECT zeroblob(10)')).toHaveProperty('erreur')
  })
})

describe('rendreResultat', () => {
  it('un tableau texte, null rendu null', () => {
    expect(
      rendreResultat({
        colonnes: ['nom', 'heures'],
        lignes: [
          ['Julien Lefèvre', 16],
          ['Mehdi Saïdi', null],
        ],
        tronque: false,
      }),
    ).toBe('nom | heures\nJulien Lefèvre | 16\nMehdi Saïdi | null')
  })
  it('tronqué : une dernière ligne le dit', () => {
    expect(rendreResultat({ colonnes: ['n'], lignes: [[1]], tronque: true })).toBe(
      `n\n1\n(tronqué à ${LIGNES_MAX} lignes)`,
    )
  })
  it('aucune ligne : le dit', () => {
    expect(rendreResultat({ colonnes: ['n'], lignes: [], tronque: false })).toBe(
      'n\n(aucune ligne)',
    )
  })
  it('une erreur', () => {
    expect(rendreResultat({ erreur: 'no such table: inconnue' })).toBe(
      'erreur : no such table: inconnue',
    )
  })
  it('un nombre non entier a deux décimales, un entier reste entier (M11)', () => {
    expect(
      rendreResultat({
        colonnes: ['heures', 'montant', 'ratio', 'n'],
        lignes: [[7.5, 12500, 1 / 3, 16]],
        tronque: false,
      }),
    ).toBe('heures | montant | ratio | n\n7.50 | 12500 | 0.33 | 16')
  })
})

describe('l’argent (PLAN-METIER-2.md § 6.4, M11)', () => {
  const montants = creerCopie([
    {
      nom: 'factures',
      description: 'les factures',
      colonnes: [
        { nom: 'id', type: 'TEXT', description: 'identifiant' },
        { nom: 'type', type: 'TEXT', description: 'nature' },
        { nom: 'montant', type: 'REAL', description: 'montant hors taxes', decimales: 2 },
      ],
      lignes: [
        { id: 'FAC-2026-001', type: 'update', montant: 1234.56 },
        { id: 'FAC-2026-002', type: 'creation', montant: 0.1 },
      ],
    },
  ])
  afterAll(() => montants.fermer())

  it('SUM de 1234.56 + 0.1 rend 1234.66, pas un flottant brut', async () => {
    const r = await executerRequete(montants, 'SELECT SUM(montant) AS total FROM factures')
    expect(rendreResultat(r)).toBe('total\n1234.66')
  })
  it("WHERE type='update' est accepté : un mot refusé dans une chaîne n'est pas du SQL", async () => {
    expect(await executerRequete(montants, "SELECT id FROM factures WHERE type='update'")).toEqual({
      colonnes: ['id'],
      lignes: [['FAC-2026-001']],
      tronque: false,
    })
    expect(
      await executerRequete(
        montants,
        `SELECT "type" AS "delete" FROM factures WHERE id = 'x''drop'`,
      ),
    ).toEqual({ colonnes: ['delete'], lignes: [], tronque: false })
  })
  it('UPDATE t est refusé', async () => {
    expect(await executerRequete(montants, 'UPDATE t SET a = 1')).toHaveProperty('erreur')
    expect(await executerRequete(montants, "SELECT 'a'; DELETE FROM factures")).toHaveProperty(
      'erreur',
    )
  })
  it.each([
    "SELECT 'a' FROM factures WHERE 1 = 1 OR replace(type, 'u', 'v')",
    "WITH x AS (SELECT 'update') DELETE FROM factures",
    "SELECT 'a' || 'b FROM factures WHERE pragma",
    "SELECT 'it''s', zeroblob(10)",
    "SELECT 1 /* ' */, zeroblob(10) /* ' */",
    "SELECT 1 -- '\n, zeroblob(10) -- '",
    "SELECT [a'], zeroblob(10), ['b] FROM factures",
    "SELECT `a'`, zeroblob(10), `'b` FROM factures",
  ])(
    'un mot refusé hors des chaînes reste refusé, une chaîne ne le cache pas : %s',
    async (sql) => {
      expect(await executerRequete(montants, sql)).toEqual({
        erreur: expect.stringMatching(/^mot refusé/),
      })
    },
  )
})

describe('rendreResultatNumerote : ce que le modèle lit, et que ses trous désignent', () => {
  it('le nom du résultat et son nombre de lignes en tête, la colonne # qui numérote', () => {
    expect(
      rendreResultatNumerote(
        {
          colonnes: ['nom', 'heures'],
          lignes: [
            ['Julien Lefèvre', 16],
            ['Mehdi Saïdi', 7.5],
          ],
          tronque: false,
        },
        2,
      ),
    ).toBe('T2 (2 lignes)\n# | nom | heures\n1 | Julien Lefèvre | 16\n2 | Mehdi Saïdi | 7.50')
  })
  it('une ligne, aucune ligne, tronqué, erreur', () => {
    expect(rendreResultatNumerote({ colonnes: ['n'], lignes: [[1]], tronque: false }, 1)).toBe(
      'T1 (1 ligne)\n# | n\n1 | 1',
    )
    expect(rendreResultatNumerote({ colonnes: ['n'], lignes: [], tronque: false }, 1)).toBe(
      'T1 (0 ligne)\n# | n\n(aucune ligne)',
    )
    expect(rendreResultatNumerote({ colonnes: ['n'], lignes: [[1]], tronque: true }, 3)).toBe(
      `T3 (${LIGNES_MAX} lignes au moins, tronqué)\n# | n\n1 | 1\n(tronqué à ${LIGNES_MAX} lignes)`,
    )
    expect(rendreResultatNumerote({ erreur: 'x' }, 1)).toBe('erreur : x')
  })
})
