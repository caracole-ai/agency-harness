import type { GesteAppris } from './geste-appris'

// Un geste appris de référence pour les tests du dossier (jamais exporté par
// le moteur) : les heures d'un agent sur une période, sur les tables de la
// copie de la sécurité privée (PLAN-PROMOTION.md § 5.5).

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
