import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { chargerAgence } from '../agence/config'
import { CLIENTS_FICTIFS, personnesFictives, RACINE_DEPOT } from '../agence/fictif'
import { ajouterConvention, ecrireRetrait, lireIndex } from '../chantier/memoire'
import { fuites } from '../echappee/pseudonymes'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  DOMAINE_ESSAI,
  dossierEssai,
  METIER_ESSAI,
  PERSONNES_ESSAI,
  SECRETS_ESSAI,
} from './essai.test.fixture'
import type { MissionRonde, RapportDeRonde } from './rapport'
import {
  type AppelRonde,
  FICHIER_CARTE,
  faireRonde,
  ISSUES_RONDE,
  type OptionsRonde,
  systemeRonde,
  TYPE_RONDE,
} from './ronde'

// PLAN-RONDE.md § 5.3, avec un appel simulé : un rapport valide écrit les
// fichiers, les missions et la ligne au journal (des comptes) ; une relance
// sur un échec de forme, pas deux ; un rapport refusé ; l'idempotence ;
// --sans-modele n'appelle rien ; rien de ce qui part ne porte un nom.

const AGENCE = chargerAgence(RACINE_DEPOT)
const DATE = Temporal.PlainDate.from('2026-10-10')

/** Une racine de dépôt d'essai : la carte, et une mémoire vide. */
function racine(): string {
  const r = mkdtempSync(join(tmpdir(), 'depot-'))
  mkdirSync(join(r, 'methode'), { recursive: true })
  copyFileSync(join(RACINE_DEPOT, FICHIER_CARTE), join(r, FICHIER_CARTE))
  return r
}

const MISSION: MissionRonde = {
  id: 'simuler_absence',
  sorte: 'geste_code',
  titre: 'Coder la simulation d’absence',
  pourquoi: 'deux échappées le même jour',
  echappees: ['E-20261010T0900-0005', 'E-20261010T1000-0006'],
  intentions: ['simuler_absence'],
  consignes_types: ['et si <agent> était absent du <du> au <au>, qui reprendrait ?'],
  ecrit: false,
  estimation: 'moyenne',
}
const RAPPORT: RapportDeRonde = {
  observations: ['deux simulations d’absence'],
  missions: [MISSION],
  rien_a_signaler: false,
}

/** Un appel simulé : rend les sorties dans l'ordre, garde ce qu'il a reçu. */
function simule(
  ...sorties: unknown[]
): AppelRonde & { recus: { systeme: string; message: string }[] } {
  const recus: { systeme: string; message: string }[] = []
  const appel = async (systeme: string, message: string) => {
    recus.push({ systeme, message })
    const sortie = sorties[recus.length - 1]
    return sortie === undefined
      ? { ok: false, raison: 'sortie structurée absente', cout_usd: 0.01, estime: true }
      : { ok: true, sortie, cout_usd: 0.05, estime: true }
  }
  return Object.assign(appel, { recus })
}

const options = (x: Partial<OptionsRonde> = {}): OptionsRonde => ({
  racine: racine(),
  dossierClient: dossierEssai(),
  date: DATE,
  agence: AGENCE,
  env: {},
  maintenant: Temporal.ZonedDateTime.from({
    year: 2026,
    month: 10,
    day: 11,
    hour: 3,
    timeZone: FUSEAU,
  }),
  ...x,
})

const lignesRonde = (dossier: string) => {
  const s = METIER_ESSAI.ouvrir(dossier)
  try {
    return s.journal.lire().filter((l) => l.type === TYPE_RONDE)
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

describe('une ronde échouée', () => {
  it('n’est pas « déjà faite » : relancée, elle se refait', async () => {
    const o = options({ appel: simule() })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r).toMatchObject({ sorte: 'faite', issue: ISSUES_RONDE.echouee })
    const encore = await faireRonde(METIER_ESSAI, { ...o, appel: simule(RAPPORT) })
    expect(encore).toMatchObject({ sorte: 'faite', issue: ISSUES_RONDE.faite })
    expect((await faireRonde(METIER_ESSAI, o)).sorte).toBe('deja_faite')
  })
})

describe('faireRonde', () => {
  it('un rapport valide : le .md, le .json, une mission par fichier, la ligne au journal, la mémoire', async () => {
    const appel = simule(RAPPORT)
    const o = options({ appel })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r).toMatchObject({
      sorte: 'faite',
      issue: ISSUES_RONDE.faite,
      cout_usd: 0.05,
      estime: true,
      fuite: [],
    })
    const dossier = join(o.dossierClient, 'rondes')
    expect(existsSync(join(dossier, '2026-10-10.md'))).toBe(true)
    expect(existsSync(join(dossier, '2026-10-10.json'))).toBe(true)
    const mission = parse(readFileSync(join(dossier, '2026-10-10', 'simuler_absence.yaml'), 'utf8'))
    expect(mission).toMatchObject({ id: 'simuler_absence', date: '2026-10-10', statut: 'à faire' })

    const [ligne] = lignesRonde(o.dossierClient)
    expect(ligne?.objet).toBe('2026-10-10')
    expect(ligne?.issue).toBe(ISSUES_RONDE.faite)
    expect(ligne?.motif).toBeNull()
    expect(JSON.parse(ligne?.donnees ?? '{}')).toEqual({
      fenetre: { du: '2026-10-10', au: '2026-10-10' },
      conversations: 7,
      demandes: 6,
      missions: { proposees: 1, retenues: 1, ecartees: 0 },
      cout_usd: 0.05,
      cout_estime: true,
      fuite: 0,
    })
    expect(lireIndex(o.racine)).toMatchObject([
      { sorte: 'ronde', id: '2026-10-10', issue: 'faite' },
    ])
    const souvenir = readdirSync(join(o.racine, 'memoire', 'rondes'))
    expect(souvenir).toEqual(['2026-10-10-client-essai.md'])
  })

  it('une mission retirée n’est plus parmi les missions ouvertes : la ronde ne la lit qu’une fois, parmi les retirées (G2)', async () => {
    const o = options({ appel: simule(RAPPORT) })
    const d = join(o.dossierClient, 'rondes', '2026-10-09')
    mkdirSync(d, { recursive: true })
    writeFileSync(
      join(d, 'etat_des_heures.yaml'),
      stringify({
        ...MISSION,
        id: 'etat_des_heures',
        intentions: ['heures_par_agent'],
        date: '2026-10-09',
        metier: 'essai',
        statut: 'à faire',
      }),
    )
    ecrireRetrait(
      o.racine,
      {
        date: '2026-10-09',
        client: 'client essai',
        id: 'autre_nom',
        titre: 't',
        intentions: ['heures_par_agent'],
        motif: 'm',
      },
      PERSONNES_ESSAI,
    )
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r.sorte === 'faite' && r.catalogue.missions_ouvertes.map((x) => x.id)).toEqual([])
    expect(r.sorte === 'faite' && r.message).toContain('autre_nom')
  })

  it('ce qui part : ni nom, ni résultat, ni texte montré, ni instantané ; la carte et le catalogue y sont', async () => {
    const appel = simule(RAPPORT)
    await faireRonde(METIER_ESSAI, options({ appel }))
    const [{ systeme, message } = { systeme: '', message: '' }] = appel.recus
    const tout = `${systeme}\n${message}`
    expect(fuites(tout, PERSONNES_ESSAI)).toEqual([])
    // Ni un nom d'un client fictif du dépôt (PLAN-METIER-2.md M9).
    for (const client of CLIENTS_FICTIFS) {
      expect(fuites(tout, await personnesFictives(client))).toEqual([])
    }
    for (const secret of Object.values(SECRETS_ESSAI)) expect(tout).not.toContain(secret)
    expect(tout).not.toContain('client essai')
    expect(systeme).toContain("Ce qu'un modèle ne fait jamais")
    expect(systeme).toContain('`simuler_absence`')
    expect(message).toContain('<donnees>')
  })

  it('le système dit le cadre et les places du métier, et la carte ne dit plus la sécurité (PLAN-METIER-2.md M7)', () => {
    const carte = readFileSync(join(RACINE_DEPOT, FICHIER_CARTE), 'utf8')
    const vide = { gestes: [], appris: [], intentions: [], missions_ouvertes: [] }
    const securite = systemeRonde(carte, vide, 3, DOMAINE_ESSAI)
    expect(securite).toContain(
      "Tu fais la ronde de nuit de l'outil de planning d'une entreprise de sécurité privée.",
    )
    expect(securite).toContain(
      'places entre chevrons (<agent>, <du>, <au>, <site>, <vacation>) : jamais un identifiant ni un nom.',
    )
    const agence = systemeRonde(carte, vide, 3, {
      ...DOMAINE_ESSAI,
      cadre: "l'outil de gestion d'une agence web",
      places: ['<personne>', '<projet>', '<du>', '<au>'],
    })
    expect(agence).toContain("Tu fais la ronde de nuit de l'outil de gestion d'une agence web.")
    expect(agence).toContain('places entre chevrons (<personne>, <projet>, <du>, <au>)')
    expect(agence).not.toMatch(/sécurité|vacation|A-7/)
  })

  it('un échec de forme : une relance, pas deux ; puis « ronde échouée », sans mission', async () => {
    const appel = simule({ pas: 'le schéma' }, { toujours: 'pas' })
    const o = options({ appel })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(appel.recus).toHaveLength(2)
    expect(appel.recus[1]?.message).toMatch(/n'a pas été acceptée/)
    expect(r).toMatchObject({
      sorte: 'faite',
      issue: ISSUES_RONDE.echouee,
      missions: [],
      cout_usd: 0.1,
    })
    expect(existsSync(join(o.dossierClient, 'rondes', '2026-10-10'))).toBe(false)
  })

  it('la relance qui réussit : le rapport est pris', async () => {
    const appel = simule({ pas: 'le schéma' }, RAPPORT)
    const r = await faireRonde(METIER_ESSAI, options({ appel }))
    expect(r).toMatchObject({ issue: ISSUES_RONDE.faite })
  })

  it('un rapport refusé (échappée hors fenêtre) : écrit quand même, aucune mission', async () => {
    const faux = { ...RAPPORT, missions: [{ ...MISSION, echappees: ['E-20261009T0900-0001'] }] }
    const o = options({ appel: simule(faux) })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r).toMatchObject({ issue: ISSUES_RONDE.refusee, missions: [] })
    expect(r.sorte === 'faite' && r.ecarts?.[0]).toMatch(/pas dans la fenêtre/)
    expect(readFileSync(join(o.dossierClient, 'rondes', '2026-10-10.md'), 'utf8')).toContain(
      'rapport refusé',
    )
  })

  it('idempotente : relancée, rien ; --refaire refait', async () => {
    const o = options({ appel: simule(RAPPORT, RAPPORT) })
    await faireRonde(METIER_ESSAI, o)
    expect(await faireRonde(METIER_ESSAI, o)).toMatchObject({ sorte: 'deja_faite' })
    expect(lignesRonde(o.dossierClient)).toHaveLength(1)
    const refaite = await faireRonde(METIER_ESSAI, { ...o, refaire: true })
    // La mission de la première passe a été effacée : elle n'est pas « déjà ouverte ».
    expect(refaite).toMatchObject({ sorte: 'faite', missions: [{ statut: 'à faire' }] })
    expect(lignesRonde(o.dossierClient)).toHaveLength(2)
  })

  it('une mission déjà ouverte le jour d’avant : écartée le lendemain', async () => {
    const o = options({ appel: simule(RAPPORT) })
    await faireRonde(METIER_ESSAI, o)
    const lendemain = await faireRonde(METIER_ESSAI, {
      ...o,
      date: Temporal.PlainDate.from('2026-10-11'),
      depuis: DATE,
      appel: simule(RAPPORT),
    })
    expect(lendemain).toMatchObject({ missions: [{ statut: 'écartée' }] })
    // Sous un autre nom, mêmes intentions : écartée aussi.
    const autreNom = { ...RAPPORT, missions: [{ ...MISSION, id: 'absence_simulee' }] }
    const surlendemain = await faireRonde(METIER_ESSAI, {
      ...o,
      date: Temporal.PlainDate.from('2026-10-11'),
      depuis: DATE,
      refaire: true,
      appel: simule(autreNom),
    })
    expect(surlendemain).toMatchObject({ missions: [{ statut: 'écartée' }] })
  })

  it('--sans-modele : le résumé dans le .md, aucun appel, aucune ligne', async () => {
    const appel = simule(RAPPORT)
    const o = options({ appel, sansModele: true })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r.sorte).toBe('sans_modele')
    expect(appel.recus).toHaveLength(0)
    expect(lignesRonde(o.dossierClient)).toHaveLength(0)
    const md = readFileSync(join(o.dossierClient, 'rondes', '2026-10-10.md'), 'utf8')
    expect(md).toContain('Aucun appel')
    expect(md).toContain('Et si A-1 était absent')
    expect(fuites(md, PERSONNES_ESSAI)).toEqual([])
  })

  it('sans mémoire (les évals) : memoire/ ni écrite ni lue', async () => {
    const o = options({ appel: simule(RAPPORT), memoire: false })
    await faireRonde(METIER_ESSAI, o)
    expect(existsSync(join(o.racine, 'memoire'))).toBe(false)
    // Une mémoire existante (une ronde du 9 avec une convention) n'est pas lue.
    const avec = options({ appel: simule(RAPPORT) })
    await faireRonde(METIER_ESSAI, { ...avec, date: Temporal.PlainDate.from('2026-10-09') })
    ajouterConvention(avec.racine, 'une convention du dépôt', PERSONNES_ESSAI)
    const appel = simule(RAPPORT)
    await faireRonde(METIER_ESSAI, { ...avec, appel, memoire: false })
    expect(appel.recus[0]?.message).not.toContain('une convention du dépôt')
    expect(appel.recus[0]?.message).not.toContain('Ronde du 2026-10-09')
    const lue = simule(RAPPORT)
    await faireRonde(METIER_ESSAI, { ...avec, appel: lue, refaire: true })
    expect(lue.recus[0]?.message).toContain('une convention du dépôt')
    expect(lue.recus[0]?.message).toContain('Ronde du 2026-10-09')
  })

  it('acces: claude avec ANTHROPIC_API_KEY : refus avant tout appel', async () => {
    const o = options({ env: { ANTHROPIC_API_KEY: 'k' } })
    const r = await faireRonde(METIER_ESSAI, o)
    expect(r).toMatchObject({ issue: ISSUES_RONDE.echouee })
    expect(r.sorte === 'faite' && r.raison).toMatch(/ANTHROPIC_API_KEY/)
  })
})
