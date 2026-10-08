import type Anthropic from '@anthropic-ai/sdk'
import type { AppelModele, Modele, UsageModele } from './modele'

// L'adaptateur de test : des réponses scriptées, rendues dans l'ordre, sans
// réseau ni clé (PLAN-ESPACES.md § 4.3). Il garde chaque appel reçu : les
// tests y lisent le système et les outils envoyés.

export type Scripte =
  /** Un `tool_use` (id généré `toolu_simule_<n>`). */
  | { outil: string; entree: unknown }
  /** Un `end_turn` avec un bloc texte. */
  | { texte: string }
  /** Un `stop_reason` forcé, sans bloc. */
  | { arret: 'refusal' | 'max_tokens' }

export function modeleSimule(
  scenario: Scripte[],
  usageParAppel: UsageModele = { entree: 100, sortie: 50, cacheEcrit: 0, cacheLu: 0 },
): Modele & { appels: AppelModele[] } {
  const appels: AppelModele[] = []
  return {
    id: 'simulé',
    appels,
    async appeler(appel) {
      const n = appels.length
      const pas = scenario[n]
      if (!pas) throw new Error('script simulé épuisé')
      // Une copie : la boucle continue de remplir ses messages après l'appel.
      appels.push({ ...appel, messages: structuredClone(appel.messages) })
      const content: Anthropic.ContentBlock[] =
        'outil' in pas
          ? [
              {
                type: 'tool_use',
                id: `toolu_simule_${n + 1}`,
                name: pas.outil,
                input: pas.entree,
                caller: { type: 'direct' },
              },
            ]
          : 'texte' in pas
            ? [{ type: 'text', text: pas.texte, citations: null }]
            : []
      const stop_reason: Anthropic.StopReason =
        'outil' in pas ? 'tool_use' : 'texte' in pas ? 'end_turn' : pas.arret
      const message: Anthropic.Message = {
        id: `msg_simule_${n + 1}`,
        type: 'message',
        role: 'assistant',
        model: 'simulé',
        content,
        stop_reason,
        stop_sequence: null,
        stop_details:
          stop_reason === 'refusal'
            ? { type: 'refusal', category: null, explanation: 'refus simulé' }
            : null,
        container: null,
        diagnostics: null,
        usage: {
          input_tokens: usageParAppel.entree,
          output_tokens: usageParAppel.sortie,
          cache_creation_input_tokens: usageParAppel.cacheEcrit,
          cache_read_input_tokens: usageParAppel.cacheLu,
          cache_creation: null,
          inference_geo: null,
          output_tokens_details: null,
          server_tool_use: null,
          service_tier: null,
        },
      }
      return { message, usage: { ...usageParAppel }, dureeMs: 0 }
    },
  }
}
