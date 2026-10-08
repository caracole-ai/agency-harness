import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VALIDEE } from '../approbation/jeton'
import { OUTIL_REQUETE } from '../echappee/boucle'
import { TYPE_ECHAPPEE, TYPE_OUTIL_ECHAPPEE } from '../echappee/echappee'
import { type Evenement, Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import { Temporal } from '../temps/temporal'
import {
  aProposer,
  ecrireDossier,
  type IntentionComptee,
  intentions,
  resumeCout,
  TYPE_PROMOTION,
} from './promotion'

// Le compteur des demandes nouvelles et le dossier de promotion, sur un
// journal rempli à la main (PLAN-ESPACES.md § 8.3).

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
const echappee = (
  conversation: string,
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
  donnees: { intention, cout_usd: 0, ...donnees },
})
const outil = (conversation: string, nom: string, entree: unknown): Evenement => ({
  type: TYPE_OUTIL_ECHAPPEE,
  client: CLIENT,
  objet: conversation,
  issue: nom,
  motif: JSON.stringify(entree),
  donnees: { tour: 1, entree, sortie: '' },
})

/** Trois demandes `liberer_un_jour` sur dix jours (C-1, C-2, C-3), une autre (C-9), leurs appels. */
function journalRempli(): { journal: Journal; dossier: string } {
  const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
  const journal = new Journal(join(dossier, 'journal.sqlite'))
  journal.ecrire(
    [
      appel('C-1', 'traduire', 0.1),
      outil('C-1', OUTIL_REQUETE, { sql: SQL }),
      outil('C-1', 'verifier', { modifications: MODIFICATIONS }),
      appel('C-1', 'echappee', 0.25),
      echappee('C-1', INTENTION, 'proposition', CONSIGNE_1, {
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
      echappee('C-2', INTENTION, 'reponse', CONSIGNE_2, { controle_reponse: 'ok' }),
    ],
    '2026-10-02T09:00:00Z',
  )
  journal.ecrire(
    [
      appel('C-9', 'traduire', 1),
      echappee('C-9', AUTRE, 'reponse', 'Combien d’heures a fait Julien ?', {
        controle_reponse: 'ok',
      }),
    ],
    '2026-10-05T10:00:00Z',
  )
  journal.ecrire(
    [
      appel('C-3', 'traduire', 0.02),
      appel('C-3', 'echappee', 0.08),
      echappee('C-3', INTENTION, 'abandon', CONSIGNE_3, { abandon: 'bornes atteintes' }),
    ],
    '2026-10-07T16:30:00Z',
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

describe('intentions', () => {
  it('compte les échappées par intention, avec leurs conversations, leurs consignes et leur coût', () => {
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
  it('ne compte pas ce qui précède `depuis`', () => {
    const { journal } = journalRempli()
    const [i] = intentions(journal, Temporal.PlainDate.from('2026-10-01'))
    expect(i).toMatchObject({ intention: INTENTION, occurrences: 2, conversations: ['C-2', 'C-3'] })
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
      [echappee('C-4', INTENTION, 'reponse', 'Libère Sophie mardi.', { controle_reponse: 'ok' })],
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
    expect(md).toContain('C-3, abandon')
    expect(md).toContain(`\`\`\`sql\n${SQL}\n\`\`\``)
    expect(md).toContain('Contrôle : abandon : bornes atteintes.')
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

  it('sans validation au journal, la proposition n’est pas un cas de test candidat', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'promotion-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    for (const [n, h] of ['2026-10-01', '2026-10-02', '2026-10-03'].entries()) {
      journal.ecrire(
        [
          echappee(`C-${n}`, INTENTION, 'proposition', CONSIGNE_1, {
            modifications: MODIFICATIONS,
            constats: [],
          }),
        ],
        `${h}T08:00:00Z`,
      )
    }
    const i = premiere(journal)
    const md = readFileSync(ecrireDossier(dossier, CLIENT, i, journal, MAINTENANT, JOURS), 'utf8')
    expect(md).toContain('Suite donnée : non validée.')
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
