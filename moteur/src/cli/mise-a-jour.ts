// pnpm mise-a-jour --client <dossier>
// pnpm mise-a-jour retirer --client <dossier>
// La mise à jour d'un client livré (PLAN-LIVRAISON.md L8), à la main ou
// lancée par l'interface (sa minuterie) : les statuts des chantiers tirés de
// sa file, puis la prochaine version préparée dans l'installation (vérifiée,
// installée à côté, `pnpm check` rejoué) ; la bascule se fait au redémarrage,
// par le lanceur (`pnpm harnais`). Sans version courante (la première
// installation), la version préparée devient la courante. `retirer` : revenir
// à la version précédente à la main (`courant ← precedent`) ; l'interface le
// dira au journal à son redémarrage.
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { lireLivraison } from '../livraison/config'
import { revenir } from '../livraison/harnais'
import {
  cible,
  installerPremiere,
  LIENS,
  rattraper,
  verrouInstallation,
  versionDeLArbre,
} from '../livraison/mise-a-jour'
import { FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { client: { type: 'string' } },
})
const USAGE = 'usage : pnpm mise-a-jour [retirer] --client <dossier>'

try {
  if (!values.client) {
    console.error(USAGE)
    process.exit(2)
  }
  const dossier = resolve(values.client)
  const l = lireLivraison(dossier)
  if (!l) throw new Error(`${dossier} : client non livré (pas de livraison.yaml)`)
  if (positionals[0] === 'retirer') {
    const courante = versionDeLArbre(cible(l.installation, LIENS.courant))
    const precedente = versionDeLArbre(cible(l.installation, LIENS.precedent))
    if (!courante || !precedente) throw new Error('aucune version précédente où revenir')
    const rendre = verrouInstallation(l.installation)
    if (!rendre) throw new Error('une préparation tient l’installation : réessayer dans un instant')
    try {
      revenir(l.installation, courante, precedente, 'retirée à la main')
    } finally {
      rendre()
    }
    console.log(
      `${courante} → ${precedente} : à redémarrer (le lanceur relance sur la précédente).`,
    )
  } else {
    const m = await metierDe(dossier)
    const s = m.ouvrir(dossier)
    try {
      const r = rattraper(m, s, dossier, Temporal.Now.zonedDateTimeISO(FUSEAU), process.env)
      for (const p of r.statuts.problemes) console.log(`file : ${p}`)
      if (r.statuts.nouveaux > 0)
        console.log(`${r.statuts.nouveaux} statut(s) nouveau(x) au journal`)
      if (r.erreur) {
        console.log(`préparation impossible : ${r.erreur}`)
        process.exitCode = 1
      }
      const p = r.preparation
      if (p?.occupee) console.log('une autre préparation tient l’installation : rien à ce passage')
      for (const x of p?.refusees ?? []) console.log(`${x.version} refusée : ${x.raison}`)
      if (p?.prete && !p.prete.deja)
        console.log(`${p.prete.version} prête : bascule au prochain moment calme`)
      if (p?.prete?.deja) console.log(`${p.prete.version} attend déjà la bascule`)
      if (p?.prete && !cible(l.installation, LIENS.courant)) {
        console.log(`${installerPremiere(l)} installée : la première version courante`)
      }
      if (p?.refusees.some((x) => x.definitif)) process.exitCode = 1
    } finally {
      m.fermer(s)
    }
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
