// Le métier d'un dossier client, chargé depuis `config.yaml: metier`
// (PLAN-METIER-2.md § 2, M10) : le seul endroit qui sait où vit le code d'un
// métier. Toutes les CLI et l'interface passent par lui ; aucune n'importe un
// métier en dur.
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { ConfigClient, MetierVeiller } from '../archetypes/metier'
import { ConfigBase, chargerConfig, FICHIER_CONFIG, NOM_METIER } from '../config'
import type { MetierConversation } from '../conversation/conversation'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

/** Ce qu'un métier exporte depuis `metiers/<métier>/code/src/index.ts`. */
export interface ModuleMetier {
  CONVERSATION?: MetierConversation<unknown>
  VEILLER?: MetierVeiller<unknown, ConfigClient>
}

/** Le module d'un métier, par son nom (`metiers/<métier>`) ; lève sur un nom qui n'en est pas un : il peut venir d'une mission. */
export async function moduleDuMetier(metier: string): Promise<ModuleMetier> {
  if (!NOM_METIER.test(metier)) throw new Error(`métier « ${metier} » : pas un nom de métier`)
  return (await import(
    pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
  )) as ModuleMetier
}

/** Le nom du métier d'un dossier client et son module, importé depuis `metiers/<métier>`. */
export async function moduleDe(dossier: string): Promise<{ metier: string; module: ModuleMetier }> {
  const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
  return { metier, module: await moduleDuMetier(metier) }
}

/** La conversation du métier qui porte ce nom. */
export async function conversationDuMetier(metier: string): Promise<MetierConversation<unknown>> {
  const module = await moduleDuMetier(metier)
  if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
  return module.CONVERSATION
}

/** Le métier d'un dossier client, importé depuis `metiers/<métier>`. */
export async function metierDe(dossier: string): Promise<MetierConversation<unknown>> {
  return conversationDuMetier(chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase).metier)
}
