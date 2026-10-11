import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import type { Intention } from '../conversation/actions'
import type { Designable } from '../conversation/designation'
import type { TableCopie } from '../echappee/copie'
import { ecrireInstantane } from '../echappee/echappee'
import { FichierGeste, type GesteAppris, gesteDe } from '../gestes/geste-appris'
import { modeleSimule, type Scripte } from '../modele/simule'
import {
  APRES_RELANCE,
  type CadreFabrication,
  completerGeste,
  ecrireGeste,
  fabriquerGeste,
  type GestePropose,
  messageFabriquer,
  OUTIL_PROPOSER_GESTE,
  rejouerTest,
  systemeFabriquer,
  verifierGeste,
} from './fabriquer'
import type { EchappeeJournalisee } from './promotion'

// La fabrication avec le modèle simulé (PLAN-PROMOTION.md § 6.5) : une
// proposition bien formée → un geste écrit ; les écarts de fond (valeur en
// dur, test manquant, rejeu qui ne contient pas le chiffre) ne relancent pas ;
// la relance sur deux outils ou une requête qui lève, jamais un troisième
// appel.

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
}))
const INTENTION: Intention = {
  id: 'heures_par_agent',
  description: 'les heures faites par un agent, ou par tous, sur une période',
  ecrit: false,
}
const GESTES_EXISTANTS = [
  { id: 'voir_planning', description: 'le planning d’un agent ou de tous, sur une période' },
  { id: 'mes_titres', description: 'les titres de celui qui parle et leurs dates' },
]
const DU = '2026-10-05'
const AU = '2026-10-11'
const SQL_OK =
  'SELECT a.nom AS nom, COALESCE(SUM(v.heures), 0) AS heures FROM agents a LEFT JOIN vacations v ON v.agent = a.id AND v.jour BETWEEN :du AND :au WHERE a.id = :agent GROUP BY a.id'

/** Le dossier d'un client de test : trois instantanés, celui de l'agent réduit à ses lignes. */
function dossierAvecInstantanes(): string {
  const dossier = mkdtempSync(join(tmpdir(), 'fabriquer-'))
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
    agent: 'A-3',
    tables: tables('A-3'),
  })
  return dossier
}

const echappee = (
  id: string,
  consigne: string,
  texte: string,
  qui: { role: 'patron' | 'agent'; agent?: string } = { role: 'patron' },
): EchappeeJournalisee => ({
  echappee: id,
  conversation: `C-${id}`,
  horodatage: '2026-10-10T19:40:00Z',
  role: qui.role,
  ...(qui.agent !== undefined ? { agent: qui.agent } : {}),
  consigne,
  intention: INTENTION.id,
  issue: 'reponse',
  requetes: [{ sql: SQL_OK.replace(':agent', "'A-1'"), sortie: 'nom | heures\nKarim Haddad | 24' }],
  texte,
  instantane: `echappees/${id}.json`,
})
const ECHAPPEES: EchappeeJournalisee[] = [
  echappee(
    'E-1',
    "Combien d'heures Karim a-t-il fait cette semaine ?",
    'Karim Haddad : 24 heures.',
  ),
  echappee(
    'E-2',
    "Combien d'heures Julien a-t-il fait du 5 au 11 octobre ?",
    'Julien Lefèvre a fait 16 heures du 5 au 11 octobre.',
  ),
  echappee('E-3', "Combien d'heures j'ai fait cette semaine ?", 'Tu as fait 12 heures.', {
    role: 'agent',
    agent: 'A-3',
  }),
]
const COPIE_VIDE: TableCopie[] = [
  { ...AGENTS, lignes: [] },
  { ...VACATIONS, lignes: [] },
]

const PROPOSE: GestePropose = {
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
    { echappee: 'E-1', params: { agent: 'Karim', du: DU, au: AU } },
    { echappee: 'E-2', params: { agent: 'Julien', du: DU, au: AU } },
    { echappee: 'E-3', params: { agent: null, du: DU, au: AU } },
  ],
}
const ORIGINE: GesteAppris['origine'] = {
  fabrique_le: '2026-10-10',
  modele: 'simulé',
  cout_usd: 0.01,
  conversations: ['C-E-1', 'C-E-2', 'C-E-3'],
}
const proposer = (propose: unknown): Scripte => ({ outil: OUTIL_PROPOSER_GESTE, entree: propose })

function cadre(
  dossierClient: string,
  script: Scripte[],
): CadreFabrication & { modele: ReturnType<typeof modeleSimule>; appels: unknown[] } {
  const modele = modeleSimule(script)
  const appels: unknown[] = []
  return {
    modele,
    appels,
    effort: 'medium',
    maxTokens: 6000,
    intention: INTENTION,
    echappees: ECHAPPEES,
    gestesExistants: GESTES_EXISTANTS,
    personnes: PERSONNES,
    dossierClient,
    copieVide: COPIE_VIDE,
    fabriqueLe: '2026-10-10',
    cout: (u) => (u.entree + u.sortie) / 1_000_000,
    journaliser: (reponse, relance) => appels.push({ stop: reponse.message.stop_reason, relance }),
  }
}

describe('systemeFabriquer et messageFabriquer', () => {
  it('le système dit l’intention, les gestes existants, les six types, les deux formes, les tables, la frontière', () => {
    const s = systemeFabriquer(INTENTION, ['patron'], 'Table agents : …', GESTES_EXISTANTS)
    expect(s).toContain('heures_par_agent : les heures faites par un agent, ou par tous')
    expect(s).toContain('- voir_planning : ')
    for (const t of ['agent (', 'date (', 'periode (', 'site (', 'poste (', 'nombre ('])
      expect(s).toContain(t)
    expect(s).toContain('{{requete.colonne}}')
    // G4 (b) : la fidélité au texte validé, dite au modèle ; le rejeu reste strict.
    expect(s).toContain(
      'Chaque nombre et chaque nom de chaque réponse montrée doit apparaître dans ce que le geste rend ; si une réponse détaille, choisis un tableau qui rend le détail.',
    )
    expect(s).toContain('Table agents : …')
    expect(s).toContain('<donnees>')
    expect(s).toContain(OUTIL_PROPOSER_GESTE)
  })
  it('le message met les échappées entières entre les balises des données, avec le moment et la semaine', () => {
    const m = messageFabriquer(ECHAPPEES)
    expect(m).toMatch(/^Les demandes \(3\)/)
    expect(m).toContain('<donnees>### E-1')
    expect(m).toContain(
      'Moment : 2026-10-10T21:40 (samedi) ; semaine en cours du 2026-10-05 au 2026-10-11',
    )
    expect(m).toContain("Consigne : Combien d'heures Karim a-t-il fait cette semaine ?")
    expect(m).toContain('Requête 1 :\n')
    expect(m).toContain('Résultat 1 :\nnom | heures\nKarim Haddad | 24')
    expect(m).toContain('Réponse montrée :\nKarim Haddad : 24 heures.')
    expect(m).toContain("Demandeur : l'agent A-3")
    expect(m).toContain('</donnees>\nPropose le geste.')
  })
})

describe('completerGeste', () => {
  it('l’identifiant est l’intention ; chaque test reçoit consigne, rôle, agent, instantané, et contient : les nombres et noms du texte hors consigne ; l’agent est résolu, celui qui parle pour un agent', () => {
    const { geste, ecarts } = completerGeste(PROPOSE, INTENTION.id, ECHAPPEES, PERSONNES, ORIGINE)
    expect(ecarts).toEqual([])
    expect(geste?.id).toBe('heures_par_agent')
    expect(geste?.tests).toEqual([
      {
        echappee: 'E-1',
        consigne: "Combien d'heures Karim a-t-il fait cette semaine ?",
        role: 'patron',
        agent: null,
        params: { agent: 'A-1', du: DU, au: AU },
        instantane: 'echappees/E-1.json',
        contient: ['24', 'Haddad'],
      },
      {
        echappee: 'E-2',
        consigne: "Combien d'heures Julien a-t-il fait du 5 au 11 octobre ?",
        role: 'patron',
        agent: null,
        params: { agent: 'A-2', du: DU, au: AU },
        instantane: 'echappees/E-2.json',
        contient: ['16', 'Lefèvre'],
      },
      {
        echappee: 'E-3',
        consigne: "Combien d'heures j'ai fait cette semaine ?",
        role: 'agent',
        agent: 'A-3',
        params: { agent: 'A-3', du: DU, au: AU },
        instantane: 'echappees/E-3.json',
        contient: ['12'],
      },
    ])
    expect(geste?.origine).toEqual(ORIGINE)
  })
  it('un test manquant, une échappée inconnue, une personne introuvable, un rôle non ouvert : écart 2', () => {
    const { geste, ecarts } = completerGeste(
      {
        ...PROPOSE,
        roles: ['patron'],
        tests: [
          { echappee: 'E-1', params: { agent: 'Personne', du: DU, au: AU } },
          { echappee: 'E-9', params: {} },
          { echappee: 'E-3', params: { agent: null, du: DU, au: AU } },
        ],
      },
      INTENTION.id,
      ECHAPPEES,
      PERSONNES,
      ORIGINE,
    )
    expect(geste).toBeUndefined()
    expect(ecarts.map((e) => e.texte)).toEqual([
      'E-1 : « Personne » ne désigne personne',
      'un test cite une échappée inconnue : E-9',
      "E-3 est une demande du rôle agent, que le geste n'ouvre pas",
      "l'échappée E-2 n'a pas de test",
      expect.stringMatching(/^schéma : /),
    ])
  })
  it('un texte sans nombre ni nom ne fait pas un test', () => {
    const { ecarts } = completerGeste(
      PROPOSE,
      INTENTION.id,
      [
        ECHAPPEES[0] as EchappeeJournalisee,
        ECHAPPEES[1] as EchappeeJournalisee,
        echappee('E-3', 'Et moi ?', 'Aucune vacation.', { role: 'agent', agent: 'A-3' }),
      ],
      PERSONNES,
      ORIGINE,
    )
    expect(ecarts.map((e) => e.texte)).toContain(
      'E-3 : rien à vérifier dans le texte montré (ni nombre ni nom)',
    )
  })
})

describe('verifierGeste et rejouerTest', () => {
  const geste = (): GesteAppris => {
    const { geste: g } = completerGeste(PROPOSE, INTENTION.id, ECHAPPEES, PERSONNES, ORIGINE)
    if (!g) throw new Error('fixture')
    return g
  }
  const contexte = (dossierClient: string) => ({
    dossierClient,
    copieVide: COPIE_VIDE,
    consignes: ECHAPPEES.map((e) => e.consigne),
    personnes: PERSONNES,
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
    expect(await rejouerTest(g, t1, dossier)).toEqual({
      texte: 'Karim Haddad : 24 heures du 2026-10-05 au 2026-10-11.',
      manque: [],
    })
    expect(await rejouerTest(g, { ...t1, contient: ['24', '99'] }, dossier)).toMatchObject({
      manque: ['99'],
    })
    // L'agent : sa copie n'a que ses lignes, et c'est lui qui est lié (D4).
    expect(
      await rejouerTest(g, { ...t3, params: { ...t3.params, agent: 'A-1' } }, dossier),
    ).toEqual({ texte: 'Sophie Marchand : 12 heures du 2026-10-05 au 2026-10-11.', manque: [] })
    expect(await rejouerTest(g, { ...t1, instantane: 'echappees/E-0.json' }, dossier)).toEqual({
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

describe('ecrireGeste', () => {
  it('écrit gestes/<id>.yaml au statut proposé, sans validation, relisible ; un second du même id prend la date', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'fabriquer-'))
    const { geste } = completerGeste(PROPOSE, INTENTION.id, ECHAPPEES, PERSONNES, ORIGINE)
    if (!geste) throw new Error('fixture')
    expect(ecrireGeste(dossier, geste)).toBe(join('gestes', 'heures_par_agent.yaml'))
    const lu = FichierGeste.parse(
      parse(readFileSync(join(dossier, 'gestes', 'heures_par_agent.yaml'), 'utf8')),
    )
    expect(lu.statut).toBe('propose')
    expect(lu.validation).toBeUndefined()
    expect(gesteDe(lu)).toEqual(geste)
    expect(ecrireGeste(dossier, geste)).toBe(join('gestes', 'heures_par_agent-2026-10-10.yaml'))
    expect(ecrireGeste(dossier, geste)).toBe(join('gestes', 'heures_par_agent-2026-10-10-2.yaml'))
  })
})

describe('fabriquerGeste', () => {
  it('une proposition bien formée : un geste, un appel, rejeu 3/3, l’origine remplie', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [proposer(PROPOSE)])
    const issue = await fabriquerGeste(c)
    expect(issue).toMatchObject({
      sorte: 'geste',
      appels: 1,
      relance: false,
      rejeu: { ok: 3, total: 3 },
    })
    if (issue.sorte !== 'geste') throw new Error(issue.sorte)
    expect(issue.geste.origine).toEqual({
      fabrique_le: '2026-10-10',
      modele: 'simulé',
      cout_usd: 0.00015,
      conversations: ['C-E-1', 'C-E-2', 'C-E-3'],
    })
    expect(c.appels).toEqual([{ stop: 'tool_use', relance: false }])
    const appel = c.modele.appels[0]
    expect(appel?.outils.map((o) => o.name)).toEqual([OUTIL_PROPOSER_GESTE])
    expect(appel?.maxTokens).toBe(6000)
    expect(appel?.systeme).toContain('Table agents')
    expect(appel?.messages).toHaveLength(1)
  })
  it('un SQL avec une valeur en dur : écarts de fond, un seul appel (pas de relance)', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [
      proposer({
        ...PROPOSE,
        requetes: [{ nom: 'heures', sql: `${SQL_OK} HAVING a.nom <> 'Karim'` }],
      }),
      proposer(PROPOSE),
    ])
    const issue = await fabriquerGeste(c)
    expect(issue).toMatchObject({ sorte: 'ecarts', appels: 1, relance: false })
    if (issue.sorte !== 'ecarts') throw new Error(issue.sorte)
    expect(issue.ecarts.map((e) => e.texte)).toEqual([
      "la requête « heures » code une personne en dur : 'Karim'",
    ])
    expect(issue.propose.requetes[0]?.sql).toContain("'Karim'")
    expect(c.modele.appels).toHaveLength(1)
  })
  it('un test manquant : écart 2, pas de relance', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [proposer({ ...PROPOSE, tests: PROPOSE.tests.slice(0, 2) })])
    const issue = await fabriquerGeste(c)
    expect(issue.sorte).toBe('ecarts')
    if (issue.sorte !== 'ecarts') throw new Error(issue.sorte)
    expect(issue.ecarts.map((e) => e.texte)).toEqual([
      "l'échappée E-3 n'a pas de test",
      expect.stringMatching(/^schéma : /),
    ])
  })
  it('deux outils puis une bonne proposition : geste, deux appels, le second relancé avec la raison', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [
      {
        plusieurs: [
          { outil: OUTIL_PROPOSER_GESTE, entree: PROPOSE },
          { outil: OUTIL_PROPOSER_GESTE, entree: PROPOSE },
        ],
      },
      proposer(PROPOSE),
    ])
    const issue = await fabriquerGeste(c)
    expect(issue).toMatchObject({ sorte: 'geste', appels: 2, relance: true })
    expect(c.appels).toEqual([
      { stop: 'tool_use', relance: false },
      { stop: 'tool_use', relance: true },
    ])
    const second = c.modele.appels[1]
    expect(second?.messages).toHaveLength(3)
    // Le protocole : chaque appel d'outil de la réponse précédente reçoit son résultat.
    const motif =
      "La proposition précédente n'a pas pu être lue : 2 appels d'outil au lieu d'un. Propose à nouveau."
    const ids = ((second?.messages[1]?.content ?? []) as Anthropic.ContentBlock[])
      .filter((b) => b.type === 'tool_use')
      .map((b) => b.id)
    expect(ids).toHaveLength(2)
    expect(second?.messages[2]?.content).toEqual(
      ids.map((id) => ({ type: 'tool_result', tool_use_id: id, is_error: true, content: motif })),
    )
  })
  it('une requête qui lève puis une bonne : geste écrit après relance, l’erreur SQL dans le message', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [
      proposer({
        ...PROPOSE,
        requetes: [{ nom: 'heures', sql: 'SELECT nom FROM absente WHERE id = :agent' }],
      }),
      proposer(PROPOSE),
    ])
    const issue = await fabriquerGeste(c)
    expect(issue).toMatchObject({ sorte: 'geste', appels: 2, relance: true })
    const relance = c.modele.appels[1]?.messages[2]?.content as Anthropic.ToolResultBlockParam[]
    expect(relance).toHaveLength(1)
    expect(relance[0]).toMatchObject({ type: 'tool_result', is_error: true })
    expect(String(relance[0]?.content)).toMatch(
      /^La requête « heures » a échoué : .*no such table.*\. Propose à nouveau\.$/,
    )
  })
  it('deux échecs : « après relance », jamais un troisième appel', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [
      { texte: 'Voici le geste…' },
      { arret: 'max_tokens' },
      proposer(PROPOSE),
    ])
    const issue = await fabriquerGeste(c)
    expect(issue).toEqual({
      sorte: 'echec',
      raison: `réponse tronquée, ${APRES_RELANCE}`,
      injoignable: false,
      usage: { entree: 200, sortie: 100, cacheEcrit: 0, cacheLu: 0 },
      usageBorne: false,
      appels: 2,
      relance: true,
    })
    expect(c.modele.appels).toHaveLength(2)
  })
  it('un refus ou une troncature : échec sans relance (le modèle ne finira pas mieux) ; un outil inconnu, une forme fausse : relancés une fois, puis échec', async () => {
    const dossier = dossierAvecInstantanes()
    const refus = await fabriquerGeste(cadre(dossier, [{ arret: 'refusal' }, proposer(PROPOSE)]))
    expect(refus).toMatchObject({ sorte: 'echec', raison: 'le modèle a refusé', appels: 1 })
    const tronque = cadre(dossier, [{ arret: 'max_tokens' }, proposer(PROPOSE)])
    expect(await fabriquerGeste(tronque)).toMatchObject({
      sorte: 'echec',
      raison: 'réponse tronquée',
      appels: 1,
      relance: false,
    })
    expect(tronque.modele.appels).toHaveLength(1)
    const inconnu = await fabriquerGeste(
      cadre(dossier, [
        { outil: 'autre', entree: {} },
        { outil: 'autre', entree: {} },
      ]),
    )
    expect(inconnu).toMatchObject({
      sorte: 'echec',
      raison: `outil inconnu : autre, ${APRES_RELANCE}`,
    })
    const forme = await fabriquerGeste(
      cadre(dossier, [proposer({ ...PROPOSE, requetes: [] }), proposer({ description: 'x' })]),
    )
    expect(forme).toMatchObject({ sorte: 'echec', appels: 2 })
    if (forme.sorte !== 'echec') throw new Error(forme.sorte)
    expect(forme.raison).toMatch(/^forme : /)
  })
  it('« null » écrit en texte se relit comme null (GMI ignore strict)', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [
      proposer({
        ...PROPOSE,
        reponse: { ...PROPOSE.reponse, tableau: 'null' },
        tests: PROPOSE.tests.map((t) =>
          t.echappee === 'E-3' ? { ...t, params: { ...t.params, agent: 'None' } } : t,
        ),
      }),
    ])
    expect((await fabriquerGeste(c)).sorte).toBe('geste')
  })
  it('moins de trois réponses finies proprement : échec sans appel', async () => {
    const dossier = dossierAvecInstantanes()
    const c = cadre(dossier, [proposer(PROPOSE)])
    const issue = await fabriquerGeste({ ...c, echappees: ECHAPPEES.slice(0, 2) })
    expect(issue).toEqual({
      sorte: 'echec',
      raison: '2 réponse(s) finie(s) proprement, 3 au moins',
      injoignable: false,
      usage: { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 0 },
      usageBorne: false,
      appels: 0,
      relance: false,
    })
    expect(c.modele.appels).toHaveLength(0)
    expect(existsSync(join(dossier, 'gestes'))).toBe(false)
  })
})
