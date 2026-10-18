import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  accueillir,
  aParis,
  CONTROLE_OK,
  chargerPersonnes,
  copieClient,
  type Designable,
  fuites,
  type Identite,
  type IdentiteVerifiee,
  masquerTables,
  masquerTexte,
  modeleSimule,
  motifPourTester,
  quiParle,
  recevoir,
  roleDe,
  type Scripte,
  systemeTraduire,
  TYPE_ACCES_REFUSE,
  TYPE_APPEL,
  TYPE_CONSIGNE,
  TYPE_ECHAPPEE,
  traiterConsigne,
  verifierRegistre,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { TYPE_BROUILLON } from './actions'
import { CONVERSATION, INTENTIONS, type Session } from './conversation'
import { tablesPour } from './copie'
import { DOMAINE } from './domaine'
import { ROLES_DECLARES } from './roles'

// La conversation de l'agence web sur une copie du client fictif (le journal y
// est écrit), avec le modèle simulé (PLAN-METIER-2.md § 7.4) : le registre
// d'accès à cinq rôles, les noms qui ne partent jamais au modèle (M4), une
// conversation complète, les cinq phrases-refus de l'entretien § 12 (11, 13,
// 20 bis, 24, 29), et l'échappée, qui répond et ne propose jamais.

const exemple = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const maintenant = aParis('2026-10-12T10:00')
const session = (): Session => CONVERSATION.ouvrir(copieClient(exemple))
const qui = (role: string, personne: string): Identite => ({ role, personne })
const DIRIGEANT = qui('dirigeant', 'M-01')
const COMMERCIALE = qui('commercial', 'M-02')
const PO = qui('po', 'M-03')
const GRAPHISTE = qui('graphiste', 'M-04')
const BILAL = qui('developpeur', 'M-05')
const TOUS = [DIRIGEANT, COMMERCIALE, PO, GRAPHISTE, BILAL]

function verifiee(dossier: string, demandeur: Identite): IdentiteVerifiee {
  const accueil = recevoir(
    CONVERSATION.roles,
    chargerPersonnes(dossier, CONVERSATION.roles),
    demandeur,
  )
  if (accueil.sorte === 'refus') throw new Error(accueil.motif)
  return accueil.identite
}

let n = 0
/** Un tour, le modèle simulé jouant `pas`. */
async function tour(s: Session, identite: Identite, pas: Scripte[], consigne: string) {
  const modele = modeleSimule(pas)
  const conversation = `C-test-${++n}`
  const r = await traiterConsigne(CONVERSATION, s.dossier, modele, {
    identite: verifiee(s.dossier, identite),
    consigne,
    maintenant,
    conversation,
  })
  return { r, modele, lignes: s.journal.historique(conversation) }
}
const outil = (nom: string, entree: unknown): Scripte => ({ outil: nom, entree })
const nouvelle = (intention: string): Scripte =>
  outil('demande_nouvelle', { intention, resume: 'une demande' })

/**
 * Les mots qui identifient seuls un client du client fictif, écrits à la main
 * depuis `clients.csv` : ses mots propres (une majuscule hors du premier mot,
 * quatre lettres au moins), sauf « Industrie », le secteur de CLI-08.
 */
const MOTS_DISTINCTIFS = [
  'Valcourt',
  'Coteaux',
  'Fournil',
  'Saules',
  'Escabeau',
  'Dalbret',
  'Genêts',
  'Mérindol',
  'Hexalis',
  'Aulnes',
  'Orsini',
  'Lumen',
  'Kerdual',
  'Hautes',
  'Brandes',
  'Prana',
  'Rive',
  'Castelvert',
  'Mousse',
  'Biocéane',
  'Arpège',
  'Nord',
  'Lacombe',
  'Saveurs',
  'Trait',
  'Jardins',
  'Lune',
  'Dumontel',
  'Esque',
]

/** Ce qu'aucun texte parti au modèle ne doit porter : chaque client par son nom entier, et chaque mot distinctif. */
const clientsCherches = (s: Session): Designable[] => [
  ...[...s.ctx.clients.values()].map((c) => ({
    id: c.id,
    nom: c.nom.split(' ').join('-'),
    sorte: 'organisation' as const,
  })),
  ...MOTS_DISTINCTIFS.map((m) => ({ id: m, nom: m, sorte: 'organisation' as const })),
]

/** Tout ce qui est parti au modèle : systèmes, messages et outils de chaque appel. */
const envoye = (modele: ReturnType<typeof modeleSimule>) => JSON.stringify(modele.appels)

describe('les rôles et le registre d’accès', () => {
  it('personnes.yaml : six personnes, cinq rôles, toutes identifiées et présentes dans les données', () => {
    const s = session()
    const personnes = chargerPersonnes(s.dossier, CONVERSATION.roles)
    expect(personnes.map((p) => p.role)).toEqual([
      'dirigeant',
      'commercial',
      'po',
      'graphiste',
      'developpeur',
      'developpeur',
    ])
    expect(() => verifierRegistre(CONVERSATION, s, personnes)).not.toThrow()
    expect(ROLES_DECLARES.every((r) => r.identifie && r.tutoie === undefined)).toBe(true)
  })
  it('un inconnu du registre, ou un rôle sans personne : refusés à la porte, le refus au journal', () => {
    const s = session()
    const refus = [{ role: 'developpeur', personne: 'M-99' }, { role: 'dirigeant' }].map(
      (demandeur) =>
        accueillir(CONVERSATION, s.dossier, {
          demandeur,
          canal: 'terminal',
          maintenant,
          conversation: 'C-porte',
        }),
    )
    expect(refus.map((r) => r.sorte)).toEqual(['refus', 'refus'])
    expect(s.journal.historique('C-porte').map((l) => l.type)).toEqual([
      TYPE_ACCES_REFUSE,
      TYPE_ACCES_REFUSE,
    ])
  })
  it('qui parle, sans nom : le rôle en mots et l’identifiant', () => {
    expect(quiParle(ROLES_DECLARES, BILAL)).toBe('le développeur M-05')
    expect(quiParle(ROLES_DECLARES, PO)).toBe('la PO M-03')
  })
})

describe('les noms qui ne partent jamais au modèle', () => {
  const s = session()
  const noms = CONVERSATION.noms(s)
  const ids = (prefixe: string) =>
    new Set(noms.filter((x) => x.id.startsWith(prefixe)).map((x) => x.id))
  it('les personnes, sous-traitants et contacts (personne) ; les clients et les domaines (organisation)', () => {
    expect(ids('M-').size).toBe(6)
    expect(ids('ST-').size).toBe(3)
    expect(ids('CT-').size).toBe(30)
    expect(ids('CLI-').size).toBe(25)
    expect(ids('DOM-').size).toBe(30)
    const sorte = (prefixe: string) =>
      new Set(noms.filter((x) => x.id.startsWith(prefixe)).map((x) => x.sorte))
    for (const p of ['M-', 'ST-', 'CT-']) expect(sorte(p)).toEqual(new Set(['personne']))
    for (const p of ['CLI-', 'DOM-']) expect(sorte(p)).toEqual(new Set(['organisation']))
    // 39 personnes ; 25 clients entiers ; 12 noms tels qu'on les dit, du premier mot propre à la fin
    // (« Fournil des Saules ») ; 29 mots propres distinctifs (« Hautes-Brandes » en donne deux,
    // « Industrie » n'en est pas) ; 30 domaines
    expect(noms).toHaveLength(135)
  })
  it('un client se masque entier, et par ses mots propres ; pas par ses mots courants', () => {
    expect(fuites('Céramiques Orsini', noms)).toEqual(['Céramiques Orsini'])
    expect(fuites('chez Orsini', noms)).toEqual(['Orsini'])
    expect(fuites('ceramiques-orsini.example', noms)).toEqual(['ceramiques-orsini.example'])
    expect(fuites('orsini-pro.example', noms)).toEqual(['orsini-pro.example'])
    expect(fuites("l'agence, l'atelier, le cabinet, la boulangerie", noms)).toEqual([])
    // un mot propre pris dans un nom composé (« Hautes-Brandes ») se masque seul aussi
    expect(fuites('la communauté des Brandes', noms)).toEqual(['Brandes'])
  })
  it('un mot propre que les données emploient comme mot du métier ne se masque pas seul ; le nom tel qu’on le dit, si', () => {
    // « industrie » est le secteur de CLI-08 (clients.csv) : un mot courant, qui n'identifie personne
    expect(fuites('le secteur industrie, les clients de l’Industrie', noms)).toEqual([])
    expect(fuites('chez Hexalis', noms)).toEqual(['Hexalis'])
    expect(fuites('chez Hexalis Industrie', noms)).toEqual(['Hexalis Industrie'])
    expect(fuites('Groupe Hexalis Industrie', noms)).toEqual(['Groupe Hexalis Industrie'])
    expect(fuites('les Jardins de Lune', noms)).toEqual(['Jardins de Lune'])
    expect(fuites('le Fournil des Saules', noms)).toEqual(['Fournil des Saules'])
    // rien dans les données ne dit que « Nord », « Rive » ou « Lune » soient des mots du métier : masqués seuls
    expect(fuites('au nord, sur la rive, la lune', noms)).toEqual(['nord', 'rive', 'lune'])
    const designe = (texte: string) => masquerTexte(texte, noms)
    expect(designe('le secteur industrie')).toBe('le secteur industrie')
    expect(designe('chez Hexalis Industrie')).toBe('chez CLI-08')
    expect(designe('le Fournil des Saules')).toBe('le CLI-03')
  })
  it('un mot propre cité dans une de ces colonnes, sans en être toute la valeur, reste masqué seul', () => {
    // fonction, secteur, composant : du texte libre ; seul un mot qui y est une valeur entière est du métier
    const dossier = copieClient(exemple)
    const remplacer = (fichier: string, avant: string, apres: string) => {
      const chemin = join(dossier, fichier)
      writeFileSync(chemin, readFileSync(chemin, 'utf8').replace(avant, apres))
    }
    remplacer('clients.csv', 'CLI-12;Cave Lumen;commerce', 'CLI-12;Cave Lumen;caviste Lumen')
    const s2 = CONVERSATION.ouvrir(dossier)
    const contact = [...s2.ctx.contacts.values()][0]
    if (!contact) throw new Error('aucun contact')
    s2.ctx.contacts.set(contact.id, { ...contact, fonction: 'président, ancien de Hexalis' })
    const n2 = CONVERSATION.noms(s2)
    expect(masquerTexte('chez Hexalis', n2)).toBe('chez CLI-08')
    expect(masquerTexte('parle à Lumen', n2)).toBe('parle à CLI-12')
    expect(masquerTexte('le secteur industrie', n2)).toBe('le secteur industrie')
  })
  it.each(TOUS)(
    '$role : la copie masquée ne porte ni le nom entier d’un client, ni un mot qui l’identifie seul ; le secteur « industrie » reste',
    (identite) => {
      const masquees = masquerTables(tablesPour(s, identite), noms)
      expect(fuites(JSON.stringify(masquees), clientsCherches(s))).toEqual([])
      const cli08 = masquees.find((t) => t.nom === 'clients')?.lignes.find((c) => c.id === 'CLI-08')
      if (identite === GRAPHISTE || identite === BILAL) expect(cli08).toBeUndefined()
      else expect(cli08).toMatchObject({ nom: 'CLI-08', secteur: 'industrie' })
    },
  )
  it('ce qu’un rôle désigne : toute l’agence s’il désigne autrui, sinon lui-même', () => {
    const designe = (identite: Identite) =>
      CONVERSATION.vocabulaire(s, identite).noms.map((x) => x.id)
    expect(designe(DIRIGEANT)).toEqual(['M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06'])
    expect(designe(COMMERCIALE)).toHaveLength(6)
    expect(designe(GRAPHISTE)).toEqual(['M-04'])
    expect(designe(BILAL)).toEqual(['M-05'])
  })
})

describe('le domaine et la traduction ne portent aucun nom', () => {
  const s = session()
  const noms = CONVERSATION.noms(s)
  it('les phrases du domaine et des intentions', () => {
    expect(
      fuites(
        JSON.stringify(DOMAINE, (_k, v) => (v instanceof RegExp ? v.source : v)),
        noms,
      ),
    ).toEqual([])
    expect(fuites(JSON.stringify(INTENTIONS), noms)).toEqual([])
    const motif = motifPourTester(DOMAINE)
    for (const id of ['M-01', 'CT-12', 'CLI-03', 'ST-02']) expect(motif.test(id)).toBe(true)
    for (const id of ['PRJ-12', 'FAC-2026-031', 'TK-1042', 'DOM-11'])
      expect(motif.test(id)).toBe(false)
  })
  it.each(TOUS)('$role : le système et les outils de la traduction', async (identite) => {
    const { modele } = await tour(
      session(),
      identite,
      [outil('je_ne_sais_pas', { raison: 'x' })],
      'bonjour',
    )
    const appel = modele.appels[0]
    const role = roleDe(ROLES_DECLARES, identite)
    expect(appel?.systeme).toContain(`Tu parles avec ${role.enMots}, dans ${DOMAINE.cadre}.`)
    expect(fuites(envoye(modele), noms)).toEqual([])
    expect(appel?.systeme).toBe(
      systemeTraduire(
        role,
        DOMAINE,
        CONVERSATION.actions.filter((a) => a.roles.includes(identite.role)),
        INTENTIONS,
      ),
    )
  })
})

describe('une conversation complète : la PO, « combien de jours on a brûlés sur PRJ-12 »', async () => {
  const s = session()
  const consigne = 'Combien de jours on a brûlés sur PRJ-12 par rapport au devis ?'
  const { r, lignes, modele } = await tour(
    s,
    PO,
    [outil('etat_projet', { projet: 'PRJ-12' })],
    consigne,
  )
  it('le geste, la réponse rendue par le code, chiffres cités des données', () => {
    expect(modele.appels).toHaveLength(1)
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toContain('Jours : 18 consommés sur 29 vendus (62 %)')
  })
  it('le journal : la consigne mot pour mot, le geste, et l’appel au modèle avec son coût', () => {
    const ligne = lignes.find((l) => l.type === TYPE_CONSIGNE)
    expect(ligne?.issue).toBe('action')
    expect(ligne?.motif).toBe(consigne)
    const donnees = JSON.parse(ligne?.donnees ?? '{}')
    expect(donnees.demande).toEqual({
      sorte: 'action',
      action: 'etat_projet',
      params: { projet: 'PRJ-12' },
    })
    expect(donnees.resultat).toEqual({ projet: 'PRJ-12', consommes: 18, vendus: 29 })
    expect(
      JSON.parse(lignes.find((l) => l.type === TYPE_APPEL)?.donnees ?? '{}').cout_usd,
    ).toBeGreaterThan(0)
  })
  it('le même geste par le développeur : pas de jours', async () => {
    const dev = await tour(session(), BILAL, [outil('etat_projet', { projet: 'PRJ-12' })], consigne)
    expect(dev.r.sorte).toBe('resultat')
    expect(dev.r.texte).not.toContain('Jours')
  })
})

describe('les cinq phrases-refus de l’entretien § 12', () => {
  it('11 — la commerciale : « C’est quoi la marge sur PRJ-12 ? » ; sa copie n’a pas les coûts, l’échappée abandonne', async () => {
    const s = session()
    const { r, modele } = await tour(
      s,
      COMMERCIALE,
      [
        nouvelle('marge_projet'),
        outil('requete', { sql: 'SELECT cout_journalier_eur FROM personnes' }),
        outil('abandonner', { motif: 'la marge demande les coûts, absents de la copie' }),
      ],
      'C’est quoi la marge sur PRJ-12 ?',
    )
    expect(r.sorte).toBe('je_ne_sais_pas')
    const echappee = modele.appels[1]
    expect(echappee?.systeme).not.toMatch(/cout_journalier|tjm_vente|Table temps|Table personnes/)
    expect(JSON.stringify(modele.appels[2]?.messages)).toContain('no such table: personnes')
  })
  it('13 — la commerciale : « Fais-moi un devis pour une refonte » ; ni geste ni outil n’écrit', async () => {
    const s = session()
    const { r, modele } = await tour(
      s,
      COMMERCIALE,
      [nouvelle('devis_refonte'), outil('abandonner', { motif: 'rien ne s’écrit' })],
      'Fais-moi un devis pour une refonte',
    )
    expect(r.sorte).toBe('je_ne_sais_pas')
    const outils = modele.appels[1]?.outils.map((o) => o.name)
    expect(outils).toEqual(['requete', 'repondre', 'abandonner'])
    expect(modele.appels[1]?.systeme).toContain('Tu ne peux rien proposer de changer.')
    expect(modele.appels[0]?.outils.map((o) => o.name)).not.toContain('proposer')
    // Les notions du métier, sans proposition : evals/erreurs-2026-10-13.md, E2.
    expect(modele.appels[1]?.systeme).toContain(
      `Ce que les mots du métier veulent dire :\n- ${DOMAINE.notions?.join('\n- ')}\n`,
    )
  })
  it('20 bis — la PO : « Envoie la relance du PV à la boulangerie » ; rien ne s’envoie, rien ne s’écrit', async () => {
    const s = session()
    const { r, modele, lignes } = await tour(
      s,
      PO,
      [nouvelle('relance_pv'), outil('abandonner', { motif: 'l’outil n’envoie rien' })],
      'Envoie la relance du PV à la boulangerie',
    )
    expect(r.sorte).toBe('je_ne_sais_pas')
    expect(modele.appels[1]?.outils.map((o) => o.name)).not.toContain('proposer')
    expect(CONVERSATION.actions.some((a) => /envoi|envoy/.test(a.id))).toBe(false)
    expect(lignes.map((l) => l.type)).not.toContain('confirmation_attendue')
    expect(s.journal.lire().filter((l) => l.type === TYPE_BROUILLON)).toEqual([])
  })
  it('24 — le graphiste : « Combien le client paie pour ce site ? » ; ni le geste des factures, ni un montant dans sa copie', async () => {
    const s = session()
    const parGeste = await tour(
      s,
      GRAPHISTE,
      [outil('factures_en_retard', { client: null })],
      'Combien le client paie pour ce site ?',
    )
    expect(parGeste.r.sorte).toBe('je_ne_sais_pas')
    expect(parGeste.r.texte).toContain('action inconnue : factures_en_retard')
    const parEchappee = await tour(
      s,
      GRAPHISTE,
      [
        nouvelle('prix_projet'),
        outil('requete', { sql: 'SELECT montant_ht_eur FROM factures' }),
        outil('abandonner', { motif: 'aucun montant dans la copie' }),
      ],
      'Combien le client paie pour ce site ?',
    )
    expect(parEchappee.r.sorte).toBe('je_ne_sais_pas')
    expect(parEchappee.modele.appels[1]?.systeme).not.toMatch(/_eur|euros/)
    expect(JSON.stringify(parEchappee.modele.appels[2]?.messages)).toContain(
      'no such table: factures',
    )
  })
  it('29 — le développeur : « Combien de temps Julie a passé sur TK-1042 ? » ; refus du code, rien de Julie', async () => {
    const s = session()
    const { r, modele, lignes } = await tour(
      s,
      BILAL,
      [outil('mon_temps', { personne: 'Julie', du: '2026-10-01', au: '2026-10-12' })],
      'Combien de temps Julie a passé sur TK-1042 ?',
    )
    expect(r).toEqual({
      sorte: 'refus',
      texte: 'Tu ne peux désigner que toi-même : « Julie » ne te désigne pas.',
    })
    expect(modele.appels).toHaveLength(1)
    expect(lignes.map((l) => l.type)).not.toContain(TYPE_ECHAPPEE)
    // La commerciale désigne autrui sans tout voir : le code du geste refuse.
    const commerciale = await tour(
      s,
      COMMERCIALE,
      [outil('mon_temps', { personne: 'Julie', du: '2026-10-01', au: '2026-10-12' })],
      'Combien de temps Julie a passé ce mois ?',
    )
    expect(commerciale.r).toEqual({
      sorte: 'refus',
      texte: "ce geste n'est pas ouvert à votre rôle : le temps d'une autre personne",
    })
  })
})

describe('l’échappée : elle répond, ne propose jamais, et ne voit aucun nom', () => {
  it('le dirigeant : clients, contacts, domaines, accès, personnes ; la consigne nommée ; tout est masqué, la réponse restituée', async () => {
    const s = session()
    const noms = CONVERSATION.noms(s)
    const lire = (table: string) => outil('requete', { sql: `SELECT * FROM ${table}` })
    const { r, modele, lignes } = await tour(
      s,
      DIRIGEANT,
      [
        nouvelle('acces_ressource'),
        ...['clients', 'contacts', 'domaines', 'acces', 'personnes', 'sous_traitants'].map(lire),
        outil('requete', { sql: "SELECT id FROM clients WHERE id = 'CLI-11'" }),
        outil('repondre', { texte: 'CLI-11 a deux domaines.' }),
      ],
      'Qui a accès à la prod de Céramiques Orsini, et Julie Okafor y est encore ?',
    )
    expect(r).toEqual({
      sorte: 'resultat',
      texte: 'Céramiques Orsini a deux domaines.',
      controle: CONTROLE_OK,
    })
    expect(modele.appels).toHaveLength(9)
    for (const appel of modele.appels.slice(1)) {
      expect(fuites(appel.systeme, noms)).toEqual([])
      expect(fuites(JSON.stringify(appel.messages), noms)).toEqual([])
      expect(appel.outils.map((o) => o.name)).toEqual(['requete', 'repondre', 'abandonner'])
    }
    expect(JSON.stringify(modele.appels[1]?.messages)).toContain(
      'Qui a accès à la prod de CLI-11, et M-06 y est encore ?',
    )
    expect(modele.appels[1]?.systeme).toContain('Tu travailles pour le dirigeant M-01 ')
    expect(lignes.find((l) => l.type === TYPE_ECHAPPEE)?.issue).toBe('reponse')
  })
  // Le développeur, qui ne désigne pas autrui : la consigne va droit à l'échappée, sans « de qui parlez-vous ? ».
  it('le développeur cite chaque client par un mot qui l’identifie seul : aucun n’arrive à l’échappée, le secteur si', async () => {
    const s = session()
    const consigne = `Quels clients parmi ${MOTS_DISTINCTIFS.join(', ')} et le Groupe Hexalis Industrie sont dans le secteur industrie ?`
    const { modele } = await tour(
      s,
      BILAL,
      [nouvelle('clients_secteur'), outil('abandonner', { motif: 'x' })],
      consigne,
    )
    expect(modele.appels).toHaveLength(2)
    const echappee = JSON.stringify(modele.appels[1])
    expect(fuites(echappee, clientsCherches(s))).toEqual([])
    expect(echappee).toContain('et le CLI-08 sont dans le secteur industrie ?')
  })
  it('le développeur : sa copie seule ; ni les montants, ni les autres', async () => {
    const s = session()
    const { modele } = await tour(
      s,
      BILAL,
      [nouvelle('derniere_mise_en_prod'), outil('abandonner', { motif: 'x' })],
      'Qui a fait la dernière mise en prod de PRJ-12 ?',
    )
    const systeme = modele.appels[1]?.systeme ?? ''
    expect(systeme).toContain('Tu travailles pour le développeur M-05 ')
    expect(systeme.match(/^Table \w+/gm)).toEqual([
      'Table tickets',
      'Table temps',
      'Table projets',
      'Table acces',
      'Table depots',
      'Table sauvegardes',
      'Table versions',
    ])
    expect(systeme).not.toContain('_eur')
    expect(fuites(envoye(modele), CONVERSATION.noms(s))).toEqual([])
  })
})

describe('le tableau de l’interface', () => {
  const s = session()
  it.each(TOUS)(
    '$role : son nom, ses suggestions tirées de l’entretien, et aucune condition',
    (identite) => {
      const t = CONVERSATION.tableau?.(s, identite, maintenant)
      if (!t) throw new Error('pas de tableau')
      expect(t.nom).toBe(s.ctx.personnes.get(identite.personne ?? '')?.nom)
      expect(t.textes.suggestions.length).toBeGreaterThan(0)
      expect(t.textes.accueil).toMatch(new RegExp(`^Bonjour ${t.nom.split(' ')[0]}\\.`))
      expect(t.textes.conditions).toEqual({})
      expect(t.demandes).toEqual([])
    },
  )
  it('le registre des règles est celui du métier', () => {
    expect(CONVERSATION.registre?.(s).interdits.map((i) => i.id)).toContain('I-15')
  })
})
