import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TYPE_CONSIGNE } from '../conversation/conversation'
import { type Evenement, Journal } from '../journal/journal'
import { Temporal } from '../temps/temporal'
import { commanderGeste, demandesSansGeste, ErreurCommande, TYPE_GESTE_COMMANDE } from './commande'

// Les demandes sans geste (REFLEXIONS.md, décidé le 2026-10-15) : les lignes
// `consigne`/`nouvelle` groupées par intention ; la commande du patron, une
// ligne au journal, sans modèle ; jamais deux fois.

const CLIENT = 'fictif'
const PATRON = { role: 'patron' }
const MAINTENANT = Temporal.ZonedDateTime.from('2026-10-10T21:40[Europe/Paris]')

const journal = () => new Journal(join(mkdtempSync(join(tmpdir(), 'commande-')), 'j.sqlite'))
const nouvelle = (conversation: string, intention: string, resume?: string): Evenement => ({
  type: TYPE_CONSIGNE,
  client: CLIENT,
  objet: conversation,
  issue: 'nouvelle',
  motif: 'la consigne',
  donnees: {
    identite: PATRON,
    demande: { sorte: 'nouvelle', intention, ...(resume !== undefined ? { resume } : {}) },
  },
})

describe('demandesSansGeste', () => {
  it('groupe les nouvelles par intention, les plus fréquentes d’abord ; trois résumés distincts au plus, du plus récent au plus ancien', () => {
    const j = journal()
    j.ecrire([nouvelle('C-1', 'liberer_un_jour', 'un')], '2026-10-01T08:00:00Z')
    j.ecrire([nouvelle('C-2', 'liberer_un_jour', 'deux')], '2026-10-02T08:00:00Z')
    j.ecrire([nouvelle('C-3', 'liberer_un_jour', 'deux')], '2026-10-03T08:00:00Z')
    j.ecrire([nouvelle('C-4', 'liberer_un_jour', 'trois')], '2026-10-04T08:00:00Z')
    j.ecrire([nouvelle('C-5', 'liberer_un_jour', 'quatre')], '2026-10-05T08:00:00Z')
    j.ecrire([nouvelle('C-6', 'heures_par_agent', 'les heures')], '2026-10-06T08:00:00Z')
    expect(demandesSansGeste(j.lire())).toEqual([
      {
        intention: 'liberer_un_jour',
        compte: 5,
        exemples: ['quatre', 'trois', 'deux'],
        derniere: '2026-10-05',
      },
      {
        intention: 'heures_par_agent',
        compte: 1,
        exemples: ['les heures'],
        derniere: '2026-10-06',
      },
    ])
    j.fermer()
  })
  it('à compte égal, l’ordre des noms ; un résumé absent ou vide ne fait pas d’exemple', () => {
    const j = journal()
    j.ecrire([nouvelle('C-1', 'simuler_absence')], '2026-10-01T08:00:00Z')
    j.ecrire([nouvelle('C-2', 'heures_par_agent', '  ')], '2026-10-02T08:00:00Z')
    expect(demandesSansGeste(j.lire())).toEqual([
      { intention: 'heures_par_agent', compte: 1, exemples: [], derniere: '2026-10-02' },
      { intention: 'simuler_absence', compte: 1, exemples: [], derniere: '2026-10-01' },
    ])
    j.fermer()
  })
  it('ignore une inconnue, une nouvelle sans demande, une consigne devenue geste, une autre ligne, une intention mal formée', () => {
    const j = journal()
    j.ecrire(
      [
        {
          type: TYPE_CONSIGNE,
          client: CLIENT,
          objet: 'C-1',
          issue: 'inconnue',
          motif: 'x',
          donnees: { demande: { sorte: 'inconnue', raison: 'r' } },
        },
        { type: TYPE_CONSIGNE, client: CLIENT, objet: 'C-2', issue: 'nouvelle', motif: 'x' },
        {
          type: TYPE_CONSIGNE,
          client: CLIENT,
          objet: 'C-3',
          issue: 'geste',
          motif: 'x',
          donnees: { demande: { sorte: 'nouvelle', intention: 'a' } },
        },
        {
          type: 'echappee',
          client: CLIENT,
          objet: 'C-4',
          issue: 'reponse',
          donnees: { intention: 'b' },
        },
        nouvelle('C-5', 'Pas Un Mot', 'x'),
      ],
      '2026-10-01T08:00:00Z',
    )
    expect(demandesSansGeste(j.lire())).toEqual([])
    j.fermer()
  })
})

describe('commanderGeste', () => {
  it('écrit la ligne « geste commandé » : l’intention, le dernier résumé, qui, les exemples ; la liste la montre ; une seconde commande refuse', () => {
    const j = journal()
    j.ecrire([nouvelle('C-1', 'liberer_un_jour', 'un')], '2026-10-01T08:00:00Z')
    j.ecrire([nouvelle('C-2', 'liberer_un_jour', 'deux')], '2026-10-02T08:00:00Z')
    expect(commanderGeste(j, CLIENT, 'liberer_un_jour', PATRON, MAINTENANT)).toEqual({
      intention: 'liberer_un_jour',
      le: '2026-10-10',
    })
    const ligne = j.lire().find((l) => l.type === TYPE_GESTE_COMMANDE)
    expect(ligne).toMatchObject({
      client: CLIENT,
      objet: 'liberer_un_jour',
      motif: 'deux',
      horodatage: '2026-10-10T19:40:00Z',
    })
    expect(JSON.parse(ligne?.donnees ?? '{}')).toEqual({
      par: PATRON,
      exemples: ['deux', 'un'],
      compte: 2,
    })
    expect(demandesSansGeste(j.lire())[0]).toMatchObject({
      commande: { par: PATRON, le: '2026-10-10' },
    })
    expect(() => commanderGeste(j, CLIENT, 'liberer_un_jour', PATRON, MAINTENANT)).toThrow(
      ErreurCommande,
    )
    expect(() => commanderGeste(j, CLIENT, 'liberer_un_jour', PATRON, MAINTENANT)).toThrow(
      'déjà commandé le 2026-10-10',
    )
    expect(j.lire().filter((l) => l.type === TYPE_GESTE_COMMANDE)).toHaveLength(1)
    j.fermer()
  })
  it('refuse une intention sans demande, ou mal formée, sans rien écrire', () => {
    const j = journal()
    expect(() => commanderGeste(j, CLIENT, 'inventaire', PATRON, MAINTENANT)).toThrow(
      'aucune demande sans geste',
    )
    expect(() => commanderGeste(j, CLIENT, 'Pas Un Mot', PATRON, MAINTENANT)).toThrow('snake_case')
    expect(j.lire()).toEqual([])
    j.fermer()
  })
})
