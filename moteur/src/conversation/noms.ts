// Les noms qui ne partent jamais au modèle (PLAN-METIER-2.md § 3.2, M4) :
// personnes, et pour un métier qui en a, organisations (clients, contacts,
// sous-traitants). Les pseudonymes et `fuites` masquent tout ; la
// désignation (« de qui parlez-vous ? ») ne regarde que `sorte: 'personne'`.

/** Un nom que le code connaît : son identifiant, son nom complet, et s'il désigne une personne ou une organisation. */
export interface Designable {
  id: string
  nom: string
  sorte: 'personne' | 'organisation'
}
