import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  confirmer,
  type Identite,
  modeleSimule,
  type Scripte,
  TYPE_APPEL,
  traiterConsigne,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { CONVERSATION } from './conversation'
import { ouvrirReaffectation, validerReaffectation } from './reaffectation'
import { aParis, type Session } from './remplacement'

// La conversation sur le client fictif, de bout en bout, sur une copie (le
// journal y est écrit), avec le modèle simulé (PLAN-ESPACES.md § 5.7).

const exemple = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const maintenant = aParis('2026-10-10T21:40')
const PATRON: Identite = { role: 'patron' }
const agent = (id: string): Identite => ({ role: 'agent', agent: id })

/** Une copie neuve du client fictif, sans journal ni sorties. */
function session(): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'conversation-'))
  cpSync(exemple, dossier, { recursive: true, filter: (f) => !/\.sqlite$|rapport-demo/.test(f) })
  return CONVERSATION.ouvrir(dossier)
}

let n = 0
/** Un tour, le modèle simulé jouant `pas`. */
async function tour(s: Session, identite: Identite, pas: Scripte[], consigne = 'consigne') {
  const modele = modeleSimule(pas)
  const conversation = `C-test-${++n}`
  const r = await traiterConsigne(CONVERSATION, s, modele, {
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
    outil('declarer_absence', { agent: 'A-11', jour: '2026-10-11' }),
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
  await tour(s, PATRON, outil('declarer_absence', { agent: 'A-11', jour: '2026-10-11' }))
  const valider = outil('valider_remplacement', { demande: 'D-V-17', agent: null })
  const { r, conversation } = await tour(s, PATRON, valider)
  if (r.sorte !== 'confirmation') throw new Error(`sorte ${r.sorte}`)

  it('demande d’abord un « oui » à la reformulation', () => {
    expect(r.texte).toMatch(/^Valider Julien Lefèvre \(A-2\) pour V-17/)
    expect(r.texte).toMatch(/\(oui \/ non\)$/)
  })
  it('une empreinte fausse, ou un autre demandeur : refus, et l’attente reste', () => {
    const faux = confirmer(CONVERSATION, s, PATRON, conversation, 'faux', true, maintenant)
    expect(faux.sorte).toBe('refus')
    const autre = confirmer(
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
  it('« oui » exécute ; la même confirmation une seconde fois est refusée', () => {
    const oui = confirmer(CONVERSATION, s, PATRON, conversation, r.empreinte, true, maintenant)
    expect(oui.sorte).toBe('resultat')
    expect(oui.texte).toContain("Message envoyé à l'agent")
    const encore = confirmer(CONVERSATION, s, PATRON, conversation, r.empreinte, true, maintenant)
    expect(encore).toEqual({
      sorte: 'refus',
      texte: 'aucune confirmation en attente pour ce contenu',
    })
  })
  it('l’agent sollicité peut répondre ; un autre agent non', async () => {
    const repondre = outil('repondre_sollicitation', { demande: 'D-V-17', oui: true })
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
    await tour(s2, PATRON, outil('declarer_absence', { agent: 'A-11', jour: '2026-10-11' }))
    const v = await tour(s2, PATRON, valider)
    if (v.r.sorte !== 'confirmation') throw new Error(`sorte ${v.r.sorte}`)
    const non = confirmer(
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
  it('voir_planning ignore l’agent demandé et rend les vacations de celui qui parle', async () => {
    const s = session()
    const { r } = await tour(
      s,
      agent('A-2'),
      outil('voir_planning', { agent: 'A-1', du: null, au: null }),
    )
    expect(r.sorte).toBe('resultat')
    expect(r.texte).toContain('V-04')
    expect(r.texte).toContain('V-05')
    expect(r.texte).not.toContain('Karim')
    expect(r.texte.split('\n')).toHaveLength(2)
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

describe('qui parle', () => {
  it('un agent inconnu, ou un patron qui se dit agent : refus, sans appel au modèle', async () => {
    const s = session()
    const inconnu = await tour(s, agent('A-99'), [{ texte: 'x' }])
    expect(inconnu.r.sorte).toBe('refus')
    expect(inconnu.modele.appels).toHaveLength(0)
    const patron = await tour(s, { role: 'patron', agent: 'A-1' }, [{ texte: 'x' }])
    expect(patron.r.sorte).toBe('refus')
    expect(patron.modele.appels).toHaveLength(0)
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
  it('le oui du patron valide et demande son accord à Mehdi', () => {
    const oui = confirmer(CONVERSATION, s, PATRON, conversation, r.empreinte, true, maintenant)
    expect(oui.sorte).toBe('resultat')
    expect(oui.texte).toMatch(/^Validé\. Message envoyé à 1 agent\(s\) : « Mehdi, peux-tu prendre/)
  })
  it('le oui de Mehdi, confirmé, écrit le planning', async () => {
    const id = `R-${conversation.replace(/^C-/, '')}`
    const mehdi = await tour(
      s,
      agent('A-9'),
      outil('repondre_reaffectation', { reaffectation: id, oui: true }),
    )
    if (mehdi.r.sorte !== 'confirmation') throw new Error(`sorte ${mehdi.r.sorte}`)
    expect(mehdi.r.texte).toMatch(/^Tu confirmes : OUI pour V-07/)
    const fin = confirmer(
      CONVERSATION,
      s,
      agent('A-9'),
      mehdi.conversation,
      mehdi.r.empreinte,
      true,
      maintenant,
    )
    expect(fin.sorte).toBe('resultat')
    expect(fin.texte).toMatch(/^Planning mis à jour\./)
  })
  it('un autre agent ne peut pas répondre à la place de Mehdi', async () => {
    const id = `R-${conversation.replace(/^C-/, '')}`
    const autre = await tour(
      s,
      agent('A-2'),
      outil('repondre_reaffectation', { reaffectation: id, oui: true }),
    )
    expect(autre.r).toEqual({
      sorte: 'refus',
      texte: 'cette sollicitation ne vous est pas adressée',
    })
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
