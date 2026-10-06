import { fileURLToPath } from 'node:url'
import {
  type Alerte,
  type Constat,
  chargerConfig,
  executer,
  NIVEAUX,
  type Registre,
  type Scenario,
  Temporal,
  VERDICTS,
  veiller,
} from '@harnais/moteur'
import { z } from 'zod'
import { CONTROLES } from './controles'
import { echeancesSecurite, type Fenetres, VEILLES } from './echeances'
import { Planning } from './modele'
import { contexte } from './semantique'
import { ConfigSecurite } from './veille'

// Les `cas` des scénarios T-xx : un planning fictif, la date du jour, et ce
// qui est attendu (des verdicts, des alertes d'échéance, ou les deux). Le même
// rejeu sert aux tests et à `registre:verifier`.

const Attendu = z.object({
  regle: z.string().regex(/^I-\d{2}$/),
  objet: z.string(),
  verdict: z.enum(VERDICTS),
  /** Des extraits que les notes du constat doivent contenir (les textes signalés). */
  notes: z.array(z.string()).optional(),
})

const AlerteAttendue = z.object({
  regle: z.string().regex(/^I-\d{2}$/),
  objet: z.string(),
  niveau: z.enum(NIVEAUX),
})

const Cas = z
  .looseObject({
    aujourdhui: z.iso.date(),
    attendu: z.array(Attendu).default([]),
    alertes: z.array(AlerteAttendue).default([]),
  })
  .refine((c) => c.attendu.length + c.alertes.length > 0, {
    message: 'un cas attend au moins un verdict ou une alerte',
  })

export interface CasLu {
  aujourdhui: Temporal.PlainDate
  attendu: z.infer<typeof Attendu>[]
  alertes: z.infer<typeof AlerteAttendue>[]
  planning: Planning
}

export function lireCas(brut: unknown): CasLu {
  const { aujourdhui, attendu, alertes, ...reste } = Cas.parse(brut)
  return {
    aujourdhui: Temporal.PlainDate.from(aujourdhui),
    attendu,
    alertes,
    planning: Planning.parse(reste),
  }
}

/**
 * Les fenêtres d'alerte des scénarios : celles du client fictif, lues dans sa
 * config (une seule source). Chez un vrai client, elles viennent de la sienne.
 */
export const FENETRES_SCENARIOS: Fenetres = chargerConfig(
  fileURLToPath(new URL('../../../../exemples/client-fictif/config.yaml', import.meta.url)),
  ConfigSecurite,
).veiller.echeances

/**
 * Rejoue un scénario : chaque verdict et chaque alerte attendus sont rendus,
 * et rien d'autre de non conforme n'apparaît pour les interdits du scénario.
 * Rend la liste des écarts, vide si le scénario passe.
 */
export function rejouer(
  scenario: Scenario,
  registre: Registre,
): { constats: Constat[]; alertes: Alerte[]; ecarts: string[] } {
  const cas = lireCas(scenario.cas)
  const ctx = contexte(cas.planning)
  const constats = executer(CONTROLES, ctx, registre).filter((c) =>
    scenario.interdits.includes(c.regle),
  )
  const i17 = registre.interdits.find((i) => i.id === 'I-17')
  const veilleEnJeu = VEILLES.some((v) => scenario.interdits.includes(v.regle))
  const alertes =
    veilleEnJeu && i17
      ? veiller(echeancesSecurite(ctx, FENETRES_SCENARIOS, i17, cas.aujourdhui), cas.aujourdhui)
      : []
  const ecarts: string[] = []

  for (const a of cas.attendu) {
    const c = constats.find((x) => x.regle === a.regle && x.objet === a.objet)
    if (!c) ecarts.push(`${a.regle} ${a.objet} : aucun constat, ${a.verdict} attendu`)
    else if (c.verdict !== a.verdict) {
      ecarts.push(`${a.regle} ${a.objet} : ${c.verdict} (${c.motif}), ${a.verdict} attendu`)
    }
    for (const n of a.notes ?? []) {
      if (!c?.notes?.some((x) => x.includes(n)))
        ecarts.push(`${a.regle} ${a.objet} : note « ${n} » absente`)
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
