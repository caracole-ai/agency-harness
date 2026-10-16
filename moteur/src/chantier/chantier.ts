import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { type Agence, type Executer, executerSync, preflight } from '../agence/config'
import { schemaJson } from '../conversation/actions'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import type { Domaine } from '../conversation/domaine'
import { preflightSignature } from '../livraison/version'
import { dollars } from '../modele/modele'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  brancher,
  type Commande,
  commandeSync,
  commettre,
  fermerArbre,
  git,
  ouvrirArbre,
  REF_DISTANTE,
  verifierBase,
} from './arbre'
import { envEnfant, type IssueClaude, type Lancer, lancerClaude, lancerProcessus } from './claude'
import { CONDITIONS, type Condition, conclure, type IssueFusion, raisonRefus } from './fusion'
import { casParGesteNouveau, fichierConsignes, type Garde, garderDiff } from './garde'
import {
  coutEcrit,
  ecrireChantier,
  interdits,
  missionsRetirees,
  nettoyer,
  nettoyerLignes,
  pourChantier,
} from './memoire'
import {
  construireCatalogue,
  type Decision,
  decider,
  ecrireStatut,
  lireMission,
  type Mission,
  missionPourModele,
  type StatutChantier,
  TYPE_CHANTIER,
} from './mission'

// Le chantier d'une mission (PLAN-RONDE.md § 6.3, R5 ; PLAN-GENERAL.md G1 ;
// PLAN-LIVRAISON.md L2, L3), à l'agence : décider en code (§ 0.b : retirée,
// geste déjà actif), puis, dans un arbre de travail parti d'`origin/main`, le
// plan (modèle `chantier.plan`, lecture seule, sortie structurée),
// l'implémentation (`chantier.implementation`, bornée par la config), la garde
// du diff, `pnpm check` rejoué par le code, la relecture (`chantier.revue`,
// lecture seule, constats structurés), une reprise au plus sur un `bloquant`,
// le test d'honnêteté (les cas de traduction de chaque geste nouveau, et
// `pnpm evals traduire` avec le modèle du quotidien) ; l'entrée de mémoire, la
// fusion par `fusion.ts` si les huit conditions sont vertes, et dans le
// dossier de sortie `<id>.chantier.md` et `<id>.statut.yaml`. Le chantier ne
// connaît aucun dossier client : ni son journal, ni ses noms ; il se contrôle
// contre les noms du client fictif du métier, les seuls connus à l'agence. Le
// modèle ne reçoit aucune donnée du client : la mission par types (R3), la
// mémoire sans nom ; la fuite se mesure avant tout appel. Les modèles passent
// par le binaire `claude` (§ 0.a) : coût estimé par le binaire.

export { TYPE_CHANTIER }
/** Le dossier d'un chantier, dans le dossier de sortie : `<id>.chantier.md`. */
export const SUFFIXE_DOSSIER = '.chantier.md'
export const FICHIER_METHODE = join('methode', 'chantier.md')
/** La carte du harnais : `methode/chantier.md` demande aux modèles du chantier de la lire. */
export const FICHIER_CARTE = join('methode', 'architecture-pour-modeles.md')
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

/** La condition 4 d'une mission dont le métier n'a pas de client d'évals dans `agence.yaml` (PLAN-METIER-2.md M9). */
export const AUCUN_CLIENT_EVALS = "aucun client d'évals pour ce métier"

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
  /** Le dépôt de l'agence (L2) : la base des arbres de travail ; il peut être l'arbre d'un humain, rien n'y bouge. */
  racine: string
  agence: Agence
  /** `<client>/missions/<date>/<id>.yaml` */
  mission: string
  /** Le client de la mission, en slug : la mémoire ne cite que lui (L3). */
  client: string
  /** Les noms que rien ne doit citer : ceux du client fictif du métier de la mission (L3). */
  personnes: Designable[]
  /** Où écrire `<id>.chantier.md` et `<id>.statut.yaml` (L7). */
  sortie: string
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
 * branche existe dans le dépôt de base) ne se refait pas sans `refaire`.
 */
export async function faireChantier<S>(
  m: MetierConversation<S>,
  o: OptionsChantier,
): Promise<IssueChantier> {
  const debut = Date.now()
  const { mission } = lireMission(o.mission)
  const c = o.commande ?? commandeSync
  const lancer = o.lancer ?? lancerProcessus
  const executer = o.executer ?? executerSync
  const maintenant = o.maintenant ?? Temporal.Now.zonedDateTimeISO(FUSEAU)
  const jour = maintenant.toPlainDate().toString()
  const ch = o.agence.chantier
  const modeles = o.agence.modeles.chantier
  const personnes = o.personnes
  // Sans modèle, le dossier s'écrit à côté : jamais par-dessus celui d'un chantier fait.
  const dossier = join(
    o.sortie,
    `${mission.id}${o.sansModele ? '.sans-modele' : ''}${SUFFIXE_DOSSIER}`,
  )
  mkdirSync(o.sortie, { recursive: true })
  const catalogue = construireCatalogue(m, [])
  const missionTexte = missionPourModele(mission, m.domaine)

  /** Le statut que lira le client (L7) ; sans modèle, aucun : rien n'a été tenté. */
  const statuer = (statut: StatutChantier, issue: string, cout: number, version?: string) => {
    if (o.sansModele) return
    ecrireStatut(o.sortie, mission.id, {
      statut,
      issue,
      ...(version ? { version } : {}),
      cout_usd: round(cout),
      le: maintenant.toInstant().toString(),
    })
  }
  const ecarter = (decision: Exclude<Decision, { sorte: 'chantier' }>): IssueChantier => {
    writeFileSync(dossier, rendreDecision(mission, decision, jour, m.domaine))
    statuer('écartée', decision.motif, 0)
    return { sorte: 'decision', decision, dossier }
  }
  const refuserFuite = (fuite: string[]): IssueChantier => {
    writeFileSync(
      dossier,
      rendreDecision(mission, { sorte: 'ecartee', motif: ISSUES_CHANTIER.fuite }, jour, m.domaine),
    )
    statuer('écartée', ISSUES_CHANTIER.fuite, 0)
    return { sorte: 'fuite', fuite, dossier }
  }
  /** Ce que le plan lit de la mémoire de ce dépôt, et le texte qui part au modèle. */
  const lireMemoire = (racineMemoire: string) => {
    const memoire = pourChantier(
      racineMemoire,
      [mission.id, ...mission.intentions],
      ch.memoire_index_lignes,
    )
    const texte = [
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
    return { memoire, texte }
  }
  const promptPlan = (memoireTexte: string) =>
    [
      "Planifie ce chantier. Tu lis le dépôt, tu n'écris rien.",
      '',
      '## La mission',
      '',
      missionTexte,
      '',
      '## La mémoire des chantiers',
      '',
      memoireTexte,
      '',
      'Rends `faisable`, `raison` et `plan` au schéma donné.',
    ].join('\n')

  // Sans git d'abord : la décision sur ce que la racine sait, et la mission relue contre les noms.
  const premiere = decider(mission, catalogue, missionsRetirees(o.racine))
  if (premiere.sorte !== 'chantier') return ecarter(premiere)
  const fuiteMission = interdits(missionTexte, personnes)
  if (fuiteMission.length > 0) return refuserFuite(fuiteMission)

  if (o.sansModele) {
    const { texte } = lireMemoire(o.racine)
    const fuite = interdits(texte, personnes)
    if (fuite.length > 0) return refuserFuite(fuite)
    writeFileSync(
      dossier,
      [
        rendreDecision(mission, premiere, jour, m.domaine),
        '## Ce que le plan recevrait (sans modèle : aucun appel)',
        '',
        promptPlan(texte),
        '',
      ].join('\n'),
    )
    return { sorte: 'sans_modele', decision: premiere, dossier }
  }

  // Le préflight de l'accès (§ 0.a), puis la base et `origin/main` frais (L2), avant toute branche.
  for (const r of [modeles.plan, modeles.implementation, modeles.revue]) {
    if (r.acces !== 'claude')
      throw new Error(
        `chantier : ${r.modele} sous acces: ${r.acces}, seul le binaire claude sait coder`,
      )
  }
  preflight('claude', o.agence, o.env, executer)
  // La clé de signature (L4) : une fusion pose sa version ; sans clé, rien ne commence.
  const cle = preflightSignature(o.env, o.racine, executer)
  verifierBase(c, o.racine)
  const arbre = ouvrirArbre(c, o.racine, mission.id, o.refaire === true)
  if (arbre.sorte === 'deja_tentee') return { sorte: 'deja_tentee', dossier }
  const cwd = arbre.chemin

  // Les retraits et la mémoire d'`origin/main`, que la racine peut ne pas encore avoir (G2 : jamais
  // refaite), lus avant que la branche existe : une mission écartée ici ne laisse rien.
  const decision = decider(mission, catalogue, missionsRetirees(cwd))
  if (decision.sorte !== 'chantier') {
    fermerArbre(c, o.racine, mission.id)
    return ecarter(decision)
  }
  const { memoire, texte: memoireTexte } = lireMemoire(cwd)
  const fuite = interdits(memoireTexte, personnes)
  if (fuite.length > 0) {
    fermerArbre(c, o.racine, mission.id)
    return refuserFuite(fuite)
  }

  const etapes: Etape[] = []
  const conditions: Condition[] = []
  let constats: Constat[] = []
  let plan: PlanChantier | undefined
  let texteImplementation = ''
  let garde: Garde | undefined
  let check: { ok: boolean; sortie: string } | undefined
  /** Le commit sur lequel la dernière garde a porté : lui seul se fusionne. */
  let gardee: string | undefined
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
  const pnpm = (args: string[]) => c(cwd, 'pnpm', args, envEnfant(o.env))
  const verifier = () => {
    gardee = git(c, cwd, ['rev-parse', 'HEAD']).trim()
    garde = garderDiff(c, cwd, ch, personnes, mission.metier)
    const r = pnpm(['check'])
    check = { ok: r.code === 0, sortie: fin(`${r.sortie}\n${r.erreur}`, 15) }
  }
  const relire = async (etape: 'relecture' | 'relecture après reprise') => {
    const r = await appeler(
      etape,
      modeles.revue,
      [
        `Relis la branche de ce chantier (\`git diff ${REF_DISTANTE}...HEAD\`). Tu n'écris rien.`,
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
    if (!arbre.branche) brancher(c, cwd, mission.id)
    // L'arbre a ses propres dépendances : `pnpm check` y tourne.
    const installe = pnpm(['install', '--frozen-lockfile', '--prefer-offline'])
    if (installe.code !== 0) {
      throw new Error(`pnpm install dans l'arbre : ${fin(installe.erreur || installe.sortie, 5)}`)
    }

    const rPlan = await appeler(
      'plan',
      modeles.plan,
      promptPlan(memoireTexte),
      ch.outils_lecture,
      PlanChantier,
    )
    const luPlan = rPlan.ok ? PlanChantier.safeParse(rPlan.sortie) : undefined
    if (!luPlan?.success) throw new Error(`plan échoué : ${rPlan.raison ?? 'sortie hors schéma'}`)
    plan = luPlan.data
    if (!plan.faisable) {
      const motif = `question pour l'atelier : ${nettoyer(plan.raison, personnes)}`
      writeFileSync(
        dossier,
        rendreDossier({
          mission,
          domaine: m.domaine,
          jour,
          plan,
          etapes,
          conditions,
          constats,
          issue: motif,
        }),
      )
      statuer('écartée', motif, cout())
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
      `Pour chaque geste nouveau : trois cas de traduction au moins dans \`${fichierConsignes(mission.metier)}\`, un test par règle d'exécution. Lance \`pnpm check\` jusqu'au vert. Finis par les trois sections : « ## Vérifié », « ## Non vérifié, risque », « ## Ce que j'ai appris ».`,
    ].join('\n')
    const rImpl = await appeler(
      'implémentation',
      modeles.implementation,
      consignesImpl,
      ch.outils_autorises,
    )
    texteImplementation = rImpl.texte
    const titre = nettoyer(mission.titre, personnes)
    commettre(c, cwd, `Chantier ${mission.id} : ${titre}`, coauteur(modeles.implementation.modele))
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

    // Le code du modèle a tourné après la garde (pnpm check) : l'arbre doit être encore le commit
    // gardé, sans rien de plus ; sinon rien ne se mesure ni ne se fusionne.
    const bouge = arbreBouge(c, cwd, gardee)
    if (garde?.chemins.ok && !bouge && check?.ok && relu && bloquantsRestants === 0) {
      honnetete = mesurerHonnetete(c, cwd, o.env, mission.metier, ch.evals_clients[mission.metier])
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
        ok: garde?.chemins.ok === true && !bouge,
        mesure: bouge
          ? bouge
          : garde
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
      racine: o.racine,
      id: mission.id,
      titre,
      commit: gardee,
      conditions,
      personnes,
      version: { cle, jour, client: o.client },
      ecrireEntree: (arbreFusion, sorte, issueMemoire) =>
        ecrireChantier(
          arbreFusion,
          {
            date: jour,
            client: o.client,
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
    // La huitième, toujours au dossier : rouge si c'est elle qui refuse, sinon l'entrée écrite.
    conditions.push(
      fusion.sorte === 'echec'
        ? { id: 'memoire', ok: false, mesure: 'non écrite' }
        : (fusion.sorte === 'refuse' && fusion.rouges.find((r) => r.id === 'memoire')) || {
            id: 'memoire',
            ok: true,
            mesure: `écrite : ${fusion.memoire}`,
          },
    )
  } catch (erreur) {
    issue = `${ISSUES_CHANTIER.echoue} : ${(erreur as Error).message.slice(0, 300)}`
  } finally {
    fermerArbre(c, o.racine, mission.id)
  }

  const dureeMs = Date.now() - debut
  writeFileSync(
    dossier,
    rendreDossier({
      mission,
      domaine: m.domaine,
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
  statuer(
    fusion?.sorte === 'fusionne'
      ? ISSUES_CHANTIER.fusionne
      : fusion?.sorte === 'refuse'
        ? ISSUES_CHANTIER.refuse
        : ISSUES_CHANTIER.echoue,
    issue,
    cout(),
    fusion?.sorte === 'fusionne' ? fusion.version : undefined,
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
}

const round = (x: number) => Math.round(x * 1_000_000) / 1_000_000

/**
 * Condition 4 de G1 : au moins trois cas de traduction par geste nouveau,
 * puis `pnpm evals traduire` dans l'arbre, sur le client des évals du métier
 * de la mission (PLAN-METIER-2.md M9 ; aucun : refus), avec le modèle du
 * quotidien (la clé que nomme sa config) : sa dernière ligne porte le compte
 * et le seuil, le taux décide.
 */
/**
 * L'arbre a-t-il bougé depuis la garde (le code du modèle tourne dans `pnpm
 * check`) : un commit de plus, ou un fichier changé, ajouté ou retiré sans
 * être commis. Rend ce qui a bougé, en mots, ou undefined.
 */
function arbreBouge(c: Commande, arbre: string, gardee: string | undefined): string | undefined {
  if (!gardee) return undefined
  const tete = git(c, arbre, ['rev-parse', 'HEAD']).trim()
  if (tete !== gardee) {
    return `l'arbre a bougé après la garde (${gardee.slice(0, 12)} → ${tete.slice(0, 12)}) : rien ne se fusionne`
  }
  const sale = git(c, arbre, ['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter((l) => l.trim().length > 0)
  return sale.length > 0
    ? `l'arbre a changé après la garde (${sale.length} fichier(s) hors du commit gardé) : rien ne se fusionne`
    : undefined
}

function mesurerHonnetete(
  c: Commande,
  arbre: string,
  env: Record<string, string | undefined>,
  metier: string,
  client: string | undefined,
): { ok: boolean; mesure: string } {
  if (client === undefined) {
    return { ok: false, mesure: `${AUCUN_CLIENT_EVALS} (${metier})` }
  }
  const nouveaux = casParGesteNouveau(c, arbre, metier)
  const courts = nouveaux.filter((g) => g.cas < 3)
  const gestes =
    nouveaux.length === 0
      ? 'aucun geste nouveau'
      : nouveaux.map((g) => `${g.geste} : ${g.cas} cas`).join(', ')
  if (courts.length > 0) return { ok: false, mesure: `${gestes} (trois au moins)` }
  const r = c(arbre, 'pnpm', ['evals', 'traduire', '--client', client], envEnfant(env))
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
  // Les cas en écart, nommés : les traces partent avec l'arbre, l'analyse d'erreurs en a besoin.
  const ecarts = [...`${r.sortie}`.matchAll(/^(\S+) : écart/gm)].map((x) => x[1])
  // Au seuil : le taux seul décide ; la fuite se dit, elle
  // vient du niveau 2 de la désignation, hors du chantier (point laissé à Lionel).
  return {
    ok: Number(total) > 0 && Number(ok) / Number(total) >= Number(seuil) / 100,
    mesure: `${gestes} ; pnpm evals traduire : ${ok}/${total} (${taux} %, seuil ${seuil} %), fuite ${fuite}${ecarts.length > 0 ? ` ; en écart : ${ecarts.join(', ')}` : ''}`,
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

/** Le dossier d'une mission qui ne lance rien (écartée). */
function rendreDecision(
  mission: Mission,
  decision: Decision,
  jour: string,
  domaine: Domaine,
): string {
  return [
    `# Chantier \`${mission.id}\` — ${jour}`,
    '',
    `Mission commandée le ${mission.date} (${mission.sorte}) : ${mission.titre}`,
    '',
    `Décision : **${decision.sorte === 'chantier' ? 'chantier' : decision.motif}**. ${decision.sorte === 'chantier' ? '' : 'Aucun appel.'}`,
    '',
    '## La mission',
    '',
    missionPourModele(mission, domaine),
    '',
  ].join('\n')
}

/** Le dossier d'un chantier (§ 6.3) : dans le dossier de sortie, pour Lionel et pour le client (L7). */
function rendreDossier(x: {
  mission: Mission
  domaine: Domaine
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
    `Commandée le ${x.mission.date}, sorte ${x.mission.sorte}.`,
    '',
    missionPourModele(x.mission, x.domaine),
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
      ? `Fusionné dans \`main\` du distant (${x.fusion.fusion.slice(0, 12)}), étiquette \`chantier/${x.mission.id}\`${x.fusion.version ? `, version \`${x.fusion.version}\`` : ''}, poussé.`
      : x.fusion?.sorte === 'refuse'
        ? 'Non fusionné : la branche reste.'
        : x.fusion
          ? `Non fusionné : ${x.fusion.raison}`
          : 'Non fusionné.',
    '',
  ].join('\n')
}
