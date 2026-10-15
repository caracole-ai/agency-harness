import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { actionsDe, outilsDe, type Role, schemaMontre } from '../conversation/actions'
import { type ConfigConversation, prixDe } from '../conversation/config'
import { avecSession, type MetierConversation, resoudre } from '../conversation/conversation'
import { roleDe } from '../conversation/roles'
import { systemeTraduire, traduire } from '../conversation/traduire'
import { cout, type Modele } from '../modele/modele'
import { chargerPersonnes, type IdentiteVerifiee, recevoir } from '../personnes/personnes'
import { aParis, type Temporal } from '../temps/temporal'
import {
  type AppelTrace,
  CATEGORIE_AGENT_PATRON,
  type CasTraduire,
  ecartsTraduction,
  type FichierTraduire,
  fuiteDe,
  type IssueTraduction,
  modeleTrace,
  type ResultatCas,
  textesEnvoyes,
  type Variante,
} from './evals'

// Jouer des cas d'évals sur des copies fraîches du client (PLAN-ESPACES.md
// § 9) : ce que `pnpm evals` fait. Chaque cas tourne sur sa
// copie, passe la porte, garde sa trace ; la vérification est en code, la
// fuite aussi : aucun nom de la copie dans ce qui part au modèle
// (PLAN-PSEUDONYMES.md § 7).

/** Un cas de traduction prêt à jouer, du fichier `consignes.yaml`. */
export interface CasTraduction {
  id: string
  strict: boolean
  piege?: Variante
  role: Role
  personne?: string
  quand: Temporal.ZonedDateTime
  consigne: string
  attendu: CasTraduire['attendu']
}

/** La trace d'un cas : ce qui a été envoyé, ce qui est revenu, l'issue et les écarts ; `evals/traces/` (non versionné). */
export interface TraceCas {
  id: string
  systeme?: string
  /** Chaque système distinct, quand le cas en a plusieurs (échappées puis fabrication). */
  systemes?: string[]
  outils?: unknown
  appels: AppelTrace[]
  issue: unknown
  ecarts: string[]
  coutUsd: number
  fuite?: string[]
}

/** Une copie fraîche du client ; `piege` (ou une variante) remplace une chaîne dans un de ses fichiers. */
export function copieClient(source: string, piege?: Variante): string {
  const dossier = mkdtempSync(join(tmpdir(), 'eval-'))
  cpSync(source, dossier, {
    recursive: true,
    filter: (f) => !/\.sqlite$|rapport-demo/.test(relative(source, f)),
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

/** La config de la conversation d'un dossier, lue sans ouvrir ses données. */
export function configDuDossier<S>(m: MetierConversation<S>, dossier: string): ConfigConversation {
  const { journal, config } = m.ouvrirJournal(dossier)
  journal.fermer()
  return config
}

/**
 * Lance un cas sur sa copie (l'identité du cas passe d'abord la porte ; le
 * cas ouvre lui-même la session, après la traduction), garde sa trace, rend
 * son résultat, sa fuite et l'identifiant du modèle qui a joué. `permis` :
 * ce qui, envoyé, n'est pas une fuite (la consigne telle qu'écrite, pour la
 * traduction).
 */
export async function jouerCas<S>(
  m: MetierConversation<S>,
  source: string,
  cas: { id: string; strict: boolean; piege?: Variante; role: string; personne?: string },
  modeleDe: (config: ConfigConversation) => Modele,
  jouer: (
    dossier: string,
    modele: Modele,
    identite: IdentiteVerifiee,
  ) => Promise<{ ecarts: string[]; issue: unknown; permis?: string }>,
): Promise<{ resultat: ResultatCas; trace: TraceCas; idModele: string }> {
  const dossier = copieClient(source, cas.piege)
  const accueil = recevoir(m.roles, chargerPersonnes(dossier, m.roles), {
    role: cas.role,
    ...(cas.personne ? { personne: cas.personne } : {}),
  })
  if (accueil.sorte === 'refus') {
    rmSync(dossier, { recursive: true, force: true })
    const ecarts = [`refus à la porte : ${accueil.motif}`]
    return {
      resultat: { id: cas.id, ecarts, coutUsd: 0, strict: cas.strict },
      trace: { id: cas.id, appels: [], issue: undefined, ecarts, coutUsd: 0 },
      idModele: '',
    }
  }
  const config = configDuDossier(m, dossier)
  const modele = modeleTrace(modeleDe(config))
  let ecarts: string[]
  let issue: unknown
  let permis: string | undefined
  let fuite: string[]
  try {
    try {
      ;({ ecarts, issue, permis } = await jouer(dossier, modele, accueil.identite))
    } catch (erreur) {
      ecarts = [`exception : ${(erreur as Error).message}`]
      issue = undefined
    }
    // Tous les noms de la copie, variante comprise ;
    // une fuite qu'on ne peut pas mesurer compte comme une fuite.
    try {
      const personnes = await avecSession(m, dossier, accueil.identite, (s) => m.noms(s))
      fuite = fuiteDe(textesEnvoyes(modele), personnes, permis)
    } catch (erreur) {
      fuite = [`non mesurée : ${(erreur as Error).message}`]
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
  const prix = prixDe(config)
  const coutUsd = modele.appels.reduce(
    (somme, a) => somme + (a.reponse ? cout(a.reponse.usage, prix) : 0),
    0,
  )
  return {
    resultat: { id: cas.id, ecarts, coutUsd, strict: cas.strict, fuite },
    trace: {
      id: cas.id,
      ...(modele.systeme !== undefined ? { systeme: modele.systeme } : {}),
      ...(modele.systemes.length > 1 ? { systemes: modele.systemes } : {}),
      ...(modele.outils !== undefined ? { outils: modele.outils } : {}),
      appels: modele.appels,
      issue,
      ecarts,
      coutUsd,
      fuite,
    },
    idModele: modele.id,
  }
}

/** Les cas de `consignes.yaml`, prêts à jouer. */
export function casDuFichier(fichier: FichierTraduire, seulement?: Set<string>): CasTraduction[] {
  return fichier.cas
    .filter((c) => !seulement || seulement.has(c.id))
    .map((c) => {
      const variante = c.variante === undefined ? undefined : fichier.variantes?.[c.variante]
      if (c.variante !== undefined && !variante) {
        throw new Error(`${c.id} : variante ${c.variante} inconnue`)
      }
      return {
        id: c.id,
        strict: c.categorie === CATEGORIE_AGENT_PATRON,
        ...(variante ? { piege: variante } : {}),
        role: c.role,
        ...(c.personne !== undefined ? { personne: c.personne } : {}),
        quand: aParis(c.maintenant ?? fichier.maintenant),
        consigne: c.consigne,
        attendu: c.attendu,
      }
    })
}

/**
 * Joue des cas de traduction : le circuit de la conversation sans
 * l'exécution, la traduction (la phrase seule), puis le dossier, puis la
 * résolution de la personne. `surCas` reçoit chaque résultat et sa trace.
 */
export async function jouerTraduction<S>(
  m: MetierConversation<S>,
  source: string,
  cas: CasTraduction[],
  modeleDe: (config: ConfigConversation) => Modele,
  surCas?: (resultat: ResultatCas, trace: TraceCas, idModele: string) => void,
): Promise<ResultatCas[]> {
  const resultats: ResultatCas[] = []
  for (const c of cas) {
    const joue = await jouerCas(m, source, c, modeleDe, async (dossier, modele, identite) => {
      const actions = actionsDe(m.actions, c.role)
      const config = configDuDossier(m, dossier)
      const { demande } = await traduire(
        modele,
        config.modele.effort.traduire,
        config.plafonds.par_demande.tokens_sortie,
        systemeTraduire(roleDe(m.roles, identite), m.domaine, actions, m.intentions),
        outilsDe(m.actions, c.role, m.domaine),
        c.consigne,
        c.quand,
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
                maintenant: c.quand,
                conversation: `C-eval-${c.id}`,
              }
              const r = await resoudre(m, s, modele, tour, action, demande.params)
              return r.sorte === 'resolue'
                ? { ...demande, params: r.params }
                : { sorte: 'precision', candidats: r.candidats.map((x) => x.id) }
            })
      // La traduction reçoit la phrase telle qu'écrite : les noms qu'elle porte ne sont pas une fuite.
      return { ecarts: ecartsTraduction(c.attendu, issue), issue, permis: c.consigne }
    })
    resultats.push(joue.resultat)
    surCas?.(joue.resultat, joue.trace, joue.idModele)
  }
  return resultats
}
