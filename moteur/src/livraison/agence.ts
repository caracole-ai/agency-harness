import { join } from 'node:path'
import { type Agence, type Executer, executerSync, preflight } from '../agence/config'
import { type Commande, commandeSync, exclure, verifierBase } from '../chantier/arbre'
import { faireChantier } from '../chantier/chantier'
import type { Lancer } from '../chantier/claude'
import { retirerFusion } from '../chantier/fusion'
import { ecrireRetrait, missionFusionnee, nettoyer } from '../chantier/memoire'
import { lireStatut, type Statut, type StatutChantier, SUFFIXE_STATUT } from '../chantier/mission'
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
  publier,
  sortieAgence,
  statuerEnFile,
  statuerRetrait,
  statutPublic,
} from './missions'
import { poserVerrou, tenantDe } from './verrou'
import { preflightSignature } from './version'

// Un tour de `pnpm agence` (PLAN-LIVRAISON.md L1) : la file de chaque client
// tirée ; une mission d'un autre métier que son client, écartée (L10) ; à
// prendre, d'abord le client qui a eu le moins de chantiers aujourd'hui, puis
// la plus ancienne (date, client, identifiant) ; au-delà de la borne du
// jour, elle attend le lendemain et son statut le dit ; sinon le préflight
// (le binaire connecté, la clé de signature, `origin` joignable), le statut
// `en cours` poussé, le chantier, qui écrit son dossier et son statut
// complets à l'agence ; la file ne reçoit que le statut public (le statut,
// sa version, son coût, jamais le texte du chantier), poussé. Une mission à
// la fois : le verrou garde la boucle seule.

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

  // Avant tout statut : un préflight qui échoue, ou un `origin` injoignable, laissent la mission
  // à prendre au tour suivant : rien n'est écrit, la borne du jour n'est pas entamée.
  preflight('claude', o.agence, o.env, executer)
  preflightSignature(o.env, o.racine, executer)
  verifierBase(c, o.racine)
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
  // Le chantier écrit son dossier et son statut complets à l'agence (`sortieAgence`) ; la file ne
  // reçoit que le statut public : son texte (une sortie de pnpm check, un texte de modèle, un
  // chemin de l'agence) ne part jamais chez le client.
  let fin: Statut
  try {
    const sortie = sortieAgence(o.racine, x)
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
        cout_usd: 0,
        le,
      }
    } else {
      const ecrit = lireStatut(join(sortie, `${x.mission.id}${SUFFIXE_STATUT}`))
      if (!ecrit) throw new Error('le chantier n’a écrit aucun statut')
      fin = ecrit
    }
  } catch (erreur) {
    fin = { statut: 'échoué', issue: message(erreur), cout_usd: 0, le }
  }
  ecrireEnFile(o.racine, x, statutPublic(fin))
  pousser(fin.statut)
  tour.prise = { mission: nomEnFile(x), statut: fin.statut, issue: fin.issue }
  return tour
}

/**
 * `pnpm chantier retirer <id>` (G2, L7) : la fusion défaite sur `main` du
 * distant et sa version signée (`retirerFusion`), la mémoire du retrait (le
 * client, le titre et les intentions que garde la mémoire de la fusion),
 * puis le statut `retiré` dans la file du client qui l'avait commandée. Le
 * motif est nettoyé une fois (contre les noms des clients fictifs, seuls
 * connus ici) : le même part dans le commit du retrait (que tous les clients
 * tirent avec la version), dans la mémoire et dans le statut.
 */
export function retirerMission(o: {
  racine: string
  agence: Agence
  id: string
  motif: string
  personnes: Designable[]
  /** La clé privée de l'agence (`preflightSignature`). */
  cle: string
  maintenant: Temporal.ZonedDateTime
  commande?: Commande
}): {
  revert: string
  version: string
  motif: string
  client?: string
  dit: ReturnType<typeof statuerRetrait>
} {
  const c = o.commande ?? commandeSync
  const motif = nettoyer(o.motif, o.personnes)
  const jour = o.maintenant.toPlainDate().toString()
  let client: string | undefined
  const r = retirerFusion({
    commande: c,
    racine: o.racine,
    id: o.id,
    motif,
    version: { cle: o.cle, jour },
    ecrireRetrait: (arbre) => {
      const fusion = missionFusionnee(arbre, o.id)
      if (!fusion) throw new Error(`aucune fusion de ${o.id} dans la mémoire d'origin/main`)
      client = fusion.client
      ecrireRetrait(
        arbre,
        {
          date: jour,
          client: fusion.client,
          id: o.id,
          titre: fusion.titre,
          intentions: fusion.intentions,
          motif,
        },
        o.personnes,
      )
    },
  })
  const dit =
    client === undefined
      ? { sorte: 'absent' as const }
      : statuerRetrait(c, o.racine, o.agence.agence.clients, client, o.id, {
          statut: 'retiré',
          issue: `retiré : ${motif}`,
          version: r.version,
          cout_usd: 0,
          le: o.maintenant.toInstant().toString(),
        })
  return { ...r, motif, ...(client ? { client } : {}), dit }
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
