import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  accueillir,
  chargerPersonnes,
  confirmer,
  FICHIER_PERSONNES,
  type Identite,
  type IdentiteVerifiee,
  messageConsigne,
  modeleSimule,
  recevoir,
  type Scripte,
  TYPE_ACCES_REFUSE,
  TYPE_APPEL,
  TYPE_ECHAPPEE,
  TYPE_PRECISION_ATTENDUE,
  TYPE_PROPOSITION_REFUSEE,
  traiterConsigne,
} from '@harnais/moteur'
import { describe, expect, it, vi } from 'vitest'
import { ACTIONS } from './actions'
import { CONVERSATION } from './conversation'
import {
  ouvrirReaffectation,
  reaffectation,
  STATUT_R,
  statutReaffectation,
  validerReaffectation,
} from './reaffectation'
import { aParis, type Session } from './remplacement'

// La conversation sur le client fictif, de bout en bout, sur une copie (le
// journal y est écrit), avec le modèle simulé (PLAN-ESPACES.md § 5.7). Chaque
// tour ouvre sa propre session, après la traduction (REFLEXIONS.md, décidé le 2026-10-08) ;
// `s` sert aux confirmations et à relire le journal.

const exemple = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const maintenant = aParis('2026-10-10T21:40')
/** Une identité passée par la porte, sur le registre d'accès du client fictif. */
function verifiee(demandeur: Identite, dossier = exemple): IdentiteVerifiee {
  const accueil = recevoir(
    CONVERSATION.roles,
    chargerPersonnes(dossier, CONVERSATION.roles),
    demandeur,
  )
  if (accueil.sorte === 'refus') throw new Error(accueil.motif)
  return accueil.identite
}
const PATRON = verifiee({ role: 'patron' })
const agent = (id: string) => verifiee({ role: 'agent', personne: id })

const planningDe = (s: Session) => readFileSync(join(s.dossier, 'planning.csv'), 'utf8')

/** Une copie neuve du client fictif, sans journal ni sorties ; `avant` la modifie avant l'ouverture. */
function session(avant?: (dossier: string) => void): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'conversation-'))
  cpSync(exemple, dossier, { recursive: true, filter: (f) => !/\.sqlite$|rapport-demo/.test(f) })
  avant?.(dossier)
  return CONVERSATION.ouvrir(dossier)
}

let n = 0
/** Un tour, le modèle simulé jouant `pas`. */
async function tour(
  s: Session,
  identite: IdentiteVerifiee,
  pas: Scripte[],
  consigne = 'consigne',
  conversation = `C-test-${++n}`,
) {
  const modele = modeleSimule(pas)
  const r = await traiterConsigne(CONVERSATION, s.dossier, modele, {
    identite,
    consigne,
    maintenant,
    conversation,
  })
  return { r, conversation, modele }
}
const outil = (nom: string, entree: unknown): Scripte[] => [{ outil: nom, entree }]
const lignes = (s: Session, conversation: string) => s.journal.historique(conversation)

describe('un geste qui lit : déclarer une absence', async () => {
  const s = session()
  const { r, conversation } = await tour(
    s,
    PATRON,
    outil('gerer_absence', { agent: 'A-11', jour: '2026-10-11' }),
    'Aïcha ne vient pas demain',
  )
  it('rend la proposition, rendue par le code', () => {
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toContain('Demande D-V-17')
    expect(r.texte).toContain('Je propose Julien Lefèvre')
  })
  it('laisse au journal la consigne et l’appel au modèle, avec son coût', () => {
    const consigne = lignes(s, conversation).find((l) => l.type === 'consigne')
    expect(consigne?.issue).toBe('action')
    expect(consigne?.motif).toBe('Aïcha ne vient pas demain')
    const appel = lignes(s, conversation).find((l) => l.type === TYPE_APPEL)
    expect(JSON.parse(appel?.donnees ?? '{}').cout_usd).toBeGreaterThan(0)
  })
})

describe('un geste qui écrit : valider, puis la réponse de l’agent', async () => {
  const s = session()
  await tour(s, PATRON, outil('gerer_absence', { agent: 'A-11', jour: '2026-10-11' }))
  const valider = outil('valider_remplacement', { demande: 'D-V-17', agent: null })
  const { r, conversation } = await tour(s, PATRON, valider)
  if (r.sorte !== 'confirmation') throw new Error(`sorte ${r.sorte}`)

  it('demande d’abord un « oui » à la reformulation', () => {
    expect(r.texte).toMatch(/^Valider Julien Lefèvre \(A-2\) pour V-17/)
    expect(r.texte).toMatch(/\(oui \/ non\)$/)
  })
  it('une empreinte fausse, ou un autre demandeur : refus, et l’attente reste', async () => {
    const faux = await confirmer(CONVERSATION, s, PATRON, conversation, 'faux', true, maintenant)
    expect(faux.sorte).toBe('refus')
    const autre = await confirmer(
      CONVERSATION,
      s,
      agent('A-2'),
      conversation,
      r.empreinte,
      true,
      maintenant,
    )
    expect(autre.sorte).toBe('refus')
  })
  it('« oui » exécute ; la même confirmation une seconde fois est refusée', async () => {
    const oui = await confirmer(
      CONVERSATION,
      s,
      PATRON,
      conversation,
      r.empreinte,
      true,
      maintenant,
    )
    expect(oui.sorte).toBe('resultat')
    expect(oui.texte).toContain("Message envoyé à l'agent")
    const encore = await confirmer(
      CONVERSATION,
      s,
      PATRON,
      conversation,
      r.empreinte,
      true,
      maintenant,
    )
    expect(encore).toEqual({
      sorte: 'refus',
      texte: 'aucune confirmation en attente pour ce contenu',
    })
  })
  it('l’agent sollicité peut répondre ; un autre agent non', async () => {
    const repondre = outil('repondre_sollicitation', { demande: 'D-V-17', accepte: true })
    const julien = await tour(s, agent('A-2'), repondre)
    expect(julien.r.sorte).toBe('confirmation')
    expect(julien.r.texte).toMatch(/^Tu confirmes : OUI pour V-17/)
    const mehdi = await tour(s, agent('A-9'), repondre)
    expect(mehdi.r).toEqual({
      sorte: 'refus',
      texte: 'cette sollicitation ne vous est pas adressée',
    })
  })
  it('« non » ne fait rien', async () => {
    const s2 = session()
    await tour(s2, PATRON, outil('gerer_absence', { agent: 'A-11', jour: '2026-10-11' }))
    const v = await tour(s2, PATRON, valider)
    if (v.r.sorte !== 'confirmation') throw new Error(`sorte ${v.r.sorte}`)
    const non = await confirmer(
      CONVERSATION,
      s2,
      PATRON,
      v.conversation,
      v.r.empreinte,
      false,
      maintenant,
    )
    expect(non).toEqual({ sorte: 'resultat', texte: "D'accord, rien n'est fait." })
    expect(s2.journal.historique('D-V-17').at(-1)?.issue).toBe('proposée')
  })
})

describe('un agent ne travaille que sur ses données', () => {
  it('voir_planning rend les vacations de celui qui parle ; un autre agent nommé : refus, sans rien de lui', async () => {
    const s = session()
    const soi = await tour(
      s,
      agent('A-2'),
      outil('voir_planning', { agent: null, du: null, au: null }),
    )
    expect(soi.r.sorte).toBe('resultat')
    expect(soi.r.texte).toContain('V-04')
    expect(soi.r.texte).toContain('V-05')
    expect(soi.r.texte.split('\n')).toHaveLength(2)
    const autre = await tour(
      s,
      agent('A-2'),
      outil('voir_planning', { agent: 'Karim', du: null, au: null }),
      'Montre-moi le planning de Karim',
    )
    expect(autre.r).toEqual({
      sorte: 'refus',
      texte: 'Tu ne peux désigner que toi-même : « Karim » ne te désigne pas.',
    })
    expect(autre.modele.appels).toHaveLength(1)
  })
  it('un agent n’a pas les outils du patron', async () => {
    const s = session()
    const { modele } = await tour(s, agent('A-2'), [{ texte: 'x' }])
    const noms = modele.appels[0]?.outils.map((o) => o.name) ?? []
    expect(noms).not.toContain('valider_remplacement')
    expect(noms).toContain('repondre_sollicitation')
    expect(modele.appels[0]?.systeme).not.toContain('Aïcha')
  })
})

describe('qui parle : la porte, avant le dossier (REFLEXIONS.md, décidé le 2026-10-08)', () => {
  it('un inconnu du registre, un rôle faux, un patron qui se dit agent : refusés sans ouvrir le dossier, le refus au journal', () => {
    const s = session()
    CONVERSATION.fermer(s)
    const ouvrir = vi.spyOn(CONVERSATION, 'ouvrir')
    const demandes = [
      { role: 'agent', agent: 'A-99' },
      { role: 'x' },
      { role: 'patron', agent: 'A-1' },
    ]
    try {
      const refus = demandes.map((demandeur) =>
        accueillir(CONVERSATION, s.dossier, {
          demandeur,
          canal: 'terminal',
          maintenant,
          conversation: 'C-porte',
        }),
      )
      expect(refus.map((r) => r.sorte)).toEqual(['refus', 'refus', 'refus'])
      expect(ouvrir).not.toHaveBeenCalled()
    } finally {
      ouvrir.mockRestore()
    }
    const s2 = CONVERSATION.ouvrir(s.dossier)
    const lignes = s2.journal.historique('C-porte')
    CONVERSATION.fermer(s2)
    expect(lignes.map((l) => [l.type, l.motif])).toEqual([
      [TYPE_ACCES_REFUSE, "inconnu au registre d'accès : A-99"],
      [TYPE_ACCES_REFUSE, 'rôle inconnu : x'],
      [TYPE_ACCES_REFUSE, "le patron parle en son nom : pas d'identifiant"],
    ])
    expect(JSON.parse(lignes[0]?.donnees ?? '{}')).toEqual({
      identite: '{"role":"agent","agent":"A-99"}',
      canal: 'terminal',
    })
  })
  it('une personne du registre absente des données : refus de cohérence, rien d’exécuté', async () => {
    const s = session()
    writeFileSync(
      join(s.dossier, FICHIER_PERSONNES),
      'personnes:\n  - { role: agent, agent: A-99 }\n',
    )
    const fantome = verifiee({ role: 'agent', personne: 'A-99' }, s.dossier)
    const { r } = await tour(s, fantome, outil('mes_titres', {}))
    expect(r.sorte).toBe('refus')
    expect(r.texte).toMatch(/A-99/)
    expect((await confirmer(CONVERSATION, s, fantome, 'C-x', 'e', true, maintenant)).sorte).toBe(
      'refus',
    )
  })
})

describe('le plafond du mois', () => {
  it('atteint : refus, sans appel au modèle', async () => {
    const s = session()
    s.journal.ecrire(
      [{ type: TYPE_APPEL, client: s.config.client, issue: 'traduire', donnees: { cout_usd: 31 } }],
      '2026-10-02T10:00:00Z',
    )
    const { r, modele } = await tour(s, PATRON, [{ texte: 'x' }])
    expect(r.sorte).toBe('refus')
    expect(r.texte).toMatch(/^Le plafond d'IA du mois est atteint/)
    expect(modele.appels).toHaveLength(0)
  })
})

describe('le plafond de la traduction', () => {
  it('celui de la demande dans la config, jamais un nombre en dur', async () => {
    const s = session()
    const { modele } = await tour(s, PATRON, [{ texte: 'x' }])
    expect(modele.appels[0]?.maxTokens).toBe(
      s.config.conversation?.plafonds.par_demande.tokens_sortie,
    )
  })
})

describe('les critères d’une proposition', () => {
  it('les préférences du client dans son ordre, définies comme le code les calcule, puis le départage par numéro', () => {
    const c = CONVERSATION.proposition?.criteres(session())
    expect(c?.preferences).toBe(
      "d'abord un agent qui connaît déjà le site (il y a fait une vacation, finie avant le début de celle-ci), puis celui qui a le moins d'heures dans la semaine de la vacation (ses autres vacations, comptées du lundi 0 h au lundi suivant 0 h) ; à égalité, le numéro d'agent le plus bas (A-2 avant A-10)",
    )
  })
})

describe('les gestes de veille', () => {
  it('lancer_veille rend le rapport et écrit la veille au journal', async () => {
    const s = session()
    const { r } = await tour(s, PATRON, outil('lancer_veille', { date: null }))
    expect(r.texte).toMatch(/^# Veille du 10\/10\/2026/)
    expect(s.journal.lire().some((l) => l.type === 'veille')).toBe(true)
  })
  it('voir_echeances (patron) et mes_titres (agent) disent la carte expirée de Sophie', async () => {
    const s = session()
    const patron = await tour(s, PATRON, outil('voir_echeances', {}))
    expect(patron.r.texte).toContain('Sophie Marchand — carte professionnelle — escalade')
    const sophie = await tour(s, agent('A-3'), outil('mes_titres', {}))
    expect(sophie.r.texte).toContain('Sophie Marchand — carte professionnelle — escalade')
    expect(sophie.r.texte).toContain('Carte professionnelle : surveillance humaine ou gardiennage')
    expect(sophie.r.texte).not.toContain('Moussa')
  })
})

describe('une demande nouvelle jusqu’au planning : proposition, validation, accord, écriture', async () => {
  const s = session()
  const V07_A9 = [{ type: 'reaffecter', vacation: 'V-07', agent: 'A-9' }]
  const { r, conversation } = await tour(
    s,
    PATRON,
    [
      { outil: 'demande_nouvelle', entree: { intention: 'liberer_un_jour', resume: 'x' } },
      { outil: 'verifier', entree: { modifications: V07_A9 } },
      { outil: 'proposer', entree: { modifications: V07_A9, resume: 'Mehdi prend V-07.' } },
    ],
    'Libère le mercredi de Sophie',
  )
  if (r.sorte !== 'proposition') throw new Error(`sorte ${r.sorte} : ${r.texte}`)

  it('la proposition est rendue par le code, avec les autres possibles', () => {
    expect(r.texte).toContain('Sophie Marchand → Mehdi Saïdi')
    expect(r.texte).toContain('18 autres vacations ne bougent pas')
    expect(r.texte).toMatch(/V-07 — autres possibles : .+/)
    expect(r.texte).toMatch(/Valider \? \(oui \/ non\)$/)
  })
  it('le oui du patron valide et demande son accord à Mehdi', async () => {
    const oui = await confirmer(
      CONVERSATION,
      s,
      PATRON,
      conversation,
      r.empreinte,
      true,
      maintenant,
    )
    expect(oui.sorte).toBe('resultat')
    expect(oui.texte).toMatch(/^Validé\. Message envoyé à 1 agent\(s\) : « Mehdi, peux-tu prendre/)
  })
  it('le oui de Mehdi, confirmé, écrit le planning', async () => {
    const id = `R-${conversation.replace(/^C-/, '')}`
    const mehdi = await tour(
      s,
      agent('A-9'),
      outil('repondre_reaffectation', { reaffectation: id, accepte: true }),
    )
    if (mehdi.r.sorte !== 'confirmation') throw new Error(`sorte ${mehdi.r.sorte}`)
    expect(mehdi.r.texte).toMatch(/^Tu confirmes : OUI pour V-07/)
    const fin = await confirmer(
      CONVERSATION,
      s,
      agent('A-9'),
      mehdi.conversation,
      mehdi.r.empreinte,
      true,
      maintenant,
    )
    expect(fin.sorte).toBe('resultat')
    expect(fin.texte).toMatch(/^C'est confirmé : V-07, mer\. 14\/10 08:00/)
    expect(fin.texte).not.toContain('Sophie')
    expect(planningDe(s)).toContain('V-07;A-9;')
  })
  it('un autre agent ne peut pas répondre à la place de Mehdi', async () => {
    const id = `R-${conversation.replace(/^C-/, '')}`
    const autre = await tour(
      s,
      agent('A-2'),
      outil('repondre_reaffectation', { reaffectation: id, accepte: true }),
    )
    expect(autre.r).toEqual({
      sorte: 'refus',
      texte: 'cette sollicitation ne vous est pas adressée',
    })
  })
})

describe('le patron change un agent dans une proposition (PLAN-CHOIX.md, critère de succès)', async () => {
  const s = session()
  const PROPOSEES = [
    { type: 'reaffecter', vacation: 'V-03', agent: 'A-9' },
    { type: 'reaffecter', vacation: 'V-07', agent: 'A-2' },
  ]
  const origine = await tour(
    s,
    PATRON,
    [
      { outil: 'demande_nouvelle', entree: { intention: 'liberer_un_jour', resume: 'x' } },
      { outil: 'verifier', entree: { modifications: PROPOSEES } },
      { outil: 'proposer', entree: { modifications: PROPOSEES, resume: 'Deux vacations.' } },
    ],
    'Libère Karim mardi et Sophie mercredi',
  )
  if (origine.r.sorte !== 'proposition') throw new Error(`${origine.r.sorte} : ${origine.r.texte}`)
  const { empreinte } = origine.r
  const ancienne = `R-${origine.conversation.replace(/^C-/, '')}`
  // Une autre conversation, comme `pnpm parler` sans `--conversation` : la mention, pas l'identifiant.
  const change = await tour(
    s,
    PATRON,
    outil('changer_remplacant', { demande: null, vacation: 'V-03', jour: null, agent: 'Aïcha' }),
    'oui, mais Aïcha pour V-03',
  )
  if (change.r.sorte !== 'proposition') throw new Error(`${change.r.sorte} : ${change.r.texte}`)
  const nouvelle = `${ancienne}-2`

  it('une nouvelle proposition, passée par les contrôles, où seule V-03 change', () => {
    expect(change.r.texte).toMatch(
      new RegExp(`^Proposition ${nouvelle} \\(remplace ${ancienne}\\)`),
    )
    expect(change.r.texte).toContain('Karim Haddad → Aïcha Traoré')
    expect(change.r.texte).toContain('Sophie Marchand → Julien Lefèvre')
    expect(change.r.texte).toMatch(/Valider \? \(oui \/ non\)$/)
    expect(reaffectation(s, nouvelle)).toEqual({
      id: nouvelle,
      conversation: origine.conversation,
      modifications: [{ ...PROPOSEES[0], agent: 'A-11' }, PROPOSEES[1]],
    })
  })
  it('l’ancienne est remplacée : son « oui » ne valide plus rien', async () => {
    expect(statutReaffectation(s, ancienne)).toBe(STATUT_R.remplacee)
    expect(CONVERSATION.proposition?.choix?.(s, ancienne)).toEqual([])
    expect(CONVERSATION.proposition?.choix?.(s, nouvelle)).toContainEqual({
      libelle: 'Prendre Mehdi Saïdi pour V-03',
      action: 'changer_remplacant',
      params: { demande: nouvelle, vacation: 'V-03', jour: null, agent: 'A-9' },
    })
    const oui = await confirmer(
      CONVERSATION,
      s,
      PATRON,
      origine.conversation,
      empreinte,
      true,
      maintenant,
    )
    expect(oui).toEqual({
      sorte: 'refus',
      texte: `${ancienne} : remplacée par ${nouvelle}, à valider à sa place`,
    })
  })
  it('au « oui », Aïcha et Julien sont sollicités comme aujourd’hui', async () => {
    if (change.r.sorte !== 'proposition') throw new Error(change.r.sorte)
    const oui = await confirmer(
      CONVERSATION,
      s,
      PATRON,
      change.conversation,
      change.r.empreinte,
      true,
      maintenant,
    )
    expect(oui.texte).toMatch(/^Validé\. Message envoyé à 2 agent\(s\)/)
    expect(oui.texte).toContain('Aïcha, peux-tu prendre')
    expect(oui.texte).toContain('Julien, peux-tu prendre')
  })
})

describe('changer un agent : ce qui ne se change pas', () => {
  const changer = ACTIONS.find((a) => a.id === 'changer_remplacant')
  if (!changer) throw new Error('changer_remplacant absent')
  const params = (p: Record<string, unknown>) => ({
    demande: null,
    vacation: 'V-03',
    jour: null,
    agent: 'A-11',
    ...p,
  })
  const ouverte = (s: Session) =>
    ouvrirReaffectation(
      s,
      'C-change',
      [
        { type: 'reaffecter', vacation: 'V-03', agent: 'A-9' },
        { type: 'reaffecter', vacation: 'V-07', agent: 'A-2' },
      ],
      maintenant,
    ).id
  const essai = (s: Session, p: Record<string, unknown>, quand = maintenant) =>
    Promise.resolve()
      .then(() => changer.executer(s, PATRON, params(p), quand))
      .then(
        () => 'exécuté',
        (e: Error) => e.message,
      )

  it('par son jour, sans nommer la R-… : la seule en attente qui a une vacation ce jour-là', async () => {
    const s = session()
    const id = ouverte(s)
    const r = await changer.executer(
      s,
      PATRON,
      params({ vacation: null, jour: '2026-10-14' }),
      maintenant,
    )
    expect(r.corrige).toBe(id)
    expect(r.modifications).toEqual([
      { type: 'reaffecter', vacation: 'V-03', agent: 'A-9' },
      { type: 'reaffecter', vacation: 'V-07', agent: 'A-11' },
    ])
  })
  it('refuse : une vacation absente, une R-… validée, deux en attente, trop tard, le même agent', async () => {
    const s = session()
    const id = ouverte(s)
    expect(await essai(s, { vacation: 'V-18' })).toBe(
      'aucune réaffectation en attente de validation ne contient V-18',
    )
    expect(await essai(s, { demande: id, vacation: 'V-18' })).toBe(`${id} ne contient pas V-18`)
    expect(await essai(s, { agent: 'A-9' })).toBe('Mehdi Saïdi est déjà proposé pour V-03')
    expect(await essai(s, {}, aParis('2026-10-13T09:00'))).toBe(
      `${id} : une vacation a commencé, trop tard pour la changer`,
    )
    const autre = ouverte(s)
    expect(await essai(s, {})).toBe(
      `plusieurs réaffectations en attente contiennent V-03 : laquelle (${id}, ${autre}) ?`,
    )
    validerReaffectation(s, id, maintenant)
    expect(await essai(s, { demande: id })).toBe(
      `${id} : ${STATUT_R.demandee}, elle ne se change plus`,
    )
  })
  it('une règle violée refuse et se journalise ; l’ancienne reste à valider', async () => {
    const s = session()
    const id = ouverte(s)
    // La carte professionnelle de Sophie Marchand a expiré le 01/10.
    const { r, conversation } = await tour(
      s,
      PATRON,
      outil('changer_remplacant', { demande: id, vacation: 'V-03', jour: null, agent: 'Sophie' }),
    )
    expect(r.sorte).toBe('je_ne_sais_pas')
    expect(lignes(s, conversation).some((l) => l.type === TYPE_PROPOSITION_REFUSEE)).toBe(true)
    expect(statutReaffectation(s, id)).toBe(STATUT_R.recue)
  })
  it('un agent ne peut pas l’appeler', async () => {
    const s = session()
    const id = ouverte(s)
    const { r } = await tour(
      s,
      agent('A-9'),
      outil('changer_remplacant', { demande: id, vacation: 'V-03', jour: null, agent: 'Aïcha' }),
    )
    expect(r.sorte).not.toBe('proposition')
    expect(statutReaffectation(s, id)).toBe(STATUT_R.recue)
  })
})

describe('suivre une réaffectation', () => {
  it('suivre_demande accepte un R-…', async () => {
    const s = session()
    const { id } = ouvrirReaffectation(
      s,
      'C-suivi',
      [{ type: 'reaffecter', vacation: 'V-07', agent: 'A-9' }],
      maintenant,
    )
    validerReaffectation(s, id, maintenant)
    const { r } = await tour(s, PATRON, outil('suivre_demande', { demande: id }))
    expect(r).toEqual({ sorte: 'resultat', texte: `${id} : demandée aux agents` })
  })
})

describe('un agent ne lit que ce qui le concerne (D4)', () => {
  it('sa propre absence : enregistrée, sans la proposition ni les autres agents', async () => {
    const s = session()
    const { r } = await tour(
      s,
      agent('A-11'),
      outil('gerer_absence', { agent: null, jour: '2026-10-11' }),
    )
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toMatch(/^Ton absence du 11\/10\/2026 est enregistrée \(demande D-V-17\)/)
    for (const nom of ['Julien', 'Karim', 'Sophie', 'Moussa']) expect(r.texte).not.toContain(nom)
  })
  it('l’absence d’un autre : refusée, rien d’ouvert', async () => {
    const s = session()
    const { r } = await tour(
      s,
      agent('A-2'),
      outil('gerer_absence', { agent: 'Aïcha', jour: '2026-10-11' }),
      'Aïcha ne vient pas demain',
    )
    expect(r).toEqual({
      sorte: 'refus',
      texte: 'Tu ne peux désigner que toi-même : « Aïcha » ne te désigne pas.',
    })
    expect(s.journal.historique('D-V-17')).toEqual([])
  })
  it('son non : enregistré, sans le nom du suivant ; la reformulation du patron écarte celui qui a refusé', async () => {
    const s = session()
    await tour(s, PATRON, outil('gerer_absence', { agent: 'A-11', jour: '2026-10-11' }))
    const v = await tour(
      s,
      PATRON,
      outil('valider_remplacement', { demande: 'D-V-17', agent: null }),
    )
    if (v.r.sorte !== 'confirmation') throw new Error(v.r.sorte)
    confirmer(CONVERSATION, s, PATRON, v.conversation, v.r.empreinte, true, maintenant)
    const julien = await tour(
      s,
      agent('A-2'),
      outil('repondre_sollicitation', { demande: 'D-V-17', accepte: false }),
    )
    if (julien.r.sorte !== 'confirmation') throw new Error(julien.r.sorte)
    expect(julien.r.texte).not.toContain('Aïcha')
    const non = await confirmer(
      CONVERSATION,
      s,
      agent('A-2'),
      julien.conversation,
      julien.r.empreinte,
      false,
      maintenant,
    )
    expect(non.texte).toBe("D'accord, rien n'est fait.")
    const julien2 = await tour(
      s,
      agent('A-2'),
      outil('repondre_sollicitation', { demande: 'D-V-17', accepte: false }),
    )
    if (julien2.r.sorte !== 'confirmation') throw new Error(julien2.r.sorte)
    const dit = await confirmer(
      CONVERSATION,
      s,
      agent('A-2'),
      julien2.conversation,
      julien2.r.empreinte,
      true,
      maintenant,
    )
    expect(dit.texte).toBe('Ta réponse est enregistrée : tu as dit non, sans aucune conséquence.')
    const encore = await tour(
      s,
      PATRON,
      outil('valider_remplacement', { demande: 'D-V-17', agent: null }),
    )
    expect(encore.r.texte).toMatch(/^Valider Karim Haddad \(A-1\)/)
  })
})

describe('le modèle ne reçoit que la phrase (REFLEXIONS.md, décidé le 2026-10-08)', () => {
  /** Tout ce que le client fictif sait des personnes et des postes : rien de cela ne part chez le fournisseur. */
  const NOMS = [
    ...readFileSync(join(exemple, 'agents.csv'), 'utf8')
      .split('\n')
      .slice(1)
      .flatMap((l) => (l.split(';')[1] ?? '').split(' ')),
    ...readFileSync(join(exemple, 'postes.csv'), 'utf8')
      .split('\n')
      .slice(1)
      .flatMap((l) => l.split(';').slice(0, 2)),
  ].filter((x) => x.length > 0)
  /** Une copie où un second agent porte le prénom d'Aïcha Traoré. */
  const avecHomonyme = (dossier: string) => {
    const agents = join(dossier, 'agents.csv')
    writeFileSync(
      agents,
      `${readFileSync(agents, 'utf8').trimEnd()}\nA-14;Aïcha Mansouri;surveillance-humaine;2023-03-01;2028-02-29;;oui;oui;;;;;;;;;;\n`,
    )
  }

  it('« Aicha ne vient pas demain » (patron) : gerer_absence pour A-11, sans aucun nom ni poste dans l’appel', async () => {
    const s = session()
    const consigne = 'Aicha ne vient pas demain'
    const { r, modele } = await tour(
      s,
      PATRON,
      outil('gerer_absence', { agent: 'Aicha', jour: '2026-10-11' }),
      consigne,
    )
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toContain('Demande D-V-17')
    expect(r.texte).toContain('Aïcha Traoré')
    expect(s.journal.historique('D-V-17')[0]?.motif).toBe('absence de Aïcha Traoré')
    expect(modele.appels).toHaveLength(1)
    const appel = modele.appels[0]
    const envoye = JSON.stringify({ systeme: appel?.systeme, outils: appel?.outils })
    expect(NOMS.length).toBeGreaterThan(20)
    for (const nom of NOMS) expect(envoye).not.toContain(nom)
    expect(appel?.messages).toEqual([
      { role: 'user', content: messageConsigne(consigne, maintenant) },
    ])
  })
  it('« Aisha » : le code propose une liste courte, le modèle désigne A-11 dans un second appel, journalisé', async () => {
    const s = session()
    const { r, modele, conversation } = await tour(
      s,
      PATRON,
      [
        { outil: 'gerer_absence', entree: { agent: 'Aisha', jour: '2026-10-11' } },
        { outil: 'designer', entree: { personne: 'A-11' } },
      ],
      'Aisha ne vient pas demain',
    )
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toContain('Aïcha Traoré')
    const second = JSON.stringify(modele.appels[1]?.messages)
    expect(second).toContain('A-11 — Aïcha Traoré')
    expect(second.split(' — ').length - 1).toBeLessThanOrEqual(3)
    expect(
      lignes(s, conversation)
        .filter((l) => l.type === TYPE_APPEL)
        .map((l) => l.issue),
    ).toEqual(['traduire', 'designer'])
  })
  it('le modèle répond aucun : la question, rien d’exécuté', async () => {
    const s = session()
    const { r } = await tour(
      s,
      PATRON,
      [
        { outil: 'gerer_absence', entree: { agent: 'Aisha', jour: '2026-10-11' } },
        { outil: 'designer', entree: { personne: 'aucun' } },
      ],
      'Aisha ne vient pas demain',
    )
    expect(r.sorte).toBe('precision')
    expect(r.texte).toMatch(/^Vous parlez de qui : .*Aïcha Traoré.* \?$/)
    expect(s.journal.historique('D-V-17')).toEqual([])
  })
  it('personne ne ressemble : la question, sans second appel', async () => {
    const s = session()
    const { r, modele } = await tour(
      s,
      PATRON,
      outil('gerer_absence', { agent: 'Bidule', jour: '2026-10-11' }),
      'Bidule ne vient pas demain',
    )
    expect(r).toEqual({
      sorte: 'precision',
      texte:
        'Je ne trouve personne qui corresponde à « Bidule ». Redites la consigne avec le prénom et le nom.',
      candidats: [],
    })
    expect(modele.appels).toHaveLength(1)
  })
  it('un homonyme : la question, rien d’exécuté ; la réponse reprend le geste sans appel au modèle', async () => {
    const s = session(avecHomonyme)
    const premier = await tour(
      s,
      PATRON,
      outil('gerer_absence', { agent: 'Aïcha', jour: '2026-10-11' }),
      'Aïcha ne vient pas demain',
    )
    expect(premier.r).toEqual({
      sorte: 'precision',
      texte: 'Vous parlez de qui : Aïcha Traoré ou Aïcha Mansouri ?',
      candidats: [
        { id: 'A-11', nom: 'Aïcha Traoré', sorte: 'personne' },
        { id: 'A-14', nom: 'Aïcha Mansouri', sorte: 'personne' },
      ],
    })
    expect(premier.modele.appels).toHaveLength(1)
    expect(s.journal.historique('D-V-17')).toEqual([])
    expect(lignes(s, premier.conversation).at(-1)?.type).toBe(TYPE_PRECISION_ATTENDUE)

    // Un autre demandeur dans la même conversation ne répond pas à sa place : nouvelle consigne.
    const intrus = await tour(s, agent('A-2'), [{ texte: 'x' }], 'Traoré', premier.conversation)
    expect(intrus.modele.appels).toHaveLength(1)

    const reponse = await tour(s, PATRON, [], 'Traoré', premier.conversation)
    expect(reponse.r.sorte).toBe('resultat')
    expect(reponse.r.texte).toContain('Demande D-V-17')
    expect(reponse.r.texte).toContain('Aïcha Traoré')
    expect(reponse.modele.appels).toHaveLength(0)
    const consignes = lignes(s, premier.conversation).filter((l) => l.type === 'consigne')
    expect(consignes.map((l) => l.issue)).toEqual(['action', 'inconnue', 'precision'])

    // La question est close : la même réponse redevient une consigne à traduire.
    const encore = await tour(s, PATRON, [{ texte: 'x' }], 'Traoré', premier.conversation)
    expect(encore.modele.appels).toHaveLength(1)
  })
  it('une réponse qui ne désigne aucun candidat : traitée comme une nouvelle consigne', async () => {
    const s = session(avecHomonyme)
    const premier = await tour(
      s,
      PATRON,
      outil('gerer_absence', { agent: 'Aïcha', jour: '2026-10-11' }),
      'Aïcha ne vient pas demain',
    )
    const suite = await tour(
      s,
      PATRON,
      outil('voir_echeances', {}),
      'Quelles échéances arrivent ?',
      premier.conversation,
    )
    expect(suite.modele.appels).toHaveLength(1)
    expect(suite.r.texte).toContain('Sophie Marchand — carte professionnelle')
  })
  it('un agent : pas de niveau 2, un nom proche du sien ne le désigne pas', async () => {
    const s = session()
    const { r, modele } = await tour(
      s,
      agent('A-11'),
      outil('gerer_absence', { agent: 'Aisha', jour: '2026-10-11' }),
      'Aisha ne vient pas demain',
    )
    expect(r).toEqual({
      sorte: 'refus',
      texte: 'Tu ne peux désigner que toi-même : « Aisha » ne te désigne pas.',
    })
    expect(modele.appels).toHaveLength(1)
    expect(s.journal.historique('D-V-17')).toEqual([])
  })
  it('le planning d’un agent sans vacation dit son nom complet : le patron voit qui l’outil a compris', async () => {
    const s = session()
    const { r } = await tour(
      s,
      PATRON,
      outil('voir_planning', { agent: 'Laura', du: '2026-12-01', au: '2026-12-02' }),
      'Le planning de Laura début décembre',
    )
    expect(r).toEqual({ sorte: 'resultat', texte: 'Aucune vacation pour Laura Petit.' })
  })
})

describe('les heures d’un agent, ou de tous : un geste codé qui lit (geste commandé le 2026-10-15)', () => {
  // Chiffres à la main sur `planning.csv`, par jour de début : semaine du 05/10
  // au 11/10, A-1 V-01 + V-02 = 24 h ; A-2 V-04 (nuit, 12 h) + V-05 (4 h) = 16 h ;
  // A-4 V-08, nuit du 10 au 11, 12 h ; semaine du 12/10 au 18/10, A-4 0 h.
  const heures = (agent: string | null, du: string | null, au: string | null) =>
    outil('heures_par_agent', { agent, du, au })

  it('le patron nomme un agent : ses heures sur la période, rendues par le code, sans échappée', async () => {
    const s = session()
    const { r, conversation } = await tour(
      s,
      PATRON,
      heures('Karim', '2026-10-05', '2026-10-11'),
      'Donne-moi les heures de Karim du 5 au 11 octobre.',
    )
    expect(r).toEqual({
      sorte: 'resultat',
      texte: 'Karim Haddad : 24 h du 05/10/2026 au 11/10/2026.',
    })
    expect(lignes(s, conversation).find((l) => l.type === 'consigne')?.issue).toBe('action')
    expect(lignes(s, conversation).filter((l) => l.type === TYPE_APPEL)).toHaveLength(1)
    expect(lignes(s, conversation).filter((l) => l.type === TYPE_ECHAPPEE)).toEqual([])
  })
  it('une nuit compte entière sur son jour de début', async () => {
    const s = session()
    const julien = await tour(s, PATRON, heures('Julien', '2026-10-05', '2026-10-11'))
    expect(julien.r.texte).toBe('Julien Lefèvre : 16 h du 05/10/2026 au 11/10/2026.')
    const moussa = await tour(s, PATRON, heures('Moussa', '2026-10-05', '2026-10-11'))
    expect(moussa.r.texte).toBe('Moussa Diallo : 12 h du 05/10/2026 au 11/10/2026.')
    const ensuite = await tour(s, PATRON, heures('Moussa', '2026-10-12', '2026-10-18'))
    expect(ensuite.r.texte).toBe('Moussa Diallo : 0 h du 12/10/2026 au 18/10/2026.')
  })
  it('tous : chaque agent du planning, 0 h compris, du moins d’heures au plus ; à égalité, l’ordre du planning', async () => {
    const { r } = await tour(
      session(),
      PATRON,
      heures(null, '2026-10-05', '2026-10-11'),
      "Qui a le moins d'heures cette semaine ?",
    )
    expect(r).toEqual({
      sorte: 'resultat',
      texte: [
        'Les heures de chaque agent du 05/10/2026 au 11/10/2026 :',
        'Thomas Girard : 0 h',
        'Nadia Belkacem : 0 h',
        'Mehdi Saïdi : 0 h',
        'Nicolas Robert : 0 h',
        'Pierre Moreau : 0 h',
        'Laura Petit : 0 h',
        'Sophie Marchand : 12 h',
        'Moussa Diallo : 12 h',
        'Isabelle Fontaine : 12 h',
        'Aïcha Traoré : 12 h',
        'Julien Lefèvre : 16 h',
        'Karim Haddad : 24 h',
        'Kevin Nguyen : 24 h',
      ].join('\n'),
    })
  })
  it('une borne nulle ne borne pas : depuis un jour, ou tout le planning', async () => {
    const s = session()
    const depuis = await tour(s, PATRON, heures('Karim', '2026-10-01', null))
    expect(depuis.r.texte).toBe('Karim Haddad : 36 h depuis le 01/10/2026.')
    const tout = await tour(s, PATRON, heures(null, null, null))
    expect(tout.r.texte).toMatch(/^Les heures de chaque agent sur tout le planning :\n/)
    expect(tout.r.texte).toContain('\nKarim Haddad : 36 h')
  })
  it('un agent ne compte que ses heures, sans nom ; un collègue nommé est refusé (D4)', async () => {
    const s = session()
    const siennes = await tour(s, agent('A-3'), heures(null, '2026-10-05', '2026-10-11'))
    expect(siennes.r).toEqual({
      sorte: 'resultat',
      texte: 'Tes heures du 05/10/2026 au 11/10/2026 : 12 h.',
    })
    const autre = await tour(
      s,
      agent('A-3'),
      heures('Julien', '2026-10-05', '2026-10-11'),
      "Combien d'heures a fait Julien cette semaine ?",
    )
    expect(autre.r).toEqual({
      sorte: 'refus',
      texte: 'Tu ne peux désigner que toi-même : « Julien » ne te désigne pas.',
    })
  })
  it('une période inversée : refusée, rien n’est compté', async () => {
    const { r } = await tour(session(), PATRON, heures('Karim', '2026-10-11', '2026-10-05'))
    expect(r).toEqual({ sorte: 'refus', texte: 'La période est inversée.' })
  })
})

describe('une demande nouvelle qui nomme quelqu’un : le nom ne part pas à l’échappée (PLAN-PSEUDONYMES.md S3)', () => {
  const nouvelle: Scripte = {
    outil: 'demande_nouvelle',
    entree: { intention: 'heures_par_agent', resume: 'x' },
  }
  const heures: Scripte = {
    outil: 'requete',
    entree: {
      sql: "SELECT agent, SUM(heures) AS heures FROM vacations WHERE jour BETWEEN '2026-10-05' AND '2026-10-11' GROUP BY agent",
    },
  }
  const repondre = (texte: string): Scripte => ({ outil: 'repondre', entree: { texte } })
  /** Ce que l'échappée a envoyé : tout appel après la traduction. */
  const echappe = (appels: { messages: unknown }[]) => appels.map((a) => JSON.stringify(a.messages))
  const appelsEchappee = (s: Session, conversation: string) =>
    lignes(s, conversation).filter((l) => l.type === TYPE_APPEL && l.issue === 'echappee')
  const echappeeDe = (s: Session, conversation: string) => {
    const l = lignes(s, conversation).find((x) => x.type === TYPE_ECHAPPEE)
    return { motif: l?.motif, donnees: JSON.parse(l?.donnees ?? '{}') }
  }

  it('une correspondance sûre : l’identifiant part, le nom revient dans la réponse', async () => {
    const s = session()
    const consigne = "Combien d'heures a fait Karim cette semaine ?"
    const { r, modele, conversation } = await tour(
      s,
      PATRON,
      [nouvelle, heures, repondre('A-1 a fait 24 heures.')],
      consigne,
    )
    expect(r).toEqual({ sorte: 'resultat', texte: 'Karim Haddad a fait 24 heures.' })
    const [, ...apres] = echappe(modele.appels)
    expect(apres.length).toBe(2)
    for (const m of apres) expect(m).not.toContain('Karim')
    expect(apres[0]).toContain("Combien d'heures a fait A-1 cette semaine ?")
    expect(echappeeDe(s, conversation)).toMatchObject({
      motif: consigne,
      donnees: {
        consigne_modele: "Combien d'heures a fait A-1 cette semaine ?",
        texte_modele: 'A-1 a fait 24 heures.',
        texte: 'Karim Haddad a fait 24 heures.',
      },
    })
  })

  it('un nom proche : la question avant tout appel d’échappée ; « 1 » relance la demande avec l’identifiant', async () => {
    const s = session()
    const consigne = "Combien d'heures a fait Kareem cette semaine ?"
    const premier = await tour(s, PATRON, [nouvelle], consigne)
    expect(premier.r).toEqual({
      sorte: 'precision',
      texte: 'Vous parlez de qui : Karim Haddad ?',
      candidats: [{ id: 'A-1', nom: 'Karim Haddad', sorte: 'personne' }],
    })
    expect(premier.modele.appels).toHaveLength(1)
    expect(appelsEchappee(s, premier.conversation)).toEqual([])
    expect(lignes(s, premier.conversation).at(-1)?.type).toBe(TYPE_PRECISION_ATTENDUE)

    const reponse = await tour(
      s,
      PATRON,
      [heures, repondre('A-1 a fait 24 heures.')],
      '1',
      premier.conversation,
    )
    expect(reponse.r).toEqual({ sorte: 'resultat', texte: 'Karim Haddad a fait 24 heures.' })
    expect(reponse.modele.appels).toHaveLength(2)
    expect(echappe(reponse.modele.appels)[0]).toContain(
      "Combien d'heures a fait A-1 cette semaine ?",
    )
    for (const m of echappe(reponse.modele.appels)) expect(m).not.toContain('Kareem')
    expect(echappeeDe(s, premier.conversation)).toMatchObject({
      motif: consigne,
      donnees: { consigne_modele: "Combien d'heures a fait A-1 cette semaine ?" },
    })
    const consignes = lignes(s, premier.conversation).filter((l) => l.type === 'consigne')
    expect(consignes.map((l) => l.issue)).toEqual(['nouvelle', 'precision'])
  })

  it('un prénom que deux agents partagent : la question, puis le nom répondu', async () => {
    const s = session((dossier) => {
      const agents = join(dossier, 'agents.csv')
      writeFileSync(
        agents,
        `${readFileSync(agents, 'utf8').trimEnd()}\nA-14;Aïcha Mansouri;surveillance-humaine;2023-03-01;2028-02-29;;oui;oui;;;;;;;;;;\n`,
      )
    })
    const premier = await tour(s, PATRON, [nouvelle], "Combien d'heures a fait Aïcha ?")
    expect(premier.r).toMatchObject({
      sorte: 'precision',
      texte: 'Vous parlez de qui : Aïcha Traoré ou Aïcha Mansouri ?',
    })
    const reponse = await tour(
      s,
      PATRON,
      [repondre('A-14 : aucune heure.')],
      'Mansouri',
      premier.conversation,
    )
    expect(reponse.r).toEqual({ sorte: 'resultat', texte: 'Aïcha Mansouri : aucune heure.' })
    expect(echappe(reponse.modele.appels)[0]).toContain("Combien d'heures a fait A-14 ?")
  })

  it('aucune correspondance : le mot passe tel quel, sans question', async () => {
    const s = session()
    const { r, modele } = await tour(
      s,
      PATRON,
      [nouvelle, repondre('Personne ne s’appelle ainsi.')],
      "Combien d'heures a fait Bidule ?",
    )
    expect(r.sorte).toBe('resultat')
    expect(echappe(modele.appels)[1]).toContain("Combien d'heures a fait Bidule ?")
  })

  it('un agent qui nomme un collègue : ni question ni nom ; il ne lit que ses données', async () => {
    const s = session()
    const { r, modele, conversation } = await tour(
      s,
      agent('A-2'),
      [nouvelle, heures, repondre('Je ne vois que tes heures : A-2, 16 heures.')],
      "Combien d'heures a fait Karim cette semaine ?",
    )
    expect(r).toEqual({
      sorte: 'resultat',
      texte: 'Je ne vois que tes heures : Julien Lefèvre, 16 heures.',
    })
    const [, ...apres] = echappe(modele.appels)
    for (const m of apres) {
      expect(m).not.toContain('Karim')
      expect(m).not.toContain('Julien')
    }
    expect(modele.appels[1]?.systeme).toContain("Tu travailles pour l'agent A-2 ")
    expect(echappeeDe(s, conversation).donnees.consigne_modele).toBe(
      "Combien d'heures a fait A-1 cette semaine ?",
    )
  })
})
