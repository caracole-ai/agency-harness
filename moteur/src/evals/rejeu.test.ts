import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { RACINE_DEPOT } from '../agence/fictif'
import { metierDe } from '../cli/metier'
import type { MetierConversation } from '../conversation/conversation'
import { modeleSimule, type Scripte } from '../modele/simule'
import { evalsDuMetier, FichierTraduire, type ResultatCas } from './evals'
import {
  bilanRejeu,
  type CasRejeu,
  casPourGestes,
  estNonMesurable,
  jouerRejeu,
  ligneRejeu,
  MOTIF_REJEU,
} from './rejeu'
import { copieClient } from './traduction'

// Le rejeu (REFLEXIONS.md, décidé le 2026-10-18) sur le client fictif de la
// sécurité privée, avec un modèle scripté : l'échappée cite un nombre, le
// geste `heures_par_agent` doit le rendre. Le client fictif n'est jamais
// écrit : chaque cas tourne sur une copie.

const SOURCE = join(RACINE_DEPOT, 'exemples', 'client-fictif')
const METIER = 'securite-privee'
const GESTE = 'heures_par_agent'

const fichier = () =>
  FichierTraduire.parse(
    parse(readFileSync(join(RACINE_DEPOT, evalsDuMetier(METIER), 'consignes.yaml'), 'utf8')),
  )

/** Le cas P-HEU-1 (le patron, les heures d'un agent sur une semaine) : ce que le rejeu joue. */
async function casHeures(): Promise<{ m: MetierConversation<unknown>; cas: CasRejeu }> {
  const m = await metierDe(SOURCE)
  const cas = casPourGestes(fichier(), [GESTE]).find((c) => c.id === 'P-HEU-1')
  if (!cas) throw new Error('P-HEU-1 attendu dans consignes.yaml')
  return { m, cas }
}

/** Les heures que le geste rend pour ce cas, lues sur une copie : la vérité du geste. */
async function heuresDuGeste(m: MetierConversation<unknown>, cas: CasRejeu): Promise<number> {
  const copie = copieClient(SOURCE)
  const s = m.ouvrir(copie)
  try {
    const action = m.actions.find((a) => a.id === cas.action)
    if (!action) throw new Error(`${cas.action} absent du métier`)
    const { donnees } = await action.executer(
      s,
      { role: cas.role },
      action.parametres.parse(cas.params),
      cas.quand,
    )
    return (donnees as { heures: number }).heures
  } finally {
    m.fermer(s)
    rmSync(copie, { recursive: true, force: true })
  }
}

/** Une échappée scriptée : une requête, puis une réponse. */
const echappee = (sql: string, texte: string): Scripte[] => [
  { outil: 'requete', entree: { sql } },
  { outil: 'repondre', entree: { texte } },
]

const jouer = (m: MetierConversation<unknown>, cas: CasRejeu, script: Scripte[]) =>
  jouerRejeu(m, SOURCE, [cas], () => modeleSimule(script))

describe('casPourGestes', () => {
  it('ne garde que les cas qui attendent l’un des gestes, avec leurs paramètres attendus', () => {
    const cas = casPourGestes(fichier(), [GESTE])
    expect(cas.length).toBeGreaterThanOrEqual(3)
    expect(cas.every((c) => c.action === GESTE)).toBe(true)
    expect(cas.find((c) => c.id === 'P-HEU-1')?.params).toEqual({
      agent: 'A-1',
      du: '2026-10-05',
      au: '2026-10-11',
    })
    expect(casPourGestes(fichier(), ['geste_inconnu'])).toEqual([])
  })
})

describe('jouerRejeu', () => {
  it('fidèle : le nombre que l’échappée cite est dans ce que le geste rend ; les nombres de la consigne ne comptent pas', async () => {
    const { m, cas } = await casHeures()
    const heures = await heuresDuGeste(m, cas)
    // « du 5 au 11 » vient de la consigne : le geste les rend en dates, l'échappée en nombres.
    const [r] = await jouer(
      m,
      cas,
      echappee(`SELECT ${heures} AS heures`, `A-1 : ${heures} heures du 5 au 11.`),
    )
    expect(r?.ecarts).toEqual([])
    expect(r?.fuite).toEqual([])
  })

  it('en écart : un nombre cité par l’échappée que le geste ne rend pas', async () => {
    const { m, cas } = await casHeures()
    const [r] = await jouer(m, cas, echappee('SELECT 999 AS heures', 'A-1 : 999 heures.'))
    expect(r?.ecarts).toEqual(["nombres de l'échappée absents du geste : 999"])
    expect(r && estNonMesurable(r)).toBe(false)
  })

  it('non mesurable : l’échappée abandonne, ou son résumé est retiré par le contrôle', async () => {
    const { m, cas } = await casHeures()
    const [abandon] = await jouer(m, cas, [{ outil: 'abandonner', entree: { motif: 'rien' } }])
    expect(abandon?.ecarts).toEqual(["non mesurable : l'échappée a abandonné (rien)"])
    const [retire] = await jouer(m, cas, echappee('SELECT 1 AS un', 'A-1 : 777 heures.'))
    expect(retire?.ecarts).toEqual(["non mesurable : le contrôle a retiré le résumé de l'échappée"])
    expect(retire && estNonMesurable(retire)).toBe(true)
  })
})

describe('le bilan du rejeu', () => {
  const cas = (id: string, ecarts: string[]): ResultatCas => ({
    id,
    ecarts,
    coutUsd: 0.01,
    strict: false,
  })

  it('compte les fidèles sur les mesurables, les non mesurables à part ; la ligne se relit par MOTIF_REJEU', () => {
    const b = bilanRejeu([
      cas('S-1', []),
      cas('S-2', ["nombres de l'échappée absents du geste : 24"]),
      cas('S-3', ["non mesurable : l'échappée a abandonné (rien)"]),
    ])
    expect(b).toEqual({
      fideles: 1,
      mesurables: 2,
      nonMesurables: 1,
      ecarts: ['S-2'],
      coutUsd: 0.03,
      fidele: false,
    })
    const ligne = ligneRejeu(b)
    expect(ligne).toBe('rejeu : 1/2 fidèle(s), 1 non mesurable(s), coût 0.0300 $ ; en écart : S-2')
    expect(MOTIF_REJEU.exec(ligne)?.slice(1)).toEqual(['1', '2', '1'])
    // Aucun cas mesurable : fidèle quand même, et dit.
    expect(bilanRejeu([cas('S-3', ['non mesurable : x'])])).toMatchObject({
      fideles: 0,
      mesurables: 0,
      nonMesurables: 1,
      fidele: true,
    })
  })
})
