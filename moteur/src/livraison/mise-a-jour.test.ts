import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import type { Commande } from '../chantier/arbre'
import {
  CLE_ESSAI,
  cleEssai,
  commandeSimulee,
  ENV_ESSAI,
  type PnpmSimule,
} from '../chantier/essai.test.fixture'
import { dossierEssai, METIER_ESSAI } from '../chantier/metier-essai.test.fixture'
import { FUSEAU, Temporal } from '../temps/temporal'
import { FICHIER_LIVRAISON, type Livraison } from './config'
import { basculer, retirerALaMain, revenir } from './harnais'
import {
  CALME_SECONDES,
  cible,
  DOSSIER_DEPOT,
  DOSSIER_VERSIONS,
  doitRelancer,
  elaguer,
  FICHIER_BASCULE,
  FICHIER_PRETE,
  FICHIER_RETOUR,
  FICHIER_VERSION,
  ISSUES_MISE_A_JOUR,
  installerPremiere,
  LIENS,
  lier,
  marquerBascule,
  marquerRetour,
  noterLivraison,
  noterSiMarque,
  preparer,
  rattraper,
  relanceAttendue,
  TYPE_MISE_A_JOUR,
  verrouInstallation,
} from './mise-a-jour'
import { FICHIER_SIGNATAIRES, VARIABLE_CLE_SIGNATURE } from './version'

// PLAN-LIVRAISON.md L8 et la mesure du lot 4 : un dépôt du produit réel
// (nu), des versions signées par la clé de l'agence ; chez le client, la plus
// récente des descendantes est vérifiée, installée à côté, `pnpm check`
// rejoué (simulé) : préparée ; signature fausse, autre lignée, check rouge :
// refusée, et son arbre retiré ; rien de ce qui tourne n'est touché.

const MAINTENANT = Temporal.ZonedDateTime.from(`2026-10-16T10:00[${FUSEAU}]`)

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout.trim()
}

/** Le dépôt du produit, nu, et un arbre de l'agence qui y pousse ses versions signées. */
function produit() {
  const base = mkdtempSync(join(tmpdir(), 'produit-'))
  const nu = join(base, 'produit.git')
  const agence = join(base, 'agence')
  git(base, 'init', '-q', '--bare', '-b', 'main', nu)
  git(base, 'init', '-q', '-b', 'main', agence)
  git(agence, 'config', 'user.email', 'agence@exemple.invalid')
  git(agence, 'config', 'user.name', 'agence')
  git(agence, 'remote', 'add', 'origin', nu)
  /** Un commit, sa version signée (par cette clé), poussés ; rend le commit. */
  const version = (tag: string, cle = CLE_ESSAI.privee) => {
    writeFileSync(join(agence, 'geste.txt'), `${tag}\n`)
    git(agence, 'add', '-A')
    git(agence, 'commit', '-q', '-m', tag)
    git(agence, '-c', 'gpg.format=ssh', '-c', `user.signingkey=${cle}`, 'tag', '-s', '-m', tag, tag)
    git(agence, 'push', '-q', 'origin', 'HEAD:main', `refs/tags/${tag}`)
    return git(agence, 'rev-parse', 'HEAD')
  }
  return { nu, agence, version }
}

/** Un client livré sur ce produit, avec le fichier `signataires` de l'agence. */
function client(depot: string): { dossier: string; l: Livraison } {
  const dossier = dossierEssai()
  copyFileSync(CLE_ESSAI.signataires, join(dossier, FICHIER_SIGNATAIRES))
  const missions = join(mkdtempSync(join(tmpdir(), 'file-')), 'missions.git')
  git(tmpdir(), 'init', '-q', '--bare', '-b', 'main', missions)
  const l: Livraison = {
    depot,
    missions,
    installation: join(mkdtempSync(join(tmpdir(), 'installation-')), 'harnais'),
    intervalle_minutes: 15,
  }
  writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify(l))
  return { dossier, l }
}

/** Le client installé sur la version la plus récente du moment. */
function installe(p: PnpmSimule = {}) {
  const pr = produit()
  pr.version('v2026-10-14-1')
  const { dossier, l } = client(pr.nu)
  const { commande } = commandeSimulee(p)
  expect(preparer(dossier, l, ENV_ESSAI, [], commande)).toEqual({
    prete: { version: 'v2026-10-14-1', deja: false },
    refusees: [],
  })
  installerPremiere(l)
  return { pr, dossier, l }
}

const versionCourante = (l: Livraison) =>
  readFileSync(join(cible(l.installation, LIENS.courant) ?? '', FICHIER_VERSION), 'utf8').trim()

describe('préparer une version (L8, mesure du lot 4)', () => {
  it('la plus récente qui descend de la courante, vérifiée, installée à côté, pnpm check rejoué : prête ; ce qui tourne n’est pas touché', () => {
    const { pr, dossier, l } = installe()
    expect(versionCourante(l)).toBe('v2026-10-14-1')
    pr.version('v2026-10-15-1')
    pr.version('v2026-10-15-2')
    const { commande, emises } = commandeSimulee()
    const env = { ...ENV_ESSAI, SSH_AUTH_SOCK: '/tmp/agent.sock' }
    expect(preparer(dossier, l, env, [], commande)).toEqual({
      prete: { version: 'v2026-10-15-2', deja: false },
      refusees: [],
    })
    const arbre = join(l.installation, DOSSIER_VERSIONS, 'v2026-10-15-2')
    expect(cible(l.installation, LIENS.suivant)).toBe(realpathSync(arbre))
    expect(readFileSync(join(arbre, FICHIER_VERSION), 'utf8')).toBe('v2026-10-15-2\n')
    expect(readFileSync(join(arbre, 'geste.txt'), 'utf8')).toBe('v2026-10-15-2\n')
    expect(existsSync(join(arbre, FICHIER_PRETE))).toBe(true)
    // pnpm dans l'arbre de la version, sans la clé de l'agence ni l'agent SSH.
    const pnpm = emises.filter((x) => x.commande === 'pnpm')
    expect(pnpm.map((x) => [x.cwd, x.args[0]])).toEqual([
      [arbre, 'install'],
      [arbre, 'check'],
    ])
    expect(pnpm.flatMap((x) => x.variables ?? [])).not.toContain(VARIABLE_CLE_SIGNATURE)
    expect(pnpm.flatMap((x) => x.variables ?? [])).not.toContain('SSH_AUTH_SOCK')
    // Ce qui tourne : la courante, intacte.
    expect(versionCourante(l)).toBe('v2026-10-14-1')
    expect(preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)).toEqual({
      prete: { version: 'v2026-10-15-2', deja: true },
      refusees: [],
    })
  })

  it('signée d’une autre clé : refusée, son arbre jamais posé, la courante intacte ; une plus ancienne admise passe', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    pr.version('v2026-10-15-2', cleEssai('intrus').privee)
    const r = preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    expect(r.refusees.map((x) => x.version)).toEqual(['v2026-10-15-2'])
    expect(r.refusees[0]?.raison).toMatch(/signature refusée/)
    // L'intruse ne bloque pas la vraie, plus ancienne par son nom.
    expect(r.prete).toEqual({ version: 'v2026-10-15-1', deja: false })
    expect(existsSync(join(l.installation, DOSSIER_VERSIONS, 'v2026-10-15-2'))).toBe(false)
    expect(versionCourante(l)).toBe('v2026-10-14-1')
  })

  it('signée d’une autre clé, seule : refusée, rien n’attend, la courante intacte', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1', cleEssai('intrus').privee)
    const r = preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    expect(r.prete).toBeUndefined()
    expect(r.refusees[0]?.raison).toMatch(/signature refusée/)
    expect(existsSync(join(l.installation, DOSSIER_VERSIONS, 'v2026-10-15-1'))).toBe(false)
    expect(cible(l.installation, LIENS.suivant)).toBeUndefined()
    expect(versionCourante(l)).toBe('v2026-10-14-1')
  })

  it('d’une autre lignée (plus récente par son nom, partie d’avant la courante) : refusée', () => {
    const { pr, dossier, l } = installe()
    git(pr.agence, 'checkout', '-q', '--orphan', 'autre')
    // Une lignée sans rapport avec la courante, poussée sur une autre branche.
    writeFileSync(join(pr.agence, 'geste.txt'), 'autre\n')
    git(pr.agence, 'add', '-A')
    git(pr.agence, 'commit', '-q', '-m', 'autre')
    git(
      pr.agence,
      '-c',
      'gpg.format=ssh',
      '-c',
      `user.signingkey=${CLE_ESSAI.privee}`,
      'tag',
      '-s',
      '-m',
      'v2026-10-20-1',
      'v2026-10-20-1',
    )
    git(pr.agence, 'push', '-q', 'origin', 'HEAD:autre', 'refs/tags/v2026-10-20-1')
    expect(preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)).toEqual({
      refusees: [
        { version: 'v2026-10-20-1', raison: 'ne descend pas de v2026-10-14-1', definitif: true },
      ],
    })
  })

  it('pnpm check rouge dans la version : refusée, son arbre retiré', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    const r = preparer(dossier, l, ENV_ESSAI, [], commandeSimulee({ check: [1] }).commande)
    expect(r.prete).toBeUndefined()
    expect(r.refusees.map((x) => x.version)).toEqual(['v2026-10-15-1'])
    expect(r.refusees[0]?.raison).toMatch(/^pnpm check rouge/)
    expect(existsSync(join(l.installation, DOSSIER_VERSIONS, 'v2026-10-15-1'))).toBe(false)
    expect(cible(l.installation, LIENS.suivant)).toBeUndefined()
  })

  it('une version dont le redémarrage a échoué n’est jamais reprise', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    expect(preparer(dossier, l, ENV_ESSAI, ['v2026-10-15-1'], commandeSimulee().commande)).toEqual({
      refusees: [],
    })
  })

  it('élaguer : seules restent la courante, la précédente et celle qui attend', () => {
    const { pr, dossier, l } = installe()
    for (const v of ['v2026-10-15-1', 'v2026-10-15-2', 'v2026-10-15-3']) {
      pr.version(v)
      preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
      // La bascule à la main : précédente ← courante, courante ← suivante.
      lier(l.installation, LIENS.precedent, cible(l.installation, LIENS.courant) ?? '')
      lier(l.installation, LIENS.courant, cible(l.installation, LIENS.suivant) ?? '')
    }
    pr.version('v2026-10-16-1')
    preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    elaguer(l)
    expect(readdirSync(join(l.installation, DOSSIER_VERSIONS)).sort()).toEqual([
      'v2026-10-15-2',
      'v2026-10-15-3',
      'v2026-10-16-1',
    ])
  })
})

describe('le journal de la mise à jour (L8, L9)', () => {
  it('un refus définitif est dit une fois et jamais repris ; ce que le lanceur marque (bascule, retour arrière) est écrit puis ôté ; sans marque, rien', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1', cleEssai('intrus').privee)
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const lignes = () => s.journal.lire().filter((x) => x.type === TYPE_MISE_A_JOUR)
      rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, commandeSimulee().commande)
      rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, commandeSimulee().commande)
      expect(lignes().map((x) => [x.objet, x.issue])).toEqual([
        ['v2026-10-15-1', ISSUES_MISE_A_JOUR.refusee],
      ])
      // Un redémarrage ordinaire, ou la première installation : rien au journal.
      expect(noterLivraison(METIER_ESSAI, s, l, MAINTENANT)).toEqual([])
      marquerBascule(l.installation, { de: 'v2026-10-14-1', vers: 'v2026-10-15-2' })
      expect(noterLivraison(METIER_ESSAI, s, l, MAINTENANT)).toEqual(['faite (v2026-10-15-2)'])
      expect(noterLivraison(METIER_ESSAI, s, l, MAINTENANT)).toEqual([])
      marquerRetour(l.installation, {
        de: 'v2026-10-15-2',
        vers: 'v2026-10-14-1',
        raison: 'ne répond pas au redémarrage',
      })
      expect(noterLivraison(METIER_ESSAI, s, l, MAINTENANT)).toEqual([
        'retour arrière (v2026-10-15-2 → v2026-10-14-1)',
      ])
      expect(lignes().at(-1)).toMatchObject({
        objet: 'v2026-10-15-2',
        issue: ISSUES_MISE_A_JOUR.retour,
        motif: 'v2026-10-15-2 → v2026-10-14-1 : ne répond pas au redémarrage',
      })
      expect(existsSync(join(l.installation, FICHIER_RETOUR))).toBe(false)
      expect(existsSync(join(l.installation, FICHIER_BASCULE))).toBe(false)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })

  it('une panne (pnpm install rouge) est dite une fois par raison et se retente : la version passe dès que l’install passe', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const enPanne: Commande = (cwd, nom, args, env) =>
        nom === 'pnpm' && args[0] === 'install'
          ? { code: 1, sortie: '', erreur: 'ERR_PNPM_FETCH réseau injoignable' }
          : commandeSimulee().commande(cwd, nom, args, env)
      const a = rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, enPanne)
      expect(a.preparation?.refusees).toMatchObject([
        { version: 'v2026-10-15-1', definitif: false },
      ])
      rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, enPanne)
      expect(s.journal.lire().filter((x) => x.type === TYPE_MISE_A_JOUR)).toHaveLength(1)
      const b = rattraper(
        METIER_ESSAI,
        s,
        dossier,
        MAINTENANT,
        ENV_ESSAI,
        commandeSimulee().commande,
      )
      expect(b.preparation?.prete).toEqual({ version: 'v2026-10-15-1', deja: false })
      expect(l.installation).toBeTruthy()
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})

describe('les pannes et les gardes de la préparation (relecture du lot 4)', () => {
  it('un retour arrière à la main, pas encore au journal : la version n’est ni reprise ni touchée', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    basculer(l.installation)
    revenir(l.installation, 'v2026-10-15-1', 'v2026-10-14-1', 'retirée à la main')
    const arbre = realpathSync(join(l.installation, DOSSIER_VERSIONS, 'v2026-10-15-1'))
    writeFileSync(join(arbre, 'temoin'), 'là\n')
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const r = rattraper(
        METIER_ESSAI,
        s,
        dossier,
        MAINTENANT,
        ENV_ESSAI,
        commandeSimulee().commande,
      )
      expect(r.preparation).toEqual({ refusees: [] })
      expect(readFileSync(join(arbre, 'temoin'), 'utf8')).toBe('là\n')
      expect(cible(l.installation, LIENS.suivant)).toBeUndefined()
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })

  it('une autre préparation tient l’installation : rien n’est fait', () => {
    const { pr, dossier, l } = installe()
    pr.version('v2026-10-15-1')
    const rendre = verrouInstallation(l.installation)
    try {
      expect(preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)).toEqual({
        refusees: [],
        occupee: true,
      })
    } finally {
      rendre?.()
    }
    expect(preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande).prete?.version).toBe(
      'v2026-10-15-1',
    )
  })

  it('une étiquette qui n’est pas une version, réécrite, ne bloque rien ; une version réécrite est dite comme une panne ; sans signataires, de même', () => {
    const { pr, dossier, l } = installe()
    git(pr.agence, 'tag', 'travail')
    git(pr.agence, 'push', '-q', 'origin', 'refs/tags/travail')
    preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    git(pr.agence, 'commit', '-q', '--allow-empty', '-m', 'ailleurs')
    git(pr.agence, 'tag', '-f', 'travail')
    git(pr.agence, 'push', '-q', '-f', 'origin', 'refs/tags/travail')
    pr.version('v2026-10-15-1')
    expect(preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande).prete?.version).toBe(
      'v2026-10-15-1',
    )
    // La version, réécrite sous le même nom sur le produit : le fetch refuse, la panne est dite.
    git(pr.agence, 'commit', '-q', '--allow-empty', '-m', 'réécrite')
    git(
      pr.agence,
      '-c',
      'gpg.format=ssh',
      '-c',
      `user.signingkey=${CLE_ESSAI.privee}`,
      'tag',
      '-f',
      '-s',
      '-m',
      'x',
      'v2026-10-15-1',
    )
    git(pr.agence, 'push', '-q', '-f', 'origin', 'refs/tags/v2026-10-15-1')
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const r = rattraper(
        METIER_ESSAI,
        s,
        dossier,
        MAINTENANT,
        ENV_ESSAI,
        commandeSimulee().commande,
      )
      expect(r.erreur).toMatch(/v2026-10-15-1/)
      expect(s.journal.lire().filter((x) => x.type === TYPE_MISE_A_JOUR)).toEqual([])
      rmSync(join(dossier, FICHIER_SIGNATAIRES))
      expect(
        rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, commandeSimulee().commande)
          .erreur,
      ).toMatch(/signataires absent/)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})

describe('le dépôt du produit chez le client (audit de la livraison, 2026-10-16)', () => {
  it('seules ses versions se tirent, jamais ses branches ni ses autres étiquettes ; git sans invite, une connexion figée coupée ; une adresse changée est suivie', () => {
    const pr = produit()
    pr.version('v2026-10-14-1')
    // Le travail de l'agence, sur le produit : une branche, une étiquette de chantier.
    git(pr.agence, 'switch', '-q', '-c', 'travail')
    git(pr.agence, 'commit', '-q', '--allow-empty', '-m', 'travail en cours')
    git(pr.agence, 'tag', 'chantier/essai')
    git(pr.agence, 'push', '-q', 'origin', 'travail', 'refs/tags/chantier/essai')
    git(pr.agence, 'switch', '-q', 'main')
    const { dossier, l } = client(pr.nu)
    const envs: Record<string, string | undefined>[] = []
    const { commande } = commandeSimulee()
    const espion: Commande = (cwd, nom, args, env) => {
      if (nom === 'git' && args[0] === 'fetch') envs.push(env ?? {})
      return commande(cwd, nom, args, env)
    }
    expect(preparer(dossier, l, ENV_ESSAI, [], espion).prete?.version).toBe('v2026-10-14-1')
    installerPremiere(l)
    expect(git(join(l.installation, DOSSIER_DEPOT), 'for-each-ref', '--format=%(refname)')).toBe(
      'refs/tags/v2026-10-14-1',
    )
    expect(envs).toHaveLength(1)
    expect(envs[0]).toMatchObject({
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: expect.stringMatching(/BatchMode=yes.*ServerAliveInterval=/),
    })
    // Le produit déplacé : la version suivante n'est que sur la nouvelle adresse.
    const ailleurs = join(mkdtempSync(join(tmpdir(), 'produit-deplace-')), 'produit.git')
    git(tmpdir(), 'clone', '-q', '--mirror', pr.nu, ailleurs)
    git(pr.agence, 'remote', 'set-url', 'origin', ailleurs)
    pr.version('v2026-10-15-1')
    expect(
      preparer(dossier, { ...l, depot: ailleurs }, ENV_ESSAI, [], commandeSimulee().commande).prete
        ?.version,
    ).toBe('v2026-10-15-1')
  })
})

describe('le moment calme (L8)', () => {
  const calme = {
    lanceeParLeLanceur: true,
    relanceAttendue: true,
    requetesEnCours: 0,
    derniereActiviteMs: 0,
    maintenantMs: CALME_SECONDES * 1000 + 1,
    rattrapageEnCours: false,
  }
  it('seulement lancée par le lanceur, une relance attendue, aucune requête en cours ni récente, aucun rattrapage', () => {
    expect(doitRelancer(calme)).toBe(true)
    expect(doitRelancer({ ...calme, lanceeParLeLanceur: false })).toBe(false)
    expect(doitRelancer({ ...calme, relanceAttendue: false })).toBe(false)
    expect(doitRelancer({ ...calme, requetesEnCours: 1 })).toBe(false)
    expect(doitRelancer({ ...calme, rattrapageEnCours: true })).toBe(false)
    expect(doitRelancer({ ...calme, maintenantMs: CALME_SECONDES * 1000 })).toBe(false)
  })

  it('une relance est attendue quand une version est prête, ou quand le code qui tourne n’est plus la courante (un retrait à la main) ; sinon non', () => {
    const { pr, dossier, l } = installe()
    const v1 = cible(l.installation, LIENS.courant) ?? ''
    expect(relanceAttendue(l.installation, v1)).toBe(false)
    pr.version('v2026-10-15-1')
    preparer(dossier, l, ENV_ESSAI, [], commandeSimulee().commande)
    expect(relanceAttendue(l.installation, v1)).toBe(true)
    basculer(l.installation)
    const v2 = cible(l.installation, LIENS.courant) ?? ''
    expect(relanceAttendue(l.installation, v2)).toBe(false)
    retirerALaMain(l.installation)
    // L'interface tourne encore sur la version retirée : elle sort au calme, le lanceur la relance sur la précédente.
    expect(relanceAttendue(l.installation, v2)).toBe(true)
    expect(relanceAttendue(l.installation, v1)).toBe(false)
  })
})

describe('le pas de l’interface et le plancher des versions (audit de la livraison, 2026-10-16)', () => {
  it('à chaque pas, le dossier client ne s’ouvre que si le lanceur a laissé un marqueur', () => {
    const { dossier, l } = installe()
    let ouvertures = 0
    const m = {
      ...METIER_ESSAI,
      ouvrir: (d: string) => {
        ouvertures++
        return METIER_ESSAI.ouvrir(d)
      },
    }
    expect(noterSiMarque(m, dossier, l, MAINTENANT)).toEqual([])
    expect(ouvertures).toBe(0)
    marquerBascule(l.installation, { de: 'v2026-10-14-1', vers: 'v2026-10-15-1' })
    expect(noterSiMarque(m, dossier, l, MAINTENANT)).toEqual(['faite (v2026-10-15-1)'])
    expect(ouvertures).toBe(1)
  })

  it('une version signée qui échoue ici (check rouge) fait plancher : aucune plus ancienne ne se prépare après elle (le retrait qui échoue ne fait pas revenir le geste retiré) ; une plus récente, si', () => {
    const { pr, dossier } = installe()
    pr.version('v2026-10-15-1')
    pr.version('v2026-10-15-2')
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const rouge = rattraper(
        METIER_ESSAI,
        s,
        dossier,
        MAINTENANT,
        ENV_ESSAI,
        commandeSimulee({ check: [1] }).commande,
      )
      expect(rouge.preparation?.refusees).toMatchObject([
        { version: 'v2026-10-15-2', definitif: true, plancher: true },
      ])
      const ensuite = rattraper(
        METIER_ESSAI,
        s,
        dossier,
        MAINTENANT,
        ENV_ESSAI,
        commandeSimulee().commande,
      )
      expect(ensuite.preparation).toEqual({ refusees: [] })
      pr.version('v2026-10-16-1')
      expect(
        rattraper(METIER_ESSAI, s, dossier, MAINTENANT, ENV_ESSAI, commandeSimulee().commande)
          .preparation?.prete?.version,
      ).toBe('v2026-10-16-1')
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})
