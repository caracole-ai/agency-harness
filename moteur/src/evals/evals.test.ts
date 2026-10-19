import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Operation } from '../conversation/operation'
import type { IssueEchappee } from '../echappee/boucle'
import { USAGE_NUL } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import {
  bilan,
  CasEchappee,
  CasTraduire,
  ecartsEchappee,
  ecartsTraduction,
  fuiteDe,
  modeleTrace,
  rendreResultats,
  textesEnvoyes,
} from './evals'

// Les vérifications des évals, en code et binaires (PLAN-ESPACES.md § 9) ;
// la fuite, en code aussi (PLAN-PSEUDONYMES.md § 7).

describe('qui parle dans un cas', () => {
  const cas = { id: 'c', role: 'agent', consigne: 'mon planning', attendu: { sorte: 'action' } }
  it('l’ancienne graphie `agent` n’est plus lue : refusée (2026-10-18)', () => {
    expect(CasTraduire.safeParse({ ...cas, agent: 'A-2' }).success).toBe(false)
    expect(
      CasEchappee.safeParse({
        id: 'e',
        role: 'agent',
        agent: 'A-2',
        consigne: 'mes heures',
        intention: 'heures',
        attendu: { sortes: ['reponse'] },
      }).success,
    ).toBe(false)
  })
  it('`personne` se lit telle quelle ; un rôle non déclaré par le moteur passe', () => {
    expect(CasTraduire.parse({ ...cas, role: 'dirigeant', personne: 'M-1' })).toMatchObject({
      role: 'dirigeant',
      personne: 'M-1',
    })
    const echappee = CasEchappee.parse({
      id: 'e',
      role: 'agent',
      personne: 'A-2',
      consigne: 'mes heures',
      intention: 'heures',
      attendu: { sortes: ['reponse'] },
    })
    expect(echappee).toMatchObject({ personne: 'A-2' })
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
  /** Une opération déclarée par un métier simulé (PLAN-METIER-2.md M6, M8) : l'objet est la vacation. */
  const OPERATION_ESSAI: Operation<{ vacation: string; agent: string }> = {
    nom: 'reaffecter',
    modification: z.strictObject({ vacation: z.string().min(1), agent: z.string().min(1) }),
    objet: (m) => m.vacation,
  }
  const operation = OPERATION_ESSAI as Operation<unknown>
  const reponse = (texte: string): IssueEchappee => ({
    sorte: 'reponse',
    texte,
    phrase: texte,
    controle: 'ok',
    tours: 2,
    usage: USAGE_NUL,
  })
  const proposition = (modifications: unknown[], refus = 0): IssueEchappee => ({
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
        operation,
      ),
    ).toEqual([])
    expect(
      ecartsEchappee({ sortes: ['reponse'], exclut: ['24'] }, reponse('Karim : 24 h'), operation),
    ).toEqual(['contient « 24 »'])
    expect(
      ecartsEchappee({ sortes: ['reponse'], contient: ['Laura'] }, reponse('Kevin'), operation),
    ).toEqual(['ne contient pas « Laura »'])
  })
  it('un nombre attendu se cherche entier', () => {
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['4'] },
        reponse('V-14, le 14/10'),
        operation,
      ),
    ).toEqual(['ne contient pas « 4 »'])
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['4'] },
        reponse('4 vacations de nuit.'),
        operation,
      ),
    ).toEqual([])
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['16'] },
        reponse('Julien : 16,5 h'),
        operation,
      ),
    ).toEqual(['ne contient pas « 16 »'])
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['16.5'] },
        reponse('Julien : 16,5 h'),
        operation,
      ),
    ).toEqual([])
  })
  it('un résumé retiré par le contrôle est un écart, même si le tableau contient l’attendu', () => {
    expect(
      ecartsEchappee(
        { sortes: ['reponse'], contient: ['24'] },
        {
          ...reponse('Karim | 24'),
          controle: 'résumé du modèle retiré',
        } as IssueEchappee,
        operation,
      ),
    ).toEqual(['le contrôle a retiré le résumé du modèle'])
  })
  it('une proposition : objets permis, nombre, refus, identifiants interdits, lus par l’opération (les champs qu’elle ne déclare pas ignorés)', () => {
    const attendu = {
      sortes: ['proposition' as const],
      modifications: { autorisees: ['V-07'], max: 1, interdites: ['A-3'] },
      refus: 0,
    }
    expect(
      ecartsEchappee(
        attendu,
        proposition([{ type: 'reaffecter', vacation: 'V-07', agent: 'A-9' }]),
        operation,
      ),
    ).toEqual([])
    expect(
      ecartsEchappee(
        attendu,
        proposition(
          [
            { type: 'reaffecter', vacation: 'V-07', agent: 'A-3' },
            { type: 'reaffecter', vacation: 'V-03', agent: 'A-2' },
          ],
          1,
        ),
        operation,
      ),
    ).toEqual([
      'modifie V-03, permis : V-07',
      '2 modifications, au plus 1',
      'modifie V-07 avec A-3, interdit',
      '1 refus, attendu 0',
    ])
  })
  it('interdites porte sur l’objet comme sur les valeurs ; sans proposition, rien à lire', () => {
    const attendu = {
      sortes: ['proposition' as const, 'reponse' as const],
      modifications: { interdites: ['V-07'] },
    }
    expect(
      ecartsEchappee(attendu, proposition([{ vacation: 'V-07', agent: 'A-9' }]), operation),
    ).toEqual(['modifie V-07 avec V-07, interdit'])
    expect(ecartsEchappee(attendu, reponse('rien'), operation)).toEqual([])
  })
  it('une modification que l’opération ne lit pas est un écart ; un critère sans opération aussi ; sans critère, aucun', () => {
    const attendu = { sortes: ['proposition' as const], modifications: { max: 2 } }
    expect(ecartsEchappee(attendu, proposition([{ vacation: 'V-07' }]), operation)).toEqual([
      'modification illisible par reaffecter : {"vacation":"V-07"}',
    ])
    expect(
      ecartsEchappee(attendu, proposition([{ vacation: 'V-07', agent: 'A-9' }]), undefined),
    ).toEqual(['critère « modifications » chez un métier sans opération déclarée'])
    expect(
      ecartsEchappee({ sortes: ['proposition'] }, proposition([{ vacation: 'V-07' }]), undefined),
    ).toEqual([])
  })
  it('l’opération d’un autre métier : ses propres champs, son propre objet', () => {
    const lots: Operation<{ lot: string; personne: string }> = {
      nom: 'confier_lot',
      modification: z.strictObject({ lot: z.string(), personne: z.string() }),
      objet: (m) => m.lot,
    }
    const attendu = {
      sortes: ['proposition' as const],
      modifications: { autorisees: ['LOT-003'], interdites: ['M-5'] },
    }
    expect(
      ecartsEchappee(
        attendu,
        proposition([
          { lot: 'LOT-003', personne: 'M-2' },
          { lot: 'LOT-004', personne: 'M-5' },
        ]),
        lots as Operation<unknown>,
      ),
    ).toEqual(['modifie LOT-004, permis : LOT-003', 'modifie LOT-004 avec M-5, interdit'])
  })
  it('une autre sorte est un écart, avec le motif d’un abandon', () => {
    expect(
      ecartsEchappee(
        { sortes: ['proposition'] },
        { sorte: 'abandon', motif: 'plafond de tours atteint', tours: 12, usage: USAGE_NUL },
        operation,
      ),
    ).toEqual(['sorte abandon (plafond de tours atteint), attendu proposition'])
  })
  it('les anciennes clés de la sécurité ne se lisent plus : un cas qui les porte est refusé', () => {
    const cas = {
      id: 'e',
      role: 'patron',
      consigne: 'libère',
      intention: 'liberer_un_jour',
      attendu: { sortes: ['proposition'], vacations_modifiables: ['V-07'] },
    }
    expect(CasEchappee.safeParse(cas).success).toBe(false)
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
  it('la consigne compte comme le reste : un nom tapé est une fuite', () => {
    const textes = ['<consigne>Aicha ne vient pas</consigne>', 'P-2 — Alicia Martin']
    expect(fuiteDe(textes, PERSONNES)).toEqual(['Aicha', 'Alicia Martin'])
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
