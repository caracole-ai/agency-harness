// L'interface (démo), côté navigateur : appelle les routes JSON du
// serveur et rend leurs textes tels quels, par `textContent` (jamais
// `innerHTML` avec des données). PLAN-ESPACES.md § 10.2.

const API = {
  roles: '/api/roles',
  entree: '/api/entree',
  tableau: '/api/tableau',
  etat: '/api/etat',
  journal: '/api/journal?limite=200',
  consigne: '/api/consigne',
  confirmer: '/api/confirmer',
  geste: '/api/geste',
  sansGeste: '/api/sans-geste',
  commanderGeste: '/api/sans-geste/commander',
  detailGeste: '/api/sans-geste/detail',
  version: '/api/version',
}
const FUSEAU = 'Europe/Paris'
/** Le type de ligne d'un appel au modèle (moteur/src/modele/compteur.ts) : son coût est montré au journal. */
const TYPE_APPEL = 'appel_modele'
/** Les statuts d'un chantier que la carte dit à sa façon (`STATUTS_CHANTIER`, moteur/src/chantier/mission.ts ; PLAN-LIVRAISON.md L7). */
const FUSIONNE = 'fusionné'
const EN_COURS = 'en cours'
const EN_ATTENTE = 'en attente'
/** Les autres fins d'un chantier, en mots pour le patron (`STATUTS_CHANTIER`). */
const FINS_CHANTIER = {
  refusé:
    'Le harnais n’a pas réussi à le coder sous ses contrôles : rien n’a changé dans votre outil.',
  écartée: 'L’agence ne l’a pas lancé : un geste de ce nom existe déjà, ou il a été retiré.',
  échoué: 'Le chantier s’est arrêté sur une erreur : rien n’a changé dans votre outil.',
  retiré: 'Le geste a été retiré de votre outil ; il ne sera pas refait.',
}

/** Comment montrer chaque sorte de réponse. */
const SORTES = {
  confirmation: { libelle: 'À confirmer', classe: 'pastille--outil' },
  proposition: { libelle: 'Proposition', classe: 'pastille--outil' },
  refus: { libelle: 'Refusé', classe: 'pastille--refus' },
  je_ne_sais_pas: { libelle: 'Je ne sais pas', classe: 'pastille--doute' },
  precision: { libelle: 'À préciser', classe: 'pastille--doute' },
}

/** Les types du journal dont le nom n'est pas déjà des mots (les autres le sont : « geste commandé », « alerte »…). */
const TYPES_LISIBLES = {
  appel_modele: 'appel à l’IA',
  confirmation_attendue: 'oui attendu',
  outil_echappee: 'recherche de l’IA',
  precision_attendue: 'précision demandée',
  echappee: 'question libre',
  reaffectation: 'réaffectation',
  alerte: 'échéance',
  constat: 'contrôle de la veille',
}
/** Le niveau d'une échéance et le verdict d'un contrôle, en mots (les parties du rapport de veille). */
const NOTES_VEILLE = {
  alerte: { escalade: 'à traiter maintenant', alerte: 'à préparer' },
  constat: { refus: 'à corriger', 'à vérifier': 'à décider', ok: 'conforme' },
}
/**
 * La sorte d'une ligne du journal, en couleur, pour lire et filtrer : les types du moteur rangés par
 * sorte ; tout autre type (ceux d'un métier : absence, remplacement, message…) est une action.
 */
const SORTES_JOURNAL = [
  { id: 'demande', libelle: 'Demande', types: ['consigne', 'accès refusé'] },
  { id: 'reponse', libelle: 'Réponse', types: ['confirmation'] },
  { id: 'attente', libelle: 'En attente', types: ['confirmation_attendue', 'precision_attendue'] },
  {
    id: 'question',
    libelle: 'Question libre',
    types: ['echappee', 'outil_echappee', 'proposition refusée'],
  },
  { id: 'echeance', libelle: 'Échéance', types: ['alerte'] },
  { id: 'veille', libelle: 'Veille', types: ['constat', 'veille'] },
  {
    id: 'outil',
    libelle: 'Outil',
    types: ['geste commandé', 'chantier', 'mise à jour', 'délégation proposée'],
  },
  { id: 'ia', libelle: 'IA', types: ['appel_modele'] },
]
const SORTE_ACTION = { id: 'action', libelle: 'Action' }
const sorteJournal = (l) => SORTES_JOURNAL.find((s) => s.types.includes(l.type)) ?? SORTE_ACTION
/** Combien de tags une dimension montre avant « + N autres ». */
const TAGS_MONTRES = 6
/** Les dimensions des tags du journal, dans l'ordre où elles s'affichent. */
const FACETTES = [
  { id: 'sorte', libelle: 'Sorte' },
  { id: 'qui', libelle: 'Qui' },
  { id: 'etat', libelle: 'État' },
]

/** Les lignes techniques du journal : montrées sur demande seulement. */
const TYPES_TECHNIQUES = new Set([TYPE_APPEL, 'outil_echappee'])
/** L'issue d'une question libre, en mots. */
const ISSUES_ECHAPPEE = {
  reponse: 'réponse donnée',
  proposition: 'proposition faite',
  abandon: 'pas de réponse trouvée',
}

const ici = {
  /** Le dernier état reçu de `/api/etat`. */
  donnees: null,
  /** Les rôles déclarés par le métier (`/api/roles`) : le sélecteur « Je suis », et qui parle. */
  roles: [],
  /** Ce que le métier dit à la personne choisie (`/api/tableau`) : son accueil, ses suggestions (PLAN-METIER-2.md § 3.6). */
  tableau: null,
  /** Le premier rôle déclaré sans identifiant, choisi au démarrage. */
  identite: null,
  /** La conversation en cours ; absente, le serveur en ouvre une. */
  conversation: undefined,
  /** La dernière confirmation sans réponse de la conversation en cours : un « oui » tapé y répond. */
  attente: null,
  occupe: false,
  onglet: 'valider',
  /** Le journal montre aussi les lignes techniques (appels à l'IA, recherches). */
  journalTechnique: false,
  /** Les tags choisis du journal, par dimension (`FACETTES`) : « ou » dans une dimension, « et » entre elles. */
  journalFiltres: { sorte: new Set(), qui: new Set(), etat: new Set() },
  /** Les dimensions du journal dont tous les tags sont montrés (sinon les plus fréquents). */
  journalDeplies: new Set(),
  /** Ce qui est tapé dans la recherche du journal. */
  journalRecherche: '',
  /** Le geste dont le volet montre le détail : une réponse arrivée pour un autre est ignorée. */
  voletGeste: null,
  /** Le bouton qui a ouvert le volet : il reprend le focus à la fermeture. */
  voletOuvreur: null,
  /** Les dernières lignes du journal lues : le volet de détail y retrouve une action. */
  journal: [],
  /** Combien de fois chaque relevé de veille montré l'a été (`cleReleve`) : la liste n'en garde qu'un. */
  releves: new Map(),
  /** Les replis ouverts d'une carte (`demande|titre`) : un rafraîchissement les rend ouverts. */
  replisOuverts: new Set(),
}
/** Les boutons Oui / Non montrés pour une confirmation, où qu'ils soient : `conversation|empreinte` → conteneurs. */
const boutons = new Map()

const $ = (id) => document.getElementById(id)

/** Un élément, ses attributs, ses enfants (les textes deviennent des nœuds texte). */
function el(tag, attributs = {}, ...enfants) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attributs)) {
    if (v === undefined || v === null || v === false) continue
    if (k === 'classe') n.className = v
    else if (k === 'texte') n.textContent = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else n.setAttribute(k, v === true ? '' : String(v))
  }
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e)
  return n
}

/** Un appel au serveur ; lève avec un message en français, et le statut HTTP (`statut`). */
async function appeler(url, corps) {
  let r
  try {
    r = await fetch(
      url,
      corps === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corps),
          },
    )
  } catch {
    throw new Error('Le serveur ne répond pas. Vérifiez qu’il est lancé, puis réessayez.')
  }
  let json
  try {
    json = await r.json()
  } catch {
    throw new Error(`Réponse illisible du serveur (statut ${r.status}).`)
  }
  if (!r.ok) {
    throw Object.assign(new Error(json?.erreur ?? `Erreur du serveur (statut ${r.status}).`), {
      statut: r.status,
    })
  }
  return json
}

// ---------- formats ----------

const formatInstant = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
/** Un horodatage du journal (instant ISO), en heure de Paris : « sam. 10/10 21:40 ». */
const instant = (iso) => (iso ? formatInstant.format(new Date(iso)) : '')

const formatMural = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})
/** L'heure murale de Paris rendue par le serveur (`AAAA-MM-JJTHH:MM`), lue telle quelle. */
const mural = (texte) => formatMural.format(new Date(`${texte}:00Z`))

const dollars = (n) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: n > 0 && n < 0.1 ? 4 : 2 })} $`

const jour = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )

const memeIdentite = (a, b) => a.role === b.role && (a.personne ?? null) === (b.personne ?? null)
/** `role`, ou `role:personne` pour un rôle identifié : la valeur d'une option de « Je suis ». */
const cleIdentite = (i) => (i.personne === undefined ? i.role : `${i.role}:${i.personne}`)
const identiteDe = (cle) => {
  const i = cle.indexOf(':')
  return i < 0 ? { role: cle } : { role: cle.slice(0, i), personne: cle.slice(i + 1) }
}
const roleDe = (identite) => ici.roles.find((r) => r.id === identite.role)
const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1)
/** « le patron » → « patron » : pour « en tant que … ». */
const sansArticle = (texte) => texte.replace(/^(le |la |les |l'|l’)/, '')

function nomDe(identite) {
  const role = roleDe(identite)
  if (!role?.identifie) return majuscule(role?.enMots ?? identite.role)
  const a = ici.donnees?.identites.find((x) => x.personne === identite.personne)
  return a ? a.nom : identite.personne
}

// ---------- l'état : la tête et les onglets ----------

/** Les lectures de tout le planning et du journal passent la porte au nom de la personne choisie : un agent n'y a pas accès. */
async function chargerEtat() {
  try {
    ici.donnees = await appeler(API.etat, { identite: ici.identite })
  } catch (erreur) {
    if (erreur.statut === 403) $('compte-valider').hidden = true
    for (const id of ['valider', 'regles', 'delegations']) {
      $(id).replaceChildren(
        erreur.statut === 403
          ? reserveBloc(erreur.message)
          : erreurBloc(erreur.message, chargerEtat),
      )
    }
    return
  }
  rendreTete()
  rendreValider()
  rendreRegles()
  rendreDelegations()
}

/** Une partie que la personne choisie ne peut pas lire : le refus du serveur, et comment revenir. */
function reserveBloc(message) {
  return el(
    'p',
    { classe: 'vide' },
    el('b', { texte: `Accès refusé : ${message}. ` }),
    `Choisissez ${ici.roles
      .filter((r) => r.capacites.includes('administre'))
      .map((r) => `« ${r.enMots} »`)
      .join(' ou ')} dans « Je suis » pour voir cette partie.`,
  )
}

function erreurBloc(message, reessayer) {
  return el(
    'div',
    { classe: 'erreur', role: 'alert' },
    el('b', { texte: 'Impossible de charger cette partie.' }),
    el('p', { classe: 'texte', texte: message }),
    el(
      'div',
      { classe: 'actions' },
      el('button', {
        classe: 'bouton bouton--outil bouton--petit',
        type: 'button',
        texte: 'Réessayer',
        onclick: reessayer,
      }),
    ),
  )
}

/** `n` et le mot qui le suit, au singulier ou au pluriel. */
const compter = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`

/** Les questions libres des derniers jours, en une phrase pour le patron (`echappees` de `/api/etat`). */
function bilanEchappees(e) {
  if (e.echappees === 0) return `Aucune question libre ces ${e.jours} derniers jours.`
  const parts = [
    e.relues > 0
      ? `${compter(e.relues, 'réponse', 'réponses')} aux chiffres relus par l'outil`
      : null,
    e.propositions > 0 ? compter(e.propositions, 'proposition', 'propositions') : null,
    e.retirees === 0
      ? 'aucune réponse retirée'
      : `${compter(e.retirees, 'réponse retirée', 'réponses retirées')} : un chiffre ne venait pas de vos données, vous avez lu les tableaux`,
    e.abandons > 0
      ? `${compter(e.abandons, 'abandon', 'abandons')} : l'outil n'a pas trouvé de réponse`
      : null,
  ].filter((x) => x !== null)
  return `${compter(e.echappees, 'question libre', 'questions libres')} ces ${e.jours} derniers jours : ${parts.join(' ; ')}.`
}

function rendreTete() {
  const d = ici.donnees
  $('client').textContent = d.client
  document.title = `Votre harnais · ${d.client}`
  $('maintenant').textContent = mural(d.maintenant)
  $('ia-appels').textContent = `IA ce mois · ${d.ia.appels} appel${d.ia.appels > 1 ? 's' : ''}`
  $('ia').textContent = `${dollars(d.ia.coutMois)} sur ${dollars(d.ia.plafond)}`
  $('ia-jauge').style.width = `${Math.min(100, (d.ia.coutMois / d.ia.plafond) * 100)}%`
  $('info-modele').hidden = d.modele !== 'simulé'
  $('modele').textContent = 'simulé (démo sans IA)'
  $('consigne').maxLength = d.consigneMax
  // Les questions libres : leur bilan en tête du journal ; en tête de page, seulement ce qui demande un regard.
  const e = d.echappees
  $('bilan-echappees').textContent = bilanEchappees(e)
  const alertes = [
    e.retirees > 0 ? compter(e.retirees, 'réponse retirée', 'réponses retirées') : null,
    e.abandons > 0 ? compter(e.abandons, 'abandon', 'abandons') : null,
  ].filter((x) => x !== null)
  $('alerte-echappees').hidden = alertes.length === 0
  $('alerte-echappees-texte').textContent = `${alertes.join(' · ')} · voir le journal`

  const choix = $('identite')
  if (choix.options.length === 0) {
    for (const r of ici.roles) {
      if (!r.identifie) {
        choix.append(el('option', { value: r.id, texte: r.enMots }))
        continue
      }
      const groupe = el('optgroup', { label: majuscule(r.enMots) })
      for (const i of d.identites.filter((x) => x.role === r.id)) {
        groupe.append(el('option', { value: cleIdentite(i), texte: `${i.personne} ${i.nom}` }))
      }
      choix.append(groupe)
    }
  }
  choix.value = cleIdentite(ici.identite)
}

function rendreValider() {
  const { confirmations, demandes } = ici.donnees.aValider
  boutons.clear()
  for (const b of fil().querySelectorAll('[data-confirmation]')) {
    boutons.set(b.dataset.confirmation, [...(boutons.get(b.dataset.confirmation) ?? []), b])
  }
  // À décider : chaque oui attendu, et chaque demande dont la décision n'est pas encore cliquée.
  const aDecider =
    confirmations.length +
    demandes.filter((d) => (d.choix ?? []).length > 0 && !decisionCliquee(d)).length
  const compte = $('compte-valider')
  compte.hidden = aDecider === 0
  compte.textContent = String(aDecider)
  compte.setAttribute('aria-label', `${aDecider} à décider`)

  // Rien n'attend : une phrase, et de quoi commencer (les suggestions du métier, envoyées à l'outil).
  if (confirmations.length === 0 && demandes.length === 0) {
    const suggestions = ici.tableau?.textes.suggestions ?? []
    $('valider').replaceChildren(
      el(
        'div',
        { classe: 'vide' },
        el(
          'p',
          {},
          el('b', { texte: 'Rien n’attend votre oui. ' }),
          ici.tableau?.textes.vide ?? '',
        ),
        suggestions.length > 0
          ? el(
              'div',
              { classe: 'actions' },
              ...suggestions.map((s) =>
                el('button', {
                  classe: 'suggestion',
                  type: 'button',
                  texte: s,
                  disabled: ici.occupe,
                  onclick: () => envoyer(s),
                }),
              ),
            )
          : null,
      ),
    )
    return
  }

  // Une section vide ne se montre pas : seul ce qui attend prend la place.
  const zone = []
  if (confirmations.length > 0) {
    zone.push(el('h3', { texte: 'Confirmations en attente' }))
    zone.push(el('ul', { classe: 'liste' }, ...confirmations.map(carteConfirmation)))
  }
  if (demandes.length > 0) {
    zone.push(el('h3', { texte: 'Demandes en cours' }))
    zone.push(el('ul', { classe: 'liste' }, ...demandes.map(carteDemande)))
  }
  $('valider').replaceChildren(...zone)
}

function carteConfirmation(c) {
  // `texte` et `sorte` : ce que « Répondre en tant que X » remontre dans la conversation de la question.
  const conf = {
    conversation: c.conversation,
    empreinte: c.empreinte,
    identite: c.identite,
    texte: c.texte,
    sorte: c.sorte,
  }
  const sorte = c.sorte === 'proposition' ? SORTES.proposition : SORTES.confirmation
  return el(
    'li',
    { classe: 'carte carte--attente' },
    el(
      'div',
      { classe: 'carte__meta' },
      el('span', { classe: `pastille ${sorte.classe}`, texte: sorte.libelle }),
      el('span', { texte: `demandé par ${c.nom}` }),
      el('time', { datetime: c.horodatage, texte: instant(c.horodatage) }),
    ),
    el('p', { classe: 'texte', texte: c.texte }),
    zoneReponse(conf, c.nom, c.choix),
  )
}

/**
 * Oui / Non, et les autres choix d'une proposition (chacun un geste, sans
 * modèle), si la personne choisie est celle à qui la question est posée ;
 * sinon, de quoi changer de personne.
 */
function zoneReponse(conf, nom, choix = []) {
  const cle = `${conf.conversation}|${conf.empreinte}`
  if (!memeIdentite(conf.identite, ici.identite)) {
    return el(
      'div',
      { classe: 'actions' },
      el('span', { classe: 'carte__suite', texte: `La réponse revient à ${nom}.` }),
      el('button', {
        classe: 'bouton bouton--outil bouton--petit',
        type: 'button',
        texte: `Répondre en tant que ${nom}`,
        // La question est posée dans sa conversation : on y passe, avec la question et son Oui / Non.
        onclick: () => changerIdentite(conf.identite, { ...conf, nom, choix }),
      }),
    )
  }
  const zone = el(
    'div',
    { classe: 'actions', 'data-confirmation': cle },
    el('button', {
      classe: 'bouton bouton--oui',
      type: 'button',
      texte: 'Oui',
      onclick: () => repondre(conf, true),
    }),
    el('button', {
      classe: 'bouton bouton--non',
      type: 'button',
      texte: 'Non',
      onclick: () => repondre(conf, false),
    }),
    choix.length > 0
      ? el(
          'div',
          { classe: 'choix', role: 'group', 'aria-label': 'Ou bien' },
          ...choix.map((c) =>
            el('button', {
              classe: 'bouton bouton--outil bouton--petit suggestion',
              type: 'button',
              texte: c.libelle,
              onclick: () => choisir(conf, c),
            }),
          ),
        )
      : null,
  )
  boutons.set(cle, [...(boutons.get(cle) ?? []), zone])
  return zone
}

/**
 * Une demande en cours, telle que le métier la rend (`DemandeTableau`) : son
 * texte dit aussi la dernière étape ; ses décisions, à cliquer. Une décision
 * déjà cliquée dont le oui attend ne se remontre pas : la carte y renvoie.
 */
function carteDemande(d) {
  const choix = d.choix ?? []
  const cliquee = decisionCliquee(d)
  // Lu de haut en bas : ce qu'il faut faire, quand et où, la décision ; le détail en dernier, en petit.
  return el(
    'li',
    { classe: `carte carte--demande${choix.length > 0 ? ' carte--attente' : ''}` },
    el(
      'div',
      { classe: 'carte__meta' },
      el('span', { classe: 'pastille pastille--outil', texte: d.statut }),
      el('span', { texte: `${majuscule(d.sorte)} · ${d.id}` }),
      el('time', { datetime: d.depuis, texte: instant(d.depuis) }),
    ),
    el('h4', { classe: 'demande__titre', texte: d.titre ?? d.id }),
    el('p', { classe: 'texte demande__texte', texte: d.texte }),
    cliquee
      ? el('p', {
          classe: 'carte__suite',
          texte: `« ${cliquee.libelle} » : votre oui est attendu, dans les confirmations ci-dessus.`,
        })
      : choix.length > 0
        ? zoneChoix(choix)
        : null,
    d.replis?.length > 0 ? zoneReplis(d.replis, d.id) : null,
  )
}

/** La décision d'une demande déjà cliquée, dont le oui attend dans les confirmations ; sinon rien. */
const decisionCliquee = (d) =>
  (d.choix ?? []).find((c) =>
    ici.donnees.aValider.confirmations.some((x) => x.geste && memeGeste(x.geste, c)),
  )

/** Deux gestes identiques : la même action, les mêmes paramètres, quel que soit leur ordre. */
const memeGeste = (a, b) => {
  const canon = (p) =>
    JSON.stringify(
      Object.keys(p)
        .sort()
        .map((k) => [k, p[k]]),
    )
  return a.action === b.action && canon(a.params) === canon(b.params)
}

/**
 * Le détail d'une demande ou d'un résultat : une section par repli, fermée ;
 * on l'ouvre pour lire le pourquoi. Sur une carte (`demande`), ce qui est
 * ouvert le reste quand la carte est rendue de nouveau.
 */
function zoneReplis(replis, demande) {
  return el(
    'div',
    { classe: 'replis' },
    ...replis.map((r) => {
      const cle = demande === undefined ? undefined : `${demande}|${r.titre}`
      return el(
        'details',
        {
          classe: 'repli',
          open: r.ouvert === true || (cle !== undefined && ici.replisOuverts.has(cle)),
          ontoggle: (e) => {
            if (cle === undefined) return
            if (e.currentTarget.open) ici.replisOuverts.add(cle)
            else ici.replisOuverts.delete(cle)
          },
        },
        el('summary', { texte: r.titre }),
        el(
          'ul',
          {},
          ...r.lignes.map((l) =>
            el(
              'li',
              {},
              el('span', { classe: 'repli__nom', texte: l.titre }),
              ' ',
              l.detail ? el('span', { classe: 'repli__detail', texte: l.detail }) : null,
            ),
          ),
        ),
      )
    }),
  )
}

/**
 * Les décisions qu'offre le métier, sur une demande ou sous le résultat d'un
 * geste : chacune un geste, cliqué sans modèle ; la première, la décision
 * attendue, en avant. Les mêmes décisions, où qu'elles soient, partagent leur clé.
 */
function zoneChoix(choix) {
  const cle = JSON.stringify(choix)
  const bouton = (c, classe) =>
    el('button', { classe, type: 'button', texte: c.libelle, onclick: () => decider(c, cle) })
  const [principal, ...autres] = choix
  // Des choix nommés (une personne et ses raisons) : la proposition en avant, les autres en lignes.
  if (principal.titre !== undefined) {
    return el(
      'div',
      { classe: 'decision', 'data-choix': cle },
      el(
        'div',
        { classe: 'decision__propose' },
        el(
          'div',
          { classe: 'decision__qui' },
          el('span', { classe: 'etiquette', texte: 'Proposition de l’outil' }),
          ' ',
          el('span', { classe: 'decision__nom', texte: principal.titre }),
          ' ',
          principal.detail
            ? el('span', { classe: 'decision__detail', texte: principal.detail })
            : null,
        ),
        bouton(principal, 'bouton bouton--oui'),
      ),
      autres.length > 0
        ? el(
            'div',
            { classe: 'decision__autres' },
            el('span', { classe: 'etiquette', texte: 'Autres possibles' }),
            el(
              'ul',
              { classe: 'autres' },
              ...autres.map((c) =>
                el(
                  'li',
                  {},
                  el(
                    'button',
                    {
                      classe: 'autre',
                      type: 'button',
                      'aria-label': c.libelle,
                      onclick: () => decider(c, cle),
                    },
                    el('span', { classe: 'autre__nom', texte: c.titre ?? c.libelle }),
                    ' ',
                    c.detail ? el('span', { classe: 'autre__detail', texte: c.detail }) : null,
                    el('span', {
                      classe: 'autre__action',
                      'aria-hidden': 'true',
                      texte: 'Choisir',
                    }),
                  ),
                ),
              ),
            ),
          )
        : null,
    )
  }
  return el(
    'div',
    { classe: 'actions', 'data-choix': cle },
    bouton(principal, 'bouton bouton--oui'),
    autres.length > 0
      ? el(
          'div',
          { classe: 'choix', role: 'group', 'aria-label': 'Ou bien' },
          ...autres.map((c) => bouton(c, 'bouton bouton--outil bouton--petit suggestion')),
        )
      : null,
  )
}

/** Le texte d'un interdit, dont les `**passages**` du registre deviennent du gras : des nœuds, jamais du HTML. */
const avecGras = (texte) =>
  texte.split('**').map((morceau, i) => (i % 2 === 1 ? el('b', { texte: morceau }) : morceau))

/** Le statut d'une règle, dit au patron (`STATUTS`, moteur/src/regles/schema.ts ; GLOSSAIRE, « Statut d'un fait »). */
const STATUTS_REGLE = {
  texte: { libelle: 'texte officiel', classe: '' },
  déclaré: { libelle: 'déclarée par vous', classe: '' },
  constaté: { libelle: 'constatée', classe: '' },
  confirmé: { libelle: 'confirmée', classe: '' },
  hypothèse: { libelle: 'à vérifier', classe: 'pastille--doute' },
}

/** Les règles, une ligne chacune : le nom en avant, son statut en mots ; le texte entier se déplie. */
function rendreRegles() {
  const regles = ici.donnees.regles
  $('regles').replaceChildren(
    el(
      'ul',
      { classe: 'liste liste--serree' },
      ...regles.map((r) => {
        const statut = STATUTS_REGLE[r.statut] ?? { libelle: r.statut, classe: '' }
        return el(
          'li',
          { classe: 'regle' },
          el(
            'div',
            { classe: 'regle__tete' },
            el('span', { classe: 'regle__nom', texte: majuscule(r.nom) }),
            ' ',
            el('span', { classe: `pastille ${statut.classe}`, texte: statut.libelle }),
          ),
          el(
            'details',
            { classe: 'repli regle__detail' },
            el('summary', { texte: 'Lire la règle' }),
            el('p', { classe: 'regle__texte' }, ...avecGras(r.interdit)),
            r.lecture
              ? el('p', { classe: 'regle__lecture', texte: `Lecture qui fait foi : ${r.lecture}` })
              : null,
            el('p', { classe: 'regle__lecture', texte: `Référence ${r.id}` }),
          ),
        )
      }),
    ),
  )
}

/** Les propositions en attente d’une réponse (`Tableau.enAttente`), rendues par le métier : titre, texte, conditions en replis. */
function rendreDelegations() {
  const { enAttente } = ici.donnees
  const zone = [el('h3', { texte: 'Proposées par l’outil' })]
  if (enAttente.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Aucune proposition. ' }),
        'Quand une décision que vous avez validée réussit, l’outil propose de la rendre automatique.',
      ),
    )
  } else {
    zone.push(
      el(
        'ul',
        { classe: 'liste' },
        // Lue comme une demande : ce qui est proposé, d'où ça vient, ses conditions ; sans titre, la première ligne du texte en tient lieu.
        ...enAttente.map((p) => {
          const [premiere = '', ...reste] = p.texte.split('\n')
          const titre = p.titre ?? majuscule(premiere)
          const texte = p.titre === undefined ? reste.join('\n') : p.texte
          return el(
            'li',
            { classe: 'carte carte--demande' },
            el(
              'div',
              { classe: 'carte__meta' },
              el('span', { classe: 'pastille pastille--outil', texte: 'proposée' }),
              el('span', { texte: `Délégation · ${p.id}` }),
              p.depuis ? el('time', { datetime: p.depuis, texte: instant(p.depuis) }) : null,
            ),
            el('h4', { classe: 'demande__titre', texte: titre }),
            texte !== '' ? el('p', { classe: 'texte demande__texte', texte }) : null,
            p.replis?.length > 0 ? zoneReplis(p.replis) : null,
            el('p', {
              classe: 'carte__suite',
              texte:
                'Pour l’accorder : elle s’écrit avec vous dans la configuration, pas depuis cette démo.',
            }),
          )
        }),
      ),
    )
  }
  $('delegations').replaceChildren(...zone)
}

async function chargerJournal() {
  const zone = $('journal')
  if (!zone.querySelector('.journal__outils'))
    zone.replaceChildren(el('p', { classe: 'chargement', texte: 'Chargement…' }))
  let lignes
  try {
    lignes = await appeler(API.journal, { identite: ici.identite })
  } catch (erreur) {
    zone.replaceChildren(
      erreur.statut === 403
        ? reserveBloc(erreur.message)
        : erreurBloc(erreur.message, chargerJournal),
    )
    return
  }
  if (lignes.length === 0) {
    zone.replaceChildren(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Journal vide. ' }),
        'Parlez à l’outil : chaque échange y laisse sa trace.',
      ),
    )
    return
  }
  ici.journal = lignes
  rendreJournal()
}

/**
 * Le journal à l'écran : la recherche et les tags (construits une fois, la
 * saisie garde son focus), puis les lignes qui passent les filtres, par jour,
 * le plus récent d'abord. Chaque veille relève à nouveau les mêmes échéances
 * et les mêmes contrôles : la liste n'en garde que le relevé le plus récent,
 * qui dit combien de fois il l'a été (le volet les montre tous).
 */
function rendreJournal() {
  const zone = $('journal')
  const lignes = ici.journal
  const techniques = lignes.filter((l) => TYPES_TECHNIQUES.has(l.type)).length
  const releves = new Map()
  const montrees = lignes.filter((l) => {
    if (!ici.journalTechnique && TYPES_TECHNIQUES.has(l.type)) return false
    if (!(l.type in NOTES_VEILLE)) return true
    const cle = cleReleve(l)
    releves.set(cle, (releves.get(cle) ?? 0) + 1)
    return releves.get(cle) === 1
  })
  ici.releves = releves
  const entrees = montrees.map(entreeLue)
  if (!zone.querySelector('.journal__outils')) {
    zone.replaceChildren(
      el(
        'div',
        { classe: 'journal__outils' },
        el(
          'label',
          { classe: 'journal__recherche' },
          el('span', { classe: 'sr', texte: 'Chercher dans le journal' }),
          el('input', {
            type: 'search',
            id: 'journal-recherche',
            placeholder: 'Chercher : un nom, un mot, un jour…',
            autocomplete: 'off',
            value: ici.journalRecherche,
            oninput: (e) => {
              ici.journalRecherche = e.currentTarget.value
              rendreJournal()
            },
          }),
        ),
        // Les tags, repliés sous la recherche ; le résumé dit combien sont choisis.
        el(
          'details',
          { classe: 'journal__filtres' },
          el(
            'summary',
            {},
            'Filtres',
            el('span', { classe: 'journal__filtres-etat', id: 'journal-filtres-etat' }),
          ),
          el('div', { classe: 'journal__tags', id: 'journal-tags' }),
        ),
        el('p', { classe: 'journal__compte', id: 'journal-compte', 'aria-live': 'polite' }),
      ),
      el('div', { id: 'journal-lignes' }),
    )
  }
  const filtrees = entrees.filter(passeLesFiltres)
  $('journal-tags').replaceChildren(
    ...FACETTES.map((f) => rangeeDeTags(f, entrees)).filter(Boolean),
    techniques > 0
      ? el(
          'label',
          { classe: 'journal__filtre' },
          el('input', {
            type: 'checkbox',
            checked: ici.journalTechnique,
            onchange: (e) => {
              ici.journalTechnique = e.currentTarget.checked
              rendreJournal()
            },
          }),
          ` Montrer le détail technique (${compter(techniques, 'ligne', 'lignes')} : appels à l’IA, recherches)`,
        )
      : null,
  )
  const choisis = FACETTES.reduce((n, f) => n + ici.journalFiltres[f.id].size, 0)
  $('journal-filtres-etat').textContent = [
    choisis > 0 ? compter(choisis, 'tag choisi', 'tags choisis') : '',
    ici.journalTechnique ? 'détail technique montré' : '',
  ]
    .filter(Boolean)
    .map((t) => ` · ${t}`)
    .join('')
  const filtre = filtreActif()
  $('journal-compte').replaceChildren(
    ...[
      filtre
        ? `${filtrees.length} sur ${compter(entrees.length, 'ligne', 'lignes')}`
        : compter(entrees.length, 'ligne', 'lignes'),
      filtre ? ' · ' : null,
      filtre
        ? el('button', {
            classe: 'journal__effacer',
            type: 'button',
            texte: 'Tout effacer',
            onclick: effacerFiltres,
          })
        : null,
    ].filter(Boolean),
  )
  const jours = []
  for (const e of filtrees) {
    if (jours.at(-1)?.jour !== e.jour) jours.push({ jour: e.jour, entrees: [] })
    jours.at(-1).entrees.push(e)
  }
  $('journal-lignes').replaceChildren(
    ...(filtrees.length === 0
      ? [
          el(
            'p',
            { classe: 'vide' },
            el('b', { texte: 'Aucune ligne ne correspond. ' }),
            'Retirez un tag ou changez la recherche.',
          ),
        ]
      : jours.flatMap(({ jour: j, entrees: es }) => [
          el('h4', { classe: 'journal__jour' }, ...surligner(j, motsCherches())),
          el('ol', { classe: 'journal' }, ...es.map(entreeJournal)),
        ])),
  )
}

/** Une ligne du journal, lue une fois : ce qu'elle dit, ses tags, et le texte où la recherche cherche. */
function entreeLue(l) {
  const lue = lireLigne(l)
  const sorte = sorteJournal(l)
  const d = donneesDe(l)
  const identite = d.identite ?? d.par
  const qui = identite?.role ? nomDe(identite) : ''
  // Le genre sans le mot de la sorte, déjà dit par le badge : « Demande · Le patron » → « Le patron ».
  const [tete, ...reste] = lue.genre.split(' · ')
  const genre = plier(tete) === plier(sorte.libelle) ? reste.join(' · ') : lue.genre
  const jour = jourDuJournal(l.horodatage)
  return {
    l,
    ...lue,
    genre,
    sorte,
    tags: { sorte: sorte.libelle, qui, etat: lue.note ?? '' },
    jour,
    cherche: plier(
      [sorte.libelle, lue.genre, lue.texte, lue.note, qui, l.objet, l.objetEnClair, jour]
        .filter(Boolean)
        .join(' '),
    ),
  }
}

/** Un texte pour comparer : sans accents ni majuscules (« Échéance » se trouve en tapant « echeance »). */
const plier = (texte) =>
  String(texte)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const filtreActif = () =>
  ici.journalRecherche.trim() !== '' || FACETTES.some((f) => ici.journalFiltres[f.id].size > 0)

/** Les mots de la recherche, pliés (`plier`). */
const motsCherches = () => plier(ici.journalRecherche).split(/\s+/).filter(Boolean)

/**
 * Un texte, chaque passage cherché dans un `<mark>` : la comparaison se fait
 * sur le texte plié (sans accents ni majuscules), le surlignage sur le texte
 * tel quel (« aich » surligne « Aïch »). Rend des nœuds à poser dans un élément.
 */
function surligner(texte, mots) {
  if (!texte || mots.length === 0) return [texte]
  // Le texte plié, et pour chacun de ses caractères l'indice du caractère d'origine.
  let plie = ''
  const origine = []
  const caracteres = [...texte]
  let position = 0
  for (const c of caracteres) {
    const p = plier(c)
    for (let k = 0; k < p.length; k++) origine.push(position)
    plie += p
    position += c.length
  }
  origine.push(position)
  const plages = []
  for (const m of mots) {
    for (let i = plie.indexOf(m); i >= 0; i = plie.indexOf(m, i + 1)) {
      // La fin : le caractère d'origine qui suit le dernier caractère trouvé.
      const fin = origine.slice(i + m.length).find((o) => o > origine[i + m.length - 1])
      plages.push([origine[i], fin ?? texte.length])
    }
  }
  if (plages.length === 0) return [texte]
  plages.sort((a, b) => a[0] - b[0])
  const fusion = [plages[0]]
  for (const [debut, fin] of plages.slice(1)) {
    const derniere = fusion.at(-1)
    if (debut <= derniere[1]) derniere[1] = Math.max(derniere[1], fin)
    else fusion.push([debut, fin])
  }
  const noeuds = []
  let curseur = 0
  for (const [debut, fin] of fusion) {
    if (debut > curseur) noeuds.push(texte.slice(curseur, debut))
    noeuds.push(el('mark', { classe: 'surligne', texte: texte.slice(debut, fin) }))
    curseur = fin
  }
  if (curseur < texte.length) noeuds.push(texte.slice(curseur))
  return noeuds
}

/** Chaque mot cherché est dans la ligne ; dans chaque dimension où des tags sont choisis, la ligne en porte un. */
function passeLesFiltres(e) {
  const mots = motsCherches()
  if (!mots.every((m) => e.cherche.includes(m))) return false
  return FACETTES.every((f) => {
    const choisis = ici.journalFiltres[f.id]
    return choisis.size === 0 || choisis.has(e.tags[f.id])
  })
}

function effacerFiltres() {
  for (const f of FACETTES) ici.journalFiltres[f.id].clear()
  ici.journalRecherche = ''
  const saisie = $('journal-recherche')
  if (saisie) saisie.value = ''
  rendreJournal()
}

/**
 * Les tags d'une dimension, avec le nombre de lignes de chacun ; un tag
 * choisi reste montré même sans ligne (après un rafraîchissement). Une
 * dimension à un seul tag et sans choix ne filtrerait rien : elle se tait.
 */
function rangeeDeTags(f, entrees) {
  const comptes = new Map()
  for (const e of entrees) {
    const v = e.tags[f.id]
    if (v) comptes.set(v, (comptes.get(v) ?? 0) + 1)
  }
  const choisis = ici.journalFiltres[f.id]
  for (const v of choisis) if (!comptes.has(v)) comptes.set(v, 0)
  if (comptes.size < 2 && choisis.size === 0) return null
  const tous =
    f.id === 'sorte'
      ? [...SORTES_JOURNAL, SORTE_ACTION].map((s) => s.libelle).filter((v) => comptes.has(v))
      : [...comptes.keys()].sort((a, b) => comptes.get(b) - comptes.get(a) || a.localeCompare(b))
  // Les plus fréquents d'abord ; les autres sur demande, les choisis toujours visibles.
  // Les sortes sont peu nombreuses et en couleur : toujours toutes.
  const deplie = f.id === 'sorte' || ici.journalDeplies.has(f.id) || tous.length <= TAGS_MONTRES + 1
  const ordre = deplie ? tous : tous.filter((v, i) => i < TAGS_MONTRES || choisis.has(v))
  const caches = tous.length - ordre.length
  return el(
    'div',
    { classe: 'tags', role: 'group', 'aria-label': f.libelle },
    el('span', { classe: 'tags__nom', texte: f.libelle }),
    ...ordre.map((v) => {
      const sorte =
        f.id === 'sorte' ? [...SORTES_JOURNAL, SORTE_ACTION].find((s) => s.libelle === v) : null
      return el(
        'button',
        {
          classe: `tag${sorte ? ` tag--${sorte.id}` : ''}`,
          type: 'button',
          'aria-pressed': String(choisis.has(v)),
          onclick: () => {
            if (choisis.has(v)) choisis.delete(v)
            else choisis.add(v)
            rendreJournal()
          },
        },
        v,
        el('span', { classe: 'tag__compte', texte: String(comptes.get(v)) }),
      )
    }),
    caches > 0 ||
      (f.id !== 'sorte' && ici.journalDeplies.has(f.id) && tous.length > TAGS_MONTRES + 1)
      ? el('button', {
          classe: 'tags__plus',
          type: 'button',
          'aria-expanded': String(caches === 0),
          texte: caches > 0 ? `+ ${caches} autres` : 'moins',
          onclick: () => {
            if (ici.journalDeplies.has(f.id)) ici.journalDeplies.delete(f.id)
            else ici.journalDeplies.add(f.id)
            rendreJournal()
          },
        })
      : null,
  )
}

/** Les données d'une ligne du journal, lues ; illisibles ou absentes : rien. */
function donneesDe(l) {
  try {
    return l.donnees ? JSON.parse(l.donnees) : {}
  } catch {
    return {}
  }
}

/** Les clés les plus courantes des données du journal, en mots ; les autres restent telles quelles. */
const CLES_LISIBLES = {
  identite: 'qui',
  role: 'rôle',
  personne: 'personne',
  demande: 'demande',
  sorte: 'sorte',
  action: 'geste',
  params: 'paramètres',
  resultat: 'résultat',
  erreur: 'erreur',
  cout_usd: 'coût ($)',
  resume: 'résumé',
  intention: 'intention',
  statut: 'statut',
  empreinte: 'empreinte',
  modele: 'modèle',
}

/** Les données d'une ligne, à plat et en clair : une ligne par valeur, ses clés jointes (`paramètres · agent`). */
function aPlat(valeur, prefixe = '') {
  if (valeur === null || valeur === undefined) return []
  if (Array.isArray(valeur)) {
    return valeur.every((v) => v === null || typeof v !== 'object')
      ? [[prefixe, valeur.map(enClair).join(', ')]]
      : valeur.flatMap((v, i) => aPlat(v, `${prefixe} · ${i + 1}`))
  }
  if (typeof valeur === 'object') {
    return Object.entries(valeur).flatMap(([k, v]) => {
      const cle = CLES_LISIBLES[k] ?? k
      return aPlat(v, prefixe ? `${prefixe} · ${cle}` : cle)
    })
  }
  return [[prefixe, enClair(valeur)]]
}

/** Une valeur des données ; l'identifiant d'une personne du registre devient son nom, l'identifiant entre parenthèses. */
function enClair(valeur) {
  const texte = String(valeur)
  const personne = ici.donnees?.identites.find((x) => x.personne === texte && x.nom)
  return personne ? `${personne.nom} (${texte})` : texte
}

/** Ce que désigne l'identifiant d'une action : une conversation, une question libre, sinon le genre de ses lignes. */
const sorteDe = (objet, lignes) =>
  /^C-/.test(objet)
    ? 'Conversation'
    : /^E-/.test(objet)
      ? 'Question libre'
      : majuscule(TYPES_LISIBLES[lignes[0]?.type] ?? lignes[0]?.type ?? 'suivi')

/** Les lignes qui se suivent et disent la même chose (une échéance relevée à chaque veille) : une seule, avec ses dates. */
function regrouper(lignes) {
  const groupes = []
  for (const l of lignes) {
    const g = groupes.at(-1)
    if (g && g.l.type === l.type && g.l.issue === l.issue && g.l.motif === l.motif) {
      g.quand.push(l.horodatage)
    } else {
      groupes.push({ l, quand: [l.horodatage] })
    }
  }
  return groupes
}

/**
 * Le volet de détail d'une action du journal : toutes ses lignes, dans
 * l'ordre où elles sont arrivées, techniques comprises ; chacune en clair,
 * puis ses données à plat ; le coût de l'IA au total.
 */
function ouvrirDetail(objet) {
  const lignes = ici.journal.filter((l) => l.objet === objet).reverse()
  const cout = lignes.reduce((s, l) => {
    const c = donneesDe(l).cout_usd
    return s + (l.type === TYPE_APPEL && typeof c === 'number' ? c : 0)
  }, 0)
  // Le titre dit de qui ou de quoi il s'agit ; l'identifiant, en petit, reste pour s'y retrouver.
  const enClair = lignes.find((l) => l.objetEnClair)?.objetEnClair
  const groupes = regrouper(lignes)
  ouvrirVolet(
    sorteDe(objet, lignes),
    enClair ?? objet,
    el('p', {
      classe: 'volet__resume',
      texte: [
        enClair ? objet : null,
        `${compter(lignes.length, 'ligne', 'lignes')} au journal`,
        cout > 0 ? `IA : ${dollars(cout)}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
    el(
      'ol',
      { classe: 'volet__lignes' },
      ...groupes.map(({ l, quand }) => {
        const { genre, texte, note } = lireLigne({ ...l, objetEnClair: undefined })
        const donnees = aPlat(donneesDe(l))
        return el(
          'li',
          { classe: 'volet__ligne' },
          el(
            'p',
            { classe: 'entree__genre' },
            quand.length > 1
              ? `${genre} · ${quand.length} fois, la dernière ${instant(quand.at(-1))}`
              : `${instant(l.horodatage)} · ${genre}`,
            note ? ' ' : null,
            note ? el('span', { classe: 'pastille', texte: note }) : null,
          ),
          texte ? el('p', { classe: 'entree__motif texte', texte }) : null,
          donnees.length > 0
            ? el(
                'dl',
                { classe: 'volet__donnees' },
                ...donnees.flatMap(([k, v]) => [el('dt', { texte: k }), el('dd', { texte: v })]),
              )
            : null,
        )
      }),
    ),
  )
}

/** Le volet de droite, sur une sorte, un titre et un contenu ; à l'ouverture, le focus va à « Fermer ». */
function ouvrirVolet(sorte, titre, ...corps) {
  $('volet-sorte').textContent = sorte
  $('volet-titre').textContent = titre
  $('volet-corps').replaceChildren(...corps)
  const volet = $('volet')
  if (!volet.hidden) return
  ici.voletOuvreur = document.activeElement
  volet.hidden = false
  $('volet-fermer').focus()
}

function fermerDetail() {
  $('volet').hidden = true
  ici.voletGeste = null
  ici.voletOuvreur?.focus()
  ici.voletOuvreur = null
}

const formatJour = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const formatHeure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU,
  hour: '2-digit',
  minute: '2-digit',
})
/** Le jour d'un horodatage du journal, en heure de Paris : « samedi 10 octobre ». */
const jourDuJournal = (iso) => formatJour.format(new Date(iso))

/** Une ligne du journal : son heure ; ce qui s'est passé, en mots, son genre et qui en petit au-dessus. */
/** Ce qui fait d'un relevé de veille le même qu'un autre : la même chose dite sur le même objet. */
const cleReleve = (l) => JSON.stringify([l.type, l.objet, l.issue, l.motif])

function entreeJournal({ l, genre, texte, note, sorte }) {
  const fois = l.type in NOTES_VEILLE ? (ici.releves?.get(cleReleve(l)) ?? 1) : 1
  const mots = motsCherches()
  return el(
    'li',
    { classe: `entree${TYPES_TECHNIQUES.has(l.type) ? ' entree--technique' : ''}` },
    el('time', {
      classe: 'entree__heure',
      datetime: l.horodatage,
      texte: formatHeure.format(new Date(l.horodatage)),
    }),
    el(
      'div',
      { classe: 'entree__corps' },
      el(
        'p',
        { classe: 'entree__genre' },
        el('span', { classe: `badge badge--${sorte.id}` }, ...surligner(sorte.libelle, mots)),
        genre || fois > 1 ? ' ' : null,
        ...surligner(
          fois > 1 ? [genre, `${fois} relevés`].filter(Boolean).join(' · ') : genre,
          mots,
        ),
        note ? ' ' : null,
        note ? el('span', { classe: 'pastille' }, ...surligner(note, mots)) : null,
        l.objet ? ' ' : null,
        l.objet
          ? el(
              'button',
              {
                classe: 'entree__id',
                type: 'button',
                title: 'Voir le détail',
                onclick: () => ouvrirDetail(l.objet),
              },
              ...surligner(l.objet, mots),
            )
          : null,
      ),
      texte ? el('p', { classe: 'entree__motif texte' }, ...surligner(texte, mots)) : null,
    ),
  )
}

/**
 * Ce qu'une ligne dit au patron : son genre (avec qui), son texte, une note
 * courte. L'identifiant de l'action est à part, un lien vers son détail ;
 * une question libre ne montre pas sa consigne pseudonymisée (celle du
 * patron est juste au-dessus).
 */
function lireLigne(l) {
  const d = donneesDe(l)
  const genre = majuscule(TYPES_LISIBLES[l.type] ?? l.type)
  switch (l.type) {
    case 'consigne':
      return {
        genre: `Demande${d.identite ? ` · ${nomDe(d.identite)}` : ''}`,
        texte: l.motif ? `« ${l.motif} »` : '',
        note:
          l.issue === 'refus' || d.erreur ? 'refusée' : l.issue === 'nouvelle' ? 'sans geste' : '',
      }
    case 'confirmation':
      return {
        genre: 'Réponse',
        texte: l.issue === 'oui' ? 'Oui' : l.issue === 'non' ? 'Non' : l.issue,
      }
    case 'echappee':
      return { genre, texte: ISSUES_ECHAPPEE[l.issue] ?? l.issue ?? '' }
    case TYPE_APPEL:
      return {
        genre,
        texte: typeof d.cout_usd === 'number' ? `coût : ${dollars(d.cout_usd)}` : '',
      }
    default:
      return {
        // Ce que le métier sait nommer dit de qui ou de quoi il s'agit : « Moussa Diallo — carte professionnelle ».
        genre: l.objetEnClair ? `${genre} · ${l.objetEnClair}` : genre,
        texte: l.motif ?? '',
        // Une issue qui est un identifiant (une action, `valider_remplacement`) ne dit rien au patron.
        note: NOTES_VEILLE[l.type]?.[l.issue] ?? (l.issue && !l.issue.includes('_') ? l.issue : ''),
      }
  }
}

// ---------- ce que l'outil ne sait pas encore faire ----------

/** Les demandes sans geste passent la porte au nom de la personne choisie : réservées au patron, comme le journal. */
async function chargerSansGeste() {
  const zone = $('appris')
  if (!zone.querySelector('.liste, .vide'))
    zone.replaceChildren(el('p', { classe: 'chargement', texte: 'Chargement…' }))
  let sansGeste
  let version
  try {
    sansGeste = await appeler(API.sansGeste, { identite: ici.identite })
    version = await appeler(API.version, { identite: ici.identite })
  } catch (erreur) {
    zone.replaceChildren(
      erreur.statut === 403
        ? reserveBloc(erreur.message)
        : erreurBloc(erreur.message, chargerSansGeste),
    )
    return
  }
  zone.replaceChildren(
    // La version qui tourne (PLAN-LIVRAISON.md L9) : seulement chez un client livré.
    ...(version.version
      ? [
          el('p', {
            classe: 'texte',
            texte: `Version ${version.version}${version.le ? `, mise à jour le ${jour(version.le)}` : ''}.`,
          }),
        ]
      : []),
    el('h3', { texte: 'Demandes sans geste' }),
    sansGeste.length === 0
      ? el(
          'p',
          { classe: 'vide' },
          el('b', { texte: 'Aucune demande sans geste. ' }),
          'Quand l’outil ne sait pas faire une demande, elle apparaît ici ; vous décidez lesquelles deviennent un geste.',
        )
      : el('ul', { classe: 'liste' }, ...sansGeste.map(carteSansGeste)),
  )
  // Le volet ouvert suit la liste (une commande vient d'être passée, un chantier a avancé).
  const ouvert = sansGeste.find((d) => d.intention === ici.voletGeste)
  if (ouvert && !$('volet').hidden) ouvrirGeste(ouvert)
}

/** Qui a commandé : le rôle, et la personne quand le rôle est identifié. */
const quiCommande = (par) => (par.personne ? `${par.role} ${par.personne}` : par.role)

/**
 * Où en est une commande (L7), en un état court et une phrase : en attente
 * de l'agence, chantier en cours ou demain, prêt (mise à jour en
 * préparation), disponible ; sinon le statut du chantier.
 */
function etatCommande(c) {
  if (c.disponible) return { etat: 'disponible', phrase: 'Vous pouvez le demander à l’outil.' }
  const commande = `Commandé le ${jour(c.le)} par ${quiCommande(c.par)}`
  if (!c.chantier)
    return { etat: 'commandé', phrase: `${commande} ; l’agence ne l’a pas commencé.` }
  const { issue, version } = c.chantier
  if (issue === EN_COURS) return { etat: 'en chantier', phrase: `${commande} ; l’agence le code.` }
  if (issue === EN_ATTENTE)
    return { etat: 'commandé', phrase: `${commande} ; le chantier se fera demain.` }
  if (issue === FUSIONNE) {
    return {
      etat: 'disponible en téléchargeant la mise à jour',
      phrase: `${commande} ; il arrive à la prochaine mise à jour${version ? ` (${version})` : ''}.`,
    }
  }
  return { etat: issue, phrase: `${commande} ; chantier du ${jour(c.chantier.le)}.` }
}

/** Ce qu'une demande sans geste demandait, en mots : son dernier résumé, sinon son mot-clé. */
const titreSansGeste = (d) => majuscule(d.exemples[0] ?? d.intention)

/** Une demande sans geste : ce qu'elle demandait, combien de fois ; où en est sa commande, ou le bouton pour la commander. */
function carteSansGeste(d) {
  const etat = d.commande ? etatCommande(d.commande) : null
  return el(
    'li',
    { classe: `carte carte--demande${d.commande ? '' : ' carte--attente'}` },
    el(
      'div',
      { classe: 'carte__meta' },
      el('span', {
        classe: `pastille ${etat ? 'pastille--outil' : 'pastille--doute'}`,
        texte: etat ? etat.etat : 'à commander',
      }),
      el('span', {
        texte: `Demandé ${d.compte} fois · la dernière le ${jour(d.derniere)}`,
      }),
      el(
        'button',
        {
          classe: 'carte__detail',
          type: 'button',
          title: 'Le détail de ce geste',
          'aria-label': `Le détail du geste « ${titreSansGeste(d)} »`,
          onclick: () => ouvrirGeste(d),
        },
        el('span', { 'aria-hidden': 'true', texte: 'i' }),
      ),
    ),
    el('h4', { classe: 'demande__titre', texte: titreSansGeste(d) }),
    etat ? el('p', { classe: 'carte__suite', texte: etat.phrase }) : zoneCommande(d),
  )
}

/**
 * Le volet d'un geste, pour le patron : où il en est (les étapes datées),
 * ce qu'il fera, les demandes reçues et ce que l'outil en a fait, ce qui
 * part (ou partira) à l'agence. Le détail vient de `/api/sans-geste/detail`.
 */
async function ouvrirGeste(d) {
  const etat = d.commande ? etatCommande(d.commande) : null
  const sorte = `Geste · ${etat ? etat.etat : 'à commander'}`
  // Un volet déjà ouvert sur ce geste se met à jour sans repasser par « Chargement… ».
  if (ici.voletGeste !== d.intention || $('volet').hidden) {
    ici.voletGeste = d.intention
    ouvrirVolet(sorte, titreSansGeste(d), el('p', { classe: 'chargement', texte: 'Chargement…' }))
  }
  let detail
  try {
    detail = await appeler(API.detailGeste, { identite: ici.identite, intention: d.intention })
  } catch (erreur) {
    if (ici.voletGeste === d.intention)
      ouvrirVolet(
        sorte,
        titreSansGeste(d),
        erreurBloc(erreur.message, () => ouvrirGeste(d)),
      )
    return
  }
  if (ici.voletGeste !== d.intention) return
  ouvrirVolet(
    sorte,
    titreSansGeste(d),
    el('p', { classe: 'volet__resume', texte: resumeGeste(d, detail) }),
    sectionVolet('Où il en est', el('ol', { classe: 'etapes' }, ...etapesGeste(d, detail))),
    detail.mission ? sectionVolet('Ce qu’il fera', ...ceQuIlFera(detail.mission)) : null,
    sectionVolet(
      'Les demandes reçues',
      el('p', {
        classe: 'volet__note',
        texte:
          'En attendant le geste, l’outil répond par une question libre : l’IA cherche dans une copie masquée de vos données, le code relit chaque chiffre.',
      }),
      el('ol', { classe: 'recues' }, ...detail.demandes.map(demandeRecue)),
      detail.compte > detail.demandes.length
        ? el('p', {
            classe: 'volet__note',
            texte: `Et ${compter(detail.compte - detail.demandes.length, 'demande plus ancienne', 'demandes plus anciennes')}.`,
          })
        : null,
    ),
    sectionAgence(d, detail),
  )
}

/** Une partie du volet : un intitulé, puis son contenu. */
const sectionVolet = (titre, ...contenu) =>
  el('section', { classe: 'volet__section' }, el('h3', { texte: titre }), ...contenu)

/** Qui, dans une phrase : la personne par son nom, un rôle sans majuscule (« par le patron »). */
function quiDansPhrase(identite) {
  const nom = nomDe(identite)
  return identite.personne ? nom : nom.charAt(0).toLowerCase() + nom.slice(1)
}

/** Deux jours en une plage : « du 14 au 16 octobre 2026 », le mois et l'année dits une fois s'ils sont communs. */
function plage(debut, fin) {
  if (debut === fin) return `le ${jour(debut)}`
  const memeMois = debut.slice(0, 7) === fin.slice(0, 7)
  return `du ${memeMois ? Number(debut.slice(8, 10)) : jour(debut)} au ${jour(fin)}`
}

/** Combien de fois, quand, par qui : « Demandé 3 fois du 14 au 16 octobre 2026, par Patron et Julien Lefèvre. » */
function resumeGeste(d, detail) {
  const qui = []
  for (const r of detail.demandes) {
    const nom = quiDansPhrase(r.identite)
    if (!qui.includes(nom)) qui.push(nom)
  }
  const quand = plage(detail.premiere, d.derniere)
  // Les plus anciennes ne sont pas lues : leurs auteurs ne sont pas nommés.
  const toutes = detail.compte === detail.demandes.length
  const par =
    qui.length > 0
      ? `, ${toutes ? 'par' : 'les dernières par'} ${qui.join(', ').replace(/, ([^,]*)$/, ' et $1')}`
      : ''
  return `Demandé ${compter(detail.compte, 'fois', 'fois')} ${quand}${par}.`
}

/** L'état d'une étape, dit au lecteur d'écran (la pastille de la frise le montre). */
const ETATS_ETAPE = { fait: 'fait', encours: 'en cours', avenir: 'à venir', arrete: 'arrêté' }

/**
 * Les étapes d'un geste, de la demande à sa mise à disposition : chacune
 * faite, en cours ou à venir, avec sa date ; un chantier qui s'arrête le dit
 * à sa place, et les étapes d'après restent à venir.
 */
function etapesGeste(d, detail) {
  const commande = detail.etapes.find((e) => e.sorte === 'commande')
  const chantiers = detail.etapes.filter((e) => e.sorte === 'chantier')
  const dernier = chantiers.at(-1)
  const debut = chantiers[0]
  const fusion = chantiers.find((e) => e.issue === FUSIONNE)
  const fin = dernier && dernier.issue in FINS_CHANTIER ? dernier : null
  const disponible = d.commande?.disponible === true
  const etapes = [
    { nom: 'Demandé', etat: 'fait', detail: `Pour la première fois le ${jour(detail.premiere)}.` },
    commande
      ? {
          nom: 'Commandé',
          etat: 'fait',
          detail: `Le ${jour(commande.le)} par ${quiDansPhrase(commande.par)}.`,
        }
      : {
          nom: 'Commandé',
          etat: 'encours',
          detail: 'À vous de décider : « Créer ce geste » sur la carte.',
        },
    {
      nom: 'Codé à l’agence',
      ...(fin && !fusion
        ? {
            etat: 'arrete',
            detail: `${majuscule(fin.issue)} le ${jour(fin.le)}. ${FINS_CHANTIER[fin.issue]}`,
          }
        : fusion || disponible
          ? {
              etat: 'fait',
              detail: `Codé et vérifié${fusion ? ` le ${jour(fusion.le)}` : ''}, sous les contrôles du harnais.`,
            }
          : dernier?.issue === EN_ATTENTE
            ? {
                etat: 'encours',
                detail: 'Le chantier se fera demain : l’agence en lance quelques-uns par jour.',
              }
            : debut
              ? {
                  etat: 'encours',
                  detail: `Commencé le ${jour(debut.le)}. Le harnais le code, puis le vérifie.`,
                }
              : commande
                ? { etat: 'encours', detail: 'L’agence ne l’a pas encore commencé.' }
                : {
                    etat: 'avenir',
                    detail: 'Le harnais le code, puis le vérifie sous ses contrôles.',
                  }),
    },
    {
      nom: 'Disponible en téléchargeant la mise à jour',
      ...(fin?.issue === 'retiré'
        ? { etat: 'arrete', detail: `Retiré le ${jour(fin.le)}. ${FINS_CHANTIER.retiré}` }
        : disponible
          ? {
              etat: 'fait',
              detail: fusion?.version ? `Dans la version ${fusion.version}.` : 'Livré.',
            }
          : fusion
            ? {
                etat: 'encours',
                detail: `Il arrive à la prochaine mise à jour${fusion.version ? ` (${fusion.version})` : ''}, installée à un moment calme.`,
              }
            : { etat: 'avenir', detail: 'Il arrive par une mise à jour signée de l’agence.' }),
    },
    disponible && fin?.issue !== 'retiré'
      ? { nom: 'Disponible', etat: 'fait', detail: 'Vous pouvez le demander à l’outil.' }
      : {
          nom: 'Disponible',
          etat: 'avenir',
          detail: 'Ensuite, vous le demandez à l’outil avec vos mots, comme aujourd’hui.',
        },
  ]
  return etapes.map((e) =>
    el(
      'li',
      { classe: `etape etape--${e.etat}` },
      el(
        'p',
        { classe: 'etape__nom' },
        e.nom,
        el('span', { classe: 'sr', texte: ` (${ETATS_ETAPE[e.etat]})` }),
      ),
      el('p', { classe: 'etape__detail', texte: e.detail }),
    ),
  )
}

/** Ce que le geste fera de vos données, et ce qui change par rapport à la question libre. */
const ceQuIlFera = (mission) => [
  el('p', {
    classe: 'texte volet__texte',
    texte: mission.ecrit
      ? 'Il modifiera vos données : chaque modification vous sera proposée, rien ne change sans votre oui.'
      : 'Il lira vos données, sans rien modifier.',
  }),
  el('p', {
    classe: 'texte volet__texte',
    texte:
      'Le code fera le calcul, de la même façon à chaque fois, écrit et testé par l’agence ; l’IA ne fait plus que reconnaître la demande.',
  }),
]

/** Un texte français affiché : l'espace avant « ? ! : ; » devient insécable, le signe ne part pas seul à la ligne. */
const insecable = (texte) => texte.replace(/ ([?!:;])/g, '\u202f$1')

/** Une demande reçue : quand, qui, les mots tapés, et ce que la question libre en a fait. */
const demandeRecue = (r) =>
  el(
    'li',
    { classe: 'recue' },
    el('p', { classe: 'recue__meta', texte: `${instant(r.le)} · ${nomDe(r.identite)}` }),
    el('p', { classe: 'recue__consigne texte', texte: `« ${insecable(r.consigne)} »` }),
    el('span', {
      classe: `pastille${r.echappee === 'abandon' || !r.echappee ? ' pastille--doute' : ''}`,
      texte: r.echappee ? (ISSUES_ECHAPPEE[r.echappee] ?? r.echappee) : 'sans question libre',
    }),
  )

/** Ce qui part à l'agence (commandé) ou partira (à commander) ; ou pourquoi la commande serait refusée. */
function sectionAgence(d, detail) {
  if (detail.refus) {
    return sectionVolet(
      'Si vous le commandez',
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'La commande serait refusée. ' }),
        majuscule(detail.refus.replace(`${d.intention} : `, '')),
      ),
    )
  }
  if (!detail.mission) return null
  return sectionVolet(
    d.commande ? 'Ce qui est parti à l’agence' : 'Ce qui partira à l’agence',
    el('p', {
      classe: 'volet__note',
      texte:
        'Vos demandes, réécrites sans aucun nom : chaque personne y devient son type. L’agence ne reçoit rien d’autre de vos données.',
    }),
    el(
      'ul',
      { classe: 'citations' },
      ...detail.mission.consignes_types.map((c) =>
        el(
          'li',
          { classe: 'citation texte' },
          // Ce qui remplace un nom (`<personne>`) se voit : c'est tout ce que l'agence en saura.
          ...insecable(c)
            .split(/(<[^<>]+>)/)
            .filter(Boolean)
            .map((morceau) =>
              /^<[^<>]+>$/.test(morceau)
                ? el('span', { classe: 'citation__type', texte: morceau.slice(1, -1) })
                : morceau,
            ),
        ),
      ),
    ),
  )
}

/** Commander le geste, après une confirmation à l'écran : la mission est écrite, le harnais la code à l'agence. */
function zoneCommande(d) {
  const zone = el('div', { classe: 'actions' })
  const bouton = (classe, texte, onclick) =>
    el('button', { classe: `bouton ${classe} bouton--petit`, type: 'button', texte, onclick })
  const montrer = (...enfants) => zone.replaceChildren(...enfants.filter(Boolean))
  const initial = () => montrer(bouton('bouton--oui', 'Créer ce geste', confirmer))
  function confirmer() {
    montrer(
      el('p', {
        classe: 'question',
        texte: `Commander le geste « ${titreSansGeste(d)} » ? Le harnais le code à l’agence, sous ses contrôles.`,
      }),
      bouton('bouton--oui', 'Oui, commander', async () => {
        try {
          await appeler(API.commanderGeste, { identite: ici.identite, intention: d.intention })
          montrer(el('p', { classe: 'repondu', texte: 'Commandé.' }))
          chargerSansGeste()
        } catch (erreur) {
          initial()
          zone.prepend(el('p', { classe: 'texte', role: 'alert', texte: erreur.message }))
        }
      }),
      bouton('bouton--non', 'Annuler', initial),
    )
  }
  initial()
  return zone
}

function rafraichir() {
  chargerEtat()
  if (ici.onglet === 'journal') chargerJournal()
  if (ici.onglet === 'appris') chargerSansGeste()
}

// ---------- les onglets ----------

function ouvrirOnglet(vue, focus = false) {
  ici.onglet = vue
  for (const b of document.querySelectorAll('.onglet')) {
    const actif = b.dataset.vue === vue
    b.setAttribute('aria-selected', String(actif))
    b.tabIndex = actif ? 0 : -1
    if (actif && focus) b.focus()
    $(b.getAttribute('aria-controls')).hidden = !actif
  }
  if (vue === 'journal') chargerJournal()
  if (vue === 'appris') chargerSansGeste()
}

// ---------- la conversation ----------

const fil = () => $('fil')

/** Montre le dernier message : en entier s'il tient, sinon depuis son début (une longue réponse se lit d'en haut). */
function ajouter(n) {
  const f = fil()
  f.append(n)
  f.scrollTop = n.offsetHeight > f.clientHeight - 32 ? n.offsetTop - 16 : f.scrollHeight
  return n
}

function bulleClient(texte, identite) {
  return ajouter(
    el(
      'li',
      { classe: 'bulle bulle--client' },
      el(
        'div',
        { classe: 'bulle__qui' },
        el('span', { classe: 'etiquette', texte: nomDe(identite) }),
      ),
      el('div', { classe: 'bulle__corps' }, el('p', { classe: 'texte', texte })),
    ),
  )
}

function bulleOutil(reponse, conf) {
  const sorte = SORTES[reponse.sorte]
  const enAttente = reponse.sorte === 'confirmation' || reponse.sorte === 'proposition'
  // Un résultat en plusieurs lignes : la première est son titre, en avant.
  const [tete, ...suite] = reponse.texte.split('\n')
  const corps = el(
    'div',
    { classe: 'bulle__corps' },
    reponse.sorte === 'resultat' && suite.length > 0
      ? el(
          'p',
          { classe: 'texte' },
          el('span', { classe: 'bulle__tete', texte: tete }),
          `\n${suite.join('\n')}`,
        )
      : el('p', { classe: 'texte', texte: reponse.texte }),
  )
  // Une réponse d'échappée dit ce que le contrôle a fait de ses chiffres : relus, ou résumé retiré.
  if (reponse.controle) {
    corps.append(
      el('p', {
        classe: 'bulle__controle',
        texte: ici.donnees?.motsControle?.[reponse.controle] ?? reponse.controle,
      }),
    )
  }
  // Comme sur la carte : la décision, puis le détail.
  if (reponse.sorte === 'resultat' && reponse.choix?.length > 0) {
    corps.append(zoneChoix(reponse.choix))
  }
  if (reponse.sorte === 'resultat' && reponse.replis?.length > 0) {
    corps.append(zoneReplis(reponse.replis))
  }
  if (enAttente) {
    const attente = { ...conf, empreinte: reponse.empreinte }
    ici.attente = attente
    corps.append(zoneReponse(attente, nomDe(conf.identite), reponse.choix))
  }
  // « Vous parlez de qui ? » : chaque candidat, à cliquer, envoie son nom dans la même conversation.
  if (reponse.sorte === 'precision' && reponse.candidats.length > 0) {
    corps.append(
      el(
        'div',
        { classe: 'actions' },
        ...reponse.candidats.map((c) => {
          // Deux candidats au même nom : l'identifiant les distingue, et c'est lui qui part.
          const homonyme = reponse.candidats.filter((x) => x.nom === c.nom).length > 1
          return el('button', {
            classe: 'bouton bouton--outil bouton--petit suggestion',
            type: 'button',
            texte: homonyme ? `${c.nom} (${c.id})` : c.nom,
            onclick: () => envoyer(homonyme ? c.id : c.nom),
          })
        }),
      ),
    )
  }
  return ajouter(
    el(
      'li',
      { classe: `bulle bulle--outil${enAttente ? ' bulle--attente' : ''}` },
      el(
        'div',
        { classe: 'bulle__qui' },
        el('span', { classe: 'etiquette', texte: 'L’outil' }),
        sorte ? el('span', { classe: `pastille ${sorte.classe}`, texte: sorte.libelle }) : null,
      ),
      corps,
    ),
  )
}

function bulleAttente() {
  return ajouter(
    el(
      'li',
      { classe: 'bulle bulle--outil', 'aria-label': 'L’outil travaille' },
      el('div', { classe: 'bulle__qui' }, el('span', { classe: 'etiquette', texte: 'L’outil' })),
      el(
        'div',
        { classe: 'bulle__corps' },
        el('span', { classe: 'points', 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
        el('span', { classe: 'sr', texte: 'L’outil lit votre consigne…' }),
      ),
    ),
  )
}

function bulleErreur(message) {
  return ajouter(
    el(
      'li',
      { classe: 'bulle bulle--outil bulle--erreur', role: 'alert' },
      el('div', { classe: 'bulle__qui' }, el('span', { classe: 'etiquette', texte: 'Erreur' })),
      el('div', { classe: 'bulle__corps' }, el('p', { classe: 'texte', texte: message })),
    ),
  )
}

const note = (texte) => ajouter(el('li', { classe: 'note', texte }))

function accueil() {
  const texte = ici.tableau?.textes.accueil
  // L'accueil n'est pas un résultat : ses lignes restent au même niveau.
  if (texte) bulleOutil({ sorte: 'accueil', texte }, {})
}

/** Ce que le métier dit à la personne choisie ; une réponse qui arrive après un autre changement de « Je suis » est ignorée. */
async function chargerTableau() {
  const identite = ici.identite
  let tableau = null
  try {
    tableau = await appeler(API.tableau, { identite })
  } catch (erreur) {
    bulleErreur(erreur.message)
  }
  if (identite === ici.identite) ici.tableau = tableau
}

function rendreSuggestions() {
  $('suggestions').replaceChildren(
    ...(ici.tableau?.textes.suggestions ?? []).map((s) =>
      el('button', {
        classe: 'suggestion',
        type: 'button',
        texte: s,
        disabled: ici.occupe,
        onclick: () => envoyer(s),
      }),
    ),
  )
}

function occuper(oui) {
  ici.occupe = oui
  $('envoyer').disabled = oui
  $('envoyer').textContent = oui ? 'Patientez…' : 'Envoyer'
  // Changer de « Je suis » pendant qu'une réponse est en route mêlerait les
  // identités : la réponse reviendrait au nom de l'ancienne.
  $('identite').disabled = oui
  for (const b of document.querySelectorAll(
    '.suggestion, [data-confirmation] button, [data-choix] button',
  ))
    b.disabled = oui
}

/** Les boutons d'une confirmation, partout où ils sont, remplacés par la réponse donnée (et son sort, si elle a été refusée). */
function marquerRepondu(conf, oui, refusee) {
  fermer(conf, `Réponse : ${oui ? 'oui' : 'non'}${refusee ? ', refusée' : ''}`)
}

/** Les boutons d'une confirmation, où qu'ils soient, remplacés par ce qui lui est arrivé. */
function fermer(conf, texte) {
  const cle = `${conf.conversation}|${conf.empreinte}`
  for (const zone of boutons.get(cle) ?? []) {
    zone.replaceWith(el('p', { classe: 'repondu', texte }))
  }
  boutons.delete(cle)
  if (ici.attente && `${ici.attente.conversation}|${ici.attente.empreinte}` === cle)
    ici.attente = null
}

async function envoyer(texte) {
  const consigne = texte.trim()
  if (consigne === '' || ici.occupe) return
  if (ici.attente && /^(oui|non)$/i.test(consigne)) {
    $('consigne').value = ''
    return repondre(ici.attente, consigne.toLowerCase() === 'oui')
  }
  occuper(true)
  const identite = ici.identite
  bulleClient(consigne, identite)
  $('consigne').value = ''
  ajuster()
  const attente = bulleAttente()
  try {
    const r = await appeler(API.consigne, {
      identite,
      consigne,
      ...(ici.conversation ? { conversation: ici.conversation } : {}),
    })
    attente.remove()
    ici.conversation = r.conversation
    bulleOutil(r.reponse, { conversation: r.conversation, identite })
  } catch (erreur) {
    attente.remove()
    bulleErreur(`${erreur.message}\nVotre consigne est remise dans le champ.`)
    $('consigne').value = consigne
    ajuster()
  } finally {
    occuper(false)
    rafraichir()
  }
}

async function repondre(conf, oui) {
  if (ici.occupe) return
  occuper(true)
  bulleClient(oui ? 'Oui' : 'Non', conf.identite)
  const attente = bulleAttente()
  try {
    const { reponse } = await appeler(API.confirmer, {
      identite: conf.identite,
      conversation: conf.conversation,
      empreinte: conf.empreinte,
      oui,
    })
    attente.remove()
    marquerRepondu(conf, oui, reponse.sorte === 'refus')
    bulleOutil(reponse, conf)
  } catch (erreur) {
    attente.remove()
    bulleErreur(erreur.message)
  } finally {
    occuper(false)
    rafraichir()
  }
}

/** Un autre choix d'une proposition, cliqué : le geste part sans modèle, dans la même conversation ; la proposition d'avant est remplacée. */
async function choisir(conf, choix) {
  if (ici.occupe) return
  occuper(true)
  bulleClient(choix.libelle, conf.identite)
  const attente = bulleAttente()
  try {
    const r = await appeler(API.geste, {
      identite: conf.identite,
      conversation: conf.conversation,
      libelle: choix.libelle,
      action: choix.action,
      params: choix.params,
    })
    attente.remove()
    if (r.reponse.sorte === 'proposition') fermer(conf, `Remplacée : ${choix.libelle}`)
    ici.conversation = r.conversation
    bulleOutil(r.reponse, { conversation: r.conversation, identite: conf.identite })
  } catch (erreur) {
    attente.remove()
    bulleErreur(erreur.message)
  } finally {
    occuper(false)
    rafraichir()
  }
}

/**
 * Une décision offerte, cliquée : le geste part sans modèle, dans la
 * conversation en cours ; ce qui écrit attend encore son oui, montré dans le
 * fil et dans « à valider ». Les mêmes décisions, ailleurs, disent le choix fait.
 */
async function decider(choix, cle) {
  if (ici.occupe) return
  occuper(true)
  const identite = ici.identite
  bulleClient(choix.libelle, identite)
  const attente = bulleAttente()
  try {
    const r = await appeler(API.geste, {
      identite,
      ...(ici.conversation ? { conversation: ici.conversation } : {}),
      libelle: choix.libelle,
      action: choix.action,
      params: choix.params,
    })
    attente.remove()
    for (const zone of document.querySelectorAll('[data-choix]')) {
      if (zone.dataset.choix === cle) {
        zone.replaceWith(el('p', { classe: 'repondu', texte: `Choisi : ${choix.libelle}` }))
      }
    }
    ici.conversation = r.conversation
    bulleOutil(r.reponse, { conversation: r.conversation, identite })
  } catch (erreur) {
    attente.remove()
    bulleErreur(erreur.message)
  } finally {
    occuper(false)
    rafraichir()
  }
}

/**
 * Changer de « Je suis ». Sans `question`, une conversation neuve ; avec une
 * question en attente (« Répondre en tant que X »), la conversation où elle
 * est posée continue, et la question revient dans le fil avec son Oui / Non :
 * une question appartient à qui elle a été posée, et se répond là.
 */
async function changerIdentite(identite, question) {
  if (memeIdentite(identite, ici.identite)) return
  ici.identite = identite
  ici.conversation = question?.conversation
  ici.attente = null
  $('identite').value = cleIdentite(identite)
  const role = roleDe(identite)
  const qui = role?.identifie
    ? `${nomDe(identite)} (${identite.personne})`
    : sansArticle(role?.enMots ?? identite.role)
  note(
    question
      ? `Vous parlez maintenant en tant que ${qui}, dans la conversation où la question vous est posée.`
      : `Vous parlez maintenant en tant que ${qui}. Nouvelle conversation.`,
  )
  await chargerTableau()
  if (identite !== ici.identite) return
  if (question) {
    bulleOutil(
      {
        sorte: question.sorte === 'proposition' ? 'proposition' : 'confirmation',
        texte: question.texte,
        empreinte: question.empreinte,
        choix: question.choix,
      },
      { conversation: question.conversation, identite },
    )
  } else {
    accueil()
  }
  rendreSuggestions()
  rafraichir()
}

function ajuster() {
  const champ = $('consigne')
  champ.style.height = 'auto'
  champ.style.height = `${champ.scrollHeight + 2}px`
}

// ---------- démarrage ----------

async function demarrer() {
  for (const b of document.querySelectorAll('.onglet')) {
    b.addEventListener('click', () => ouvrirOnglet(b.dataset.vue))
    b.addEventListener('keydown', (e) => {
      const onglets = [...document.querySelectorAll('.onglet')]
      const i = onglets.indexOf(b)
      const cible =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? onglets[(i + 1) % onglets.length]
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? onglets[(i - 1 + onglets.length) % onglets.length]
            : e.key === 'Home'
              ? onglets[0]
              : e.key === 'End'
                ? onglets.at(-1)
                : null
      if (!cible) return
      e.preventDefault()
      ouvrirOnglet(cible.dataset.vue, true)
    })
  }
  $('rafraichir-journal').addEventListener('click', chargerJournal)
  $('volet-fermer').addEventListener('click', fermerDetail)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('volet').hidden) fermerDetail()
  })
  $('alerte-echappees').addEventListener('click', () => ouvrirOnglet('journal', true))
  $('rafraichir-appris').addEventListener('click', chargerSansGeste)
  $('identite').addEventListener('change', (e) => changerIdentite(identiteDe(e.target.value)))
  $('formulaire').addEventListener('submit', (e) => {
    e.preventDefault()
    envoyer($('consigne').value)
  })
  $('consigne').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      envoyer($('consigne').value)
    }
  })
  $('consigne').addEventListener('input', ajuster)
  try {
    ici.roles = await appeler(API.roles, {})
    // Le serveur dit sous qui entrer : le rôle sans identifiant (la sécurité : le patron), sinon une personne qui administre.
    ici.identite = await appeler(API.entree, {})
  } catch (erreur) {
    bulleErreur(erreur.message)
    return
  }
  await chargerTableau()
  rendreSuggestions()
  chargerEtat().then(() => {
    if (fil().children.length === 0) accueil()
  })
}

demarrer()
