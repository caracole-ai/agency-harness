import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FUSEAU, Temporal } from '../temps/temporal'
import { verifierBase } from './arbre'
import { faireChantier } from './chantier'
import {
  agenceEssai,
  binaireSimule,
  clientAvecMission,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  etatHumain,
  gesteVert,
  MISSION_ESSAI,
} from './essai.test.fixture'
import { retirerFusion } from './fusion'
import { ecrireRetrait } from './memoire'
import { METIER_ESSAI, PERSONNES_ESSAI } from './metier-essai.test.fixture'

// PLAN-LIVRAISON.md § 0.3 et L2 : le dépôt de base est l'arbre d'un humain,
// sur sa branche, avec son travail en cours. Un chantier fusionné puis retiré
// n'y émet que `fetch`, `worktree` et `rev-parse` (la liste permise y ajoute
// `tag`, `push` et `verify-tag`) ; sa tête, sa branche, son `main`, ses
// fichiers modifiés et non suivis sont les mêmes avant et après.

/** Ce que le code a le droit d'émettre sur le dépôt de base (§ 0.3). */
const PERMISES = ['fetch', 'worktree', 'tag', 'push', 'rev-parse', 'verify-tag']

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout
}

describe('le dépôt de base (§ 0.3, L2)', () => {
  it('un chantier fusionné puis retiré : sur la base, seulement fetch, worktree et rev-parse ; l’humain retrouve tout', async () => {
    const depots = creerDepots()
    // L'humain travaille sur sa branche, un fichier suivi modifié, un autre non suivi.
    git(depots.racine, 'checkout', '-q', '-b', 'travail')
    writeFileSync(join(depots.racine, 'moteur', 'src', 'moteur.ts'), 'export const MOTEUR = 3\n')
    writeFileSync(join(depots.racine, 'brouillon.txt'), 'à finir\n')
    const humain = etatHumain(depots.racine)
    const { binaire } = binaireSimule({
      plan: { faisable: true, raison: 'un geste', plan: '-' },
      implementations: [{ ecrire: gesteVert() }],
    })
    const { commande, emises } = commandeSimulee()
    const sortie = mkdtempSync(join(tmpdir(), 'sortie-'))
    const r = await faireChantier(METIER_ESSAI, {
      racine: depots.racine,
      agence: agenceEssai(binaire),
      mission: clientAvecMission().fichier,
      client: 'client-essai',
      personnes: PERSONNES_ESSAI,
      sortie,
      env: ENV_ESSAI,
      maintenant: Temporal.ZonedDateTime.from(`2026-10-11T03:00[${FUSEAU}]`),
      commande,
    })
    expect(r.sorte === 'fait' && r.issue).toBe('fusionné')
    retirerFusion({
      commande,
      racine: depots.racine,
      id: MISSION_ESSAI.id,
      motif: 'essai',
      ecrireRetrait: (arbre) =>
        ecrireRetrait(
          arbre,
          {
            date: '2026-10-12',
            client: 'client-essai',
            id: MISSION_ESSAI.id,
            titre: MISSION_ESSAI.titre,
            intentions: MISSION_ESSAI.intentions,
            motif: 'essai',
          },
          PERSONNES_ESSAI,
        ),
    })

    // Le code passe la racine telle quelle : une commande sur la base porte ce chemin-là.
    const surLaBase = emises.filter((x) => x.commande === 'git' && x.cwd === depots.racine)
    expect(surLaBase.length).toBeGreaterThan(0)
    expect(surLaBase.filter((x) => !PERMISES.includes(x.args[0] ?? ''))).toEqual([])
    expect([...new Set(surLaBase.map((x) => x.args[0]))].sort()).toEqual([
      'fetch',
      'rev-parse',
      'worktree',
    ])
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(readFileSync(join(depots.racine, 'brouillon.txt'), 'utf8')).toBe('à finir\n')
    expect(readFileSync(join(depots.racine, 'moteur', 'src', 'moteur.ts'), 'utf8')).toBe(
      'export const MOTEUR = 3\n',
    )
  })

  it('verifierBase refuse un dossier qui n’est pas la racine d’un dépôt, et un dépôt sans origin', () => {
    const { racine } = creerDepots()
    const sous = join(racine, 'moteur')
    expect(() => verifierBase(commandeSimulee().commande, sous)).toThrow(/pas la racine/)
    const seul = mkdtempSync(join(tmpdir(), 'seul-'))
    mkdirSync(join(seul, 'x'))
    git(seul, 'init', '-q', '-b', 'main')
    expect(() => verifierBase(commandeSimulee().commande, seul)).toThrow(/git fetch/)
  })
})
