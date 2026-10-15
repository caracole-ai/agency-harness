import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Agence, type Executer, executerSync, preflight } from '../agence/config'
import { type Commande, commandeSync, exclure } from '../chantier/arbre'
import { faireChantier } from '../chantier/chantier'
import type { Lancer } from '../chantier/claude'
import { lireStatut, type StatutChantier, SUFFIXE_STATUT } from '../chantier/mission'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  aPrendre,
  chantiersDuJour,
  cloneAgence,
  DOSSIER_FILES,
  FICHIER_VERROU,
  lireFile,
  type MissionEnFile,
  nomEnFile,
  publier,
  sortieEnFile,
  statuerEnFile,
} from './missions'
import { preflightSignature } from './version'

// Un tour de `pnpm agence` (PLAN-LIVRAISON.md L1) : la file de chaque client
// tirée ; une mission d'un autre métier que son client, écartée (L10) ; la
// plus ancienne à prendre (date, client, identifiant) ; au-delà de la borne
// du jour, elle attend le lendemain et son statut le dit ; sinon le
// préflight (le binaire connecté, la clé de signature), le statut `en cours`
// poussé, le chantier, qui écrit son dossier et son statut final dans la
// file, poussés. Une mission à la fois : le verrou garde la boucle seule.

export interface OptionsAgence {
  /** Le dépôt de l'agence (L2). */
  racine: string
  agence: Agence
  env: Record<string, string | undefined>
  maintenant?: Temporal.ZonedDateTime
  /** Le métier d'une mission, par son nom ; les noms qu'elle ne doit pas citer. */
  metier: (nom: string) => Promise<MetierConversation<unknown>>
  personnes: (metier: string) => Promise<Designable[]>
  /** Les tests simulent pnpm, le binaire du chantier, le préflight. */
  commande?: Commande
  lancer?: Lancer
  executer?: Executer
}

export interface TourAgence {
  /** La mission prise, et ce qu'elle est devenue. */
  prise?: { mission: string; statut: StatutChantier; issue: string }
  /** La mission qui attend la borne du lendemain. */
  attente?: string
  /** Les missions écartées sans chantier (un autre métier que leur client). */
  ecartees: string[]
  /** Ce qui, dans les files, n'a pas été lu ou tiré. */
  problemes: string[]
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300)

export async function tourAgence(o: OptionsAgence): Promise<TourAgence> {
  const c = o.commande ?? commandeSync
  const executer = o.executer ?? executerSync
  const maintenant = o.maintenant ?? Temporal.Now.zonedDateTimeISO(FUSEAU)
  const le = maintenant.toInstant().toString()
  const jour = maintenant.toPlainDate().toString()
  const tour: TourAgence = { ecartees: [], problemes: [] }

  const toutes: MissionEnFile[] = []
  for (const client of o.agence.agence.clients) {
    try {
      const f = lireFile(c, o.racine, client)
      toutes.push(...f.missions)
      tour.problemes.push(...f.problemes)
    } catch (erreur) {
      tour.problemes.push(`${client.slug} : file illisible (${message(erreur)})`)
    }
  }

  // L10 : un geste est du métier de son client ; une mission qui en nomme un autre ne se code pas.
  const prenables: MissionEnFile[] = []
  for (const x of aPrendre(toutes)) {
    if (x.mission.metier === x.client.metier) {
      prenables.push(x)
      continue
    }
    statuerEnFile(c, o.racine, x, {
      statut: 'écartée',
      issue: `mission du métier ${x.mission.metier}, client du métier ${x.client.metier}`,
      cout_usd: 0,
      le,
    })
    tour.ecartees.push(nomEnFile(x))
  }
  const x = prenables[0]
  if (!x) return tour

  const borne = o.agence.agence.chantiers_max_par_jour
  if (chantiersDuJour(toutes, jour) >= borne) {
    if (x.statut?.statut !== 'en attente') {
      statuerEnFile(c, o.racine, x, {
        statut: 'en attente',
        issue: `borne du jour atteinte (${borne} chantiers) : demain`,
        cout_usd: 0,
        le,
      })
    }
    tour.attente = nomEnFile(x)
    return tour
  }

  // Avant tout statut : un préflight qui échoue laisse la mission à prendre, rien n'est écrit.
  preflight('claude', o.agence, o.env, executer)
  preflightSignature(o.env, o.racine, executer)
  statuerEnFile(c, o.racine, x, { statut: 'en cours', issue: 'chantier en cours', cout_usd: 0, le })
  let fin: { statut: StatutChantier; issue: string }
  try {
    const r = await faireChantier(await o.metier(x.mission.metier), {
      racine: o.racine,
      agence: o.agence,
      mission: x.chemin,
      client: x.client.slug,
      personnes: await o.personnes(x.mission.metier),
      sortie: sortieEnFile(o.racine, x),
      env: o.env,
      maintenant,
      commande: c,
      executer,
      ...(o.lancer ? { lancer: o.lancer } : {}),
    })
    if (r.sorte === 'deja_tentee') {
      fin = {
        statut: 'échoué',
        issue: `déjà tentée : la branche chantier/${x.mission.id} existe (pnpm chantier --refaire, à la main)`,
      }
      statuerEnFile(c, o.racine, x, { ...fin, cout_usd: 0, le })
    } else {
      // Le chantier a écrit son statut final et son dossier dans la file : les pousser tels quels.
      const ecrit = lireStatut(join(sortieEnFile(o.racine, x), `${x.mission.id}${SUFFIXE_STATUT}`))
      if (!ecrit) throw new Error('le chantier n’a écrit aucun statut')
      fin = { statut: ecrit.statut, issue: ecrit.issue }
      publier(c, cloneAgence(o.racine, x.client.slug), `Chantier ${x.mission.id} : ${fin.statut}`)
    }
  } catch (erreur) {
    fin = { statut: 'échoué', issue: message(erreur) }
    statuerEnFile(c, o.racine, x, { ...fin, cout_usd: 0, le })
  }
  tour.prise = { mission: nomEnFile(x), ...fin }
  return tour
}

/** Le verrou de `pnpm agence` : le pid de qui tourne ; un verrou dont le pid est mort est levé. Rend de quoi le rendre. */
export function prendreVerrou(c: Commande, racine: string): () => void {
  exclure(c, racine, DOSSIER_FILES)
  const dossier = join(racine, DOSSIER_FILES)
  const chemin = join(dossier, FICHIER_VERROU)
  if (existsSync(chemin)) {
    const pid = Number(readFileSync(chemin, 'utf8').trim())
    if (Number.isInteger(pid) && pid > 0 && vivant(pid)) {
      throw new Error(`pnpm agence tourne déjà (pid ${pid}, ${chemin})`)
    }
  }
  mkdirSync(dossier, { recursive: true })
  writeFileSync(chemin, `${process.pid}\n`)
  return () => rmSync(chemin, { force: true })
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
