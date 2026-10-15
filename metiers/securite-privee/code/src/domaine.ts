import type { Domaine } from '@harnais/moteur'

// Le domaine de la sécurité privée (PLAN-METIER-2.md § 3.5, M7) : les phrases
// que le moteur disait en dur, recopiées à l'octet près, pour que ce que le
// modèle reçoit ne change pas (règle 3 du plan).

export const DOMAINE: Domaine = {
  cadre: "l'outil de planning d'une entreprise de sécurité privée",
  objets: 'le planning et les agents',
  modifications:
    'Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.',
  identifiants: /\bA-\d+\b/g,
  rienASignaler: 'Aucune vacation contraire à une règle.',
}
