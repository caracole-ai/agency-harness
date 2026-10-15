import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { poserVerrou, tenantDe } from './verrou'

// Le verrou à pid de `pnpm agence` et de l'installation d'un client
// (PLAN-LIVRAISON.md L1, L8 ; audit de la livraison, 2026-10-16) : un pid
// vivant le tient ; un verrou d'avant le démarrage de la machine, ou resté
// vide, ne bloque pas pour toujours.

const chemin = () => join(mkdtempSync(join(tmpdir(), 'verrou-')), 'x.lock')

describe('le verrou à pid', () => {
  it('un pid vivant le tient ; posé avant le démarrage de la machine, il est levé (son pid a pu être repris par un autre processus)', () => {
    const c = chemin()
    writeFileSync(c, `${process.pid}\n`)
    expect(poserVerrou(c)).toBeUndefined()
    utimesSync(c, 0, 0)
    const rendre = poserVerrou(c)
    expect(rendre).toBeTypeOf('function')
    expect(tenantDe(c)).toBe(String(process.pid))
    rendre?.()
    expect(tenantDe(c)).toBeUndefined()
  })

  it('vide, posé à l’instant (son pid pas encore écrit) : tenu ; vide depuis longtemps : levé', () => {
    const c = chemin()
    writeFileSync(c, '')
    expect(poserVerrou(c)).toBeUndefined()
    const ilYa = (Date.now() - 60_000) / 1000
    utimesSync(c, ilYa, ilYa)
    expect(poserVerrou(c)).toBeTypeOf('function')
  })
})
