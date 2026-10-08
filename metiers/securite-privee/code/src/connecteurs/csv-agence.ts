import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { Planning } from '../modele'

// Le connecteur de lecture « format agence » : trois CSV au séparateur « ; »
// (celui d'Excel en français), une liste dans une cellule séparée par « | ».
// Un échafaudage : on n'a encore vu le tableur d'aucun client. Le vrai
// connecteur s'écrira chez le premier ; le modèle canonique ne bougera pas.
// Une cellule vide est une donnée inconnue, jamais une valeur par défaut.

export interface FichiersAgence {
  agents: string
  postes: string
  planning: string
}

const COLONNES = {
  agents: [
    'id',
    'nom',
    'carte_activites',
    'carte_du',
    'carte_au',
    'recepisse_du',
    'carte_entreprise_remise',
    'declare_dracar',
    'mac',
    'ssiap_niveau',
    'ssiap_diplome',
    'ssiap_recyclages',
    'ssiap_heures_36_mois',
    'ssiap_etablissements_tenus',
    'secourisme_qualification',
    'secourisme_recyclages',
    'habilitation_du',
    'habilitation_au',
  ],
  postes: ['id', 'site', 'activite', 'ssiap'],
  planning: ['id', 'agent', 'poste', 'debut', 'fin', 'nature', 'doublure'],
} as const

type Ligne = Record<string, string>

function lireCsv(chemin: string, attendues: readonly string[]): Ligne[] {
  const lignes = parse(readFileSync(chemin, 'utf8'), {
    columns: true,
    delimiter: ';',
    trim: true,
    skip_empty_lines: true,
  }) as Ligne[]
  const presentes = Object.keys(lignes[0] ?? {})
  const inconnues = presentes.filter((c) => !attendues.includes(c))
  const manquantes = attendues.filter((c) => !presentes.includes(c))
  if (lignes.length > 0 && (inconnues.length > 0 || manquantes.length > 0)) {
    throw new Error(
      `${chemin} : colonnes ${[
        ...inconnues.map((c) => `« ${c} » inconnue`),
        ...manquantes.map((c) => `« ${c} » manquante`),
      ].join(', ')}`,
    )
  }
  return lignes
}

const texte = (v: string | undefined) => (v === undefined || v === '' ? undefined : v)
const liste = (v: string | undefined) =>
  texte(v)
    ?.split('|')
    .map((x) => x.trim())
const nombre = (v: string | undefined) => (texte(v) === undefined ? undefined : Number(v))

function ouiNon(v: string | undefined, ou: string): boolean | undefined {
  const t = texte(v)?.toLowerCase()
  if (t === undefined) return undefined
  if (t === 'oui') return true
  if (t === 'non') return false
  throw new Error(`${ou} : « ${v} » n'est ni oui ni non`)
}

/** Un objet sans ses clés indéfinies : une donnée absente reste absente, pas `undefined` écrit. */
function sansVides<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}

function agent(l: Ligne, ou: string) {
  const activites = liste(l.carte_activites)
  const ssiapNiveau = nombre(l.ssiap_niveau)
  return sansVides({
    id: l.id,
    nom: l.nom,
    cartePro:
      activites || texte(l.carte_du)
        ? { activites, validites: [sansVides({ du: texte(l.carte_du), au: texte(l.carte_au) })] }
        : undefined,
    recepisse: texte(l.recepisse_du) ? { du: l.recepisse_du } : undefined,
    carteEntrepriseRemise: ouiNon(l.carte_entreprise_remise, `${ou}, carte_entreprise_remise`),
    declareDracar: ouiNon(l.declare_dracar, `${ou}, declare_dracar`),
    mac: texte(l.mac),
    ssiap:
      ssiapNiveau !== undefined || texte(l.ssiap_diplome)
        ? sansVides({
            niveau: ssiapNiveau,
            diplome: texte(l.ssiap_diplome),
            recyclages: liste(l.ssiap_recyclages) ?? [],
            heuresActivite36Mois: nombre(l.ssiap_heures_36_mois),
            etablissementsTenus: liste(l.ssiap_etablissements_tenus),
          })
        : undefined,
    secourisme: texte(l.secourisme_qualification)
      ? {
          qualification: l.secourisme_qualification,
          recyclages: liste(l.secourisme_recyclages) ?? [],
        }
      : undefined,
    habilitationElectrique: texte(l.habilitation_du)
      ? sansVides({ du: l.habilitation_du, au: texte(l.habilitation_au) })
      : undefined,
  })
}

/** Lit les trois CSV d'un client et rend le planning, validé par le modèle canonique. */
export function lireAgence(dossier: string, fichiers: FichiersAgence): Planning {
  const chemin = (f: string) => join(dossier, f)
  const agents = lireCsv(chemin(fichiers.agents), COLONNES.agents).map((l, i) =>
    agent(l, `${fichiers.agents}, ligne ${i + 2}`),
  )
  const postes = lireCsv(chemin(fichiers.postes), COLONNES.postes).map((l) =>
    sansVides({ id: l.id, site: l.site, activite: texte(l.activite), ssiap: nombre(l.ssiap) }),
  )
  const vacations = lireCsv(chemin(fichiers.planning), COLONNES.planning).map((l, i) =>
    sansVides({
      id: l.id,
      agent: l.agent,
      poste: l.poste,
      debut: l.debut,
      fin: l.fin,
      nature: texte(l.nature),
      doublure: ouiNon(l.doublure, `${fichiers.planning}, ligne ${i + 2}, doublure`),
    }),
  )
  const resultat = Planning.safeParse({ agents, postes, vacations })
  if (!resultat.success) {
    throw new Error(
      `${dossier} : données illisibles\n${resultat.error.issues.map((x) => `- ${x.path.join('.')} : ${x.message}`).join('\n')}`,
    )
  }
  return resultat.data
}

/**
 * Le connecteur d'écriture : confie des vacations à d'autres agents, dans le
 * planning du client, sans toucher au reste du fichier (mêmes colonnes, même
 * ordre). Toutes ou aucune : une vacation introuvable arrête avant d'écrire.
 * N'est appelé qu'après la vérification de la clé d'accord.
 */
export function reaffecterAgents(
  chemin: string,
  modifications: { vacation: string; agent: string }[],
): void {
  const lignes = lireCsv(chemin, COLONNES.planning)
  const cibles = modifications.map((m) => {
    const ligne = lignes.find((l) => l.id === m.vacation)
    if (!ligne) throw new Error(`${chemin} : vacation ${m.vacation} introuvable`)
    return { ligne, agent: m.agent }
  })
  for (const { ligne, agent } of cibles) ligne.agent = agent
  const cellule = (v: string | undefined) => {
    if (v && /[;"\n]/.test(v)) throw new Error(`${chemin} : cellule non écrivable « ${v} »`)
    return v ?? ''
  }
  writeFileSync(
    chemin,
    `${[
      COLONNES.planning.join(';'),
      ...lignes.map((l) => COLONNES.planning.map((c) => cellule(l[c])).join(';')),
    ].join('\n')}\n`,
  )
}

/** Confie une vacation à un autre agent : une réaffectation d'une seule ligne. */
export function remplacerAgent(chemin: string, vacation: string, agent: string): void {
  reaffecterAgents(chemin, [{ vacation, agent }])
}
