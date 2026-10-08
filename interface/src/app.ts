// L'interface du patron (démo) : la page et ses routes JSON, sur le dossier
// d'un client. Chaque route passe d'abord la porte (le registre d'accès,
// REFLEXIONS.md (2026-10-08)) ; ensuite seulement, une session est ouverte et fermée
// dans un `finally` : rouvrir est la façon simple de relire le planning après
// une écriture. L'identité est déclarée, pas authentifiée, et la page le dit
// (PLAN-ESPACES.md § 10, D4, D12).
import { fileURLToPath } from 'node:url'
import {
  accueillir,
  avecSession,
  chargerPersonnes,
  confirmer,
  coutDuMois,
  FUSEAU,
  type Identite,
  type IdentiteVerifiee,
  idConversation,
  type Ligne,
  type Modele,
  type Personne,
  Temporal,
  TYPE_CONFIRMATION,
  TYPE_CONFIRMATION_ATTENDUE,
  traiterConsigne,
  verifierRegistre,
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
/** Un refus à la porte, ou une route que ce rôle n'ouvre pas : rendu en 403 avec son message. */
class ErreurAcces extends Error {}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))
const donnees = <T>(l: Ligne): T | undefined =>
  l.donnees ? (JSON.parse(l.donnees) as T) : undefined

/** Ce que garde une ligne `confirmation_attendue` (la forme écrite par `traiterConsigne`). */
interface Attente {
  identite: Identite
  demande: { sorte: 'action' | 'reaffectation' }
  empreinte: string
}

/** Tout le planning et tout le journal : des lectures réservées au patron. */
function exigerPatron(identite: IdentiteVerifiee): void {
  if (identite.role !== 'patron') throw new ErreurAcces('réservé au patron')
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

/** L'état de la page : qui peut parler (le registre d'accès), ce qui attend, les règles, les délégations, le coût de l'IA. */
function etat(
  s: Session,
  personnes: Personne[],
  maintenant: Temporal.ZonedDateTime,
  modele: Modele,
) {
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
    identites: personnes.map((p) =>
      p.role === 'patron' ? p : { ...p, nom: s.ctx.agent(p.agent).nom },
    ),
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

  /**
   * La porte, avant toute ouverture du dossier : un refus est au journal (le
   * journal seul est ouvert) et rendu en 403. Le registre est relu à chaque
   * requête : retirer quelqu'un vaut tout de suite, sans redémarrer.
   */
  function entrer(demandeur: unknown, conversation?: string): IdentiteVerifiee {
    const accueil = accueillir(CONVERSATION, dossier, {
      demandeur,
      canal: 'web',
      maintenant: maintenant(),
      ...(conversation ? { conversation } : {}),
    })
    if (accueil.sorte === 'refus') throw new ErreurAcces(accueil.motif)
    return accueil.identite
  }

  /** Une session par requête, pour qui a passé la porte : le planning et le journal relus, fermés quoi qu'il arrive. */
  const session = <T>(identite: IdentiteVerifiee, f: (s: Session) => T | Promise<T>) =>
    avecSession(CONVERSATION, dossier, identite, f)

  // Au démarrage : un dossier illisible, un registre d'accès absent ou qui
  // nomme un agent inconnu arrêtent tout de suite, pas à la première requête.
  const demarrage = CONVERSATION.ouvrir(dossier)
  try {
    verifierRegistre(CONVERSATION, demarrage, chargerPersonnes(dossier))
  } finally {
    CONVERSATION.fermer(demarrage)
  }

  const app = new Hono()

  app.onError((erreur, c) => {
    if (erreur instanceof ErreurRequete) return c.json({ erreur: erreur.message }, 400)
    if (erreur instanceof ErreurAcces) return c.json({ erreur: erreur.message }, 403)
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

  // Les deux lectures sont des POST : l'identité voyage dans un corps JSON,
  // comme pour une consigne, qu'une page tierce ne peut pas envoyer sans
  // pré-vol (un GET avec l'identité dans l'adresse écrirait des refus au
  // journal depuis n'importe quel site).
  app.post('/api/etat', async (c) => {
    const identite = entrer((await lireCorps(c.req.raw)).identite)
    exigerPatron(identite)
    return c.json(
      await session(identite, (s) => etat(s, chargerPersonnes(dossier), maintenant(), modele)),
    )
  })

  app.post('/api/journal', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const brute = c.req.query('limite')
    const limite = brute === undefined ? LIMITE_JOURNAL.defaut : Number(brute)
    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_JOURNAL.max) {
      throw new ErreurRequete(`limite : un entier de 1 à ${LIMITE_JOURNAL.max}`)
    }
    const identite = entrer(corps.identite)
    exigerPatron(identite)
    return c.json(await session(identite, (s) => s.journal.lire().slice(-limite).reverse()))
  })

  app.post('/api/consigne', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const consigne = typeof corps.consigne === 'string' ? corps.consigne.trim() : ''
    if (consigne === '') throw new ErreurRequete('consigne vide')
    if (consigne.length > CONSIGNE_MAX) {
      throw new ErreurRequete(`consigne trop longue : ${CONSIGNE_MAX} caractères au plus`)
    }
    if (corps.conversation !== undefined && !ID_CONVERSATION.test(String(corps.conversation))) {
      throw new ErreurRequete(`conversation inconnue : ${String(corps.conversation)}`)
    }
    const identite = entrer(corps.identite, corps.conversation as string | undefined)
    const quand = maintenant()
    const conversation = (corps.conversation as string | undefined) ?? idConversation(quand)
    // La session s'ouvre dans traiterConsigne, après la traduction : le modèle ne reçoit que la phrase.
    const reponse = await traiterConsigne(CONVERSATION, dossier, modele, {
      identite,
      consigne,
      maintenant: quand,
      conversation,
    })
    return c.json({ conversation, reponse })
  })

  app.post('/api/confirmer', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const { conversation, empreinte, oui } = corps
    if (typeof conversation !== 'string' || typeof empreinte !== 'string') {
      throw new ErreurRequete('conversation et empreinte attendues')
    }
    if (typeof oui !== 'boolean') throw new ErreurRequete('oui attendu : true ou false')
    if (!ID_CONVERSATION.test(conversation)) {
      throw new ErreurRequete(`conversation inconnue : ${conversation}`)
    }
    const identite = entrer(corps.identite, conversation)
    const reponse = await session(identite, (s) =>
      confirmer(CONVERSATION, s, identite, conversation, empreinte, oui, maintenant()),
    )
    return c.json({ reponse })
  })

  return app
}
