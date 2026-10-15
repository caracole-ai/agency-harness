import { z } from 'zod'
import { VALIDEE } from '../approbation/jeton'
import type { Domaine } from '../conversation/domaine'
import type { RoleDeclare } from '../conversation/roles'
import { type DeclarationsGeste, type GesteAppris, SansCandidat } from './geste-appris'
import type { OperationApprise } from './operation'
import type { TypeParametreDeclare } from './types-parametre'

// Des gestes appris de référence pour les tests du dossier (jamais exportés
// par le moteur), sur les tables de la copie de la sécurité privée : les
// heures d'un agent sur une période (PLAN-PROMOTION.md § 5.5) ; libérer un
// agent d'un jour, un geste qui écrit (§ 10). Le moteur n'importe pas la
// sécurité : ses déclarations (types, opération) en sont une copie d'essai
// (PLAN-METIER-2.md M5, M6).

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

/** Les types de paramètre de ces gestes, déclarés comme la sécurité privée les déclare (PLAN-METIER-2.md M5). */
export const TYPES_EXEMPLE: TypeParametreDeclare[] = [
  {
    nom: 'agent',
    enMots:
      'une personne nommée dans la demande, ou null pour celui qui parle ; liée par son identifiant (agents.id)',
    sorte: 'personne',
  },
  { nom: 'site', enMots: 'un site, tel que les données l’écrivent', sorte: 'texte' },
  { nom: 'poste', enMots: 'un poste, tel que les données l’écrivent', sorte: 'texte' },
]

const Reaffectation = z.strictObject({ vacation: z.string().min(1), agent: z.string().min(1) })
type Reaffectation = z.infer<typeof Reaffectation>

/** L'opération d'écriture de ces gestes, une copie d'essai de celle de la sécurité privée (PLAN-METIER-2.md M6). */
export const OPERATION_EXEMPLE: OperationApprise<Reaffectation> = {
  nom: 'reaffecter',
  enMots: 'réaffecter une vacation à un autre agent',
  colonnes: z.strictObject({
    vacation: z.string().describe('vacations.id'),
    agent: z.string().describe('agents.id de celui qui la prend'),
  }),
  modification: Reaffectation,
  depuisLigne: (ligne, colonnes) => {
    const vacation = ligne[colonnes.vacation ?? '']
    const agent = ligne[colonnes.agent ?? '']
    if (typeof vacation !== 'string' || vacation === '') throw new Error('n’a pas de vacation')
    if (typeof agent !== 'string' || agent === '') {
      throw new SansCandidat(`aucun agent trouvé pour ${vacation}`)
    }
    return { vacation, agent }
  },
  /** Comme la sécurité privée : la dernière réaffectation validée de la conversation, telle que reçue (PLAN-CHOIX.md C3). */
  relire: (journal, conversation) => {
    const lignes = journal.lire().filter((l) => l.type === 'reaffectation')
    const donnees = (l: (typeof lignes)[number]) =>
      l.donnees
        ? (JSON.parse(l.donnees) as { conversation?: unknown; modifications?: unknown })
        : {}
    const validees = new Set(lignes.filter((l) => l.issue === VALIDEE).map((l) => l.objet))
    const recue = lignes
      .filter(
        (l) =>
          l.issue === 'reçue' && validees.has(l.objet) && donnees(l).conversation === conversation,
      )
      .at(-1)
    const lu = z
      .array(z.looseObject({ vacation: z.string().min(1), agent: z.string().min(1) }))
      .min(1)
      .safeParse(recue ? donnees(recue).modifications : undefined)
    return lu.success ? lu.data.map(({ vacation, agent }) => ({ vacation, agent })) : []
  },
  egal: (a, b) => a.vacation === b.vacation && a.agent === b.agent,
  objet: (m) => m.vacation,
}

/** Le domaine de la sécurité privée, tel qu'elle le déclare, pour les métiers simulés des tests (PLAN-METIER-2.md § 3.5). */
export const DOMAINE_EXEMPLE: Domaine = {
  cadre: "l'outil de planning d'une entreprise de sécurité privée",
  objets: 'le planning et les agents',
  modifications:
    'Une modification réaffecte une vacation à un autre agent ; créer ou supprimer une vacation n’est pas possible.',
  identifiants: /\bA-\d+\b/g,
  rienASignaler: 'Aucune vacation contraire à une règle.',
}

/** Ce que ces gestes déclarent, comme `MetierConversation` le ferait. */
export const DECLARATIONS_EXEMPLE: DeclarationsGeste = {
  roles: ROLES_EXEMPLE,
  typesParametre: TYPES_EXEMPLE,
  operation: OPERATION_EXEMPLE,
}

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
