import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { ConfigAgenceWeb } from './config'

// Pour les tests de la veille de l'agence web (PLAN-METIER-2.md § 7.4) : la
// config du client fictif, lue dans `exemples/agence-web-fictive/config.yaml`
// (une seule source : le test d'un dossier temporaire l'y recopie telle quelle).

export const CONFIG_FICTIVE = readFileSync(
  fileURLToPath(new URL('../../../../exemples/agence-web-fictive/config.yaml', import.meta.url)),
  'utf8',
)

/** La config fictive, validée par le schéma de l'agence web. */
export const configFictive = (): ConfigAgenceWeb => ConfigAgenceWeb.parse(parse(CONFIG_FICTIVE))
