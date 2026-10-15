import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { uptime } from 'node:os'
import { dirname } from 'node:path'

// Un verrou par fichier (PLAN-LIVRAISON.md L1, L8) : le pid de qui le tient,
// posé d'un seul geste (`wx`) ; un verrou dont le pid est mort est levé, de
// même qu'un verrou posé avant le démarrage de la machine (son pid a pu être
// repris par un autre processus). Rend de quoi le rendre, ou undefined s'il
// est tenu.

/** Un verrou vide (posé à l'instant, son pid pas encore écrit) est tenu pendant ce délai, puis tenu pour mort. */
const POSE_MS = 10_000

export function poserVerrou(chemin: string): (() => void) | undefined {
  mkdirSync(dirname(chemin), { recursive: true })
  if (tenu(chemin)) return undefined
  rmSync(chemin, { force: true })
  try {
    writeFileSync(chemin, `${process.pid}\n`, { flag: 'wx' })
  } catch {
    // Posé à l'instant par un autre.
    return undefined
  }
  return () => rmSync(chemin, { force: true })
}

/** Le pid de qui tient le verrou, s'il en est un. */
export function tenantDe(chemin: string): string | undefined {
  try {
    return readFileSync(chemin, 'utf8').trim()
  } catch {
    return undefined
  }
}

/** Le verrou est-il tenu : un pid vivant, posé depuis le démarrage de la machine ; vide, s'il vient d'être posé. */
function tenu(chemin: string): boolean {
  let contenu: string
  let pose: number
  try {
    contenu = readFileSync(chemin, 'utf8').trim()
    pose = statSync(chemin).mtimeMs
  } catch {
    // Absent, ou rendu entre-temps.
    return false
  }
  if (pose < Date.now() - uptime() * 1000) return false
  const pid = Number(contenu)
  if (!Number.isInteger(pid) || pid <= 0) return Date.now() - pose < POSE_MS
  return vivant(pid)
}

function vivant(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (erreur) {
    // EPERM : le processus existe, il n'est pas à nous.
    return (erreur as NodeJS.ErrnoException).code === 'EPERM'
  }
}
