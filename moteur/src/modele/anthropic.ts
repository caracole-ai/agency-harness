import Anthropic from '@anthropic-ai/sdk'
import { type ConfigConversation, VARIABLE_CLE_ANTHROPIC } from '../conversation/config'
import type { Modele, UsageModele } from './modele'

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

/**
 * @param delaiMs le temps laissé à un appel avant que le SDK ne l'abandonne :
 * celui de la demande dans la config (`plafonds.par_demande.secondes`), jamais
 * un nombre en dur (un 60 s codé ici faisait échouer la fabrication d'un geste
 * appris, dont la réflexion dépasse la minute : 2026-10-10).
 */
export function modeleAnthropic(
  id: string,
  cle: string,
  acces: AccesModele | undefined,
  delaiMs: number,
): Modele {
  const client = new Anthropic({
    ...(acces ? { baseURL: acces.url } : {}),
    // En Bearer, aucune `x-api-key` : le SDK la lirait sinon dans l'environnement.
    ...(acces?.bearer ? { apiKey: null, authToken: cle } : { apiKey: cle }),
    timeout: delaiMs,
    maxRetries: 2,
  })
  return {
    id,
    async appeler(appel) {
      const debut = Date.now()
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: id,
        max_tokens: appel.maxTokens,
        system: [{ type: 'text', text: appel.systeme, cache_control: { type: 'ephemeral' } }],
        messages: appel.messages,
        tools: appel.outils,
        tool_choice: appel.unSeulOutil
          ? { type: 'auto', disable_parallel_tool_use: true }
          : { type: 'auto' },
        output_config: { effort: appel.effort },
      }
      // En flux, le SDK reconstitue le message entier : le reste du moteur ne voit pas la différence.
      const message = appel.flux
        ? await client.messages.stream(params).finalMessage()
        : await client.messages.create(params)
      const usage = {
        entree: message.usage.input_tokens,
        sortie: message.usage.output_tokens,
        cacheEcrit: message.usage.cache_creation_input_tokens ?? 0,
        cacheLu: message.usage.cache_read_input_tokens ?? 0,
      }
      const dureeMs = Date.now() - debut
      // Un fournisseur qui ne compte pas en flux (GMI, 2026-10-10) rend tout à
      // zéro : le coût serait nul, le plafond du mois ne verrait rien. On
      // majore : la requête entière à un token pour deux caractères, la sortie
      // au plafond demandé.
      if (appel.flux && usage.entree === 0 && usage.sortie === 0) {
        return { message, usage: usageBorne(params, appel.maxTokens), dureeMs, usageBorne: true }
      }
      return { message, usage, dureeMs }
    },
  }
}

/** La borne haute d'un usage non compté : deux caractères par token en entrée (large pour du français), le plafond en sortie. */
export function usageBorne(requete: unknown, maxTokens: number): UsageModele {
  return {
    entree: Math.ceil(JSON.stringify(requete).length / 2),
    sortie: maxTokens,
    cacheEcrit: 0,
    cacheLu: 0,
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
    config.plafonds.par_demande.secondes * 1000,
  )
}
