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
  verifierParLaCle,
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

  it('toujours après la plus récente : un chantier commencé avant minuit, une horloge en retard', () => {
    const { depot, agence } = essai()
    signer(depot, 'v2026-10-16-1', agence.privee)
    expect(prochaineEtiquette(commandeSync, depot, '2026-10-15')).toBe('v2026-10-16-2')
    expect(prochaineEtiquette(commandeSync, depot, '2026-10-17')).toBe('v2026-10-17-1')
  })

  it('une signature qui échoue ne dit pas le chemin de la clé (le message peut partir dans un statut)', () => {
    const { depot, agence } = essai()
    signer(depot, 'v2026-10-15-1', agence.privee)
    expect(() => signer(depot, 'v2026-10-15-1', agence.privee)).toThrow(
      /signature de v2026-10-15-1 refusée/,
    )
    try {
      signer(depot, 'v2026-10-15-1', agence.privee)
    } catch (erreur) {
      expect((erreur as Error).message).not.toContain(agence.privee)
    }
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
      /pas une signature SSH/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-4', signataires)).toMatch(
      /pas une étiquette annotée/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-1', join(d, 'absent'))).toMatch(
      /introuvable/,
    )
  })

  it('une ref renommée vers une version signée plus ancienne : refusée (le nom signé n’est pas le sien)', () => {
    const { depot, agence, signataires } = essai()
    signer(depot, 'v2026-10-15-1', agence.privee)
    git(
      depot,
      'update-ref',
      'refs/tags/v2099-01-01-1',
      git(depot, 'rev-parse', 'refs/tags/v2026-10-15-1'),
    )
    expect(verifierEtiquette(commandeSync, depot, 'v2099-01-01-1', signataires)).toMatch(
      /s'appelle v2026-10-15-1/,
    )
    expect(verifierEtiquette(commandeSync, depot, 'chantier/x', signataires)).toMatch(
      /pas une étiquette de version/,
    )
  })

  it.skipIf(spawnSync('gpg', ['--version']).status !== 0)(
    'une signature OpenPGP d’une clé du trousseau de la machine : refusée, seule une signature SSH compte',
    () => {
      const { d, depot, signataires } = essai()
      const gnupg = mkdtempSync(join(tmpdir(), 'gpg-'))
      const env = { ...process.env, GNUPGHOME: gnupg }
      const gpg = (...args: string[]) =>
        spawnSync('gpg', ['--batch', ...args], { env, encoding: 'utf8' })
      expect(
        gpg(
          '--passphrase',
          '',
          '--quick-gen-key',
          'Autre <autre@exemple.invalid>',
          'ed25519',
          'sign',
          'never',
        ).status,
      ).toBe(0)
      const r = spawnSync(
        'git',
        [
          '-c',
          'user.signingkey=autre@exemple.invalid',
          'tag',
          '-s',
          '-m',
          'Version',
          'v2026-10-15-1',
        ],
        { cwd: depot, env, encoding: 'utf8' },
      )
      expect(r.status, r.stderr).toBe(0)
      // Le trousseau visible de la vérification, comme celui d'une machine cliente qui en aurait un.
      const avant = process.env.GNUPGHOME
      process.env.GNUPGHOME = gnupg
      try {
        expect(verifierEtiquette(commandeSync, depot, 'v2026-10-15-1', signataires)).toMatch(
          /pas une signature SSH/,
        )
      } finally {
        if (avant === undefined) delete process.env.GNUPGHOME
        else process.env.GNUPGHOME = avant
        spawnSync('gpgconf', ['--kill', 'gpg-agent'], { env })
      }
      expect(d).toBeTruthy()
    },
  )

  it('le message porte le manifeste en clair', () => {
    const { depot, agence } = essai()
    const commit = git(depot, 'rev-parse', 'HEAD')
    const message = rendreManifeste('v2026-10-15-1', {
      sorte: 'chantier',
      commit,
      chantier: 'securite-privee/remise_des_cles',
      geste: 'remise_des_cles',
      metier: 'securite-privee',
    })
    signerEtiquette(commandeSync, depot, 'v2026-10-15-1', commit, message, agence.privee)
    const objet = git(depot, 'cat-file', 'tag', 'v2026-10-15-1')
    expect(objet).toContain(
      [
        'Version v2026-10-15-1',
        '',
        'sorte: chantier',
        'chantier: securite-privee/remise_des_cles',
        'metier: securite-privee',
        'geste: remise_des_cles (ajouté)',
        `commit: ${commit}`,
      ].join('\n'),
    )
    // Tous les clients lisent le manifeste : il nomme le métier, jamais un client (décidé le 2026-10-20).
    expect(objet).not.toMatch(/^client:/m)
    expect(objet).toContain('-----BEGIN SSH SIGNATURE-----')
    expect(rendreManifeste('v2026-10-15-2', { sorte: 'manuelle', commit })).toBe(
      `Version v2026-10-15-2\n\nsorte: manuelle\ncommit: ${commit}\n`,
    )
  })
})

describe('à l’agence, la signature se vérifie par la seule clé privée (décidé le 2026-10-20)', () => {
  it('signée par la clé : admise ; d’une autre clé : refusée ; une clé illisible : refusée sans dire son chemin', () => {
    const { d, depot, agence, autre } = essai()
    signer(depot, 'v2026-10-15-1', agence.privee)
    signer(depot, 'v2026-10-15-2', autre.privee)
    expect(verifierParLaCle(commandeSync, depot, 'v2026-10-15-1', agence.privee)).toBeUndefined()
    expect(verifierParLaCle(commandeSync, depot, 'v2026-10-15-2', agence.privee)).toMatch(
      /signature refusée/,
    )
    const absente = join(d, 'absente')
    const raison = verifierParLaCle(commandeSync, depot, 'v2026-10-15-1', absente)
    expect(raison).toMatch(/ssh-keygen -y/)
    expect(raison).not.toContain(absente)
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
