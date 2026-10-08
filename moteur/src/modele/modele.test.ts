import { describe, expect, it } from 'vitest'
import { cout, type PrixModele, USAGE_NUL } from './modele'
import { modeleSimule } from './simule'

// Le coût d'un appel et l'adaptateur simulé (PLAN-ESPACES.md § 4.7).

const prix: PrixModele = { entree: 4, sortie: 20, cacheEcrit: 5, cacheLu: 0.2 }

describe('cout', () => {
  it('un million de tokens d’entrée à 4 $ coûte 4 $', () => {
    expect(cout({ ...USAGE_NUL, entree: 1_000_000 }, prix)).toBe(4)
  })
  it('additionne entrée, sortie, écriture et lecture du cache', () => {
    // 2500 × 4 + 120 × 20 + 1000 × 5 + 2000 × 0,2 = 17 800 µ$
    expect(cout({ entree: 2500, sortie: 120, cacheEcrit: 1000, cacheLu: 2000 }, prix)).toBe(0.0178)
  })
  it('arrondit à 6 décimales', () => {
    expect(cout({ ...USAGE_NUL, cacheLu: 1 }, prix)).toBe(0)
    expect(cout({ ...USAGE_NUL, cacheLu: 3 }, prix)).toBe(0.000001)
  })
  it('un usage nul ne coûte rien', () => {
    expect(cout(USAGE_NUL, prix)).toBe(0)
  })
})

describe('modeleSimule', () => {
  const appel = (systeme: string) => ({
    systeme,
    messages: [{ role: 'user' as const, content: 'bonjour' }],
    outils: [],
    effort: 'low' as const,
    maxTokens: 1024,
    unSeulOutil: true,
  })

  it('rend les scripts dans l’ordre, avec un stop_reason cohérent', async () => {
    const m = modeleSimule([
      { outil: 'declarer_absence', entree: { agent: 'A-11' } },
      { texte: 'Bonjour' },
      { arret: 'refusal' },
      { arret: 'max_tokens' },
    ])
    const r1 = await m.appeler(appel('un'))
    expect(r1.message.stop_reason).toBe('tool_use')
    expect(r1.message.content[0]).toMatchObject({
      type: 'tool_use',
      id: 'toolu_simule_1',
      name: 'declarer_absence',
      input: { agent: 'A-11' },
    })
    const r2 = await m.appeler(appel('deux'))
    expect(r2.message.stop_reason).toBe('end_turn')
    expect(r2.message.content[0]).toMatchObject({ type: 'text', text: 'Bonjour' })
    const r3 = await m.appeler(appel('trois'))
    expect(r3.message.stop_reason).toBe('refusal')
    expect(r3.message.content).toEqual([])
    expect(r3.message.stop_details?.type).toBe('refusal')
    const r4 = await m.appeler(appel('quatre'))
    expect(r4.message.stop_reason).toBe('max_tokens')
    expect(r4.message.stop_details).toBeNull()
    expect(r1.usage).toEqual({ entree: 100, sortie: 50, cacheEcrit: 0, cacheLu: 0 })
  })

  it('lève quand le script est épuisé', async () => {
    const m = modeleSimule([{ texte: 'un seul' }])
    await m.appeler(appel('un'))
    await expect(m.appeler(appel('deux'))).rejects.toThrow('script simulé épuisé')
  })

  it('garde ce qui a été envoyé', async () => {
    const m = modeleSimule([{ texte: 'a' }, { texte: 'b' }])
    await m.appeler(appel('premier système'))
    await m.appeler(appel('second système'))
    expect(m.appels.map((a) => a.systeme)).toEqual(['premier système', 'second système'])
  })
})
