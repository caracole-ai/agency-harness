// pnpm agence [--une-fois]
// L'agence prend les missions que ses clients commandent (PLAN-LIVRAISON.md
// L1) : une boucle, toutes les `agence.yaml: agence.intervalle_secondes`,
// sous un verrou (`.claude/missions/agence.lock`, le pid ; un verrou dont le
// pid est mort, ou posé avant le démarrage de la machine, est levé). À
// chaque tour, la file de chaque client (`agence.clients`) tirée dans
// `.claude/missions/<slug>/`, la mission à prendre (le client qui a eu le
// moins de chantiers aujourd'hui, puis la plus ancienne), au plus
// `chantiers_max_par_jour` chantiers par jour ; son chantier (dans un arbre
// de ce dépôt parti d'`origin/main` : ni l'arbre de qui lance ni son `main`
// ne bougent), son dossier et son statut complets gardés à l'agence
// (`.claude/missions/_chantiers/<slug>/<date>/`), le statut public (sans le
// texte du chantier) poussé dans la file du client. Avant tout chantier, le
// préflight : `claude auth status` connecté, ANTHROPIC_API_KEY absente, la
// clé de signature (AGENCE_CLE_SIGNATURE, hors du dépôt), `origin`
// joignable. --une-fois : un seul tour (un cron, un test). Ctrl-C arrête la
// boucle, le verrou est rendu.
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { nomsFictifs } from '../agence/fictif'
import { commandeSync } from '../chantier/arbre'
import { prendreVerrou, type TourAgence, tourAgence } from '../livraison/agence'
import { conversationDuMetier } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const { values } = parseArgs({ options: { 'une-fois': { type: 'boolean' } } })
const agence = chargerAgence(RACINE)

const heure = () => new Date().toISOString().slice(11, 19)
function dire(t: TourAgence): void {
  for (const p of t.problemes) console.log(`${heure()} file : ${p}`)
  for (const e of t.ecartees)
    console.log(`${heure()} écartée (un autre métier que son client) : ${e}`)
  if (t.attente) console.log(`${heure()} en attente (borne du jour) : ${t.attente}`)
  if (t.prise) console.log(`${heure()} ${t.prise.mission} : ${t.prise.statut} — ${t.prise.issue}`)
}

let rendre: (() => void) | undefined
try {
  rendre = prendreVerrou(commandeSync, RACINE)
  process.on('SIGINT', () => {
    rendre?.()
    process.exit(130)
  })
  if (agence.agence.clients.length === 0) {
    console.log('Aucun client dans agence.yaml (agence.clients) : rien à prendre.')
  }
  for (;;) {
    try {
      dire(
        await tourAgence({
          racine: RACINE,
          agence,
          env: process.env,
          metier: conversationDuMetier,
          personnes: (metier) => nomsFictifs(agence.chantier.evals_clients, RACINE, [metier]),
        }),
      )
    } catch (erreur) {
      // Un préflight qui échoue, une file qui ne se pousse pas : dit, puis le tour suivant.
      console.error(`${heure()} ${(erreur as Error).message}`)
      if (values['une-fois']) process.exitCode = 1
    }
    if (values['une-fois']) break
    await new Promise((r) => setTimeout(r, agence.agence.intervalle_secondes * 1000))
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
} finally {
  rendre?.()
}
