// pnpm nuit --client <dossier> [--date AAAA-MM-JJ]
// La nuit (PLAN-RONDE.md § 7, R8 ; PLAN-GENERAL.md G3) : le clone de la nuit
// (`agence.yaml: depot_nuit`) remis à `origin/main`, avant tout appel (un
// clone sale ou qui serait l'arbre courant arrête la nuit) ; puis `pnpm
// promotions` → la ronde (sa mémoire écrite et poussée depuis le clone) → le
// chantier de la première mission non traitée, au plus
// `missions_max_par_nuit` ; la ligne de la nuit dans `memoire/MESURES.md`.
// Une étape qui échoue n'arrête pas les suivantes. Relancée la même nuit, elle
// ne refait rien. Rien n'est installé : la ligne cron est dans le README.
// Sous acces: claude, l'abonnement par le binaire : ANTHROPIC_API_KEY doit être
// absente, et le coût est « estimé par le binaire » ; les promotions et la
// mesure d'honnêteté appellent le modèle du quotidien (sa clé).
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { chargerAgence } from '../agence/config'
import { faireNuit } from '../chantier/nuit'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { MetierConversation } from '../conversation/conversation'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: { client: { type: 'string' }, date: { type: 'string' } },
})
if (!values.client) {
  console.error('usage : pnpm nuit --client <dossier> [--date AAAA-MM-JJ]')
  process.exit(2)
}

const dossier = resolve(values.client)
const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)

const r = await faireNuit(module.CONVERSATION, {
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
