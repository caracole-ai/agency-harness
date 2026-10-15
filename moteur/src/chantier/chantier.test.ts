import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLIENTS_FICTIFS, personnesFictives, RACINE_DEPOT } from '../agence/fictif'
import { fuites } from '../echappee/pseudonymes'
import { FUSEAU, Temporal } from '../temps/temporal'
import { type Commande, commandeSync, DOSSIER_ARBRES } from './arbre'
import { AUCUN_CLIENT_EVALS, faireChantier, type OptionsChantier } from './chantier'
import {
  agenceEssai,
  binaireSimule,
  CLIENT_EVALS_ESSAI,
  clientAvecCommande,
  clientAvecMission,
  cloneDuDistant,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  EVALS_AU_SEUIL,
  etatHumain,
  gesteVert,
  MISSION_ESSAI,
  type PnpmSimule,
  refuserPush,
  type Scenario,
} from './essai.test.fixture'
import { type Condition, conclure, type IdCondition, refEtiquette, retirerFusion } from './fusion'
import { fichierConsignes } from './garde'
import { ecrireChantier, ecrireRetrait, lireIndex, missionsRetirees } from './memoire'
import { METIER_ESSAI, PERSONNES_ESSAI } from './metier-essai.test.fixture'
import { lireStatut, type Mission } from './mission'

// PLAN-RONDE.md § 6.4, PLAN-GENERAL.md G1, G2 et PLAN-LIVRAISON.md L2, L3, en
// simulé : le binaire `claude` est un script qui écrit un diff connu et rend
// un JSON ; `pnpm` est simulé ; git tourne pour de vrai, sur un dépôt nu
// (`origin`) et le dépôt de l'agence, arbre d'un humain. Une fusion sous huit
// conditions vertes, poussée sur `main` du distant sans que l'arbre de
// l'humain ni son `main` ne bougent ; un refus pour chaque condition rouge ;
// un retrait qui défait ; un push refusé repris une fois ; aucun merge ni
// push hors de `fusion.ts`. Le chantier ne lit aucun dossier client : il
// écrit son dossier et son statut dans un dossier de sortie.

const MAINTENANT = Temporal.ZonedDateTime.from(`2026-10-11T03:00[${FUSEAU}]`)
const PLAN_VERT: Scenario['plan'] = {
  faisable: true,
  raison: 'un geste dans la bande métier',
  plan: '- metiers/essai/code/src/simulation.ts\n- trois cas',
}
const CLIENT = 'client-essai'

const git = (cwd: string, ...args: string[]) =>
  spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim()

interface Essai {
  scenario?: Scenario
  pnpm?: PnpmSimule
  mission?: Mission
  chantier?: Parameters<typeof agenceEssai>[1]
  options?: Partial<OptionsChantier>
}

/** Un chantier simulé de bout en bout ; rend l'issue, les appels au binaire, les commandes émises, les dépôts, l'état de l'humain avant. */
async function lancer(e: Essai = {}) {
  const depots = creerDepots()
  const humain = etatHumain(depots.racine)
  const { binaire, appels } = binaireSimule({
    plan: PLAN_VERT,
    implementations: [{ ecrire: gesteVert() }],
    ...e.scenario,
  })
  const { commande, emises } = commandeSimulee(e.pnpm)
  const { fichier } = clientAvecMission(e.mission)
  const sortie = mkdtempSync(join(tmpdir(), 'sortie-'))
  const options: OptionsChantier = {
    racine: depots.racine,
    agence: agenceEssai(binaire, e.chantier),
    mission: fichier,
    client: CLIENT,
    personnes: PERSONNES_ESSAI,
    sortie,
    env: ENV_ESSAI,
    maintenant: MAINTENANT,
    commande,
    ...e.options,
  }
  const issue = await faireChantier(METIER_ESSAI, options)
  return { issue, appels, emises, depots, humain, sortie, fichier, options }
}

/** Le retrait de `simuler_absence` par le dépôt de l'agence, sa mémoire écrite dans l'arbre détaché. */
const retirer = (racine: string, commande: Commande = commandeSync) =>
  retirerFusion({
    commande,
    racine,
    id: 'simuler_absence',
    motif: 'doublon',
    ecrireRetrait: (arbre) =>
      ecrireRetrait(
        arbre,
        {
          date: '2026-10-12',
          client: CLIENT,
          id: 'simuler_absence',
          titre: MISSION_ESSAI.titre,
          intentions: MISSION_ESSAI.intentions,
          motif: 'doublon',
        },
        PERSONNES_ESSAI,
      ),
  })

const statut = (sortie: string) => lireStatut(join(sortie, 'simuler_absence.statut.yaml'))
const arbresRestants = (racine: string) =>
  existsSync(join(racine, DOSSIER_ARBRES)) ? readdirSync(join(racine, DOSSIER_ARBRES)) : []

describe('G1 : huit conditions vertes, la fusion', () => {
  it('fusionne --no-ff sur main du distant, pose l’étiquette, pousse, la mémoire à part ; ni l’arbre de l’humain ni son main ne bougent', async () => {
    const { issue, appels, emises, depots, humain, sortie } = await lancer()
    expect(issue.sorte).toBe('fait')
    if (issue.sorte !== 'fait') return
    expect(issue.issue).toBe('fusionné')
    // La condition 4 mesure sur le client des évals du métier de la mission (PLAN-METIER-2.md M9).
    expect(emises.find((x) => x.commande === 'pnpm' && x.args[0] === 'evals')?.args).toEqual([
      'evals',
      'traduire',
      '--client',
      CLIENT_EVALS_ESSAI,
    ])
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
    expect(issue.conditions.find((k) => k.id === 'memoire')?.mesure).toBe(
      'écrite : memoire/chantiers/2026-10-11-simuler_absence.md',
    )
    // Sur le distant : une fusion (deux parents), étiquetée ; la mémoire est le commit d'après.
    const fusion = git(depots.origine, 'rev-parse', `${refEtiquette('simuler_absence')}^{commit}`)
    expect(git(depots.origine, 'rev-list', '--parents', '-n', '1', fusion).split(' ')).toHaveLength(
      3,
    )
    expect(git(depots.origine, 'log', '-1', '--format=%s', 'main')).toMatch(/^Mémoire : chantier/)
    // L'humain : ni sa tête, ni sa branche, ni son main, ni son arbre ; aucun arbre de travail ne reste, la branche reste.
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(arbresRestants(depots.racine)).toEqual([])
    expect(git(depots.racine, 'branch', '--list', 'chantier/simuler_absence')).toContain(
      'chantier/',
    )
    // La mémoire du distant : l'entrée et sa ligne d'index, le client en slug, sans nom ni identifiant d'échappée.
    const distant = cloneDuDistant(depots.origine)
    expect(lireIndex(distant).at(-1)).toMatchObject({
      client: CLIENT,
      sorte: 'fusion',
      id: 'simuler_absence',
      issue: 'fusionné',
    })
    const entree = readFileSync(
      join(distant, 'memoire', 'chantiers', '2026-10-11-simuler_absence.md'),
      'utf8',
    )
    expect(entree).toContain('un geste nouveau a ses trois cas dès sa naissance')
    expect(entree).not.toMatch(/E-2026/)
    expect(readdirSync(join(distant, 'metiers', 'essai', 'code', 'src'))).toContain('simulation.ts')
    // Le dossier et le statut, dans la sortie (L7).
    expect(readFileSync(join(sortie, 'simuler_absence.chantier.md'), 'utf8')).toMatch(
      /Issue : \*\*fusionné\*\*/,
    )
    expect(statut(sortie)).toEqual({
      statut: 'fusionné',
      issue: 'fusionné',
      cout_usd: 1.5,
      le: '2026-10-11T01:00:00Z',
    })
  })

  it('ce qui part au modèle : la mission par types, ni échappée ni nom ; le chantier sous les réglages du projet', async () => {
    const { appels } = await lancer()
    const fictives = await Promise.all(CLIENTS_FICTIFS.map(personnesFictives))
    for (const a of appels()) {
      expect(a.entree).not.toMatch(/E-2026/)
      for (const p of PERSONNES_ESSAI) expect(a.entree).not.toContain(p.nom.split(' ')[0])
      // Ni un nom d'un client fictif du dépôt (PLAN-METIER-2.md M9).
      for (const personnes of fictives) expect(fuites(a.entree, personnes)).toEqual([])
      expect(a.args[a.args.indexOf('--setting-sources') + 1]).toBe('project')
      expect(a.args[a.args.indexOf('--permission-mode') + 1]).toBe('dontAsk')
      expect(a.cwd).toMatch(/chantier-simuler_absence$/)
    }
    const [plan, impl, relecture] = appels()
    // Les cas de traduction s'écrivent dans les consignes du métier de la mission (PLAN-METIER-2.md M8).
    expect(impl?.entree).toContain(`\`${fichierConsignes(MISSION_ESSAI.metier)}\``)
    expect(relecture?.entree).toContain('`git diff origin/main...HEAD`')
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
    expect(git(r.depots.origine, 'tag', '--list')).toBe('')
    expect(lireIndex(cloneDuDistant(r.depots.origine)).at(-1)).toMatchObject({
      sorte: 'refus',
      id: 'simuler_absence',
    })
    expect(etatHumain(r.depots.racine)).toEqual(r.humain)
    expect(statut(r.sortie)).toMatchObject({ statut: 'refusé', issue: r.issue.issue })
    expect(readFileSync(join(r.sortie, 'simuler_absence.chantier.md'), 'utf8')).toContain(
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
    expect(git(r.depots.racine, 'branch', '--list', 'chantier/simuler_absence')).toContain(
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
    const consignes = fichierConsignes(MISSION_ESSAI.metier)
    const deux = (geste[consignes] ?? '').split('\n').slice(0, -2).join('\n')
    const r = await refuse(
      {
        scenario: {
          implementations: [{ ecrire: { ...geste, [consignes]: `${deux}\n` } }],
        },
      },
      'honnetete',
    )
    expect(r.emises.some((x) => x.commande === 'pnpm' && x.args[0] === 'evals')).toBe(false)
  })

  it('4. le métier de la mission sans client d’évals dans agence.yaml : refusé, sans passe de traduction (PLAN-METIER-2.md M9)', async () => {
    const r = await refuse(
      { chantier: { evals_clients: { autre: CLIENT_EVALS_ESSAI } } },
      'honnetete',
    )
    expect(
      r.issue.sorte === 'fait' && r.issue.conditions.find((k) => k.id === 'honnetete'),
    ).toEqual({
      id: 'honnetete',
      ok: false,
      mesure: `${AUCUN_CLIENT_EVALS} (${MISSION_ESSAI.metier})`,
    })
    expect(r.emises.some((x) => x.commande === 'pnpm' && x.args[0] === 'evals')).toBe(false)
  })

  it('1. un fichier d’un autre métier que celui de la mission : refusé (PLAN-METIER-2.md M9)', async () => {
    const r = await refuse(
      {
        scenario: {
          implementations: [
            {
              ecrire: {
                ...gesteVert(),
                'metiers/securite-privee/code/src/actions.ts': 'export const ACTIONS = []\n',
              },
            },
          ],
        },
      },
      'chemins',
    )
    expect(r.issue.sorte === 'fait' && r.issue.conditions[0]?.mesure).toBe(
      'hors bande : metiers/securite-privee/code/src/actions.ts',
    )
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

  it('8. une entrée de mémoire qui porterait un nom : refusé, rien de fusionné, l’entrée à moitié écrite ne part pas', () => {
    const depots = creerDepots()
    git(depots.racine, 'branch', 'chantier/x')
    const humain = etatHumain(depots.racine)
    const verte = (id: IdCondition): Condition => ({ id, ok: true, mesure: 'vert' })
    let essais = 0
    const r = conclure({
      commande: commandeSync,
      racine: depots.racine,
      id: 'x',
      titre: 'x',
      conditions: (
        ['chemins', 'tests', 'check', 'honnetete', 'relecture', 'bornes', 'lignes'] as const
      ).map(verte),
      personnes: PERSONNES_ESSAI,
      ecrireEntree: (arbre, sorte) => {
        essais++
        ecrireRetrait(
          arbre,
          {
            date: '2026-10-11',
            client: 'c',
            id: `x-${sorte}`,
            titre: 'x',
            intentions: [],
            motif: 'm',
          },
          PERSONNES_ESSAI,
        )
        if (sorte === 'fusion') throw new Error('mémoire : le chantier porterait 1 nom(s)')
        return join(arbre, 'memoire', 'INDEX.md')
      },
    })
    expect(r.sorte).toBe('refuse')
    expect(r.sorte === 'refuse' && r.rouges.map((k) => k.id)).toEqual(['memoire'])
    expect(essais).toBe(2)
    expect(git(depots.origine, 'log', '--merges', '--oneline', 'main')).toBe('')
    expect(lireIndex(cloneDuDistant(depots.origine)).map((e) => e.id)).toEqual(['x-refus'])
    expect(etatHumain(depots.racine)).toEqual(humain)
  })
})

describe('G2 : le retrait défait la fusion', () => {
  it('revert -m 1 sur main du distant, poussé ; la mémoire garde motif et intentions ; une seconde fois refusée ; l’humain n’a pas bougé', async () => {
    const { depots, humain } = await lancer()
    const r = retirer(depots.racine)
    const distant = cloneDuDistant(depots.origine)
    expect(readdirSync(join(distant, 'metiers', 'essai', 'code', 'src'))).not.toContain(
      'simulation.ts',
    )
    expect(git(depots.origine, 'rev-parse', 'main')).toBe(r.revert)
    // La mémoire de la fusion reste ; le retrait s'ajoute, intentions comprises.
    expect(existsSync(join(distant, 'memoire', 'chantiers', '2026-10-11-simuler_absence.md'))).toBe(
      true,
    )
    expect(missionsRetirees(distant)).toEqual([
      { id: 'simuler_absence', intentions: ['simuler_absence'] },
    ])
    expect(() => retirer(depots.racine)).toThrow(/déjà retirée/)
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(arbresRestants(depots.racine)).toEqual([])
  })

  it('après le retrait, la même mission ne se refait pas ; sous un autre nom, écartée sur la mémoire d’origin/main que la racine n’a pas', async () => {
    const e = await lancer()
    retirer(e.depots.racine)
    // La racine (l'arbre de l'humain) n'a pas tiré le retrait : seule la mémoire d'origin/main le sait.
    expect(missionsRetirees(e.depots.racine)).toEqual([])
    const encore = await faireChantier(METIER_ESSAI, e.options)
    expect(encore.sorte).toBe('deja_tentee')
    const bis = clientAvecMission({ ...MISSION_ESSAI, id: 'simuler_absence_bis' })
    const s = await faireChantier(METIER_ESSAI, { ...e.options, mission: bis.fichier })
    expect(s).toMatchObject({ sorte: 'decision', decision: { sorte: 'ecartee' } })
    expect(s.sorte === 'decision' && s.decision.sorte === 'ecartee' && s.decision.motif).toMatch(
      /mission retirée \(simuler_absence\)/,
    )
    expect(lireStatut(join(e.sortie, 'simuler_absence_bis.statut.yaml'))?.statut).toBe('écartée')
    expect(e.appels().filter((a) => a.role === 'plan')).toHaveLength(1)
    // Écartée avant que la branche existe : rien ne reste, et la relancer l'écarte encore.
    expect(git(e.depots.racine, 'branch', '--list', 'chantier/simuler_absence_bis')).toBe('')
    expect(arbresRestants(e.depots.racine)).toEqual([])
    expect((await faireChantier(METIER_ESSAI, { ...e.options, mission: bis.fichier })).sorte).toBe(
      'decision',
    )
  })

  it('un push toujours refusé au retrait : rien n’est retiré, ni sur le distant ni chez l’humain', async () => {
    const e = await lancer()
    const tete = git(e.depots.origine, 'rev-parse', 'main')
    refuserPush(e.depots.origine)
    expect(() => retirer(e.depots.racine)).toThrow(/retrait défait \(push refusé deux fois/)
    expect(git(e.depots.origine, 'rev-parse', 'main')).toBe(tete)
    expect(missionsRetirees(cloneDuDistant(e.depots.origine))).toEqual([])
    expect(etatHumain(e.depots.racine)).toEqual(e.humain)
    expect(arbresRestants(e.depots.racine)).toEqual([])
  })

  it('rien à retirer sans fusion étiquetée', async () => {
    const { depots } = await lancer({ pnpm: { check: [1] } })
    expect(() => retirer(depots.racine)).toThrow(/aucune fusion/)
  })
})

describe('une fusion qui ne peut pas, ou n’a plus à, se faire', () => {
  const vertes = (
    ['chemins', 'tests', 'check', 'honnetete', 'relecture', 'bornes', 'lignes'] as const
  ).map((id): Condition => ({ id, ok: true, mesure: 'vert' }))
  const entree =
    (id: string) =>
    (arbre: string, sorte: 'fusion' | 'refus', issue: string): string =>
      ecrireChantier(
        arbre,
        {
          date: '2026-10-11',
          client: CLIENT,
          id,
          titre: id,
          sections: [],
          appris: '',
          sorte,
          issue,
        },
        PERSONNES_ESSAI,
      )

  it('en conflit avec origin/main : échoué, ni fusion ni étiquette ni mémoire poussées, rien ne reste', () => {
    const depots = creerDepots()
    const fichier = 'metiers/essai/code/src/actions.ts'
    git(depots.racine, 'checkout', '-q', '-b', 'chantier/x')
    spawnSync('sh', ['-c', `echo "export const A = 1" > ${fichier}`], { cwd: depots.racine })
    git(depots.racine, 'commit', '-q', '-am', 'x')
    git(depots.racine, 'checkout', '-q', 'main')
    const autre = cloneDuDistant(depots.origine)
    spawnSync('sh', ['-c', `echo "export const A = 2" > ${fichier}`], { cwd: autre })
    spawnSync(
      'git',
      ['-c', 'user.name=a', '-c', 'user.email=a@b', 'commit', '-q', '-am', 'autre'],
      {
        cwd: autre,
      },
    )
    git(autre, 'push', '-q', 'origin', 'main')
    const tete = git(depots.origine, 'rev-parse', 'main')
    const humain = etatHumain(depots.racine)
    const r = conclure({
      commande: commandeSync,
      racine: depots.racine,
      id: 'x',
      titre: 'x',
      conditions: vertes,
      personnes: PERSONNES_ESSAI,
      ecrireEntree: entree('x'),
    })
    expect(r.sorte === 'echec' && r.raison).toMatch(/^fusion impossible/)
    expect(git(depots.origine, 'rev-parse', 'main')).toBe(tete)
    expect(git(depots.origine, 'tag', '--list')).toBe('')
    expect(git(depots.racine, 'tag', '--list')).toBe('')
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(arbresRestants(depots.racine)).toEqual([])
  })

  it('déjà sur origin/main (la réponse d’un push perdue) : fusionné, la même fusion, rien de plus poussé', async () => {
    const e = await lancer()
    const tete = git(e.depots.origine, 'rev-parse', 'main')
    const fusion = git(e.depots.origine, 'rev-parse', `${refEtiquette('simuler_absence')}^{commit}`)
    const r = conclure({
      commande: commandeSync,
      racine: e.depots.racine,
      id: 'simuler_absence',
      titre: 'x',
      conditions: vertes,
      personnes: PERSONNES_ESSAI,
      ecrireEntree: entree('simuler_absence'),
    })
    expect(r).toEqual({
      sorte: 'fusionne',
      fusion,
      memoire: 'memoire/chantiers/2026-10-11-simuler_absence.md',
    })
    expect(git(e.depots.origine, 'rev-parse', 'main')).toBe(tete)
    expect(arbresRestants(e.depots.racine)).toEqual([])
  })
})

describe('un push refusé à la fusion', () => {
  it('toujours : échoué, ni fusion ni étiquette, ici ou sur le distant ; la branche reste', async () => {
    const depots = creerDepots()
    refuserPush(depots.origine)
    const humain = etatHumain(depots.racine)
    const { binaire } = binaireSimule({
      plan: PLAN_VERT,
      implementations: [{ ecrire: gesteVert() }],
    })
    const r = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai(binaire),
      mission: clientAvecMission().fichier,
      client: CLIENT,
      personnes: PERSONNES_ESSAI,
      sortie: mkdtempSync(join(tmpdir(), 'sortie-')),
      env: ENV_ESSAI,
      maintenant: MAINTENANT,
      commande: commandeSimulee().commande,
    })
    expect(r.sorte === 'fait' && r.issue).toMatch(
      /^échoué : fusion défaite : push refusé deux fois/,
    )
    expect(git(depots.origine, 'log', '--oneline', 'main').split('\n')).toHaveLength(1)
    expect(git(depots.origine, 'tag', '--list')).toBe('')
    expect(git(depots.racine, 'tag', '--list')).toBe('')
    expect(git(depots.racine, 'branch', '--list', 'chantier/simuler_absence')).toContain(
      'chantier/',
    )
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(arbresRestants(depots.racine)).toEqual([])
  })

  it('une fois, parce que quelqu’un a poussé entre-temps : une reprise depuis le nouvel origin/main, fusionné', async () => {
    // Au premier push de la fusion, un autre pousse sur main du distant : le push devient refusé (non fast-forward).
    let pousse = false
    const autre = (origine: string) => {
      const d = cloneDuDistant(origine)
      git(d, 'config', 'user.email', 'autre@exemple.invalid')
      git(d, 'config', 'user.name', 'autre')
      git(d, 'commit', '-q', '--allow-empty', '-m', 'poussé entre-temps')
      git(d, 'push', '-q', 'origin', 'main')
    }
    let origine = ''
    const { commande: simulee } = commandeSimulee()
    const commande: Commande = (cwd, nom, args, env) => {
      if (!pousse && nom === 'git' && args[0] === 'push' && /fusion-/.test(cwd)) {
        pousse = true
        autre(origine)
      }
      return simulee(cwd, nom, args, env)
    }
    const depots = creerDepots()
    origine = depots.origine
    const { binaire } = binaireSimule({
      plan: PLAN_VERT,
      implementations: [{ ecrire: gesteVert() }],
    })
    const r = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai(binaire),
      mission: clientAvecMission().fichier,
      client: CLIENT,
      personnes: PERSONNES_ESSAI,
      sortie: mkdtempSync(join(tmpdir(), 'sortie-')),
      env: ENV_ESSAI,
      maintenant: MAINTENANT,
      commande,
    })
    expect(pousse).toBe(true)
    expect(r.sorte === 'fait' && r.issue).toBe('fusionné')
    const fusion = git(depots.origine, 'rev-parse', `${refEtiquette('simuler_absence')}^{commit}`)
    // La fusion part du commit poussé entre-temps : rien de ce qu'il a apporté n'est perdu.
    expect(git(depots.origine, 'log', '-1', '--format=%s', `${fusion}^1`)).toBe(
      'poussé entre-temps',
    )
    expect(git(depots.origine, 'log', '-1', '--format=%s', 'main')).toMatch(/^Mémoire : chantier/)
  })
})

describe('le chantier s’arrête avant tout appel (§ 0.b, § 6.4)', () => {
  it('le plan dit « hors de la bande » : question pour l’atelier, aucune implémentation', async () => {
    const { issue, appels, sortie } = await lancer({
      scenario: { plan: { faisable: false, raison: 'il faut toucher le moteur', plan: '-' } },
    })
    expect(issue.sorte === 'fait' && issue.issue).toMatch(/^question pour l'atelier/)
    expect(appels().map((a) => a.role)).toEqual(['plan'])
    expect(statut(sortie)).toMatchObject({ statut: 'écartée', cout_usd: 0.5 })
  })

  it('deux lancements : « déjà tentée » ; --sans-modele : aucun appel, aucun git, aucun statut', async () => {
    const r = await lancer({ pnpm: { check: [1] } })
    const encore = await faireChantier(METIER_ESSAI, r.options)
    expect(encore.sorte).toBe('deja_tentee')
    expect(r.appels()).toHaveLength(2)
    const { commande, emises } = commandeSimulee()
    const sortie = mkdtempSync(join(tmpdir(), 'sortie-'))
    const sans = await faireChantier(METIER_ESSAI, {
      ...r.options,
      commande,
      sortie,
      sansModele: true,
    })
    expect(sans.sorte).toBe('sans_modele')
    expect(emises).toEqual([])
    expect(r.appels()).toHaveLength(2)
    expect(readdirSync(sortie)).toEqual(['simuler_absence.sans-modele.chantier.md'])
  })

  it('--sans-modele sur une mission commandée par le patron : le chantier, des consignes sans identifiant', async () => {
    const depots = creerDepots()
    const { binaire, appels } = binaireSimule({ plan: PLAN_VERT })
    const { commande, emises } = commandeSimulee()
    const { fichier } = clientAvecCommande()
    const r = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai(binaire),
      mission: fichier,
      client: CLIENT,
      personnes: PERSONNES_ESSAI,
      sortie: mkdtempSync(join(tmpdir(), 'sortie-')),
      env: ENV_ESSAI,
      maintenant: MAINTENANT,
      commande,
      sansModele: true,
    })
    expect(r).toMatchObject({ sorte: 'sans_modele', decision: { sorte: 'chantier' } })
    const dossier = readFileSync(r.dossier, 'utf8')
    expect(dossier).toContain('Décision : **chantier**')
    expect(dossier).toContain('sorte : geste_code ; métier : essai ; écrit : oui')
    expect(dossier).toContain('  - « Libère le mardi 13 de <personne>. »')
    expect(dossier).toContain('## La mémoire des chantiers')
    expect(dossier).not.toMatch(/A-\d|E-2026|Rosalie/)
    expect(appels()).toEqual([])
    expect(emises).toEqual([])
  })

  it('une consigne-type qui nommerait quelqu’un : refusée avant tout appel et tout git', async () => {
    const { issue, appels, emises, sortie } = await lancer({
      mission: { ...MISSION_ESSAI, consignes_types: ['les heures de Rosalie'] },
    })
    expect(issue.sorte).toBe('fuite')
    expect(appels()).toEqual([])
    expect(emises).toEqual([])
    expect(statut(sortie)).toMatchObject({ statut: 'écartée' })
  })

  it('sous acces: claude, une ANTHROPIC_API_KEY présente refuse avant tout appel et toute branche', async () => {
    const depots = creerDepots()
    const { binaire, appels } = binaireSimule({ plan: PLAN_VERT })
    const { commande, emises } = commandeSimulee()
    await expect(
      faireChantier(METIER_ESSAI, {
        racine: depots.racine,
        agence: agenceEssai(binaire),
        mission: clientAvecMission().fichier,
        client: CLIENT,
        personnes: PERSONNES_ESSAI,
        sortie: mkdtempSync(join(tmpdir(), 'sortie-')),
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

  it('un chantier refusé n’émet aucun merge ; son seul push est celui de la mémoire, sur main du distant', async () => {
    const r = await lancer({ pnpm: { check: [1] }, scenario: {} })
    const git = r.emises.filter((x) => x.commande === 'git')
    expect(git.filter((x) => x.args[0] === 'merge')).toEqual([])
    expect(git.filter((x) => x.args[0] === 'push').map((x) => x.args)).toEqual([
      ['push', '--atomic', '--quiet', 'origin', 'HEAD:refs/heads/main'],
    ])
  })
})

it('les évals au seuil simulées tiennent la forme de pnpm evals traduire', () => {
  expect(EVALS_AU_SEUIL.sortie).toMatch(/\d+\/\d+ \(\d+ %, seuil \d+ %\), fuite \d+ cas/)
})
