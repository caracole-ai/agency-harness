import Anthropic from '@anthropic-ai/sdk'
import { type ConfigConversation, VARIABLE_CLE_ANTHROPIC } from '../conversation/config'
import type { Modele } from './modele'

// L'adaptateur du SDK officiel d'Anthropic (PLAN-ESPACES.md § 4.2). Un appel,
// rien d'autre : pas de `thinking` (toujours actif sur ce modèle, réglé par
// `effort`), pas de `temperature`, pas de repli vers un autre modèle (D5).
// Les erreurs typées du SDK remontent telles quelles : c'est l'appelant qui
// les transforme en « je n'y arrive pas ».

/** Un autre point d'accès au même format : son adresse, et une clé portée en `Authorization: Bearer` ou non. */
export interface AccesModele {
  url: string
  bearer: boolean
}

export function modeleAnthropic(id: string, cle: string, acces?: AccesModele): Modele {
  const client = new Anthropic({
    ...(acces ? { baseURL: acces.url } : {}),
    // En Bearer, aucune `x-api-key` : le SDK la lirait sinon dans l'environnement.
    ...(acces?.bearer ? { apiKey: null, authToken: cle } : { apiKey: cle }),
    timeout: 60_000,
    maxRetries: 2,
  })
  return {
    id,
    async appeler(appel) {
      const debut = Date.now()
      const message = await client.messages.create({
        model: id,
        max_tokens: appel.maxTokens,
        system: [{ type: 'text', text: appel.systeme, cache_control: { type: 'ephemeral' } }],
        messages: appel.messages,
        tools: appel.outils,
        tool_choice: appel.unSeulOutil
          ? { type: 'auto', disable_parallel_tool_use: true }
          : { type: 'auto' },
        output_config: { effort: appel.effort },
      })
      return {
        message,
        usage: {
          entree: message.usage.input_tokens,
          sortie: message.usage.output_tokens,
          cacheEcrit: message.usage.cache_creation_input_tokens ?? 0,
          cacheLu: message.usage.cache_read_input_tokens ?? 0,
        },
        dureeMs: Date.now() - debut,
      }
    },
  }
}

/**
 * Le modèle que nomme la config du client, avec sa clé lue dans la variable
 * qu'elle désigne. Une variable absente arrête, avec ce qu'il faut faire.
 */
export function modeleDepuisConfig(
  config: ConfigConversation,
  env: Record<string, string | undefined>,
): Modele {
  const acces = config.modele.acces
  const variable = acces?.variable_cle ?? VARIABLE_CLE_ANTHROPIC
  const cle = env[variable]
  if (!cle) {
    throw new Error(`variable ${variable} absente : exporter la clé, ou passer --modele simule`)
  }
  return modeleAnthropic(
    config.modele.id,
    cle,
    acces ? { url: acces.url, bearer: acces.authentification === 'bearer' } : undefined,
  )
}
