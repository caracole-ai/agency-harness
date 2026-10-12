import { dateFr, type MetierVeiller, Temporal } from '@harnais/moteur'
import { ConfigAgenceWeb } from './config'
import { lireAgenceWeb } from './connecteurs/csv-exports'
import { CONTROLES, type ContexteVeille } from './controles'
import { echeancesAgenceWeb, VEILLES } from './echeances'
import type { Contexte } from './modele'

// Veiller chez un client de l'agence web (PLAN-METIER-2.md M13, § 7.4) : sa
// config, la lecture de ses exports, les contrôles, les échéances, et la
// façon de nommer ce dont parle le rapport. Comme la sécurité, le rapport
// nomme les personnes sur qui le dirigeant agit (un accès à révoquer, une
// attestation à demander) ; les clients, projets et pièces y sont désignés par
// leur identifiant et leur libellé, jamais par le nom du client ; un domaine,
// par son nom, comme l'agence le désigne (entretien § 24).

const SORTES: Record<string, string> = {
  depot: 'dépôt',
  admin_site: 'administration du site',
  hebergeur: 'hébergement',
  registrar: 'compte registrar',
  tiers: 'service tiers',
}

const QUOI: Record<string, string> = {
  echeance: 'échéance de paiement',
  relance: 'relance du devis',
  garantie: 'fin de garantie',
  fin: 'fin du contrat',
  domaine: 'domaine',
  certificat: 'certificat',
  attestation: 'attestation de vigilance URSSAF',
  pv: 'PV de recette',
}

/** Une pièce ou une personne par son identifiant, avec ce qui la situe. */
function entite(ctx: Contexte, id: string): string {
  const personne = ctx.personnes.get(id) ?? ctx.sous_traitants.get(id)
  if (personne) return personne.nom
  const projet = ctx.projets.get(id)
  if (projet) return `${id} · ${projet.nom}${projet.client ? ` (${projet.client})` : ''}`
  const lot = ctx.lots.get(id)
  if (lot) return `${id} · ${lot.nom} (${lot.projet})`
  const piece = ctx.factures.get(id) ?? ctx.devis.get(id) ?? ctx.avenants.get(id)
  if (piece) {
    const client = 'client' in piece ? piece.client : ctx.projets.get(piece.projet)?.client
    return `${id} (${[client, piece.projet].filter(Boolean).join(', ')})`
  }
  const ticket = ctx.tickets.get(id)
  if (ticket) return `${id} · ${ticket.resume}${ticket.projet ? ` (${ticket.projet})` : ''}`
  const contrat = ctx.contrats_tma.get(id)
  if (contrat) return `${id} (${contrat.client})`
  const domaine = ctx.domaines.get(id)
  if (domaine) {
    const situe = [domaine.client, domaine.registrar].filter(Boolean).join(', ')
    return `${id} · ${domaine.nom}${situe ? ` (${situe})` : ''}`
  }
  return id
}

export function decrire(ctx: Contexte, objet: string): string {
  const [id = objet, quoi, ...reste] = objet.split('/')
  if (quoi === undefined) return entite(ctx, id)
  const sorte = SORTES[quoi]
  if (sorte !== undefined) {
    const ressource = reste.join('/')
    const depot = ctx.depots.get(ressource)
    const ou = depot ? `${ressource} (${depot.projet})` : entite(ctx, ressource)
    return `${entite(ctx, id)} — ${sorte} ${ou}`
  }
  if (quoi === 'mise-en-prod' && reste[0]) {
    return `${entite(ctx, id)} — mise en production du ${dateFr(Temporal.PlainDate.from(reste[0]))}`
  }
  if (quoi === 'support') return `${entite(ctx, id)} — fin de support : ${reste.join('/')}`
  return `${entite(ctx, id)} — ${QUOI[quoi] ?? quoi}`
}

export const VEILLER: MetierVeiller<ContexteVeille, ConfigAgenceWeb> = {
  config: ConfigAgenceWeb,
  lire: (dossier, config) => ({ ...lireAgenceWeb(dossier, config.donnees), seuils: config.seuils }),
  resume: (ctx) =>
    `${ctx.projets.size} projets, ${ctx.lots.size} lots, ${ctx.tickets.size} tickets, ${ctx.temps.length} lignes de temps, ${ctx.factures.size} factures, ${ctx.acces.length} accès, ${ctx.domaines.size} domaines`,
  controles: CONTROLES,
  veilles: VEILLES,
  echeances: (ctx, config, registre) => echeancesAgenceWeb(ctx, config.veiller, registre),
  decrire,
}
