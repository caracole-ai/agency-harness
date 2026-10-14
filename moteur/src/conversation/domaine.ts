// Le domaine que disent les prompts du moteur (PLAN-METIER-2.md § 3.5, M7) :
// le cadre, les objets du travail, les modifications possibles, les places des
// consignes-types de la ronde, le motif des identifiants à masquer et la
// phrase d'un rapport sans constat. Le métier les déclare ; le moteur ne dit
// plus aucun métier dans ce qu'il envoie à un modèle.

export interface Domaine {
  /** Le cadre, exemple : « l'outil de planning d'une entreprise de sécurité privée ». */
  cadre: string
  /** Ce qui, demandé autrement, est « je ne sais pas », exemple : « le planning et les agents ». */
  objets: string
  /** Ce qu'une modification peut faire, exemple : « Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible. » ; null = aucune modification possible. */
  modifications: string | null
  /** Les places des consignes-types de la ronde, exemple : ['<agent>', '<du>', '<au>', '<site>', '<vacation>']. */
  places: string[]
  /** Le motif des identifiants à masquer avant la ronde et la mission, exemple : /\bA-\d+\b/g. */
  identifiants: RegExp
  /** La phrase rendue quand aucun constat, exemple : « Aucune vacation contraire à une règle. » */
  rienASignaler: string
  /**
   * Ce que le métier entend par ses mots, dans les termes des tables que lit
   * l'échappée, exemple : « Un ticket est un bug seulement si son lot est
   * recetté (lots.recette_le) ; sinon, une évolution. » Absent : aucune.
   */
  notions?: string[]
}

/** Le motif des identifiants pour `.test()` : sans `g`, qui garderait `lastIndex` d'un appel à l'autre. */
export const motifPourTester = (d: Domaine) =>
  new RegExp(d.identifiants.source, d.identifiants.flags.replace('g', ''))

/** Le motif des identifiants pour `.replace()` : toujours avec `g`, pour masquer chaque occurrence. */
export const motifPourMasquer = (d: Domaine) =>
  new RegExp(
    d.identifiants.source,
    d.identifiants.flags.includes('g') ? d.identifiants.flags : `${d.identifiants.flags}g`,
  )
