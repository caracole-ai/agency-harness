import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ConfigClient } from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ConfigAgenceWeb } from './config'
import { NOMS_TABLES } from './modele'

// La config d'un client de l'agence web (PLAN-METIER-2.md § 7.1) : celle du
// client fictif arrive au lot 2b ; celle-ci est écrite pour le test.

const EXEMPLE = `
client: agence web d'exemple
metier: agence-web
donnees:
${NOMS_TABLES.map((t) => `  ${t}: ${t}.csv`).join('\n')}
journal: journal.sqlite
seuils:
  forfait_alerte: 0.9
  forfait_refus: 1.1
  tma_alerte: 0.8
  facture_alerte: 1
  delegation_eur_ht: 5000
  remise_max: 0.1
  heures_par_jour: 7
veiller:
  echeances:
    facture_echeance: { alerter: { jours: 1 }, preparation: { jours: 1 } }
    fin_garantie: { alerter: { mois: 1 }, preparation: { jours: 7 } }
    fin_tma: { alerter: { mois: 1 }, preparation: { mois: 1 } }
    domaine: { alerter: { jours: 30 }, preparation: { jours: 7 } }
    certificat: { alerter: { jours: 30 }, preparation: { jours: 7 } }
    fin_support: { alerter: { mois: 6 }, preparation: { mois: 1 } }
    attestation_urssaf: { alerter: { mois: 1 }, preparation: { jours: 7 } }
    pv_non_signe: { alerter: { jours: 15 }, preparation: { jours: 1 } }
    devis_sans_reponse: { alerter: { jours: 10 }, preparation: { jours: 1 } }
  delais:
    relance_facture: { jours: 1 }
    pv_non_signe: { jours: 15 }
    devis_sans_reponse: { jours: 10 }
`

const exemple = () => parse(EXEMPLE) as Record<string, Record<string, unknown>>
const securite = fileURLToPath(
  new URL('../../../../exemples/client-fictif/config.yaml', import.meta.url),
)

describe('config de l’agence web', () => {
  it('lit une config complète, compatible avec ConfigClient', () => {
    const config = ConfigAgenceWeb.parse(exemple())
    const commune: ConfigClient = config
    expect(commune.metier).toBe('agence-web')
    expect(config.seuils.heures_par_jour).toBe(7)
    expect(Object.keys(config.donnees)).toEqual(NOMS_TABLES)
  })

  it('accepte la section « conversation » du moteur, celle du client fictif de la sécurité', () => {
    const { conversation } = parse(readFileSync(securite, 'utf8')) as { conversation: unknown }
    expect(ConfigAgenceWeb.safeParse({ ...exemple(), conversation }).success).toBe(true)
  })

  it('refuse une clé inconnue, à la racine comme dans une section', () => {
    expect(ConfigAgenceWeb.safeParse({ ...exemple(), inconnue: 1 }).success).toBe(false)
    const c = exemple()
    c.seuils = { ...c.seuils, marge_min: 0.2 }
    expect(ConfigAgenceWeb.safeParse(c).success).toBe(false)
  })

  it('refuse une config sans heures par jour ou sans une échéance', () => {
    const c = exemple()
    delete c.seuils?.heures_par_jour
    expect(ConfigAgenceWeb.safeParse(c).success).toBe(false)
    const d = exemple()
    const veiller = d.veiller as { echeances: Record<string, unknown> }
    delete veiller.echeances.certificat
    expect(ConfigAgenceWeb.safeParse(d).success).toBe(false)
  })

  it('refuse un autre métier', () => {
    expect(ConfigAgenceWeb.safeParse({ ...exemple(), metier: 'securite-privee' }).success).toBe(
      false,
    )
  })
})
