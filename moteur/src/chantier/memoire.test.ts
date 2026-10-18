import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLIENTS_FICTIFS, personnesFictives, RACINE_DEPOT } from '../agence/fictif'
import {
  ajouterConvention,
  ajouterIndex,
  chantiersCitant,
  cheminEntree,
  DOSSIER_MEMOIRE,
  ecrireChantier,
  ecrireRetrait,
  interdits,
  lireIndex,
  missionFusionnee,
  missionsRetirees,
  nettoyer,
  resoudreCle,
} from './memoire'

// PLAN-RONDE.md R10 : la mémoire des chantiers, écrite par le code, sans nom ni
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
        cle: 'essai/simuler_absence',
        titre: 'Simuler une absence',
        sections: [{ titre: 'Mission', texte: 'simuler_absence, intention du catalogue' }],
        appris,
        sorte: 'refus',
        issue: 'pnpm check rouge',
      },
      personnes,
    )
    // L'entrée vit sous le métier de la mission (décidé le 2026-10-18).
    expect(chemin).toBe(join(r, 'memoire', 'chantiers', 'essai', '2026-10-13-simuler_absence.md'))
    expect(cheminEntree('2026-10-13', 'essai/simuler_absence')).toBe(
      join('memoire', 'chantiers', 'essai', '2026-10-13-simuler_absence.md'),
    )
    const contenu = readFileSync(chemin, 'utf8')
    expect(contenu).toContain('texte retiré')
    expect(contenu).toContain('leçon 19')
    expect(contenu).not.toContain('leçon 20')
    expect(chantiersCitant(r, ['simuler_absence'], 'essai')).toHaveLength(1)
    expect(chantiersCitant(r, ['autre'], 'essai')).toHaveLength(0)
    // Un autre métier ne relit pas les chantiers de celui-ci.
    expect(chantiersCitant(r, ['simuler_absence'], 'autre')).toHaveLength(0)
  })

  it('une clé se résout : entière telle quelle ; un identifiant seul par les fusions de l’index, jamais deviné entre deux métiers', () => {
    const r = racine()
    const fusion = (cle: string) =>
      ajouterIndex(
        r,
        { date: '2026-10-13', client: CLIENT, sorte: 'fusion', cle, titre: 't', issue: 'fusionné' },
        personnes,
      )
    expect(resoudreCle(r, 'essai/simuler_absence')).toBe('essai/simuler_absence')
    expect(() => resoudreCle(r, 'simuler_absence')).toThrow(/aucune fusion/)
    fusion('essai/simuler_absence')
    expect(resoudreCle(r, 'simuler_absence')).toBe('essai/simuler_absence')
    fusion('autre/simuler_absence')
    expect(() => resoudreCle(r, 'simuler_absence')).toThrow(/plusieurs métiers/)
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
          cle: 'essai/m',
          titre: 'Rosalie',
          issue: 'x',
        },
        personnes,
      ),
    ).toThrow(/rien n'est écrit/)
    expect(lireIndex(r)).toEqual([])
    expect(() => ajouterConvention(r, 'demander à Octave', personnes)).toThrow(/rien n'est écrit/)
  })

  it('un retrait se lit : la mission n’est jamais refaite', () => {
    const r = racine()
    ajouterIndex(
      r,
      {
        date: '2026-10-14',
        client: CLIENT,
        sorte: 'retrait',
        cle: 'essai/heures_cumulees',
        titre: 'retirée',
        issue: 'motif : doublon',
      },
      personnes,
    )
    expect(missionsRetirees(r)).toEqual([
      { cle: 'essai/heures_cumulees', metier: 'essai', id: 'heures_cumulees', intentions: [] },
    ])
  })

  it('une fusion se relit pour son retrait : client, titre, intentions de son entrée ; sans fusion, rien', () => {
    const r = racine()
    const entree = (sorte: 'fusion' | 'refus', date: string, intentions: string) =>
      ecrireChantier(
        r,
        {
          date,
          client: 'client-essai',
          cle: 'essai/simuler_absence',
          titre: 'Simuler une absence',
          sections: [
            {
              titre: 'La mission',
              texte: `- identifiant : \`simuler_absence\` ; sorte : geste_code\n- intentions : ${intentions}\n- consignes-types :\n  - « - intentions : \`piege\` »`,
            },
          ],
          appris: '',
          sorte,
          issue: sorte === 'fusion' ? 'fusionné' : 'refusé',
        },
        personnes,
      )
    expect(missionFusionnee(r, 'essai/simuler_absence')).toBeUndefined()
    entree('refus', '2026-10-12', '`simuler_absence`')
    expect(missionFusionnee(r, 'essai/simuler_absence')).toBeUndefined()
    entree('fusion', '2026-10-13', '`simuler_absence`, `absence_longue`')
    expect(missionFusionnee(r, 'essai/simuler_absence')).toEqual({
      date: '2026-10-13',
      client: 'client-essai',
      titre: 'Simuler une absence',
      intentions: ['simuler_absence', 'absence_longue'],
    })
    expect(missionFusionnee(r, 'essai/autre')).toBeUndefined()
    // Le même identifiant sous un autre métier n'est pas cette fusion.
    expect(missionFusionnee(r, 'autre/simuler_absence')).toBeUndefined()
  })

  it('un retrait garde ses intentions : le même travail sous un autre nom n’est pas refait', () => {
    const r = racine()
    ecrireRetrait(
      r,
      {
        date: '2026-10-14',
        client: CLIENT,
        cle: 'essai/etat_des_cartes',
        titre: 'Les cartes ; en un geste',
        intentions: ['agents_sans_carte', 'cartes_expirees'],
        motif: 'doublon de voir_echeances',
      },
      personnes,
    )
    expect(missionsRetirees(r)).toEqual([
      {
        cle: 'essai/etat_des_cartes',
        metier: 'essai',
        id: 'etat_des_cartes',
        intentions: ['agents_sans_carte', 'cartes_expirees'],
      },
    ])
    expect(lireIndex(r)[0]?.issue).toBe('retiré : doublon de voir_echeances')
    expect(() =>
      ecrireRetrait(
        r,
        {
          date: '2026-10-14',
          client: CLIENT,
          cle: 'essai/x',
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

/**
 * Un mot seul tout en minuscules n'est pas un nom : « un petit assistant » ne cite pas
 * « Laura Petit » d'un autre client fictif (la mémoire d'un chantier de l'agence web,
 * nuit du 2026-10-13). L'écriture, elle, retire ces mots pour son propre client.
 */
const nomsCites = (texte: string, fictives: Parameters<typeof interdits>[1]) =>
  interdits(texte, fictives).filter((t) => !/^[\p{Ll}\p{M}]+$/u.test(t))

describe('memoire/ du dépôt', () => {
  /** Tous les fichiers sous `memoire/`. */
  function fichiers(d: string): string[] {
    return readdirSync(d).flatMap((f) => {
      const c = join(d, f)
      return statSync(c).isDirectory() ? fichiers(c) : [c]
    })
  }

  it.each(CLIENTS_FICTIFS)(
    'ne porte aucun nom ni identifiant des personnes du client fictif %s (R10)',
    async (client) => {
      const fictives = await personnesFictives(client)
      const tous = fichiers(join(RACINE_DEPOT, DOSSIER_MEMOIRE))
      expect(tous.length).toBeGreaterThan(0)
      for (const f of tous) {
        expect({ fichier: f, interdits: nomsCites(readFileSync(f, 'utf8'), fictives) }).toEqual({
          fichier: f,
          interdits: [],
        })
      }
    },
  )

  it('un mot courant en minuscules n’est pas un nom ; le nom, en majuscule ou entier, l’est', () => {
    const laura = [{ id: 'A-13', nom: 'Laura Petit', sorte: 'personne' as const }]
    expect(nomsCites('estimation : petite ; un petit assistant', laura)).toEqual([])
    expect(nomsCites('vu par Petit', laura)).toEqual(['Petit'])
    expect(nomsCites('vu par laura petit', laura)).toEqual(['laura petit'])
    expect(nomsCites('vu par A-13', laura)).toEqual(['A-13'])
  })
})
