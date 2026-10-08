// pnpm veiller --client <dossier> [--date AAAA-MM-JJ] [--sortie rapport.md]
// Lit les données d'un client, vérifie le planning, calcule les échéances,
// journalise, et rend le rapport. Aucun modèle de langage.
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import type { ConfigClient, MetierVeiller } from '../archetypes/metier'
import { veilleDuClient } from '../archetypes/veille-client'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { Journal } from '../journal/journal'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    date: { type: 'string' },
    sortie: { type: 'string' },
  },
})
if (!values.client) {
  console.error('usage : pnpm veiller --client <dossier> [--date AAAA-MM-JJ] [--sortie rapport.md]')
  process.exit(2)
}

const dossier = resolve(values.client)
const cheminConfig = join(dossier, FICHIER_CONFIG)
const { metier } = chargerConfig(cheminConfig, ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { VEILLER?: MetierVeiller<unknown, ConfigClient> }
if (!module.VEILLER) throw new Error(`le métier ${metier} ne sait pas encore veiller`)
const m = module.VEILLER

const aujourdhui = values.date
  ? Temporal.PlainDate.from(values.date)
  : Temporal.Now.plainDateISO(FUSEAU)
const config = chargerConfig(cheminConfig, m.config)
const journal = new Journal(join(dossier, config.journal))
try {
  const { rapport } = veilleDuClient(
    m,
    join(RACINE, 'metiers', metier),
    dossier,
    aujourdhui,
    journal,
  )
  if (values.sortie) writeFileSync(values.sortie, rapport)
  else console.log(rapport)
} finally {
  journal.fermer()
}
