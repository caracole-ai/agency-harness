// L'interface (démo) : la page et ses routes JSON, sur le dossier
// d'un client. Chaque route passe d'abord la porte (le registre d'accès,
// REFLEXIONS.md (2026-10-08)) ; ensuite seulement, une session est ouverte et fermée
// dans un `finally` : rouvrir est la façon simple de relire le planning après
// une écriture. L'identité est déclarée, pas authentifiée, et la page le dit
// (PLAN-ESPACES.md § 10, D4, D12).
import { fileURLToPath } from 'node:url'
import {
  aCapacite,
  accueillir,
  aParis,
  avecSession,
  type Capacite,
  chargerPersonnes,
  commanderEtLivrer,
  compteursEchappees,
  confirmer,
  coutDuMois,
  demandesAvecEtat,
  ErreurCommande,
  etatVersion,
  FORMAT_INTENTION,
  FUSEAU,
  type Identite,
  IdentiteSchema,
  type IdentiteVerifiee,
  idConversation,
  type Ligne,
  type MetierConversation,
  MOTS_CONTROLE,
  type Modele,
  type Personne,
  rattraperStatuts,
  roleDe,
  type Tableau,
  Temporal,
  TYPE_CONFIRMATION,
  TYPE_CONFIRMATION_ATTENDUE,
  traiterConsigne,
  traiterGeste,
  verifierRegistre,
} from '@harnais/moteur'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'

/** Le dossier servi : `index.html` et `static/`, à côté de ce paquet, quel que soit le dossier de lancement. */
const PUBLIC = fileURLToPath(new URL('../public', import.meta.url))

/** L'interface n'écoute qu'en local. */
export const HOTE = '127.0.0.1'
/** Le port de l'interface, sauf `--port`. */
export const PORT = 3777
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
  demande:
    | { sorte: 'action'; action: string; params: Record<string, unknown> }
    | { sorte: 'reaffectation'; id: string; corrige?: string }
  empreinte: string
}

/** Le métier du dossier, chargé depuis `config.yaml` par `metierDe` (PLAN-METIER-2.md M10). */
type Metier = MetierConversation<unknown>

/** Un métier sans `tableau` n'a ni suggestions, ni accueil, ni textes. */
const SANS_TEXTES: Tableau['textes'] = { suggestions: [], accueil: '', vide: '', conditions: {} }

/** « au patron », « à la cheffe de projet » : à qui une route est réservée, en mots. */
const aQui = (enMots: string) =>
  enMots.startsWith('le ')
    ? `au ${enMots.slice(3)}`
    : enMots.startsWith('les ')
      ? `aux ${enMots.slice(4)}`
      : `à ${enMots}`

/** Tout le planning et tout le journal : des lectures réservées aux rôles qui ont cette capacité. */
function exigerCapacite(m: Metier, identite: IdentiteVerifiee, c: Capacite): void {
  if (aCapacite(m.roles, identite, c)) return
  const roles = m.roles.filter((r) => r.capacites.includes(c)).map((r) => aQui(r.enMots))
  throw new ErreurAcces(roles.length > 0 ? `réservé ${roles.join(' ou ')}` : `réservé : ${c}`)
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

/** Le nom à afficher : le rôle en mots, ou le nom de la personne parmi les noms du métier. Il ne part jamais au modèle. */
function nomDe(m: Metier, s: unknown, identite: Identite): string {
  const role = roleDe(m.roles, identite)
  if (!role.identifie) return role.enMots
  const nom = m.noms(s).find((n) => n.id === identite.personne)?.nom
  if (nom === undefined) throw new Error(`inconnu : ${identite.personne ?? '?'}`)
  return nom
}

/**
 * Les confirmations en attente : la dernière ligne `confirmation_attendue`/`confirmation`
 * de chaque conversation est une attente, sauf une proposition qu'une autre a
 * remplacée (corrigée depuis une autre conversation : son « oui » ne valide plus rien).
 */
function confirmationsEnAttente(m: Metier, s: unknown, lignes: Ligne[]) {
  const dernieres = new Map<string, Ligne>()
  const remplacees = new Set<string>()
  for (const l of lignes) {
    if ((l.type === TYPE_CONFIRMATION_ATTENDUE || l.type === TYPE_CONFIRMATION) && l.objet) {
      dernieres.set(l.objet, l)
    }
    const demande = l.type === TYPE_CONFIRMATION_ATTENDUE ? donnees<Attente>(l)?.demande : undefined
    if (demande?.sorte === 'reaffectation' && demande.corrige) remplacees.add(demande.corrige)
  }
  return [...dernieres.values()]
    .filter((l) => l.type === TYPE_CONFIRMATION_ATTENDUE)
    .reverse()
    .flatMap((l) => {
      const attente = donnees<Attente>(l)
      if (!attente) throw new Error(`ligne ${l.id} : confirmation attendue sans données`)
      if (attente.demande.sorte === 'reaffectation' && remplacees.has(attente.demande.id)) return []
      // Une ligne d'avant porte `identite.agent` (PLAN-METIER-2.md M2) : relue sous les deux graphies.
      const identite = IdentiteSchema.parse(attente.identite)
      return {
        conversation: l.objet,
        identite,
        nom: nomDe(m, s, identite),
        texte: l.motif ?? '',
        empreinte: attente.empreinte,
        sorte: attente.demande.sorte === 'reaffectation' ? 'proposition' : 'action',
        // Les autres choix d'une proposition, chacun un geste à cliquer (PLAN-CHOIX.md, lot 3).
        choix:
          attente.demande.sorte === 'reaffectation'
            ? (m.proposition?.choix?.(s, attente.demande.id) ?? [])
            : [],
        // Le geste qu'attend ce oui : la page y reconnaît la décision déjà cliquée sur une demande.
        ...(attente.demande.sorte === 'action'
          ? { geste: { action: attente.demande.action, params: attente.demande.params } }
          : {}),
        horodatage: l.horodatage,
      }
    })
}

/** L'état de la page : qui peut parler (le registre d'accès), ce qui attend, les règles, les délégations proposées, le coût de l'IA. */
function etat(
  m: Metier,
  s: unknown,
  identite: Identite,
  personnes: Personne[],
  maintenant: Temporal.ZonedDateTime,
  modele: Modele,
) {
  const lignes = m.journal(s).lire()
  const config = m.config(s)
  const ia = coutDuMois(m.journal(s), maintenant.toString().slice(0, 7))
  const tableau = m.tableau?.(s, identite, maintenant)
  return {
    client: m.client(s),
    /** `simulé` en démo sans clé : la page le dit. */
    modele: modele.id,
    consigneMax: CONSIGNE_MAX,
    /** Les échappées des derniers jours, comptées dans le journal par le code : ce que le contrôle des chiffres a relu, retiré, et les abandons. */
    echappees: compteursEchappees(lignes, maintenant),
    /** Ce que la page écrit sous une réponse d'échappée, par valeur de son `controle`. */
    motsControle: MOTS_CONTROLE,
    /** L'heure murale de Paris, `AAAA-MM-JJTHH:MM`. */
    maintenant: maintenant.toPlainDateTime().toString({ smallestUnit: 'minute' }),
    identites: personnes.map((p) =>
      roleDe(m.roles, p).identifie ? { ...p, nom: nomDe(m, s, p) } : p,
    ),
    aValider: {
      confirmations: confirmationsEnAttente(m, s, lignes),
      demandes: tableau?.demandes ?? [],
    },
    regles: (m.registre?.(s).interdits ?? []).map((i) => ({
      id: i.id,
      nom: i.nom,
      interdit: i.interdit,
      statut: i.statut,
      // La politique, en lecture seule : la lecture qui décide, quand le texte en admet plusieurs.
      ...(i.lectures ? { lecture: i.lectures.find((l) => l.reference)?.source } : {}),
    })),
    /** Les lignes en attente d'une réponse, rendues par le métier (la sécurité : les délégations proposées). */
    enAttente: tableau?.enAttente ?? [],
    ia: { coutMois: ia.usd, plafond: config.plafonds.par_mois_usd, appels: ia.appels },
  }
}

/**
 * Sous qui la page s'ouvre : le premier rôle sans identifiant que le métier
 * déclare (la sécurité : le patron) ; sinon la première personne du registre
 * dont le rôle administre (l'agence web : la direction), seule à lire l'état.
 * L'identité est déclarée, pas authentifiée (D12) : « Je suis » en change.
 */
function entree(m: Metier, personnes: Personne[]): Identite {
  const anonyme = m.roles.find((r) => !r.identifie)
  if (anonyme) return { role: anonyme.id }
  const administre = personnes.find((p) => aCapacite(m.roles, p, 'administre'))
  if (!administre) {
    throw new Error(
      "ce métier ne déclare aucun rôle sans identifiant et personne au registre d'accès n'administre : la page ne sait pas sous qui s'ouvrir",
    )
  }
  return administre
}

export function creerApp(options: {
  dossier: string
  maintenant?: string
  modele: Modele
  metier: Metier
  /** L'étiquette de la version qui tourne (son fichier `VERSION`), pour `/api/version`. */
  version?: string
  /** Le début et la fin de chaque requête (PLAN-LIVRAISON.md L8 : le moment calme se mesure ici, requêtes en cours comprises). */
  activite?: { debut: () => void; fin: () => void }
  /**
   * Un client livré : déclenche le rattrapage à part (`pnpm mise-a-jour`),
   * qui tire la file (statuts, missions à pousser) et les versions. Alors
   * l'interface ne lance aucun git : une file injoignable ne la gèle pas.
   */
  rattraper?: () => void
}): Hono {
  const { dossier, modele, metier: m } = options
  const fixe = options.maintenant ? aParis(options.maintenant) : undefined
  /** L'heure de la démo, figée par `--maintenant`, sinon l'heure réelle. */
  const maintenant = () => fixe ?? Temporal.Now.zonedDateTimeISO(FUSEAU)

  /**
   * La porte, avant toute ouverture du dossier : un refus est au journal (le
   * journal seul est ouvert) et rendu en 403. Le registre est relu à chaque
   * requête : retirer quelqu'un vaut tout de suite, sans redémarrer.
   */
  function entrer(demandeur: unknown, conversation?: string): IdentiteVerifiee {
    const accueil = accueillir(m, dossier, {
      demandeur,
      canal: 'web',
      maintenant: maintenant(),
      ...(conversation ? { conversation } : {}),
    })
    if (accueil.sorte === 'refus') throw new ErreurAcces(accueil.motif)
    return accueil.identite
  }

  /** Une session par requête, pour qui a passé la porte : le planning et le journal relus, fermés quoi qu'il arrive. */
  const session = <T>(identite: IdentiteVerifiee, f: (s: unknown) => T | Promise<T>) =>
    avecSession(m, dossier, identite, f)

  // Au démarrage : un dossier illisible, un registre d'accès absent ou qui
  // nomme un agent inconnu arrêtent tout de suite, pas à la première requête.
  const demarrage = m.ouvrir(dossier)
  try {
    verifierRegistre(m, demarrage, chargerPersonnes(dossier, m.roles))
  } finally {
    m.fermer(demarrage)
  }

  const app = new Hono()

  app.onError((erreur, c) => {
    if (erreur instanceof ErreurRequete) return c.json({ erreur: erreur.message }, 400)
    // Un refus de commande (aucune demande, déjà commandé, nom déjà pris…) : la demande, pas le serveur.
    if (erreur instanceof ErreurCommande) return c.json({ erreur: erreur.message }, 400)
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
  app.use('*', async (_c, next) => {
    options.activite?.debut()
    try {
      await next()
    } finally {
      options.activite?.fin()
    }
  })
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
  // Les rôles que le métier déclare, pour le sélecteur « Je suis » : une
  // déclaration du code, lue avant toute porte ; le dossier n'est pas ouvert.
  app.post('/api/roles', (c) => c.json(m.roles))

  // Sous qui la page s'ouvre, avant toute porte comme les rôles : la porte
  // vient ensuite, à la première lecture, au nom de cette identité.
  app.post('/api/entree', (c) => c.json(entree(m, chargerPersonnes(dossier, m.roles))))

  // Ce que le métier dit à celui qui parle : son nom, son accueil, ses
  // suggestions (`Tableau.textes`). Tout rôle qui passe la porte le reçoit ;
  // les demandes et l'attente, elles, ne passent que par /api/etat.
  app.post('/api/tableau', async (c) => {
    const identite = entrer((await lireCorps(c.req.raw)).identite)
    return c.json(
      await session(identite, (s) => {
        const tableau = m.tableau?.(s, identite, maintenant())
        return {
          nom: tableau?.nom ?? nomDe(m, s, identite),
          textes: tableau?.textes ?? SANS_TEXTES,
        }
      }),
    )
  })

  app.post('/api/etat', async (c) => {
    const identite = entrer((await lireCorps(c.req.raw)).identite)
    exigerCapacite(m, identite, 'administre')
    return c.json(
      await session(identite, (s) =>
        etat(m, s, identite, chargerPersonnes(dossier, m.roles), maintenant(), modele),
      ),
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
    exigerCapacite(m, identite, 'administre')
    return c.json(await session(identite, (s) => m.journal(s).lire().slice(-limite).reverse()))
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
    const reponse = await traiterConsigne(m, dossier, modele, {
      identite,
      consigne,
      maintenant: quand,
      conversation,
    })
    return c.json({ conversation, reponse })
  })

  // Un choix offert par le métier sur une proposition, cliqué : le geste sans
  // traduction, par la même suite qu'une consigne traduite (le rôle, les
  // personnes, les contrôles, le « oui ») ; rien qu'une consigne ne pourrait
  // demander. Le libellé est journalisé comme la consigne (PLAN-CHOIX.md, lot 3).
  app.post('/api/geste', async (c) => {
    const corps = await lireCorps(c.req.raw)
    const { libelle, action, params } = corps
    if (typeof libelle !== 'string' || libelle.trim() === '' || libelle.length > CONSIGNE_MAX) {
      throw new ErreurRequete(`libelle attendu : ${CONSIGNE_MAX} caractères au plus`)
    }
    if (typeof action !== 'string' || action === '') throw new ErreurRequete('action attendue')
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      throw new ErreurRequete('params attendus : un objet')
    }
    if (corps.conversation !== undefined && !ID_CONVERSATION.test(String(corps.conversation))) {
      throw new ErreurRequete(`conversation inconnue : ${String(corps.conversation)}`)
    }
    const identite = entrer(corps.identite, corps.conversation as string | undefined)
    const quand = maintenant()
    const conversation = (corps.conversation as string | undefined) ?? idConversation(quand)
    const reponse = await traiterGeste(
      m,
      dossier,
      modele,
      { identite, consigne: libelle.trim(), maintenant: quand, conversation },
      { action, params: params as Record<string, unknown> },
    )
    return c.json({ conversation, reponse })
  })

  // Les demandes sans geste (REFLEXIONS.md, 2026-10-15) : ce que l'outil n'a
  // pas su faire, groupé par intention, chaque commande avec son état
  // (chantier, disponible) ; et la commande du patron (« Créer ce geste ») :
  // la mission écrite par le code chez le client, puis une ligne au journal,
  // aucun modèle. « par » est l'identité vérifiée, jamais un champ du corps.
  app.post('/api/sans-geste', async (c) => {
    const identite = entrer((await lireCorps(c.req.raw)).identite)
    exigerCapacite(m, identite, 'administre')
    return c.json(
      await session(identite, (s) => {
        // Les statuts des chantiers d'abord (PLAN-LIVRAISON.md L7). Livré : le rattrapage à part tire la
        // file et écrit les lignes `chantier` (un seul écrivain) ; la carte suit au rafraîchissement.
        // Non livré : les statuts que `pnpm chantier` écrit à côté des missions, lus ici, sans git.
        if (options.rattraper) {
          options.rattraper()
        } else {
          try {
            const r = rattraperStatuts(m, s, dossier, maintenant())
            for (const p of r.problemes) console.error(`file des missions : ${p}`)
          } catch (erreur) {
            console.error(`file des missions : ${(erreur as Error).message}`)
          }
        }
        return demandesAvecEtat(
          m.journal(s).lire(),
          m.actions.map((a) => a.id),
        )
      }),
    )
  })

  // La version qui tourne et le jour de sa mise à jour (PLAN-LIVRAISON.md L9) : en tête de l'onglet « Gestes ».
  app.post('/api/version', async (c) => {
    const identite = entrer((await lireCorps(c.req.raw)).identite)
    exigerCapacite(m, identite, 'administre')
    return c.json(await session(identite, (s) => etatVersion(m.journal(s).lire(), options.version)))
  })

  app.post('/api/sans-geste/commander', async (c) => {
    const corps = await lireCorps(c.req.raw)
    if (typeof corps.intention !== 'string' || !FORMAT_INTENTION.test(corps.intention)) {
      throw new ErreurRequete('intention attendue : le mot-clé de la demande, en snake_case')
    }
    const intention = corps.intention
    const identite = entrer(corps.identite)
    exigerCapacite(m, identite, 'administre')
    const par: Identite = {
      role: identite.role,
      ...(identite.personne !== undefined ? { personne: identite.personne } : {}),
    }
    const commande = await session(identite, (s) =>
      commanderEtLivrer(m, s, dossier, intention, par, maintenant()),
    )
    // Livré : la mission marquée part par le rattrapage à part, aussitôt (L6).
    options.rattraper?.()
    return c.json(commande)
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
      confirmer(m, s, identite, conversation, empreinte, oui, maintenant()),
    )
    return c.json({ reponse })
  })

  return app
}
