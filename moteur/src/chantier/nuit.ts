import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { z } from 'zod'
import { type Agence, cheminDepotNuit, type Executer } from '../agence/config'
import type { MetierConversation } from '../conversation/conversation'
import { FUSEAU, jourDe, Temporal } from '../temps/temporal'
import { brancheExiste, type Commande, commandeSync, remettreAOrigine } from './arbre'
import { faireChantier, type IssueChantier, TYPE_CHANTIER } from './chantier'
import type { Lancer } from './claude'
import { publierMemoire } from './fusion'
import { ajouterMesure, lireMesures } from './memoire'
import { DOSSIER_MISSIONS, lireMission, STATUTS_MISSION } from './mission'

// La nuit (PLAN-RONDE.md § 7, R8, R11 ; PLAN-GENERAL.md G3) : le clone de la
// nuit remis à `origin/main` (avant tout appel, propre ou rien), puis le
// chantier de la première mission commandée
// non traitée, tant que `missions_max_par_nuit` n'est pas atteint ; la ligne
// de la nuit (`MESURES.md`) commise et poussée depuis le clone. Aucun modèle
// ne cherche ce qui manque : seul le patron commande (REFLEXIONS.md,
// 2026-10-15). Une étape qui échoue n'arrête pas les suivantes ; chaque étape
// dit son issue. Idempotente : une mission déjà tentée ne se refait pas, la
// ligne de mesure n'est pas doublée.

/** Ce que les missions d'une nuit peuvent devenir, pour le choix du chantier. */
const A_TENTER: string[] = [STATUTS_MISSION.a_faire]

export interface OptionsNuit {
  racine: string
  agence: Agence
  dossierClient: string
  date: Temporal.PlainDate
  env: Record<string, string | undefined>
  /** Les tests simulent git et pnpm, le binaire du chantier, le préflight. */
  commande?: Commande
  lancer?: Lancer
  executer?: Executer
}

export interface Etapenuit {
  etape: 'clone' | 'chantier' | 'mémoire'
  ok: boolean
  issue: string
}

export interface IssueNuit {
  etapes: Etapenuit[]
  chantiers: IssueChantier[]
}

/** Les missions commandées chez le client, de la plus ancienne à la plus récente. */
function missionsDuClient(dossierClient: string): string[] {
  const racine = join(dossierClient, DOSSIER_MISSIONS)
  if (!existsSync(racine)) return []
  return readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .flatMap((date) =>
      readdirSync(join(racine, date))
        .filter((f) => f.endsWith('.yaml'))
        .sort()
        .map((f) => join(racine, date, f)),
    )
}

/** Les chantiers tentés pour de vrai à cette date : les lignes `chantier` du journal qui ont coûté un appel (une décision sans appel n'a pas de coût estimé). */
function dejaTentees<S>(m: MetierConversation<S>, dossierClient: string, date: string): number {
  const s = m.ouvrir(dossierClient)
  try {
    return m
      .journal(s)
      .lire()
      .filter(
        (l) =>
          l.type === TYPE_CHANTIER &&
          l.donnees !== null &&
          z.looseObject({ cout_estime: z.literal(true) }).safeParse(JSON.parse(l.donnees))
            .success &&
          jourDe(l.horodatage).toString() === date,
      ).length
  } finally {
    m.fermer(s)
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300)

export async function faireNuit<S>(m: MetierConversation<S>, o: OptionsNuit): Promise<IssueNuit> {
  const c = o.commande ?? commandeSync
  const depot = cheminDepotNuit(o.agence, o.racine)
  const date = o.date.toString()
  const maintenant = o.date.toZonedDateTime({
    timeZone: FUSEAU,
    plainTime: Temporal.PlainTime.from('23:59'),
  })
  const etapes: Etapenuit[] = []
  const chantiers: IssueChantier[] = []

  // R11 : le clone propre, remis à origin/main, avant tout appel ; sinon la nuit s'arrête là.
  try {
    const tete = remettreAOrigine(c, depot, o.racine)
    etapes.push({ etape: 'clone', ok: true, issue: `à jour de origin/main (${tete.slice(0, 12)})` })
  } catch (erreur) {
    etapes.push({ etape: 'clone', ok: false, issue: message(erreur) })
    return { etapes, chantiers }
  }

  // Les chantiers déjà tentés cette nuit (une nuit relancée) comptent dans la borne.
  let tentees = dejaTentees(m, o.dossierClient, date)
  for (const fichier of missionsDuClient(o.dossierClient)) {
    if (tentees >= o.agence.chantier.missions_max_par_nuit) break
    let lue: ReturnType<typeof lireMission>
    try {
      lue = lireMission(fichier)
    } catch {
      continue
    }
    if (!A_TENTER.includes(lue.mission.statut)) continue
    if (brancheExiste(c, depot, lue.mission.id)) continue
    try {
      const r = await faireChantier(m, {
        racine: o.racine,
        agence: o.agence,
        mission: fichier,
        env: o.env,
        maintenant,
        commande: c,
        ...(o.lancer ? { lancer: o.lancer } : {}),
        ...(o.executer ? { executer: o.executer } : {}),
      })
      chantiers.push(r)
      // Une décision sans appel (question, écartée, refusée avant tout appel) ne compte pas.
      if (r.sorte === 'fuite') {
        etapes.push({
          etape: 'chantier',
          ok: false,
          issue: `${lue.mission.id} : refusé avant tout appel`,
        })
      }
      if (r.sorte === 'fait') {
        tentees++
        etapes.push({
          etape: 'chantier',
          ok: r.sorte === 'fait' && r.fusion?.sorte === 'fusionne',
          issue: `${lue.mission.id} : ${r.issue}`,
        })
      }
    } catch (erreur) {
      tentees++
      etapes.push({ etape: 'chantier', ok: false, issue: `${lue.mission.id} : ${message(erreur)}` })
    }
  }

  // La ligne de la nuit (R10) : des comptes, une fois par nuit et par client.
  try {
    const s = m.ouvrir(o.dossierClient)
    try {
      const client = m.client(s)
      if (!lireMesures(depot).some((l) => l.date === date && l.client === client)) {
        const faits = chantiers.flatMap((x) => (x.sorte === 'fait' ? [x] : []))
        ajouterMesure(
          depot,
          date,
          client,
          {
            missions: missionsDuClient(o.dossierClient).filter((f) => basename(dirname(f)) === date)
              .length,
            tentees: faits.length,
            fusionnees: faits.filter((x) => x.fusion?.sorte === 'fusionne').length,
            cout_usd: faits.reduce((t, x) => t + x.cout, 0).toFixed(2),
            cout: 'estimé par le binaire',
          },
          m.noms(s),
        )
      }
    } finally {
      m.fermer(s)
    }
    const publie = publierMemoire({
      commande: c,
      depot,
      racineCourante: o.racine,
      message: `Mémoire : nuit du ${date}`,
    })
    etapes.push({
      etape: 'mémoire',
      ok: true,
      issue: publie ? 'commise et poussée' : 'rien de neuf',
    })
  } catch (erreur) {
    etapes.push({ etape: 'mémoire', ok: false, issue: message(erreur) })
  }
  return { etapes, chantiers }
}
