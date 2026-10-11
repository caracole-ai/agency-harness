import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { TYPE_ALERTE } from '../archetypes/veille-client'
import type { Evenement, Journal } from '../journal/journal'
import {
  DOSSIER_GESTES,
  empreinteGeste,
  FichierGeste,
  type GesteAppris,
  gesteDe,
  verifierGabarit,
} from './geste-appris'

// Le chargement des gestes appris d'un client (PLAN-PROMOTION.md § 5.2) : un
// fichier `gestes/<id>.yaml` ne vaut que par sa clé (P7). Au chargement, relu
// à chaque consigne comme le registre des personnes, l'empreinte du contenu
// doit être celle de la dernière ligne `geste appris` / `activé` du journal,
// et aucune ligne `retiré` ne doit la suivre. Sinon le geste est écarté (pas
// chargé), une ligne `refusé` est écrite, et une alerte G-01 (« rien ne sort
// sans un humain ») : le reste du harnais démarre, mais ça se voit.

export const TYPE_GESTE_APPRIS = 'geste appris'

/** Les issues des lignes `geste appris` du journal. */
export const ISSUE_GESTE = {
  propose: 'proposé',
  verifie: 'vérifié',
  active: 'activé',
  refuse: 'refusé',
  retire: 'retiré',
} as const

/** La règle du socle qu'un geste sans clé enfreindrait : rien ne sort sans un humain. */
export const REGLE_SANS_HUMAIN = 'G-01'

/** Le niveau de l'alerte écrite pour un geste écarté. */
const NIVEAU_GESTE_ECARTE = 'alerte'

export interface FichierGesteLu {
  /** Le nom du fichier dans `gestes/`. */
  fichier: string
  contenu?: FichierGeste
  /** Pourquoi le fichier ne se lit pas (YAML ou schéma). */
  erreur?: string
}

export interface GesteEcarte {
  fichier: string
  id?: string
  motif: string
}

/** Les fichiers `gestes/*.yaml` du client, dans l'ordre des noms, lus et passés au schéma ; sans la clé. */
export function lireFichiersGestes(dossierClient: string): FichierGesteLu[] {
  const dossier = join(dossierClient, DOSSIER_GESTES)
  if (!existsSync(dossier)) return []
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((fichier) => {
      let brut: unknown
      try {
        brut = parse(readFileSync(join(dossier, fichier), 'utf8'))
      } catch (erreur) {
        return { fichier, erreur: `YAML illisible : ${(erreur as Error).message}` }
      }
      const lu = FichierGeste.safeParse(brut)
      return lu.success
        ? { fichier, contenu: lu.data }
        : { fichier, erreur: `schéma : ${z.prettifyError(lu.error)}` }
    })
}

const jetonDe = (donnees: string | null | undefined): unknown =>
  donnees ? (JSON.parse(donnees) as { jeton?: unknown }).jeton : null

/**
 * Ce qui manque à la clé d'un geste, ou rien : la dernière ligne `activé` du
 * journal pour cet objet, ou `retiré` de cette empreinte (retirer un autre
 * fichier du même identifiant ne retire pas celui-ci).
 */
export function motifSansCle(journal: Journal, geste: GesteAppris): string | undefined {
  const empreinte = empreinteGeste(geste)
  const derniere = journal
    .historique(geste.id)
    .filter(
      (l) =>
        l.type === TYPE_GESTE_APPRIS &&
        (l.issue === ISSUE_GESTE.active ||
          (l.issue === ISSUE_GESTE.retire && jetonDe(l.donnees) === empreinte)),
    )
    .at(-1)
  if (!derniere) return 'jamais activé'
  if (derniere.issue === ISSUE_GESTE.retire) return 'retiré'
  return jetonDe(derniere.donnees) === empreinte ? undefined : 'empreinte différente'
}

/**
 * Les gestes appris à charger pour une consigne : ceux dont le fichier dit
 * `actif` et dont la clé tient. Un fichier `propose` ou `retire` n'est ni
 * chargé ni signalé : c'est son état normal. Un fichier illisible, un gabarit
 * faux, l'identifiant d'un geste codé, un `actif` sans clé : écarté, `refusé`
 * au journal, alerte.
 */
export function chargerGestesAppris(
  dossierClient: string,
  /** `codes` : les identifiants des gestes codés du métier ; un geste appris ne peut pas en porter un. */
  cible: { client: string; journal: Journal; codes?: readonly string[] },
  horodatage?: string,
): { actifs: GesteAppris[]; ecartes: GesteEcarte[] } {
  const actifs: GesteAppris[] = []
  const ecartes: GesteEcarte[] = []
  const lignes: Evenement[] = []
  const ecarter = (fichier: string, id: string | undefined, motif: string, jeton?: string) => {
    ecartes.push({ fichier, ...(id !== undefined ? { id } : {}), motif })
    const objet = id ?? fichier
    lignes.push(
      {
        type: TYPE_GESTE_APPRIS,
        client: cible.client,
        objet,
        issue: ISSUE_GESTE.refuse,
        motif,
        donnees: { fichier, ...(jeton !== undefined ? { jeton } : {}) },
      },
      {
        type: TYPE_ALERTE,
        client: cible.client,
        regle: REGLE_SANS_HUMAIN,
        objet,
        issue: NIVEAU_GESTE_ECARTE,
        motif: `geste appris écarté : ${motif}`,
      },
    )
  }
  for (const lu of lireFichiersGestes(dossierClient)) {
    if (!lu.contenu) {
      ecarter(lu.fichier, undefined, lu.erreur ?? 'illisible')
      continue
    }
    if (lu.contenu.statut !== 'actif') continue
    const geste = gesteDe(lu.contenu)
    const jeton = empreinteGeste(geste)
    const gabarit = verifierGabarit(geste)
    if (gabarit.length > 0) {
      ecarter(lu.fichier, geste.id, `gabarit : ${gabarit.join(' ; ')}`, jeton)
      continue
    }
    if (cible.codes?.includes(geste.id)) {
      ecarter(lu.fichier, geste.id, 'l’identifiant d’un geste codé', jeton)
      continue
    }
    const motif = motifSansCle(cible.journal, geste)
    if (motif !== undefined) {
      ecarter(lu.fichier, geste.id, motif, jeton)
      continue
    }
    actifs.push(geste)
  }
  if (lignes.length > 0) cible.journal.ecrire(lignes, horodatage)
  return { actifs, ecartes }
}
