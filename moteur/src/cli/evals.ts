// pnpm evals traduire|echappee|gestes --client <dossier> [--seulement id,id] [--modele simule]
// Les évals de la conversation (PLAN-ESPACES.md § 9) et du rejeu des gestes
// appris : chaque cas, écrit à la main dans
// `metiers/<métier>/evals/` (le métier du client, PLAN-METIER-2.md M8),
// tourne sur une copie fraîche du client (ou sur une variante dérivée de lui,
// pour un homonyme) ; la sortie est vérifiée en code, la trace complète est
// gardée dans `evals/traces/<horodatage>-<métier>-<quoi>/` (non versionné) et
// le tableau dans `evals/resultats/<horodatage>-<métier>-<quoi>.md`.
// `traduire` et `echappee` appellent le vrai modèle : exige la
// clé que nomme la config (ANTHROPIC_API_KEY sans `acces`), ou l'abonnement
// par le binaire (`acces: { binaire }`, le coût est alors une estimation), et
// coûte (≈ 0,3 $ les deux passes). `gestes` rejoue sans modèle, 0 $. `--modele simule` ne sert qu'à
// vérifier le câblage (tous les cas finissent en écart). Chaque cas avec modèle
// porte sa fuite (PLAN-PSEUDONYMES.md § 7) : les noms du client (`m.noms`)
// partis au modèle, colonne du tableau, seuil 0.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parse, stringify } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { avecSession } from '../conversation/conversation'
import { ecrireInstantane } from '../echappee/echappee'
import {
  bilan,
  ecartsEchappee,
  evalsDuMetier,
  FichierEchappee,
  FichierGestes,
  FichierTraduire,
  type ResultatCas,
  rendreResultats,
  SEUILS,
} from '../evals/evals'
import {
  apprisDuDossier,
  casDuFichier,
  configDuDossier,
  copieClient,
  jouerCas,
  jouerTraduction,
} from '../evals/traduction'
import { lireFichiersGestes } from '../gestes/charger'
import { type FichierGeste, gesteDe, personneDuTest } from '../gestes/geste-appris'
import { rejouerTest } from '../gestes/verifier'
import { modeleDepuisConfig } from '../modele/anthropic'
import type { Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { aParis, FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')
const QUOIS = ['traduire', 'echappee', 'gestes'] as const
type Quoi = (typeof QUOIS)[number]

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: 'string' },
    seulement: { type: 'string' },
    modele: { type: 'string' },
  },
})
const [quoi] = positionals as [Quoi | undefined]
if (quoi === undefined || !QUOIS.includes(quoi) || !values.client) {
  console.error(
    `usage : pnpm evals ${QUOIS.join('|')} --client <dossier> [--seulement id,id] [--modele simule]`,
  )
  process.exit(2)
}
if (values.modele !== undefined && values.modele !== 'simule') {
  console.error('--modele : seule la valeur « simule » est connue')
  process.exit(2)
}

const source = resolve(values.client)
const { metier } = chargerConfig(join(source, FICHIER_CONFIG), ConfigBase)
const m = await metierDe(source)
/** Les cas du métier du client ; `EVALS` garde les résultats, les traces et les journaux fixés. */
const CAS = join(RACINE, evalsDuMetier(metier))
const avecModele = quoi !== 'gestes'

// La clé se vérifie au démarrage, sur une copie (ouvrir écrit un journal),
// pas au premier cas : une variable absente arrête tout.
if (avecModele && values.modele === undefined) {
  const essai = copieClient(source)
  try {
    modeleDepuisConfig(configDuDossier(m, essai), process.env)
  } finally {
    rmSync(essai, { recursive: true, force: true })
  }
}
const modeleDe = (config: Parameters<typeof modeleDepuisConfig>[0]): Modele =>
  values.modele === 'simule' ? modeleSimule([]) : modeleDepuisConfig(config, process.env)

const deux = (n: number) => String(n).padStart(2, '0')
const t = Temporal.Now.zonedDateTimeISO(FUSEAU)
const tampon = `${t.year}-${deux(t.month)}-${deux(t.day)}-${deux(t.hour)}${deux(t.minute)}`
const dossierTraces = join(EVALS, 'traces', `${tampon}-${metier}-${quoi}`)
mkdirSync(dossierTraces, { recursive: true })
mkdirSync(join(EVALS, 'resultats'), { recursive: true })
const seulement = values.seulement ? new Set(values.seulement.split(',')) : undefined
/** L'identifiant du modèle qui a joué la passe, tel que l'adaptateur le donne. */
let idModele = values.modele === 'simule' ? 'simulé' : avecModele ? '' : 'aucun (rejeu)'

const garder = (r: ResultatCas, trace: unknown, id?: string) => {
  if (id) idModele = id
  writeFileSync(
    join(dossierTraces, `${r.id.replace(/\//g, '_')}.json`),
    JSON.stringify(trace, null, 2),
  )
  const fuite = r.fuite && r.fuite.length > 0 ? ` ; fuite : ${r.fuite.join(', ')}` : ''
  console.log(
    `${r.id} : ${r.ecarts.length === 0 ? 'ok' : `écart (${r.ecarts.join(' ; ')})`}${fuite}`,
  )
}

const resultats: ResultatCas[] = []
const seuil: number = SEUILS[quoi]

if (quoi === 'traduire') {
  const fichier = FichierTraduire.parse(parse(readFileSync(join(CAS, 'consignes.yaml'), 'utf8')))
  const { appris, erreurs } = apprisDuDossier(m, source)
  for (const e of erreurs) console.error(e)
  if (appris.length > 0) {
    console.log(`Gestes appris chargés : ${appris.map((a) => a.id).join(', ')}`)
  }
  resultats.push(
    ...(await jouerTraduction(
      m,
      source,
      casDuFichier(fichier, seulement),
      appris,
      modeleDe,
      garder,
    )),
  )
} else if (quoi === 'echappee') {
  const fichier = FichierEchappee.parse(parse(readFileSync(join(CAS, 'echappees.yaml'), 'utf8')))
  const echappee = m.echappee
  if (!echappee) throw new Error(`le métier ${metier} n'a pas d'échappée`)
  for (const c of fichier.cas.filter((x) => !seulement || seulement.has(x.id))) {
    const joue = await jouerCas(
      m,
      source,
      {
        id: c.id,
        strict: c.piege === true,
        ...(c.piege ? { piege: fichier.piege } : {}),
        role: c.role,
        ...(c.personne !== undefined ? { personne: c.personne } : {}),
      },
      modeleDe,
      (dossier, modele, identite) =>
        avecSession(m, dossier, identite, async (s) => {
          m.verifierIdentite(s, identite)
          const issue = await echappee(
            s,
            identite,
            `C-eval-${c.id}`,
            c.consigne,
            c.intention,
            aParis(c.maintenant ?? fichier.maintenant),
            modele,
          )
          return { ecarts: ecartsEchappee(c.attendu, issue, m.operation), issue }
        }),
    )
    resultats.push(joue.resultat)
    garder(joue.resultat, joue.trace, joue.idModele)
  }
} else if (quoi === 'gestes') {
  // Le rejeu, sans modèle (§ 6.4) : les gestes écrits à la main de
  // `gestes.yaml` sont posés dans une copie avec un instantané par test, pris
  // sur les données de la copie ; puis chaque geste de la copie, ceux du
  // dossier passé en --client compris, est rejoué sur ses instantanés.
  const fichier = FichierGestes.parse(parse(readFileSync(join(CAS, 'gestes.yaml'), 'utf8')))
  const copieMetier = m.copie
  if (!copieMetier) throw new Error(`le métier ${metier} n'expose pas sa copie`)
  const dossier = copieClient(source)
  try {
    const quand = aParis(fichier.maintenant)
    const s = m.ouvrir(dossier)
    try {
      for (const g of fichier.gestes) {
        const f: FichierGeste = { ...g, statut: 'propose' }
        mkdirSync(join(dossier, 'gestes'), { recursive: true })
        writeFileSync(join(dossier, 'gestes', `eval-${g.id}.yaml`), stringify(f))
        for (const test of g.tests) {
          const personne = personneDuTest(test)
          const identite = {
            role: test.role,
            ...(personne !== null ? { personne } : {}),
          }
          m.verifierIdentite(s, identite)
          ecrireInstantane(dossier, {
            echappee: test.echappee,
            horodatage: quand.toInstant().toString(),
            ...identite,
            tables: copieMetier(s, identite, quand),
          })
        }
      }
    } finally {
      m.fermer(s)
    }
    for (const f of lireFichiersGestes(dossier)) {
      if (!f.contenu) {
        const r = { id: f.fichier, ecarts: [f.erreur ?? 'illisible'], coutUsd: 0, strict: false }
        resultats.push(r)
        garder(r, { id: f.fichier, erreur: f.erreur })
        continue
      }
      if (f.contenu.statut === 'retire') continue
      const geste = gesteDe(f.contenu)
      for (const test of geste.tests) {
        const id = `${geste.id}/${test.echappee}`
        if (seulement && !seulement.has(id)) continue
        const rejeu = await rejouerTest(geste, test, dossier, m)
        const ecarts =
          'erreur' in rejeu
            ? [rejeu.erreur]
            : [
                ...rejeu.manque.map((mot) => `ne contient pas « ${mot} »`),
                ...rejeu.enTrop.map((mot) => `propose « ${mot} », jamais validé`),
              ]
        const r = { id, ecarts, coutUsd: 0, strict: false }
        resultats.push(r)
        garder(r, { id, fichier: f.fichier, test, rejeu })
      }
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
}

const b = bilan(resultats, seuil)
const chemin = join(EVALS, 'resultats', `${tampon}-${metier}-${quoi}.md`)
const TITRES: Record<Quoi, string> = {
  traduire: 'de la traduction',
  echappee: "de l'échappée",
  gestes: 'du rejeu des gestes appris',
}
writeFileSync(
  chemin,
  rendreResultats(`Évals ${TITRES[quoi]} — ${tampon}`, idModele, resultats, seuil),
)
console.log(
  `\n${b.ok}/${b.total} (${Math.round(b.taux * 100)} %, seuil ${Math.round(seuil * 100)} %), fuite ${b.fuites.length} cas (seuil 0), coût ${b.coutUsd.toFixed(4)} $${b.stricts.length > 0 ? ` ; cas stricts en écart : ${b.stricts.join(', ')}` : ''}`,
)
console.log(
  `${b.atteint ? 'Seuil atteint.' : 'Sous le seuil : analyse d’erreurs (§ 9.3), puis relance.'}`,
)
console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
if (!b.atteint) process.exitCode = 1
