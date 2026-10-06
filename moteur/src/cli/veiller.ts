// pnpm veiller --client <dossier> [--date AAAA-MM-JJ] [--sortie rapport.md]
// Lit les données d'un client, vérifie le planning, calcule les échéances,
// journalise, et rend le rapport. Aucun modèle de langage.
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import type { ConfigClient, MetierVeiller } from '../archetypes/metier'
import { passerVeille } from '../archetypes/passe'
import { rendreRapport } from '../archetypes/rapport'
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
const { config, registre, ctx, constats, alertes } = passerVeille(
  m,
  join(RACINE, 'metiers', metier),
  dossier,
  aujourdhui,
)

const journal = new Journal(join(dossier, config.journal))
journal.ecrire([
  {
    type: 'veille',
    client: config.client,
    donnees: { aujourdhui: aujourdhui.toString(), lu: m.resume(ctx) },
  },
  ...constats.map((c) => ({
    type: 'constat',
    client: config.client,
    regle: c.regle,
    objet: c.objet,
    issue: c.verdict,
    motif: c.motif,
    donnees: c.notes ? { notes: c.notes } : undefined,
  })),
  ...alertes.map((a) => ({
    type: 'alerte',
    client: config.client,
    regle: a.regle,
    objet: a.objet,
    issue: a.niveau,
    motif: a.motif,
  })),
])
journal.fermer()

const rapport = rendreRapport({
  client: config.client,
  aujourdhui,
  registre,
  lu: m.resume(ctx),
  constats,
  alertes,
  perimetre: [...m.controles, ...m.veilles].map((c) => ({
    regle: c.regle,
    ...(c.nonCouvert ? { nonCouvert: c.nonCouvert } : {}),
  })),
  decrire: (objet) => m.decrire(ctx, objet),
})
if (values.sortie) writeFileSync(values.sortie, rapport)
else console.log(rapport)
