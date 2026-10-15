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
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { nomsFictifs } from '../agence/fictif'
import { commandeSync } from '../chantier/arbre'
import { faireChantier } from '../chantier/chantier'
import { retirerFusion } from '../chantier/fusion'
import { ecrireRetrait, missionFusionnee } from '../chantier/memoire'
import { lireMission } from '../chantier/mission'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { statuerRetrait } from '../livraison/missions'
import { preflightSignature } from '../livraison/version'
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

try {
  if (positionals[0] === 'retirer') {
    const id = positionals[1]
    if (!id || !values.motif) {
      console.error(USAGE)
      process.exit(2)
    }
    const motif = values.motif
    const maintenant = Temporal.Now.zonedDateTimeISO(FUSEAU)
    const cle = preflightSignature(process.env, RACINE)
    const personnes = await nomsFictifs(
      agence.chantier.evals_clients,
      RACINE,
      Object.keys(agence.chantier.evals_clients),
    )
    let client: string | undefined
    const r = retirerFusion({
      commande: commandeSync,
      racine: RACINE,
      id,
      motif,
      version: { cle, jour: maintenant.toPlainDate().toString() },
      ecrireRetrait: (arbre) => {
        const fusion = missionFusionnee(arbre, id)
        if (!fusion) throw new Error(`aucune fusion de ${id} dans la mémoire d'origin/main`)
        client = fusion.client
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
    console.log(
      `${id} retiré : ${r.revert.slice(0, 12)} sur main du distant, version ${r.version}, poussé.`,
    )
    // Le client qui l'avait commandé le lit dans sa file (PLAN-LIVRAISON.md L7).
    const dit =
      client === undefined
        ? { sorte: 'absent' as const }
        : statuerRetrait(commandeSync, RACINE, agence.agence.clients, client, id, {
            statut: 'retiré',
            issue: `retiré : ${motif}`,
            version: r.version,
            cout_usd: 0,
            le: maintenant.toInstant().toString(),
          })
    console.log(
      dit.sorte === 'poussé'
        ? `Statut « retiré » poussé dans la file de ${client}.`
        : dit.sorte === 'en attente'
          ? `Statut « retiré » écrit dans la file de ${client}, pas encore poussé (${dit.raison}) : le prochain tour de pnpm agence le pousse.`
          : `${client ?? 'Le client'} n'a pas de file à l'agence, ou la mission n'y est pas : rien n'est poussé.`,
    )
  } else {
    if (!values.mission) {
      console.error(USAGE)
      process.exit(2)
    }
    const chemin = resolve(values.mission)
    const { mission, client } = lireMission(chemin)
    // Une mission chez un client (non livré) : son métier est celui du client, sinon le chantier
    // ouvrirait la bande d'un autre métier, et le geste partirait chez ses clients (L10).
    const config = join(dirname(chemin), '..', '..', FICHIER_CONFIG)
    if (existsSync(config) && chargerConfig(config, ConfigBase).metier !== mission.metier) {
      throw new Error(
        `mission ${mission.id} du métier ${mission.metier}, client du métier ${chargerConfig(config, ConfigBase).metier}`,
      )
    }
    const r = await faireChantier(await conversationDuMetier(mission.metier), {
      racine: RACINE,
      agence,
      mission: chemin,
      client,
      personnes: await nomsFictifs(agence.chantier.evals_clients, RACINE, [mission.metier]),
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
