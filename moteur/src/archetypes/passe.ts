import { join } from 'node:path'
import { appliquerPolitique, chargerConfig, FICHIER_CONFIG } from '../config'
import { executer } from '../controles/controle'
import { chargerRegistre } from '../regles/registre'
import type { Registre } from '../regles/schema'
import type { Constat } from '../regles/verdict'
import type { Temporal } from '../temps/temporal'
import type { ConfigClient, MetierVeiller } from './metier'
import { type Alerte, veiller } from './veiller'

export interface Passe<Contexte, Config> {
  config: Config
  registre: Registre
  ctx: Contexte
  /** Les constats non conformes, et les conformes qui portent une note (un autre texte conclut autrement). */
  constats: Constat[]
  alertes: Alerte[]
}

/**
 * Une veille chez un client : sa config (validée, sinon rien ne démarre), le
 * registre de son métier sous sa politique, ses données lues, les contrôles
 * et les échéances. Pure : n'écrit ni journal ni rapport.
 */
export function passerVeille<Contexte, Config extends ConfigClient>(
  m: MetierVeiller<Contexte, Config>,
  dossierMetier: string,
  dossierClient: string,
  aujourdhui: Temporal.PlainDate,
): Passe<Contexte, Config> {
  const config = chargerConfig(join(dossierClient, FICHIER_CONFIG), m.config)
  const registre = appliquerPolitique(chargerRegistre(dossierMetier), config.politique)
  const ctx = m.lire(dossierClient, config)
  const constats = executer(m.controles, ctx, registre).filter(
    (c) => c.verdict !== 'ok' || (c.notes?.length ?? 0) > 0,
  )
  const alertes = veiller(m.echeances(ctx, config, registre, aujourdhui), aujourdhui)
  return { config, registre, ctx, constats, alertes }
}
