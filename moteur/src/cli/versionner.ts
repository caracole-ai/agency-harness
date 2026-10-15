// pnpm versionner
// Une version signée sur `origin/main` tel quel (PLAN-LIVRAISON.md L4) : pour
// livrer un changement du moteur sans chantier. Dans un arbre détaché de ce
// dépôt (ni l'arbre de qui lance ni son `main` ne bougent), l'étiquette
// `v<AAAA-MM-JJ>-<n>` signée avec la clé que désigne `AGENCE_CLE_SIGNATURE`
// (un chemin hors du dépôt), puis l'étiquette seule poussée. Un `origin/main`
// qui porte déjà une version : rien n'est posé. Le nom n'est pas `pnpm
// version` : pnpm en a une à lui, qui masquerait le script.
import { fileURLToPath } from 'node:url'
import { commandeSync } from '../chantier/arbre'
import { versionner } from '../chantier/fusion'
import { preflightSignature } from '../livraison/version'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

try {
  const r = versionner({
    commande: commandeSync,
    racine: RACINE,
    version: {
      cle: preflightSignature(process.env, RACINE),
      jour: Temporal.Now.zonedDateTimeISO(FUSEAU).toPlainDate().toString(),
    },
  })
  console.log(
    r.sorte === 'posee'
      ? `${r.version} posée sur ${r.commit.slice(0, 12)} (origin/main), signée, poussée.`
      : `origin/main (${r.commit.slice(0, 12)}) porte déjà ${r.version} : rien n'est posé.`,
  )
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
