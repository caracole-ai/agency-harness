import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { schemaJson } from '../conversation/actions'
import { entreDonnees, messageConsigne } from '../conversation/traduire'
import {
  additionner,
  type Effort,
  type Modele,
  type ReponseModele,
  USAGE_NUL,
  type UsageModele,
} from '../modele/modele'
import type { Constat } from '../regles/verdict'
import type { Temporal } from '../temps/temporal'
import { verifierReponse } from './reponse'
import { type ResultatRequete, rendreResultat, rendreResultatNumerote } from './requete'
import { remplirPhrase, sansIdentifiantsRecus, sansTrous } from './trous'

// La boucle de l'échappée (espace 2) : le modèle travaille sur une copie des
// données avec cinq outils, un seul par tour, dans des bornes de tours, de
// tokens et de temps. Il finit toujours par répondre, proposer ou abandonner ;
// ce qui sort de la boucle est contrôlé par le code : une réponse est une
// phrase à trous que le code remplit depuis les résultats de requête, sans
// aucun chiffre ni identifiant retapé par le modèle (`trous.ts`) ; une
// proposition passe les règles (PLAN-ESPACES.md § 6.5).

export interface BornesEchappee {
  tours: number
  tokensSortie: number
  secondes: number
}

export const CONTROLE_OK = 'ok'
export const CONTROLE_RETIRE = 'résumé du modèle retiré'
/** Ce que le contrôle a dit d'une réponse : chaque trou s'est rempli et le modèle n'a rien retapé, ou le résumé a été retiré. */
export type ControleReponse = typeof CONTROLE_OK | typeof CONTROLE_RETIRE
/** Pourquoi un résumé est retiré, pour les traces ; le demandeur lit `MOTS_CONTROLE`. */
export const MOTIFS_RETRAIT = {
  retape: 'un nombre, une date ou un identifiant retapé hors d’un trou',
  trou: 'un trou qui ne se résout pas',
  filet: 'la phrase remplie cite une valeur absente des résultats',
} as const
/**
 * Ce que le demandeur lit sous une réponse d'échappée, selon le contrôle :
 * le code a relu les chiffres, ou il a retiré le résumé et montré les
 * tableaux (REFLEXIONS.md, décidé le 2026-10-18). Rendu par l'interface et
 * par `pnpm parler`, jamais écrit dans le `texte` lui-même.
 */
export const MOTS_CONTROLE: Record<ControleReponse, string> = {
  [CONTROLE_OK]: 'Chiffres relus par le harnais.',
  [CONTROLE_RETIRE]: 'Le modèle a avancé un chiffre absent de vos données : voici les tableaux.',
}
/** Le motif d'abandon montré quand celui du modèle cite une donnée non vérifiée. */
export const MOTIF_RETIRE = "le modèle s'est arrêté sans réponse vérifiable"

/**
 * Les motifs d'abandon écrits par le code (un préfixe, pour ceux qui portent
 * un détail) : ils se comptent par motif sans jamais lire le texte libre
 * d'un modèle (PLAN-RONDE.md R2).
 */
export const MOTIFS_ABANDON = {
  tours: 'plafond de tours atteint',
  tokens: 'plafond de tokens de sortie atteint',
  temps: 'plafond de temps atteint',
  injoignable: 'le modèle est injoignable',
  refus: 'le modèle a refusé',
  tronquee: 'réponse tronquée',
  suspendu: 'tour suspendu, non prévu',
  sans_outil: 'le modèle a fini sans répondre par un outil',
  retire: MOTIF_RETIRE,
} as const

export type IssueEchappee =
  | {
      sorte: 'reponse'
      /** Ce que le demandeur lit : la phrase remplie, ou les tableaux si le résumé est retiré. */
      texte: string
      /** La phrase à trous telle que le modèle l'a écrite, pour les traces. */
      phrase: string
      controle: ControleReponse
      /** Pourquoi le résumé est retiré (`MOTIFS_RETRAIT`, et le détail) ; absent quand il est gardé. */
      motif_controle?: string
      tours: number
      usage: UsageModele
    }
  | {
      sorte: 'proposition'
      modifications: unknown[]
      resume: string
      constats: Constat[]
      texte: string
      tours: number
      usage: UsageModele
    }
  | { sorte: 'abandon'; motif: string; tours: number; usage: UsageModele }

/** Ce que le métier fournit à la boucle : la requête sur sa copie, et le jugement d'une modification. */
export interface OutilsEchappee<Modif> {
  schemaModifications: z.ZodType<Modif[]>
  requete(sql: string): ResultatRequete | Promise<ResultatRequete>
  /** Les constats que les modifications font apparaître, et ce qui change ; lève si elles sont inapplicables. */
  verifier(modifications: Modif[]): { constats: Constat[]; description: string }
  decrire(modifications: Modif[]): string
  /** Le nom d'une règle, pour dire au modèle ce qu'une proposition enfreint. */
  nomRegle(id: string): string
  /** false : le demandeur ne peut que questionner (exemple : un agent) ; `verifier` et `proposer` ne lui sont pas donnés. */
  proposer: boolean
}

/** Ce que la boucle demande de journaliser : chaque appel au modèle, chaque outil exécuté. */
export type EvenementBoucle =
  | { sorte: 'appel'; tour: number; reponse: ReponseModele }
  | {
      sorte: 'outil'
      tour: number
      nom: string
      entree: unknown
      sortie: string
      erreur?: string
    }

export const OUTIL_REQUETE = 'requete'
export const OUTIL_VERIFIER = 'verifier'
const OUTIL_REPONDRE = 'repondre'
const OUTIL_PROPOSER = 'proposer'
const OUTIL_ABANDONNER = 'abandonner'
/** Les outils qui finissent une échappée. */
const FINS = new Set([OUTIL_REPONDRE, OUTIL_PROPOSER, OUTIL_ABANDONNER])
const FIN_PAS_SEULE =
  'un outil de fin (repondre, proposer, abandonner) vient seul, après avoir lu les résultats : rappelle-le seul au tour suivant'
const SANS_OUTIL = MOTIFS_ABANDON.sans_outil
/**
 * Un modèle qui finit par du texte est relancé une fois (vu trois fois sur trois
 * passes GLM, la réponse juste dans le texte) ; au second texte, abandon.
 */
const messageRelance = (fins: string[]) =>
  `Termine par un appel d'outil (${fins.join(', ')}), jamais par du texte.`

/** La semaine du moment, du lundi au dimanche, en dates ISO : le code la calcule, le modèle ne la devine pas. */
export function semaineDe(maintenant: Temporal.ZonedDateTime): { lundi: string; dimanche: string } {
  const jour = maintenant.toPlainDate()
  const lundi = jour.subtract({ days: jour.dayOfWeek - 1 })
  return { lundi: lundi.toString(), dimanche: lundi.add({ days: 6 }).toString() }
}

/** Les sorties d'outil plus longues sont tronquées : le journal et le modèle n'en ont pas besoin de plus. */
export const SORTIE_MAX = 2000

const Requete = z.strictObject({
  sql: z.string().describe('une seule requête SQLite en lecture (SELECT ou WITH) sur les tables'),
})
/** La grammaire des trous, dite au modèle dans le système et sur l'outil `repondre`. */
export const GRAMMAIRE_TROUS =
  'Tu ne recopies jamais un nombre, une date ni un identifiant : à leur place tu écris un trou, {T2.3.heures} pour la cellule de la colonne heures à la ligne 3 du résultat T2, {T2.n} pour son nombre de lignes, et le harnais le remplit.'
const Repondre = z.strictObject({
  phrase: z
    .string()
    .describe(
      `la réponse au demandeur, à la question posée et rien de plus, non verbeuse (un total sans son détail, une liste sans son compte) ; une phrase à trous : ${GRAMMAIRE_TROUS}`,
    ),
})
const Abandonner = z.strictObject({
  motif: z.string().describe('pourquoi la demande ne peut pas être traitée, en une phrase'),
})

function schemas<Modif>(outils: OutilsEchappee<Modif>) {
  const Verifier = z.strictObject({
    modifications: outils.schemaModifications.describe('les modifications à essayer'),
  })
  const Proposer = z.strictObject({
    modifications: outils.schemaModifications.describe('les modifications proposées'),
    resume: z
      .string()
      .describe('ce que la proposition change, en une ou deux phrases, sans chiffre inventé'),
  })
  return { Verifier, Proposer }
}

/** Les cinq outils envoyés au modèle, en mode strict. */
export function outilsEchappee<Modif>(outils: OutilsEchappee<Modif>): Anthropic.Tool[] {
  const { Verifier, Proposer } = schemas(outils)
  const outil = (
    name: string,
    description: string,
    schema: z.ZodType<unknown>,
  ): Anthropic.Tool => ({
    name,
    description,
    input_schema: schemaJson(schema),
    strict: true,
  })
  return [
    outil(OUTIL_REQUETE, 'Lire les données de la copie par une requête SQL en lecture.', Requete),
    ...(outils.proposer
      ? [
          outil(
            OUTIL_VERIFIER,
            'Essayer des modifications : dit ce qui change et les règles qu’elles enfreindraient. Ne modifie rien.',
            Verifier,
          ),
        ]
      : []),
    outil(
      OUTIL_REPONDRE,
      'Finir par une réponse au demandeur, quand la demande est une question : une phrase à trous, chaque nombre et chaque identifiant pris dans un résultat de requete par un trou.',
      Repondre,
    ),
    ...(outils.proposer
      ? [
          outil(
            OUTIL_PROPOSER,
            'Finir par une proposition de modifications, que le demandeur validera ou non.',
            Proposer,
          ),
        ]
      : []),
    outil(OUTIL_ABANDONNER, 'Finir sans réponse ni proposition, en disant pourquoi.', Abandonner),
  ]
}

const tronquer = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s)
const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur))

/** Les constats en lignes, les refus d'abord. */
function lignesConstats(constats: Constat[]): string {
  if (constats.length === 0) return 'Aucune règle enfreinte.'
  return [...constats]
    .sort((a, b) => Number(b.verdict === 'refus') - Number(a.verdict === 'refus'))
    .map((c) => `${c.regle} · ${c.verdict} · ${c.objet} : ${c.motif}`)
    .join('\n')
}

export async function boucle<Modif>(
  modele: Modele,
  effort: Effort,
  systeme: string,
  consigne: string,
  intention: string,
  maintenant: Temporal.ZonedDateTime,
  outils: OutilsEchappee<Modif>,
  bornes: BornesEchappee,
  journaliser: (evenement: EvenementBoucle) => void,
  sources: string[],
  nomsConnus: string[],
): Promise<IssueEchappee> {
  const { Verifier, Proposer } = schemas(outils)
  const definitions = outilsEchappee(outils)
  const permis = new Set(definitions.map((d) => d.name))
  const { lundi, dimanche } = semaineDe(maintenant)
  const demande = `${messageConsigne(consigne, maintenant)}\nSemaine en cours : du lundi ${lundi} au dimanche ${dimanche}.\n(intention : ${intention})`
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: demande }]
  // Ce que le demandeur a écrit n'est pas inventé : ses nombres se citent. Seule la
  // consigne, pas la date du message (10, 21, 40… deviendraient citables).
  sources.push(consigne)
  // Ce que le modèle a le droit d'écrire lui-même dans sa phrase, hors des trous : ce
  // qu'il a reçu avant toute requête (la description de la copie, la consigne).
  const sourcesInitiales = [...sources]
  // Ce que le harnais a dit au modèle n'est pas inventé non plus : la date du jour et
  // les bornes de la semaine se citent comme dates (et par leur année), pas comme nombres.
  const datesConnues = [maintenant.toPlainDate().toString(), lundi, dimanche]
  let relance = false
  const debut = Date.now()
  let usage = USAGE_NUL
  let appels = 0
  /** Les tableaux des requêtes réussies, dans l'ordre : ce que le demandeur lit si le résumé du modèle est retiré. */
  const tableaux: string[] = []
  /** Les mêmes résultats, structurés : ce que les trous de la phrase désignent (`T1` est le premier). */
  const structures: ResultatRequete[] = []
  let dernierResultat: Anthropic.ToolResultBlockParam | undefined
  const abandon = (motif: string): IssueEchappee => ({
    sorte: 'abandon',
    motif,
    tours: appels,
    usage,
  })

  for (let tour = 1; ; tour++) {
    if (tour > bornes.tours) return abandon(MOTIFS_ABANDON.tours)
    if (usage.sortie >= bornes.tokensSortie) return abandon(MOTIFS_ABANDON.tokens)
    if (Date.now() - debut > bornes.secondes * 1000) return abandon(MOTIFS_ABANDON.temps)

    let reponse: ReponseModele
    try {
      reponse = await modele.appeler({
        systeme,
        messages,
        outils: definitions,
        effort,
        // Pas de plafond par appel dans le code : celui de la demande (config) borne
        // le coût ; un 4 096 codé en dur tronquait la réflexion de GLM avant `proposer`
        // (evals/erreurs-2026-10-08.md, passes 7 à 9).
        maxTokens: bornes.tokensSortie - usage.sortie,
        unSeulOutil: true,
      })
    } catch (erreur) {
      return abandon(`${MOTIFS_ABANDON.injoignable} : ${message(erreur)}`)
    }
    appels++
    usage = additionner(usage, reponse.usage)
    journaliser({ sorte: 'appel', tour, reponse })

    const m = reponse.message
    if (m.stop_reason === 'refusal') {
      return abandon(`${MOTIFS_ABANDON.refus} (${m.stop_details?.category ?? '?'})`)
    }
    if (m.stop_reason === 'max_tokens') return abandon(MOTIFS_ABANDON.tronquee)
    if (m.stop_reason === 'pause_turn') return abandon(MOTIFS_ABANDON.suspendu)
    // Un fournisseur peut ignorer « un seul outil par tour » : chaque appel reçoit
    // son résultat, tous dans un seul message, sinon la conversation est invalide.
    const blocs = m.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (blocs.length === 0) {
      if (relance || m.content.length === 0) return abandon(SANS_OUTIL)
      relance = true
      messages.push({ role: 'assistant', content: m.content })
      messages.push({
        role: 'user',
        content: messageRelance(definitions.map((d) => d.name).filter((n) => FINS.has(n))),
      })
      continue
    }
    // La réponse revient telle quelle : le modèle lie sa réflexion à la conversation.
    messages.push({ role: 'assistant', content: m.content })
    const resultats: Anthropic.ToolResultBlockParam[] = []

    for (const bloc of blocs) {
      /** Rend le résultat d'un outil au modèle. */
      const resultat = (sortie: string, erreur?: string) => {
        journaliser({
          sorte: 'outil',
          tour,
          nom: bloc.name,
          entree: bloc.input,
          sortie: tronquer(sortie, SORTIE_MAX),
          ...(erreur !== undefined ? { erreur } : {}),
        })
        resultats.push({
          type: 'tool_result',
          tool_use_id: bloc.id,
          content: sortie,
          ...(erreur !== undefined ? { is_error: true } : {}),
        })
      }
      // Un outil de fin vient seul, après lecture des résultats : sinon il n'est pas une fin.
      if (FINS.has(bloc.name) && blocs.length > 1) {
        resultat(FIN_PAS_SEULE, FIN_PAS_SEULE)
        continue
      }
      const invalide = (erreur: z.ZodError) => {
        const texte = `entrée invalide : ${z.prettifyError(erreur)}`
        resultat(texte, texte)
      }

      switch (permis.has(bloc.name) ? bloc.name : undefined) {
        case OUTIL_REQUETE: {
          const e = Requete.safeParse(bloc.input)
          if (!e.success) {
            invalide(e.error)
            break
          }
          const r = await outils.requete(e.data.sql)
          const complet = rendreResultat(r)
          const rendu = tronquer(complet, SORTIE_MAX)
          const sortie = entreDonnees(rendu)
          if ('erreur' in r) {
            resultat(sortie, r.erreur)
          } else {
            // Les sources du contrôle gardent le tableau tel que le demandeur le lit : le
            // nom du résultat et les numéros de ligne, dits au modèle, ne s'y citent pas.
            sources.push(sortie)
            // Le nombre de lignes d'un résultat entier se cite (exemple : « 4 agents ») :
            // le code l'a compté, pas le modèle.
            if (!r.tronque && rendu === complet) sources.push(String(r.lignes.length))
            tableaux.push(rendu)
            structures.push(r)
            resultat(
              entreDonnees(tronquer(rendreResultatNumerote(r, structures.length), SORTIE_MAX)),
            )
          }
          break
        }
        case OUTIL_VERIFIER: {
          const e = Verifier.safeParse(bloc.input)
          if (!e.success) {
            invalide(e.error)
            break
          }
          try {
            const v = outils.verifier(e.data.modifications)
            const sortie = entreDonnees(`${v.description}\n${lignesConstats(v.constats)}`)
            sources.push(sortie)
            resultat(sortie)
          } catch (erreur) {
            resultat(message(erreur), message(erreur))
          }
          break
        }
        case OUTIL_REPONDRE: {
          const e = Repondre.safeParse(bloc.input)
          if (!e.success) {
            invalide(e.error)
            break
          }
          const { phrase } = e.data
          const retire = (motif: string): IssueEchappee => ({
            sorte: 'reponse',
            texte:
              tableaux.length > 0 ? tableaux.join('\n\n') : "Je n'ai pas pu vérifier ma réponse.",
            phrase,
            controle: CONTROLE_RETIRE,
            motif_controle: motif,
            tours: appels,
            usage,
          })
          // Hors des trous, le modèle ne cite que ce qu'il a reçu avant toute requête,
          // et les identifiants qu'il a reçus tels quels : un tableau, la consigne, une
          // notion du système. Les nombres passent toujours par un trou.
          const brut = verifierReponse(
            sansIdentifiantsRecus(sansTrous(phrase), [systeme, ...sources].join('\n')),
            sourcesInitiales,
            nomsConnus,
            datesConnues,
          )
          if (!brut.ok) return retire(`${MOTIFS_RETRAIT.retape} : ${brut.intrus.join(', ')}`)
          const rempli = remplirPhrase(phrase, structures)
          if (!rempli.ok) return retire(`${MOTIFS_RETRAIT.trou} : ${rempli.motif}`)
          // Le filet : la phrase remplie ne cite que les résultats ; par construction, il ne retire rien.
          const filet = verifierReponse(
            rempli.texte,
            [...sources, ...rempli.valeurs],
            nomsConnus,
            datesConnues,
          )
          if (!filet.ok) return retire(`${MOTIFS_RETRAIT.filet} : ${filet.intrus.join(', ')}`)
          return {
            sorte: 'reponse',
            texte: rempli.texte,
            phrase,
            controle: CONTROLE_OK,
            tours: appels,
            usage,
          }
        }
        case OUTIL_PROPOSER: {
          const e = Proposer.safeParse(bloc.input)
          if (!e.success) {
            invalide(e.error)
            break
          }
          let constats: Constat[]
          try {
            constats = outils.verifier(e.data.modifications).constats
          } catch (erreur) {
            resultat(message(erreur), message(erreur))
            break
          }
          const refus = constats.find((c) => c.verdict === 'refus')
          if (refus) {
            const texte = `la proposition enfreint ${outils.nomRegle(refus.regle)} (${refus.regle}) : ${entreDonnees(refus.motif)}. Corrige ou abandonne.`
            resultat(texte, texte)
            break
          }
          const aVerifier = constats.filter((c) => c.verdict === 'à vérifier')
          const resumeOk = verifierReponse(e.data.resume, sources, nomsConnus, datesConnues).ok
          const texte = [
            outils.decrire(e.data.modifications),
            ...(aVerifier.length > 0
              ? [
                  `À décider par l'exploitation : ${aVerifier.map((c) => `${c.objet} : ${c.motif}`).join(' ; ')}`,
                ]
              : []),
            ...(resumeOk ? [e.data.resume] : []),
          ].join('\n')
          return {
            sorte: 'proposition',
            modifications: e.data.modifications,
            resume: e.data.resume,
            constats,
            texte,
            tours: appels,
            usage,
          }
        }
        case OUTIL_ABANDONNER: {
          const e = Abandonner.safeParse(bloc.input)
          if (!e.success) {
            invalide(e.error)
            break
          }
          // Le motif est du texte libre du modèle : montré seulement s'il ne cite rien hors des données.
          const sur = verifierReponse(
            e.data.motif,
            [...sources, consigne],
            nomsConnus,
            datesConnues,
          ).ok
          return abandon(sur ? e.data.motif : MOTIF_RETIRE)
        }
        default:
          resultat(`outil inconnu : ${bloc.name}`, `outil inconnu : ${bloc.name}`)
      }
    }

    // Le marqueur de cache ne reste que sur le dernier résultat envoyé.
    if (dernierResultat) delete dernierResultat.cache_control
    dernierResultat = resultats.at(-1)
    if (dernierResultat) dernierResultat.cache_control = { type: 'ephemeral' }
    messages.push({ role: 'user', content: resultats })
  }
}
