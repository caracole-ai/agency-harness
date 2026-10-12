import type { RoleDeclare } from '@harnais/moteur'

// Les rôles de la sécurité privée (PLAN-METIER-2.md § 1, M1 et M3) : le
// patron, unique, sans identifiant, qui peut tout ; l'agent, identifié par son
// identifiant du planning, tutoyé, sans aucune capacité (il ne voit et ne
// désigne que lui-même). Son `personnes.yaml` ne change pas.

export const ROLES: RoleDeclare[] = [
  {
    id: 'patron',
    enMots: 'le patron',
    identifie: false,
    capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
  },
  { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
]
