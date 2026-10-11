import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Identite } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import { Journal } from '../journal/journal'
import { modeleSimule, type Scripte } from '../modele/simule'
import { FUSEAU, Temporal } from '../temps/temporal'
import { CONTROLE_OK, CONTROLE_RETIRE } from './boucle'
import type { TableCopie } from './copie'
import {
  type CadreEchappee,
  cheminInstantane,
  DOSSIER_ECHAPPEES,
  type EchappeeDuMetier,
  echappee,
  ecrireInstantane,
  type Instantane,
  systemeEchappee,
  TYPE_ECHAPPEE,
  TYPE_OUTIL_ECHAPPEE,
} from './echappee'

// Ce que le journal garde d'une échappée pour la promotion, avec le modèle
// simulé et des tables en mémoire : l'identifiant sur chaque ligne, le texte
// final tel que montré, l'instantané de la copie (PLAN-PROMOTION.md § 4.5).

const Modif = z.strictObject({ vacation: z.string(), agent: z.string() })
type Modif = z.infer<typeof Modif>

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
const PATRON: Identite = { role: 'patron' }
const JULIEN: Identite = { role: 'agent', agent: 'A-2' }
const maintenant = Temporal.PlainDateTime.from('2026-10-10T21:40').toZonedDateTime(FUSEAU)

const AGENTS: TableCopie = {
  nom: 'agents',
  description: 'les agents',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
  ],
  lignes: [
    { id: 'A-2', nom: 'Julien Lefèvre' },
    { id: 'A-9', nom: 'Karim Haddad' },
  ],
}
const VACATIONS: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'agent', type: 'TEXT', description: "l'agent" },
    { nom: 'heures', type: 'REAL', description: 'durée' },
  ],
  lignes: [
    { id: 'V-04', agent: 'A-2', heures: 12 },
    { id: 'V-05', agent: 'A-2', heures: 4 },
    { id: 'V-01', agent: 'A-9', heures: 24 },
  ],
}
/** La copie à l'échelle du rôle, comme le métier la ferait : un agent ne voit que sa ligne. */
const tablesPour = (identite: Identite): TableCopie[] =>
  identite.role === 'patron'
    ? [AGENTS, VACATIONS]
    : [
        { ...AGENTS, lignes: AGENTS.lignes.filter((a) => a.id === identite.agent) },
        { ...VACATIONS, lignes: VACATIONS.lignes.filter((v) => v.agent === identite.agent) },
      ]

const REQUETE: Scripte = {
  outil: 'requete',
  entree: {
    sql: 'SELECT a.nom, SUM(v.heures) AS heures FROM agents a JOIN vacations v ON v.agent = a.id GROUP BY a.id ORDER BY heures',
  },
}
const repondre = (texte: string): Scripte => ({ outil: 'repondre', entree: { texte } })

async function echapper(identite: Identite, script: Scripte[]) {
  const dossier = mkdtempSync(join(tmpdir(), 'echappee-'))
  const journal = new Journal(join(dossier, 'journal.sqlite'))
  const cadre: CadreEchappee = {
    client: 'fictif',
    dossierClient: dossier,
    conversation: 'C-test',
    journal,
    config: CONFIG,
    identite,
    quiParle: identite.role === 'patron' ? 'le patron' : "l'agent Julien Lefèvre (A-2)",
  }
  const metier: EchappeeDuMetier<Modif> = {
    tables: tablesPour(identite),
    outils: {
      schemaModifications: z.array(Modif),
      verifier: (mods) => ({ constats: [], description: mods.length.toString() }),
      decrire: (mods) => mods.length.toString(),
      nomRegle: (id) => id,
      proposer: identite.role === 'patron',
    },
    regles: [],
    preferences: 'aucune',
    nomsConnus: ['Julien Lefèvre', 'Karim Haddad'],
  }
  const issue = await echappee(
    cadre,
    metier,
    'Combien d’heures a fait Julien ?',
    'heures_par_agent',
    maintenant,
    modeleSimule(script),
  )
  const lignes = journal.historique('C-test')
  journal.fermer()
  const donnees = (type: string) =>
    lignes.filter((l) => l.type === type).map((l) => JSON.parse(l.donnees ?? '{}'))
  return { issue, dossier, lignes, donnees }
}

const ID = /^E-\d{8}T\d{4}-[0-9a-f]{4}$/

describe('le journal se souvient de l’échappée', () => {
  it('chaque ligne porte l’identifiant ; la ligne echappee porte le rôle, le texte montré et l’instantané', async () => {
    const { issue, dossier, donnees } = await echapper(PATRON, [
      REQUETE,
      repondre('Julien Lefèvre : 16 heures.'),
    ])
    expect(issue).toMatchObject({ sorte: 'reponse', controle: CONTROLE_OK })
    const [outil] = donnees(TYPE_OUTIL_ECHAPPEE)
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e.echappee).toMatch(ID)
    expect(outil.echappee).toBe(e.echappee)
    expect(e).toMatchObject({
      intention: 'heures_par_agent',
      role: 'patron',
      texte: 'Julien Lefèvre : 16 heures.',
      instantane: cheminInstantane(e.echappee),
    })
    expect(e).not.toHaveProperty('agent')
    const instantane = JSON.parse(readFileSync(join(dossier, e.instantane), 'utf8')) as Instantane
    expect(instantane).toEqual({
      echappee: e.echappee,
      horodatage: maintenant.toInstant().toString(),
      role: 'patron',
      tables: [AGENTS, VACATIONS],
    })
  })

  it('un résumé retiré : le texte journalisé est celui rendu, les tableaux', async () => {
    const { issue, donnees } = await echapper(PATRON, [
      REQUETE,
      repondre('Julien Lefèvre : 17 heures.'),
    ])
    if (issue.sorte !== 'reponse') throw new Error(issue.sorte)
    expect(issue.controle).toBe(CONTROLE_RETIRE)
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e.texte).toBe(issue.texte)
    expect(e.texte).toMatch(/^nom \| heures\nJulien Lefèvre \| 16/)
  })

  it('un agent : l’instantané ne contient que sa ligne, la ligne echappee porte son identifiant', async () => {
    const { dossier, donnees } = await echapper(JULIEN, [REQUETE, repondre('16 heures.')])
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({ role: 'agent', agent: 'A-2' })
    const instantane = JSON.parse(readFileSync(join(dossier, e.instantane), 'utf8')) as Instantane
    expect(instantane).toMatchObject({ role: 'agent', agent: 'A-2' })
    expect(instantane.tables.find((t) => t.nom === 'agents')?.lignes).toEqual([
      { id: 'A-2', nom: 'Julien Lefèvre' },
    ])
    expect(instantane.tables.find((t) => t.nom === 'vacations')?.lignes).toHaveLength(2)
  })

  it('un abandon : pas de texte, l’instantané est quand même là', async () => {
    const { dossier, donnees } = await echapper(PATRON, [
      { outil: 'abandonner', entree: { motif: 'rien à lire' } },
    ])
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({ abandon: 'rien à lire', role: 'patron' })
    expect(e).not.toHaveProperty('texte')
    expect(existsSync(join(dossier, e.instantane))).toBe(true)
  })
})

describe('ecrireInstantane', () => {
  it('écrit echappees/<id>.json, crée le dossier, et refuse d’écraser', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'instantane-'))
    const instantane: Instantane = {
      echappee: 'E-20261010T2140-0001',
      horodatage: '2026-10-10T19:40:00Z',
      role: 'patron',
      tables: [AGENTS],
    }
    const chemin = ecrireInstantane(dossier, instantane)
    expect(chemin).toBe(join(DOSSIER_ECHAPPEES, 'E-20261010T2140-0001.json'))
    expect(JSON.parse(readFileSync(join(dossier, chemin), 'utf8'))).toEqual(instantane)
    expect(() => ecrireInstantane(dossier, instantane)).toThrow('déjà écrit')
  })
})

describe('systemeEchappee', () => {
  it('dit de répondre à la question posée, rien de plus (PLAN-GENERAL.md G4 a)', () => {
    for (const proposer of [true, false]) {
      expect(systemeEchappee('le patron', 'Table agents : …', [], '', proposer)).toContain(
        'Réponds à la question posée, rien de plus : pas de détail par vacation si on demande un total, pas de remarque ajoutée.',
      )
    }
  })
})
