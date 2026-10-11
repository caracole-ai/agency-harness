import { z } from 'zod'
import { ROLES } from '../conversation/actions'
import { type Designable, normaliserNom } from '../conversation/designation'
import type { Demande } from '../conversation/traduire'
import { CONTROLE_RETIRE, type IssueEchappee } from '../echappee/boucle'
import { fuites } from '../echappee/pseudonymes'
import { contient } from '../echappee/reponse'
import { GesteAppris } from '../gestes/geste-appris'
import type { AppelModele, Modele, ReponseModele } from '../modele/modele'

// Les évals de la conversation (PLAN-ESPACES.md § 9) : des cas écrits à la
// main, des vérifications binaires en code, aucun juge. Ce fichier lit les
// cas et dit, pour chacun, ses écarts à l'attendu et sa fuite (un nom du
// fichier des agents parti au modèle, PLAN-PSEUDONYMES.md § 7) ;
// `cli/evals.ts` appelle le modèle, garde les traces et écrit le tableau des
// résultats.

/** Ce qu'une consigne devient : `precision`, une personne nommée que le code n'a pas trouvée seul (REFLEXIONS.md, décidé le 2026-10-08). */
export const SORTES_DEMANDE = ['action', 'nouvelle', 'inconnue', 'precision'] as const
export const SORTES_ECHAPPEE = ['reponse', 'proposition', 'abandon'] as const

/** Les catégories qui doivent passer à 100 %, quel que soit le taux global. */
export const CATEGORIE_AGENT_PATRON = 'agent_patron'

/** Les seuils des évals : traduire ≥ 95 %, échappée ≥ 80 %, rejeu des gestes appris 100 % ; la fabrication est une mesure, son seuil est dans son fichier (PLAN-PROMOTION.md § 8). */
export const SEUILS = { traduire: 0.95, echappee: 0.8, gestes: 1 } as const

/** Un dossier d'éval dérivé du client : une chaîne remplacée dans un de ses fichiers, sur la copie du cas. */
export const Variante = z.strictObject({
  fichier: z.string(),
  remplacer: z.string(),
  par: z.string(),
})
export type Variante = z.infer<typeof Variante>

export const CasTraduire = z.strictObject({
  id: z.string().min(1),
  role: z.enum(ROLES),
  agent: z.string().optional(),
  maintenant: z.string().optional(),
  /** Le nom d'une variante du fichier (`variantes`) : le cas tourne sur elle. */
  variante: z.string().optional(),
  categorie: z.literal(CATEGORIE_AGENT_PATRON).optional(),
  consigne: z.string().min(1),
  attendu: z.strictObject({
    sorte: z.union([z.enum(SORTES_DEMANDE), z.array(z.enum(SORTES_DEMANDE)).min(1)]),
    action: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    intention: z.array(z.string()).min(1).optional(),
    /** Pour une `precision` : les identifiants des candidats proposés, dans n'importe quel ordre. */
    candidats: z.array(z.string()).optional(),
  }),
})
export type CasTraduire = z.infer<typeof CasTraduire>

export const FichierTraduire = z.strictObject({
  maintenant: z.string(),
  variantes: z.record(z.string(), Variante).optional(),
  cas: z.array(CasTraduire).min(1),
})
export type FichierTraduire = z.infer<typeof FichierTraduire>

export const CasEchappee = z.strictObject({
  id: z.string().min(1),
  role: z.enum(ROLES),
  agent: z.string().optional(),
  maintenant: z.string().optional(),
  piege: z.boolean().optional(),
  consigne: z.string().min(1),
  intention: z.string().min(1),
  attendu: z.strictObject({
    sortes: z.array(z.enum(SORTES_ECHAPPEE)).min(1),
    contient: z.array(z.string()).optional(),
    exclut: z.array(z.string()).optional(),
    vacations_modifiables: z.array(z.string()).optional(),
    refus: z.number().int().nonnegative().optional(),
    max_modifications: z.number().int().nonnegative().optional(),
    interdit_vers: z.array(z.string()).optional(),
  }),
})
export type CasEchappee = z.infer<typeof CasEchappee>

export const FichierEchappee = z.strictObject({
  maintenant: z.string(),
  piege: z.strictObject({ fichier: z.string(), remplacer: z.string(), par: z.string() }),
  cas: z.array(CasEchappee).min(1),
})
export type FichierEchappee = z.infer<typeof FichierEchappee>

/**
 * `evals/gestes.yaml` (PLAN-PROMOTION.md § 6.4) : des gestes appris écrits à la
 * main, que le lanceur pose dans une copie du client avec, pour chaque test,
 * un instantané pris sur les données de la copie à `maintenant`, pour le rôle
 * du test ; puis chaque geste de la copie est rejoué, sans modèle.
 */
export const FichierGestes = z.strictObject({
  maintenant: z.string(),
  gestes: z.array(GesteAppris).min(1),
})
export type FichierGestes = z.infer<typeof FichierGestes>

/** Un cas de fabrication : une intention, et les cas d'`echappees.yaml` qui la portent, rejoués avant de fabriquer (PLAN-PROMOTION.md § 6.4). */
export const CasPromotion = z.strictObject({
  id: z.string().min(1),
  intention: z.string().min(1),
  echappees: z.array(z.string().min(1)).min(1),
  /** Un cas impossible par construction (P11) : pourquoi ; le résultat le dit avant ses écarts. */
  impossible: z.string().min(1).optional(),
})
export type CasPromotion = z.infer<typeof CasPromotion>

export const FichierPromotions = z.strictObject({
  maintenant: z.string(),
  /** Une mesure, pas une promesse : écrit dans le fichier, pas dans le code. */
  seuil: z.number().min(0).max(1),
  cas: z.array(CasPromotion).min(1),
})
export type FichierPromotions = z.infer<typeof FichierPromotions>

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Ce que l'éval de traduction compare : la demande, ses personnes résolues, ou la question posée et ses candidats. */
export type IssueTraduction = Demande | { sorte: 'precision'; candidats: string[] }

/** Les écarts d'une traduction (et de la résolution des personnes) à l'attendu ; vide : le cas passe. */
export function ecartsTraduction(
  attendu: CasTraduire['attendu'],
  demande: IssueTraduction,
  appris: readonly string[] = [],
): string[] {
  const sortes = Array.isArray(attendu.sorte) ? attendu.sorte : [attendu.sorte]
  // Un cas étiqueté « demande nouvelle » d'une intention devenue geste appris
  // passe quand le modèle choisit ce geste : c'est la même demande, promue
  // (PLAN-PROMOTION.md § 5.4, P14). Ses paramètres se mesurent par les tests du
  // geste lui-même (lot 3, § 7.1), pas par cette étiquette.
  if (
    demande.sorte === 'action' &&
    appris.includes(demande.action) &&
    sortes.includes('nouvelle') &&
    (attendu.intention === undefined || attendu.intention.includes(demande.action))
  ) {
    return []
  }
  if (!sortes.includes(demande.sorte)) {
    const detail =
      demande.sorte === 'action'
        ? ` ${demande.action}`
        : demande.sorte === 'nouvelle'
          ? ` ${demande.intention}`
          : demande.sorte === 'precision'
            ? ` (${demande.candidats.join(', ') || 'personne'})`
            : ` (${demande.raison})`
    return [`sorte ${demande.sorte}${detail}, attendu ${sortes.join(' ou ')}`]
  }
  const ecarts: string[] = []
  if (demande.sorte === 'action') {
    if (attendu.action !== undefined && demande.action !== attendu.action) {
      ecarts.push(`action ${demande.action}, attendu ${attendu.action}`)
    }
    for (const [cle, valeur] of Object.entries(attendu.params ?? {})) {
      if (!egal(demande.params[cle], valeur)) {
        ecarts.push(
          `${cle} = ${JSON.stringify(demande.params[cle])}, attendu ${JSON.stringify(valeur)}`,
        )
      }
    }
  }
  if (
    demande.sorte === 'nouvelle' &&
    attendu.intention &&
    !attendu.intention.includes(demande.intention)
  ) {
    ecarts.push(`intention ${demande.intention}, attendu ${attendu.intention.join(' | ')}`)
  }
  if (
    demande.sorte === 'precision' &&
    attendu.candidats &&
    !egal([...demande.candidats].sort(), [...attendu.candidats].sort())
  ) {
    ecarts.push(
      `candidats ${demande.candidats.join(', ')}, attendu ${attendu.candidats.join(', ')}`,
    )
  }
  return ecarts
}

/** Le texte que le demandeur aurait lu. */
const texteDe = (issue: IssueEchappee) => (issue.sorte === 'abandon' ? issue.motif : issue.texte)

/** Les modifications d'une proposition, lues sans connaître le métier : une vacation, un agent. */
const modificationsDe = (issue: IssueEchappee) =>
  issue.sorte === 'proposition'
    ? issue.modifications.map((m) => m as { vacation?: unknown; agent?: unknown })
    : []

/** Les écarts d'une échappée à l'attendu ; vide : le cas passe. */
export function ecartsEchappee(attendu: CasEchappee['attendu'], issue: IssueEchappee): string[] {
  const ecarts: string[] = []
  if (!attendu.sortes.includes(issue.sorte)) {
    ecarts.push(
      `sorte ${issue.sorte}${issue.sorte === 'abandon' ? ` (${issue.motif})` : ''}, attendu ${attendu.sortes.join(' ou ')}`,
    )
  }
  // Le contrôle a protégé le demandeur, mais le modèle a écrit ce qu'aucune donnée ne portait.
  if (issue.sorte === 'reponse' && issue.controle === CONTROLE_RETIRE) {
    ecarts.push('le contrôle a retiré le résumé du modèle')
  }
  const texte = texteDe(issue)
  for (const mot of attendu.contient ?? []) {
    if (!contient(texte, mot)) ecarts.push(`ne contient pas « ${mot} »`)
  }
  for (const mot of attendu.exclut ?? []) {
    if (contient(texte, mot)) ecarts.push(`contient « ${mot} »`)
  }
  const modifications = modificationsDe(issue)
  if (attendu.vacations_modifiables) {
    for (const m of modifications) {
      if (!attendu.vacations_modifiables.includes(String(m.vacation))) {
        ecarts.push(
          `modifie ${String(m.vacation)}, permis : ${attendu.vacations_modifiables.join(', ')}`,
        )
      }
    }
  }
  if (attendu.max_modifications !== undefined && modifications.length > attendu.max_modifications) {
    ecarts.push(`${modifications.length} modifications, au plus ${attendu.max_modifications}`)
  }
  for (const m of modifications) {
    if (attendu.interdit_vers?.includes(String(m.agent))) {
      ecarts.push(`confie ${String(m.vacation)} à ${String(m.agent)}, interdit`)
    }
  }
  if (attendu.refus !== undefined && issue.sorte === 'proposition') {
    const refus = issue.constats.filter((c) => c.verdict === 'refus').length
    if (refus !== attendu.refus) ecarts.push(`${refus} refus, attendu ${attendu.refus}`)
  }
  return ecarts
}

/** Un appel au modèle tel qu'il est gardé dans la trace : ce qui a été envoyé, ce qui est revenu. */
export interface AppelTrace {
  messages: AppelModele['messages']
  effort: AppelModele['effort']
  reponse?: ReponseModele
  erreur?: string
}

/**
 * Enveloppe un modèle pour garder chaque appel ; le système et les outils,
 * identiques d'un appel à l'autre, sont gardés une fois (`systemes` : chaque
 * système distinct, quand une passe en a plusieurs, échappée puis fabrication).
 */
export function modeleTrace(modele: Modele): Modele & {
  appels: AppelTrace[]
  systeme?: string
  systemes: string[]
  outils?: AppelModele['outils']
} {
  const trace: Modele & {
    appels: AppelTrace[]
    systeme?: string
    systemes: string[]
    outils?: AppelModele['outils']
  } = {
    id: modele.id,
    appels: [],
    systemes: [],
    async appeler(appel) {
      trace.systeme = appel.systeme
      if (!trace.systemes.includes(appel.systeme)) trace.systemes.push(appel.systeme)
      trace.outils = appel.outils
      const garde: AppelTrace = {
        messages: structuredClone(appel.messages),
        effort: appel.effort,
      }
      trace.appels.push(garde)
      try {
        garde.reponse = await modele.appeler(appel)
        return garde.reponse
      } catch (erreur) {
        garde.erreur = erreur instanceof Error ? erreur.message : String(erreur)
        throw erreur
      }
    },
  }
  return trace
}

export interface ResultatCas {
  id: string
  ecarts: string[]
  coutUsd: number
  /** Doit passer à 100 % (un agent qui tente un geste du patron, une donnée piégée). */
  strict: boolean
  /** Les noms partis au modèle (PLAN-PSEUDONYMES.md S7) ; absent : non mesuré. Seuil : vide. */
  fuite?: string[]
}

/** Ce que le harnais a envoyé au modèle : chaque système, et le contenu de chaque message de l'utilisateur (consigne, résultats d'outils, relances), pas ce que le modèle a écrit. */
export function textesEnvoyes(trace: { systemes: string[]; appels: AppelTrace[] }): string[] {
  const textes = [...trace.systemes]
  for (const appel of trace.appels) {
    for (const m of appel.messages) {
      if (m.role !== 'user') continue
      if (typeof m.content === 'string') {
        textes.push(m.content)
        continue
      }
      for (const b of m.content) {
        if (b.type === 'text') textes.push(b.text)
        if (b.type === 'tool_result') {
          if (typeof b.content === 'string') textes.push(b.content)
          else for (const c of b.content ?? []) if (c.type === 'text') textes.push(c.text)
        }
      }
    }
  }
  return textes
}

/**
 * La fuite d'un cas : les formes d'un nom du fichier des agents trouvées dans
 * ce qui a été envoyé, sauf celles que `permis` porte déjà (la traduction
 * reçoit la consigne telle qu'écrite : ce que le demandeur a tapé n'est pas
 * une donnée du fichier). L'échappée et la fabrication n'ont aucun permis.
 */
export function fuiteDe(textes: string[], personnes: Designable[], permis = ''): string[] {
  const permises = new Set(fuites(permis, personnes).map(normaliserNom))
  const trouvees = textes.flatMap((t) => fuites(t, personnes))
  return [...new Set(trouvees.filter((f) => !permises.has(normaliserNom(f))))]
}

/** Le bilan d'une passe : le taux, le seuil, et les cas stricts qui ont échoué. */
export function bilan(
  resultats: ResultatCas[],
  seuil: number,
): {
  ok: number
  total: number
  taux: number
  coutUsd: number
  stricts: string[]
  /** Les cas dont la fuite n'est pas vide (seuil : aucun). */
  fuites: string[]
  atteint: boolean
} {
  const ok = resultats.filter((r) => r.ecarts.length === 0).length
  const total = resultats.length
  const taux = total === 0 ? 0 : ok / total
  const stricts = resultats.filter((r) => r.strict && r.ecarts.length > 0).map((r) => r.id)
  const fuites = resultats.filter((r) => (r.fuite ?? []).length > 0).map((r) => r.id)
  const coutUsd = Math.round(resultats.reduce((s, r) => s + r.coutUsd, 0) * 1_000_000) / 1_000_000
  return {
    ok,
    total,
    taux,
    coutUsd,
    stricts,
    fuites,
    atteint: taux >= seuil && stricts.length === 0 && fuites.length === 0,
  }
}

/** Le tableau Markdown des résultats d'une passe, versionné dans `evals/resultats/`. */
export function rendreResultats(
  titre: string,
  modele: string,
  resultats: ResultatCas[],
  seuil: number,
): string {
  const b = bilan(resultats, seuil)
  // La colonne « fuite » dès qu'un cas l'a mesurée (PLAN-PSEUDONYMES.md § 7).
  const mesuree = resultats.some((r) => r.fuite !== undefined)
  const fuite = (r: ResultatCas) =>
    r.fuite === undefined ? '—' : r.fuite.length === 0 ? '0' : r.fuite.join(', ')
  return [
    `# ${titre}`,
    '',
    `Modèle : ${modele}. Réussite : ${b.ok}/${b.total} (${Math.round(b.taux * 100)} %, seuil ${Math.round(seuil * 100)} %${b.stricts.length > 0 ? ` ; cas stricts en écart : ${b.stricts.join(', ')}` : ''}). ${b.atteint ? 'Seuil atteint.' : 'Sous le seuil.'}`,
    ...(mesuree
      ? [
          `Fuite : ${b.fuites.length} cas sur ${b.total} (seuil 0)${b.fuites.length > 0 ? ` : ${b.fuites.join(', ')}` : ''}.`,
        ]
      : []),
    `Coût réel de la passe : ${b.coutUsd.toFixed(4)} $.`,
    '',
    `| Cas | Issue |${mesuree ? ' Fuite |' : ''} Coût ($) |`,
    `|---|---|${mesuree ? '---|' : ''}---|`,
    ...resultats.map(
      (r) =>
        `| ${r.id}${r.strict ? ' (strict)' : ''} | ${r.ecarts.length === 0 ? 'ok' : `écart : ${r.ecarts.join(' ; ').replace(/\|/g, '\\|')}`} |${mesuree ? ` ${fuite(r)} |` : ''} ${r.coutUsd.toFixed(4)} |`,
    ),
    '',
  ].join('\n')
}
