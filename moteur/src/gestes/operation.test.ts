import { describe, expect, it } from 'vitest'
import {
  empreinteGeste,
  GesteAppris,
  modificationsDe,
  modificationsNormalisees,
  verifierGabarit,
} from './geste-appris'
import {
  DECLARATIONS_EXEMPLE,
  GESTE_ECRIT_EXEMPLE as ECRIT,
  GESTE_EXEMPLE as GESTE,
  OPERATION_EXEMPLE,
} from './geste-appris.exemple'

// L'opération d'écriture déclarée par le métier (PLAN-METIER-2.md § 3.4, M6),
// côté moteur : les deux formes de `modifications` se lisent sans conversion
// (l'empreinte d'un geste déjà actif ne change pas) et se normalisent ; le
// moteur fait les modifications par l'opération, sans savoir ce qu'elle
// modifie. L'opération de la sécurité a ses tests chez elle.

const NOUVELLE = {
  pour_chaque: 'liberer',
  operation: 'reaffecter',
  colonnes: { vacation: 'vacation', agent: 'agent' },
}

describe('les deux formes de modifications', () => {
  it('l’ancienne forme se lit telle quelle : le geste parsé la garde, son empreinte est celle d’avant M6', () => {
    expect(GesteAppris.parse(ECRIT)).toEqual(ECRIT)
    // L'empreinte du geste qui écrit de référence, calculée sur la branche avant M6.
    expect(empreinteGeste(ECRIT)).toBe(
      '57a1ee640bf51d9bee2623a8b4ad521074eded8ca2f1faec778dc2c4c0d6dc0a',
    )
    // Une conversion à la lecture l'aurait changée : le geste aurait été écarté.
    expect(empreinteGeste({ ...ECRIT, modifications: NOUVELLE })).not.toBe(empreinteGeste(ECRIT))
  })
  it('modificationsNormalisees : l’ancienne forme devient { pour_chaque, operation, colonnes } ; la nouvelle reste ; un geste qui lit, rien', () => {
    expect(modificationsNormalisees(ECRIT)).toEqual(NOUVELLE)
    expect(modificationsNormalisees({ modifications: NOUVELLE })).toEqual(NOUVELLE)
    expect(modificationsNormalisees(GESTE)).toBeUndefined()
  })
  it('le schéma : la nouvelle forme passe ; une ancienne à deux opérations, ou une colonne mal nommée, non', () => {
    expect(GesteAppris.safeParse({ ...ECRIT, modifications: NOUVELLE }).success).toBe(true)
    const deux = {
      pour_chaque: 'liberer',
      reaffecter: { vacation: 'vacation', agent: 'agent' },
      autre: { x: 'y' },
    }
    expect(GesteAppris.safeParse({ ...ECRIT, modifications: deux }).success).toBe(false)
    expect(
      GesteAppris.safeParse({
        ...ECRIT,
        modifications: { ...NOUVELLE, colonnes: { vacation: 'Vacation' } },
      }).success,
    ).toBe(false)
  })
})

describe('le gabarit d’un geste qui écrit, par l’opération du métier', () => {
  const colonnes = new Map([['liberer', ['vacation', 'agent']]])
  it('les deux formes passent', () => {
    expect(verifierGabarit(DECLARATIONS_EXEMPLE, ECRIT, colonnes)).toEqual([])
    expect(
      verifierGabarit(DECLARATIONS_EXEMPLE, { ...ECRIT, modifications: NOUVELLE }, colonnes),
    ).toEqual([])
  })
  it('des colonnes que l’opération ne lit pas, une modification attendue d’une autre forme : un écart chacun', () => {
    expect(
      verifierGabarit(DECLARATIONS_EXEMPLE, {
        ...ECRIT,
        modifications: { ...NOUVELLE, colonnes: { vacation: 'vacation' } },
      })[0],
    ).toMatch(/^les colonnes de l’opération : /)
    expect(
      verifierGabarit(DECLARATIONS_EXEMPLE, {
        ...ECRIT,
        tests: ECRIT.tests.map((t) => ({ ...t, modifications: [{ objet: 'V-03' }] })),
      }),
    ).toEqual(['un geste qui écrit : chaque modification attendue a la forme de l’opération'])
  })
})

describe('modificationsDe, par l’opération', () => {
  it('chaque ligne passe à depuisLigne avec ses cellules par colonne et les colonnes du geste', () => {
    const vues: unknown[] = []
    const espion = {
      ...OPERATION_EXEMPLE,
      depuisLigne: (ligne: Record<string, unknown>, c: Record<string, string>) => {
        vues.push({ ligne, c })
        return OPERATION_EXEMPLE.depuisLigne(ligne, c)
      },
    }
    const resultats = {
      liberer: {
        colonnes: ['vacation', 'agent', 'jour'],
        lignes: [['V-03', 'A-9', '2026-10-13']],
        tronque: false,
      },
    }
    expect(modificationsDe(ECRIT, resultats, espion)).toEqual([{ vacation: 'V-03', agent: 'A-9' }])
    expect(vues).toEqual([
      {
        ligne: { vacation: 'V-03', agent: 'A-9', jour: '2026-10-13' },
        c: { vacation: 'vacation', agent: 'agent' },
      },
    ])
  })
  it('sans opération : lève', () => {
    expect(() =>
      modificationsDe(
        ECRIT,
        { liberer: { colonnes: ['vacation', 'agent'], lignes: [], tronque: false } },
        undefined,
      ),
    ).toThrow('ce métier n’écrit pas par un geste appris')
  })
})
