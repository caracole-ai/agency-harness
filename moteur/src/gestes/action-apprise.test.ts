import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Identite } from '../conversation/actions'
import type { TableCopie } from '../echappee/copie'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  actionApprise,
  LECTURE_IMPOSSIBLE,
  LEQUEL,
  parametresAppris,
  RIEN_A_PROPOSER,
} from './action-apprise'
import type { DeclarationsGeste, GesteAppris } from './geste-appris'
import {
  DECLARATIONS_EXEMPLE,
  GESTE_ECRIT_EXEMPLE as ECRIT,
  GESTE_EXEMPLE as GESTE,
} from './geste-appris.exemple'

// Un geste appris comme action : ses paramètres à plat pour le modèle, son
// exécution sans modèle sur la copie du rôle, l'agent qui parle pour le rôle
// `agent` (D4), et l'échec rendu en texte (PLAN-PROMOTION.md § 5.3) ; un
// geste qui écrit rend ses modifications, sans rien écrire (§ 10) ; une
// entité d'un type déclaré par un métier, résolue par lui (PLAN-METIER-2.md M5).

const AGENTS: TableCopie = {
  nom: 'agents',
  description: 'les agents',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'nom', type: 'TEXT', description: 'nom' },
  ],
  lignes: [
    { id: 'A-2', nom: 'Julien Lefèvre' },
    { id: 'A-3', nom: 'Sophie Marchand' },
  ],
}
const VACATIONS: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'agent', type: 'TEXT', description: 'agent' },
    { nom: 'jour', type: 'TEXT', description: 'jour' },
    { nom: 'heures', type: 'REAL', description: 'heures' },
  ],
  lignes: [
    { agent: 'A-2', jour: '2026-10-06', heures: 12 },
    { agent: 'A-2', jour: '2026-10-07', heures: 4 },
    { agent: 'A-3', jour: '2026-10-06', heures: 12 },
    { agent: 'A-3', jour: '2026-10-20', heures: 12 },
  ],
}
/** La copie à l'échelle du rôle : un agent ne voit que lui. */
const copie = (_s: null, identite: Identite) =>
  identite.role === 'patron'
    ? [AGENTS, VACATIONS]
    : [
        { ...AGENTS, lignes: AGENTS.lignes.filter((a) => a.id === identite.personne) },
        { ...VACATIONS, lignes: VACATIONS.lignes.filter((v) => v.agent === identite.personne) },
      ]
const maintenant = Temporal.PlainDateTime.from('2026-10-10T21:40').toZonedDateTime(FUSEAU)
const PATRON: Identite = { role: 'patron' }
const SOPHIE: Identite = { role: 'agent', personne: 'A-3' }
const PERIODE = { du: '2026-10-05', au: '2026-10-11' }

describe('parametresAppris', () => {
  it('à plat : l’agent nullable, la période en du et au, chaque champ décrit ; strict', () => {
    const schema = parametresAppris(GESTE, DECLARATIONS_EXEMPLE)
    expect(Object.keys(schema.shape)).toEqual(['agent', 'du', 'au'])
    expect(schema.safeParse({ agent: null, ...PERIODE }).success).toBe(true)
    expect(schema.safeParse({ agent: 'A-2', du: '5 octobre', au: '2026-10-11' }).success).toBe(
      false,
    )
    expect(schema.safeParse({ agent: 'A-2', ...PERIODE, site: 'x' }).success).toBe(false)
    expect(z.toJSONSchema(schema.shape.du as z.ZodType).description).toContain('premier jour')
  })
  it('date, site, poste, nombre', () => {
    const schema = parametresAppris(
      {
        ...GESTE,
        parametres: {
          jour: { type: 'date', description: 'le jour' },
          site: { type: 'site', description: 'le site' },
          poste: { type: 'poste', description: 'le poste' },
          n: { type: 'nombre', description: 'combien' },
        },
      },
      DECLARATIONS_EXEMPLE,
    )
    expect(
      schema.safeParse({ jour: '2026-10-11', site: 'Hôpital', poste: 'Accueil', n: 3 }).success,
    ).toBe(true)
    expect(schema.safeParse({ jour: '2026-10-11', site: '', poste: 'Accueil', n: 3 }).success).toBe(
      false,
    )
    expect(schema.safeParse({ jour: '2026-10-11', site: 'x', poste: 'y', n: 1.5 }).success).toBe(
      false,
    )
  })
})

describe('actionApprise', () => {
  const action = actionApprise(GESTE, copie, DECLARATIONS_EXEMPLE)
  it('une action qui lit, ouverte aux rôles du geste, l’agent comme personne à résoudre', () => {
    expect(action).toMatchObject({
      id: 'heures_par_agent',
      description: GESTE.description,
      roles: ['patron', 'agent'],
      ecrit: false,
      personnes: { agent: "l'agent nommé dans la consigne" },
    })
    expect(action.reformuler(null, PATRON, {})).toContain(GESTE.description)
  })
  it('le patron : les requêtes liées, le texte rendu, les requêtes au journal', async () => {
    const r = await action.executer(null, PATRON, { agent: 'A-2', ...PERIODE }, maintenant)
    expect(r.texte).toBe('Julien Lefèvre : 16 heures du 2026-10-05 au 2026-10-11.')
    expect(r.donnees).toEqual({
      echappee: null,
      requetes: [{ nom: 'heures', sql: GESTE.requetes[0]?.sql, lignes: 1 }],
    })
  })
  it('un agent : l’agent lié est celui qui parle, quel que soit le paramètre (D4)', async () => {
    const soi = await action.executer(null, SOPHIE, { agent: null, ...PERIODE }, maintenant)
    expect(soi.texte).toBe('Sophie Marchand : 12 heures du 2026-10-05 au 2026-10-11.')
    const autre = await action.executer(null, SOPHIE, { agent: 'A-2', ...PERIODE }, maintenant)
    expect(autre.texte).toBe(soi.texte)
  })
  it('aucune ligne : le texte « vide »', async () => {
    const r = await action.executer(
      null,
      PATRON,
      { agent: 'A-2', du: '2026-11-01', au: '2026-11-30' },
      maintenant,
    )
    expect(r.texte).toBe('Aucune vacation sur cette période.')
  })
  it('une requête qui échoue : « Je n’ai pas pu lire les données », le détail au journal', async () => {
    const casse = actionApprise(
      { ...GESTE, requetes: [{ nom: 'heures', sql: 'SELECT * FROM absente WHERE a = :agent' }] },
      copie,
      DECLARATIONS_EXEMPLE,
    )
    const r = await casse.executer(null, PATRON, { agent: 'A-2', ...PERIODE }, maintenant)
    expect(r.texte).toMatch(
      new RegExp(`^${LECTURE_IMPOSSIBLE} : requête « heures » : no such table`),
    )
    expect(r.donnees).toMatchObject({
      echappee: null,
      requetes: [{ nom: 'heures', erreur: expect.stringMatching(/no such table/) }],
      erreur: expect.stringMatching(/no such table/),
    })
  })
})

describe('actionApprise, un geste qui écrit (PLAN-PROMOTION.md § 10)', () => {
  const PLANNING: TableCopie = {
    nom: 'vacations',
    description: 'les vacations',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: 'identifiant' },
      { nom: 'agent', type: 'TEXT', description: 'agent' },
      { nom: 'jour', type: 'TEXT', description: 'jour' },
    ],
    lignes: [
      { id: 'V-03', agent: 'A-1', jour: '2026-10-13' },
      { id: 'V-07', agent: 'A-3', jour: '2026-10-14' },
    ],
  }
  const action = actionApprise(ECRIT, () => [PLANNING], DECLARATIONS_EXEMPLE)
  it('écrit et propose : ouvert au patron seul', () => {
    expect(action).toMatchObject({
      id: 'liberer_un_jour',
      roles: ['patron'],
      ecrit: true,
      propose: true,
    })
  })
  it('rend les réaffectations, de la forme de l’échappée, et les requêtes au journal', async () => {
    const r = await action.executer(null, PATRON, { agent: 'A-1', date: '2026-10-13' }, maintenant)
    expect(r.modifications).toEqual([{ type: 'reaffecter', vacation: 'V-03', agent: 'A-9' }])
    expect(r.texte).toBe('vacation | agent\nV-03 | A-9')
    expect(r.donnees).toEqual({
      echappee: null,
      requetes: [{ nom: 'liberer', sql: ECRIT.requetes[0]?.sql, lignes: 1 }],
    })
  })
  it('aucune vacation ce jour-là : le texte « vide », rien à proposer', async () => {
    const r = await action.executer(null, PATRON, { agent: 'A-1', date: '2026-10-20' }, maintenant)
    expect(r).toMatchObject({ texte: 'Aucune vacation ce jour-là.' })
    expect(r.modifications).toBeUndefined()
  })
  it('une vacation sans agent trouvé : « Je n’ai rien à proposer », rien à proposer', async () => {
    const sans = actionApprise(
      {
        ...ECRIT,
        requetes: [
          {
            nom: 'liberer',
            sql: 'SELECT v.id AS vacation, NULL AS agent FROM vacations v WHERE v.agent = :agent AND v.jour = :date',
          },
        ],
      },
      () => [PLANNING],
      DECLARATIONS_EXEMPLE,
    )
    const r = await sans.executer(null, PATRON, { agent: 'A-1', date: '2026-10-13' }, maintenant)
    expect(r.texte).toBe(`${RIEN_A_PROPOSER} : aucun agent trouvé pour V-03`)
    expect(r.modifications).toBeUndefined()
  })
})

describe('actionApprise, une entité d’un type déclaré par le métier (PLAN-METIER-2.md M5)', () => {
  const PROJETS: TableCopie = {
    nom: 'projets',
    description: 'les projets',
    colonnes: [
      { nom: 'id', type: 'TEXT', description: 'identifiant' },
      { nom: 'nom', type: 'TEXT', description: 'nom' },
      { nom: 'jours', type: 'REAL', description: 'jours consommés' },
    ],
    lignes: [
      { id: 'PRJ-1', nom: 'Refonte du site', jours: 12 },
      { id: 'PRJ-2', nom: 'Refonte de l’appli', jours: 4 },
      { id: 'PRJ-3', nom: 'Boutique', jours: 7 },
    ],
  }
  /** Un métier simulé : l'identifiant exact, sinon le nom unique (insensible à la casse), sinon ceux qui contiennent la mention. */
  const resoudre = (mention: string) => {
    const lignes = PROJETS.lignes as { id: string; nom: string }[]
    const exact = lignes.filter(
      (p) => p.id === mention || p.nom.toLowerCase() === mention.toLowerCase(),
    )
    const trouves =
      exact.length > 0
        ? exact
        : lignes.filter((p) => p.nom.toLowerCase().includes(mention.toLowerCase()))
    return trouves.map((p) => ({ id: p.id, nom: p.nom, sorte: 'organisation' as const }))
  }
  const declarations: DeclarationsGeste = {
    ...DECLARATIONS_EXEMPLE,
    typesParametre: [
      ...DECLARATIONS_EXEMPLE.typesParametre,
      { nom: 'projet', enMots: 'un projet, par son identifiant', sorte: 'entite', resoudre },
    ],
  }
  const geste: GesteAppris = {
    ...GESTE,
    id: 'jours_du_projet',
    description: 'les jours consommés sur un projet',
    parametres: { projet: { type: 'projet', description: 'le projet nommé' } },
    requetes: [{ nom: 'p', sql: 'SELECT nom, jours FROM projets WHERE id = :projet' }],
    reponse: { ligne: '{{p.nom}} : {{p.jours}} jours.', tableau: null, vide: 'Aucun projet.' },
  }
  const action = actionApprise(geste, () => [PROJETS], declarations)
  it('le schéma : une mention texte non vide', () => {
    const schema = parametresAppris(geste, declarations)
    expect(schema.safeParse({ projet: 'Boutique' }).success).toBe(true)
    expect(schema.safeParse({ projet: '' }).success).toBe(false)
  })
  it('un seul candidat : son identifiant est lié, le geste s’exécute', async () => {
    const r = await action.executer(null, PATRON, { projet: 'boutique' }, maintenant)
    expect(r.texte).toBe('Boutique : 7 jours.')
    expect(await action.executer(null, PATRON, { projet: 'PRJ-1' }, maintenant)).toMatchObject({
      texte: 'Refonte du site : 12 jours.',
    })
  })
  it('deux candidats : « Lequel ? » avec leurs identifiants, rien ne s’exécute', async () => {
    const r = await action.executer(null, PATRON, { projet: 'Refonte' }, maintenant)
    expect(r.texte).toBe(`${LEQUEL} PRJ-1, PRJ-2`)
    expect(r.donnees).toEqual({ echappee: null, requetes: [], candidats: ['PRJ-1', 'PRJ-2'] })
    expect(r.modifications).toBeUndefined()
  })
})
