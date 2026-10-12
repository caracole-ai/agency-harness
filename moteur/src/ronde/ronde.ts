import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { type Agence, preflight, prixAgence } from '../agence/config'
import { lancerClaude } from '../chantier/claude'
import { ecrireRonde, type MemoirePourRonde, pourRonde } from '../chantier/memoire'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { MetierConversation } from '../conversation/conversation'
import type { Designable } from '../conversation/designation'
import { FRONTIERE } from '../conversation/traduire'
import { CONTROLE_OK } from '../echappee/boucle'
import { TYPE_ECHAPPEE } from '../echappee/echappee'
import { fuites } from '../echappee/pseudonymes'
import { lireFichiersGestes } from '../gestes/charger'
import { ecritDe, gesteDe } from '../gestes/geste-appris'
import type { Journal, Ligne } from '../journal/journal'
import { modeleAnthropic } from '../modele/anthropic'
import { cout } from '../modele/modele'
import { dollars, suiteDe, TYPE_PROMOTION } from '../promotion/promotion'
import { FUSEAU, Temporal } from '../temps/temporal'
import {
  type MissionRevalidee,
  memesIntentions,
  OUTIL_RAPPORT,
  outilRapport,
  type RapportDeRonde,
  type Revalidation,
  revalider,
  STATUTS_MISSION,
  schemaJsonRapport,
  schemaRapport,
} from './rapport'
import {
  A_L_ATELIER,
  type Catalogue,
  jourDe,
  PROMOTION_EN_COURS,
  type Resume,
  resumerJournal,
} from './resume'

// La ronde de nuit (PLAN-RONDE.md § 5.3, R2 à R4 ; § 0.a) : un appel par
// nuit et par client, au modèle `ronde` d'`agence.yaml`, qui lit le résumé du
// journal fait en code, le catalogue, la carte et la mémoire, et rend un
// rapport au schéma strict ; une relance sur un échec de forme ; le code
// revalide (R3). Le rapport s'écrit chez le client (`rondes/<date>.md`,
// `.json`, une mission par fichier), la ligne `ronde` au journal ne porte que
// des comptes, la mémoire du dépôt reçoit la ronde sans aucun identifiant ni
// donnée. Rien ne part si un nom partirait (la fuite se mesure avant l'appel).
// Le coût est celui de l'agence : aucune ligne `appel_modele`, il ne compte
// pas dans le plafond du client.

export const TYPE_RONDE = 'ronde'
export const DOSSIER_RONDES = 'rondes'
export const FICHIER_CARTE = join('methode', 'architecture-pour-modeles.md')

/** Les issues d'une ronde, telles que le journal et la mémoire les disent. */
export const ISSUES_RONDE = {
  faite: 'faite',
  rien: 'rien à signaler',
  refusee: 'rapport refusé',
  echouee: 'ronde échouée',
  fuite: 'refusée avant tout appel : un nom partirait',
} as const

const donnees = (l: Ligne): Record<string, unknown> => {
  if (!l.donnees) return {}
  const d: unknown = JSON.parse(l.donnees)
  return typeof d === 'object' && d !== null && !Array.isArray(d)
    ? (d as Record<string, unknown>)
    : {}
}

/** Une mission écrite par une ronde (`rondes/<date>/<id>.yaml`), telle que le catalogue la relit. */
const MissionEcrite = z.looseObject({
  id: z.string(),
  sorte: z.string(),
  date: z.string(),
  statut: z.string(),
  intentions: z.array(z.string()).default([]),
})

/** Les missions déjà écrites par les rondes du client (toutes dates), sauf les écartées. */
function missionsOuvertes(dossierClient: string): Catalogue['missions_ouvertes'] {
  const racine = join(dossierClient, DOSSIER_RONDES)
  if (!existsSync(racine)) return []
  return readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(racine, d.name))
        .filter((f) => f.endsWith('.yaml'))
        .flatMap((f) => {
          const lu = MissionEcrite.safeParse(parse(readFileSync(join(racine, d.name, f), 'utf8')))
          return lu.success && lu.data.statut !== STATUTS_MISSION.ecartee
            ? [
                {
                  id: lu.data.id,
                  sorte: lu.data.sorte,
                  date: lu.data.date,
                  statut: lu.data.statut,
                  intentions: lu.data.intentions,
                },
              ]
            : []
        }),
    )
}

/**
 * Le catalogue (R2) : gestes codés, gestes appris, intentions avec leur état
 * de promotion (§ 0.b) au jour `au`, missions déjà ouvertes. L'état se lit dans
 * le journal jusqu'à `au` inclus : au seuil (échappées finies proprement sur
 * la fenêtre de la promotion) ou déjà proposée, « promotion en cours » ; la
 * dernière fabrication échouée ou écartée, « à coder à l'atelier ».
 */
export function construireCatalogue<S>(
  m: MetierConversation<S>,
  dossierClient: string,
  journal: Journal,
  promotion: { occurrences: number; jours: number },
  au: Temporal.PlainDate,
): Catalogue {
  const lignes = journal
    .lire()
    .filter((l) => Temporal.PlainDate.compare(jourDe(l.horodatage), au) <= 0)
  const debut = au.subtract({ days: promotion.jours - 1 })
  const propres = new Map<string, number>()
  for (const l of lignes) {
    if (l.type !== TYPE_ECHAPPEE || l.objet === null) continue
    if (Temporal.PlainDate.compare(jourDe(l.horodatage), debut) < 0) continue
    const d = donnees(l)
    if (typeof d.intention !== 'string') continue
    const propre =
      l.issue === 'reponse'
        ? d.controle_reponse === undefined || d.controle_reponse === CONTROLE_OK
        : l.issue === 'proposition' && suiteDe(lignes, l.objet) !== 'non validée'
    if (propre) propres.set(d.intention, (propres.get(d.intention) ?? 0) + 1)
  }
  const derniere = new Map<string, Record<string, unknown>>()
  for (const l of lignes) {
    if (l.type === TYPE_PROMOTION && l.objet !== null) derniere.set(l.objet, donnees(l))
  }
  const appris = lireFichiersGestes(dossierClient).flatMap((f) =>
    f.contenu
      ? [
          {
            id: f.contenu.id,
            description: f.contenu.description,
            ecrit: ecritDe(gesteDe(f.contenu)),
            statut: f.contenu.statut,
          },
        ]
      : [],
  )
  const actifs = new Set(appris.filter((a) => a.statut === 'actif').map((a) => a.id))
  return {
    gestes: m.actions.map((a) => ({
      id: a.id,
      description: a.description,
      ecrit: a.ecrit,
      roles: a.roles,
    })),
    appris,
    intentions: m.intentions.map((i) => {
      const fabrication = derniere.get(i.id)?.fabrication as
        | { sorte?: unknown; injoignable?: unknown }
        | undefined
      const echouee =
        (fabrication?.sorte === 'echec' && fabrication.injoignable !== true) ||
        fabrication?.sorte === 'ecarts'
      const auSeuil = (propres.get(i.id) ?? 0) >= promotion.occurrences || derniere.has(i.id)
      return {
        id: i.id,
        description: i.description,
        ecrit: i.ecrit,
        ...(echouee
          ? { promotion: A_L_ATELIER }
          : auSeuil
            ? { promotion: PROMOTION_EN_COURS }
            : {}),
        ...(actifs.has(i.id) ? { geste_actif: true as const } : {}),
      }
    }),
    missions_ouvertes: missionsOuvertes(dossierClient),
  }
}

/** Le système de la ronde (§ 5.3) : le rôle, la carte, le catalogue, les sortes, la frontière. */
export function systemeRonde(carte: string, catalogue: Catalogue, missionsMax: number): string {
  const liste = <T>(titre: string, xs: T[], ligne: (x: T) => string) => [
    `### ${titre}`,
    '',
    ...(xs.length > 0 ? xs.map((x) => `- ${ligne(x)}`) : ['- aucun']),
    '',
  ]
  return [
    "Tu fais la ronde de nuit d'un outil de planning, pour une entreprise du métier décrit plus bas.",
    "Tu lis ce qui a été demandé à l'outil dans la journée et comment chaque demande a fini, puis tu désignes ce qui manque au catalogue : des missions pour un chantier de code.",
    'Tu désignes, tu ne codes pas. Tu ne lis aucune donnée : les consignes que tu lis sont celles que le modèle du quotidien a lues, un identifiant (A-7) à la place de chaque nom.',
    '',
    `Rends un seul rapport (\`${OUTIL_RAPPORT}\`), au schéma donné, et rien d'autre. Au plus ${missionsMax} missions. Si rien ne mérite une mission, \`rien_a_signaler\` vrai et aucune mission.`,
    "Une mission cite les identifiants d'échappées (E-…) du résumé qui la justifient, les intentions concernées (du catalogue, ou un slug neuf), et des consignes-types écrites avec des places entre chevrons (<agent>, <du>, <au>, <site>, <vacation>) : jamais un identifiant ni un nom.",
    "N'écris aucune mission pour une intention marquée « promotion en cours » ou qui a un geste actif, ni une mission déjà ouverte ou retirée. Une intention « à coder à l'atelier » mérite une mission `geste_code`.",
    '',
    FRONTIERE,
    '',
    '## La carte du harnais',
    '',
    carte.trim(),
    '',
    '## Le catalogue de ce client',
    '',
    ...liste(
      'Gestes codés',
      catalogue.gestes,
      (g) => `\`${g.id}\`${g.ecrit ? ' (écrit)' : ''} : ${g.description}`,
    ),
    ...liste(
      'Gestes appris',
      catalogue.appris,
      (g) => `\`${g.id}\` (${g.statut}${g.ecrit ? ', écrit' : ''}) : ${g.description}`,
    ),
    ...liste(
      'Intentions connues (demandes nouvelles)',
      catalogue.intentions,
      (i) =>
        `\`${i.id}\`${i.ecrit ? ' (écrit)' : ''} : ${i.description}${i.promotion ? ` — ${i.promotion}` : ''}${i.geste_actif ? ' — geste actif' : ''}`,
    ),
    ...liste(
      'Missions déjà ouvertes',
      catalogue.missions_ouvertes,
      (m) =>
        `\`${m.id}\` (${m.sorte}, ${m.date}, intentions : ${m.intentions.join(', ') || 'aucune'}) : ${m.statut}`,
    ),
  ].join('\n')
}

/** Le message : le résumé et la mémoire, entre `<donnees>`. */
export function messageRonde(resume: Resume, memoire: MemoirePourRonde): string {
  const { retirees, ...lue } = memoire
  return [
    'Voici le résumé du journal de la fenêtre, les comptes, et la mémoire des nuits précédentes de ce client.',
    '<donnees>',
    JSON.stringify({ resume, memoire: { ...lue, missions_retirees: retirees } }, null, 1),
    '</donnees>',
  ].join('\n')
}

/** Un appel de la ronde : la sortie structurée, ou pourquoi elle manque ; le coût, estimé par le binaire ou compté. */
export interface ReponseRonde {
  ok: boolean
  sortie?: unknown
  raison?: string
  cout_usd: number
  /** true : rapporté par le binaire `claude` (§ 0.a), une estimation. */
  estime: boolean
}
export type AppelRonde = (systeme: string, message: string) => Promise<ReponseRonde>

/**
 * L'appel selon l'accès d'`agence.yaml` (§ 0.a) : `claude`, par le binaire,
 * isolé (ni réglages, ni hooks, ni `CLAUDE.md`, ni outil), dans un dossier
 * vide ; `anthropic`, par la couche modèle avec l'outil. Le préflight passe
 * avant tout appel.
 */
export function appelRonde(agence: Agence, env: Record<string, string | undefined>): AppelRonde {
  const r = agence.modeles.ronde
  const missionsMax = agence.ronde.missions_max
  const delaiMs = agence.ronde.delai_secondes * 1000
  if (r.acces === 'claude') {
    return async (systeme, message) => {
      const vide = mkdtempSync(join(tmpdir(), 'ronde-'))
      try {
        const issue = await lancerClaude(
          {
            modele: r.modele,
            effort: r.effort,
            prompt: message,
            systeme,
            outils: [],
            cwd: vide,
            schemaJson: schemaJsonRapport(missionsMax),
            delaiMs,
            reglages: 'aucun',
          },
          agence,
          env,
        )
        return {
          ok: issue.ok,
          ...(issue.sortie !== undefined ? { sortie: issue.sortie } : {}),
          ...(issue.raison !== undefined ? { raison: issue.raison } : {}),
          cout_usd: issue.cout,
          estime: true,
        }
      } finally {
        rmSync(vide, { recursive: true, force: true })
      }
    }
  }
  const { cle } = preflight('anthropic', agence, env)
  const modele = modeleAnthropic(r.modele, cle ?? '', undefined, delaiMs)
  const prix = prixAgence(agence, r.modele)
  return async (systeme, message) => {
    const reponse = await modele.appeler({
      systeme,
      messages: [{ role: 'user', content: message }],
      outils: [outilRapport(missionsMax)],
      effort: r.effort,
      maxTokens: agence.ronde.tokens_sortie,
      unSeulOutil: true,
    })
    const blocs = reponse.message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === OUTIL_RAPPORT,
    )
    const cout_usd = cout(reponse.usage, prix)
    if (blocs.length !== 1) {
      return {
        ok: false,
        raison: `${blocs.length} appel(s) de ${OUTIL_RAPPORT}, un attendu`,
        cout_usd,
        estime: false,
      }
    }
    return { ok: true, sortie: blocs[0]?.input, cout_usd, estime: false }
  }
}

export interface OptionsRonde {
  /** La racine du dépôt : la carte et la mémoire. */
  racine: string
  dossierClient: string
  date: Temporal.PlainDate
  /** Le premier jour de la fenêtre (`--depuis`) ; sinon la date seule. */
  depuis?: Temporal.PlainDate
  refaire?: boolean
  sansModele?: boolean
  agence: Agence
  /** L'appel (absent : celui de l'accès d'`agence.yaml`) ; les tests le simulent. */
  appel?: AppelRonde
  env: Record<string, string | undefined>
  /** false : `memoire/` n'est ni lue ni écrite (les évals ne dépendent que de leur journal fixé). */
  memoire?: boolean
  /** L'horodatage de la ligne au journal ; sinon l'heure réelle. */
  maintenant?: Temporal.ZonedDateTime
}

export type IssueRonde =
  | { sorte: 'deja_faite'; fichier: string }
  | { sorte: 'sans_modele'; fichier: string; resume: Resume; catalogue: Catalogue }
  | {
      sorte: 'faite'
      issue: string
      fichier: string
      json: string
      missions: MissionRevalidee[]
      ecarts?: string[]
      raison?: string
      cout_usd: number
      estime: boolean
      /** Les noms qui seraient partis (vide : aucun ; non vide : rien n'est parti). */
      fuite: string[]
      resume: Resume
      catalogue: Catalogue
      systeme: string
      message: string
      rapport?: RapportDeRonde
    }

const usd = (x: number) => Math.round(x * 1_000_000) / 1_000_000

/** Un rapport lisible par Lionel : ce qui est parti, ce qui est revenu, ce que le code en a fait. */
function rendreMd(
  date: string,
  resume: Resume,
  catalogue: Catalogue,
  r?: Omit<
    Extract<IssueRonde, { sorte: 'faite' }>,
    'sorte' | 'fichier' | 'json' | 'resume' | 'catalogue' | 'systeme' | 'message'
  >,
): string {
  const c = resume.comptes
  const devenue = (d: Resume['demandes'][number]) => {
    const v = d.devenue
    switch (v.sorte) {
      case 'geste':
        return `geste \`${v.geste}\` (${Object.entries(v.parametres)
          .map(([k, x]) => `${k}: ${x}`)
          .join(', ')})${v.refuse ? ', refusé' : ''}`
      case 'demande_nouvelle':
        return `demande nouvelle \`${v.intention}\` (${v.echappee}) : ${v.fin}${v.controle ? `, ${v.controle}` : ''}${v.suite ? `, ${v.suite}` : ''}${v.abandon ? `, ${v.abandon}` : ''} ; ${v.tours} tours, ${dollars(v.cout_usd)} $`
      case 'je_ne_sais_pas':
        return '« je ne sais pas faire ça »'
      case 'refus':
        return 'refus'
    }
  }
  return [
    `# Ronde du ${date}`,
    '',
    `Fenêtre : du ${resume.fenetre.du} au ${resume.fenetre.au} ; ${resume.conversations} conversation(s), ${resume.demandes.length} demande(s)${resume.non_montrees > 0 ? `, dont ${resume.non_montrees} comptée(s) sans être montrée(s)` : ''}.`,
    '',
    ...(r
      ? [
          `Issue : **${r.issue}**${r.raison ? ` (${r.raison})` : ''}. Coût : ${dollars(r.cout_usd)} $${r.estime ? ' (estimé par le binaire)' : ''}. Fuite : ${r.fuite.length === 0 ? '0' : r.fuite.join(', ')}.`,
          '',
          ...(r.ecarts && r.ecarts.length > 0
            ? ['## Écarts (rapport refusé)', '', ...r.ecarts.map((e) => `- ${e}`), '']
            : []),
          '## Observations',
          '',
          ...((r.rapport?.observations ?? []).length > 0
            ? (r.rapport?.observations ?? []).map((o) => `- ${o}`)
            : ['Aucune.']),
          '',
          '## Missions',
          '',
          ...(r.missions.length === 0
            ? ['Aucune.', '']
            : r.missions.flatMap((m) => [
                `### \`${m.mission.id}\` — ${m.mission.titre}`,
                '',
                `Sorte : ${m.mission.sorte} ; statut : **${m.statut}**${m.raison ? ` (${m.raison})` : ''} ; écrit : ${m.mission.ecrit ? 'oui' : 'non'} ; estimation : ${m.mission.estimation}.`,
                '',
                m.mission.pourquoi,
                '',
                `Échappées : ${m.mission.echappees.join(', ') || 'aucune'} ; intentions : ${m.mission.intentions.join(', ') || 'aucune'}.`,
                '',
                ...m.mission.consignes_types.map((t) => `- « ${t} »`),
                '',
              ])),
        ]
      : [
          'Sans modèle : le résumé et le catalogue seuls, ce que la ronde lirait. Aucun appel.',
          '',
        ]),
    '## Ce que la ronde lit : les demandes de la fenêtre',
    '',
    ...(resume.demandes.length === 0
      ? ['Aucune.']
      : resume.demandes.map(
          (d) =>
            `- ${d.jour}, ${d.role}${d.consigne ? ` : « ${d.consigne} »` : ''} → ${devenue(d)}${d.precisions > 0 ? ` ; ${d.precisions} précision(s)` : ''}`,
        )),
    '',
    `## Comptes sur ${c.jours} jours`,
    '',
    '| Intention | Échappées | Réponses ok | Propositions validées | Abandons |',
    '|---|---|---|---|---|',
    ...c.par_intention.map(
      (i) =>
        `| ${i.intention} | ${i.echappees} | ${i.reponses_ok} | ${i.propositions_validees} | ${i.abandons} |`,
    ),
    '',
    `Gestes : ${c.par_geste.map((g) => `${g.geste} ${g.fois}${g.refus > 0 ? ` (${g.refus} refus)` : ''}`).join(', ') || 'aucun'}. Abandons : ${c.abandons_par_motif.map((a) => `${a.motif} ${a.fois}`).join(', ') || 'aucun'}. « Je ne sais pas » : ${c.je_ne_sais_pas}. Refus : ${c.refus}. Précisions : ${c.precisions}. Plafond du mois ${c.plafond.mois} : ${dollars(c.plafond.usd)} $ sur ${dollars(c.plafond.plafond_usd)} $.`,
    '',
    '## Le catalogue',
    '',
    ...catalogue.intentions.map(
      (i) =>
        `- intention \`${i.id}\`${i.promotion ? ` : ${i.promotion}` : ''}${i.geste_actif ? ' : geste actif' : ''}`,
    ),
    ...catalogue.appris.map((a) => `- geste appris \`${a.id}\` : ${a.statut}`),
    ...catalogue.missions_ouvertes.map(
      (m) => `- mission ouverte \`${m.id}\` (${m.date}) : ${m.statut}`,
    ),
    '',
  ].join('\n')
}

/** Le `.json` d'une ronde dit-il « ronde échouée » ? */
function rondeEchouee(json: string): boolean {
  const lu = z.looseObject({ issue: z.string() }).safeParse(JSON.parse(readFileSync(json, 'utf8')))
  return lu.success && lu.data.issue === ISSUES_RONDE.echouee
}

/** Lit le schéma ; une faute se dit en une phrase, pour la relance. */
function lireRapport(
  sortie: unknown,
  missionsMax: number,
): { rapport?: RapportDeRonde; faute?: string } {
  const lu = schemaRapport(missionsMax).safeParse(sortie)
  return lu.success ? { rapport: lu.data } : { faute: z.prettifyError(lu.error).slice(0, 1000) }
}

/**
 * La ronde d'un client pour une date (§ 5.3). Idempotente : `rondes/<date>.json`
 * existe → rien, sauf `refaire` (qui efface d'abord les missions de cette
 * date). `sansModele` : le `.md` seul, résumé et catalogue, aucun appel ni
 * ligne au journal.
 */
export async function faireRonde<S>(
  m: MetierConversation<S>,
  o: OptionsRonde,
): Promise<IssueRonde> {
  const date = o.date.toString()
  const dossier = join(o.dossierClient, DOSSIER_RONDES)
  const fichier = join(dossier, `${date}.md`)
  const json = join(dossier, `${date}.json`)
  // Une ronde échouée (panne, délai, préflight) n'est pas « faite » : relancée, elle se refait.
  if (!o.sansModele && existsSync(json) && !o.refaire && !rondeEchouee(json)) {
    return { sorte: 'deja_faite', fichier: json }
  }

  const s = m.ouvrir(o.dossierClient)
  try {
    const config = m.config(s)
    const journal = m.journal(s)
    const client = m.client(s)
    const personnes: Designable[] = m.noms(s)
    const resume = resumerJournal(journal, { du: o.depuis ?? o.date, au: o.date }, personnes, {
      jours: o.agence.ronde.comptes_jours,
      plafondMoisUsd: config.plafonds.par_mois_usd,
    })
    mkdirSync(dossier, { recursive: true })
    if (o.sansModele) {
      const catalogue = construireCatalogue(m, o.dossierClient, journal, config.promotion, o.date)
      writeFileSync(fichier, rendreMd(date, resume, catalogue))
      return { sorte: 'sans_modele', fichier, resume, catalogue }
    }
    const dossierMissions = join(dossier, date)
    if (o.refaire) rmSync(dossierMissions, { recursive: true, force: true })
    const catalogue = construireCatalogue(m, o.dossierClient, journal, config.promotion, o.date)

    const missionsMax = o.agence.ronde.missions_max
    // Sans mémoire (les évals), rien n'est lu non plus : une éval ne dépend que de son journal fixé.
    const memoire: MemoirePourRonde =
      o.memoire === false
        ? { index: [], conventions: '', rondes: [], retirees: [] }
        : pourRonde(o.racine, client, o.date, o.agence.ronde.memoire)
    // Une mission retirée n'est plus « ouverte » : la ronde ne la lit qu'une fois, parmi les retirées (G2).
    catalogue.missions_ouvertes = catalogue.missions_ouvertes.filter(
      (x) =>
        !memoire.retirees.some((r) => r.id === x.id || memesIntentions(r.intentions, x.intentions)),
    )
    const systeme = systemeRonde(
      readFileSync(join(o.racine, FICHIER_CARTE), 'utf8'),
      catalogue,
      missionsMax,
    )
    const message = messageRonde(resume, memoire)
    const fuite = fuites(`${systeme}\n${message}`, personnes)

    let cout_usd = 0
    let estime = o.agence.modeles.ronde.acces === 'claude'
    let rapport: RapportDeRonde | undefined
    let raison: string | undefined
    if (fuite.length === 0) {
      const appel = o.appel ?? appelRonde(o.agence, o.env)
      // Un appel, une relance au plus sur un échec de forme (P5).
      let consigne = message
      for (let essai = 0; essai < 2 && !rapport; essai++) {
        let r: ReponseRonde
        try {
          r = await appel(systeme, consigne)
        } catch (erreur) {
          raison = erreur instanceof Error ? erreur.message : String(erreur)
          break
        }
        cout_usd += r.cout_usd
        estime = r.estime
        const lu = r.ok
          ? lireRapport(r.sortie, missionsMax)
          : { faute: r.raison ?? 'sortie absente' }
        rapport = lu.rapport
        if (!rapport) {
          raison = lu.faute
          consigne = `${message}\n\nTa réponse précédente n'a pas été acceptée : ${lu.faute}. Rends le rapport au schéma.`
        }
      }
    }
    const revalidation: Revalidation | undefined = rapport
      ? revalider(rapport, resume, catalogue, {
          missionsMax,
          retirees: memoire.retirees,
          personnes,
        })
      : undefined
    const missions = revalidation?.sorte === 'accepte' ? revalidation.missions : []
    const issue =
      fuite.length > 0
        ? ISSUES_RONDE.fuite
        : !rapport
          ? ISSUES_RONDE.echouee
          : revalidation?.sorte === 'refuse'
            ? ISSUES_RONDE.refusee
            : missions.length === 0
              ? ISSUES_RONDE.rien
              : ISSUES_RONDE.faite
    const ecarts = revalidation?.sorte === 'refuse' ? revalidation.ecarts : undefined
    const resultat = {
      issue,
      missions,
      ...(ecarts ? { ecarts } : {}),
      ...(!rapport && raison ? { raison } : {}),
      cout_usd: usd(cout_usd),
      estime,
      fuite,
      ...(rapport ? { rapport } : {}),
    }

    writeFileSync(fichier, rendreMd(date, resume, catalogue, resultat))
    writeFileSync(
      json,
      JSON.stringify(
        { date, client_dossier: o.dossierClient, ...resultat, resume, catalogue },
        null,
        2,
      ),
    )
    if (missions.length > 0) {
      mkdirSync(dossierMissions, { recursive: true })
      for (const mr of missions) {
        writeFileSync(
          join(dossierMissions, `${mr.mission.id}.yaml`),
          stringify({
            ...mr.mission,
            date,
            metier: chargerConfig(join(o.dossierClient, FICHIER_CONFIG), ConfigBase).metier,
            statut: mr.statut,
            ...(mr.raison ? { raison: mr.raison } : {}),
          }),
        )
      }
    }
    const maintenant = o.maintenant ?? Temporal.Now.zonedDateTimeISO(FUSEAU)
    const retenues = missions.filter((x) => x.statut !== STATUTS_MISSION.ecartee).length
    journal.ecrire(
      [
        {
          type: TYPE_RONDE,
          client,
          objet: date,
          issue,
          donnees: {
            fenetre: resume.fenetre,
            conversations: resume.conversations,
            demandes: resume.demandes.length,
            missions: {
              proposees: rapport?.missions.length ?? 0,
              retenues,
              ecartees: missions.length - retenues,
            },
            cout_usd: usd(cout_usd),
            ...(estime ? { cout_estime: true } : {}),
            fuite: fuite.length,
          },
        },
      ],
      maintenant.toInstant().toString(),
    )
    if (o.memoire !== false) {
      ecrireRonde(
        o.racine,
        {
          date,
          client,
          missions: (rapport?.missions ?? []).map((mission) => {
            const r = missions.find((x) => x.mission.id === mission.id)
            return {
              id: mission.id,
              sorte: mission.sorte,
              titre: mission.titre,
              intentions: mission.intentions,
              statut: r?.statut ?? STATUTS_MISSION.ecartee,
              ...(r?.raison ? { raison: r.raison } : !r ? { raison: issue } : {}),
            }
          }),
          issue,
          cout: { usd: usd(cout_usd), estime },
        },
        personnes,
      )
    }
    return {
      sorte: 'faite',
      fichier,
      json,
      ...resultat,
      resume,
      catalogue,
      systeme,
      message,
    }
  } finally {
    m.fermer(s)
  }
}
