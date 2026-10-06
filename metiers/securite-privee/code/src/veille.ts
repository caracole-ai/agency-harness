import { FenetreSchema, type MetierVeiller, PolitiqueSchema, type Temporal } from '@harnais/moteur'
import { z } from 'zod'
import { lireAgence } from './connecteurs/csv-agence'
import { CONTROLES } from './controles'
import { echeancesSecurite, VEILLES } from './echeances'
import { type Contexte, contexte, intervalleDe } from './semantique'

// Veiller chez un client de la sécurité privée : sa config, la lecture de ses
// données, et la façon de nommer ce dont parle le rapport.

export const ConfigSecurite = z.strictObject({
  client: z.string().min(1),
  metier: z.literal('securite-privee'),
  politique: PolitiqueSchema.optional(),
  donnees: z.strictObject({ agents: z.string(), postes: z.string(), planning: z.string() }),
  journal: z.string(),
  veiller: z.strictObject({
    echeances: z.strictObject({
      depot_renouvellement: FenetreSchema,
      mac: FenetreSchema,
      recyclage_ssiap: FenetreSchema,
      secourisme: FenetreSchema,
      habilitation_electrique: FenetreSchema,
    }),
  }),
})
export type ConfigSecurite = z.infer<typeof ConfigSecurite>

const TITRES: Record<string, string> = {
  carte: 'carte professionnelle',
  mac: 'MAC',
  'recyclage-ssiap': 'recyclage SSIAP',
  secourisme: 'secourisme',
  habilitation: 'habilitation électrique',
}

const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const quand = (z: Temporal.ZonedDateTime) =>
  `${JOURS[z.dayOfWeek - 1]} ${String(z.day).padStart(2, '0')}/${String(z.month).padStart(2, '0')} ${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`

export function decrire(ctx: Contexte, objet: string): string {
  const [agentId, titre] = objet.split('/')
  if (titre !== undefined && agentId !== undefined) {
    return `${ctx.agent(agentId).nom} — ${TITRES[titre] ?? titre}`
  }
  const v = ctx.planning.vacations.find((x) => x.id === objet)
  if (!v) return objet
  const poste = ctx.poste(v.poste)
  const i = intervalleDe(v)
  return `${v.id} · ${ctx.agent(v.agent).nom} · poste ${poste.id} (site ${poste.site}) · ${quand(i.debut)} → ${quand(i.fin)}`
}

export const VEILLER: MetierVeiller<Contexte, ConfigSecurite> = {
  config: ConfigSecurite,
  lire: (dossier, config) => contexte(lireAgence(dossier, config.donnees)),
  resume: (ctx) =>
    `${ctx.planning.agents.length} agents, ${ctx.planning.postes.length} postes, ${ctx.planning.vacations.length} vacations`,
  controles: CONTROLES,
  veilles: VEILLES,
  echeances: (ctx, config, registre, aujourdhui) => {
    const i17 = registre.interdits.find((i) => i.id === 'I-17')
    if (!i17) throw new Error('I-17 absent du registre')
    return echeancesSecurite(ctx, config.veiller.echeances, i17, aujourdhui)
  },
  decrire,
}
