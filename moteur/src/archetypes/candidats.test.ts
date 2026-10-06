import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { empreinte, exigerValidation, VALIDEE } from '../approbation/jeton'
import type { Controle } from '../controles/controle'
import { Journal } from '../journal/journal'
import { Interdit, type Registre } from '../regles/schema'
import { classer, evaluerCandidats } from './candidats'

// Un monde minuscule : qui tient le poste, et qui a un titre. Un contrôle
// refuse un titulaire sans titre ; un autre rend « à vérifier » si le titre
// est inconnu.
interface Monde {
  titulaire: string
  titres: Record<string, boolean | undefined>
}
const regle = (id: string) =>
  Interdit.parse({
    id,
    nom: id,
    interdit: 'x',
    etapes: ['1'],
    consequence: 'x',
    verifiable_par: 'code',
    statut: 'texte',
    relu: '2026-10-06',
    source: 'R',
  })
const registre: Registre = { interdits: [regle('I-01')], escalades: [], scenarios: [] }
const titre: Controle<Monde> = {
  regle: 'I-01',
  verifier: (m) => {
    const t = m.titres[m.titulaire]
    return [
      {
        regle: 'I-01',
        objet: 'poste',
        verdict: t === undefined ? 'à vérifier' : t ? 'ok' : 'refus',
        motif: 'titre',
      },
    ]
  },
}
const depart: Monde = { titulaire: 'absent', titres: { absent: true, a: true, b: false } }

describe('évaluer des candidats', () => {
  const ev = evaluerCandidats([titre], registre, depart, ['a', 'b', 'c'], (c) => ({
    ...depart,
    titulaire: c,
  }))
  it('possible, exclu par un interdit, écarté faute de donnée', () => {
    expect(ev.map((e) => [e.candidat, e.issue])).toEqual([
      ['a', 'possible'],
      ['b', 'exclu'],
      ['c', 'écarté'],
    ])
  })
  it('un contrôle qui échoue exclut le candidat (échec fermé)', () => {
    const casse: Controle<Monde> = {
      regle: 'I-01',
      verifier: (m) => {
        if (m.titulaire === 'a') throw new Error('panne')
        return []
      },
    }
    const [a] = evaluerCandidats([casse], registre, depart, ['a'], (c) => ({
      ...depart,
      titulaire: c,
    }))
    expect(a?.issue).toBe('exclu')
  })
})

describe('classer', () => {
  it('critère après critère, puis le nom', () => {
    const gens = [
      { nom: 'Thomas', connait: 1, heures: 0 },
      { nom: 'Karim', connait: 0, heures: 24 },
      { nom: 'Mehdi', connait: 1, heures: 0 },
      { nom: 'Julien', connait: 0, heures: 16 },
    ]
    expect(
      classer(gens, [(g) => g.connait, (g) => g.heures], (g) => g.nom).map((g) => g.nom),
    ).toEqual(['Julien', 'Karim', 'Mehdi', 'Thomas'])
  })
})

describe('la clé d’accord', () => {
  const journal = new Journal(join(mkdtempSync(join(tmpdir(), 'harnais-')), 'j.sqlite'))
  const contenu = { demande: 'D-1', agent: 'A-2' }
  it('sans validation, l’écriture est refusée', () => {
    expect(() => exigerValidation(journal.historique('D-1'), contenu)).toThrow(/aucune validation/)
  })
  it('la validation de ce contenu exact ouvre l’écriture, un autre contenu reste refusé', () => {
    journal.ecrire([
      {
        type: 'remplacement',
        client: 'fictif',
        objet: 'D-1',
        issue: VALIDEE,
        donnees: { jeton: empreinte(contenu) },
      },
    ])
    expect(exigerValidation(journal.historique('D-1'), contenu)).toBe(empreinte(contenu))
    expect(() => exigerValidation(journal.historique('D-1'), { ...contenu, agent: 'A-1' })).toThrow(
      /diffère/,
    )
  })
  it('l’empreinte ne dépend pas de l’ordre des clés', () => {
    expect(empreinte({ a: '1', b: '2' })).toBe(empreinte({ b: '2', a: '1' }))
  })
})
