// L'interface du patron (démo) : la page et ses routes JSON, sur le dossier
// d'un client. Une session est ouverte par requête et fermée dans un
// `finally` : rouvrir est la façon simple de relire le planning après une
// écriture. L'identité n'est pas vérifiée, et la page le dit
// (PLAN-ESPACES.md § 10, D4, D12).
import { fileURLToPath } from 'node:url'
import {
  confirmer,
  coutDuMois,
  FUSEAU,
  type Identite,
  idConversation,
  type Ligne,
  type Modele,
  ROLES,
  type Role,
  Temporal,
  TYPE_CONFIRMATION,
  TYPE_CONFIRMATION_ATTENDUE,
  traiterConsigne,
} from '@harnais/moteur'
import {
  agentSollicite,
  aParis,
  attendus,
  CONVERSATION,
  decrire,
  decrireModifications,
  reaffectation,
  reaffectationFinie,
  remplacementFini,
  type Session,
  STATUT,
  STATUT_R,
  statut,
  statutReaffectation,
  TYPE_DELEGATION_PROPOSEE,
  vacationDe,
} from '@harnais/securite-privee'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'

/** Le dossier servi : `index.html` et `static/`, à côté de ce paquet, quel que soit le dossier de lancement. */
const PUBLIC = fileURLToPath(new URL('../public', import.meta.url))

/** L'interface n'écoute qu'en local. */
export const HOTE = '127.0.0.1'
/** Les noms sous lesquels une requête peut arriver : un autre nom est un site tiers qui pointe ici (rebinding DNS). */
const HOTES = new Set([HOTE, 'localhost', '[::1]'])

export const LIMITE_JOURNAL = { defaut: 200, max: 1000 }
/** Une consigne tient en quelques phrases ; au-delà, c'est un document, pas une consigne. */
export const CONSIGNE_MAX = 2000
/** Les identifiants rendus par `idConversation` : `C-20261010T2140-3fa2`. */
const ID_CONVERSATION = /^C-\d{8}T\d{4}-[0-9a-f]{4}$/

/** Une erreur de la requête elle-même : rendue en 400 avec son message. */
class ErreurRequete extends Error {}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))
const donnees = <T>(l: Ligne): T | undefined =>
  l.donnees ? (JSON.parse(l.donnees) as T) : undefined

/** Ce que garde une ligne `confirmation_attendue` (la forme écrite par `traiterConsigne`). */
interface Attente {
  identite: Identite
  demande: { sorte: 'action' | 'reaffectation' }
  empreinte: string
}

/** Une identité reçue du navigateur : sa forme seulement ; son existence se vérifie dans la session. */
function lireIdentite(valeur: unknown): Identite {
  if (typeof valeur !== 'object' || valeur === null) throw new ErreurRequete('identité absente')
  const { role, agent } = valeur as Record<string, unknown>
  if (!ROLES.includes(role as Role)) throw new ErreurRequete(`rôle inconnu : ${String(role)}`)
  if (agent !== undefined && typeof agent !== 'string') {
    throw new ErreurRequete("l'identifiant d'agent doit être un texte")
  }
  return { role: role as Role, ...(agent !== undefined ? { agent } : {}) }
}

/** Lève une erreur de requête si l'identité n'existe pas chez ce client. */
function verifier(s: Session, identite: Identite): void {
  try {
    CONVERSATION.verifierIdentite(s, identite)
  } catch (erreur) {
    throw new ErreurRequete(message(erreur))
  }
}

async function lireCorps(requete: Request): Promise<Record<string, unknown>> {
  // Un corps déclaré autrement (text/plain) s'envoie depuis n'importe quelle page
  // web sans pré-vol : il est refusé ; un POST JSON venu d'ailleurs exige un
  // pré-vol, que rien n'autorise ici.
  if (!/^application\/json\b/i.test(requete.headers.get('content-type') ?? '')) {
    throw new ErreurRequete('le corps de la requête doit être déclaré application/json')
  }
  let corps: unknown
  try {
    corps = await requete.json()
  } catch {
    throw new ErreurRequete('le corps de la requête doit être du JSON')
  }
  if (typeof corps !== 'object' || corps === null) {
    throw new ErreurRequete('le corps de la requête doit être un objet JSON')
  }
  return corps as Record<string, unknown>
}

const nomDe = (s: Session, identite: Identite) =>
  identite.role === 'patron' ? 'le patron' : s.ctx.agent(identite.agent ?? '').nom

/** Les confirmations en attente : la dernière ligne `confirmation_attendue`/`confirmation` de chaque conversation est une attente. */
function confirmationsEnAttente(s: Session, lignes: Ligne[]) {
  const dernieres = new Map<string, Ligne>()
  for (const l of lignes) {
    if ((l.type === TYPE_CONFIRMATION_ATTENDUE || l.type === TYPE_CONFIRMATION) && l.objet) {
      dernieres.set(l.objet, l)
    }
  }
  return [...dernieres.values()]
    .filter((l) => l.type === TYPE_CONFIRMATION_ATTENDUE)
    .reverse()
    .map((l) => {
      const attente = donnees<Attente>(l)
      if (!attente) throw new Error(`ligne ${l.id} : confirmation attendue sans données`)
      return {
        conversation: l.objet,
        identite: attente.identite,
        nom: nomDe(s, attente.identite),
        texte: l.motif ?? '',
        empreinte: attente.empreinte,
        sorte: attente.demande.sorte === 'reaffectation' ? 'proposition' : 'action',
        horodatage: l.horodatage,
      }
    })
}

interface DemandeEnCours {
  id: string
  sorte: 'remplacement' | 'réaffectation'
  statut: string
  /** La demande attend la validation du patron (une proposition de remplaçant). */
  attendPatron: boolean
  /** Les agents dont la réponse est attendue (sollicités, pas encore répondu). */
  attendAgents: { agent: string; nom: string }[]
  description: string
  /** Le motif de la dernière étape : la proposition, le message envoyé… */
  etape: string
  horodatage: string
}

/** Les demandes de remplacement (D-) et de réaffectation (R-) qui ne sont pas finies, les plus récentes d'abord. */
function demandesEnCours(s: Session, lignes: Ligne[]): DemandeEnCours[] {
  const ids = [
    ...new Set(
      lignes
        .map((l) => l.objet)
        .filter((o): o is string => o !== null && (o.startsWith('D-') || o.startsWith('R-'))),
    ),
  ].reverse()
  const derniere = (id: string) => s.journal.historique(id).at(-1)
  const agents = (ids: string[]) => ids.map((agent) => ({ agent, nom: s.ctx.agent(agent).nom }))
  return ids.flatMap((id): DemandeEnCours[] => {
    if (id.startsWith('D-')) {
      const st = statut(s, id)
      if (st === undefined || remplacementFini(s, id)) return []
      return [
        {
          id,
          sorte: 'remplacement',
          statut: st,
          attendPatron: st === STATUT.proposee,
          attendAgents:
            st === STATUT.demandee
              ? agents([agentSollicite(s, id)].filter((a) => a !== undefined))
              : [],
          description: decrire(s.ctx, vacationDe(s, id).id),
          etape: derniere(id)?.motif ?? '',
          horodatage: derniere(id)?.horodatage ?? '',
        },
      ]
    }
    const st = statutReaffectation(s, id)
    if (st === undefined || reaffectationFinie(s, id)) return []
    return [
      {
        id,
        sorte: 'réaffectation',
        statut: st,
        attendPatron: false,
        attendAgents: st === STATUT_R.demandee ? agents(attendus(s, id)) : [],
        description: decrireModifications(s, reaffectation(s, id).modifications),
        etape: derniere(id)?.motif ?? '',
        horodatage: derniere(id)?.horodatage ?? '',
      },
    ]
  })
}

/** L'état de la page : qui peut parler, ce qui attend, les règles, les délégations, le coût de l'IA. */
function etat(s: Session, maintenant: Temporal.ZonedDateTime, modele: Modele) {
  const lignes = s.journal.lire()
  const config = CONVERSATION.config(s)
  const ia = coutDuMois(s.journal, maintenant.toString().slice(0, 7))
  return {
    client: s.config.client,
    /** `simulé` en démo sans clé : la page le dit. */
    modele: modele.id,
    consigneMax: CONSIGNE_MAX,
    /** L'heure murale de Paris, `AAAA-MM-JJTHH:MM`. */
    maintenant: maintenant.toPlainDateTime().toString({ smallestUnit: 'minute' }),
    identites: [
      { role: 'patron' },
      ...s.ctx.planning.agents.map((a) => ({ role: 'agent', agent: a.id, nom: a.nom })),
    ],
    aValider: {
      confirmations: confirmationsEnAttente(s, lignes),
      demandes: demandesEnCours(s, lignes),
    },
    regles: s.registre.interdits.map((i) => ({
      id: i.id,
      nom: i.nom,
      interdit: i.interdit,
      statut: i.statut,
      // La politique, en lecture seule : la lecture qui décide, quand le texte en admet plusieurs.
      ...(i.lectures ? { lecture: i.lectures.find((l) => l.reference)?.source } : {}),
    })),
    delegations: {
      accordees: s.config.delegations ?? [],
      proposees: lignes
        .filter((l) => l.type === TYPE_DELEGATION_PROPOSEE)
        .reverse()
        .map((l) => ({
          demande: l.objet,
          motif: l.motif,
          horodatage: l.horodatage,
          ...donnees<{ action: string; conditions: Record<string, boolean | number> }>(l),
        })),
    },
    ia: { coutMois: ia.usd, plafond: config.plafonds.par_mois_usd, appels: ia.appels },
  }
}

export function creerApp(options: { dossier: string; maintenant?: string; modele: Modele }): Hono {
  const { dossier, modele } = options
  const fixe = options.maintenant ? aParis(options.maintenant) : undefined
  /** L'heure de la démo, figée par `--maintenant`, sinon l'heure réelle. */
  const maintenant = () => fixe ?? Temporal.Now.zonedDateTimeISO(FUSEAU)

  /** Une session par requête : le planning et le journal relus, fermés quoi qu'il arrive. */
  async function avecSession<T>(f: (s: Session) => T | Promise<T>): Promise<T> {
    const s = CONVERSATION.ouvrir(dossier)
    try {
      return await f(s)
    } finally {
      CONVERSATION.fermer(s)
    }
  }

  // Au démarrage : un dossier illisible arrête tout de suite, pas à la première requête.
  CONVERSATION.fermer(CONVERSATION.ouvrir(dossier))

  const app = new Hono()

  app.onError((erreur, c) => {
    if (erreur instanceof ErreurRequete) return c.json({ erreur: erreur.message }, 400)
    // Un refus d'un intergiciel de Hono (csrf : 403) garde son statut.
    if (erreur instanceof HTTPException) return erreur.getResponse()
    console.error(erreur)
    return c.json({ erreur: message(erreur) }, 500)
  })
  app.notFound((c) => c.json({ erreur: `introuvable : ${c.req.path}` }, 404))

  // Les routes JSON ne répondent qu'à la page elle-même : même origine pour
  // tout ce qu'un formulaire ou un fetch sans pré-vol peut envoyer
  // (hono/csrf), et un nom d'hôte local (un site tiers ne peut pas lire le
  // journal par un nom à lui qui pointe sur cette machine).
  app.use('/api/*', csrf())
  app.use('/api/*', async (c, next) => {
    const { hostname } = new URL(c.req.url)
    if (!HOTES.has(hostname)) return c.json({ erreur: `hôte inconnu : ${hostname}` }, 421)
    await next()
  })

  app.get('/', serveStatic({ root: PUBLIC, path: 'index.html' }))
  app.get('/static/*', serveStatic({ root: PUBLIC }))

  app.get('/api/etat', async (c) => c.json(await avecSession((s) => etat(s, maintenant(), modele))))

  app.get('/api/journal', async (c) => {
    const brute = c.req.query('limite')
    const limite = brute === undefined ? LIMITE_JOURNAL.defaut : Number(brute)
    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_JOURNAL.max) {
      throw new ErreurRequete(`limite : un entier de 1 à ${LIMITE_JOURNAL.max}`)
    }
    return c.json(await avecSession((s) => s.journal.lire().slice(-limite).reverse()))
  })

  app.post('/api/consigne', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const identite = lireIdentite(corps.identite)
    const consigne = typeof corps.consigne === 'string' ? corps.consigne.trim() : ''
    if (consigne === '') throw new ErreurRequete('consigne vide')
    if (consigne.length > CONSIGNE_MAX) {
      throw new ErreurRequete(`consigne trop longue : ${CONSIGNE_MAX} caractères au plus`)
    }
    if (corps.conversation !== undefined && !ID_CONVERSATION.test(String(corps.conversation))) {
      throw new ErreurRequete(`conversation inconnue : ${String(corps.conversation)}`)
    }
    const quand = maintenant()
    const conversation = (corps.conversation as string | undefined) ?? idConversation(quand)
    const reponse = await avecSession((s) => {
      verifier(s, identite)
      return traiterConsigne(CONVERSATION, s, modele, {
        identite,
        consigne,
        maintenant: quand,
        conversation,
      })
    })
    return c.json({ conversation, reponse })
  })

  app.post('/api/confirmer', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const identite = lireIdentite(corps.identite)
    const { conversation, empreinte, oui } = corps
    if (typeof conversation !== 'string' || typeof empreinte !== 'string') {
      throw new ErreurRequete('conversation et empreinte attendues')
    }
    if (typeof oui !== 'boolean') throw new ErreurRequete('oui attendu : true ou false')
    const reponse = await avecSession((s) => {
      verifier(s, identite)
      return confirmer(CONVERSATION, s, identite, conversation, empreinte, oui, maintenant())
    })
    return c.json({ reponse })
  })

  return app
}
