import {
  type Alerte,
  type Constat,
  executer,
  NIVEAUX,
  type Registre,
  type Scenario,
  Temporal,
  VERDICTS,
  veiller,
} from '@harnais/moteur'
import { z } from 'zod'
import type { ConfigAgenceWeb } from './config'
import { CONTROLES, type ContexteVeille } from './controles'
import { echeancesAgenceWeb } from './echeances'
import { colonnes, contexte, NOMS_TABLES, TABLES, type Table, type Tables } from './modele'

// Les `cas` des scénarios T-xx de l'agence web (PLAN-METIER-2.md M15, § 7.4),
// sur le modèle de la sécurité : la date du jour, des lignes des tables du
// § 7.2 (celles dont le cas a besoin, une table absente est vide), et ce qui
// est attendu (des verdicts, des alertes d'échéance, ou les deux). Une ligne
// s'écrit comme dans l'export : une colonne absente est une cellule vide.

const Attendu = z.object({
  regle: z.string().regex(/^I-\d{2}$/),
  objet: z.string(),
  verdict: z.enum(VERDICTS),
})

const AlerteAttendue = z.object({
  regle: z.string().regex(/^I-\d{2}$/),
  objet: z.string(),
  niveau: z.enum(NIVEAUX),
})

const Cellule = z.union([z.string(), z.number()])
const Lignes = z.array(z.record(z.string(), Cellule))

const Cas = z
  .strictObject({
    aujourdhui: z.iso.date(),
    attendu: z.array(Attendu).default([]),
    alertes: z.array(AlerteAttendue).default([]),
    ...Object.fromEntries(NOMS_TABLES.map((t) => [t, Lignes.optional()])),
  })
  .refine((c) => c.attendu.length + c.alertes.length > 0, {
    message: 'un cas attend au moins un verdict ou une alerte',
  })

export interface CasLu {
  aujourdhui: Temporal.PlainDate
  attendu: z.infer<typeof Attendu>[]
  alertes: z.infer<typeof AlerteAttendue>[]
  tables: Tables
}

/** Les lignes d'une table du cas, lues comme le connecteur lit un export : des cellules en texte. */
function lignes<T extends Table>(table: T, brutes: Record<string, string | number>[]): Tables[T] {
  const attendues = colonnes(table)
  return brutes.map((brute, i) => {
    const inconnues = Object.keys(brute).filter((c) => !attendues.includes(c))
    if (inconnues.length > 0)
      throw new Error(`cas, ${table} ${i + 1} : colonnes ${inconnues.join(', ')} inconnues`)
    const cellules = Object.fromEntries(
      attendues.map((c) => [c, brute[c] === undefined ? '' : String(brute[c])]),
    )
    const r = TABLES[table].safeParse(cellules)
    if (!r.success) {
      throw new Error(
        `cas, ${table} ${i + 1} : ${r.error.issues.map((x) => `${x.path.join('.')} : ${x.message}`).join(' ; ')}`,
      )
    }
    return r.data
  }) as Tables[T]
}

export function lireCas(brut: unknown): CasLu {
  const cas = Cas.parse(brut) as z.infer<typeof Cas> &
    Partial<Record<Table, Record<string, string | number>[]>>
  const tables = Object.fromEntries(NOMS_TABLES.map((t) => [t, lignes(t, cas[t] ?? [])])) as Tables
  return {
    aujourdhui: Temporal.PlainDate.from(cas.aujourdhui),
    attendu: cas.attendu,
    alertes: cas.alertes,
    tables,
  }
}

/**
 * Rejoue un scénario sous les seuils et les fenêtres d'une config : chaque
 * verdict et chaque alerte attendus sont rendus, et rien d'autre de non
 * conforme n'apparaît pour les interdits du scénario. Rend la liste des
 * écarts, vide si le scénario passe.
 */
export function rejouer(
  scenario: Scenario,
  registre: Registre,
  config: Pick<ConfigAgenceWeb, 'seuils' | 'veiller'>,
): { constats: Constat[]; alertes: Alerte[]; ecarts: string[] } {
  const cas = lireCas(scenario.cas)
  const ctx: ContexteVeille = { ...contexte(cas.tables), seuils: config.seuils }
  const enJeu = (regle: string) => scenario.interdits.includes(regle)
  const constats = executer(CONTROLES, ctx, registre).filter((c) => enJeu(c.regle))
  const alertes = veiller(echeancesAgenceWeb(ctx, config.veiller.echeances), cas.aujourdhui).filter(
    (a) => enJeu(a.regle),
  )
  const ecarts: string[] = []

  for (const a of cas.attendu) {
    const c = constats.find((x) => x.regle === a.regle && x.objet === a.objet)
    if (!c) ecarts.push(`${a.regle} ${a.objet} : aucun constat, ${a.verdict} attendu`)
    else if (c.verdict !== a.verdict) {
      ecarts.push(`${a.regle} ${a.objet} : ${c.verdict} (${c.motif}), ${a.verdict} attendu`)
    }
  }
  for (const c of constats) {
    const prevu = cas.attendu.some((a) => a.regle === c.regle && a.objet === c.objet)
    if (!prevu && c.verdict !== 'ok')
      ecarts.push(`${c.regle} ${c.objet} : ${c.verdict} inattendu (${c.motif})`)
  }

  for (const a of cas.alertes) {
    const x = alertes.find((y) => y.regle === a.regle && y.objet === a.objet)
    if (!x) ecarts.push(`${a.regle} ${a.objet} : aucune alerte, ${a.niveau} attendue`)
    else if (x.niveau !== a.niveau) {
      ecarts.push(`${a.regle} ${a.objet} : ${x.niveau} (${x.motif}), ${a.niveau} attendue`)
    }
  }
  for (const x of alertes) {
    if (!cas.alertes.some((a) => a.regle === x.regle && a.objet === x.objet))
      ecarts.push(`${x.regle} ${x.objet} : ${x.niveau} inattendue (${x.motif})`)
  }
  return { constats, alertes, ecarts }
}
