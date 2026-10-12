import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TYPE_ALERTE } from '../archetypes/veille-client'
import { Journal } from '../journal/journal'
import {
  chargerGestesAppris,
  ISSUE_GESTE,
  lireFichiersGestes,
  motifSansCle,
  REGLE_SANS_HUMAIN,
  TYPE_GESTE_APPRIS,
} from './charger'
import { DOSSIER_GESTES, empreinteGeste, type FichierGeste } from './geste-appris'
import {
  DECLARATIONS_EXEMPLE,
  GESTE_ECRIT_EXEMPLE as ECRIT,
  GESTE_EXEMPLE as GESTE,
  OPERATION_EXEMPLE,
} from './geste-appris.test.fixture'

// Un fichier de geste ne vaut que par sa clé (PLAN-PROMOTION.md § 5.5, P7) :
// jamais activé, un octet changé, retiré → écarté, refusé au journal, alerte ;
// activé → chargé. Un type de paramètre ou une opération que le métier ne
// déclare pas : écarté (PLAN-METIER-2.md M5, M6).

const CLIENT = 'fictif'
const FICHIER = 'heures_par_agent.yaml'

function dossierAvec(...fichiers: [string, unknown][]): { dossier: string; journal: Journal } {
  const dossier = mkdtempSync(join(tmpdir(), 'gestes-'))
  mkdirSync(join(dossier, DOSSIER_GESTES))
  // YAML lit le JSON : le fichier s'écrit sans sérialiseur.
  for (const [nom, contenu] of fichiers) {
    writeFileSync(
      join(dossier, DOSSIER_GESTES, nom),
      typeof contenu === 'string' ? contenu : JSON.stringify(contenu),
    )
  }
  return { dossier, journal: new Journal(join(dossier, 'journal.sqlite')) }
}
const actif: FichierGeste = { ...GESTE, statut: 'actif' }
const activer = (journal: Journal, jeton = empreinteGeste(GESTE)) =>
  journal.ecrire([
    {
      type: TYPE_GESTE_APPRIS,
      client: CLIENT,
      objet: GESTE.id,
      issue: ISSUE_GESTE.active,
      donnees: { jeton, par: 'test' },
    },
  ])
const retirer = (journal: Journal, jeton = empreinteGeste(GESTE)) =>
  journal.ecrire([
    {
      type: TYPE_GESTE_APPRIS,
      client: CLIENT,
      objet: GESTE.id,
      issue: ISSUE_GESTE.retire,
      donnees: { jeton },
    },
  ])
const charger = (dossier: string, journal: Journal, declarations = DECLARATIONS_EXEMPLE) =>
  chargerGestesAppris(dossier, { client: CLIENT, journal, declarations }, '2026-10-10T19:40:00Z')
const refus = (journal: Journal) =>
  journal.lire().filter((l) => l.type === TYPE_GESTE_APPRIS && l.issue === ISSUE_GESTE.refuse)

describe('chargerGestesAppris', () => {
  it('jamais activé → écarté, refusé au journal avec le jeton, alerte G-01', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    expect(charger(dossier, journal)).toEqual({
      actifs: [],
      ecartes: [{ fichier: FICHIER, id: GESTE.id, motif: 'jamais activé' }],
    })
    const [r] = refus(journal)
    expect(r).toMatchObject({
      objet: GESTE.id,
      motif: 'jamais activé',
      horodatage: '2026-10-10T19:40:00Z',
    })
    expect(JSON.parse(r?.donnees ?? '{}')).toEqual({
      fichier: FICHIER,
      jeton: empreinteGeste(GESTE),
    })
    const alerte = journal.lire().find((l) => l.type === TYPE_ALERTE)
    expect(alerte).toMatchObject({ regle: REGLE_SANS_HUMAIN, objet: GESTE.id, issue: 'alerte' })
    expect(alerte?.motif).toContain('jamais activé')
    journal.fermer()
  })
  it('activé → chargé, rien d’écrit au journal', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    const avant = journal.lire().length
    expect(charger(dossier, journal)).toEqual({ actifs: [GESTE], ecartes: [] })
    expect(journal.lire()).toHaveLength(avant)
    journal.fermer()
  })
  it('activé puis un octet changé → écarté, « empreinte différente »', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    writeFileSync(
      join(dossier, DOSSIER_GESTES, FICHIER),
      JSON.stringify({ ...actif, description: `${actif.description}.` }),
    )
    const { actifs, ecartes } = charger(dossier, journal)
    expect(actifs).toEqual([])
    expect(ecartes[0]?.motif).toBe('empreinte différente')
    expect(refus(journal)[0]?.motif).toBe('empreinte différente')
    journal.fermer()
  })
  it('activé puis retiré → écarté, « retiré » ; réactivé ensuite → chargé', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    retirer(journal)
    expect(charger(dossier, journal).ecartes[0]?.motif).toBe('retiré')
    activer(journal)
    expect(charger(dossier, journal).actifs).toHaveLength(1)
    journal.fermer()
  })
  it('l’identifiant d’un geste codé : écarté même activé, refusé, alerte (jamais deux outils du même nom)', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    const { actifs, ecartes } = chargerGestesAppris(
      dossier,
      { client: CLIENT, journal, declarations: DECLARATIONS_EXEMPLE, codes: [GESTE.id] },
      '2026-10-10T19:40:00Z',
    )
    expect(actifs).toEqual([])
    expect(ecartes).toEqual([
      { fichier: FICHIER, id: GESTE.id, motif: 'l’identifiant d’un geste codé' },
    ])
    expect(refus(journal)[0]?.motif).toBe('l’identifiant d’un geste codé')
    journal.fermer()
  })
  it('retirer un autre fichier du même identifiant (une autre empreinte) ne retire pas le geste actif', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    retirer(journal, empreinteGeste({ ...GESTE, description: `${GESTE.description}, bis` }))
    expect(charger(dossier, journal)).toEqual({ actifs: [GESTE], ecartes: [] })
    journal.fermer()
  })
  it('un refus au journal n’empêche pas le fichier rétabli de se charger', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    writeFileSync(
      join(dossier, DOSSIER_GESTES, FICHIER),
      JSON.stringify({ ...actif, roles: ['patron'] }),
    )
    expect(charger(dossier, journal).actifs).toEqual([])
    writeFileSync(join(dossier, DOSSIER_GESTES, FICHIER), JSON.stringify(actif))
    expect(charger(dossier, journal).actifs).toEqual([GESTE])
    journal.fermer()
  })
  it('un fichier proposé ou retiré n’est ni chargé ni signalé', () => {
    const { dossier, journal } = dossierAvec(
      ['a.yaml', { ...GESTE, statut: 'propose' }],
      ['b.yaml', { ...GESTE, id: 'compter_vacations', statut: 'retire' }],
    )
    expect(charger(dossier, journal)).toEqual({ actifs: [], ecartes: [] })
    expect(journal.lire()).toEqual([])
    journal.fermer()
  })
  it('un fichier illisible ou hors schéma, ou un gabarit faux : écarté, refusé, alerte', () => {
    const { dossier, journal } = dossierAvec(
      ['illisible.yaml', '{ pas: [du yaml'],
      ['schema.yaml', { ...actif, requetes: [] }],
      ['gabarit.yaml', { ...actif, reponse: { ...actif.reponse, ligne: '{{total.n}}' } }],
    )
    activer(journal)
    const { actifs, ecartes } = charger(dossier, journal)
    expect(actifs).toEqual([])
    expect(ecartes.map((e) => e.fichier)).toEqual(['gabarit.yaml', 'illisible.yaml', 'schema.yaml'])
    expect(ecartes[0]?.motif).toContain('gabarit : la ligne cite une requête inconnue')
    expect(ecartes[1]?.motif).toMatch(/^YAML illisible/)
    expect(ecartes[2]?.motif).toMatch(/^schéma/)
    expect(refus(journal)).toHaveLength(3)
    expect(journal.lire().filter((l) => l.type === TYPE_ALERTE)).toHaveLength(3)
    journal.fermer()
  })
  it('un type de paramètre que le métier ne déclare pas : écarté au chargement, même activé (PLAN-METIER-2.md M5)', () => {
    const inconnu = {
      ...GESTE,
      parametres: { ...GESTE.parametres, agent: { type: 'projet', description: 'x' } },
    }
    const { dossier, journal } = dossierAvec([FICHIER, { ...inconnu, statut: 'actif' }])
    activer(journal, empreinteGeste(inconnu))
    const { actifs, ecartes } = charger(dossier, journal)
    expect(actifs).toEqual([])
    expect(ecartes[0]?.motif).toBe('gabarit : type de paramètre inconnu : projet')
    journal.fermer()
  })
  it('un geste qui écrit sous l’ancienne forme se charge ; sans opération déclarée, ou une autre, il est écarté (PLAN-METIER-2.md M6)', () => {
    const fichier = 'liberer_un_jour.yaml'
    const { dossier, journal } = dossierAvec([fichier, { ...ECRIT, statut: 'actif' }])
    journal.ecrire([
      {
        type: TYPE_GESTE_APPRIS,
        client: CLIENT,
        objet: ECRIT.id,
        issue: ISSUE_GESTE.active,
        donnees: { jeton: empreinteGeste(ECRIT) },
      },
    ])
    expect(charger(dossier, journal)).toEqual({ actifs: [ECRIT], ecartes: [] })
    const { operation: _operation, ...sansOperation } = DECLARATIONS_EXEMPLE
    expect(charger(dossier, journal, sansOperation).ecartes[0]?.motif).toBe(
      'gabarit : ce métier n’écrit pas par un geste appris',
    )
    const autre = { ...OPERATION_EXEMPLE, nom: 'deplacer' }
    expect(
      charger(dossier, journal, { ...DECLARATIONS_EXEMPLE, operation: autre }).ecartes[0]?.motif,
    ).toBe('gabarit : l’opération « reaffecter » n’est pas celle du métier (deplacer)')
    journal.fermer()
  })
  it('sans dossier gestes/ : rien', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'gestes-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    expect(charger(dossier, journal)).toEqual({ actifs: [], ecartes: [] })
    expect(lireFichiersGestes(dossier)).toEqual([])
    journal.fermer()
  })
})

describe('motifSansCle', () => {
  it('ne regarde que les lignes activé et retiré : un vérifié ou un proposé après l’activation ne change rien', () => {
    const { dossier, journal } = dossierAvec([FICHIER, actif])
    activer(journal)
    journal.ecrire([
      { type: TYPE_GESTE_APPRIS, client: CLIENT, objet: GESTE.id, issue: ISSUE_GESTE.verifie },
    ])
    expect(motifSansCle(journal, GESTE)).toBeUndefined()
    expect(charger(dossier, journal).actifs).toHaveLength(1)
    journal.fermer()
  })
})
