import {
  type Constat,
  executer,
  type Registre,
  type Scenario,
  Temporal,
  VERDICTS,
} from '@harnais/moteur'
import { z } from 'zod'
import { CONTROLES } from './controles'
import { Planning } from './modele'
import { contexte } from './semantique'

// Les `cas` des scénarios T-xx : un planning fictif, la date du jour, et les
// verdicts attendus. Le même rejeu sert aux tests et à `registre:verifier`.

const Attendu = z.object({
  regle: z.string().regex(/^I-\d{2}$/),
  objet: z.string(),
  verdict: z.enum(VERDICTS),
  /** Des extraits que les notes du constat doivent contenir (les textes signalés). */
  notes: z.array(z.string()).optional(),
})

const Cas = z.looseObject({
  aujourdhui: z.iso.date(),
  attendu: z.array(Attendu).min(1),
})

export interface CasLu {
  aujourdhui: Temporal.PlainDate
  attendu: z.infer<typeof Attendu>[]
  planning: Planning
}

export function lireCas(brut: unknown): CasLu {
  const { aujourdhui, attendu, ...reste } = Cas.parse(brut)
  return {
    aujourdhui: Temporal.PlainDate.from(aujourdhui),
    attendu,
    planning: Planning.parse(reste),
  }
}

/**
 * Rejoue un scénario : chaque verdict attendu est rendu, et aucun autre
 * constat non conforme n'apparaît pour les interdits que le scénario couvre.
 * Rend la liste des écarts, vide si le scénario passe.
 */
export function rejouer(
  scenario: Scenario,
  registre: Registre,
): { constats: Constat[]; ecarts: string[] } {
  const cas = lireCas(scenario.cas)
  const constats = executer(CONTROLES, contexte(cas.planning), registre).filter((c) =>
    scenario.interdits.includes(c.regle),
  )
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
  return { constats, ecarts }
}
