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
export const PAUSE_PLANTAGE_MS = 5000
/** Au plus tant de plantages par fenêtre, puis arrêt. */
export const PLANTAGES_MAX = 3
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
  const revenirDe = (b: { de: string; vers: string }, raison: string) => {
    const fait = sousVerrou(o.installation, () => {
      revenir(o.installation, b.vers, b.de, raison)
      return true
    })
    if (fait === undefined) {
      // Une préparation tient l'installation : on attend qu'elle la rende.
      return false
    }
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
      // Des plantages dans la fenêtre qui suit une bascule : la version nouvelle est en cause, on revient.
      if (
        bascule &&
        t - basculeLe <= FENETRE_PLANTAGES_MS &&
        revenirDe(bascule, `${plantages.length} sorties après la bascule`)
      ) {
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
