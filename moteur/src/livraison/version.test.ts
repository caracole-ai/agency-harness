import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { commandeSync } from '../chantier/arbre'
import {
  comparerVersions,
  etiquettesCandidates,
  lireVersion,
  preflightSignature,
  prochaineEtiquette,
  rendreManifeste,
  signerEtiquette,
  VARIABLE_CLE_SIGNATURE,
  verifierEtiquette,
} from './version'

// PLAN-LIVRAISON.md L4, L8 et la mesure du lot 2 : une étiquette signée par
// la clé de l'agence est admise ; signée d'une autre clé, non signée ou
// légère, refusée ; une étiquette qui ne descend pas de la version courante
// est refusée ; le message porte le manifeste. Avec de vraies clés SSH
// engendrées par `ssh-keygen` dans un dossier temporaire, et git pour de vrai.

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout.trim()
}

/** Une paire de clés ed25519 sans phrase de passe ; rend le chemin de la privée et la publique. */
function cle(dossier: string, nom: string): { privee: string; publique: string } {
  const privee = join(dossier, nom)
  const r = spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', nom, '-f', privee])
  if (r.status !== 0) throw new Error(`ssh-keygen : ${r.stderr}`)
  return { privee, publique: readFileSync(`${privee}.pub`, 'utf8').trim() }
}

/** Un dépôt d'un commit, la clé de l'agence et son fichier `signataires`, une autre clé. */
function essai() {
  const d = mkdtempSync(join(tmpdir(), 'version-'))
  const depot = join(d, 'depot')
  git(d, 'init', '-q', '-b', 'main', depot)
  git(depot, 'config', 'user.email', 'agence@exemple.invalid')
  git(depot, 'config', 'user.name', 'agence')
  git(depot, 'commit', '-q', '--allow-empty', '-m', 'A')
  const agence = cle(d, 'agence')
  const autre = cle(d, 'autre')
  const signataires = join(d, 'signataires')
  writeFileSync(signataires, `agence ${agence.publique}\n`)
  return { d, depot, agence, autre, signataires }
}

const signer = (depot: string, tag: string, cleSignature: string, commit = 'HEAD') =>
  signerEtiquette(
    commandeSync,
    depot,
    tag,
    git(depot, 'rev-parse', commit),
    `Version ${tag}\n`,
    cleSignature,
  )

describe('les étiquettes de version (L4)', () => {
  it('se lisent et s’ordonnent par jour, puis par rang (10 après 9)', () => {
    expect(lireVersion('v2026-10-15-12')).toEqual({ jour: '2026-10-15', rang: 12 })
    for (const t of ['v2026-10-15', 'v2026-10-15-0', 'chantier/x', 'v2026-10-15-1-rc'])
      expect(lireVersion(t)).toBeUndefined()
    expect(
      ['v2026-10-15-10', 'v2026-10-16-1', 'v2026-10-15-9', 'v2026-10-14-30'].sort(comparerVersions),
    ).toEqual(['v2026-10-14-30', 'v2026-10-15-9', 'v2026-10-15-10', 'v2026-10-16-1'])
  })

  it('la prochaine du jour : le plus haut rang du jour, plus un ; un jour neuf commence à 1', () => {
    const { depot, agence } = essai()
    expect(prochaineEtiquette(commandeSync, depot, '2026-10-15')).toBe('v2026-10-15-1')
    signer(depot, 'v2026-10-15-1', agence.privee)
    signer(depot, 'v2026-10-15-3', agence.privee)
    signer(depot, 'v2026-10-14-7', agence.privee)
    git(depot, 'tag', 'chantier/x')
    expect(prochaineEtiquette(commandeSync, depot, '2026-10-15')).toBe('v2026-10-15-4')
    expect(prochaineEtiquette(commandeSync, depot, '2026-10-16')).toBe('v2026-10-16-1')
  })
})

describe('la signature (L4, mesure du lot 2)', () => {
  it('signée par la clé de l’agence : admise ; d’une autre clé, non signée, légère, ou sans signataires : refusée', () => {
    const { d, depot, agence, autre, signataires } = essai()
    signer(depot, 'v2026-10-15-1', agence.privee)
    signer(depot, 'v2026-10-15-2', autre.privee)
    git(depot, 'tag', '-a', '-m', 'sans signature', 'v2026-10-15-3')
    git(depot, 'tag', 'v2026-10-15-4')
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-1', signataires)).toBeUndefined()
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-2', signataires)).toMatch(
      /signature refusée/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-3', signataires)).toMatch(
      /signature refusée/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-4', signataires)).toMatch(
      /signature refusée/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-1', join(d, 'absent'))).toMatch(
      /introuvable/,
    )
  })

  it('le message porte le manifeste en clair', () => {
    const { depot, agence } = essai()
    const commit = git(depot, 'rev-parse', 'HEAD')
    const message = rendreManifeste('v2026-10-15-1', {
      sorte: 'chantier',
      commit,
      chantier: 'remise_des_cles',
      client: 'client-fictif',
    })
    signerEtiquette(commandeSync, depot, 'v2026-10-15-1', commit, message, agence.privee)
    const objet = git(depot, 'cat-file', 'tag', 'v2026-10-15-1')
    expect(objet).toContain(
      [
        'Version v2026-10-15-1',
        '',
        'sorte: chantier',
        'chantier: remise_des_cles',
        'client: client-fictif',
        'geste: remise_des_cles (ajouté)',
        `commit: ${commit}`,
      ].join('\n'),
    )
    expect(objet).toContain('-----BEGIN SSH SIGNATURE-----')
    expect(rendreManifeste('v2026-10-15-2', { sorte: 'manuelle', commit })).toBe(
      `Version v2026-10-15-2\n\nsorte: manuelle\ncommit: ${commit}\n`,
    )
  })
})

describe('les candidates d’une mise à jour (L8, mesure du lot 2)', () => {
  it('les plus récentes qui descendent de la courante ; une autre lignée, refusée ; les plus anciennes, ignorées', () => {
    const { depot, agence } = essai()
    signer(depot, 'v2026-10-14-1', agence.privee)
    git(depot, 'commit', '-q', '--allow-empty', '-m', 'B')
    signer(depot, 'v2026-10-15-1', agence.privee)
    git(depot, 'commit', '-q', '--allow-empty', '-m', 'C')
    signer(depot, 'v2026-10-15-2', agence.privee)
    git(depot, 'commit', '-q', '--allow-empty', '-m', 'D')
    signer(depot, 'v2026-10-16-1', agence.privee)
    // Une autre lignée, partie d'avant la courante : plus récente par son nom, refusée.
    git(depot, 'checkout', '-q', '-b', 'autre', 'v2026-10-14-1')
    git(depot, 'commit', '-q', '--allow-empty', '-m', 'X')
    signer(depot, 'v2026-10-17-1', agence.privee)
    expect(etiquettesCandidates(commandeSync, depot, 'v2026-10-15-1')).toEqual({
      candidates: ['v2026-10-16-1', 'v2026-10-15-2'],
      refusees: ['v2026-10-17-1'],
    })
    expect(etiquettesCandidates(commandeSync, depot, 'v2026-10-16-1')).toEqual({
      candidates: [],
      refusees: ['v2026-10-17-1'],
    })
  })
})

describe('preflightSignature', () => {
  const ssh = (version: string) => () => ({
    code: 0,
    sortie: '',
    erreur: `${version}, LibreSSL 3.3.6\n`,
  })

  it('la clé exigée, lisible, hors du dépôt ; OpenSSH 8.2 au moins', () => {
    const { d, depot, agence } = essai()
    const env = { [VARIABLE_CLE_SIGNATURE]: agence.privee }
    expect(preflightSignature(env, depot, ssh('OpenSSH_10.2p1'))).toBe(agence.privee)
    expect(() => preflightSignature({}, depot, ssh('OpenSSH_10.2p1'))).toThrow(
      new RegExp(`${VARIABLE_CLE_SIGNATURE} absente`),
    )
    expect(() =>
      preflightSignature({ [VARIABLE_CLE_SIGNATURE]: join(d, 'nulle-part') }, depot),
    ).toThrow(/illisible/)
    const dedans = cle(depot, 'dans-le-depot')
    expect(() =>
      preflightSignature({ [VARIABLE_CLE_SIGNATURE]: dedans.privee }, depot, ssh('OpenSSH_10.2p1')),
    ).toThrow(/dans le dépôt/)
    expect(() => preflightSignature(env, depot, ssh('OpenSSH_8.1p1'))).toThrow(/8\.2 au moins/)
    expect(() =>
      preflightSignature(env, depot, () => ({ code: null, sortie: '', erreur: '' })),
    ).toThrow(/introuvable/)
    chmodSync(agence.privee, 0o000)
    try {
      expect(() => preflightSignature(env, depot, ssh('OpenSSH_10.2p1'))).toThrow(/illisible/)
    } finally {
      chmodSync(agence.privee, 0o600)
    }
  })
})
