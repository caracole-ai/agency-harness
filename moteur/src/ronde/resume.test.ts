import { describe, expect, it } from 'vitest'
import { fuites } from '../echappee/pseudonymes'
import { Temporal } from '../temps/temporal'
import { dossierEssai, METIER_ESSAI, PERSONNES_ESSAI, SECRETS_ESSAI } from './essai'
import { categorieAbandon, MOTIF_DU_MODELE, resumerJournal } from './resume'

// PLAN-RONDE.md § 5.1 : la fenêtre, les comptes, le refus d'une échappée sans
// `consigne_modele`, aucune fuite, aucune valeur de résultat de requête.

const jour = (j: string) => Temporal.PlainDate.from(j)

function resumeDu(du: string, au = du) {
  const s = METIER_ESSAI.ouvrir(dossierEssai())
  try {
    return resumerJournal(s.journal, { du: jour(du), au: jour(au) }, PERSONNES_ESSAI, {
      jours: 30,
      plafondMoisUsd: 30,
    })
  } finally {
    METIER_ESSAI.fermer(s)
  }
}

describe('resumerJournal', () => {
  it('la fenêtre : les demandes du jour seulement, rien après', () => {
    const r = resumeDu('2026-10-10')
    expect(r.fenetre).toEqual({ du: '2026-10-10', au: '2026-10-10' })
    expect(r.demandes.every((d) => d.jour === '2026-10-10')).toBe(true)
    const sortes = r.demandes.map((d) => d.devenue.sorte)
    expect(sortes).toEqual([
      'demande_nouvelle',
      'demande_nouvelle',
      'geste',
      'je_ne_sais_pas',
      'refus',
      'demande_nouvelle',
    ])
    expect(JSON.stringify(r)).not.toContain('E-20261011')
  })

  it('les comptes sur 30 jours, jusqu’à la date seulement', () => {
    const r = resumeDu('2026-10-10')
    expect(r.comptes.par_intention.find((i) => i.intention === 'heures_par_agent')).toMatchObject({
      echappees: 4,
      reponses_ok: 4,
    })
    expect(r.comptes.par_intention.find((i) => i.intention === 'simuler_absence')?.echappees).toBe(
      2,
    )
    expect(r.comptes.abandons_par_motif).toEqual([{ motif: 'plafond de tours atteint', fois: 1 }])
    expect(r.comptes.par_geste).toEqual([{ geste: 'voir_planning', fois: 1, refus: 0 }])
    expect(r.comptes.je_ne_sais_pas).toBe(1)
    expect(r.comptes.refus).toBe(1)
    expect(r.comptes.precisions).toBe(1)
    // Les appels du 9 et du 10 (sept échappées), pas celui du 11.
    expect(r.comptes.plafond).toEqual({ mois: '2026-10', usd: 0.07, plafond_usd: 30 })
  })

  it('une échappée sans consigne_modele est comptée, pas montrée', () => {
    const r = resumeDu('2026-10-09')
    expect(r.demandes).toHaveLength(4)
    expect(r.non_montrees).toBe(1)
    expect(r.demandes.filter((d) => d.consigne !== undefined)).toHaveLength(3)
  })

  it('un geste : paramètres sans valeur de personne ni texte libre', () => {
    const geste = resumeDu('2026-10-10').demandes.find((d) => d.devenue.sorte === 'geste')
    expect(geste?.devenue).toEqual({
      sorte: 'geste',
      geste: 'voir_planning',
      parametres: { agent: '<personne>', du: '2026-10-11', au: '2026-10-11', note: '<personne>' },
    })
    expect(geste?.consigne).toBeUndefined()
  })

  it('un « je ne sais pas » : la consigne masquée comme l’échappée la masquerait', () => {
    const jnsp = resumeDu('2026-10-10').demandes.find((d) => d.devenue.sorte === 'je_ne_sais_pas')
    expect(jnsp?.consigne).toBe('Envoie la paie à A-1')
  })

  it('aucun nom, aucun résultat de requête, aucun texte montré, aucun instantané', () => {
    for (const j of ['2026-10-09', '2026-10-10']) {
      const texte = JSON.stringify(resumeDu(j))
      expect(fuites(texte, PERSONNES_ESSAI)).toEqual([])
      expect(texte).not.toContain(SECRETS_ESSAI.resultat)
      expect(texte).not.toContain('24 heures')
      expect(texte).not.toContain(SECRETS_ESSAI.instantane)
      expect(texte).not.toContain('Bastion')
    }
  })

  it('un motif d’abandon : la catégorie du code, jamais le texte du modèle', () => {
    expect(categorieAbandon('le modèle est injoignable : 524')).toBe('le modèle est injoignable')
    expect(categorieAbandon('A-1 n’a pas de vacation, je ne peux rien proposer')).toBe(
      MOTIF_DU_MODELE,
    )
    expect(categorieAbandon(undefined)).toBe(MOTIF_DU_MODELE)
  })
})
