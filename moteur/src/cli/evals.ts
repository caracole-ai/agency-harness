// pnpm evals traduire|echappee|gestes|promotion|ronde --client <dossier> [--seulement id,id] [--modele simule]
// Les évals de la conversation (PLAN-ESPACES.md § 9) et de la promotion
// (PLAN-PROMOTION.md § 6.4) : chaque cas, écrit à la main dans
// `metiers/<métier>/evals/` (le métier du client, PLAN-METIER-2.md M8),
// tourne sur une copie fraîche du client (ou sur une variante dérivée de lui,
// pour un homonyme) ; la sortie est vérifiée en code, la trace complète est
// gardée dans `evals/traces/<horodatage>-<métier>-<quoi>/` (non versionné) et
// le tableau dans `evals/resultats/<horodatage>-<métier>-<quoi>.md`.
// `traduire`, `echappee` et `promotion` appellent le vrai modèle : exige la
// clé que nomme la config (ANTHROPIC_API_KEY sans `acces`), ou l'abonnement
// par le binaire (`acces: { binaire }`, le coût est alors une estimation), et
// coûte (≈ 0,3 $ les deux premières passes, ≈ 0,2 $ la fabrication, avec GLM-5.3). `gestes` rejoue sans modèle, 0 $. `--modele simule` ne sert qu'à
// vérifier le câblage (tous les cas finissent en écart). Chaque cas avec modèle
// porte sa fuite (PLAN-PSEUDONYMES.md § 7) : les noms du client (`m.noms`)
// partis au modèle, colonne du tableau, seuil 0. `ronde` (PLAN-RONDE.md § 5.4)
// rejoue les journaux fixés du `rondes.yaml` du métier (les journaux restent
// dans `evals/`) sur une copie et lance la ronde avec le modèle
// d'`agence.yaml` (sous acces: claude, l'abonnement : le
// coût est estimé par le binaire), sans rien écrire dans `memoire/` ; tant que
// les étiquettes sont un brouillon, le résultat aussi.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parse, stringify } from 'yaml'
import { z } from 'zod'
import { chargerAgence } from '../agence/config'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { avecSession } from '../conversation/conversation'
import { aCapacite } from '../conversation/roles'
import { ecrireInstantane } from '../echappee/echappee'
import {
  type BilanRonde,
  bilan,
  type Etiquettes,
  ecartsEchappee,
  ecartsRonde,
  evalsDuMetier,
  FichierEchappee,
  FichierGestes,
  FichierPromotions,
  FichierRondes,
  FichierTraduire,
  LigneFixee,
  type ResultatCas,
  rendreResultats,
  rendreRonde,
  SEUILS,
} from '../evals/evals'
import {
  apprisDuDossier,
  casDuFichier,
  configDuDossier,
  copieClient,
  jouerCas,
  jouerTraduction,
  type TraceCas,
} from '../evals/traduction'
import { lireFichiersGestes } from '../gestes/charger'
import { type FichierGeste, gesteDe, personneDuTest } from '../gestes/geste-appris'
import { modeleDepuisConfig } from '../modele/anthropic'
import type { Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { chargerPersonnes, recevoir } from '../personnes/personnes'
import { rejouerTest } from '../promotion/fabriquer'
import { aProposer, debutFenetre, type Fabrication, intentions } from '../promotion/promotion'
import { compterFabrications, promouvoir } from '../promotion/promouvoir'
import { STATUTS_MISSION } from '../ronde/rapport'
import { type AppelRonde, faireRonde, ISSUES_RONDE } from '../ronde/ronde'
import { aParis, FUSEAU, Temporal } from '../temps/temporal'
import { metierDe } from './metier'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')
const QUOIS = ['traduire', 'echappee', 'gestes', 'promotion', 'ronde'] as const
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
// La ronde n'appelle pas le modèle du client : celui de l'agence, préflight au moment de l'appel.
const avecModeleClient = avecModele && quoi !== 'ronde'

// La clé se vérifie au démarrage, sur une copie (ouvrir écrit un journal),
// pas au premier cas : une variable absente arrête tout.
if (avecModeleClient && values.modele === undefined) {
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
/** Pour le § 8, sur une passe `promotion` : ce que chaque fabrication a donné. */
const fabrications: Fabrication[] = []
let seuil: number = quoi === 'promotion' || quoi === 'ronde' ? 0 : SEUILS[quoi]
/** Pour une passe `ronde` : le bilan de chaque cas, et les étiquettes. */
const rondes: (ResultatCas & { bilan: BilanRonde; estime: boolean })[] = []
let etiquettes: Etiquettes = 'brouillon'

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
} else if (quoi === 'ronde') {
  const fichier = FichierRondes.parse(parse(readFileSync(join(CAS, 'rondes.yaml'), 'utf8')))
  etiquettes = fichier.etiquettes
  const agence = chargerAgence(RACINE)
  idModele =
    values.modele === 'simule'
      ? 'simulé'
      : `${agence.modeles.ronde.modele} (acces: ${agence.modeles.ronde.acces})`
  const simule: AppelRonde = async () => ({
    ok: true,
    sortie: { observations: [], missions: [], rien_a_signaler: true },
    cout_usd: 0,
    estime: false,
  })
  for (const c of fichier.cas.filter((x) => !seulement || seulement.has(x.id))) {
    const nom = fichier.journaux[c.journal]
    if (!nom) throw new Error(`${c.id} : journal fixé inconnu : ${c.journal}`)
    const lignes = z.array(LigneFixee).parse(JSON.parse(readFileSync(join(EVALS, nom), 'utf8')))
    const dossier = copieClient(source)
    try {
      const { journal } = m.ouvrirJournal(dossier)
      try {
        for (const { horodatage, ...e } of lignes) journal.ecrire([e], horodatage)
      } finally {
        journal.fermer()
      }
      const r = await faireRonde(m, {
        racine: RACINE,
        dossierClient: dossier,
        date: Temporal.PlainDate.from(c.date),
        ...(c.depuis ? { depuis: Temporal.PlainDate.from(c.depuis) } : {}),
        agence,
        env: process.env,
        memoire: false,
        ...(values.modele === 'simule' ? { appel: simule } : {}),
      })
      if (r.sorte !== 'faite') throw new Error(`${c.id} : ronde ${r.sorte}`)
      const proposees = r.missions
        .filter(
          (x) => x.statut === STATUTS_MISSION.a_faire || x.statut === STATUTS_MISSION.question,
        )
        .map((x) => ({
          id: x.mission.id,
          sorte: x.mission.sorte,
          intentions: x.mission.intentions,
          echappees: x.mission.echappees,
        }))
      const b = ecartsRonde(c.attendu, r.issue, proposees, [
        ISSUES_RONDE.echouee,
        ISSUES_RONDE.refusee,
        ISSUES_RONDE.fuite,
      ])
      const resultat = {
        id: c.id,
        ecarts: b.ecarts,
        coutUsd: r.cout_usd,
        strict: false,
        fuite: r.fuite,
        bilan: b,
        estime: r.estime,
      }
      rondes.push(resultat)
      resultats.push(resultat)
      garder(resultat, {
        id: c.id,
        systeme: r.systeme,
        message: r.message,
        issue: r.issue,
        raison: r.raison,
        rapport: r.rapport,
        missions: r.missions,
        ecarts: r.ecarts,
        fuite: r.fuite,
        cout_usd: r.cout_usd,
      })
    } finally {
      rmSync(dossier, { recursive: true, force: true })
    }
  }
} else {
  // La fabrication, avec modèle (§ 6.4) : un cas = une intention et les cas
  // d'`echappees.yaml` qui la portent ; rejoués sur une seule copie, puis la
  // promotion y fabrique et vérifie ; le cas passe si le geste est écrit avec
  // zéro écart. Pas de passe de traduction ici (elle se mesure à part). Une
  // proposition ne compte que validée (P9) : le lanceur joue le « oui » d'un
  // rôle qui valide (PLAN-METIER-2.md M3) par le métier, contrôles compris (§ 10).
  const fichier = FichierPromotions.parse(parse(readFileSync(join(CAS, 'promotions.yaml'), 'utf8')))
  const echappees = FichierEchappee.parse(parse(readFileSync(join(CAS, 'echappees.yaml'), 'utf8')))
  const echappee = m.echappee
  if (!echappee) throw new Error(`le métier ${metier} n'a pas d'échappée`)
  seuil = fichier.seuil
  const valideur = m.roles.find((r) => aCapacite(m.roles, { role: r.id }, 'valide'))
  if (!valideur) throw new Error(`le métier ${metier} n'a pas de rôle qui valide`)
  for (const c of fichier.cas.filter((x) => !seulement || seulement.has(x.id))) {
    const joue = await jouerCas(
      m,
      source,
      { id: c.id, strict: false, role: valideur.id },
      modeleDe,
      async (dossier, modele, agence) => {
        const quand = aParis(fichier.maintenant)
        const refusees: string[] = []
        for (const id of c.echappees) {
          const e = echappees.cas.find((x) => x.id === id)
          if (!e) throw new Error(`${c.id} : cas d'échappée inconnu : ${id}`)
          const accueil = recevoir(m.roles, chargerPersonnes(dossier, m.roles), {
            role: e.role,
            ...(e.personne !== undefined ? { personne: e.personne } : {}),
          })
          if (accueil.sorte === 'refus') throw new Error(`${id} : ${accueil.motif}`)
          await avecSession(m, dossier, accueil.identite, async (s) => {
            m.verifierIdentite(s, accueil.identite)
            const moment = aParis(e.maintenant ?? echappees.maintenant)
            const conversation = `C-eval-${e.id}`
            const issue = await echappee(
              s,
              accueil.identite,
              conversation,
              e.consigne,
              e.intention,
              moment,
              modele,
            )
            if (issue.sorte !== 'proposition' || !m.proposition) return
            try {
              const { id: r } = m.proposition.ouvrir(s, conversation, issue.modifications, moment)
              m.proposition.valider(s, r, moment)
            } catch (erreur) {
              refusees.push(`${id} : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
            }
          })
        }
        return avecSession(m, dossier, agence, async (s) => {
          const config = m.config(s)
          const journal = m.journal(s)
          const { jours, occurrences } = config.promotion
          const comptees = intentions(journal, debutFenetre(quand, jours))
          const i = aProposer(comptees, journal, { occurrences }).find(
            (x) => x.intention === c.intention,
          )
          if (!i) {
            const n = comptees.find((x) => x.intention === c.intention)?.occurrences ?? 0
            return {
              ecarts: [
                `l'intention n'atteint pas le seuil : ${n} échappée(s) finie(s) proprement`,
                ...refusees.map((r) => `proposition refusée par le métier : ${r}`),
              ],
              issue: undefined,
            }
          }
          const { fabrication } = await promouvoir(m, s, dossier, i, quand, jours, { modele })
          if (!fabrication) return { ecarts: ['aucune fabrication'], issue: undefined }
          fabrications.push(fabrication)
          const ecarts =
            fabrication.sorte === 'ecrit'
              ? []
              : fabrication.sorte === 'echec'
                ? [`fabrication échouée : ${fabrication.raison ?? '?'}`]
                : fabrication.sorte === 'ecarts'
                  ? (fabrication.ecarts ?? [])
                  : [fabrication.sorte]
          return { ecarts, issue: fabrication }
        })
      },
    )
    const resultat =
      c.impossible && joue.resultat.ecarts.length > 0
        ? {
            ...joue.resultat,
            ecarts: [`impossible par construction : ${c.impossible}`, ...joue.resultat.ecarts],
          }
        : joue.resultat
    resultats.push(resultat)
    garder(resultat, joue.trace satisfies TraceCas, joue.idModele)
  }
}

const b = bilan(resultats, seuil)
const chemin = join(EVALS, 'resultats', `${tampon}-${metier}-${quoi}.md`)
const TITRES: Record<Quoi, string> = {
  traduire: 'de la traduction',
  echappee: "de l'échappée",
  gestes: 'du rejeu des gestes appris',
  promotion: 'de la fabrication',
  ronde: 'de la ronde',
}
if (quoi === 'ronde') {
  writeFileSync(
    chemin,
    rendreRonde(`Évals ${TITRES[quoi]} — ${tampon}`, idModele, etiquettes, rondes),
  )
  const justes = rondes.reduce((s, r) => s + r.bilan.justes, 0)
  const proposees = rondes.reduce((s, r) => s + r.bilan.proposees, 0)
  const trouvees = rondes.reduce((s, r) => s + r.bilan.trouvees, 0)
  const attendues = rondes.reduce((s, r) => s + r.bilan.attendues, 0)
  console.log(
    `\nPrécision ${justes}/${proposees}, rappel ${trouvees}/${attendues}, fuite ${b.fuites.length} cas (seuil 0), coût ${b.coutUsd.toFixed(4)} $${rondes.some((r) => r.estime) ? ' (estimé par le binaire)' : ''}.`,
  )
  if (etiquettes === 'brouillon')
    console.log('Étiquettes en brouillon : brouillon, pas une mesure.')
  console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
  if (b.fuites.length > 0) process.exitCode = 1
  process.exit()
}
writeFileSync(
  chemin,
  [
    rendreResultats(`Évals ${TITRES[quoi]} — ${tampon}`, idModele, resultats, seuil),
    ...(quoi === 'promotion'
      ? [
          '## Fabrication (PLAN-PROMOTION.md § 8)',
          '',
          ...compterFabrications(fabrications).map((l) => `- ${l}`),
          '',
        ]
      : []),
  ].join('\n'),
)
console.log(
  `\n${b.ok}/${b.total} (${Math.round(b.taux * 100)} %, seuil ${Math.round(seuil * 100)} %), fuite ${b.fuites.length} cas (seuil 0), coût ${b.coutUsd.toFixed(4)} $${b.stricts.length > 0 ? ` ; cas stricts en écart : ${b.stricts.join(', ')}` : ''}`,
)
if (quoi === 'promotion') for (const l of compterFabrications(fabrications)) console.log(l)
console.log(
  `${b.atteint ? 'Seuil atteint.' : 'Sous le seuil : analyse d’erreurs (§ 9.3), puis relance.'}`,
)
console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
if (!b.atteint) process.exitCode = 1
