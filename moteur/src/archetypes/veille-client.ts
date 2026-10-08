import type { Journal } from '../journal/journal'
import type { Temporal } from '../temps/temporal'
import type { ConfigClient, MetierVeiller } from './metier'
import { type Passe, passerVeille } from './passe'
import { rendreRapport } from './rapport'

// La veille d'un client, journal compris : la passe, les lignes `veille`,
// `constat` et `alerte`, puis le rapport. Extrait de `cli/veiller.ts` pour que
// `pnpm veiller` et le geste `lancer_veille` de la conversation fassent
// exactement la même chose (PLAN-ESPACES.md § 5.6).

export function veilleDuClient<Contexte, Config extends ConfigClient>(
  m: MetierVeiller<Contexte, Config>,
  dossierMetier: string,
  dossierClient: string,
  aujourdhui: Temporal.PlainDate,
  journal: Journal,
): { passe: Passe<Contexte, Config>; rapport: string } {
  const passe = passerVeille(m, dossierMetier, dossierClient, aujourdhui)
  const { config, registre, ctx, constats, alertes } = passe
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
  return { passe, rapport }
}
