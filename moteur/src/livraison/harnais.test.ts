import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  argumentsInterface,
  basculer,
  FENETRE_PLANTAGES_MS,
  harnais,
  type Lance,
  retirerALaMain,
  sonderInterface,
} from './harnais'
import {
  CODE_RELANCE,
  cible,
  DOSSIER_VERSIONS,
  FICHIER_BASCULE,
  FICHIER_PRETE,
  FICHIER_RETOUR,
  FICHIER_VERSION,
  LIENS,
  lier,
  verrouInstallation,
} from './mise-a-jour'

// PLAN-LIVRAISON.md L9 et la mesure du lot 4 : le lanceur, l'interface
// remplacée par une commande injectée. Bascule sur une sortie `CODE_RELANCE`
// et une version prête ; sonde muette ou sortie au redémarrage : retour
// arrière et marqueur ; trois plantages en dix minutes : arrêt.

/** Une installation : `courant` → v1, et v2 prête (`courant.suivant`). */
function installation(): string {
  const d = join(mkdtempSync(join(tmpdir(), 'harnais-')), 'installation')
  for (const v of ['v2026-10-14-1', 'v2026-10-15-1']) {
    const arbre = join(d, DOSSIER_VERSIONS, v)
    mkdirSync(arbre, { recursive: true })
    writeFileSync(join(arbre, FICHIER_VERSION), `${v}\n`)
    writeFileSync(join(arbre, FICHIER_PRETE), '')
  }
  lier(d, LIENS.courant, join(d, DOSSIER_VERSIONS, 'v2026-10-14-1'))
  lier(d, LIENS.suivant, join(d, DOSSIER_VERSIONS, 'v2026-10-15-1'))
  return d
}

/** Une interface jouée : chaque lancement rend, dans l'ordre, un code de sortie (ou `vit` : elle tourne jusqu'à ce qu'on l'arrête). */
function interfaces(codes: (number | 'vit')[]) {
  const lancees: string[] = []
  const lancer = (arbre: string): Lance => {
    lancees.push(arbre)
    const code = codes[lancees.length - 1] ?? 1
    let finir: (c: number | null) => void = () => undefined
    const fin = new Promise<number | null>((r) => {
      finir = r
    })
    if (code !== 'vit') setTimeout(() => finir(code), 0)
    return { fin, arreter: () => finir(143) }
  }
  return { lancer, lancees }
}

const versionDe = (d: string, lien: string) =>
  readFileSync(join(cible(d, lien) ?? '', FICHIER_VERSION), 'utf8').trim()

describe('le lanceur (L9)', () => {
  it('bascule sur CODE_RELANCE et une version prête, la sonde répond (le marqueur de la bascule) ; trois plantages juste après : retour arrière ; trois encore : arrêt', async () => {
    const d = installation()
    const { lancer, lancees } = interfaces([CODE_RELANCE, 1, 1, 1, 1, 1, 1])
    let t = 0
    const arret = await harnais({
      installation: d,
      lancer,
      sonder: async () => true,
      attendre: async () => undefined,
      maintenant: () => (t += 1000),
    })
    expect(arret.raison).toMatch(/^3 sorties en 10 min/)
    expect(parse(readFileSync(join(d, FICHIER_BASCULE), 'utf8'))).toEqual({
      de: 'v2026-10-14-1',
      vers: 'v2026-10-15-1',
    })
    expect(parse(readFileSync(join(d, FICHIER_RETOUR), 'utf8'))).toEqual({
      de: 'v2026-10-15-1',
      vers: 'v2026-10-14-1',
      raison: '3 sorties après la bascule',
    })
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(cible(d, LIENS.suivant)).toBeUndefined()
    expect(lancees.map((a) => a.split('/').at(-1))).toEqual([
      'v2026-10-14-1',
      'v2026-10-15-1',
      'v2026-10-15-1',
      'v2026-10-15-1',
      'v2026-10-14-1',
      'v2026-10-14-1',
      'v2026-10-14-1',
    ])
  })

  it('une préparation tient l’installation au moment de basculer : relance sans basculer', async () => {
    const d = installation()
    const rendre = verrouInstallation(d)
    const { lancer, lancees } = interfaces([CODE_RELANCE, 1, 1, 1])
    try {
      await harnais({
        installation: d,
        lancer,
        sonder: async () => true,
        attendre: async () => undefined,
        maintenant: () => 0,
      })
    } finally {
      rendre?.()
    }
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(lancees.every((a) => a.endsWith('v2026-10-14-1'))).toBe(true)
    expect(cible(d, LIENS.suivant)).toBeDefined()
  })

  it('la sonde ne répond pas au redémarrage : retour arrière sur la précédente, le marqueur pour le journal', async () => {
    const d = installation()
    const { lancer, lancees } = interfaces([CODE_RELANCE, 'vit', 1, 1, 1])
    const arret = await harnais({
      installation: d,
      lancer,
      sonder: async () => false,
      attendre: async () => undefined,
      maintenant: () => 0,
    })
    expect(arret.raison).toMatch(/sorties/)
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(lancees.map((a) => a.split('/').at(-1)).slice(0, 3)).toEqual([
      'v2026-10-14-1',
      'v2026-10-15-1',
      'v2026-10-14-1',
    ])
    expect(parse(readFileSync(join(d, FICHIER_RETOUR), 'utf8'))).toEqual({
      de: 'v2026-10-15-1',
      vers: 'v2026-10-14-1',
      raison: 'ne répond pas au redémarrage',
    })
  })

  it('l’interface sort pendant la sonde : retour arrière, « sortie au redémarrage »', async () => {
    const d = installation()
    const { lancer } = interfaces([CODE_RELANCE, 1, 1, 1, 1])
    await harnais({
      installation: d,
      lancer,
      sonder: () => new Promise(() => undefined),
      attendre: async () => undefined,
      maintenant: () => 0,
    })
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(parse(readFileSync(join(d, FICHIER_RETOUR), 'utf8')).raison).toBe(
      'sortie au redémarrage',
    )
  })

  it('des plantages espacés de plus de dix minutes ne l’arrêtent pas', async () => {
    const d = installation()
    const { lancer, lancees } = interfaces([1, 1, 1, 1, 1, 1])
    let t = 0
    const arret = await harnais({
      installation: d,
      lancer,
      sonder: async () => true,
      attendre: async () => undefined,
      maintenant: () => {
        // Trois plantages à plus de dix minutes l'un de l'autre (aucun arrêt), puis deux d'affilée.
        t += lancees.length <= 3 ? FENETRE_PLANTAGES_MS + 1 : 1
        return t
      },
    })
    expect(arret.raison).toMatch(/^3 sorties/)
    expect(lancees).toHaveLength(5)
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
  })

  it('CODE_RELANCE avec une version suivante qui n’est pas prête : relance sans basculer', async () => {
    const d = installation()
    rmSync(join(d, DOSSIER_VERSIONS, 'v2026-10-15-1', FICHIER_PRETE))
    const { lancer, lancees } = interfaces([CODE_RELANCE, 1, 1, 1])
    await harnais({
      installation: d,
      lancer,
      sonder: async () => true,
      attendre: async () => undefined,
      maintenant: () => 0,
    })
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(lancees.every((a) => a.endsWith('v2026-10-14-1'))).toBe(true)
    expect(cible(d, LIENS.precedent)).toBeUndefined()
  })

  it('trois plantages juste après la bascule pendant qu’une préparation tient l’installation : le lanceur attend le verrou et revient en arrière, jamais un arrêt sur la nouvelle version', async () => {
    const d = installation()
    const x = interfaces([CODE_RELANCE, 1, 1, 1])
    let rendre: (() => void) | undefined
    const lancer = (arbre: string) => {
      const lance = x.lancer(arbre)
      // La quatrième interface (le troisième plantage) : une préparation prend l'installation.
      if (x.lancees.length === 4) rendre = verrouInstallation(d)
      return lance
    }
    let t = 0
    const dits: string[] = []
    const arret = await harnais({
      installation: d,
      lancer,
      sonder: async () => true,
      attendre: async () => {
        rendre?.()
        rendre = undefined
      },
      maintenant: () => (t += 1000),
      dire: (m) => dits.push(m),
    })
    // L'attente se dit, une fois, avec le pid de qui tient l'installation.
    expect(dits.filter((m) => m.startsWith('retour arrière en attente'))).toEqual([
      `retour arrière en attente : une préparation tient l’installation (pid ${process.pid})`,
    ])
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(parse(readFileSync(join(d, FICHIER_RETOUR), 'utf8'))).toEqual({
      de: 'v2026-10-15-1',
      vers: 'v2026-10-14-1',
      raison: '3 sorties après la bascule',
    })
    expect(arret.raison).toMatch(/^3 sorties/)
  })

  it('retirer à la main : la courante revient à la précédente, le marqueur pour le journal ; un second retrait est refusé (rien à retirer)', () => {
    const d = installation()
    basculer(d)
    expect(retirerALaMain(d)).toEqual({ de: 'v2026-10-15-1', vers: 'v2026-10-14-1' })
    expect(versionDe(d, LIENS.courant)).toBe('v2026-10-14-1')
    expect(parse(readFileSync(join(d, FICHIER_RETOUR), 'utf8'))).toMatchObject({
      raison: 'retirée à la main',
    })
    expect(() => retirerALaMain(d)).toThrow(/déjà la version précédente/)
  })

  it('l’interface lancée écoute toujours là où la sonde la cherche : le dossier et le port du lanceur l’emportent sur des options passées après --', () => {
    const args = argumentsInterface('/clients/a', '3777', [
      '--port',
      '3801',
      '--client',
      '/ailleurs',
      '--modele',
      'simule',
    ])
    expect(args[0]).toBe('interface')
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        client: { type: 'string' },
        port: { type: 'string' },
        modele: { type: 'string' },
      },
    })
    expect(values).toEqual({ client: '/clients/a', port: '3777', modele: 'simule' })
  })

  it('la sonde compte ses essais, pas l’heure : une réponse au quatrième essai passe ; aucune en cinq essais : muette', async () => {
    let appels = 0
    const repondAuQuatrieme = (async () => {
      appels++
      if (appels < 4) throw new Error('ECONNREFUSED')
      return new Response('[]', { status: 200 })
    }) as unknown as typeof fetch
    const options = { essais: 5, pasMs: 1000, delaiMs: 5000, attendre: async () => undefined }
    const url = 'http://127.0.0.1:1/api/roles'
    expect(await sonderInterface(url, { ...options, requete: repondAuQuatrieme })).toBe(true)
    expect(appels).toBe(4)
    let muets = 0
    const muette = (async () => {
      muets++
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch
    expect(await sonderInterface(url, { ...options, requete: muette })).toBe(false)
    expect(muets).toBe(5)
  })
})
