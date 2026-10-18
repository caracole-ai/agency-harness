import { describe, expect, it } from 'vitest'
import type { ResultatRequete } from './requete'
import { remplirPhrase, sansTrous, TROU } from './trous'

// La phrase à trous : chaque trou désigne une cellule d'un résultat reçu, le
// code remplit ; un trou qui ne se résout pas retire la réponse.

const T1: ResultatRequete = {
  colonnes: ['agent', 'heures', 'taux'],
  lignes: [
    ['A-2', 16, 1.5],
    ['A-9', 24, 0.75],
  ],
  tronque: false,
}
const T2: ResultatRequete = { colonnes: ['total'], lignes: [[40.5]], tronque: false }

describe('remplirPhrase', () => {
  it('remplit une cellule par son nom de colonne, par son rang, et le nombre de lignes', () => {
    expect(remplirPhrase('{T1.1.agent} a fait {T1.1.heures} h sur {T1.n} agents.', [T1])).toEqual({
      ok: true,
      texte: 'A-2 a fait 16 h sur 2 agents.',
      valeurs: ['A-2', '16', '2'],
    })
    expect(remplirPhrase('{T1.2.2} h', [T1])).toMatchObject({ ok: true, texte: '24 h' })
  })
  it('un nombre non entier prend deux décimales, comme le modèle l’a lu', () => {
    expect(remplirPhrase('{T1.1.taux} et {T2.1.total}', [T1, T2])).toMatchObject({
      ok: true,
      texte: '1.50 et 40.50',
    })
  })
  it('le nom d’une colonne se lit sans casse ni espaces de bord', () => {
    expect(remplirPhrase('{T1.1. Heures }', [T1])).toMatchObject({ ok: true, texte: '16' })
  })
  it('un tableau, une ligne ou une colonne absents : le trou ne se résout pas, avec son motif', () => {
    expect(remplirPhrase('{T3.1.heures}', [T1])).toEqual({
      ok: false,
      motif: "{T3.1.heures} : le tableau T3 n'existe pas",
    })
    expect(remplirPhrase('{T1.3.heures}', [T1])).toEqual({
      ok: false,
      motif: "{T1.3.heures} : T1 n'a pas de ligne 3",
    })
    expect(remplirPhrase('{T1.1.minutes}', [T1])).toEqual({
      ok: false,
      motif: "{T1.1.minutes} : T1 n'a pas de colonne « minutes »",
    })
    expect(remplirPhrase('{T1.1}', [T1])).toEqual({
      ok: false,
      motif: '{T1.1} : la colonne manque',
    })
    expect(remplirPhrase('{T1.1.heures}', [])).toMatchObject({ ok: false })
  })
  it('le nombre de lignes d’un résultat tronqué n’est pas connu', () => {
    expect(remplirPhrase('{T1.n}', [{ ...T1, tronque: true }])).toEqual({
      ok: false,
      motif: "{T1.n} : T1 est tronqué, son nombre de lignes n'est pas connu",
    })
  })
  it('une phrase sans trou reste telle quelle', () => {
    expect(remplirPhrase('Je n’ai pas la donnée.', [])).toEqual({
      ok: true,
      texte: 'Je n’ai pas la donnée.',
      valeurs: [],
    })
  })
})

describe('sansTrous et la grammaire', () => {
  it('retire chaque trou, un espace à sa place', () => {
    expect(sansTrous('{T1.1.agent} a fait {T1.1.heures} h.')).toBe('  a fait   h.')
  })
  it('un trou mal formé n’en est pas un : il reste dans la phrase, et le contrôle le lit', () => {
    expect([...'{T1.1.heures} {T1} {1.1.heures} {t1.1.h}'.matchAll(TROU)].map((m) => m[0])).toEqual(
      ['{T1.1.heures}'],
    )
  })
})
