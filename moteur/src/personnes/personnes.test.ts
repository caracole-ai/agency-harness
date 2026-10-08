import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chargerPersonnes, FICHIER_PERSONNES, type Personne, recevoir } from './personnes'

const PERSONNES: Personne[] = [{ role: 'patron' }, { role: 'agent', agent: 'A-11' }]

describe('recevoir', () => {
  it('une entrée valide : reçue, telle quelle', () => {
    expect(recevoir(PERSONNES, { role: 'agent', agent: 'A-11' })).toEqual({
      sorte: 'reçu',
      identite: { role: 'agent', agent: 'A-11' },
    })
    expect(recevoir(PERSONNES, { role: 'patron' })).toEqual({
      sorte: 'reçu',
      identite: { role: 'patron' },
    })
  })
  it('un inconnu du registre : refusé', () => {
    expect(recevoir(PERSONNES, { role: 'agent', agent: 'A-99' })).toEqual({
      sorte: 'refus',
      motif: "inconnu au registre d'accès : A-99",
    })
    expect(recevoir([{ role: 'agent', agent: 'A-11' }], { role: 'patron' }).sorte).toBe('refus')
  })
  it('un rôle faux, une identité absente : refusés', () => {
    expect(recevoir(PERSONNES, { role: 'roi' })).toEqual({
      sorte: 'refus',
      motif: 'rôle inconnu : roi',
    })
    expect(recevoir(PERSONNES, undefined).sorte).toBe('refus')
    const long = recevoir(PERSONNES, { role: 'x'.repeat(10_000) })
    expect(long.sorte === 'refus' && long.motif.length).toBeLessThan(100)
    expect(recevoir(PERSONNES, 'patron').sorte).toBe('refus')
  })
  it('un agent sans identifiant, un identifiant qui n’est pas un texte : refusés', () => {
    expect(recevoir(PERSONNES, { role: 'agent' })).toEqual({
      sorte: 'refus',
      motif: 'un agent doit dire qui il est',
    })
    expect(recevoir(PERSONNES, { role: 'agent', agent: 11 }).sorte).toBe('refus')
  })
  it('un patron avec un identifiant d’agent : refusé, même si l’agent existe', () => {
    expect(recevoir(PERSONNES, { role: 'patron', agent: 'A-11' })).toEqual({
      sorte: 'refus',
      motif: "le patron parle en son nom : pas d'identifiant d'agent",
    })
  })
})

describe('chargerPersonnes', () => {
  const dossier = (yaml?: string) => {
    const d = mkdtempSync(join(tmpdir(), 'personnes-'))
    if (yaml !== undefined) writeFileSync(join(d, FICHIER_PERSONNES), yaml)
    return d
  }
  it('lit le registre', () => {
    expect(
      chargerPersonnes(dossier('personnes:\n  - role: patron\n  - { role: agent, agent: A-1 }\n')),
    ).toEqual([{ role: 'patron' }, { role: 'agent', agent: 'A-1' }])
  })
  it('absent, vide, en double, ou avec une clé de trop : refusé', () => {
    expect(() => chargerPersonnes(dossier())).toThrow(/registre d'accès absent/)
    expect(() => chargerPersonnes(dossier('personnes: []\n'))).toThrow(/invalide/)
    expect(() =>
      chargerPersonnes(
        dossier('personnes:\n  - { role: agent, agent: A-1 }\n  - { role: agent, agent: A-1 }\n'),
      ),
    ).toThrow(/agent A-1 en double/)
    expect(() =>
      chargerPersonnes(dossier('personnes:\n  - { role: patron, agent: A-1 }\n')),
    ).toThrow(/invalide/)
  })
})
