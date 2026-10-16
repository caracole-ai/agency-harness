import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { z } from 'zod'
import { chargerConfig, MOTIF_SLUG, NOM_METIER } from '../config'
import { VARIABLE_CLE_ANTHROPIC } from '../conversation/config'
import { EFFORTS, type PrixModele } from '../modele/modele'

// La config de l'agence (`agence.yaml`, à la racine du dépôt, sans secret) :
// les modèles du chantier par rôle, leurs prix, les bornes
// (PLAN-RONDE.md § 4.1, R7). Deux accès (§ 0.a) : `claude`, l'abonnement par
// le binaire, au laboratoire ; `anthropic`, la clé d'API de l'agence
// (PLAN-GENERAL.md G10), avant la finalisation. Le préflight se fait au moment
// de l'appel, jamais au chargement : `--sans-modele` ne l'exige pas.

export const FICHIER_AGENCE = 'agence.yaml'

/** La place du métier de la mission dans `chemins_autorises` et `chemins_interdits`, résolue avant la garde (PLAN-METIER-2.md M9). */
export const PLACE_METIER = `\${metier}`

/** Les deux accès aux modèles d'Anthropic (PLAN-RONDE.md § 0.a). */
export const ACCES_AGENCE = ['claude', 'anthropic'] as const
export type AccesAgence = (typeof ACCES_AGENCE)[number]

export const ModeleAgence = z.strictObject({
  acces: z.enum(ACCES_AGENCE),
  modele: z.string().min(1),
  effort: z.enum(EFFORTS),
})
export type ModeleAgence = z.infer<typeof ModeleAgence>

const Prix = z.strictObject({
  entree: z.number().nonnegative(),
  sortie: z.number().nonnegative(),
  cache_ecrit: z.number().nonnegative(),
  cache_lu: z.number().nonnegative(),
})

const entier = () => z.number().int().positive()

/** Un chemin autorisé sous `metiers/` porte la place du métier : sans elle, un chantier ouvrirait tous les métiers (PLAN-METIER-2.md M9). */
const CheminAutorise = z
  .string()
  .min(1)
  .refine((c) => !c.startsWith('metiers/') || c.includes(PLACE_METIER), {
    message: `un chemin autorisé sous metiers/ porte ${PLACE_METIER}`,
  })

export const AgenceSchema = z.strictObject({
  modeles: z.strictObject({
    chantier: z.strictObject({
      plan: ModeleAgence,
      implementation: ModeleAgence,
      revue: ModeleAgence,
    }),
  }),
  prix_par_million_usd: z.record(z.string().min(1), Prix),
  claude: z.strictObject({ binaire: z.string().min(1) }),
  /** `pnpm agence` (PLAN-LIVRAISON.md L1) : la borne du jour, le pas de la boucle, la file de missions de chaque client. */
  agence: z.strictObject({
    chantiers_max_par_jour: entier(),
    intervalle_secondes: entier(),
    clients: z.array(
      z.strictObject({
        slug: z.string().regex(MOTIF_SLUG),
        /** Son métier : une mission de sa file qui en nomme un autre est refusée (L10). */
        metier: z.string().regex(NOM_METIER),
        /** L'adresse git de sa file (`missions-<slug>`), lue par `git clone`. */
        missions: z.string().min(1),
      }),
    ),
  }),
  chantier: z.strictObject({
    /** Les dernières lignes de `memoire/INDEX.md` que le plan d'un chantier lit (R10). */
    memoire_index_lignes: entier(),
    tours_max: entier(),
    budget_usd_par_mission: z.number().positive(),
    lignes_max: entier(),
    delai_secondes: entier(),
    outils_autorises: z.array(z.string().min(1)).min(1),
    outils_lecture: z.array(z.string().min(1)).min(1),
    /** Le client des évals de traduction de chaque métier, relatif à l'arbre (PLAN-METIER-2.md M9). */
    evals_clients: z.record(z.string().min(1), z.string().min(1)),
    chemins_autorises: z.array(CheminAutorise).min(1),
    chemins_interdits: z.array(z.string().min(1)),
  }),
})
export type Agence = z.infer<typeof AgenceSchema>

/** `<racine>/agence.yaml`, validé ; un champ inconnu ou manquant arrête tout. */
export function chargerAgence(racine: string): Agence {
  const agence = chargerConfig(join(racine, FICHIER_AGENCE), AgenceSchema)
  const modeles = [
    agence.modeles.chantier.plan,
    agence.modeles.chantier.implementation,
    agence.modeles.chantier.revue,
  ]
  for (const m of modeles) {
    if (m.acces === 'anthropic' && !agence.prix_par_million_usd[m.modele]) {
      throw new Error(
        `config de l'agence invalide : aucun prix pour ${m.modele} (prix_par_million_usd)`,
      )
    }
  }
  return agence
}

/** Les prix d'un modèle de l'agence, dans les noms du moteur ; lève s'il n'en a pas. */
export function prixAgence(agence: Agence, modele: string): PrixModele {
  const p = agence.prix_par_million_usd[modele]
  if (!p) throw new Error(`aucun prix pour ${modele} dans ${FICHIER_AGENCE}`)
  return { entree: p.entree, sortie: p.sortie, cacheEcrit: p.cache_ecrit, cacheLu: p.cache_lu }
}

/** Une variable d'environnement exigée : absente ou vide, l'appel s'arrête en le disant. */
export function assertEnv(nom: string, env: Record<string, string | undefined>): string {
  const valeur = env[nom]
  if (!valeur) throw new Error(`variable ${nom} absente : exporter la valeur avant l'appel`)
  return valeur
}

/** Ce que rend `claude auth status` (PLAN-RONDE.md § 4.2), au minimum. */
const StatutClaude = z.looseObject({
  loggedIn: z.boolean(),
  authMethod: z.string().optional(),
})

/** Lance une commande, rend sa sortie standard et son code ; injectable pour les tests. */
export type Executer = (
  commande: string,
  args: string[],
) => { code: number | null; sortie: string; erreur: string }

export const executerSync: Executer = (commande, args) => {
  const r = spawnSync(commande, args, { encoding: 'utf8' })
  if (r.error) return { code: null, sortie: '', erreur: r.error.message }
  return { code: r.status, sortie: r.stdout, erreur: r.stderr }
}

/**
 * Le préflight d'un appel à un modèle de l'agence (PLAN-RONDE.md § 0.a, 4.1).
 * `claude` : `ANTHROPIC_API_KEY` absente (présente, elle l'emporterait en mode
 * `-p` et facturerait l'API), puis `claude auth status` connecté. `anthropic` :
 * la clé exigée, rendue. Lève avant tout appel, en disant pourquoi.
 */
export function preflight(
  acces: AccesAgence,
  agence: Pick<Agence, 'claude'>,
  env: Record<string, string | undefined>,
  executer: Executer = executerSync,
): { cle?: string } {
  if (acces === 'anthropic') return { cle: assertEnv(VARIABLE_CLE_ANTHROPIC, env) }
  if (env[VARIABLE_CLE_ANTHROPIC]) {
    throw new Error(
      `${VARIABLE_CLE_ANTHROPIC} est dans l'environnement : sous acces: claude, elle l'emporterait sur l'abonnement et facturerait l'API. Retirer la variable, ou passer à acces: anthropic.`,
    )
  }
  const r = executer(agence.claude.binaire, ['auth', 'status'])
  if (r.code !== 0) {
    throw new Error(
      `${agence.claude.binaire} auth status a échoué (${r.code === null ? r.erreur : `code ${r.code}`}) : le binaire est-il installé et connecté ?`,
    )
  }
  let statut: z.infer<typeof StatutClaude>
  try {
    statut = StatutClaude.parse(JSON.parse(r.sortie))
  } catch {
    throw new Error(`${agence.claude.binaire} auth status : sortie illisible`)
  }
  if (!statut.loggedIn) {
    throw new Error(
      `${agence.claude.binaire} n'est pas connecté : lancer « ${agence.claude.binaire} auth login » (abonnement claude.ai)`,
    )
  }
  return {}
}
