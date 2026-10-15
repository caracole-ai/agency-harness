import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTROLE_OK } from '../echappee/boucle'
import { cheminInstantane, DOSSIER_ECHAPPEES, TYPE_ECHAPPEE } from '../echappee/echappee'
import { type Evenement, Journal } from '../journal/journal'
import { Temporal } from '../temps/temporal'
import { DOSSIER_GESTES } from './geste-appris'
import { purgerInstantanes } from './instantanes'

const CLIENT = 'fictif'
const INTENTION = 'liberer_un_jour'

/** Une ligne `echappee` finie proprement : identifiant, rôle, texte montré, instantané. */
const echappee = (conversation: string, id: string, consigne: string): Evenement => ({
  type: TYPE_ECHAPPEE,
  client: CLIENT,
  objet: conversation,
  issue: 'reponse',
  motif: consigne,
  donnees: {
    echappee: id,
    intention: INTENTION,
    role: 'patron',
    cout_usd: 0,
    texte: `texte de ${id}`,
    instantane: cheminInstantane(id),
    controle_reponse: CONTROLE_OK,
  },
})

describe('purgerInstantanes', () => {
  it('supprime les instantanés d’avant `avant` qu’aucun geste ne cite ; laisse les autres et ce que le journal ignore', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'instantanes-'))
    const journal = new Journal(join(dossier, 'journal.sqlite'))
    mkdirSync(join(dossier, DOSSIER_ECHAPPEES))
    const fichier = (id: string) => join(dossier, cheminInstantane(id))
    for (const id of ['E-0', 'E-1', 'E-2', 'E-3']) writeFileSync(fichier(id), '{}')
    journal.ecrire([echappee('C-1', 'E-1', 'Libère-moi Julien samedi.')], '2026-07-01T08:00:00Z')
    journal.ecrire([echappee('C-2', 'E-2', 'Donne son dimanche à Sophie.')], '2026-07-02T08:00:00Z')
    journal.ecrire([echappee('C-3', 'E-3', 'Trouve quelqu’un pour lundi.')], '2026-10-07T08:00:00Z')
    mkdirSync(join(dossier, DOSSIER_GESTES))
    writeFileSync(
      join(dossier, DOSSIER_GESTES, 'liberer_un_jour.yaml'),
      `id: liberer_un_jour\ntests:\n  - echappee: E-2\n    instantane: ${cheminInstantane('E-2')}\n`,
    )

    const avant = Temporal.PlainDate.from('2026-10-10').subtract({ days: 90 })
    expect(purgerInstantanes(dossier, journal, avant)).toEqual([cheminInstantane('E-1')])
    expect(existsSync(fichier('E-1'))).toBe(false)
    expect(existsSync(fichier('E-2'))).toBe(true)
    expect(existsSync(fichier('E-3'))).toBe(true)
    expect(existsSync(fichier('E-0'))).toBe(true)
    // Une seconde purge ne trouve plus rien.
    expect(purgerInstantanes(dossier, journal, avant)).toEqual([])
    journal.fermer()
  })
})
