import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { type Executer, executerSync } from '../agence/config'
import { type Lancer, lancerClaude, lancerProcessus } from '../chantier/claude'
import type { Modele } from './modele'

// L'adaptateur de l'abonnement claude.ai, par le binaire de Claude Code : le
// même accès que la ronde (PLAN-RONDE.md § 0.a), son préflight compris
// (`claude auth status` connecté, ANTHROPIC_API_KEY absente). Un appel = un
// lancement isolé (ni réglages, ni hooks, ni `CLAUDE.md`, ni outil de Claude
// Code, dans un dossier vide) qui rend le tour suivant de l'assistant. Le
// binaire n'expose pas les outils du moteur : la conversation part en texte,
// tour par tour, et le tour revient en sortie structurée (le texte, les appels
// d'outil validés par le schéma de chaque outil), remis en `Anthropic.Message`.
// Les outils restent exécutés par le moteur, jamais par le binaire. Pas de
// flux : le binaire attend la réponse entière, sans passerelle qui coupe.

/** La variable de Claude Code qui borne les tokens de sortie d'un appel : le plafond de l'appel y passe. */
export const VARIABLE_TOKENS_SORTIE = 'CLAUDE_CODE_MAX_OUTPUT_TOKENS'

/** Le tour rendu par le binaire. */
const Tour = z.strictObject({
  texte: z.string(),
  appels: z.array(z.strictObject({ outil: z.string(), entree: z.unknown() })),
})

/** Le schéma de la sortie structurée : un tour, ses appels limités aux outils de l'appel et à leurs entrées. */
export function schemaTour(outils: Anthropic.Tool[], unSeulOutil: boolean): unknown {
  return {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Ce que tu dis dans ce tour ; vide si rien.' },
      appels:
        outils.length === 0
          ? { type: 'array', maxItems: 0 }
          : {
              type: 'array',
              ...(unSeulOutil ? { maxItems: 1 } : {}),
              items: {
                anyOf: outils.map((o) => ({
                  type: 'object',
                  ...(o.description !== undefined ? { description: o.description } : {}),
                  properties: { outil: { const: o.name }, entree: o.input_schema },
                  required: ['outil', 'entree'],
                  additionalProperties: false,
                })),
              },
            },
    },
    required: ['texte', 'appels'],
    additionalProperties: false,
  }
}

/** Ce qui s'ajoute au système de l'appel : comment l'échange arrive, comment le tour repart, les outils. */
export function protocole(outils: Anthropic.Tool[], unSeulOutil: boolean): string {
  return [
    '---',
    'Comment se passe cet échange : la conversation jusqu’ici t’est donnée dans le message, tour par tour. `<tour role="user">` est ce qui t’est adressé, résultats de tes appels d’outil (`<resultat>`) compris ; `<tour role="assistant">` sont tes tours précédents, avec leurs appels d’outil (`<appel>`).',
    `Tu écris le tour suivant de l’assistant, et lui seul, dans la sortie structurée : \`texte\`, ce que tu dis (vide si rien) ; \`appels\`, les outils que tu appelles${unSeulOutil ? ' (un au plus)' : ''}, chacun avec son entrée. Un appel s’exécute après ton tour : son résultat te revient au tour suivant.`,
    ...(outils.length > 0
      ? ['Tes outils :', ...outils.map((o) => `- ${o.name} : ${o.description ?? ''}`)]
      : ['Tu n’as aucun outil.']),
  ].join('\n')
}

type Bloc =
  | Exclude<Anthropic.MessageParam['content'], string>[number]
  | Exclude<NonNullable<Anthropic.ToolResultBlockParam['content']>, string>[number]

function blocEnTexte(b: Bloc): string {
  switch (b.type) {
    case 'text':
      return b.text
    case 'tool_use':
      return `<appel id="${b.id}" outil="${b.name}">${JSON.stringify(b.input)}</appel>`
    case 'tool_result': {
      const contenu =
        typeof b.content === 'string' ? b.content : (b.content ?? []).map(blocEnTexte).join('\n')
      return `<resultat id="${b.tool_use_id}"${b.is_error ? ' erreur="oui"' : ''}>\n${contenu}\n</resultat>`
    }
    default:
      return JSON.stringify(b)
  }
}

/** La conversation de l'appel, en texte, tour par tour. */
export function conversationEnTexte(messages: Anthropic.MessageParam[]): string {
  return messages
    .map((m) => {
      const contenu =
        typeof m.content === 'string' ? m.content : m.content.map(blocEnTexte).join('\n')
      return `<tour role="${m.role}">\n${contenu}\n</tour>`
    })
    .join('\n\n')
}

/**
 * @param delaiMs le temps laissé à un lancement : celui de la demande dans la
 * config (`plafonds.par_demande.secondes`), jamais un nombre en dur.
 */
export function modeleAbonnement(
  id: string,
  binaire: string,
  delaiMs: number,
  env: Record<string, string | undefined>,
  lancer: Lancer = lancerProcessus,
  executer: Executer = executerSync,
): Modele {
  return {
    id,
    async appeler(appel) {
      const vide = mkdtempSync(join(tmpdir(), 'abonnement-'))
      try {
        const issue = await lancerClaude(
          {
            modele: id,
            effort: appel.effort,
            prompt: conversationEnTexte(appel.messages),
            systeme: `${appel.systeme}\n\n${protocole(appel.outils, appel.unSeulOutil)}`,
            outils: [],
            cwd: vide,
            schemaJson: schemaTour(appel.outils, appel.unSeulOutil),
            delaiMs,
            reglages: 'aucun',
          },
          { claude: { binaire } },
          { ...env, [VARIABLE_TOKENS_SORTIE]: String(appel.maxTokens) },
          lancer,
          executer,
        )
        if (!issue.ok) throw new Error(`abonnement (${binaire}) : ${issue.raison}`)
        if (!issue.usage) throw new Error(`abonnement (${binaire}) : tokens non rendus`)
        const tour = Tour.safeParse(issue.sortie)
        if (!tour.success) {
          throw new Error(
            `abonnement (${binaire}) : tour illisible, ${z.prettifyError(tour.error)}`,
          )
        }
        const { texte, appels } = tour.data
        const content: Anthropic.ContentBlock[] = [
          ...(texte.trim() !== '' ? [{ type: 'text' as const, text: texte, citations: null }] : []),
          ...appels.map((a) => ({
            type: 'tool_use' as const,
            id: `toolu_abonnement_${randomUUID().replaceAll('-', '')}`,
            name: a.outil,
            input: a.entree,
            caller: { type: 'direct' as const },
          })),
        ]
        const message: Anthropic.Message = {
          id: `msg_abonnement_${randomUUID().replaceAll('-', '')}`,
          type: 'message',
          role: 'assistant',
          model: id,
          content,
          stop_reason: appels.length > 0 ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          stop_details: null,
          container: null,
          diagnostics: null,
          usage: {
            input_tokens: issue.usage.entree,
            output_tokens: issue.usage.sortie,
            cache_creation_input_tokens: issue.usage.cacheEcrit,
            cache_read_input_tokens: issue.usage.cacheLu,
            cache_creation: null,
            inference_geo: null,
            output_tokens_details: null,
            server_tool_use: null,
            service_tier: null,
          },
        }
        return { message, usage: issue.usage, dureeMs: issue.dureeMs }
      } finally {
        rmSync(vide, { recursive: true, force: true })
      }
    },
  }
}
