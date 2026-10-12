import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { DOMAINE_ESSAI } from '../ronde/essai'
import { A_L_ATELIER, type Catalogue, PROMOTION_EN_COURS } from '../ronde/resume'
import { MISSION_ESSAI } from './essai'
import { decider, lireMission, type Mission, missionPourModele } from './mission'

// PLAN-RONDE.md § 6.1 et § 0.b : la mission lue par un schéma strict, et la
// décision prise en code avant tout appel.

const CATALOGUE: Catalogue = {
  gestes: [],
  appris: [],
  intentions: [
    { id: 'heures_par_agent', description: 'heures', ecrit: false, promotion: PROMOTION_EN_COURS },
    { id: 'liberer_un_jour', description: 'libérer', ecrit: true, promotion: PROMOTION_EN_COURS },
    { id: 'simuler_absence', description: 'simuler', ecrit: false, promotion: A_L_ATELIER },
    { id: 'agents_sans_carte', description: 'sans carte', ecrit: false },
    { id: 'cartes_expirees', description: 'expirées', ecrit: false, geste_actif: true },
  ],
  missions_ouvertes: [],
}
const mission = (m: Partial<Mission> = {}): Mission => ({ ...MISSION_ESSAI, ...m })

function ecrire(m: Mission, nom = `${m.id}.yaml`, date = m.date): string {
  const d = join(mkdtempSync(join(tmpdir(), 'mission-')), 'rondes', date)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, nom), stringify(m))
  return join(d, nom)
}

describe('lireMission', () => {
  it('lit une mission de la ronde ; le client est le dossier au-dessus de rondes/', () => {
    const chemin = ecrire(mission())
    const lue = lireMission(chemin)
    expect(lue.mission.id).toBe('simuler_absence')
    expect(lue.dossierClient).toBe(join(chemin, '..', '..', '..'))
  })

  it('refuse un champ inconnu, un nom de fichier ou une date qui ne sont pas les siens, un fichier hors de rondes/', () => {
    expect(() => lireMission(ecrire({ ...mission(), inconnu: 1 } as Mission))).toThrow(/invalide/)
    expect(() => lireMission(ecrire(mission(), 'autre.yaml'))).toThrow(/chemin/)
    expect(() => lireMission(ecrire(mission(), undefined, '2026-10-09'))).toThrow(/chemin/)
    const ailleurs = join(mkdtempSync(join(tmpdir(), 'mission-')), 'simuler_absence.yaml')
    writeFileSync(ailleurs, stringify(mission()))
    expect(() => lireMission(ailleurs)).toThrow(/rondes/)
  })
})

describe('decider (§ 0.b)', () => {
  it('toutes les intentions au seuil, qu’elle lise ou écrive : promotion en cours', () => {
    expect(decider(mission({ intentions: ['heures_par_agent'] }), CATALOGUE, [])).toEqual({
      sorte: 'attend',
      motif: PROMOTION_EN_COURS,
    })
    expect(
      decider(
        mission({ id: 'liberer', intentions: ['liberer_un_jour'], ecrit: true }),
        CATALOGUE,
        [],
      ),
    ).toEqual({ sorte: 'attend', motif: PROMOTION_EN_COURS })
  })

  it('une fabrication échouée : le chantier, en le disant ; une factorisation à moitié au seuil : le chantier', () => {
    expect(decider(mission(), CATALOGUE, [])).toEqual({
      sorte: 'chantier',
      raison: `simuler_absence : ${A_L_ATELIER}`,
    })
    expect(
      decider(mission({ intentions: ['heures_par_agent', 'agents_sans_carte'] }), CATALOGUE, [])
        .sorte,
    ).toBe('chantier')
  })

  it('une question pour l’atelier, une mission écartée par la ronde, retirée (nom ou intentions), ou dont un geste existe : rien', () => {
    expect(decider(mission({ sorte: 'question_pour_l_atelier' }), CATALOGUE, []).sorte).toBe(
      'question',
    )
    expect(decider(mission({ statut: 'écartée' }), CATALOGUE, []).sorte).toBe('ecartee')
    expect(decider(mission(), CATALOGUE, [{ id: 'simuler_absence', intentions: [] }]).sorte).toBe(
      'ecartee',
    )
    expect(
      decider(mission({ id: 'autre_nom' }), CATALOGUE, [
        { id: 'simulation', intentions: ['simuler_absence'] },
      ]).sorte,
    ).toBe('ecartee')
    expect(decider(mission({ intentions: ['cartes_expirees'] }), CATALOGUE, []).sorte).toBe(
      'ecartee',
    )
  })
})

describe('missionPourModele', () => {
  it('des types : ni échappées ni identifiant d’échappée, même dans le texte de la ronde', () => {
    const texte = missionPourModele(
      mission({ pourquoi: 'A-7 la demande, E-20261010T0900-0005, puis A-8' }),
      DOMAINE_ESSAI,
    )
    expect(texte).not.toMatch(/A-[78]/)
    expect(texte).not.toMatch(/E-2026/)
    expect(texte).toContain('<échappée>')
    expect(texte).toContain('- pourquoi : <personne> la demande, <échappée>, puis <personne>')
  })
  it('masque avec le motif des identifiants du métier, même déclaré sans `g` (PLAN-METIER-2.md M7)', () => {
    const agence = { ...DOMAINE_ESSAI, identifiants: /\bM-\d+\b/ }
    const texte = missionPourModele(
      mission({ titre: 'le temps de M-3 et de M-12', consignes_types: ['M-4 sur <projet>'] }),
      agence,
    )
    expect(texte).toContain('- titre : le temps de <personne> et de <personne>')
    expect(texte).toContain('« <personne> sur <projet> »')
    expect(texte).toContain('(les demandes, réécrites avec des places)')
    expect(texte).not.toMatch(/M-\d|patron/)
  })
})
