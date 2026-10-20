// Ce que l'interface montre d'un métier (PLAN-METIER-2.md § 3.6, M10) : les
// demandes en cours, les lignes en attente d'une réponse, le nom de qui parle
// et les chaînes qui nomment un objet du métier. Le métier le rend ;
// l'interface ne connaît aucun métier.

export interface DemandeTableau {
  id: string
  sorte: string
  /** L'icône de sa sorte, devant elle (`ICONES`). */
  icone?: Icone
  /** Ce que la demande attend, en quelques mots (exemple : « Remplacer Aïcha Traoré ») ; absent, l'identifiant en tient lieu. */
  titre?: string
  texte: string
  statut: string
  depuis: string
  /** Les décisions offertes sur la demande, à son étape (exemple : valider le remplaçant proposé, ou en prendre un autre) ; chacune un geste, cliqué sans modèle. Absent ou vide : rien à décider. */
  choix?: Choix[]
  /** Le détail qui ne sert pas à décider d'un coup d'œil (exemple : les agents exclus et pourquoi), montré replié sous le texte. */
  replis?: Repli[]
}

/**
 * Les icônes que l'interface sait dessiner, nommées par ce qu'elles montrent :
 * un métier en choisit une pour une section, une ligne ou un type du journal ;
 * l'interface ne connaît aucun métier (ses dessins : `ICONES`, interface/public/static/app.js).
 */
export const ICONES = [
  'filtre',
  'bouclier',
  'donnees',
  'calendrier',
  'message',
  'livre',
  'personne',
  'personnes',
  'personne-absente',
  'lieu',
  'alerte',
  'horloge',
  'echange',
  'crayon',
  'interdit',
  'loupe',
  'coche',
] as const
export type Icone = (typeof ICONES)[number]

/** Ce qu'une étiquette dit, en couleur : lu, modifié ou écrit, envoyé, à surveiller. Son texte reste celui du métier. */
export const TONS = ['lecture', 'ecriture', 'envoi', 'alerte'] as const
export type Ton = (typeof TONS)[number]

/** Une section du détail, montrée repliée : son titre (avec son compte), et ses lignes, chacune un nom et ce qui le concerne. */
export interface Repli {
  titre: string
  /** L'icône de la section, devant son titre. */
  icone?: Icone
  /** Une ligne : son nom, son icône, ses étiquettes en couleur (exemple : « lu », « modifié »), son détail. */
  lignes: {
    titre: string
    detail?: string
    icone?: Icone
    etiquettes?: { texte: string; ton: Ton }[]
  }[]
  /** Montrée ouverte : la section est la réponse elle-même, pas un détail (exemple : les échéances en retard). */
  ouvert?: boolean
}

/** Un autre choix offert sur une proposition en attente : un geste du métier, appelé directement (un bouton), sans modèle (PLAN-CHOIX.md, lot 3). */
export interface Choix {
  /** Rendu par le code, montré tel quel ; il va au journal comme la consigne, jamais au modèle. */
  libelle: string
  /** Ce qui se choisit, en un mot ou un nom (exemple : la personne) ; présent, la page montre le choix en ligne, son `detail` dessous. */
  titre?: string
  /** Pourquoi ce choix, en bref (exemple : « connaît le site · 16 h cette semaine »). */
  detail?: string
  action: string
  params: Record<string, unknown>
}

/** Une ligne en attente d'une réponse, rendue comme une demande : son titre, son texte, son détail. */
export interface EnAttente {
  id: string
  /** Ce qui est proposé, en quelques mots (exemple : « Solliciter le remplaçant sans attendre votre oui ») ; absent, la première ligne du texte en tient lieu. */
  titre?: string
  texte: string
  /** Quand elle a été proposée (instant ISO). */
  depuis?: string
  /** Ses conditions, ce qui ne change pas : montrés comme ceux d'une demande. */
  replis?: Repli[]
}

export interface Tableau {
  demandes: DemandeTableau[]
  /** Les lignes « en attente d'une réponse » que l'interface montre à part (exemple : les délégations proposées). */
  enAttente: EnAttente[]
  /** L'icône des types du journal propres au métier (exemple : `message` → `message`) ; les autres prennent celle de leur sorte. */
  icones?: Record<string, Icone>
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
