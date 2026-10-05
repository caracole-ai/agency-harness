import type { Escalade, Interdit, Registre, Scenario } from './schema'

/** Les trois tables de la fiche tenues par le registre, et leurs en-têtes (`GRILLE.md`). */
export const TABLES = {
  interdits: '| ID | Interdit | Étape | Conséquence | Vérifiable par | Statut | Source |',
  tests: '| ID | Étant donné | Quand | Alors | Interdit | Statut | Source |',
  escalades: "| ID | Déclencheur | Étape | Qui reprend | Délai | Ce qu'on lui présente | Statut |",
} as const

export type Table = keyof typeof TABLES

const debut = (t: Table) =>
  `<!-- registre:${t} — généré depuis le registre (pnpm registre:generer), ne pas éditer à la main -->`
const fin = (t: Table) => `<!-- /registre:${t} -->`

type Qualifiee = Pick<Interdit, 'statut' | 'relu' | 'avertissement' | 'suite'>

/** Le statut tel que la fiche l'écrit : `texte` ✓ ⚠ avertissement, ou `texte` (précision). */
export function rendreStatut(q: Qualifiee): string {
  let s = `\`${q.statut}\``
  if (q.relu) s += ' ✓'
  if (q.avertissement) s += ` ⚠ ${q.avertissement}`
  if (q.suite) s += ` ${q.suite}`
  return s
}

const ligne = (cellules: string[]) => `| ${cellules.join(' | ')} |`
const etapes = (e: string[]) => e.join(', ')

function lignes(table: Table, registre: Registre): string[] {
  switch (table) {
    case 'interdits':
      return registre.interdits.map((i: Interdit) =>
        ligne([
          i.id,
          i.interdit,
          etapes(i.etapes),
          i.consequence,
          i.verifiable_par,
          rendreStatut(i),
          i.source,
        ]),
      )
    case 'tests':
      return registre.scenarios.map((s: Scenario) =>
        ligne([
          s.id,
          s.etant_donne,
          s.quand,
          s.alors,
          s.interdits.join(', '),
          rendreStatut(s),
          s.source,
        ]),
      )
    case 'escalades':
      return registre.escalades.map((e: Escalade) =>
        ligne([
          e.id,
          e.declencheur,
          etapes(e.etapes),
          e.qui,
          e.delai,
          e.presentation,
          rendreStatut(e),
        ]),
      )
  }
}

export function rendreTable(table: Table, registre: Registre): string {
  const entete = TABLES[table]
  const separateur = entete.replace(/[^|]+/g, '---')
  return [debut(table), '', entete, separateur, ...lignes(table, registre), '', fin(table)].join(
    '\n',
  )
}

/** Réécrit les tables du registre dans le texte de la fiche. Lève si un marqueur manque. */
export function regenererFiche(fiche: string, registre: Registre): string {
  let texte = fiche
  for (const table of Object.keys(TABLES) as Table[]) {
    const ouverture = `<!-- registre:${table} `
    const i = texte.indexOf(ouverture)
    const j = texte.indexOf(fin(table))
    if (i < 0 || j < i) throw new Error(`marqueurs de la table « ${table} » absents de la fiche`)
    texte = texte.slice(0, i) + rendreTable(table, registre) + texte.slice(j + fin(table).length)
  }
  return texte
}
