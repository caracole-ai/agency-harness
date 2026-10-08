import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { passerVeille, Temporal } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ConfigSecurite, VEILLER } from './veille'

// Le client fictif (`exemples/client-fictif/`) : la veille trouve chaque
// erreur posée exprès, avec le bon verdict ou le bon niveau, et rien d'autre.
// La liste attendue est écrite à la main dans `attendu.yaml`.

const metier = fileURLToPath(new URL('../..', import.meta.url))
const exemple = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const attendu = parse(readFileSync(`${exemple}/attendu.yaml`, 'utf8')) as {
  aujourdhui: string
  constats: { regle: string; objet: string; verdict: string; notes?: string[] }[]
  alertes: { regle: string; objet: string; niveau: string }[]
}
const passe = passerVeille(VEILLER, metier, exemple, Temporal.PlainDate.from(attendu.aujourdhui))

const cle = (x: { regle: string; objet: string }) => `${x.regle} ${x.objet}`

describe('veille du client fictif', () => {
  it('les constats sont exactement ceux attendus', () => {
    expect(passe.constats.map((c) => `${cle(c)} ${c.verdict}`).sort()).toEqual(
      attendu.constats.map((c) => `${cle(c)} ${c.verdict}`).sort(),
    )
  })
  it('les textes signalés sont en note', () => {
    for (const a of attendu.constats.filter((x) => x.notes)) {
      const c = passe.constats.find((x) => cle(x) === cle(a))
      for (const n of a.notes ?? []) expect(c?.notes?.some((x) => x.includes(n))).toBe(true)
    }
  })
  it('les alertes sont exactement celles attendues', () => {
    expect(passe.alertes.map((a) => `${cle(a)} ${a.niveau}`).sort()).toEqual(
      attendu.alertes.map((a) => `${cle(a)} ${a.niveau}`).sort(),
    )
  })
  it('sous la politique « accord de 1993 », le repos de 11 h 30 devient un refus', async () => {
    const { appliquerPolitique, executer } = await import('@harnais/moteur')
    const registre = appliquerPolitique(passe.registre, {
      lectures_reference: { 'I-05': 'accord-1993' },
    })
    const v15 = executer(VEILLER.controles, passe.ctx, registre).find(
      (c) => c.regle === 'I-05' && c.objet === 'V-15',
    )
    expect(v15?.verdict).toBe('refus')
  })
})

describe('config du client fictif', () => {
  it('la section « conversation » est facultative', () => {
    const config = parse(readFileSync(`${exemple}/config.yaml`, 'utf8')) as Record<string, unknown>
    expect(ConfigSecurite.safeParse(config).success).toBe(true)
    delete config.conversation
    expect(ConfigSecurite.safeParse(config).success).toBe(true)
  })
})
