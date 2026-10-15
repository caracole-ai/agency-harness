// pnpm chantier --mission <client>/rondes/<date>/<id>.yaml [--sans-modele] [--refaire]
// pnpm chantier retirer <id> --motif "<texte>" --client <dossier>
// Le chantier d'une mission de la ronde (PLAN-RONDE.md § 6.3, R5 ;
// PLAN-GENERAL.md G1, G2, G3) : décidé en code (promotion en cours, question
// pour l'atelier, écartée : aucun appel), puis plan, implémentation, garde,
// `pnpm check`, relecture, une reprise au plus, honnêteté, dans un arbre de
// travail du clone de la nuit (`agence.yaml: depot_nuit`) ; le dossier
// `<client>/chantiers/<id>.md`, la mémoire, et la fusion dans `main` du clone
// si les huit conditions sont vertes. Une mission déjà tentée ne se refait pas
// sans --refaire. --sans-modele : la décision et ce que le plan recevrait,
// aucun appel, aucun git.
// `retirer` (G2) : `git revert -m 1` de la fusion, push, la mémoire (motif et
// intentions : la ronde ne repropose pas la mission), la ligne au journal du
// client (`--client` : la mémoire ne garde aucun chemin de client).
// Sous acces: claude, l'abonnement par le binaire : ANTHROPIC_API_KEY doit être
// absente, et le coût est « estimé par le binaire » ; la mesure d'honnêteté
// appelle le modèle du quotidien (la clé que nomme la config du client).
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence, cheminDepotNuit } from '../agence/config'
import { commandeSync } from '../chantier/arbre'
import { faireChantier, TYPE_CHANTIER } from '../chantier/chantier'
import { retirerFusion } from '../chantier/fusion'
import { ecrireRetrait, missionsRetirees } from '../chantier/memoire'
import { lireMission } from '../chantier/mission'
import { dollars } from '../modele/modele'
import { DOSSIER_RONDES } from '../ronde/ronde'
import { FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mission: { type: 'string' },
    'sans-modele': { type: 'boolean' },
    refaire: { type: 'boolean' },
    motif: { type: 'string' },
    client: { type: 'string' },
  },
})
const USAGE =
  'usage : pnpm chantier --mission <client>/rondes/<date>/<id>.yaml [--sans-modele] [--refaire] | pnpm chantier retirer <id> --motif "<texte>" --client <dossier>'

const agence = chargerAgence(RACINE)

try {
  if (positionals[0] === 'retirer') {
    const id = positionals[1]
    if (!id || !values.motif || !values.client) {
      console.error(USAGE)
      process.exit(2)
    }
    const dossier = resolve(values.client)
    // La mission, chez le client : son titre et ses intentions vont à la mémoire du retrait.
    const rondes = join(dossier, DOSSIER_RONDES)
    const fichier = existsSync(rondes)
      ? readdirSync(rondes)
          .map((d) => join(rondes, d, `${id}.yaml`))
          .filter((f) => existsSync(f))
          .sort()
          .at(-1)
      : undefined
    if (!fichier) throw new Error(`${id} : aucune mission de ce nom dans ${rondes}`)
    const { mission } = lireMission(fichier)
    const m = await metierDe(dossier)
    const depot = cheminDepotNuit(agence, RACINE)
    const motif = values.motif
    const maintenant = Temporal.Now.zonedDateTimeISO(FUSEAU)
    const s = m.ouvrir(dossier)
    try {
      const client = m.client(s)
      const personnes = m.noms(s)
      const r = retirerFusion({
        commande: commandeSync,
        depot,
        racineCourante: RACINE,
        id,
        motif,
        dejaRetiree: missionsRetirees(depot).some((x) => x.id === id),
        ecrireRetrait: () =>
          ecrireRetrait(
            depot,
            {
              date: maintenant.toPlainDate().toString(),
              client,
              id,
              titre: mission.titre,
              intentions: mission.intentions,
              motif,
            },
            personnes,
          ),
      })
      m.journal(s).ecrire(
        [
          {
            type: TYPE_CHANTIER,
            client,
            objet: id,
            issue: 'retiré',
            donnees: { revert: r.revert },
          },
        ],
        maintenant.toInstant().toString(),
      )
      console.log(`${id} retiré : ${r.revert.slice(0, 12)} sur main du clone de la nuit, poussé.`)
    } finally {
      m.fermer(s)
    }
  } else {
    if (!values.mission) {
      console.error(USAGE)
      process.exit(2)
    }
    const chemin = resolve(values.mission)
    const m = await metierDe(lireMission(chemin).dossierClient)
    const r = await faireChantier(m, {
      racine: RACINE,
      agence,
      mission: chemin,
      env: process.env,
      sansModele: values['sans-modele'] === true,
      refaire: values.refaire === true,
    })
    switch (r.sorte) {
      case 'decision':
        console.log(`${r.decision.motif} : aucun appel. ${r.dossier}`)
        break
      case 'sans_modele':
        console.log(`Sans modèle (décision : ${r.decision.sorte}) : aucun appel. ${r.dossier}`)
        break
      case 'deja_tentee':
        console.log(
          'Mission déjà tentée (sa branche existe dans le clone) : --refaire pour la reprendre.',
        )
        break
      case 'fuite':
        console.log(
          `Refusé avant tout appel : ${r.fuite.length} nom(s) partirai(en)t. ${r.dossier}`,
        )
        process.exitCode = 1
        break
      case 'fait':
        console.log(
          `Chantier : ${r.issue} ; ${dollars(r.cout)} $ (estimé par le binaire) ; ${Math.round(r.dureeMs / 1000)} s.`,
        )
        for (const k of r.conditions)
          console.log(`  ${k.ok ? 'vert ' : 'ROUGE'} ${k.id} : ${k.mesure}`)
        for (const k of r.constats)
          console.log(`  constat ${k.niveau} ${k.fichier}:${k.ligne} : ${k.texte}`)
        console.log(r.dossier)
        // Une question pour l'atelier n'est pas un échec : rien n'était à fusionner.
        if (r.conditions.length > 0 && r.fusion?.sorte !== 'fusionne') process.exitCode = 1
        break
    }
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
