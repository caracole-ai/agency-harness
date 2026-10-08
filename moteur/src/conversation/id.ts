import { randomBytes } from 'node:crypto'
import type { Temporal } from '../temps/temporal'

// L'identifiant d'une conversation : sa date, son heure, et quatre chiffres
// hexadécimaux au hasard. C'est l'objet de ses lignes au journal
// (PLAN-ESPACES.md § 5.5).

const deux = (n: number) => String(n).padStart(2, '0')

/** `C-20261010T2140-3fa2` */
export function idConversation(maintenant: Temporal.ZonedDateTime): string {
  const jour = `${maintenant.year}${deux(maintenant.month)}${deux(maintenant.day)}`
  const heure = `${deux(maintenant.hour)}${deux(maintenant.minute)}`
  return `C-${jour}T${heure}-${randomBytes(2).toString('hex')}`
}
