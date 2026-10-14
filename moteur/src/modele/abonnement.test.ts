import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import type { Executer } from '../agence/config'
import type { Lancer } from '../chantier/claude'
import { modeleAbonnement, VARIABLE_TOKENS_SORTIE } from './abonnement'
import type { AppelModele } from './modele'

// L'abonnement par le binaire de Claude Code : la conversation part en texte,
// le tour revient en sortie structurée, remis en message au format Anthropic.
// Le binaire est simulé : aucun lancement, aucun réseau.

const connecte: Executer = () => ({ code: 0, sortie: '{"loggedIn":true}', erreur: '' })
const ENV = { PATH: '/bin' }

const OUTILS: Anthropic.Tool[] = [
  {
    name: 'requete',
    description: 'Une requête SQL en lecture.',
    input_schema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] },
  },
  { name: 'repondre', description: 'La réponse.', input_schema: { type: 'object' } },
]

const appel: AppelModele = {
  systeme: 'Le système du moteur.',
  messages: [
    { role: 'user', content: 'Combien de tickets ouverts ?' },
    {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_1', name: 'requete', input: { sql: 'SELECT 1' } }],
    },
    {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '1', is_error: true }],
    },
  ],
  outils: OUTILS,
  effort: 'medium',
  maxTokens: 20000,
  unSeulOutil: true,
}

interface Recu {
  binaire: string
  args: string[]
  entree: string
  env: Record<string, string | undefined>
}

/** Un faux lancement : il garde ce qu'il reçoit et rend `sortie` en JSON. */
function lanceur(sortie: Record<string, unknown>, code = 0): Lancer & { recus: Recu[] } {
  const recus: Recu[] = []
  const lancer = (async (binaire, args, entree, _cwd, _delaiMs, env) => {
    recus.push({ binaire, args, entree, env })
    return { code, sortie: JSON.stringify(sortie), erreur: '', delai: false }
  }) as Lancer & { recus: Recu[] }
  lancer.recus = recus
  return lancer
}

const resultat = (structured_output: unknown) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  structured_output,
  total_cost_usd: 0.01,
  num_turns: 2,
  usage: {
    input_tokens: 5,
    output_tokens: 120,
    cache_creation_input_tokens: 1000,
    cache_read_input_tokens: 300,
  },
})

describe('modeleAbonnement', () => {
  it('envoie la conversation en texte, le schéma des outils, le plafond ; rend un tool_use', async () => {
    const lancer = lanceur(
      resultat({ texte: '', appels: [{ outil: 'repondre', entree: { texte: 'trois' } }] }),
    )
    const m = modeleAbonnement('claude-sonnet-5-5', 'claude', 60_000, ENV, lancer, connecte)
    const r = await m.appeler(appel)

    const recu = lancer.recus[0]
    expect(recu?.binaire).toBe('claude')
    expect(recu?.args[recu.args.indexOf('--model') + 1]).toBe('claude-sonnet-5-5')
    expect(recu?.args[recu.args.indexOf('--effort') + 1]).toBe('medium')
    expect(recu?.args[recu.args.indexOf('--tools') + 1]).toBe('')
    const systeme = recu?.args[recu.args.indexOf('--system-prompt') + 1] ?? ''
    expect(systeme.startsWith('Le système du moteur.')).toBe(true)
    expect(systeme).toContain('- requete : Une requête SQL en lecture.')
    expect(systeme).toContain('(un au plus)')
    const schema = JSON.parse(recu?.args[recu.args.indexOf('--json-schema') + 1] ?? '{}')
    expect(schema.properties.appels.maxItems).toBe(1)
    expect(
      schema.properties.appels.items.anyOf.map(
        (b: { properties: { outil: { const: string } } }) => b.properties.outil.const,
      ),
    ).toEqual(['requete', 'repondre'])
    expect(schema.properties.appels.items.anyOf[0].properties.entree).toEqual(
      OUTILS[0]?.input_schema,
    )
    expect(recu?.entree).toBe(
      [
        '<tour role="user">\nCombien de tickets ouverts ?\n</tour>',
        '<tour role="assistant">\n<appel id="toolu_1" outil="requete">{"sql":"SELECT 1"}</appel>\n</tour>',
        '<tour role="user">\n<resultat id="toolu_1" erreur="oui">\n1\n</resultat>\n</tour>',
      ].join('\n\n'),
    )
    expect(recu?.env[VARIABLE_TOKENS_SORTIE]).toBe('20000')

    expect(r.message.stop_reason).toBe('tool_use')
    expect(r.message.content).toHaveLength(1)
    expect(r.message.content[0]).toMatchObject({
      type: 'tool_use',
      name: 'repondre',
      input: { texte: 'trois' },
    })
    expect(r.usage).toEqual({ entree: 5, sortie: 120, cacheEcrit: 1000, cacheLu: 300 })
  })

  it('du texte sans appel : end_turn ; des identifiants d’appel distincts d’un appel à l’autre', async () => {
    const texte = await modeleAbonnement(
      'm',
      'claude',
      60_000,
      ENV,
      lanceur(resultat({ texte: 'Je réfléchis.', appels: [] })),
      connecte,
    ).appeler(appel)
    expect(texte.message.stop_reason).toBe('end_turn')
    expect(texte.message.content).toEqual([
      { type: 'text', text: 'Je réfléchis.', citations: null },
    ])
    const lancer = lanceur(resultat({ texte: '', appels: [{ outil: 'requete', entree: {} }] }))
    const m = modeleAbonnement('m', 'claude', 60_000, ENV, lancer, connecte)
    const a = (await m.appeler(appel)).message.content[0] as Anthropic.ToolUseBlock
    const b = (await m.appeler(appel)).message.content[0] as Anthropic.ToolUseBlock
    expect(a.id).not.toBe(b.id)
  })

  it('un échec du binaire, un tour illisible, des tokens non rendus : une erreur qui le dit', async () => {
    const avec = (sortie: Record<string, unknown>, code = 0) =>
      modeleAbonnement('m', 'claude', 60_000, ENV, lanceur(sortie, code), connecte).appeler(appel)
    await expect(avec(resultat({ texte: '', appels: [] }), 1)).rejects.toThrow(
      'abonnement (claude) : code de sortie 1',
    )
    await expect(avec(resultat({ appels: [] }))).rejects.toThrow('tour illisible')
    await expect(
      avec({ ...resultat({ texte: '', appels: [] }), usage: undefined }),
    ).rejects.toThrow('tokens non rendus')
  })

  it('ANTHROPIC_API_KEY dans l’environnement : refus avant tout lancement', async () => {
    const lancer = lanceur(resultat({ texte: '', appels: [] }))
    const m = modeleAbonnement(
      'm',
      'claude',
      60_000,
      { ...ENV, ANTHROPIC_API_KEY: 'x' },
      lancer,
      connecte,
    )
    await expect(m.appeler(appel)).rejects.toThrow('ANTHROPIC_API_KEY est dans l')
    expect(lancer.recus).toHaveLength(0)
  })
})
