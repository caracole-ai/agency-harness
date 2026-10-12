// pnpm gestes --client <dossier> lister | verifier <id> [--avec-modele] | activer <id> --par <nom> | retirer <id> --motif "<texte>" [--par <nom>]
// L'atelier devant les gestes appris d'un client (PLAN-PROMOTION.md § 7.1) :
// la liste de `gestes/` avec leur dernière vérification ; la vérification en
// code d'un geste (gabarit, rejeu, valeurs en dur, description), et avec
// `--avec-modele` la passe de traduction qui décide « activable » ;
// l'activation (la clé au journal, que le chargement exige) et le retrait.
// `<id>` est l'identifiant du geste, ou le nom de son fichier quand plusieurs
// le portent. `--par` n'a pas de valeur par défaut : activer engage quelqu'un.
// L'interface fait la même chose (§ 7.2). Exige la clé que
// nomme la config pour --avec-modele seulement. Travailler sur une copie du
// client fictif, jamais sur `exemples/`.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { MetierConversation } from '../conversation/conversation'
import { FichierTraduire } from '../evals/evals'
import { passeTraduction } from '../evals/traduction'
import { modeleDepuisConfig } from '../modele/anthropic'
import {
  activerGeste,
  type GesteListe,
  listerGestes,
  retirerGeste,
  STATUT_LISIBLE,
  verifierGesteAppris,
} from '../promotion/atelier'
import { dollars } from '../promotion/promotion'
import { dateFr, FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')
const COMMANDES = ['lister', 'verifier', 'activer', 'retirer'] as const
type Commande = (typeof COMMANDES)[number]

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: 'string' },
    'avec-modele': { type: 'boolean' },
    par: { type: 'string' },
    motif: { type: 'string' },
  },
})
const [commande, cible] = positionals as [Commande | undefined, string | undefined]
const usage = (): never => {
  console.error(
    'usage : pnpm gestes --client <dossier> lister | verifier <id> [--avec-modele] | activer <id> --par <nom> | retirer <id> --motif "<texte>" [--par <nom>]',
  )
  process.exit(2)
}
if (commande === undefined || !COMMANDES.includes(commande) || !values.client) usage()
if (commande !== 'lister' && cible === undefined) usage()
if (commande === 'activer' && !values.par) usage()
if (commande === 'retirer' && !values.motif) usage()

const dossier = resolve(values.client as string)
const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
const m = module.CONVERSATION
const maintenant = Temporal.Now.zonedDateTimeISO(FUSEAU)
const pourCent = (taux: number) => `${Math.round(taux * 100)} %`

/** `05/10/2026 à 09:12`, en heure de Paris. */
function quand(horodatage: string): string {
  const z = Temporal.Instant.from(horodatage).toZonedDateTimeISO(FUSEAU)
  return `${dateFr(z)} à ${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`
}

/** Une ligne par fichier : statut, date, tests, dernière vérification, activable ou pourquoi pas. */
function decrire(g: GesteListe): string {
  if (g.statut === undefined) return `${g.fichier} : illisible (${g.erreur ?? '?'})`
  const v = g.verification
  const verification = !v
    ? 'jamais vérifié sur cette empreinte'
    : `vérifié le ${quand(v.horodatage)} : ${v.ecarts.length === 0 ? 'aucun écart' : `${v.ecarts.length} écart(s)`}${
        v.traduction
          ? `, traduction ${pourCent(v.traduction.taux)} (${v.traduction.atteint ? 'seuil atteint' : 'sous le seuil'}, ${dollars(v.traduction.cout_usd)} $)`
          : ', sans modèle'
      }`
  const fin =
    g.statut === 'propose'
      ? g.activable
        ? 'activable'
        : `non activable : ${g.motif ?? '?'}`
      : g.validation
        ? `activé le ${g.validation.le} par ${g.validation.par}`
        : ''
  return `${g.fichier} : ${g.id}, ${STATUT_LISIBLE[g.statut]}, fabriqué le ${g.fabriqueLe}, ${g.tests} tests ; ${verification}${fin ? ` ; ${fin}` : ''}`
}

const s = m.ouvrir(dossier)
try {
  const journal = m.journal(s)
  const client = m.client(s)
  switch (commande as Commande) {
    case 'lister': {
      const gestes = listerGestes(dossier, journal)
      if (gestes.length === 0) console.log('Aucun geste appris dans gestes/.')
      for (const g of gestes) console.log(decrire(g))
      break
    }
    case 'verifier': {
      const modele = values['avec-modele']
        ? modeleDepuisConfig(m.config(s), process.env)
        : undefined
      const issue = await verifierGesteAppris(m, s, dossier, cible as string, {
        horodatage: maintenant.toInstant().toString(),
        ...(modele
          ? {
              modele: modele.id,
              traduction: async (geste) => {
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
                      console.log(`Passe de traduction, gestes appris chargés : ${ids.join(', ')}`)
                    },
                    surCas: (r) =>
                      console.log(
                        `  ${r.id} : ${r.ecarts.length === 0 ? 'ok' : `écart (${r.ecarts.join(' ; ')})`}`,
                      ),
                  },
                )
                console.log(`Tableau de la passe : ${passe.tableau}`)
                return passe
              },
            }
          : {}),
      })
      console.log(
        `${issue.fichier} : rejeu ${issue.rejeu.ok}/${issue.rejeu.total}, ${issue.ecarts.length === 0 ? 'aucun écart' : `${issue.ecarts.length} écart(s)`}.`,
      )
      for (const e of issue.ecarts) console.log(`- ${e.texte}`)
      const t = issue.traduction
      if (t) {
        console.log(
          `Traduction : ${pourCent(t.taux)} (${t.ok}/${t.total}, ${dollars(t.coutUsd)} $)${t.stricts.length > 0 ? ` ; cas stricts en écart : ${t.stricts.join(', ')}` : ''}.`,
        )
      } else if (issue.ecarts.length === 0 && !modele) {
        console.log('Sans modèle : relancer avec --avec-modele pour que le geste soit activable.')
      }
      console.log(
        issue.activable
          ? `Activable : oui (pnpm gestes activer ${issue.geste.id} --client ${dossier} --par <nom>, ou dans l’interface).`
          : 'Activable : non.',
      )
      break
    }
    case 'activer': {
      const { fichier, jeton } = activerGeste(
        dossier,
        journal,
        client,
        cible as string,
        values.par as string,
        maintenant,
      )
      console.log(`${fichier} activé par ${values.par} (empreinte ${jeton}).`)
      break
    }
    case 'retirer': {
      const { fichier } = retirerGeste(
        dossier,
        journal,
        client,
        cible as string,
        values.motif as string,
        values.par,
        maintenant,
      )
      console.log(`${fichier} retiré : ${values.motif}`)
      break
    }
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
} finally {
  m.fermer(s)
}
