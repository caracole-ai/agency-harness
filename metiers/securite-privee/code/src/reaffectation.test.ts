import { appendFileSync, cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Modification } from './modifications'
import {
  attendus,
  ecrireReaffectation,
  ouvrirReaffectation,
  repondreReaffectation,
  STATUT_R,
  statutReaffectation,
  suivreReaffectation,
  TYPE_REAFFECTATION,
  validerReaffectation,
} from './reaffectation'
import { aParis, ouvrir, type Session } from './remplacement'

// La réaffectation groupée sur le client fictif, de bout en bout, sur une
// copie (le planning y est réécrit) : la clé sur la liste exacte, l'accord de
// chaque agent qui reçoit, l'écriture d'un coup (PLAN-ESPACES.md § 7.3).

const exemple = fileURLToPath(new URL('../../../../exemples/client-fictif', import.meta.url))
const t0 = aParis('2026-10-10T21:40')
const plus = (minutes: number) => t0.add({ minutes })

function copie(config = ''): string {
  const dossier = mkdtempSync(join(tmpdir(), 'reaffectation-'))
  cpSync(exemple, dossier, { recursive: true, filter: (f) => !/\.sqlite$|rapport-demo/.test(f) })
  appendFileSync(join(dossier, 'config.yaml'), config)
  return dossier
}
const session = (): Session => ouvrir(copie())
const planning = (s: Session) => readFileSync(join(s.dossier, 'planning.csv'), 'utf8')
const agentDe = (csv: string, vacation: string) =>
  csv
    .split('\n')
    .find((l) => l.startsWith(`${vacation};`))
    ?.split(';')[1]
const sans = (csv: string, vacations: string[]) =>
  csv.split('\n').filter((l) => !vacations.some((v) => l.startsWith(`${v};`)))

// V-07 (Sophie, Accueil, mer. 14/10) à Mehdi ; V-03 (Karim, Accueil, mar. 13/10) à Julien.
// Vérifié à la main : cartes valides, cartes d'entreprise remises, déclarés, aucun chevauchement.
const NOMINAL: Modification[] = [
  { type: 'reaffecter', vacation: 'V-07', agent: 'A-9' },
  { type: 'reaffecter', vacation: 'V-03', agent: 'A-2' },
]

describe('le chemin nominal', () => {
  const s = session()
  const avant = planning(s)
  const { id } = ouvrirReaffectation(s, 'C-20261010T2140-abcd', NOMINAL, t0)
  it('l’identifiant vient de la conversation', () => {
    expect(id).toBe('R-20261010T2140-abcd')
    expect(statutReaffectation(s, id)).toBe(STATUT_R.recue)
  })
  it('la validation demande leur accord aux deux agents qui reçoivent', () => {
    const v = validerReaffectation(s, id, plus(1))
    expect(v.agents).toEqual(['A-9', 'A-2'])
    expect(v.messages[0]).toMatch(/^Mehdi, peux-tu prendre mer\. 14\/10 08:00/)
    expect(v.messages[1]).toMatch(/^Julien, peux-tu prendre mar\. 13\/10 08:00/)
    expect(statutReaffectation(s, id)).toBe(STATUT_R.demandee)
  })
  it('un premier oui : on attend encore l’autre, rien n’est écrit', () => {
    const e = repondreReaffectation(s, id, 'A-9', true, plus(2))
    expect(e.statut).toBe(STATUT_R.demandee)
    expect(attendus(s, id)).toEqual(['A-2'])
    expect(planning(s)).toBe(avant)
  })
  it('le dernier oui : acceptée, puis écrite, avec la clé', () => {
    const e = repondreReaffectation(s, id, 'A-2', true, plus(3))
    expect(e.statut).toBe(STATUT_R.ecrite)
    const apres = planning(s)
    expect(agentDe(apres, 'V-07')).toBe('A-9')
    expect(agentDe(apres, 'V-03')).toBe('A-2')
    expect(sans(apres, ['V-07', 'V-03'])).toEqual(sans(avant, ['V-07', 'V-03']))
    expect(sans(apres, ['V-07', 'V-03']).filter((l) => /^V-/.test(l))).toHaveLength(17)
    const lignes = s.journal.historique(id).filter((l) => l.type === TYPE_REAFFECTATION)
    expect(lignes.map((l) => l.issue)).toEqual([
      STATUT_R.recue,
      STATUT_R.validee,
      STATUT_R.demandee,
      STATUT_R.demandee,
      STATUT_R.acceptee,
      STATUT_R.ecrite,
    ])
    expect(JSON.parse(lignes.at(-1)?.donnees ?? '{}').jeton).toMatch(/^[0-9a-f]{64}$/)
    expect(e.messages).toContain(
      "À Mehdi Saïdi : c'est confirmé, mer. 14/10 08:00 → mer. 14/10 20:00, Accueil (Galerie des Tilleuls). Merci.",
    )
  })
})

describe('ce qui ne s’écrit pas', () => {
  it('sans validation : aucune validation inscrite au journal', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    expect(() => ecrireReaffectation(s, id, plus(1))).toThrow(
      'écriture refusée : aucune validation inscrite au journal',
    )
  })
  it('une vacation déplacée entre la validation et l’écriture : le contenu diffère', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    s.journal.fermer()
    const fichier = join(s.dossier, 'planning.csv')
    writeFileSync(
      fichier,
      readFileSync(fichier, 'utf8').replace(
        'V-07;A-3;Accueil;2026-10-14T08:00',
        'V-07;A-3;Accueil;2026-10-14T09:00',
      ),
    )
    const s2 = ouvrir(s.dossier)
    repondreReaffectation(s2, id, 'A-9', true, plus(2))
    expect(() => repondreReaffectation(s2, id, 'A-2', true, plus(3))).toThrow(
      'le contenu diffère de celui qui a été validé',
    )
    expect(agentDe(planning(s2), 'V-07')).toBe('A-3')
  })
  it('une vacation qui change de main avant l’écriture : la clé ne correspond plus, et le temps clôt la demande', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    s.journal.fermer()
    const fichier = join(s.dossier, 'planning.csv')
    writeFileSync(fichier, readFileSync(fichier, 'utf8').replace('V-07;A-3;', 'V-07;A-5;'))
    const s2 = ouvrir(s.dossier)
    repondreReaffectation(s2, id, 'A-9', true, plus(2))
    expect(() => repondreReaffectation(s2, id, 'A-2', true, plus(3))).toThrow(
      'le contenu diffère de celui qui a été validé',
    )
    expect(agentDe(planning(s2), 'V-07')).toBe('A-5')
    expect(statutReaffectation(s2, id)).toBe(STATUT_R.acceptee)
    expect(suivreReaffectation(s2, id, aParis('2026-10-13T08:00'))?.statut).toBe(STATUT_R.tropTard)
  })
  it('un agent dit non : fin, sans conséquence, rien d’écrit', () => {
    const s = session()
    const avant = planning(s)
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    const e = repondreReaffectation(s, id, 'A-2', false, plus(2))
    expect(e).toEqual({
      statut: STATUT_R.refusee,
      motif: 'Julien Lefèvre a dit non (sans aucune conséquence)',
    })
    expect(() => repondreReaffectation(s, id, 'A-9', true, plus(3))).toThrow('pas adressée')
    expect(planning(s)).toBe(avant)
  })
  it('un agent qu’on n’attend pas ne peut pas répondre', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    expect(() => repondreReaffectation(s, id, 'A-5', true, plus(2))).toThrow('pas adressée')
  })
  it('une proposition qui enfreint une règle ne s’ouvre pas (Sophie, carte expirée)', () => {
    const s = session()
    expect(() =>
      ouvrirReaffectation(s, 'C-1', [{ type: 'reaffecter', vacation: 'V-17', agent: 'A-3' }], t0),
    ).toThrow(/I-01/)
  })
})

describe('le temps', () => {
  it('passé le début de la première vacation modifiée : trop tard', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    const e = suivreReaffectation(s, id, aParis('2026-10-13T08:00'))
    expect(e?.statut).toBe(STATUT_R.tropTard)
    expect(suivreReaffectation(s, id, aParis('2026-10-13T09:00'))).toBeNull()
  })
  it('sans réponse après l’attente : rien n’est écrit', () => {
    const s = session()
    const { id } = ouvrirReaffectation(s, 'C-1', NOMINAL, t0)
    validerReaffectation(s, id, plus(1))
    expect(suivreReaffectation(s, id, plus(20))).toBeNull()
    const e = suivreReaffectation(s, id, plus(31))
    expect(e?.statut).toBe(STATUT_R.sansReponse)
    expect(e?.motif).toContain('Mehdi Saïdi, Julien Lefèvre')
  })
})

describe('aucune délégation', () => {
  it('une délégation de réaffectation dans la config refuse le démarrage', () => {
    const dossier = copie(
      '\ndelegations:\n  - action: reaffectation\n    conditions: {}\n    accordee_le: "2026-10-09"\n    par: le patron\n',
    )
    expect(() => ouvrir(dossier)).toThrow(/démarrage refusé/)
  })
})
