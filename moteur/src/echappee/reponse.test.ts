import { describe, expect, it } from 'vitest'
import { citations, contient, verifierReponse } from './reponse'

// Le contrôle de la réponse : chaque nombre, chaque date et chaque nom connu
// cité vient des sorties d'outils (PLAN-ESPACES.md § 6.8).

const SOURCES = ['nom | heures\nMehdi Saïdi | 0\nThomas Girard | 0\nJulien Lefèvre | 16']
const NOMS = ['Mehdi Saïdi', 'Thomas Girard', 'Julien Lefèvre', 'Karim Haddad']

describe('verifierReponse', () => {
  it('nombres et prénoms tous dans les sources → ok', () => {
    expect(verifierReponse('Mehdi et Thomas : 0 h. Puis Julien, 16 h.', SOURCES, NOMS)).toEqual({
      ok: true,
    })
  })
  it('un nombre inventé → intrus', () => {
    expect(verifierReponse('Mehdi et Thomas : 0 h. Puis Julien, 17 h.', SOURCES, NOMS)).toEqual({
      ok: false,
      intrus: ['17'],
    })
  })
  it('un nom connu absent des sources → intrus', () => {
    const r = verifierReponse('Mehdi et Karim : 0 h.', SOURCES, NOMS)
    expect(r).toEqual({ ok: false, intrus: ['Karim'] })
  })
  it('une date JJ/MM trouvée sous sa forme ISO → ok', () => {
    expect(verifierReponse('dim. 11/10', ['V-04 | 2026-10-11 | 12'], NOMS)).toEqual({ ok: true })
  })
  it('une date JJ/MM/AAAA trouvée sous sa forme ISO → ok', () => {
    expect(verifierReponse('le 11/10/2026', ['2026-10-11T08:00'], NOMS)).toEqual({ ok: true })
  })
  it('une date absente des sources → intrus, sous sa forme écrite', () => {
    expect(verifierReponse('mar. 13/10', ['2026-10-11 | 13 | 10'], NOMS)).toEqual({
      ok: false,
      intrus: ['13/10'],
    })
  })
  it('un nombre se trouve dans une date ISO des sources', () => {
    expect(verifierReponse('le 11', ['2026-10-11'], NOMS)).toEqual({ ok: true })
  })
  it('une date ISO du texte se cherche entière', () => {
    expect(verifierReponse('le 2026-10-11', ['2026-10-11T08:00'], NOMS)).toEqual({ ok: true })
    expect(verifierReponse('le 2026-10-12', ['2026-10-11T08:00'], NOMS)).toEqual({
      ok: false,
      intrus: ['2026-10-12'],
    })
  })
  it('une date connue du harnais se cite comme date et par son année, pas par ses nombres', () => {
    const connues = ['2026-10-05']
    expect(verifierReponse('lundi 2026-10-05, le 05/10, en 2026', [], NOMS, connues)).toEqual({
      ok: true,
    })
    expect(verifierReponse('le 5', [], NOMS, connues)).toEqual({ ok: false, intrus: ['5'] })
    expect(verifierReponse('le 10', [], NOMS, connues)).toEqual({ ok: false, intrus: ['10'] })
  })
  it('une heure : ses nombres se cherchent comme les autres', () => {
    expect(verifierReponse('à 08:00', ['debut | 2026-10-11T08:00'], NOMS)).toEqual({ ok: true })
    expect(verifierReponse('à 8 h', ['debut | 2026-10-11T08:00'], NOMS)).toEqual({
      ok: false,
      intrus: ['8'],
    })
  })
  it('texte sans nombre ni nom → ok', () => {
    expect(verifierReponse('Personne demain, ni de la semaine.', SOURCES, NOMS)).toEqual({
      ok: true,
    })
  })
  it('sans accent dans le texte, avec accent dans les sources → trouvé', () => {
    expect(verifierReponse('Saidi : 0 h.', SOURCES, NOMS)).toEqual({ ok: true })
    expect(verifierReponse('LEFEVRE : 16 h.', SOURCES, NOMS)).toEqual({ ok: true })
  })
  it('un nombre n’est pas trouvé comme fragment d’un autre', () => {
    expect(verifierReponse('6 h', ['heures | 16'], NOMS)).toEqual({ ok: false, intrus: ['6'] })
  })
  it('virgule décimale lue comme point', () => {
    expect(verifierReponse('16,5 h', ['heures | 16.5'], NOMS)).toEqual({ ok: true })
  })
  it('un mot de nom se compare sur mots entiers', () => {
    expect(verifierReponse('Karimette : 0 h.', SOURCES, NOMS)).toEqual({ ok: true })
  })
  it('intrus dans l’ordre d’apparition, sans doublon', () => {
    expect(
      verifierReponse('Karim : 17 h, puis Haddad : 17 h, puis Julien : 9 h.', SOURCES, NOMS),
    ).toEqual({ ok: false, intrus: ['Karim', '17', 'Haddad', '9'] })
  })
  it('un identifiant (nom sans mot de 3 lettres) est cité en entier', () => {
    expect(verifierReponse('Poste P-1.', ['id | site\nP-1 | Galerie'], ['P-1', 'P-2'])).toEqual({
      ok: true,
    })
    expect(verifierReponse('Poste P-2.', ['id | site\nP-1 | Galerie'], ['P-1', 'P-2'])).toEqual({
      ok: false,
      intrus: ['P-2', '2'],
    })
  })
  it('un identifiant se cite tel qu’écrit : « il y a 4 » n’est pas A-4, « A-41 » pas A-4', () => {
    const noms = ['A-4', 'A-1']
    expect(verifierReponse('Il y a 4 vacations de nuit.', ['nb\n4'], noms)).toEqual({ ok: true })
    expect(verifierReponse('A-41 et a-1 : 4.', ['a-1 | 4\nA-41'], noms)).toEqual({ ok: true })
    expect(verifierReponse('A-4 a 4 vacations.', ['nb\n4'], noms)).toEqual({
      ok: false,
      intrus: ['A-4'],
    })
  })
})

describe('citations et contient (la promotion, PLAN-PROMOTION.md § 6.2)', () => {
  it('citations : les nombres hors dates tels qu’écrits, les mots de nom connus cités, sans doublon', () => {
    expect(
      citations('Julien Lefèvre : 16 h (16,5 avec la pause) le 11/10 et le 2026-10-12.', NOMS),
    ).toEqual(['16', '16,5', 'Julien', 'Lefèvre'])
    expect(citations('Aucune vacation.', NOMS)).toEqual([])
    expect(citations('karim et saidi', NOMS)).toEqual(['karim', 'saidi'])
  })
  it('citations : un identifiant, une heure, une date avec son heure ne sont pas des quantités', () => {
    expect(
      citations(
        'Julien Lefèvre (A-2) : 16 heures sur 2 vacations du 5 au 11 octobre 2026, V-04 (du 07 à 20:00 au 08 à 08:00, 12 h) et V-05 (de 16:00 à 20:00, 4 h), puis D-V-17 à 8h30.',
        NOMS,
      ),
    ).toEqual(['16', '2', '5', '11', '12', '4', 'Julien', 'Lefèvre'])
  })
  it('contient : un mot sans accents ni casse, un nombre entier seulement', () => {
    expect(contient('Mehdi Saïdi : 16 heures', 'saidi')).toBe(true)
    expect(contient('V-14, le 14/10', '4')).toBe(false)
    expect(contient('4 vacations de nuit.', '4')).toBe(true)
    expect(contient('Julien : 16,5 h', '16')).toBe(false)
    expect(contient('Julien : 16,5 h', '16.5')).toBe(true)
    // Un nombre attendu ne se trouve pas dans une date, une heure ou un identifiant.
    expect(contient('9 heures du 2026-10-12 au 2026-10-18.', '12')).toBe(false)
    expect(contient('9 heures du 12/10 au 18/10.', '12')).toBe(false)
    expect(contient('Karim, V-11, de 20:00 à 08:00', '11')).toBe(false)
    expect(contient('12 heures du 2026-10-12 au 2026-10-18.', '12')).toBe(true)
  })
})

describe('l’argent (PLAN-METIER-2.md § 6.4, M11)', () => {
  const MARGE = ['projet | marge\nPRJ-01 | 12500']
  it('« 12 500,00 € » est cité pour 12500, quel que soit le séparateur de milliers', () => {
    for (const ecrit of ['12 500,00 €', '12\u00A0500,00 €', '12\u2009500 €', '12\u202F500,0 €']) {
      expect(verifierReponse(`Marge de PRJ-01 : ${ecrit}`, MARGE, [])).toEqual({ ok: true })
    }
    expect(verifierReponse('Marge : 12.500,00 €, soit 12500.0', MARGE, [])).toEqual({ ok: true })
    expect(contient(MARGE[0] ?? '', '12 500,00')).toBe(true)
    expect(contient('Marge : 12 500,00 €', '12500')).toBe(true)
  })
  it('les décimales se comparent sans leurs zéros de fin : 7,5 ≡ 7.50, jamais 75', () => {
    expect(verifierReponse('7,5 h, puis 1 234,66 €', ['h | total\n7.50 | 1234.66'], [])).toEqual({
      ok: true,
    })
    expect(contient('heures\n7.50', '7,5')).toBe(true)
    expect(verifierReponse('75 h', ['heures\n7.50'], [])).toEqual({ ok: false, intrus: ['75'] })
  })
  it('un chiffre absent des données reste refusé, avec séparateur de milliers ou décimales', () => {
    expect(verifierReponse('12 600,00 €', MARGE, [])).toEqual({ ok: false, intrus: ['12 600,00'] })
    expect(verifierReponse('1 250 €', MARGE, [])).toEqual({ ok: false, intrus: ['1 250'] })
    expect(verifierReponse('125,00 €', MARGE, [])).toEqual({ ok: false, intrus: ['125,00'] })
    expect(verifierReponse('12 500,50 €', MARGE, [])).toEqual({ ok: false, intrus: ['12 500,50'] })
    expect(verifierReponse('12.500.000 €', MARGE, [])).toEqual({
      ok: false,
      intrus: ['12.500.000'],
    })
    expect(contient('Marge : 12 500,50 €', '12500')).toBe(false)
    expect(contient('Marge : 1 250 €', '250')).toBe(false)
  })
  it('un nombre groupé par milliers ne s’accroche pas à une date : « le 13/10 500 € » cite 500', () => {
    expect(verifierReponse('le 13/10 500 €', ['2026-10-13'], [])).toEqual({
      ok: false,
      intrus: ['500'],
    })
  })
  it('« 2 026,00 € » et « 2026 € » ne sont pas des années ; « en 2026 » en reste une', () => {
    const connues = ['2026-10-12']
    expect(citations('Facture : 2 026,00 € HT', [])).toEqual(['2 026,00'])
    expect(citations('Facture : 2026 € HT, 2026,50 euros, 1999 euros', [])).toEqual([
      '2026',
      '2026,50',
      '1999',
    ])
    expect(citations('Chiffre de 2026 : 12 050 €', [])).toEqual(['12 050'])
    expect(verifierReponse('2 026,00 €', [], [], connues)).toEqual({
      ok: false,
      intrus: ['2 026,00'],
    })
    expect(verifierReponse('2026 €', [], [], connues)).toEqual({ ok: false, intrus: ['2026'] })
    expect(verifierReponse('2 026,00 €', ['montant\n2026'], [], connues)).toEqual({ ok: true })
    expect(verifierReponse('Marge en 2026 : 12 500 €', MARGE, [], connues)).toEqual({ ok: true })
    expect(citations('Marge en 2026 : 12 500 €', [])).toEqual(['12 500'])
    expect(contient('Marge en 2026 : 0 €', '2026')).toBe(false)
  })
  it('« 3/4 » n’est pas une date ; « 13/10 », « 8/10 » et « 13/10/2026 » en restent', () => {
    expect(citations('Les 3/4 des lots', [])).toEqual(['3', '4'])
    expect(verifierReponse('Les 3/4 des lots', ['3 | 4'], [])).toEqual({ ok: true })
    expect(verifierReponse('Les 3/4 des lots', ['2026-04-03'], [])).toEqual({
      ok: false,
      intrus: ['3', '4'],
    })
    expect(citations('le 13/10, le 8/10 et le 13/10/2026', [])).toEqual([])
    expect(
      verifierReponse('le 13/10, le 8/10 et le 13/10/2026', ['2026-10-13 | 2026-10-08'], []),
    ).toEqual({ ok: true })
    expect(verifierReponse('le 13/10', ['13 | 10'], [])).toEqual({ ok: false, intrus: ['13/10'] })
  })
  it('un mois d’un chiffre après un mot de date reste une date : une date inventée ne passe pas par ses nombres', () => {
    expect(verifierReponse('Absent le 5/3.', ['A-5 | A-3 | 2026-10-13'], [])).toEqual({
      ok: false,
      intrus: ['5/3'],
    })
    expect(verifierReponse('Le 1/1', ['1 | 1'], [])).toEqual({ ok: false, intrus: ['1/1'] })
    expect(verifierReponse('lundi 5/3', ['2026-03-05'], [])).toEqual({ ok: true })
    expect(citations('Les 3/4 des lots', [])).toEqual(['3', '4'])
  })
  it('un nombre n’est pas trouvé dans les décimales d’un autre (« 50 » dans « 0.50 »)', () => {
    expect(verifierReponse('Taux : 50', ['x\n0.50'], [])).toEqual({ ok: false, intrus: ['50'] })
    expect(verifierReponse('Taux : 0,50', ['x\n0.50'], [])).toEqual({ ok: true })
    expect(verifierReponse('16 h', ['heures | 16'], [])).toEqual({ ok: true })
  })
})
