import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, describe, expect, it } from 'vitest'
import type { ConfigConversation } from '../conversation/config'
import { modeleAnthropic, modeleDepuisConfig } from './anthropic'

// L'adaptateur vers un autre point d'accès au format Anthropic (GMI Cloud…) :
// l'adresse, la clé en Bearer, la variable nommée par la config. Un petit
// serveur local tient lieu de fournisseur : aucun appel réseau.

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
        model: 'zai-org/GLM-5.3',
        content: [{ type: 'text', text: 'bonjour' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
    )
  })
})
await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret))
const url = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`
afterAll(() => serveur.close())

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
    id: 'zai-org/GLM-5.3',
    prix_par_million_usd: { entree: 1.4, sortie: 4.4, cache_ecrit: 0, cache_lu: 0.26 },
    effort: { traduire: 'low', echappee: 'medium' },
    ...(acces ? { acces } : {}),
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 }, par_mois_usd: 30 },
  promotion: { occurrences: 3, jours: 30, conservation_jours: 90 },
})

describe('un autre point d’accès au format Anthropic', () => {
  it('la clé part en Bearer, sans x-api-key, vers l’adresse donnée ; l’usage sans cache vaut zéro', async () => {
    const m = modeleAnthropic('zai-org/GLM-5.3', 'cle-de-test', { url, bearer: true })
    const r = await m.appeler(appel)
    const derniere = recues.at(-1)
    expect(derniere?.url).toBe('/v1/messages')
    expect(derniere?.entetes.authorization).toBe('Bearer cle-de-test')
    expect(derniere?.entetes['x-api-key']).toBeUndefined()
    expect(derniere?.corps).toMatchObject({
      model: 'zai-org/GLM-5.3',
      output_config: { effort: 'low' },
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
    })
    expect(r.usage).toEqual({ entree: 12, sortie: 3, cacheEcrit: 0, cacheLu: 0 })
    expect(r.message.model).toBe('zai-org/GLM-5.3')
  })
  it('sans Bearer, la clé part en x-api-key', async () => {
    await modeleAnthropic('m', 'cle-x', { url, bearer: false }).appeler(appel)
    expect(recues.at(-1)?.entetes['x-api-key']).toBe('cle-x')
    expect(recues.at(-1)?.entetes.authorization).toBeUndefined()
  })
})

describe('modeleDepuisConfig', () => {
  it('lit la clé dans la variable que nomme la config', async () => {
    const m = modeleDepuisConfig(
      config({ url, authentification: 'bearer', variable_cle: 'GMI_API_KEY' }),
      { GMI_API_KEY: 'cle-gmi' },
    )
    await m.appeler(appel)
    expect(recues.at(-1)?.entetes.authorization).toBe('Bearer cle-gmi')
  })
  it('une variable absente arrête, en la nommant ; sans point d’accès, c’est ANTHROPIC_API_KEY', () => {
    expect(() =>
      modeleDepuisConfig(config({ url, authentification: 'bearer', variable_cle: 'GMI_API_KEY' }), {
        ANTHROPIC_API_KEY: 'autre',
      }),
    ).toThrow('variable GMI_API_KEY absente : exporter la clé, ou passer --modele simule')
    expect(() => modeleDepuisConfig(config(), {})).toThrow('variable ANTHROPIC_API_KEY absente')
  })
})
