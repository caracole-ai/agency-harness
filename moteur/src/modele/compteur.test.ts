import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Journal } from '../journal/journal'
import { coutDuMois, evenementAppel, plafondAtteint, TYPE_APPEL } from './compteur'
import { modeleSimule } from './simule'

// Le coût du mois, lu dans le journal (PLAN-ESPACES.md § 4.7).

const journal = () => new Journal(join(mkdtempSync(join(tmpdir(), 'compteur-')), 'j.sqlite'))
const ligne = (cout_usd: number) => ({
  type: TYPE_APPEL,
  client: 'fictif',
  objet: 'C-1',
  issue: 'traduire',
  donnees: { cout_usd },
})

describe('coutDuMois', () => {
  it('somme les appels du mois demandé, et seulement eux', () => {
    const j = journal()
    j.ecrire([ligne(0.5), ligne(0.25)], '2026-10-03T08:00:00Z')
    j.ecrire([ligne(7)], '2026-09-30T08:00:00Z')
    j.ecrire(
      [{ type: 'veille', client: 'fictif', donnees: { cout_usd: 100 } }],
      '2026-10-04T08:00:00Z',
    )
    expect(coutDuMois(j, '2026-10')).toEqual({ usd: 0.75, appels: 2 })
    expect(coutDuMois(j, '2026-09')).toEqual({ usd: 7, appels: 1 })
    j.fermer()
  })
  it('aucune ligne : zéro', () => {
    const j = journal()
    expect(coutDuMois(j, '2026-10')).toEqual({ usd: 0, appels: 0 })
    j.fermer()
  })
})

describe('plafondAtteint', () => {
  it('atteint dès l’égalité', () => {
    expect(plafondAtteint(29.99, 30)).toBe(false)
    expect(plafondAtteint(30, 30)).toBe(true)
  })
})

describe('evenementAppel', () => {
  it('porte les tokens, le coût et la raison de l’arrêt', async () => {
    const reponse = await modeleSimule([{ texte: 'ok' }]).appeler({
      systeme: 's',
      messages: [{ role: 'user', content: 'c' }],
      outils: [],
      effort: 'low',
      maxTokens: 10,
      unSeulOutil: true,
    })
    const e = evenementAppel('fictif', 'C-1', 'traduire', 1, reponse, {
      entree: 4,
      sortie: 20,
      cacheEcrit: 5,
      cacheLu: 0.2,
    })
    expect(e).toMatchObject({ type: TYPE_APPEL, objet: 'C-1', issue: 'traduire' })
    expect(e.donnees).toMatchObject({
      tour: 1,
      modele: 'simulé',
      cout_usd: 0.0014,
      stop_reason: 'end_turn',
    })
  })
})
