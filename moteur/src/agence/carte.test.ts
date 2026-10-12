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

  it('ne dit aucun métier : la ronde reçoit le cadre du domaine (PLAN-METIER-2.md M7)', () => {
    expect(carte).not.toMatch(/sécurité privée|ici, la/)
  })
})

// PLAN-RONDE.md § 6.4 : le système ajouté au chantier, de même.
describe('methode/chantier.md', () => {
  const methode = readFileSync(join(RACINE_DEPOT, 'methode', 'chantier.md'), 'utf8')

  it('ne porte aucun nom ni identifiant du client fictif', () => {
    expect(interdits(methode, personnesFictives())).toEqual([])
  })

  it('dit où écrire, qu’un geste qui écrit rend des Modification, et les trois sections de fin', () => {
    expect(methode).toContain('bande métier')
    expect(methode).toContain('`Modification`')
    for (const s of ['## Vérifié', '## Non vérifié, risque', "## Ce que j'ai appris"]) {
      expect(methode).toContain(s)
    }
  })

  it('ne cite ni les places ni l’opération de la sécurité (PLAN-METIER-2.md M7)', () => {
    expect(methode).not.toMatch(/<agent>|<site>|'reaffecter'/)
  })
})
