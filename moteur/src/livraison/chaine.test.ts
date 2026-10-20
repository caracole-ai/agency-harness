import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import type { Commande } from '../chantier/arbre'
import {
  agenceEssai,
  binaireSimule,
  CLE_ESSAI,
  cleEssai,
  cloneDuDistant,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  etatHumain,
  gesteVert,
} from '../chantier/essai.test.fixture'
import { versionner } from '../chantier/fusion'
import {
  CLIENT_ESSAI,
  dossierEssai,
  METIER_ESSAI,
  PERSONNES_ESSAI,
} from '../chantier/metier-essai.test.fixture'
import { demandesAvecEtat, TYPE_CHANTIER } from '../chantier/mission'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { FUSEAU, Temporal } from '../temps/temporal'
import { retirerMission, tourAgence } from './agence'
import { FICHIER_LIVRAISON, type Livraison } from './config'
import { FENETRE_PLANTAGES_MS, harnais, type Lance } from './harnais'
import {
  CODE_RELANCE,
  cible,
  FICHIER_VERSION,
  ISSUES_MISE_A_JOUR,
  installerPremiere,
  LIENS,
  noterLivraison,
  rattraper,
  TYPE_MISE_A_JOUR,
  versionDeLArbre,
} from './mise-a-jour'
import { commanderEtLivrer } from './missions'
import { FICHIER_SIGNATAIRES } from './version'

// PLAN-LIVRAISON.md L12 : le laboratoire = la production, sur une machine.
// Deux dépôts nus (le produit, la file du client), le dépôt de l'agence
// (l'arbre d'un humain), un client livré avec son installation, le binaire
// `claude` simulé, `pnpm` simulé, une clé de signature engendrée par
// `ssh-keygen`. Les points 1 à 5 du critère global, dans l'ordre :
// 1. le clic marque la mission, le rattrapage qu'il déclenche la pousse ;
// 2. l'agence la prend, fusionne, version
// signée, l'humain intact ; 3. le client tire, vérifie, prépare, bascule, le
// journal dit « faite », la carte « disponible » ; 4. une autre clé, une
// autre lignée refusées, un redémarrage qui échoue revient en arrière ;
// 5. le retrait émet une version, le client la tire, le geste disparaît.

const SLUG = 'client-essai'
const INTENTION = 'liberer_un_jour'
const JOUR = '2026-10-10'
const quand = (heure: string) => Temporal.ZonedDateTime.from(`${JOUR}T${heure}[${FUSEAU}]`)

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout.trim()
}

/** L'horloge du lanceur : la bascule à 0, puis des plantages groupés bien après sa fenêtre (un arrêt, pas un retour arrière). */
const horloge = () => {
  let n = 0
  return () => (n++ === 0 ? 0 : 100 * FENETRE_PLANTAGES_MS + n)
}

/** L'interface du client jouée par le lanceur : chaque lancement rend un code, ou tourne (`vit`). */
function interfaces(codes: (number | 'vit')[]) {
  const lancees: string[] = []
  const lancer = (arbre: string): Lance => {
    lancees.push(arbre)
    const code = codes[lancees.length - 1] ?? 1
    let finir: (c: number | null) => void = () => undefined
    const fin = new Promise<number | null>((r) => {
      finir = r
    })
    if (code !== 'vit') setTimeout(() => finir(code), 0)
    return { fin, arreter: () => finir(143) }
  }
  return { lancer, lancees }
}

/** La chaîne entière fait beaucoup de git pour de vrai : plus que le délai par défaut, quand la suite tourne en parallèle. */
const DELAI_CHAINE_MS = 120_000

describe('la chaîne entière (L12), le binaire simulé', () => {
  it('points 1 à 5 du critère global', { timeout: DELAI_CHAINE_MS }, async () => {
    // ── Le laboratoire ─────────────────────────────────────────────────────
    const depots = creerDepots({ sansVersion: true })
    const humain = etatHumain(depots.racine)
    const base = mkdtempSync(join(tmpdir(), 'laboratoire-'))
    const file = join(base, `missions-${SLUG}.git`)
    git(base, 'init', '-q', '--bare', '-b', 'main', file)
    const dossier = dossierEssai()
    copyFileSync(CLE_ESSAI.signataires, join(dossier, FICHIER_SIGNATAIRES))
    const l: Livraison = {
      depot: depots.origine,
      missions: file,
      installation: join(base, 'installation'),
      intervalle_minutes: 15,
    }
    writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify(l))
    const s = METIER_ESSAI.ouvrir(dossier)
    const { commande } = commandeSimulee()
    const agence = (() => {
      const a = agenceEssai(
        binaireSimule({
          plan: { faisable: true, raison: 'un geste', plan: '-' },
          implementations: [{ ecrire: gesteVert(INTENTION) }],
        }).binaire,
      )
      return {
        ...a,
        agence: { ...a.agence, clients: [{ slug: SLUG, metier: 'essai', missions: file }] },
      }
    })()
    const journal = () => s.journal.lire()
    const carte = (codes: string[] = []) =>
      demandesAvecEtat(journal(), codes).find((d) => d.intention === INTENTION)?.commande
    try {
      // La première version, posée à la main, installée chez le client.
      versionner({
        commande,
        racine: depots.racine,
        version: { cle: CLE_ESSAI.privee, jour: JOUR },
      })
      const premiere = rattraper(METIER_ESSAI, s, dossier, quand('09:00'), ENV_ESSAI, commande)
      expect(premiere.preparation?.prete).toEqual({ version: `v${JOUR}-1`, deja: false })
      expect(installerPremiere(l)).toBe(`v${JOUR}-1`)
      s.journal.ecrire(
        [
          {
            type: TYPE_CONSIGNE,
            client: CLIENT_ESSAI,
            objet: 'C-11',
            issue: 'nouvelle',
            motif: 'Libère Rosalie mardi.',
            donnees: {
              identite: { role: 'patron' },
              demande: { sorte: 'nouvelle', intention: INTENTION, resume: 'libérer Rosalie mardi' },
            },
          },
        ],
        '2026-10-10T08:00:00Z',
      )

      // ── 1. Le clic, puis le rattrapage qu'il déclenche : la mission chez le client et dans sa file
      commanderEtLivrer(METIER_ESSAI, s, dossier, INTENTION, { role: 'patron' }, quand('10:00'))
      rattraper(METIER_ESSAI, s, dossier, quand('10:00'), ENV_ESSAI, commande)
      const mission = join(cloneDuDistant(file), JOUR, `${INTENTION}.yaml`)
      expect(readFileSync(mission, 'utf8')).not.toMatch(/Rosalie|Vernet|A-\d/)
      expect(carte()?.chantier).toBeUndefined()

      // ── 2. L'agence la prend : en cours, fusion, version signée ──────────
      let pendant: string | undefined
      const surveillee: Commande = (cwd, nom, args, env) => {
        if (
          pendant === undefined &&
          nom === 'pnpm' &&
          args[0] === 'install' &&
          /chantier-/.test(cwd)
        ) {
          rattraper(METIER_ESSAI, s, dossier, quand('10:01'), ENV_ESSAI, commande)
          pendant = carte()?.chantier?.issue
        }
        return commande(cwd, nom, args, env)
      }
      const tour = await tourAgence({
        racine: depots.racine,
        agence,
        env: ENV_ESSAI,
        maintenant: quand('10:01'),
        metier: async () => METIER_ESSAI as never,
        personnes: async () => PERSONNES_ESSAI,
        commande: surveillee,
      })
      expect(tour.prise).toMatchObject({ statut: 'fusionné' })
      expect(pendant).toBe('en cours')
      expect(git(depots.origine, 'tag', '--list', 'v*').split('\n')).toEqual([
        `v${JOUR}-1`,
        `v${JOUR}-2`,
      ])
      expect(etatHumain(depots.racine)).toEqual(humain)

      // ── 3. Le client tire, vérifie, prépare, bascule ; « faite », « disponible »
      const apres = rattraper(METIER_ESSAI, s, dossier, quand('10:20'), ENV_ESSAI, commande)
      expect(apres.preparation?.prete).toEqual({ version: `v${JOUR}-2`, deja: false })
      expect(carte()?.chantier).toMatchObject({ issue: 'fusionné', version: `v${JOUR}-2` })
      const suivant = cible(l.installation, LIENS.suivant) ?? ''
      expect(existsSync(join(suivant, 'metiers', 'essai', 'code', 'src', 'simulation.ts'))).toBe(
        true,
      )
      const x = interfaces([CODE_RELANCE, 1, 1, 1])
      await harnais({
        installation: l.installation,
        lancer: x.lancer,
        sonder: async () => true,
        attendre: async () => undefined,
        maintenant: horloge(),
      })
      expect(versionDeLArbre(cible(l.installation, LIENS.courant))).toBe(`v${JOUR}-2`)
      // L'interface qui tourne lit le marqueur que le lanceur a posé après la sonde : « faite ».
      expect(noterLivraison(METIER_ESSAI, s, l, quand('10:30'))).toEqual([`faite (v${JOUR}-2)`])
      expect(
        journal()
          .filter((y) => y.type === TYPE_MISE_A_JOUR)
          .map((y) => [y.objet, y.issue]),
      ).toEqual([[`v${JOUR}-2`, ISSUES_MISE_A_JOUR.faite]])
      // Le métier relancé porte le geste : la carte dit « disponible ».
      expect(carte([INTENTION])?.disponible).toBe(true)

      // ── 4. Une autre clé, une autre lignée : refusées ; un redémarrage qui échoue : retour arrière
      const autre = cloneDuDistant(depots.origine)
      git(autre, 'config', 'user.email', 'a@exemple.invalid')
      git(autre, 'config', 'user.name', 'a')
      git(autre, 'commit', '-q', '--allow-empty', '-m', 'intrus')
      git(
        autre,
        '-c',
        'gpg.format=ssh',
        '-c',
        `user.signingkey=${cleEssai('intrus').privee}`,
        'tag',
        '-s',
        '-m',
        'x',
        'v2026-10-11-1',
      )
      git(autre, 'checkout', '-q', `v${JOUR}-1`)
      git(autre, 'commit', '-q', '--allow-empty', '-m', 'autre lignée')
      git(
        autre,
        '-c',
        'gpg.format=ssh',
        '-c',
        `user.signingkey=${CLE_ESSAI.privee}`,
        'tag',
        '-s',
        '-m',
        'x',
        'v2026-10-11-2',
      )
      git(autre, 'push', '-q', 'origin', 'refs/tags/v2026-10-11-1', 'refs/tags/v2026-10-11-2')
      const refus = rattraper(METIER_ESSAI, s, dossier, quand('11:00'), ENV_ESSAI, commande)
      expect(refus.preparation?.prete).toBeUndefined()
      expect(
        Object.fromEntries((refus.preparation?.refusees ?? []).map((r) => [r.version, r.raison])),
      ).toMatchObject({
        'v2026-10-11-1': expect.stringMatching(/signature refusée/),
        'v2026-10-11-2': `ne descend pas de v${JOUR}-2`,
      })
      // Un redémarrage qui échoue : une version de plus, posée par l'agence ; la sonde ne répond pas.
      const travail = cloneDuDistant(depots.origine)
      git(travail, 'config', 'user.email', 'b@exemple.invalid')
      git(travail, 'config', 'user.name', 'b')
      git(travail, 'commit', '-q', '--allow-empty', '-m', 'moteur')
      git(travail, 'push', '-q', 'origin', 'HEAD:main')
      const v3 = versionner({
        commande,
        racine: depots.racine,
        version: { cle: CLE_ESSAI.privee, jour: '2026-10-11' },
      })
      expect(v3.version).toBe('v2026-10-11-3')
      expect(
        rattraper(METIER_ESSAI, s, dossier, quand('12:00'), ENV_ESSAI, commande).preparation?.prete
          ?.version,
      ).toBe(v3.version)
      await harnais({
        installation: l.installation,
        lancer: interfaces([CODE_RELANCE, 'vit', 1, 1, 1]).lancer,
        sonder: async () => false,
        attendre: async () => undefined,
        maintenant: horloge(),
      })
      expect(versionDeLArbre(cible(l.installation, LIENS.courant))).toBe(`v${JOUR}-2`)
      // La précédente, relancée : le retour arrière au journal ; aucune « faite » de plus.
      expect(noterLivraison(METIER_ESSAI, s, l, quand('12:10'))).toEqual([
        `retour arrière (${v3.version} → v${JOUR}-2)`,
      ])
      expect(
        journal()
          .filter((y) => y.type === TYPE_MISE_A_JOUR)
          .at(-1),
      ).toMatchObject({
        objet: v3.version,
        issue: ISSUES_MISE_A_JOUR.retour,
      })
      // Jamais reprise.
      expect(
        rattraper(METIER_ESSAI, s, dossier, quand('12:30'), ENV_ESSAI, commande).preparation?.prete,
      ).toBeUndefined()

      // ── 5. Le retrait : une version, tirée ; le geste a disparu, les deux journaux le disent.
      // Le motif cite un nom : nettoyé une fois, il ne part ni dans le commit du retrait (que tous
      // les clients tirent avec la version), ni dans la mémoire, ni dans le statut.
      const retrait = retirerMission({
        racine: depots.racine,
        agence,
        id: INTENTION,
        motif: 'doublon, vu avec Rosalie',
        personnes: PERSONNES_ESSAI,
        cle: CLE_ESSAI.privee,
        maintenant: Temporal.ZonedDateTime.from(`2026-10-11T13:00[${FUSEAU}]`),
        commande,
      })
      expect(retrait).toMatchObject({ client: SLUG, dit: { sorte: 'poussé' } })
      expect(retrait.motif).not.toMatch(/Rosalie/)
      expect(git(depots.origine, 'log', '--format=%B', 'main')).not.toMatch(/Rosalie/)
      expect(
        readFileSync(join(cloneDuDistant(file), JOUR, `${INTENTION}.statut.yaml`), 'utf8'),
      ).not.toMatch(/Rosalie/)
      const tire = rattraper(METIER_ESSAI, s, dossier, quand('13:15'), ENV_ESSAI, commande)
      expect(tire.preparation?.prete?.version).toBe(retrait.version)
      await harnais({
        installation: l.installation,
        lancer: interfaces([CODE_RELANCE, 1, 1, 1]).lancer,
        sonder: async () => true,
        attendre: async () => undefined,
        maintenant: horloge(),
      })
      const courant = cible(l.installation, LIENS.courant) ?? ''
      expect(readFileSync(join(courant, FICHIER_VERSION), 'utf8').trim()).toBe(retrait.version)
      expect(existsSync(join(courant, 'metiers', 'essai', 'code', 'src', 'simulation.ts'))).toBe(
        false,
      )
      expect(
        journal()
          .filter((y) => y.type === TYPE_CHANTIER)
          .at(-1),
      ).toMatchObject({ objet: INTENTION, issue: 'retiré' })
      const memoire = cloneDuDistant(depots.origine)
      // La mémoire connaît la mission par sa clé ; `retirerMission` a reçu l'identifiant seul.
      expect(retrait.mission).toBe(`essai/${INTENTION}`)
      expect(readFileSync(join(memoire, 'memoire', 'INDEX.md'), 'utf8')).toMatch(
        new RegExp(`retrait · essai/${INTENTION}`),
      )
      // `git grep` sort en 1 quand il ne trouve rien : lu sans le lever.
      const cite = spawnSync('git', ['grep', '-l', 'Rosalie', 'HEAD', '--', 'memoire'], {
        cwd: memoire,
        encoding: 'utf8',
      })
      expect(cite.stdout.trim()).toBe('')
      expect(etatHumain(depots.racine)).toEqual(humain)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})
