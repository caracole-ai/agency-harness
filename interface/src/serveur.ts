// pnpm interface --client <dossier> [--port 3777] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] [--script <fichier.json>]
// L'interface (démo), servie sur 127.0.0.1 seulement
// (PLAN-ESPACES.md § 10). `--modele simule` rejoue les réponses de
// `--script` (un tableau de `Scripte`), sans clé ni réseau : c'est ce qui
// permet une démo et des captures. Travailler sur une copie du client
// fictif, jamais sur `exemples/`.
// Un client livré (`livraison.yaml`, PLAN-LIVRAISON.md L8, L9) : les lignes
// `mise à jour` (faite, retour arrière) que le lanceur a marquées ; toutes
// les `intervalle_minutes`, et dès qu'un statut nouveau arrive, le
// rattrapage dans un processus à part (`pnpm mise-a-jour`) pour que
// l'interface continue de répondre ; lancée par le lanceur, une version
// prête et un moment calme (aucune requête en cours ni depuis
// `CALME_SECONDES`, aucun rattrapage en cours) : sortie `CODE_RELANCE`, le
// lanceur (`pnpm harnais`) bascule.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  CODE_RELANCE,
  cible,
  doitRelancer,
  FICHIER_PRETE,
  FUSEAU,
  LIENS,
  type Livraison,
  lireLivraison,
  type MetierConversation,
  type Modele,
  metierDe,
  modeleDepuisConfig,
  modeleSimule,
  noterLivraison,
  type Scripte,
  sansNpm,
  Temporal,
  VARIABLE_LANCEUR,
  versionDeLArbre,
} from '@harnais/moteur'
import { serve } from '@hono/node-server'
import { creerApp, HOTE, PORT } from './app'

/** La racine du code qui tourne : son fichier `VERSION` dit la version installée (absent hors d'une installation). */
const RACINE_CODE = fileURLToPath(new URL('../..', import.meta.url))
/** Le pas de la surveillance du calme. */
const PAS_CALME_MS = 10_000

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    port: { type: 'string' },
    maintenant: { type: 'string' },
    modele: { type: 'string' },
    script: { type: 'string' },
  },
})
const usage = (): never => {
  console.error(
    'usage : pnpm interface --client <dossier> [--port 3777] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] [--script <fichier.json>]',
  )
  process.exit(2)
}
if (!values.client) usage()
if (values.modele !== undefined && values.modele !== 'simule') usage()
if (values.script !== undefined && values.modele !== 'simule') usage()
const port = values.port === undefined ? PORT : Number(values.port)
if (!Number.isInteger(port) || port < 1 || port > 65535) usage()

const dossier = resolve(values.client as string)

/** Le script du modèle simulé : un tableau JSON de `Scripte`, vide sans `--script`. */
function script(): Scripte[] {
  if (values.script === undefined) return []
  const lu: unknown = JSON.parse(readFileSync(resolve(values.script), 'utf8'))
  if (!Array.isArray(lu)) throw new Error(`${values.script} : un tableau JSON de réponses attendu`)
  return lu as Scripte[]
}

/** Le modèle : simulé (sans clé), ou celui de la config du client. */
function modele(m: MetierConversation<unknown>): Modele {
  if (values.modele === 'simule') return modeleSimule(script())
  const s = m.ouvrir(dossier)
  try {
    return modeleDepuisConfig(m.config(s), process.env)
  } finally {
    m.fermer(s)
  }
}

/**
 * La livraison d'un client livré (L8, L9) : ce que le lanceur a laissé
 * (bascule faite, retour arrière) écrit au journal au démarrage puis à chaque
 * pas ; le rattrapage dans un processus à part, toutes les
 * `intervalle_minutes` et dès qu'un statut arrive ; la sortie au calme, si
 * c'est le lanceur qui l'a lancée (sinon personne ne la relancerait).
 */
function livrer(m: MetierConversation<unknown>, l: Livraison) {
  const noter = () => {
    const s = m.ouvrir(dossier)
    try {
      for (const ligne of noterLivraison(m, s, l, Temporal.Now.zonedDateTimeISO(FUSEAU))) {
        console.log(`Mise à jour : ${ligne}`)
      }
    } catch (erreur) {
      console.error(`journal de la mise à jour : ${(erreur as Error).message}`)
    } finally {
      m.fermer(s)
    }
  }
  noter()
  const lanceeParLeLanceur = process.env[VARIABLE_LANCEUR] === '1'
  let enCours = 0
  let derniere = Date.now()
  let rattrapage: ChildProcess | undefined
  const rattraper = () => {
    if (rattrapage) return
    rattrapage = spawn('pnpm', ['mise-a-jour', '--client', dossier], {
      cwd: RACINE_CODE,
      stdio: 'inherit',
      env: sansNpm(process.env),
    })
    rattrapage.on('exit', () => {
      rattrapage = undefined
    })
  }
  setInterval(rattraper, l.intervalle_minutes * 60_000)
  setInterval(() => {
    noter()
    const suivant = cible(l.installation, LIENS.suivant)
    const suivantePrete = suivant !== undefined && existsSync(join(suivant, FICHIER_PRETE))
    if (
      doitRelancer({
        lanceeParLeLanceur,
        suivantePrete,
        requetesEnCours: enCours,
        derniereActiviteMs: derniere,
        maintenantMs: Date.now(),
        rattrapageEnCours: rattrapage !== undefined,
      })
    ) {
      console.log(`Version prête (${versionDeLArbre(suivant) ?? suivant}), moment calme : relance`)
      process.exit(CODE_RELANCE)
    }
  }, PAS_CALME_MS)
  if (!lanceeParLeLanceur) {
    console.log(
      'Lancée hors de pnpm harnais : une version prête attendra un redémarrage par le lanceur.',
    )
  }
  rattraper()
  return {
    activite: {
      debut: () => {
        enCours++
        derniere = Date.now()
      },
      fin: () => {
        enCours--
        derniere = Date.now()
      },
    },
    apresStatuts: (nouveaux: number) => {
      if (nouveaux > 0) rattraper()
    },
  }
}

try {
  // Le métier du client, chargé depuis son `config.yaml` (PLAN-METIER-2.md M10).
  const metier = await metierDe(dossier)
  const version = versionDeLArbre(RACINE_CODE)
  const l = lireLivraison(dossier)
  const app = creerApp({
    dossier,
    metier,
    modele: modele(metier),
    ...(values.maintenant ? { maintenant: values.maintenant } : {}),
    ...(version ? { version } : {}),
    ...(l ? livrer(metier, l) : {}),
  })
  serve({ fetch: app.fetch, hostname: HOTE, port }, (info) => {
    console.log(`Interface : http://${HOTE}:${info.port} (client ${dossier})`)
  })
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
