import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RACINE_DEPOT } from '../agence/fictif'
import { METIER_ESSAI, PERSONNES_ESSAI } from '../ronde/essai.test.fixture'
import { FUSEAU, Temporal } from '../temps/temporal'
import { commandeSync } from './arbre'
import { faireChantier, type OptionsChantier, TYPE_CHANTIER } from './chantier'
import {
  agenceEssai,
  binaireSimule,
  clientAvecMission,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  EVALS_AU_SEUIL,
  gesteVert,
  MISSION_ESSAI,
  type PnpmSimule,
  type Scenario,
} from './essai.test.fixture'
import {
  type Condition,
  conclure,
  type IdCondition,
  publierMemoire,
  refEtiquette,
  retirerFusion,
} from './fusion'
import { ecrireRetrait, lireIndex, missionsRetirees } from './memoire'
import type { Mission } from './mission'

// PLAN-RONDE.md § 6.4 et PLAN-GENERAL.md G1, G2, G3, en simulé : le binaire
// `claude` est un script qui écrit un diff connu et rend un JSON ; `pnpm` est
// simulé ; git tourne pour de vrai, sur trois dépôts jetables. Une fusion
// sous huit conditions vertes ; un refus pour chaque condition rouge ; un
// retrait qui défait ; aucun merge ni push hors de `fusion.ts` ; `fusion.ts`
// refuse hors du clone de la nuit.

const MAINTENANT = Temporal.ZonedDateTime.from(`2026-10-11T03:00[${FUSEAU}]`)
const PLAN_VERT: Scenario['plan'] = {
  faisable: true,
  raison: 'un geste dans la bande métier',
  plan: '- metiers/essai/code/src/simulation.ts\n- trois cas',
}

const git = (cwd: string, ...args: string[]) =>
  spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim()

interface Essai {
  scenario?: Scenario
  pnpm?: PnpmSimule
  mission?: Mission
  chantier?: Parameters<typeof agenceEssai>[2]
  options?: Partial<OptionsChantier>
}

/** Un chantier simulé de bout en bout ; rend l'issue, les appels au binaire, les commandes émises, les dépôts. */
async function lancer(e: Essai = {}) {
  const depots = creerDepots()
  const { binaire, appels } = binaireSimule({
    plan: PLAN_VERT,
    implementations: [{ ecrire: gesteVert() }],
    ...e.scenario,
  })
  const { commande, emises } = commandeSimulee(e.pnpm)
  const { dossier, fichier } = clientAvecMission(e.mission)
  const options: OptionsChantier = {
    racine: depots.racine,
    agence: agenceEssai(binaire, depots.depot, e.chantier),
    mission: fichier,
    env: ENV_ESSAI,
    maintenant: MAINTENANT,
    commande,
    ...e.options,
  }
  const issue = await faireChantier(METIER_ESSAI, options)
  return { issue, appels, emises, depots, dossier, fichier, options }
}

const lignesChantier = (dossier: string) => {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return s.journal.lire().filter((l) => l.type === TYPE_CHANTIER)
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

describe('G1 : huit conditions vertes, la fusion', () => {
  it('fusionne --no-ff dans main du clone, pose l’étiquette, pousse, écrit la mémoire à part et le journal', async () => {
    const { issue, appels, depots, dossier } = await lancer()
    expect(issue.sorte).toBe('fait')
    if (issue.sorte !== 'fait') return
    expect(issue.issue).toBe('fusionné')
    expect(issue.conditions.map((k) => [k.id, k.ok])).toEqual([
      ['chemins', true],
      ['tests', true],
      ['check', true],
      ['honnetete', true],
      ['relecture', true],
      ['bornes', true],
      ['lignes', true],
      ['memoire', true],
    ])
    // Plan, implémentation, relecture : trois appels ; le coût additionné.
    expect(appels().map((a) => a.role)).toEqual(['plan', 'implementation', 'relecture'])
    expect(issue.cout).toBeCloseTo(1.5)
    expect(issue.conditions.find((k) => k.id === 'honnetete')?.mesure).toMatch(/en écart : R-2$/)
    // La fusion est une fusion (deux parents), étiquetée, poussée ; la mémoire est le commit d'après.
    const fusion = git(depots.depot, 'rev-parse', `${refEtiquette('simuler_absence')}^{commit}`)
    expect(git(depots.depot, 'rev-list', '--parents', '-n', '1', fusion).split(' ')).toHaveLength(3)
    expect(git(depots.depot, 'log', '-1', '--format=%s', 'main')).toMatch(/^Mémoire : chantier/)
    expect(git(depots.origine, 'rev-parse', 'main')).toBe(git(depots.depot, 'rev-parse', 'main'))
    expect(git(depots.origine, 'rev-parse', refEtiquette('simuler_absence'))).not.toBe('')
    // L'arbre humain n'a pas bougé ; l'arbre de travail est retiré, la branche reste.
    expect(git(depots.racine, 'log', '--oneline').split('\n')).toHaveLength(1)
    expect(existsSync(join(depots.depot, '.claude', 'worktrees', 'chantier-simuler_absence'))).toBe(
      false,
    )
    expect(git(depots.depot, 'branch', '--list', 'chantier/simuler_absence')).toContain('chantier/')
    expect(git(depots.depot, 'status', '--porcelain')).toBe('')
    // La mémoire : l'entrée et sa ligne d'index, sans nom ni identifiant d'échappée.
    const index = lireIndex(depots.depot)
    expect(index.at(-1)).toMatchObject({
      sorte: 'fusion',
      id: 'simuler_absence',
      issue: 'fusionné',
    })
    const entree = readFileSync(
      join(depots.depot, 'memoire', 'chantiers', '2026-10-11-simuler_absence.md'),
      'utf8',
    )
    expect(entree).toContain('un geste nouveau a ses trois cas dès sa naissance')
    expect(entree).not.toMatch(/E-2026/)
    // Le dossier et le journal du client.
    expect(readFileSync(join(dossier, 'chantiers', 'simuler_absence.md'), 'utf8')).toMatch(
      /Issue : \*\*fusionné\*\*/,
    )
    expect(lignesChantier(dossier).map((l) => l.issue)).toEqual(['fusionné'])
  })

  it('ce qui part au modèle : la mission par types, ni échappée ni nom ; le chantier sous les réglages du projet', async () => {
    const { appels } = await lancer()
    for (const a of appels()) {
      expect(a.entree).not.toMatch(/E-2026/)
      for (const p of PERSONNES_ESSAI) expect(a.entree).not.toContain(p.nom.split(' ')[0])
      expect(a.args[a.args.indexOf('--setting-sources') + 1]).toBe('project')
      expect(a.args[a.args.indexOf('--permission-mode') + 1]).toBe('dontAsk')
      expect(a.cwd).toMatch(/chantier-simuler_absence$/)
    }
    const [plan, impl, relecture] = appels()
    expect(plan?.args).not.toContain('Edit(./**)')
    expect(relecture?.args).not.toContain('Write(./**)')
    expect(impl?.args).toContain('Write(./**)')
  })
})

describe('G1 : une condition rouge, aucun merge', () => {
  /** Un chantier qui doit finir refusé sur cette condition ; rend l'issue. */
  async function refuse(e: Essai, id: string) {
    const r = await lancer(e)
    expect(r.issue.sorte).toBe('fait')
    if (r.issue.sorte !== 'fait') throw new Error('attendu : fait')
    expect(r.issue.conditions.find((k) => k.id === id)?.ok, id).toBe(false)
    expect(r.issue.issue).toMatch(/^refusé/)
    expect(r.issue.conditions.map((k) => k.id)).toContain('memoire')
    // Aucune fusion, aucune étiquette ; la mémoire du refus est commise et poussée.
    expect(r.emises.some((x) => x.commande === 'git' && x.args[0] === 'merge')).toBe(false)
    expect(git(r.depots.depot, 'tag', '--list')).toBe('')
    expect(lireIndex(r.depots.depot).at(-1)).toMatchObject({
      sorte: 'refus',
      id: 'simuler_absence',
    })
    expect(git(r.depots.origine, 'rev-parse', 'main')).toBe(
      git(r.depots.depot, 'rev-parse', 'main'),
    )
    expect(lignesChantier(r.dossier).map((l) => l.issue)).toEqual(['refusé'])
    expect(readFileSync(join(r.dossier, 'chantiers', 'simuler_absence.md'), 'utf8')).toContain(
      'Non fusionné : la branche reste.',
    )
    return r
  }

  it('1. un fichier hors de la bande métier (le moteur) : refusé, la branche reste', async () => {
    const r = await refuse(
      {
        scenario: {
          implementations: [
            { ecrire: { ...gesteVert(), 'moteur/src/moteur.ts': 'export const MOTEUR = 2\n' } },
          ],
        },
      },
      'chemins',
    )
    expect(git(r.depots.depot, 'branch', '--list', 'chantier/simuler_absence')).toContain(
      'chantier/',
    )
    // Pas de relecture d'un diff hors bande : rien n'est dépensé de plus.
    expect(r.appels().map((a) => a.role)).toEqual(['plan', 'implementation'])
  })

  it('1. la mémoire touchée ailleurs que par un ajout aux conventions : refusé', async () => {
    await refuse(
      {
        scenario: {
          implementations: [{ ecrire: { ...gesteVert(), 'memoire/INDEX.md': '# vidé\n' } }],
        },
      },
      'chemins',
    )
  })

  it('2. un fichier de test existant supprimé : refusé', async () => {
    await refuse(
      {
        scenario: {
          implementations: [
            { ecrire: gesteVert(), supprimer: ['metiers/essai/code/src/actions.test.ts'] },
          ],
        },
      },
      'tests',
    )
  })

  it('3. pnpm check rouge, rejoué par le code : refusé sans relecture', async () => {
    const r = await refuse({ pnpm: { check: [1] } }, 'check')
    expect(r.appels().map((a) => a.role)).toEqual(['plan', 'implementation'])
  })

  it('4. deux cas de traduction seulement pour le geste nouveau : refusé, sans passe de traduction', async () => {
    const geste = gesteVert()
    const deux = (geste['evals/consignes.yaml'] ?? '').split('\n').slice(0, -2).join('\n')
    const r = await refuse(
      {
        scenario: {
          implementations: [{ ecrire: { ...geste, 'evals/consignes.yaml': `${deux}\n` } }],
        },
      },
      'honnetete',
    )
    expect(r.emises.some((x) => x.commande === 'pnpm' && x.args[0] === 'evals')).toBe(false)
  })

  it('4. la traduction sous le seuil avec le modèle du quotidien : refusé', async () => {
    await refuse(
      {
        pnpm: {
          evals: {
            sortie: '\n50/62 (81 %, seuil 95 %), fuite 0 cas (seuil 0), coût 0.1 $\nSous le seuil',
            code: 1,
          },
        },
      },
      'honnetete',
    )
  })

  it('5. un bloquant à la relecture : une reprise, pas deux ; encore un bloquant, refusé', async () => {
    const bloquant = {
      constats: [
        {
          niveau: 'bloquant',
          fichier: 'metiers/essai/code/src/simulation.ts',
          ligne: 1,
          texte: 'valeur en dur',
        },
      ],
    }
    const r = await refuse(
      {
        scenario: {
          implementations: [
            { ecrire: gesteVert() },
            { ecrire: gesteVert() },
            { ecrire: gesteVert() },
          ],
          relectures: [bloquant, bloquant, bloquant],
        },
      },
      'relecture',
    )
    expect(r.appels().map((a) => a.role)).toEqual([
      'plan',
      'implementation',
      'relecture',
      'implementation',
      'relecture',
    ])
    // La reprise reçoit les constats bloquants.
    expect(r.appels()[3]?.entree).toContain('valeur en dur')
    if (r.issue.sorte === 'fait') expect(r.issue.cout).toBeCloseTo(2.5)
  })

  it('5. un bloquant levé par la reprise : fusionné', async () => {
    const { issue, appels } = await lancer({
      scenario: {
        implementations: [{ ecrire: gesteVert() }, { ecrire: gesteVert() }],
        relectures: [
          { constats: [{ niveau: 'bloquant', fichier: 'a.ts', ligne: 1, texte: 'faux' }] },
          { constats: [{ niveau: 'remarque', fichier: 'a.ts', ligne: 1, texte: 'bien' }] },
        ],
      },
    })
    expect(issue.sorte === 'fait' && issue.issue).toBe('fusionné')
    expect(appels().filter((a) => a.role === 'implementation')).toHaveLength(2)
  })

  it('6. l’implémentation au bout de ses tours : refusé', async () => {
    await refuse(
      { scenario: { implementations: [{ ecrire: gesteVert(), subtype: 'error_max_turns' }] } },
      'bornes',
    )
  })

  it('7. un diff plus long que lignes_max : refusé', async () => {
    await refuse({ chantier: { lignes_max: 3 } }, 'lignes')
  })

  it('8. une entrée de mémoire qui porterait un nom : refusé, rien de fusionné', () => {
    const depots = creerDepots()
    git(depots.depot, 'checkout', '-q', '-b', 'chantier/x')
    git(depots.depot, 'commit', '-q', '--allow-empty', '-m', 'x')
    git(depots.depot, 'checkout', '-q', 'main')
    const verte = (id: IdCondition): Condition => ({ id, ok: true, mesure: 'vert' })
    let essais = 0
    const r = conclure({
      commande: commandeSync,
      depot: depots.depot,
      racineCourante: depots.racine,
      id: 'x',
      titre: 'x',
      conditions: (
        ['chemins', 'tests', 'check', 'honnetete', 'relecture', 'bornes', 'lignes'] as const
      ).map(verte),
      personnes: PERSONNES_ESSAI,
      ecrireEntree: (sorte) => {
        essais++
        if (sorte === 'fusion') throw new Error('mémoire : le chantier porterait 1 nom(s)')
        ecrireRetrait(
          depots.depot,
          { date: '2026-10-11', client: 'c', id: 'x', titre: 'x', intentions: [], motif: 'm' },
          PERSONNES_ESSAI,
        )
        return join(depots.depot, 'memoire', 'INDEX.md')
      },
    })
    expect(r.sorte).toBe('refuse')
    expect(r.sorte === 'refuse' && r.rouges.map((k) => k.id)).toEqual(['memoire'])
    expect(essais).toBe(2)
    expect(git(depots.depot, 'log', '--merges', '--oneline')).toBe('')
  })
})

describe('G2 : le retrait défait la fusion', () => {
  it('revert -m 1 sur main du clone, poussé ; la mémoire garde motif et intentions ; une seconde fois refusée', async () => {
    const { depots, dossier } = await lancer()
    const avant = readdirSync(join(depots.depot, 'metiers', 'essai', 'code', 'src'))
    expect(avant).toContain('simulation.ts')
    const retirer = () =>
      retirerFusion({
        commande: commandeSync,
        depot: depots.depot,
        racineCourante: depots.racine,
        id: 'simuler_absence',
        motif: 'doublon',
        dejaRetiree: missionsRetirees(depots.depot).some((x) => x.id === 'simuler_absence'),
        ecrireRetrait: () =>
          ecrireRetrait(
            depots.depot,
            {
              date: '2026-10-12',
              client: 'client essai',
              id: 'simuler_absence',
              titre: MISSION_ESSAI.titre,
              intentions: MISSION_ESSAI.intentions,
              motif: 'doublon',
            },
            PERSONNES_ESSAI,
          ),
      })
    const r = retirer()
    expect(readdirSync(join(depots.depot, 'metiers', 'essai', 'code', 'src'))).not.toContain(
      'simulation.ts',
    )
    expect(git(depots.origine, 'rev-parse', 'main')).toBe(r.revert)
    // La mémoire de la fusion reste ; le retrait s'ajoute, intentions comprises.
    expect(
      existsSync(join(depots.depot, 'memoire', 'chantiers', '2026-10-11-simuler_absence.md')),
    ).toBe(true)
    expect(missionsRetirees(depots.depot)).toEqual([
      { id: 'simuler_absence', intentions: ['simuler_absence'] },
    ])
    expect(retirer).toThrow(/déjà retirée/)
    // Relancé, le chantier de la même mission ne refait rien : écartée, retirée.
    const s = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai('claude-absent', depots.depot),
      mission: join(dossier, 'rondes', '2026-10-10', 'simuler_absence.yaml'),
      env: ENV_ESSAI,
      maintenant: MAINTENANT,
    })
    expect(s).toMatchObject({ sorte: 'decision', decision: { sorte: 'ecartee' } })
  })

  it('un push refusé au retrait : rien n’est retiré, le clone reste propre et revient d’où il partait', async () => {
    // Le dépôt nu disparaît : tout push échoue.
    const essai = await lancer({ options: {} })
    expect(essai.issue.sorte === 'fait' && essai.issue.issue).toBe('fusionné')
    const tete = git(essai.depots.depot, 'rev-parse', 'HEAD')
    spawnSync('git', ['remote', 'set-url', 'origin', join(essai.depots.depot, 'nulle-part.git')], {
      cwd: essai.depots.depot,
    })
    expect(() =>
      retirerFusion({
        commande: commandeSync,
        depot: essai.depots.depot,
        racineCourante: essai.depots.racine,
        id: 'simuler_absence',
        motif: 'doublon',
        dejaRetiree: false,
        ecrireRetrait: () =>
          ecrireRetrait(
            essai.depots.depot,
            {
              date: '2026-10-12',
              client: 'c',
              id: 'simuler_absence',
              titre: 't',
              intentions: [],
              motif: 'm',
            },
            PERSONNES_ESSAI,
          ),
      }),
    ).toThrow(/retrait défait/)
    expect(git(essai.depots.depot, 'rev-parse', 'HEAD')).toBe(tete)
    expect(git(essai.depots.depot, 'status', '--porcelain')).toBe('')
    expect(missionsRetirees(essai.depots.depot)).toEqual([])
  })

  it('rien à retirer sans fusion étiquetée', async () => {
    const { depots } = await lancer({ pnpm: { check: [1] } })
    expect(() =>
      retirerFusion({
        commande: commandeSync,
        depot: depots.depot,
        racineCourante: depots.racine,
        id: 'simuler_absence',
        motif: 'm',
        dejaRetiree: false,
        ecrireRetrait: () => undefined,
      }),
    ).toThrow(/aucune fusion/)
  })
})

describe('une fusion dont le push échoue', () => {
  it('est défaite : ni fusion, ni étiquette, ni mémoire en plan ; le clone reste propre', async () => {
    const depots = creerDepots()
    spawnSync('git', ['remote', 'set-url', 'origin', join(depots.depot, 'nulle-part.git')], {
      cwd: depots.depot,
    })
    const { binaire } = binaireSimule({
      plan: PLAN_VERT,
      implementations: [{ ecrire: gesteVert() }],
    })
    const tete = git(depots.depot, 'rev-parse', 'HEAD')
    const r = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai(binaire, depots.depot),
      mission: clientAvecMission().fichier,
      env: ENV_ESSAI,
      maintenant: MAINTENANT,
      commande: commandeSimulee().commande,
    })
    expect(r.sorte === 'fait' && r.issue).toMatch(/^échoué : fusion défaite/)
    expect(git(depots.depot, 'rev-parse', 'HEAD')).toBe(tete)
    expect(git(depots.depot, 'tag', '--list')).toBe('')
    expect(git(depots.depot, 'status', '--porcelain')).toBe('')
  })
})

describe('R11 : fusion.ts refuse hors du clone de la nuit', () => {
  const vertes = (
    ['chemins', 'tests', 'check', 'honnetete', 'relecture', 'bornes', 'lignes'] as const
  ).map((id) => ({ id, ok: true, mesure: 'vert' }))
  const essayer = (depot: string, racine: string) =>
    conclure({
      commande: commandeSync,
      depot,
      racineCourante: racine,
      id: 'x',
      titre: 'x',
      conditions: vertes,
      personnes: PERSONNES_ESSAI,
      ecrireEntree: () => {
        throw new Error('jamais appelée')
      },
    })

  it("l'arbre courant, un arbre du même dépôt, un clone sale, un clone hors de main", () => {
    const d = creerDepots()
    expect(() => essayer(d.racine, d.racine)).toThrow(/arbre courant/)
    git(d.racine, 'worktree', 'add', '-q', join(d.racine, '..', 'arbre-humain'), '-b', 'autre')
    expect(() => essayer(join(d.racine, '..', 'arbre-humain'), d.racine)).toThrow(/arbre courant/)
    spawnSync('sh', ['-c', 'echo x > sale.txt'], { cwd: d.depot })
    expect(() => essayer(d.depot, d.racine)).toThrow(/pas propre/)
    expect(() =>
      publierMemoire({
        commande: commandeSync,
        depot: d.depot,
        racineCourante: d.racine,
        message: 'm',
      }),
    ).toThrow(/pas propre/)
    spawnSync('rm', ['sale.txt'], { cwd: d.depot })
    git(d.depot, 'checkout', '-q', '-b', 'ailleurs')
    expect(() => essayer(d.depot, d.racine)).toThrow(/pas sur main/)
  })
})

describe('le chantier s’arrête avant tout appel (§ 0.b, § 6.4)', () => {
  it('une mission au seuil de promotion : « promotion en cours », aucun appel, aucun git', async () => {
    const { issue, appels, emises, dossier } = await lancer({
      mission: { ...MISSION_ESSAI, id: 'heures', intentions: ['heures_par_agent'] },
    })
    expect(issue).toMatchObject({
      sorte: 'decision',
      decision: { sorte: 'attend', motif: 'promotion en cours' },
    })
    expect(appels()).toEqual([])
    expect(emises.filter((x) => x.commande === 'git')).toEqual([])
    expect(readFileSync(join(dossier, 'chantiers', 'heures.md'), 'utf8')).toContain(
      'promotion en cours',
    )
    expect(lignesChantier(dossier).map((l) => l.issue)).toEqual(['promotion en cours'])
  })

  it('le plan dit « hors de la bande » : question pour l’atelier, aucune implémentation', async () => {
    const { issue, appels } = await lancer({
      scenario: { plan: { faisable: false, raison: 'il faut toucher le moteur', plan: '-' } },
    })
    expect(issue.sorte === 'fait' && issue.issue).toMatch(/^question pour l'atelier/)
    expect(appels().map((a) => a.role)).toEqual(['plan'])
  })

  it('deux lancements : « déjà tentée » ; --sans-modele : aucun appel, aucun git', async () => {
    const r = await lancer({ pnpm: { check: [1] } })
    const encore = await faireChantier(METIER_ESSAI, r.options)
    expect(encore.sorte).toBe('deja_tentee')
    expect(r.appels()).toHaveLength(2)
    const { commande, emises } = commandeSimulee()
    const sans = await faireChantier(METIER_ESSAI, { ...r.options, commande, sansModele: true })
    expect(sans.sorte).toBe('sans_modele')
    expect(emises).toEqual([])
    expect(r.appels()).toHaveLength(2)
  })

  it('une consigne-type qui nommerait quelqu’un : refusée avant tout appel', async () => {
    const { issue, appels } = await lancer({
      mission: { ...MISSION_ESSAI, consignes_types: ['les heures de Rosalie'] },
    })
    expect(issue.sorte).toBe('fuite')
    expect(appels()).toEqual([])
  })

  it('sous acces: claude, une ANTHROPIC_API_KEY présente refuse avant tout appel et toute branche', async () => {
    const depots = creerDepots()
    const { binaire, appels } = binaireSimule({ plan: PLAN_VERT })
    const { commande, emises } = commandeSimulee()
    await expect(
      faireChantier(METIER_ESSAI, {
        racine: depots.racine,
        agence: agenceEssai(binaire, depots.depot),
        mission: clientAvecMission().fichier,
        env: { ANTHROPIC_API_KEY: 'x' },
        maintenant: MAINTENANT,
        commande,
      }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/)
    expect(appels()).toEqual([])
    expect(emises).toEqual([])
  })
})

describe('aucun merge ni push hors de fusion.ts', () => {
  it('aucun autre module du moteur n’emploie git merge ni git push', () => {
    const fichiers = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((f) =>
        f.isDirectory()
          ? fichiers(join(d, f.name))
          : f.name.endsWith('.ts')
            ? [join(d, f.name)]
            : [],
      )
    const fautifs = fichiers(join(RACINE_DEPOT, 'moteur', 'src'))
      .filter((f) => !f.endsWith('.test.ts') && !f.endsWith(join('chantier', 'fusion.ts')))
      // Les aides de test montent leurs faux dépôts avec git, poussées comprises.
      .filter((f) => !f.endsWith('essai.test.fixture.ts'))
      .filter((f) => /['"`](?:merge|push)['"`]/.test(readFileSync(f, 'utf8')))
    expect(fautifs).toEqual([])
  })

  it('un chantier refusé n’émet aucun merge ; son seul push est celui de la mémoire, par fusion.ts', async () => {
    const r = await lancer({ pnpm: { check: [1] }, scenario: {} })
    const git = r.emises.filter((x) => x.commande === 'git')
    expect(git.filter((x) => x.args[0] === 'merge')).toEqual([])
    expect(git.filter((x) => x.args[0] === 'push').map((x) => x.args)).toEqual([
      ['push', 'origin', 'main'],
    ])
  })
})

it('les évals au seuil simulées tiennent la forme de pnpm evals traduire', () => {
  expect(EVALS_AU_SEUIL.sortie).toMatch(/\d+\/\d+ \(\d+ %, seuil \d+ %\), fuite \d+ cas/)
})
