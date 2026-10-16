import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// Un verrou par fichier (PLAN-LIVRAISON.md L1, L8) : le pid de qui le tient
// et le démarrage de la machine où il l'a posé, d'un seul geste (`wx`). Un
// verrou dont le pid est mort est levé, de même qu'un verrou posé lors d'un
// autre démarrage (son pid a pu être repris par un autre processus), sans
// rien demander à l'horloge (une horloge recalée ne lève pas un verrou
// vivant). Rend de quoi le rendre, ou undefined s'il est tenu.

/** Un verrou vide (posé à l'instant, son contenu pas encore écrit) est tenu pendant ce délai, puis tenu pour mort. */
const POSE_MS = 10_000

let demarrageLu: string | undefined | null = null

/** L'identifiant du démarrage de la machine (Linux : `boot_id` ; macOS : `kern.bootsessionuuid`), ou undefined s'il ne se lit pas. */
export function demarrage(): string | undefined {
  if (demarrageLu !== null) return demarrageLu
  let id: string | undefined
  try {
    id = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() || undefined
  } catch {
    const r = spawnSync('sysctl', ['-n', 'kern.bootsessionuuid'], { encoding: 'utf8' })
    id = r.status === 0 ? r.stdout.trim() || undefined : undefined
  }
  demarrageLu = id
  return id
}

export function poserVerrou(chemin: string): (() => void) | undefined {
  mkdirSync(dirname(chemin), { recursive: true })
  if (tenu(chemin)) return undefined
  rmSync(chemin, { force: true })
  try {
    writeFileSync(chemin, `${process.pid} ${demarrage() ?? '-'}\n`, { flag: 'wx' })
  } catch {
    // Posé à l'instant par un autre.
    return undefined
  }
  return () => rmSync(chemin, { force: true })
}

/** Le pid de qui tient le verrou, s'il en est un. */
export function tenantDe(chemin: string): string | undefined {
  try {
    return readFileSync(chemin, 'utf8').trim().split(/\s+/)[0] || undefined
  } catch {
    return undefined
  }
}

/** Le verrou est-il tenu : un pid vivant, posé lors de ce démarrage de la machine ; vide, s'il vient d'être posé. */
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
  const [pidTexte = '', depuis] = contenu.split(/\s+/)
  const pid = Number(pidTexte)
  if (!Number.isInteger(pid) || pid <= 0) return Date.now() - pose < POSE_MS
  const ici = demarrage()
  if (depuis && depuis !== '-' && ici && depuis !== ici) return false
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
