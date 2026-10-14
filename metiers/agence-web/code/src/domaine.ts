import type { Domaine as DomainePrompts } from '@harnais/moteur'

// Le domaine de l'agence web que disent les prompts du moteur
// (PLAN-METIER-2.md § 3.5, M7). Rien ne s'écrit chez l'agence en v1 : aucune
// modification n'est possible. Les identifiants à masquer avant la ronde et
// la mission sont ceux qui désignent quelqu'un (M17) : une personne de
// l'agence, un contact, un client, un sous-traitant. Aucune de ces phrases ne
// porte un nom des données (les tests le vérifient). Les notions sont les mots
// de la fiche (§ 5, vocabulaire ; I-04, I-05) et des questions de l'entretien
// (5, 16, 17), dits dans les termes des tables que lit l'échappée : sans
// elles, le modèle choisit sa propre lecture (`evals/erreurs-2026-10-13.md`, E2).

export const DOMAINE: DomainePrompts = {
  cadre: "l'outil de suivi des projets et de la facturation d'une agence web",
  objets: 'les projets, les clients, les tickets, le temps, les devis et les factures',
  modifications: null,
  places: ['<personne>', '<client>', '<projet>', '<facture>', '<ticket>', '<du>', '<au>'],
  identifiants: /\b(?:M|CT|CLI|ST)-\d+\b/g,
  rienASignaler: 'Aucun constat contraire à une règle.',
  notions: [
    "Bug ou évolution (I-05) : un ticket ne peut être traité en bug (gratuit sous garantie ou dans les heures du contrat) que s'il porte sur une fonction recettée, c'est-à-dire si son lot a été recetté (lots.recette_le, recettes) ; sinon c'est une évolution, qui attend un devis ou un décompte. Le type saisi (tickets.type) est la qualification faite par une personne : la règle sert à la vérifier quand on demande si un ticket est un bug ou une évolution, pas à la remplacer ailleurs.",
    'Ce qui attend la validation de la cheffe de projet (PO) : les PV de recette à faire signer (une recette passée, lots.pv_signe_le vide), les tickets à qualifier (tickets.type vide, ticket non résolu) et les maquettes à faire valider par le client, dont la validation vit dans la messagerie, absente des données.',
    "La prod d'un site : le serveur du client et tout ce qui y donne la main ; qui y a accès se lit dans le registre des accès (acces) pour toutes les sortes, pas une seule : hébergeur, registrar, administration du site, dépôt, tiers.",
    "Un accès est à révoquer (I-04) quand il n'a pas de révocation (acces.revoque_le vide) et que la personne n'est plus dans l'équipe, ou que le projet est clos (projets.etat) : un contrat de maintenance en cours sur ce projet garde l'accès des personnes de l'agence, jamais celui d'un sous-traitant.",
    'Livré : en production avec le PV signé ; ni la préprod, ni la branche fusionnée.',
  ],
}
