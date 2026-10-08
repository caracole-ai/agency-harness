import Anthropic from '@anthropic-ai/sdk'
import type { Modele } from './modele'

// L'adaptateur du SDK officiel d'Anthropic (PLAN-ESPACES.md § 4.2). Un appel,
// rien d'autre : pas de `thinking` (toujours actif sur ce modèle, réglé par
// `effort`), pas de `temperature`, pas de repli vers un autre modèle (D5).
// Les erreurs typées du SDK remontent telles quelles : c'est l'appelant qui
// les transforme en « je n'y arrive pas ».

export function modeleAnthropic(id: string, cle: string): Modele {
  const client = new Anthropic({ apiKey: cle, timeout: 60_000, maxRetries: 2 })
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
