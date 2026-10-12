import { fileURLToPath } from 'node:url'
import {
  type Alerte,
  appliquerPolitique,
  chargerRegistre,
  dateFr,
  decrireEcart,
  depasse,
  type MetierVeiller,
  PARTIES,
  type SectionRapport,
  Temporal,
  taux,
  veiller,
} from '@harnais/moteur'
import { ConfigAgenceWeb } from './config'
import { lireAgenceWeb } from './connecteurs/csv-exports'
import { CONTROLES, type ContexteVeille } from './controles'
import { echeancesAgenceWeb, echeancesDues, INTERDIT_DE_L_ECHEANCE, VEILLES } from './echeances'
import type { Contexte, SORTES_ACCES } from './modele'
import { ecarts, perimetreRecette } from './semantique'

// Veiller chez un client de l'agence web (PLAN-METIER-2.md M13, § 7.4) : sa
// config, la lecture de ses exports, les contrôles, les échéances, et la
// façon de nommer ce dont parle le rapport. Comme la sécurité, le rapport
// nomme les personnes sur qui le dirigeant agit (un accès à révoquer, une
// attestation à demander) ; les clients, projets et pièces y sont désignés par
// leur identifiant et leur libellé, jamais par le nom du client ; un domaine,
// par son nom, comme l'agence le désigne (entretien § 24). Ses sections
// (PLAN-METIER-2.md M12, § 8) suivent la même règle.

/** Le dossier du métier : `regles.yaml` et `scenarios/` y vivent. */
const DOSSIER_METIER = fileURLToPath(new URL('../..', import.meta.url))

// chaque sorte d'accès du modèle a ses mots ; `decrire` y cherche n'importe quel segment d'objet
const SORTES: Record<string, string> = {
  depot: 'dépôt',
  admin_site: 'administration du site',
  hebergeur: 'hébergement',
  registrar: 'compte registrar',
  tiers: 'service tiers',
} satisfies Record<(typeof SORTES_ACCES)[number], string>

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

/** Les titres des sections du métier, après « Sources ». */
export const SECTIONS = {
  ecarts: 'Écarts',
  horsRegles: 'À suivre, hors des règles vérifiées',
} as const

const pourcent = (x: number) => `${Math.round(x * 100)} %`
const parObjet = <T extends { objet: string }>(a: T, b: T) =>
  a.objet.localeCompare(b.objet, 'fr', { numeric: true })

/** Un groupe d'une section : son intitulé et ses lignes, ou rien s'il est vide. */
const groupe = (intitule: string, lignes: string[]) =>
  lignes.length > 0 ? [`- **${intitule}** (${lignes.length})`, ...lignes] : []

/**
 * Les écarts (entretien § 36) : ceux qui atteignent leur seuil, et ceux dont
 * le taux est inconnu alors que quelque chose est consommé (rien de vendu :
 * le moteur ne le dit pas, la section le montre). Groupés par ce qu'ils
 * rapprochent, avec le seuil du client.
 */
export function sectionEcarts(
  ctx: Contexte,
  config: ConfigAgenceWeb,
  aujourdhui: Temporal.PlainDate,
): SectionRapport {
  const montres = ecarts(ctx, config.seuils, aujourdhui).filter(
    (e) => depasse(e) || (taux(e) === null && e.consomme > 0),
  )
  const groupes = new Map<string, { seuil: number; lignes: string[] }>()
  for (const e of montres) {
    const g = groupes.get(e.mesure) ?? { seuil: e.seuil, lignes: [] }
    g.lignes.push(`  - ${decrireEcart(e)}`)
    groupes.set(e.mesure, g)
  }
  return {
    titre: SECTIONS.ecarts,
    lignes: [...groupes].flatMap(([mesure, g]) =>
      groupe(
        `${mesure.charAt(0).toUpperCase()}${mesure.slice(1)}, dès ${pourcent(g.seuil)}`,
        g.lignes,
      ),
    ),
  }
}

/**
 * Ce que le rapport du moteur ne porte pas, faute d'un interdit à citer : les
 * échéances du § 8 qu'aucun interdit ne tient (`INTERDIT_DE_L_ECHEANCE` à
 * `null`), à leur niveau d'alerte, et les tickets « bug » ouverts hors du
 * périmètre recetté (I-05 : la qualification est humaine, le code dit
 * seulement que le périmètre manque ; un ticket résolu n'attend plus rien).
 */
export function sectionHorsRegles(
  ctx: Contexte,
  config: ConfigAgenceWeb,
  aujourdhui: Temporal.PlainDate,
): SectionRapport {
  const registre = appliquerPolitique(chargerRegistre(DOSSIER_METIER), config.politique)
  const dues = echeancesDues(ctx, config.veiller, registre).filter(
    (e) => INTERDIT_DE_L_ECHEANCE[e.cle] === null,
  )
  // `veiller` veut une règle : la clé de l'échéance en tient lieu, rien de ceci ne va au journal
  const alertes = veiller(
    dues.map(({ cle, ...e }) => ({ regle: cle, ...e })),
    aujourdhui,
  ).sort(parObjet)
  const echeances = (niveau: Alerte['niveau']) =>
    alertes
      .filter((a) => a.niveau === niveau)
      .map((a) => `  - **${decrire(ctx, a.objet)}** — ${a.motif}.`)
  const recette = perimetreRecette(ctx)
  const tickets = [...ctx.tickets.values()].filter(
    (t) => t.type === 'bug' && t.etat !== 'resolu' && (t.lot === undefined || !recette.has(t.lot)),
  )
  return {
    titre: SECTIONS.horsRegles,
    lignes: [
      ...groupe(PARTIES.escalades, echeances('escalade')),
      ...groupe(PARTIES.alertes, echeances('alerte')),
      ...groupe(
        'Bugs hors du périmètre recetté, à qualifier par un humain (bug ou évolution)',
        tickets.map(
          (t) =>
            `  - **${decrire(ctx, t.cle)}** — ${t.lot ? `le lot ${t.lot} n'a pas de PV de recette signé` : 'aucun lot : le périmètre recetté est inconnu'}. *I-05*`,
        ),
      ),
    ],
  }
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
  sections: (ctx, config, aujourdhui) => [
    sectionEcarts(ctx, config, aujourdhui),
    sectionHorsRegles(ctx, config, aujourdhui),
  ],
}
