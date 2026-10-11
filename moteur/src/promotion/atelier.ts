import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import { z } from 'zod'
import type { MetierConversation } from '../conversation/conversation'
import type { TableCopie } from '../echappee/copie'
import type { Instantane } from '../echappee/echappee'
import { SEUILS } from '../evals/evals'
import type { BilanTraduction } from '../evals/traduction'
import { ISSUE_GESTE, lireFichiersGestes, TYPE_GESTE_APPRIS } from '../gestes/charger'
import {
  DOSSIER_GESTES,
  empreinteGeste,
  type FichierGeste,
  type GesteAppris,
  gesteDe,
  type StatutGeste,
} from '../gestes/geste-appris'
import type { Evenement, Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import type { Temporal } from '../temps/temporal'
import { type EcartGeste, type Rejeu, verifierGeste } from './fabriquer'

// L'atelier et le patron devant un geste appris (PLAN-PROMOTION.md § 7.1,
// § 7.2) : lister, vérifier, activer, retirer. Activer exige une ligne
// `vérifié` sans écart, avec modèle, sur l'empreinte exacte du fichier : c'est
// l'empreinte qui dit que ce qui a été vérifié est ce qui est sur le disque.
// Activer écrit `statut: actif` et `validation` dans le YAML, puis la ligne
// `activé` au journal, celle que le chargement exige (P7). Le CLI et
// l'interface passent par ici : les mêmes exigences, quel que soit le chemin.

/** Un refus de l'atelier : la demande ne peut pas être satisfaite telle quelle (un 400 dans l'interface). */
export class ErreurAtelier extends Error {}

/** Le statut d'un fichier, en français. */
export const STATUT_LISIBLE: Record<StatutGeste, string> = {
  propose: 'proposé',
  actif: 'actif',
  retire: 'retiré',
}

const DonneesVerification = z.object({
  jeton: z.string(),
  ecarts: z.array(z.string()),
  traduction: z.object({ taux: z.number(), atteint: z.boolean(), cout_usd: z.number() }).optional(),
})

/** Ce qu'une ligne `vérifié` du journal dit d'un geste. */
export interface Verification {
  horodatage: string
  jeton: string
  ecarts: string[]
  traduction?: { taux: number; atteint: boolean; cout_usd: number }
}

/** Un fichier de `gestes/`, tel que `lister` et l'interface le montrent. */
export interface GesteListe {
  fichier: string
  /** Absents quand le fichier ne se lit pas (`erreur`). */
  id?: string
  description?: string
  statut?: StatutGeste
  erreur?: string
  fabriqueLe?: string
  tests?: number
  jeton?: string
  validation?: { par: string; le: string }
  /** La dernière vérification de cette empreinte exacte. */
  verification?: Verification
  /** Un geste proposé que le patron peut activer : vérifié sans écart, avec modèle, sur cette empreinte. */
  activable: boolean
  /** Pourquoi un geste proposé ne l'est pas. */
  motif?: string
}

const pourCent = (taux: number) => `${Math.round(taux * 100)} %`

/** Les lignes `vérifié` d'un geste, dans l'ordre ; une ligne illisible compte comme un écart. */
export function verifications(journal: Journal, id: string): Verification[] {
  return journal
    .historique(id)
    .filter((l) => l.type === TYPE_GESTE_APPRIS && l.issue === ISSUE_GESTE.verifie)
    .map((l) => {
      const lu = DonneesVerification.safeParse(l.donnees ? JSON.parse(l.donnees) : undefined)
      if (!lu.success) {
        return { horodatage: l.horodatage, jeton: '', ecarts: ['ligne « vérifié » illisible'] }
      }
      const { traduction, ...reste } = lu.data
      return { horodatage: l.horodatage, ...reste, ...(traduction ? { traduction } : {}) }
    })
}

/**
 * Pourquoi un geste de cette empreinte ne peut pas être activé, ou rien : la
 * dernière ligne `vérifié` sur cette empreinte doit être sans écart, et une
 * ligne `vérifié` sans écart sur cette empreinte doit porter une passe de
 * traduction qui atteint son seuil (§ 7.1). Le contenu étant le même, une
 * vérification en code faite après la passe ne la périme pas ; un écart
 * apparu depuis (un instantané perdu) bloque.
 */
export function motifNonActivable(
  journal: Journal,
  id: string,
  jeton: string,
): { verification?: Verification; motif?: string } {
  const toutes = verifications(journal, id)
  const siennes = toutes.filter((x) => x.jeton === jeton)
  const derniere = siennes.at(-1)
  if (!derniere) {
    return {
      motif:
        toutes.length === 0
          ? 'jamais vérifié'
          : 'le fichier a changé depuis la dernière vérification',
    }
  }
  if (derniere.ecarts.length > 0) {
    return {
      verification: derniere,
      motif: `la dernière vérification a ${derniere.ecarts.length} écart(s)`,
    }
  }
  const avecModele = siennes.filter((x) => x.traduction && x.ecarts.length === 0).at(-1)
  if (!avecModele?.traduction) {
    return {
      verification: derniere,
      motif: 'vérifié sans modèle : la passe de traduction manque',
    }
  }
  if (!avecModele.traduction.atteint) {
    return {
      verification: avecModele,
      motif: `la traduction n’atteint pas son seuil (${pourCent(avecModele.traduction.taux)} pour ${pourCent(SEUILS.traduire)})`,
    }
  }
  return { verification: avecModele }
}

/** Les fichiers de `gestes/`, dans l'ordre des noms, avec leur dernière vérification et s'ils sont activables. */
export function listerGestes(dossierClient: string, journal: Journal): GesteListe[] {
  const lus = lireFichiersGestes(dossierClient)
  return lus.map((lu) => {
    if (!lu.contenu)
      return { fichier: lu.fichier, erreur: lu.erreur ?? 'illisible', activable: false }
    const geste = gesteDe(lu.contenu)
    const jeton = empreinteGeste(geste)
    const { verification, motif } = motifNonActivable(journal, geste.id, jeton)
    const autreActif = lus.find(
      (a) => a !== lu && a.contenu?.statut === 'actif' && a.contenu.id === geste.id,
    )
    const empeche =
      lu.contenu.statut !== 'propose'
        ? STATUT_LISIBLE[lu.contenu.statut]
        : autreActif
          ? `${autreActif.fichier} est déjà actif pour cet identifiant`
          : motif
    return {
      fichier: lu.fichier,
      id: geste.id,
      description: geste.description,
      statut: lu.contenu.statut,
      fabriqueLe: geste.origine.fabrique_le,
      tests: geste.tests.length,
      jeton,
      ...(lu.contenu.validation
        ? { validation: { par: lu.contenu.validation.par, le: lu.contenu.validation.le } }
        : {}),
      ...(verification ? { verification } : {}),
      activable: empeche === undefined,
      ...(empeche !== undefined ? { motif: empeche } : {}),
    }
  })
}

/** Un fichier de `gestes/` désigné par l'identifiant du geste ou par son nom de fichier ; lève s'il n'y en a aucun, plusieurs, ou s'il ne se lit pas. */
export function trouverGeste(
  dossierClient: string,
  cible: string,
): { fichier: string; contenu: FichierGeste } {
  const parFichier = cible.endsWith('.yaml')
  const trouves = lireFichiersGestes(dossierClient).filter((lu) =>
    parFichier ? lu.fichier === cible : lu.contenu?.id === cible,
  )
  if (trouves.length === 0) throw new ErreurAtelier(`aucun geste ${cible} dans ${DOSSIER_GESTES}/`)
  if (trouves.length > 1) {
    throw new ErreurAtelier(
      `plusieurs fichiers portent l’identifiant ${cible} : ${trouves.map((t) => t.fichier).join(', ')} ; nommer le fichier`,
    )
  }
  const [lu] = trouves as [NonNullable<(typeof trouves)[0]>]
  if (!lu.contenu) throw new ErreurAtelier(`${DOSSIER_GESTES}/${lu.fichier} : ${lu.erreur}`)
  return { fichier: lu.fichier, contenu: lu.contenu }
}

const ecrireFichierGeste = (dossierClient: string, fichier: string, contenu: FichierGeste) =>
  writeFileSync(join(dossierClient, DOSSIER_GESTES, fichier), stringify(contenu))

/**
 * Active un geste proposé, vérifié sans écart et avec modèle sur cette
 * empreinte exacte : `statut: actif` et `validation { par, le, jeton }` dans
 * le YAML, puis la ligne `activé` au journal, celle que le chargement exige
 * (P7). Le fichier d'abord : si la ligne manque, le geste est écarté avec une
 * alerte, pas chargé en silence.
 */
export function activerGeste(
  dossierClient: string,
  journal: Journal,
  client: string,
  cible: string,
  par: string,
  maintenant: Temporal.ZonedDateTime,
): { fichier: string; jeton: string } {
  if (par.trim() === '') throw new ErreurAtelier('qui active : un nom est attendu')
  const { fichier, contenu } = trouverGeste(dossierClient, cible)
  if (contenu.statut !== 'propose') {
    throw new ErreurAtelier(`${fichier} : déjà ${STATUT_LISIBLE[contenu.statut]}`)
  }
  const autreActif = lireFichiersGestes(dossierClient).find(
    (a) => a.fichier !== fichier && a.contenu?.statut === 'actif' && a.contenu.id === contenu.id,
  )
  if (autreActif) {
    throw new ErreurAtelier(
      `${autreActif.fichier} est déjà actif pour ${contenu.id} : le retirer d’abord`,
    )
  }
  const geste = gesteDe(contenu)
  const jeton = empreinteGeste(geste)
  const { motif } = motifNonActivable(journal, geste.id, jeton)
  if (motif !== undefined) throw new ErreurAtelier(`${fichier} : ${motif}`)
  const relatif = join(DOSSIER_GESTES, fichier)
  ecrireFichierGeste(dossierClient, fichier, {
    ...contenu,
    statut: 'actif',
    validation: { par, le: maintenant.toPlainDate().toString(), jeton },
  })
  journal.ecrire(
    [
      {
        type: TYPE_GESTE_APPRIS,
        client,
        objet: geste.id,
        issue: ISSUE_GESTE.active,
        motif: geste.description,
        donnees: { jeton, par, fichier: relatif },
      },
    ],
    maintenant.toInstant().toString(),
  )
  return { fichier: relatif, jeton }
}

/** Retire un geste (proposé ou actif) : `statut: retire` dans le YAML, la ligne `retiré` au journal ; il n'est plus chargé dès la consigne suivante. */
export function retirerGeste(
  dossierClient: string,
  journal: Journal,
  client: string,
  cible: string,
  motif: string,
  par: string | undefined,
  maintenant: Temporal.ZonedDateTime,
): { fichier: string; jeton: string } {
  if (motif.trim() === '') throw new ErreurAtelier('un motif est attendu')
  const { fichier, contenu } = trouverGeste(dossierClient, cible)
  if (contenu.statut === 'retire') throw new ErreurAtelier(`${fichier} : déjà retiré`)
  const geste = gesteDe(contenu)
  const jeton = empreinteGeste(geste)
  const relatif = join(DOSSIER_GESTES, fichier)
  ecrireFichierGeste(dossierClient, fichier, { ...contenu, statut: 'retire' })
  journal.ecrire(
    [
      {
        type: TYPE_GESTE_APPRIS,
        client,
        objet: geste.id,
        issue: ISSUE_GESTE.retire,
        motif,
        donnees: { jeton, fichier: relatif, ...(par !== undefined ? { par } : {}) },
      },
    ],
    maintenant.toInstant().toString(),
  )
  return { fichier: relatif, jeton }
}

/** Les tables du premier instantané lisible, sans leurs lignes : la copie vide où le gabarit se vérifie. */
export function copieVideDe(
  dossierClient: string,
  instantanes: string[],
): TableCopie[] | undefined {
  for (const relatif of instantanes) {
    const chemin = join(dossierClient, relatif)
    if (!existsSync(chemin)) continue
    const i = JSON.parse(readFileSync(chemin, 'utf8')) as Instantane
    if (Array.isArray(i.tables)) return i.tables.map((t) => ({ ...t, lignes: [] }))
  }
  return undefined
}

/**
 * La ligne `vérifié` d'un geste (`donnees { jeton, ecarts, traduction? }`),
 * précédée, quand une passe de traduction a eu lieu, de la ligne
 * `appel_modele` / `verifier` qui en porte le coût au plafond du mois. Rend
 * l'empreinte et « activable » : le taux de traduction seul décide (§ 6.3).
 */
export function journaliserVerification(
  journal: Journal,
  client: string,
  geste: GesteAppris,
  ecarts: string[],
  horodatage: string,
  traduction?: { bilan: BilanTraduction; modele: string },
): { jeton: string; activable: boolean } {
  const jeton = empreinteGeste(geste)
  const activable = traduction !== undefined && traduction.bilan.taux >= SEUILS.traduire
  const lignes: Evenement[] = []
  if (traduction) {
    lignes.push({
      type: TYPE_APPEL,
      client,
      objet: geste.id,
      issue: 'verifier',
      donnees: {
        appels: traduction.bilan.appels,
        modele: traduction.modele,
        cout_usd: traduction.bilan.coutUsd,
      },
    })
  }
  lignes.push({
    type: TYPE_GESTE_APPRIS,
    client,
    objet: geste.id,
    issue: ISSUE_GESTE.verifie,
    donnees: {
      jeton,
      ecarts,
      ...(traduction
        ? {
            traduction: {
              taux: traduction.bilan.taux,
              atteint: activable,
              cout_usd: traduction.bilan.coutUsd,
            },
          }
        : {}),
    },
  })
  journal.ecrire(lignes, horodatage)
  return { jeton, activable }
}

export interface IssueVerification {
  /** `gestes/<nom>.yaml`, relatif au dossier du client. */
  fichier: string
  geste: GesteAppris
  jeton: string
  ecarts: EcartGeste[]
  rejeu: Rejeu
  /** La passe avec modèle ; absente sans `--avec-modele`, ou dès qu'un écart la rend inutile. */
  traduction?: BilanTraduction
  activable: boolean
}

export interface OptionsVerification {
  /** L'instant de la vérification, pour le journal. */
  horodatage: string
  /** La passe de traduction avec modèle (§ 7.1) ; absente, le geste reste non activable. */
  traduction?: (geste: GesteAppris, fichier: string) => Promise<BilanTraduction>
  /** L'identifiant du modèle de la passe, pour la ligne `appel_modele`. */
  modele?: string
}

/**
 * `pnpm gestes verifier` : la vérification en code (§ 6.2) d'un geste de
 * `gestes/`, puis, sans écart et si on l'a demandée, la passe de traduction
 * avec modèle ; la ligne `vérifié` au journal dans tous les cas. Un écart
 * rend la passe inutile : elle n'a pas lieu, elle coûterait pour rien.
 */
export async function verifierGesteAppris<S>(
  m: MetierConversation<S>,
  s: S,
  dossierClient: string,
  cible: string,
  options: OptionsVerification,
): Promise<IssueVerification> {
  const { fichier, contenu } = trouverGeste(dossierClient, cible)
  if (contenu.statut === 'retire') {
    throw new ErreurAtelier(`${fichier} : retiré, rien à vérifier`)
  }
  const geste = gesteDe(contenu)
  const relatif = join(DOSSIER_GESTES, fichier)
  const copieVide = copieVideDe(
    dossierClient,
    geste.tests.map((t) => t.instantane),
  )
  if (!copieVide) throw new ErreurAtelier(`${fichier} : aucun instantané lisible`)
  const gestesExistants = [
    ...m.actions.map((a) => ({ id: a.id, description: a.description })),
    ...lireFichiersGestes(dossierClient).flatMap((f) =>
      f.contenu && f.contenu.statut !== 'retire' && f.fichier !== fichier
        ? [{ id: f.contenu.id, description: f.contenu.description }]
        : [],
    ),
  ]
  const { ecarts, rejeu } = await verifierGeste(geste, {
    dossierClient,
    copieVide,
    consignes: geste.tests.map((t) => t.consigne),
    personnes: m.vocabulaire(s, { role: 'patron' }).agents,
    gestesExistants,
  })
  const journal = m.journal(s)
  const client = m.client(s)
  if (ecarts.length > 0 || !options.traduction) {
    const { jeton } = journaliserVerification(
      journal,
      client,
      geste,
      ecarts.map((e) => e.texte),
      options.horodatage,
    )
    return { fichier: relatif, geste, jeton, ecarts, rejeu, activable: false }
  }
  const bilan = await options.traduction(geste, relatif)
  const { jeton, activable } = journaliserVerification(
    journal,
    client,
    geste,
    [],
    options.horodatage,
    {
      bilan,
      modele: options.modele ?? '',
    },
  )
  return { fichier: relatif, geste, jeton, ecarts, rejeu, traduction: bilan, activable }
}
