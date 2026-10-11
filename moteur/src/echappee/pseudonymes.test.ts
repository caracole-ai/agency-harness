import { describe, expect, it } from 'vitest'
import type { TableCopie } from './copie'
import {
  formesConnues,
  fuites,
  masquerConsigne,
  masquerTables,
  masquerTexte,
  restituer,
} from './pseudonymes'

// PLAN-PSEUDONYMES.md § 4 : des listes synthétiques, aucune donnée du client fictif.
const AICHA = { id: 'P-1', nom: 'Aïcha Traoré' }
const ALICIA = { id: 'P-2', nom: 'Alicia Martin' }
const JEAN_PIERRE = { id: 'P-3', nom: 'Jean-Pierre Le Goff' }
const MARCO = { id: 'P-4', nom: "Marco D'Angelo" }
const KARIM_H = { id: 'P-5', nom: 'Karim Haddad' }
const KARIM_B = { id: 'P-6', nom: 'Karim Benali' }
const ALI = { id: 'P-7', nom: 'Ali Ndiaye' }
const NORDINE = { id: 'P-8', nom: 'Nordine Amrani' }
const AL = { id: 'P-9', nom: 'Al Kader' }
const P71 = { id: 'P-71', nom: 'Sami Roux' }
const EQUIPE = [AICHA, ALICIA, JEAN_PIERRE, MARCO, KARIM_H, KARIM_B, ALI, NORDINE, AL, P71]

const m = (texte: string) => masquerTexte(texte, EQUIPE)

describe('formesConnues', () => {
  it('les formes de designation.ts, sans celles de moins de trois lettres', () => {
    const [aicha] = formesConnues([AICHA])
    expect(aicha?.formes).toEqual(['aicha traore', 'aicha', 'traore', 'traore aicha'])
    const [al] = formesConnues([AL])
    expect(al?.formes).toEqual(['al kader', 'kader', 'kader al'])
  })
})

describe('masquerTexte', () => {
  it('le nom complet devient un seul identifiant, avant le prénom seul', () => {
    expect(m('Aïcha Traoré a fait 12 h.')).toBe('P-1 a fait 12 h.')
  })
  it('accents et casse près', () => {
    expect(m('Aicha ne vient pas')).toBe('P-1 ne vient pas')
    expect(m('AÏCHA ne vient pas')).toBe('P-1 ne vient pas')
    expect(m('traore aicha est malade')).toBe('P-1 est malade')
  })
  it('un prénom composé, tiret ou espace, et un tiret long', () => {
    expect(m('Jean-Pierre arrive')).toBe('P-3 arrive')
    expect(m('jean pierre arrive')).toBe('P-3 arrive')
    expect(m('Jean–Pierre  Le Goff arrive')).toBe('P-3 arrive')
  })
  it('une apostrophe droite ou courbe', () => {
    expect(m("D'Angelo est là")).toBe('P-4 est là')
    expect(m('D’Angelo est là')).toBe('P-4 est là')
  })
  it('le prénom seul, le nom seul', () => {
    expect(m('Alicia et Traoré')).toBe('P-2 et P-1')
  })
  it('deux homonymes de prénom : le nom complet tranche, le prénom seul reste', () => {
    expect(m('Karim Haddad et Karim Benali')).toBe('P-5 et P-6')
    expect(m('Karim vient')).toBe('Karim vient')
  })
  it('au mot près : « Alice » n’est pas « Ali », « Alicia » ne contient pas « Ali »', () => {
    expect(m('Alice et Alicia')).toBe('Alice et P-2')
    expect(m('Ali vient')).toBe('P-7 vient')
  })
  it('un site qui ressemble à un nom ne bouge pas', () => {
    expect(m('Ronde à l’Entrepôt Nord')).toBe('Ronde à l’Entrepôt Nord')
    expect(m('Nordine tient l’Entrepôt Nord')).toBe('P-8 tient l’Entrepôt Nord')
  })
  it('une forme de moins de trois lettres ne se masque pas', () => {
    expect(m('al dente, Kader')).toBe('al dente, P-9')
  })
  it('un identifiant déjà là, un saut de ligne, un JSON', () => {
    expect(m('P-1 et Aïcha')).toBe('P-1 et P-1')
    expect(m('Aïcha\nTraoré')).toBe('P-1')
    expect(m('{"nom":"Aïcha Traoré","heures":12}')).toBe('{"nom":"P-1","heures":12}')
  })
  it('idempotent', () => {
    for (const x of [
      'Karim Haddad et Karim',
      "Jean-Pierre, D'Angelo, Ali, Alice",
      'P-1 et Aïcha',
    ]) {
      expect(m(m(x))).toBe(m(x))
    }
  })
  it('sans personne, rien ne change', () => {
    expect(masquerTexte('Aïcha Traoré', [])).toBe('Aïcha Traoré')
  })
})

describe('restituer', () => {
  it('aller-retour sur des noms complets', () => {
    const x = "Aïcha Traoré remplace Jean-Pierre Le Goff ; Marco D'Angelo et Karim Benali restent."
    expect(restituer(m(x), EQUIPE)).toBe(x)
  })
  it('au mot près : P-7 n’est pas dans P-71, ni dans D-P-7', () => {
    expect(restituer('P-71 et P-7, pas D-P-7 ni P-7-B', EQUIPE)).toBe(
      'Sami Roux et Ali Ndiaye, pas D-P-7 ni P-7-B',
    )
  })
  it('un identifiant inconnu reste', () => {
    expect(restituer('P-99 et P-1', EQUIPE)).toBe('P-99 et Aïcha Traoré')
  })
})

describe('fuites', () => {
  it('vide sur un texte masqué', () => {
    expect(fuites(m('Aïcha Traoré, Jean-Pierre, Kader'), EQUIPE)).toEqual([])
  })
  it('les formes trouvées, telles qu’écrites, la plus longue seulement', () => {
    expect(fuites('traore et Karim Haddad', EQUIPE)).toEqual(['traore', 'Karim Haddad'])
  })
  it('un prénom partagé, que le masque laisse, est une fuite', () => {
    expect(fuites(m('Karim vient'), EQUIPE)).toEqual(['Karim'])
  })
})

const AGENTS: TableCopie = {
  nom: 'agents',
  description: 'les agents',
  colonnes: [
    { nom: 'id', type: 'TEXT', description: 'identifiant' },
    {
      nom: 'nom',
      type: 'TEXT',
      description: 'prénom et nom',
      masquee: "l'identifiant de l'agent, qui tient lieu de nom",
    },
    { nom: 'ssiap', type: 'INTEGER', description: 'niveau' },
  ],
  lignes: [
    { id: 'P-1', nom: 'Aïcha Traoré', ssiap: 1 },
    { id: 'P-5', nom: 'Karim Haddad', ssiap: null },
  ],
}
const CONSTATS: TableCopie = {
  nom: 'constats',
  description: 'les constats',
  colonnes: [
    { nom: 'objet', type: 'TEXT', description: 'objet' },
    { nom: 'motif', type: 'TEXT', description: 'pourquoi' },
  ],
  lignes: [{ objet: 'V-03', motif: 'chevauche la vacation de Karim Haddad (Entrepôt Nord)' }],
}

describe('masquerTables', () => {
  it('la colonne du nom reçoit l’identifiant et sa description masquée ; les autres cellules texte sont masquées', () => {
    const [agents, constats] = masquerTables([AGENTS, CONSTATS], EQUIPE)
    expect(agents?.lignes).toEqual([
      { id: 'P-1', nom: 'P-1', ssiap: 1 },
      { id: 'P-5', nom: 'P-5', ssiap: null },
    ])
    expect(agents?.colonnes[1]?.description).toBe("l'identifiant de l'agent, qui tient lieu de nom")
    expect(constats?.lignes[0]?.motif).toBe('chevauche la vacation de P-5 (Entrepôt Nord)')
  })
  it('ne modifie pas l’entrée', () => {
    masquerTables([AGENTS, CONSTATS], EQUIPE)
    expect(AGENTS.lignes[0]?.nom).toBe('Aïcha Traoré')
    expect(AGENTS.colonnes[1]?.description).toBe('prénom et nom')
  })
  it('deux personnes au même nom complet : la colonne du nom arrête tout', () => {
    const jumeaux = [
      { id: 'P-1', nom: 'Aïcha Traoré' },
      { id: 'P-2', nom: 'Aicha Traore' },
    ]
    expect(() => masquerTables([AGENTS], jumeaux)).toThrow(/garde un nom/)
  })
  it('un nom de moins de trois lettres : la colonne du nom arrête tout aussi', () => {
    const court = { ...AGENTS, lignes: [{ id: 'P-1', nom: 'Li', ssiap: null }] }
    expect(() => masquerTables([court], [{ id: 'P-1', nom: 'Li' }])).toThrow(/garde un nom/)
  })
})

describe('masquerConsigne (S3)', () => {
  const ids = (r: ReturnType<typeof masquerConsigne>) => r.precision?.candidats.map((p) => p.id)
  it('une forme sûre : l’identifiant, sans question', () => {
    expect(masquerConsigne('Combien d’heures a fait Aïcha ?', EQUIPE)).toEqual({
      texte: 'Combien d’heures a fait P-1 ?',
    })
  })
  it('un prénom partagé : la question, avec les deux', () => {
    const r = masquerConsigne('Libère Karim mardi', EQUIPE)
    expect(r.texte).toBe('Libère Karim mardi')
    expect(r.precision?.mention).toBe('Karim')
    expect(ids(r)).toEqual(['P-5', 'P-6'])
  })
  it('un nom proche, à majuscule, dans la phrase : la question', () => {
    const r = masquerConsigne('Combien d’heures a fait Aisha ?', EQUIPE)
    expect(r.precision?.mention).toBe('Aisha')
    expect(ids(r)).toContain('P-1')
  })
  it('deux mots proches en tête de phrase : la question ; un mot seul en tête : rien', () => {
    expect(masquerConsigne('Aisha Traorre est là ?', EQUIPE).precision?.mention).toBe(
      'Aisha Traorre',
    )
    expect(masquerConsigne('Parmi les agents, qui ?', [KARIM_H])).toEqual({
      texte: 'Parmi les agents, qui ?',
    })
  })
  it('aucune ressemblance : le mot passe tel quel', () => {
    expect(masquerConsigne('Combien d’heures a fait Bidule ?', EQUIPE)).toEqual({
      texte: 'Combien d’heures a fait Bidule ?',
    })
  })
  it('une réponse donnée ne touche pas un nom complet déjà masqué', () => {
    expect(
      masquerConsigne('Compare Karim Haddad et Karim', EQUIPE, [{ mention: 'Karim', id: 'P-6' }]),
    ).toEqual({ texte: 'Compare P-5 et P-6' })
  })
  it('les réponses déjà données remplacent la mention, au mot près', () => {
    expect(
      masquerConsigne('Karim et karimou, Aisha', EQUIPE, [
        { mention: 'Karim', id: 'P-6' },
        { mention: 'Aisha', id: 'P-1' },
      ]),
    ).toEqual({ texte: 'P-6 et karimou, P-1' })
  })
})
