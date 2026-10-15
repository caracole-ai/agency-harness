import { FORMAT_INTENTION } from '../conversation/actions'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { type Identite, IdentiteSchema } from '../conversation/roles'
import type { Demande } from '../conversation/traduire'
import type { Journal, Ligne } from '../journal/journal'
import { FUSEAU, Temporal } from '../temps/temporal'

// Les demandes sans geste et leur commande (REFLEXIONS.md, décidé le
// 2026-10-15) : ce que l'outil n'a pas su faire (les lignes `consigne` /
// `nouvelle` du journal), groupé par intention pour que le patron voie ce qui
// revient ; et sa commande, « Créer ce geste », une ligne au journal, sans
// modèle. Le geste se construit ensuite comme tout code, et un humain l'active.
// Aucune devinette : pas de seuil, pas de fabrication ; le patron décide.

/** Un refus de commande : la demande ne peut pas être satisfaite telle quelle (un 400 dans l'interface). */
export class ErreurCommande extends Error {}

export const TYPE_GESTE_COMMANDE = 'geste commandé'
/** Combien de résumés distincts une demande sans geste montre, du plus récent au plus ancien. */
export const EXEMPLES_MAX = 3

/** L'issue d'une ligne `consigne` qui a fini en demande nouvelle. */
const NOUVELLE: Demande['sorte'] = 'nouvelle'

export interface DemandeSansGeste {
  intention: string
  compte: number
  /** Les derniers résumés distincts (la demande reformulée par le modèle), du plus récent au plus ancien. */
  exemples: string[]
  /** Le jour de la dernière demande, `AAAA-MM-JJ` en heure de Paris. */
  derniere: string
  /** La commande déjà passée par le patron, s'il y en a une. */
  commande?: { par: Identite; le: string }
}

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
  Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU).toPlainDate().toString()

/** Les commandes passées, par intention : la dernière ligne `geste commandé` de chacune. */
function commandesDe(lignes: Ligne[]): Map<string, { par: Identite; le: string }> {
  const commandes = new Map<string, { par: Identite; le: string }>()
  for (const l of lignes) {
    if (l.type !== TYPE_GESTE_COMMANDE || l.objet === null) continue
    const par = IdentiteSchema.safeParse(donneesDe(l).par)
    if (!par.success) continue
    commandes.set(l.objet, { par: par.data, le: jourDe(l.horodatage) })
  }
  return commandes
}

/**
 * Les demandes sans geste d'un journal : les lignes `consigne` finies en
 * `nouvelle`, groupées par intention, les plus fréquentes d'abord (puis par
 * nom). Une ligne sans intention lisible ne compte pas ; une `inconnue` non
 * plus (elle n'a pas de résumé et mêle les échecs techniques).
 */
export function demandesSansGeste(lignes: Ligne[]): DemandeSansGeste[] {
  const groupes = new Map<string, { compte: number; exemples: string[]; derniere: string }>()
  for (const l of lignes) {
    if (l.type !== TYPE_CONSIGNE || l.issue !== NOUVELLE) continue
    const demande = donneesDe(l).demande
    if (typeof demande !== 'object' || demande === null) continue
    const { intention, resume } = demande as { intention?: unknown; resume?: unknown }
    if (typeof intention !== 'string' || !FORMAT_INTENTION.test(intention)) continue
    const g = groupes.get(intention) ?? { compte: 0, exemples: [], derniere: '' }
    g.compte += 1
    g.derniere = jourDe(l.horodatage)
    if (typeof resume === 'string' && resume.trim() !== '') {
      g.exemples = [resume, ...g.exemples.filter((e) => e !== resume)]
    }
    groupes.set(intention, g)
  }
  const commandes = commandesDe(lignes)
  return [...groupes.entries()]
    .map(([intention, g]) => {
      const commande = commandes.get(intention)
      return {
        intention,
        compte: g.compte,
        exemples: g.exemples.slice(0, EXEMPLES_MAX),
        derniere: g.derniere,
        ...(commande ? { commande } : {}),
      }
    })
    .sort((a, b) => b.compte - a.compte || a.intention.localeCompare(b.intention))
}

/** La demande sans geste qu'une commande vise ; lève si l'intention est mal formée, sans demande, ou déjà commandée. */
export function demandeACommander(lignes: Ligne[], intention: string): DemandeSansGeste {
  if (!FORMAT_INTENTION.test(intention)) {
    throw new ErreurCommande('intention attendue : le mot-clé de la demande, en snake_case')
  }
  const demande = demandesSansGeste(lignes).find((d) => d.intention === intention)
  if (!demande) throw new ErreurCommande(`${intention} : aucune demande sans geste sous ce mot`)
  if (demande.commande) {
    throw new ErreurCommande(`${intention} : déjà commandé le ${demande.commande.le}`)
  }
  return demande
}

/**
 * Le patron commande le geste d'une intention : une ligne `geste commandé`
 * (l'intention en objet, le dernier résumé en motif, qui et les exemples en
 * données), sans modèle. Refuse une intention mal formée, sans demande, ou
 * déjà commandée. `par` est l'identité vérifiée, jamais un champ reçu.
 */
export function commanderGeste(
  journal: Journal,
  client: string,
  intention: string,
  par: Identite,
  maintenant: Temporal.ZonedDateTime,
): { intention: string; le: string } {
  const demande = demandeACommander(journal.lire(), intention)
  journal.ecrire(
    [
      {
        type: TYPE_GESTE_COMMANDE,
        client,
        objet: intention,
        motif: demande.exemples[0] ?? intention,
        donnees: { par, exemples: demande.exemples, compte: demande.compte },
      },
    ],
    maintenant.toInstant().toString(),
  )
  return { intention, le: maintenant.toPlainDate().toString() }
}
