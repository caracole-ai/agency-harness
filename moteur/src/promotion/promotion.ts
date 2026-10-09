import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { VALIDEE } from '../approbation/jeton'
import { ROLES, type Role } from '../conversation/actions'
import { CONTROLE_OK, type IssueEchappee, OUTIL_REQUETE } from '../echappee/boucle'
import { TYPE_ECHAPPEE, TYPE_OUTIL_ECHAPPEE } from '../echappee/echappee'
import type { Journal, Ligne } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import type { Constat } from '../regles/verdict'
import { dateFr, FUSEAU, Temporal } from '../temps/temporal'

// Le compteur des demandes nouvelles et la promotion (espace 3) : ce qui
// revient devient un geste. Les échappées du journal sont comptées par
// intention ; celle qui atteint le seuil reçoit un dossier de promotion, tout
// lu dans le journal, pour l'atelier. Seules comptent les échappées finies
// proprement, dont le journal garde le texte montré et l'instantané : ce
// sont elles que la fabrication relira et rejouera (PLAN-PROMOTION.md § 4.3,
// P8, P9). Rien n'est codé ici : le geste, une personne l'écrit
// (PLAN-ESPACES.md § 8), jusqu'au lot 2.

export const TYPE_PROMOTION = 'promotion proposée'

/** Le statut d'une proposition écrite dans les données (remplacement, réaffectation). */
export const ECRITE = 'écrite'

/** Le dossier des gestes appris, dans le dossier du client (PLAN-PROMOTION.md § 5). */
export const DOSSIER_GESTES = 'gestes'

export interface IntentionComptee {
  intention: string
  occurrences: number
  conversations: string[]
  consignes: string[]
  cout_usd: number
  dernier: string
}

/** Ce qu'une échappée finie proprement a laissé au journal : de quoi la relire, la rejouer et la promouvoir. */
export interface EchappeeJournalisee {
  echappee: string
  conversation: string
  horodatage: string
  role: Role
  agent?: string
  consigne: string
  intention: string
  issue: 'reponse' | 'proposition'
  /** Les requêtes de cette échappée, dans l'ordre des tours, erreurs comprises mais marquées. */
  requetes: { sql: string; sortie: string; erreur?: string }[]
  modifications?: unknown[]
  constats?: Constat[]
  /** Le texte final tel que montré. */
  texte: string
  /** `echappees/<id>.json`, relatif au dossier du client. */
  instantane: string
}

/** Ce qu'une ligne `echappee` porte dans `donnees` (PLAN-ESPACES.md § 4.6, PLAN-PROMOTION.md § 4.2). */
interface DonneesEchappee {
  echappee?: string
  intention?: string
  role?: string
  agent?: string
  cout_usd?: number
  modifications?: unknown[]
  constats?: Constat[]
  controle_reponse?: string
  abandon?: string
  texte?: string
  instantane?: string
}

const ISSUES: Record<IssueEchappee['sorte'], string> = {
  reponse: 'réponse',
  proposition: 'proposition',
  abandon: 'abandon',
}

const SUITE_NON_VALIDEE = 'non validée'

const AVERTISSEMENT_CAS = 'À vérifier et écrire à la main, jamais recopié tel quel.'

const A_FAIRE = [
  'Nommer le geste.',
  'Fixer ses paramètres.',
  'Le coder dans `ACTIONS` du métier.',
  'Écrire ses tests.',
  'Passer `pnpm check`.',
  "Livrer : la mise à jour à distance d'un harnais livré est à concevoir par Lionel (PLAN-ESPACES.md D2).",
]

/** Les `donnees` d'une ligne, lues comme un objet (vide si absentes ou d'une autre forme). */
function donneesDe(l: Ligne): Record<string, unknown> {
  if (!l.donnees) return {}
  const d: unknown = JSON.parse(l.donnees)
  return typeof d === 'object' && d !== null && !Array.isArray(d)
    ? (d as Record<string, unknown>)
    : {}
}

const arrondi6 = (x: number) => Math.round(x * 1_000_000) / 1_000_000

/** Un montant en dollars, deux décimales, virgule française : `1,23`. */
export const dollars = (usd: number) => usd.toFixed(2).replace('.', ',')

const instant = (horodatage: string) => Temporal.Instant.from(horodatage)

/** Le jour d'un horodatage, en heure de Paris. */
const jourDe = (horodatage: string) => instant(horodatage).toZonedDateTimeISO(FUSEAU).toPlainDate()

/** `05/10/2026 à 09:12`, en heure de Paris. */
function quand(horodatage: string): string {
  const z = instant(horodatage).toZonedDateTimeISO(FUSEAU)
  return `${dateFr(z)} à ${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`
}

/** Une intention venue du modèle devient un nom de fichier sans séparateur de chemin. */
const nomFichier = (intention: string) => intention.replace(/[^A-Za-z0-9_-]/g, '_')

/** Le premier jour d'une fenêtre de `jours` jours qui finit à `maintenant` (inclus). */
export const debutFenetre = (maintenant: Temporal.ZonedDateTime, jours: number) =>
  maintenant.toPlainDate().subtract({ days: jours - 1 })

const estRole = (r: unknown): r is Role => ROLES.includes(r as Role)

/** La suite donnée à la proposition d'une conversation : lue sur les objets (`R-…`) qui la citent. */
function suiteDe(lignes: Ligne[], conversation: string): string {
  const objets = new Set(
    lignes
      .filter((l) => l.objet !== null && donneesDe(l).conversation === conversation)
      .map((l) => l.objet),
  )
  const issues = lignes.filter((l) => objets.has(l.objet)).map((l) => l.issue)
  if (issues.includes(ECRITE)) return ECRITE
  if (issues.includes(VALIDEE)) return VALIDEE
  return SUITE_NON_VALIDEE
}

/**
 * Une échappée finie proprement (P9), dont le journal garde tout (P8) :
 * `reponse` au contrôle `ok`, ou `proposition` validée ou écrite dans cette
 * conversation ; avec son identifiant, son rôle, son texte et son instantané.
 * Un abandon, un résumé retiré, une proposition sans suite, ou une ligne
 * d'avant le lot 0 (sans instantané) ne comptent pas.
 */
function lireEchappee(l: Ligne, lignes: Ligne[]): EchappeeJournalisee | undefined {
  if (l.type !== TYPE_ECHAPPEE || l.objet === null) return undefined
  const d = donneesDe(l) as DonneesEchappee
  if (
    typeof d.echappee !== 'string' ||
    typeof d.intention !== 'string' ||
    typeof d.texte !== 'string' ||
    typeof d.instantane !== 'string' ||
    !estRole(d.role)
  ) {
    return undefined
  }
  const propre =
    l.issue === ('reponse' satisfies IssueEchappee['sorte'])
      ? d.controle_reponse === undefined || d.controle_reponse === CONTROLE_OK
      : l.issue === ('proposition' satisfies IssueEchappee['sorte']) &&
        suiteDe(lignes, l.objet) !== SUITE_NON_VALIDEE
  if (!propre) return undefined
  const id = d.echappee
  const requetes = lignes
    .filter(
      (o) =>
        o.type === TYPE_OUTIL_ECHAPPEE && o.issue === OUTIL_REQUETE && donneesDe(o).echappee === id,
    )
    .flatMap((o) => {
      const { entree, sortie, erreur } = donneesDe(o)
      const sql = (entree as { sql?: unknown } | undefined)?.sql
      if (typeof sql !== 'string') return []
      return [
        {
          sql,
          sortie: typeof sortie === 'string' ? sortie : '',
          ...(typeof erreur === 'string' ? { erreur } : {}),
        },
      ]
    })
  return {
    echappee: id,
    conversation: l.objet,
    horodatage: l.horodatage,
    role: d.role,
    ...(typeof d.agent === 'string' ? { agent: d.agent } : {}),
    consigne: l.motif ?? '',
    intention: d.intention,
    issue: l.issue as EchappeeJournalisee['issue'],
    requetes,
    ...(d.modifications !== undefined ? { modifications: d.modifications } : {}),
    ...(d.constats !== undefined ? { constats: d.constats } : {}),
    texte: d.texte,
    instantane: d.instantane,
  }
}

/** Les échappées finies proprement depuis `depuis` (inclus), dans l'ordre du journal. */
function echappeesDepuis(lignes: Ligne[], depuis: Temporal.PlainDate): EchappeeJournalisee[] {
  const jour = depuis.toString()
  return lignes.flatMap((l) => {
    if (l.type !== TYPE_ECHAPPEE || l.horodatage.slice(0, 10) < jour) return []
    const e = lireEchappee(l, lignes)
    return e ? [e] : []
  })
}

/** Les échappées finies proprement d'une intention depuis `depuis` (inclus), dans l'ordre du journal. */
export function echappeesDe(
  journal: Journal,
  intention: string,
  depuis: Temporal.PlainDate,
): EchappeeJournalisee[] {
  return echappeesDepuis(journal.lire(), depuis).filter((e) => e.intention === intention)
}

/** Les échappées finies proprement depuis `depuis` (inclus), groupées par intention, triées par occurrences décroissantes puis intention. */
export function intentions(journal: Journal, depuis: Temporal.PlainDate): IntentionComptee[] {
  const lignes = journal.lire()
  const groupes = new Map<string, IntentionComptee>()
  for (const e of echappeesDepuis(lignes, depuis)) {
    const g = groupes.get(e.intention) ?? {
      intention: e.intention,
      occurrences: 0,
      conversations: [],
      consignes: [],
      cout_usd: 0,
      dernier: e.horodatage,
    }
    g.occurrences += 1
    if (!g.conversations.includes(e.conversation)) g.conversations.push(e.conversation)
    g.consignes.push(e.consigne)
    g.dernier = e.horodatage
    groupes.set(e.intention, g)
  }
  for (const g of groupes.values()) {
    const cout = lignes
      .filter((l) => l.type === TYPE_APPEL && l.objet !== null && g.conversations.includes(l.objet))
      .reduce((somme, l) => {
        const c = donneesDe(l).cout_usd
        return somme + (typeof c === 'number' ? c : 0)
      }, 0)
    g.cout_usd = arrondi6(cout)
  }
  return [...groupes.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.intention.localeCompare(b.intention),
  )
}

/** Celles qui atteignent le seuil et n'ont pas déjà une ligne `promotion proposée` (objet = l'intention) postérieure ou égale à leur dernière occurrence. */
export function aProposer(
  intentions: IntentionComptee[],
  journal: Journal,
  seuil: { occurrences: number },
): IntentionComptee[] {
  const promotions = journal.lire().filter((l) => l.type === TYPE_PROMOTION)
  return intentions.filter(
    (i) =>
      i.occurrences >= seuil.occurrences &&
      !promotions.some(
        (p) =>
          p.objet === i.intention &&
          Temporal.Instant.compare(instant(p.horodatage), instant(i.dernier)) >= 0,
      ),
  )
}

function controleDe(e: EchappeeJournalisee): string {
  if (e.constats !== undefined) {
    return e.constats.length === 0
      ? 'aucun constat'
      : e.constats.map((c) => `${c.regle} ${c.objet} : ${c.verdict} (${c.motif})`).join(' ; ')
  }
  return `contrôle de la réponse : ${CONTROLE_OK}`
}

/** Écrit `<dossierClient>/promotions/<intention>-<AAAA-MM-JJ>.md` (crée le dossier), écrit la ligne `promotion proposée` au journal, et rend le chemin. */
export function ecrireDossier(
  dossierClient: string,
  client: string,
  i: IntentionComptee,
  journal: Journal,
  maintenant: Temporal.ZonedDateTime,
  fenetreJours: number,
): string {
  const lignes = journal.lire()
  const echappees = echappeesDe(journal, i.intention, debutFenetre(maintenant, fenetreJours))

  const consignes = echappees.map(
    (e) => `- ${quand(e.horodatage)}, ${e.conversation}, ${ISSUES[e.issue]} : « ${e.consigne} »`,
  )

  const fait: string[] = []
  const cas: string[] = []
  for (const e of echappees) {
    fait.push(`### ${e.conversation} (${e.echappee})`, '')
    fait.push(
      ...(e.requetes.length === 0
        ? ['Aucune requête.', '']
        : e.requetes.flatMap((r) => [
            '```sql',
            r.sql,
            '```',
            ...(r.erreur !== undefined ? [`Erreur : ${r.erreur}`] : []),
            '',
          ])),
    )
    if (e.modifications !== undefined) {
      fait.push(
        'Modifications proposées :',
        '',
        ...e.modifications.map((m) => `- \`${JSON.stringify(m)}\``),
        '',
      )
    }
    fait.push(`Contrôle : ${controleDe(e)}.`, '')
    if (e.issue === 'proposition') {
      fait.push(`Suite donnée : ${suiteDe(lignes, e.conversation)}.`, '')
      cas.push(
        '```yaml',
        `# ${e.conversation}`,
        `consigne: ${JSON.stringify(e.consigne)}`,
        `intention: ${i.intention}`,
        'attendu:',
        '  sorte: proposition',
        '  modifications:',
        ...(e.modifications ?? []).map((m) => `    - ${JSON.stringify(m)}`),
        '```',
        '',
      )
    }
  }

  const contenu = [
    `# Promotion proposée : ${i.intention}`,
    '',
    '## Pourquoi',
    '',
    `${i.occurrences} demandes en ${fenetreJours} jours, pour un coût total de ${dollars(i.cout_usd)} $.`,
    '',
    '## Les consignes',
    '',
    ...consignes,
    '',
    "## Ce que l'IA a fait",
    '',
    ...fait,
    '## Cas de test candidats',
    '',
    ...(cas.length === 0 ? ['Aucune proposition validée.', ''] : [AVERTISSEMENT_CAS, '', ...cas]),
    "## À faire à l'atelier",
    '',
    ...A_FAIRE.map((a) => `- [ ] ${a}`),
    '',
  ].join('\n')

  const dossier = join(dossierClient, 'promotions')
  mkdirSync(dossier, { recursive: true })
  const chemin = join(
    dossier,
    `${nomFichier(i.intention)}-${maintenant.toPlainDate().toString()}.md`,
  )
  writeFileSync(chemin, contenu)
  journal.ecrire(
    [
      {
        type: TYPE_PROMOTION,
        client,
        objet: i.intention,
        motif: `${i.intention} : ${i.occurrences} demandes en ${fenetreJours} jours`,
        donnees: {
          intention: i.intention,
          conversations: i.conversations,
          cout_usd: i.cout_usd,
          dossier: chemin,
        },
      },
    ],
    maintenant.toInstant().toString(),
  )
  return chemin
}

/** Les instantanés que les tests des gestes appris du dossier (`gestes/*.yaml`) citent : ils restent tant que le geste existe. */
function instantanesCites(dossierClient: string): Set<string> {
  const dossier = join(dossierClient, DOSSIER_GESTES)
  const cites = new Set<string>()
  if (!existsSync(dossier)) return cites
  for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.yaml'))) {
    const geste: unknown = parse(readFileSync(join(dossier, fichier), 'utf8'))
    const tests = (geste as { tests?: unknown } | null)?.tests
    if (!Array.isArray(tests)) continue
    for (const t of tests) {
      const i = (t as { instantane?: unknown } | null)?.instantane
      if (typeof i === 'string') cites.add(i)
    }
  }
  return cites
}

/**
 * Supprime les instantanés (`echappees/<id>.json`) des échappées d'avant
 * `avant` (exclu) qu'aucun geste appris ne cite, et rend leurs chemins. Les
 * dates sont celles du journal ; un fichier que le journal ne connaît pas
 * n'est pas touché.
 */
export function purgerInstantanes(
  dossierClient: string,
  journal: Journal,
  avant: Temporal.PlainDate,
): string[] {
  const cites = instantanesCites(dossierClient)
  const supprimes = new Set<string>()
  for (const l of journal.lire()) {
    if (l.type !== TYPE_ECHAPPEE) continue
    const { instantane } = donneesDe(l) as DonneesEchappee
    if (typeof instantane !== 'string' || cites.has(instantane) || supprimes.has(instantane)) {
      continue
    }
    if (Temporal.PlainDate.compare(jourDe(l.horodatage), avant) >= 0) continue
    const absolu = join(dossierClient, instantane)
    if (!existsSync(absolu)) continue
    rmSync(absolu)
    supprimes.add(instantane)
  }
  return [...supprimes]
}

/** « Coût de l'IA ce mois : 1,23 $ sur un plafond de 30,00 $ (12 appels) » : deux décimales, virgule française. */
export function resumeCout(cout: { usd: number; appels: number }, plafondUsd: number): string {
  return `Coût de l'IA ce mois : ${dollars(cout.usd)} $ sur un plafond de ${dollars(plafondUsd)} $ (${cout.appels} appel${cout.appels > 1 ? 's' : ''})`
}
