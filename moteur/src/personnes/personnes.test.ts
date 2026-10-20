import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CAPACITES, type RoleDeclare } from '../conversation/roles'
import { chargerPersonnes, FICHIER_PERSONNES, type Personne, recevoir } from './personnes'

const ROLES: RoleDeclare[] = [
  { id: 'patron', enMots: 'le patron', identifie: false, capacites: [...CAPACITES] },
  { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
]
const PERSONNES: Personne[] = [{ role: 'patron' }, { role: 'agent', personne: 'A-11' }]

describe('recevoir', () => {
  it('une entrée valide : reçue, l’identifiant sous `personne`', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'agent', personne: 'A-11' })).toEqual({
      sorte: 'reçu',
      identite: { role: 'agent', personne: 'A-11' },
    })
    expect(recevoir(ROLES, PERSONNES, { role: 'patron' })).toEqual({
      sorte: 'reçu',
      identite: { role: 'patron' },
    })
  })
  it('l’ancienne graphie `agent` n’est plus un identifiant (2026-10-18) : l’agent reste sans identifiant', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'agent', agent: 'A-11' })).toEqual({
      sorte: 'refus',
      motif: "l'agent doit donner son identifiant",
    })
  })
  it('un inconnu du registre : refusé', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'agent', personne: 'A-99' })).toEqual({
      sorte: 'refus',
      motif: "inconnu au registre d'accès : A-99",
    })
    expect(recevoir(ROLES, [{ role: 'agent', personne: 'A-11' }], { role: 'patron' })).toEqual({
      sorte: 'refus',
      motif: "le patron n'est pas au registre d'accès",
    })
  })
  it('un rôle faux, une identité absente : refusés', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'roi' })).toEqual({
      sorte: 'refus',
      motif: 'rôle inconnu : roi',
    })
    expect(recevoir(ROLES, PERSONNES, undefined).sorte).toBe('refus')
    const long = recevoir(ROLES, PERSONNES, { role: 'x'.repeat(10_000) })
    expect(long.sorte === 'refus' && long.motif.length).toBeLessThan(100)
    expect(recevoir(ROLES, PERSONNES, 'patron').sorte).toBe('refus')
  })
  it('un agent sans identifiant, un identifiant qui n’est pas un texte : refusés', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'agent' })).toEqual({
      sorte: 'refus',
      motif: "l'agent doit donner son identifiant",
    })
    expect(recevoir(ROLES, PERSONNES, { role: 'agent', personne: 11 })).toEqual({
      sorte: 'refus',
      motif: "l'identifiant doit être un texte",
    })
  })
  it('un patron avec un identifiant d’agent : refusé, même si l’agent existe', () => {
    expect(recevoir(ROLES, PERSONNES, { role: 'patron', personne: 'A-11' })).toEqual({
      sorte: 'refus',
      motif: "le patron parle en son nom : pas d'identifiant",
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
      chargerPersonnes(
        dossier(
          'personnes:\n  - role: patron\n  - { role: agent, personne: A-1 }\n  - { role: agent, personne: A-2 }\n',
        ),
        ROLES,
      ),
    ).toEqual([
      { role: 'patron' },
      { role: 'agent', personne: 'A-1' },
      { role: 'agent', personne: 'A-2' },
    ])
  })
  it('absent, vide, en double, ou avec une clé de trop : refusé', () => {
    expect(() => chargerPersonnes(dossier(), ROLES)).toThrow(/registre d'accès absent/)
    expect(() => chargerPersonnes(dossier('personnes: []\n'), ROLES)).toThrow(/invalide/)
    expect(() =>
      chargerPersonnes(
        dossier(
          'personnes:\n  - { role: agent, personne: A-1 }\n  - { role: agent, personne: A-1 }\n',
        ),
        ROLES,
      ),
    ).toThrow(/agent A-1 en double/)
    expect(() =>
      chargerPersonnes(dossier('personnes:\n  - { role: patron, agent: A-1 }\n'), ROLES),
    ).toThrow(/invalide/)
  })
})
