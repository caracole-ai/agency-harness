import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { z } from 'zod'
import type { IssueEchappee } from '../echappee/boucle'
import { USAGE_NUL } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import {
  bilan,
  CasEchappee,
  CasTraduire,
  ecartsEchappee,
  ecartsRonde,
  ecartsTraduction,
  FichierRondes,
  fuiteDe,
  LigneFixee,
  type MissionProposee,
  modeleTrace,
  rendreResultats,
  rendreRonde,
  textesEnvoyes,
  trouvee,
} from './evals'

// Les vérifications des évals, en code et binaires (PLAN-ESPACES.md § 9) ;
// la fuite, en code aussi (PLAN-PSEUDONYMES.md § 7).

describe('qui parle dans un cas (PLAN-METIER-2.md M2)', () => {
  const cas = { id: 'c', role: 'agent', consigne: 'mon planning', attendu: { sorte: 'action' } }
  it('l’ancienne graphie `agent` se lit et se rend en `personne`', () => {
    const lu = CasTraduire.parse({ ...cas, agent: 'A-2' })
    expect(lu).toMatchObject({ role: 'agent', personne: 'A-2' })
    expect(lu).not.toHaveProperty('agent')
  })
  it('la nouvelle graphie `personne` se lit telle quelle ; un rôle non déclaré par le moteur passe', () => {
    expect(CasTraduire.parse({ ...cas, role: 'dirigeant', personne: 'M-1' })).toMatchObject({
      role: 'dirigeant',
      personne: 'M-1',
    })
    const echappee = CasEchappee.parse({
      id: 'e',
      role: 'agent',
      agent: 'A-2',
      consigne: 'mes heures',
      intention: 'heures',
      attendu: { sortes: ['reponse'] },
    })
    expect(echappee).toMatchObject({ personne: 'A-2' })
    expect(echappee).not.toHaveProperty('agent')
  })
  it('sans personne : aucun champ', () => {
    expect(CasTraduire.parse({ ...cas, role: 'patron' })).not.toHaveProperty('personne')
  })
  it('un rôle vide est refusé', () => {
    expect(CasTraduire.safeParse({ ...cas, role: '' }).success).toBe(false)
  })
})

describe('ecartsTraduction', () => {
  const absence = {
    sorte: 'action' as const,
    action: 'gerer_absence',
    params: { agent: 'A-11', jour: '2026-10-11' },
  }
  it('la bonne action, les bons paramètres : aucun écart', () => {
    expect(ecartsTraduction(absence, { ...absence })).toEqual([])
  })
  it('seules les clés écrites sont comparées', () => {
    expect(
      ecartsTraduction(
        { sorte: 'action', action: 'gerer_absence', params: { jour: '2026-10-11' } },
        absence,
      ),
    ).toEqual([])
  })
  it('une date mal calculée est un écart nommé', () => {
    expect(
      ecartsTraduction(absence, { ...absence, params: { agent: 'A-11', jour: '2026-10-12' } }),
    ).toEqual(['jour = "2026-10-12", attendu "2026-10-11"'])
  })
  it('null attendu et null rendu sont égaux', () => {
    const v = {
      sorte: 'action' as const,
      action: 'valider_remplacement',
      params: { demande: 'D-V-17', agent: null },
    }
    expect(ecartsTraduction(v, { ...v })).toEqual([])
  })
  it('une demande nouvelle attendue, devenue geste appris : l’action du même nom passe, une autre non', () => {
    const attendu = { sorte: 'nouvelle' as const, intention: ['heures_par_agent'] }
    const heures = {
      sorte: 'action' as const,
      action: 'heures_par_agent',
      params: { agent: 'A-2', du: '2026-10-05', au: '2026-10-11' },
    }
    expect(ecartsTraduction(attendu, heures, ['heures_par_agent'])).toEqual([])
    expect(ecartsTraduction(attendu, heures)).toEqual([
      'sorte action heures_par_agent, attendu nouvelle',
    ])
    expect(
      ecartsTraduction(attendu, { ...heures, action: 'compter_vacations' }, ['compter_vacations']),
    ).toEqual(['sorte action compter_vacations, attendu nouvelle'])
    expect(
      ecartsTraduction({ sorte: 'action', action: 'voir_planning' }, heures, ['heures_par_agent']),
    ).toEqual(['action heures_par_agent, attendu voir_planning'])
  })
  it('une autre sorte est un écart ; une liste de sortes en accepte plusieurs', () => {
    expect(ecartsTraduction({ sorte: 'inconnue' }, absence)).toEqual([
      'sorte action gerer_absence, attendu inconnue',
    ])
    expect(
      ecartsTraduction(
        { sorte: ['inconnue', 'nouvelle'] },
        { sorte: 'nouvelle', intention: 'x', resume: 'y' },
      ),
    ).toEqual([])
  })
  it('une intention hors de la liste acceptée est un écart', () => {
    expect(
      ecartsTraduction(
        { sorte: 'nouvelle', intention: ['heures_par_agent'] },
        { sorte: 'nouvelle', intention: 'compter_heures', resume: 'x' },
      ),
    ).toEqual(['intention compter_heures, attendu heures_par_agent'])
  })
  it('une question attendue : les candidats comparés sans ordre ; une action rendue à la place est un écart', () => {
    const homonyme = { sorte: 'precision' as const, candidats: ['A-11', 'A-14'] }
    expect(ecartsTraduction(homonyme, { sorte: 'precision', candidats: ['A-14', 'A-11'] })).toEqual(
      [],
    )
    expect(ecartsTraduction(homonyme, { sorte: 'precision', candidats: ['A-11'] })).toEqual([
      'candidats A-11, attendu A-11, A-14',
    ])
    expect(ecartsTraduction(homonyme, absence)).toEqual([
      'sorte action gerer_absence, attendu precision',
    ])
    expect(ecartsTraduction(absence, { sorte: 'precision', candidats: [] })).toEqual([
      'sorte precision (personne), attendu action',
    ])
  })
})

describe('ecartsEchappee', () => {
  const reponse = (texte: string): IssueEchappee => ({
    sorte: 'reponse',
    texte,
    controle: 'ok',
    tours: 2,
    usage: USAGE_NUL,
  })
  const proposition = (
    modifications: { vacation: string; agent: string }[],
    refus = 0,
  ): IssueEchappee => ({
    sorte: 'proposition',
    modifications,
    resume: '',
    constats: Array.from({ length: refus }, () => ({
      regle: 'I-01',
      objet: 'V-17',
      verdict: 'refus' as const,
      motif: 'carte expirée',
    })),
    texte: 'V-07 · … : Sophie Marchand → Mehdi Saïdi',
    tours: 3,
    usage: USAGE_NUL,
  })
  it('contient et exclut, sans accents ni casse', () => {
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['saidi', '16'] },
        reponse('Mehdi Saïdi : 16 h'),
      ),
    ).toEqual([])
    expect(
      ecartsEchappee({ sortes: ['reponse'], exclut: ['24'] }, reponse('Karim : 24 h')),
    ).toEqual(['contient « 24 »'])
    expect(ecartsEchappee({ sortes: ['reponse'], contient: ['Laura'] }, reponse('Kevin'))).toEqual([
      'ne contient pas « Laura »',
    ])
  })
  it('un nombre attendu se cherche entier', () => {
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['4'] }, reponse('V-14, le 14/10')),
    ).toEqual(['ne contient pas « 4 »'])
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['4'] }, reponse('4 vacations de nuit.')),
    ).toEqual([])
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['16'] }, reponse('Julien : 16,5 h')),
    ).toEqual(['ne contient pas « 16 »'])
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['16.5'] }, reponse('Julien : 16,5 h')),
    ).toEqual([])
  })
  it('un résumé retiré par le contrôle est un écart, même si le tableau contient l’attendu', () => {
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['24'] }, {
        ...reponse('Karim | 24'),
        controle: 'résumé du modèle retiré',
      } as IssueEchappee),
    ).toEqual(['le contrôle a retiré le résumé du modèle'])
  })
  it('une proposition : vacations permises, nombre, refus, agents interdits', () => {
    const attendu = {
      sortes: ['proposition' as const],
      vacations_modifiables: ['V-07'],
      max_modifications: 1,
      refus: 0,
      interdit_vers: ['A-3'],
    }
    expect(ecartsEchappee(attendu, proposition([{ vacation: 'V-07', agent: 'A-9' }]))).toEqual([])
    expect(
      ecartsEchappee(
        attendu,
        proposition(
          [
            { vacation: 'V-07', agent: 'A-3' },
            { vacation: 'V-03', agent: 'A-2' },
          ],
          1,
        ),
      ),
    ).toEqual([
      'modifie V-03, permis : V-07',
      '2 modifications, au plus 1',
      'confie V-07 à A-3, interdit',
      '1 refus, attendu 0',
    ])
  })
  it('une autre sorte est un écart, avec le motif d’un abandon', () => {
    expect(
      ecartsEchappee(
        { sortes: ['proposition'] },
        { sorte: 'abandon', motif: 'plafond de tours atteint', tours: 12, usage: USAGE_NUL },
      ),
    ).toEqual(['sorte abandon (plafond de tours atteint), attendu proposition'])
  })
})

describe('bilan et résultats', () => {
  const r = (id: string, ecarts: string[], strict = false) => ({
    id,
    ecarts,
    coutUsd: 0.0125,
    strict,
  })
  it('le seuil se compte sur le taux, et tout cas strict en écart le fait manquer', () => {
    const tous = [...Array.from({ length: 19 }, (_, i) => r(`C-${i}`, [])), r('X', ['écart'])]
    expect(bilan(tous, 0.95)).toMatchObject({
      ok: 19,
      total: 20,
      taux: 0.95,
      atteint: true,
      coutUsd: 0.25,
    })
    expect(bilan([...tous.slice(0, 19), r('S', ['écart'], true)], 0.95)).toMatchObject({
      atteint: false,
      stricts: ['S'],
    })
  })
  it('le tableau dit le taux, le coût et chaque cas', () => {
    const texte = rendreResultats(
      'Évals',
      'simulé',
      [r('A', []), r('B', ['jour | faux'], true)],
      0.8,
    )
    expect(texte).toContain(
      'Réussite : 1/2 (50 %, seuil 80 % ; cas stricts en écart : B). Sous le seuil.',
    )
    expect(texte).toContain('Coût réel de la passe : 0.0250 $.')
    expect(texte).toContain('| B (strict) | écart : jour \\| faux | 0.0125 |')
  })
})

describe('modeleTrace', () => {
  it('garde ce qui a été envoyé et ce qui est revenu, et les erreurs', async () => {
    const m = modeleTrace(modeleSimule([{ texte: 'un' }]))
    const appel = {
      systeme: 'système',
      messages: [{ role: 'user' as const, content: 'bonjour' }],
      outils: [],
      effort: 'low' as const,
      maxTokens: 10,
      unSeulOutil: true,
    }
    await m.appeler(appel)
    await expect(m.appeler(appel)).rejects.toThrow('script simulé épuisé')
    expect(m.systeme).toBe('système')
    expect(m.appels).toHaveLength(2)
    expect(m.appels[0]?.reponse?.message.stop_reason).toBe('end_turn')
    expect(m.appels[1]?.erreur).toBe('script simulé épuisé')
  })
})

describe('la fuite (PLAN-PSEUDONYMES.md § 7)', () => {
  // Des noms synthétiques, aucune donnée du client fictif.
  const PERSONNES = [
    { id: 'P-1', nom: 'Aïcha Traoré', sorte: 'personne' as const },
    { id: 'P-2', nom: 'Alicia Martin', sorte: 'personne' as const },
  ]
  it('ce qui est envoyé : les systèmes et les messages de l’utilisateur, résultats d’outils compris ; pas ce que le modèle écrit', async () => {
    const m = modeleTrace(modeleSimule([{ texte: 'un' }, { texte: 'deux' }]))
    const appel = (systeme: string, messages: Parameters<typeof m.appeler>[0]['messages']) =>
      m.appeler({ systeme, messages, outils: [], effort: 'low', maxTokens: 10, unSeulOutil: true })
    await appel('échappée', [{ role: 'user', content: 'Combien pour P-1 ?' }])
    await appel('fabrication', [
      { role: 'user', content: 'Combien pour P-1 ?' },
      { role: 'assistant', content: [{ type: 'text', text: 'Alicia, je pense' }] },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 't', content: 'nom | heures\nAïcha Traoré | 12' },
        ],
      },
    ])
    const textes = textesEnvoyes(m)
    expect(m.systemes).toEqual(['échappée', 'fabrication'])
    expect(textes).toContain('nom | heures\nAïcha Traoré | 12')
    expect(textes).not.toContain('Alicia, je pense')
    expect(fuiteDe(textes, PERSONNES)).toEqual(['Aïcha Traoré'])
  })
  it('la consigne telle qu’écrite est permise à la traduction ; un autre nom du fichier, non', () => {
    const textes = [
      '<consigne>Aicha ne vient pas</consigne>',
      'P-1 — Aïcha Traoré\nP-2 — Alicia Martin',
    ]
    expect(fuiteDe(textes, PERSONNES, 'Aicha ne vient pas')).toEqual([
      'Aïcha Traoré',
      'Alicia Martin',
    ])
    expect(fuiteDe(['Combien pour P-1 ?'], PERSONNES)).toEqual([])
  })
  it('le bilan compte les cas en fuite, le seuil est 0 ; le tableau a sa colonne', () => {
    const r = (id: string, fuite?: string[]) => ({
      id,
      ecarts: [],
      coutUsd: 0,
      strict: false,
      ...(fuite ? { fuite } : {}),
    })
    expect(bilan([r('A', []), r('B', ['Aïcha'])], 0.5)).toMatchObject({
      taux: 1,
      fuites: ['B'],
      atteint: false,
    })
    const texte = rendreResultats('Évals', 'simulé', [r('A', []), r('B', ['Aïcha'])], 0.5)
    expect(texte).toContain('Fuite : 1 cas sur 2 (seuil 0) : B.')
    expect(texte).toContain('| Cas | Issue | Fuite | Coût ($) |')
    expect(texte).toContain('| A | ok | 0 | 0.0000 |')
    expect(texte).toContain('| B | ok | Aïcha | 0.0000 |')
    expect(rendreResultats('Évals', 'simulé', [r('A')], 0.5)).not.toContain('Fuite')
  })
})

describe('la ronde (PLAN-RONDE.md § 5.4)', () => {
  const attendue = {
    sorte: 'factorisation' as const,
    intentions: ['agents_sans_carte', 'cartes_expirees'],
    echappees: ['E-1', 'E-2', 'E-3'],
  }
  const proposee = (x: Partial<MissionProposee> = {}): MissionProposee => ({
    id: 'cartes',
    sorte: 'factorisation',
    intentions: ['agents_sans_carte', 'cartes_expirees', 'autre'],
    echappees: [],
    ...x,
  })
  const ECHECS = ['ronde échouée']

  it('trouvée par sorte et intentions, ou par deux échappées ; jamais par une autre sorte', () => {
    expect(trouvee(attendue, proposee())).toBe(true)
    expect(
      trouvee(attendue, proposee({ intentions: ['agents_sans_carte'], echappees: ['E-1', 'E-3'] })),
    ).toBe(true)
    expect(
      trouvee(attendue, proposee({ intentions: ['agents_sans_carte'], echappees: ['E-1'] })),
    ).toBe(false)
    expect(trouvee(attendue, proposee({ sorte: 'geste_code' }))).toBe(false)
  })

  it('précision et rappel : une juste, une en trop, une attendue manquée', () => {
    const autre = { sorte: 'geste_code' as const, intentions: ['simuler_absence'], echappees: [] }
    const b = ecartsRonde(
      { rien_a_signaler: false, missions: [attendue, autre] },
      'faite',
      [proposee(), proposee({ id: 'x', sorte: 'intention_nouvelle', intentions: ['paie'] })],
      ECHECS,
    )
    expect(b).toMatchObject({ attendues: 2, trouvees: 1, proposees: 2, justes: 1 })
    expect(b.ecarts).toEqual([
      'attendue non trouvée : geste_code (simuler_absence)',
      'en trop : x (intention_nouvelle ; paie)',
    ])
  })

  it('rien à signaler : juste sans mission ; une ronde échouée est un écart', () => {
    expect(
      ecartsRonde({ rien_a_signaler: true, missions: [] }, 'rien à signaler', [], ECHECS).ecarts,
    ).toEqual([])
    expect(
      ecartsRonde({ rien_a_signaler: true, missions: [] }, 'faite', [proposee()], ECHECS).ecarts[0],
    ).toMatch(/rien à signaler attendu/)
    expect(
      ecartsRonde({ rien_a_signaler: true, missions: [] }, 'ronde échouée', [], ECHECS).ecarts,
    ).toEqual(['ronde : ronde échouée'])
  })

  it('le tableau dit « brouillon, pas une mesure » tant que les étiquettes sont un brouillon', () => {
    const cas = [
      {
        id: 'R-1',
        ecarts: [],
        coutUsd: 0.25,
        strict: false,
        fuite: [],
        estime: true,
        bilan: { ecarts: [], attendues: 1, trouvees: 1, proposees: 1, justes: 1 },
      },
    ]
    const brouillon = rendreRonde('t', 'm', 'brouillon', cas)
    expect(brouillon).toContain('brouillon, pas une mesure')
    expect(brouillon).toContain('estimé par le binaire')
    expect(brouillon).toContain('Précision : 100 %')
    expect(rendreRonde('t', 'm', 'lionel', cas)).not.toContain('brouillon')
  })

  it('evals/rondes.yaml et ses journaux fixés se lisent', () => {
    const racine = fileURLToPath(new URL('../../../evals/', import.meta.url))
    const fichier = FichierRondes.parse(parse(readFileSync(join(racine, 'rondes.yaml'), 'utf8')))
    expect(fichier.cas.some((c) => c.attendu.rien_a_signaler)).toBe(true)
    expect(fichier.cas.length).toBeGreaterThanOrEqual(3)
    for (const nom of Object.values(fichier.journaux)) {
      const lignes = z.array(LigneFixee).parse(JSON.parse(readFileSync(join(racine, nom), 'utf8')))
      // Aucun résultat de requête dans un journal fixé.
      expect(lignes.every((l) => l.type !== 'outil_echappee')).toBe(true)
    }
  })
})
