// pnpm promotions --client <dossier> [--date AAAA-MM-JJ]
// Le compteur des demandes nouvelles (PLAN-ESPACES.md § 8) : le coût de l'IA
// du mois et son plafond, chaque intention comptée sur la fenêtre de la config,
// et un dossier de promotion pour celle qui atteint le seuil. Aucun modèle de
// langage. Travailler sur une copie du client fictif, jamais sur `exemples/`.
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { MetierConversation } from '../conversation/conversation'
import { coutDuMois } from '../modele/compteur'
import { aProposer, dollars, ecrireDossier, intentions, resumeCout } from '../promotion/promotion'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    date: { type: 'string' },
  },
})
if (!values.client) {
  console.error('usage : pnpm promotions --client <dossier> [--date AAAA-MM-JJ]')
  process.exit(2)
}

const dossier = resolve(values.client)
const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
const m = module.CONVERSATION

/** `--date` à 23:59 heure de Paris, sinon l'heure réelle. */
const maintenant = values.date
  ? Temporal.PlainDate.from(values.date).toZonedDateTime({
      timeZone: FUSEAU,
      plainTime: Temporal.PlainTime.from('23:59'),
    })
  : Temporal.Now.zonedDateTimeISO(FUSEAU)

const s = m.ouvrir(dossier)
try {
  const config = m.config(s)
  const journal = m.journal(s)
  const { jours, occurrences } = config.promotion
  const mois = maintenant.toPlainDate().toPlainYearMonth().toString()
  console.log(resumeCout(coutDuMois(journal, mois), config.plafonds.par_mois_usd))

  const comptees = intentions(journal, maintenant.toPlainDate().subtract({ days: jours - 1 }))
  if (comptees.length === 0) console.log(`Aucune demande nouvelle sur les ${jours} derniers jours.`)
  const proposees = new Set(aProposer(comptees, journal, { occurrences }))
  for (const i of comptees) {
    console.log(`${i.intention} : ${i.occurrences} demande(s), ${dollars(i.cout_usd)} $`)
    if (proposees.has(i)) {
      const chemin = ecrireDossier(dossier, m.client(s), i, journal, maintenant, jours)
      console.log(`Promotion proposée : ${chemin}`)
    }
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
} finally {
  m.fermer(s)
}
