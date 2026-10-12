import { z } from 'zod'

// Les rôles sont déclarés par le métier, pas par le moteur (PLAN-METIER-2.md
// § 3.1, M1, M2, M3) : une liste de `RoleDeclare`, que la porte, le registre
// d'accès et la conversation lisent à l'exécution. Le moteur ne teste jamais
// un rôle par son nom : il demande une capacité. L'identifiant de qui parle
// s'écrit `personne` ; l'ancienne graphie `agent` se lit encore (M2).

export const CAPACITES = [
  'voit_tout',
  'designe_autrui',
  'propose',
  'ecrit',
  'valide',
  'administre',
] as const
export type Capacite = (typeof CAPACITES)[number]

export interface RoleDeclare {
  /** snake_case ASCII, c'est la valeur de `Identite.role` et de `personnes.yaml`. */
  id: string
  /** Le rôle en mots, forme définie, pour les prompts, jamais un nom (exemple : « le patron », « l'agent », « la cheffe de projet »). */
  enMots: string
  /** true : `Identite.personne` est exigé et doit exister chez le client. false : le rôle est unique dans le registre. */
  identifie: boolean
  tutoie?: true
  capacites: Capacite[]
}

export type Role = string

/** Qui parle. `personne` est obligatoire pour un rôle identifié et doit exister dans les données du client. */
export interface Identite {
  role: Role
  personne?: string
}

/** Ce rôle a-t-il cette capacité ? Un rôle que le métier ne déclare pas n'en a aucune. */
export const aCapacite = (roles: RoleDeclare[], identite: Identite, c: Capacite): boolean =>
  roles.find((r) => r.id === identite.role)?.capacites.includes(c) ?? false

/** Le rôle déclaré de cette identité ; lève si le métier ne le déclare pas. */
export const roleDe = (roles: RoleDeclare[], identite: Identite): RoleDeclare => {
  const role = roles.find((r) => r.id === identite.role)
  if (!role) throw new Error(`rôle inconnu : ${identite.role}`)
  return role
}

/** Qui parle, en mots, pour l'échappée (qui lit les données) : enMots, puis l'identifiant si le rôle est identifié ; jamais un nom (PLAN-PSEUDONYMES.md S8 ; exemple : « le patron », « l'agent A-2 »). */
export const quiParle = (roles: RoleDeclare[], identite: Identite): string => {
  const role = roleDe(roles, identite)
  return role.identifie ? `${role.enMots} ${identite.personne ?? '?'}` : role.enMots
}

/** Lit `{ role, personne?, agent? }` et rend `{ role, personne? }` : la lecture des deux graphies, partout. */
export const IdentiteSchema: z.ZodType<Identite> = z
  .strictObject({
    role: z.string().min(1),
    personne: z.string().min(1).optional(),
    agent: z.string().min(1).optional(),
  })
  .refine((i) => i.personne === undefined || i.agent === undefined || i.personne === i.agent, {
    message: 'deux identifiants différents',
  })
  .transform(({ role, personne, agent }): Identite => {
    const id = personne ?? agent
    return { role, ...(id !== undefined ? { personne: id } : {}) }
  })

/**
 * L'identifiant d'une identité reçue de l'extérieur, sous ses deux graphies
 * (M2) : rend l'identifiant (ou rien), ou le motif d'un refus de forme.
 */
export function identifiantRecu(
  d: Record<string, unknown>,
): { id: string | undefined } | { motif: string } {
  const { personne, agent } = d
  if ([personne, agent].some((v) => v !== undefined && typeof v !== 'string')) {
    return { motif: "l'identifiant doit être un texte" }
  }
  if (personne !== undefined && agent !== undefined && personne !== agent) {
    return { motif: 'deux identifiants différents' }
  }
  return { id: (personne ?? agent) as string | undefined }
}

/** Qui parle dans une ligne persistée qu'on ne réécrit pas : `personne`, sinon l'ancienne graphie (M2). */
export const personneLue = (d: { personne?: string; agent?: string }): string | undefined =>
  d.personne ?? d.agent

/** Les champs de qui parle dans un fichier qu'on ne réécrit pas (cas d'éval) : `personne`, et l'ancienne graphie, encore lue (M2). À étendre dans un schéma, puis `avecPersonne`. */
export const CHAMPS_PERSONNE = {
  agent: z.string().optional(),
  personne: z.string().optional(),
}

/**
 * Qui parle dans un cas : `personne`, ou `agent`, la graphie des fichiers
 * d'avant, qu'on ne réécrit pas (PLAN-METIER-2.md M2) ; rend `personne`.
 */
export function avecPersonne<C extends { agent?: string; personne?: string }>({
  agent,
  personne,
  ...cas
}: C) {
  const qui = personne ?? agent
  return { ...cas, ...(qui !== undefined ? { personne: qui } : {}) }
}

const cle = (i: Identite) => (i.personne === undefined ? i.role : `${i.role} ${i.personne}`)

/** Le schéma zod de `personnes.yaml` pour ces rôles : un rôle non identifié est unique ; un rôle identifié exige `personne` (ancienne graphie `agent` acceptée et renommée). */
export const schemaRegistre = (roles: RoleDeclare[]): z.ZodType<{ personnes: Identite[] }> =>
  z.strictObject({
    personnes: z
      .array(IdentiteSchema)
      .min(1)
      .superRefine((personnes, ctx) => {
        const vues = new Set<string>()
        for (const p of personnes) {
          const role = roles.find((r) => r.id === p.role)
          const motif = !role
            ? `rôle inconnu : ${p.role}`
            : role.identifie && p.personne === undefined
              ? `${role.enMots} sans identifiant`
              : !role.identifie && p.personne !== undefined
                ? `${role.enMots} parle en son nom : pas d'identifiant`
                : vues.has(cle(p))
                  ? `${cle(p)} en double`
                  : undefined
          if (motif) ctx.addIssue({ code: 'custom', message: motif })
          vues.add(cle(p))
        }
      }),
  })
