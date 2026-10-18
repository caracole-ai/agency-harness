import Anthropic from '@anthropic-ai/sdk'
import { type ConfigConversation, VARIABLE_CLE_ANTHROPIC } from '../conversation/config'
import { modeleAbonnement } from './abonnement'
import type { Modele } from './modele'

// L'adaptateur du SDK officiel d'Anthropic (PLAN-ESPACES.md § 4.2). Un appel,
// rien d'autre : pas de `thinking` (toujours actif sur ce modèle, réglé par
// `effort`), pas de `temperature`, pas de repli vers un autre modèle (D5).
// Les erreurs typées du SDK remontent telles quelles : c'est l'appelant qui
// les transforme en « je n'y arrive pas ». Un seul fournisseur, Anthropic, par
// clé ici ou par l'abonnement (`abonnement.ts`) : aucun autre point d'accès
// (REFLEXIONS.md, « Décidé », 2026-10-18).

/**
 * @param delaiMs le temps laissé à un appel avant que le SDK ne l'abandonne :
 * celui de la demande dans la config (`plafonds.par_demande.secondes`), jamais
 * un nombre en dur (un 60 s codé ici faisait échouer un appel dont la
 * réflexion dépasse la minute : 2026-10-10).
 */
export function modeleAnthropic(id: string, cle: string, delaiMs: number): Modele {
  const client = new Anthropic({ apiKey: cle, timeout: delaiMs, maxRetries: 2 })
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
      const usage = {
        entree: message.usage.input_tokens,
        sortie: message.usage.output_tokens,
        cacheEcrit: message.usage.cache_creation_input_tokens ?? 0,
        cacheLu: message.usage.cache_read_input_tokens ?? 0,
      }
      return { message, usage, dureeMs: Date.now() - debut }
    },
  }
}

/**
 * Le modèle que nomme la config du client : par l'abonnement si elle nomme un
 * binaire, sinon avec la clé lue dans `ANTHROPIC_API_KEY`. Une variable
 * absente arrête, avec ce qu'il faut faire.
 */
export function modeleDepuisConfig(
  config: ConfigConversation,
  env: Record<string, string | undefined>,
): Modele {
  const acces = config.modele.acces
  const delaiMs = config.plafonds.par_demande.secondes * 1000
  if (acces) return modeleAbonnement(config.modele.id, acces.binaire, delaiMs, env)
  const cle = env[VARIABLE_CLE_ANTHROPIC]
  if (!cle) {
    throw new Error(
      `variable ${VARIABLE_CLE_ANTHROPIC} absente : exporter la clé, ou passer --modele simule`,
    )
  }
  return modeleAnthropic(config.modele.id, cle, delaiMs)
}
