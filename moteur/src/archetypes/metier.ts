import type { z } from 'zod'
import type { Politique } from '../config'
import type { Controle } from '../controles/controle'
import type { Registre } from '../regles/schema'
import type { Temporal } from '../temps/temporal'
import type { Echeance } from './veiller'

/** Ce que toute config de client porte une fois validée par son métier. */
export interface ConfigClient {
  client: string
  metier: string
  politique?: Politique | undefined
  /** Le journal, relatif au dossier du client. */
  journal: string
}

/**
 * Ce qu'un métier fournit pour que `pnpm veiller` tourne chez un de ses
 * clients (`metiers/<métier>/code/src/index.ts`, export `VEILLER`). Le moteur
 * orchestre ; le métier lit, contrôle, calcule ses échéances et décrit.
 */
export interface MetierVeiller<Contexte, Config extends ConfigClient> {
  config: z.ZodType<Config>
  /** Le connecteur de lecture : les données du client vers le modèle du métier. */
  lire(dossierClient: string, config: Config): Contexte
  /** « 12 agents, 5 postes, 40 vacations » */
  resume(ctx: Contexte): string
  controles: Controle<Contexte>[]
  /** Les règles tenues par des échéances plutôt que par des contrôles. */
  veilles: { regle: string; nonCouvert?: string[] }[]
  echeances(
    ctx: Contexte,
    config: Config,
    registre: Registre,
    aujourdhui: Temporal.PlainDate,
  ): Echeance[]
  decrire(ctx: Contexte, objet: string): string
}
