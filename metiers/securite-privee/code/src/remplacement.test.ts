import { appendFileSync, cpSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Temporal } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  aParis,
  ecrire,
  ouvrir,
  repondre,
  type Session,
  STATUT,
  signalerAbsence,
  statut,
  suivre,
  valider,
} from './remplacement'

// Le remplacement sur le client fictif, de bout en bout, sur une copie (le
// planning y est réécrit). La proposition attendue est écrite à la main dans
// `attendu-remplacement.yaml`.

const exemple = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const attendu = parse(readFileSync(`${exemple}/attendu-remplacement.yaml`, 'utf8')) as {
  absence: { agent: string; jour: string; maintenant: string }
  vacation: string
  possibles: string[]
  exclus: Record<string, string[]>
  ecartes: Record<string, string[]>
}

/** Une copie neuve du client fictif, sans journal ni sorties ; `config` s'ajoute à sa config. */
function session(config = ''): Session {
  const dossier = mkdtempSync(join(tmpdir(), 'remplacement-'))
  cpSync(exemple, dossier, {
    recursive: true,
    filter: (f) => !/\.sqlite$|rapport-demo/.test(f),
  })
  appendFileSync(join(dossier, 'config.yaml'), config)
  return ouvrir(dossier)
}
const delegation = (conditions: string) =>
  `\ndelegations:\n  - action: remplacement\n    conditions: ${conditions}\n    accordee_le: "2026-10-09"\n    par: le patron\n`

const jour = Temporal.PlainDate.from(attendu.absence.jour)
const t0 = aParis(attendu.absence.maintenant)
const plus = (minutes: number) => t0.add({ minutes })
const absence = (s: Session) => signalerAbsence(s, attendu.absence.agent, jour, t0)
const agentDe = (s: Session, vacation: string) =>
  readFileSync(join(s.dossier, 'planning.csv'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${vacation};`))
    ?.split(';')[1]

describe('la proposition', () => {
  const s = session()
  const r = absence(s)
  if (r.statut !== STATUT.proposee) throw new Error(`statut ${r.statut}`)
  const p = r.proposition
  it('retrouve la vacation de l’absent', () => {
    expect(p.vacation).toBe(attendu.vacation)
    expect(r.demande).toBe(`D-${attendu.vacation}`)
  })
  it('les possibles, dans l’ordre des préférences du patron', () => {
    expect(p.possibles.map((c) => c.agent)).toEqual(attendu.possibles)
  })
  it('les exclus, avec les interdits en cause', () => {
    expect(Object.fromEntries(p.exclus.map((c) => [c.agent, c.regles]))).toEqual(attendu.exclus)
  })
  it('les écartés faute de donnée', () => {
    expect(Object.fromEntries(p.ecartes.map((c) => [c.agent, c.regles]))).toEqual(attendu.ecartes)
  })
})

describe('le chemin nominal', () => {
  const s = session()
  const r = absence(s)
  it('validé, accepté, écrit dans le planning, tout au journal', () => {
    const demande = `D-${attendu.vacation}`
    expect(() => ecrire(s, demande, 'A-2', plus(1))).toThrow(/aucune validation/)
    const v = valider(s, demande, plus(2))
    expect(v.statut).toBe(STATUT.demandee)
    expect(() => ecrire(s, demande, 'A-1', plus(3))).toThrow(/diffère/)
    const e = repondre(s, demande, true, plus(5))
    expect(e.statut).toBe(STATUT.ecrite)
    expect(agentDe(s, attendu.vacation)).toBe('A-2')
    expect(
      s.journal
        .historique(demande)
        .filter((l) => l.type === 'remplacement')
        .map((l) => l.issue),
    ).toEqual([
      STATUT.recue,
      STATUT.proposee,
      STATUT.validee,
      STATUT.demandee,
      STATUT.acceptee,
      STATUT.ecrite,
    ])
    expect(s.journal.historique(attendu.absence.agent).some((l) => l.type === 'absence')).toBe(true)
    expect(r.statut).toBe(STATUT.proposee)
  })
})

describe('le patron décide vraiment', () => {
  it('il peut choisir un autre possible ; l’écart est gardé', () => {
    const s = session()
    absence(s)
    valider(s, 'D-V-17', plus(1), 'A-1')
    const validee = s.journal.historique('D-V-17').find((l) => l.issue === STATUT.validee)
    expect(JSON.parse(validee?.donnees ?? '{}')).toMatchObject({ agent: 'A-1', propose: 'A-2' })
  })
  it('il ne peut pas choisir un exclu : un interdit ne se lève pas', () => {
    const s = session()
    absence(s)
    expect(() => valider(s, 'D-V-17', plus(1), 'A-3')).toThrow(/ne se lève pas/)
    expect(statut(s, 'D-V-17')).toBe(STATUT.proposee)
  })
})

describe('les sorties', () => {
  it('l’agent dit non : le suivant est proposé au patron', () => {
    const s = session()
    absence(s)
    valider(s, 'D-V-17', plus(1))
    const r = repondre(s, 'D-V-17', false, plus(4))
    if (r.statut !== STATUT.proposee) throw new Error(r.statut)
    expect(r.proposition.possibles.map((c) => c.agent)).toEqual(attendu.possibles.slice(1))
    expect(agentDe(s, 'V-17')).toBe('A-11')
  })
  it('pas de réponse après l’attente : même chose', () => {
    const s = session()
    absence(s)
    valider(s, 'D-V-17', plus(1))
    expect(suivre(s, 'D-V-17', plus(20))).toBeNull()
    const r = suivre(s, 'D-V-17', plus(31))
    expect(r?.statut).toBe(STATUT.proposee)
  })
  it('passé le début de la vacation : trop tard', () => {
    const s = session()
    absence(s)
    const r = valider(s, 'D-V-17', aParis('2026-10-11T08:00'))
    expect(r.statut).toBe(STATUT.tropTard)
    expect(() => valider(s, 'D-V-17', aParis('2026-10-11T08:05'))).toThrow(/impossible/)
  })
  it('plus personne de possible : escalade (E-02)', () => {
    const s = session()
    absence(s)
    let r = valider(s, 'D-V-17', plus(1))
    for (let k = 0; k < attendu.possibles.length; k++) {
      r = repondre(s, 'D-V-17', false, plus(2 + k * 2))
      if (r.statut === STATUT.proposee) valider(s, 'D-V-17', plus(3 + k * 2))
    }
    expect(r.statut).toBe(STATUT.escaladee)
  })
  it('une demande en cours ne se double pas', () => {
    const s = session()
    absence(s)
    expect(() => absence(s)).toThrow(/déjà en cours/)
  })
})

describe('la délégation (G-01)', () => {
  it('après un premier succès validé par le patron, le harnais propose de déléguer', () => {
    const s = session()
    absence(s)
    valider(s, 'D-V-17', plus(1))
    const e = repondre(s, 'D-V-17', true, plus(5))
    if (e.statut !== STATUT.ecrite) throw new Error(e.statut)
    // signalée à 21 h 40 pour 8 h : 10 h 20 de prévenance ; Julien connaît le site
    expect(e.delegationProposee).toEqual({ connait_site: true, prevenu_avant_heures: 10 })
    expect(s.journal.historique('D-V-17').some((l) => l.type === 'délégation proposée')).toBe(true)
  })
  it('dans son cadre, la décision est validée par délégation, et l’agent reste sollicité', () => {
    const s = session(delegation('{ connait_site: true }'))
    const r = absence(s)
    if (r.statut !== STATUT.demandee) throw new Error(r.statut)
    expect(r.agent).toBe('A-2')
    expect(r.par).toMatch(/délégation du 2026-10-09/)
    const e = repondre(s, 'D-V-17', true, plus(5))
    if (e.statut !== STATUT.ecrite) throw new Error(e.statut)
    expect(e.delegationProposee).toBeUndefined()
    expect(agentDe(s, 'V-17')).toBe('A-2')
  })
  it('hors de son cadre, la décision revient au patron', () => {
    const s = session(delegation('{ connait_site: true, prevenu_avant_heures: 48 }'))
    const r = absence(s)
    if (r.statut !== STATUT.proposee) throw new Error(r.statut)
    expect(r.horsCadre).toEqual(['prevenu_avant_heures'])
  })
  it('une condition inconnue arrête le démarrage', () => {
    expect(() => session(delegation('{ toujours: true }'))).toThrow(/démarrage refusé/)
  })
})
