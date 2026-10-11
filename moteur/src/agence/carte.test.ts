import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { interdits } from '../chantier/memoire'
import { personnesFictives, RACINE_DEPOT } from './fictif'

// PLAN-RONDE.md § 4.3 : la carte lue par les modèles de la ronde et du
// chantier ne cite aucun nom ni aucun identifiant du client fictif.

describe('methode/architecture-pour-modeles.md', () => {
  const carte = readFileSync(join(RACINE_DEPOT, 'methode', 'architecture-pour-modeles.md'), 'utf8')

  it('ne porte aucun nom ni identifiant du client fictif', () => {
    const personnes = personnesFictives()
    expect(personnes.length).toBeGreaterThan(10)
    expect(interdits(carte, personnes)).toEqual([])
  })

  it('dit ce qu’un modèle ne fait jamais, et comment finir', () => {
    expect(carte).toContain("Ce qu'un modèle ne fait jamais")
    expect(carte).toContain('Non vérifié, risque')
  })
})
