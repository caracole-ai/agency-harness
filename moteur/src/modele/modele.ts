import type Anthropic from '@anthropic-ai/sdk'

// L'accès au modèle de langage, derrière une interface à nous : un appel, sa
// réponse, ses tokens, son coût. Le reste du moteur ne connaît que `Modele` ;
// l'adaptateur du fournisseur (`anthropic.ts`) et celui des tests
// (`simule.ts`) la remplissent (PLAN-ESPACES.md § 4.1).

export const EFFORTS = ['low', 'medium', 'high'] as const
export type Effort = (typeof EFFORTS)[number]

/** Les tokens d'un appel, tels que le fournisseur les compte. */
export interface UsageModele {
  entree: number
  sortie: number
  cacheEcrit: number
  cacheLu: number
}
export const USAGE_NUL: UsageModele = { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 0 }

export function additionner(a: UsageModele, b: UsageModele): UsageModele {
  return {
    entree: a.entree + b.entree,
    sortie: a.sortie + b.sortie,
    cacheEcrit: a.cacheEcrit + b.cacheEcrit,
    cacheLu: a.cacheLu + b.cacheLu,
  }
}

/** Prix par million de tokens, en dollars (config `conversation.modele.prix_par_million_usd`). */
export interface PrixModele {
  entree: number
  sortie: number
  cacheEcrit: number
  cacheLu: number
}

/** Le coût d'un usage, en dollars, arrondi à 6 décimales. */
export function cout(usage: UsageModele, prix: PrixModele): number {
  const usd =
    (usage.entree * prix.entree +
      usage.sortie * prix.sortie +
      usage.cacheEcrit * prix.cacheEcrit +
      usage.cacheLu * prix.cacheLu) /
    1_000_000
  return Math.round(usd * 1_000_000) / 1_000_000
}

/** Un montant en dollars, deux décimales, virgule française : `1,23`. */
export const dollars = (usd: number) => usd.toFixed(2).replace('.', ',')

export interface AppelModele {
  /** Le bloc système, mis en cache par l'adaptateur (`cache_control: ephemeral`). */
  systeme: string
  messages: Anthropic.MessageParam[]
  outils: Anthropic.Tool[]
  effort: Effort
  maxTokens: number
  /** true → `tool_choice: { type: 'auto', disable_parallel_tool_use: true }`. */
  unSeulOutil: boolean
  /**
   * true : la réponse arrive en flux (SSE), reconstituée en un message par le
   * SDK. Pour un appel long (la fabrication d'un geste appris, plusieurs
   * minutes de réflexion) : une passerelle coupe une réponse non diffusée
   * passé 120 s (GMI, erreur 524, 2026-10-10). Absent : un appel ordinaire.
   */
  flux?: boolean
}

export interface ReponseModele {
  message: Anthropic.Message
  usage: UsageModele
  dureeMs: number
  /**
   * true : le fournisseur n'a pas compté les tokens (GMI, en flux : tout à
   * zéro), et `usage` est une borne haute calculée par l'adaptateur, jamais
   * une estimation basse. Le coût qui en sort majore le vrai.
   */
  usageBorne?: boolean
}

export interface Modele {
  /** L'identifiant du modèle, tel que journalisé (`claude-opus-5-5`, `simulé`). */
  id: string
  appeler(appel: AppelModele): Promise<ReponseModele>
}
