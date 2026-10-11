// pnpm promotions --client <dossier> [--date AAAA-MM-JJ] [--sans-modele]
// Le compteur des demandes nouvelles (PLAN-ESPACES.md § 8) et la fabrication
// (PLAN-PROMOTION.md § 6.3) : le coût de l'IA du mois et son plafond, chaque
// intention comptée sur la fenêtre de la config ; pour celle qui atteint le
// seuil, le modèle fabrique un geste appris, le code le vérifie et l'écrit en
// `gestes/<id>.yaml` (statut proposé), puis une passe de traduction avec
// modèle dit s'il est activable par le patron (P6) ; le dossier de promotion
// raconte tout. Une intention qui écrit attend le lot 4 (P15). Puis la purge
// des instantanés d'échappée plus vieux que `conservation_jours` qu'aucun
// geste appris ne cite (P8). `--sans-modele` : le dossier seul, aucun appel.
// Exige la clé que nomme la config, sauf --sans-modele. Travailler sur une
// copie du client fictif, jamais sur `exemples/`.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { MetierConversation } from '../conversation/conversation'
import { FichierTraduire } from '../evals/evals'
import { type BilanTraduction, passeTraduction } from '../evals/traduction'
import { modeleDepuisConfig } from '../modele/anthropic'
import { coutDuMois } from '../modele/compteur'
import type { Modele } from '../modele/modele'
import {
  aProposer,
  debutFenetre,
  dollars,
  type Fabrication,
  intentions,
  purgerInstantanes,
  resumeCout,
} from '../promotion/promotion'
import { compterFabrications, promouvoir } from '../promotion/promouvoir'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    date: { type: 'string' },
    'sans-modele': { type: 'boolean' },
  },
})
if (!values.client) {
  console.error('usage : pnpm promotions --client <dossier> [--date AAAA-MM-JJ] [--sans-modele]')
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

/** Ce que le dossier dit de la fabrication, en une ligne pour le terminal. */
function resumer(f: Fabrication): string {
  switch (f.sorte) {
    case 'hors_catalogue':
      return 'hors du catalogue, non tentée'
    case 'attend_lot_4':
      return 'écrit dans les données : attend le lot 4, non tentée'
    case 'plafond':
      return "plafond d'IA du mois atteint, non tentée"
    case 'echec':
      return `fabrication échouée : ${f.raison ?? '?'}`
    case 'ecarts':
      return `écartée par la vérification (rejeu ${f.rejeu?.ok ?? 0}/${f.rejeu?.total ?? 0}) : ${(f.ecarts ?? []).join(' ; ')}`
    case 'ecrit': {
      const t = f.traduction
      const traduction =
        t === undefined
          ? 'non mesurée'
          : t.erreur !== undefined
            ? `passe impossible (${t.erreur})`
            : `${Math.round(t.taux * 100)} %${t.stricts.length > 0 ? ` (cas stricts en écart : ${t.stricts.join(', ')})` : ''}`
      return `${f.fichier} ; vérification : ${f.rejeu?.ok ?? 0}/${f.rejeu?.total ?? 0} ; traduction : ${traduction} ; ${f.activable ? 'activable' : 'non activable'}`
    }
  }
}

const s = m.ouvrir(dossier)
try {
  const config = m.config(s)
  const journal = m.journal(s)
  const { jours, occurrences, conservation_jours } = config.promotion
  const mois = maintenant.toPlainDate().toPlainYearMonth().toString()
  console.log(resumeCout(coutDuMois(journal, mois), config.plafonds.par_mois_usd))

  const modele: Modele | undefined = values['sans-modele']
    ? undefined
    : modeleDepuisConfig(config, process.env)

  /** La passe de traduction avec modèle, le geste écrit chargé avec les autres gestes du dossier (§ 6.3, § 7.1) ; son tableau à côté du dossier de promotion. */
  const traduction = async (
    geste: Parameters<typeof passeTraduction>[2],
  ): Promise<BilanTraduction> => {
    const consignes = FichierTraduire.parse(
      parse(readFileSync(join(EVALS, 'consignes.yaml'), 'utf8')),
    )
    const passe = await passeTraduction(
      m,
      dossier,
      geste,
      consignes,
      (c) => modeleDepuisConfig(c, process.env),
      {
        date: maintenant.toPlainDate().toString(),
        surAppris: (ids, erreurs) => {
          for (const e of erreurs) console.error(e)
          console.log(`  Passe de traduction, gestes appris chargés : ${ids.join(', ')}`)
        },
        surCas: (r) =>
          console.log(
            `  ${r.id} : ${r.ecarts.length === 0 ? 'ok' : `écart (${r.ecarts.join(' ; ')})`}`,
          ),
      },
    )
    console.log(`  Tableau de la passe : ${passe.tableau}`)
    return passe
  }

  const comptees = intentions(journal, debutFenetre(maintenant, jours))
  if (comptees.length === 0) console.log(`Aucune demande nouvelle sur les ${jours} derniers jours.`)
  const proposees = new Set(aProposer(comptees, journal, { occurrences }))
  const fabrications: Fabrication[] = []
  for (const i of comptees) {
    console.log(`${i.intention} : ${i.occurrences} demande(s), ${dollars(i.cout_usd)} $`)
    if (!proposees.has(i)) continue
    const { dossier: chemin, fabrication } = await promouvoir(m, s, dossier, i, maintenant, jours, {
      ...(modele ? { modele, traduction } : {}),
    })
    if (fabrication) {
      fabrications.push(fabrication)
      console.log(`  ${resumer(fabrication)}`)
    }
    console.log(`Promotion proposée : ${chemin}`)
  }
  if (fabrications.length > 0) for (const l of compterFabrications(fabrications)) console.log(l)

  const purges = purgerInstantanes(
    dossier,
    journal,
    maintenant.toPlainDate().subtract({ days: conservation_jours }),
  )
  if (purges.length > 0) {
    console.log(`${purges.length} instantané(s) de plus de ${conservation_jours} jours purgé(s).`)
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
} finally {
  m.fermer(s)
}
