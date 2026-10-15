import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import type { Journal, Ligne } from '../journal/journal'
import { FUSEAU, Temporal } from '../temps/temporal'
import { DOSSIER_GESTES } from './geste-appris'

// La purge des instantanés d'échappée (`echappees/<id>.json`), que la nuit
// fait chaque jour : un instantané ne sert plus qu'au rejeu des tests d'un
// geste appris qui le cite ; les autres s'effacent passé le délai de
// conservation (PLAN-PROMOTION.md § 4.5, gardé après le retrait de la
// promotion automatique).

/** Les `donnees` d'une ligne, lues comme un objet (vide si absentes ou d'une autre forme). */
function donneesDe(l: Ligne): Record<string, unknown> {
  if (!l.donnees) return {}
  const d: unknown = JSON.parse(l.donnees)
  return typeof d === 'object' && d !== null && !Array.isArray(d)
    ? (d as Record<string, unknown>)
    : {}
}

/** Le jour d'un horodatage, en heure de Paris. */
const jourDe = (horodatage: string) =>
  Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU).toPlainDate()

/** Les instantanés que les tests des gestes appris du dossier (`gestes/*.yaml`) citent : ils restent tant que le geste existe. */
function instantanesCites(dossierClient: string): Set<string> {
  const dossier = join(dossierClient, DOSSIER_GESTES)
  const cites = new Set<string>()
  if (!existsSync(dossier)) return cites
  for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.yaml'))) {
    const geste: unknown = parse(readFileSync(join(dossier, fichier), 'utf8'))
    const tests = (geste as { tests?: unknown } | null)?.tests
    if (!Array.isArray(tests)) continue
    for (const t of tests) {
      const i = (t as { instantane?: unknown } | null)?.instantane
      if (typeof i === 'string') cites.add(i)
    }
  }
  return cites
}

/**
 * Supprime les instantanés (`echappees/<id>.json`) des échappées d'avant
 * `avant` (exclu) qu'aucun geste appris ne cite, et rend leurs chemins. Les
 * dates sont celles du journal ; un fichier que le journal ne connaît pas
 * n'est pas touché.
 */
export function purgerInstantanes(
  dossierClient: string,
  journal: Journal,
  avant: Temporal.PlainDate,
): string[] {
  const cites = instantanesCites(dossierClient)
  const supprimes = new Set<string>()
  for (const l of journal.lire()) {
    if (l.type !== TYPE_ECHAPPEE) continue
    const { instantane } = donneesDe(l)
    if (typeof instantane !== 'string' || cites.has(instantane) || supprimes.has(instantane)) {
      continue
    }
    if (Temporal.PlainDate.compare(jourDe(l.horodatage), avant) >= 0) continue
    const absolu = join(dossierClient, instantane)
    if (!existsSync(absolu)) continue
    rmSync(absolu)
    supprimes.add(instantane)
  }
  return [...supprimes]
}
