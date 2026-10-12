import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { personnesFictives, RACINE_DEPOT } from '../agence/fictif'
import { Temporal } from '../temps/temporal'
import {
  ajouterConvention,
  ajouterIndex,
  ajouterMesure,
  chantiersCitant,
  DOSSIER_MEMOIRE,
  ecrireChantier,
  ecrireRetrait,
  ecrireRonde,
  interdits,
  lireIndex,
  missionsRetirees,
  nettoyer,
  pourRonde,
  slugClient,
} from './memoire'

// PLAN-RONDE.md R10 : la mémoire de la nuit, écrite par le code, sans nom ni
// identifiant ; et le test de fuite sur tout `memoire/` du dépôt.

const personnes = [
  { id: 'A-1', nom: 'Rosalie Vernet', sorte: 'personne' as const },
  { id: 'A-11', nom: 'Octave Brunel', sorte: 'personne' as const },
]
const racine = () => mkdtempSync(join(tmpdir(), 'memoire-'))
const CLIENT = 'client essai (sécurité)'

describe('interdits et nettoyer', () => {
  it('trouve un nom, un identifiant de personne, de conversation ou d’échappée', () => {
    expect(interdits('Rosalie a fini', personnes)).toEqual(['Rosalie'])
    expect(interdits('voir A-11 demain', personnes)).toEqual(['A-11'])
    expect(interdits('voir A-111 demain', personnes)).toEqual([])
    expect(interdits('E-20261012T0900-3fa2 et C-20261012T0900-00ff', personnes)).toHaveLength(2)
    expect(interdits('un geste pour <agent>', personnes)).toEqual([])
  })

  it('nettoyer retire un texte fautif, garde un texte propre', () => {
    expect(nettoyer('les heures de\n<agent>', personnes)).toBe('les heures de <agent>')
    expect(nettoyer('les heures de A-1', personnes)).toMatch(/retiré/)
  })
})

describe('écrire et relire la mémoire', () => {
  it('une ronde : son fichier sans nom de client dans ce que la ronde relit, sa ligne d’index', () => {
    const r = racine()
    const chemin = ecrireRonde(
      r,
      {
        date: '2026-10-12',
        client: CLIENT,
        missions: [
          {
            id: 'heures_cumulees',
            sorte: 'intention_nouvelle',
            titre: 'Les heures cumulées par <agent>',
            intentions: ['heures_par_agent'],
            statut: 'promotion en cours',
            raison: 'au seuil de promotion',
          },
          {
            id: 'x',
            sorte: 'geste_code',
            titre: 'Pour A-1 seulement',
            intentions: [],
            statut: 'écartée',
          },
        ],
        issue: 'faite',
        cout: { usd: 0.1234, estime: true },
      },
      personnes,
    )
    const contenu = readFileSync(chemin, 'utf8')
    expect(chemin).toContain(`2026-10-12-${slugClient(CLIENT)}.md`)
    expect(contenu).toContain('texte retiré')
    expect(contenu).not.toContain('A-1')
    const index = lireIndex(r)
    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({ sorte: 'ronde', id: '2026-10-12', issue: 'faite' })
    expect(readFileSync(join(r, DOSSIER_MEMOIRE, 'INDEX.md'), 'utf8')).toContain(
      '0,12 $ (estimé par le binaire)',
    )

    const lu = pourRonde(r, CLIENT, Temporal.PlainDate.from('2026-10-13'), {
      index_lignes: 60,
      rondes_jours: 7,
    })
    expect(lu.rondes).toHaveLength(1)
    expect(lu.index).toHaveLength(1)
    // Le jour même : ni la ronde ni sa ligne d'index (une ronde refaite ne se relit pas).
    expect(
      pourRonde(r, CLIENT, Temporal.PlainDate.from('2026-10-12'), {
        index_lignes: 60,
        rondes_jours: 7,
      }).index,
    ).toHaveLength(0)
    expect(lu.rondes[0]).not.toContain('client essai')
    expect(lu.index[0]).not.toContain('client essai')
    // Le jour même et au-delà de la fenêtre : pas relue.
    expect(
      pourRonde(r, CLIENT, Temporal.PlainDate.from('2026-10-12'), {
        index_lignes: 60,
        rondes_jours: 7,
      }).rondes,
    ).toHaveLength(0)
    expect(
      pourRonde(r, CLIENT, Temporal.PlainDate.from('2026-10-30'), {
        index_lignes: 60,
        rondes_jours: 7,
      }).rondes,
    ).toHaveLength(0)
    // Un autre client ne voit pas cette ligne.
    expect(
      pourRonde(r, 'autre', Temporal.PlainDate.from('2026-10-13'), {
        index_lignes: 60,
        rondes_jours: 7,
      }).index,
    ).toHaveLength(0)
  })

  it('un chantier : sections, appris borné et nettoyé, ligne d’index', () => {
    const r = racine()
    const appris = Array.from({ length: 30 }, (_, i) =>
      i === 0 ? 'vu A-11 hier' : `leçon ${i}`,
    ).join('\n')
    const chemin = ecrireChantier(
      r,
      {
        date: '2026-10-13',
        client: CLIENT,
        id: 'simuler_absence',
        titre: 'Simuler une absence',
        sections: [{ titre: 'Mission', texte: 'simuler_absence, intention du catalogue' }],
        appris,
        sorte: 'refus',
        issue: 'pnpm check rouge',
      },
      personnes,
    )
    const contenu = readFileSync(chemin, 'utf8')
    expect(contenu).toContain('texte retiré')
    expect(contenu).toContain('leçon 19')
    expect(contenu).not.toContain('leçon 20')
    expect(chantiersCitant(r, ['simuler_absence'])).toHaveLength(1)
    expect(chantiersCitant(r, ['autre'])).toHaveLength(0)
  })

  it('une écriture qui porterait un nom lève, rien n’est écrit', () => {
    const r = racine()
    expect(() =>
      ajouterIndex(
        r,
        {
          date: '2026-10-12',
          client: CLIENT,
          sorte: 'retrait',
          id: 'm',
          titre: 'Rosalie',
          issue: 'x',
        },
        personnes,
      ),
    ).toThrow(/rien n'est écrit/)
    expect(lireIndex(r)).toEqual([])
    expect(() => ajouterConvention(r, 'demander à Octave', personnes)).toThrow(/rien n'est écrit/)
    expect(() =>
      ajouterMesure(r, '2026-10-12', CLIENT, { echappee: 'E-20261012T0900-3fa2' }, personnes),
    ).toThrow()
  })

  it('un retrait se lit : la ronde ne repropose pas la mission', () => {
    const r = racine()
    ajouterIndex(
      r,
      {
        date: '2026-10-14',
        client: CLIENT,
        sorte: 'retrait',
        id: 'heures_cumulees',
        titre: 'retirée',
        issue: 'motif : doublon',
      },
      personnes,
    )
    expect(missionsRetirees(r)).toEqual([{ id: 'heures_cumulees', intentions: [] }])
  })

  it('un retrait garde ses intentions : la ronde ne repropose pas le même travail sous un autre nom', () => {
    const r = racine()
    ecrireRetrait(
      r,
      {
        date: '2026-10-14',
        client: CLIENT,
        id: 'etat_des_cartes',
        titre: 'Les cartes ; en un geste',
        intentions: ['agents_sans_carte', 'cartes_expirees'],
        motif: 'doublon de voir_echeances',
      },
      personnes,
    )
    expect(missionsRetirees(r)).toEqual([
      { id: 'etat_des_cartes', intentions: ['agents_sans_carte', 'cartes_expirees'] },
    ])
    expect(lireIndex(r)[0]?.issue).toBe('retiré : doublon de voir_echeances')
    expect(() =>
      ecrireRetrait(
        r,
        {
          date: '2026-10-14',
          client: CLIENT,
          id: 'x',
          titre: 't',
          intentions: [],
          motif: 'Octave',
        },
        personnes,
      ),
    ).not.toThrow()
    expect(readFileSync(join(r, DOSSIER_MEMOIRE, 'INDEX.md'), 'utf8')).not.toContain('Octave')
  })
})

describe('memoire/ du dépôt', () => {
  /** Tous les fichiers sous `memoire/`. */
  function fichiers(d: string): string[] {
    return readdirSync(d).flatMap((f) => {
      const c = join(d, f)
      return statSync(c).isDirectory() ? fichiers(c) : [c]
    })
  }

  it('ne porte aucun nom ni identifiant des personnes du client fictif (R10)', () => {
    const fictives = personnesFictives()
    const tous = fichiers(join(RACINE_DEPOT, DOSSIER_MEMOIRE))
    expect(tous.length).toBeGreaterThan(0)
    for (const f of tous) {
      expect({ fichier: f, interdits: interdits(readFileSync(f, 'utf8'), fictives) }).toEqual({
        fichier: f,
        interdits: [],
      })
    }
  })
})
