import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ConversationSchema, plafondFabrication, prixDe } from './config'

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
  it('conservation_jours : 90 par défaut, le client fictif le dit, zéro refuse', () => {
    const s = section() as { promotion: Record<string, unknown> }
    expect(ConversationSchema.parse(s).promotion.conservation_jours).toBe(90)
    delete s.promotion.conservation_jours
    expect(ConversationSchema.parse(s).promotion.conservation_jours).toBe(90)
    s.promotion.conservation_jours = 0
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('zéro tour par demande refuse', () => {
    const s = section() as { plafonds: { par_demande: { tours: number } } }
    s.plafonds.par_demande.tours = 0
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('la fabrication : son plafond s’il est déclaré, sinon celui de la demande ; zéro refuse', () => {
    const s = section() as {
      plafonds: { par_demande: { tokens_sortie: number }; fabrication?: unknown }
    }
    s.plafonds.par_demande.tokens_sortie = 12000
    delete s.plafonds.fabrication
    expect(plafondFabrication(ConversationSchema.parse(s))).toBe(12000)
    s.plafonds.fabrication = { tokens_sortie: 30000 }
    expect(plafondFabrication(ConversationSchema.parse(s))).toBe(30000)
    s.plafonds.fabrication = { tokens_sortie: 0 }
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('un effort hors liste refuse', () => {
    const s = section() as { modele: { effort: { traduire: string } } }
    s.modele.effort.traduire = 'max'
    expect(ConversationSchema.safeParse(s).success).toBe(false)
  })
  it('un point d’accès : adresse, authentification et nom de variable vérifiés', () => {
    const avec = (acces: unknown) => {
      const s = section() as { modele: Record<string, unknown> }
      s.modele.acces = acces
      return ConversationSchema.safeParse(s).success
    }
    expect(
      avec({
        url: 'https://api.gmi-serving.com',
        authentification: 'bearer',
        variable_cle: 'GMI_API_KEY',
      }),
    ).toBe(true)
    expect(
      avec({ url: 'pas une adresse', authentification: 'bearer', variable_cle: 'GMI_API_KEY' }),
    ).toBe(false)
    expect(
      avec({ url: 'https://x.y', authentification: 'jeton', variable_cle: 'GMI_API_KEY' }),
    ).toBe(false)
    expect(
      avec({
        url: 'https://x.y',
        authentification: 'bearer',
        variable_cle: 'eyJhbGciOi.la-cle-elle-meme',
      }),
    ).toBe(false)
  })
  it('l’abonnement : un binaire nommé, rien d’autre', () => {
    const avec = (acces: unknown) => {
      const s = section() as { modele: Record<string, unknown> }
      s.modele.acces = acces
      return ConversationSchema.safeParse(s).success
    }
    expect(avec({ binaire: 'claude' })).toBe(true)
    expect(avec({ binaire: '' })).toBe(false)
    expect(avec({ binaire: 'claude', variable_cle: 'GMI_API_KEY' })).toBe(false)
  })
})
