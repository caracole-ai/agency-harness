import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  type Agence,
  cheminDepotNuit,
  type Executer,
  executerSync,
  preflight,
} from '../agence/config'
import { schemaJson } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { dollars } from '../promotion/promotion'
import { construireCatalogue } from '../ronde/ronde'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  type Commande,
  commandeSync,
  commettre,
  fermerArbre,
  ouvrirArbre,
  verifierDepot,
} from './arbre'
import { type IssueClaude, type Lancer, lancerClaude, lancerProcessus } from './claude'
import { CONDITIONS, type Condition, conclure, type IssueFusion, raisonRefus } from './fusion'
import { casParGesteNouveau, type Garde, garderDiff } from './garde'
import {
  coutEcrit,
  ecrireChantier,
  interdits,
  missionsRetirees,
  nettoyer,
  nettoyerLignes,
  pourChantier,
} from './memoire'
import { type Decision, decider, lireMission, type Mission, missionPourModele } from './mission'

// Le chantier d'une mission (PLAN-RONDE.md § 6.3, R5 ; PLAN-GENERAL.md G1) :
// décider en code (§ 0.b : promotion en cours, question pour l'atelier,
// écartée), puis, dans un arbre de travail du clone de la nuit, le plan
// (modèle `chantier.plan`, lecture seule, sortie structurée), l'implémentation
// (`chantier.implementation`, bornée par la config), la garde du diff,
// `pnpm check` rejoué par le code, la relecture (`chantier.revue`, lecture
// seule, constats structurés), une reprise au plus sur un `bloquant`, le test
// d'honnêteté (les cas de traduction de chaque geste nouveau, et `pnpm evals
// traduire` avec le modèle du quotidien) ; le dossier chez le client, l'entrée
// de mémoire, et la fusion par `fusion.ts` si les huit conditions sont vertes.
// Le modèle ne reçoit aucune donnée du client : la mission par types (R3),
// la mémoire sans nom ; la fuite se mesure avant tout appel. Les modèles
// passent par le binaire `claude` (§ 0.a) : coût estimé par le binaire.

export const TYPE_CHANTIER = 'chantier'
export const DOSSIER_CHANTIERS = 'chantiers'
export const FICHIER_METHODE = join('methode', 'chantier.md')
/** Le mode du binaire : tout ce qui n'est pas dans les règles d'outils est refusé, rien n'est demandé. */
const PERMISSION = 'dontAsk'
const coauteur = (modele: string) => `${modele} <noreply@anthropic.com>`

/** Les issues d'un chantier, telles que le dossier, le journal et la mémoire les disent. */
export const ISSUES_CHANTIER = {
  fusionne: 'fusionné',
  refuse: 'refusé',
  echoue: 'échoué',
  fuite: 'refusé avant tout appel : un nom partirait',
} as const

export const NIVEAUX = ['bloquant', 'à corriger', 'remarque'] as const

export const PlanChantier = z.strictObject({
  faisable: z
    .boolean()
    .describe('faux si la mission ne tient pas dans la bande métier (moteur, règle, interface)'),
  raison: z.string().min(1).max(600).describe('pourquoi, en une ou deux phrases'),
  plan: z
    .string()
    .min(1)
    .max(12000)
    .describe(
      'le plan en markdown : fichiers à toucher, gestes et paramètres, tests, cas de traduction, ce qui ne sera pas touché',
    ),
})
export type PlanChantier = z.infer<typeof PlanChantier>

export const Constat = z.strictObject({
  niveau: z.enum(NIVEAUX),
  fichier: z.string().describe('le chemin dans le dépôt'),
  ligne: z.number().int().nonnegative().describe('la ligne, 0 si le constat porte sur le fichier'),
  texte: z.string().min(1).max(600).describe('le constat, en une phrase'),
})
export type Constat = z.infer<typeof Constat>

export const Relecture = z.strictObject({
  constats: z.array(Constat).max(40),
  resume: z.string().max(1500).describe('la relecture en quelques phrases'),
})
export type Relecture = z.infer<typeof Relecture>

export interface Etape {
  etape: 'plan' | 'implémentation' | 'relecture' | 'reprise' | 'relecture après reprise'
  modele: string
  ok: boolean
  cout: number
  tours: number
  dureeMs: number
  sousType?: string
  raison?: string
}

export interface OptionsChantier {
  /** La racine de l'arbre courant (le code qui tourne) : le clone de la nuit ne doit pas en être un (R11). */
  racine: string
  agence: Agence
  /** `<client>/rondes/<date>/<id>.yaml` */
  mission: string
  env: Record<string, string | undefined>
  sansModele?: boolean
  refaire?: boolean
  maintenant?: Temporal.ZonedDateTime
  /** Les tests simulent le binaire, le préflight, git et pnpm. */
  lancer?: Lancer
  executer?: Executer
  commande?: Commande
}

export type IssueChantier =
  | { sorte: 'decision'; decision: Exclude<Decision, { sorte: 'chantier' }>; dossier: string }
  | { sorte: 'sans_modele'; decision: Decision; dossier: string }
  | { sorte: 'deja_tentee'; dossier: string }
  | { sorte: 'fuite'; fuite: string[]; dossier: string }
  | {
      sorte: 'fait'
      issue: string
      dossier: string
      conditions: Condition[]
      etapes: Etape[]
      constats: Constat[]
      cout: number
      dureeMs: number
      fusion?: IssueFusion
    }

/** Une section d'un texte de modèle, de son titre `## …` au titre suivant ; vide si absente. */
function section(texte: string, titre: string): string {
  const lignes = texte.split('\n')
  const debut = lignes.findIndex((l) => l.trim().toLowerCase() === `## ${titre}`.toLowerCase())
  if (debut < 0) return ''
  const fin = lignes.findIndex((l, i) => i > debut && /^##\s/.test(l))
  return lignes
    .slice(debut + 1, fin < 0 ? undefined : fin)
    .join('\n')
    .trim()
}

/** Le bloc « Vérifié / Non vérifié, risque » du modèle d'implémentation. */
const blocVerifie = (texte: string) =>
  [
    '### Vérifié',
    '',
    section(texte, 'Vérifié') || '(absent)',
    '',
    '### Non vérifié, risque',
    '',
    section(texte, 'Non vérifié, risque') || '(absent)',
  ].join('\n')

/** La ligne de `pnpm evals traduire` qui porte le compte (cli/evals.ts). */
const MOTIF_EVALS = /(\d+)\/(\d+) \((\d+) %, seuil (\d+) %\), fuite (\d+) cas/

const fin = (texte: string, n: number) => texte.trim().split('\n').slice(-n).join('\n')

/**
 * Le chantier d'une mission (§ 6.3). Idempotent : une mission déjà tentée (sa
 * branche existe dans le clone) ne se refait pas sans `refaire`.
 */
export async function faireChantier<S>(
  m: MetierConversation<S>,
  o: OptionsChantier,
): Promise<IssueChantier> {
  const debut = Date.now()
  const { mission, dossierClient } = lireMission(o.mission)
  const c = o.commande ?? commandeSync
  const lancer = o.lancer ?? lancerProcessus
  const executer = o.executer ?? executerSync
  const maintenant = o.maintenant ?? Temporal.Now.zonedDateTimeISO(FUSEAU)
  const jour = maintenant.toPlainDate().toString()
  const depot = cheminDepotNuit(o.agence, o.racine)
  const ch = o.agence.chantier
  const modeles = o.agence.modeles.chantier
  const dossierChantiers = join(dossierClient, DOSSIER_CHANTIERS)
  // Sans modèle, le dossier s'écrit à côté : jamais par-dessus celui d'un chantier fait.
  const dossier = join(dossierChantiers, `${mission.id}${o.sansModele ? '.sans-modele' : ''}.md`)
  mkdirSync(dossierChantiers, { recursive: true })

  const s = m.ouvrir(dossierClient)
  try {
    const config = m.config(s)
    const journal = m.journal(s)
    const client = m.client(s)
    const personnes: Designable[] = m.vocabulaire(s, { role: 'patron' }).agents
    const catalogue = construireCatalogue(
      m,
      dossierClient,
      journal,
      config.promotion,
      maintenant.toPlainDate(),
    )
    const retirees = existsSync(depot) ? missionsRetirees(depot) : []
    const decision = decider(mission, catalogue, retirees)
    const journaliser = (issue: string, donnees: Record<string, unknown>) =>
      journal.ecrire(
        [{ type: TYPE_CHANTIER, client, objet: mission.id, issue, donnees }],
        maintenant.toInstant().toString(),
      )

    if (decision.sorte !== 'chantier') {
      // La même décision le même jour : rien de plus au journal (la nuit relancée ne refait rien).
      const contenu = rendreDecision(mission, decision, jour)
      const deja = existsSync(dossier) && readFileSync(dossier, 'utf8') === contenu
      writeFileSync(dossier, contenu)
      if (!o.sansModele && !deja) {
        journaliser(decision.motif, { decision: decision.sorte, cout_usd: 0 })
      }
      return { sorte: 'decision', decision, dossier }
    }

    // Ce qui vient du client et part au modèle : la mission par types, la mémoire sans nom.
    const memoire = existsSync(depot)
      ? pourChantier(
          depot,
          [mission.id, ...mission.intentions],
          o.agence.ronde.memoire.index_lignes,
        )
      : { index: [], conventions: '', chantiers: [] }
    const missionTexte = missionPourModele(mission)
    const memoireTexte = [
      '### L’index (les dernières lignes)',
      '',
      ...(memoire.index.length > 0 ? memoire.index.map((l) => `- ${l}`) : ['(vide)']),
      '',
      '### Les conventions',
      '',
      memoire.conventions.trim() || '(aucune)',
      '',
      '### Les chantiers qui citent ces intentions',
      '',
      ...(memoire.chantiers.length > 0 ? memoire.chantiers : ['(aucun)']),
    ].join('\n')
    const fuite = interdits(`${missionTexte}\n${memoireTexte}`, personnes)
    if (fuite.length > 0) {
      writeFileSync(
        dossier,
        rendreDecision(mission, { sorte: 'ecartee', motif: ISSUES_CHANTIER.fuite }, jour),
      )
      if (!o.sansModele) journaliser(ISSUES_CHANTIER.fuite, { fuite: fuite.length, cout_usd: 0 })
      return { sorte: 'fuite', fuite, dossier }
    }
    const promptPlan = [
      "Planifie ce chantier. Tu lis le dépôt, tu n'écris rien.",
      '',
      '## La mission',
      '',
      missionTexte,
      '',
      '## La mémoire de la nuit',
      '',
      memoireTexte,
      '',
      'Rends `faisable`, `raison` et `plan` au schéma donné.',
    ].join('\n')
    if (o.sansModele) {
      writeFileSync(
        dossier,
        [
          rendreDecision(mission, decision, jour),
          '## Ce que le plan recevrait (sans modèle : aucun appel)',
          '',
          promptPlan,
          '',
        ].join('\n'),
      )
      return { sorte: 'sans_modele', decision, dossier }
    }

    // Le préflight de l'accès (§ 0.a) et le clone de la nuit propre (R11), avant toute branche.
    for (const r of [modeles.plan, modeles.implementation, modeles.revue]) {
      if (r.acces !== 'claude')
        throw new Error(
          `chantier : ${r.modele} sous acces: ${r.acces}, seul le binaire claude sait coder`,
        )
    }
    preflight('claude', o.agence, o.env, executer)
    verifierDepot(c, depot, o.racine)
    const arbre = ouvrirArbre(c, depot, mission.id, o.refaire === true)
    if (arbre.sorte === 'deja_tentee') return { sorte: 'deja_tentee', dossier }
    const cwd = arbre.chemin

    const etapes: Etape[] = []
    const conditions: Condition[] = []
    let constats: Constat[] = []
    let plan: PlanChantier | undefined
    let texteImplementation = ''
    let garde: Garde | undefined
    let check: { ok: boolean; sortie: string } | undefined
    let honnetete: { ok: boolean; mesure: string } | undefined
    let fusion: IssueFusion | undefined
    let derniereLecture: Relecture | undefined
    let issue: string = ISSUES_CHANTIER.echoue
    const cout = () => etapes.reduce((t, e) => t + e.cout, 0)
    const appeler = async (
      etape: Etape['etape'],
      role: (typeof modeles)[keyof typeof modeles],
      prompt: string,
      outils: string[],
      schema?: z.ZodType<unknown>,
    ): Promise<IssueClaude> => {
      const restant = ch.budget_usd_par_mission - cout()
      if (restant <= 0) {
        const r: IssueClaude = {
          ok: false,
          texte: '',
          cout: 0,
          tours: 0,
          raison: 'budget de la mission épuisé',
          dureeMs: 0,
        }
        etapes.push({
          etape,
          modele: role.modele,
          ok: false,
          cout: 0,
          tours: 0,
          dureeMs: 0,
          raison: r.raison,
        })
        return r
      }
      const r = await lancerClaude(
        {
          modele: role.modele,
          effort: role.effort,
          prompt,
          systemeAjouteFichier: join(cwd, FICHIER_METHODE),
          outils,
          permission: PERMISSION,
          toursMax: ch.tours_max,
          budgetUsd: Math.round(restant * 100) / 100,
          cwd,
          ...(schema ? { schemaJson: schemaJson(schema) } : {}),
          delaiMs: ch.delai_secondes * 1000,
          reglages: 'projet',
        },
        o.agence,
        o.env,
        lancer,
        executer,
      )
      etapes.push({
        etape,
        modele: role.modele,
        ok: r.ok,
        cout: r.cout,
        tours: r.tours,
        dureeMs: r.dureeMs,
        ...(r.sousType ? { sousType: r.sousType } : {}),
        ...(r.raison ? { raison: r.raison } : {}),
      })
      return r
    }
    const pnpm = (args: string[]) => c(cwd, 'pnpm', args, o.env)
    const verifier = () => {
      garde = garderDiff(c, cwd, ch, personnes)
      const r = pnpm(['check'])
      check = { ok: r.code === 0, sortie: fin(`${r.sortie}\n${r.erreur}`, 15) }
    }
    const relire = async (etape: 'relecture' | 'relecture après reprise') => {
      const r = await appeler(
        etape,
        modeles.revue,
        [
          "Relis la branche de ce chantier (`git diff main...HEAD`). Tu n'écris rien.",
          '',
          '## La mission',
          '',
          missionTexte,
          '',
          '## Le plan',
          '',
          plan?.plan ?? '',
          '',
          '## Ce que le code a mesuré',
          '',
          `- fichiers : ${(garde?.fichiers ?? []).map((f) => `${f.statut} ${f.chemin}`).join(', ')}`,
          `- pnpm check : ${check?.ok ? 'vert' : 'rouge'}`,
          '',
          '## Les conventions',
          '',
          memoire.conventions.trim() || '(aucune)',
          '',
          'Rends tes constats au schéma donné.',
        ].join('\n'),
        ch.outils_lecture,
        Relecture,
      )
      const lu = r.ok ? Relecture.safeParse(r.sortie) : undefined
      derniereLecture = lu?.success ? lu.data : undefined
      if (derniereLecture) constats = [...constats, ...derniereLecture.constats]
      return derniereLecture
    }

    try {
      // L'arbre a ses propres dépendances : `pnpm check` y tourne.
      const installe = pnpm(['install', '--frozen-lockfile', '--prefer-offline'])
      if (installe.code !== 0) {
        throw new Error(`pnpm install dans l'arbre : ${fin(installe.erreur || installe.sortie, 5)}`)
      }

      const rPlan = await appeler('plan', modeles.plan, promptPlan, ch.outils_lecture, PlanChantier)
      const luPlan = rPlan.ok ? PlanChantier.safeParse(rPlan.sortie) : undefined
      if (!luPlan?.success) throw new Error(`plan échoué : ${rPlan.raison ?? 'sortie hors schéma'}`)
      plan = luPlan.data
      if (!plan.faisable) {
        const motif = `question pour l'atelier : ${nettoyer(plan.raison, personnes)}`
        writeFileSync(
          dossier,
          rendreDossier({ mission, jour, plan, etapes, conditions, constats, issue: motif }),
        )
        journaliser(motif, { decision: 'question', cout_usd: round(cout()), cout_estime: true })
        return {
          sorte: 'fait',
          issue: motif,
          dossier,
          conditions,
          etapes,
          constats,
          cout: cout(),
          dureeMs: Date.now() - debut,
        }
      }

      const consignesImpl = [
        'Code ce chantier, en suivant le plan, dans la bande métier seulement.',
        '',
        '## La mission',
        '',
        missionTexte,
        '',
        '## Le plan',
        '',
        plan.plan,
        '',
        '## Les conventions',
        '',
        memoire.conventions.trim() || '(aucune)',
        '',
        "Pour chaque geste nouveau : trois cas de traduction au moins dans `evals/consignes.yaml`, un test par règle d'exécution. Lance `pnpm check` jusqu'au vert. Finis par les trois sections : « ## Vérifié », « ## Non vérifié, risque », « ## Ce que j'ai appris ».",
      ].join('\n')
      const rImpl = await appeler(
        'implémentation',
        modeles.implementation,
        consignesImpl,
        ch.outils_autorises,
      )
      texteImplementation = rImpl.texte
      const titre = nettoyer(mission.titre, personnes)
      commettre(
        c,
        cwd,
        `Chantier ${mission.id} : ${titre}`,
        coauteur(modeles.implementation.modele),
      )
      verifier()
      if (rImpl.ok && garde?.chemins.ok && check?.ok) {
        const lue = await relire('relecture')
        const bloquants = lue?.constats.filter((k) => k.niveau === 'bloquant') ?? []
        if (lue && bloquants.length > 0) {
          // Une reprise au plus (P5), sur les seuls constats bloquants.
          const rReprise = await appeler(
            'reprise',
            modeles.implementation,
            [
              consignesImpl,
              '',
              '## La relecture a trouvé ces constats bloquants : corrige-les, rien d’autre',
              '',
              ...bloquants.map((k) => `- ${k.fichier}:${k.ligne} — ${k.texte}`),
            ].join('\n'),
            ch.outils_autorises,
          )
          if (rReprise.texte) texteImplementation = rReprise.texte
          commettre(
            c,
            cwd,
            `Chantier ${mission.id} : reprise après relecture`,
            coauteur(modeles.implementation.modele),
          )
          verifier()
          if (garde?.chemins.ok && check?.ok) await relire('relecture après reprise')
        }
      }

      const derniere = etapes.filter((e) => e.etape.startsWith('relecture')).at(-1)
      const relu = derniere?.ok === true && derniereLecture !== undefined
      const bloquantsRestants = (derniereLecture?.constats ?? []).filter(
        (k) => k.niveau === 'bloquant',
      ).length

      if (garde?.chemins.ok && check?.ok && relu && bloquantsRestants === 0) {
        honnetete = mesurerHonnetete(c, cwd, o.env, ch.evals_client)
      }

      const echecsBornes = etapes.filter(
        (e) =>
          e.sousType?.startsWith('error_max') ||
          e.raison?.startsWith('délai') ||
          e.raison === 'budget de la mission épuisé',
      )
      conditions.push(
        {
          id: 'chemins',
          ok: garde?.chemins.ok === true,
          mesure: garde
            ? garde.fichiers.length === 0
              ? 'aucun fichier changé'
              : [
                  ...garde.chemins.horsBande.map((x) => `hors bande : ${x}`),
                  ...garde.chemins.memoire,
                ].join(' ; ') || `${garde.fichiers.length} fichier(s), tous dans la bande`
            : 'non mesurée',
        },
        {
          id: 'tests',
          ok: garde?.tests.ok === true,
          mesure: garde
            ? garde.tests.disparus.join(' ; ') || 'aucun test retiré ni tu'
            : 'non mesurée',
        },
        {
          id: 'check',
          ok: check?.ok === true,
          mesure: check ? (check.ok ? 'vert' : 'rouge') : 'non lancé',
        },
        {
          id: 'honnetete',
          ok: honnetete?.ok === true,
          mesure: honnetete?.mesure ?? 'non mesurée (une condition précédente est rouge)',
        },
        {
          id: 'relecture',
          ok: relu && bloquantsRestants === 0,
          mesure: derniere
            ? relu
              ? `${bloquantsRestants} bloquant(s) après ${etapes.some((e) => e.etape === 'reprise') ? 'une reprise' : 'la relecture'}`
              : `relecture échouée (${derniere.raison ?? 'sortie hors schéma'})`
            : 'non faite (une condition précédente est rouge)',
        },
        {
          id: 'bornes',
          ok: echecsBornes.length === 0 && rImpl.ok && cout() <= ch.budget_usd_par_mission,
          mesure: `${etapes.reduce((t, e) => t + e.tours, 0)} tour(s) en tout (au plus ${ch.tours_max} par appel), ${coutEcrit({ usd: cout(), estime: true })} sur ${ch.budget_usd_par_mission} $${echecsBornes.length > 0 ? ` ; ${echecsBornes.map((e) => `${e.etape} : ${e.sousType ?? e.raison}`).join(', ')}` : rImpl.ok ? '' : ` ; implémentation : ${rImpl.raison ?? '?'}`}`,
        },
        {
          id: 'lignes',
          ok: garde?.lignes.ok === true,
          mesure: garde
            ? `${garde.lignes.total} ligne(s), au plus ${garde.lignes.max}`
            : 'non mesurée',
        },
      )

      const appris = section(texteImplementation, "Ce que j'ai appris")
      fusion = conclure({
        commande: c,
        depot,
        racineCourante: o.racine,
        id: mission.id,
        titre,
        conditions,
        personnes,
        ecrireEntree: (sorte, issueMemoire) =>
          ecrireChantier(
            depot,
            {
              date: jour,
              client,
              id: mission.id,
              titre,
              sorte,
              issue: issueMemoire,
              cout: { usd: round(cout()), estime: true },
              appris,
              sections: sectionsMemoire({
                mission: missionTexte,
                plan: plan?.plan ?? '',
                garde,
                check,
                honnetete,
                constats,
                issue: issueMemoire,
                personnes,
              }),
            },
            personnes,
          ),
      })
      issue =
        fusion.sorte === 'fusionne'
          ? ISSUES_CHANTIER.fusionne
          : fusion.sorte === 'refuse'
            ? raisonRefus(fusion.rouges)
            : `${ISSUES_CHANTIER.echoue} : ${fusion.raison}`
      if (fusion.sorte === 'refuse')
        conditions.push(...fusion.rouges.filter((r) => r.id === 'memoire'))
      else
        conditions.push({
          id: 'memoire',
          ok: fusion.sorte === 'fusionne',
          mesure: fusion.sorte === 'fusionne' ? `écrite : ${fusion.memoire}` : 'non écrite',
        })
    } catch (erreur) {
      issue = `${ISSUES_CHANTIER.echoue} : ${(erreur as Error).message.slice(0, 300)}`
    } finally {
      fermerArbre(c, depot, mission.id)
    }

    const dureeMs = Date.now() - debut
    writeFileSync(
      dossier,
      rendreDossier({
        mission,
        jour,
        ...(plan ? { plan } : {}),
        etapes,
        conditions,
        constats,
        issue,
        ...(garde ? { garde } : {}),
        ...(check ? { check } : {}),
        bloc: blocVerifie(texteImplementation),
        dureeMs,
        ...(fusion ? { fusion } : {}),
      }),
    )
    journaliser(
      fusion?.sorte === 'fusionne'
        ? ISSUES_CHANTIER.fusionne
        : fusion?.sorte === 'refuse'
          ? ISSUES_CHANTIER.refuse
          : ISSUES_CHANTIER.echoue,
      {
        conditions: Object.fromEntries(conditions.map((k) => [k.id, k.ok])),
        etapes: etapes.length,
        cout_usd: round(cout()),
        cout_estime: true,
        duree_s: Math.round(dureeMs / 1000),
        fuite: 0,
      },
    )
    return {
      sorte: 'fait',
      issue,
      dossier,
      conditions,
      etapes,
      constats,
      cout: cout(),
      dureeMs,
      ...(fusion ? { fusion } : {}),
    }
  } finally {
    m.fermer(s)
  }
}

const round = (x: number) => Math.round(x * 1_000_000) / 1_000_000

/**
 * Condition 4 de G1 : au moins trois cas de traduction par geste nouveau,
 * puis `pnpm evals traduire` dans l'arbre, avec le modèle du quotidien (la
 * clé que nomme la config du client des évals) : son code de sortie dit le
 * seuil, sa dernière ligne le compte.
 */
function mesurerHonnetete(
  c: Commande,
  arbre: string,
  env: Record<string, string | undefined>,
  client: string,
): { ok: boolean; mesure: string } {
  const nouveaux = casParGesteNouveau(c, arbre)
  const courts = nouveaux.filter((g) => g.cas < 3)
  const gestes =
    nouveaux.length === 0
      ? 'aucun geste nouveau'
      : nouveaux.map((g) => `${g.geste} : ${g.cas} cas`).join(', ')
  if (courts.length > 0) return { ok: false, mesure: `${gestes} (trois au moins)` }
  const r = c(arbre, 'pnpm', ['evals', 'traduire', '--client', client], env)
  const compte = MOTIF_EVALS.exec(`${r.sortie}\n${r.erreur}`)
  if (!compte) {
    return {
      ok: false,
      mesure: `${gestes} ; pnpm evals traduire n'a pas rendu de compte (${fin(
        r.erreur || r.sortie,
        2,
      )
        .replace(/\s+/g, ' ')
        .slice(0, 200)})`,
    }
  }
  const [, ok, total, taux, seuil, fuite] = compte
  return {
    ok: r.code === 0 && fuite === '0',
    mesure: `${gestes} ; pnpm evals traduire : ${ok}/${total} (${taux} %, seuil ${seuil} %), fuite ${fuite}`,
  }
}

/** Les sections de l'entrée de mémoire (R10) : écrites par le code ; le texte des modèles, ligne à ligne, sans nom. */
function sectionsMemoire(x: {
  mission: string
  plan: string
  garde: Garde | undefined
  check: { ok: boolean } | undefined
  honnetete: { mesure: string } | undefined
  constats: Constat[]
  issue: string
  personnes: Designable[]
}): { titre: string; texte: string }[] {
  return [
    { titre: 'La mission', texte: x.mission },
    { titre: 'Le plan', texte: nettoyerLignes(x.plan, x.personnes) },
    {
      titre: 'Les fichiers touchés',
      texte:
        (x.garde?.fichiers ?? []).map((f) => `- ${f.statut} \`${f.chemin}\``).join('\n') ||
        'Aucun.',
    },
    {
      titre: 'Les tests',
      texte: [
        `- fichiers de test touchés : ${(x.garde?.testsTouches ?? []).join(', ') || 'aucun'}`,
        `- pnpm check rejoué par le code : ${x.check ? (x.check.ok ? 'vert' : 'rouge') : 'non lancé'}`,
        `- honnêteté : ${x.honnetete?.mesure ?? 'non mesurée'}`,
      ].join('\n'),
    },
    {
      titre: 'Les constats de relecture',
      texte:
        x.constats
          .map(
            (k) =>
              `- ${k.niveau} — \`${k.fichier}:${k.ligne}\` : ${nettoyer(k.texte, x.personnes)}`,
          )
          .join('\n') || 'Aucun.',
    },
    { titre: 'La raison', texte: x.issue },
  ]
}

const sec = (ms: number) => `${Math.round(ms / 1000)} s`

/** Le dossier d'une mission qui ne lance rien (promotion en cours, question, écartée). */
function rendreDecision(mission: Mission, decision: Decision, jour: string): string {
  return [
    `# Chantier \`${mission.id}\` — ${jour}`,
    '',
    `Mission de la ronde du ${mission.date} (${mission.sorte}) : ${mission.titre}`,
    '',
    `Décision : **${decision.sorte === 'chantier' ? 'chantier' : decision.motif}**${decision.sorte === 'chantier' && decision.raison ? ` (${decision.raison})` : ''}. ${decision.sorte === 'chantier' ? '' : 'Aucun appel.'}`,
    '',
    '## La mission',
    '',
    missionPourModele(mission),
    '',
  ].join('\n')
}

/** Le dossier d'un chantier (§ 6.3) : chez le client, pour Lionel. */
function rendreDossier(x: {
  mission: Mission
  jour: string
  plan?: PlanChantier
  etapes: Etape[]
  conditions: Condition[]
  constats: Constat[]
  issue: string
  garde?: Garde
  check?: { ok: boolean; sortie: string }
  bloc?: string
  dureeMs?: number
  fusion?: IssueFusion
}): string {
  const total = x.etapes.reduce((t, e) => t + e.cout, 0)
  return [
    `# Chantier \`${x.mission.id}\` — ${x.jour}`,
    '',
    `Issue : **${x.issue}**. Coût : ${dollars(total)} $ (estimé par le binaire)${x.dureeMs !== undefined ? ` ; durée : ${sec(x.dureeMs)}` : ''}.`,
    '',
    '## La mission',
    '',
    `Ronde du ${x.mission.date}, sorte ${x.mission.sorte}.`,
    '',
    missionPourModele(x.mission),
    '',
    '## Le plan',
    '',
    x.plan ? `Faisable : ${x.plan.faisable ? 'oui' : 'non'} — ${x.plan.raison}` : '(aucun)',
    '',
    x.plan?.plan ?? '',
    '',
    '## Les fichiers touchés',
    '',
    ...(x.garde && x.garde.fichiers.length > 0
      ? x.garde.fichiers.map((f) => `- ${f.statut} \`${f.chemin}\``)
      : ['Aucun.']),
    '',
    `Tests ajoutés ou modifiés : ${x.garde?.testsTouches.join(', ') || 'aucun'}.`,
    '',
    '## pnpm check, rejoué par le code',
    '',
    x.check ? `**${x.check.ok ? 'vert' : 'rouge'}**` : 'non lancé',
    '',
    ...(x.check ? ['```', x.check.sortie, '```', ''] : []),
    '## Les constats de relecture',
    '',
    ...(x.constats.length > 0
      ? x.constats.map((k) => `- **${k.niveau}** \`${k.fichier}:${k.ligne}\` : ${k.texte}`)
      : ['Aucun.']),
    '',
    '## Les étapes',
    '',
    '| Étape | Modèle | Issue | Tours | Coût (estimé par le binaire) | Durée |',
    '|---|---|---|---|---|---|',
    ...x.etapes.map(
      (e) =>
        `| ${e.etape} | ${e.modele} | ${e.ok ? 'ok' : `échec : ${e.raison ?? e.sousType ?? '?'}`} | ${e.tours} | ${dollars(e.cout)} $ | ${sec(e.dureeMs)} |`,
    ),
    `| total | | | ${x.etapes.reduce((t, e) => t + e.tours, 0)} | ${dollars(total)} $ | ${x.dureeMs !== undefined ? sec(x.dureeMs) : ''} |`,
    '',
    '## Le bloc du modèle d’implémentation',
    '',
    x.bloc ?? '(aucun)',
    '',
    '## La fusion (PLAN-GENERAL.md G1)',
    '',
    ...(x.conditions.length > 0
      ? x.conditions.map(
          (k) => `- ${k.ok ? 'vert' : '**rouge**'} — ${CONDITIONS[k.id]} : ${k.mesure}`,
        )
      : ['Non tentée.']),
    '',
    x.fusion?.sorte === 'fusionne'
      ? `Fusionné dans \`main\` du clone de la nuit (${x.fusion.fusion.slice(0, 12)}), étiquette \`chantier/${x.mission.id}\`, poussé.`
      : x.fusion?.sorte === 'refuse'
        ? 'Non fusionné : la branche reste.'
        : x.fusion
          ? `Non fusionné : ${x.fusion.raison}`
          : 'Non fusionné.',
    '',
  ].join('\n')
}
