import { describe, expect, it } from 'vitest'
import type { Ligne } from '../journal/journal'
import { FUSEAU, Temporal } from '../temps/temporal'
import { CONTROLE_OK, CONTROLE_RETIRE } from './boucle'
import { compteursEchappees, FENETRE_JOURS } from './compteurs'
import { TYPE_ECHAPPEE } from './echappee'

const MAINTENANT = Temporal.ZonedDateTime.from(`2026-10-18T10:00[${FUSEAU}]`)

let n = 0
/** Une ligne du journal telle que `echappee.ts` l'écrit, `jours` jours avant l'instant de lecture. */
const ligne = (
  issue: string,
  donnees: Record<string, unknown>,
  jours = 1,
  type = TYPE_ECHAPPEE,
): Ligne => ({
  id: ++n,
  horodatage: MAINTENANT.subtract({ days: jours }).toInstant().toString(),
  type,
  client: 'client fictif',
  regle: null,
  objet: `C-${n}`,
  issue,
  motif: 'une consigne',
  donnees: JSON.stringify({ echappee: `E-${n}`, intention: 'x', tours: 1, ...donnees }),
})

describe('les compteurs des échappées, lus dans le journal', () => {
  it('un journal vide donne des zéros, sur la fenêtre par défaut', () => {
    expect(compteursEchappees([], MAINTENANT)).toEqual({
      jours: FENETRE_JOURS,
      echappees: 0,
      relues: 0,
      retirees: 0,
      propositions: 0,
      abandons: 0,
    })
  })

  it('compte chaque issue : relue, retirée, proposition, abandon', () => {
    const lignes = [
      ligne('reponse', { controle_reponse: CONTROLE_OK }),
      ligne('reponse', { controle_reponse: CONTROLE_OK }, 2),
      ligne('reponse', { controle_reponse: CONTROLE_RETIRE }, 3),
      ligne('proposition', { modifications: [] }, 4),
      ligne('abandon', { abandon: 'plafond de tours atteint' }, 5),
    ]
    expect(compteursEchappees(lignes, MAINTENANT)).toEqual({
      jours: FENETRE_JOURS,
      echappees: 5,
      relues: 2,
      retirees: 1,
      propositions: 1,
      abandons: 1,
    })
  })

  it('ne lit que la fenêtre, et que les lignes `echappee`', () => {
    const lignes = [
      ligne('reponse', { controle_reponse: CONTROLE_OK }, FENETRE_JOURS - 1),
      ligne('reponse', { controle_reponse: CONTROLE_OK }, FENETRE_JOURS + 1),
      ligne('abandon', { abandon: 'x' }, 400),
      ligne('reponse', { controle_reponse: CONTROLE_OK }, 1, 'outil_echappee'),
      ligne('nouvelle', {}, 1, 'consigne'),
    ]
    expect(compteursEchappees(lignes, MAINTENANT)).toMatchObject({
      echappees: 1,
      relues: 1,
      abandons: 0,
    })
    expect(compteursEchappees(lignes, MAINTENANT, 7)).toMatchObject({ jours: 7, echappees: 0 })
  })

  it('une réponse d’avant le contrôle compte comme échappée, dans aucune colonne', () => {
    const lignes = [ligne('reponse', { texte: 'ancienne' })]
    expect(compteursEchappees(lignes, MAINTENANT)).toMatchObject({
      echappees: 1,
      relues: 0,
      retirees: 0,
    })
  })
})
