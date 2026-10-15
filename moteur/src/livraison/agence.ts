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
  ecrireEnFile,
  FICHIER_VERROU,
  lireFile,
  type MissionEnFile,
  nomEnFile,
  noterChantier,
  preparerSortie,
  publier,
  statuerEnFile,
} from './missions'
import { poserVerrou, tenantDe } from './verrou'
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

  const { total, parClient } = chantiersDuJour(o.racine, jour)
  // L10 : un geste est du métier de son client ; une mission qui en nomme un autre ne se code pas.
  const prenables: MissionEnFile[] = []
  for (const x of aPrendre(toutes, parClient)) {
    if (x.mission.date > jour) {
      tour.problemes.push(`${nomEnFile(x)} : datée de demain ou après (${x.mission.date}), laissée`)
      continue
    }
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
  if (total >= borne) {
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
  const clone = cloneAgence(o.racine, x.client.slug)
  /** Pousse la file ; un échec n'efface rien : ce qui est commis part au tour suivant. */
  const pousser = (quoi: string) => {
    try {
      publier(c, clone, `Chantier ${x.mission.id} : ${quoi}`)
    } catch (erreur) {
      tour.problemes.push(
        `${nomEnFile(x)} : ${quoi} non poussé (${message(erreur)}) ; au tour suivant`,
      )
    }
  }
  noterChantier(o.racine, jour, x.client.slug, x.mission.id)
  ecrireEnFile(o.racine, x, { statut: 'en cours', issue: 'chantier en cours', cout_usd: 0, le })
  pousser('en cours')
  let fin: { statut: StatutChantier; issue: string }
  try {
    const sortie = preparerSortie(o.racine, x)
    const r = await faireChantier(await o.metier(x.mission.metier), {
      racine: o.racine,
      agence: o.agence,
      mission: x.chemin,
      client: x.client.slug,
      personnes: await o.personnes(x.mission.metier),
      sortie,
      env: o.env,
      maintenant,
      commande: c,
      executer,
      ...(o.lancer ? { lancer: o.lancer } : {}),
    })
    if (r.sorte === 'deja_tentee') {
      fin = {
        statut: 'échoué',
        issue: `une branche chantier/${x.mission.id} existe déjà à l'agence (cette mission, ou une autre du même nom, peut-être d'un autre client) : à trancher à la main`,
      }
      ecrireEnFile(o.racine, x, { ...fin, cout_usd: 0, le })
    } else {
      // Le chantier a écrit son statut final et son dossier dans la file.
      const ecrit = lireStatut(join(sortie, `${x.mission.id}${SUFFIXE_STATUT}`))
      if (!ecrit) throw new Error('le chantier n’a écrit aucun statut')
      fin = { statut: ecrit.statut, issue: ecrit.issue }
    }
  } catch (erreur) {
    fin = { statut: 'échoué', issue: message(erreur) }
    ecrireEnFile(o.racine, x, { ...fin, cout_usd: 0, le })
  }
  pousser(fin.statut)
  tour.prise = { mission: nomEnFile(x), ...fin }
  return tour
}

/** Le verrou de `pnpm agence` : le pid de qui tourne, posé d'un seul geste ; un verrou dont le pid est mort est levé. Rend de quoi le rendre. */
export function prendreVerrou(c: Commande, racine: string): () => void {
  exclure(c, racine, DOSSIER_FILES)
  const chemin = join(racine, DOSSIER_FILES, FICHIER_VERROU)
  const rendre = poserVerrou(chemin)
  if (!rendre)
    throw new Error(`pnpm agence tourne déjà (pid ${tenantDe(chemin) ?? '?'}, ${chemin})`)
  return rendre
}
