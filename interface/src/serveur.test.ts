// Les routes de l'interface du patron, par `app.request` (sans réseau), sur
// une copie du client fictif, avec le modèle simulé (PLAN-ESPACES.md § 10.3).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOSSIER_GESTES,
  empreinteGeste,
  FICHIER_PERSONNES,
  type FichierGeste,
  type GesteListe,
  gesteDe,
  type Identite,
  ISSUE_GESTE,
  Journal,
  type Ligne,
  lireFichiersGestes,
  modeleSimule,
  type Reponse,
  type Scripte,
  TYPE_ACCES_REFUSE,
  TYPE_CONFIRMATION_ATTENDUE,
  TYPE_GESTE_APPRIS,
} from '@harnais/moteur'
import { CONVERSATION } from '@harnais/securite-privee'
import { describe, expect, it, vi } from 'vitest'
import { creerApp } from './app'

const exemple = fileURLToPath(new URL('../../exemples/client-fictif', import.meta.url))
const MAINTENANT = '2026-10-10T21:40'
const PATRON: Identite = { role: 'patron' }

/** Une copie neuve du client fictif, sans journal ni sorties. */
function copie(): string {
  const dossier = mkdtempSync(join(tmpdir(), 'interface-'))
  cpSync(exemple, dossier, { recursive: true, filter: (f) => !/\.sqlite$|rapport-demo/.test(f) })
  return dossier
}

const app = (script: Scripte[] = [], dossier = copie()) =>
  creerApp({ dossier, maintenant: MAINTENANT, modele: modeleSimule(script) })

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
    confirmations: { conversation: string; empreinte: string; sorte: string; texte: string }[]
    demandes: { id: string; statut: string }[]
  }
  regles: { id: string; nom: string; interdit: string; statut: string }[]
  ia: { coutMois: number; plafond: number; appels: number }
}

describe('POST /api/etat', async () => {
  const r = await lire(app(), '/api/etat')
  const etat = (await r.json()) as Etat
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
          identite: { role: 'agent', agent: 'A-2' },
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

describe('les pages', () => {
  it('sert la page et ses fichiers statiques', async () => {
    const a = app()
    const page = await a.request('/')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('pas authentifiée')
    expect((await a.request('/static/app.js')).status).toBe(200)
    expect((await a.request('/static/style.css')).status).toBe(200)
  })
})

describe('la porte, avant le dossier (REFLEXIONS.md, décidé le 2026-10-08)', () => {
  it('une identité absente du registre : 403, le dossier jamais ouvert, le refus au journal', async () => {
    const dossier = copie()
    const a = app([], dossier)
    const ouvrir = vi.spyOn(CONVERSATION, 'ouvrir')
    try {
      const r = await poster(a, '/api/consigne', {
        identite: { role: 'agent', agent: 'A-99' },
        consigne: 'mon planning',
      })
      expect(r.status).toBe(403)
      expect(((await r.json()) as { erreur: string }).erreur).toBe(
        "inconnu au registre d'accès : A-99",
      )
      expect((await lire(a, '/api/etat', { role: 'agent', agent: 'A-99' })).status).toBe(403)
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
      identite: '{"role":"agent","agent":"A-99"}',
      canal: 'web',
    })
  })
  it('tout le planning et tout le journal : au patron seul, un agent reçoit 403', async () => {
    const a = app()
    const julien = { role: 'agent', agent: 'A-2' }
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
      identite: { role: 'agent', agent: 'A-2' },
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

describe('ce que l’outil a appris : /api/gestes, activer, retirer (PLAN-PROMOTION.md § 7.2)', () => {
  const TEST = {
    echappee: 'E-1',
    consigne: 'Combien d’heures a fait Julien ?',
    role: 'patron' as const,
    agent: null,
    params: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
    instantane: 'echappees/E-1.json',
    contient: ['16'],
  }
  const GESTE: FichierGeste = {
    id: 'heures_par_agent',
    description: 'les heures faites par un agent sur une période',
    roles: ['patron'],
    parametres: {
      agent: { type: 'agent', description: "l'agent nommé" },
      periode: { type: 'periode', description: 'la période' },
    },
    requetes: [{ nom: 'heures', sql: 'SELECT 1 AS heures FROM agents WHERE id = :agent' }],
    reponse: { ligne: '{{heures.heures}} heures', tableau: null, vide: 'Rien.' },
    tests: [TEST, { ...TEST, echappee: 'E-2' }, { ...TEST, echappee: 'E-3' }],
    origine: { fabrique_le: '2026-10-10', modele: 'simulé', cout_usd: 0.01, conversations: [] },
    statut: 'propose',
  }
  const jeton = empreinteGeste(gesteDe(GESTE))
  /** Une copie avec le geste proposé et, si on le demande, sa ligne « vérifié » avec modèle au seuil. */
  function copieAvecGeste(verifie: boolean): string {
    const dossier = copie()
    mkdirSync(join(dossier, DOSSIER_GESTES))
    writeFileSync(join(dossier, DOSSIER_GESTES, 'heures_par_agent.yaml'), JSON.stringify(GESTE))
    if (verifie) {
      const j = new Journal(join(dossier, 'journal.sqlite'))
      j.ecrire([
        {
          type: TYPE_GESTE_APPRIS,
          client: 'client fictif (sécurité privée)',
          objet: GESTE.id,
          issue: ISSUE_GESTE.verifie,
          donnees: { jeton, ecarts: [], traduction: { taux: 0.97, atteint: true, cout_usd: 0.15 } },
        },
      ])
      j.fermer()
    }
    return dossier
  }
  /** Le statut et la validation du fichier, relus par le moteur. */
  const fichier = (dossier: string) => {
    const [lu] = lireFichiersGestes(dossier)
    return { statut: lu?.contenu?.statut, validation: lu?.contenu?.validation }
  }

  it('la liste est au patron seul ; un geste vérifié avec modèle au seuil est activable, sinon la liste dit pourquoi', async () => {
    const a = app([], copieAvecGeste(true))
    expect((await lire(a, '/api/gestes', { role: 'agent', agent: 'A-2' })).status).toBe(403)
    const r = await lire(a, '/api/gestes')
    expect(r.status).toBe(200)
    const [g] = (await r.json()) as GesteListe[]
    expect(g).toMatchObject({
      fichier: 'heures_par_agent.yaml',
      id: 'heures_par_agent',
      statut: 'propose',
      tests: 3,
      activable: true,
      verification: { ecarts: [], traduction: { taux: 0.97, atteint: true } },
    })
    const [sans] = (await (
      await lire(app([], copieAvecGeste(false)), '/api/gestes')
    ).json()) as GesteListe[]
    expect(sans).toMatchObject({ activable: false, motif: 'jamais vérifié' })
  })
  it('activer : le patron seul, « par » est son identité vérifiée ; le YAML passe actif, la ligne activé est au journal ; une seconde fois, 400', async () => {
    const dossier = copieAvecGeste(true)
    const a = app([], dossier)
    expect(
      (
        await poster(a, '/api/gestes/activer', {
          identite: { role: 'agent', agent: 'A-2' },
          id: 'x',
        })
      ).status,
    ).toBe(403)
    expect((await poster(a, '/api/gestes/activer', { identite: PATRON })).status).toBe(400)
    const r = await poster(a, '/api/gestes/activer', { identite: PATRON, id: 'heures_par_agent' })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      fichier: join(DOSSIER_GESTES, 'heures_par_agent.yaml'),
      jeton,
    })
    expect(fichier(dossier)).toEqual({
      statut: 'actif',
      validation: { par: 'patron', le: '2026-10-10', jeton },
    })
    const activee = journalDe(dossier).find(
      (l) => l.type === TYPE_GESTE_APPRIS && l.issue === ISSUE_GESTE.active,
    )
    expect(activee?.horodatage).toBe('2026-10-10T19:40:00Z')
    expect(JSON.parse(activee?.donnees ?? '{}')).toMatchObject({ jeton, par: 'patron' })
    const encore = await poster(a, '/api/gestes/activer', {
      identite: PATRON,
      id: 'heures_par_agent',
    })
    expect(encore.status).toBe(400)
    expect(((await encore.json()) as { erreur: string }).erreur).toBe(
      'heures_par_agent.yaml : déjà actif',
    )
    const [g] = (await (await lire(a, '/api/gestes')).json()) as GesteListe[]
    expect(g).toMatchObject({ statut: 'actif', activable: false, validation: { par: 'patron' } })
  })
  it('activer un geste jamais vérifié : 400, rien n’est écrit', async () => {
    const dossier = copieAvecGeste(false)
    const r = await poster(app([], dossier), '/api/gestes/activer', {
      identite: PATRON,
      id: 'heures_par_agent',
    })
    expect(r.status).toBe(400)
    expect(((await r.json()) as { erreur: string }).erreur).toBe(
      'heures_par_agent.yaml : jamais vérifié',
    )
    expect(fichier(dossier)).toEqual({ statut: 'propose', validation: undefined })
  })
  it('retirer : un motif est exigé ; le YAML passe retiré, la ligne retiré porte le motif et « par »', async () => {
    const dossier = copieAvecGeste(true)
    const a = app([], dossier)
    const sansMotif = await poster(a, '/api/gestes/retirer', {
      identite: PATRON,
      id: 'heures_par_agent',
    })
    expect(sansMotif.status).toBe(400)
    expect(((await sansMotif.json()) as { erreur: string }).erreur).toBe('motif attendu')
    const r = await poster(a, '/api/gestes/retirer', {
      identite: PATRON,
      id: 'heures_par_agent.yaml',
      motif: 'trop large',
    })
    expect(r.status).toBe(200)
    expect(fichier(dossier)).toEqual({ statut: 'retire', validation: undefined })
    const retiree = journalDe(dossier).find(
      (l) => l.type === TYPE_GESTE_APPRIS && l.issue === ISSUE_GESTE.retire,
    )
    expect(retiree?.motif).toBe('trop large')
    expect(JSON.parse(retiree?.donnees ?? '{}')).toMatchObject({ jeton, par: 'patron' })
    const [g] = (await (await lire(a, '/api/gestes')).json()) as GesteListe[]
    expect(g).toMatchObject({ statut: 'retire', activable: false })
  })
  it('la page a l’onglet « Appris »', async () => {
    expect(await (await app().request('/')).text()).toContain("Ce que l'outil a appris")
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
    expect(premiere.reponse.texte).toContain('Je propose Julien Lefèvre')
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
        attendAgents: [{ agent: 'A-2', nom: 'Julien Lefèvre' }],
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
