import { describe, expect, it } from 'vitest'
import { verifierReponse } from './reponse'

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
})
