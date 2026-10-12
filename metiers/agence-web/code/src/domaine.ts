import type { Domaine as DomainePrompts } from '@harnais/moteur'

// Le domaine de l'agence web que disent les prompts du moteur
// (PLAN-METIER-2.md § 3.5, M7). Rien ne s'écrit chez l'agence en v1 : aucune
// modification n'est possible. Les identifiants à masquer avant la ronde et
// la mission sont ceux qui désignent quelqu'un (M17) : une personne de
// l'agence, un contact, un client, un sous-traitant. Aucune de ces phrases ne
// porte un nom des données (les tests le vérifient).

export const DOMAINE: DomainePrompts = {
  cadre: "l'outil de suivi des projets et de la facturation d'une agence web",
  objets: 'les projets, les clients, les tickets, le temps, les devis et les factures',
  modifications: null,
  places: ['<personne>', '<client>', '<projet>', '<facture>', '<ticket>', '<du>', '<au>'],
  identifiants: /\b(?:M|CT|CLI|ST)-\d+\b/g,
  rienASignaler: 'Aucun constat contraire à une règle.',
}
