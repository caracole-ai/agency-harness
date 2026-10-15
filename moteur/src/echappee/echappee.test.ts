import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Identite } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import type { Domaine } from '../conversation/domaine'
import { Journal } from '../journal/journal'
import { modeleSimule, type Scripte } from '../modele/simule'
import { FUSEAU, Temporal } from '../temps/temporal'
import { CONTROLE_OK, CONTROLE_RETIRE } from './boucle'
import type { TableCopie } from './copie'
import {
  type CadreEchappee,
  type EchappeeDuMetier,
  echappee,
  systemeEchappee,
  TYPE_ECHAPPEE,
  TYPE_OUTIL_ECHAPPEE,
} from './echappee'
import { fuites, type Precision } from './pseudonymes'

// Ce que le journal garde d'une échappée pour le rejeu, avec le modèle
// simulé et des tables en mémoire : l'identifiant sur chaque ligne, le texte
// final tel que montré ; rien des données n'est écrit hors du journal ;
// et aucun nom ne part au modèle, ni dans la consigne, ni dans la copie, ni
// dans une sortie d'outil (PLAN-PSEUDONYMES.md § 5.4).

const Modif = z.strictObject({ vacation: z.string(), agent: z.string() })
type Modif = z.infer<typeof Modif>

const DOMAINE: Domaine = {
  cadre: "l'outil de planning d'une entreprise de sécurité privée",
  objets: 'le planning et les agents',
  modifications:
    'Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.',
  identifiants: /\bA-\d+\b/g,
  rienASignaler: 'Aucune vacation contraire à une règle.',
}

const CONFIG: ConfigConversation = {
  modele: {
    fournisseur: 'anthropic',
    id: 'simulé',
    prix_par_million_usd: { entree: 1, sortie: 1, cache_ecrit: 0, cache_lu: 0 },
    effort: { traduire: 'low', echappee: 'medium' },
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 }, par_mois_usd: 30 },
}
const PATRON: Identite = { role: 'patron' }
const JULIEN: Identite = { role: 'agent', personne: 'A-2' }
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
        { ...AGENTS, lignes: AGENTS.lignes.filter((a) => a.id === identite.personne) },
        { ...VACATIONS, lignes: VACATIONS.lignes.filter((v) => v.agent === identite.personne) },
      ]

const REQUETE: Scripte = {
  outil: 'requete',
  entree: {
    sql: 'SELECT a.nom, SUM(v.heures) AS heures FROM agents a JOIN vacations v ON v.agent = a.id GROUP BY a.id ORDER BY heures',
  },
}
const repondre = (texte: string): Scripte => ({ outil: 'repondre', entree: { texte } })

const PERSONNES = AGENTS.lignes.map((a) => ({
  id: String(a.id),
  nom: String(a.nom),
  sorte: 'personne' as const,
}))

async function echapper(
  identite: Identite,
  script: Scripte[],
  consigne = 'Combien d’heures a fait Julien ?',
  precisions: Precision[] = [],
) {
  const dossier = mkdtempSync(join(tmpdir(), 'echappee-'))
  const journal = new Journal(join(dossier, 'journal.sqlite'))
  const cadre: CadreEchappee = {
    client: 'fictif',
    conversation: 'C-test',
    journal,
    config: CONFIG,
    identite,
    quiParle: identite.role === 'patron' ? 'le patron' : "l'agent A-2",
    domaine: DOMAINE,
  }
  const metier: EchappeeDuMetier<Modif> = {
    tables: tablesPour(identite),
    outils: {
      schemaModifications: z.array(Modif),
      // Comme le métier : la description et les constats citent les noms.
      verifier: (mods) => ({
        constats: mods.map((m) => ({
          regle: 'I-01',
          objet: m.vacation,
          verdict: 'à vérifier',
          motif: `Karim Haddad tiendrait ${m.vacation}`,
        })),
        description: mods.map((m) => `${m.vacation} : Julien Lefèvre → Karim Haddad`).join('\n'),
      }),
      decrire: (mods) => mods.length.toString(),
      nomRegle: (id) => id,
      proposer: identite.role === 'patron',
    },
    regles: [],
    preferences: 'aucune',
    personnes: PERSONNES.filter((p) => identite.role === 'patron' || p.id === identite.personne),
    toutes: PERSONNES,
  }
  const modele = modeleSimule(script)
  const issue = await echappee(
    cadre,
    metier,
    consigne,
    'heures_par_agent',
    maintenant,
    modele,
    precisions,
  )
  const lignes = journal.historique('C-test')
  journal.fermer()
  const donnees = (type: string) =>
    lignes.filter((l) => l.type === type).map((l) => JSON.parse(l.donnees ?? '{}'))
  return { issue, dossier, lignes, donnees, appels: modele.appels }
}

const ID = /^E-\d{8}T\d{4}-[0-9a-f]{4}$/

describe('le journal se souvient de l’échappée', () => {
  it('chaque ligne porte l’identifiant ; la ligne echappee porte le rôle et le texte montré ; rien des données hors du journal', async () => {
    const { issue, dossier, donnees } = await echapper(PATRON, [
      REQUETE,
      repondre('A-2 : 16 heures.'),
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
    })
    expect(e).not.toHaveProperty('personne')
    expect(e).not.toHaveProperty('instantane')
    expect(readdirSync(dossier).filter((f) => !f.startsWith('journal'))).toEqual([])
  })

  it('un résumé retiré : le texte journalisé est celui rendu, les tableaux', async () => {
    const { issue, donnees } = await echapper(PATRON, [REQUETE, repondre('A-2 : 17 heures.')])
    if (issue.sorte !== 'reponse') throw new Error(issue.sorte)
    expect(issue.controle).toBe(CONTROLE_RETIRE)
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e.texte).toBe(issue.texte)
    expect(e.texte).toMatch(/^nom \| heures\nJulien Lefèvre \| 16/)
  })

  it('un nombre que la description de la copie a dit au modèle se cite (evals/erreurs-2026-10-13.md, E4)', async () => {
    // « Table vacations : les vacations (3 lignes) » : le 3 vient du harnais, pas du modèle.
    const dit = await echapper(PATRON, [REQUETE, repondre('3 vacations ; A-2 : 16 heures.')])
    expect(dit.issue).toMatchObject({ sorte: 'reponse', controle: CONTROLE_OK })
    const invente = await echapper(PATRON, [REQUETE, repondre('4 vacations ; A-2 : 16 heures.')])
    expect(invente.issue).toMatchObject({ sorte: 'reponse', controle: CONTROLE_RETIRE })
  })

  it('un agent : la ligne echappee porte son identifiant', async () => {
    const { donnees } = await echapper(JULIEN, [REQUETE, repondre('16 heures.')])
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({ role: 'agent', personne: 'A-2' })
  })

  it('un abandon : pas de texte', async () => {
    const { donnees } = await echapper(PATRON, [
      { outil: 'abandonner', entree: { motif: 'rien à lire' } },
    ])
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({ abandon: 'rien à lire', role: 'patron' })
    expect(e).not.toHaveProperty('texte')
  })
})

describe('systemeEchappee', () => {
  it('dit de répondre à la question posée, rien de plus (PLAN-GENERAL.md G4 a)', () => {
    for (const proposer of [true, false]) {
      expect(systemeEchappee('le patron', 'Table agents : …', [], '', proposer, DOMAINE)).toContain(
        'Réponds à la question posée, rien de plus, et sois non verbeux : pas de détail ligne par ligne si on demande un total, pas de compte si on demande une liste, pas de remarque ajoutée.',
      )
    }
  })
  it('dit les modifications possibles du métier, ou rien quand il n’en déclare aucune (PLAN-METIER-2.md M7)', () => {
    const fin =
      'Tu finis toujours par un appel d’outil, repondre, proposer ou abandonner, jamais par du texte.'
    expect(systemeEchappee('le patron', '', [], '', true, DOMAINE)).toContain(
      `${fin} Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.\n`,
    )
    const sans = systemeEchappee('la dirigeante', '', [], '', true, {
      ...DOMAINE,
      modifications: null,
    })
    expect(sans).toContain(`${fin}\n`)
    expect(sans).not.toMatch(/vacation|agent|patron/)
    expect(sans).toContain('Les préférences de l’entreprise, pour choisir')
  })
  it('dit les notions du métier après les tables, qu’il propose ou non ; sans notion, rien (evals/erreurs-2026-10-13.md, E2)', () => {
    const notion = 'Un ticket est un bug seulement si son lot est recetté (lots.recette_le).'
    for (const proposer of [true, false]) {
      const avec = systemeEchappee('la PO', 'Table lots : …', [], '', proposer, {
        ...DOMAINE,
        notions: [notion],
      })
      expect(avec).toContain(
        `Table lots : …\n\nCe que les mots du métier veulent dire :\n- ${notion}\n`,
      )
      for (const notions of [undefined, []]) {
        const sans = systemeEchappee('la PO', 'Table lots : …', [], '', proposer, {
          ...DOMAINE,
          ...(notions ? { notions } : {}),
        })
        expect(sans).not.toContain('mots du métier')
        expect(sans).toBe(
          avec.replace(`\n\nCe que les mots du métier veulent dire :\n- ${notion}`, ''),
        )
      }
    }
  })
})

/** Tout ce qui part au modèle : le système, et chaque message de chaque appel. */
const envoye = (appels: { systeme: string; messages: unknown }[]) =>
  appels.flatMap((a) => [a.systeme, JSON.stringify(a.messages)])

describe('aucun nom ne part au modèle (PLAN-PSEUDONYMES.md § 5.4)', () => {
  it('consigne, copie, sorties de requete et de verifier : masquées ; le texte montré porte les noms', async () => {
    const { issue, appels, donnees } = await echapper(PATRON, [
      REQUETE,
      { outil: 'verifier', entree: { modifications: [{ vacation: 'V-04', agent: 'A-9' }] } },
      repondre('A-2 : 16 heures, A-9 : 24 heures.'),
    ])
    expect(appels).toHaveLength(3)
    for (const texte of envoye(appels)) expect(fuites(texte, PERSONNES)).toEqual([])
    expect(JSON.stringify(appels[0]?.messages)).toContain('Combien d’heures a fait A-2 ?')
    expect(JSON.stringify(appels[2]?.messages)).toContain('V-04 : A-2 → A-9')
    expect(issue).toMatchObject({
      sorte: 'reponse',
      controle: CONTROLE_OK,
      texte: 'Julien Lefèvre : 16 heures, Karim Haddad : 24 heures.',
    })
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({
      consigne_modele: 'Combien d’heures a fait A-2 ?',
      texte_modele: 'A-2 : 16 heures, A-9 : 24 heures.',
      texte: 'Julien Lefèvre : 16 heures, Karim Haddad : 24 heures.',
    })
  })

  it('le motif d’un abandon est restitué ; le journal garde la version du modèle', async () => {
    const { issue, donnees } = await echapper(PATRON, [
      REQUETE,
      { outil: 'abandonner', entree: { motif: 'A-2 a 16 heures, rien à changer' } },
    ])
    expect(issue).toMatchObject({
      sorte: 'abandon',
      motif: 'Julien Lefèvre a 16 heures, rien à changer',
    })
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e).toMatchObject({
      abandon: 'Julien Lefèvre a 16 heures, rien à changer',
      texte_modele: 'A-2 a 16 heures, rien à changer',
    })
  })

  it('une proposition : son texte et son résumé sont restitués', async () => {
    const { issue } = await echapper(PATRON, [
      {
        outil: 'proposer',
        entree: { modifications: [{ vacation: 'V-04', agent: 'A-9' }], resume: 'A-9 prend V-04.' },
      },
    ])
    if (issue.sorte !== 'proposition') throw new Error(issue.sorte)
    expect(issue.resume).toBe('Karim Haddad prend V-04.')
  })

  it('un agent : « l’agent A-2 », et le nom d’un collègue qu’il écrit ne part pas non plus', async () => {
    const { issue, appels, donnees } = await echapper(
      JULIEN,
      [REQUETE, repondre('Je ne vois que tes données : A-2, 16 heures.')],
      'Combien d’heures a fait Karim ?',
    )
    expect(appels[0]?.systeme).toContain("Tu travailles pour l'agent A-2 ")
    for (const texte of envoye(appels)) expect(fuites(texte, PERSONNES)).toEqual([])
    expect(issue).toMatchObject({
      texte: 'Je ne vois que tes données : Julien Lefèvre, 16 heures.',
    })
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e.consigne_modele).toBe('Combien d’heures a fait A-9 ?')
  })

  it('une intention nouvelle qui porte un nom part masquée ; le journal garde celle d’origine', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'echappee-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    const modele = modeleSimule([repondre('Rien.')])
    await echappee(
      {
        client: 'fictif',
        conversation: 'C-int',
        journal,
        config: CONFIG,
        identite: PATRON,
        quiParle: 'le patron',
        domaine: DOMAINE,
      },
      {
        tables: tablesPour(PATRON),
        outils: {
          schemaModifications: z.array(Modif),
          verifier: () => ({ constats: [], description: '' }),
          decrire: () => '',
          nomRegle: (id) => id,
          proposer: true,
        },
        regles: [],
        preferences: 'aucune',
        personnes: PERSONNES,
        toutes: PERSONNES,
      },
      'Quand Karim Haddad est-il libre ?',
      'disponibilite_karim',
      maintenant,
      modele,
    )
    const envoye = JSON.stringify(modele.appels[0]?.messages)
    expect(envoye).toContain('(intention : disponibilite_A-9)')
    expect(fuites(envoye, PERSONNES)).toEqual([])
    const ligne = journal.historique('C-int').find((l) => l.type === TYPE_ECHAPPEE)
    expect(JSON.parse(ligne?.donnees ?? '{}').intention).toBe('disponibilite_karim')
    journal.fermer()
  })

  it('une réponse à « vous parlez de qui ? » remplace la mention par l’identifiant choisi', async () => {
    const { appels, lignes, donnees } = await echapper(
      PATRON,
      [repondre('Rien.')],
      'Combien d’heures a fait Kareem ?',
      [{ mention: 'Kareem', id: 'A-9' }],
    )
    expect(JSON.stringify(appels[0]?.messages)).toContain('Combien d’heures a fait A-9 ?')
    const [e] = donnees(TYPE_ECHAPPEE)
    expect(e.consigne_modele).toBe('Combien d’heures a fait A-9 ?')
    expect(lignes.find((l) => l.type === TYPE_ECHAPPEE)?.motif).toBe(
      'Combien d’heures a fait Kareem ?',
    )
  })
})
