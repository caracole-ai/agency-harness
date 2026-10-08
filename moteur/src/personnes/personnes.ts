import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { type Identite, ROLES, type Role } from '../conversation/actions'

// Qui a le droit de parler à l'outil chez un client : le registre d'accès,
// `personnes.yaml` dans le dossier du client. Il appartient au harnais, pas
// aux données du client, et il décide de l'accès avant que le dossier soit
// ouvert (REFLEXIONS.md, décidé le 2026-10-08). L'identité y est déclarée, pas
// authentifiée (D12) : le jour où un canal authentifie, son identifiant
// (numéro, compte) s'ajoute à chaque personne, sans changer le reste.

export const FICHIER_PERSONNES = 'personnes.yaml'

const Personne = z.discriminatedUnion('role', [
  z.strictObject({ role: z.literal('patron') }),
  z.strictObject({ role: z.literal('agent'), agent: z.string().min(1) }),
])
export type Personne = z.infer<typeof Personne>

const cle = (i: Identite) => (i.role === 'patron' ? 'patron' : `agent ${i.agent}`)

export const RegistrePersonnes = z.strictObject({
  personnes: z
    .array(Personne)
    .min(1)
    .superRefine((personnes, ctx) => {
      const vues = new Set<string>()
      for (const p of personnes) {
        if (vues.has(cle(p))) ctx.addIssue({ code: 'custom', message: `${cle(p)} en double` })
        vues.add(cle(p))
      }
    }),
})

/** Le registre d'accès d'un client ; absent ou invalide, rien ne démarre. */
export function chargerPersonnes(dossierClient: string): Personne[] {
  const chemin = join(dossierClient, FICHIER_PERSONNES)
  if (!existsSync(chemin)) throw new Error(`registre d'accès absent, accès refusé : ${chemin}`)
  const r = RegistrePersonnes.safeParse(parse(readFileSync(chemin, 'utf8')))
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
 */
export type IdentiteVerifiee = Identite & { readonly [PORTE]: true }

export type Accueil =
  | { sorte: 'reçu'; identite: IdentiteVerifiee }
  | { sorte: 'refus'; motif: string }

/** Ce qui vient de l'extérieur, cité dans un motif (au journal, en ajout seul) : borné. */
const borne = (valeur: unknown) => String(valeur).slice(0, 80)

/** La porte : la forme de l'identité reçue, puis sa présence au registre d'accès. Ne lit rien d'autre. */
export function recevoir(personnes: Personne[], demandeur: unknown): Accueil {
  const refus = (motif: string): Accueil => ({ sorte: 'refus', motif })
  if (typeof demandeur !== 'object' || demandeur === null) return refus('identité absente')
  const { role, agent } = demandeur as Record<string, unknown>
  if (!ROLES.includes(role as Role)) return refus(`rôle inconnu : ${borne(role)}`)
  if (agent !== undefined && typeof agent !== 'string') {
    return refus("l'identifiant d'agent doit être un texte")
  }
  if (role === 'patron' && agent !== undefined) {
    return refus("le patron parle en son nom : pas d'identifiant d'agent")
  }
  if (role === 'agent' && agent === undefined) return refus('un agent doit dire qui il est')
  const identite: Identite = { role: role as Role, ...(agent !== undefined ? { agent } : {}) }
  if (!personnes.some((p) => cle(p) === cle(identite))) {
    return refus(
      identite.role === 'patron'
        ? "le patron n'est pas au registre d'accès"
        : `inconnu au registre d'accès : ${borne(identite.agent)}`,
    )
  }
  return { sorte: 'reçu', identite: identite as IdentiteVerifiee }
}
