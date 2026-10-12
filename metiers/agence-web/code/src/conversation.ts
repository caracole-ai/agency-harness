import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  aCapacite,
  appliquerPolitique,
  type ConfigConversation,
  chargerConfig,
  chargerRegistre,
  type Designable,
  echappee,
  FICHIER_CONFIG,
  type Identite,
  type Intention,
  Journal,
  type MetierConversation,
  quiParle,
  type Registre,
  roleDe,
} from '@harnais/moteur'
import { z } from 'zod'
import { ACTIONS } from './actions'
import { ConfigAgenceWeb } from './config'
import { lireAgenceWeb } from './connecteurs/csv-exports'
import { tablesPour } from './copie'
import { DOMAINE } from './domaine'
import type { Contexte } from './modele'
import { type IdRole, ROLES_DECLARES, vueDe } from './roles'
import { TYPES_PARAMETRE } from './types-parametre'

// Ce que l'agence web fournit à la conversation (PLAN-METIER-2.md § 7.4) :
// ouvrir un client (ou son journal seul), ses huit gestes, ses rôles et son
// domaine, la copie de l'échappée à l'échelle du rôle, et tous les noms qui ne
// partent jamais au modèle (M4) : les personnes de l'agence, ses
// sous-traitants, les contacts et les clients, et les noms de domaine, qui
// portent souvent celui d'un client (« ceramiques-orsini.example »). Rien ne
// s'écrit chez l'agence en v1 : l'échappée répond, ne propose jamais, et le
// métier ne déclare ni opération ni proposition.

/** Le dossier du métier : `regles.yaml` et `scenarios/` y vivent. */
const DOSSIER_METIER = fileURLToPath(new URL('../..', import.meta.url))

export interface Session {
  dossier: string
  config: ConfigAgenceWeb
  registre: Registre
  ctx: Contexte
  journal: Journal
}

const configDe = (s: Pick<Session, 'dossier' | 'config'>): ConfigConversation => {
  if (!s.config.conversation) {
    throw new Error(`${s.dossier} : la config n'a pas de section « conversation »`)
  }
  return s.config.conversation
}

function ouvrir(dossier: string): Session {
  const config = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigAgenceWeb)
  const journal = new Journal(join(dossier, config.journal))
  try {
    const s: Session = {
      dossier,
      config,
      registre: appliquerPolitique(chargerRegistre(DOSSIER_METIER), config.politique),
      ctx: lireAgenceWeb(dossier, config.donnees),
      journal,
    }
    configDe(s)
    return s
  } catch (erreur) {
    journal.fermer()
    throw erreur
  }
}

// --- Les noms ---

const personne = (id: string, nom: string): Designable => ({ id, nom, sorte: 'personne' })
const organisation = (id: string, nom: string): Designable => ({ id, nom, sorte: 'organisation' })

/** Au moins autant de lettres qu'un mot propre qu'on masque seul (« Lumen », pas « Les »). */
const LETTRES_MOT_PROPRE = 4

/**
 * Les noms d'un client tels que le masque les cherche. Le moteur cherche un
 * nom par ses formes de personne (prénom seul, nom seul : `formes`), coupées
 * aux espaces ; pour une organisation, ses mots courants (« Agence »,
 * « Atelier », « Groupe ») n'en sont pas des formes sûres : ils masqueraient
 * le mot partout, et rendraient « agence » une fuite. Le nom entier s'écrit
 * donc d'un seul tenant (les tirets valent des espaces pour le masque), et
 * chacun de ses mots propres, coupés aux espaces, apostrophes et tirets (une majuscule ailleurs
 * qu'en tête, quatre lettres au moins : « Orsini », « Castelvert ») se masque
 * seul.
 */
function nomsDuClient(id: string, nom: string): Designable[] {
  const propres = nom
    .split(/[\s'’-]+/)
    .slice(1)
    .filter((m) => /^\p{Lu}/u.test(m) && (m.match(/\p{L}/gu) ?? []).length >= LETTRES_MOT_PROPRE)
  return [
    organisation(id, nom.trim().split(/\s+/).join('-')),
    ...propres.map((m) => organisation(id, m)),
  ]
}

/** Tout nom qui ne part jamais au modèle (M4), tel que le masque et `fuites` le cherchent. */
function noms(s: Session): Designable[] {
  const { ctx } = s
  return [
    ...[...ctx.personnes.values()].map((p) => personne(p.id, p.nom)),
    ...[...ctx.sous_traitants.values()].map((p) => personne(p.id, p.nom)),
    ...[...ctx.contacts.values()].map((c) => personne(c.id, c.nom)),
    ...[...ctx.clients.values()].flatMap((c) => nomsDuClient(c.id, c.nom)),
    // Un nom de domaine, et toute ressource du registre des accès qui le porte, se masque par lui.
    ...[...ctx.domaines.values()].map((d) => organisation(d.id, d.nom)),
  ]
}

/** Les personnes que ce rôle peut désigner dans un geste : toutes celles de l'agence s'il désigne autrui, sinon lui-même. */
function designables(s: Session, identite: Identite): Designable[] {
  const autrui = aCapacite(ROLES_DECLARES, identite, 'designe_autrui')
  return [...s.ctx.personnes.values()]
    .filter((p) => autrui || p.id === identite.personne)
    .map((p) => personne(p.id, p.nom))
}

/**
 * Les noms que le texte montré au demandeur rend en clair (PLAN-PSEUDONYMES.md
 * S4), un par identifiant, tels qu'écrits : ceux que sa vue contient. Pour
 * soi-même, seulement soi.
 */
function visibles(s: Session, identite: Identite): Designable[] {
  const { ctx } = s
  const vue = vueDe(identite)
  if (vue === 'soi') return designables(s, identite)
  return [
    ...designables(s, identite),
    ...(vue === 'tout' ? [...ctx.sous_traitants.values()].map((p) => personne(p.id, p.nom)) : []),
    ...[...ctx.contacts.values()].map((c) => personne(c.id, c.nom)),
    ...[...ctx.clients.values()].map((c) => organisation(c.id, c.nom)),
    ...[...ctx.domaines.values()].map((d) => organisation(d.id, d.nom)),
  ]
}

// --- La conversation ---

/**
 * Les sortes de demandes nouvelles déjà connues : une liste courte, tirée des
 * familles de phrases de l'entretien § 12 qui reviennent (marge, forfaits,
 * heures de maintenance, devis sans réponse, PV non signés, accès), pour que
 * la promotion compte la même demande sous le même mot. Aucune n'écrit.
 */
export const INTENTIONS: Intention[] = [
  {
    id: 'marge_projet',
    description: "la marge d'un projet ou de plusieurs, en euros et en pourcentage",
    ecrit: false,
  },
  {
    id: 'forfaits_depasses',
    description: 'les forfaits dont les jours consommés approchent ou dépassent les jours vendus',
    ecrit: false,
  },
  {
    id: 'heures_tma',
    description: "les heures d'un contrat de maintenance : incluses, consommées, restantes",
    ecrit: false,
  },
  { id: 'devis_sans_reponse', description: 'les devis envoyés restés sans réponse', ecrit: false },
  { id: 'pv_non_signes', description: 'les PV de recette pas encore signés', ecrit: false },
  {
    id: 'acces_ressource',
    description: 'qui a accès à une ressource, et ce qui devrait être révoqué',
    ecrit: false,
  },
]

/** Des exemples de consignes, à cliquer, tirés de l'entretien § 12 : ils montrent ce que l'outil comprend. */
const SUGGESTIONS: Record<IdRole, string[]> = {
  dirigeant: [
    'Où en est le projet de la boulangerie ?',
    'Quelles factures sont en retard ?',
    'Prépare la relance pour la facture FAC-2026-031',
    'Quels domaines expirent dans les 60 jours ?',
  ],
  commercial: [
    'Est-ce que le projet de la boulangerie sera livré fin novembre ?',
    'Quelles factures sont en retard ?',
    'Combien d’heures TMA il reste ce mois chez le cabinet d’avocats ?',
  ],
  po: [
    'Combien de jours on a brûlés sur PRJ-12 par rapport au devis ?',
    'Qui est disponible la semaine prochaine ?',
    'Quels PV de recette ne sont pas signés depuis plus de quinze jours ?',
  ],
  graphiste: [
    'Qu’est-ce que j’ai à faire cette semaine ?',
    'Je suis absent jeudi',
    'Combien de temps j’ai passé ce mois ?',
  ],
  developpeur: [
    'Quels tickets sont à moi ?',
    'Quels domaines expirent dans les 30 jours ?',
    'Je suis absent jeudi',
  ],
}

/** Rien ne s'écrit chez l'agence en v1 : aucune modification ne se vérifie ni ne se décrit. */
const rienNeSEcrit = (): never => {
  throw new Error("rien ne s'écrit chez l'agence : aucune modification n'est possible")
}

export const CONVERSATION: MetierConversation<Session> = {
  ouvrir,
  fermer: (s) => s.journal.fermer(),
  config: configDe,
  client: (s) => s.config.client,
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => {
    const config = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigAgenceWeb)
    const conversation = configDe({ dossier, config })
    return {
      client: config.client,
      journal: new Journal(join(dossier, config.journal)),
      config: conversation,
    }
  },
  actions: ACTIONS,
  intentions: INTENTIONS,
  roles: ROLES_DECLARES,
  domaine: DOMAINE,
  typesParametre: TYPES_PARAMETRE,
  copie: tablesPour,
  vocabulaire: (s, identite) => ({ noms: designables(s, identite) }),
  noms,
  verifierIdentite: (s, identite) => {
    if (
      roleDe(ROLES_DECLARES, identite).identifie &&
      !s.ctx.personnes.has(identite.personne ?? '')
    ) {
      throw new Error(`personne inconnue : ${identite.personne ?? '?'}`)
    }
  },
  // Ni `operation` ni `proposition` : une échappée ne propose jamais, rien ne s'écrit (§ 7.4).
  echappee: (s, identite, conversation, consigne, intention, maintenant, modele, precisions) =>
    echappee(
      {
        client: s.config.client,
        dossierClient: s.dossier,
        conversation,
        journal: s.journal,
        config: configDe(s),
        identite,
        quiParle: quiParle(ROLES_DECLARES, identite),
        domaine: DOMAINE,
      },
      {
        tables: tablesPour(s, identite),
        outils: {
          schemaModifications: z.array(z.never()),
          verifier: rienNeSEcrit,
          decrire: rienNeSEcrit,
          nomRegle: (id) => s.registre.interdits.find((i) => i.id === id)?.nom ?? id,
          proposer: false,
        },
        // Sans proposition, les règles ni les préférences ne sont montrées au modèle.
        regles: [],
        preferences: 'aucune',
        personnes: visibles(s, identite),
        toutes: noms(s),
      },
      consigne,
      intention,
      maintenant,
      modele,
      precisions,
    ),
  tableau: (s, identite) => {
    const nom =
      s.ctx.personnes.get(identite.personne ?? '')?.nom ?? quiParle(ROLES_DECLARES, identite)
    const prenom = nom.split(' ')[0] ?? nom
    const vue = vueDe(identite)
    return {
      demandes: [],
      enAttente: [],
      nom,
      textes: {
        suggestions: SUGGESTIONS[identite.role as IdRole] ?? [],
        accueil:
          vue === 'soi'
            ? `Bonjour ${prenom}. Vous pouvez voir vos tickets, votre temps, l'état de vos projets, ou déclarer une absence.`
            : `Bonjour ${prenom}. Dites-moi ce que vous cherchez, avec vos mots : un projet, les factures en retard, les disponibilités, une relance à préparer.\nRien ne s'écrit chez l'agence : une relance reste un brouillon, jamais envoyé sans le oui du dirigeant.`,
        vide: "Rien en cours : l'outil lit, compte et prépare des brouillons ; il n'écrit rien chez l'agence.",
        conditions: {},
      },
    }
  },
  registre: (s) => s.registre,
}
