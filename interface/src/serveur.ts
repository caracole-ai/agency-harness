// pnpm interface --client <dossier> [--port 3777] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] [--script <fichier.json>]
// L'interface (démo), servie sur 127.0.0.1 seulement
// (PLAN-ESPACES.md § 10). `--modele simule` rejoue les réponses de
// `--script` (un tableau de `Scripte`), sans clé ni réseau : c'est ce qui
// permet une démo et des captures. Travailler sur une copie du client
// fictif, jamais sur `exemples/`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  type MetierConversation,
  type Modele,
  metierDe,
  modeleDepuisConfig,
  modeleSimule,
  type Scripte,
} from '@harnais/moteur'
import { serve } from '@hono/node-server'
import { creerApp, HOTE } from './app'

const PORT = 3777

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

try {
  // Le métier du client, chargé depuis son `config.yaml` (PLAN-METIER-2.md M10).
  const metier = await metierDe(dossier)
  const app = creerApp({
    dossier,
    metier,
    modele: modele(metier),
    ...(values.maintenant ? { maintenant: values.maintenant } : {}),
  })
  serve({ fetch: app.fetch, hostname: HOTE, port }, (info) => {
    console.log(`Interface : http://${HOTE}:${info.port} (client ${dossier})`)
  })
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
