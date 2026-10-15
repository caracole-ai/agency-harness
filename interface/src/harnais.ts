// pnpm harnais --client <dossier> [-- <options de pnpm interface>]
// Le lanceur d'un client livré (PLAN-LIVRAISON.md L9), la seule chose qu'une
// machine cliente installe (une ligne launchd ou systemd, dans le README) :
// il lance `pnpm interface --client <dossier>` depuis la version courante de
// l'installation (`livraison.yaml: installation`, lien `courant`), attend sa
// sortie, bascule sur la version prête quand l'interface sort avec
// `CODE_RELANCE`, la sonde (`POST /api/roles`), revient en arrière si elle ne
// répond pas ; relance après un plantage, trois fois par dix minutes au plus,
// puis s'arrête. Il tourne avec le code de la version qui l'a lancé jusqu'à
// son prochain redémarrage à la main.
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { envEnfant, harnais, lireLivraison } from '@harnais/moteur'
import { HOTE, PORT } from './app'

/** Le délai de la sonde après une bascule, et son pas. */
const SONDE_MS = 30_000
const PAS_SONDE_MS = 1000

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { client: { type: 'string' }, port: { type: 'string' } },
})
if (!values.client) {
  console.error(
    'usage : pnpm harnais --client <dossier> [--port 3777] [-- <options de pnpm interface>]',
  )
  process.exit(2)
}
const dossier = resolve(values.client)
const l = lireLivraison(dossier)
if (!l) {
  console.error(`${dossier} : client non livré (pas de livraison.yaml) ; lancer pnpm interface`)
  process.exit(2)
}
const port = values.port ?? String(PORT)
const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** L'interface répond-elle (`POST /api/roles`) dans le délai ? */
async function sonder(): Promise<boolean> {
  const fin = Date.now() + SONDE_MS
  while (Date.now() < fin) {
    try {
      const r = await fetch(`http://${HOTE}:${port}/api/roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (r.ok) return true
    } catch {
      // Pas encore à l'écoute.
    }
    await attendre(PAS_SONDE_MS)
  }
  return false
}

const arret = await harnais({
  installation: l.installation,
  lancer: (arbre) => {
    const enfant = spawn(
      'pnpm',
      ['interface', '--client', dossier, '--port', port, ...positionals],
      { cwd: arbre, stdio: 'inherit', env: envEnfant(process.env) },
    )
    return {
      fin: new Promise((r) => enfant.on('exit', (code) => r(code))),
      arreter: () => enfant.kill('SIGTERM'),
    }
  },
  sonder,
  attendre,
  maintenant: () => Date.now(),
  dire: (m) => console.log(`harnais : ${m}`),
})
console.error(`harnais arrêté : ${arret.raison}`)
process.exitCode = 1
