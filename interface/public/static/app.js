// L'interface du patron (démo), côté navigateur : appelle les routes JSON du
// serveur et rend leurs textes tels quels, par `textContent` (jamais
// `innerHTML` avec des données). PLAN-ESPACES.md § 10.2.

const API = {
  etat: '/api/etat',
  journal: '/api/journal?limite=200',
  consigne: '/api/consigne',
  confirmer: '/api/confirmer',
}
const FUSEAU = 'Europe/Paris'
const PATRON = { role: 'patron' }
/** Le type de ligne d'un appel au modèle (moteur/src/modele/compteur.ts) : son coût est montré au journal. */
const TYPE_APPEL = 'appel_modele'

/** Des exemples de consignes, à cliquer : pour une démo, ils montrent ce que l'outil comprend. */
const SUGGESTIONS = {
  patron: [
    'Aïcha ne vient pas demain',
    'Montre-moi le planning de Karim cette semaine',
    'Quelles échéances arrivent ?',
    'Lance la veille',
  ],
  agent: ['Mon planning de la semaine', 'Mes titres', 'Je ne pourrai pas venir demain'],
}

/** Les conditions d'une délégation de remplacement, dites en mots (catalogue du métier, veille.ts). */
const CONDITIONS = {
  connait_site: (v) =>
    v ? 'le remplaçant connaît déjà le site' : 'le remplaçant ne connaît pas le site',
  prevenu_avant_heures: (v) => `l'absence est signalée au moins ${v} h avant`,
}

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
  identite: PATRON,
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

const memeIdentite = (a, b) => a.role === b.role && (a.agent ?? null) === (b.agent ?? null)
const cleIdentite = (i) => (i.role === 'patron' ? 'patron' : `agent:${i.agent}`)

function nomDe(identite) {
  if (identite.role === 'patron') return 'Le patron'
  const a = ici.donnees?.identites.find((x) => x.agent === identite.agent)
  return a ? a.nom : identite.agent
}

const conditions = (c) =>
  Object.entries(c ?? {}).map(([k, v]) => (CONDITIONS[k] ? CONDITIONS[k](v) : `${k} : ${v}`))

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
    'Choisissez « le patron » dans « Je suis » pour voir cette partie.',
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
    choix.append(el('option', { value: 'patron', texte: 'le patron' }))
    const agents = el('optgroup', { label: 'Un agent' })
    for (const i of d.identites.filter((x) => x.role === 'agent')) {
      agents.append(el('option', { value: cleIdentite(i), texte: `${i.agent} ${i.nom}` }))
    }
    choix.append(agents)
  }
  choix.value = cleIdentite(ici.identite)
}

function rendreValider() {
  const { confirmations, demandes } = ici.donnees.aValider
  boutons.clear()
  for (const b of fil().querySelectorAll('[data-confirmation]')) {
    boutons.set(b.dataset.confirmation, [...(boutons.get(b.dataset.confirmation) ?? []), b])
  }
  const aDecider = confirmations.length + demandes.filter((d) => d.attendPatron).length
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
        'Une absence déclarée ouvre une demande de remplacement, suivie ici jusqu’au planning mis à jour.',
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
    zoneReponse(conf, c.nom),
  )
}

/** Oui / Non, si la personne choisie est celle à qui la question est posée ; sinon, de quoi changer de personne. */
function zoneReponse(conf, nom) {
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
  )
  boutons.set(cle, [...(boutons.get(cle) ?? []), zone])
  return zone
}

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
      el('time', { datetime: d.horodatage, texte: instant(d.horodatage) }),
    ),
    el('p', { classe: 'texte', texte: d.description }),
    d.etape ? el('p', { classe: 'carte__suite texte', texte: d.etape }) : null,
    d.attendPatron
      ? el(
          'div',
          { classe: 'actions' },
          el('button', {
            classe: 'bouton bouton--outil bouton--petit',
            type: 'button',
            texte: 'Préparer la validation',
            onclick: () => preparer(`Je valide la proposition pour ${d.id}`, PATRON),
          }),
        )
      : null,
    // Pour la démo : se mettre à la place de l'agent sollicité, sa réponse prête dans le champ.
    d.attendAgents.length > 0
      ? el(
          'div',
          { classe: 'actions' },
          ...d.attendAgents.map((a) =>
            el('button', {
              classe: 'bouton bouton--outil bouton--petit',
              type: 'button',
              texte: `Répondre en tant que ${a.nom}`,
              onclick: () =>
                preparer(`Oui, je suis d'accord pour ${d.id}`, { role: 'agent', agent: a.agent }),
            }),
          ),
        )
      : null,
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

function rendreDelegations() {
  const { accordees, proposees } = ici.donnees.delegations
  const zone = [el('h3', { texte: 'Accordées' })]
  if (accordees.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Aucune délégation. ' }),
        'Chaque remplacement passe par vous.',
      ),
    )
  } else {
    zone.push(
      el(
        'ul',
        { classe: 'liste' },
        ...accordees.map((d) =>
          el(
            'li',
            { classe: 'carte' },
            el(
              'div',
              { classe: 'carte__meta' },
              el('span', { classe: 'carte__titre', texte: d.action }),
              el('span', { texte: `accordée le ${jour(d.accordee_le)} par ${d.par}` }),
            ),
            el('p', { classe: 'texte', texte: `Quand ${conditions(d.conditions).join(', et ')}.` }),
          ),
        ),
      ),
    )
  }
  zone.push(el('h3', { texte: 'Proposées par l’outil' }))
  if (proposees.length === 0) {
    zone.push(
      el(
        'p',
        { classe: 'vide' },
        el('b', { texte: 'Aucune proposition. ' }),
        'Après un remplacement réussi que vous avez validé, l’outil propose de le rendre automatique dans les mêmes conditions.',
      ),
    )
  } else {
    zone.push(
      el(
        'ul',
        { classe: 'liste' },
        ...proposees.map((p) =>
          el(
            'li',
            { classe: 'carte' },
            el(
              'div',
              { classe: 'carte__meta' },
              el('span', { classe: 'carte__titre', texte: p.demande }),
              el('span', { texte: p.action }),
              el('time', { datetime: p.horodatage, texte: instant(p.horodatage) }),
            ),
            el('p', { classe: 'texte', texte: p.motif }),
            el(
              'p',
              { classe: 'carte__suite texte' },
              `Conditions : ${conditions(p.conditions).join(' ; ')}.`,
            ),
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

function rafraichir() {
  chargerEtat()
  if (ici.onglet === 'journal') chargerJournal()
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
    corps.append(zoneReponse(attente, nomDe(conf.identite)))
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
  bulleOutil(
    {
      sorte: 'resultat',
      texte:
        ici.identite.role === 'patron'
          ? 'Bonjour. Dites-moi ce qui se passe, avec vos mots : une absence, un planning à voir, une échéance.\nCe qui touche au planning attend toujours votre oui.'
          : `Bonjour ${nomDe(ici.identite).split(' ')[0]}. Vous pouvez voir votre planning, vos titres, déclarer une absence ou répondre à une demande.`,
    },
    {},
  )
}

function rendreSuggestions() {
  $('suggestions').replaceChildren(
    ...SUGGESTIONS[ici.identite.role].map((s) =>
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
  const cle = `${conf.conversation}|${conf.empreinte}`
  for (const zone of boutons.get(cle) ?? []) {
    zone.replaceWith(
      el('p', {
        classe: 'repondu',
        texte: `Réponse : ${oui ? 'oui' : 'non'}${refusee ? ', refusée' : ''}`,
      }),
    )
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

function changerIdentite(identite) {
  if (memeIdentite(identite, ici.identite)) return
  ici.identite = identite
  ici.conversation = undefined
  ici.attente = null
  $('identite').value = cleIdentite(identite)
  note(
    identite.role === 'patron'
      ? 'Vous parlez maintenant en tant que patron. Nouvelle conversation.'
      : `Vous parlez maintenant en tant que ${nomDe(identite)} (${identite.agent}). Nouvelle conversation.`,
  )
  accueil()
  rendreSuggestions()
  rafraichir()
}

/** Met une consigne dans le champ, au nom de cette identité, sans l'envoyer : on la relit d'abord. */
function preparer(texte, identite) {
  changerIdentite(identite)
  const champ = $('consigne')
  champ.value = texte
  ajuster()
  champ.focus()
}

function ajuster() {
  const champ = $('consigne')
  champ.style.height = 'auto'
  champ.style.height = `${champ.scrollHeight + 2}px`
}

// ---------- démarrage ----------

function demarrer() {
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
  $('identite').addEventListener('change', (e) => {
    const v = e.target.value
    changerIdentite(v === 'patron' ? PATRON : { role: 'agent', agent: v.slice('agent:'.length) })
  })
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
  rendreSuggestions()
  chargerEtat().then(() => {
    if (fil().children.length === 0) accueil()
  })
}

demarrer()
