import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ConversationSchema, prixDe } from './config'

// La section `conversation` de la config client (PLAN-ESPACES.md § 4.7).

const exemple = fileURLToPath(
  new URL('../../../exemples/client-fictif/config.yaml', import.meta.url),
)
const section = () =>
  structuredClone((parse(readFileSync(exemple, 'utf8')) as { conversation: unknown }).conversation)

describe('ConversationSchema', () => {
  it('la config du client fictif passe', () => {
    const c = ConversationSchema.parse(section())
    expect(c.modele.id).toBe('claude-sonnet-5-5')
    expect(prixDe(c)).toEqual({ entree: 2, sortie: 10, cacheEcrit: 4, cacheLu: 0.1 })
    expect(c.modele.acces).toEqual({ binaire: 'claude' })
  })
  it('une clé inconnue refuse', () => {
    const s = section() as Record<string, unknown>
    s.inconnue = 1
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('zéro tour par demande refuse', () => {
    const s = section() as { plafonds: { par_demande: { tours: number } } }
    s.plafonds.par_demande.tours = 0
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('un effort hors liste refuse', () => {
    const s = section() as { modele: { effort: { traduire: string } } }
    s.modele.effort.traduire = 'max'
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('un autre point d’accès au format Anthropic est refusé : un seul fournisseur (2026-10-18)', () => {
    const avec = (acces: unknown) => {
      const s = section() as { modele: Record<string, unknown> }
      s.modele.acces = acces
      return ConversationSchema.safeParse(s).success
    }
    expect(
      avec({
        url: 'https://api.exemple.test',
        authentification: 'bearer',
        variable_cle: 'AUTRE_CLE',
      }),
    ).toBe(false)
    expect(avec({ variable_cle: 'AUTRE_CLE' })).toBe(false)
  })
  it('l’abonnement : un binaire nommé, rien d’autre', () => {
    const avec = (acces: unknown) => {
      const s = section() as { modele: Record<string, unknown> }
      s.modele.acces = acces
      return ConversationSchema.safeParse(s).success
    }
    expect(avec({ binaire: 'claude' })).toBe(true)
    expect(avec({ binaire: '' })).toBe(false)
    expect(avec({ binaire: 'claude', variable_cle: 'AUTRE_CLE' })).toBe(false)
  })
})
