import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RACINE_DEPOT } from '../agence/fictif'
import { metierDe } from '../cli/metier'
import type { Modele } from '../modele/modele'
import { aParis } from '../temps/temporal'
import { casDuFichier, copieClient, jouerCas, jouerTraduction } from './traduction'

// Les cas de traduction prêts à jouer, du fichier `consignes.yaml`, et la
// copie fraîche du client sur laquelle chacun tourne.

describe('casDuFichier', () => {
  it('garde l’identifiant, la variante, la catégorie stricte, et calcule le moment', () => {
    const cas = casDuFichier(
      {
        maintenant: '2026-10-10T21:40',
        variantes: { homonyme: { fichier: 'agents.csv', remplacer: 'a', par: 'b' } },
        cas: [
          {
            id: 'X',
            role: 'agent',
            personne: 'A-2',
            variante: 'homonyme',
            categorie: 'agent_patron',
            consigne: 'x',
            attendu: { sorte: 'inconnue' },
          },
          {
            id: 'Y',
            role: 'patron',
            maintenant: '2026-10-11T08:00',
            consigne: 'y',
            attendu: { sorte: 'inconnue' },
          },
        ],
      },
      new Set(['X', 'Y']),
    )
    expect(cas[0]).toMatchObject({
      id: 'X',
      strict: true,
      piege: { fichier: 'agents.csv' },
      personne: 'A-2',
    })
    expect(cas[0]?.quand.hour).toBe(21)
    expect(cas[1]?.quand.day).toBe(11)
    expect(cas[1]?.strict).toBe(false)
  })
})

describe('copieClient', () => {
  it('écarte le journal et le rapport du client', () => {
    const source = join(mkdtempSync(join(tmpdir(), 'copie-')), 'client')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'config.yaml'), 'client: x\n')
    writeFileSync(join(source, 'journal.sqlite'), '')
    writeFileSync(join(source, 'rapport-demo.md'), '')
    const copie = copieClient(source)
    expect(existsSync(join(copie, 'config.yaml'))).toBe(true)
    expect(existsSync(join(copie, 'journal.sqlite'))).toBe(false)
    expect(existsSync(join(copie, 'rapport-demo.md'))).toBe(false)
  })
})

describe('la fuite d’un cas en exception', () => {
  // Le client fictif de la sécurité privée, jamais écrit : chaque cas tourne sur une copie.
  const SOURCE = join(RACINE_DEPOT, 'exemples', 'client-fictif')
  const NOM = 'Aïcha Traoré'
  /** Le fournisseur qui refuse chaque appel, comme le 402 d'un solde épuisé. */
  const refuse: Modele = {
    id: 'refuse',
    appeler: async () => {
      throw new Error('402 {"error":"Insufficient balance"}')
    },
  }
  /** `agents.csv` illisible : ni le cas ni la lecture des noms n'ouvrent les données. */
  const illisible = { fichier: 'agents.csv', remplacer: 'id;nom;', par: 'x;y;' }
  const cas = { id: 'X', strict: false, role: 'patron' }
  /** Un tour qui envoie ce texte au modèle (le refus lève). */
  const envoyer = (texte: string) => async (_dossier: string, modele: Modele) => {
    await modele.appeler({
      systeme: 'système',
      messages: [{ role: 'user', content: texte }],
      outils: [],
      effort: 'low',
      maxTokens: 10,
      unSeulOutil: true,
    })
    return { ecarts: [], issue: undefined }
  }

  it('rien n’est parti au modèle : pas de fuite, même quand les noms ne se lisent pas', async () => {
    const m = await metierDe(SOURCE)
    const [r] = await jouerTraduction(
      m,
      SOURCE,
      [
        {
          ...cas,
          role: 'patron',
          piege: illisible,
          quand: aParis('2026-10-10T21:40'),
          consigne: `${NOM} ne vient pas demain`,
          attendu: { sorte: 'inconnue' },
        },
      ],
      () => refuse,
    )
    expect(r?.ecarts[0]).toMatch(/^exception : /)
    expect(r?.fuite).toEqual([])
  })

  it('la consigne masquée part, le fournisseur refuse : seul ce qui est parti compte', async () => {
    const m = await metierDe(SOURCE)
    const [r] = await jouerTraduction(
      m,
      SOURCE,
      [
        {
          ...cas,
          role: 'patron',
          quand: aParis('2026-10-10T21:40'),
          consigne: `${NOM} ne vient pas demain`,
          attendu: { sorte: 'inconnue' },
        },
      ],
      () => refuse,
    )
    expect(r?.ecarts).toEqual(['exception : 402 {"error":"Insufficient balance"}'])
    expect(r?.fuite).toEqual([])
  })

  it('un nom parti avant l’exception reste une fuite', async () => {
    const m = await metierDe(SOURCE)
    const { resultat } = await jouerCas(m, SOURCE, cas, () => refuse, envoyer(`${NOM} est absente`))
    expect(resultat.ecarts[0]).toMatch(/^exception : 402/)
    expect(resultat.fuite).toEqual([NOM])
  })

  it('un texte parti, les noms illisibles : la fuite non mesurée compte', async () => {
    const m = await metierDe(SOURCE)
    const { resultat } = await jouerCas(
      m,
      SOURCE,
      { ...cas, piege: illisible },
      () => refuse,
      envoyer('A-11 est absente'),
    )
    expect(resultat.fuite).toHaveLength(1)
    expect(resultat.fuite?.[0]).toMatch(/^non mesurée : /)
  })
})
