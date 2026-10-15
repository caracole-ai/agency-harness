import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { TYPE_GESTE_COMMANDE } from '../gestes/commande'
import type { Evenement, Journal } from '../journal/journal'
import {
  CLIENT_ESSAI,
  DOMAINE_ESSAI,
  echappeeEssai,
  METIER_ESSAI,
  PERSONNES_ESSAI,
} from '../ronde/essai.test.fixture'
import type { Catalogue } from '../ronde/resume'
import { construireCatalogue, HORS_VOCABULAIRE } from '../ronde/ronde'
import { Temporal } from '../temps/temporal'
import { MISSION_ESSAI } from './essai.test.fixture'
import {
  type ContexteCommande,
  commanderMission,
  decider,
  demandesAvecEtat,
  ecrireMission,
  lireMission,
  type Mission,
  missionCommandee,
  missionPourModele,
  TYPE_CHANTIER,
} from './mission'

// PLAN-RONDE.md § 6.1 et § 0.b : la mission lue par un schéma strict, et la
// décision prise en code avant tout appel.

const CATALOGUE: Catalogue = {
  gestes: [],
  appris: [],
  intentions: [
    { id: 'heures_par_agent', description: 'heures', ecrit: false },
    { id: 'liberer_un_jour', description: 'libérer', ecrit: true },
    { id: 'simuler_absence', description: 'simuler', ecrit: false },
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
  it('une mission ordinaire, qu’elle lise ou écrive : le chantier, sans raison', () => {
    expect(decider(mission(), CATALOGUE, [])).toEqual({ sorte: 'chantier' })
    expect(
      decider(
        mission({ id: 'liberer', intentions: ['liberer_un_jour'], ecrit: true }),
        CATALOGUE,
        [],
      ),
    ).toEqual({
      sorte: 'chantier',
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

// La mission d'un geste commandé : écrite par le code depuis le journal, sans
// modèle, sans nom ni identifiant ; refusée plutôt que devinée.

const MAINTENANT = Temporal.ZonedDateTime.from('2026-10-10T21:40[Europe/Paris]')
const PATRON = { role: 'patron' }

/** Une demande sans geste, telle que la conversation l'écrit : le résumé peut porter un nom. */
const nouvelle = (conversation: string, intention: string): Omit<Evenement, 'client'> => ({
  type: TYPE_CONSIGNE,
  objet: conversation,
  issue: 'nouvelle',
  motif: 'Et si Rosalie partait ?',
  donnees: {
    identite: PATRON,
    demande: { sorte: 'nouvelle', intention, resume: 'Rosalie absente' },
  },
})

/** Un client d'essai vide, et de quoi écrire à son journal à une heure donnée. */
function client(): {
  dossier: string
  ecrire: (h: string, e: Omit<Evenement, 'client'>[]) => void
} {
  const dossier = mkdtempSync(join(tmpdir(), 'commande-'))
  writeFileSync(join(dossier, 'config.yaml'), `client: ${CLIENT_ESSAI}\nmetier: essai\n`)
  const ecrire = (horodatage: string, e: Omit<Evenement, 'client'>[]) => {
    const s = METIER_ESSAI.ouvrir(dossier)
    s.journal.ecrire(
      e.map((x) => ({ ...x, client: CLIENT_ESSAI })),
      horodatage,
    )
    METIER_ESSAI.fermer(s)
  }
  return { dossier, ecrire }
}

/** La mission commandée de ce client, avec le contexte que `commanderMission` lirait. */
function commandee(dossier: string, intention: string, x: Partial<ContexteCommande> = {}): Mission {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    const declaree = METIER_ESSAI.intentions.find((i) => i.id === intention)
    return missionCommandee(intention, s.journal.lire(), {
      catalogue: construireCatalogue(METIER_ESSAI, dossier, s.journal),
      ...(declaree ? { declaree } : {}),
      personnes: PERSONNES_ESSAI,
      domaine: DOMAINE_ESSAI,
      metier: 'essai',
      date: MAINTENANT.toPlainDate(),
      ...x,
    })
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

const lignes = (dossier: string, f: (j: Journal) => unknown) => {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return f(s.journal)
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

describe('missionCommandee', () => {
  it('depuis le journal : les échappées les plus récentes d’abord, les consignes masquées, dédoublonnées, sans nom ; ni résumé ni `par`', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-08T08:00:00Z', [
      nouvelle('C-1', 'simuler_absence'),
      ...echappeeEssai(
        'E-20261008T1000-0001',
        'C-1',
        'simuler_absence',
        'Et si A-1 était absent, qui reprendrait (vu en E-20261007T0900-00ab) ?',
      ),
    ])
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-2', 'simuler_absence'),
      ...echappeeEssai(
        'E-20261009T1000-0002',
        'C-2',
        'simuler_absence',
        'Et si Rosalie Vernet partait ?',
      ),
    ])
    ecrire('2026-10-10T08:00:00Z', [
      nouvelle('C-3', 'simuler_absence'),
      ...echappeeEssai(
        'E-20261010T1000-0003',
        'C-3',
        'simuler_absence',
        'Et si A-2 était absent, qui reprendrait (vu en E-20261007T0900-00ab) ?',
      ),
      ...echappeeEssai('E-20261010T1100-0004', 'C-4', 'heures_par_agent', 'Les heures de A-1 ?'),
    ])
    const m = commandee(dossier, 'simuler_absence')
    expect(m).toEqual({
      id: 'simuler_absence',
      sorte: 'geste_code',
      titre: 'Geste commandé par le patron : simuler_absence',
      pourquoi:
        'Commandé par le patron le 2026-10-10 ; 3 demande(s) sans geste sous cette intention : une absence hypothétique',
      echappees: ['E-20261010T1000-0003', 'E-20261009T1000-0002', 'E-20261008T1000-0001'],
      intentions: ['simuler_absence'],
      consignes_types: ['Et si <personne> était absent, qui reprendrait (vu en <échappée>) ?'],
      ecrit: false,
      date: '2026-10-10',
      metier: 'essai',
      statut: 'à faire',
    })
    expect(JSON.stringify(m)).not.toMatch(/Rosalie|patron"|A-\d/)
  })

  it('aucune consigne utilisable (d’avant les pseudonymes, ou porteuse d’un nom) : refusée, on ne fabrique pas une consigne-type', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-1', 'heures_par_agent'),
      ...echappeeEssai('E-20261009T1000-0001', 'C-1', 'heures_par_agent', undefined),
      ...echappeeEssai('E-20261009T1100-0002', 'C-1', 'heures_par_agent', 'Et Octave Brunel ?'),
    ])
    expect(() => commandee(dossier, 'heures_par_agent')).toThrow(/aucune consigne utilisable/)
  })

  it('« écrit » : celui du métier quand il déclare l’intention ; sinon vrai si une échappée a fini en proposition', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-1', 'liberer_un_jour'),
      ...echappeeEssai(
        'E-20261009T1000-0001',
        'C-1',
        'liberer_un_jour',
        'Libère A-1 mardi.',
        'abandon',
      ),
      nouvelle('C-2', 'inventaire_cles'),
      ...echappeeEssai('E-20261009T1100-0002', 'C-2', 'inventaire_cles', 'Les clés de <site> ?'),
      nouvelle('C-3', 'rendre_cles'),
      ...echappeeEssai(
        'E-20261009T1200-0003',
        'C-3',
        'rendre_cles',
        'A-2 rend ses clés.',
        'proposition',
      ),
    ])
    expect(commandee(dossier, 'liberer_un_jour').ecrit).toBe(true)
    const lecture = commandee(dossier, 'inventaire_cles')
    expect(lecture.ecrit).toBe(false)
    expect(lecture.pourquoi).toContain(HORS_VOCABULAIRE)
    expect(commandee(dossier, 'rendre_cles').ecrit).toBe(true)
  })

  it('sans estimation : écrite où la nuit la lit, relue par lireMission ; le modèle du chantier lit « non estimée »', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-1', 'simuler_absence'),
      ...echappeeEssai('E-20261009T1000-0001', 'C-1', 'simuler_absence', 'Et si A-1 partait ?'),
    ])
    const chemin = ecrireMission(dossier, commandee(dossier, 'simuler_absence'))
    expect(chemin).toBe(join(dossier, 'rondes', '2026-10-10', 'simuler_absence.yaml'))
    const { mission } = lireMission(chemin)
    expect(mission.estimation).toBeUndefined()
    expect(missionPourModele(mission, DOMAINE_ESSAI)).toContain(
      'estimation : non estimée (mission écrite par le code, sur commande du patron)',
    )
  })

  it('refusée : un geste codé du même nom, une mission ouverte du même nom, une intention déjà commandée, un geste actif ; une mission du jour sans commande se réécrit', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-1', 'voir_planning'),
      ...echappeeEssai('E-20261009T1000-0001', 'C-1', 'voir_planning', 'Le planning de A-1 ?'),
      nouvelle('C-2', 'simuler_absence'),
      ...echappeeEssai('E-20261009T1100-0002', 'C-2', 'simuler_absence', 'Et si A-1 partait ?'),
    ])
    expect(() => commandee(dossier, 'voir_planning')).toThrow(/un geste codé porte déjà ce nom/)
    const ouverte = { ...MISSION_ESSAI, sorte: 'intention_nouvelle' as const, date: '2026-10-09' }
    const chemin = missionALaMain(dossier, ouverte)
    expect(() => commandee(dossier, 'simuler_absence')).toThrow(
      /déjà ouverte \(2026-10-09, à faire\)/,
    )
    writeFileSync(chemin, stringify({ ...ouverte, statut: 'écartée' }))
    // La même, `geste_code` et du jour : un clic dont la ligne au journal a manqué.
    ecrireMission(dossier, commandee(dossier, 'simuler_absence'))
    expect(commandee(dossier, 'simuler_absence').id).toBe('simuler_absence')
    const actif = lignes(dossier, (j) => construireCatalogue(METIER_ESSAI, dossier, j)) as Catalogue
    actif.intentions = actif.intentions.map((i) =>
      i.id === 'simuler_absence' ? { ...i, geste_actif: true as const } : i,
    )
    expect(() => commandee(dossier, 'simuler_absence', { catalogue: actif })).toThrow(
      /un geste actif existe déjà/,
    )
    ecrire('2026-10-10T08:00:00Z', [
      { type: TYPE_GESTE_COMMANDE, objet: 'simuler_absence', donnees: { par: PATRON } },
    ])
    expect(() => commandee(dossier, 'simuler_absence')).toThrow(/déjà commandé le 2026-10-10/)
  })

  it('commanderMission : le yaml d’abord, puis la ligne `geste commandé` ; une seconde fois, refusée, rien ne change', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-09T08:00:00Z', [
      nouvelle('C-1', 'simuler_absence'),
      ...echappeeEssai('E-20261009T1000-0001', 'C-1', 'simuler_absence', 'Et si A-1 partait ?'),
    ])
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      expect(
        commanderMission(METIER_ESSAI, s, dossier, 'simuler_absence', PATRON, MAINTENANT),
      ).toEqual({
        intention: 'simuler_absence',
        le: '2026-10-10',
      })
      const chemin = join(dossier, 'rondes', '2026-10-10', 'simuler_absence.yaml')
      expect(lireMission(chemin).mission).toMatchObject({ sorte: 'geste_code', statut: 'à faire' })
      expect(s.journal.lire().filter((l) => l.type === TYPE_GESTE_COMMANDE)).toHaveLength(1)
      const avant = readFileSync(chemin, 'utf8')
      expect(() =>
        commanderMission(METIER_ESSAI, s, dossier, 'simuler_absence', PATRON, MAINTENANT),
      ).toThrow(/déjà commandé/)
      expect(readFileSync(chemin, 'utf8')).toBe(avant)
      // Refusée : ni fichier ni ligne.
      expect(() =>
        commanderMission(METIER_ESSAI, s, dossier, 'inventaire_cles', PATRON, MAINTENANT),
      ).toThrow(/aucune demande/)
      expect(existsSync(join(dossier, 'rondes', '2026-10-10', 'inventaire_cles.yaml'))).toBe(false)
      expect(s.journal.lire().filter((l) => l.type === TYPE_GESTE_COMMANDE)).toHaveLength(1)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})

describe('demandesAvecEtat', () => {
  it('le dernier chantier après la commande, et « disponible » quand un geste codé porte l’intention', () => {
    const { dossier, ecrire } = client()
    ecrire('2026-10-08T08:00:00Z', [
      nouvelle('C-1', 'simuler_absence'),
      { type: TYPE_CHANTIER, objet: 'simuler_absence', issue: 'refusé' },
    ])
    const etat = (codes: string[] = []) =>
      lignes(dossier, (j) => demandesAvecEtat(j.lire(), codes)) as ReturnType<
        typeof demandesAvecEtat
      >
    expect(etat()[0]?.commande).toBeUndefined()
    ecrire('2026-10-09T08:00:00Z', [
      { type: TYPE_GESTE_COMMANDE, objet: 'simuler_absence', donnees: { par: PATRON } },
    ])
    // Un chantier d'avant la commande ne dit rien d'elle.
    expect(etat()[0]?.commande).toEqual({ par: PATRON, le: '2026-10-09', disponible: false })
    ecrire('2026-10-10T01:00:00Z', [
      { type: TYPE_CHANTIER, objet: 'simuler_absence', issue: 'échoué : check rouge' },
    ])
    ecrire('2026-10-11T01:00:00Z', [
      { type: TYPE_CHANTIER, objet: 'simuler_absence', issue: 'fusionné' },
    ])
    expect(etat()[0]?.commande).toEqual({
      par: PATRON,
      le: '2026-10-09',
      chantier: { issue: 'fusionné', le: '2026-10-11' },
      disponible: false,
    })
    expect(etat(['voir_planning', 'simuler_absence'])[0]?.commande?.disponible).toBe(true)
  })
})

/** Une mission écrite à la main sous `rondes/<date>/` du client. */
function missionALaMain(dossier: string, m: Mission): string {
  const d = join(dossier, 'rondes', m.date)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, `${m.id}.yaml`), stringify(m))
  return join(d, `${m.id}.yaml`)
}
