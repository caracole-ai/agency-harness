import { describe, expect, it } from 'vitest'
import { Temporal } from '../temps/temporal'
import { DOMAINE_ESSAI, dossierEssai, METIER_ESSAI, PERSONNES_ESSAI } from './essai'
import {
  type MissionRonde,
  outilRapport,
  type RapportDeRonde,
  revalider,
  STATUTS_MISSION,
  schemaJsonRapport,
  schemaRapport,
} from './rapport'
import { A_L_ATELIER, type Catalogue, PROMOTION_EN_COURS, resumerJournal } from './resume'

// PLAN-RONDE.md § 5.2 : chaque règle de R3 en un cas.

const s = METIER_ESSAI.ouvrir(dossierEssai())
const RESUME = resumerJournal(
  s.journal,
  { du: Temporal.PlainDate.from('2026-10-10'), au: Temporal.PlainDate.from('2026-10-10') },
  PERSONNES_ESSAI,
  { jours: 30, plafondMoisUsd: 30 },
)
METIER_ESSAI.fermer(s)

const CATALOGUE: Catalogue = {
  gestes: [{ id: 'voir_planning', description: 'le planning', ecrit: false, roles: ['patron'] }],
  appris: [{ id: 'agents_sans_carte', description: 'x', ecrit: false, statut: 'actif' }],
  intentions: [
    { id: 'heures_par_agent', description: 'x', ecrit: false, promotion: PROMOTION_EN_COURS },
    { id: 'simuler_absence', description: 'x', ecrit: false, promotion: A_L_ATELIER },
    { id: 'agents_sans_carte', description: 'x', ecrit: false, geste_actif: true },
    { id: 'liberer_un_jour', description: 'x', ecrit: true, promotion: PROMOTION_EN_COURS },
  ],
  missions_ouvertes: [
    {
      id: 'deja_la',
      sorte: 'geste_code',
      date: '2026-10-09',
      statut: 'à faire',
      intentions: ['compter_vacations'],
    },
  ],
}

const mission = (m: Partial<MissionRonde> = {}): MissionRonde => ({
  id: 'simuler_absence',
  sorte: 'geste_code',
  titre: 'Coder la simulation d’absence',
  pourquoi: 'deux échappées, fabrication échouée',
  echappees: ['E-20261010T0900-0005', 'E-20261010T1000-0006'],
  intentions: ['simuler_absence'],
  consignes_types: ['et si <agent> était absent du <du> au <au>, qui reprendrait ?'],
  ecrit: false,
  estimation: 'moyenne',
  ...m,
})
const rapport = (missions: MissionRonde[], r: Partial<RapportDeRonde> = {}): RapportDeRonde => ({
  observations: [],
  missions,
  rien_a_signaler: missions.length === 0,
  ...r,
})
const config = {
  missionsMax: 3,
  retirees: [{ id: 'retiree', intentions: ['qui_travaille'] }],
  personnes: PERSONNES_ESSAI,
  domaine: DOMAINE_ESSAI,
}
const verifier = (r: RapportDeRonde) => revalider(r, RESUME, CATALOGUE, config)

describe('revalider (R3)', () => {
  it('une mission juste : à faire, avec la raison de l’atelier', () => {
    expect(verifier(rapport([mission()]))).toEqual({
      sorte: 'accepte',
      missions: [
        {
          mission: mission(),
          statut: STATUTS_MISSION.a_faire,
          raison: "simuler_absence : fabrication échouée, à coder à l'atelier",
        },
      ],
    })
  })

  it('rien à signaler, sans mission : accepté', () => {
    expect(verifier(rapport([]))).toEqual({ sorte: 'accepte', missions: [] })
  })

  it('une échappée hors de la fenêtre : rapport refusé', () => {
    const r = verifier(rapport([mission({ echappees: ['E-20261009T0900-0001'] })]))
    expect(r).toMatchObject({ sorte: 'refuse' })
    expect(r.sorte === 'refuse' && r.ecarts[0]).toMatch(/n'est pas dans la fenêtre/)
  })

  it('une consigne-type avec un identifiant, ou un nom : rapport refusé', () => {
    for (const c of ['les heures de A-1', 'les heures de A-99', 'les heures de Rosalie']) {
      const r = verifier(rapport([mission({ consignes_types: [c] })]))
      expect(r.sorte === 'refuse' && r.ecarts[0]).toMatch(/identifiant ou un nom/)
    }
  })

  it('l’identifiant se reconnaît au motif du domaine du métier, d’un appel à l’autre (PLAN-METIER-2.md M7)', () => {
    const agence = { ...config, domaine: { ...DOMAINE_ESSAI, identifiants: /\bM-\d+\b/g } }
    const refuse = (c: string) =>
      revalider(rapport([mission({ consignes_types: [c] })]), RESUME, CATALOGUE, agence).sorte
    // Le motif porte `g` : sans copie, le second `.test()` repartirait de `lastIndex`.
    expect(refuse('le temps de M-3')).toBe('refuse')
    expect(refuse('le temps de M-3')).toBe('refuse')
    expect(refuse('le temps de <personne>')).toBe('accepte')
    expect(refuse('les heures de A-99')).toBe('accepte')
  })

  it('trop de missions, ou « rien à signaler » incohérent, ou deux fois le même identifiant : refusé', () => {
    const quatre = ['a', 'b', 'c', 'd'].map((id) => mission({ id }))
    expect(verifier(rapport(quatre)).sorte).toBe('refuse')
    expect(verifier(rapport([mission()], { rien_a_signaler: true })).sorte).toBe('refuse')
    expect(verifier(rapport([], { rien_a_signaler: false })).sorte).toBe('refuse')
    expect(verifier(rapport([mission(), mission()])).sorte).toBe('refuse')
  })

  it('une intention qui a déjà un geste actif : écartée', () => {
    const r = verifier(rapport([mission({ id: 'titres', intentions: ['agents_sans_carte'] })]))
    expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.ecartee }] })
  })

  it('un identifiant de geste existant, une mission déjà ouverte, une mission retirée : écartées', () => {
    for (const id of ['voir_planning', 'deja_la', 'retiree']) {
      const r = verifier(rapport([mission({ id })]))
      expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.ecartee }] })
    }
  })

  it('une mission retirée sous un autre nom (mêmes intentions) : écartée (G2)', () => {
    const r = verifier(
      rapport([mission({ id: 'qui_tient', intentions: ['qui_travaille'], echappees: [] })]),
    )
    expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.ecartee }] })
    expect(r.sorte === 'accepte' && r.missions[0]?.raison).toMatch(/retirée/)
  })

  it('le même travail sous un autre nom (mêmes intentions qu’une mission ouverte) : écarté', () => {
    const r = verifier(
      rapport([mission({ id: 'compter', intentions: ['compter_vacations'], echappees: [] })]),
    )
    expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.ecartee }] })
    expect(r.sorte === 'accepte' && r.missions[0]?.raison).toMatch(/deja_la/)
  })

  it('une intention au seuil de promotion : « promotion en cours », aucun chantier (§ 0.b)', () => {
    const lecture = verifier(
      rapport([mission({ id: 'heures', intentions: ['heures_par_agent'], echappees: [] })]),
    )
    expect(lecture).toMatchObject({ sorte: 'accepte', missions: [{ statut: PROMOTION_EN_COURS }] })
    const ecrit = verifier(
      rapport([
        mission({ id: 'liberer', intentions: ['liberer_un_jour'], ecrit: true, echappees: [] }),
      ]),
    )
    expect(ecrit).toMatchObject({ sorte: 'accepte', missions: [{ statut: PROMOTION_EN_COURS }] })
  })

  it('une factorisation dont une intention seulement est au seuil : un chantier', () => {
    const r = verifier(
      rapport([
        mission({
          id: 'heures_et_absences',
          sorte: 'factorisation',
          intentions: ['heures_par_agent', 'simuler_absence'],
        }),
      ]),
    )
    expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.a_faire }] })
  })

  it('une question pour l’atelier ne lance rien', () => {
    const r = verifier(
      rapport([mission({ id: 'decoupe', sorte: 'question_pour_l_atelier', intentions: [] })]),
    )
    expect(r).toMatchObject({ sorte: 'accepte', missions: [{ statut: STATUTS_MISSION.question }] })
  })
})

describe('le schéma du rapport', () => {
  it('strict : un champ de plus refuse, un slug invalide refuse', () => {
    const schema = schemaRapport(3, DOMAINE_ESSAI.places)
    expect(schema.safeParse({ ...rapport([mission()]), autre: 1 }).success).toBe(false)
    expect(schema.safeParse(rapport([mission({ id: 'Pas un slug' })])).success).toBe(false)
    expect(schema.safeParse(rapport([mission()])).success).toBe(true)
  })

  it('l’outil et le schéma JSON du binaire disent la même chose', () => {
    const outil = outilRapport(3, DOMAINE_ESSAI.places)
    expect(outil.strict).toBe(true)
    expect(outil.input_schema).toEqual(schemaJsonRapport(3, DOMAINE_ESSAI.places))
    expect(schemaJsonRapport(3, DOMAINE_ESSAI.places).required).toEqual([
      'observations',
      'missions',
      'rien_a_signaler',
    ])
  })

  it('les consignes-types citent les places du métier ; « écrit » dit les données (PLAN-METIER-2.md M7)', () => {
    const json = JSON.stringify(schemaJsonRapport(3, ['<personne>', '<projet>']))
    expect(json).toContain(
      'la demande réécrite avec des places entre chevrons (<personne>, <projet>), sans aucun identifiant ni nom',
    )
    expect(json).toContain('vrai si la demande modifie les données')
    expect(json).not.toMatch(/agent|planning|vacation/)
  })
})
