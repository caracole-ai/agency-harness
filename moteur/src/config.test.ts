import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { appliquerPolitique, ConfigBase, chargerConfig } from './config'
import { Journal } from './journal/journal'
import { Interdit, type Registre } from './regles/schema'
import { lectureDeReference } from './regles/verdict'

const dossier = mkdtempSync(join(tmpdir(), 'harnais-'))

describe('config client', () => {
  const Schema = ConfigBase.extend({ seuil: z.number() })
  it('un réglage manquant arrête le démarrage', () => {
    const chemin = join(dossier, 'manque.yaml')
    writeFileSync(chemin, 'client: fictif\nmetier: securite-privee\n')
    expect(() => chargerConfig(chemin, Schema)).toThrow(/démarrage refusé/)
  })
  it('une config complète se charge', () => {
    const chemin = join(dossier, 'ok.yaml')
    writeFileSync(chemin, 'client: fictif\nmetier: securite-privee\nseuil: 3\n')
    expect(chargerConfig(chemin, Schema).seuil).toBe(3)
  })
})

describe('politique du client', () => {
  const registre: Registre = {
    interdits: [
      Interdit.parse({
        id: 'I-05',
        nom: 'repos',
        interdit: 'repos',
        etapes: ['5'],
        consequence: 'litige',
        verifiable_par: 'code',
        statut: 'texte',
        relu: '2026-10-05',
        avertissement: 'deux textes',
        source: 'R',
        lectures: [
          { id: 'loi', source: 'loi', reference: true, parametres: {} },
          { id: 'accord-1993', source: 'accord', parametres: {} },
        ],
      }),
    ],
    escalades: [],
    scenarios: [],
  }
  it('par défaut, la loi générale décide', () => {
    expect(lectureDeReference(appliquerPolitique(registre).interdits[0] as Interdit).id).toBe('loi')
  })
  it('la politique du client déplace la référence', () => {
    const r = appliquerPolitique(registre, { lectures_reference: { 'I-05': 'accord-1993' } })
    expect(lectureDeReference(r.interdits[0] as Interdit).id).toBe('accord-1993')
  })
  it('une lecture inconnue arrête tout', () => {
    expect(() => appliquerPolitique(registre, { lectures_reference: { 'I-05': 'ccn' } })).toThrow()
  })
})

describe('journal', () => {
  const journal = new Journal(join(dossier, 'journal.sqlite'))
  journal.ecrire([
    { type: 'constat', client: 'fictif', regle: 'I-01', objet: 'V-1', issue: 'refus' },
  ])
  it('garde ce qui est écrit', () => {
    expect(journal.lire()).toHaveLength(1)
    expect(journal.lire()[0]?.regle).toBe('I-01')
  })
  it('refuse toute modification et toute suppression', () => {
    expect(() => journal.executer("UPDATE journal SET issue = 'ok'")).toThrow(/ajout seul/)
    expect(() => journal.executer('DELETE FROM journal')).toThrow(/ajout seul/)
    expect(journal.lire()[0]?.issue).toBe('refus')
  })
})
