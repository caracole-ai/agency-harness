import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Action, Intention } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import type { MetierConversation } from '../conversation/conversation'
import { TYPE_CONSIGNE, TYPE_PRECISION_ATTENDUE } from '../conversation/conversation'
import type { Domaine } from '../conversation/domaine'
import { TYPE_ECHAPPEE, TYPE_OUTIL_ECHAPPEE } from '../echappee/echappee'
import { type Evenement, Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'

// Pour les tests de la mission et du chantier : un métier minimal et un
// journal écrit à la main, qui porte tout ce que le chantier ne doit jamais
// lire (noms, résultats de requête, textes montrés, instantanés) à côté de ce
// qu'une mission en garde (consignes version modèle, identifiants d'échappée).

export const CLIENT_ESSAI = 'client essai'
export const PERSONNES_ESSAI = [
  { id: 'A-1', nom: 'Rosalie Vernet', sorte: 'personne' as const },
  { id: 'A-2', nom: 'Octave Brunel', sorte: 'personne' as const },
]
/** Ce qui ne doit jamais sortir du journal vers un modèle de l'agence. */
export const SECRETS_ESSAI = {
  resultat: 'Rosalie Vernet | 24 | site Bastion',
  texte: 'Rosalie Vernet a fait 24 heures au Bastion.',
  instantane: 'echappees/E-20261010T0800-aaaa.json',
}

export const CONFIG_ESSAI: ConfigConversation = {
  modele: {
    fournisseur: 'anthropic',
    id: 'simulé',
    prix_par_million_usd: { entree: 1, sortie: 1, cache_ecrit: 0, cache_lu: 0 },
    effort: { traduire: 'low', echappee: 'medium' },
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 1000, secondes: 60 }, par_mois_usd: 30 },
}

const VOIR_PLANNING: Action<Session, unknown> = {
  id: 'voir_planning',
  description: 'le planning',
  parametres: { safeParse: (x: unknown) => ({ success: true, data: x }) } as Action<
    Session,
    unknown
  >['parametres'],
  personnes: { agent: 'la personne' },
  roles: ['patron'],
  ecrit: false,
  reformuler: () => '',
  executer: () => ({ texte: '' }),
}

export const INTENTIONS_ESSAI: Intention[] = [
  { id: 'heures_par_agent', description: 'les heures faites par un agent', ecrit: false },
  { id: 'simuler_absence', description: 'une absence hypothétique', ecrit: false },
  { id: 'liberer_un_jour', description: "libérer un agent d'une journée", ecrit: true },
]

/** Le domaine du métier d'essai : celui du métier livré, recopié (PLAN-METIER-2.md M7). */
export const DOMAINE_ESSAI: Domaine = {
  cadre: "l'outil de planning d'une entreprise de sécurité privée",
  objets: 'le planning et les agents',
  modifications:
    'Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.',
  identifiants: /\bA-\d+\b/g,
  rienASignaler: 'Aucune vacation contraire à une règle.',
}

export interface Session {
  dossier: string
  journal: Journal
}

export const METIER_ESSAI: MetierConversation<Session> = {
  ouvrir: (dossier) => ({ dossier, journal: new Journal(join(dossier, 'journal.sqlite')) }),
  fermer: (s) => s.journal.fermer(),
  config: () => CONFIG_ESSAI,
  client: () => CLIENT_ESSAI,
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => ({
    client: CLIENT_ESSAI,
    journal: new Journal(join(dossier, 'journal.sqlite')),
    config: CONFIG_ESSAI,
  }),
  actions: [VOIR_PLANNING],
  intentions: INTENTIONS_ESSAI,
  roles: [
    {
      id: 'patron',
      enMots: 'le patron',
      identifie: false,
      capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
    },
    { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
  ],
  vocabulaire: () => ({ noms: PERSONNES_ESSAI }),
  noms: () => PERSONNES_ESSAI,
  typesParametre: [],
  domaine: DOMAINE_ESSAI,
  verifierIdentite: () => undefined,
}

const patron = { identite: { role: 'patron' } }

/** Une échappée finie, au journal comme `echappee.ts` l'écrit, avec un résultat de requête. */
export function echappeeEssai(
  id: string,
  conversation: string,
  intention: string,
  consigneModele: string | undefined,
  issue: 'reponse' | 'proposition' | 'abandon' = 'reponse',
  extra: Record<string, unknown> = {},
): Omit<Evenement, 'client'>[] {
  return [
    {
      type: TYPE_CONSIGNE,
      objet: conversation,
      issue: 'nouvelle',
      motif: "Combien d'heures Rosalie ?",
      donnees: patron,
    },
    {
      type: TYPE_OUTIL_ECHAPPEE,
      objet: conversation,
      issue: 'requete',
      donnees: { echappee: id, entree: { sql: 'SELECT 1' }, sortie: SECRETS_ESSAI.resultat },
    },
    { type: TYPE_APPEL, objet: conversation, issue: 'echappee', donnees: { cout_usd: 0.01 } },
    {
      type: TYPE_ECHAPPEE,
      objet: conversation,
      issue,
      motif: "Combien d'heures Rosalie ?",
      donnees: {
        echappee: id,
        intention,
        role: 'patron',
        ...(consigneModele !== undefined ? { consigne_modele: consigneModele } : {}),
        texte_modele: 'A-1 a fait 24 heures.',
        tours: 3,
        cout_usd: 0.01,
        ...(issue === 'reponse' ? { controle_reponse: 'ok', texte: SECRETS_ESSAI.texte } : {}),
        ...(issue === 'abandon' ? { abandon: 'plafond de tours atteint' } : {}),
        instantane: SECRETS_ESSAI.instantane,
        ...extra,
      },
    },
  ]
}

/**
 * Un dossier client d'essai : le 2026-10-09, trois échappées
 * `heures_par_agent` (au seuil), une sans `consigne_modele` ; le 2026-10-10,
 * deux `simuler_absence`, un geste qui nomme quelqu'un, un « je ne sais pas »
 * qui nomme quelqu'un, un refus, une question « vous parlez de qui ? », un
 * abandon ; le 2026-10-11, une échappée (après la fenêtre du 10).
 */
export function dossierEssai(): string {
  const dossier = mkdtempSync(join(tmpdir(), 'client-'))
  writeFileSync(join(dossier, 'config.yaml'), `client: ${CLIENT_ESSAI}\nmetier: essai\n`)
  const s = METIER_ESSAI.ouvrir(dossier)
  const ecrire = (horodatage: string, e: Omit<Evenement, 'client'>[]) =>
    s.journal.ecrire(
      e.map((x) => ({ ...x, client: CLIENT_ESSAI })),
      horodatage,
    )
  ecrire(
    '2026-10-09T07:00:00Z',
    echappeeEssai(
      'E-20261009T0900-0001',
      'C-1',
      'heures_par_agent',
      "Combien d'heures a fait A-1 cette semaine ?",
    ),
  )
  ecrire(
    '2026-10-09T08:00:00Z',
    echappeeEssai(
      'E-20261009T1000-0002',
      'C-2',
      'heures_par_agent',
      "Combien d'heures a fait A-2 du 5 au 11 ?",
    ),
  )
  ecrire(
    '2026-10-09T09:00:00Z',
    echappeeEssai(
      'E-20261009T1100-0003',
      'C-3',
      'heures_par_agent',
      "Et A-1, la semaine d'avant ?",
    ),
  )
  ecrire(
    '2026-10-09T10:00:00Z',
    echappeeEssai('E-20261009T1200-0004', 'C-4', 'heures_par_agent', undefined),
  )
  ecrire(
    '2026-10-10T07:00:00Z',
    echappeeEssai(
      'E-20261010T0900-0005',
      'C-5',
      'simuler_absence',
      'Et si A-1 était absent trois semaines, qui reprendrait ?',
    ),
  )
  ecrire(
    '2026-10-10T08:00:00Z',
    echappeeEssai(
      'E-20261010T1000-0006',
      'C-6',
      'simuler_absence',
      'Si A-2 tombe malade jusqu’à la fin du mois, qui le remplace ?',
    ),
  )
  ecrire('2026-10-10T09:00:00Z', [
    {
      type: TYPE_CONSIGNE,
      objet: 'C-7',
      issue: 'action',
      motif: 'Planning de Rosalie demain',
      donnees: {
        ...patron,
        demande: { sorte: 'action', action: 'voir_planning', params: { agent: 'Rosalie' } },
        params: { agent: 'A-1', du: '2026-10-11', au: '2026-10-11', note: 'chez Rosalie' },
      },
    },
  ])
  ecrire('2026-10-10T10:00:00Z', [
    {
      type: TYPE_CONSIGNE,
      objet: 'C-8',
      issue: 'inconnue',
      motif: 'Envoie la paie à Rosalie Vernet',
      donnees: {
        ...patron,
        demande: { sorte: 'inconnue', raison: 'Rosalie Vernet : pas de paie' },
      },
    },
    {
      type: TYPE_CONSIGNE,
      objet: 'C-9',
      issue: 'refus',
      motif: 'Je suis Octave',
      donnees: { ...patron, erreur: 'Octave inconnu' },
    },
    {
      type: TYPE_CONSIGNE,
      objet: 'C-10',
      issue: 'nouvelle',
      motif: 'Les heures de Rosa ?',
      donnees: patron,
    },
    {
      type: TYPE_PRECISION_ATTENDUE,
      objet: 'C-10',
      issue: 'heures_par_agent',
      motif: 'Vous parlez de qui : Rosalie Vernet ?',
      donnees: {},
    },
  ])
  ecrire(
    '2026-10-10T11:00:00Z',
    echappeeEssai(
      'E-20261010T1300-0007',
      'C-11',
      'liberer_un_jour',
      'Libère le mardi 13 de A-1.',
      'abandon',
    ),
  )
  ecrire(
    '2026-10-11T07:00:00Z',
    echappeeEssai('E-20261011T0900-0008', 'C-12', 'heures_par_agent', 'Plus tard A-1 ?'),
  )
  METIER_ESSAI.fermer(s)
  return dossier
}
