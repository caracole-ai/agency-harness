import { fileURLToPath } from 'node:url'
import {
  copieClient,
  creerCopie,
  fuites,
  type Identite,
  masquerTables,
  type TableCopie,
} from '@harnais/moteur'
import { describe, expect, it } from 'vitest'
import { CONVERSATION } from './conversation'
import { projetsDe, tablesPour } from './copie'
import { NOMS_TABLES } from './modele'

// La copie par capacité, prouvée sur les tables rendues (PLAN-METIER-2.md
// § 7.4) : tout pour le dirigeant et la PO ; le commerce sans le temps ni les
// coûts ; soi-même sans un montant ni le temps d'autrui. Puis le masque : la
// copie qui part au modèle ne porte aucun nom de `noms(s)`.

const exemple = fileURLToPath(new URL('../../../../exemples/agence-web-fictive', import.meta.url))
const s = CONVERSATION.ouvrir(copieClient(exemple))
const qui = (role: string, personne: string): Identite => ({ role, personne })
const DIRIGEANT = qui('dirigeant', 'M-01')
const COMMERCIALE = qui('commercial', 'M-02')
const PO = qui('po', 'M-03')
const GRAPHISTE = qui('graphiste', 'M-04')
const DEVELOPPEUR = qui('developpeur', 'M-05')

const noms = (tables: TableCopie[]) => tables.map((t) => t.nom)
const colonnes = (tables: TableCopie[]) => tables.flatMap((t) => t.colonnes.map((c) => c.nom))
const table = (tables: TableCopie[], nom: string) => {
  const t = tables.find((x) => x.nom === nom)
  if (!t) throw new Error(`pas de table ${nom}`)
  return t
}

describe('tout : le dirigeant et la PO', () => {
  it.each([DIRIGEANT, PO])(
    '$role voit les vingt tables, coûts et temps de tous compris',
    (identite) => {
      const tables = tablesPour(s, identite)
      expect(noms(tables)).toEqual(NOMS_TABLES)
      expect(colonnes(tables)).toContain('cout_journalier_eur')
      expect(table(tables, 'temps').lignes).toHaveLength(s.ctx.temps.length)
      expect(table(tables, 'personnes').lignes).toHaveLength(6)
    },
  )
  it('chaque montant est en euros à deux décimales', () => {
    const tables = tablesPour(s, DIRIGEANT)
    const eur = tables.flatMap((t) => t.colonnes).filter((c) => c.nom.endsWith('_eur'))
    expect(eur.length).toBeGreaterThan(8)
    for (const c of eur) expect(c).toMatchObject({ type: 'REAL', decimales: 2 })
  })
})

describe('le commerce : la commerciale', () => {
  const tables = tablesPour(s, COMMERCIALE)
  it('onze tables et les heures TMA par mois, ni le temps ni les personnes de l’agence', () => {
    expect(noms(tables)).toEqual([
      'clients',
      'contacts',
      'projets',
      'lots',
      'devis',
      'avenants',
      'factures',
      'paiements',
      'relances',
      'contrats_tma',
      'domaines',
      'heures_tma_par_mois',
    ])
    expect(noms(tables)).not.toContain('temps')
    expect(noms(tables)).not.toContain('personnes')
  })
  it('ni coût journalier, ni TJM, ni la PO des projets, ni les jours des lots', () => {
    expect(colonnes(tables)).not.toContain('cout_journalier_eur')
    expect(colonnes(tables)).not.toContain('tjm_vente_eur')
    expect(table(tables, 'projets').colonnes.map((c) => c.nom)).not.toContain('po')
    expect(table(tables, 'lots').colonnes.map((c) => c.nom)).not.toContain('jours_vendus')
    for (const l of table(tables, 'projets').lignes) expect(Object.keys(l)).not.toContain('po')
  })
  it('l’avancement des projets et les heures TMA consommées (entretien § 10), sans personne', () => {
    const projets = table(tables, 'projets')
    expect(projets.colonnes.at(-1)).toMatchObject({ nom: 'avancement', type: 'REAL' })
    const avancement = (id: string) => projets.lignes.find((p) => p.id === id)?.avancement
    // PRJ-12 : 18 jours consommés sur 29 vendus (le geste etat_projet de la PO le dit aussi)
    expect(avancement('PRJ-12')).toBeCloseTo(18 / 29, 9)
    const heures = table(tables, 'heures_tma_par_mois')
    expect(heures.colonnes.map((c) => c.nom)).toEqual(['contrat', 'mois', 'heures'])
    const de = (contrat: string, mois: string) =>
      heures.lignes.find((l) => l.contrat === contrat && l.mois === mois)?.heures
    // TMA-02, le cabinet d'avocats : 3,5 h le 08/09/2026, 1,5 h le 06/10/2026 (temps.csv)
    expect(de('TMA-02', '2026-09')).toBe(3.5)
    expect(de('TMA-02', '2026-10')).toBe(1.5)
    expect(de('TMA-01', '2026-10')).toBe(1.5)
    expect(colonnes(tables)).not.toContain('personne')
  })
})

describe('soi-même : le graphiste et le développeur', () => {
  it.each([GRAPHISTE, DEVELOPPEUR, qui('developpeur', 'M-06')])(
    '$role $personne : aucune colonne en euros, ni le temps, ni les tickets, ni les accès d’autrui',
    (identite) => {
      const tables = tablesPour(s, identite)
      expect(noms(tables)).toEqual([
        'tickets',
        'temps',
        'projets',
        'acces',
        'depots',
        'sauvegardes',
        'versions',
      ])
      expect(colonnes(tables).filter((c) => c.endsWith('_eur'))).toEqual([])
      const temps = table(tables, 'temps').lignes
      expect(temps.length).toBeGreaterThan(0)
      expect(temps.every((t) => t.personne === identite.personne)).toBe(true)
      expect(table(tables, 'tickets').lignes.every((t) => t.assigne === identite.personne)).toBe(
        true,
      )
      expect(table(tables, 'acces').lignes.every((a) => a.personne === identite.personne)).toBe(
        true,
      )
      const siens = projetsDe(s, identite.personne ?? '')
      expect(table(tables, 'projets').lignes.map((p) => p.id)).toEqual(
        [...s.ctx.projets.keys()].filter((id) => siens.has(id)),
      )
      expect(table(tables, 'depots').lignes.every((d) => siens.has(String(d.projet)))).toBe(true)
      for (const t of ['sauvegardes', 'versions']) {
        expect(table(tables, t).lignes.every((x) => siens.has(String(x.projet)))).toBe(true)
      }
    },
  )
  it('le développeur M-05 : les sauvegardes et les versions de PRJ-12 (entretien § 12, phrases 27 et 31)', () => {
    const tables = tablesPour(s, DEVELOPPEUR)
    const dePrj12 = (t: string) => table(tables, t).lignes.filter((x) => x.projet === 'PRJ-12')
    expect(dePrj12('sauvegardes').map((x) => x.date)).toEqual(['2026-07-28', '2026-09-14'])
    expect(dePrj12('versions').map((x) => [x.composant, x.version, x.fin_de_support_le])).toEqual([
      ['framework', '4.2', '2027-11-30'],
      ['langage serveur', '8.3', '2027-12-31'],
    ])
  })
  it('le temps de Julie (M-06) n’est pas dans la copie de M-05', () => {
    const temps = table(tablesPour(s, DEVELOPPEUR), 'temps').lignes
    expect(temps.some((t) => t.personne === 'M-06')).toBe(false)
    expect(s.ctx.temps.some((t) => t.personne === 'M-06')).toBe(true)
  })
  it('un rôle inconnu ne voit que lui-même, et sans personne rien (échec fermé)', () => {
    const tables = tablesPour(s, { role: 'stagiaire' })
    expect(tables.every((t) => t.lignes.length === 0)).toBe(true)
  })
})

describe('la copie masquée : ce qui part au modèle', () => {
  it.each([DIRIGEANT, PO, COMMERCIALE, GRAPHISTE, DEVELOPPEUR])(
    '$role : la copie se construit, et aucun nom de noms(s) n’y reste',
    (identite) => {
      const masquees = masquerTables(tablesPour(s, identite), CONVERSATION.noms(s))
      const copie = creerCopie(masquees)
      try {
        expect(fuites(copie.description, CONVERSATION.noms(s))).toEqual([])
        expect(fuites(JSON.stringify(masquees), CONVERSATION.noms(s))).toEqual([])
      } finally {
        copie.fermer()
      }
    },
  )
  it('les noms de domaine et les ressources des accès qui portent un client sont masqués', () => {
    const masquees = masquerTables(tablesPour(s, DIRIGEANT), CONVERSATION.noms(s))
    const ressources = table(masquees, 'acces').lignes.map((a) => a.ressource)
    expect(ressources).toContain('DOM-11')
    expect(ressources).toContain('passerelle de paiement de DOM-11')
    expect(JSON.stringify(masquees)).not.toMatch(/orsini/i)
    expect(table(masquees, 'domaines').lignes.map((d) => d.nom)).toEqual([...s.ctx.domaines.keys()])
    expect(table(masquees, 'clients').lignes.map((c) => c.nom)).toEqual([...s.ctx.clients.keys()])
  })
})
