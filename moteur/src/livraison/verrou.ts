import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// Un verrou par fichier (PLAN-LIVRAISON.md L1, L8) : le pid de qui le tient,
// posé d'un seul geste (`wx`) ; un verrou dont le pid est mort est levé.
// Rend de quoi le rendre, ou undefined s'il est tenu.

export function poserVerrou(chemin: string): (() => void) | undefined {
  mkdirSync(dirname(chemin), { recursive: true })
  if (existsSync(chemin)) {
    const pid = Number(readFileSync(chemin, 'utf8').trim())
    if (Number.isInteger(pid) && pid > 0 && vivant(pid)) return undefined
    rmSync(chemin, { force: true })
  }
  try {
    writeFileSync(chemin, `${process.pid}\n`, { flag: 'wx' })
  } catch {
    // Posé à l'instant par un autre.
    return undefined
  }
  return () => rmSync(chemin, { force: true })
}

/** Le pid de qui tient le verrou, s'il en est un. */
export const tenantDe = (chemin: string): string | undefined =>
  existsSync(chemin) ? readFileSync(chemin, 'utf8').trim() : undefined

function vivant(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (erreur) {
    // EPERM : le processus existe, il n'est pas à nous.
    return (erreur as NodeJS.ErrnoException).code === 'EPERM'
  }
}
