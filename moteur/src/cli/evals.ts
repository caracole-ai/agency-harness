// pnpm evals traduire|echappee --client <dossier> [--seulement id,id] [--modele simule]
// pnpm evals rejeu --client <dossier> --gestes a,b [--seulement id,id] [--modele simule]
// Les évals de la conversation (PLAN-ESPACES.md § 9) : chaque cas, écrit à la main dans
// `metiers/<métier>/evals/` (le métier du client, PLAN-METIER-2.md M8),
// tourne sur une copie fraîche du client (ou sur une variante dérivée de lui,
// pour un homonyme) ; la sortie est vérifiée en code, la trace complète est
// gardée dans `evals/traces/<horodatage>-<métier>-<quoi>/` (non versionné) et
// le tableau dans `evals/resultats/<horodatage>-<métier>-<quoi>.md`.
// `rejeu` (la neuvième condition du chantier, `evals/rejeu.ts`) : les cas de
// `consignes.yaml` de ces gestes, chacun contre une échappée sur la même
// consigne ; chaque nombre que l'échappée cite doit être dans ce que le geste
// rend. `traduire`, `echappee` et `rejeu` appellent le vrai modèle : exige la
// clé que nomme la config (ANTHROPIC_API_KEY sans `acces`), ou l'abonnement
// par le binaire (`acces: { binaire }`, le coût est alors une estimation), et
// coûte (≈ 0,3 $ les deux passes). `--modele simule` ne sert qu'à
// vérifier le câblage (tous les cas finissent en écart). Chaque cas avec modèle
// porte sa fuite (PLAN-PSEUDONYMES.md § 7) : les noms du client (`m.noms`)
// partis au modèle, colonne du tableau, seuil 0.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { avecSession } from '../conversation/conversation'
import {
  bilan,
  ecartsEchappee,
  evalsDuMetier,
  FichierEchappee,
  FichierTraduire,
  type ResultatCas,
  rendreResultats,
  SEUILS,
} from '../evals/evals'
import { bilanRejeu, casPourGestes, estNonMesurable, jouerRejeu, ligneRejeu } from '../evals/rejeu'
import {
  casDuFichier,
  configDuDossier,
  copieClient,
  jouerCas,
  jouerTraduction,
} from '../evals/traduction'
import { modeleDepuisConfig } from '../modele/anthropic'
import type { Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { aParis, FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')
const QUOIS = ['traduire', 'echappee', 'rejeu'] as const
type Quoi = (typeof QUOIS)[number]
const USAGE = `usage : pnpm evals traduire|echappee --client <dossier> [--seulement id,id] [--modele simule] | pnpm evals rejeu --client <dossier> --gestes a,b [--seulement id,id] [--modele simule]`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: 'string' },
    seulement: { type: 'string' },
    modele: { type: 'string' },
    gestes: { type: 'string' },
  },
})
const [quoi] = positionals as [Quoi | undefined]
if (quoi === undefined || !QUOIS.includes(quoi) || !values.client) {
  console.error(USAGE)
  process.exit(2)
}
/** Les gestes à rejouer : exigés par `rejeu`, sans effet ailleurs. */
const gestes = (values.gestes ?? '')
  .split(',')
  .map((g) => g.trim())
  .filter((g) => g.length > 0)
if (quoi === 'rejeu' && gestes.length === 0) {
  console.error(USAGE)
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

// La clé se vérifie au démarrage, sur une copie (ouvrir écrit un journal),
// pas au premier cas : une variable absente arrête tout.
if (values.modele === undefined) {
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
let idModele = values.modele === 'simule' ? 'simulé' : ''

const garder = (r: ResultatCas, trace: unknown, id?: string) => {
  if (id) idModele = id
  writeFileSync(
    join(dossierTraces, `${r.id.replace(/\//g, '_')}.json`),
    JSON.stringify(trace, null, 2),
  )
  const fuite = r.fuite && r.fuite.length > 0 ? ` ; fuite : ${r.fuite.join(', ')}` : ''
  const issue =
    r.ecarts.length === 0
      ? 'ok'
      : estNonMesurable(r)
        ? r.ecarts.join(' ; ')
        : `écart (${r.ecarts.join(' ; ')})`
  console.log(`${r.id} : ${issue}${fuite}`)
}

const resultats: ResultatCas[] = []
const seuil: number = SEUILS[quoi]

if (quoi === 'traduire') {
  const fichier = FichierTraduire.parse(parse(readFileSync(join(CAS, 'consignes.yaml'), 'utf8')))
  resultats.push(
    ...(await jouerTraduction(m, source, casDuFichier(fichier, seulement), modeleDe, garder)),
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
} else if (quoi === 'rejeu') {
  const fichier = FichierTraduire.parse(parse(readFileSync(join(CAS, 'consignes.yaml'), 'utf8')))
  const cas = casPourGestes(fichier, gestes).filter((c) => !seulement || seulement.has(c.id))
  resultats.push(...(await jouerRejeu(m, source, cas, modeleDe, garder)))
}

const chemin = join(EVALS, 'resultats', `${tampon}-${metier}-${quoi}.md`)
const TITRES: Record<Quoi, string> = {
  traduire: 'de la traduction',
  echappee: "de l'échappée",
  rejeu: 'du rejeu',
}
const tableau = rendreResultats(`Évals ${TITRES[quoi]} — ${tampon}`, idModele, resultats, seuil)
if (quoi === 'rejeu') {
  // Un cas non mesurable n'est ni fidèle ni en écart : le compte du rejeu le dit à part.
  const b = bilanRejeu(resultats)
  writeFileSync(chemin, `${tableau}\n${ligneRejeu(b)}\n`)
  console.log(`\n${ligneRejeu(b)}`)
  console.log(b.fidele ? 'Fidèle.' : 'En écart : le geste ne rend pas ce que l’échappée cite.')
  console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
  if (!b.fidele) process.exitCode = 1
} else {
  const b = bilan(resultats, seuil)
  writeFileSync(chemin, tableau)
  console.log(
    `\n${b.ok}/${b.total} (${Math.round(b.taux * 100)} %, seuil ${Math.round(seuil * 100)} %), fuite ${b.fuites.length} cas (seuil 0), coût ${b.coutUsd.toFixed(4)} $${b.stricts.length > 0 ? ` ; cas stricts en écart : ${b.stricts.join(', ')}` : ''}`,
  )
  console.log(
    `${b.atteint ? 'Seuil atteint.' : 'Sous le seuil : analyse d’erreurs (§ 9.3), puis relance.'}`,
  )
  console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
  if (!b.atteint) process.exitCode = 1
}
