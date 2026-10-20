import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
  aCapacite,
  CAPACITES,
  type Capacite,
  IdentiteSchema,
  quiParle,
  type RoleDeclare,
  roleDe,
  schemaRegistre,
} from './roles'

// Les rôles déclarés par le métier, leurs capacités, le registre d'accès et
// l'identité lue (PLAN-METIER-2.md § 3.1 et § 4).

/** Les rôles de la sécurité privée, tels qu'elle les déclare (le moteur ne dépend pas d'elle). */
const SECURITE: RoleDeclare[] = [
  { id: 'patron', enMots: 'le patron', identifie: false, capacites: [...CAPACITES] },
  { id: 'agent', enMots: "l'agent", identifie: true, tutoie: true, capacites: [] },
]

/** Un métier simulé à cinq rôles identifiés (PLAN-METIER-2.md § 1, M3). */
const CINQ: RoleDeclare[] = [
  { id: 'dirigeant', enMots: 'la dirigeante', identifie: true, capacites: [...CAPACITES] },
  {
    id: 'po',
    enMots: 'la cheffe de projet',
    identifie: true,
    capacites: ['voit_tout', 'designe_autrui', 'propose', 'valide'],
  },
  {
    id: 'commercial',
    enMots: 'le commercial',
    identifie: true,
    capacites: ['designe_autrui', 'propose'],
  },
  { id: 'graphiste', enMots: 'la graphiste', identifie: true, capacites: [] },
  { id: 'developpeur', enMots: 'le développeur', identifie: true, tutoie: true, capacites: [] },
]

const exemple = fileURLToPath(
  new URL('../../../exemples/client-fictif/personnes.yaml', import.meta.url),
)

describe('aCapacite', () => {
  it('la sécurité : le patron a les six capacités, l’agent aucune', () => {
    for (const c of CAPACITES) {
      expect(aCapacite(SECURITE, { role: 'patron' }, c)).toBe(true)
      expect(aCapacite(SECURITE, { role: 'agent', personne: 'A-2' }, c)).toBe(false)
    }
  })
  it('cinq rôles : chacun a exactement les capacités déclarées', () => {
    const attendues: Record<string, Capacite[]> = {
      dirigeant: [...CAPACITES],
      po: ['voit_tout', 'designe_autrui', 'propose', 'valide'],
      commercial: ['designe_autrui', 'propose'],
      graphiste: [],
      developpeur: [],
    }
    for (const [role, capacites] of Object.entries(attendues)) {
      for (const c of CAPACITES) {
        expect(aCapacite(CINQ, { role, personne: 'M-1' }, c), `${role} ${c}`).toBe(
          capacites.includes(c),
        )
      }
    }
  })
  it('un rôle que le métier ne déclare pas : aucune capacité', () => {
    for (const c of CAPACITES) expect(aCapacite(SECURITE, { role: 'roi' }, c)).toBe(false)
  })
})

describe('roleDe, quiParle', () => {
  it('roleDe rend le rôle déclaré, et lève sur un rôle inconnu', () => {
    expect(roleDe(SECURITE, { role: 'agent', personne: 'A-2' }).tutoie).toBe(true)
    expect(() => roleDe(SECURITE, { role: 'roi' })).toThrow(/rôle inconnu : roi/)
  })
  it('quiParle : enMots seul pour un rôle non identifié, suivi de l’identifiant sinon', () => {
    expect(quiParle(SECURITE, { role: 'patron' })).toBe('le patron')
    expect(quiParle(SECURITE, { role: 'agent', personne: 'A-2' })).toBe("l'agent A-2")
    expect(quiParle(SECURITE, { role: 'agent' })).toBe("l'agent ?")
    expect(quiParle(CINQ, { role: 'po', personne: 'M-3' })).toBe('la cheffe de projet M-3')
  })
})

describe('IdentiteSchema', () => {
  it('`{ role, personne? }` se lit tel quel', () => {
    expect(IdentiteSchema.parse({ role: 'agent', personne: 'A-2' })).toEqual({
      role: 'agent',
      personne: 'A-2',
    })
    expect(IdentiteSchema.parse({ role: 'patron' })).toEqual({ role: 'patron' })
  })
  it('l’ancienne graphie `agent` (2026-10-20), une clé de trop, un rôle vide : refusés', () => {
    expect(IdentiteSchema.safeParse({ role: 'agent', agent: 'A-2' }).success).toBe(false)
    expect(IdentiteSchema.safeParse({ role: 'agent', personne: 'A-2', nom: 'x' }).success).toBe(
      false,
    )
    expect(IdentiteSchema.safeParse({ role: '' }).success).toBe(false)
  })
})

describe('schemaRegistre', () => {
  it('le registre du client fictif, tel quel, passe', () => {
    const { personnes } = schemaRegistre(SECURITE).parse(parse(readFileSync(exemple, 'utf8')))
    expect(personnes[0]).toEqual({ role: 'patron' })
    expect(personnes).toContainEqual({ role: 'agent', personne: 'A-2' })
  })
  it('un registre à cinq rôles identifiés passe', () => {
    const registre = {
      personnes: [
        { role: 'dirigeant', personne: 'M-1' },
        { role: 'po', personne: 'M-2' },
        { role: 'po', personne: 'M-3' },
        { role: 'commercial', personne: 'M-4' },
        { role: 'graphiste', personne: 'M-5' },
        { role: 'developpeur', personne: 'M-6' },
      ],
    }
    expect(schemaRegistre(CINQ).parse(registre)).toEqual(registre)
  })
  it('un rôle non identifié présent deux fois : refusé', () => {
    const r = schemaRegistre(SECURITE).safeParse({
      personnes: [{ role: 'patron' }, { role: 'patron' }],
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.message)).toEqual(['patron en double'])
  })
  it('un rôle non déclaré, un identifiant manquant ou de trop, un doublon : refusés', () => {
    const motifs = (personnes: unknown[]) =>
      schemaRegistre(SECURITE)
        .safeParse({ personnes })
        .error?.issues.map((i) => i.message)
    expect(motifs([{ role: 'roi' }])).toEqual(['rôle inconnu : roi'])
    expect(motifs([{ role: 'agent' }])).toEqual(["l'agent sans identifiant"])
    expect(motifs([{ role: 'patron', personne: 'A-1' }])).toEqual([
      "le patron parle en son nom : pas d'identifiant",
    ])
    expect(
      motifs([
        { role: 'agent', personne: 'A-1' },
        { role: 'agent', personne: 'A-1' },
      ]),
    ).toEqual(['agent A-1 en double'])
    expect(motifs([])).toHaveLength(1)
  })
})
