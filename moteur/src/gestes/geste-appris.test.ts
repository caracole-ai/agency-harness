import { describe, expect, it } from 'vitest'
import {
  clesDe,
  empreinteGeste,
  FichierGeste,
  gesteDe,
  rendre,
  verifierGabarit,
} from './geste-appris'
import { GESTE_EXEMPLE as GESTE } from './geste-appris.exemple'

// La forme d'un geste appris, ce qu'un gabarit peut citer, son rendu et son
// empreinte (PLAN-PROMOTION.md § 5.5).

const PARAMS = { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' }
const UNE_LIGNE = { colonnes: ['nom', 'heures'], lignes: [['Julien Lefèvre', 16]], tronque: false }
const AUCUNE = { colonnes: ['nom', 'heures'], lignes: [], tronque: false }

describe('le schéma', () => {
  it('le geste de référence passe ; aucune requête, un type de paramètre inconnu, deux tests, une clé de plus : refus', () => {
    expect(FichierGeste.safeParse({ ...GESTE, statut: 'propose' }).success).toBe(true)
    expect(FichierGeste.safeParse({ ...GESTE, statut: 'propose', requetes: [] }).success).toBe(
      false,
    )
    expect(
      FichierGeste.safeParse({
        ...GESTE,
        statut: 'propose',
        parametres: { texte: { type: 'texte', description: 'du texte libre' } },
      }).success,
    ).toBe(false)
    expect(
      FichierGeste.safeParse({ ...GESTE, statut: 'propose', tests: GESTE.tests.slice(0, 2) })
        .success,
    ).toBe(false)
    expect(FichierGeste.safeParse({ ...GESTE, statut: 'propose', code: 'x' }).success).toBe(false)
    expect(FichierGeste.safeParse({ ...GESTE, statut: 'en cours' }).success).toBe(false)
  })
  it('un instantané hors du dossier du client (absolu ou « .. ») : refus', () => {
    const avec = (instantane: string) =>
      FichierGeste.safeParse({
        ...GESTE,
        statut: 'propose',
        tests: GESTE.tests.map((t, i) => (i === 0 ? { ...t, instantane } : t)),
      }).success
    expect(avec('../../secret.json')).toBe(false)
    expect(avec('echappees/../../x.json')).toBe(false)
    expect(avec('/etc/passwd')).toBe(false)
    expect(avec('echappees/E-1.json')).toBe(true)
  })
  it('gesteDe retire statut et validation', () => {
    const fichier = FichierGeste.parse({
      ...GESTE,
      statut: 'actif',
      validation: { par: 'Lionel', le: '2026-10-10', jeton: 'j' },
    })
    expect(gesteDe(fichier)).toEqual(GESTE)
  })
  it('clesDe : une période donne du et au', () => {
    expect(clesDe(GESTE)).toEqual(['agent', 'du', 'au'])
  })
})

describe('verifierGabarit', () => {
  it('le geste de référence n’a aucun écart', () => {
    expect(verifierGabarit(GESTE)).toEqual([])
  })
  it('une référence inconnue : requête, paramètre, colonne (avec les colonnes), tableau', () => {
    const avec = (ligne: string | null, tableau: string | null = null) =>
      verifierGabarit({ ...GESTE, reponse: { ...GESTE.reponse, ligne, tableau } })
    expect(avec('{{total.heures}}')).toEqual([
      'la ligne cite une requête inconnue : {{total.heures}}',
    ])
    expect(avec('{{site}}')).toEqual(['la ligne cite un paramètre inconnu : {{site}}'])
    expect(
      verifierGabarit(
        { ...GESTE, reponse: { ...GESTE.reponse, ligne: '{{heures.total}}' } },
        new Map([['heures', ['nom', 'heures']]]),
      ),
    ).toEqual(['la ligne cite une colonne que « heures » ne rend pas : total'])
    expect(avec(null, 'total')).toEqual(['le tableau cite une requête inconnue : total'])
  })
  it('une référence mal formée (espaces, majuscule, accolade seule) : un écart', () => {
    const avec = (ligne: string) =>
      verifierGabarit({ ...GESTE, reponse: { ...GESTE.reponse, ligne } })
    const ecart =
      'la ligne contient une référence mal formée : {{requete.colonne}} ou {{parametre}}, en minuscules, sans espace'
    expect(avec('{{agent}} : {{ heures.heures }} heures')).toEqual([ecart])
    expect(avec('{{Heures.nom}} : 3')).toEqual([ecart])
    expect(avec('{{agent}} : {{heures.heures}} heures}}')).toEqual([ecart])
  })
  it('une forme et une seule ; une période au plus ; du et au réservés ; des noms de requêtes uniques ; un :param inconnu dans un SQL', () => {
    expect(verifierGabarit({ ...GESTE, reponse: { ...GESTE.reponse, tableau: 'heures' } })).toEqual(
      ['la réponse est une ligne ou un tableau, pas les deux ni aucun'],
    )
    expect(
      verifierGabarit({
        ...GESTE,
        parametres: { ...GESTE.parametres, autre: { type: 'periode', description: 'x' } },
      }),
    ).toContain('un geste n’a qu’une période (du, au)')
    expect(
      verifierGabarit({
        ...GESTE,
        parametres: { ...GESTE.parametres, du: { type: 'date', description: 'x' } },
      }),
    ).toContain('le paramètre « du » porte un nom réservé à la période')
    const r = GESTE.requetes[0]
    if (!r) throw new Error('jeu')
    expect(verifierGabarit({ ...GESTE, requetes: [r, r] })).toEqual([
      'deux requêtes nommées « heures »',
    ])
    expect(
      verifierGabarit({
        ...GESTE,
        requetes: [{ nom: 'heures', sql: 'SELECT :site AS s' }],
      }),
    ).toEqual(['la requête « heures » nomme un paramètre inconnu : site'])
  })
})

describe('rendre', () => {
  it('une ligne : la première ligne du résultat et les paramètres', () => {
    expect(rendre(GESTE, PARAMS, { heures: UNE_LIGNE })).toBe(
      'Julien Lefèvre : 16 heures du 2026-10-05 au 2026-10-11.',
    )
  })
  it('un tableau : rendu comme un résultat de requête', () => {
    const geste = { ...GESTE, reponse: { ligne: null, tableau: 'heures', vide: 'Rien.' } }
    expect(rendre(geste, PARAMS, { heures: UNE_LIGNE })).toBe('nom | heures\nJulien Lefèvre | 16')
    expect(rendre(geste, PARAMS, { heures: AUCUNE })).toBe('Rien.')
  })
  it('une référence mal formée : lève, aucune accolade n’arrive au patron', () => {
    const geste = { ...GESTE, reponse: { ...GESTE.reponse, ligne: '{{ heures.heures }} heures' } }
    expect(() => rendre(geste, PARAMS, { heures: UNE_LIGNE })).toThrow(/mal formée/)
  })
  it('aucune ligne : le texte « vide »', () => {
    expect(rendre(GESTE, PARAMS, { heures: AUCUNE })).toBe('Aucune vacation sur cette période.')
  })
  it('null se rend « null » ; une référence inconnue ou une requête en erreur lèvent', () => {
    expect(
      rendre(GESTE, PARAMS, {
        heures: { colonnes: ['nom', 'heures'], lignes: [['Julien Lefèvre', null]], tronque: false },
      }),
    ).toContain(': null heures')
    expect(() => rendre(GESTE, PARAMS, {})).toThrow('sans résultat')
    expect(() => rendre(GESTE, PARAMS, { heures: { erreur: 'no such table' } })).toThrow(
      'en erreur',
    )
    expect(() =>
      rendre(
        { ...GESTE, reponse: { ...GESTE.reponse, ligne: '{{agent}}' } },
        { du: '1', au: '2' },
        { heures: UNE_LIGNE },
      ),
    ).toThrow('paramètre inconnu : agent')
    expect(() =>
      rendre(GESTE, PARAMS, { heures: { colonnes: ['nom'], lignes: [['x']], tronque: false } }),
    ).toThrow('ne rend pas de colonne heures')
  })
})

describe('empreinteGeste', () => {
  it('ignore statut et validation, change avec un octet du geste, ne dépend pas de l’ordre des clés', () => {
    const e = empreinteGeste(GESTE)
    expect(e).toMatch(/^[0-9a-f]{64}$/)
    expect(
      empreinteGeste(
        gesteDe(
          FichierGeste.parse({
            ...GESTE,
            statut: 'actif',
            validation: { par: 'Lionel', le: '2026-10-10', jeton: 'j' },
          }),
        ),
      ),
    ).toBe(e)
    expect(empreinteGeste({ ...GESTE, description: `${GESTE.description} ` })).not.toBe(e)
    const { id, ...reste } = GESTE
    expect(empreinteGeste({ ...reste, id })).toBe(e)
  })
})
