import { actionsDe, type Role } from '../conversation/actions'
import type { ConfigConversation } from '../conversation/config'
import { avecSession, type MetierConversation } from '../conversation/conversation'
import { CONTROLE_OK } from '../echappee/boucle'
import { citations, contient } from '../echappee/reponse'
import type { Modele } from '../modele/modele'
import type { IdentiteVerifiee } from '../personnes/personnes'
import { aParis, type Temporal } from '../temps/temporal'
import type { FichierTraduire, ResultatCas } from './evals'
import { jouerCas, type TraceCas } from './traduction'

// Le rejeu d'un geste nouveau (REFLEXIONS.md, décidé le 2026-10-18 ;
// PLAN-GENERAL.md G4 : « la fidélité au texte validé est la seule preuve
// qu'on a ») : la neuvième condition du chantier. Pour chaque cas de
// traduction du geste (`consignes.yaml` du métier, écrit par
// l'implémentation), sur une copie fraîche du client des évals, une échappée
// répond à la même consigne, au même moment, comme elle répondait avant que
// le geste existe ; le geste s'exécute avec les paramètres attendus du cas ;
// chaque nombre que l'échappée cite (après son contrôle : rien hors des
// données) doit se retrouver dans ce que le geste rend. Les nombres que la
// consigne porte elle-même (« du 5 au 11 ») ne comptent pas : le geste les
// rend à sa façon, souvent en dates. Un cas dont l'échappée abandonne,
// propose, ou voit son résumé retiré n'est pas mesurable : il se dit, il ne
// compte ni pour ni contre. Le geste peut rendre plus que l'échappée, jamais
// moins. Les requêtes des échappées du client réel ne se rejouent pas ici :
// leurs dates et leurs personnes sont celles du client, pas celles de la copie.

/** Le début de l'écart d'un cas que le rejeu n'a pas pu mesurer. */
export const NON_MESURABLE = 'non mesurable'

/** La ligne qui porte le compte d'une passe de rejeu, lue par le chantier. */
export const MOTIF_REJEU = /rejeu : (\d+)\/(\d+) fidèle\(s\), (\d+) non mesurable\(s\)/

/** Un cas de traduction d'un geste, prêt à rejouer : sa consigne pour l'échappée, ses paramètres attendus pour le geste. */
export interface CasRejeu {
  id: string
  role: Role
  personne?: string
  quand: Temporal.ZonedDateTime
  consigne: string
  action: string
  params: Record<string, unknown>
}

/** Les cas de `consignes.yaml` qui attendent l'un de ces gestes : ceux que le rejeu joue. */
export function casPourGestes(fichier: FichierTraduire, gestes: string[]): CasRejeu[] {
  return fichier.cas.flatMap((c) => {
    const action = c.attendu.action
    if (action === undefined || !gestes.includes(action)) return []
    return [
      {
        id: c.id,
        role: c.role,
        ...(c.personne !== undefined ? { personne: c.personne } : {}),
        quand: aParis(c.maintenant ?? fichier.maintenant),
        consigne: c.consigne,
        action,
        params: c.attendu.params ?? {},
      },
    ]
  })
}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

const nonMesurable = (raison: string): { ecarts: string[]; issue: unknown } => ({
  ecarts: [`${NON_MESURABLE} : ${raison}`],
  issue: undefined,
})

/** Un cas que le rejeu n'a pas pu mesurer : son seul écart le dit. */
export const estNonMesurable = (r: ResultatCas): boolean =>
  r.ecarts.length === 1 && r.ecarts[0]?.startsWith(NON_MESURABLE) === true

/**
 * Un cas, sur sa copie : l'échappée répond à la consigne ; le geste s'exécute
 * avec les paramètres attendus ; chaque nombre cité par l'échappée, hors ceux
 * de la consigne, doit être dans le texte du geste.
 */
async function rejouer<S>(
  m: MetierConversation<S>,
  dossier: string,
  modele: Modele,
  identite: IdentiteVerifiee,
  c: CasRejeu,
): Promise<{ ecarts: string[]; issue: unknown }> {
  const action = actionsDe(m.actions, c.role).find((a) => a.id === c.action)
  if (!action) {
    return { ecarts: [`le geste ${c.action} n'est pas ouvert au rôle ${c.role}`], issue: undefined }
  }
  const echappee = m.echappee
  if (!echappee) return nonMesurable("le métier n'a pas d'échappée")
  return avecSession(m, dossier, identite, async (s) => {
    m.verifierIdentite(s, identite)
    const reference = await echappee(
      s,
      identite,
      `C-rejeu-${c.id}`,
      c.consigne,
      c.action,
      c.quand,
      modele,
    )
    if (reference.sorte === 'abandon') {
      return nonMesurable(`l'échappée a abandonné (${reference.motif})`)
    }
    if (reference.sorte === 'proposition') {
      return nonMesurable("l'échappée a proposé une modification, elle n'a pas répondu")
    }
    if (reference.controle !== CONTROLE_OK) {
      return nonMesurable("le contrôle a retiré le résumé de l'échappée")
    }
    const lus = action.parametres.safeParse(c.params)
    if (!lus.success) {
      return { ecarts: [`paramètres attendus illisibles par ${c.action}`], issue: reference.texte }
    }
    let texte: string
    try {
      ;({ texte } = await action.executer(s, identite, lus.data, c.quand))
    } catch (erreur) {
      return { ecarts: [`le geste a échoué : ${message(erreur)}`], issue: reference.texte }
    }
    const dansLaConsigne = new Set(citations(c.consigne, []))
    const nombres = citations(reference.texte, []).filter((n) => !dansLaConsigne.has(n))
    const manquants = nombres.filter((n) => !contient(texte, n))
    return {
      ecarts:
        manquants.length > 0
          ? [`nombres de l'échappée absents du geste : ${manquants.join(', ')}`]
          : [],
      issue: { echappee: reference.texte, geste: texte, nombres },
    }
  })
}

/** Joue le rejeu des cas, chacun sur une copie fraîche du client ; `surCas` reçoit chaque résultat et sa trace. */
export async function jouerRejeu<S>(
  m: MetierConversation<S>,
  source: string,
  cas: CasRejeu[],
  modeleDe: (config: ConfigConversation) => Modele,
  surCas?: (resultat: ResultatCas, trace: TraceCas, idModele: string) => void,
): Promise<ResultatCas[]> {
  const resultats: ResultatCas[] = []
  for (const c of cas) {
    const joue = await jouerCas(
      m,
      source,
      {
        id: c.id,
        strict: false,
        role: c.role,
        ...(c.personne !== undefined ? { personne: c.personne } : {}),
      },
      modeleDe,
      (dossier, modele, identite) => rejouer(m, dossier, modele, identite, c),
    )
    resultats.push(joue.resultat)
    surCas?.(joue.resultat, joue.trace, joue.idModele)
  }
  return resultats
}

/** Le bilan d'une passe de rejeu : les cas mesurables, fidèles ou en écart ; les autres à part. */
export interface BilanRejeu {
  fideles: number
  mesurables: number
  nonMesurables: number
  /** Les cas mesurables en écart. */
  ecarts: string[]
  coutUsd: number
  /** Aucun cas mesurable en écart : la condition est verte, même sans cas mesurable. */
  fidele: boolean
}

export function bilanRejeu(resultats: ResultatCas[]): BilanRejeu {
  const mesures = resultats.filter((r) => !estNonMesurable(r))
  const ecarts = mesures.filter((r) => r.ecarts.length > 0).map((r) => r.id)
  return {
    fideles: mesures.length - ecarts.length,
    mesurables: mesures.length,
    nonMesurables: resultats.length - mesures.length,
    ecarts,
    coutUsd: Math.round(resultats.reduce((s, r) => s + r.coutUsd, 0) * 1_000_000) / 1_000_000,
    fidele: ecarts.length === 0,
  }
}

/** La ligne du compte, telle que `MOTIF_REJEU` la lit. */
export const ligneRejeu = (b: BilanRejeu): string =>
  `rejeu : ${b.fideles}/${b.mesurables} fidèle(s), ${b.nonMesurables} non mesurable(s), coût ${b.coutUsd.toFixed(4)} $${b.ecarts.length > 0 ? ` ; en écart : ${b.ecarts.join(', ')}` : ''}`
