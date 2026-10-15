import { randomBytes } from 'node:crypto'
import type { Temporal } from '../temps/temporal'

// L'identifiant d'une conversation : sa date, son heure, et quatre chiffres
// hexadécimaux au hasard. C'est l'objet de ses lignes au journal
// (PLAN-ESPACES.md § 5.5). Une échappée reçoit le sien, de la même forme,
// porté dans les `donnees` de ses lignes.

const deux = (n: number) => String(n).padStart(2, '0')

function id(prefixe: string, maintenant: Temporal.ZonedDateTime): string {
  const jour = `${maintenant.year}${deux(maintenant.month)}${deux(maintenant.day)}`
  const heure = `${deux(maintenant.hour)}${deux(maintenant.minute)}`
  return `${prefixe}-${jour}T${heure}-${randomBytes(2).toString('hex')}`
}

/** Un identifiant de conversation ou d'échappée, où qu'il soit écrit : ce que la mémoire de la nuit ne garde pas (PLAN-RONDE.md R10). */
export const MOTIF_ID_CONVERSATION = /\b[CE]-\d{8}T\d{4}-[0-9a-f]{4}\b/g

/** `C-20261010T2140-3fa2` */
export const idConversation = (maintenant: Temporal.ZonedDateTime) => id('C', maintenant)

/** `E-20261010T2140-3fa2` */
export const idEchappee = (maintenant: Temporal.ZonedDateTime) => id('E', maintenant)
