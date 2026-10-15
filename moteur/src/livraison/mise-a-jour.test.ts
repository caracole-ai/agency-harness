import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
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
import {
  cible,
  DOSSIER_VERSIONS,
  elaguer,
  FICHIER_PRETE,
  FICHIER_VERSION,
  ISSUES_MISE_A_JOUR,
  installerPremiere,
  LIENS,
  lier,
  marquerRetour,
  noterDemarrage,
  preparer,
  rattraper,
  TYPE_MISE_A_JOUR,
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
    expect(preparer(dossier, l, ENV_ESSAI, [], commande)).toEqual({
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
      refusees: [{ version: 'v2026-10-20-1', raison: 'ne descend pas de v2026-10-14-1' }],
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
  it('une version refusée est dite une fois et jamais reprise ; au démarrage, une version nouvelle est « faite » une fois ; un retour arrière se dit et le marqueur s’ôte', () => {
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
      expect(noterDemarrage(METIER_ESSAI, s, l, 'v2026-10-14-1', MAINTENANT)).toBe('faite')
      expect(noterDemarrage(METIER_ESSAI, s, l, 'v2026-10-14-1', MAINTENANT)).toBeUndefined()
      marquerRetour(l.installation, {
        de: 'v2026-10-15-2',
        vers: 'v2026-10-14-1',
        raison: 'ne répond pas au redémarrage',
      })
      expect(noterDemarrage(METIER_ESSAI, s, l, 'v2026-10-14-1', MAINTENANT)).toBe(
        ISSUES_MISE_A_JOUR.retour,
      )
      expect(lignes().at(-1)).toMatchObject({
        objet: 'v2026-10-15-2',
        issue: ISSUES_MISE_A_JOUR.retour,
        motif: 'v2026-10-15-2 → v2026-10-14-1 : ne répond pas au redémarrage',
      })
      expect(existsSync(join(l.installation, 'retour-arriere.yaml'))).toBe(false)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})
