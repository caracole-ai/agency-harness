// pnpm --filter @harnais/agence-web fictif --vers <dossier>
//
// Le générateur du client fictif de l'agence web (PLAN-METIER-2.md § 7.1,
// § 7.2, § 7.3, M16, M17) : les CSV du § 7.2, avec les volumes de
// l'entretien § 7, les dix erreurs posées du § 7.3 et les ancres des phrases
// de l'entretien § 12. Déterministe : une graine fixe, un générateur
// congruentiel écrit ici, aucune dépendance, aucune date système ; rejoué, il
// rend les mêmes octets. Ses sorties sont commises dans
// `exemples/agence-web-fictive/`, pour que les tests ne dépendent pas de lui.
//
// Aucune donnée réelle : prénoms, noms, clients et domaines (en `.example`)
// sont inventés ici, d'origines et de genres mêlés, et les erreurs sont
// posées sur des projets, des factures et des accès, sans lien avec les noms.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { ConfigBase, FICHIER_CONFIG, Temporal } from '@harnais/moteur'
import { parse } from 'yaml'
import { METIER } from '../config'
import { colonnes, NOMS_TABLES, type ROLES, type Table } from '../modele'

/** Le jour où l'export a été tiré : les données couvrent les douze mois qui le précèdent. */
export const DATE_REFERENCE = '2026-10-12'
/**
 * Les heures d'un jour chez ce client fictif : les jours consommés s'en
 * déduisent. Sa config (`seuils.heures_par_jour`, lot 2b) doit porter la même.
 */
export const HEURES_PAR_JOUR_FICTIF = 7
const GRAINE = 20261012

const RACINE = fileURLToPath(new URL('../../../../..', import.meta.url))
const CLIENT_FICTIF_SECURITE = join(RACINE, 'exemples', 'client-fictif')

// ---------------------------------------------------------------------------
// Le hasard, rejouable

/** Un générateur congruentiel linéaire (constantes de Numerical Recipes), sur 32 bits. */
class Alea {
  private etat: number
  constructor(graine: number) {
    this.etat = graine >>> 0
  }
  /** Un réel dans [0, 1[. */
  reel(): number {
    this.etat = (Math.imul(this.etat, 1664525) + 1013904223) >>> 0
    return this.etat / 2 ** 32
  }
  /** Un entier dans [min, max], bornes comprises. */
  entier(min: number, max: number): number {
    return min + Math.floor(this.reel() * (max - min + 1))
  }
  choisir<T>(xs: readonly T[]): T {
    const x = xs[Math.floor(this.reel() * xs.length)]
    if (x === undefined) throw new Error('choix dans une liste vide')
    return x
  }
  /** Une clé tirée selon ses poids. */
  pondere(poids: Readonly<Record<string, number>>): string {
    const entrees = Object.entries(poids)
    const total = entrees.reduce((s, [, p]) => s + p, 0)
    let r = this.reel() * total
    for (const [cle, p] of entrees) {
      r -= p
      if (r < 0) return cle
    }
    const derniere = entrees[entrees.length - 1]
    if (!derniere) throw new Error('tirage pondéré sans poids')
    return derniere[0]
  }
  melanger<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = this.entier(0, i)
      const a = xs[i] as T
      xs[i] = xs[j] as T
      xs[j] = a
    }
    return xs
  }
}

// ---------------------------------------------------------------------------
// Les dates

const J = (s: string) => Temporal.PlainDate.from(s)
const REFERENCE = J(DATE_REFERENCE)
/** Le premier jour de l'export : douze mois avant la date de référence, le lendemain. */
const DEBUT_EXPORT = REFERENCE.subtract({ months: 12 }).add({ days: 1 })
const cmp = Temporal.PlainDate.compare
const min = (a: Temporal.PlainDate, b: Temporal.PlainDate) => (cmp(a, b) <= 0 ? a : b)
const max = (a: Temporal.PlainDate, b: Temporal.PlainDate) => (cmp(a, b) >= 0 ? a : b)
const SAMEDI = 6

/** Les jours ouvrés (lundi au vendredi) d'un intervalle, bornes comprises. */
function ouvres(debut: Temporal.PlainDate, fin: Temporal.PlainDate): Temporal.PlainDate[] {
  const jours: Temporal.PlainDate[] = []
  for (let d = debut; cmp(d, fin) <= 0; d = d.add({ days: 1 })) {
    if (d.dayOfWeek < SAMEDI) jours.push(d)
  }
  return jours
}
/** Le premier jour ouvré à partir de celui-ci. */
const ouvreSuivant = (d: Temporal.PlainDate) => {
  let x = d
  while (x.dayOfWeek >= SAMEDI) x = x.add({ days: 1 })
  return x
}

// ---------------------------------------------------------------------------
// Les nombres tels que le CSV les écrit (point décimal)

const euros = (v: number) => (Math.round(v * 100) / 100).toFixed(2)
const nombre = (v: number) => String(Math.round(v * 100) / 100)
const ouiNon = (v: boolean) => (v ? 'oui' : 'non')

// ---------------------------------------------------------------------------
// Les noms, inventés

const PRENOMS = [
  'Julie',
  'Karim',
  'Aïcha',
  'Thomas',
  'Mei',
  'Youssef',
  'Clémence',
  'Ibrahima',
  'Léa',
  'Arnaud',
  'Fatoumata',
  'Hugo',
  'Inès',
  'Dmitri',
  'Nadia',
  'Paulo',
  'Camille',
  'Tariq',
  'Ewa',
  'Mathis',
  'Salomé',
  'Kenji',
  'Amina',
  'Baptiste',
  'Leïla',
  'Sven',
  'Priya',
  'Olivier',
  'Zoé',
  'Mamadou',
  'Chloé',
  'Rafael',
  'Yasmine',
  'Grégoire',
  'Anh',
  'Bilal',
  'Margaux',
  'Nikolaï',
  'Soraya',
  'Étienne',
] as const

const NOMS = [
  'Ndiaye',
  'Lefort',
  'Haddad',
  'Nguyen',
  'Kowalski',
  'Benali',
  'Girard',
  'Traoré',
  'Lemaire',
  'Okafor',
  'Rossi',
  'Chevalier',
  'Mansouri',
  'Tanaka',
  'Fontaine',
  'Petrov',
  'Da Silva',
  'Roux',
  'Bensaïd',
  'Lindqvist',
  'Marchetti',
  'Kaya',
  'Dubreuil',
  'Achour',
  'Leclerc',
  'Mendes',
  'Sow',
  'Vasseur',
  'Cohen',
  'Ferreira',
  'Barbier',
  'Yilmaz',
  'Renard',
  'Diop',
  'Laurent',
  'Kamara',
  'Perrin',
  'Ziani',
  'Hoarau',
  'Brunet',
] as const

type Prenom = (typeof PRENOMS)[number]
type Nom = (typeof NOMS)[number]
type Role = (typeof ROLES)[number]

// ---------------------------------------------------------------------------
// Les spécifications : ce qui est écrit à la main, parce que les erreurs et
// les ancres en dépendent. Le hasard ne remplit que les volumes.

interface SpecPersonne {
  id: string
  prenom: Prenom
  nom: Nom
  role: Role
  tjm: number
  cout: number
  entree: string
}

/** Six personnes, cinq rôles (M18). M-06 est Julie (TK-1042, entretien § 12, phrase 29). */
const PERSONNES: SpecPersonne[] = [
  {
    id: 'M-01',
    prenom: 'Grégoire',
    nom: 'Ndiaye',
    role: 'dirigeant',
    tjm: 750,
    cout: 420,
    entree: '2016-03-01',
  },
  {
    id: 'M-02',
    prenom: 'Leïla',
    nom: 'Fontaine',
    role: 'commercial',
    tjm: 550,
    cout: 260,
    entree: '2019-09-02',
  },
  {
    id: 'M-03',
    prenom: 'Camille',
    nom: 'Nguyen',
    role: 'po',
    tjm: 650,
    cout: 310,
    entree: '2018-01-15',
  },
  {
    id: 'M-04',
    prenom: 'Kenji',
    nom: 'Rossi',
    role: 'graphiste',
    tjm: 580,
    cout: 270,
    entree: '2021-04-06',
  },
  {
    id: 'M-05',
    prenom: 'Bilal',
    nom: 'Kowalski',
    role: 'developpeur',
    tjm: 620,
    cout: 290,
    entree: '2020-06-01',
  },
  {
    id: 'M-06',
    prenom: 'Julie',
    nom: 'Okafor',
    role: 'developpeur',
    tjm: 620,
    cout: 300,
    entree: '2022-02-14',
  },
]

interface SpecClient {
  id: string
  nom: string
  secteur: string
  nda?: boolean
  bonDeCommande?: boolean
  portail?: boolean
  /** Un second contact. */
  deuxContacts?: boolean
  /** Le délai de paiement imposé par le client (sinon 30 jours). */
  delai?: { jours: number; finDeMois: boolean }
}

const CLIENTS: SpecClient[] = [
  { id: 'CLI-01', nom: 'Atelier de ferronnerie Valcourt', secteur: 'artisanat' },
  { id: 'CLI-02', nom: 'Maison de santé des Coteaux', secteur: 'santé' },
  { id: 'CLI-03', nom: 'Boulangerie Fournil des Saules', secteur: 'boulangerie' },
  { id: 'CLI-04', nom: "Compagnie théâtrale L'Escabeau", secteur: 'culture' },
  {
    id: 'CLI-05',
    nom: 'Cabinet Dalbret et associés',
    secteur: "cabinet d'avocats",
    deuxContacts: true,
  },
  { id: 'CLI-06', nom: 'Camping Les Genêts bleus', secteur: 'tourisme' },
  { id: 'CLI-07', nom: 'Transports Mérindol', secteur: 'logistique' },
  {
    id: 'CLI-08',
    nom: 'Groupe Hexalis Industrie',
    secteur: 'industrie',
    nda: true,
    bonDeCommande: true,
    deuxContacts: true,
    delai: { jours: 45, finDeMois: true },
  },
  { id: 'CLI-09', nom: 'Clinique vétérinaire des Aulnes', secteur: 'santé' },
  { id: 'CLI-10', nom: 'Fédération régionale de randonnée', secteur: 'association' },
  { id: 'CLI-11', nom: 'Céramiques Orsini', secteur: 'e-commerce', deuxContacts: true },
  { id: 'CLI-12', nom: 'Cave Lumen', secteur: 'commerce' },
  { id: 'CLI-13', nom: 'Institut de formation Kerdual', secteur: 'formation' },
  {
    id: 'CLI-14',
    nom: 'Communauté de communes des Hautes-Brandes',
    secteur: 'collectivité',
    portail: true,
    deuxContacts: true,
    delai: { jours: 45, finDeMois: true },
  },
  { id: 'CLI-15', nom: 'Studio de yoga Prana Rive', secteur: 'bien-être' },
  { id: 'CLI-16', nom: 'Agence immobilière Castelvert', secteur: 'immobilier' },
  { id: 'CLI-17', nom: 'Brasserie La Mousse dorée', secteur: 'restauration' },
  {
    id: 'CLI-18',
    nom: 'Laboratoire Biocéane',
    secteur: 'recherche',
    nda: true,
    bonDeCommande: true,
    deuxContacts: true,
    delai: { jours: 60, finDeMois: false },
  },
  { id: 'CLI-19', nom: 'École de musique Arpège Nord', secteur: 'culture' },
  { id: 'CLI-20', nom: 'Menuiserie Lacombe frères', secteur: 'artisanat' },
  { id: 'CLI-21', nom: "Épicerie fine Saveurs d'ailleurs", secteur: 'e-commerce' },
  { id: 'CLI-22', nom: "Atelier d'architectes Trait d'encre", secteur: 'architecture' },
  { id: 'CLI-23', nom: 'Association Les Jardins de Lune', secteur: 'association' },
  { id: 'CLI-24', nom: 'Garage Dumontel', secteur: 'automobile' },
  { id: 'CLI-25', nom: "Office de tourisme de la vallée d'Esque", secteur: 'tourisme' },
]

const FONCTIONS = [
  'gérante',
  'directeur',
  'responsable marketing',
  'assistante de direction',
  'responsable informatique',
  'associé',
  'chargée de communication',
  'président',
  'trésorière',
  'responsable des achats',
] as const

interface SpecLot {
  nom: string
  jours: number
  recette?: string
  pv?: string
  /** Le lot a sa ligne dans `recettes.csv` (le registre structuré, tenu depuis l'automne 2025). */
  registre?: boolean
  reserves?: string
  /** Erreur 4 : une facture de solde émise sur ce lot sans PV signé, à cette date. */
  factureSansPv?: string
}

interface SpecAvenant {
  date: string
  jours: number
  etat: 'signe' | 'refuse' | 'envoye'
  motif: string
}

interface SpecProjet {
  id: string
  client?: string
  nom: string
  type: 'forfait' | 'regie' | 'interne'
  etat: 'cadrage' | 'en_cours' | 'recette' | 'livre' | 'garantie' | 'clos'
  debut: string
  finPrevue: string
  miseEnProd?: string
  garantieFin?: string
  po: string
  tjm: number
  lots: SpecLot[]
  /** Le devis signé d'où naît le projet. */
  devis?: { date: string; envoye: string; signe: string; remise: number; signataire: string }
  avenants?: SpecAvenant[]
  /** La part des jours vendus saisie dans la période de l'export ; ou des heures fixes (régie, interne). */
  part?: number
  heures?: number
  /** Les poids de chacun dans les temps du projet. */
  equipe: Record<string, number>
  /** Des lignes de temps imposées (une ancre), comptées dans le total. */
  imposees?: { personne: string; date: string; heures: number }[]
  tickets: number
  /** Les intervenants des tickets, s'ils diffèrent de l'équipe des temps (un sous-traitant). */
  equipeTickets?: Record<string, number>
  depot: { collaborateurs: string[]; miseEnProd?: string; par?: string }
}

const DEVS = { 'M-05': 0.5, 'M-06': 0.5 }

const PROJETS: SpecProjet[] = [
  {
    id: 'PRJ-01',
    client: 'CLI-01',
    nom: 'Site vitrine',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-02-03',
    finPrevue: '2025-05-30',
    miseEnProd: '2025-05-27',
    garantieFin: '2025-08-27',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Maquettes', jours: 8, recette: '2025-03-28', pv: '2025-04-02' },
      { nom: 'Intégration', jours: 10, recette: '2025-05-09', pv: '2025-05-14' },
      { nom: 'Contenus et mise en ligne', jours: 6, recette: '2025-05-21', pv: '2025-05-23' },
    ],
    devis: {
      date: '2025-01-08',
      envoye: '2025-01-10',
      signe: '2025-01-20',
      remise: 0,
      signataire: 'M-01',
    },
    part: 0,
    equipe: DEVS,
    tickets: 0,
    depot: { collaborateurs: ['M-06'], miseEnProd: '2026-09-08', par: 'M-06' },
  },
  {
    id: 'PRJ-02',
    client: 'CLI-05',
    nom: 'Site du cabinet',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-03-03',
    finPrevue: '2025-06-27',
    miseEnProd: '2025-06-24',
    garantieFin: '2025-09-24',
    po: 'M-03',
    tjm: 650,
    lots: [
      { nom: 'Maquettes', jours: 10, recette: '2025-04-11', pv: '2025-04-16' },
      {
        nom: 'Intégration et espace documentaire',
        jours: 12,
        recette: '2025-06-06',
        pv: '2025-06-11',
      },
      { nom: 'Mise en ligne', jours: 8, recette: '2025-06-20', pv: '2025-06-23' },
    ],
    devis: {
      date: '2025-02-03',
      envoye: '2025-02-05',
      signe: '2025-02-17',
      remise: 0.05,
      signataire: 'M-01',
    },
    part: 0,
    equipe: DEVS,
    tickets: 0,
    depot: { collaborateurs: ['M-06'], miseEnProd: '2026-10-01', par: 'M-06' },
  },
  {
    id: 'PRJ-03',
    client: 'CLI-11',
    nom: 'Boutique en ligne',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-01-06',
    finPrevue: '2025-05-30',
    miseEnProd: '2025-06-03',
    garantieFin: '2025-09-03',
    po: 'M-03',
    tjm: 620,
    lots: [
      { nom: 'Maquettes', jours: 15, recette: '2025-02-14', pv: '2025-02-19' },
      { nom: 'Catalogue et panier', jours: 20, recette: '2025-04-11', pv: '2025-04-16' },
      { nom: 'Paiement et livraison', jours: 12, recette: '2025-05-16', pv: '2025-05-21' },
      { nom: 'Reprise des données', jours: 8, recette: '2025-05-28', pv: '2025-05-30' },
    ],
    devis: {
      date: '2024-12-02',
      envoye: '2024-12-04',
      signe: '2024-12-16',
      remise: 0,
      signataire: 'M-01',
    },
    part: 0,
    equipe: DEVS,
    tickets: 0,
    depot: { collaborateurs: ['M-05', 'M-06'], miseEnProd: '2026-10-06', par: 'M-05' },
  },
  {
    id: 'PRJ-04',
    client: 'CLI-08',
    nom: 'Intranet documentaire',
    type: 'regie',
    etat: 'en_cours',
    debut: '2026-03-02',
    finPrevue: '2026-12-18',
    po: 'M-03',
    tjm: 600,
    lots: [{ nom: 'Régie 2026', jours: 100 }],
    devis: {
      date: '2026-02-02',
      envoye: '2026-02-03',
      signe: '2026-02-16',
      remise: 0,
      signataire: 'M-01',
    },
    heures: 420,
    equipe: { 'M-05': 0.7, 'M-03': 0.15, 'M-06': 0.15 },
    tickets: 20,
    depot: { collaborateurs: ['M-05'], miseEnProd: '2026-09-15', par: 'M-05' },
  },
  {
    // Livré en mars 2026, clos, sans TMA : M-05 est encore collaborateur du
    // dépôt (entretien § 12, phrase 28).
    id: 'PRJ-05',
    client: 'CLI-02',
    nom: 'Prise de rendez-vous en ligne',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-10-20',
    finPrevue: '2026-03-13',
    miseEnProd: '2026-03-17',
    garantieFin: '2026-06-17',
    po: 'M-03',
    tjm: 620,
    lots: [
      { nom: 'Maquettes', jours: 12, recette: '2026-01-14', pv: '2026-01-16', registre: true },
      {
        nom: 'Agenda et rendez-vous',
        jours: 15,
        recette: '2026-02-18',
        pv: '2026-02-20',
        registre: true,
        reserves: 'mineure : libellé du rappel à corriger',
      },
      {
        nom: 'Rappels et mise en ligne',
        jours: 10,
        recette: '2026-03-11',
        pv: '2026-03-13',
        registre: true,
      },
    ],
    devis: {
      date: '2025-09-22',
      envoye: '2025-09-24',
      signe: '2025-10-15',
      remise: 0,
      signataire: 'M-01',
    },
    avenants: [
      {
        date: '2026-01-20',
        jours: 4,
        etat: 'signe',
        motif: 'Synchronisation avec un second agenda',
      },
    ],
    part: 0.85,
    equipe: { 'M-01': 0.02, 'M-02': 0.03, 'M-03': 0.15, 'M-04': 0.2, 'M-05': 0.5, 'M-06': 0.1 },
    tickets: 22,
    depot: { collaborateurs: ['M-05'], miseEnProd: '2026-03-17', par: 'M-05' },
  },
  {
    // En garantie : l'erreur 5 (une évolution résolue, rattachée à rien).
    id: 'PRJ-06',
    client: 'CLI-09',
    nom: 'Site et prise de contact',
    type: 'forfait',
    etat: 'garantie',
    debut: '2026-03-02',
    finPrevue: '2026-08-14',
    miseEnProd: '2026-08-18',
    garantieFin: '2026-11-18',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Maquettes', jours: 10, recette: '2026-05-20', pv: '2026-05-22', registre: true },
      { nom: 'Intégration', jours: 14, recette: '2026-07-01', pv: '2026-07-03', registre: true },
      {
        nom: 'Formulaires et mise en ligne',
        jours: 8,
        recette: '2026-08-12',
        pv: '2026-08-14',
        registre: true,
      },
    ],
    devis: {
      date: '2026-01-12',
      envoye: '2026-01-14',
      signe: '2026-02-02',
      remise: 0.1,
      signataire: 'M-01',
    },
    part: 0.82,
    equipe: { 'M-03': 0.15, 'M-04': 0.25, 'M-06': 0.55, 'M-05': 0.05 },
    tickets: 20,
    depot: { collaborateurs: ['M-06'], miseEnProd: '2026-09-10', par: 'M-06' },
  },
  {
    // L'erreur 9 : remise de 15 %, devis signé par la commerciale.
    id: 'PRJ-07',
    client: 'CLI-12',
    nom: 'Site catalogue',
    type: 'forfait',
    etat: 'livre',
    debut: '2026-04-06',
    finPrevue: '2026-09-25',
    miseEnProd: '2026-09-29',
    garantieFin: '2026-12-29',
    po: 'M-03',
    tjm: 620,
    lots: [
      { nom: 'Maquettes', jours: 9, recette: '2026-06-24', pv: '2026-06-26', registre: true },
      { nom: 'Catalogue', jours: 12, recette: '2026-08-26', pv: '2026-08-28', registre: true },
      { nom: 'Mise en ligne', jours: 7, recette: '2026-09-23', pv: '2026-09-25', registre: true },
    ],
    devis: {
      date: '2026-03-02',
      envoye: '2026-03-04',
      signe: '2026-03-18',
      remise: 0.15,
      signataire: 'M-02',
    },
    part: 0.8,
    equipe: { 'M-03': 0.15, 'M-04': 0.25, 'M-05': 0.6 },
    tickets: 18,
    equipeTickets: { 'M-03': 0.15, 'M-04': 0.25, 'M-05': 0.45, 'ST-03': 0.15 },
    depot: { collaborateurs: ['M-05', 'ST-03'], miseEnProd: '2026-09-29', par: 'M-05' },
  },
  {
    id: 'PRJ-08',
    client: 'CLI-14',
    nom: 'Portail des services',
    type: 'forfait',
    etat: 'recette',
    debut: '2026-02-02',
    finPrevue: '2026-10-30',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Maquettes', jours: 12, recette: '2026-05-27', pv: '2026-05-29', registre: true },
      {
        nom: 'Démarches en ligne',
        jours: 14,
        recette: '2026-08-05',
        pv: '2026-08-07',
        registre: true,
      },
      {
        nom: 'Espace agents',
        jours: 10,
        recette: '2026-10-05',
        registre: true,
        reserves: 'deux écrans à reprendre',
      },
    ],
    devis: {
      date: '2025-12-08',
      envoye: '2025-12-10',
      signe: '2026-01-12',
      remise: 0,
      signataire: 'M-01',
    },
    avenants: [
      { date: '2026-06-15', jours: 6, etat: 'refuse', motif: 'Module de paiement en ligne' },
    ],
    part: 0.78,
    equipe: { 'M-03': 0.2, 'M-04': 0.2, 'M-06': 0.5, 'M-05': 0.1 },
    tickets: 22,
    depot: { collaborateurs: ['M-06'], miseEnProd: '2026-08-11', par: 'M-06' },
  },
  {
    // Du temps du graphiste ce mois (entretien § 12, phrase 25).
    id: 'PRJ-09',
    client: 'CLI-15',
    nom: 'Refonte du site et réservation',
    type: 'forfait',
    etat: 'en_cours',
    debut: '2026-07-06',
    finPrevue: '2026-12-11',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Maquettes', jours: 6 },
      { nom: 'Intégration', jours: 14 },
      { nom: 'Réservation en ligne', jours: 8 },
    ],
    devis: {
      date: '2026-05-18',
      envoye: '2026-05-20',
      signe: '2026-06-15',
      remise: 0.05,
      signataire: 'M-01',
    },
    avenants: [
      { date: '2026-09-28', jours: 3, etat: 'envoye', motif: 'Galerie de photos des cours' },
    ],
    part: 0.45,
    equipe: { 'M-02': 0.05, 'M-03': 0.15, 'M-04': 0.35, 'M-05': 0.45 },
    imposees: [
      { personne: 'M-04', date: '2026-10-05', heures: 3 },
      { personne: 'M-04', date: '2026-10-07', heures: 2.5 },
    ],
    tickets: 12,
    depot: { collaborateurs: ['M-05'] },
  },
  {
    // L'erreur 1 : 36 jours consommés pour 24 vendus, 150 %.
    id: 'PRJ-10',
    client: 'CLI-16',
    nom: "Site d'annonces",
    type: 'forfait',
    etat: 'en_cours',
    debut: '2026-03-02',
    finPrevue: '2026-09-30',
    po: 'M-03',
    tjm: 620,
    lots: [
      { nom: 'Maquettes et intégration', jours: 14 },
      { nom: 'Annonces et recherche', jours: 10 },
    ],
    devis: {
      date: '2026-01-26',
      envoye: '2026-01-28',
      signe: '2026-02-16',
      remise: 0,
      signataire: 'M-01',
    },
    part: 1.5,
    equipe: { 'M-03': 0.1, 'M-04': 0.2, 'M-05': 0.35, 'M-06': 0.35 },
    tickets: 20,
    depot: { collaborateurs: ['M-05', 'M-06'] },
  },
  {
    id: 'PRJ-11',
    client: 'CLI-17',
    nom: 'Site et carte en ligne',
    type: 'forfait',
    etat: 'cadrage',
    debut: '2026-09-21',
    finPrevue: '2027-01-29',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Cadrage et maquettes', jours: 4 },
      { nom: 'Site et carte', jours: 18 },
    ],
    devis: {
      date: '2026-08-31',
      envoye: '2026-09-02',
      signe: '2026-09-15',
      remise: 0,
      signataire: 'M-01',
    },
    part: 0.1,
    equipe: { 'M-02': 0.3, 'M-03': 0.4, 'M-04': 0.3 },
    tickets: 4,
    equipeTickets: { 'M-03': 0.5, 'M-04': 0.5 },
    depot: { collaborateurs: ['M-06'] },
  },
  {
    // La boulangerie (entretien § 12, phrases 1, 3, 10, 11, 14, 27, 31) : un
    // forfait en cours, son premier lot recetté et mis en production.
    id: 'PRJ-12',
    client: 'CLI-03',
    nom: 'Site de la boulangerie et commande en ligne',
    type: 'forfait',
    etat: 'en_cours',
    debut: '2026-05-04',
    finPrevue: '2026-11-27',
    po: 'M-03',
    tjm: 600,
    lots: [
      {
        nom: 'Maquettes et vitrine',
        jours: 8,
        recette: '2026-07-20',
        pv: '2026-07-24',
        registre: true,
      },
      { nom: 'Commande en ligne', jours: 12 },
      { nom: 'Paiement et retrait en boutique', jours: 6 },
    ],
    devis: {
      date: '2026-03-23',
      envoye: '2026-03-25',
      signe: '2026-04-13',
      remise: 0,
      signataire: 'M-01',
    },
    avenants: [
      { date: '2026-08-24', jours: 3, etat: 'signe', motif: 'Page des produits de saison' },
    ],
    part: 0.62,
    equipe: { 'M-03': 0.15, 'M-04': 0.25, 'M-05': 0.3, 'M-06': 0.3 },
    tickets: 18,
    depot: { collaborateurs: ['M-05', 'M-06'], miseEnProd: '2026-07-28', par: 'M-05' },
  },
  {
    id: 'PRJ-13',
    client: 'CLI-18',
    nom: 'Développements applicatifs',
    type: 'regie',
    etat: 'en_cours',
    debut: '2025-10-01',
    finPrevue: '2026-12-31',
    po: 'M-03',
    tjm: 650,
    lots: [{ nom: 'Régie 2025-2026', jours: 200 }],
    devis: {
      date: '2025-09-01',
      envoye: '2025-09-02',
      signe: '2025-09-15',
      remise: 0,
      signataire: 'M-01',
    },
    heures: 1050,
    equipe: { 'M-06': 0.6, 'M-05': 0.25, 'M-03': 0.15 },
    tickets: 30,
    depot: { collaborateurs: ['M-06'], miseEnProd: '2026-09-30', par: 'M-06' },
  },
  {
    // TK-1050 : un bug sur le lot « Intégration », jamais recetté (erreur 6).
    id: 'PRJ-14',
    client: 'CLI-19',
    nom: 'Site et inscriptions',
    type: 'forfait',
    etat: 'en_cours',
    debut: '2026-06-01',
    finPrevue: '2026-12-18',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Maquettes', jours: 8 },
      { nom: 'Intégration', jours: 12 },
      { nom: 'Inscriptions en ligne', jours: 10 },
    ],
    devis: {
      date: '2026-04-20',
      envoye: '2026-04-22',
      signe: '2026-05-11',
      remise: 0,
      signataire: 'M-01',
    },
    avenants: [{ date: '2026-09-07', jours: 2, etat: 'signe', motif: 'Export des inscrits' }],
    part: 0.55,
    equipe: { 'M-03': 0.15, 'M-04': 0.25, 'M-05': 0.6 },
    tickets: 16,
    equipeTickets: { 'M-03': 0.15, 'M-04': 0.25, 'M-05': 0.4, 'ST-02': 0.2 },
    depot: { collaborateurs: ['M-05', 'ST-02'] },
  },
  {
    // L'erreur 10 : la dernière mise en production sans sauvegarde de la veille.
    id: 'PRJ-15',
    client: 'CLI-20',
    nom: 'Site vitrine et devis en ligne',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-06-02',
    finPrevue: '2025-10-31',
    miseEnProd: '2025-11-04',
    garantieFin: '2026-02-04',
    po: 'M-03',
    tjm: 600,
    lots: [
      { nom: 'Pages vitrines', jours: 8, recette: '2025-10-13', pv: '2025-10-14', registre: true },
      { nom: 'Intégration', jours: 12, recette: '2025-10-22', pv: '2025-10-24', registre: true },
      { nom: 'Devis en ligne', jours: 6, recette: '2025-10-29', pv: '2025-10-31', registre: true },
    ],
    devis: {
      date: '2025-05-05',
      envoye: '2025-05-07',
      signe: '2025-05-19',
      remise: 0,
      signataire: 'M-01',
    },
    part: 0.3,
    equipe: { 'M-03': 0.15, 'M-04': 0.1, 'M-05': 0.75 },
    tickets: 6,
    depot: { collaborateurs: ['M-05'], miseEnProd: '2026-09-24', par: 'M-05' },
  },
  {
    // CLI-07 : des factures cette année ; l'erreur 4 sur le lot 2.
    id: 'PRJ-16',
    client: 'CLI-07',
    nom: 'Suivi des expéditions',
    type: 'forfait',
    etat: 'en_cours',
    debut: '2025-12-01',
    finPrevue: '2026-11-13',
    po: 'M-03',
    tjm: 650,
    lots: [
      {
        nom: 'Tableau de bord des expéditions',
        jours: 12,
        recette: '2026-04-13',
        pv: '2026-04-17',
        registre: true,
      },
      {
        nom: 'Notifications clients',
        jours: 15,
        recette: '2026-08-24',
        registre: true,
        factureSansPv: '2026-09-01',
      },
      { nom: 'Application des chauffeurs', jours: 18 },
    ],
    devis: {
      date: '2025-10-27',
      envoye: '2025-10-29',
      signe: '2025-11-17',
      remise: 0.05,
      signataire: 'M-01',
    },
    avenants: [
      {
        date: '2026-05-11',
        jours: 5,
        etat: 'signe',
        motif: 'Export vers le logiciel de facturation',
      },
    ],
    part: 0.7,
    equipe: { 'M-03': 0.15, 'M-04': 0.15, 'M-06': 0.55, 'M-05': 0.15 },
    tickets: 26,
    equipeTickets: { 'M-03': 0.15, 'M-04': 0.15, 'M-06': 0.5, 'ST-02': 0.2 },
    depot: { collaborateurs: ['M-06', 'ST-02'], miseEnProd: '2026-04-21', par: 'M-06' },
  },
  {
    id: 'PRJ-17',
    nom: "Site de l'agence",
    type: 'interne',
    etat: 'en_cours',
    debut: '2026-01-05',
    finPrevue: '2026-12-18',
    po: 'M-01',
    tjm: 0,
    lots: [],
    heures: 350,
    equipe: { 'M-01': 0.1, 'M-02': 0.1, 'M-04': 0.4, 'M-05': 0.2, 'M-06': 0.2 },
    tickets: 10,
    equipeTickets: { 'M-04': 0.5, 'M-05': 0.25, 'M-06': 0.25 },
    depot: { collaborateurs: ['M-05', 'M-06'], miseEnProd: '2026-06-12', par: 'M-05' },
  },
  {
    // Clos, en TMA : ST-02 est encore au registre et au dépôt (erreur 3).
    id: 'PRJ-18',
    client: 'CLI-10',
    nom: 'Calendrier des sorties',
    type: 'forfait',
    etat: 'clos',
    debut: '2025-08-04',
    finPrevue: '2025-12-12',
    miseEnProd: '2025-12-09',
    garantieFin: '2026-03-09',
    po: 'M-03',
    tjm: 600,
    lots: [
      {
        nom: 'Calendrier et inscriptions',
        jours: 10,
        recette: '2025-11-12',
        pv: '2025-11-14',
        registre: true,
      },
      {
        nom: 'Espace adhérents et mise en ligne',
        jours: 8,
        recette: '2025-12-03',
        pv: '2025-12-05',
        registre: true,
      },
    ],
    devis: {
      date: '2025-06-30',
      envoye: '2025-07-02',
      signe: '2025-07-21',
      remise: 0,
      signataire: 'M-01',
    },
    part: 0.5,
    equipe: { 'M-03': 0.15, 'M-04': 0.15, 'M-06': 0.7 },
    tickets: 6,
    equipeTickets: { 'M-03': 0.15, 'M-04': 0.15, 'M-06': 0.5, 'ST-02': 0.2 },
    depot: { collaborateurs: ['M-06', 'ST-02'], miseEnProd: '2026-07-15', par: 'M-06' },
  },
]

interface SpecTma {
  id: string
  client: string
  projet?: string
  heures: number
  tarifHoraire: number
  debut: string
  fin: string
  preavis: number
  tickets: number
  equipe: Record<string, number>
  /** La facture annuelle de ce contrat est payée en retard, après une relance. */
  payeeEnRetard?: boolean
}

const TMA: SpecTma[] = [
  {
    id: 'TMA-01',
    client: 'CLI-01',
    projet: 'PRJ-01',
    heures: 6,
    tarifHoraire: 85,
    debut: '2025-09-01',
    fin: '2027-08-31',
    preavis: 60,
    tickets: 4,
    equipe: { 'M-06': 0.8, 'M-03': 0.2 },
  },
  {
    // Le cabinet d'avocats (entretien § 12, phrase 9).
    id: 'TMA-02',
    client: 'CLI-05',
    projet: 'PRJ-02',
    heures: 8,
    tarifHoraire: 90,
    debut: '2025-10-01',
    fin: '2026-12-31',
    preavis: 30,
    tickets: 6,
    equipe: { 'M-06': 0.8, 'M-03': 0.2 },
  },
  {
    // Le client e-commerce (entretien § 12, phrases 5 et 26).
    id: 'TMA-03',
    client: 'CLI-11',
    projet: 'PRJ-03',
    heures: 15,
    tarifHoraire: 85,
    debut: '2025-09-15',
    fin: '2027-09-14',
    preavis: 60,
    tickets: 12,
    equipe: { 'M-05': 0.8, 'M-06': 0.1, 'M-03': 0.1 },
  },
  {
    id: 'TMA-04',
    client: 'CLI-10',
    projet: 'PRJ-18',
    heures: 6,
    tarifHoraire: 80,
    debut: '2026-03-10',
    fin: '2027-03-09',
    preavis: 30,
    tickets: 4,
    equipe: { 'M-06': 0.9, 'M-03': 0.1 },
  },
  {
    id: 'TMA-05',
    client: 'CLI-20',
    projet: 'PRJ-15',
    heures: 6,
    tarifHoraire: 85,
    debut: '2026-02-05',
    fin: '2027-02-04',
    preavis: 30,
    tickets: 4,
    equipe: { 'M-05': 0.9, 'M-03': 0.1 },
  },
  {
    id: 'TMA-06',
    client: 'CLI-04',
    heures: 4,
    tarifHoraire: 85,
    debut: '2024-11-01',
    fin: '2027-10-31',
    preavis: 30,
    tickets: 3,
    equipe: { 'M-05': 0.7, 'M-04': 0.3 },
  },
  {
    id: 'TMA-07',
    client: 'CLI-06',
    heures: 4,
    tarifHoraire: 85,
    debut: '2025-04-01',
    fin: '2027-03-31',
    preavis: 30,
    tickets: 3,
    equipe: { 'M-06': 1 },
    payeeEnRetard: true,
  },
  {
    id: 'TMA-08',
    client: 'CLI-13',
    heures: 5,
    tarifHoraire: 85,
    debut: '2025-01-01',
    fin: '2026-12-31',
    preavis: 60,
    tickets: 3,
    equipe: { 'M-05': 1 },
  },
  {
    id: 'TMA-09',
    client: 'CLI-21',
    heures: 10,
    tarifHoraire: 85,
    debut: '2024-06-01',
    fin: '2027-05-31',
    preavis: 60,
    tickets: 6,
    equipe: { 'M-05': 0.5, 'M-06': 0.4, 'M-04': 0.1 },
  },
  {
    id: 'TMA-10',
    client: 'CLI-22',
    heures: 4,
    tarifHoraire: 85,
    debut: '2025-07-01',
    fin: '2027-06-30',
    preavis: 30,
    tickets: 2,
    equipe: { 'M-06': 1 },
  },
  {
    id: 'TMA-11',
    client: 'CLI-23',
    heures: 3,
    tarifHoraire: 85,
    debut: '2025-02-01',
    fin: '2027-01-31',
    preavis: 30,
    tickets: 1,
    equipe: { 'M-05': 1 },
  },
  {
    id: 'TMA-12',
    client: 'CLI-24',
    heures: 4,
    tarifHoraire: 85,
    debut: '2024-09-01',
    fin: '2027-08-31',
    preavis: 30,
    tickets: 2,
    equipe: { 'M-06': 1 },
  },
]

/** Les devis sans projet : refusés, expirés, en attente, en brouillon (40 devis en tout). */
const DEVIS_SANS_PROJET: {
  client: string
  date: string
  jours: number
  etat: 'brouillon' | 'envoye' | 'refuse' | 'expire'
  envoye?: string
}[] = [
  { client: 'CLI-25', date: '2025-10-20', jours: 14, etat: 'expire', envoye: '2025-10-22' },
  { client: 'CLI-06', date: '2025-11-03', jours: 6, etat: 'refuse', envoye: '2025-11-05' },
  { client: 'CLI-13', date: '2025-11-17', jours: 9, etat: 'expire', envoye: '2025-11-18' },
  { client: 'CLI-21', date: '2025-12-01', jours: 5, etat: 'refuse', envoye: '2025-12-02' },
  { client: 'CLI-04', date: '2025-12-15', jours: 8, etat: 'expire', envoye: '2025-12-16' },
  { client: 'CLI-24', date: '2026-01-05', jours: 4, etat: 'refuse', envoye: '2026-01-06' },
  { client: 'CLI-22', date: '2026-01-19', jours: 10, etat: 'expire', envoye: '2026-01-21' },
  { client: 'CLI-09', date: '2026-02-09', jours: 3, etat: 'refuse', envoye: '2026-02-10' },
  { client: 'CLI-01', date: '2026-02-23', jours: 5, etat: 'expire', envoye: '2026-02-24' },
  { client: 'CLI-25', date: '2026-03-09', jours: 12, etat: 'refuse', envoye: '2026-03-11' },
  { client: 'CLI-11', date: '2026-03-30', jours: 7, etat: 'expire', envoye: '2026-03-31' },
  { client: 'CLI-23', date: '2026-04-13', jours: 4, etat: 'refuse', envoye: '2026-04-14' },
  { client: 'CLI-10', date: '2026-04-27', jours: 6, etat: 'expire', envoye: '2026-04-28' },
  { client: 'CLI-05', date: '2026-05-11', jours: 5, etat: 'refuse', envoye: '2026-05-12' },
  { client: 'CLI-20', date: '2026-05-26', jours: 8, etat: 'expire', envoye: '2026-05-27' },
  { client: 'CLI-02', date: '2026-06-08', jours: 6, etat: 'refuse', envoye: '2026-06-09' },
  { client: 'CLI-16', date: '2026-06-22', jours: 4, etat: 'expire', envoye: '2026-06-23' },
  { client: 'CLI-12', date: '2026-07-06', jours: 9, etat: 'refuse', envoye: '2026-07-07' },
  { client: 'CLI-07', date: '2026-09-14', jours: 10, etat: 'envoye', envoye: '2026-09-14' },
  { client: 'CLI-25', date: '2026-09-28', jours: 15, etat: 'envoye', envoye: '2026-09-28' },
  { client: 'CLI-03', date: '2026-10-07', jours: 4, etat: 'envoye', envoye: '2026-10-07' },
  { client: 'CLI-17', date: '2026-10-08', jours: 3, etat: 'brouillon' },
  { client: 'CLI-21', date: '2026-10-09', jours: 6, etat: 'brouillon' },
]
const TJM_DEVIS = 600
const REMISES_COURANTES = [0, 0, 0.05, 0.1] as const

/** Les sous-traitants : ST-01 à 8 000 € dont l'attestation a plus de six mois (erreur 7). */
const SOUS_TRAITANTS = [
  { id: 'ST-01', montant: 8000, attestation: '2026-02-10' },
  { id: 'ST-02', montant: 12500, attestation: '2026-07-20' },
  { id: 'ST-03', montant: 3200, attestation: '2026-06-15' },
] as const

/**
 * Les domaines : `null` laisse le hasard tirer la date. DOM-23 a expiré
 * (erreur 2) ; le certificat de DOM-07 expire dans dix jours (erreur 2) ;
 * DOM-08 et DOM-15 expirent dans les soixante jours (entretien § 12, phrase 7).
 */
const DOMAINES: { client: string; nom: string; expire?: string; certificat?: string }[] = [
  { client: 'CLI-01', nom: 'atelier-valcourt.example' },
  { client: 'CLI-02', nom: 'maison-sante-coteaux.example' },
  { client: 'CLI-03', nom: 'fournil-des-saules.example' },
  { client: 'CLI-03', nom: 'commande-fournil-des-saules.example' },
  { client: 'CLI-04', nom: 'escabeau-theatre.example' },
  { client: 'CLI-05', nom: 'cabinet-dalbret.example' },
  { client: 'CLI-06', nom: 'camping-genets-bleus.example', certificat: '2026-10-22' },
  { client: 'CLI-07', nom: 'transports-merindol.example', expire: '2026-11-20' },
  { client: 'CLI-09', nom: 'veterinaire-des-aulnes.example' },
  { client: 'CLI-10', nom: 'rando-federation.example' },
  { client: 'CLI-11', nom: 'ceramiques-orsini.example' },
  { client: 'CLI-11', nom: 'orsini-pro.example' },
  { client: 'CLI-12', nom: 'cave-lumen.example' },
  { client: 'CLI-13', nom: 'kerdual-formation.example' },
  { client: 'CLI-15', nom: 'prana-rive.example', expire: '2026-12-05' },
  { client: 'CLI-16', nom: 'castelvert-immobilier.example' },
  { client: 'CLI-17', nom: 'mousse-doree.example' },
  { client: 'CLI-19', nom: 'arpege-nord.example' },
  { client: 'CLI-20', nom: 'menuiserie-lacombe.example' },
  { client: 'CLI-21', nom: 'saveurs-ailleurs.example' },
  { client: 'CLI-21', nom: 'boutique-saveurs-ailleurs.example' },
  { client: 'CLI-22', nom: 'trait-d-encre.example' },
  { client: 'CLI-23', nom: 'jardins-de-lune.example', expire: '2026-10-03' },
  { client: 'CLI-24', nom: 'garage-dumontel.example' },
  { client: 'CLI-01', nom: 'valcourt-ferronnerie.example' },
  { client: 'CLI-05', nom: 'dalbret-avocats.example' },
  { client: 'CLI-09', nom: 'aulnes-veto.example' },
  { client: 'CLI-10', nom: 'sorties-rando.example' },
  { client: 'CLI-12', nom: 'lumen-cave.example' },
  { client: 'CLI-20', nom: 'devis-lacombe.example' },
]
const REGISTRARS = ['registrar-a', 'registrar-b', 'registrar-c'] as const

/** Les versions des composants, telles que le client les a fournies. */
const VERSIONS: [string, string, string, string][] = [
  ['PRJ-01', 'cms', '6.5', '2027-09-30'],
  ['PRJ-02', 'cms', '6.5', '2027-09-30'],
  ['PRJ-03', 'cms e-commerce', '9.1', '2027-08-31'],
  ['PRJ-03', 'langage serveur', '8.1', '2026-12-31'],
  ['PRJ-04', 'framework', '7.1', '2028-01-31'],
  ['PRJ-05', 'framework', '6.4', '2027-11-30'],
  ['PRJ-06', 'cms', '6.6', '2028-03-31'],
  ['PRJ-07', 'cms', '6.6', '2028-03-31'],
  ['PRJ-08', 'framework', '7.1', '2028-01-31'],
  ['PRJ-09', 'cms', '6.6', '2028-03-31'],
  ['PRJ-10', 'framework', '7.2', '2028-07-31'],
  ['PRJ-12', 'framework', '4.2', '2027-11-30'],
  ['PRJ-12', 'langage serveur', '8.3', '2027-12-31'],
  ['PRJ-13', 'framework', '6.4', '2027-11-30'],
  ['PRJ-14', 'cms', '6.6', '2028-03-31'],
  ['PRJ-15', 'cms', '6.4', '2027-02-28'],
  ['PRJ-16', 'framework', '7.1', '2028-01-31'],
  ['PRJ-18', 'cms', '6.5', '2027-09-30'],
]

/** Les sauvegardes de routine, en plus de celles des mises en production. */
const SAUVEGARDES_DE_ROUTINE: [string, string, string][] = [
  ['PRJ-01', '2026-02-02', 'M-06'],
  ['PRJ-02', '2026-03-02', 'M-06'],
  ['PRJ-03', '2026-04-06', 'M-05'],
  ['PRJ-03', '2026-06-01', 'M-05'],
  ['PRJ-03', '2026-08-03', 'M-05'],
  ['PRJ-13', '2026-01-12', 'M-06'],
  ['PRJ-13', '2026-05-18', 'M-06'],
  ['PRJ-16', '2026-07-06', 'M-06'],
  ['PRJ-12', '2026-09-14', 'M-05'],
  ['PRJ-18', '2026-01-19', 'M-06'],
]
/** L'erreur 10 : la dernière sauvegarde de PRJ-15 date d'une semaine avant sa mise en production. */
const SAUVEGARDE_ANCIENNE: [string, string, string] = ['PRJ-15', '2026-09-17', 'M-05']

/** Les accès hors dépôts (13) ; ceux des dépôts viennent de leurs collaborateurs. */
const ACCES_HORS_DEPOTS: {
  ressource: string
  sorte: 'hebergeur' | 'registrar' | 'admin_site' | 'tiers'
  personne: string
  depuis: string
  jusqua?: string
  revoque?: string
}[] = [
  {
    ressource: 'ceramiques-orsini.example',
    sorte: 'admin_site',
    personne: 'M-05',
    depuis: '2025-01-13',
  },
  {
    ressource: 'ceramiques-orsini.example',
    sorte: 'admin_site',
    personne: 'M-06',
    depuis: '2025-02-03',
  },
  {
    ressource: 'ceramiques-orsini.example',
    sorte: 'hebergeur',
    personne: 'M-01',
    depuis: '2025-01-06',
  },
  {
    ressource: 'ceramiques-orsini.example',
    sorte: 'hebergeur',
    personne: 'M-05',
    depuis: '2025-05-12',
  },
  {
    ressource: 'passerelle de paiement de ceramiques-orsini.example',
    sorte: 'tiers',
    personne: 'M-01',
    depuis: '2025-04-14',
  },
  { ressource: 'registrar-a', sorte: 'registrar', personne: 'M-01', depuis: '2016-03-01' },
  { ressource: 'registrar-a', sorte: 'registrar', personne: 'M-05', depuis: '2021-01-11' },
  { ressource: 'registrar-b', sorte: 'registrar', personne: 'M-01', depuis: '2019-06-03' },
  {
    ressource: 'fournil-des-saules.example',
    sorte: 'admin_site',
    personne: 'M-05',
    depuis: '2026-05-11',
  },
  {
    ressource: 'fournil-des-saules.example',
    sorte: 'hebergeur',
    personne: 'M-01',
    depuis: '2026-05-04',
  },
  {
    ressource: 'cave-lumen.example',
    sorte: 'admin_site',
    personne: 'ST-03',
    depuis: '2026-04-13',
    jusqua: '2026-12-29',
  },
  {
    ressource: 'cabinet-dalbret.example',
    sorte: 'admin_site',
    personne: 'M-06',
    depuis: '2025-03-10',
  },
  {
    ressource: 'maison-sante-coteaux.example',
    sorte: 'admin_site',
    personne: 'ST-01',
    depuis: '2025-11-03',
    jusqua: '2026-03-13',
    revoque: '2026-03-20',
  },
]
/** Un accès au dépôt révoqué à la fin de la mission : ST-01 n'est plus collaborateur de PRJ-05. */
const ACCES_DEPOT_REVOQUES = [
  {
    projet: 'PRJ-05',
    personne: 'ST-01',
    depuis: '2025-11-03',
    jusqua: '2026-03-13',
    revoque: '2026-03-20',
  },
]

// ---------------------------------------------------------------------------
// Les textes des tickets et des temps : aucun nom, aucun chiffre qui compte.

const RESUMES = {
  design: [
    "Maquette de la page d'accueil",
    'Maquette mobile',
    'Charte des boutons',
    'Maquette du formulaire',
    'Pictogrammes',
    'Maquette de la page produit',
    'Déclinaison des visuels',
  ],
  dev: [
    'Formulaire de contact',
    'Export CSV',
    'Page de recherche',
    'Envoi des courriels',
    'Filtres du catalogue',
    'Connexion des utilisateurs',
    'Pagination des listes',
    'Tableau de bord',
    'Import des données',
    'Optimisation des images',
    'Plan du site',
    'Mise à jour des dépendances',
    'Accessibilité des formulaires',
    'Traductions des libellés',
  ],
  bug: [
    "Erreur à l'envoi du formulaire",
    'Affichage cassé sur mobile',
    'Lien mort dans le pied de page',
    'Total du panier erroné',
    'Lenteur de la page catalogue',
    'Courriel de confirmation non reçu',
  ],
  pilotage: [
    'Préparer la recette',
    'Compte rendu du point client',
    'Planifier la mise en ligne',
    'Rédiger le cahier de recette',
  ],
} as const

const COMMENTAIRES: Record<Role, readonly string[]> = {
  dirigeant: ['relecture', 'point client', ''],
  commercial: ['cadrage', 'rendez-vous client', ''],
  po: ['recette', 'point client', 'planification', 'divers', ''],
  graphiste: ['maquettes', 'retouches', 'divers', ''],
  developpeur: ['développement', 'revue de code', 'correction', 'divers', ''],
}

// ---------------------------------------------------------------------------
// La génération

type Ligne = Record<string, string>
type Sortie = Record<Table, Ligne[]>

const roleDe = (id: string): Role => {
  const p = PERSONNES.find((x) => x.id === id)
  if (!p) throw new Error(`personne ${id} inconnue`)
  return p.role
}
const nomComplet = (prenom: string, nom: string) => `${prenom} ${nom}`

function ecrireCsv(table: Table, lignes: Ligne[]): string {
  const cols = colonnes(table)
  const cellule = (l: Ligne, c: string) => {
    const v = l[c]
    if (v === undefined) throw new Error(`${table} : colonne ${c} absente d'une ligne`)
    if (/[;"\n\r]/.test(v)) throw new Error(`${table} : cellule non écrivable « ${v} »`)
    return v
  }
  for (const l of lignes) {
    const enTrop = Object.keys(l).filter((c) => !cols.includes(c))
    if (enTrop.length > 0) throw new Error(`${table} : colonnes en trop ${enTrop.join(', ')}`)
  }
  return `${[cols.join(';'), ...lignes.map((l) => cols.map((c) => cellule(l, c)).join(';'))].join('\n')}\n`
}

/** Répartit `heures` en `n` lignes d'une demi-heure à huit heures. */
function repartir(alea: Alea, heures: number, n: number): number[] {
  const unites = Math.round(heures * 2)
  if (n < 1 || unites < n || unites > 16 * n)
    throw new Error(`${heures} h en ${n} lignes : impossible`)
  const u = new Array<number>(n).fill(1)
  let reste = unites - n
  while (reste > 0) {
    const i = alea.entier(0, n - 1)
    if ((u[i] ?? 0) < 16) {
      u[i] = (u[i] ?? 0) + 1
      reste--
    }
  }
  return u.map((x) => x / 2)
}

/** Une activité sur laquelle on saisit du temps : un projet, ou un mois d'un contrat TMA. */
interface Activite {
  imputation: string
  debut: Temporal.PlainDate
  fin: Temporal.PlainDate
  heures: number
  equipe: Record<string, number>
  imposees: { personne: string; date: string; heures: number }[]
  lignes: number
}

const LIGNES_DE_TEMPS = 1500
const TICKETS = 300
/** Le premier ticket de l'export : TK-1050 est le dernier créé. */
const PREMIER_TICKET = 751
const PLAFOND_JOUR = 8

const fenetreProjet = (p: SpecProjet) => ({
  debut: max(J(p.debut), DEBUT_EXPORT),
  fin: min(p.garantieFin ? J(p.garantieFin) : REFERENCE, REFERENCE),
})

/** Rend les lignes de chaque table du client fictif, dans l'ordre où elles s'écrivent. */
export function genererAgenceWeb(): Sortie {
  const alea = new Alea(GRAINE)
  const s = Object.fromEntries(NOMS_TABLES.map((t) => [t, [] as Ligne[]])) as Sortie

  // Les noms tirés (contacts et sous-traitants) : chaque prénom et chaque nom
  // une fois au plus, jamais ceux de l'équipe, pour qu'un prénom désigne une
  // seule personne (« Julie », entretien § 12, phrase 29).
  const prenoms = alea.melanger(PRENOMS.filter((x) => !PERSONNES.some((p) => p.prenom === x)))
  const noms = alea.melanger(NOMS.filter((x) => !PERSONNES.some((p) => p.nom === x)))
  const nomTire = () => {
    const prenom = prenoms.pop()
    const nom = noms.pop()
    if (!prenom || !nom) throw new Error('plus de noms à tirer')
    return nomComplet(prenom, nom)
  }

  // Les personnes.
  for (const p of PERSONNES) {
    s.personnes.push({
      id: p.id,
      nom: nomComplet(p.prenom, p.nom),
      role: p.role,
      tjm_vente_eur: euros(p.tjm),
      cout_journalier_eur: euros(p.cout),
      entree_le: p.entree,
    })
  }

  // Les clients : un contrat de sous-traitance RGPD pour chaque client dont
  // l'agence héberge un site (I-14).
  const heberges = new Set(DOMAINES.map((d) => d.client))
  for (const c of CLIENTS) {
    s.clients.push({
      id: c.id,
      nom: c.nom,
      secteur: c.secteur,
      nda: ouiNon(c.nda === true),
      contrat_art28: ouiNon(heberges.has(c.id)),
      bon_de_commande_obligatoire: ouiNon(c.bonDeCommande === true),
      portail_fournisseur: ouiNon(c.portail === true),
    })
  }

  // Les contacts.
  let ct = 0
  for (const c of CLIENTS) {
    for (let k = 0; k < (c.deuxContacts ? 2 : 1); k++) {
      ct++
      s.contacts.push({
        id: `CT-${String(ct).padStart(2, '0')}`,
        client: c.id,
        nom: nomTire(),
        fonction: alea.choisir(FONCTIONS),
      })
    }
  }

  // Les projets et leurs lots.
  const lotsDe = new Map<string, { id: string; spec: SpecLot; montant: number }[]>()
  let numeroLot = 0
  for (const p of PROJETS) {
    s.projets.push({
      id: p.id,
      client: p.client ?? '',
      nom: p.nom,
      type: p.type,
      etat: p.etat,
      debut: p.debut,
      fin_prevue: p.finPrevue,
      mise_en_prod_le: p.miseEnProd ?? '',
      garantie_fin: p.garantieFin ?? '',
      po: p.po,
    })
    const lots: { id: string; spec: SpecLot; montant: number }[] = []
    for (const l of p.lots) {
      numeroLot++
      const id = `LOT-${String(numeroLot).padStart(3, '0')}`
      const montant = l.jours * p.tjm * (1 - (p.devis?.remise ?? 0))
      lots.push({ id, spec: l, montant })
      s.lots.push({
        id,
        projet: p.id,
        nom: l.nom,
        jours_vendus: nombre(l.jours),
        montant_ht_eur: euros(montant),
        recette_le: l.recette ?? '',
        pv_signe_le: l.pv ?? '',
      })
    }
    lotsDe.set(p.id, lots)
  }
  const lotsDuProjet = (id: string) => lotsDe.get(id) ?? []

  // Les devis, numérotés par année dans l'ordre des dates.
  const devisBruts: Ligne[] = []
  for (const p of PROJETS) {
    if (!p.devis || !p.client) continue
    const jours = p.lots.reduce((x, l) => x + l.jours, 0)
    const montant = lotsDuProjet(p.id).reduce((x, l) => x + l.montant, 0)
    devisBruts.push({
      id: '',
      client: p.client,
      projet: p.id,
      date: p.devis.date,
      montant_ht_eur: euros(montant),
      jours: nombre(jours),
      etat: 'signe',
      signataire: p.devis.signataire,
      remise: nombre(p.devis.remise),
      clause_cession: 'oui',
      envoye_le: p.devis.envoye,
      signe_le: p.devis.signe,
    })
  }
  for (const d of DEVIS_SANS_PROJET) {
    const remise = alea.choisir(REMISES_COURANTES)
    devisBruts.push({
      id: '',
      client: d.client,
      projet: '',
      date: d.date,
      montant_ht_eur: euros(d.jours * TJM_DEVIS * (1 - remise)),
      jours: nombre(d.jours),
      etat: d.etat,
      signataire: '',
      remise: nombre(remise),
      clause_cession: 'oui',
      envoye_le: d.envoye ?? '',
      signe_le: '',
    })
  }
  devisBruts.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const compteurs = new Map<string, number>()
  const numeroter = (prefixe: string, date: string) => {
    const annee = date.slice(0, 4)
    const n = (compteurs.get(`${prefixe}${annee}`) ?? 0) + 1
    compteurs.set(`${prefixe}${annee}`, n)
    return `${prefixe}-${annee}-${String(n).padStart(3, '0')}`
  }
  const devisDuProjet = new Map<string, string>()
  for (const d of devisBruts) {
    d.id = numeroter('DEV', d.date ?? '')
    if (d.projet) devisDuProjet.set(d.projet, d.id)
    s.devis.push(d)
  }

  // Les avenants, numérotés de même.
  const avenants = PROJETS.flatMap((p) => (p.avenants ?? []).map((a) => ({ p, a }))).sort((x, y) =>
    x.a.date.localeCompare(y.a.date),
  )
  const avenantsSignes = new Map<string, { id: string; date: string }[]>()
  for (const { p, a } of avenants) {
    const id = numeroter('AVE', a.date)
    const devis = devisDuProjet.get(p.id)
    if (!devis) throw new Error(`${p.id} : avenant sans devis`)
    s.avenants.push({
      id,
      devis,
      projet: p.id,
      date: a.date,
      montant_ht_eur: euros(a.jours * p.tjm),
      jours: nombre(a.jours),
      etat: a.etat,
      signataire: a.etat === 'signe' ? 'M-01' : '',
      motif: a.motif,
    })
    if (a.etat === 'signe') {
      const liste = avenantsSignes.get(p.id) ?? []
      liste.push({ id, date: a.date })
      avenantsSignes.set(p.id, liste)
    }
  }

  // Les contrats TMA.
  for (const t of TMA) {
    s.contrats_tma.push({
      id: t.id,
      client: t.client,
      projet: t.projet ?? '',
      heures_incluses_mois: nombre(t.heures),
      montant_ht_mois_eur: euros(t.heures * t.tarifHoraire),
      debut: t.debut,
      fin: t.fin,
      preavis_jours: nombre(t.preavis),
    })
  }

  // Les temps : chaque activité reçoit ses heures, puis un nombre de lignes
  // proportionnel, ajusté pour que le total fasse 1 500.
  const activites: Activite[] = []
  for (const p of PROJETS) {
    const f = fenetreProjet(p)
    const vendus =
      p.lots.reduce((x, l) => x + l.jours, 0) +
      (p.avenants ?? []).filter((a) => a.etat === 'signe').reduce((x, a) => x + a.jours, 0)
    const heures = p.heures ?? Math.round((p.part ?? 0) * vendus * HEURES_PAR_JOUR_FICTIF * 2) / 2
    if (heures === 0) continue
    activites.push({
      imputation: p.id,
      debut: f.debut,
      fin: f.fin,
      heures,
      equipe: p.equipe,
      imposees: p.imposees ?? [],
      lignes: 0,
    })
  }
  for (const t of TMA) {
    let mois = max(J(t.debut), DEBUT_EXPORT).toPlainYearMonth()
    const dernier = REFERENCE.toPlainYearMonth()
    while (Temporal.PlainYearMonth.compare(mois, dernier) <= 0) {
      const debut = max(mois.toPlainDate({ day: 1 }), max(J(t.debut), DEBUT_EXPORT))
      const fin = min(mois.toPlainDate({ day: mois.daysInMonth }), REFERENCE)
      // De 20 à 70 % des heures incluses, arrondi à la demi-heure (75 % au
      // plus) : aucun contrat n'atteint les 80 % de l'entretien § 9.
      const part = mois.equals(dernier) ? 0.1 + alea.reel() * 0.25 : 0.2 + alea.reel() * 0.5
      const heures = Math.max(0.5, Math.round(t.heures * part * 2) / 2)
      activites.push({
        imputation: t.id,
        debut,
        fin,
        heures,
        equipe: t.equipe,
        imposees: [],
        lignes: 0,
      })
      mois = mois.add({ months: 1 })
    }
  }
  // Le nombre de lignes d'une activité : une demi-heure au moins par ligne,
  // une ligne par personne et par jour au plus, huit heures par ligne au plus.
  const minLignes = (a: Activite) => Math.max(Math.ceil(a.heures / PLAFOND_JOUR), a.imposees.length)
  const maxLignes = (a: Activite) =>
    Math.min(a.heures * 2, ouvres(a.debut, a.fin).length * Object.keys(a.equipe).length)
  const totalHeures = activites.reduce((x, a) => x + a.heures, 0)
  for (const a of activites) {
    const voulu = Math.round((a.heures * LIGNES_DE_TEMPS) / totalHeures)
    a.lignes = Math.min(maxLignes(a), Math.max(minLignes(a), voulu))
  }
  let ecart = activites.reduce((x, a) => x + a.lignes, 0) - LIGNES_DE_TEMPS
  while (ecart !== 0) {
    const enTrop = ecart > 0
    const candidates = activites.filter((a) =>
      enTrop ? a.lignes > minLignes(a) : a.lignes < maxLignes(a),
    )
    // On retire à l'activité aux lignes les plus courtes, on ajoute à celle aux plus longues.
    const cible = candidates.reduce((m, a) =>
      (
        enTrop
          ? a.heures / a.lignes < m.heures / m.lignes
          : a.heures / a.lignes > m.heures / m.lignes
      )
        ? a
        : m,
    )
    cible.lignes += enTrop ? -1 : 1
    ecart += enTrop ? -1 : 1
  }
  const charge = new Map<string, number>()
  const occupees = new Set<string>()
  const temps: { personne: string; projet: string; date: string; heures: number }[] = []
  const placer = (personne: string, projet: string, date: Temporal.PlainDate, heures: number) => {
    const cle = `${personne} ${date}`
    charge.set(cle, (charge.get(cle) ?? 0) + heures)
    occupees.add(`${cle} ${projet}`)
    temps.push({ personne, projet, date: date.toString(), heures })
  }
  for (const a of activites) {
    for (const i of a.imposees) placer(i.personne, a.imputation, J(i.date), i.heures)
    const heuresImposees = a.imposees.reduce((x, i) => x + i.heures, 0)
    const jours = ouvres(a.debut, a.fin)
    for (const h of repartir(alea, a.heures - heuresImposees, a.lignes - a.imposees.length)) {
      let place = false
      for (let essai = 0; essai < 200 && !place; essai++) {
        const personne = alea.pondere(a.equipe)
        const date = alea.choisir(jours)
        const cle = `${personne} ${date}`
        if (occupees.has(`${cle} ${a.imputation}`)) continue
        if ((charge.get(cle) ?? 0) + h > PLAFOND_JOUR) continue
        placer(personne, a.imputation, date, h)
        place = true
      }
      if (!place) throw new Error(`${a.imputation} : une ligne de ${h} h ne trouve pas de place`)
    }
  }
  temps.sort(
    (x, y) =>
      x.date.localeCompare(y.date) ||
      x.personne.localeCompare(y.personne) ||
      x.projet.localeCompare(y.projet),
  )
  for (const t of temps) {
    s.temps.push({
      personne: t.personne,
      projet: t.projet,
      date: t.date,
      heures: nombre(t.heures),
      commentaire: alea.choisir(COMMENTAIRES[roleDe(t.personne)]),
    })
  }

  // Les tickets : tirés par activité, triés par date de création, numérotés
  // ensuite ; TK-1042 et TK-1050, les derniers créés, sont des ancres.
  const perimetre = new Map<string, string>()
  for (const p of PROJETS)
    for (const l of lotsDuProjet(p.id)) if (l.spec.pv) perimetre.set(l.id, l.spec.pv)
  const tickets: Ligne[] = []
  const tirerResume = (personne: string, type: string) => {
    if (type === 'bug') return alea.choisir(RESUMES.bug)
    if (personne.startsWith('ST-')) return alea.choisir(RESUMES.dev)
    const role = roleDe(personne)
    if (role === 'graphiste') return alea.choisir(RESUMES.design)
    if (role === 'po') return alea.choisir(RESUMES.pilotage)
    return alea.choisir(RESUMES.dev)
  }
  const etatDe = (cree: Temporal.PlainDate, finActivite: Temporal.PlainDate) => {
    const age = cree.until(REFERENCE).days
    const close = cmp(finActivite, REFERENCE) < 0
    const resolu = close || (age > 21 ? alea.reel() < 0.85 : age > 0 && alea.reel() < 0.15)
    if (resolu) {
      const limite = close ? finActivite : REFERENCE
      return {
        etat: 'resolu',
        resolu_le: min(cree.add({ days: alea.entier(1, 20) }), limite).toString(),
      }
    }
    return { etat: alea.pondere({ a_faire: 0.45, en_cours: 0.4, en_revue: 0.15 }), resolu_le: '' }
  }
  for (const p of PROJETS) {
    if (p.tickets === 0) continue
    const f = fenetreProjet(p)
    const jours = ouvres(f.debut, f.fin)
    const equipe =
      p.equipeTickets ??
      Object.fromEntries(Object.entries(p.equipe).filter(([id]) => !['M-01', 'M-02'].includes(id)))
    const lots = lotsDuProjet(p.id)
    for (let k = 0; k < p.tickets; k++) {
      const cree = alea.choisir(jours)
      const assigne = alea.pondere(equipe)
      const lot = lots.length > 0 ? alea.choisir(lots) : undefined
      const recette =
        lot !== undefined && perimetre.has(lot.id) && cmp(J(perimetre.get(lot.id) ?? ''), cree) < 0
      const type =
        p.type === 'interne' || p.etat === 'cadrage'
          ? 'tache'
          : alea.pondere(
              recette
                ? { bug: 0.4, evolution: 0.2, tache: 0.3, '': 0.1 }
                : { evolution: 0.25, tache: 0.6, '': 0.15 },
            )
      const avenantsAvant = (avenantsSignes.get(p.id) ?? []).filter(
        (a) => cmp(J(a.date), cree) <= 0,
      )
      const rattache =
        lot === undefined
          ? ''
          : type === 'evolution' && avenantsAvant.length > 0 && alea.reel() < 0.5
            ? alea.choisir(avenantsAvant).id
            : lot.id
      tickets.push({
        cle: '',
        projet: p.id,
        lot: lot?.id ?? '',
        contrat_tma: '',
        resume: tirerResume(assigne, type),
        type,
        ...etatDe(cree, f.fin),
        assigne,
        estimation_h: nombre(type === 'bug' ? alea.entier(1, 6) : alea.entier(1, 16)),
        cree_le: cree.toString(),
        rattache_a: rattache,
      })
    }
  }
  for (const t of TMA) {
    const jours = ouvres(max(J(t.debut), DEBUT_EXPORT), REFERENCE)
    const lots = t.projet ? lotsDuProjet(t.projet) : []
    for (let k = 0; k < t.tickets; k++) {
      const cree = alea.choisir(jours)
      const assigne = alea.pondere(t.equipe)
      const type = alea.pondere(
        lots.length > 0
          ? { bug: 0.5, evolution: 0.25, tache: 0.15, '': 0.1 }
          : { evolution: 0.5, tache: 0.35, '': 0.15 },
      )
      tickets.push({
        cle: '',
        projet: t.projet ?? '',
        lot: lots.length > 0 ? alea.choisir(lots).id : '',
        contrat_tma: t.id,
        resume: tirerResume(assigne, type),
        type,
        ...etatDe(cree, REFERENCE),
        assigne,
        estimation_h: nombre(type === 'bug' ? alea.entier(1, 6) : alea.entier(1, 16)),
        cree_le: cree.toString(),
        rattache_a: t.id,
      })
    }
  }
  if (tickets.length !== TICKETS) throw new Error(`${tickets.length} tickets, ${TICKETS} attendus`)
  tickets.sort((x, y) => (x.cree_le ?? '').localeCompare(y.cree_le ?? ''))
  tickets.forEach((t, i) => {
    t.cle = `TK-${String(PREMIER_TICKET + i).padStart(4, '0')}`
  })
  const ticket = (cle: string) => {
    const t = tickets.find((x) => x.cle === cle)
    if (!t) throw new Error(`${cle} absent`)
    return t
  }
  const lotNomme = (projet: string, nom: string) => {
    const l = lotsDuProjet(projet).find((x) => x.spec.nom === nom)
    if (!l) throw new Error(`${projet} : lot « ${nom} » absent`)
    return l.id
  }
  // TK-1042 : à qualifier, assigné à Julie, sur la TMA du cabinet (phrases 17 et 29).
  Object.assign(ticket('TK-1042'), {
    projet: 'PRJ-02',
    lot: lotNomme('PRJ-02', 'Intégration et espace documentaire'),
    contrat_tma: 'TMA-02',
    resume: 'Envoyer aussi une copie du formulaire au secrétariat',
    type: '',
    etat: 'en_cours',
    resolu_le: '',
    assigne: 'M-06',
    estimation_h: '2',
    rattache_a: 'TMA-02',
  })
  // TK-1050 : noté bug sur un lot jamais recetté (erreur 6, phrase 30).
  const integration14 = lotNomme('PRJ-14', 'Intégration')
  Object.assign(ticket('TK-1050'), {
    projet: 'PRJ-14',
    lot: integration14,
    contrat_tma: '',
    resume: "Le formulaire d'inscription ne s'envoie pas",
    type: 'bug',
    etat: 'a_faire',
    resolu_le: '',
    assigne: 'M-05',
    estimation_h: '3',
    rattache_a: integration14,
  })
  // L'erreur 5 : le premier ticket de PRJ-06 créé pendant sa garantie devient
  // une évolution résolue, rattachée à rien.
  const garantie06 = tickets.find(
    (t) =>
      t.projet === 'PRJ-06' &&
      (t.cree_le ?? '') > '2026-08-18' &&
      t.cle !== 'TK-1042' &&
      t.cle !== 'TK-1050',
  )
  if (!garantie06) throw new Error('PRJ-06 : aucun ticket créé pendant la garantie')
  const resolu06 = min(J(garantie06.cree_le ?? '').add({ days: 5 }), REFERENCE).toString()
  Object.assign(garantie06, {
    lot: '',
    resume: "Ajouter un second formulaire pour les demandes d'urgence",
    assigne: 'M-06',
    type: 'evolution',
    etat: 'resolu',
    resolu_le: resolu06,
    rattache_a: '',
  })
  s.tickets.push(...tickets)

  // Les factures : acomptes, lots, régies au réel du mois, TMA à l'année.
  interface Brute {
    l: Ligne
    delai: { jours: number; finDeMois: boolean }
    /** Une erreur posée : ni payée, ni relancée par le générateur. */
    posee?: boolean
    payeeEnRetard?: boolean
  }
  const brutes: Brute[] = []
  const delaiDe = (client: string) =>
    CLIENTS.find((c) => c.id === client)?.delai ?? { jours: 30, finDeMois: false }
  const facture = (
    client: string,
    projet: string,
    lot: string,
    date: string,
    ht: number,
    extra: Partial<Brute> = {},
  ) => {
    brutes.push({
      l: {
        id: '',
        client,
        projet,
        lot,
        date,
        montant_ht_eur: euros(ht),
        tva: '0.2',
        montant_ttc_eur: euros((Math.round(ht * 100) / 100) * 1.2),
        echeance: '',
        delai_jours: '',
        fin_de_mois: '',
        etat: '',
        payee_le: '',
        penalites_mentionnees: 'oui',
        indemnite_40_mentionnee: 'oui',
      },
      delai: delaiDe(client),
      ...extra,
    })
  }
  for (const p of PROJETS) {
    if (!p.client) continue
    if (p.type === 'forfait' && p.devis && cmp(J(p.devis.signe), DEBUT_EXPORT) >= 0) {
      const total = lotsDuProjet(p.id).reduce((x, l) => x + l.montant, 0)
      facture(p.client, p.id, '', p.devis.signe, total * 0.3)
    }
    for (const l of lotsDuProjet(p.id)) {
      const date =
        l.spec.factureSansPv ?? (l.spec.pv ? J(l.spec.pv).add({ days: 2 }).toString() : undefined)
      if (date === undefined || cmp(J(date), DEBUT_EXPORT) < 0) continue
      facture(p.client, p.id, l.id, date, l.montant * 0.7, {
        posee: l.spec.factureSansPv !== undefined,
      })
    }
    if (p.type === 'regie') {
      let mois = max(J(p.debut), DEBUT_EXPORT).toPlainYearMonth()
      while (Temporal.PlainYearMonth.compare(mois, REFERENCE.toPlainYearMonth()) < 0) {
        const heures = temps
          .filter((t) => t.projet === p.id && J(t.date).toPlainYearMonth().equals(mois))
          .reduce((x, t) => x + t.heures, 0)
        const date = mois.add({ months: 1 }).toPlainDate({ day: 1 }).toString()
        // L'erreur 8 : la régie du laboratoire facturée en mars à 90 jours, sans pénalités.
        const erreur8 = p.id === 'PRJ-13' && date === '2026-03-01'
        // Une facture de régie payée en retard, après une relance.
        const enRetard = p.id === 'PRJ-13' && date === '2026-05-01'
        facture(p.client, p.id, '', date, (heures / HEURES_PAR_JOUR_FICTIF) * p.tjm, {
          ...(erreur8 ? { delai: { jours: 90, finDeMois: false }, posee: true } : {}),
          ...(enRetard ? { payeeEnRetard: true } : {}),
        })
        if (erreur8) {
          const derniere = brutes[brutes.length - 1]
          if (derniere) derniere.l.penalites_mentionnees = 'non'
        }
        mois = mois.add({ months: 1 })
      }
    }
  }
  for (const t of TMA) {
    let anniversaire = J(t.debut)
    while (cmp(anniversaire, DEBUT_EXPORT) < 0) anniversaire = anniversaire.add({ years: 1 })
    if (cmp(anniversaire, REFERENCE) > 0) continue
    facture(t.client, t.projet ?? '', '', anniversaire.toString(), t.heures * t.tarifHoraire * 12, {
      payeeEnRetard: t.payeeEnRetard === true,
    })
  }
  brutes.sort((x, y) => (x.l.date ?? '').localeCompare(y.l.date ?? ''))
  for (const b of brutes) b.l.id = numeroter('FAC', b.l.date ?? '')
  // FAC-2026-031 : échue, impayée, relancée deux fois (phrases 2 et 6).
  const impayee = brutes.find((b) => b.l.id === 'FAC-2026-031')
  if (!impayee || impayee.posee) throw new Error('FAC-2026-031 ne peut pas porter l’ancre')
  const relances: Ligne[] = []
  for (const b of brutes) {
    const date = J(b.l.date ?? '')
    let echeance = date.add({ days: b.delai.jours })
    if (b.delai.finDeMois)
      echeance = echeance.toPlainYearMonth().toPlainDate({ day: echeance.daysInMonth })
    Object.assign(b.l, {
      echeance: echeance.toString(),
      delai_jours: nombre(b.delai.jours),
      fin_de_mois: ouiNon(b.delai.finDeMois),
    })
    const relancer = (jours: number, niveau: string, par: string) => {
      const d = ouvreSuivant(echeance.add({ days: jours }))
      if (cmp(d, REFERENCE) > 0) throw new Error(`${b.l.id} : relance après la date de référence`)
      relances.push({ facture: b.l.id ?? '', date: d.toString(), niveau, par })
      return d
    }
    let payee: Temporal.PlainDate | undefined
    // L'erreur 4 (une facture de lot sans PV) reste impayée : le client la conteste.
    const contestee = b.posee === true && b.l.lot !== ''
    if (b === impayee) {
      relancer(15, '1', 'M-02')
      relancer(30, '2', 'M-01')
    } else if (b.payeeEnRetard) {
      payee = relancer(15, '1', 'M-02').add({ days: 6 })
    } else if (!contestee) {
      if (cmp(echeance, REFERENCE) < 0) {
        payee = min(date.add({ days: alea.entier(7, b.delai.jours) }), echeance)
      } else if (cmp(date.add({ days: 7 }), REFERENCE) <= 0 && alea.reel() < 0.3) {
        payee = min(date.add({ days: alea.entier(7, 20) }), REFERENCE)
      }
    }
    if (payee !== undefined && cmp(payee, REFERENCE) > 0)
      throw new Error(`${b.l.id} : payée après la référence`)
    Object.assign(b.l, { etat: payee ? 'payee' : 'emise', payee_le: payee?.toString() ?? '' })
    s.factures.push(b.l)
    if (payee)
      s.paiements.push({
        facture: b.l.id ?? '',
        date: payee.toString(),
        montant_eur: b.l.montant_ttc_eur ?? '',
      })
  }
  s.paiements.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''))
  s.relances.push(...relances.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? '')))

  // Les recettes : le registre structuré, tenu depuis l'automne 2025.
  for (const p of PROJETS) {
    for (const l of lotsDuProjet(p.id)) {
      if (!l.spec.registre || !l.spec.recette) continue
      s.recettes.push({
        projet: p.id,
        lot: l.id,
        date: l.spec.recette,
        pv_signe_le: l.spec.pv ?? '',
        reserves: l.spec.reserves ?? '',
        bloquante: l.spec.reserves ? 'non' : '',
      })
    }
  }
  s.recettes.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''))

  // Les dépôts, et leurs accès au registre.
  const nomDepot = (p: SpecProjet) => `${p.id.toLowerCase()}-web`
  for (const p of PROJETS) {
    s.depots.push({
      nom: nomDepot(p),
      projet: p.id,
      collaborateurs: p.depot.collaborateurs.join(','),
      derniere_mise_en_prod_le: p.depot.miseEnProd ?? '',
      par: p.depot.par ?? '',
    })
  }
  for (const p of PROJETS) {
    for (const personne of p.depot.collaborateurs) {
      const st = personne.startsWith('ST-')
      s.acces.push({
        ressource: nomDepot(p),
        sorte: 'depot',
        personne,
        depuis: p.debut,
        jusqua: st ? (p.garantieFin && p.etat !== 'clos' ? p.garantieFin : p.finPrevue) : '',
        revoque_le: '',
      })
    }
  }
  for (const r of ACCES_DEPOT_REVOQUES) {
    const p = PROJETS.find((x) => x.id === r.projet)
    if (!p) throw new Error(`${r.projet} inconnu`)
    s.acces.push({
      ressource: nomDepot(p),
      sorte: 'depot',
      personne: r.personne,
      depuis: r.depuis,
      jusqua: r.jusqua,
      revoque_le: r.revoque,
    })
  }
  for (const a of ACCES_HORS_DEPOTS) {
    s.acces.push({
      ressource: a.ressource,
      sorte: a.sorte,
      personne: a.personne,
      depuis: a.depuis,
      jusqua: a.jusqua ?? '',
      revoque_le: a.revoque ?? '',
    })
  }

  // Les sauvegardes : une le jour de chaque mise en production, sauf l'erreur 10.
  const sauvegardes = new Map<string, Ligne>()
  const sauvegarder = (projet: string, date: string, par: string) => {
    sauvegardes.set(`${projet} ${date}`, { projet, date, par })
  }
  for (const p of PROJETS) {
    if (p.miseEnProd) sauvegarder(p.id, p.miseEnProd, p.depot.par ?? 'M-05')
    if (p.depot.miseEnProd && p.id !== SAUVEGARDE_ANCIENNE[0])
      sauvegarder(p.id, p.depot.miseEnProd, p.depot.par ?? 'M-05')
  }
  for (const [projet, date, par] of [...SAUVEGARDES_DE_ROUTINE, SAUVEGARDE_ANCIENNE]) {
    sauvegarder(projet, date, par)
  }
  s.sauvegardes.push(
    ...[...sauvegardes.values()].sort(
      (x, y) =>
        (x.date ?? '').localeCompare(y.date ?? '') ||
        (x.projet ?? '').localeCompare(y.projet ?? ''),
    ),
  )

  // Les domaines : renouvelés en janvier pour la plupart, jamais dans les
  // trente jours, sauf les erreurs posées.
  const loin = (debut: string, fin: string) => {
    const a = J(debut)
    return a.add({ days: alea.entier(0, a.until(J(fin)).days) }).toString()
  }
  DOMAINES.forEach((d, i) => {
    s.domaines.push({
      id: `DOM-${String(i + 1).padStart(2, '0')}`,
      nom: d.nom,
      client: d.client,
      registrar: alea.choisir(REGISTRARS),
      expire_le:
        d.expire ??
        (alea.reel() < 0.6 ? loin('2027-01-04', '2027-01-29') : loin('2026-12-15', '2027-09-30')),
      certificat_expire_le: d.certificat ?? loin('2026-11-20', '2027-10-10'),
    })
  })

  // Les sous-traitants.
  for (const st of SOUS_TRAITANTS) {
    s.sous_traitants.push({
      id: st.id,
      nom: nomTire(),
      montant_annuel_ht_eur: euros(st.montant),
      attestation_urssaf_le: st.attestation,
    })
  }

  // Les versions.
  for (const [projet, composant, version, fin] of VERSIONS) {
    s.versions.push({ projet, composant, version, fin_de_support_le: fin })
  }

  if (s.temps.length !== LIGNES_DE_TEMPS) throw new Error(`${s.temps.length} lignes de temps`)
  return s
}

/** Les fichiers du client fictif : `<table>.csv` → contenu. */
export function fichiersAgenceWeb(): Map<string, string> {
  const s = genererAgenceWeb()
  return new Map(NOMS_TABLES.map((t) => [`${t}.csv`, ecrireCsv(t, s[t])]))
}

/**
 * Refuse d'écrire dans le client fictif de la sécurité, et dans tout dossier
 * dont `config.yaml` est celui d'un autre métier : le générateur écraserait
 * des données qui ne sont pas les siennes.
 */
export function verifierDestination(vers: string): void {
  const reel = (d: string) => (existsSync(d) ? realpathSync(d) : resolve(d))
  if (reel(vers) === reel(CLIENT_FICTIF_SECURITE)) {
    throw new Error(`${vers} : c'est le client fictif de la sécurité, refusé`)
  }
  const config = join(vers, FICHIER_CONFIG)
  if (!existsSync(config)) return
  const r = ConfigBase.safeParse(parse(readFileSync(config, 'utf8')))
  if (!r.success || r.data.metier !== METIER) {
    throw new Error(`${config} : ce dossier est celui d'un autre métier, refusé`)
  }
}

/** Écrit les CSV du client fictif dans `vers` ; rend les noms des fichiers écrits. */
export function ecrireAgenceWeb(vers: string): string[] {
  verifierDestination(vers)
  const fichiers = fichiersAgenceWeb()
  mkdirSync(vers, { recursive: true })
  for (const [nom, contenu] of fichiers) writeFileSync(join(vers, nom), contenu)
  return [...fichiers.keys()]
}

const lanceDirectement =
  process.argv[1] !== undefined &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (lanceDirectement) {
  const { values } = parseArgs({ options: { vers: { type: 'string' } } })
  if (!values.vers) {
    console.error('usage : pnpm --filter @harnais/agence-web fictif --vers <dossier>')
    process.exit(2)
  }
  try {
    const ecrits = ecrireAgenceWeb(values.vers)
    console.log(`${ecrits.length} fichiers écrits dans ${values.vers}`)
  } catch (erreur) {
    console.error((erreur as Error).message)
    process.exitCode = 1
  }
}
