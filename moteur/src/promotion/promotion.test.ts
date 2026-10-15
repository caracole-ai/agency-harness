import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VALIDEE } from '../approbation/jeton'
import { CONTROLE_OK, CONTROLE_RETIRE, OUTIL_REQUETE } from '../echappee/boucle'
import {
  cheminInstantane,
  DOSSIER_ECHAPPEES,
  TYPE_ECHAPPEE,
  TYPE_OUTIL_ECHAPPEE,
} from '../echappee/echappee'
import { OPERATION_EXEMPLE, reaffectationValidee } from '../gestes/geste-appris.test.fixture'
import { type Evenement, Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import { Temporal } from '../temps/temporal'
import {
  aProposer,
  debutFenetre,
  echappeesDe,
  ecrireDossier,
  type IntentionComptee,
  intentions,
  resumeCout,
  TYPE_PROMOTION,
} from './promotion'

// Le compteur des demandes nouvelles et le dossier de promotion, sur un
// journal rempli à la main (PLAN-ESPACES.md § 8.3) : seules les échappées
// finies proprement comptent, chacune relue par son identifiant, et la purge
// des instantanés épargne ceux qu'un geste cite (PLAN-PROMOTION.md § 4.5).

const CLIENT = 'fictif'
const INTENTION = 'liberer_un_jour'
const AUTRE = 'heures_par_agent'
/** Le type et le premier statut d'une réaffectation, inscrits par le métier (lot 4). */
const REAFFECTATION = 'reaffectation'
const RECUE = 'reçue'

const CONSIGNE_1 = 'Libère-moi Julien samedi, il a un mariage.'
const CONSIGNE_2 = 'Est-ce que je peux donner son dimanche à Sophie ?'
const CONSIGNE_3 = 'Trouve quelqu’un pour le lundi de Mehdi, « sans heures sup »'
const SQL = "SELECT agent, COUNT(*) AS n FROM vacations WHERE debut >= '2026-10-10' GROUP BY agent"
const MODIFICATIONS = [{ vacation: 'V-07', agent: 'A-9' }]

const appel = (conversation: string, issue: string, cout_usd: number): Evenement => ({
  type: TYPE_APPEL,
  client: CLIENT,
  objet: conversation,
  issue,
  donnees: { cout_usd },
})
/** Une ligne `echappee` complète (lot 0) : identifiant, rôle, texte montré, instantané. */
const echappee = (
  conversation: string,
  id: string,
  intention: string,
  issue: string,
  consigne: string,
  donnees: Record<string, unknown> = {},
): Evenement => ({
  type: TYPE_ECHAPPEE,
  client: CLIENT,
  objet: conversation,
  issue,
  motif: consigne,
  donnees: {
    echappee: id,
    intention,
    role: 'patron',
    cout_usd: 0,
    texte: `texte de ${id}`,
    instantane: cheminInstantane(id),
    ...donnees,
  },
})
const outil = (
  conversation: string,
  id: string,
  nom: string,
  entree: unknown,
  sortie = '',
  erreur?: string,
): Evenement => ({
  type: TYPE_OUTIL_ECHAPPEE,
  client: CLIENT,
  objet: conversation,
  issue: nom,
  motif: JSON.stringify(entree),
  donnees: { echappee: id, tour: 1, entree, sortie, ...(erreur ? { erreur } : {}) },
})
const ok = { controle_reponse: CONTROLE_OK }

/**
 * Trois demandes `liberer_un_jour` finies proprement sur dix jours (C-1 :
 * proposition validée, C-2 et C-3 : réponses), une autre (C-9), leurs appels ;
 * et trois qui ne comptent pas : un abandon (C-5), un résumé retiré (C-6),
 * une proposition sans suite (C-7).
 */
function journalRempli(): { journal: Journal; dossier: string } {
  const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
  const journal = new Journal(join(dossier, 'journal.sqlite'))
  journal.ecrire(
    [
      appel('C-1', 'traduire', 0.1),
      outil('C-1', 'E-1', OUTIL_REQUETE, { sql: SQL }, 'agent | n\nA-3 | 2'),
      outil('C-1', 'E-1', 'verifier', { modifications: MODIFICATIONS }),
      appel('C-1', 'echappee', 0.25),
      echappee('C-1', 'E-1', INTENTION, 'proposition', CONSIGNE_1, {
        modifications: MODIFICATIONS,
        constats: [],
      }),
    ],
    '2026-09-28T08:00:00Z',
  )
  journal.ecrire(
    [
      {
        type: REAFFECTATION,
        client: CLIENT,
        objet: 'R-1',
        issue: RECUE,
        donnees: { conversation: 'C-1', modifications: MODIFICATIONS },
      },
    ],
    '2026-09-28T08:01:00Z',
  )
  journal.ecrire(
    [
      {
        type: REAFFECTATION,
        client: CLIENT,
        objet: 'R-1',
        issue: VALIDEE,
        donnees: { jeton: 'j' },
      },
    ],
    '2026-09-28T08:05:00Z',
  )
  journal.ecrire(
    [
      appel('C-2', 'traduire', 0.05),
      appel('C-2', 'echappee', 0.3),
      echappee('C-2', 'E-2', INTENTION, 'reponse', CONSIGNE_2, ok),
    ],
    '2026-10-02T09:00:00Z',
  )
  journal.ecrire(
    [
      appel('C-9', 'traduire', 1),
      echappee('C-9', 'E-9', AUTRE, 'reponse', 'Combien d’heures a fait Julien ?', ok),
    ],
    '2026-10-05T10:00:00Z',
  )
  journal.ecrire(
    [
      appel('C-3', 'traduire', 0.02),
      appel('C-3', 'echappee', 0.08),
      echappee('C-3', 'E-3', INTENTION, 'reponse', CONSIGNE_3, ok),
    ],
    '2026-10-07T16:30:00Z',
  )
  journal.ecrire(
    [echappee('C-5', 'E-5', INTENTION, 'abandon', 'Libère Karim lundi.', { abandon: 'bornes' })],
    '2026-10-07T17:00:00Z',
  )
  journal.ecrire(
    [
      echappee('C-6', 'E-6', INTENTION, 'reponse', 'Libère Moussa mardi.', {
        controle_reponse: CONTROLE_RETIRE,
      }),
    ],
    '2026-10-07T18:00:00Z',
  )
  journal.ecrire(
    [
      echappee('C-7', 'E-7', INTENTION, 'proposition', 'Libère Aïcha jeudi.', {
        modifications: MODIFICATIONS,
        constats: [],
      }),
    ],
    '2026-10-07T19:00:00Z',
  )
  return { journal, dossier }
}

/** La première intention à proposer ; le jeu de test en garantit une. */
function premiere(journal: Journal): IntentionComptee {
  const [i] = aProposer(intentions(journal, DEPUIS), journal, SEUIL)
  if (!i) throw new Error('jeu de test sans intention à proposer')
  return i
}

const DEPUIS = Temporal.PlainDate.from('2026-09-09')
const MAINTENANT = Temporal.ZonedDateTime.from('2026-10-08T23:59[Europe/Paris]')
const SEUIL = { occurrences: 3 }
const JOURS = 30

describe('une proposition corrigée par le patron (PLAN-CHOIX.md C3)', () => {
  /** C-4 : l'échappée propose V-07 → A-9 ; le patron prend A-11 (R-4-2 remplace R-4) et valide. */
  function avecCorrigee(): { journal: Journal; dossier: string } {
    const rempli = journalRempli()
    rempli.journal.ecrire(
      [
        echappee('C-4', 'E-4', INTENTION, 'proposition', 'Libère Karim mardi.', {
          modifications: [{ type: 'reaffecter', ...MODIFICATIONS[0] }],
          constats: [],
        }),
        {
          type: REAFFECTATION,
          client: CLIENT,
          objet: 'R-4',
          issue: RECUE,
          donnees: { conversation: 'C-4', modifications: MODIFICATIONS },
        },
        { type: REAFFECTATION, client: CLIENT, objet: 'R-4', issue: 'remplacée' },
        ...reaffectationValidee('R-4-2', 'C-4', [{ vacation: 'V-07', agent: 'A-11' }]),
      ],
      '2026-10-08T08:00:00Z',
    )
    return rempli
  }

  it('n’apprend rien de la proposition corrigée ; celle validée telle quelle compte comme avant', () => {
    const { journal } = avecCorrigee()
    const [i] = intentions(journal, DEPUIS, OPERATION_EXEMPLE)
    expect(i).toMatchObject({ intention: INTENTION, occurrences: 3 })
    expect(i?.conversations).toEqual(['C-1', 'C-2', 'C-3'])
    expect(
      echappeesDe(journal, INTENTION, DEPUIS, OPERATION_EXEMPLE).map((e) => e.conversation),
    ).not.toContain('C-4')
    // Sans l'opération du métier, rien ne se relit : la suite seule décide.
    expect(intentions(journal, DEPUIS)[0]?.occurrences).toBe(4)
    journal.fermer()
  })

  it('le dossier la compte : « 1 proposition corrigée par le patron »', () => {
    const { journal, dossier } = avecCorrigee()
    const [i] = aProposer(intentions(journal, DEPUIS, OPERATION_EXEMPLE), journal, SEUIL)
    if (!i) throw new Error('jeu de test sans intention à proposer')
    const md = readFileSync(
      ecrireDossier(dossier, CLIENT, i, journal, MAINTENANT, JOURS, undefined, OPERATION_EXEMPLE),
      'utf8',
    )
    expect(md).toContain('1 proposition corrigée par le patron, non retenue : C-4.')
    expect(md).not.toContain('### C-4')
    expect(md).toContain('### C-1 (E-1)')
    journal.fermer()
  })
})

describe('intentions', () => {
  it('compte les échappées finies proprement par intention, avec leurs conversations, leurs consignes et leur coût', () => {
    const { journal } = journalRempli()
    const [premiere, seconde] = intentions(journal, DEPUIS)
    expect(premiere).toEqual({
      intention: INTENTION,
      occurrences: 3,
      conversations: ['C-1', 'C-2', 'C-3'],
      consignes: [CONSIGNE_1, CONSIGNE_2, CONSIGNE_3],
      cout_usd: 0.8,
      dernier: '2026-10-07T16:30:00Z',
    })
    expect(seconde).toMatchObject({ intention: AUTRE, occurrences: 1, cout_usd: 1 })
    journal.fermer()
  })
  it('un abandon, un résumé retiré, une proposition sans suite ne comptent pas', () => {
    const { journal } = journalRempli()
    const [i] = intentions(journal, DEPUIS)
    expect(i?.conversations).not.toContain('C-5')
    expect(i?.conversations).not.toContain('C-6')
    expect(i?.conversations).not.toContain('C-7')
    journal.fermer()
  })
  it('une ligne d’avant le lot 0 (sans identifiant ni instantané) ne compte pas', () => {
    const { journal } = journalRempli()
    journal.ecrire(
      [
        {
          type: TYPE_ECHAPPEE,
          client: CLIENT,
          objet: 'C-0',
          issue: 'reponse',
          motif: 'Libère Sophie.',
          donnees: { intention: INTENTION, cout_usd: 0, controle_reponse: CONTROLE_OK },
        },
      ],
      '2026-10-08T08:00:00Z',
    )
    expect(intentions(journal, DEPUIS)[0]?.conversations).toEqual(['C-1', 'C-2', 'C-3'])
    journal.fermer()
  })
  it('ne compte pas ce qui précède `depuis`', () => {
    const { journal } = journalRempli()
    const [i] = intentions(journal, Temporal.PlainDate.from('2026-10-01'))
    expect(i).toMatchObject({ intention: INTENTION, occurrences: 2, conversations: ['C-2', 'C-3'] })
    journal.fermer()
  })
  it('debutFenetre : le premier jour d’une fenêtre de 30 jours qui finit au 8 octobre est le 9 septembre', () => {
    expect(debutFenetre(MAINTENANT, JOURS).equals(DEPUIS)).toBe(true)
  })
})

describe('echappeesDe', () => {
  it('relit chaque échappée par son identifiant : deux échappées de la même conversation sont séparées', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    const SQL_A = 'SELECT 1 AS a'
    const SQL_B = 'SELECT 2 AS b'
    journal.ecrire(
      [
        outil('C-8', 'E-8a', OUTIL_REQUETE, { sql: SQL_A }, 'a\n1'),
        outil(
          'C-8',
          'E-8a',
          OUTIL_REQUETE,
          { sql: 'SELECT * FROM x' },
          'erreur : no such table',
          'no such table',
        ),
        echappee('C-8', 'E-8a', INTENTION, 'reponse', CONSIGNE_1, ok),
        outil('C-8', 'E-8b', OUTIL_REQUETE, { sql: SQL_B }, 'b\n2'),
        echappee('C-8', 'E-8b', AUTRE, 'reponse', 'Combien d’heures ?', {
          ...ok,
          agent: 'A-2',
          role: 'agent',
          consigne_modele: 'Combien d’heures ?',
          texte_modele: 'A-2 : 16 heures.',
        }),
        echappee('C-9', 'E-9', AUTRE, 'reponse', 'Mes heures ?', {
          ...ok,
          personne: 'A-3',
          role: 'agent',
        }),
      ],
      '2026-10-07T16:30:00Z',
    )
    const [a, ...resteA] = echappeesDe(journal, INTENTION, DEPUIS)
    expect(resteA).toEqual([])
    expect(a).toEqual({
      echappee: 'E-8a',
      conversation: 'C-8',
      horodatage: '2026-10-07T16:30:00Z',
      role: 'patron',
      consigne: CONSIGNE_1,
      intention: INTENTION,
      issue: 'reponse',
      requetes: [
        { sql: SQL_A, sortie: 'a\n1' },
        { sql: 'SELECT * FROM x', sortie: 'erreur : no such table', erreur: 'no such table' },
      ],
      texte: 'texte de E-8a',
      instantane: join(DOSSIER_ECHAPPEES, 'E-8a.json'),
    })
    const [b, c] = echappeesDe(journal, AUTRE, DEPUIS)
    // E-8b porte l'ancienne graphie `agent`, E-9 la nouvelle : les deux se relisent en `personne` (PLAN-METIER-2.md M2).
    expect(b).not.toHaveProperty('agent')
    expect(c).toMatchObject({ echappee: 'E-9', role: 'agent', personne: 'A-3' })
    expect(b).toMatchObject({
      echappee: 'E-8b',
      role: 'agent',
      personne: 'A-2',
      requetes: [{ sql: SQL_B, sortie: 'b\n2' }],
      // Les versions du modèle, sans aucun nom (PLAN-PSEUDONYMES.md § 6) ; absentes de E-8a, d'avant.
      consigneModele: 'Combien d’heures ?',
      texteModele: 'A-2 : 16 heures.',
    })
    journal.fermer()
  })
})

describe('aProposer et ecrireDossier', () => {
  it('propose ce qui atteint le seuil, une fois, puis de nouveau à la prochaine occurrence', () => {
    const { journal, dossier } = journalRempli()
    expect(aProposer(intentions(journal, DEPUIS), journal, SEUIL).map((i) => i.intention)).toEqual([
      INTENTION,
    ])

    ecrireDossier(dossier, CLIENT, premiere(journal), journal, MAINTENANT, JOURS)
    expect(aProposer(intentions(journal, DEPUIS), journal, SEUIL)).toEqual([])

    journal.ecrire(
      [echappee('C-4', 'E-4', INTENTION, 'reponse', 'Libère Sophie mardi.', ok)],
      '2026-10-12T08:00:00Z',
    )
    expect(aProposer(intentions(journal, DEPUIS), journal, SEUIL)).toMatchObject([
      { intention: INTENTION, occurrences: 4 },
    ])
    journal.fermer()
  })

  it('écrit le dossier, tout lu dans le journal, et la ligne `promotion proposée`', () => {
    const { journal, dossier } = journalRempli()
    const i = premiere(journal)
    const chemin = ecrireDossier(dossier, CLIENT, i, journal, MAINTENANT, JOURS)
    expect(chemin).toBe(join(dossier, 'promotions', `${INTENTION}-2026-10-08.md`))

    const md = readFileSync(chemin, 'utf8')
    expect(md).toContain(`# Promotion proposée : ${INTENTION}`)
    expect(md).toContain('3 demandes en 30 jours, pour un coût total de 0,80 $.')
    for (const c of [CONSIGNE_1, CONSIGNE_2, CONSIGNE_3]) expect(md).toContain(c)
    expect(md).toContain('28/09/2026 à 10:00, C-1, proposition')
    expect(md).toContain('C-2, réponse')
    expect(md).toContain('C-3, réponse')
    expect(md).not.toContain('C-5')
    expect(md).toContain('### C-1 (E-1)')
    expect(md).toContain(`\`\`\`sql\n${SQL}\n\`\`\``)
    expect(md).toContain(`Contrôle : contrôle de la réponse : ${CONTROLE_OK}.`)
    expect(md).toContain('Contrôle : aucun constat.')
    expect(md).toContain(`Suite donnée : ${VALIDEE}.`)

    const cas = md.slice(
      md.indexOf('## Cas de test candidats'),
      md.indexOf("## À faire à l'atelier"),
    )
    expect(cas).toContain('jamais recopié tel quel')
    expect(cas).toContain(`consigne: ${JSON.stringify(CONSIGNE_1)}`)
    expect(cas).toContain(`- ${JSON.stringify(MODIFICATIONS[0])}`)
    expect(cas).not.toContain(CONSIGNE_2)
    expect(md).toContain('PLAN-ESPACES.md D2')

    const promotion = journal.lire().filter((l) => l.type === TYPE_PROMOTION)
    const [ligne] = promotion
    if (!ligne) throw new Error('aucune ligne promotion proposée')
    expect(promotion).toHaveLength(1)
    expect(ligne).toMatchObject({
      objet: INTENTION,
      motif: `${INTENTION} : 3 demandes en 30 jours`,
      horodatage: MAINTENANT.toInstant().toString(),
    })
    expect(JSON.parse(ligne.donnees as string)).toEqual({
      intention: INTENTION,
      conversations: ['C-1', 'C-2', 'C-3'],
      cout_usd: 0.8,
      dossier: chemin,
    })
    journal.fermer()
  })

  it('les requêtes du dossier sont celles de chaque échappée, pas de toute la conversation', () => {
    const { journal, dossier } = journalRempli()
    // Une autre échappée de C-1, d'une autre intention, avec sa propre requête.
    journal.ecrire(
      [
        outil('C-1', 'E-1b', OUTIL_REQUETE, { sql: 'SELECT 99 AS autre' }),
        echappee('C-1', 'E-1b', AUTRE, 'reponse', 'Et les heures ?', ok),
      ],
      '2026-09-28T09:00:00Z',
    )
    const md = readFileSync(
      ecrireDossier(dossier, CLIENT, premiere(journal), journal, MAINTENANT, JOURS),
      'utf8',
    )
    expect(md).toContain(SQL)
    expect(md).not.toContain('SELECT 99 AS autre')
    journal.fermer()
  })

  it('des propositions sans suite au journal n’atteignent pas le seuil', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    for (const [n, h] of ['2026-10-01', '2026-10-02', '2026-10-03'].entries()) {
      journal.ecrire(
        [
          echappee(`C-${n}`, `E-${n}`, INTENTION, 'proposition', CONSIGNE_1, {
            modifications: MODIFICATIONS,
            constats: [],
          }),
        ],
        `${h}T08:00:00Z`,
      )
    }
    expect(intentions(journal, DEPUIS)).toEqual([])
    expect(aProposer(intentions(journal, DEPUIS), journal, SEUIL)).toEqual([])
    journal.fermer()
  })

  it('sans requête ni proposition, le dossier le dit', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    for (const [n, h] of ['2026-10-01', '2026-10-02', '2026-10-03'].entries()) {
      journal.ecrire(
        [echappee(`C-${n}`, `E-${n}`, INTENTION, 'reponse', CONSIGNE_2, ok)],
        `${h}T08:00:00Z`,
      )
    }
    const md = readFileSync(
      ecrireDossier(dossier, CLIENT, premiere(journal), journal, MAINTENANT, JOURS),
      'utf8',
    )
    expect(md).toContain('Aucune proposition validée.')
    expect(md).toContain('Aucune requête.')
    journal.fermer()
  })
})

describe('resumeCout', () => {
  it('deux décimales, virgule française', () => {
    expect(resumeCout({ usd: 1.234, appels: 12 }, 30)).toBe(
      "Coût de l'IA ce mois : 1,23 $ sur un plafond de 30,00 $ (12 appels)",
    )
  })
})
