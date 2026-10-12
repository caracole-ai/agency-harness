import type { Registre } from '../regles/schema'
import type { Constat } from '../regles/verdict'
import { dateFr, type Temporal } from '../temps/temporal'
import type { Alerte } from './veiller'

// Le rapport de veille, pour celui qui tient les données chez le client. Il
// ne parle que de ses personnes, de ses objets et des textes : rien sur la
// fabrication du harnais (relectures, veille des textes), qui ne le regarde pas.
// La phrase d'une partie sans refus vient du domaine du métier (PLAN-METIER-2.md M7).

/** Une section que le métier ajoute au rapport (PLAN-METIER-2.md M12), exemple : « Écarts ». */
export interface SectionRapport {
  titre: string
  lignes: string[]
}

export interface EntreeRapport {
  client: string
  aujourdhui: Temporal.PlainDate
  registre: Registre
  /** Ce qui a été lu, exemple : « 12 agents, 5 postes, 40 vacations ». */
  lu: string
  constats: Constat[]
  alertes: Alerte[]
  /** Les règles vérifiées, et ce que certaines ne vérifient pas encore. */
  perimetre: { regle: string; nonCouvert?: string[] }[]
  /** Une ligne lisible pour un objet, exemple : la vacation, l'agent, le titre. */
  decrire(objet: string): string
  /** La phrase de la partie « À corriger » quand elle est vide : `domaine.rienASignaler`. */
  rienASignaler: string
  /** Les sections du métier, rendues après « Sources » dans cet ordre ; absentes, le rapport est inchangé. */
  sections?: SectionRapport[]
}

const fr = dateFr

/** Les parties du rapport, dans l'ordre ; leur titre porte un compte, sauf les sources. */
export const PARTIES = {
  refus: 'À corriger',
  aDecider: "À décider par l'exploitation",
  aNoter: 'Conforme, à noter',
  escalades: 'Échéances à traiter maintenant',
  alertes: 'Échéances à préparer',
  sources: 'Sources',
} as const

function parObjet<T extends { objet: string }>(items: T[]): Map<string, T[]> {
  const groupes = new Map<string, T[]>()
  const tries = [...items].sort((a, b) => a.objet.localeCompare(b.objet, 'fr', { numeric: true }))
  for (const i of tries) groupes.set(i.objet, [...(groupes.get(i.objet) ?? []), i])
  return groupes
}

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function rendreRapport(e: EntreeRapport): string {
  const interdit = (regle: string) => {
    const i = e.registre.interdits.find((x) => x.id === regle)
    if (!i) throw new Error(`${regle} absent du registre`)
    return i
  }
  const nom = (regle: string) => interdit(regle).nom
  const source = (regle: string) => {
    const i = interdit(regle)
    const reference = i.lectures?.find((l) => l.reference)
    return `${i.source}${reference ? ` ; décide : ${reference.source}` : ''}`
  }
  const refus = e.constats.filter((c) => c.verdict === 'refus')
  const aDecider = e.constats.filter((c) => c.verdict === 'à vérifier')
  // conforme à la règle de référence, mais un autre texte en vigueur conclut autrement
  const aNoter = e.constats.filter((c) => c.verdict === 'ok' && c.notes?.length)
  const escalades = e.alertes.filter((a) => a.niveau === 'escalade')
  const alertes = e.alertes.filter((a) => a.niveau === 'alerte')

  const constats = (liste: Constat[]) =>
    [...parObjet(liste)].flatMap(([objet, cs]) => [
      `- **${e.decrire(objet)}**`,
      ...cs.flatMap((c) => [
        `  - ${majuscule(nom(c.regle))} — ${c.motif}. *${c.regle}*`,
        ...(c.notes ?? []).map((n) => `    - À noter : ${n}.`),
      ]),
    ])
  const echeances = (liste: Alerte[]) =>
    [...parObjet(liste)].flatMap(([, as]) =>
      as.map((a) => `- **${e.decrire(a.objet)}** — ${a.motif}. *${a.regle}*`),
    )
  const section = (titre: string, lignes: string[], vide: string) => [
    `## ${titre}`,
    '',
    ...(lignes.length > 0 ? lignes : [vide]),
    '',
  ]

  const nonCouverts = e.perimetre.filter((p) => p.nonCouvert?.length)
  return [
    `# Veille du ${fr(e.aujourdhui)} — ${e.client}`,
    '',
    `Lu : ${e.lu}. Vérifié : ${e.perimetre.map((p) => nom(p.regle)).join(', ')}.`,
    ...nonCouverts.map(
      (p) => `Pas encore vérifié (${nom(p.regle)}) : ${p.nonCouvert?.join(' ; ')}.`,
    ),
    '',
    ...section(`${PARTIES.refus} (${refus.length})`, constats(refus), e.rienASignaler),
    ...section(`${PARTIES.aDecider} (${aDecider.length})`, constats(aDecider), 'Rien à décider.'),
    ...section(`${PARTIES.aNoter} (${aNoter.length})`, constats(aNoter), 'Rien à noter.'),
    ...section(`${PARTIES.escalades} (${escalades.length})`, echeances(escalades), 'Aucune.'),
    ...section(`${PARTIES.alertes} (${alertes.length})`, echeances(alertes), 'Aucune.'),
    ...section(
      PARTIES.sources,
      [...new Set([...e.constats, ...e.alertes].map((x) => x.regle))]
        .sort()
        .map((r) => `- ${r} (${nom(r)}) : ${source(r)}`),
      '—',
    ),
    // une section vide se rend comme « Sources » vide : le moteur n'y met aucune phrase du métier
    ...(e.sections ?? []).flatMap((s) => section(s.titre, s.lignes, '—')),
  ].join('\n')
}
