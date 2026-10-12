import { type Designable, normaliserNom, type TypeParametreDeclare } from '@harnais/moteur'
import type { Session } from './conversation'
import { IDENTIFIANTS } from './modele'

// Les types de paramètre de l'agence web (PLAN-METIER-2.md § 3.3, M5) :
// `personne` (une personne de l'agence, résolue comme dans les gestes codés)
// et six entités que le métier résout lui-même. À l'oral on dit le nom du
// client (« le site de la boulangerie », entretien § 5, question 24) ; dans
// les outils, l'identifiant. Une entité se résout donc dans cet ordre :
// l'identifiant exact ; sinon le nom exact, insensible à la casse et aux
// accents ; sinon tous les candidats qui partagent le plus de mots avec la
// mention. Le geste décide : un seul candidat, il le prend ; plusieurs, il
// répond « lequel ? » avec leurs identifiants. Les mêmes fonctions servent
// aux gestes codés (`actions.ts`), sur les entités que le rôle voit.

export const SORTES_ENTITE = ['projet', 'client', 'ticket', 'lot', 'facture', 'devis'] as const
export type SorteEntite = (typeof SORTES_ENTITE)[number]

/** Une entité telle qu'une mention la désigne : son identifiant, son libellé, les noms qui la désignent, les identifiants qui lui sont liés. */
export interface Entite {
  id: string
  libelle: string
  /** Son nom, et pour ce qui appartient à un client, le nom et le secteur du client. */
  noms: string[]
  /** Son identifiant et ceux de ce qui la contient (projet, lot, client). */
  ids: string[]
}

/** Tout identifiant de l'agence (M17) cité dans un texte. */
const IDENTIFIANT = new RegExp(
  `\\b(?:${Object.values(IDENTIFIANTS)
    .map((r) => r.source.replace(/^\^|\$$/g, ''))
    .join('|')})\\b`,
  'gi',
)

/** Un mot qui compte pour désigner : quatre lettres au moins (ni « le », ni « des », ni « site » coupé). */
const MOT = /\p{L}{4,}/gu

const motsDe = (texte: string) => new Set(normaliserNom(texte).match(MOT) ?? [])
const idsDe = (texte: string) =>
  new Set((texte.match(IDENTIFIANT) ?? []).map((i) => i.toUpperCase()))

const definis = (...v: (string | undefined)[]) => v.filter((x): x is string => x !== undefined)

/** Les noms d'un client qui désignent ce qui lui appartient : son nom et son secteur. */
function nomsDuClient(s: Session, client: string | undefined): string[] {
  const c = client === undefined ? undefined : s.ctx.clients.get(client)
  return c ? definis(c.nom, c.secteur) : []
}

/** Les entités d'une sorte, dans l'ordre des fichiers. */
export function entites(s: Session, sorte: SorteEntite): Entite[] {
  const ctx = s.ctx
  switch (sorte) {
    case 'projet':
      return [...ctx.projets.values()].map((p) => ({
        id: p.id,
        libelle: p.nom,
        noms: [p.nom, ...nomsDuClient(s, p.client)],
        ids: definis(p.id, p.client),
      }))
    case 'client':
      return [...ctx.clients.values()].map((c) => ({
        id: c.id,
        libelle: c.nom,
        noms: definis(c.nom, c.secteur),
        ids: [c.id],
      }))
    case 'ticket':
      return [...ctx.tickets.values()].map((t) => ({
        id: t.cle,
        libelle: t.resume,
        noms: [t.resume],
        ids: definis(t.cle, t.projet, t.lot, t.contrat_tma),
      }))
    case 'lot':
      return [...ctx.lots.values()].map((l) => ({
        id: l.id,
        libelle: l.nom,
        noms: [l.nom],
        ids: [l.id, l.projet],
      }))
    case 'facture':
      return [...ctx.factures.values()].map((f) => ({
        id: f.id,
        libelle: f.id,
        noms: nomsDuClient(s, f.client),
        ids: definis(f.id, f.client, f.projet, f.lot),
      }))
    case 'devis':
      return [...ctx.devis.values()].map((d) => ({
        id: d.id,
        libelle: d.id,
        noms: nomsDuClient(s, d.client),
        ids: definis(d.id, d.client, d.projet),
      }))
  }
}

/**
 * Les entités qu'une mention désigne, parmi `parmi` : l'identifiant exact ;
 * sinon celles dont un nom est la mention (casse et accents près) ; sinon
 * celles qui partagent le plus de mots (et d'identifiants) avec elle. Vide :
 * aucune ne ressemble.
 */
export function resoudreEntite(mention: string, parmi: Entite[]): Entite[] {
  const m = mention.trim()
  const exacte = parmi.filter((e) => e.id.toUpperCase() === m.toUpperCase())
  if (exacte.length > 0) return exacte
  const nom = normaliserNom(m)
  const memeNom = parmi.filter((e) => e.noms.some((n) => normaliserNom(n) === nom))
  if (memeNom.length > 0) return memeNom
  const mots = motsDe(m)
  const ids = idsDe(m)
  const scores = parmi.map((e) => {
    const siens = motsDe(e.noms.join(' '))
    return {
      e,
      score: [...mots].filter((x) => siens.has(x)).length + e.ids.filter((i) => ids.has(i)).length,
    }
  })
  const meilleur = Math.max(0, ...scores.map((x) => x.score))
  return meilleur === 0 ? [] : scores.filter((x) => x.score === meilleur).map((x) => x.e)
}

/** Une entité vue comme un nom que le code connaît : ce n'est pas une personne. */
const designable = (e: Entite): Designable => ({ id: e.id, nom: e.libelle, sorte: 'organisation' })

const entite = (sorte: SorteEntite, enMots: string): TypeParametreDeclare => ({
  nom: sorte,
  enMots,
  sorte: 'entite',
  // Le moteur passe la session du métier sans la connaître (PLAN-METIER-2.md § 3.3).
  resoudre: (mention, s) => resoudreEntite(mention, entites(s as Session, sorte)).map(designable),
})

export const TYPES_PARAMETRE: TypeParametreDeclare[] = [
  {
    nom: 'personne',
    enMots:
      "une personne de l'agence nommée dans la demande, ou null pour celui qui parle ; liée par son identifiant (personnes.id)",
    sorte: 'personne',
  },
  entite(
    'projet',
    'un projet tel que la demande le nomme (identifiant, nom, ou nom de son client) ; lié par projets.id',
  ),
  entite(
    'client',
    'un client tel que la demande le nomme (identifiant, nom, secteur) ; lié par clients.id',
  ),
  entite(
    'ticket',
    'un ticket tel que la demande le nomme (clé TK-…, ou son résumé) ; lié par tickets.cle',
  ),
  entite(
    'lot',
    'un lot tel que la demande le nomme (identifiant, ou nom et projet) ; lié par lots.id',
  ),
  entite('facture', 'une facture (FAC-…, ou le client) ; liée par factures.id'),
  entite('devis', 'un devis (DEV-…, ou le client) ; lié par devis.id'),
]
