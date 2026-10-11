import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PERSONNES_ESSAI } from '../ronde/essai'
import { commandeSync } from './arbre'
import { creerDepots, gesteVert, TEST_ESSAI } from './essai'
import { casParGesteNouveau, garderDiff, motifChemin } from './garde'

// PLAN-RONDE.md § 6.2 (garderDiff) et PLAN-GENERAL.md G1, conditions 1, 2, 4
// et 7 : sur un vrai dépôt git, une branche qui touche ce qu'elle ne doit pas.

const CONFIG = {
  chemins_autorises: [
    'metiers/*/code/src/**',
    'evals/consignes.yaml',
    'evals/gestes.yaml',
    'metiers/*/fiche.md',
    'memoire/**',
  ],
  lignes_max: 600,
}

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout
}

/** Une branche du clone qui écrit et supprime ces fichiers, commise ; rend sa garde. */
function branche(ecrire: Record<string, string>, supprimer: string[] = [], lignesMax = 600) {
  const { depot } = creerDepots()
  git(depot, 'checkout', '-q', '-b', 'chantier/essai')
  for (const [chemin, contenu] of Object.entries(ecrire)) {
    mkdirSync(dirname(join(depot, chemin)), { recursive: true })
    writeFileSync(join(depot, chemin), contenu)
  }
  for (const chemin of supprimer) rmSync(join(depot, chemin))
  git(depot, 'add', '-A')
  git(depot, 'commit', '-q', '--allow-empty', '-m', 'essai')
  return {
    garde: garderDiff(commandeSync, depot, { ...CONFIG, lignes_max: lignesMax }, PERSONNES_ESSAI),
    depot,
  }
}

describe('motifChemin', () => {
  it('** traverse les dossiers, * non', () => {
    expect(
      motifChemin('metiers/*/code/src/**').test('metiers/securite-privee/code/src/a/b.ts'),
    ).toBe(true)
    expect(motifChemin('metiers/*/code/src/**').test('metiers/a/b/code/src/x.ts')).toBe(false)
    expect(motifChemin('metiers/*/fiche.md').test('metiers/securite-privee/regles.yaml')).toBe(
      false,
    )
    expect(motifChemin('evals/consignes.yaml').test('evals/consignesXyaml')).toBe(false)
  })
})

describe('garderDiff', () => {
  it('un geste, ses cas et son test : tout vert', () => {
    const { garde } = branche(gesteVert())
    expect(garde.chemins).toEqual({ ok: true, horsBande: [], memoire: [] })
    expect(garde.tests).toEqual({ ok: true, disparus: [] })
    expect(garde.lignes.ok).toBe(true)
    expect(garde.testsTouches).toEqual(['metiers/essai/code/src/simulation.test.ts'])
  })

  it('aucun changement : la condition 1 n’est pas verte', () => {
    expect(branche({}).garde.chemins.ok).toBe(false)
  })

  it('le moteur, un regles.yaml : hors de la bande', () => {
    const { garde } = branche({
      'moteur/src/moteur.ts': 'x\n',
      'metiers/essai/regles.yaml': 'x\n',
    })
    expect(garde.chemins.horsBande).toEqual(['metiers/essai/regles.yaml', 'moteur/src/moteur.ts'])
    expect(garde.chemins.ok).toBe(false)
  })

  it('la mémoire : une convention ajoutée passe ; retirée, nommée, ou un autre fichier, non', () => {
    expect(
      branche({ 'memoire/CONVENTIONS.md': '# conventions\n- un geste, trois cas\n' }).garde.chemins
        .ok,
    ).toBe(true)
    expect(branche({ 'memoire/CONVENTIONS.md': '' }).garde.chemins.memoire[0]).toMatch(
      /ne se retire jamais/,
    )
    expect(
      branche({ 'memoire/CONVENTIONS.md': '# conventions\n- demander à Rosalie\n' }).garde.chemins
        .memoire[0],
    ).toMatch(/nom ou un identifiant/)
    expect(branche({ 'memoire/INDEX.md': '# index\n- x\n' }).garde.chemins.memoire[0]).toMatch(
      /écrit par le code/,
    )
  })

  it('un test supprimé, un test de moins, un .skip de plus : tests disparus', () => {
    const chemin = 'metiers/essai/code/src/actions.test.ts'
    expect(branche({}, [chemin]).garde.tests.disparus).toEqual([`${chemin} : supprimé`])
    expect(
      branche({ [chemin]: TEST_ESSAI.replace("it('deux', () => {})\n", '') }).garde.tests
        .disparus[0],
    ).toMatch(/2 tests avant, 1 après/)
    expect(
      branche({
        [chemin]: TEST_ESSAI.replace("it('deux'", "it.skip('deux'"),
      }).garde.tests.disparus.join(),
    ).toMatch(/\.skip/)
  })

  it('au-delà de lignes_max : la condition 7 est rouge', () => {
    const { garde } = branche(gesteVert(), [], 4)
    expect(garde.lignes).toMatchObject({ ok: false, max: 4 })
    expect(garde.lignes.total).toBeGreaterThan(4)
  })
})

describe('casParGesteNouveau', () => {
  it('les actions attendues qui ne l’étaient pas sur main, et leurs cas', () => {
    const { depot } = branche(gesteVert())
    expect(casParGesteNouveau(commandeSync, depot)).toEqual([
      { geste: 'simuler_absence_code', cas: 3 },
    ])
  })
})
