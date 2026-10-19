// Ce que l'interface montre d'un métier (PLAN-METIER-2.md § 3.6, M10) : les
// demandes en cours, les lignes en attente d'une réponse, le nom de qui parle
// et les chaînes qui nomment un objet du métier. Le métier le rend ;
// l'interface ne connaît aucun métier.

export interface DemandeTableau {
  id: string
  sorte: string
  texte: string
  statut: string
  depuis: string
  /** Les décisions offertes sur la demande, à son étape (exemple : valider le remplaçant proposé, ou en prendre un autre) ; chacune un geste, cliqué sans modèle. Absent ou vide : rien à décider. */
  choix?: Choix[]
  /** Le détail qui ne sert pas à décider d'un coup d'œil (exemple : les agents exclus et pourquoi), montré replié sous le texte. */
  replis?: Repli[]
}

/** Une section du détail, montrée repliée : son titre (avec son compte), et ses lignes. */
export interface Repli {
  titre: string
  lignes: string[]
}

/** Un autre choix offert sur une proposition en attente : un geste du métier, appelé directement (un bouton), sans modèle (PLAN-CHOIX.md, lot 3). */
export interface Choix {
  /** Rendu par le code, montré tel quel ; il va au journal comme la consigne, jamais au modèle. */
  libelle: string
  action: string
  params: Record<string, unknown>
}

export interface Tableau {
  demandes: DemandeTableau[]
  /** Les lignes « en attente d'une réponse » que l'interface montre à part (exemple : les délégations proposées). */
  enAttente: { id: string; texte: string }[]
  /** Le nom à afficher pour celui qui parle : le rôle en mots, ou un nom complet. Il ne part jamais au modèle. */
  nom: string
  /** Chaque chaîne de l'interface qui nomme un objet du métier : suggestions par rôle, phrases d'accueil et d'état vide, libellés des conditions. */
  textes: {
    suggestions: string[]
    accueil: string
    vide: string
    conditions: Record<string, string>
  }
}
