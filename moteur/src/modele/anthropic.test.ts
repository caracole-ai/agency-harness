import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, describe, expect, it } from 'vitest'
import type { ConfigConversation } from '../conversation/config'
import { modeleAnthropic, modeleDepuisConfig } from './anthropic'

// L'adaptateur du SDK d'Anthropic : la clé en `x-api-key`, l'effort, un seul
// outil par tour, l'usage relevé tel quel. Un petit serveur local tient lieu
// de l'API, par `ANTHROPIC_BASE_URL` que le SDK lit : aucun appel réseau.

const recues: { url: string | undefined; entetes: IncomingHttpHeaders; corps: unknown }[] = []
const serveur = createServer((req, res) => {
  let corps = ''
  req.on('data', (d: Buffer) => {
    corps += d.toString('utf8')
  })
  req.on('end', () => {
    recues.push({ url: req.url, entetes: req.headers, corps: JSON.parse(corps) })
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        id: 'msg_local',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-5-5',
        content: [{ type: 'text', text: 'bonjour' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
    )
  })
})
await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret))
const adresseAvant = process.env.ANTHROPIC_BASE_URL
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`
afterAll(() => {
  if (adresseAvant === undefined) delete process.env.ANTHROPIC_BASE_URL
  else process.env.ANTHROPIC_BASE_URL = adresseAvant
  serveur.close()
})

const appel = {
  systeme: 'système',
  messages: [{ role: 'user' as const, content: 'bonjour' }],
  outils: [],
  effort: 'low' as const,
  maxTokens: 16,
  unSeulOutil: true,
}

const config = (acces?: ConfigConversation['modele']['acces']): ConfigConversation => ({
  modele: {
    fournisseur: 'anthropic',
    id: 'claude-sonnet-5-5',
    prix_par_million_usd: { entree: 3, sortie: 15, cache_ecrit: 3.75, cache_lu: 0.3 },
    effort: { traduire: 'low', echappee: 'medium' },
    ...(acces ? { acces } : {}),
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 }, par_mois_usd: 30 },
})

describe('modeleAnthropic', () => {
  it('la clé part en x-api-key vers /v1/messages, avec l’effort et un seul outil ; l’usage sans cache vaut zéro', async () => {
    const m = modeleAnthropic('claude-sonnet-5-5', 'cle-de-test', 120_000)
    const r = await m.appeler(appel)
    const derniere = recues.at(-1)
    expect(derniere?.url).toBe('/v1/messages')
    expect(derniere?.entetes['x-api-key']).toBe('cle-de-test')
    expect(derniere?.entetes.authorization).toBeUndefined()
    expect(derniere?.corps).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_tokens: 16,
      output_config: { effort: 'low' },
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
    })
    expect(derniere?.corps).not.toHaveProperty('stream')
    expect(r.usage).toEqual({ entree: 12, sortie: 3, cacheEcrit: 0, cacheLu: 0 })
    expect(r.message.model).toBe('claude-sonnet-5-5')
    expect(r).not.toHaveProperty('usageBorne')
  })
})

describe('modeleDepuisConfig', () => {
  it('sans binaire, la clé est lue dans ANTHROPIC_API_KEY, et dans rien d’autre', async () => {
    const m = modeleDepuisConfig(config(), { ANTHROPIC_API_KEY: 'cle-env', AUTRE_CLE: 'non' })
    await m.appeler(appel)
    expect(recues.at(-1)?.entetes['x-api-key']).toBe('cle-env')
  })
  it('une clé absente arrête, en nommant la variable', () => {
    expect(() => modeleDepuisConfig(config(), { AUTRE_CLE: 'cle' })).toThrow(
      'variable ANTHROPIC_API_KEY absente : exporter la clé, ou passer --modele simule',
    )
  })
  it('un binaire nommé : l’abonnement, sans clé', () => {
    expect(modeleDepuisConfig(config({ binaire: 'claude' }), {}).id).toBe('claude-sonnet-5-5')
  })
})
