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
    expect(c.modele.id).toBe('claude-opus-5-5')
    expect(prixDe(c)).toEqual({ entree: 4, sortie: 20, cacheEcrit: 5, cacheLu: 0.2 })
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
})
