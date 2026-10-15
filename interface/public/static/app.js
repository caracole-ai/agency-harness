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
  version: '/api/version',
}
const FUSEAU = 'Europe/Paris'
/** Le type de ligne d'un appel au modèle (moteur/src/modele/compteur.ts) : son coût est montré au journal. */
const TYPE_APPEL = 'appel_modele'
/** Les statuts d'un chantier que la carte dit à sa façon (`STATUTS_CHANTIER`, moteur/src/chantier/mission.ts ; PLAN-LIVRAISON.md L7). */
const FUSIONNE = 'fusionné'
const EN_COURS = 'en cours'
const EN_ATTENTE = 'en attente'

/** Comment montrer chaque sorte de réponse. */
const SORTES = {
  confirmation: { libelle: 'À confirmer', classe: 'pastille--outil' },
  proposition: { libelle: 'Proposition', classe: 'pastille--outil' },
  refus: { libelle: 'Refusé', classe: 'pastille--refus' },
  je_ne_sais_pas: { libelle: 'Je ne sais pas', classe: 'pastille--doute' },
  precision: { libelle: 'À préciser', classe: 'pastille--doute' },
}

const TYPES_LISIBLES = {
  appel_modele: 'appel au modèle',
  confirmation_attendue: 'confirmation attendue',
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
  const aDecider = confirmations.length
  const compte = $('compte-valider')
  compte.hidden = aDecider === 0
  compte.textContent = String(aDecider)
  compte.setAttribute('aria-label', `${aDecider} à décider`)

  const zone = []
  zone.push(el('h3', { texte: 'Confirmations en attente' }))
  if (confirmations.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Rien à confirmer. ' }),
        'Quand l’outil prépare une écriture, elle attend ici votre oui.',
      ),
    )
  } else {
    zone.push(el('ul', { classe: 'liste' }, ...confirmations.map(carteConfirmation)))
  }
  zone.push(el('h3', { texte: 'Demandes en cours' }))
  if (demandes.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Aucune demande en cours. ' }),
        ici.tableau?.textes.vide ?? '',
      ),
    )
  } else {
    zone.push(el('ul', { classe: 'liste' }, ...demandes.map(carteDemande)))
  }
  $('valider').replaceChildren(...zone)
}

function carteConfirmation(c) {
  const conf = { conversation: c.conversation, empreinte: c.empreinte, identite: c.identite }
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
        onclick: () => changerIdentite(conf.identite),
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

/** Une demande en cours, telle que le métier la rend (`DemandeTableau`) : son texte dit aussi la dernière étape. */
function carteDemande(d) {
  return el(
    'li',
    { classe: 'carte' },
    el(
      'div',
      { classe: 'carte__meta' },
      el('span', { classe: 'carte__titre', texte: d.id }),
      el('span', { texte: d.sorte }),
      el('span', { classe: 'pastille pastille--outil', texte: d.statut }),
      el('time', { datetime: d.depuis, texte: instant(d.depuis) }),
    ),
    el('p', { classe: 'texte', texte: d.texte }),
  )
}

/** Le texte d'un interdit, dont les `**passages**` du registre deviennent du gras : des nœuds, jamais du HTML. */
const avecGras = (texte) =>
  texte.split('**').map((morceau, i) => (i % 2 === 1 ? el('b', { texte: morceau }) : morceau))

function rendreRegles() {
  const regles = ici.donnees.regles
  $('regles').replaceChildren(
    el(
      'ul',
      { classe: 'liste liste--serree' },
      ...regles.map((r) =>
        el(
          'li',
          { classe: 'regle' },
          el('span', { classe: 'regle__id', texte: r.id }),
          el(
            'div',
            {},
            el('p', { classe: 'regle__nom', texte: r.nom }),
            el('p', { classe: 'regle__texte' }, ...avecGras(r.interdit)),
            r.lecture
              ? el('p', { classe: 'regle__lecture', texte: `Lecture qui fait foi : ${r.lecture}` })
              : null,
          ),
          el('span', { classe: 'pastille', title: 'statut de la règle', texte: r.statut }),
        ),
      ),
    ),
  )
}

/** Les propositions en attente d'une réponse (`Tableau.enAttente`), dont le texte est rendu par le métier, conditions comprises. */
function rendreDelegations() {
  const { enAttente } = ici.donnees
  const zone = [el('h3', { texte: 'Proposées par l’outil' })]
  if (enAttente.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Aucune proposition. ' }),
        'Après une décision réussie que vous avez validée, l’outil propose de la rendre automatique dans les mêmes conditions.',
      ),
    )
  } else {
    zone.push(
      el(
        'ul',
        { classe: 'liste' },
        ...enAttente.map((p) =>
          el(
            'li',
            { classe: 'carte' },
            el(
              'div',
              { classe: 'carte__meta' },
              el('span', { classe: 'carte__titre', texte: p.id }),
            ),
            el('p', { classe: 'texte', texte: p.texte }),
            el('p', {
              classe: 'carte__suite',
              texte:
                'Elle s’accorde avec vous, dans la configuration : lecture seule dans la démo.',
            }),
          ),
        ),
      ),
    )
  }
  $('delegations').replaceChildren(...zone)
}

async function chargerJournal() {
  const zone = $('journal')
  if (!zone.querySelector('.journal'))
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
  zone.replaceChildren(
    el(
      'ol',
      { classe: 'journal' },
      ...lignes.map((l) =>
        el(
          'li',
          { classe: 'entree' },
          el('time', {
            classe: 'entree__heure',
            datetime: l.horodatage,
            texte: instant(l.horodatage),
          }),
          el(
            'div',
            { classe: 'entree__quoi' },
            el('span', { classe: 'entree__type', texte: TYPES_LISIBLES[l.type] ?? l.type }),
            l.objet ? el('span', { classe: 'entree__objet', texte: l.objet }) : null,
            l.issue ? el('span', { classe: 'pastille', texte: l.issue }) : null,
          ),
          motif(l) ? el('p', { classe: 'entree__motif texte', texte: motif(l) }) : null,
        ),
      ),
    ),
  )
}

/** Le motif d'une ligne ; pour un appel au modèle, son coût. */
function motif(l) {
  if (l.type === TYPE_APPEL && l.donnees) {
    const d = JSON.parse(l.donnees)
    if (typeof d.cout_usd === 'number') return `coût : ${dollars(d.cout_usd)}`
  }
  return l.motif ?? ''
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
}

/** Qui a commandé : le rôle, et la personne quand le rôle est identifié. */
const quiCommande = (par) => (par.personne ? `${par.role} ${par.personne}` : par.role)

/** Où en est une commande (L7) : en attente de l'agence, chantier en cours, fusionné (mise à jour en préparation), disponible ; sinon le statut du chantier. */
function etatCommande(intention, c) {
  if (c.disponible) return `Disponible : le geste ${intention} est dans le catalogue.`
  const commande = `Commandé le ${jour(c.le)} par ${quiCommande(c.par)}.`
  if (!c.chantier) return `${commande} En attente de l’agence.`
  const { issue, version } = c.chantier
  if (issue === EN_COURS) return `${commande} Chantier en cours à l’agence.`
  if (issue === EN_ATTENTE) return `${commande} En attente : le chantier se fera demain.`
  if (issue === FUSIONNE) {
    return `${commande} Fusionné${version ? ` (${version})` : ''} : mise à jour en préparation.`
  }
  return `${commande} Chantier du ${jour(c.chantier.le)} : ${issue}.`
}

/** Une demande sans geste : l'intention, combien de fois, les derniers résumés ; où en est sa commande, ou le bouton pour la commander. */
function carteSansGeste(d) {
  return el(
    'li',
    { classe: `carte${d.commande ? '' : ' carte--attente'}` },
    el(
      'div',
      { classe: 'carte__meta' },
      el('span', { classe: 'carte__titre', texte: d.intention }),
      el('span', { texte: `${d.compte} fois` }),
      el('span', { texte: `dernière le ${jour(d.derniere)}` }),
    ),
    ...d.exemples.map((e) => el('p', { classe: 'texte', texte: `« ${e} »` })),
    d.commande
      ? el('p', { classe: 'repondu', texte: etatCommande(d.intention, d.commande) })
      : zoneCommande(d),
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
        texte: `Commander le geste « ${d.intention} » ? Le harnais le code à l’agence, sous ses contrôles.`,
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
  const corps = el(
    'div',
    { classe: 'bulle__corps' },
    el('p', { classe: 'texte', texte: reponse.texte }),
  )
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
  if (texte) bulleOutil({ sorte: 'resultat', texte }, {})
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
  for (const b of document.querySelectorAll('.suggestion, [data-confirmation] button'))
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

async function changerIdentite(identite) {
  if (memeIdentite(identite, ici.identite)) return
  ici.identite = identite
  ici.conversation = undefined
  ici.attente = null
  $('identite').value = cleIdentite(identite)
  const role = roleDe(identite)
  note(
    role?.identifie
      ? `Vous parlez maintenant en tant que ${nomDe(identite)} (${identite.personne}). Nouvelle conversation.`
      : `Vous parlez maintenant en tant que ${sansArticle(role?.enMots ?? identite.role)}. Nouvelle conversation.`,
  )
  await chargerTableau()
  if (identite !== ici.identite) return
  accueil()
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
