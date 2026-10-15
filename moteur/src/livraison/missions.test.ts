import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
  type Statut,
  TYPE_CHANTIER,
} from '../chantier/mission'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { TYPE_GESTE_COMMANDE } from '../gestes/commande'
import { FUSEAU, Temporal } from '../temps/temporal'
import { prendreVerrou, tourAgence } from './agence'
import { FICHIER_LIVRAISON, type Livraison, lireLivraison } from './config'
import {
  commanderEtLivrer,
  DOSSIER_CHANTIERS,
  DOSSIER_FILES,
  rattraperStatuts,
  SUFFIXE_A_POUSSER,
} from './missions'

// PLAN-LIVRAISON.md L1, L5 à L7 et la mesure du lot 3, avec deux dépôts nus
// pour de vrai (le produit, la file du client) et le binaire `claude`
// simulé : un clic pousse la mission ; `pnpm agence --une-fois` la prend,
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

/** Le patron clique « Créer ce geste ». */
function cliquer(dossier: string) {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return commanderEtLivrer(METIER_ESSAI, s, dossier, INTENTION, { role: 'patron' }, MAINTENANT)
  } finally {
    METIER_ESSAI.fermer(s)
  }
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

describe('l’aller : un clic pousse la mission (L6)', () => {
  it('la mission écrite chez le client, la ligne `geste commandé`, la même mission dans la file ; aucun nom', () => {
    const { dossier, file } = clientLivre()
    expect(cliquer(dossier)).toEqual({ intention: INTENTION, le: '2026-10-10' })
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    const distant = join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.yaml`)
    expect(readFileSync(distant, 'utf8')).toBe(readFileSync(local, 'utf8'))
    // Ce qui part : des types, ni nom, ni identifiant de personne (fuite 0, mesure du lot 3).
    expect(readFileSync(distant, 'utf8')).not.toMatch(/Rosalie|Vernet|Octave|Brunel|A-\d/)
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(false)
    expect(rattraper(dossier).commande).toMatchObject({ par: { role: 'patron' } })
    expect(rattraper(dossier).commande?.chantier).toBeUndefined()
  })

  it('une file injoignable au clic : le clic réussit, la mission est marquée, le rattrapage suivant la pousse', () => {
    const { dossier, file } = clientLivre({ missions: '/nulle-part/missions.git' })
    expect(cliquer(dossier)).toEqual({ intention: INTENTION, le: '2026-10-10' })
    const local = join(dossier, DOSSIER_MISSIONS, '2026-10-10', `${INTENTION}.yaml`)
    expect(readFileSync(`${local}${SUFFIXE_A_POUSSER}`, 'utf8')).toMatch(/git/)
    const l = lireLivraison(dossier)
    writeFileSync(join(dossier, FICHIER_LIVRAISON), stringify({ ...l, missions: file }))
    // Le clone de la file pointe encore sur l'ancienne adresse : il se refait.
    spawnSync('rm', ['-rf', join(l?.installation ?? '', 'missions')])
    expect(rattraper(dossier).r).toMatchObject({ poussees: 1, aPousser: 0 })
    expect(existsSync(`${local}${SUFFIXE_A_POUSSER}`)).toBe(false)
    expect(existsSync(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.yaml`))).toBe(true)
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

    // Le client : une ligne par statut nouveau, jamais deux ; le dossier copié ; la carte dit la version.
    const apres = rattraper(dossier, MAINTENANT.add({ hours: 2 }))
    expect(apres.r.nouveaux).toBe(1)
    expect(apres.chantiers.map((l) => l.issue)).toEqual(['en cours', 'fusionné'])
    expect(apres.commande?.chantier).toMatchObject({ issue: 'fusionné', version: 'v2026-10-10-1' })
    expect(rattraper(dossier).r.nouveaux).toBe(0)
    expect(rattraper(dossier).chantiers).toHaveLength(2)
    expect(readFileSync(join(dossier, DOSSIER_CHANTIERS, `${INTENTION}.md`), 'utf8')).toMatch(
      /Issue : \*\*fusionné\*\*/,
    )

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

  it('la borne du jour atteinte : la mission attend le lendemain, son statut le dit, une fois ; aucun appel', async () => {
    const depots = creerDepots()
    const { dossier, file } = clientLivre()
    cliquer(dossier)
    // Un chantier déjà fait ce jour, qui a coûté un appel.
    const ecrire = cloneDuDistant(file)
    git(ecrire, 'config', 'user.email', 'c@exemple.invalid')
    git(ecrire, 'config', 'user.name', 'c')
    writeFileSync(
      join(ecrire, '2026-10-10', 'deja_fait.yaml'),
      stringify({ ...MISSION_ESSAI, id: 'deja_fait', intentions: ['deja_fait'] }),
    )
    const fait: Statut = {
      statut: 'refusé',
      issue: 'refusé',
      cout_usd: 1.2,
      le: '2026-10-10T09:00:00Z',
    }
    ecrireStatut(join(ecrire, '2026-10-10'), 'deja_fait', fait)
    git(ecrire, 'add', '-A')
    git(ecrire, 'commit', '-q', '-m', 'hier')
    git(ecrire, 'push', '-q', 'origin', 'HEAD:main')
    const { binaire, appels } = binaireSimule({ plan: PLAN })
    const a = agence(binaire, file, { chantiers_max_par_jour: 1 })
    const t = await tour(depots.racine, a, commandeSimulee().commande)
    expect(t.attente).toBe(`${SLUG}/2026-10-10/${INTENTION}.yaml`)
    expect(appels()).toEqual([])
    expect(
      lireStatut(join(cloneDuDistant(file), '2026-10-10', `${INTENTION}.statut.yaml`))?.statut,
    ).toBe('en attente')
    await tour(depots.racine, a, commandeSimulee().commande)
    expect(git(cloneDuDistant(file), 'log', '--format=%s').split('\n')[0]).toBe(
      `Chantier ${INTENTION} : en attente`,
    )
    expect(git(cloneDuDistant(file), 'log', '--format=%s').split('\n')).toHaveLength(3)
    expect(rattraper(dossier).commande?.chantier).toMatchObject({ issue: 'en attente' })
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
