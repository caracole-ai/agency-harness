import type { Registre } from '../regles/schema'
import type { Constat } from '../regles/verdict'
import { dateFr, type Temporal } from '../temps/temporal'
import type { Alerte } from './veiller'

// Le rapport de veille, pour celui qui tient le planning chez le client. Il
// ne parle que de ses agents, de ses vacations et des textes : rien sur la
// fabrication du harnais (relectures, veille des textes), qui ne le regarde pas.

export interface EntreeRapport {
  client: string
  aujourdhui: Temporal.PlainDate
  registre: Registre
  /** Ce qui a été lu : « 12 agents, 5 postes, 40 vacations ». */
  lu: string
  constats: Constat[]
  alertes: Alerte[]
  /** Les règles vérifiées, et ce que certaines ne vérifient pas encore. */
  perimetre: { regle: string; nonCouvert?: string[] }[]
  /** Une ligne lisible pour un objet : la vacation, l'agent, le titre. */
  decrire(objet: string): string
}

const fr = dateFr

function parObjet<T extends { objet: string }>(items: T[]): Map<string, T[]> {
  const groupes = new Map<string, T[]>()
  const tries = [...items].sort((a, b) => a.objet.localeCompare(b.objet, 'fr', { numeric: true }))
  for (const i of tries) groupes.set(i.objet, [...(groupes.get(i.objet) ?? []), i])
  return groupes
}

export function rendreRapport(e: EntreeRapport): string {
  const source = (regle: string) => {
    const interdit = e.registre.interdits.find((i) => i.id === regle)
    const reference = interdit?.lectures?.find((l) => l.reference)
    return `${interdit?.source ?? ''}${reference ? ` ; décide : ${reference.source}` : ''}`
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
        `  - ${c.regle} — ${c.motif}.`,
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
    `Lu : ${e.lu}. Règles vérifiées : ${e.perimetre.map((p) => p.regle).join(', ')}.`,
    ...nonCouverts.map((p) => `Pas encore vérifié pour ${p.regle} : ${p.nonCouvert?.join(' ; ')}.`),
    '',
    ...section(
      `À corriger (${refus.length})`,
      constats(refus),
      'Aucune vacation contraire à une règle.',
    ),
    ...section(
      `À décider par l'exploitation (${aDecider.length})`,
      constats(aDecider),
      'Rien à décider.',
    ),
    ...section(
      `Conforme, à noter (${aNoter.length})`,
      constats(aNoter).map((l) =>
        l.replace(/^ {2}- (I-\d{2}) — conforme\./, '  - $1 — conforme à la règle de référence.'),
      ),
      'Rien à noter.',
    ),
    ...section(
      `Échéances à traiter maintenant (${escalades.length})`,
      echeances(escalades),
      'Aucune.',
    ),
    ...section(`Échéances à préparer (${alertes.length})`, echeances(alertes), 'Aucune.'),
    ...section(
      'Sources',
      [...new Set([...e.constats, ...e.alertes].map((x) => x.regle))]
        .sort()
        .map((r) => `- ${r} : ${source(r)}`),
      '—',
    ),
  ].join('\n')
}
