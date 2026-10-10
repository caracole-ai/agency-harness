import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ConfigConversation } from '../conversation/config'
import type { MetierConversation } from '../conversation/conversation'
import { ecrireInstantane } from '../echappee/echappee'
import { DOSSIER_GESTES } from '../gestes/geste-appris'
import { GESTE_EXEMPLE } from '../gestes/geste-appris.exemple'
import { Journal } from '../journal/journal'
import { modeleSimule } from '../modele/simule'
import { FICHIER_PERSONNES } from '../personnes/personnes'
import { casDuFichier, casDuGeste, DOSSIER_PROMOTIONS, passeTraduction } from './traduction'

// Les cas de traduction prêts à jouer (PLAN-PROMOTION.md § 7.1, P13) : ceux
// du fichier, et les tests d'un geste appris, au moment de leur échappée ; et
// la passe qui les joue, le geste chargé par son fichier, pour décider
// « activable ».

const CONFIG: ConfigConversation = {
  modele: {
    fournisseur: 'anthropic',
    id: 'simulé',
    prix_par_million_usd: { entree: 1, sortie: 1, cache_ecrit: 0, cache_lu: 0 },
    effort: { traduire: 'low', echappee: 'medium' },
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 }, par_mois_usd: 30 },
  promotion: { occurrences: 3, jours: 30, conservation_jours: 90 },
}

interface Session {
  dossier: string
  journal: Journal
}

/** Un métier minimal, sans geste codé ni intention : seul le geste appris du dossier est à choisir. */
const METIER: MetierConversation<Session> = {
  ouvrir: (dossier) => ({ dossier, journal: new Journal(join(dossier, 'journal.sqlite')) }),
  fermer: (s) => s.journal.fermer(),
  config: () => CONFIG,
  client: () => 'fictif',
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => ({
    client: 'fictif',
    journal: new Journal(join(dossier, 'journal.sqlite')),
    config: CONFIG,
  }),
  actions: [],
  intentions: [],
  copie: () => [],
  vocabulaire: () => ({ agents: [{ id: 'A-2', nom: 'Julien Lefèvre' }] }),
  verifierIdentite: () => undefined,
}

describe('passeTraduction', () => {
  it('joue consignes.yaml et les tests du geste, le geste chargé par son fichier, écrit le tableau à côté du dossier de promotion et rend le bilan', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'passe-'))
    writeFileSync(join(dossier, FICHIER_PERSONNES), 'personnes:\n  - { role: patron }\n')
    mkdirSync(join(dossier, DOSSIER_GESTES))
    writeFileSync(
      join(dossier, DOSSIER_GESTES, 'heures_par_agent.yaml'),
      JSON.stringify({ ...GESTE_EXEMPLE, statut: 'propose' }),
    )
    ecrireInstantane(dossier, {
      echappee: 'E-1',
      horodatage: '2026-10-10T19:40:00Z',
      role: 'patron',
      tables: [],
    })
    const appris: string[][] = []
    const cas: string[] = []
    // Un cas du fichier, puis les trois cas du geste (le même instantané) : quatre réponses scriptées
    // sur un seul modèle simulé (la passe en demande un par cas), la dernière fausse.
    const bon = {
      outil: 'heures_par_agent',
      entree: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
    }
    const simule = modeleSimule([
      { outil: 'repondre', entree: { texte: 'rien' } },
      bon,
      bon,
      { outil: 'repondre', entree: { texte: '?' } },
    ])
    const passe = await passeTraduction(
      METIER,
      dossier,
      GESTE_EXEMPLE,
      {
        maintenant: '2026-10-10T21:40',
        cas: [{ id: 'X', role: 'patron', consigne: 'Le planning', attendu: { sorte: 'inconnue' } }],
      },
      () => simule,
      {
        date: '2026-10-11',
        surAppris: (ids, erreurs) => appris.push(ids, erreurs),
        surCas: (r) => cas.push(`${r.id}:${r.ecarts.length === 0 ? 'ok' : r.ecarts.join(' ; ')}`),
      },
    )
    expect(appris).toEqual([['heures_par_agent'], []])
    expect(cas).toEqual([
      'X:ok',
      'G-heures_par_agent-1:ok',
      'G-heures_par_agent-2:ok',
      'G-heures_par_agent-3:sorte inconnue (action inconnue : repondre), attendu action',
    ])
    expect(passe).toMatchObject({
      ok: 3,
      total: 4,
      taux: 0.75,
      stricts: [],
      appels: 4,
      idModele: 'simulé',
    })
    expect(passe.tableau).toBe(
      join(dossier, DOSSIER_PROMOTIONS, 'heures_par_agent-2026-10-11-traduction.md'),
    )
    expect(existsSync(passe.tableau)).toBe(true)
    expect(readFileSync(passe.tableau, 'utf8')).toContain(
      '# Traduction avec le geste heures_par_agent chargé — 2026-10-11',
    )
  })
})

describe('casDuGeste', () => {
  it('chaque test devient un cas : la consigne, au moment de l’instantané, doit choisir le geste avec ses paramètres ; pour un agent, l’agent n’est pas comparé', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'traduction-'))
    for (const [n, id] of ['E-1', 'E-2', 'E-3'].entries()) {
      ecrireInstantane(dossier, {
        echappee: id,
        horodatage: `2026-10-1${n}T19:40:00Z`,
        role: 'patron',
        tables: [],
      })
    }
    const geste = {
      ...GESTE_EXEMPLE,
      tests: GESTE_EXEMPLE.tests.map((t, n) => ({
        ...t,
        instantane: `echappees/E-${n + 1}.json`,
        ...(n === 2 ? { role: 'agent' as const, agent: 'A-2' } : {}),
      })),
    }
    const cas = casDuGeste(geste, dossier)
    expect(cas.map((c) => c.id)).toEqual([
      'G-heures_par_agent-1',
      'G-heures_par_agent-2',
      'G-heures_par_agent-3',
    ])
    expect(cas[0]).toMatchObject({
      strict: false,
      role: 'patron',
      consigne: 'Combien d’heures a fait Julien ?',
      attendu: {
        sorte: 'action',
        action: 'heures_par_agent',
        params: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
      },
    })
    expect(cas[0]?.quand.toString()).toBe('2026-10-10T21:40:00+02:00[Europe/Paris]')
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[2]).toMatchObject({
      role: 'agent',
      agent: 'A-2',
      attendu: { params: { du: '2026-10-05', au: '2026-10-11' } },
    })
    expect(() => casDuGeste(GESTE_EXEMPLE, mkdtempSync(join(tmpdir(), 'vide-')))).toThrow(
      'instantané absent',
    )
  })
})

describe('casDuFichier', () => {
  it('garde l’identifiant, la variante, la catégorie stricte, et calcule le moment', () => {
    const cas = casDuFichier(
      {
        maintenant: '2026-10-10T21:40',
        variantes: { homonyme: { fichier: 'agents.csv', remplacer: 'a', par: 'b' } },
        cas: [
          {
            id: 'X',
            role: 'agent',
            agent: 'A-2',
            variante: 'homonyme',
            categorie: 'agent_patron',
            consigne: 'x',
            attendu: { sorte: 'inconnue' },
          },
          {
            id: 'Y',
            role: 'patron',
            maintenant: '2026-10-11T08:00',
            consigne: 'y',
            attendu: { sorte: 'inconnue' },
          },
        ],
      },
      new Set(['X', 'Y']),
    )
    expect(cas[0]).toMatchObject({
      id: 'X',
      strict: true,
      piege: { fichier: 'agents.csv' },
      agent: 'A-2',
    })
    expect(cas[0]?.quand.hour).toBe(21)
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[1]?.strict).toBe(false)
  })
})
