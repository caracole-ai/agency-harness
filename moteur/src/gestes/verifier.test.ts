import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Designable } from '../conversation/designation'
import type { TableCopie } from '../echappee/copie'
import { ecrireInstantane } from '../echappee/echappee'
import type { GesteAppris } from './geste-appris'
import { DECLARATIONS_EXEMPLE } from './geste-appris.test.fixture'
import { rejouerTest, verifierGeste } from './verifier'

// La vérification en code d'un geste appris sur un dossier de test : trois
// instantanés, un geste qui lit (les heures d'un agent) et un geste qui écrit
// (libérer un jour). Les tests viennent de la fabrication retirée
// (PLAN-PROMOTION.md § 6.2, § 10) : le geste est écrit tel que la fabrication
// le complétait, à la main.

const AGENTS: TableCopie = {
  nom: 'agents',
  description: 'les agents',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
  ],
  lignes: [
    { id: 'A-1', nom: 'Karim Haddad' },
    { id: 'A-2', nom: 'Julien Lefèvre' },
    { id: 'A-3', nom: 'Sophie Marchand' },
  ],
}
const VACATIONS: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'agent', type: 'TEXT', description: "l'agent (agents.id)" },
    { nom: 'jour', type: 'TEXT', description: 'le jour, AAAA-MM-JJ' },
    { nom: 'heures', type: 'REAL', description: 'durée' },
  ],
  lignes: [
    { id: 'V-01', agent: 'A-1', jour: '2026-10-07', heures: 12 },
    { id: 'V-02', agent: 'A-1', jour: '2026-10-09', heures: 12 },
    { id: 'V-04', agent: 'A-2', jour: '2026-10-07', heures: 12 },
    { id: 'V-05', agent: 'A-2', jour: '2026-10-08', heures: 4 },
    { id: 'V-06', agent: 'A-3', jour: '2026-10-10', heures: 12 },
  ],
}
const PERSONNES: Designable[] = AGENTS.lignes.map((a) => ({
  id: String(a.id),
  nom: String(a.nom),
  sorte: 'personne',
}))
const GESTES_EXISTANTS = [
  { id: 'voir_planning', description: 'le planning d’un agent ou de tous, sur une période' },
  { id: 'mes_titres', description: 'les titres de celui qui parle et leurs dates' },
]
const DU = '2026-10-05'
const AU = '2026-10-11'
const SQL_OK =
  'SELECT a.nom AS nom, COALESCE(SUM(v.heures), 0) AS heures FROM agents a LEFT JOIN vacations v ON v.agent = a.id AND v.jour BETWEEN :du AND :au WHERE a.id = :agent GROUP BY a.id'
const COPIE_VIDE: TableCopie[] = [
  { ...AGENTS, lignes: [] },
  { ...VACATIONS, lignes: [] },
]
const ORIGINE: GesteAppris['origine'] = {
  fabrique_le: '2026-10-10',
  modele: 'simulé',
  cout_usd: 0.01,
  conversations: ['C-E-1', 'C-E-2', 'C-E-3'],
}
const CONSIGNES = [
  "Combien d'heures Karim a-t-il fait cette semaine ?",
  "Combien d'heures Julien a-t-il fait du 5 au 11 octobre ?",
  "Combien d'heures j'ai fait cette semaine ?",
]

/** Le dossier d'un client de test : trois instantanés, celui de l'agent réduit à ses lignes. */
function dossierAvecInstantanes(): string {
  const dossier = mkdtempSync(join(tmpdir(), 'verifier-'))
  const tables = (agent?: string): TableCopie[] =>
    agent === undefined
      ? [AGENTS, VACATIONS]
      : [
          { ...AGENTS, lignes: AGENTS.lignes.filter((a) => a.id === agent) },
          { ...VACATIONS, lignes: VACATIONS.lignes.filter((v) => v.agent === agent) },
        ]
  ecrireInstantane(dossier, {
    echappee: 'E-1',
    horodatage: '2026-10-10T19:40:00Z',
    role: 'patron',
    tables: tables(),
  })
  ecrireInstantane(dossier, {
    echappee: 'E-2',
    horodatage: '2026-10-10T19:41:00Z',
    role: 'patron',
    tables: tables(),
  })
  ecrireInstantane(dossier, {
    echappee: 'E-3',
    horodatage: '2026-10-10T19:42:00Z',
    role: 'agent',
    personne: 'A-3',
    tables: tables('A-3'),
  })
  return dossier
}

/** Un geste qui lit, tel que la fabrication le complétait : un test par échappée, les nombres du texte validé à retrouver. */
const GESTE_LECTURE: GesteAppris = {
  id: 'heures_par_agent',
  description: 'les heures faites par un agent sur une période, ou par celui qui parle',
  roles: ['patron', 'agent'],
  parametres: {
    agent: { type: 'agent', description: "l'agent nommé, ou null pour celui qui parle" },
    periode: { type: 'periode', description: 'la période' },
  },
  requetes: [{ nom: 'heures', sql: SQL_OK }],
  reponse: {
    ligne: '{{heures.nom}} : {{heures.heures}} heures du {{du}} au {{au}}.',
    tableau: null,
    vide: 'Aucune vacation sur cette période.',
  },
  tests: [
    {
      echappee: 'E-1',
      consigne: CONSIGNES[0] ?? '',
      role: 'patron',
      personne: null,
      params: { agent: 'A-1', du: DU, au: AU },
      instantane: 'echappees/E-1.json',
      contient: ['24'],
    },
    {
      echappee: 'E-2',
      consigne: CONSIGNES[1] ?? '',
      role: 'patron',
      personne: null,
      params: { agent: 'A-2', du: DU, au: AU },
      instantane: 'echappees/E-2.json',
      contient: ['16'],
    },
    {
      echappee: 'E-3',
      consigne: CONSIGNES[2] ?? '',
      role: 'agent',
      personne: 'A-3',
      params: { agent: null, du: DU, au: AU },
      instantane: 'echappees/E-3.json',
      contient: ['12'],
    },
  ],
  origine: ORIGINE,
}

describe('verifierGeste et rejouerTest', () => {
  const geste = (): GesteAppris => GESTE_LECTURE
  const contexte = (dossierClient: string) => ({
    dossierClient,
    copieVide: COPIE_VIDE,
    consignes: CONSIGNES,
    personnes: PERSONNES,
    declarations: DECLARATIONS_EXEMPLE,
    gestesExistants: GESTES_EXISTANTS,
  })
  it('un geste juste : zéro écart, rejeu 3/3', async () => {
    const dossier = dossierAvecInstantanes()
    expect(await verifierGeste(geste(), contexte(dossier))).toEqual({
      ecarts: [],
      rejeu: { ok: 3, total: 3 },
    })
  })
  it('le rejeu rend le texte et ce qui y manque ; un instantané absent est une erreur', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const [t1, , t3] = g.tests
    if (!t1 || !t3) throw new Error('fixture')
    expect(await rejouerTest(g, t1, dossier, DECLARATIONS_EXEMPLE)).toEqual({
      texte: 'Karim Haddad : 24 heures du 2026-10-05 au 2026-10-11.',
      manque: [],
      enTrop: [],
    })
    expect(
      await rejouerTest(g, { ...t1, contient: ['24', '99'] }, dossier, DECLARATIONS_EXEMPLE),
    ).toMatchObject({
      manque: ['99'],
    })
    // L'agent : sa copie n'a que ses lignes, et c'est lui qui est lié (D4).
    expect(
      await rejouerTest(
        g,
        { ...t3, params: { ...t3.params, agent: 'A-1' } },
        dossier,
        DECLARATIONS_EXEMPLE,
      ),
    ).toEqual({
      texte: 'Sophie Marchand : 12 heures du 2026-10-05 au 2026-10-11.',
      manque: [],
      enTrop: [],
    })
    expect(
      await rejouerTest(
        g,
        { ...t1, instantane: 'echappees/E-0.json' },
        dossier,
        DECLARATIONS_EXEMPLE,
      ),
    ).toEqual({
      erreur: 'instantané absent : echappees/E-0.json',
    })
  })
  it('un rejeu qui ne contient pas « 16 » : écart 3, sans erreur (ne relance pas)', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const faux = {
      ...g,
      requetes: [{ nom: 'heures', sql: SQL_OK.replace('SUM(v.heures)', 'COUNT(v.id)') }],
    }
    const { ecarts, rejeu } = await verifierGeste(faux, contexte(dossier))
    expect(rejeu).toEqual({ ok: 0, total: 3 })
    expect(ecarts.map((e) => e.texte)).toEqual([
      'E-1 : le rejeu ne contient pas « 24 » (rendu : « Karim Haddad : 2 heures du 2026-10-05 au 2026-10-11. »)',
      'E-2 : le rejeu ne contient pas « 16 » (rendu : « Julien Lefèvre : 2 heures du 2026-10-05 au 2026-10-11. »)',
      'E-3 : le rejeu ne contient pas « 12 » (rendu : « Sophie Marchand : 1 heures du 2026-10-05 au 2026-10-11. »)',
    ])
    expect(ecarts.every((e) => e.erreur === undefined)).toBe(true)
  })
  it('une valeur en dur venue d’une consigne, une date, une personne : écart 4', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const { ecarts } = await verifierGeste(
      {
        ...g,
        requetes: [
          {
            nom: 'heures',
            sql: `${SQL_OK} HAVING a.nom LIKE '%Karim%' OR a.id = 'A-2' OR v.jour = '2026-10-05' OR a.nom <> 'semaine' OR a.nom <> 'x'`,
          },
        ],
      },
      contexte(dossier),
    )
    const textes = ecarts.map((e) => e.texte)
    expect(textes).toContain(
      "la requête « heures » code une valeur venue d'une consigne : 'semaine'",
    )
    expect(textes).toContain("la requête « heures » code une personne en dur : 'A-2'")
    expect(textes).toContain("la requête « heures » code une date en dur : '2026-10-05'")
    expect(textes.filter((t) => t.includes("'x'"))).toEqual([])
  })
  it('une requête qui lève sur la copie vide : un seul écart, avec l’erreur (relance), rien d’autre vérifié', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const { ecarts, rejeu } = await verifierGeste(
      {
        ...g,
        requetes: [{ nom: 'heures', sql: 'SELECT nom, total FROM absente WHERE id = :agent' }],
      },
      contexte(dossier),
    )
    expect(rejeu).toEqual({ ok: 0, total: 3 })
    expect(ecarts).toHaveLength(1)
    expect(ecarts[0]).toMatchObject({
      requete: 'heures',
      erreur: expect.stringMatching(/no such table/),
    })
  })
  it('une colonne que la requête ne rend pas : écart de gabarit, lu sur la copie vide', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const { ecarts } = await verifierGeste(
      { ...g, reponse: { ...g.reponse, ligne: '{{heures.total}} heures' } },
      contexte(dossier),
    )
    expect(ecarts.map((e) => e.texte)).toContain(
      'la ligne cite une colonne que « heures » ne rend pas : total',
    )
  })
  it('une description qui ressemble à un geste existant : écart 5', async () => {
    const dossier = dossierAvecInstantanes()
    const g = geste()
    const { ecarts } = await verifierGeste(
      { ...g, description: 'le planning d’un agent ou de tous, sur une période.' },
      contexte(dossier),
    )
    expect(ecarts.map((e) => e.texte)).toEqual([
      expect.stringMatching(/^la description ressemble à celle de voir_planning/),
    ])
  })
})

describe('le rejeu d’un geste qui écrit (PLAN-PROMOTION.md § 10)', () => {
  const sql = (agent: string) =>
    `SELECT v.id AS vacation, '${agent}' AS agent FROM vacations v WHERE v.agent = :agent AND v.jour = :date`
  const test = (echappee: string, date: string, vacation: string, agent: string) => ({
    echappee,
    consigne: 'Libère Karim.',
    role: 'patron' as const,
    agent: null,
    params: { agent: 'A-1', date },
    instantane: `echappees/${echappee}.json`,
    contient: [],
    modifications: [{ vacation, agent }],
  })
  // Le patron a validé V-01 pour Julien (A-2) puis pour Sophie (A-3) : les deux lui conviennent.
  const ecrit = (agent: string): GesteAppris => ({
    id: 'liberer_un_jour',
    description: 'libérer un agent de ses vacations d’un jour',
    roles: ['patron'],
    parametres: {
      agent: { type: 'agent', description: "l'agent" },
      date: { type: 'date', description: 'le jour' },
    },
    requetes: [{ nom: 'liberer', sql: sql(agent) }],
    modifications: { pour_chaque: 'liberer', reaffecter: { vacation: 'vacation', agent: 'agent' } },
    reponse: { ligne: null, tableau: 'liberer', vide: 'Rien.' },
    tests: [
      test('E-1', '2026-10-07', 'V-01', 'A-2'),
      test('E-2', '2026-10-07', 'V-01', 'A-3'),
      test('E-2', '2026-10-09', 'V-02', 'A-2'),
    ],
    origine: ORIGINE,
  })
  it('un agent que le patron a validé pour cette vacation, dans ce test ou un autre : rien ne manque, rien de trop', async () => {
    const dossier = dossierAvecInstantanes()
    const g = ecrit('A-3')
    const [t1, t2] = g.tests
    if (!t1 || !t2) throw new Error('fixture')
    expect(await rejouerTest(g, t1, dossier, DECLARATIONS_EXEMPLE)).toEqual({
      texte: 'V-01 → A-3',
      manque: [],
      enTrop: [],
    })
    expect(await rejouerTest(g, t2, dossier, DECLARATIONS_EXEMPLE)).toMatchObject({
      manque: [],
      enTrop: [],
    })
  })
  it('un agent jamais validé pour cette vacation, une vacation absente : écarts, et la vérification le dit', async () => {
    const dossier = dossierAvecInstantanes()
    const g = ecrit('A-1')
    const [t1, , t3] = g.tests
    if (!t1 || !t3) throw new Error('fixture')
    expect(await rejouerTest(g, t1, dossier, DECLARATIONS_EXEMPLE)).toEqual({
      texte: 'V-01 → A-1',
      manque: [],
      enTrop: ['V-01 → A-1'],
    })
    expect(
      await rejouerTest(
        g,
        { ...t3, params: { agent: 'A-1', date: '2026-10-20' } },
        dossier,
        DECLARATIONS_EXEMPLE,
      ),
    ).toEqual({
      texte: 'aucune modification',
      manque: ['V-02'],
      enTrop: [],
    })
    const { ecarts, rejeu } = await verifierGeste(g, {
      dossierClient: dossier,
      copieVide: COPIE_VIDE,
      consignes: [],
      personnes: PERSONNES,
      declarations: DECLARATIONS_EXEMPLE,
      gestesExistants: GESTES_EXISTANTS,
    })
    expect(rejeu).toEqual({ ok: 0, total: 3 })
    expect(ecarts.map((e) => e.texte)).toContain(
      'E-1 : le rejeu propose « V-01 → A-1 », jamais validé (rendu : « V-01 → A-1 »)',
    )
  })
})
