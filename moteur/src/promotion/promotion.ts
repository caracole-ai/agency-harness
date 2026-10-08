import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { VALIDEE } from '../approbation/jeton'
import { type IssueEchappee, OUTIL_REQUETE } from '../echappee/boucle'
import { TYPE_ECHAPPEE, TYPE_OUTIL_ECHAPPEE } from '../echappee/echappee'
import type { Journal, Ligne } from '../journal/journal'
import { TYPE_APPEL } from '../modele/compteur'
import type { Constat } from '../regles/verdict'
import { dateFr, FUSEAU, Temporal } from '../temps/temporal'

// Le compteur des demandes nouvelles et la promotion (espace 3) : ce qui
// revient devient un geste. Les échappées du journal sont comptées par
// intention ; celle qui atteint le seuil reçoit un dossier de promotion, tout
// lu dans le journal, pour l'atelier. Rien n'est codé ici : le geste, une
// personne l'écrit (PLAN-ESPACES.md § 8).

export const TYPE_PROMOTION = 'promotion proposée'

/** Le statut d'une proposition écrite dans les données (remplacement, réaffectation). */
export const ECRITE = 'écrite'

export interface IntentionComptee {
  intention: string
  occurrences: number
  conversations: string[]
  consignes: string[]
  cout_usd: number
  dernier: string
}

/** Ce qu'une ligne `echappee` porte dans `donnees` (PLAN-ESPACES.md § 4.6). */
interface DonneesEchappee {
  intention?: string
  cout_usd?: number
  modifications?: unknown[]
  constats?: Constat[]
  controle_reponse?: string
  abandon?: string
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

/** `05/10/2026 à 09:12`, en heure de Paris. */
function quand(horodatage: string): string {
  const z = instant(horodatage).toZonedDateTimeISO(FUSEAU)
  return `${dateFr(z)} à ${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`
}

/** Une intention venue du modèle devient un nom de fichier sans séparateur de chemin. */
const nomFichier = (intention: string) => intention.replace(/[^A-Za-z0-9_-]/g, '_')

/** Les lignes `echappee` du journal depuis `depuis` (inclus), groupées par `donnees.intention`, triées par occurrences décroissantes puis intention. */
export function intentions(journal: Journal, depuis: Temporal.PlainDate): IntentionComptee[] {
  const lignes = journal.lire()
  const jour = depuis.toString()
  const groupes = new Map<string, IntentionComptee>()
  for (const l of lignes) {
    if (l.type !== TYPE_ECHAPPEE || l.horodatage.slice(0, 10) < jour) continue
    const { intention } = donneesDe(l) as DonneesEchappee
    if (typeof intention !== 'string') continue
    const g = groupes.get(intention) ?? {
      intention,
      occurrences: 0,
      conversations: [],
      consignes: [],
      cout_usd: 0,
      dernier: l.horodatage,
    }
    g.occurrences += 1
    if (l.objet !== null && !g.conversations.includes(l.objet)) g.conversations.push(l.objet)
    g.consignes.push(l.motif ?? '')
    g.dernier = l.horodatage
    groupes.set(intention, g)
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

function controleDe(d: DonneesEchappee): string {
  if (d.controle_reponse !== undefined) return `contrôle de la réponse : ${d.controle_reponse}`
  if (d.abandon !== undefined) return `abandon : ${d.abandon}`
  if (d.constats !== undefined) {
    return d.constats.length === 0
      ? 'aucun constat'
      : d.constats.map((c) => `${c.regle} ${c.objet} : ${c.verdict} (${c.motif})`).join(' ; ')
  }
  return 'aucun contrôle inscrit'
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
  const echappees = lignes
    .filter(
      (l) =>
        l.type === TYPE_ECHAPPEE &&
        l.objet !== null &&
        i.conversations.includes(l.objet) &&
        (donneesDe(l) as DonneesEchappee).intention === i.intention,
    )
    .slice(-i.occurrences)

  const consignes = echappees.map(
    (l) =>
      `- ${quand(l.horodatage)}, ${l.objet}, ${ISSUES[l.issue as IssueEchappee['sorte']] ?? l.issue} : « ${l.motif ?? ''} »`,
  )

  const fait: string[] = []
  const cas: string[] = []
  for (const l of echappees) {
    const conversation = l.objet as string
    const d = donneesDe(l) as DonneesEchappee
    const requetes = lignes
      .filter(
        (o) =>
          o.type === TYPE_OUTIL_ECHAPPEE && o.objet === conversation && o.issue === OUTIL_REQUETE,
      )
      .map((o) => (donneesDe(o).entree as { sql?: unknown } | undefined)?.sql)
      .filter((sql): sql is string => typeof sql === 'string')
    fait.push(`### ${conversation}`, '')
    fait.push(
      ...(requetes.length === 0
        ? ['Aucune requête.', '']
        : requetes.flatMap((sql) => ['```sql', sql, '```', ''])),
    )
    if (d.modifications !== undefined) {
      fait.push(
        'Modifications proposées :',
        '',
        ...d.modifications.map((m) => `- \`${JSON.stringify(m)}\``),
        '',
      )
    }
    fait.push(`Contrôle : ${controleDe(d)}.`, '')
    if (l.issue === ('proposition' satisfies IssueEchappee['sorte'])) {
      const suite = suiteDe(lignes, conversation)
      fait.push(`Suite donnée : ${suite}.`, '')
      if (suite !== SUITE_NON_VALIDEE) {
        cas.push(
          '```yaml',
          `# ${conversation}`,
          `consigne: ${JSON.stringify(l.motif ?? '')}`,
          `intention: ${i.intention}`,
          'attendu:',
          '  sorte: proposition',
          '  modifications:',
          ...(d.modifications ?? []).map((m) => `    - ${JSON.stringify(m)}`),
          '```',
          '',
        )
      }
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

/** « Coût de l'IA ce mois : 1,23 $ sur un plafond de 30,00 $ (12 appels) » : deux décimales, virgule française. */
export function resumeCout(cout: { usd: number; appels: number }, plafondUsd: number): string {
  return `Coût de l'IA ce mois : ${dollars(cout.usd)} $ sur un plafond de ${dollars(plafondUsd)} $ (${cout.appels} appel${cout.appels > 1 ? 's' : ''})`
}
