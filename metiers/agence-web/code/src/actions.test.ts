import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type Action,
  actionsDe,
  aParis,
  chargerPersonnes,
  confirmer,
  copieClient,
  type Identite,
  type IdentiteVerifiee,
  LEQUEL,
  modeleSimule,
  recevoir,
  TYPE_CONFIRMATION_ATTENDUE,
  TYPE_CONSIGNE,
  traiterConsigne,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { ACTIONS, enEuros, PAS_OUVERT, TYPE_ABSENCE_PROPOSEE, TYPE_BROUILLON } from './actions'
import { CONVERSATION, type Session } from './conversation'
import { projetsDe } from './copie'

// Les huit gestes de l'agence web (PLAN-METIER-2.md § 7.5), joués par chaque
// rôle autorisé sur une copie du client fictif, et les refus par capacité :
// l'absence du geste dans la liste du rôle, ou le refus du code.

const exemple = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const maintenant = aParis('2026-10-12T10:00')
const session = (avant?: (dossier: string) => void): Session => {
  const dossier = copieClient(exemple)
  avant?.(dossier)
  return CONVERSATION.ouvrir(dossier)
}
const qui = (role: string, personne: string): Identite => ({ role, personne })
const DIRIGEANT = qui('dirigeant', 'M-01')
const COMMERCIALE = qui('commercial', 'M-02')
const PO = qui('po', 'M-03')
const GRAPHISTE = qui('graphiste', 'M-04')
const BILAL = qui('developpeur', 'M-05')
const TOUS = [DIRIGEANT, COMMERCIALE, PO, GRAPHISTE, BILAL]

const geste = (id: string): Action<Session, unknown> => {
  const a = ACTIONS.find((x) => x.id === id)
  if (!a) throw new Error(`pas de geste ${id}`)
  return a
}
const jouer = async (s: Session, id: string, identite: Identite, p: unknown) =>
  (await geste(id).executer(s, identite, p, maintenant)).texte

describe('qui peut quoi (§ 7.5)', () => {
  it('les rôles de chaque geste', () => {
    expect(Object.fromEntries(ACTIONS.map((a) => [a.id, a.roles]))).toEqual({
      etat_projet: ['dirigeant', 'po', 'commercial', 'graphiste', 'developpeur'],
      factures_en_retard: ['dirigeant', 'po', 'commercial'],
      mes_tickets: ['dirigeant', 'po', 'commercial', 'graphiste', 'developpeur'],
      mon_temps: ['dirigeant', 'po', 'commercial', 'graphiste', 'developpeur'],
      disponibilites: ['dirigeant', 'po', 'commercial'],
      domaines_expirant: ['dirigeant', 'po', 'developpeur'],
      declarer_absence: ['dirigeant', 'po', 'commercial', 'graphiste', 'developpeur'],
      brouillon_relance: ['dirigeant', 'po', 'commercial'],
    })
  })
  it('deux gestes écrivent : l’absence propose, le brouillon attend un oui ; aucune description ne dépasse 200 caractères', () => {
    expect(ACTIONS.filter((a) => a.ecrit).map((a) => [a.id, a.propose ?? false])).toEqual([
      ['declarer_absence', true],
      ['brouillon_relance', false],
    ])
    for (const a of ACTIONS) expect(a.description.length).toBeLessThanOrEqual(200)
  })
  it('le graphiste n’a ni les factures, ni les disponibilités, ni les domaines, ni les relances', () => {
    expect(actionsDe(ACTIONS, 'graphiste').map((a) => a.id)).toEqual([
      'etat_projet',
      'mes_tickets',
      'mon_temps',
      'declarer_absence',
    ])
  })
})

describe('etat_projet', () => {
  const s = session()
  it.each([DIRIGEANT, PO])(
    '$role : les jours consommés et vendus, cités des données',
    async (identite) => {
      const texte = await jouer(s, 'etat_projet', identite, { projet: 'la boulangerie' })
      expect(texte).toContain('PRJ-12 — Site de la boulangerie et commande en ligne')
      expect(texte).toContain('Lot en cours : LOT-032 — Commande en ligne')
      expect(texte).toContain('Jours : 18 consommés sur 29 vendus (62 %)')
      expect(texte).toContain('Prochaine échéance : fin prévue le 27/11/2026')
    },
  )
  it.each([COMMERCIALE, GRAPHISTE, BILAL])(
    '$role : l’état et la date, jamais les jours',
    async (identite) => {
      const texte = await jouer(s, 'etat_projet', identite, { projet: 'PRJ-12' })
      expect(texte).toContain('État : en cours (forfait)')
      expect(texte).toContain('fin prévue le 27/11/2026')
      expect(texte).not.toContain('Jours')
      expect(texte).not.toMatch(/€|vendus/)
    },
  )
  it('un lot recetté deux fois, son PV signé à la première : pas en attente, comme pour I-01', async () => {
    const t = session()
    t.ctx.recettes.push(
      { projet: 'PRJ-12', lot: 'LOT-032', date: '2026-09-01', pv_signe_le: '2026-09-03' },
      { projet: 'PRJ-12', lot: 'LOT-032', date: '2026-09-20' },
    )
    const texte = await jouer(t, 'etat_projet', DIRIGEANT, { projet: 'PRJ-12' })
    expect(texte).toContain('PV en attente : aucun')
    expect(texte).toContain('Lot en cours : LOT-033')
  })
  it('un graphiste, hors de ses projets : refus du code ; une mention vague : « lequel ? »', async () => {
    const autre = [...s.ctx.projets.keys()].find((id) => !projetsDe(s, 'M-04').has(id))
    if (!autre) throw new Error('le graphiste a tous les projets')
    await expect(jouer(s, 'etat_projet', GRAPHISTE, { projet: autre })).rejects.toThrow(PAS_OUVERT)
    expect(() => geste('etat_projet').reformuler(s, GRAPHISTE, { projet: autre })).toThrow(
      PAS_OUVERT,
    )
    expect(await jouer(s, 'etat_projet', DIRIGEANT, { projet: 'le site' })).toMatch(
      new RegExp(`^${LEQUEL.replace('?', '\\?')} PRJ-\\d{2}(, PRJ-\\d{2})+$`),
    )
    await expect(jouer(s, 'etat_projet', DIRIGEANT, { projet: 'zzz' })).rejects.toThrow(
      'Aucun projet ne correspond à « zzz ».',
    )
  })
})

describe('factures_en_retard', () => {
  const s = session()
  it.each([DIRIGEANT, PO, COMMERCIALE])(
    '$role : par facture, client, montant, retard, dernière relance',
    async (identite) => {
      const texte = await jouer(s, 'factures_en_retard', identite, { client: null })
      expect(texte.split('\n')).toEqual([
        'FAC-2026-031 — Laboratoire Biocéane (CLI-18) — 9 360,00 € TTC — échue le 30/08/2026, 43 jours de retard — dernière relance : niveau 2 le 29/09/2026',
        'FAC-2026-042 — Transports Mérindol (CLI-07) — 7 780,50 € TTC — échue le 01/10/2026, 11 jours de retard — aucune relance',
      ])
    },
  )
  it('pour un seul client, par sa mention', async () => {
    expect(await jouer(s, 'factures_en_retard', COMMERCIALE, { client: 'CLI-07' })).toMatch(
      /^FAC-2026-042 /,
    )
    expect(await jouer(s, 'factures_en_retard', COMMERCIALE, { client: 'Céramiques Orsini' })).toBe(
      'Aucune facture en retard.',
    )
  })
  it('les euros à deux décimales, à la française', () => {
    expect(enEuros(12500)).toBe('12 500,00 €')
    expect(enEuros(1234.5)).toBe('1 234,50 €')
  })
})

describe('mes_tickets', () => {
  const s = session()
  it.each(TOUS)('$role : seulement les siens', async (identite) => {
    const texte = await jouer(s, 'mes_tickets', identite, { du: null, au: null })
    const cles = texte.match(/TK-\d{4}/g) ?? []
    for (const cle of cles) expect(s.ctx.tickets.get(cle)?.assigne).toBe(identite.personne)
  })
  it('le développeur M-05 : ses tickets ouverts, par projet, avec l’estimation ; pas ceux de Julie', async () => {
    const texte = await jouer(s, 'mes_tickets', BILAL, { du: null, au: null })
    expect(texte).toContain(
      "  TK-1050 — Le formulaire d'inscription ne s'envoie pas — à faire — 3 h estimées",
    )
    expect(texte).toContain('PRJ-14 — Site et inscriptions (fin prévue le 18/12/2026)')
    expect(texte).not.toContain('TK-1042')
  })
  it('sur une période : les tickets actifs, résolus compris', async () => {
    const texte = await jouer(s, 'mes_tickets', GRAPHISTE, { du: '2025-11-01', au: '2025-11-30' })
    expect(texte).toContain('résolu')
  })
})

describe('mon_temps', () => {
  const s = session()
  it.each(TOUS)('$role : ses heures par projet, en heures et en jours', async (identite) => {
    const texte = await jouer(s, 'mon_temps', identite, {
      personne: null,
      du: '2026-10-01',
      au: '2026-10-12',
    })
    expect(texte).toMatch(/^Heures de /)
  })
  it('les jours avec les heures par jour de la config (7)', async () => {
    const texte = await jouer(s, 'mon_temps', BILAL, {
      personne: null,
      du: '2026-10-01',
      au: '2026-10-12',
    })
    expect(texte).toContain('Heures de Bilal Kowalski du 01/10/2026 au 12/10/2026 :')
    expect(texte).toContain(
      'PRJ-04 — Intranet documentaire (fin prévue le 18/12/2026) : 15 h (2,14 j)',
    )
    expect(texte).toContain('Total : 53,5 h (7,64 j)')
  })
  it.each([DIRIGEANT, PO])('$role : celles d’une autre personne', async (identite) => {
    const texte = await jouer(s, 'mon_temps', identite, {
      personne: 'M-06',
      du: '2026-10-01',
      au: '2026-10-12',
    })
    expect(texte).toContain('Heures de Julie Okafor')
    expect(texte).toContain('Total : 50,5 h (7,21 j)')
  })
  it.each([COMMERCIALE, BILAL])(
    '$role : le temps d’une autre personne est un refus du code',
    async (identite) => {
      const p = { personne: 'M-06', du: '2026-10-01', au: '2026-10-12' }
      expect(() => geste('mon_temps').reformuler(s, identite, p)).toThrow(PAS_OUVERT)
      await expect(jouer(s, 'mon_temps', identite, p)).rejects.toThrow(PAS_OUVERT)
    },
  )
})

describe('declarer_absence, puis disponibilites', async () => {
  const s = session()
  const avant = await jouer(s, 'disponibilites', PO, { du: '2026-10-12', au: '2026-10-16' })
  const proposition = await jouer(s, 'declarer_absence', GRAPHISTE, {
    du: '2026-10-15',
    au: '2026-10-15',
  })
  it('la proposition liste les tickets ouverts pour la PO ; rien d’autre ne s’écrit que la ligne du journal', () => {
    expect(proposition).toMatch(
      /^Proposition : absence de Kenji Rossi le 15\/10\/2026\. Rien n'est écrit/,
    )
    expect(proposition).toContain('  TK-1047 — Maquette du formulaire (PRJ-16)')
    const lignes = s.journal.lire().filter((l) => l.type === TYPE_ABSENCE_PROPOSEE)
    expect(lignes.map((l) => l.objet)).toEqual(['M-04'])
    expect(readFileSync(join(s.dossier, 'tickets.csv'), 'utf8')).toBe(
      readFileSync(join(exemple, 'tickets.csv'), 'utf8'),
    )
  })
  it.each([DIRIGEANT, PO, COMMERCIALE])(
    '$role : la charge de chacun, et l’absence proposée',
    async (identite) => {
      expect(avant).toContain(
        'Kenji Rossi (M-04) : 79 h estimées sur 9 tickets ouverts ; aucune absence connue',
      )
      const texte = await jouer(s, 'disponibilites', identite, {
        du: '2026-10-12',
        au: '2026-10-16',
      })
      expect(texte.split('\n')[0]).toBe('Disponibilités du 12/10/2026 au 16/10/2026 :')
      expect(texte).toContain(
        'Kenji Rossi (M-04) : 79 h estimées sur 9 tickets ouverts ; absence proposée le 15/10/2026',
      )
      expect(texte.split('\n')).toHaveLength(7)
    },
  )
  it.each(TOUS)('$role peut déclarer la sienne', async (identite) => {
    const texte = await jouer(s, 'declarer_absence', identite, {
      du: '2026-10-19',
      au: '2026-10-20',
    })
    expect(texte).toContain('du 19/10/2026 au 20/10/2026')
  })
  it('une période à l’envers : refus', async () => {
    await expect(
      jouer(s, 'disponibilites', PO, { du: '2026-10-16', au: '2026-10-12' }),
    ).rejects.toThrow("la période est à l'envers")
  })
})

describe('domaines_expirant', () => {
  it.each([DIRIGEANT, PO, BILAL])(
    '$role : expirés et à venir dans n jours, dans l’ordre',
    async (identite) => {
      const texte = await jouer(session(), 'domaines_expirant', identite, { jours: 30 })
      expect(texte.split('\n')).toEqual([
        '03/10/2026 : le domaine jardins-de-lune.example a expiré (Association Les Jardins de Lune, registrar-c)',
        '22/10/2026 : le certificat de camping-genets-bleus.example expire (Camping Les Genêts bleus, registrar-a)',
      ])
    },
  )
  it('une date inconnue vient en tête', async () => {
    const s = session((dossier) => {
      const f = join(dossier, 'domaines.csv')
      writeFileSync(f, readFileSync(f, 'utf8').replace(';2027-05-18;', ';;'))
    })
    const texte = await jouer(s, 'domaines_expirant', DIRIGEANT, { jours: 30 })
    expect(texte.split('\n')[0]).toBe(
      'Date inconnue : le domaine atelier-valcourt.example (Atelier de ferronnerie Valcourt, registrar-a)',
    )
  })
})

/** Une identité passée par la porte, sur le registre d'accès de la copie. */
function verifiee(s: Session, demandeur: Identite): IdentiteVerifiee {
  const accueil = recevoir(
    CONVERSATION.roles,
    chargerPersonnes(s.dossier, CONVERSATION.roles),
    demandeur,
  )
  if (accueil.sorte === 'refus') throw new Error(accueil.motif)
  return accueil.identite
}

let n = 0
const tour = async (
  s: Session,
  identite: Identite,
  outil: string,
  entree: unknown,
  consigne = 'consigne',
) => {
  const conversation = `C-test-${++n}`
  const modele = modeleSimule([{ outil, entree }])
  const r = await traiterConsigne(CONVERSATION, s.dossier, modele, {
    identite: verifiee(s, identite),
    consigne,
    maintenant,
    conversation,
  })
  return { r, conversation, modele }
}

describe('brouillon_relance : un brouillon rendu par le code, gardé sur un oui, jamais envoyé', () => {
  it.each([DIRIGEANT, PO, COMMERCIALE])(
    '$role : le brouillon au niveau qui suit, puis la ligne au journal',
    async (identite) => {
      const s = session()
      const { r, conversation } = await tour(
        s,
        identite,
        'brouillon_relance',
        { facture: 'FAC-2026-031' },
        'Prépare la relance pour la facture FAC-2026-031',
      )
      if (r.sorte !== 'confirmation') throw new Error(`sorte ${r.sorte} : ${r.texte}`)
      expect(r.texte).toMatch(
        /^Brouillon de relance, niveau 3, pour FAC-2026-031 \(Laboratoire Biocéane\)\. Il n'est jamais envoyé/,
      )
      expect(r.texte).toContain(
        "Malgré nos relances (14/09/2026, 29/09/2026), la facture FAC-2026-031 du 01/07/2026, d'un montant de 9 360,00 € TTC",
      )
      expect(r.texte).toMatch(/Garder ce brouillon au journal \? \(oui \/ non\)$/)
      expect(s.journal.lire().filter((l) => l.type === TYPE_BROUILLON)).toEqual([])
      const oui = await confirmer(
        CONVERSATION,
        s,
        verifiee(s, identite),
        conversation,
        r.empreinte,
        true,
        maintenant,
      )
      expect(oui).toEqual({
        sorte: 'resultat',
        texte:
          "Brouillon gardé au journal pour FAC-2026-031 (niveau 3). Il n'est pas envoyé : l'envoi au client attend le oui du dirigeant.",
      })
      const brouillons = s.journal.lire().filter((l) => l.type === TYPE_BROUILLON)
      expect(brouillons.map((l) => [l.objet, l.issue])).toEqual([['FAC-2026-031', 'niveau 3']])
      expect(brouillons[0]?.motif).toContain('Objet : facture FAC-2026-031')
      expect(readFileSync(join(s.dossier, 'relances.csv'), 'utf8')).toBe(
        readFileSync(join(exemple, 'relances.csv'), 'utf8'),
      )
    },
  )
  it('« non » : rien n’est gardé', async () => {
    const s = session()
    const { r, conversation } = await tour(s, DIRIGEANT, 'brouillon_relance', {
      facture: 'FAC-2026-042',
    })
    if (r.sorte !== 'confirmation') throw new Error(`sorte ${r.sorte}`)
    expect(r.texte).toContain('niveau 1')
    const non = await confirmer(
      CONVERSATION,
      s,
      verifiee(s, DIRIGEANT),
      conversation,
      r.empreinte,
      false,
      maintenant,
    )
    expect(non.texte).toBe("D'accord, rien n'est fait.")
    expect(s.journal.lire().filter((l) => l.type === TYPE_BROUILLON)).toEqual([])
  })
  it('une facture payée : refus ; plusieurs factures possibles : « lequel ? »', async () => {
    const s = session()
    const payee = await tour(s, DIRIGEANT, 'brouillon_relance', { facture: 'FAC-2026-017' })
    expect(payee.r).toEqual({
      sorte: 'refus',
      texte: 'FAC-2026-017 : rien à relancer, la facture est payée.',
    })
    const lequel = await tour(s, DIRIGEANT, 'brouillon_relance', {
      facture: 'Laboratoire Biocéane',
    })
    expect(lequel.r.sorte).toBe('refus')
    expect(lequel.r.texte).toMatch(/^Lequel \? FAC-2026-031, FAC-2026-041/)
  })
})

describe('les refus par absence du geste dans la liste du rôle', () => {
  // Le geste n'est pas même envoyé au modèle ; s'il le choisit quand même, la traduction ne le lit pas.
  it.each([
    [GRAPHISTE, 'factures_en_retard', { client: null }],
    [BILAL, 'brouillon_relance', { facture: 'FAC-2026-031' }],
    [GRAPHISTE, 'domaines_expirant', { jours: 30 }],
    [BILAL, 'disponibilites', { du: '2026-10-12', au: '2026-10-16' }],
  ] as const)('%o ne joue pas %s : rien ne s’exécute', async (identite, id, entree) => {
    const s = session()
    const { r, conversation, modele } = await tour(s, identite, id, entree)
    expect(modele.appels[0]?.outils.map((o) => o.name)).not.toContain(id)
    expect(r.sorte).toBe('je_ne_sais_pas')
    expect(r.texte).toContain(`action inconnue : ${id}`)
    const lignes = s.journal.historique(conversation)
    expect(lignes.map((l) => l.type)).not.toContain(TYPE_CONFIRMATION_ATTENDUE)
    expect(lignes.find((l) => l.type === TYPE_CONSIGNE)?.issue).toBe('inconnue')
  })
})
