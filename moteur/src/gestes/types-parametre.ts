import type { Designable } from '../conversation/noms'
import { CLES_PERIODE } from './geste-appris'

// Les types de paramètre d'un geste appris (PLAN-METIER-2.md § 3.3, M5) : le
// moteur garde ceux qui ne disent rien d'un métier (`date`, `periode`,
// `nombre`) ; tout le reste est déclaré par le métier, avec une sorte qui dit
// comment le moteur le lit : une personne (résolue comme les gestes codés),
// une entité (résolue par le métier), un texte tel que les données l'écrivent.

export interface TypeParametreDeclare {
  /** Le nom écrit dans `parametres.<nom>.type` d'un geste : minuscules, chiffres, souligné. */
  nom: string
  /** Pour la fabrication : ce que vaut ce type et comment le geste le lie. */
  enMots: string
  sorte: 'personne' | 'entite' | 'texte'
  /** sorte `entite` : l'identifiant exact, sinon le nom unique (insensible à la casse), sinon tous les candidats ; le geste décide. */
  resoudre?: (mention: string, s: unknown) => Designable[]
}

export const TYPES_MOTEUR = ['date', 'periode', 'nombre'] as const
export type TypeMoteur = (typeof TYPES_MOTEUR)[number]

/** Comment le moteur lit un paramètre : la sorte d'un type déclaré, ou le nom d'un type du moteur. */
export type SorteParametre = TypeParametreDeclare['sorte'] | TypeMoteur

/** Ce que les types du moteur valent, pour la fabrication ; lu à l'appel (`geste-appris.ts` importe ce fichier). */
const enMotsMoteur = (nom: TypeMoteur): string =>
  ({
    date: 'un jour, AAAA-MM-JJ',
    periode: `deux bornes, ${CLES_PERIODE.join(' et ')}, AAAA-MM-JJ, les deux incluses ; un geste n'en a qu'une`,
    nombre: 'un entier',
  })[nom]

const estMoteur = (nom: string): nom is TypeMoteur =>
  (TYPES_MOTEUR as readonly string[]).includes(nom)

/** Le type d'un paramètre appris : du moteur ou du métier ; lève s'il n'existe pas. */
export const typeDe = (
  types: TypeParametreDeclare[],
  nom: string,
): Omit<TypeParametreDeclare, 'sorte'> & { sorte: SorteParametre } => {
  if (estMoteur(nom)) return { nom, enMots: enMotsMoteur(nom), sorte: nom }
  const declare = types.find((t) => t.nom === nom)
  if (!declare) throw new Error(`type de paramètre inconnu : ${nom}`)
  return declare
}
