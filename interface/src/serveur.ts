// pnpm interface --client <dossier> [--port 3777] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] [--script <fichier.json>]
// L'interface (démo), servie sur 127.0.0.1 seulement
// (PLAN-ESPACES.md § 10). `--modele simule` rejoue les réponses de
// `--script` (un tableau de `Scripte`), sans clé ni réseau : c'est ce qui
// permet une démo et des captures. Travailler sur une copie du client
// fictif, jamais sur `exemples/`.
// Un client livré (`livraison.yaml`, PLAN-LIVRAISON.md L8, L9) : au
// démarrage, la ligne `mise à jour` (faite, ou le retour arrière que le
// lanceur a marqué) ; toutes les `intervalle_minutes`, et dès qu'un statut
// nouveau arrive, le rattrapage dans un processus à part (`pnpm mise-a-jour`)
// pour que l'interface continue de répondre ; une version prête et un moment
// calme (aucune requête depuis `CALME_SECONDES`, aucun rattrapage en cours) :
// sortie `CODE_RELANCE`, le lanceur (`pnpm harnais`) bascule.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  CALME_SECONDES,
  CODE_RELANCE,
  cible,
  envEnfant,
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
  noterDemarrage,
  type Scripte,
  Temporal,
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

/** La livraison d'un client livré (L8, L9) : la ligne de démarrage, la minuterie du rattrapage, la sortie au calme. */
function livrer(m: MetierConversation<unknown>, l: Livraison, version: string | undefined) {
  const s = m.ouvrir(dossier)
  try {
    const ligne = noterDemarrage(m, s, l, version, Temporal.Now.zonedDateTimeISO(FUSEAU))
    if (ligne) console.log(`Mise à jour : ${ligne}${version ? ` (${version})` : ''}`)
  } finally {
    m.fermer(s)
  }
  let derniere = Date.now()
  let rattrapage: ChildProcess | undefined
  const rattraper = () => {
    if (rattrapage) return
    rattrapage = spawn('pnpm', ['mise-a-jour', '--client', dossier], {
      cwd: RACINE_CODE,
      stdio: 'inherit',
      env: envEnfant(process.env),
    })
    rattrapage.on('exit', () => {
      rattrapage = undefined
    })
  }
  setInterval(rattraper, l.intervalle_minutes * 60_000)
  setInterval(() => {
    const suivant = cible(l.installation, LIENS.suivant)
    const calme = Date.now() - derniere > CALME_SECONDES * 1000
    if (!rattrapage && calme && suivant && existsSync(join(suivant, FICHIER_PRETE))) {
      console.log(`Version prête (${versionDeLArbre(suivant) ?? suivant}), moment calme : relance`)
      process.exit(CODE_RELANCE)
    }
  }, PAS_CALME_MS)
  rattraper()
  return {
    surRequete: () => {
      derniere = Date.now()
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
    ...(l ? livrer(metier, l, version) : {}),
  })
  serve({ fetch: app.fetch, hostname: HOTE, port }, (info) => {
    console.log(`Interface : http://${HOTE}:${info.port} (client ${dossier})`)
  })
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
