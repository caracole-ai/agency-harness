// pnpm chantier --mission <fichier> [--sortie <dossier>] [--sans-modele] [--refaire]
// pnpm chantier retirer <id> --motif "<texte>"
// Le chantier d'une mission commandée par le patron (PLAN-RONDE.md § 6.3, R5 ;
// PLAN-GENERAL.md G1, G2 ; PLAN-LIVRAISON.md L2, L3), à l'agence : décidé en
// code (retirée, geste déjà actif : aucun appel), puis plan, implémentation,
// garde, `pnpm check`, relecture, une reprise au plus, honnêteté, dans un
// arbre de travail parti d'`origin/main` (`.claude/worktrees/chantier-<id>` de
// ce dépôt, dont ni l'arbre ni `main` ne bougent) ; la mémoire, et la fusion
// sur `main` du distant si les huit conditions sont vertes. Le dossier
// `<id>.chantier.md` et le statut `<id>.statut.yaml` vont dans `--sortie`
// (par défaut, à côté de la mission). Le métier est celui que la mission
// nomme ; les noms contrôlés, ceux de son client fictif (`evals_clients`) :
// le chantier ne lit aucun dossier client. Une mission déjà tentée ne se
// refait pas sans --refaire. --sans-modele : la décision et ce que le plan
// recevrait, aucun appel, aucun git.
// `retirer` (G2) : `git revert -m 1` de la fusion dans un arbre détaché, push,
// la mémoire (motif, et le client, le titre et les intentions que la mémoire
// de la fusion garde : la mission n'est jamais refaite).
// Sous acces: claude, l'abonnement par le binaire : ANTHROPIC_API_KEY doit être
// absente, et le coût est « estimé par le binaire » ; la mesure d'honnêteté
// appelle le modèle du quotidien (la clé que nomme la config du client).
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { personnesFictives } from '../agence/fictif'
import { commandeSync } from '../chantier/arbre'
import { faireChantier } from '../chantier/chantier'
import { retirerFusion } from '../chantier/fusion'
import { ecrireRetrait, missionFusionnee } from '../chantier/memoire'
import { lireMission } from '../chantier/mission'
import type { Designable } from '../conversation/designation'
import { dollars } from '../modele/modele'
import { FUSEAU, Temporal } from '../temps/temporal'
import { conversationDuMetier } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mission: { type: 'string' },
    sortie: { type: 'string' },
    'sans-modele': { type: 'boolean' },
    refaire: { type: 'boolean' },
    motif: { type: 'string' },
  },
})
const USAGE =
  'usage : pnpm chantier --mission <fichier> [--sortie <dossier>] [--sans-modele] [--refaire] | pnpm chantier retirer <id> --motif "<texte>"'

const agence = chargerAgence(RACINE)

/** Les noms des clients fictifs de ces métiers (`evals_clients`) : à l'agence, les seuls noms connus (L3). */
async function nomsFictifs(metiers: string[]): Promise<Designable[]> {
  const clients = metiers.flatMap((x) => agence.chantier.evals_clients[x] ?? [])
  return (await Promise.all(clients.map((d) => personnesFictives(join(RACINE, d))))).flat()
}

try {
  if (positionals[0] === 'retirer') {
    const id = positionals[1]
    if (!id || !values.motif) {
      console.error(USAGE)
      process.exit(2)
    }
    const motif = values.motif
    const maintenant = Temporal.Now.zonedDateTimeISO(FUSEAU)
    const personnes = await nomsFictifs(Object.keys(agence.chantier.evals_clients))
    const r = retirerFusion({
      commande: commandeSync,
      racine: RACINE,
      id,
      motif,
      ecrireRetrait: (arbre) => {
        const fusion = missionFusionnee(arbre, id)
        if (!fusion) throw new Error(`aucune fusion de ${id} dans la mémoire d'origin/main`)
        ecrireRetrait(
          arbre,
          {
            date: maintenant.toPlainDate().toString(),
            client: fusion.client,
            id,
            titre: fusion.titre,
            intentions: fusion.intentions,
            motif,
          },
          personnes,
        )
      },
    })
    console.log(`${id} retiré : ${r.revert.slice(0, 12)} sur main du distant, poussé.`)
  } else {
    if (!values.mission) {
      console.error(USAGE)
      process.exit(2)
    }
    const chemin = resolve(values.mission)
    const { mission, client } = lireMission(chemin)
    const r = await faireChantier(await conversationDuMetier(mission.metier), {
      racine: RACINE,
      agence,
      mission: chemin,
      client,
      personnes: await nomsFictifs([mission.metier]),
      sortie: values.sortie ? resolve(values.sortie) : dirname(chemin),
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
          'Mission déjà tentée (sa branche existe dans ce dépôt) : --refaire pour la reprendre.',
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
