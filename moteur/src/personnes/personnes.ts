import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import {
  type Identite,
  identifiantRecu,
  type RoleDeclare,
  schemaRegistre,
} from '../conversation/roles'

// Qui a le droit de parler à l'outil chez un client : le registre d'accès,
// `personnes.yaml` dans le dossier du client. Il appartient au harnais, pas
// aux données du client, et il décide de l'accès avant que le dossier soit
// ouvert (REFLEXIONS.md, décidé le 2026-10-08). L'identité y est déclarée, pas
// authentifiée (D12) : le jour où un canal authentifie, son identifiant
// (numéro, compte) s'ajoute à chaque personne, sans changer le reste.

export const FICHIER_PERSONNES = 'personnes.yaml'

/** Une personne du registre : une identité, validée par `schemaRegistre` (PLAN-METIER-2.md § 3.1). */
export type Personne = Identite

/** Le registre d'accès d'un client, pour les rôles de son métier ; absent ou invalide, rien ne démarre. */
export function chargerPersonnes(dossierClient: string, roles: RoleDeclare[]): Personne[] {
  const chemin = join(dossierClient, FICHIER_PERSONNES)
  if (!existsSync(chemin)) throw new Error(`registre d'accès absent, accès refusé : ${chemin}`)
  const r = schemaRegistre(roles).safeParse(parse(readFileSync(chemin, 'utf8')))
  if (!r.success) {
    throw new Error(
      `registre d'accès invalide, accès refusé : ${chemin}\n${z.prettifyError(r.error)}`,
    )
  }
  return r.data.personnes
}

declare const PORTE: unique symbol
/**
 * Une identité passée par `recevoir` : seule cette fonction en construit une.
 * Ouvrir une session pour quelqu'un, traiter sa consigne, confirmer pour lui,
 * tout l'exige : un point d'entrée qui oublierait la porte ne compile pas.
 * La marque est un type, rien à l'exécution : une copie par étalement
 * (`{ ...identite, personne }`) la garde aux yeux du compilateur sans être
 * passée par la porte. On ne copie donc jamais une identité vérifiée, on la
 * passe telle quelle ; le risque est accepté (décidé le 2026-10-18), aucun
 * contrôle à l'exécution ne le double.
 */
export type IdentiteVerifiee = Identite & { readonly [PORTE]: true }

export type Accueil =
  | { sorte: 'reçu'; identite: IdentiteVerifiee }
  | { sorte: 'refus'; motif: string }

/** Ce qui vient de l'extérieur, cité dans un motif (au journal, en ajout seul) : borné. */
const borne = (valeur: unknown) => String(valeur).slice(0, 80)

/**
 * La porte : la forme de l'identité reçue, contre les rôles du métier, puis
 * sa présence au registre d'accès. Ne lit rien d'autre. L'identifiant se lit
 * par `identifiantRecu` (`personne`, rien d'autre).
 */
export function recevoir(roles: RoleDeclare[], personnes: Personne[], demandeur: unknown): Accueil {
  const refus = (motif: string): Accueil => ({ sorte: 'refus', motif })
  if (typeof demandeur !== 'object' || demandeur === null) return refus('identité absente')
  const { role } = demandeur as Record<string, unknown>
  const declare = roles.find((r) => r.id === role)
  if (!declare) return refus(`rôle inconnu : ${borne(role)}`)
  const lu = identifiantRecu(demandeur as Record<string, unknown>)
  if ('motif' in lu) return refus(lu.motif)
  const { id } = lu
  if (!declare.identifie && id !== undefined) {
    return refus(`${declare.enMots} parle en son nom : pas d'identifiant`)
  }
  if (declare.identifie && id === undefined) {
    return refus(`${declare.enMots} doit donner son identifiant`)
  }
  const identite: Identite = { role: declare.id, ...(id !== undefined ? { personne: id } : {}) }
  if (!personnes.some((p) => p.role === identite.role && p.personne === identite.personne)) {
    return refus(
      declare.identifie
        ? `inconnu au registre d'accès : ${borne(id)}`
        : `${declare.enMots} n'est pas au registre d'accès`,
    )
  }
  return { sorte: 'reçu', identite: identite as IdentiteVerifiee }
}
