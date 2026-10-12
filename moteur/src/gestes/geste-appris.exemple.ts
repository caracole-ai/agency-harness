import type { RoleDeclare } from '../conversation/roles'
import type { GesteAppris } from './geste-appris'

// Des gestes appris de référence pour les tests du dossier (jamais exportés
// par le moteur), sur les tables de la copie de la sécurité privée : les
// heures d'un agent sur une période (PLAN-PROMOTION.md § 5.5) ; libérer un
// agent d'un jour, un geste qui écrit (§ 10).

/** Les rôles de ces gestes, déclarés comme la sécurité privée les déclare (PLAN-METIER-2.md M1, M3). */
export const ROLES_EXEMPLE: RoleDeclare[] = [
  {
    id: 'patron',
    enMots: 'le patron',
    identifie: false,
    capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
  },
  { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
]

const TEST = {
  echappee: 'E-1',
  consigne: 'Combien d’heures a fait Julien ?',
  role: 'patron' as const,
  agent: null,
  params: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
  instantane: 'echappees/E-1.json',
  contient: ['16'],
}

export const GESTE_EXEMPLE: GesteAppris = {
  id: 'heures_par_agent',
  description: 'les heures faites par un agent sur une période',
  roles: ['patron', 'agent'],
  parametres: {
    agent: { type: 'agent', description: "l'agent nommé dans la consigne" },
    periode: { type: 'periode', description: 'la période' },
  },
  requetes: [
    {
      nom: 'heures',
      sql: 'SELECT a.nom AS nom, SUM(v.heures) AS heures FROM agents a JOIN vacations v ON v.agent = a.id AND v.jour BETWEEN :du AND :au WHERE a.id = :agent GROUP BY a.id',
    },
  ],
  reponse: {
    ligne: '{{heures.nom}} : {{heures.heures}} heures du {{du}} au {{au}}.',
    tableau: null,
    vide: 'Aucune vacation sur cette période.',
  },
  tests: [TEST, { ...TEST, echappee: 'E-2' }, { ...TEST, echappee: 'E-3' }],
  origine: { fabrique_le: '2026-10-10', modele: 'simulé', cout_usd: 0.01, conversations: ['C-1'] },
}

const TEST_ECRIT = {
  echappee: 'E-1',
  consigne: 'Libère le mardi 13 de Karim.',
  role: 'patron' as const,
  agent: null,
  params: { agent: 'A-1', date: '2026-10-13' },
  instantane: 'echappees/E-1.json',
  contient: [],
  modifications: [{ vacation: 'V-03', agent: 'A-9' }],
}

export const GESTE_ECRIT_EXEMPLE: GesteAppris = {
  id: 'liberer_un_jour',
  description: 'libérer un agent de ses vacations d’un jour, chacune donnée à un autre agent',
  roles: ['patron'],
  parametres: {
    agent: { type: 'agent', description: "l'agent à libérer" },
    date: { type: 'date', description: 'le jour à libérer' },
  },
  requetes: [
    {
      nom: 'liberer',
      sql: "SELECT v.id AS vacation, 'A-9' AS agent FROM vacations v WHERE v.agent = :agent AND v.jour = :date",
    },
  ],
  modifications: { pour_chaque: 'liberer', reaffecter: { vacation: 'vacation', agent: 'agent' } },
  reponse: { ligne: null, tableau: 'liberer', vide: 'Aucune vacation ce jour-là.' },
  tests: [TEST_ECRIT, { ...TEST_ECRIT, echappee: 'E-2' }, { ...TEST_ECRIT, echappee: 'E-3' }],
  origine: { fabrique_le: '2026-10-11', modele: 'simulé', cout_usd: 0.01, conversations: ['C-1'] },
}
