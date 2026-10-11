import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dossierEssai, METIER_ESSAI } from '../ronde/essai'
import type { AppelRonde } from '../ronde/ronde'
import { Temporal } from '../temps/temporal'
import { TYPE_CHANTIER } from './chantier'
import {
  agenceEssai,
  binaireSimule,
  commandeSimulee,
  creerDepots,
  gesteVert,
  MISSION_ESSAI,
} from './essai'
import { lireIndex, lireMesures } from './memoire'
import { faireNuit, type OptionsNuit } from './nuit'

// PLAN-RONDE.md § 7 et R8, R11, en simulé : promotions → ronde → au plus une
// mission de chantier, depuis le clone de la nuit remis à origin/main ;
// relancée la même nuit, elle ne refait rien ; un clone sale l'arrête avant
// tout appel.

const git = (cwd: string, ...args: string[]) =>
  spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim()

const { id, sorte, titre, pourquoi, echappees, intentions, consignes_types, ecrit, estimation } =
  MISSION_ESSAI
const RAPPORT = {
  observations: ['deux simulations'],
  missions: [
    { id, sorte, titre, pourquoi, echappees, intentions, consignes_types, ecrit, estimation },
  ],
  rien_a_signaler: false,
}

function essai() {
  const depots = creerDepots()
  const { binaire, appels } = binaireSimule({
    plan: { faisable: true, raison: 'bande métier', plan: '- un geste' },
    implementations: [{ ecrire: gesteVert() }],
  })
  const { commande, emises } = commandeSimulee()
  const rondes: string[] = []
  const appelRonde: AppelRonde = async (_systeme, message) => {
    rondes.push(message)
    return { ok: true, sortie: RAPPORT, cout_usd: 0.2, estime: true }
  }
  const options: OptionsNuit = {
    racine: depots.racine,
    agence: agenceEssai(binaire, depots.depot),
    dossierClient: dossierEssai(),
    date: Temporal.PlainDate.from('2026-10-10'),
    env: {},
    commande,
    appelRonde,
  }
  return { depots, appels, emises, rondes, options }
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
  it('promotions → ronde → une mission → fusion ; la mémoire et la ligne de la nuit poussées depuis le clone', async () => {
    const e = essai()
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.etapes.map((x) => [x.etape, x.ok])).toEqual([
      ['clone', true],
      ['promotions', true],
      ['ronde', true],
      ['chantier', true],
      ['mémoire', true],
    ])
    expect(e.emises.find((x) => x.commande === 'pnpm' && x.args[0] === 'promotions')?.args).toEqual(
      ['promotions', '--client', e.options.dossierClient, '--date', '2026-10-10'],
    )
    expect(lireIndex(e.depots.depot).map((l) => l.sorte)).toEqual(['ronde', 'fusion'])
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
    expect(r.etapes.find((x) => x.etape === 'ronde')?.issue).toBe('déjà faite')
    expect(r.etapes.some((x) => x.etape === 'chantier')).toBe(false)
    expect(r.etapes.find((x) => x.etape === 'mémoire')?.issue).toBe('rien de neuf')
    expect(e.appels()).toHaveLength(appels)
    expect(e.rondes).toHaveLength(1)
    expect(lireIndex(e.depots.depot)).toHaveLength(index)
    expect(lireMesures(e.depots.depot)).toHaveLength(1)
    expect(chantiersAuJournal(e.options.dossierClient)).toHaveLength(1)
  })

  it('au plus missions_max_par_nuit chantiers ; une mission en attente de promotion ne compte pas', async () => {
    const e = essai()
    const deux = {
      ...RAPPORT,
      missions: [
        { ...RAPPORT.missions[0], id: 'heures', intentions: ['heures_par_agent'], echappees: [] },
        RAPPORT.missions[0],
        { ...RAPPORT.missions[0], id: 'troisieme', intentions: ['autre'], echappees: [] },
      ],
    }
    const r = await faireNuit(METIER_ESSAI, {
      ...e.options,
      appelRonde: async () => ({ ok: true, sortie: deux, cout_usd: 0.2, estime: true }),
    })
    expect(r.chantiers.map((x) => x.sorte)).toEqual(['decision', 'fait'])
    expect(r.etapes.filter((x) => x.etape === 'chantier')).toHaveLength(1)
  })

  it('un clone sale arrête la nuit avant tout appel', async () => {
    const e = essai()
    writeFileSync(join(e.depots.depot, 'sale.txt'), 'x')
    const r = await faireNuit(METIER_ESSAI, e.options)
    expect(r.etapes).toEqual([
      { etape: 'clone', ok: false, issue: expect.stringMatching(/pas propre/) },
    ])
    expect(e.rondes).toEqual([])
    expect(e.appels()).toEqual([])
    expect(readFileSync(join(e.depots.depot, 'sale.txt'), 'utf8')).toBe('x')
  })
})
