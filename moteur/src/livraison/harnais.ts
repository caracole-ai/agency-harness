import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  CODE_RELANCE,
  cible,
  FICHIER_PRETE,
  LIENS,
  lier,
  marquerBascule,
  marquerRetour,
  tenantInstallation,
  verrouInstallation,
  versionDeLArbre,
} from './mise-a-jour'

// Le lanceur du client (PLAN-LIVRAISON.md L9), minuscule et bête pour n'avoir
// jamais à se mettre à jour lui-même : il lance l'interface depuis `courant`,
// attend sa sortie. Sortie `CODE_RELANCE` et une version prête : `precedent ←
// courant`, `courant ← courant.suivant`, relance, sonde ; la sonde échoue ou
// l'interface sort : `courant ← precedent`, le marqueur du retour arrière
// (l'interface le dira au journal), relance ; la sonde répond : le marqueur
// de la bascule (« faite », au journal). Toute autre sortie : relance après
// une pause ; trois en dix minutes juste après une bascule : retour arrière ;
// sinon arrêt (un humain). Bascule et retour se font sous le verrou de
// l'installation (jamais pendant une préparation). Il ne charge aucun métier
// et n'écrit aucun journal.

/** Un processus de l'interface lancé : sa fin (le code de sortie) et de quoi l'arrêter. */
export interface Lance {
  fin: Promise<number | null>
  arreter: () => void
}

export interface OptionsHarnais {
  installation: string
  /** Lance l'interface depuis cet arbre de version. */
  lancer: (arbre: string) => Lance
  /** Rend vrai si l'interface répond (`POST /api/roles`) dans le délai. */
  sonder: () => Promise<boolean>
  attendre: (ms: number) => Promise<void>
  /** L'heure, en millisecondes : les plantages se comptent par fenêtre. */
  maintenant: () => number
  dire?: (message: string) => void
}

/** Après un plantage, la pause avant de relancer. */
const PAUSE_PLANTAGE_MS = 5000
/** Au plus tant de plantages par fenêtre, puis arrêt. */
const PLANTAGES_MAX = 3
export const FENETRE_PLANTAGES_MS = 10 * 60 * 1000

/** Ce qui arrête le lanceur : trop de plantages, ou aucune version courante. */
export type ArretHarnais = { raison: string }

/**
 * La bascule (L9) : `precedent ← courant`, `courant ← courant.suivant`, le
 * lien suivant ôté ; rend les deux versions. Lève s'il n'y a rien à basculer.
 */
export function basculer(installation: string): { de: string; vers: string } {
  const courant = cible(installation, LIENS.courant)
  const suivant = cible(installation, LIENS.suivant)
  if (!courant || !suivant || !existsSync(join(suivant, FICHIER_PRETE))) {
    throw new Error('aucune version prête à basculer')
  }
  lier(installation, LIENS.precedent, courant)
  lier(installation, LIENS.courant, suivant)
  rmSync(join(installation, LIENS.suivant), { force: true })
  return {
    de: versionDeLArbre(courant) ?? courant,
    vers: versionDeLArbre(suivant) ?? suivant,
  }
}

/** Le retour arrière : `courant ← precedent`, et le marqueur pour le journal. */
export function revenir(installation: string, de: string, vers: string, raison: string): void {
  const precedent = cible(installation, LIENS.precedent)
  if (!precedent) throw new Error('aucune version précédente où revenir')
  lier(installation, LIENS.courant, precedent)
  marquerRetour(installation, { de, vers, raison })
}

/**
 * `pnpm mise-a-jour retirer` : revenir à la version précédente à la main,
 * sous le verrou de l'installation, avec le marqueur pour le journal ;
 * l'interface qui tourne encore sur la version retirée sort au calme et le
 * lanceur la relance sur la précédente (`relanceAttendue`). Lève sans
 * version précédente, si la courante l'est déjà (un second retrait), ou si
 * une préparation tient l'installation. Rend les deux versions.
 */
export function retirerALaMain(installation: string): { de: string; vers: string } {
  const de = versionDeLArbre(cible(installation, LIENS.courant))
  const vers = versionDeLArbre(cible(installation, LIENS.precedent))
  if (!de || !vers) throw new Error('aucune version précédente où revenir')
  if (de === vers) throw new Error(`${de} est déjà la version précédente : rien à retirer`)
  const fait = sousVerrou(installation, () => {
    revenir(installation, de, vers, 'retirée à la main')
    return true
  })
  if (!fait) throw new Error('une préparation tient l’installation : réessayer dans un instant')
  return { de, vers }
}

/**
 * Les arguments de `pnpm interface` que le lanceur lance : les options
 * passées après `--`, puis le dossier client et le port du lanceur en
 * dernier (`parseArgs` garde la dernière valeur) : l'interface écoute
 * toujours là où la sonde la cherche.
 */
export const argumentsInterface = (dossier: string, port: string, options: string[]): string[] => [
  'interface',
  ...options,
  '--client',
  dossier,
  '--port',
  port,
]

/**
 * La sonde du lanceur après une bascule (L9) : `POST` sur cette adresse
 * jusqu'à une réponse, au plus `essais` fois, `pasMs` entre deux, chaque
 * appel borné à `delaiMs`. Des essais comptés, pas une heure murale : une
 * mise en veille de la machine pendant la sonde ne fait pas un échec (et ne
 * fait pas exclure une version saine).
 */
export async function sonderInterface(
  url: string,
  o: {
    essais: number
    pasMs: number
    delaiMs: number
    attendre: (ms: number) => Promise<void>
    requete?: typeof fetch
  },
): Promise<boolean> {
  const requete = o.requete ?? fetch
  for (let i = 0; i < o.essais; i++) {
    try {
      const r = await requete(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(o.delaiMs),
      })
      if (r.ok) return true
    } catch {
      // Pas encore à l'écoute.
    }
    await o.attendre(o.pasMs)
  }
  return false
}

/** `f` sous le verrou de l'installation ; undefined s'il est tenu (une préparation en cours). */
function sousVerrou<T>(installation: string, f: () => T): T | undefined {
  const rendre = verrouInstallation(installation)
  if (!rendre) return undefined
  try {
    return f()
  } finally {
    rendre()
  }
}

export async function harnais(o: OptionsHarnais): Promise<ArretHarnais> {
  const dire = o.dire ?? (() => undefined)
  let plantages: number[] = []
  let sonder = false
  /** La bascule en cours de sonde, puis celle qui tourne, et son heure : des plantages dans la fenêtre qui la suit la font défaire. */
  let bascule: { de: string; vers: string } | undefined
  let basculeLe = 0
  let attenteDite = false
  const revenirDe = (b: { de: string; vers: string }, raison: string) => {
    const fait = sousVerrou(o.installation, () => {
      revenir(o.installation, b.vers, b.de, raison)
      return true
    })
    if (fait === undefined) {
      // Une préparation tient l'installation : on attend qu'elle la rende, et on le dit une fois.
      if (!attenteDite) {
        dire(
          `retour arrière en attente : une préparation tient l’installation (pid ${tenantInstallation(o.installation) ?? '?'})`,
        )
        attenteDite = true
      }
      return false
    }
    attenteDite = false
    dire(`retour arrière : ${b.vers} → ${b.de} (${raison})`)
    return true
  }
  for (;;) {
    const arbre = cible(o.installation, LIENS.courant)
    if (!arbre) return { raison: `aucune version courante dans ${o.installation}` }
    const lance = o.lancer(arbre)
    if (sonder && bascule) {
      const b = bascule
      sonder = false
      // La sonde contre la fin du processus : qui arrive d'abord.
      const issue = await Promise.race([
        o.sonder().then((ok) => (ok ? 'repond' : 'muet')),
        lance.fin.then(() => 'sorti' as const),
      ])
      if (issue !== 'repond') {
        lance.arreter()
        await lance.fin
        const raison = issue === 'sorti' ? 'sortie au redémarrage' : 'ne répond pas au redémarrage'
        while (!revenirDe(b, raison)) await o.attendre(PAUSE_PLANTAGE_MS)
        bascule = undefined
        continue
      }
      marquerBascule(o.installation, b)
      dire(`version ${b.vers} en service`)
    }
    const code = await lance.fin
    if (code === CODE_RELANCE && cible(o.installation, LIENS.suivant)) {
      const faite = sousVerrou(o.installation, () => {
        try {
          return basculer(o.installation)
        } catch (erreur) {
          dire(`relance sans bascule : ${(erreur as Error).message}`)
          return null
        }
      })
      if (faite) {
        bascule = faite
        basculeLe = o.maintenant()
        sonder = true
        plantages = []
        dire(`bascule : ${faite.de} → ${faite.vers}`)
      } else if (faite === undefined) {
        dire('relance sans bascule : une préparation tient l’installation')
      }
      continue
    }
    if (code === CODE_RELANCE) continue
    const t = o.maintenant()
    plantages.push(t)
    plantages = plantages.filter((x) => x >= t - FENETRE_PLANTAGES_MS)
    if (plantages.length >= PLANTAGES_MAX) {
      // Des plantages dans la fenêtre qui suit une bascule : la version nouvelle est en cause, on
      // revient, quitte à attendre qu'une préparation rende l'installation (jamais un arrêt sur elle).
      if (bascule && t - basculeLe <= FENETRE_PLANTAGES_MS) {
        const raison = `${plantages.length} sorties après la bascule`
        while (!revenirDe(bascule, raison)) await o.attendre(PAUSE_PLANTAGE_MS)
        bascule = undefined
        plantages = []
        continue
      }
      return {
        raison: `${plantages.length} sorties en ${FENETRE_PLANTAGES_MS / 60000} min (dernière : code ${code}) : arrêt, un humain`,
      }
    }
    dire(`l'interface est sortie (code ${code}) : relance dans ${PAUSE_PLANTAGE_MS / 1000} s`)
    await o.attendre(PAUSE_PLANTAGE_MS)
  }
}
