// pnpm ronde --client <dossier> --date AAAA-MM-JJ [--depuis AAAA-MM-JJ] [--refaire] [--sans-modele]
// pnpm ronde --verifier-modeles
// La ronde de nuit (PLAN-RONDE.md § 5.3, amendé § 0.a) : le résumé du journal
// fait en code (jamais une donnée), le catalogue, la carte et la mémoire
// partent au modèle `ronde` d'`agence.yaml`, qui désigne des missions ; le code
// revalide, écrit `rondes/<date>.md`, `.json` et une mission par fichier chez
// le client, la ligne `ronde` au journal (des comptes), et la mémoire du dépôt.
// Relancée pour la même date, elle ne refait rien sans --refaire.
// --sans-modele : le résumé et le catalogue dans le `.md`, aucun appel.
// --verifier-modeles : un appel minuscule à chaque modèle de l'agence, avant la
// première nuit (un identifiant faux n'échouerait qu'au premier appel, § 4.1).
// Sous acces: claude, l'abonnement par le binaire : ANTHROPIC_API_KEY doit être
// absente, et le coût est « estimé par le binaire ». Travailler sur une copie
// du client fictif, jamais sur `exemples/`.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { lancerClaude } from '../chantier/claude'
import { dollars } from '../promotion/promotion'
import { faireRonde } from '../ronde/ronde'
import { Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    date: { type: 'string' },
    depuis: { type: 'string' },
    refaire: { type: 'boolean' },
    'sans-modele': { type: 'boolean' },
    'verifier-modeles': { type: 'boolean' },
  },
})
const USAGE =
  'usage : pnpm ronde --client <dossier> --date AAAA-MM-JJ [--depuis AAAA-MM-JJ] [--refaire] [--sans-modele] | pnpm ronde --verifier-modeles'

const agence = chargerAgence(RACINE)

if (values['verifier-modeles']) {
  const roles = {
    ronde: agence.modeles.ronde,
    'chantier.plan': agence.modeles.chantier.plan,
    'chantier.implementation': agence.modeles.chantier.implementation,
    'chantier.revue': agence.modeles.chantier.revue,
  }
  let echecs = 0
  for (const [role, m] of Object.entries(roles)) {
    if (m.acces !== 'claude') {
      console.log(`${role} : ${m.modele} sous acces: ${m.acces}, non vérifié par cette commande`)
      continue
    }
    const vide = mkdtempSync(join(tmpdir(), 'verifier-'))
    try {
      const r = await lancerClaude(
        {
          modele: m.modele,
          effort: 'low',
          prompt: 'Réponds par le seul mot « ok ».',
          systeme: 'Tu réponds en un mot.',
          outils: [],
          cwd: vide,
          delaiMs: agence.ronde.delai_secondes * 1000,
          reglages: 'aucun',
        },
        agence,
        process.env,
      )
      if (!r.ok) echecs++
      console.log(
        `${role} : ${m.modele} ${r.ok ? 'répond' : `échoue (${r.raison ?? '?'})`} ; ${dollars(r.cout)} $ (estimé par le binaire)`,
      )
    } catch (erreur) {
      echecs++
      console.log(`${role} : ${m.modele} refusé avant l'appel : ${(erreur as Error).message}`)
    } finally {
      rmSync(vide, { recursive: true, force: true })
    }
  }
  process.exit(echecs > 0 ? 1 : 0)
}

if (!values.client || !values.date) {
  console.error(USAGE)
  process.exit(2)
}

const dossier = resolve(values.client)
const metier = await metierDe(dossier)

try {
  const r = await faireRonde(metier, {
    racine: RACINE,
    dossierClient: dossier,
    date: Temporal.PlainDate.from(values.date),
    ...(values.depuis ? { depuis: Temporal.PlainDate.from(values.depuis) } : {}),
    refaire: values.refaire === true,
    sansModele: values['sans-modele'] === true,
    agence,
    env: process.env,
  })
  switch (r.sorte) {
    case 'deja_faite':
      console.log(
        `Ronde déjà faite pour ${values.date} : ${r.fichier} (--refaire pour la refaire).`,
      )
      break
    case 'sans_modele':
      console.log(
        `Sans modèle : ${r.resume.demandes.length} demande(s), ${r.resume.conversations} conversation(s) ; aucun appel. ${r.fichier}`,
      )
      break
    case 'faite':
      console.log(
        `Ronde du ${values.date} : ${r.issue}${r.raison ? ` (${r.raison})` : ''} ; ${r.missions.length} mission(s) ; ${dollars(r.cout_usd)} $${r.estime ? ' (estimé par le binaire)' : ''} ; fuite ${r.fuite.length}.`,
      )
      for (const e of r.ecarts ?? []) console.log(`  écart : ${e}`)
      for (const m of r.missions) {
        console.log(
          `  ${m.mission.id} (${m.mission.sorte}) : ${m.statut}${m.raison ? ` — ${m.raison}` : ''}`,
        )
      }
      console.log(r.fichier)
      if (r.issue === 'ronde échouée' || r.fuite.length > 0) process.exitCode = 1
      break
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
