// pnpm evals traduire|echappee --client <dossier> [--seulement id,id] [--modele simule]
// Les évals de la conversation (PLAN-ESPACES.md § 9) : chaque cas, écrit à la
// main dans `evals/`, tourne sur une copie fraîche du client (ou sur une
// variante dérivée de lui, pour un homonyme) ; la sortie est
// vérifiée en code, la trace complète est gardée dans `evals/traces/` (non
// versionné) et le tableau dans `evals/resultats/`. Appelle le vrai modèle :
// exige la clé que nomme la config (ANTHROPIC_API_KEY sans `acces`) et coûte (≈ 0,3 $ les deux passes avec GLM-5.3). `--modele
// simule` ne sert qu'à vérifier le câblage (tous les cas finissent en écart).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import { actionsDe, outilsDe, schemaMontre } from '../conversation/actions'
import { type ConfigConversation, prixDe } from '../conversation/config'
import { avecSession, type MetierConversation, resoudre } from '../conversation/conversation'
import { systemeTraduire, traduire } from '../conversation/traduire'
import {
  bilan,
  CATEGORIE_AGENT_PATRON,
  ecartsEchappee,
  ecartsTraduction,
  FichierEchappee,
  FichierTraduire,
  type IssueTraduction,
  modeleTrace,
  type ResultatCas,
  rendreResultats,
} from '../evals/evals'
import { modeleDepuisConfig } from '../modele/anthropic'
import { cout, type Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { chargerPersonnes, type IdentiteVerifiee, recevoir } from '../personnes/personnes'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const EVALS = join(RACINE, 'evals')
/** Les seuils du plan : traduire ≥ 95 %, échappée ≥ 80 % ; les cas stricts, 100 %. */
const SEUILS = { traduire: 0.95, echappee: 0.8 } as const

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: 'string' },
    seulement: { type: 'string' },
    modele: { type: 'string' },
  },
})
const [quoi] = positionals
if ((quoi !== 'traduire' && quoi !== 'echappee') || !values.client) {
  console.error(
    'usage : pnpm evals traduire|echappee --client <dossier> [--seulement id,id] [--modele simule]',
  )
  process.exit(2)
}
if (values.modele !== undefined && values.modele !== 'simule') {
  console.error('--modele : seule la valeur « simule » est connue')
  process.exit(2)
}

const source = resolve(values.client)
const { metier } = chargerConfig(join(source, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
const m = module.CONVERSATION

/** Une copie fraîche du client ; `piege` (ou une variante) remplace une chaîne dans un de ses fichiers. */
function copie(piege?: { fichier: string; remplacer: string; par: string }): string {
  const dossier = mkdtempSync(join(tmpdir(), 'eval-'))
  cpSync(source, dossier, {
    recursive: true,
    filter: (f) => !/\.sqlite$|rapport-demo|promotions/.test(f),
  })
  if (piege) {
    const fichier = join(dossier, piege.fichier)
    const texte = readFileSync(fichier, 'utf8')
    if (!texte.includes(piege.remplacer)) {
      throw new Error(`piège : « ${piege.remplacer} » introuvable dans ${piege.fichier}`)
    }
    writeFileSync(fichier, texte.replace(piege.remplacer, piege.par))
  }
  return dossier
}

/** La config de la conversation d'une copie, lue sans ouvrir ses données. */
function configDe(dossier: string): ConfigConversation {
  const { journal, config } = m.ouvrirJournal(dossier)
  journal.fermer()
  return config
}

// La clé se vérifie au démarrage, sur une copie (ouvrir écrit un journal),
// pas au premier cas : une variable absente arrête tout.
if (values.modele === undefined) {
  const essai = copie()
  try {
    modeleDepuisConfig(configDe(essai), process.env)
  } finally {
    rmSync(essai, { recursive: true, force: true })
  }
}

const deux = (n: number) => String(n).padStart(2, '0')
const t = Temporal.Now.zonedDateTimeISO(FUSEAU)
const tampon = `${t.year}-${deux(t.month)}-${deux(t.day)}-${deux(t.hour)}${deux(t.minute)}`
const dossierTraces = join(EVALS, 'traces', `${tampon}-${quoi}`)
mkdirSync(dossierTraces, { recursive: true })
mkdirSync(join(EVALS, 'resultats'), { recursive: true })
const seulement = values.seulement ? new Set(values.seulement.split(',')) : undefined
/** L'identifiant du modèle qui a joué la passe, tel que l'adaptateur le donne. */
let idModele = values.modele === 'simule' ? 'simulé' : ''
const aParis = (s: string) => Temporal.PlainDateTime.from(s).toZonedDateTime(FUSEAU)

/**
 * Lance un cas sur sa copie (l'identité du cas passe d'abord la porte ; le
 * cas ouvre lui-même la session, après la traduction), garde sa trace, rend
 * son résultat.
 */
async function lancer(
  id: string,
  strict: boolean,
  piege: Parameters<typeof copie>[0],
  demandeur: { role: string; agent?: string | undefined },
  jouer: (
    dossier: string,
    modele: Modele,
    identite: IdentiteVerifiee,
  ) => Promise<{ ecarts: string[]; issue: unknown }>,
): Promise<ResultatCas> {
  const dossier = copie(piege)
  const accueil = recevoir(chargerPersonnes(dossier), {
    role: demandeur.role,
    ...(demandeur.agent ? { agent: demandeur.agent } : {}),
  })
  if (accueil.sorte === 'refus') {
    rmSync(dossier, { recursive: true, force: true })
    console.log(`${id} : écart (refus à la porte : ${accueil.motif})`)
    return { id, ecarts: [`refus à la porte : ${accueil.motif}`], coutUsd: 0, strict }
  }
  const config = configDe(dossier)
  const prix = prixDe(config)
  const modele = modeleTrace(
    values.modele === 'simule' ? modeleSimule([]) : modeleDepuisConfig(config, process.env),
  )
  idModele = modele.id
  let ecarts: string[]
  let issue: unknown
  try {
    ;({ ecarts, issue } = await jouer(dossier, modele, accueil.identite))
  } catch (erreur) {
    ecarts = [`exception : ${(erreur as Error).message}`]
    issue = undefined
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
  const coutUsd = modele.appels.reduce(
    (somme, a) => somme + (a.reponse ? cout(a.reponse.usage, prix) : 0),
    0,
  )
  writeFileSync(
    join(dossierTraces, `${id}.json`),
    JSON.stringify(
      {
        id,
        systeme: modele.systeme,
        outils: modele.outils,
        appels: modele.appels,
        issue,
        ecarts,
        coutUsd,
      },
      null,
      2,
    ),
  )
  console.log(`${id} : ${ecarts.length === 0 ? 'ok' : `écart (${ecarts.join(' ; ')})`}`)
  return { id, ecarts, coutUsd, strict }
}

const resultats: ResultatCas[] = []
if (quoi === 'traduire') {
  const fichier = FichierTraduire.parse(parse(readFileSync(join(EVALS, 'consignes.yaml'), 'utf8')))
  for (const c of fichier.cas.filter((x) => !seulement || seulement.has(x.id))) {
    const variante = c.variante === undefined ? undefined : fichier.variantes?.[c.variante]
    if (c.variante !== undefined && !variante)
      throw new Error(`${c.id} : variante ${c.variante} inconnue`)
    resultats.push(
      await lancer(
        c.id,
        c.categorie === CATEGORIE_AGENT_PATRON,
        variante,
        c,
        async (dossier, modele, identite) => {
          // Le circuit de la conversation, sans l'exécution : la traduction (la
          // phrase seule), puis le dossier, puis la résolution de la personne.
          const quand = aParis(c.maintenant ?? fichier.maintenant)
          const actions = actionsDe(m.actions, c.role)
          const { demande } = await traduire(
            modele,
            configDe(dossier).modele.effort.traduire,
            systemeTraduire(c.role, actions, m.intentions),
            outilsDe(m.actions, c.role),
            c.consigne,
            quand,
            new Map(actions.map((a) => [a.id, schemaMontre(a)])),
          )
          const action =
            demande.sorte === 'action' ? actions.find((a) => a.id === demande.action) : undefined
          const issue: IssueTraduction =
            demande.sorte !== 'action' || !action
              ? demande
              : await avecSession(m, dossier, identite, async (s) => {
                  m.verifierIdentite(s, identite)
                  const tour = {
                    identite,
                    consigne: c.consigne,
                    maintenant: quand,
                    conversation: `C-eval-${c.id}`,
                  }
                  const r = await resoudre(m, s, modele, tour, action, demande.params)
                  return r.sorte === 'resolue'
                    ? { ...demande, params: r.params }
                    : { sorte: 'precision', candidats: r.candidats.map((x) => x.id) }
                })
          return { ecarts: ecartsTraduction(c.attendu, issue), issue }
        },
      ),
    )
  }
} else {
  const fichier = FichierEchappee.parse(parse(readFileSync(join(EVALS, 'echappees.yaml'), 'utf8')))
  const echappee = m.echappee
  if (!echappee) throw new Error(`le métier ${metier} n'a pas d'échappée`)
  for (const c of fichier.cas.filter((x) => !seulement || seulement.has(x.id))) {
    resultats.push(
      await lancer(
        c.id,
        c.piege === true,
        c.piege ? fichier.piege : undefined,
        c,
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
            return { ecarts: ecartsEchappee(c.attendu, issue), issue }
          }),
      ),
    )
  }
}

const seuil = SEUILS[quoi]
const b = bilan(resultats, seuil)
const chemin = join(EVALS, 'resultats', `${tampon}-${quoi}.md`)
writeFileSync(
  chemin,
  rendreResultats(
    `Évals ${quoi === 'traduire' ? 'de la traduction' : "de l'échappée"} — ${tampon}`,
    idModele,
    resultats,
    seuil,
  ),
)
console.log(
  `\n${b.ok}/${b.total} (${Math.round(b.taux * 100)} %, seuil ${Math.round(seuil * 100)} %), coût ${b.coutUsd.toFixed(4)} $${b.stricts.length > 0 ? ` ; cas stricts en écart : ${b.stricts.join(', ')}` : ''}`,
)
console.log(
  `${b.atteint ? 'Seuil atteint.' : 'Sous le seuil : analyse d’erreurs (§ 9.3), puis relance.'}`,
)
console.log(`Résultats : ${chemin}\nTraces : ${dossierTraces}`)
if (!b.atteint) process.exitCode = 1
