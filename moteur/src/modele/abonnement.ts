import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { type Executer, executerSync } from '../agence/config'
import { type Lancer, lancerClaude, lancerProcessus, type Tentative } from '../chantier/claude'
import type { Modele } from './modele'

// L'adaptateur de l'abonnement claude.ai, par le binaire de Claude Code : le
// même accès que la ronde (PLAN-RONDE.md § 0.a), son préflight compris
// (`claude auth status` connecté, ANTHROPIC_API_KEY absente). Un appel = un
// lancement isolé (ni réglages, ni hooks, ni `CLAUDE.md`, ni outil de Claude
// Code, dans un dossier vide) qui rend le tour suivant de l'assistant. Le
// binaire n'expose pas les outils du moteur : la conversation part en texte,
// tour par tour, et le tour revient en sortie structurée (le texte, les appels
// d'outil validés par le schéma de chaque outil), remis en `Anthropic.Message`.
// Les outils restent exécutés par le moteur, jamais par le binaire. Le
// binaire attend la réponse entière.

/** La variable de Claude Code qui borne les tokens de sortie d'un appel : le plafond de l'appel y passe. */
export const VARIABLE_TOKENS_SORTIE = 'CLAUDE_CODE_MAX_OUTPUT_TOKENS'

/**
 * Le tour rendu par le binaire. Ni « outil » ni « appel » : le binaire rend la
 * sortie structurée par un outil à lui, et un modèle qui lit « tes outils »
 * tente de les appeler directement, reçoit « No such tool available » et peut
 * conclure qu'ils sont en panne (évals du 2026-10-18 : 4 essais sur 10, et des
 * abandons). Le tour nomme donc des actions que le harnais exécute.
 */
const Tour = z.strictObject({
  texte: z.string(),
  actions: z.array(z.strictObject({ action: z.string(), parametres: z.unknown() })),
})

/** Le schéma de la sortie structurée : un tour, ses appels limités aux outils de l'appel et à leurs entrées. */
export function schemaTour(outils: Anthropic.Tool[], unSeulOutil: boolean): unknown {
  return {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Ce que tu dis dans ce tour ; vide si rien.' },
      actions:
        outils.length === 0
          ? { type: 'array', maxItems: 0 }
          : {
              type: 'array',
              ...(unSeulOutil ? { maxItems: 1 } : {}),
              items: {
                anyOf: outils.map((o) => ({
                  type: 'object',
                  ...(o.description !== undefined ? { description: o.description } : {}),
                  properties: { action: { const: o.name }, parametres: o.input_schema },
                  required: ['action', 'parametres'],
                  additionalProperties: false,
                })),
              },
            },
    },
    required: ['texte', 'actions'],
    additionalProperties: false,
  }
}

/** Ce qui s'ajoute au système de l'appel : comment l'échange arrive, comment le tour repart, les outils. */
export function protocole(outils: Anthropic.Tool[], unSeulOutil: boolean): string {
  return [
    '---',
    'Comment se passe cet échange : la conversation jusqu’ici t’est donnée dans le message, tour par tour. `<tour role="user">` est ce qui t’est adressé, résultats de tes actions (`<resultat>`) compris ; `<tour role="assistant">` sont tes tours précédents, avec leurs actions (`<action>`).',
    `Tu écris le tour suivant de l’assistant, et lui seul, en rendant ta sortie structurée : \`texte\`, ce que tu dis (vide si rien) ; \`actions\`, ce que tu demandes au harnais de faire${unSeulOutil ? ' (une au plus)' : ''}, chacune avec ses paramètres. Le harnais exécute l’action après ton tour : son résultat te revient au tour suivant.`,
    'Dans les consignes ci-dessus, « appeler un outil » veut dire : le nommer dans `actions`. Ces actions ne sont pas des outils que tu peux appeler toi-même.',
    ...(outils.length > 0
      ? [
          'Les actions que tu peux demander :',
          ...outils.map((o) => `- ${o.name} : ${o.description ?? ''}`),
        ]
      : ['Tu ne peux demander aucune action : `actions` reste vide.']),
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
      return `<action id="${b.id}" nom="${b.name}">${JSON.stringify(b.input)}</action>`
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
 * Les actions du tour. Le modèle tente parfois une action directement, comme un
 * outil ; le binaire répond « No such tool available », et le modèle recopie
 * d'ordinaire la même action dans la sortie structurée, mais parfois conclut
 * que l'outil est en panne et abandonne (évals du 2026-10-18). Si la sortie
 * structurée ne nomme aucune des actions tentées, la première tentative d'une
 * action connue, d'entrée objet, est le tour : c'est ce que le modèle voulait
 * faire avant l'erreur du binaire. Son entrée est validée par le moteur, comme
 * toute autre.
 */
export function actionsRetenues(
  structurees: { action: string; parametres: unknown }[],
  tentatives: Tentative[],
  outils: Anthropic.Tool[],
): { action: string; parametres: unknown }[] {
  const connues = new Set(outils.map((o) => o.name))
  const tentees = tentatives.filter(
    (t) => connues.has(t.nom) && typeof t.entree === 'object' && t.entree !== null,
  )
  const premiere = tentees[0]
  if (premiere === undefined) return structurees
  if (structurees.some((s) => tentees.some((t) => t.nom === s.action))) return structurees
  return [{ action: premiere.nom, parametres: premiere.entree }]
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
            flux: true,
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
        const { texte } = tour.data
        const actions = actionsRetenues(tour.data.actions, issue.tentatives ?? [], appel.outils)
        const content: Anthropic.ContentBlock[] = [
          ...(texte.trim() !== '' ? [{ type: 'text' as const, text: texte, citations: null }] : []),
          ...actions.map((a) => ({
            type: 'tool_use' as const,
            id: `toolu_abonnement_${randomUUID().replaceAll('-', '')}`,
            name: a.action,
            input: a.parametres,
            caller: { type: 'direct' as const },
          })),
        ]
        const message: Anthropic.Message = {
          id: `msg_abonnement_${randomUUID().replaceAll('-', '')}`,
          type: 'message',
          role: 'assistant',
          model: id,
          content,
          stop_reason: actions.length > 0 ? 'tool_use' : 'end_turn',
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
