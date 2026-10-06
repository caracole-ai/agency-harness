import { describe, expect, it } from 'vitest'
import { echeance, type RegleDeDecompte } from '../temps/delais'
import { Temporal } from '../temps/temporal'
import { type Echeance, type Fenetre, veiller } from './veiller'

const d = (s: string) => Temporal.PlainDate.from(s)
const fenetre: Fenetre = { alerter: { mois: 2 }, preparation: { mois: 1 } }
const e = (limite?: string): Echeance => ({
  regle: 'I-17',
  objet: 'A-1/mac',
  action: 'organiser le MAC',
  ...(limite ? { limite: d(limite) } : {}),
  fenetre,
})
const niveau = (limite: string | undefined, jour: string) =>
  veiller([e(limite)], d(jour))[0]?.niveau

describe('Veiller : quand prévenir', () => {
  it('rien avant la fenêtre d’alerte', () => {
    expect(niveau('2026-12-05', '2026-10-04')).toBeUndefined()
  })
  it('une alerte dès le premier jour de la fenêtre', () => {
    expect(niveau('2026-12-05', '2026-10-05')).toBe('alerte')
  })
  it('escaladée quand il reste moins que le temps de préparation', () => {
    expect(niveau('2026-12-05', '2026-11-05')).toBe('alerte')
    expect(niveau('2026-12-05', '2026-11-06')).toBe('escalade')
  })
  it('escaladée quand la limite est passée, pas le jour même', () => {
    expect(veiller([e('2026-12-05')], d('2026-12-06'))[0]?.motif).toMatch(/dépassée/)
  })
  it('une date inconnue n’est pas une date lointaine', () => {
    expect(niveau(undefined, '2026-10-05')).toBe('alerte')
  })
})

describe('Veiller ailleurs que dans la sécurité', () => {
  it('transport : la protestation de L133-3, réception le vendredi 8 mai', () => {
    const regle: RegleDeDecompte = { jourDeDepartExclu: true, nonComptes: ['férié'], reportSi: [] }
    const protestation: Echeance = {
      regle: 'I-xx',
      objet: 'LV-1/protestation',
      action: 'envoyer la protestation motivée',
      limite: echeance(d('2026-05-08'), { jours: 3 }, regle),
      fenetre: { alerter: { jours: 3 }, preparation: { jours: 1 } },
    }
    const [a] = veiller([protestation], d('2026-05-09'))
    expect(a?.niveau).toBe('alerte')
    expect(a?.limite).toBe('2026-05-11')
    expect(veiller([protestation], d('2026-05-11'))[0]?.niveau).toBe('escalade')
  })
})
