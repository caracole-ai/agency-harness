import { aCapacite, type Capacite, type Identite, type RoleDeclare } from '@harnais/moteur'
import type { ROLES } from './modele'

// Les rôles de l'agence web (PLAN-METIER-2.md § 1, M1 et M3 ; entretien § 10) :
// cinq rôles, tous identifiés (`personnes.yaml` donne une personne à chacun).
// Le dirigeant peut tout ; la PO voit tout et valide, mais n'engage pas
// l'agence (I-11) ; la commerciale désigne et propose sans tout voir ; le
// graphiste et le développeur ne voient et ne désignent qu'eux-mêmes.
// Personne n'est tutoyé : l'entretien ne le dit pas.

/** L'identifiant d'un rôle, tel que `personnes.csv` et `personnes.yaml` l'écrivent. */
export type IdRole = (typeof ROLES)[number]

export const ROLES_DECLARES: (RoleDeclare & { id: IdRole })[] = [
  {
    id: 'dirigeant',
    enMots: 'le dirigeant',
    identifie: true,
    capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
  },
  {
    id: 'po',
    enMots: 'la PO',
    identifie: true,
    capacites: ['voit_tout', 'designe_autrui', 'propose', 'valide'],
  },
  {
    id: 'commercial',
    enMots: 'la commerciale',
    identifie: true,
    capacites: ['designe_autrui', 'propose'],
  },
  { id: 'graphiste', enMots: 'le graphiste', identifie: true, capacites: [] },
  { id: 'developpeur', enMots: 'le développeur', identifie: true, capacites: [] },
]

/** Tous les rôles. */
export const TOUS_LES_ROLES: IdRole[] = ROLES_DECLARES.map((r) => r.id)

/** Les rôles qui ont cette capacité. */
export const rolesQui = (c: Capacite): IdRole[] =>
  ROLES_DECLARES.filter((r) => r.capacites.includes(c)).map((r) => r.id)

/**
 * Les trois niveaux de vue de l'entretien § 10 : tout (la capacité
 * `voit_tout`), le commerce (clients, devis, factures, avancement, sans le
 * temps par personne ni les coûts), soi-même.
 */
export type Vue = 'tout' | 'commerce' | 'soi'

/** Les rôles qui voient le commerce sans tout voir. */
const VOIENT_LE_COMMERCE: IdRole[] = ['commercial']

/** La vue d'une identité ; un rôle inconnu ne voit que lui-même (échec fermé). */
export const vueDe = (identite: Identite): Vue =>
  aCapacite(ROLES_DECLARES, identite, 'voit_tout')
    ? 'tout'
    : (VOIENT_LE_COMMERCE as string[]).includes(identite.role)
      ? 'commerce'
      : 'soi'
