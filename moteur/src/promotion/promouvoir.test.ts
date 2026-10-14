import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { VALIDEE } from '../approbation/jeton'
import type { Action, Intention } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import type { MetierConversation } from '../conversation/conversation'
import { CONTROLE_OK, OUTIL_VERIFIER } from '../echappee/boucle'
import type { TableCopie } from '../echappee/copie'
import {
  cheminInstantane,
  ecrireInstantane,
  TYPE_ECHAPPEE,
  TYPE_OUTIL_ECHAPPEE,
} from '../echappee/echappee'
import { masquerTexte } from '../echappee/pseudonymes'
import { ISSUE_GESTE, TYPE_GESTE_APPRIS } from '../gestes/charger'
import { DOSSIER_GESTES } from '../gestes/geste-appris'
import {
  DOMAINE_EXEMPLE,
  OPERATION_EXEMPLE,
  TYPES_EXEMPLE,
} from '../gestes/geste-appris.test.fixture'
import { type Evenement, Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import { modeleSimule, type Scripte } from '../modele/simule'
import { FUSEAU, Temporal } from '../temps/temporal'
import { OUTIL_PROPOSER_GESTE } from './fabriquer'
import { aProposer, debutFenetre, intentions, TYPE_PROMOTION } from './promotion'
import { compterFabrications, promouvoir } from './promouvoir'

// Ce que `pnpm promotions` fait d'une intention au seuil, avec le modèle
// simulé (PLAN-PROMOTION.md § 6.5) : le dossier porte « vérification : 3/3 » ;
// une intention qui écrit se fabrique depuis ses propositions validées, et son
// geste propose des réaffectations, rejouées à l'identique (§ 10) ; sans
// modèle, aucun appel ; la passe de traduction décide « activable ».

const CLIENT = 'fictif'
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
  ],
}
const VACATIONS: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'agent', type: 'TEXT', description: "l'agent (agents.id)" },
    { nom: 'jour', type: 'TEXT', description: 'le jour, AAAA-MM-JJ' },
    { nom: 'heures', type: 'REAL', description: 'durée' },
  ],
  lignes: [
    { agent: 'A-1', jour: '2026-10-07', heures: 12 },
    { agent: 'A-1', jour: '2026-10-09', heures: 12 },
    { agent: 'A-2', jour: '2026-10-07', heures: 12 },
    { agent: 'A-2', jour: '2026-10-08', heures: 4 },
  ],
}
const CONFIG: ConfigConversation = {
  modele: {
    fournisseur: 'anthropic',
    id: 'simulé',
    prix_par_million_usd: { entree: 1, sortie: 1, cache_ecrit: 0, cache_lu: 0 },
    effort: { traduire: 'low', echappee: 'medium' },
  },
  plafonds: {
    par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 },
    fabrication: { tokens_sortie: 20000 },
    par_mois_usd: 30,
  },
  promotion: { occurrences: 3, jours: 30, conservation_jours: 90 },
}
const INTENTIONS: Intention[] = [
  { id: 'heures_par_agent', description: 'les heures faites par un agent', ecrit: false },
  { id: 'liberer_un_jour', description: 'libérer un agent un jour', ecrit: true },
]
const VOIR_PLANNING: Action<Session, unknown> = {
  id: 'voir_planning',
  description: 'le planning d’un agent ou de tous',
  parametres: { safeParse: () => ({ success: true, data: {} }) } as never,
  roles: ['patron'],
  ecrit: false,
  reformuler: () => '',
  executer: () => ({ texte: '' }),
}
const MAINTENANT = Temporal.PlainDateTime.from('2026-10-10T23:59').toZonedDateTime(FUSEAU)
const DU = '2026-10-05'
const AU = '2026-10-11'
const SQL =
  'SELECT a.nom AS nom, COALESCE(SUM(v.heures), 0) AS heures FROM agents a LEFT JOIN vacations v ON v.agent = a.id AND v.jour BETWEEN :du AND :au WHERE a.id = :agent GROUP BY a.id'
const PROPOSE = {
  description: 'les heures faites par un agent nommé sur une période',
  roles: ['patron'],
  parametres: {
    agent: { type: 'agent', description: "l'agent nommé" },
    periode: { type: 'periode', description: 'la période' },
  },
  requetes: [{ nom: 'heures', sql: SQL }],
  reponse: { ligne: '{{heures.nom}} : {{heures.heures}} heures.', tableau: null, vide: 'Rien.' },
  tests: [
    { echappee: 'E-1', params: { agent: 'Karim', du: DU, au: AU } },
    { echappee: 'E-2', params: { agent: 'Julien', du: DU, au: AU } },
    { echappee: 'E-3', params: { agent: 'Karim', du: DU, au: AU } },
  ],
}
const proposer = (propose: unknown): Scripte => ({ outil: OUTIL_PROPOSER_GESTE, entree: propose })

/** Les vacations, avec leur identifiant, pour une intention qui écrit. */
const VACATIONS_ID: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: "l'identifiant (V-1)" },
    { nom: 'agent', type: 'TEXT', description: "l'agent (agents.id)" },
    { nom: 'jour', type: 'TEXT', description: 'le jour, AAAA-MM-JJ' },
  ],
  lignes: [
    { id: 'V-1', agent: 'A-1', jour: '2026-10-07' },
    { id: 'V-2', agent: 'A-1', jour: '2026-10-09' },
    { id: 'V-3', agent: 'A-2', jour: '2026-10-07' },
    { id: 'V-4', agent: 'A-2', jour: '2026-10-08' },
  ],
}
/** Chaque vacation du jour de l'agent, à l'autre agent : le premier par identifiant. */
const SQL_LIBERER =
  'SELECT v.id AS vacation, (SELECT a.id FROM agents a WHERE a.id <> v.agent ORDER BY a.id LIMIT 1) AS agent FROM vacations v WHERE v.agent = :agent AND v.jour = :date'
const PROPOSE_LIBERER = {
  description: 'libérer un agent de ses vacations d’un jour, chacune donnée à un autre agent',
  roles: ['patron'],
  parametres: {
    agent: { type: 'agent', description: "l'agent à libérer" },
    date: { type: 'date', description: 'le jour à libérer' },
  },
  requetes: [{ nom: 'liberer', sql: SQL_LIBERER }],
  modifications: {
    pour_chaque: 'liberer',
    operation: 'reaffecter',
    colonnes: { vacation: 'vacation', agent: 'agent' },
  },
  reponse: { ligne: null, tableau: 'liberer', vide: 'Aucune vacation ce jour-là.' },
  tests: [
    { echappee: 'E-1', params: { agent: 'A-1', date: '2026-10-07' } },
    { echappee: 'E-2', params: { agent: 'A-2', date: '2026-10-08' } },
    { echappee: 'E-3', params: { agent: 'A-1', date: '2026-10-09' } },
  ],
}

/** Trois propositions de l'échappée, validées par le patron (P9), leurs instantanés écrits ; une vérification sur la première. */
function dossierAvecPropositions(): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'promouvoir-'))
  const s = METIER.ouvrir(dossier)
  const cas: [string, string, string, string][] = [
    ['E-1', 'Libère le mercredi 7 de Karim.', 'Libère le mercredi 7 de A-1.', 'V-1 A-2'],
    ['E-2', 'Libère le jeudi 8 de Julien.', 'Libère le jeudi 8 de A-2.', 'V-4 A-1'],
    ['E-3', 'Libère le vendredi 9 de Karim.', 'Libère le vendredi 9 de A-1.', 'V-2 A-2'],
  ]
  for (const [n, [id, consigne, consigneModele, modif]] of cas.entries()) {
    const horodatage = `2026-10-0${n + 7}T08:00:00Z`
    const [vacation, agent] = modif.split(' ')
    const modifications = [{ type: 'reaffecter', vacation, agent }]
    ecrireInstantane(dossier, {
      echappee: id,
      horodatage,
      role: 'patron',
      tables: [AGENTS, VACATIONS_ID],
    })
    const conversation = `C-${id}`
    const evenements: Evenement[] = [
      {
        type: TYPE_ECHAPPEE,
        client: CLIENT,
        objet: conversation,
        issue: 'proposition',
        motif: consigne,
        donnees: {
          echappee: id,
          intention: 'liberer_un_jour',
          role: 'patron',
          consigne_modele: consigneModele,
          modifications,
          constats: [],
          texte: `Proposition R-${id} : Karim Haddad → Julien Lefèvre`,
          instantane: cheminInstantane(id),
        },
      },
      {
        type: 'reaffectation',
        client: CLIENT,
        objet: `R-${id}`,
        issue: 'reçue',
        donnees: { conversation, modifications },
      },
      { type: 'reaffectation', client: CLIENT, objet: `R-${id}`, issue: VALIDEE },
    ]
    if (n === 0) {
      evenements.unshift({
        type: TYPE_OUTIL_ECHAPPEE,
        client: CLIENT,
        objet: conversation,
        issue: OUTIL_VERIFIER,
        donnees: {
          echappee: id,
          tour: 2,
          entree: { modifications },
          sortie: 'V-1 : A-1 → A-2\naucun constat',
        },
      })
    }
    s.journal.ecrire(evenements, horodatage)
  }
  return s
}

interface Session {
  dossier: string
  journal: Journal
}

const PERSONNES = AGENTS.lignes.map((a) => ({
  id: String(a.id),
  nom: String(a.nom),
  sorte: 'personne' as const,
}))

/** Un métier minimal : un journal, une copie, deux intentions. */
const METIER: MetierConversation<Session> = {
  ouvrir: (dossier) => ({ dossier, journal: new Journal(join(dossier, 'journal.sqlite')) }),
  fermer: (s) => s.journal.fermer(),
  config: () => CONFIG,
  client: () => CLIENT,
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => ({
    client: CLIENT,
    journal: new Journal(join(dossier, 'journal.sqlite')),
    config: CONFIG,
  }),
  actions: [VOIR_PLANNING],
  intentions: INTENTIONS,
  copie: () => [AGENTS, VACATIONS],
  roles: [
    {
      id: 'patron',
      enMots: 'le patron',
      identifie: false,
      capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
    },
    { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
  ],
  typesParametre: TYPES_EXEMPLE,
  operation: OPERATION_EXEMPLE,
  domaine: DOMAINE_EXEMPLE,
  vocabulaire: () => ({ noms: PERSONNES }),
  noms: () => PERSONNES,
  verifierIdentite: () => undefined,
}

/** Trois échappées finies proprement d'une intention, leurs instantanés écrits. */
function dossierAvecEchappees(intention = 'heures_par_agent'): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'promouvoir-'))
  const s = METIER.ouvrir(dossier)
  const personnes = AGENTS.lignes.map((a) => ({
    id: String(a.id),
    nom: String(a.nom),
    sorte: 'personne' as const,
  }))
  const cas: [string, string, string][] = [
    ['E-1', "Combien d'heures Karim a-t-il fait cette semaine ?", 'Karim Haddad : 24 heures.'],
    ['E-2', "Combien d'heures Julien a-t-il fait cette semaine ?", 'Julien Lefèvre : 16 heures.'],
    ['E-3', 'Et Karim, du 5 au 11 octobre ?', 'Karim Haddad, 24 heures.'],
  ]
  for (const [n, [id, consigne, texte]] of cas.entries()) {
    const horodatage = `2026-10-0${n + 7}T08:00:00Z`
    ecrireInstantane(dossier, {
      echappee: id,
      horodatage,
      role: 'patron',
      tables: [AGENTS, VACATIONS],
    })
    const ligne: Evenement = {
      type: TYPE_ECHAPPEE,
      client: CLIENT,
      objet: `C-${id}`,
      issue: 'reponse',
      motif: consigne,
      donnees: {
        echappee: id,
        intention,
        role: 'patron',
        cout_usd: 0.01,
        controle_reponse: CONTROLE_OK,
        texte,
        // Ce que le modèle a lu et écrit, sans aucun nom (PLAN-PSEUDONYMES.md S5).
        consigne_modele: masquerTexte(consigne, personnes),
        texte_modele: masquerTexte(texte, personnes),
        instantane: cheminInstantane(id),
      },
    }
    s.journal.ecrire([ligne], horodatage)
  }
  return s
}

const auSeuil = (s: Session, intention = 'heures_par_agent') => {
  const i = aProposer(
    intentions(s.journal, debutFenetre(MAINTENANT, CONFIG.promotion.jours)),
    s.journal,
    { occurrences: CONFIG.promotion.occurrences },
  ).find((x) => x.intention === intention)
  if (!i) throw new Error('jeu de test sans intention au seuil')
  return i
}
const lignes = (s: Session, type: string) => s.journal.lire().filter((l) => l.type === type)
const bilanOk = { ok: 58, total: 60, taux: 58 / 60, coutUsd: 0.12, stricts: ['AP-4'], appels: 61 }

describe('promouvoir', () => {
  it('sans modèle : le dossier seul, aucun appel, rien dans gestes/', async () => {
    const s = dossierAvecEchappees()
    const { dossier, fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s),
      MAINTENANT,
      30,
      {},
    )
    expect(fabrication).toBeUndefined()
    const md = readFileSync(dossier, 'utf8')
    expect(md).not.toContain('## Geste proposé')
    expect(md).toContain('- [ ] Le coder dans `ACTIONS` du métier.')
    expect(lignes(s, TYPE_APPEL)).toEqual([])
    expect(existsSync(join(s.dossier, DOSSIER_GESTES))).toBe(false)
    METIER.fermer(s)
  })
  it('une intention qui écrit, au seuil : fabriquée depuis les propositions validées, relues dans le journal par l’opération, sans aucun nom ; le geste propose et rejoue les modifications', async () => {
    const s = dossierAvecPropositions()
    const modele = modeleSimule([proposer(PROPOSE_LIBERER)])
    const { dossier, fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s, 'liberer_un_jour'),
      MAINTENANT,
      30,
      { modele },
    )
    expect(fabrication).toMatchObject({ sorte: 'ecrit', rejeu: { ok: 3, total: 3 } })
    const ecrit = parse(
      readFileSync(join(s.dossier, DOSSIER_GESTES, 'liberer_un_jour.yaml'), 'utf8'),
    )
    expect(ecrit.modifications).toEqual(PROPOSE_LIBERER.modifications)
    expect(ecrit.tests.map((t: { modifications: unknown }) => t.modifications)).toEqual([
      [{ vacation: 'V-1', agent: 'A-2' }],
      [{ vacation: 'V-4', agent: 'A-1' }],
      [{ vacation: 'V-2', agent: 'A-2' }],
    ])
    expect(readFileSync(dossier, 'utf8')).toContain('Vérification : 3/3')

    // Ce que la fabrication a lu : les consignes masquées, les vérifications, les modifications validées ; aucun nom.
    const [appel] = modele.appels
    const message = JSON.stringify(appel?.messages)
    expect(message).toContain('Libère le jeudi 8 de A-2.')
    expect(message).toContain('Vérification 1 :')
    expect(message).toContain(
      'Modifications validées par le patron (vacation → agent) :\\nV-4 → A-1',
    )
    expect(`${message}${appel?.systeme}`).not.toMatch(/Karim|Julien|Haddad|Lefèvre/)
    expect(appel?.systeme).toContain('Les rôles : patron seulement')
    expect(Object.keys(appel?.outils[0]?.input_schema.properties ?? {})).toContain('modifications')
    METIER.fermer(s)
  })
  it('une intention qui écrit : la fabrication reçoit les règles et les préférences que le métier déclare pour ses propositions', async () => {
    const s = dossierAvecPropositions()
    const avecCriteres: MetierConversation<Session> = {
      ...METIER,
      proposition: {
        ouvrir: () => ({ id: 'R-1', texte: '' }),
        valider: () => '',
        criteres: () => ({
          regles: [{ id: 'I-01', nom: 'carte professionnelle valide' }],
          preferences: "d'abord un agent qui connaît déjà le site",
        }),
      },
    }
    const modele = modeleSimule([proposer(PROPOSE_LIBERER)])
    await promouvoir(avecCriteres, s, s.dossier, auSeuil(s, 'liberer_un_jour'), MAINTENANT, 30, {
      modele,
    })
    const systeme = modele.appels[0]?.systeme ?? ''
    expect(systeme).toContain('- I-01 — carte professionnelle valide')
    expect(systeme).toContain(
      "pour choisir entre des propositions qui respectent toutes les règles : d'abord un agent qui connaît déjà le site.",
    )
    METIER.fermer(s)
  })
  it('une intention qui écrit : un rejeu qui ajoute une modification est un écart de fond', async () => {
    const s = dossierAvecPropositions()
    const { fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s, 'liberer_un_jour'),
      MAINTENANT,
      30,
      {
        modele: modeleSimule([
          proposer({
            ...PROPOSE_LIBERER,
            requetes: [
              { nom: 'liberer', sql: SQL_LIBERER.replace('v.jour = :date', 'v.jour >= :date') },
            ],
          }),
        ]),
      },
    )
    expect(fabrication?.sorte).toBe('ecarts')
    expect(fabrication?.ecarts).toContain(
      'E-1 : le rejeu propose « V-2 → A-2 », jamais validé (rendu : « V-1 → A-2, V-2 → A-2 »)',
    )
    expect(existsSync(join(s.dossier, DOSSIER_GESTES))).toBe(false)
    METIER.fermer(s)
  })
  it('une intention qui lit : l’outil de fabrication n’a pas de modifications', async () => {
    const s = dossierAvecEchappees()
    const modele = modeleSimule([proposer(PROPOSE)])
    await promouvoir(METIER, s, s.dossier, auSeuil(s), MAINTENANT, 30, { modele })
    expect(Object.keys(modele.appels[0]?.outils[0]?.input_schema.properties ?? {})).not.toContain(
      'modifications',
    )
    METIER.fermer(s)
  })
  it('la fabrication reçoit son plafond de la config, pas celui de la demande', async () => {
    const s = dossierAvecEchappees()
    const modele = modeleSimule([proposer(PROPOSE)])
    await promouvoir(METIER, s, s.dossier, auSeuil(s), MAINTENANT, 30, { modele })
    expect(modele.appels[0]?.maxTokens).toBe(CONFIG.plafonds.fabrication?.tokens_sortie)
    METIER.fermer(s)
  })
  it('une intention hors du catalogue : non tentée', async () => {
    const s = dossierAvecEchappees('mot_cle_libre')
    const modele = modeleSimule([proposer(PROPOSE)])
    const { fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s, 'mot_cle_libre'),
      MAINTENANT,
      30,
      { modele },
    )
    expect(fabrication?.sorte).toBe('hors_catalogue')
    expect(modele.appels).toHaveLength(0)
    METIER.fermer(s)
  })
  it('le plafond du mois atteint : fabrication reportée, aucun appel', async () => {
    const s = dossierAvecEchappees()
    s.journal.ecrire(
      [
        {
          type: TYPE_APPEL,
          client: CLIENT,
          objet: 'C-x',
          issue: 'traduire',
          donnees: { cout_usd: 30 },
        },
      ],
      '2026-10-09T08:00:00Z',
    )
    const modele = modeleSimule([proposer(PROPOSE)])
    const { fabrication } = await promouvoir(METIER, s, s.dossier, auSeuil(s), MAINTENANT, 30, {
      modele,
    })
    expect(fabrication?.sorte).toBe('plafond')
    expect(modele.appels).toHaveLength(0)
    METIER.fermer(s)
  })
  it('fabriqué, vérifié, écrit : le dossier dit « vérification : 3/3 », la traduction décide « activable », tout est au journal', async () => {
    const s = dossierAvecEchappees()
    const modele = modeleSimule([proposer(PROPOSE)])
    const i = auSeuil(s)
    const { dossier, fabrication } = await promouvoir(METIER, s, s.dossier, i, MAINTENANT, 30, {
      modele,
      traduction: async (geste, fichier) => {
        expect(geste.id).toBe('heures_par_agent')
        expect(fichier).toBe(join(DOSSIER_GESTES, 'heures_par_agent.yaml'))
        return bilanOk
      },
    })
    expect(fabrication).toMatchObject({
      sorte: 'ecrit',
      relance: false,
      rejeu: { ok: 3, total: 3 },
      fichier: join(DOSSIER_GESTES, 'heures_par_agent.yaml'),
      traduction: { ok: 58, total: 60, cout_usd: 0.12, stricts: ['AP-4'] },
      activable: true,
    })
    expect(existsSync(join(s.dossier, DOSSIER_GESTES, 'heures_par_agent.yaml'))).toBe(true)
    const md = readFileSync(dossier, 'utf8')
    expect(md).toContain('## Geste proposé')
    expect(md).toContain('Fichier : `gestes/heures_par_agent.yaml` (statut proposé, empreinte `')
    expect(md).toContain(
      'Vérification : 3/3 ; traduction : 97 % (58/60, 0,12 $) ; cas stricts en écart : AP-4.',
    )
    expect(md).toContain('Activable : oui.')
    expect(md).toContain('Coût de la fabrication : 0,00 $.')
    expect(md).toContain('- [ ] Relire le YAML du geste (atelier).')
    expect(md).not.toContain('Le coder dans `ACTIONS`')

    const appels = lignes(s, TYPE_APPEL)
    expect(appels.map((l) => [l.objet, l.issue])).toEqual([
      ['heures_par_agent', 'fabriquer'],
      ['heures_par_agent', 'verifier'],
    ])
    expect(JSON.parse(appels[0]?.donnees ?? '{}')).toMatchObject({ tour: 1, relance: false })
    expect(JSON.parse(appels[1]?.donnees ?? '{}')).toEqual({
      appels: 61,
      modele: 'simulé',
      cout_usd: 0.12,
    })
    const gestes = lignes(s, TYPE_GESTE_APPRIS)
    expect(gestes.map((l) => l.issue)).toEqual([ISSUE_GESTE.propose, ISSUE_GESTE.verifie])
    const propose = JSON.parse(gestes[0]?.donnees ?? '{}')
    expect(propose).toMatchObject({
      fichier: join(DOSSIER_GESTES, 'heures_par_agent.yaml'),
      ecarts: [],
    })
    expect(JSON.parse(gestes[1]?.donnees ?? '{}')).toEqual({
      jeton: propose.jeton,
      ecarts: [],
      traduction: { taux: 58 / 60, atteint: true, cout_usd: 0.12 },
    })
    const [promotion] = lignes(s, TYPE_PROMOTION)
    expect(JSON.parse(promotion?.donnees ?? '{}').fabrication).toMatchObject({
      sorte: 'ecrit',
      activable: true,
      jeton: propose.jeton,
    })
    METIER.fermer(s)
  })
  it('sans passe de traduction (évals) : écrit, non activable, pas de ligne vérifié ; sous le seuil : non activable', async () => {
    const s = dossierAvecEchappees()
    const { fabrication } = await promouvoir(METIER, s, s.dossier, auSeuil(s), MAINTENANT, 30, {
      modele: modeleSimule([proposer(PROPOSE)]),
    })
    expect(fabrication).toMatchObject({ sorte: 'ecrit', activable: false })
    expect(fabrication?.traduction).toBeUndefined()
    expect(lignes(s, TYPE_GESTE_APPRIS).map((l) => l.issue)).toEqual([ISSUE_GESTE.propose])

    const t = dossierAvecEchappees()
    const sous = await promouvoir(METIER, t, t.dossier, auSeuil(t), MAINTENANT, 30, {
      modele: modeleSimule([proposer(PROPOSE)]),
      traduction: async () => ({ ...bilanOk, ok: 50, taux: 50 / 60 }),
    })
    expect(sous.fabrication).toMatchObject({ sorte: 'ecrit', activable: false })
    expect(readFileSync(sous.dossier, 'utf8')).toContain('Activable : non')
    METIER.fermer(s)
    METIER.fermer(t)
  })
  it('une passe de traduction qui échoue ne perd pas le geste : le dossier le dit', async () => {
    const s = dossierAvecEchappees()
    const { dossier, fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s),
      MAINTENANT,
      30,
      {
        modele: modeleSimule([proposer(PROPOSE)]),
        traduction: async () => {
          throw new Error('clé absente')
        },
      },
    )
    expect(fabrication).toMatchObject({
      sorte: 'ecrit',
      activable: false,
      traduction: { erreur: 'clé absente' },
    })
    expect(readFileSync(dossier, 'utf8')).toContain('traduction : passe impossible (clé absente)')
    METIER.fermer(s)
  })
  it('des écarts de fond : rien d’écrit dans gestes/, le dossier liste les écarts et la proposition en YAML', async () => {
    const s = dossierAvecEchappees()
    const { dossier, fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s),
      MAINTENANT,
      30,
      {
        modele: modeleSimule([
          proposer({
            ...PROPOSE,
            requetes: [{ nom: 'heures', sql: `${SQL} HAVING a.nom <> 'Karim'` }],
          }),
        ]),
      },
    )
    expect(fabrication).toMatchObject({
      sorte: 'ecarts',
      ecarts: ["la requête « heures » code une personne en dur : 'Karim'"],
    })
    expect(existsSync(join(s.dossier, DOSSIER_GESTES))).toBe(false)
    const md = readFileSync(dossier, 'utf8')
    expect(md).toContain('écartée par la vérification (rejeu : 3/3)')
    expect(md).toContain("- la requête « heures » code une personne en dur : 'Karim'")
    expect(md).toContain(
      '```yaml\ndescription: les heures faites par un agent nommé sur une période',
    )
    expect(lignes(s, TYPE_GESTE_APPRIS)).toEqual([])
    const [promotion] = lignes(s, TYPE_PROMOTION)
    expect(JSON.parse(promotion?.donnees ?? '{}').fabrication.proposition).toBeUndefined()
    METIER.fermer(s)
  })
  it('un échec après relance : le dossier dit « à coder à l’atelier », deux appels au journal, le second relancé', async () => {
    const s = dossierAvecEchappees()
    const { dossier, fabrication } = await promouvoir(
      METIER,
      s,
      s.dossier,
      auSeuil(s),
      MAINTENANT,
      30,
      {
        modele: modeleSimule([{ texte: 'voilà' }, { texte: 'encore' }]),
      },
    )
    expect(fabrication).toMatchObject({ sorte: 'echec', relance: true })
    expect(readFileSync(dossier, 'utf8')).toContain(
      "Fabrication échouée : aucun appel d'outil, après relance. À coder à l’atelier.",
    )
    expect(lignes(s, TYPE_APPEL).map((l) => JSON.parse(l.donnees ?? '{}').relance)).toEqual([
      false,
      true,
    ])
    METIER.fermer(s)
  })
})

describe('promouvoir, le modèle injoignable', () => {
  it('une panne de transport : le dossier le dit, aucune ligne promotion proposée, l’intention reste à proposer', async () => {
    const s = dossierAvecEchappees()
    const i = auSeuil(s)
    const { dossier, fabrication } = await promouvoir(METIER, s, s.dossier, i, MAINTENANT, 30, {
      modele: modeleSimule([]),
    })
    expect(fabrication).toMatchObject({
      sorte: 'echec',
      injoignable: true,
      raison: 'le modèle est injoignable : script simulé épuisé',
    })
    expect(readFileSync(dossier, 'utf8')).toContain('le prochain `pnpm promotions` réessaiera')
    expect(lignes(s, TYPE_PROMOTION)).toEqual([])
    expect(auSeuil(s).intention).toBe(i.intention)
    METIER.fermer(s)
  })
})

describe('compterFabrications', () => {
  it('compte au seuil, non tentées, tentées, écrites (dont après relance), activables, échecs de forme par appel, pannes, écarts de fond', () => {
    expect(
      compterFabrications([
        { sorte: 'hors_catalogue', relance: false, appels: 0, cout_usd: 0 },
        { sorte: 'ecrit', relance: true, appels: 2, cout_usd: 0.01, activable: true },
        { sorte: 'ecrit', relance: false, appels: 1, cout_usd: 0.01, activable: false },
        { sorte: 'echec', relance: true, appels: 2, cout_usd: 0.02, raison: 'forme' },
        { sorte: 'echec', relance: false, appels: 1, cout_usd: 0, raison: 'réponse tronquée' },
        {
          sorte: 'echec',
          relance: false,
          appels: 0,
          cout_usd: 0,
          raison: 'aucun instantané lisible',
        },
        {
          sorte: 'echec',
          relance: false,
          appels: 0,
          cout_usd: 0,
          raison: 'injoignable',
          injoignable: true,
        },
        { sorte: 'ecarts', relance: false, appels: 1, cout_usd: 0.01, ecarts: ['x'] },
      ]),
    ).toEqual([
      'Intentions au seuil : 8',
      'Non tentées (hors catalogue, plafond) : 1',
      'Tentées : 6',
      'Écrites sans écart : 2, dont après relance : 1',
      'Activables : 1',
      "Échecs de forme ou d'exécution au premier appel (relancés) : 2",
      "Échecs de forme ou d'exécution après relance : 1",
      'Échecs sans relance (refus, troncature) : 1',
      'Pannes du fournisseur : 1',
      'Écarts de fond : 1',
    ])
  })
})
