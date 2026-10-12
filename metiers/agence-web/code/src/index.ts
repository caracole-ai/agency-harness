// Le code de l'agence web (PLAN-METIER-2.md § 2) : ce que le moteur, le
// registre et les CLI importent de `metiers/agence-web`.
import type { Controle } from '@harnais/moteur'
import type { Contexte } from './modele'

export * from './actions'
export * from './config'
export * from './connecteurs/csv-exports'
export * from './conversation'
export * from './copie'
export * from './domaine'
export * from './modele'
export * from './roles'
export * from './semantique'
export * from './types-parametre'

/**
 * Les interdits codés. `pnpm registre:verifier` les lit dès que ce fichier
 * existe ; le lot 2b (PLAN-METIER-2.md § 7.4) les écrit dans `controles.ts`.
 */
export const CONTROLES: Controle<Contexte>[] = []
