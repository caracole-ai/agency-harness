import { describe, expect, it } from 'vitest'
import { Interdit, type Registre } from '../regles/schema'
import { Temporal } from '../temps/temporal'
import { type EntreeRapport, PARTIES, rendreRapport } from './rapport'

// PLAN-METIER-2.md § 3.5, M7 : la phrase d'une partie « À corriger » vide
// vient du domaine du métier, plus du moteur.

const regle = Interdit.parse({
  id: 'I-01',
  nom: 'un écart',
  interdit: 'x',
  etapes: ['1'],
  consequence: 'x',
  verifiable_par: 'code',
  statut: 'texte',
  relu: '2026-10-06',
  source: 'R',
})
const registre: Registre = { interdits: [regle], escalades: [], scenarios: [] }
const entree = (e: Partial<EntreeRapport> = {}): EntreeRapport => ({
  client: 'client essai',
  aujourdhui: Temporal.PlainDate.from('2026-10-12'),
  registre,
  lu: '3 projets',
  constats: [],
  alertes: [],
  perimetre: [{ regle: 'I-01' }],
  decrire: (objet) => objet,
  rienASignaler: 'Aucun projet contraire à une règle.',
  ...e,
})

describe('rendreRapport', () => {
  it('sans refus, la partie « À corriger » dit `rienASignaler` du métier', () => {
    const rapport = rendreRapport(entree())
    expect(rapport).toContain(`## ${PARTIES.refus} (0)\n\nAucun projet contraire à une règle.\n`)
    expect(rapport).not.toContain('vacation')
  })
  // PLAN-METIER-2.md M12 : les sections du métier
  it('sans section, le rapport est le même octet pour octet', () => {
    const sans = rendreRapport(entree())
    expect(rendreRapport(entree({ sections: [] }))).toBe(sans)
    expect(sans).toBe(
      [
        '# Veille du 12/10/2026 — client essai',
        '',
        'Lu : 3 projets. Vérifié : un écart.',
        '',
        '## À corriger (0)',
        '',
        'Aucun projet contraire à une règle.',
        '',
        "## À décider par l'exploitation (0)",
        '',
        'Rien à décider.',
        '',
        '## Conforme, à noter (0)',
        '',
        'Rien à noter.',
        '',
        '## Échéances à traiter maintenant (0)',
        '',
        'Aucune.',
        '',
        '## Échéances à préparer (0)',
        '',
        'Aucune.',
        '',
        '## Sources',
        '',
        '—',
        '',
      ].join('\n'),
    )
  })
  it('deux sections arrivent après « Sources », dans l’ordre donné', () => {
    const rapport = rendreRapport(
      entree({
        sections: [
          { titre: 'Écarts', lignes: ['- PRJ-12 : 27 j consommés sur 18 vendus (150 %)'] },
          { titre: 'Seconde', lignes: [] },
        ],
      }),
    )
    expect(
      rapport.endsWith(
        `## ${PARTIES.sources}\n\n—\n\n## Écarts\n\n- PRJ-12 : 27 j consommés sur 18 vendus (150 %)\n\n## Seconde\n\n—\n`,
      ),
    ).toBe(true)
    expect(rapport.startsWith(rendreRapport(entree()))).toBe(true)
  })
  it('avec un refus, la phrase n’apparaît pas', () => {
    const rapport = rendreRapport(
      entree({ constats: [{ regle: 'I-01', objet: 'PRJ-01', verdict: 'refus', motif: 'm' }] }),
    )
    expect(rapport).toContain(`## ${PARTIES.refus} (1)`)
    expect(rapport).not.toContain('Aucun projet contraire à une règle.')
  })
})
