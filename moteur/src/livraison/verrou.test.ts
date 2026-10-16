import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { demarrage, poserVerrou, tenantDe } from './verrou'

// Le verrou à pid de `pnpm agence` et de l'installation d'un client
// (PLAN-LIVRAISON.md L1, L8 ; audit de la livraison, 2026-10-16) : un pid
// vivant le tient ; un verrou d'un autre démarrage de la machine, ou resté
// vide, ne bloque pas pour toujours ; l'horloge n'y est pour rien.

const chemin = () => join(mkdtempSync(join(tmpdir(), 'verrou-')), 'x.lock')

describe('le verrou à pid', () => {
  it('un pid vivant le tient, même daté d’avant le démarrage (une horloge recalée) ; posé lors d’un autre démarrage, il est levé (son pid a pu être repris)', () => {
    expect(demarrage()).toBeTruthy()
    const c = chemin()
    writeFileSync(c, `${process.pid} ${demarrage()}\n`)
    utimesSync(c, 0, 0)
    expect(poserVerrou(c)).toBeUndefined()
    // L'ancienne forme (le pid seul) : tenue tant que le pid vit.
    writeFileSync(c, `${process.pid}\n`)
    expect(poserVerrou(c)).toBeUndefined()
    writeFileSync(c, `${process.pid} un-autre-demarrage\n`)
    const rendre = poserVerrou(c)
    expect(rendre).toBeTypeOf('function')
    expect(tenantDe(c)).toBe(String(process.pid))
    rendre?.()
    expect(tenantDe(c)).toBeUndefined()
  })

  it('vide, posé à l’instant (son contenu pas encore écrit) : tenu ; vide depuis longtemps : levé', () => {
    const c = chemin()
    writeFileSync(c, '')
    expect(poserVerrou(c)).toBeUndefined()
    const ilYa = (Date.now() - 60_000) / 1000
    utimesSync(c, ilYa, ilYa)
    expect(poserVerrou(c)).toBeTypeOf('function')
  })
})
