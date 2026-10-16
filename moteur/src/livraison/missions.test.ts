import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import type { Commande } from '../chantier/arbre'
import {
  agenceEssai,
  binaireSimule,
  cloneDuDistant,
  commandeSimulee,
  creerDepots,
  ENV_ESSAI,
  etatHumain,
  gesteVert,
  MISSION_ESSAI,
  refuserPush,
} from '../chantier/essai.test.fixture'
import {
  CLIENT_ESSAI,
  dossierEssai,
  METIER_ESSAI,
  PERSONNES_ESSAI,
} from '../chantier/metier-essai.test.fixture'
import {
  DOSSIER_MISSIONS,
  demandesAvecEtat,
  ecrireStatut,
  lireStatut,
  Mission,
  type Statut,
  TYPE_CHANTIER,
} from '../chantier/mission'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { TYPE_GESTE_COMMANDE } from '../gestes/commande'
import { FUSEAU, Temporal } from '../temps/temporal'
import { prendreVerrou, tourAgence } from './agence'
import { FICHIER_LIVRAISON, type Livraison, lireLivraison } from './config'
import {
  chantiersDuJour,
  commanderEtLivrer,
  DOSSIER_CHANTIERS,
  DOSSIER_CHANTIERS_AGENCE,
  DOSSIER_FILES,
  ISSUE_PUBLIQUE,
  lireFile,
  noterChantier,
  rattraperStatuts,
  SUFFIXE_A_POUSSER,
  statuerRetrait,
} from './missions'

// PLAN-LIVRAISON.md L1, L5 à L7 et la mesure du lot 3, avec deux dépôts nus
// pour de vrai (le produit, la file du client) et le binaire `claude`
// simulé : un clic marque la mission, le rattrapage qu'il déclenche la
// pousse ; `pnpm agence --une-fois` la prend,
// écrit `en cours` puis le statut final dans la file ; le client en écrit
// une ligne `chantier`, une seule par statut ; une mission mal formée est
// écartée et dite ; la borne du jour fait attendre ; aucun nom ne part.

const MAINTENANT = Temporal.ZonedDateTime.from(`2026-10-10T15:00[${FUSEAU}]`)
const INTENTION = 'liberer_un_jour'
const SLUG = 'client-essai'

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout.trim()
}

/** Une file vide (`missions-<slug>.git`), un client d'essai livré sur elle, avec une demande nouvelle sous `liberer_un_jour`. */
function clientLivre(livraison: Partial<Livraison> = {}) {
  const base = mkdtempSync(join(tmpdir(), 'livraison-'))
  const file = join(base, `missions-${SLUG}.git`)
  git(base, 'init', '-q', '--bare', '-b', 'main', file)
  const dossier = dossierEssai()
  const installation = join(base, 'installation')
  writeFileSync(
    join(dossier, FICHIER_LIVRAISON),
    stringify({
      depot: join(base, 'produit.git'),
      missions: file,
      installation,
      intervalle_minutes: 15,
      ...livraison,
    }),
  )
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
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
      '2026-10-10T11:00:00Z',
    )
  } finally {
    METIER_ESSAI.fermer(s)
  }
  return { dossier, file, installation }
}

/** Le patron clique « Créer ce geste » : la mission écrite et marquée, aucun git (l'interface n'en lance pas). */
function cliquerSeulement(dossier: string) {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return commanderEtLivrer(METIER_ESSAI, s, dossier, INTENTION, { role: 'patron' }, MAINTENANT)
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

/** Le clic, puis le rattrapage qu'il déclenche (le processus à part) : la mission poussée. */
function cliquer(dossier: string) {
  const r = cliquerSeulement(dossier)
  rattraper(dossier)
  return r
}

/** Le client rattrape ses statuts ; rend le rattrapage et l'état de sa commande. */
function rattraper(dossier: string, quand = MAINTENANT) {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    const r = rattraperStatuts(METIER_ESSAI, s, dossier, quand)
    const lignes = s.journal.lire()
    return {
      r,
      commande: demandesAvecEtat(lignes, []).find((d) => d.intention === INTENTION)?.commande,
      chantiers: lignes.filter((l) => l.type === TYPE_CHANTIER),
    }
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

/** L'agence de l'essai, avec ce client dans `agence.clients`. */
function agence(
  binaire: string,
  file: string,
  x: Partial<ReturnType<typeof agenceEssai>['agence']> = {},
) {
  const a = agenceEssai(binaire)
  return {
    ...a,
    agence: {
      ...a.agence,
      clients: [{ slug: SLUG, metier: 'essai', missions: file }],
      ...x,
    },
  }
}

const tour = (racine: string, a: ReturnType<typeof agence>, commande: Commande) =>
  tourAgence({
    racine,
    agence: a,
    env: ENV_ESSAI,
    maintenant: Temporal.ZonedDateTime.from(`2026-10-10T16:00[${FUSEAU}]`),
    metier: async () => METIER_ESSAI as never,
    personnes: async () => PERSONNES_ESSAI,
    commande,
  })

const PLAN = { faisable: true, raison: 'un geste', plan: '-' }

describe('l’aller : un clic marque la mission, le rattrapage qu’il déclenche la pousse (L6)', () => {
  it('la mission écrite chez le client, la ligne `geste commandé`, la même mission dans la file, rien d’autre ; aucun nom', () => {
    const { dossier, file } = clientLivre()
    expect(cliquer(dossier)).toEqual({ intention: INTENTION, le: '2026-10-10' })
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    const vue = cloneDuDistant(file)
    const distant = join(vue, '2026-10-10', `${INTENTION}.yaml`)
    expect(readFileSync(distant, 'utf8')).toBe(readFileSync(local, 'utf8'))
    // Ce qui part : la mission seule (pas sa marque), des types, ni nom, ni identifiant de personne.
    expect(git(vue, 'ls-tree', '-r', '--name-only', 'HEAD')).toBe(`2026-10-10/${INTENTION}.yaml`)
    expect(readFileSync(distant, 'utf8')).not.toMatch(/Rosalie|Vernet|Octave|Brunel|A-\d/)
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(false)
    expect(rattraper(dossier).commande).toMatchObject({ par: { role: 'patron' } })
    expect(rattraper(dossier).commande?.chantier).toBeUndefined()
  })

  it('une file injoignable : le clic réussit, la mission est marquée, le rattrapage le dit et la marque reste ; la file revenue, il la pousse telle que le schéma la lit', () => {
    const { dossier, file } = clientLivre({ missions: '/nulle-part/missions.git' })
    expect(cliquerSeulement(dossier)).toEqual({ intention: INTENTION, le: '2026-10-10' })
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    expect(readFileSync(`${local}${SUFFIXE_A_POUSSER}`, 'utf8')).toBe('à pousser\n')
    expect(() => rattraper(dossier)).toThrow(/file injoignable|git clone/)
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(true)
    // Un commentaire ajouté à la main au fichier de la mission ne part pas : seul ce que le schéma lit part.
    appendFileSync(local, '# Rosalie a demandé\n')
    const l = lireLivraison(dossier)
    writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify({ ...l, missions: file }))
    expect(rattraper(dossier).r).toMatchObject({ poussees: 1, aPousser: 0 })
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(false)
    const distant = readFileSync(
      join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.yaml`),
      'utf8',
    )
    expect(distant).toMatch(new RegExp(`^id: ${INTENTION}$`, 'm'))
    expect(distant).not.toMatch(/Rosalie/)
  })

  it('une file déplacée (une autre adresse dans livraison.yaml) : le clone la suit, sans être effacé', () => {
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    expect(
      existsSync(join(lireLivraison(dossier)?.installation ?? '', DOSSIER_MISSIONS, '.git')),
    ).toBe(true)
    const deplacee = join(mkdtempSync(join(tmpdir(), 'deplacee-')), `missions-${SLUG}.git`)
    git(tmpdir(), 'clone', '-q', '--bare', file, deplacee)
    writeFileSync(
      join(dossier, FICHIER_LIVRAISON),
      stringify({ ...lireLivraison(dossier), missions: deplacee }),
    )
    // L'agence écrit désormais dans la nouvelle file : le client l'y lit.
    const agenceEcrit = cloneDuDistant(deplacee)
    git(agenceEcrit, 'config', 'user.email', 'a@exemple.invalid')
    git(agenceEcrit, 'config', 'user.name', 'a')
    ecrireStatut(join(agenceEcrit, '2026-10-10'), INTENTION, {
      statut: 'en cours',
      issue: 'chantier en cours',
      cout_usd: 0,
      le: '2026-10-10T16:00:00Z',
    })
    git(agenceEcrit, 'add', '-A')
    git(agenceEcrit, 'commit', '-q', '-m', 'en cours')
    git(agenceEcrit, 'push', '-q', 'origin', 'HEAD:main')
    expect(rattraper(dossier).commande?.chantier).toMatchObject({ issue: 'en cours' })
  })
})

describe('l’agence prend la mission (L1) et le client lit le statut (L7)', () => {
  it('pnpm agence --une-fois : `en cours` (la carte le dit pendant le chantier), puis fusionné et sa version ; une ligne par statut, une seule', async () => {
    const depots = creerDepots()
    const humain = etatHumain(depots.racine)
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const { binaire, appels } = binaireSimule({
      plan: PLAN,
      implementations: [{ ecrire: gesteVert() }],
    })
    // Pendant le chantier (au premier `pnpm install` de l'arbre), le client regarde sa carte.
    let pendant: ReturnType<typeof rattraper> | undefined
    const { commande: simulee } = commandeSimulee()
    const commande: Commande = (cwd, nom, args, env) => {
      if (!pendant && nom === 'pnpm' && args[0] === 'install') pendant = rattraper(dossier)
      return simulee(cwd, nom, args, env)
    }
    const t = await tour(depots.racine, agence(binaire, file), commande)
    expect(t.problemes).toEqual([])
    expect(t.prise).toEqual({
      mission: `${SLUG}/2026-10-10/${INTENTION}.yaml`,
      statut: 'fusionné',
      issue: 'fusionné',
    })
    expect(pendant?.commande?.chantier).toMatchObject({ issue: 'en cours' })
    expect(appels().map((a) => a.role)).toEqual(['plan', 'implementation', 'relecture'])

    // Dans la file : `en cours` puis le statut final et le dossier, poussés.
    const vue = cloneDuDistant(file)
    expect(git(vue, 'log', '--format=%s').split('\n')).toEqual([
      `Chantier ${INTENTION} : fusionné`,
      `Chantier ${INTENTION} : en cours`,
      `Mission ${INTENTION} (2026-10-10)`,
    ])
    expect(lireStatut(join(vue, '2026-10-10', `${INTENTION}.statut.yaml`))).toMatchObject({
      statut: 'fusionné',
      version: 'v2026-10-10-1',
    })
    // L'agence : la fusion sur le distant ; son arbre et son main n'ont pas bougé, ses files ne se voient pas.
    expect(git(depots.origine, 'tag', '--list', 'v*')).toBe('v2026-10-10-1')
    expect(etatHumain(depots.racine)).toEqual(humain)
    expect(existsSync(join(depots.racine, DOSSIER_FILES, SLUG, '.git'))).toBe(true)

    // Le client : une ligne par statut nouveau, jamais deux ; la carte dit la version. Le dossier
    // du chantier reste à l'agence : le client n'en reçoit aucun.
    const apres = rattraper(dossier, MAINTENANT.add({ hours: 2 }))
    expect(apres.r.nouveaux).toBe(1)
    expect(apres.chantiers.map((l) => l.issue)).toEqual(['en cours', 'fusionné'])
    expect(apres.commande?.chantier).toMatchObject({ issue: 'fusionné', version: 'v2026-10-10-1' })
    expect(rattraper(dossier).r.nouveaux).toBe(0)
    expect(rattraper(dossier).chantiers).toHaveLength(2)
    expect(existsSync(join(dossier, DOSSIER_CHANTIERS, `${INTENTION}.md`))).toBe(false)
    expect(
      readFileSync(
        join(
          depots.racine,
          DOSSIER_FILES,
          DOSSIER_CHANTIERS_AGENCE,
          SLUG,
          '2026-10-10',
          `${INTENTION}.chantier.md`,
        ),
        'utf8',
      ),
    ).toMatch(/Issue : \*\*fusionné\*\*/)

    // Un second tour : rien à prendre.
    expect((await tour(depots.racine, agence(binaire, file), simulee)).prise).toBeUndefined()
  })

  it('une mission mal formée est écartée et dite ; une mission d’un autre métier, écartée et son statut le dit ; rien ne se code', async () => {
    const depots = creerDepots()
    const { file } = clientLivre()
    const ecrire = cloneDuDistant(file)
    git(ecrire, 'config', 'user.email', 'c@exemple.invalid')
    git(ecrire, 'config', 'user.name', 'c')
    mkdirSync(join(ecrire, '2026-10-10'), { recursive: true })
    writeFileSync(join(ecrire, '2026-10-10', 'mauvaise.yaml'), 'id: mauvaise\ncommande: rm -rf /\n')
    const autre = {
      ...MISSION_ESSAI,
      id: 'autre_metier',
      intentions: ['autre_metier'],
      metier: 'agence-web',
    }
    writeFileSync(join(ecrire, '2026-10-10', 'autre_metier.yaml'), stringify(autre))
    git(ecrire, 'add', '-A')
    git(ecrire, 'commit', '-q', '-m', 'à la main')
    git(ecrire, 'push', '-q', 'origin', 'HEAD:main')
    const { binaire, appels } = binaireSimule({ plan: PLAN })
    const t = await tour(depots.racine, agence(binaire, file), commandeSimulee().commande)
    expect(t.problemes).toHaveLength(1)
    expect(t.problemes[0]).toMatch(/mauvaise\.yaml : mission invalide/)
    expect(t.ecartees).toEqual([`${SLUG}/2026-10-10/autre_metier.yaml`])
    expect(t.prise).toBeUndefined()
    expect(appels()).toEqual([])
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', 'autre_metier.statut.yaml')),
    ).toMatchObject({
      statut: 'écartée',
      issue: 'mission du métier agence-web, client du métier essai',
    })
  })

  it('la borne du jour se compte au registre de l’agence, jamais sur la file : un statut posé par le client ne la remplit pas ; atteinte, la mission attend, son statut le dit, une fois', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    // Le client pose lui-même un statut coûteux du jour dans sa file : il ne compte pas.
    const ecrire = cloneDuDistant(file)
    git(ecrire, 'config', 'user.email', 'c@exemple.invalid')
    git(ecrire, 'config', 'user.name', 'c')
    writeFileSync(
      join(ecrire, '2026-10-10', 'deja_fait.yaml'),
      stringify({ ...MISSION_ESSAI, id: 'deja_fait', intentions: ['deja_fait'] }),
    )
    const faux: Statut = {
      statut: 'refusé',
      issue: 'refusé',
      cout_usd: 9,
      le: '2026-10-10T09:00:00Z',
    }
    ecrireStatut(join(ecrire, '2026-10-10'), 'deja_fait', faux)
    git(ecrire, 'add', '-A')
    git(ecrire, 'commit', '-q', '-m', 'faux statut')
    git(ecrire, 'push', '-q', 'origin', 'HEAD:main')
    // Une question pour l'atelier : le chantier s'arrête au plan, vite.
    const atelier = binaireSimule({ plan: { faisable: false, raison: 'hors bande', plan: '-' } })
    const a = agence(atelier.binaire, file, { chantiers_max_par_jour: 1 })
    const pris = await tour(depots.racine, a, commandeSimulee().commande)
    expect(pris.attente).toBeUndefined()
    expect(pris.prise).toMatchObject({ statut: 'écartée' })
    // Le registre de l'agence dit un chantier aujourd'hui : la mission suivante attend.
    const vue = cloneDuDistant(file)
    git(vue, 'config', 'user.email', 'c@exemple.invalid')
    git(vue, 'config', 'user.name', 'c')
    writeFileSync(
      join(vue, '2026-10-10', 'suivante.yaml'),
      stringify({ ...MISSION_ESSAI, id: 'suivante', intentions: ['suivante'] }),
    )
    git(vue, 'add', '-A')
    git(vue, 'commit', '-q', '-m', 'suivante')
    git(vue, 'push', '-q', 'origin', 'HEAD:main')
    const { binaire, appels } = binaireSimule({ plan: PLAN })
    const b = agence(binaire, file, { chantiers_max_par_jour: 1 })
    const t = await tour(depots.racine, b, commandeSimulee().commande)
    expect(t.attente).toBe(`${SLUG}/2026-10-10/suivante.yaml`)
    expect(appels()).toEqual([])
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', 'suivante.statut.yaml'))?.statut,
    ).toBe('en attente')
    await tour(depots.racine, b, commandeSimulee().commande)
    expect(git(cloneDuDistant(file), 'log', '--format=%s').split('\n')[0]).toBe(
      'Chantier suivante : en attente',
    )
  })

  it('un préflight qui échoue (pas de clé de signature) : rien n’est écrit, la mission reste à prendre', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const { binaire } = binaireSimule({ plan: PLAN })
    await expect(
      tourAgence({
        racine: depots.racine,
        agence: agence(binaire, file),
        env: { PATH: process.env.PATH },
        maintenant: MAINTENANT,
        metier: async () => METIER_ESSAI as never,
        personnes: async () => PERSONNES_ESSAI,
        commande: commandeSimulee().commande,
      }),
    ).rejects.toThrow(/AGENCE_CLE_SIGNATURE absente/)
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))).toBe(
      false,
    )
  })
})

describe('non livré (L5) : les statuts à côté des missions, sans git', () => {
  it('le statut que `pnpm chantier` écrit dans missions/<date>/ donne sa ligne `chantier`, une fois', () => {
    const dossier = dossierEssai()
    const date = join(dossier, DOSSIER_MISSIONS, '2026-10-10')
    mkdirSync(date, { recursive: true })
    writeFileSync(join(date, 'simuler_absence.yaml'), stringify(MISSION_ESSAI))
    ecrireStatut(date, 'simuler_absence', {
      statut: 'refusé',
      issue: 'refusé : pnpm check rouge',
      cout_usd: 0.9,
      le: '2026-10-11T01:00:00Z',
    })
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      expect(rattraperStatuts(METIER_ESSAI, s, dossier, MAINTENANT)).toEqual({
        nouveaux: 1,
        poussees: 0,
        aPousser: 0,
        problemes: [],
      })
      expect(rattraperStatuts(METIER_ESSAI, s, dossier, MAINTENANT).nouveaux).toBe(0)
      const lignes = s.journal.lire().filter((l) => l.type === TYPE_CHANTIER)
      expect(lignes.map((l) => [l.objet, l.issue])).toEqual([['simuler_absence', 'refusé']])
      expect(s.journal.lire().some((l) => l.type === TYPE_GESTE_COMMANDE)).toBe(false)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })

  it('un statut mal formé est écarté et dit, jamais lu comme une instruction', () => {
    const dossier = dossierEssai()
    const date = join(dossier, DOSSIER_MISSIONS, '2026-10-10')
    mkdirSync(date, { recursive: true })
    writeFileSync(join(date, 'x.statut.yaml'), 'statut: fusionné\nexecuter: "curl …"\n')
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const r = rattraperStatuts(METIER_ESSAI, s, dossier, MAINTENANT)
      expect(r.nouveaux).toBe(0)
      expect(r.problemes[0]).toMatch(/statut invalide/)
    } finally {
      METIER_ESSAI.fermer(s)
    }
  })
})

describe('le verrou de pnpm agence (L1)', () => {
  it('un second verrou est refusé tant que le premier vit ; un verrou au pid mort est levé ; il ne se voit pas dans git status', () => {
    const { racine } = creerDepots()
    const humain = etatHumain(racine)
    const rendre = prendreVerrou(commandeSimulee().commande, racine)
    expect(() => prendreVerrou(commandeSimulee().commande, racine)).toThrow(/tourne déjà/)
    expect(etatHumain(racine)).toEqual(humain)
    rendre()
    writeFileSync(join(racine, DOSSIER_FILES, 'agence.lock'), '999999\n')
    expect(() => prendreVerrou(commandeSimulee().commande, racine)()).not.toThrow()
  })
})

describe('ce qui vient d’une file n’est jamais suivi ni cru (relecture du lot 3)', () => {
  /** Un clone de la file où l'on écrit à la main, comme un tiers qui y a accès. */
  const ecrivain = (file: string) => {
    const d = cloneDuDistant(file)
    git(d, 'config', 'user.email', 'tiers@exemple.invalid')
    git(d, 'config', 'user.name', 'tiers')
    return d
  }
  const pousserTout = (d: string, message: string) => {
    git(d, 'add', '-A')
    git(d, 'commit', '-q', '-m', message)
    git(d, 'push', '-q', 'origin', 'HEAD:main')
  }

  it('à l’agence : un lien posé à la place du dossier ou du statut n’écrit jamais hors de la file', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const victime = join(mkdtempSync(join(tmpdir(), 'victime-')), 'precieux.txt')
    writeFileSync(victime, 'à garder\n')
    const absent = join(mkdtempSync(join(tmpdir(), 'victime-')), 'cree-ailleurs.yaml')
    const d = ecrivain(file)
    symlinkSync(victime, join(d, '2026-10-10', `${INTENTION}.chantier.md`))
    symlinkSync(absent, join(d, '2026-10-10', `${INTENTION}.statut.yaml`))
    pousserTout(d, 'des liens')
    const { binaire } = binaireSimule({ plan: PLAN, implementations: [{ ecrire: gesteVert() }] })
    const t = await tour(depots.racine, agence(binaire, file), commandeSimulee().commande)
    expect(t.prise).toMatchObject({ statut: 'fusionné' })
    expect(readFileSync(victime, 'utf8')).toBe('à garder\n')
    expect(existsSync(absent)).toBe(false)
    const vue = cloneDuDistant(file)
    expect(lstatSync(join(vue, '2026-10-10', `${INTENTION}.statut.yaml`)).isFile()).toBe(true)
    expect(lireStatut(join(vue, '2026-10-10', `${INTENTION}.statut.yaml`))?.statut).toBe('fusionné')
  })

  it('chez le client : un dossier de chantier en lien n’est pas copié, un statut en lien est refusé, un dossier de date en lien est écarté', () => {
    const { dossier, file } = clientLivre()
    const secret = join(mkdtempSync(join(tmpdir(), 'secret-')), 'cle')
    writeFileSync(secret, 'CLÉ PRIVÉE\n')
    const d = ecrivain(file)
    mkdirSync(join(d, '2026-10-10'), { recursive: true })
    ecrireStatut(join(d, '2026-10-10'), 'simuler_absence', {
      statut: 'refusé',
      issue: 'refusé',
      cout_usd: 1,
      le: '2026-10-10T10:00:00Z',
    })
    symlinkSync(secret, join(d, '2026-10-10', 'simuler_absence.chantier.md'))
    symlinkSync(secret, join(d, '2026-10-10', 'autre.statut.yaml'))
    symlinkSync(mkdtempSync(join(tmpdir(), 'ailleurs-')), join(d, '2026-10-11'))
    pousserTout(d, 'des liens')
    const { r, chantiers } = rattraper(dossier)
    expect(chantiers.map((l) => [l.objet, l.issue])).toEqual([['simuler_absence', 'refusé']])
    expect(existsSync(join(dossier, DOSSIER_CHANTIERS, 'simuler_absence.md'))).toBe(false)
    expect(r.problemes.join('\n')).toMatch(/autre\.statut\.yaml : pas un fichier/)
    expect(r.problemes.join('\n')).toMatch(/2026-10-11 : pas un dossier/)
  })

  it('un push échoué après le commit : la mission est marquée, puis poussée au rattrapage (le clone en avance part)', () => {
    const { dossier, file } = clientLivre()
    rattraper(dossier)
    refuserPush(file)
    cliquer(dossier)
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(true)
    rmSync(join(file, 'hooks', 'pre-receive'))
    expect(rattraper(dossier).r).toMatchObject({ poussees: 1, aPousser: 0 })
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.yaml`))).toBe(true)
  })

  it('un livraison.yaml illisible : le clic aboutit, la mission est marquée, le rattrapage le dit ; la config corrigée, il la pousse', () => {
    const { dossier, file } = clientLivre()
    const l = lireLivraison(dossier)
    writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify({ ...l, inconnu: 1 }))
    expect(cliquerSeulement(dossier)).toEqual({ intention: INTENTION, le: '2026-10-10' })
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(true)
    expect(() => rattraper(dossier)).toThrow(/config invalide/)
    writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify(l))
    expect(rattraper(dossier).r).toMatchObject({ poussees: 1, aPousser: 0 })
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.yaml`))).toBe(true)
  })

  it('l’agence ne peut pas pousser ses statuts : le chantier se fait, rien ne s’efface, tout part au tour suivant ; la mission n’est pas reprise', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    // La file est lue d'abord : l'agence a son clone ; puis elle refuse tout push.
    const { binaire, appels } = binaireSimule({
      plan: PLAN,
      implementations: [{ ecrire: gesteVert() }],
    })
    const a = agence(binaire, file)
    const commande: Commande = (cwd, nom, args, env) => {
      if (nom === 'pnpm' && args[0] === 'install') refuserPush(file)
      return commandeSimulee().commande(cwd, nom, args, env)
    }
    const t = await tour(depots.racine, a, commande)
    expect(t.prise).toMatchObject({ statut: 'fusionné' })
    expect(t.problemes.join('\n')).toMatch(/fusionné non poussé/)
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))).toBe(
      true,
    )
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))?.statut,
    ).toBe('en cours')
    rmSync(join(file, 'hooks', 'pre-receive'))
    const encore = await tour(depots.racine, a, commandeSimulee().commande)
    expect(encore.prise).toBeUndefined()
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))?.statut,
    ).toBe('fusionné')
    expect(appels().filter((x) => x.role === 'plan')).toHaveLength(1)
  })

  it('une mission datée de demain est laissée et dite ; le client qui a eu le moins de chantiers passe d’abord', async () => {
    const depots = creerDepots()
    const premier = clientLivre()
    const second = clientLivre()
    // Deux missions dans la file du premier : une datée de demain, une d'hier ; une dans celle du second, d'aujourd'hui.
    const d1 = ecrivain(premier.file)
    for (const [date, id] of [
      ['2026-10-11', 'demain'],
      ['2026-10-09', 'hier'],
    ] as const) {
      mkdirSync(join(d1, date), { recursive: true })
      writeFileSync(
        join(d1, date, `${id}.yaml`),
        stringify({ ...MISSION_ESSAI, id, intentions: [id], date }),
      )
    }
    pousserTout(d1, 'missions')
    const d2 = ecrivain(second.file)
    mkdirSync(join(d2, '2026-10-10'), { recursive: true })
    writeFileSync(
      join(d2, '2026-10-10', 'aujourdhui.yaml'),
      stringify({ ...MISSION_ESSAI, id: 'aujourdhui', intentions: ['aujourdhui'] }),
    )
    pousserTout(d2, 'mission')
    // Le premier a déjà eu un chantier aujourd'hui.
    noterChantier(depots.racine, '2026-10-10', 'premier', 'avant')
    const atelier = binaireSimule({ plan: { faisable: false, raison: 'hors bande', plan: '-' } })
    const a = {
      ...agenceEssai(atelier.binaire),
      agence: {
        ...agenceEssai(atelier.binaire).agence,
        clients: [
          { slug: 'premier', metier: 'essai', missions: premier.file },
          { slug: 'second', metier: 'essai', missions: second.file },
        ],
      },
    }
    const t = await tour(depots.racine, a as never, commandeSimulee().commande)
    expect(t.prise?.mission).toBe('second/2026-10-10/aujourdhui.yaml')
    expect(t.problemes.join('\n')).toMatch(/premier\/2026-10-11\/demain\.yaml : datée de demain/)
  })
})

describe('les états à moitié faits et les données bornées (audit de la livraison, 2026-10-16)', () => {
  it('un statut écrit dans le clone de l’agence sans être commis (un arrêt avant le push, un --refaire dont la sortie est la file) : la file se tire encore, le statut part au tour suivant', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const atelier = binaireSimule({ plan: { faisable: false, raison: 'hors bande', plan: '-' } })
    const a = agence(atelier.binaire, file)
    expect((await tour(depots.racine, a, commandeSimulee().commande)).prise).toMatchObject({
      statut: 'écartée',
    })
    ecrireStatut(join(depots.racine, DOSSIER_FILES, SLUG, '2026-10-10'), INTENTION, {
      statut: 'échoué',
      issue: 'à trancher à la main',
      cout_usd: 0,
      le: '2026-10-10T15:30:00Z',
    })
    const t = await tour(depots.racine, a, commandeSimulee().commande)
    expect(t.problemes).toEqual([])
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))?.statut,
    ).toBe('échoué')
  })

  it('le statut « retiré » ne se perd pas si la file ne répond pas : écrit et commis dans le clone de l’agence, poussé au tour suivant', () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const client = { slug: SLUG, metier: 'essai', missions: file }
    const c = commandeSimulee().commande
    lireFile(c, depots.racine, client)
    const retire: Statut = {
      statut: 'retiré',
      issue: 'retiré : doublon',
      version: 'v2026-10-11-1',
      cout_usd: 0,
      le: '2026-10-11T09:00:00Z',
    }
    // La file ne répond plus (déplacée le temps du retrait), puis revient.
    renameSync(file, `${file}.ailleurs`)
    expect(statuerRetrait(c, depots.racine, [client], SLUG, INTENTION, retire).sorte).toBe(
      'en attente',
    )
    renameSync(`${file}.ailleurs`, file)
    expect(lireFile(c, depots.racine, client).problemes).toEqual([])
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`)),
    ).toMatchObject({ statut: 'retiré', version: 'v2026-10-11-1' })
  })

  it('ce qu’un statut ou une mission portent est borné : une version qui n’en est pas une, un métier qui n’est pas un nom, refusés et dits', () => {
    const dossier = dossierEssai()
    const date = join(dossier, DOSSIER_MISSIONS, '2026-10-10')
    mkdirSync(date, { recursive: true })
    writeFileSync(
      join(date, 'simuler_absence.statut.yaml'),
      stringify({
        statut: 'fusionné',
        issue: 'fusionné',
        version: '../../x',
        cout_usd: 0,
        le: '2026-10-10T10:00:00Z',
      }),
    )
    const s = METIER_ESSAI.ouvrir(dossier)
    try {
      const r = rattraperStatuts(METIER_ESSAI, s, dossier, MAINTENANT)
      expect(r.nouveaux).toBe(0)
      expect(r.problemes.join('\n')).toMatch(/statut invalide/)
    } finally {
      METIER_ESSAI.fermer(s)
    }
    expect(Mission.safeParse({ ...MISSION_ESSAI, metier: '../agence-web' }).success).toBe(false)
  })

  it('ce que le chantier écrit reste à l’agence : la sortie de pnpm check (le code du modèle a pu y imprimer un secret) ne part pas dans la file ; le statut n’y porte que le statut', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const { binaire } = binaireSimule({ plan: PLAN, implementations: [{ ecrire: gesteVert() }] })
    const { commande: simulee } = commandeSimulee()
    const fuyante: Commande = (cwd, nom, args, env) =>
      nom === 'pnpm' && args[0] === 'check'
        ? { code: 1, sortie: 'SECRET-123 imprimé par un test', erreur: '' }
        : simulee(cwd, nom, args, env)
    const t = await tour(depots.racine, agence(binaire, file), fuyante)
    expect(t.prise).toMatchObject({ statut: 'refusé' })
    const vue = cloneDuDistant(file)
    const fichiers = git(vue, 'ls-tree', '-r', '--name-only', 'HEAD').split('\n')
    for (const f of fichiers) expect(readFileSync(join(vue, f), 'utf8')).not.toMatch(/SECRET-123/)
    expect(git(vue, 'log', '--format=%B')).not.toMatch(/SECRET-123/)
    expect(lireStatut(join(vue, '2026-10-10', `${INTENTION}.statut.yaml`))).toMatchObject({
      statut: 'refusé',
      issue: ISSUE_PUBLIQUE,
    })
    // Le détail reste à l'agence, pour qui doit le lire.
    expect(
      readFileSync(
        join(
          depots.racine,
          DOSSIER_FILES,
          DOSSIER_CHANTIERS_AGENCE,
          SLUG,
          '2026-10-10',
          `${INTENTION}.chantier.md`,
        ),
        'utf8',
      ),
    ).toMatch(/SECRET-123/)
  })

  it('le texte du plan (un texte de modèle) ne part pas dans le statut ; l’agence le lit', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const atelier = binaireSimule({ plan: { faisable: false, raison: 'SECRET-456', plan: '-' } })
    const t = await tour(depots.racine, agence(atelier.binaire, file), commandeSimulee().commande)
    expect(t.prise).toMatchObject({ statut: 'écartée', issue: expect.stringMatching(/SECRET-456/) })
    expect(
      readFileSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`), 'utf8'),
    ).not.toMatch(/SECRET-456/)
  })

  it('origin injoignable quand l’agence prend une mission : rien n’est écrit, la borne n’est pas entamée, la mission est prise au tour suivant', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    const atelier = binaireSimule({ plan: { faisable: false, raison: 'hors bande', plan: '-' } })
    const a = agence(atelier.binaire, file)
    renameSync(depots.origine, `${depots.origine}.ailleurs`)
    await expect(tour(depots.racine, a, commandeSimulee().commande)).rejects.toThrow(/git fetch/)
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))).toBe(
      false,
    )
    expect(chantiersDuJour(depots.racine, '2026-10-10').total).toBe(0)
    renameSync(`${depots.origine}.ailleurs`, depots.origine)
    expect((await tour(depots.racine, a, commandeSimulee().commande)).prise).toMatchObject({
      statut: 'écartée',
    })
  })
})
