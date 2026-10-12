import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import type { Action } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import type { MetierConversation } from '../conversation/conversation'
import type { TableCopie } from '../echappee/copie'
import { ecrireInstantane } from '../echappee/echappee'
import { chargerGestesAppris, ISSUE_GESTE, TYPE_GESTE_APPRIS } from '../gestes/charger'
import { DOSSIER_GESTES, empreinteGeste, type FichierGeste } from '../gestes/geste-appris'
import {
  DECLARATIONS_EXEMPLE,
  DOMAINE_EXEMPLE,
  GESTE_EXEMPLE as GESTE,
  OPERATION_EXEMPLE,
  TYPES_EXEMPLE,
} from '../gestes/geste-appris.exemple'
import { Journal } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  activerGeste,
  ErreurAtelier,
  journaliserVerification,
  listerGestes,
  motifNonActivable,
  retirerGeste,
  trouverGeste,
  verifierGesteAppris,
} from './atelier'

// L'atelier et le patron devant un geste appris (PLAN-PROMOTION.md § 7.1) :
// lister dit ce que le journal sait et si le geste est activable ; activer
// exige une ligne « vérifié » sans écart, avec modèle, sur l'empreinte exacte,
// et pose la clé que le chargement exige (P7) ; retirer la retire ; vérifier
// rejoue les tests et écrit « vérifié ».

const CLIENT = 'fictif'
const FICHIER = 'heures_par_agent.yaml'
const MAINTENANT = Temporal.PlainDateTime.from('2026-10-11T09:30').toZonedDateTime(FUSEAU)
const HORODATAGE = MAINTENANT.toInstant().toString()
const JETON = empreinteGeste(GESTE)
const propose: FichierGeste = { ...GESTE, statut: 'propose' }
const bilanOk = { ok: 58, total: 60, taux: 58 / 60, coutUsd: 0.12, stricts: [], appels: 61 }
const bilanBas = { ...bilanOk, ok: 50, taux: 50 / 60 }

const AGENTS: TableCopie = {
  nom: 'agents',
  description: 'les agents',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    { nom: 'nom', type: 'TEXT', description: 'prénom et nom' },
  ],
  lignes: [
    { id: 'A-1', nom: 'Karim Haddad' },
    { id: 'A-2', nom: 'Julien Lefèvre' },
  ],
}
const VACATIONS: TableCopie = {
  nom: 'vacations',
  description: 'les vacations',
  colonnes: [
    { nom: 'agent', type: 'TEXT', description: "l'agent (agents.id)" },
    { nom: 'jour', type: 'TEXT', description: 'le jour, AAAA-MM-JJ' },
    { nom: 'heures', type: 'REAL', description: 'durée' },
  ],
  lignes: [
    { agent: 'A-2', jour: '2026-10-07', heures: 12 },
    { agent: 'A-2', jour: '2026-10-08', heures: 4 },
  ],
}
const CONFIG: ConfigConversation = {
  modele: {
    fournisseur: 'anthropic',
    id: 'simulé',
    prix_par_million_usd: { entree: 1, sortie: 1, cache_ecrit: 0, cache_lu: 0 },
    effort: { traduire: 'low', echappee: 'medium' },
  },
  plafonds: { par_demande: { tours: 12, tokens_sortie: 6000, secondes: 120 }, par_mois_usd: 30 },
  promotion: { occurrences: 3, jours: 30, conservation_jours: 90 },
}
const VOIR_PLANNING: Action<Session, unknown> = {
  id: 'voir_planning',
  description: 'le planning d’un agent ou de tous',
  parametres: { safeParse: () => ({ success: true, data: {} }) } as never,
  roles: ['patron'],
  ecrit: false,
  reformuler: () => '',
  executer: () => ({ texte: '' }),
}

interface Session {
  dossier: string
  journal: Journal
}

const PERSONNES = AGENTS.lignes.map((a) => ({
  id: String(a.id),
  nom: String(a.nom),
  sorte: 'personne' as const,
}))

const METIER: MetierConversation<Session> = {
  ouvrir: (dossier) => ({ dossier, journal: new Journal(join(dossier, 'journal.sqlite')) }),
  fermer: (s) => s.journal.fermer(),
  config: () => CONFIG,
  client: () => CLIENT,
  journal: (s) => s.journal,
  ouvrirJournal: (dossier) => ({
    client: CLIENT,
    journal: new Journal(join(dossier, 'journal.sqlite')),
    config: CONFIG,
  }),
  actions: [VOIR_PLANNING],
  intentions: [],
  copie: () => [AGENTS, VACATIONS],
  roles: [
    {
      id: 'patron',
      enMots: 'le patron',
      identifie: false,
      capacites: ['voit_tout', 'designe_autrui', 'propose', 'ecrit', 'valide', 'administre'],
    },
    { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
  ],
  typesParametre: TYPES_EXEMPLE,
  operation: OPERATION_EXEMPLE,
  domaine: DOMAINE_EXEMPLE,
  vocabulaire: () => ({ noms: PERSONNES }),
  noms: () => PERSONNES,
  verifierIdentite: () => undefined,
}

/** Un dossier avec des fichiers de gestes (YAML lit le JSON) et les instantanés du geste de référence. */
function dossierAvec(...fichiers: [string, unknown][]): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'atelier-'))
  mkdirSync(join(dossier, DOSSIER_GESTES))
  for (const [nom, contenu] of fichiers) {
    writeFileSync(
      join(dossier, DOSSIER_GESTES, nom),
      typeof contenu === 'string' ? contenu : JSON.stringify(contenu),
    )
  }
  for (const id of ['E-1', 'E-2', 'E-3']) {
    ecrireInstantane(dossier, {
      echappee: id,
      horodatage: '2026-10-10T19:40:00Z',
      role: 'patron',
      tables: [AGENTS, VACATIONS],
    })
  }
  return METIER.ouvrir(dossier)
}
const verifie = (s: Session, bilan?: typeof bilanOk, geste = GESTE, ecarts: string[] = []) =>
  journaliserVerification(
    s.journal,
    CLIENT,
    geste,
    ecarts,
    HORODATAGE,
    bilan ? { bilan, modele: 'simulé' } : undefined,
  )
const lireFichier = (s: Session, nom = FICHIER) =>
  parse(readFileSync(join(s.dossier, DOSSIER_GESTES, nom), 'utf8')) as FichierGeste
const lignes = (s: Session, issue: string) =>
  s.journal.lire().filter((l) => l.type === TYPE_GESTE_APPRIS && l.issue === issue)
const donnees = (l: { donnees: string | null } | undefined) =>
  JSON.parse(l?.donnees ?? '{}') as Record<string, unknown>

describe('listerGestes et motifNonActivable', () => {
  it('jamais vérifié → non activable ; vérifié sans modèle → la passe manque ; avec modèle sous le seuil → le taux ; au seuil → activable', () => {
    const s = dossierAvec([FICHIER, propose])
    expect(listerGestes(s.dossier, s.journal)).toEqual([
      {
        fichier: FICHIER,
        id: GESTE.id,
        description: GESTE.description,
        statut: 'propose',
        fabriqueLe: '2026-10-10',
        tests: 3,
        jeton: JETON,
        activable: false,
        motif: 'jamais vérifié',
      },
    ])
    verifie(s)
    expect(motifNonActivable(s.journal, GESTE.id, JETON).motif).toBe(
      'vérifié sans modèle : la passe de traduction manque',
    )
    verifie(s, bilanBas)
    expect(motifNonActivable(s.journal, GESTE.id, JETON).motif).toBe(
      'la traduction n’atteint pas son seuil (83 % pour 95 %)',
    )
    verifie(s, bilanOk)
    const [g] = listerGestes(s.dossier, s.journal)
    expect(g).toMatchObject({
      activable: true,
      verification: {
        horodatage: HORODATAGE,
        jeton: JETON,
        ecarts: [],
        traduction: { taux: 58 / 60, atteint: true, cout_usd: 0.12 },
      },
    })
    expect(g?.motif).toBeUndefined()
    // Une vérification en code faite après, sans écart, ne périme pas la passe : même contenu.
    verifie(s)
    expect(listerGestes(s.dossier, s.journal)[0]).toMatchObject({
      activable: true,
      verification: { traduction: { atteint: true } },
    })
    METIER.fermer(s)
  })
  it('une vérification avec écarts, ou sur une autre empreinte, ne rend pas activable ; la dernière de cette empreinte compte', () => {
    const s = dossierAvec([FICHIER, propose])
    verifie(s, bilanOk, GESTE, ['E-1 : le rejeu ne contient pas « 16 »'])
    expect(motifNonActivable(s.journal, GESTE.id, JETON).motif).toBe(
      'la dernière vérification a 1 écart(s)',
    )
    verifie(s, bilanOk)
    verifie(s, bilanOk, { ...GESTE, description: 'autre' })
    expect(motifNonActivable(s.journal, GESTE.id, JETON).motif).toBeUndefined()
    const modifie = { ...GESTE, description: 'les heures, modifiées à la main' }
    expect(motifNonActivable(s.journal, GESTE.id, empreinteGeste(modifie)).motif).toBe(
      'le fichier a changé depuis la dernière vérification',
    )
    METIER.fermer(s)
  })
  it('un fichier actif ou retiré n’est pas activable ; un fichier illisible est rendu avec son erreur', () => {
    const s = dossierAvec(
      [
        'a.yaml',
        { ...GESTE, statut: 'actif', validation: { par: 'x', le: '2026-10-10', jeton: JETON } },
      ],
      ['b.yaml', { ...GESTE, statut: 'retire' }],
      ['c.yaml', '{ pas: [du yaml'],
    )
    verifie(s, bilanOk)
    const liste = listerGestes(s.dossier, s.journal)
    expect(liste.map((g) => [g.fichier, g.activable, g.motif])).toEqual([
      ['a.yaml', false, 'actif'],
      ['b.yaml', false, 'retiré'],
      ['c.yaml', false, undefined],
    ])
    expect(liste[0]?.validation).toEqual({ par: 'x', le: '2026-10-10' })
    expect(liste[2]?.erreur).toMatch(/^YAML illisible/)
    METIER.fermer(s)
  })
  it('un second fichier proposé pour un identifiant déjà actif n’est pas activable', () => {
    const s = dossierAvec(
      [FICHIER, { ...GESTE, statut: 'actif' }],
      ['heures_par_agent-2026-10-11.yaml', { ...propose, description: 'les heures, autrement' }],
    )
    verifie(s, bilanOk, { ...GESTE, description: 'les heures, autrement' })
    expect(listerGestes(s.dossier, s.journal)[0]?.motif).toBe(
      `${FICHIER} est déjà actif pour cet identifiant`,
    )
    METIER.fermer(s)
  })
})

describe('trouverGeste', () => {
  it('par identifiant ou par nom de fichier ; aucun, plusieurs, illisible → refus', () => {
    const s = dossierAvec(
      [FICHIER, propose],
      ['heures_par_agent-2026-10-11.yaml', propose],
      ['vide.yaml', '{ pas: [du yaml'],
    )
    expect(trouverGeste(s.dossier, FICHIER).contenu.id).toBe(GESTE.id)
    expect(() => trouverGeste(s.dossier, GESTE.id)).toThrow(
      /plusieurs fichiers .* nommer le fichier/,
    )
    expect(() => trouverGeste(s.dossier, 'compter_vacations')).toThrow(ErreurAtelier)
    expect(() => trouverGeste(s.dossier, 'vide.yaml')).toThrow(/YAML illisible/)
    METIER.fermer(s)
  })
})

describe('activerGeste', () => {
  it('vérifié sans écart avec modèle : statut actif et validation dans le YAML, la ligne activé au journal, et le chargement le prend', () => {
    const s = dossierAvec([FICHIER, propose])
    verifie(s, bilanOk)
    expect(activerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'Lionel', MAINTENANT)).toEqual({
      fichier: join(DOSSIER_GESTES, FICHIER),
      jeton: JETON,
    })
    const fichier = lireFichier(s)
    expect(fichier.statut).toBe('actif')
    expect(fichier.validation).toEqual({ par: 'Lionel', le: '2026-10-11', jeton: JETON })
    const [ligne] = lignes(s, ISSUE_GESTE.active)
    expect(ligne).toMatchObject({
      objet: GESTE.id,
      motif: GESTE.description,
      horodatage: HORODATAGE,
    })
    expect(donnees(ligne)).toEqual({
      jeton: JETON,
      par: 'Lionel',
      fichier: join(DOSSIER_GESTES, FICHIER),
    })
    const { actifs, ecartes } = chargerGestesAppris(s.dossier, {
      client: CLIENT,
      journal: s.journal,
      declarations: DECLARATIONS_EXEMPLE,
    })
    expect(ecartes).toEqual([])
    expect(actifs.map((g) => g.id)).toEqual([GESTE.id])
    expect(listerGestes(s.dossier, s.journal)[0]).toMatchObject({
      statut: 'actif',
      activable: false,
      validation: { par: 'Lionel', le: '2026-10-11' },
    })
    METIER.fermer(s)
  })
  it('refuse : jamais vérifié, vérifié sans modèle, avec écarts, déjà actif, retiré, un autre fichier actif, sans nom', () => {
    const s = dossierAvec([FICHIER, propose])
    const activer = (cible = GESTE.id, par = 'Lionel') =>
      activerGeste(s.dossier, s.journal, CLIENT, cible, par, MAINTENANT)
    expect(() => activer()).toThrow(`${FICHIER} : jamais vérifié`)
    verifie(s)
    expect(() => activer()).toThrow('la passe de traduction manque')
    verifie(s, bilanOk, GESTE, ['un écart'])
    expect(() => activer()).toThrow('a 1 écart(s)')
    verifie(s, bilanOk)
    expect(() => activer(GESTE.id, '  ')).toThrow('un nom est attendu')
    expect(lignes(s, ISSUE_GESTE.active)).toEqual([])
    expect(lireFichier(s).statut).toBe('propose')
    activer()
    expect(() => activer()).toThrow(`${FICHIER} : déjà actif`)
    writeFileSync(
      join(s.dossier, DOSSIER_GESTES, 'second.yaml'),
      JSON.stringify({ ...propose, description: 'les heures, autrement' }),
    )
    verifie(s, bilanOk, { ...GESTE, description: 'les heures, autrement' })
    expect(() => activer('second.yaml')).toThrow(`${FICHIER} est déjà actif pour ${GESTE.id}`)
    retirerGeste(s.dossier, s.journal, CLIENT, FICHIER, 'remplacé', 'Lionel', MAINTENANT)
    expect(() => activer(FICHIER)).toThrow(`${FICHIER} : déjà retiré`)
    expect(
      activerGeste(s.dossier, s.journal, CLIENT, 'second.yaml', 'Lionel', MAINTENANT).fichier,
    ).toBe(join(DOSSIER_GESTES, 'second.yaml'))
    METIER.fermer(s)
  })
})

describe('retirerGeste', () => {
  it('statut retiré dans le YAML, la ligne retiré au journal avec le motif : plus chargé', () => {
    const s = dossierAvec([FICHIER, propose])
    verifie(s, bilanOk)
    activerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'Lionel', MAINTENANT)
    expect(
      chargerGestesAppris(s.dossier, {
        client: CLIENT,
        journal: s.journal,
        declarations: DECLARATIONS_EXEMPLE,
      }).actifs,
    ).toHaveLength(1)
    expect(
      retirerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'trop large', 'patron', MAINTENANT),
    ).toEqual({ fichier: join(DOSSIER_GESTES, FICHIER), jeton: JETON })
    const fichier = lireFichier(s)
    expect(fichier.statut).toBe('retire')
    expect(fichier.validation?.par).toBe('Lionel')
    const [ligne] = lignes(s, ISSUE_GESTE.retire)
    expect(ligne?.motif).toBe('trop large')
    expect(donnees(ligne)).toEqual({
      jeton: JETON,
      fichier: join(DOSSIER_GESTES, FICHIER),
      par: 'patron',
    })
    expect(
      chargerGestesAppris(s.dossier, {
        client: CLIENT,
        journal: s.journal,
        declarations: DECLARATIONS_EXEMPLE,
      }),
    ).toEqual({
      actifs: [],
      ecartes: [],
    })
    expect(() =>
      retirerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'encore', undefined, MAINTENANT),
    ).toThrow('déjà retiré')
    expect(() =>
      retirerGeste(s.dossier, s.journal, CLIENT, GESTE.id, ' ', undefined, MAINTENANT),
    ).toThrow('un motif est attendu')
    METIER.fermer(s)
  })
})

describe('verifierGesteAppris', () => {
  it('sans modèle : rejeu 3/3, la ligne vérifié sans traduction, non activable', async () => {
    const s = dossierAvec([FICHIER, propose])
    const issue = await verifierGesteAppris(METIER, s, s.dossier, GESTE.id, {
      horodatage: HORODATAGE,
    })
    expect(issue).toMatchObject({
      fichier: join(DOSSIER_GESTES, FICHIER),
      jeton: JETON,
      ecarts: [],
      rejeu: { ok: 3, total: 3 },
      activable: false,
    })
    expect(issue.traduction).toBeUndefined()
    const [ligne] = lignes(s, ISSUE_GESTE.verifie)
    expect(ligne?.horodatage).toBe(HORODATAGE)
    expect(donnees(ligne)).toEqual({ jeton: JETON, ecarts: [] })
    expect(s.journal.lire().filter((l) => l.type === TYPE_APPEL)).toEqual([])
    METIER.fermer(s)
  })
  it('avec modèle : la passe reçoit le geste et son fichier, la ligne appel_modele/verifier et vérifié avec traduction, activable ; puis activer passe', async () => {
    const s = dossierAvec([FICHIER, propose])
    const issue = await verifierGesteAppris(METIER, s, s.dossier, FICHIER, {
      horodatage: HORODATAGE,
      modele: 'simulé',
      traduction: async (geste, fichier) => {
        expect(geste.id).toBe(GESTE.id)
        expect(fichier).toBe(join(DOSSIER_GESTES, FICHIER))
        return bilanOk
      },
    })
    expect(issue.traduction).toEqual(bilanOk)
    expect(issue.activable).toBe(true)
    const appel = s.journal.lire().find((l) => l.type === TYPE_APPEL)
    expect(appel?.issue).toBe('verifier')
    expect(donnees(appel)).toEqual({ appels: 61, modele: 'simulé', cout_usd: 0.12 })
    expect(donnees(lignes(s, ISSUE_GESTE.verifie)[0])).toEqual({
      jeton: JETON,
      ecarts: [],
      traduction: { taux: 58 / 60, atteint: true, cout_usd: 0.12 },
    })
    expect(activerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'Lionel', MAINTENANT).jeton).toBe(
      JETON,
    )
    METIER.fermer(s)
  })
  it('un écart : la passe n’a pas lieu, la ligne vérifié porte l’écart', async () => {
    const faux = {
      ...propose,
      reponse: { ...GESTE.reponse, ligne: '{{heures.nom}} : {{heures.total}} heures.' },
    }
    const s = dossierAvec([FICHIER, faux])
    let passes = 0
    const issue = await verifierGesteAppris(METIER, s, s.dossier, GESTE.id, {
      horodatage: HORODATAGE,
      traduction: async () => {
        passes += 1
        return bilanOk
      },
    })
    expect(passes).toBe(0)
    // L'écart de gabarit est précis (la colonne qui manque, pas celles qui existent), puis chaque rejeu échoue sur elle.
    const attendus = [
      'la ligne cite une colonne que « heures » ne rend pas : total',
      ...['E-1', 'E-2', 'E-3'].map(
        (e) => `${e} : la requête « heures » ne rend pas de colonne total`,
      ),
    ]
    expect(issue.ecarts.map((e) => e.texte)).toEqual(attendus)
    expect(issue.rejeu).toEqual({ ok: 0, total: 3 })
    expect(issue.activable).toBe(false)
    expect(donnees(lignes(s, ISSUE_GESTE.verifie)[0]).ecarts).toEqual(attendus)
    expect(() =>
      activerGeste(s.dossier, s.journal, CLIENT, GESTE.id, 'Lionel', MAINTENANT),
    ).toThrow('a 4 écart(s)')
    METIER.fermer(s)
  })
  it('un geste retiré ne se vérifie pas ; un geste sans instantané lisible non plus', async () => {
    const s = dossierAvec(
      ['a.yaml', { ...GESTE, statut: 'retire' }],
      [
        'b.yaml',
        {
          ...propose,
          id: 'compter_vacations',
          tests: GESTE.tests.map((t) => ({ ...t, instantane: 'echappees/absent.json' })),
        },
      ],
    )
    await expect(
      verifierGesteAppris(METIER, s, s.dossier, 'a.yaml', { horodatage: HORODATAGE }),
    ).rejects.toThrow('retiré, rien à vérifier')
    await expect(
      verifierGesteAppris(METIER, s, s.dossier, 'b.yaml', { horodatage: HORODATAGE }),
    ).rejects.toThrow('aucun instantané lisible')
    METIER.fermer(s)
  })
})
