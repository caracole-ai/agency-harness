// Les routes de l'interface du patron, par `app.request` (sans réseau), sur
// une copie du client fictif, avec le modèle simulé (PLAN-ESPACES.md § 10.3).
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type Choix,
  CONTROLE_OK,
  CONTROLE_RETIRE,
  DOSSIER_MISSIONS,
  ecrireStatut,
  FICHIER_LIVRAISON,
  FICHIER_PERSONNES,
  type Identite,
  Journal,
  type Ligne,
  lireMission,
  MOTS_CONTROLE,
  metierDe,
  modeleSimule,
  type Reponse,
  type Scripte,
  type Statut,
  SUFFIXE_A_POUSSER,
  type Tableau,
  TYPE_ACCES_REFUSE,
  TYPE_APPEL,
  TYPE_CHANTIER,
  TYPE_CONFIRMATION_ATTENDUE,
  TYPE_CONSIGNE,
  TYPE_ECHAPPEE,
  TYPE_GESTE_COMMANDE,
  TYPE_MISE_A_JOUR,
} from '@harnais/moteur'
import { describe, expect, it, vi } from 'vitest'
import { creerApp } from './app'

const exemple = fileURLToPath(new URL('../../exemples/client-fictif', import.meta.url))
const agence = fileURLToPath(new URL('../../exemples/agence-web-fictive', import.meta.url))
const MAINTENANT = '2026-10-10T21:40'
const PATRON: Identite = { role: 'patron' }

/** Une copie neuve du client fictif, sans journal ni sorties. */
function copie(): string {
  const dossier = mkdtempSync(join(tmpdir(), 'interface-'))
  cpSync(exemple, dossier, { recursive: true, filter: (f) => !/\.sqlite$|rapport-demo/.test(f) })
  return dossier
}

/** Le métier du client fictif, chargé depuis son `config.yaml` comme le fait le serveur (PLAN-METIER-2.md M10). */
const METIER = await metierDe(copie())

const app = (script: Scripte[] = [], dossier = copie()) =>
  creerApp({ dossier, maintenant: MAINTENANT, modele: modeleSimule(script), metier: METIER })

const poster = (a: ReturnType<typeof app>, route: string, corps: unknown) =>
  a.request(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
/** Les deux lectures passent la porte : l'identité dans le corps. */
const lire = (a: ReturnType<typeof app>, route: string, identite: unknown = PATRON) =>
  poster(a, route, { identite })

/** Le journal d'une copie, lu sans passer par l'application. */
function journalDe(dossier: string): Ligne[] {
  const j = new Journal(join(dossier, 'journal.sqlite'))
  try {
    return j.lire()
  } finally {
    j.fermer()
  }
}

interface Etat {
  client: string
  maintenant: string
  identites: { role: string; personne?: string; nom?: string }[]
  aValider: {
    confirmations: {
      conversation: string
      empreinte: string
      sorte: string
      texte: string
      geste?: { action: string; params: Record<string, unknown> }
    }[]
    demandes: {
      id: string
      statut: string
      titre?: string
      texte?: string
      choix?: Choix[]
      replis?: { titre: string; lignes: { titre: string; detail?: string }[] }[]
    }[]
  }
  regles: { id: string; nom: string; interdit: string; statut: string }[]
  ia: { coutMois: number; plafond: number; appels: number }
  echappees: {
    jours: number
    echappees: number
    relues: number
    retirees: number
    propositions: number
    abandons: number
  }
  motsControle: Record<string, string>
}

describe('POST /api/etat', async () => {
  const r = await lire(app(), '/api/etat')
  const etat = (await r.json()) as Etat
  it('compte zéro échappée sur un journal vierge, et porte les mots du contrôle', () => {
    expect(etat.echappees).toEqual({
      jours: 30,
      echappees: 0,
      relues: 0,
      retirees: 0,
      propositions: 0,
      abandons: 0,
    })
    expect(etat.motsControle).toEqual(MOTS_CONTROLE)
  })
  it('rend le client fictif, ses agents et ses 21 règles', () => {
    expect(r.status).toBe(200)
    expect(etat.client).toBe('client fictif (sécurité privée)')
    expect(etat.maintenant).toBe(MAINTENANT)
    expect(etat.identites[0]).toEqual({ role: 'patron' })
    expect(etat.identites).toContainEqual({ role: 'agent', personne: 'A-1', nom: 'Karim Haddad' })
    expect(etat.regles).toHaveLength(21)
    expect(etat.regles[0]).toMatchObject({ id: 'I-01', nom: 'carte professionnelle valide' })
  })
  it('ne montre rien à valider sur un journal vierge', () => {
    expect(etat.aValider).toEqual({ confirmations: [], demandes: [] })
    expect(etat.ia).toEqual({ coutMois: 0, plafond: 30, appels: 0 })
  })
  it('relit une confirmation en attente écrite avant PLAN-METIER-2.md (identite.agent, M2)', async () => {
    const dossier = copie()
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire([
      {
        type: TYPE_CONFIRMATION_ATTENDUE,
        client: 'client fictif (sécurité privée)',
        objet: 'C-ancienne',
        issue: 'mes_titres',
        motif: 'Je montre tes titres et leurs échéances.',
        donnees: {
          identite: { role: 'agent', personne: 'A-2' },
          demande: { sorte: 'action', action: 'mes_titres', params: {} },
          empreinte: 'e',
        },
      },
    ])
    j.fermer()
    const r = await lire(app([], dossier), '/api/etat')
    expect(r.status).toBe(200)
    const lu = (await r.json()) as Etat & {
      aValider: { confirmations: { identite: Identite; nom: string }[] }
    }
    expect(lu.aValider.confirmations).toMatchObject([
      { identite: { role: 'agent', personne: 'A-2' }, nom: 'Julien Lefèvre' },
    ])
  })
})

describe('le contrôle des chiffres, mesuré et dit (REFLEXIONS.md, décidé le 2026-10-18)', () => {
  /** Une ligne `echappee` telle que `echappee.ts` l'écrit, sans aucun nom. */
  const echappee = (conversation: string, issue: string, donnees: Record<string, unknown>) => ({
    type: TYPE_ECHAPPEE,
    client: 'client fictif (sécurité privée)',
    objet: conversation,
    issue,
    motif: 'une consigne',
    donnees: {
      echappee: `E-${conversation}`,
      intention: 'heures_par_agent',
      role: 'patron',
      tours: 2,
      ...donnees,
    },
  })

  it('/api/etat compte, sur 30 jours, les réponses relues, retirées et les abandons', async () => {
    const dossier = copie()
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire(
      [
        echappee('C-1', 'reponse', { controle_reponse: CONTROLE_OK, texte: 'x' }),
        echappee('C-2', 'reponse', { controle_reponse: CONTROLE_RETIRE, texte: 'x' }),
        echappee('C-3', 'abandon', { abandon: 'plafond de tours atteint' }),
      ],
      '2026-10-09T08:00:00Z',
    )
    // Hors de la fenêtre : ne compte pas.
    j.ecrire(
      [echappee('C-0', 'reponse', { controle_reponse: CONTROLE_OK, texte: 'x' })],
      '2026-08-01T08:00:00Z',
    )
    j.fermer()
    const etat = (await (await lire(app([], dossier), '/api/etat')).json()) as Etat
    expect(etat.echappees).toEqual({
      jours: 30,
      echappees: 3,
      relues: 1,
      retirees: 1,
      propositions: 0,
      abandons: 1,
    })
  })

  const nouvelle: Scripte = {
    outil: 'demande_nouvelle',
    entree: { intention: 'heures_par_agent', resume: 'x' },
  }
  const heures: Scripte = {
    outil: 'requete',
    entree: {
      sql: "SELECT agent, SUM(heures) AS heures FROM vacations WHERE jour BETWEEN '2026-10-05' AND '2026-10-11' GROUP BY agent ORDER BY agent",
    },
  }
  const repondre = (phrase: string): Scripte => ({ outil: 'repondre', entree: { phrase } })
  const consigne = async (a: ReturnType<typeof app>) =>
    (await (
      await poster(a, '/api/consigne', {
        identite: PATRON,
        consigne: "Combien d'heures a fait Karim cette semaine ?",
      })
    ).json()) as { reponse: Reponse }

  it('/api/consigne : une réponse relue porte son contrôle, « ok »', async () => {
    const { reponse } = await consigne(
      app([nouvelle, heures, repondre('{T1.1.agent} a fait {T1.1.heures} heures.')]),
    )
    expect(reponse).toEqual({
      sorte: 'resultat',
      texte: 'Karim Haddad a fait 24 heures.',
      controle: CONTROLE_OK,
    })
  })

  it('/api/consigne : un chiffre absent des données : le résumé retiré, le contrôle le dit', async () => {
    const { reponse } = await consigne(app([nouvelle, heures, repondre('A-1 a fait 999 heures.')]))
    expect(reponse).toMatchObject({ sorte: 'resultat', controle: CONTROLE_RETIRE })
    expect(reponse.texte).not.toContain('999')
  })
})

describe('ce que le métier rend à la page (PLAN-METIER-2.md § 3.6, M10)', () => {
  it('/api/roles : les rôles déclarés, avant toute porte', async () => {
    const r = await poster(app(), '/api/roles', {})
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject([
      { id: 'patron', enMots: 'le patron', identifie: false },
      { id: 'agent', enMots: "l'agent", identifie: true },
    ])
  })
  it('/api/entree : le rôle sans identifiant ; sinon une personne du registre qui administre, qui lit l’état', async () => {
    expect(await (await poster(app(), '/api/entree', {})).json()).toEqual(PATRON)
    // L'agence web ne déclare que des rôles identifiés (PLAN-METIER-2.md M3) : la page entrait sous personne.
    const dossier = mkdtempSync(join(tmpdir(), 'interface-agence-'))
    cpSync(agence, dossier, { recursive: true, filter: (f) => !/\.sqlite$/.test(f) })
    const web = creerApp({
      dossier,
      maintenant: MAINTENANT,
      modele: modeleSimule([]),
      metier: await metierDe(dossier),
    })
    const identite = (await (await poster(web, '/api/entree', {})).json()) as Identite
    expect(identite).toEqual({ role: 'dirigeant', personne: 'M-01' })
    const r = await lire(web, '/api/etat', identite)
    expect(r.status).toBe(200)
    expect(((await r.json()) as Etat).identites).toContainEqual({
      role: 'po',
      personne: 'M-03',
      nom: expect.any(String),
    })
    rmSync(dossier, { recursive: true, force: true })
  })
  it('/api/tableau : son nom, son accueil et ses suggestions à chacun ; une identité inconnue reçoit 403', async () => {
    const a = app()
    const patron = (await (await lire(a, '/api/tableau')).json()) as Pick<Tableau, 'nom' | 'textes'>
    expect(patron.nom).toBe('le patron')
    expect(patron.textes.suggestions).toContain('Lance la veille')
    expect(patron.textes.accueil).toMatch(/^Bonjour\. Dites-moi ce qui se passe/)
    const r = await lire(a, '/api/tableau', { role: 'agent', personne: 'A-2' })
    expect(r.status).toBe(200)
    const julien = (await r.json()) as Pick<Tableau, 'nom' | 'textes'>
    expect(julien.nom).toBe('Julien Lefèvre')
    expect(julien.textes.accueil).toMatch(/^Bonjour Julien\. /)
    expect(julien.textes.suggestions).toContain('Mes titres')
    expect((await lire(a, '/api/tableau', { role: 'agent', personne: 'A-99' })).status).toBe(403)
  })
  it('/api/etat : une délégation proposée est en attente, avec ses conditions en mots', async () => {
    const dossier = copie()
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire([
      {
        type: 'délégation proposée',
        client: 'client fictif (sécurité privée)',
        objet: 'D-V-17',
        motif: 'remplacement réussi : le rendre automatique dans ces conditions ?',
        donnees: {
          action: 'remplacement',
          conditions: { connait_site: true, prevenu_avant_heures: 10 },
        },
      },
    ])
    j.fermer()
    const lu = (await (await lire(app([], dossier), '/api/etat')).json()) as Pick<
      Tableau,
      'enAttente'
    >
    expect(lu.enAttente).toEqual([
      {
        id: 'D-V-17',
        texte:
          "remplacement réussi : le rendre automatique dans ces conditions ?\nConditions : le remplaçant connaît déjà le site ; l'absence est signalée au moins 10 h avant.",
      },
    ])
  })
})

describe('les pages', () => {
  it('sert la page et ses fichiers statiques', async () => {
    const a = app()
    const page = await a.request('/')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('pas authentifiée')
    expect((await a.request('/static/app.js')).status).toBe(200)
    expect((await a.request('/static/style.css')).status).toBe(200)
  })
  it('la page et ses fichiers se revalident à chaque chargement', async () => {
    const a = app()
    for (const chemin of ['/', '/static/app.js', '/static/style.css']) {
      expect((await a.request(chemin)).headers.get('cache-control')).toBe('no-cache')
    }
  })
})

describe('la porte, avant le dossier (REFLEXIONS.md, décidé le 2026-10-08)', () => {
  it('une identité absente du registre : 403, le dossier jamais ouvert, le refus au journal', async () => {
    const dossier = copie()
    const a = app([], dossier)
    const ouvrir = vi.spyOn(METIER, 'ouvrir')
    try {
      const r = await poster(a, '/api/consigne', {
        identite: { role: 'agent', personne: 'A-99' },
        consigne: 'mon planning',
      })
      expect(r.status).toBe(403)
      expect(((await r.json()) as { erreur: string }).erreur).toBe(
        "inconnu au registre d'accès : A-99",
      )
      expect((await lire(a, '/api/etat', { role: 'agent', personne: 'A-99' })).status).toBe(403)
      expect((await lire(a, '/api/journal', { role: 'roi' })).status).toBe(403)
      expect(ouvrir).not.toHaveBeenCalled()
    } finally {
      ouvrir.mockRestore()
    }
    const refus = journalDe(dossier).filter((l) => l.type === TYPE_ACCES_REFUSE)
    expect(refus).toHaveLength(3)
    expect(refus[0]).toMatchObject({
      motif: "inconnu au registre d'accès : A-99",
      horodatage: '2026-10-10T19:40:00Z',
    })
    expect(JSON.parse(refus[0]?.donnees ?? '{}')).toEqual({
      identite: '{"role":"agent","personne":"A-99"}',
      canal: 'web',
    })
  })
  it('tout le planning et tout le journal : au patron seul, un agent reçoit 403', async () => {
    const a = app()
    const julien = { role: 'agent', personne: 'A-2' }
    for (const route of ['/api/etat', '/api/journal']) {
      const r = await lire(a, route, julien)
      expect(r.status).toBe(403)
      expect(((await r.json()) as { erreur: string }).erreur).toBe('réservé au patron')
    }
  })
  it('le registre est relu à chaque requête : retirer un agent vaut tout de suite', async () => {
    const dossier = copie()
    const a = app([], dossier)
    const chemin = join(dossier, FICHIER_PERSONNES)
    writeFileSync(
      chemin,
      readFileSync(chemin, 'utf8').replace('  - { role: agent, agent: A-2 }\n', ''),
    )
    const r = await poster(a, '/api/consigne', {
      identite: { role: 'agent', personne: 'A-2' },
      consigne: 'mon planning',
    })
    expect(r.status).toBe(403)
  })
  it('au démarrage : un registre absent, ou qui nomme un agent inconnu des données, arrête tout', () => {
    const inconnu = copie()
    writeFileSync(
      join(inconnu, FICHIER_PERSONNES),
      'personnes:\n  - { role: agent, agent: A-99 }\n',
    )
    expect(() => app([], inconnu)).toThrow(/registre d'accès : .*A-99/)
    const absent = copie()
    rmSync(join(absent, FICHIER_PERSONNES))
    expect(() => app([], absent)).toThrow(/registre d'accès absent/)
  })
})

describe('les erreurs de requête', () => {
  it('refuse un rôle inconnu (à la porte), une consigne vide, un corps qui n’est pas du JSON', async () => {
    const a = app()
    expect(
      (await poster(a, '/api/consigne', { identite: { role: 'roi' }, consigne: 'x' })).status,
    ).toBe(403)
    expect((await poster(a, '/api/consigne', { identite: PATRON, consigne: ' ' })).status).toBe(400)
    const r = await a.request('/api/consigne', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'pas du json',
    })
    expect(r.status).toBe(400)
  })
  it('refuse une limite de journal hors bornes', async () => {
    expect((await lire(app(), '/api/journal?limite=0')).status).toBe(400)
  })
  it('ne répond qu’à la page elle-même : autre origine, corps non JSON, hôte étranger', async () => {
    const a = app()
    const corps = JSON.stringify({ identite: PATRON, consigne: 'Aïcha ne vient pas demain' })
    // Ce qu'une page tierce peut envoyer sans pré-vol : refusé par hono/csrf.
    const tierce = await a.request('/api/consigne', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Origin: 'https://ailleurs.example' },
      body: corps,
    })
    expect(tierce.status).toBe(403)
    // Même sans Origin, un corps déclaré text/plain est refusé (csrf) ; un
    // corps déclaré autrement que JSON l'est aussi, par lireCorps (400).
    const texte = await a.request('/api/consigne', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: corps,
    })
    expect(texte.status).toBe(403)
    const xml = await a.request('/api/consigne', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: corps,
    })
    expect(xml.status).toBe(400)
    // Un nom d'hôte qui n'est pas local (rebinding DNS) : refusé, même en lecture.
    const etranger = await lire(a, 'http://ailleurs.example/api/etat')
    expect(etranger.status).toBe(421)
    expect((await lire(a, 'http://localhost:3777/api/etat')).status).toBe(200)
  })
})

describe('les demandes sans geste : /api/sans-geste, commander (REFLEXIONS.md, 2026-10-15)', () => {
  const CLIENT = 'client fictif (sécurité privée)'
  const nouvelle = (conversation: string, intention: string, resume: string, consigne: string) => ({
    type: TYPE_CONSIGNE,
    client: CLIENT,
    objet: conversation,
    issue: 'nouvelle',
    motif: consigne,
    donnees: { identite: PATRON, demande: { sorte: 'nouvelle', intention, resume } },
  })
  /** L'échappée qui a suivi une demande, telle que `echappee.ts` l'écrit : la consigne version modèle, des A-… à la place des noms. */
  const echappee = (conversation: string, id: string, intention: string, consigne: string) => ({
    type: TYPE_ECHAPPEE,
    client: CLIENT,
    objet: conversation,
    issue: 'proposition',
    motif: 'Julien a-t-il rendu ses clés ?',
    donnees: { echappee: id, intention, role: 'patron', consigne_modele: consigne, tours: 2 },
  })
  /**
   * Une copie avec trois demandes sans geste sous deux intentions (une échappée
   * finie en proposition pour `remise_des_cles`), une inconnue et une nouvelle
   * sans résumé. Des intentions que le métier ne déclare ni ne code : le chantier
   * peut fusionner un geste du métier sans que ces tests, hors de sa bande, changent.
   */
  function copieAvecDemandes(): string {
    const dossier = copie()
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire(
      [
        nouvelle('C-1', 'remise_des_cles', 'les clés de Julien', 'Julien a-t-il rendu ses clés ?'),
        echappee('C-1', 'E-20261008T1000-0001', 'remise_des_cles', 'A-3 a-t-il rendu ses clés ?'),
      ],
      '2026-10-08T08:00:00Z',
    )
    j.ecrire(
      [
        nouvelle(
          'C-2',
          'releve_kilometrique',
          'les kilomètres de Karim',
          'Combien de kilomètres a fait Karim ?',
        ),
      ],
      '2026-10-09T08:00:00Z',
    )
    j.ecrire(
      [
        nouvelle(
          'C-3',
          'remise_des_cles',
          'les clés de Sophie',
          'Sophie a-t-elle rendu ses clés ?',
        ),
      ],
      '2026-10-09T09:00:00Z',
    )
    j.ecrire(
      [
        {
          type: TYPE_CONSIGNE,
          client: CLIENT,
          objet: 'C-4',
          issue: 'inconnue',
          motif: 'Fais la paie.',
          donnees: { identite: PATRON, demande: { sorte: 'inconnue', raison: 'x' } },
        },
        {
          type: TYPE_CONSIGNE,
          client: CLIENT,
          objet: 'C-5',
          issue: 'nouvelle',
          motif: 'Encore Julien.',
          donnees: { identite: PATRON },
        },
      ],
      '2026-10-09T10:00:00Z',
    )
    j.fermer()
    return dossier
  }

  it('la liste est au patron seul : par intention, les plus fréquentes d’abord, avec les résumés et la dernière date', async () => {
    const a = app([], copieAvecDemandes())
    expect((await lire(a, '/api/sans-geste', { role: 'agent', personne: 'A-2' })).status).toBe(403)
    const r = await lire(a, '/api/sans-geste')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual([
      {
        intention: 'remise_des_cles',
        compte: 2,
        exemples: ['les clés de Sophie', 'les clés de Julien'],
        derniere: '2026-10-09',
      },
      {
        intention: 'releve_kilometrique',
        compte: 1,
        exemples: ['les kilomètres de Karim'],
        derniere: '2026-10-09',
      },
    ])
  })
  it('commander : le patron seul, « par » est son identité vérifiée ; la mission est écrite, puis la ligne au journal, sans appel ; une seconde fois, 400', async () => {
    const dossier = copieAvecDemandes()
    const a = app([], dossier)
    expect(
      (
        await poster(a, '/api/sans-geste/commander', {
          identite: { role: 'agent', personne: 'A-2' },
          intention: 'remise_des_cles',
        })
      ).status,
    ).toBe(403)
    expect((await poster(a, '/api/sans-geste/commander', { identite: PATRON })).status).toBe(400)
    const inconnue = await poster(a, '/api/sans-geste/commander', {
      identite: PATRON,
      intention: 'inventaire_cles',
    })
    expect(inconnue.status).toBe(400)
    expect(((await inconnue.json()) as { erreur: string }).erreur).toBe(
      'inventaire_cles : aucune demande sans geste sous ce mot',
    )
    const r = await poster(a, '/api/sans-geste/commander', {
      identite: PATRON,
      intention: 'remise_des_cles',
    })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ intention: 'remise_des_cles', le: '2026-10-10' })
    const commande = journalDe(dossier).find((l) => l.type === TYPE_GESTE_COMMANDE)
    expect(commande).toMatchObject({
      objet: 'remise_des_cles',
      motif: 'les clés de Sophie',
      horodatage: '2026-10-10T19:40:00Z',
    })
    expect(JSON.parse(commande?.donnees ?? '{}')).toEqual({
      par: { role: 'patron' },
      exemples: ['les clés de Sophie', 'les clés de Julien'],
      compte: 2,
    })
    expect(journalDe(dossier).filter((l) => l.type === TYPE_APPEL)).toEqual([])
    const chemin = join(dossier, DOSSIER_MISSIONS, '2026-10-10', 'remise_des_cles.yaml')
    const { mission } = lireMission(chemin)
    expect(mission).toMatchObject({
      id: 'remise_des_cles',
      sorte: 'geste_code',
      ecrit: true,
      echappees: ['E-20261008T1000-0001'],
      consignes_types: ['<personne> a-t-il rendu ses clés ?'],
      statut: 'à faire',
    })
    expect(readFileSync(chemin, 'utf8')).not.toMatch(/Julien|Sophie|A-\d/)
    const encore = await poster(a, '/api/sans-geste/commander', {
      identite: PATRON,
      intention: 'remise_des_cles',
    })
    expect(encore.status).toBe(400)
    expect(((await encore.json()) as { erreur: string }).erreur).toBe(
      'remise_des_cles : déjà commandé le 2026-10-10',
    )
    const [d] = (await (await lire(a, '/api/sans-geste')).json()) as { commande?: unknown }[]
    expect(d).toMatchObject({
      intention: 'remise_des_cles',
      commande: { par: { role: 'patron' }, le: '2026-10-10', disponible: false },
    })
    expect(d).not.toHaveProperty('commande.chantier')
  })
  it('l’état d’une commande : le chantier qui l’a suivie, puis « disponible » quand le métier porte le geste', async () => {
    const dossier = copieAvecDemandes()
    const commander = () =>
      poster(app([], dossier), '/api/sans-geste/commander', {
        identite: PATRON,
        intention: 'remise_des_cles',
      })
    expect((await commander()).status).toBe(200)
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire(
      [{ type: TYPE_CHANTIER, client: CLIENT, objet: 'remise_des_cles', issue: 'fusionné' }],
      '2026-10-11T01:30:00Z',
    )
    j.fermer()
    const etat = async (a: ReturnType<typeof app>) =>
      ((await (await lire(a, '/api/sans-geste')).json()) as { commande?: unknown }[])[0]?.commande
    expect(await etat(app([], dossier))).toEqual({
      par: { role: 'patron' },
      le: '2026-10-10',
      chantier: { issue: 'fusionné', le: '2026-10-11' },
      disponible: false,
    })
    // L'outil relancé sur le code fusionné : le métier porte un geste de ce nom.
    const [action] = METIER.actions
    if (!action) throw new Error('le métier fictif sans geste')
    const avecGeste = creerApp({
      dossier,
      maintenant: MAINTENANT,
      modele: modeleSimule([]),
      metier: { ...METIER, actions: [...METIER.actions, { ...action, id: 'remise_des_cles' }] },
    })
    expect(await etat(avecGeste)).toMatchObject({ disponible: true })
  })
  it('la carte suit les statuts que le chantier écrit à côté de la mission (non livré, PLAN-LIVRAISON.md L7) : en attente, en cours, fusionné et sa version, disponible', async () => {
    const dossier = copieAvecDemandes()
    const a = app([], dossier)
    expect(
      (
        await poster(a, '/api/sans-geste/commander', {
          identite: PATRON,
          intention: 'remise_des_cles',
        })
      ).status,
    ).toBe(200)
    const etat = async (x: ReturnType<typeof app>) =>
      (
        (await (await lire(x, '/api/sans-geste')).json()) as { commande?: { chantier?: unknown } }[]
      )[0]?.commande
    expect((await etat(a))?.chantier).toBeUndefined()
    const date = join(dossier, 'missions', '2026-10-10')
    const statut = (s: Statut) => ecrireStatut(date, 'remise_des_cles', s)
    statut({
      statut: 'en attente',
      issue: 'borne du jour atteinte (3 chantiers) : demain',
      cout_usd: 0,
      le: '2026-10-10T19:50:00Z',
    })
    expect((await etat(a))?.chantier).toEqual({ issue: 'en attente', le: '2026-10-10' })
    statut({
      statut: 'en cours',
      issue: 'chantier en cours',
      cout_usd: 0,
      le: '2026-10-10T20:00:00Z',
    })
    expect((await etat(a))?.chantier).toEqual({ issue: 'en cours', le: '2026-10-10' })
    statut({
      statut: 'fusionné',
      issue: 'fusionné',
      version: 'v2026-10-10-1',
      cout_usd: 1.5,
      le: '2026-10-10T20:40:00Z',
    })
    expect((await etat(a))?.chantier).toEqual({
      issue: 'fusionné',
      le: '2026-10-10',
      version: 'v2026-10-10-1',
    })
    // Relu, le même statut n'ajoute rien au journal.
    await etat(a)
    expect(
      journalDe(dossier)
        .filter((l) => l.type === TYPE_CHANTIER)
        .map((l) => l.issue),
    ).toEqual(['en attente', 'en cours', 'fusionné'])
  })
  it('/api/version (PLAN-LIVRAISON.md L9) : rien hors d’une installation ; installée, l’étiquette et le jour de sa mise à jour ; au patron seul', async () => {
    expect(await (await lire(app(), '/api/version')).json()).toEqual({})
    const dossier = copie()
    const j = new Journal(join(dossier, 'journal.sqlite'))
    j.ecrire(
      [{ type: TYPE_MISE_A_JOUR, client: CLIENT, objet: 'v2026-10-10-2', issue: 'faite' }],
      '2026-10-10T08:30:00Z',
    )
    j.fermer()
    const installee = creerApp({
      dossier,
      maintenant: MAINTENANT,
      modele: modeleSimule([]),
      metier: METIER,
      version: 'v2026-10-10-2',
    })
    expect(await (await lire(installee, '/api/version')).json()).toEqual({
      version: 'v2026-10-10-2',
      le: '2026-10-10',
    })
    expect((await lire(installee, '/api/version', { role: 'agent', personne: 'A-2' })).status).toBe(
      403,
    )
  })
  it('commander sans consigne utilisable (aucune échappée sous l’intention) : 400, ni mission ni ligne', async () => {
    const dossier = copieAvecDemandes()
    const r = await poster(app([], dossier), '/api/sans-geste/commander', {
      identite: PATRON,
      intention: 'releve_kilometrique',
    })
    expect(r.status).toBe(400)
    expect(((await r.json()) as { erreur: string }).erreur).toMatch(
      /^releve_kilometrique : aucune consigne utilisable/,
    )
    expect(journalDe(dossier).filter((l) => l.type === TYPE_GESTE_COMMANDE)).toEqual([])
    expect(
      existsSync(join(dossier, DOSSIER_MISSIONS, '2026-10-10', 'releve_kilometrique.yaml')),
    ).toBe(false)
  })
  it('un client livré (PLAN-LIVRAISON.md L6, L7) : l’interface ne lance aucun git ; l’onglet et la commande déclenchent le rattrapage à part, la mission est marquée « à pousser »', async () => {
    const dossier = copieAvecDemandes()
    const installation = mkdtempSync(join(tmpdir(), 'installation-'))
    writeFileSync(
      join(dossier, FICHIER_LIVRAISON),
      [
        'depot: /nulle-part/produit.git',
        'missions: /nulle-part/missions.git',
        `installation: ${installation}`,
        'intervalle_minutes: 15',
        '',
      ].join('\n'),
    )
    let rattrapages = 0
    const a = creerApp({
      dossier,
      maintenant: MAINTENANT,
      modele: modeleSimule([]),
      metier: METIER,
      rattraper: () => {
        rattrapages++
      },
    })
    expect((await lire(a, '/api/sans-geste')).status).toBe(200)
    expect(rattrapages).toBe(1)
    const r = await poster(a, '/api/sans-geste/commander', {
      identite: PATRON,
      intention: 'remise_des_cles',
    })
    expect(r.status).toBe(200)
    expect(rattrapages).toBe(2)
    const mission = join(dossier, DOSSIER_MISSIONS, '2026-10-10', 'remise_des_cles.yaml')
    expect(readFileSync(`${mission}${SUFFIXE_A_POUSSER}`, 'utf8')).toBe('à pousser\n')
    // Aucun git n'a tourné dans l'interface : l'installation est vide (pas même le clone de la file).
    expect(readdirSync(installation)).toEqual([])
  })
  it('la page a l’onglet « Gestes » : ce que l’outil ne sait pas encore faire, sans gestes appris', async () => {
    const page = await (await app().request('/')).text()
    expect(page).toContain("Ce que l'outil ne sait pas encore faire")
    expect(page).not.toMatch(/geste appris|gestes appris/)
  })
})

describe('POST /api/confirmer', () => {
  it('rend un refus pour une empreinte fausse', async () => {
    const r = await poster(app(), '/api/confirmer', {
      identite: PATRON,
      conversation: 'C-20261010T2140-0000',
      empreinte: 'fausse',
      oui: true,
    })
    expect(r.status).toBe(200)
    expect(((await r.json()) as { reponse: Reponse }).reponse.sorte).toBe('refus')
  })
})

describe('un parcours simulé : absence, validation, oui', async () => {
  const a = app([
    { outil: 'gerer_absence', entree: { agent: 'A-11', jour: '2026-10-11' } },
    { outil: 'valider_remplacement', entree: { demande: 'D-V-17', agent: null } },
  ])
  const consigne = async (texte: string, conversation?: string) =>
    (await (
      await poster(a, '/api/consigne', {
        identite: PATRON,
        consigne: texte,
        ...(conversation ? { conversation } : {}),
      })
    ).json()) as { conversation: string; reponse: Reponse }
  const etat = async () => (await (await lire(a, '/api/etat')).json()) as Etat

  const premiere = await consigne('Aïcha ne vient pas demain')
  const apresAbsence = await etat()
  const seconde = await consigne('Valide Julien', premiere.conversation)
  const enAttente = await etat()
  const empreinte = seconde.reponse.sorte === 'confirmation' ? seconde.reponse.empreinte : ''
  const oui = (await (
    await poster(a, '/api/confirmer', {
      identite: PATRON,
      conversation: seconde.conversation,
      empreinte,
      oui: true,
    })
  ).json()) as { reponse: Reponse }
  const apresOui = await etat()

  it('la première consigne rend la proposition de remplaçant', () => {
    expect(premiere.conversation).toMatch(/^C-20261010T2140-[0-9a-f]{4}$/)
    expect(premiere.reponse.sorte).toBe('resultat')
    expect(premiere.reponse.texte).toContain('Remplacer Aïcha Traoré')
    expect(premiere.reponse.sorte === 'resultat' && premiere.reponse.choix?.[0]?.titre).toBe(
      'Julien Lefèvre',
    )
    expect(apresAbsence.aValider.demandes).toMatchObject([{ id: 'D-V-17', statut: 'proposée' }])
  })
  it('la seconde demande un oui, qui apparaît dans « à valider »', () => {
    expect(seconde.conversation).toBe(premiere.conversation)
    expect(seconde.reponse.sorte).toBe('confirmation')
    expect(enAttente.aValider.confirmations).toMatchObject([
      { conversation: seconde.conversation, empreinte, sorte: 'action' },
    ])
    expect(enAttente.ia.appels).toBe(2)
  })
  it('le oui la fait disparaître, et la demande attend l’agent', () => {
    expect(oui.reponse.sorte).toBe('resultat')
    expect(oui.reponse.texte).toContain('Message envoyé')
    expect(apresOui.aValider.confirmations).toEqual([])
    expect(apresOui.aValider.demandes).toMatchObject([
      {
        id: 'D-V-17',
        statut: "demandée à l'agent",
        texte: expect.stringContaining('Julien, peux-tu remplacer'),
      },
    ])
  })
  it('POST /api/journal?limite=5 rend 5 lignes, la plus récente d’abord', async () => {
    const r = await lire(a, '/api/journal?limite=5')
    const lignes = (await r.json()) as Ligne[]
    expect(lignes).toHaveLength(5)
    expect(lignes[0]?.type).toBe('confirmation')
    const ids = lignes.map((l) => l.id)
    expect(ids).toEqual([...ids].sort((x, y) => y - x))
  })
})

describe('la décision du patron sur une demande, cliquée : sur la carte et sous le résultat', async () => {
  // Un seul appel au modèle : la traduction de l'absence. La décision part d'un clic.
  const a = app([{ outil: 'gerer_absence', entree: { agent: 'A-11', jour: '2026-10-11' } }])
  const etat = async () => (await (await lire(a, '/api/etat')).json()) as Etat
  const premiere = (await (
    await poster(a, '/api/consigne', { identite: PATRON, consigne: 'Aïcha ne vient pas demain' })
  ).json()) as { conversation: string; reponse: Reponse }
  const avant = await etat()
  const offerts = premiere.reponse.sorte === 'resultat' ? (premiere.reponse.choix ?? []) : []
  const autre = offerts[1]
  if (!autre) throw new Error('aucun autre remplaçant offert')
  const clic = (await (
    await poster(a, '/api/geste', {
      identite: PATRON,
      conversation: premiere.conversation,
      ...autre,
    })
  ).json()) as { conversation: string; reponse: Reponse }
  const enAttente = await etat()
  const oui = (await (
    await poster(a, '/api/confirmer', {
      identite: PATRON,
      conversation: clic.conversation,
      empreinte: clic.reponse.sorte === 'confirmation' ? clic.reponse.empreinte : '',
      oui: true,
    })
  ).json()) as { reponse: Reponse }
  const apres = await etat()

  it('le résultat et la carte offrent les mêmes décisions : le proposé d’abord, puis chaque autre possible', () => {
    expect(offerts.slice(0, 2)).toEqual([
      {
        libelle: 'Valider Julien Lefèvre',
        titre: 'Julien Lefèvre',
        detail: 'connaît le site · 16 h cette semaine',
        action: 'valider_remplacement',
        params: { demande: 'D-V-17', agent: 'A-2' },
      },
      {
        libelle: 'Prendre Karim Haddad à la place',
        titre: 'Karim Haddad',
        detail: 'connaît le site · 24 h cette semaine',
        action: 'valider_remplacement',
        params: { demande: 'D-V-17', agent: 'A-1' },
      },
    ])
    expect(avant.aValider.demandes[0]?.choix).toEqual(offerts)
  })
  it('le texte dit quoi, quand et où ; le proposé est la décision ; exclus et écartés vont au détail replié, le même des deux côtés', () => {
    expect(premiere.reponse.texte).toBe(
      'Demande D-V-17\nRemplacer Aïcha Traoré\ndim. 11/10 · 08:00 → 20:00 · Accueil, Galerie des Tilleuls',
    )
    const replis = premiere.reponse.sorte === 'resultat' ? premiere.reponse.replis : undefined
    expect(replis?.map((r) => r.titre)).toEqual([
      '4 exclus par une règle',
      '4 écartés : une donnée manque',
    ])
    expect(replis?.[0]?.lignes[0]).toEqual({
      titre: 'Sophie Marchand',
      detail: 'carte professionnelle valide',
    })
    expect(avant.aValider.demandes[0]?.replis).toEqual(replis)
    expect(avant.aValider.demandes[0]).toMatchObject({
      titre: 'Remplacer Aïcha Traoré',
      texte: 'dim. 11/10 · 08:00 → 20:00 · Accueil, Galerie des Tilleuls',
    })
  })
  it('le clic demande le oui, sans modèle ; la confirmation dit le geste qu’elle attend', () => {
    expect(clic.conversation).toBe(premiere.conversation)
    expect(clic.reponse.sorte).toBe('confirmation')
    expect(clic.reponse.texte).toContain('Valider Karim Haddad pour remplacer Aïcha Traoré')
    expect(enAttente.ia.appels).toBe(avant.ia.appels)
    expect(enAttente.aValider.confirmations).toMatchObject([
      { geste: { action: autre.action, params: autre.params } },
    ])
  })
  it('le oui sollicite l’agent choisi ; la demande n’offre plus de décision', () => {
    expect(oui.reponse.sorte).toBe('resultat')
    expect(apres.aValider.confirmations).toEqual([])
    expect(apres.aValider.demandes).toMatchObject([
      { id: 'D-V-17', statut: "demandée à l'agent", choix: [] },
    ])
    expect(apres.aValider.demandes[0]?.texte).toContain('Karim')
  })
})

describe('un autre choix d’une proposition, cliqué : /api/geste (PLAN-CHOIX.md, lot 3)', async () => {
  const PROPOSEES = [
    { type: 'reaffecter', vacation: 'V-03', agent: 'A-9' },
    { type: 'reaffecter', vacation: 'V-07', agent: 'A-2' },
  ]
  // Le script s'arrête à la proposition : un appel de plus au modèle ferait échouer le clic.
  const dossier = copie()
  const a = app(
    [
      { outil: 'demande_nouvelle', entree: { intention: 'liberer_un_jour', resume: 'x' } },
      { outil: 'verifier', entree: { modifications: PROPOSEES } },
      { outil: 'proposer', entree: { modifications: PROPOSEES, resume: 'Deux vacations.' } },
    ],
    dossier,
  )
  const etat = async () =>
    (await (await lire(a, '/api/etat')).json()) as Etat & {
      aValider: { confirmations: { choix: Choix[] }[] }
    }
  const premiere = (await (
    await poster(a, '/api/consigne', {
      identite: PATRON,
      consigne: 'Libère Karim mardi et Sophie mercredi',
    })
  ).json()) as { conversation: string; reponse: Reponse }
  const avant = await etat()
  const choix =
    premiere.reponse.sorte === 'proposition'
      ? premiere.reponse.choix?.find(
          (c) => c.params.vacation === 'V-03' && c.params.agent === 'A-11',
        )
      : undefined
  const clic = (identite: Identite, corps: Partial<Choix> = {}) =>
    poster(a, '/api/geste', { identite, conversation: premiere.conversation, ...choix, ...corps })
  const r = await clic(PATRON)
  const apres = (await r.json()) as { conversation: string; reponse: Reponse }
  const ensuite = await etat()

  it('la proposition offre chaque autre possible comme un choix, dans la bulle et dans « à valider »', () => {
    expect(choix).toEqual({
      libelle: 'Prendre Aïcha Traoré pour V-03',
      action: 'changer_remplacant',
      params: {
        demande: expect.stringMatching(/^R-/),
        vacation: 'V-03',
        jour: null,
        agent: 'A-11',
      },
    })
    expect(avant.aValider.confirmations[0]?.choix).toContainEqual(choix)
  })
  it('le clic rouvre la proposition sans modèle, dans la même conversation ; le libellé est au journal', () => {
    expect(r.status).toBe(200)
    expect(apres.conversation).toBe(premiere.conversation)
    expect(apres.reponse.sorte).toBe('proposition')
    expect(apres.reponse.texte).toMatch(/^Proposition R-\S+-2 \(remplace R-\S+\)/)
    expect(apres.reponse.texte).toContain('Karim Haddad → Aïcha Traoré')
    expect(ensuite.ia.appels).toBe(avant.ia.appels)
    expect(ensuite.aValider.confirmations).toHaveLength(1)
    expect(journalDe(dossier).some((l) => l.motif === 'Prendre Aïcha Traoré pour V-03')).toBe(true)
  })
  it('un agent n’ouvre pas le geste ; un corps incomplet : 400', async () => {
    const agent = (await (
      await clic({ role: 'agent', personne: 'A-9' }, { libelle: 'Prendre' })
    ).json()) as {
      reponse: Reponse
    }
    expect(agent.reponse).toEqual({
      sorte: 'refus',
      texte: "l'action changer_remplacant n'est pas ouverte à ce rôle",
    })
    expect((await clic(PATRON, { action: '' })).status).toBe(400)
    expect((await clic(PATRON, { libelle: '' })).status).toBe(400)
  })
  it('corrigée depuis une autre conversation, l’ancienne n’est plus dans « à valider »', async () => {
    const remplacante = (await etat()).aValider.confirmations[0]
    const id = remplacante?.texte.match(/^Proposition (R-\S+)/)?.[1]
    if (!id) throw new Error('aucune proposition en attente')
    const ailleurs = (await (
      await poster(a, '/api/geste', {
        identite: PATRON,
        libelle: 'Prendre Mehdi Saïdi pour V-03',
        action: 'changer_remplacant',
        params: { demande: id, vacation: 'V-03', jour: null, agent: 'A-9' },
      })
    ).json()) as { conversation: string; reponse: Reponse }
    expect(ailleurs.conversation).not.toBe(premiere.conversation)
    const nouvelle = ailleurs.reponse.texte.match(/^Proposition (R-\S+) \(remplace (R-\S+)\)/)
    expect(nouvelle?.[2]).toBe(id)
    expect((await etat()).aValider.confirmations).toEqual([
      expect.objectContaining({
        conversation: ailleurs.conversation,
        texte: expect.stringMatching(`^Proposition ${nouvelle?.[1]} `),
      }),
    ])
  })
})
