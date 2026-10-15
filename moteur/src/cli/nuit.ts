// pnpm nuit --client <dossier> [--date AAAA-MM-JJ]
// La nuit (PLAN-RONDE.md § 7, R8 ; PLAN-GENERAL.md G3) : le clone de la nuit
// (`agence.yaml: depot_nuit`) remis à `origin/main`, avant tout appel (un
// clone sale ou qui serait l'arbre courant arrête la nuit) ; puis le chantier
// de la première mission commandée non traitée, au plus
// `missions_max_par_nuit` ; la ligne de la nuit dans `memoire/MESURES.md`.
// Une étape qui échoue n'arrête pas les suivantes. Relancée la même nuit, elle
// ne refait rien. Rien n'est installé : la ligne cron est dans le README.
// Sous acces: claude, l'abonnement par le binaire : ANTHROPIC_API_KEY doit être
// absente, et le coût est « estimé par le binaire » ; la mesure d'honnêteté
// appelle le modèle du quotidien.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { faireNuit } from '../chantier/nuit'
import { FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: { client: { type: 'string' }, date: { type: 'string' } },
})
if (!values.client) {
  console.error('usage : pnpm nuit --client <dossier> [--date AAAA-MM-JJ]')
  process.exit(2)
}

const dossier = resolve(values.client)
const metier = await metierDe(dossier)

const r = await faireNuit(metier, {
  racine: RACINE,
  agence: chargerAgence(RACINE),
  dossierClient: dossier,
  date: values.date
    ? Temporal.PlainDate.from(values.date)
    : Temporal.Now.zonedDateTimeISO(FUSEAU).toPlainDate(),
  env: process.env,
})
for (const e of r.etapes) console.log(`${e.ok ? 'ok   ' : 'ÉCHEC'} ${e.etape} : ${e.issue}`)
for (const c of r.chantiers) console.log(`  ${c.sorte} : ${c.dossier}`)
if (r.etapes.some((e) => !e.ok)) process.exitCode = 1
