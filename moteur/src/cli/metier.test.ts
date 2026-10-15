import { describe, expect, it } from 'vitest'
import { moduleDuMetier } from './metier'

// PLAN-LIVRAISON.md L3 : le métier d'un chantier se charge par le nom que
// porte la mission, une donnée venue d'ailleurs : rien qu'un chemin lirait
// autrement n'est importé.

describe('moduleDuMetier', () => {
  it('charge un métier par son nom ; refuse un nom qui sortirait de metiers/', async () => {
    expect((await moduleDuMetier('securite-privee')).CONVERSATION).toBeDefined()
    for (const nom of ['../moteur', 'securite-privee/../../x', '/tmp/x', '', 'Securite', '-x'])
      await expect(moduleDuMetier(nom)).rejects.toThrow(/pas un nom de métier/)
  })
})
