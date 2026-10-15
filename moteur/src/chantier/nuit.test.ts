import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { Temporal } from '../temps/temporal'
import { TYPE_CHANTIER } from './chantier'
import {
  agenceEssai,
  binaireSimule,
  clientAvecCommande,
  clientAvecMission,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  gesteVert,
  MISSION_ESSAI,
} from './essai.test.fixture'
import { lireIndex, lireMesures } from './memoire'
import { METIER_ESSAI } from './metier-essai.test.fixture'
import { faireNuit, type OptionsNuit } from './nuit'

// PLAN-RONDE.md § 7 et R8, R11, en simulé : purge → au plus une mission
// commandée en chantier, depuis le clone de la nuit remis à origin/main ;
// aucun modèle ne cherche de mission (REFLEXIONS.md, 2026-10-15) ; relancée
// la même nuit, elle ne refait rien ; un clone sale l'arrête avant tout appel.

const git = (cwd: string, ...args: string[]) =>
  spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim()

function essai() {
  const depots = creerDepots()
  const { binaire, appels } = binaireSimule({
    plan: { faisable: true, raison: 'bande métier', plan: '- un geste' },
    implementations: [{ ecrire: gesteVert() }],
  })
  const { commande, emises } = commandeSimulee()
  const { dossier, fichier } = clientAvecMission()
  const options: OptionsNuit = {
    racine: depots.racine,
    agence: agenceEssai(binaire, depots.depot),
    dossierClient: dossier,
    date: Temporal.PlainDate.from('2026-10-10'),
    env: ENV_ESSAI,
    commande,
  }
  return { depots, appels, emises, fichier, options }
}

const chantiersAuJournal = (dossier: string) => {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return s.journal.lire().filter((l) => l.type === TYPE_CHANTIER)
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

describe('faireNuit', () => {
  it('purge → une mission → fusion ; la mémoire et la ligne de la nuit poussées depuis le clone', async () => {
    const e = essai()
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.etapes.map((x) => [x.etape, x.ok])).toEqual([
      ['clone', true],
      ['purge', true],
      ['chantier', true],
      ['mémoire', true],
    ])
    expect(r.etapes.find((x) => x.etape === 'purge')?.issue).toBe('rien à purger')
    expect(lireIndex(e.depots.depot).map((l) => l.sorte)).toEqual(['fusion'])
    expect(lireMesures(e.depots.depot)).toEqual([{ date: '2026-10-10', client: 'client essai' }])
    expect(git(e.depots.origine, 'rev-parse', 'main')).toBe(
      git(e.depots.depot, 'rev-parse', 'main'),
    )
    expect(git(e.depots.depot, 'status', '--porcelain')).toBe('')
    // L'arbre humain n'a pas bougé.
    expect(git(e.depots.racine, 'log', '--oneline').split('\n')).toHaveLength(1)
  })

  it('relancée la même nuit, elle ne refait rien', async () => {
    const e = essai()
    await faireNuit(METIER_ESSAI, e.options)
    const appels = e.appels().length
    const index = lireIndex(e.depots.depot).length
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.etapes.some((x) => x.etape === 'chantier')).toBe(false)
    expect(r.etapes.find((x) => x.etape === 'mémoire')?.issue).toBe('rien de neuf')
    expect(e.appels()).toHaveLength(appels)
    expect(lireIndex(e.depots.depot)).toHaveLength(index)
    expect(lireMesures(e.depots.depot)).toHaveLength(1)
    expect(chantiersAuJournal(e.options.dossierClient)).toHaveLength(1)
  })

  it('au plus missions_max_par_nuit chantiers : les autres missions attendent la nuit suivante', async () => {
    const e = essai()
    for (const [id, intention] of [
      ['heures', 'heures_par_agent'],
      ['troisieme', 'autre'],
    ]) {
      writeFileSync(
        join(e.fichier, '..', `${id}.yaml`),
        stringify({ ...MISSION_ESSAI, id, intentions: [intention], echappees: [] }),
      )
    }
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.chantiers.map((x) => x.sorte)).toEqual(['fait'])
    expect(r.etapes.filter((x) => x.etape === 'chantier')).toHaveLength(1)
    // Relancée la même nuit : la borne tient, les autres missions attendent la nuit suivante.
    const encore = await faireNuit(METIER_ESSAI, e.options)
    expect(encore.etapes.filter((x) => x.etape === 'chantier')).toEqual([])
    expect(e.appels().filter((a) => a.role === 'plan')).toHaveLength(1)
  })

  it('une mission commandée par le patron : la nuit la prend telle quelle, la ligne `chantier` porte l’intention', async () => {
    const e = essai()
    const { dossier } = clientAvecCommande()
    const r = await faireNuit(METIER_ESSAI, { ...e.options, dossierClient: dossier })
    expect(r.chantiers.map((x) => x.sorte)).toEqual(['fait'])
    expect(r.etapes.find((x) => x.etape === 'chantier')?.issue).toMatch(/^liberer_un_jour : /)
    expect(chantiersAuJournal(dossier).map((l) => l.objet)).toEqual(['liberer_un_jour'])
    expect(e.appels().filter((a) => a.role === 'plan')).toHaveLength(1)
  })

  it('un clone sale arrête la nuit avant tout appel', async () => {
    const e = essai()
    writeFileSync(join(e.depots.depot, 'sale.txt'), 'x')
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.etapes).toEqual([
      { etape: 'clone', ok: false, issue: expect.stringMatching(/pas propre/) },
    ])
    expect(e.appels()).toEqual([])
    expect(readFileSync(join(e.depots.depot, 'sale.txt'), 'utf8')).toBe('x')
  })
})
