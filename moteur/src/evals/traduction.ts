import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { type Action, actionsDe, outilsDe, type Role, schemaMontre } from '../conversation/actions'
import { type ConfigConversation, prixDe } from '../conversation/config'
import { avecSession, type MetierConversation, resoudre } from '../conversation/conversation'
import { systemeTraduire, traduire } from '../conversation/traduire'
import type { Instantane } from '../echappee/echappee'
import { actionApprise } from '../gestes/action-apprise'
import { lireFichiersGestes } from '../gestes/charger'
import { type GesteAppris, gesteDe } from '../gestes/geste-appris'
import { cout, type Modele } from '../modele/modele'
import { chargerPersonnes, type IdentiteVerifiee, recevoir } from '../personnes/personnes'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  type AppelTrace,
  bilan,
  CATEGORIE_AGENT_PATRON,
  type CasTraduire,
  ecartsTraduction,
  type FichierTraduire,
  fuiteDe,
  type IssueTraduction,
  modeleTrace,
  type ResultatCas,
  rendreResultats,
  SEUILS,
  textesEnvoyes,
  type Variante,
} from './evals'

// Jouer des cas d'évals sur des copies fraîches du client (PLAN-ESPACES.md
// § 9) : ce que `pnpm evals` fait, partagé avec `pnpm promotions`, qui
// mesure la traduction avec le geste fabriqué chargé avant que le patron
// puisse l'activer (PLAN-PROMOTION.md § 6.3, § 7.1). Chaque cas tourne sur sa
// copie, passe la porte, garde sa trace ; la vérification est en code, la
// fuite aussi : aucun nom des agents de la copie dans ce qui part au modèle
// (PLAN-PSEUDONYMES.md § 7).

/** Un cas de traduction prêt à jouer : du fichier `consignes.yaml`, ou des tests d'un geste appris. */
export interface CasTraduction {
  id: string
  strict: boolean
  piege?: Variante
  role: Role
  agent?: string
  quand: Temporal.ZonedDateTime
  consigne: string
  attendu: CasTraduire['attendu']
}

/** La trace d'un cas : ce qui a été envoyé, ce qui est revenu, l'issue et les écarts ; `evals/traces/` (non versionné). */
export interface TraceCas {
  id: string
  systeme?: string
  /** Chaque système distinct, quand le cas en a plusieurs (échappées puis fabrication). */
  systemes?: string[]
  outils?: unknown
  appels: AppelTrace[]
  issue: unknown
  ecarts: string[]
  coutUsd: number
  fuite?: string[]
}

/** Une copie fraîche du client ; `piege` (ou une variante) remplace une chaîne dans un de ses fichiers. */
export function copieClient(source: string, piege?: Variante): string {
  const dossier = mkdtempSync(join(tmpdir(), 'eval-'))
  cpSync(source, dossier, {
    recursive: true,
    filter: (f) => !/\.sqlite$|rapport-demo|promotions/.test(relative(source, f)),
  })
  if (piege) {
    const fichier = join(dossier, piege.fichier)
    const texte = readFileSync(fichier, 'utf8')
    if (!texte.includes(piege.remplacer)) {
      throw new Error(`piège : « ${piege.remplacer} » introuvable dans ${piege.fichier}`)
    }
    writeFileSync(fichier, texte.replace(piege.remplacer, piege.par))
  }
  return dossier
}

/** La config de la conversation d'un dossier, lue sans ouvrir ses données. */
export function configDuDossier<S>(m: MetierConversation<S>, dossier: string): ConfigConversation {
  const { journal, config } = m.ouvrirJournal(dossier)
  journal.fermer()
  return config
}

export const aParis = (s: string) => Temporal.PlainDateTime.from(s).toZonedDateTime(FUSEAU)

/**
 * Lance un cas sur sa copie (l'identité du cas passe d'abord la porte ; le
 * cas ouvre lui-même la session, après la traduction), garde sa trace, rend
 * son résultat, sa fuite et l'identifiant du modèle qui a joué. `permis` :
 * ce qui, envoyé, n'est pas une fuite (la consigne telle qu'écrite, pour la
 * traduction).
 */
export async function jouerCas<S>(
  m: MetierConversation<S>,
  source: string,
  cas: { id: string; strict: boolean; piege?: Variante; role: string; agent?: string },
  modeleDe: (config: ConfigConversation) => Modele,
  jouer: (
    dossier: string,
    modele: Modele,
    identite: IdentiteVerifiee,
  ) => Promise<{ ecarts: string[]; issue: unknown; permis?: string }>,
): Promise<{ resultat: ResultatCas; trace: TraceCas; idModele: string }> {
  const dossier = copieClient(source, cas.piege)
  const accueil = recevoir(chargerPersonnes(dossier), {
    role: cas.role,
    ...(cas.agent ? { agent: cas.agent } : {}),
  })
  if (accueil.sorte === 'refus') {
    rmSync(dossier, { recursive: true, force: true })
    const ecarts = [`refus à la porte : ${accueil.motif}`]
    return {
      resultat: { id: cas.id, ecarts, coutUsd: 0, strict: cas.strict },
      trace: { id: cas.id, appels: [], issue: undefined, ecarts, coutUsd: 0 },
      idModele: '',
    }
  }
  const config = configDuDossier(m, dossier)
  const modele = modeleTrace(modeleDe(config))
  let ecarts: string[]
  let issue: unknown
  let permis: string | undefined
  let fuite: string[]
  try {
    try {
      ;({ ecarts, issue, permis } = await jouer(dossier, modele, accueil.identite))
    } catch (erreur) {
      ecarts = [`exception : ${(erreur as Error).message}`]
      issue = undefined
    }
    // Tous les agents de la copie (le patron les voit tous), variante comprise ;
    // une fuite qu'on ne peut pas mesurer compte comme une fuite.
    try {
      const personnes = await avecSession(
        m,
        dossier,
        accueil.identite,
        (s) => m.vocabulaire(s, { role: 'patron' }).agents,
      )
      fuite = fuiteDe(textesEnvoyes(modele), personnes, permis)
    } catch (erreur) {
      fuite = [`non mesurée : ${(erreur as Error).message}`]
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
  const prix = prixDe(config)
  const coutUsd = modele.appels.reduce(
    (somme, a) => somme + (a.reponse ? cout(a.reponse.usage, prix) : 0),
    0,
  )
  return {
    resultat: { id: cas.id, ecarts, coutUsd, strict: cas.strict, fuite },
    trace: {
      id: cas.id,
      ...(modele.systeme !== undefined ? { systeme: modele.systeme } : {}),
      ...(modele.systemes.length > 1 ? { systemes: modele.systemes } : {}),
      ...(modele.outils !== undefined ? { outils: modele.outils } : {}),
      appels: modele.appels,
      issue,
      ecarts,
      coutUsd,
      fuite,
    },
    idModele: modele.id,
  }
}

/** Les cas de `consignes.yaml`, prêts à jouer. */
export function casDuFichier(fichier: FichierTraduire, seulement?: Set<string>): CasTraduction[] {
  return fichier.cas
    .filter((c) => !seulement || seulement.has(c.id))
    .map((c) => {
      const variante = c.variante === undefined ? undefined : fichier.variantes?.[c.variante]
      if (c.variante !== undefined && !variante) {
        throw new Error(`${c.id} : variante ${c.variante} inconnue`)
      }
      return {
        id: c.id,
        strict: c.categorie === CATEGORIE_AGENT_PATRON,
        ...(variante ? { piege: variante } : {}),
        role: c.role,
        ...(c.agent !== undefined ? { agent: c.agent } : {}),
        quand: aParis(c.maintenant ?? fichier.maintenant),
        consigne: c.consigne,
        attendu: c.attendu,
      }
    })
}

/**
 * Les tests d'un geste appris comme cas de traduction (P13) : la consigne
 * d'origine, au moment de l'échappée (lu dans son instantané : « cette
 * semaine » se calcule depuis là), doit choisir le geste avec ses paramètres.
 * Pour le rôle `agent`, un paramètre `agent` vaut toujours celui qui parle
 * (D4) : il n'est pas comparé.
 */
export function casDuGeste(geste: GesteAppris, dossierClient: string): CasTraduction[] {
  const agents = Object.entries(geste.parametres)
    .filter(([, p]) => p.type === 'agent')
    .map(([nom]) => nom)
  return geste.tests.map((t, n) => {
    const chemin = join(dossierClient, t.instantane)
    if (!existsSync(chemin)) throw new Error(`${geste.id} : instantané absent : ${t.instantane}`)
    const { horodatage } = JSON.parse(readFileSync(chemin, 'utf8')) as Instantane
    const params = Object.fromEntries(
      Object.entries(t.params).filter(([cle]) => t.role !== 'agent' || !agents.includes(cle)),
    )
    return {
      id: `G-${geste.id}-${n + 1}`,
      strict: false,
      role: t.role,
      ...(t.agent !== null ? { agent: t.agent } : {}),
      quand: Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU),
      consigne: t.consigne,
      attendu: { sorte: 'action', action: geste.id, params },
    }
  })
}

/**
 * Les gestes appris d'un dossier, proposés ou actifs, chargés par leur
 * fichier sans la clé du journal (la copie d'un cas n'en a pas) : la passe
 * mesure la liste que le modèle lira, un geste seulement proposé compris
 * (PLAN-PROMOTION.md § 5.4 et § 7.1). Les fichiers illisibles sont rendus à part.
 */
export function apprisDuDossier<S>(
  m: MetierConversation<S>,
  dossier: string,
): { appris: Action<S, unknown>[]; erreurs: string[] } {
  const copie = m.copie
  if (!copie) return { appris: [], erreurs: [] }
  const erreurs: string[] = []
  const appris = lireFichiersGestes(dossier).flatMap((f) => {
    if (f.erreur !== undefined) erreurs.push(`gestes/${f.fichier} : ${f.erreur}`)
    return f.contenu && f.contenu.statut !== 'retire'
      ? [actionApprise(gesteDe(f.contenu), copie)]
      : []
  })
  return { appris, erreurs }
}

/**
 * Joue des cas de traduction, les gestes appris donnés chargés (leur
 * intention sort de la liste, P14) : le circuit de la conversation sans
 * l'exécution, la traduction (la phrase seule), puis le dossier, puis la
 * résolution de la personne. `surCas` reçoit chaque résultat et sa trace.
 */
export async function jouerTraduction<S>(
  m: MetierConversation<S>,
  source: string,
  cas: CasTraduction[],
  appris: Action<S, unknown>[],
  modeleDe: (config: ConfigConversation) => Modele,
  surCas?: (resultat: ResultatCas, trace: TraceCas, idModele: string) => void,
): Promise<ResultatCas[]> {
  const intentions = m.intentions.filter((i) => !appris.some((a) => a.id === i.id))
  const apprisIds = appris.map((a) => a.id)
  const toutes = [...m.actions, ...appris]
  const resultats: ResultatCas[] = []
  for (const c of cas) {
    const joue = await jouerCas(m, source, c, modeleDe, async (dossier, modele, identite) => {
      const actions = actionsDe(toutes, c.role)
      const { demande } = await traduire(
        modele,
        configDuDossier(m, dossier).modele.effort.traduire,
        systemeTraduire(c.role, actions, intentions),
        outilsDe(toutes, c.role),
        c.consigne,
        c.quand,
        new Map(actions.map((a) => [a.id, schemaMontre(a)])),
      )
      const action =
        demande.sorte === 'action' ? actions.find((a) => a.id === demande.action) : undefined
      const issue: IssueTraduction =
        demande.sorte !== 'action' || !action
          ? demande
          : await avecSession(m, dossier, identite, async (s) => {
              m.verifierIdentite(s, identite)
              const tour = {
                identite,
                consigne: c.consigne,
                maintenant: c.quand,
                conversation: `C-eval-${c.id}`,
              }
              const r = await resoudre(m, s, modele, tour, action, demande.params)
              return r.sorte === 'resolue'
                ? { ...demande, params: r.params }
                : { sorte: 'precision', candidats: r.candidats.map((x) => x.id) }
            })
      // La traduction reçoit la phrase telle qu'écrite : les noms qu'elle porte ne sont pas une fuite.
      return { ecarts: ecartsTraduction(c.attendu, issue, apprisIds), issue, permis: c.consigne }
    })
    resultats.push(joue.resultat)
    surCas?.(joue.resultat, joue.trace, joue.idModele)
  }
  return resultats
}

/** Le bilan d'une passe de traduction avec modèle, le geste chargé (PLAN-PROMOTION.md § 6.3, § 7.1). */
export interface BilanTraduction {
  ok: number
  total: number
  taux: number
  coutUsd: number
  stricts: string[]
  appels: number
}

/** Le dossier des dossiers de promotion, dans le dossier du client : la passe y laisse son tableau. */
export const DOSSIER_PROMOTIONS = 'promotions'

/**
 * La passe qui décide « activable », la même pour `pnpm promotions` et
 * `pnpm gestes verifier --avec-modele` (§ 6.3, § 7.1) : `consignes.yaml`
 * entier et les tests du geste, tous les gestes appris du dossier chargés par
 * leur fichier (celui-ci compris, proposé ou actif). Son tableau s'écrit à
 * côté du dossier de promotion, `promotions/<id>-<date>-traduction.md`.
 */
export async function passeTraduction<S>(
  m: MetierConversation<S>,
  dossier: string,
  geste: GesteAppris,
  consignes: FichierTraduire,
  modeleDe: (config: ConfigConversation) => Modele,
  options: {
    /** AAAA-MM-JJ, pour le nom du tableau. */
    date: string
    surAppris?: (ids: string[], erreurs: string[]) => void
    surCas?: (resultat: ResultatCas, trace: TraceCas) => void
  },
): Promise<BilanTraduction & { idModele: string; tableau: string }> {
  const { appris, erreurs } = apprisDuDossier(m, dossier)
  options.surAppris?.(
    appris.map((a) => a.id),
    erreurs,
  )
  let appels = 0
  let idModele = ''
  const resultats = await jouerTraduction(
    m,
    dossier,
    [...casDuFichier(consignes), ...casDuGeste(geste, dossier)],
    appris,
    modeleDe,
    (r, trace, id) => {
      appels += trace.appels.length
      idModele = id
      options.surCas?.(r, trace)
    },
  )
  const b = bilan(resultats, SEUILS.traduire)
  // Le dossier de promotion s'écrit après la passe : son répertoire n'existe pas forcément encore.
  mkdirSync(join(dossier, DOSSIER_PROMOTIONS), { recursive: true })
  const tableau = join(dossier, DOSSIER_PROMOTIONS, `${geste.id}-${options.date}-traduction.md`)
  writeFileSync(
    tableau,
    rendreResultats(
      `Traduction avec le geste ${geste.id} chargé — ${options.date}`,
      idModele,
      resultats,
      SEUILS.traduire,
    ),
  )
  return {
    ok: b.ok,
    total: b.total,
    taux: b.taux,
    coutUsd: b.coutUsd,
    stricts: b.stricts,
    appels,
    idModele,
    tableau,
  }
}
