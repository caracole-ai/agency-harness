import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import type { Executer } from '../agence/config'
import type { Lancer } from '../chantier/claude'
import { actionsRetenues, modeleAbonnement, VARIABLE_TOKENS_SORTIE } from './abonnement'
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

/** Un événement `assistant` du flux, avec un appel d'outil tenté directement. */
const tente = (name: string, input: unknown) => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id: 'x', name, input }] },
})

/**
 * Un faux lancement : il garde ce qu'il reçoit et rend le flux du binaire,
 * les événements `avant` puis `sortie` (l'événement `result`), une ligne chacun.
 */
function lanceur(
  sortie: Record<string, unknown>,
  code = 0,
  avant: unknown[] = [],
): Lancer & { recus: Recu[] } {
  const recus: Recu[] = []
  const lancer = (async (binaire, args, entree, _cwd, _delaiMs, env) => {
    recus.push({ binaire, args, entree, env })
    const flux = [...avant, sortie].map((e) => JSON.stringify(e)).join('\n')
    return { code, sortie: flux, erreur: '', delai: false }
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
      resultat({ texte: '', actions: [{ action: 'repondre', parametres: { texte: 'trois' } }] }),
    )
    const m = modeleAbonnement('claude-sonnet-5-5', 'claude', 60_000, ENV, lancer, connecte)
    const r = await m.appeler(appel)

    const recu = lancer.recus[0]
    expect(recu?.binaire).toBe('claude')
    expect(recu?.args[recu.args.indexOf('--model') + 1]).toBe('claude-sonnet-5-5')
    expect(recu?.args[recu.args.indexOf('--effort') + 1]).toBe('medium')
    expect(recu?.args[recu.args.indexOf('--tools') + 1]).toBe('')
    expect(recu?.args[recu.args.indexOf('--output-format') + 1]).toBe('stream-json')
    const systeme = recu?.args[recu.args.indexOf('--system-prompt') + 1] ?? ''
    expect(systeme.startsWith('Le système du moteur.')).toBe(true)
    expect(systeme).toContain('- requete : Une requête SQL en lecture.')
    expect(systeme).toContain('(une au plus)')
    expect(systeme).not.toContain('Tes outils')
    const schema = JSON.parse(recu?.args[recu.args.indexOf('--json-schema') + 1] ?? '{}')
    expect(schema.properties.actions.maxItems).toBe(1)
    expect(
      schema.properties.actions.items.anyOf.map(
        (b: { properties: { action: { const: string } } }) => b.properties.action.const,
      ),
    ).toEqual(['requete', 'repondre'])
    expect(schema.properties.actions.items.anyOf[0].properties.parametres).toEqual(
      OUTILS[0]?.input_schema,
    )
    expect(recu?.entree).toBe(
      [
        '<tour role="user">\nCombien de tickets ouverts ?\n</tour>',
        '<tour role="assistant">\n<action id="toolu_1" nom="requete">{"sql":"SELECT 1"}</action>\n</tour>',
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
      lanceur(resultat({ texte: 'Je réfléchis.', actions: [] })),
      connecte,
    ).appeler(appel)
    expect(texte.message.stop_reason).toBe('end_turn')
    expect(texte.message.content).toEqual([
      { type: 'text', text: 'Je réfléchis.', citations: null },
    ])
    const lancer = lanceur(
      resultat({ texte: '', actions: [{ action: 'requete', parametres: {} }] }),
    )
    const m = modeleAbonnement('m', 'claude', 60_000, ENV, lancer, connecte)
    const a = (await m.appeler(appel)).message.content[0] as Anthropic.ToolUseBlock
    const b = (await m.appeler(appel)).message.content[0] as Anthropic.ToolUseBlock
    expect(a.id).not.toBe(b.id)
  })

  it('un échec du binaire, un tour illisible, des tokens non rendus : une erreur qui le dit', async () => {
    const avec = (sortie: Record<string, unknown>, code = 0) =>
      modeleAbonnement('m', 'claude', 60_000, ENV, lanceur(sortie, code), connecte).appeler(appel)
    await expect(avec(resultat({ texte: '', actions: [] }), 1)).rejects.toThrow(
      'abonnement (claude) : code de sortie 1',
    )
    await expect(avec(resultat({ actions: [] }))).rejects.toThrow('tour illisible')
    await expect(
      avec({ ...resultat({ texte: '', actions: [] }), usage: undefined }),
    ).rejects.toThrow('tokens non rendus')
  })

  it('ANTHROPIC_API_KEY dans l’environnement : refus avant tout lancement', async () => {
    const lancer = lanceur(resultat({ texte: '', actions: [] }))
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

  it('une action tentée directement, puis un abandon après l’erreur du binaire : la tentative est le tour', async () => {
    const lancer = lanceur(
      resultat({
        texte: '',
        actions: [{ action: 'repondre', parametres: { texte: 'outil en panne' } }],
      }),
      0,
      [tente('requete', { sql: 'SELECT 2' })],
    )
    const r = await modeleAbonnement('m', 'claude', 60_000, ENV, lancer, connecte).appeler(appel)
    expect(r.message.content).toHaveLength(1)
    expect(r.message.content[0]).toMatchObject({
      type: 'tool_use',
      name: 'requete',
      input: { sql: 'SELECT 2' },
    })
  })
})

describe('actionsRetenues', () => {
  const structuree = [{ action: 'requete', parametres: { sql: 'SELECT 3' } }]
  it('sans tentative, ou une tentative que la sortie structurée reprend : la sortie structurée', () => {
    expect(actionsRetenues(structuree, [], OUTILS)).toBe(structuree)
    expect(
      actionsRetenues(structuree, [{ nom: 'requete', entree: { sql: 'SELECT 9' } }], OUTILS),
    ).toBe(structuree)
  })
  it('l’outil du binaire, une action inconnue, une entrée qui n’est pas un objet : pas des tentatives', () => {
    const vide: { action: string; parametres: unknown }[] = []
    expect(
      actionsRetenues(
        vide,
        [
          { nom: 'StructuredOutput', entree: {} },
          { nom: 'Bash', entree: { command: 'ls' } },
          { nom: 'requete', entree: '{"sql":"x"}' },
        ],
        OUTILS,
      ),
    ).toBe(vide)
  })
  it('la sortie structurée a changé d’action après l’erreur : la première tentative connue', () => {
    expect(
      actionsRetenues(
        [{ action: 'repondre', parametres: {} }],
        [
          { nom: 'requete', entree: { sql: 'SELECT 1' } },
          { nom: 'requete', entree: { sql: 'SELECT 2' } },
        ],
        OUTILS,
      ),
    ).toEqual([{ action: 'requete', parametres: { sql: 'SELECT 1' } }])
  })
})
