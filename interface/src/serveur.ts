// pnpm interface --client <dossier> [--port 3777] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] [--script <fichier.json>]
// L'interface (démo), servie sur 127.0.0.1 seulement
// (PLAN-ESPACES.md § 10). `--modele simule` rejoue les réponses de
// `--script` (un tableau de `Scripte`), sans clé ni réseau : c'est ce qui
// permet une démo et des captures. Travailler sur une copie du client
// fictif, jamais sur `exemples/`.
// Un client livré (`livraison.yaml`, PLAN-LIVRAISON.md L8, L9) : les lignes
// `mise à jour` (faite, retour arrière) que le lanceur a marquées ; le
// rattrapage dans un processus à part (`pnpm mise-a-jour`), seul à lancer
// git (la file, les versions) pour que l'interface réponde toujours : au
// démarrage, toutes les `intervalle_minutes`, à l'ouverture de l'onglet
// « Gestes » et après une commande ; lancée par le lanceur, une relance
// attendue (une version prête, ou `courant` qui n'est plus le code qui
// tourne) et un moment calme (aucune requête en cours ni depuis
// `CALME_SECONDES`, aucun rattrapage en cours) : sortie `CODE_RELANCE`, le
// lanceur (`pnpm harnais`) bascule ou relance sur `courant`.
import { type ChildProcess, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  CODE_RELANCE,
  cible,
  doitRelancer,
  FUSEAU,
  LIENS,
  type Livraison,
  lireLivraison,
  type MetierConversation,
  type Modele,
  metierDe,
  modeleDepuisConfig,
  modeleSimule,
  noterSiMarque,
  relanceAttendue,
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
 * pas ; le rattrapage dans un processus à part (le seul à lancer git : la
 * file, les versions), au démarrage, toutes les `intervalle_minutes`, à
 * chaque ouverture de l'onglet « Gestes » et après chaque commande (un
 * déclenchement pendant qu'il tourne le relance à sa fin) ; la sortie au
 * calme quand une version est prête ou que `courant` n'est plus le code qui
 * tourne, si c'est le lanceur qui l'a lancée (sinon personne ne la
 * relancerait).
 */
function livrer(m: MetierConversation<unknown>, l: Livraison) {
  const noter = () => {
    try {
      for (const ligne of noterSiMarque(m, dossier, l, Temporal.Now.zonedDateTimeISO(FUSEAU))) {
        console.log(`Mise à jour : ${ligne}`)
      }
    } catch (erreur) {
      console.error(`journal de la mise à jour : ${(erreur as Error).message}`)
    }
  }
  noter()
  const lanceeParLeLanceur = process.env[VARIABLE_LANCEUR] === '1'
  let enCours = 0
  let derniere = Date.now()
  let rattrapage: ChildProcess | undefined
  let encore = false
  const rattraper = () => {
    if (rattrapage) {
      encore = true
      return
    }
    encore = false
    const enfant = spawn('pnpm', ['mise-a-jour', '--client', dossier], {
      cwd: RACINE_CODE,
      stdio: 'inherit',
      env: sansNpm(process.env),
    })
    rattrapage = enfant
    const fini = () => {
      if (rattrapage !== enfant) return
      rattrapage = undefined
      if (encore) rattraper()
    }
    enfant.on('error', (erreur) => {
      console.error(`rattrapage : ${erreur.message}`)
      fini()
    })
    enfant.on('exit', fini)
  }
  setInterval(rattraper, l.intervalle_minutes * 60_000)
  setInterval(() => {
    noter()
    if (
      doitRelancer({
        lanceeParLeLanceur,
        relanceAttendue: relanceAttendue(l.installation, RACINE_CODE),
        requetesEnCours: enCours,
        derniereActiviteMs: derniere,
        maintenantMs: Date.now(),
        rattrapageEnCours: rattrapage !== undefined,
      })
    ) {
      const suivant = versionDeLArbre(cible(l.installation, LIENS.suivant))
      console.log(
        suivant
          ? `Version prête (${suivant}), moment calme : relance`
          : 'La version qui tourne n’est plus la courante, moment calme : relance',
      )
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
    rattraper,
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
