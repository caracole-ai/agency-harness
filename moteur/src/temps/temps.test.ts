import { describe, expect, it } from 'vitest'
import { auPlusTardAvant, echeance, limitePeriodique, type RegleDeDecompte } from './delais'
import { estFerie, joursFeries, paques } from './feries'
import {
  couverture,
  dureeHeures,
  heuresDans,
  intervalle,
  reposHeures,
  valideLe,
} from './intervalles'
import { Temporal } from './temporal'

const d = (s: string) => Temporal.PlainDate.from(s)
const iso = (x: Temporal.PlainDate) => x.toString()

describe('jours fériés', () => {
  it('Pâques', () => {
    expect(['2024', '2025', '2026', '2027'].map((a) => iso(paques(Number(a))))).toEqual([
      '2024-03-31',
      '2025-04-20',
      '2026-04-05',
      '2027-03-28',
    ])
  })
  it('onze jours en 2026, dont les mobiles', () => {
    const f = joursFeries(2026).map(iso)
    expect(f).toHaveLength(11)
    expect(f).toEqual(expect.arrayContaining(['2026-04-06', '2026-05-14', '2026-05-25']))
  })
  it('Alsace-Moselle : le 26 décembre, et le Vendredi saint selon la commune', () => {
    expect(estFerie(d('2026-12-26'))).toBe(false)
    expect(estFerie(d('2026-12-26'), { alsaceMoselle: { vendrediSaint: false } })).toBe(true)
    expect(estFerie(d('2026-04-03'), { alsaceMoselle: { vendrediSaint: false } })).toBe(false)
    expect(estFerie(d('2026-04-03'), { alsaceMoselle: { vendrediSaint: true } })).toBe(true)
  })
})

// Avocats : CPC 641 (jour de l'acte exclu, même quantième en mois) et 642 (report).
const CPC: RegleDeDecompte = {
  jourDeDepartExclu: true,
  nonComptes: [],
  reportSi: ['samedi', 'dimanche', 'férié'],
}
// Transport : CMR art. 30 (réserves sous 7 jours, dimanches et fériés non compris, jour de livraison exclu).
const CMR: RegleDeDecompte = {
  jourDeDepartExclu: true,
  nonComptes: ['dimanche', 'férié'],
  reportSi: [],
}

describe('délais : avocats (CPC 640 à 642)', () => {
  it('un mois à compter du 31 janvier finit le 28 février, un samedi : reporté au lundi', () => {
    expect(iso(echeance(d('2026-01-31'), { mois: 1 }, CPC))).toBe('2026-03-02')
  })
  it('quinze jours qui finissent le 1er mai : reportés au lundi 4', () => {
    expect(iso(echeance(d('2026-04-16'), { jours: 15 }, CPC))).toBe('2026-05-04')
  })
  it('un délai qui finit un mardi ordinaire ne bouge pas', () => {
    expect(iso(echeance(d('2026-04-21'), { jours: 14 }, CPC))).toBe('2026-05-05')
  })
})

describe('délais : transport', () => {
  it('CMR 30 : livraison le mercredi 8 juillet, sept jours sans le dimanche ni le 14 juillet', () => {
    expect(iso(echeance(d('2026-07-08'), { jours: 7 }, CMR))).toBe('2026-07-17')
  })
  it('L133-3 : le dimanche compté ou non, deux lectures, deux dates', () => {
    const fériésSeuls: RegleDeDecompte = {
      jourDeDepartExclu: true,
      nonComptes: ['férié'],
      reportSi: [],
    }
    const etDimanche: RegleDeDecompte = { ...fériésSeuls, nonComptes: ['férié', 'dimanche'] }
    // réception le vendredi 8 mai (férié), trois jours qui suivent
    expect(iso(echeance(d('2026-05-08'), { jours: 3 }, fériésSeuls))).toBe('2026-05-11')
    expect(iso(echeance(d('2026-05-08'), { jours: 3 }, etDimanche))).toBe('2026-05-12')
  })
  it('un décompte non défini lève au lieu de deviner', () => {
    expect(() =>
      echeance(
        d('2026-05-08'),
        { jours: 3 },
        { jourDeDepartExclu: false, nonComptes: ['férié'], reportSi: [] },
      ),
    ).toThrow()
  })
})

describe('délais : sécurité privée', () => {
  it('trois mois avant le 31 janvier, ce n’est pas J-90', () => {
    expect(iso(auPlusTardAvant(d('2027-01-31'), { mois: 3 }))).toBe('2026-10-31')
    expect(iso(auPlusTardAvant(d('2027-01-31'), { jours: 90 }))).toBe('2026-11-02')
  })
})

describe('intervalles', () => {
  it('vacation de nuit, passage à l’heure d’hiver (25/10/2026) : 11 h réelles', () => {
    expect(dureeHeures(intervalle('2026-10-24T21:00', '2026-10-25T07:00'))).toBe(11)
  })
  it('passage à l’heure d’été (29/03/2026) : 9 h réelles', () => {
    expect(dureeHeures(intervalle('2026-03-28T21:00', '2026-03-29T07:00'))).toBe(9)
  })
  it('T-07 : sortie de nuit à 7 h, reprise à 15 h : 8 h de repos', () => {
    const nuit = intervalle('2026-10-05T21:00', '2026-10-06T07:00')
    const apres = intervalle('2026-10-06T15:00', '2026-10-06T23:00')
    expect(reposHeures(nuit, apres)).toBe(8)
  })
  it('les heures d’une fenêtre ne comptent que la part qui y tombe', () => {
    const semaine = intervalle('2026-10-05T00:00', '2026-10-12T00:00')
    const vacations = [
      intervalle('2026-10-04T21:00', '2026-10-05T07:00'), // 7 h dans la semaine
      intervalle('2026-10-07T08:00', '2026-10-07T20:00'), // 12 h
      intervalle('2026-10-11T21:00', '2026-10-12T07:00'), // 3 h
    ]
    expect(heuresDans(vacations, semaine)).toBe(22)
  })
  it('un intervalle inversé lève', () => {
    expect(() => intervalle('2026-10-06T07:00', '2026-10-05T21:00')).toThrow()
  })
})

describe('validité à une date', () => {
  const carte = [{ du: d('2021-10-12'), au: d('2026-10-11') }]
  it('valide jusqu’à son dernier jour inclus', () => {
    expect(valideLe(carte, d('2026-10-11'))).toBe(true)
    expect(valideLe(carte, d('2026-10-12'))).toBe(false)
  })
  it('une vacation de nuit qui commence le dernier jour : couverture partielle, le moteur ne tranche pas', () => {
    expect(couverture(carte, intervalle('2026-10-11T21:00', '2026-10-12T07:00'))).toBe('partielle')
    expect(couverture(carte, intervalle('2026-10-10T21:00', '2026-10-11T07:00'))).toBe('entière')
    expect(couverture(carte, intervalle('2026-10-12T21:00', '2026-10-13T07:00'))).toBe('aucune')
  })
  it('un récépissé qui prend la suite couvre la nuit entière', () => {
    const avecRecepisse = [...carte, { du: d('2026-10-12'), au: d('2027-01-12') }]
    expect(couverture(avecRecepisse, intervalle('2026-10-11T21:00', '2026-10-12T07:00'))).toBe(
      'entière',
    )
  })
})

describe('obligation périodique (recyclage)', () => {
  const diplome = Temporal.PlainDate.from('2020-03-10')
  const trois = { ans: 3 }
  it('sans recyclage : valide jusqu’au premier anniversaire triennal inclus', () => {
    expect(limitePeriodique(diplome, trois, []).toString()).toBe('2023-03-10')
  })
  it('un recyclage avant l’échéance couvre jusqu’à la suivante', () => {
    expect(
      limitePeriodique(diplome, trois, [Temporal.PlainDate.from('2023-01-15')]).toString(),
    ).toBe('2026-03-10')
  })
  it('le jour même de l’échéance compte encore', () => {
    expect(
      limitePeriodique(diplome, trois, [Temporal.PlainDate.from('2023-03-10')]).toString(),
    ).toBe('2026-03-10')
  })
  it('un recyclage fait après une échéance dépassée ne rattrape rien', () => {
    expect(
      limitePeriodique(diplome, trois, [Temporal.PlainDate.from('2023-06-01')]).toString(),
    ).toBe('2023-03-10')
  })
  it('deux recyclages dans la même période ne prolongent pas deux fois', () => {
    const r = ['2022-05-01', '2022-11-01'].map((x) => Temporal.PlainDate.from(x))
    expect(limitePeriodique(diplome, trois, r).toString()).toBe('2026-03-10')
  })
})
