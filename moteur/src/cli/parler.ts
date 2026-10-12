// pnpm parler --client <dossier> --role <rôle du métier> [--personne <id>] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule]
//   --consigne "…" [--conversation <C-…>]                   une consigne, une réponse (dans une conversation déjà ouverte : répondre à une question)
//   --confirmer <empreinte> --conversation <C-…> --oui|--non la réponse à une confirmation en attente
//   --interactif                                            une conversation au clavier, « quitter » pour sortir
// Parler à l'outil (PLAN-ESPACES.md § 5.5) : l'identité passe d'abord la
// porte (le registre d'accès, REFLEXIONS.md (2026-10-08)), puis la consigne est traduite
// en un geste, ou finit en « je ne sais pas ». Ce qui écrit attend un « oui ».
// Travailler sur une copie du client fictif, jamais sur `exemples/`.
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import {
  accueillir,
  avecSession,
  confirmer,
  type MetierConversation,
  type Reponse,
  traiterConsigne,
  verifierRegistre,
} from '../conversation/conversation'
import { idConversation } from '../conversation/id'
import { modeleDepuisConfig } from '../modele/anthropic'
import type { Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { chargerPersonnes, type IdentiteVerifiee } from '../personnes/personnes'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    role: { type: 'string' },
    personne: { type: 'string' },
    agent: { type: 'string' },
    maintenant: { type: 'string' },
    modele: { type: 'string' },
    consigne: { type: 'string' },
    confirmer: { type: 'string' },
    conversation: { type: 'string' },
    oui: { type: 'boolean' },
    non: { type: 'boolean' },
    interactif: { type: 'boolean' },
  },
})
const usage = (): never => {
  console.error(
    'usage : pnpm parler --client <dossier> --role <rôle du métier> [--personne <id>] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] --consigne "…" [--conversation <C-…>] | --confirmer <empreinte> --conversation <C-…> --oui|--non | --interactif',
  )
  process.exit(2)
}
if (!values.client || !values.role) usage()
const modes = [values.consigne !== undefined, values.confirmer !== undefined, values.interactif]
if (modes.filter(Boolean).length !== 1) usage()

const dossier = resolve(values.client as string)
const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
const m = module.CONVERSATION
if (!m.roles.some((r) => r.id === values.role)) usage()
// `--agent` : l'ancienne graphie de `--personne`, encore lue (PLAN-METIER-2.md, M2).
if (values.personne && values.agent && values.personne !== values.agent) usage()
const personne = values.personne ?? values.agent

const demandeur = {
  role: values.role as string,
  ...(personne ? { personne } : {}),
}
/** L'heure de la démo, figée par `--maintenant`, sinon l'heure réelle. */
const maintenant = () =>
  values.maintenant
    ? Temporal.PlainDateTime.from(values.maintenant).toZonedDateTime(FUSEAU)
    : Temporal.Now.zonedDateTimeISO(FUSEAU)

/** Le modèle : simulé (aucun appel, toute consigne finit en « je ne sais pas »), ou celui de la config. */
function modele(): Modele {
  if (values.modele === 'simule') return modeleSimule([])
  if (values.modele !== undefined) usage()
  const { journal, config } = m.ouvrirJournal(dossier)
  journal.fermer()
  return modeleDepuisConfig(config, process.env)
}

/**
 * La porte, avant toute ouverture du dossier ; un refus est au journal. Puis,
 * pour qui l'a passée, chaque personne du registre doit exister chez le client.
 */
function entrer(conversation?: string): IdentiteVerifiee | undefined {
  const accueil = accueillir(m, dossier, {
    demandeur,
    canal: 'terminal',
    maintenant: maintenant(),
    ...(conversation ? { conversation } : {}),
  })
  if (accueil.sorte === 'refus') {
    afficher({ sorte: 'refus', texte: accueil.motif }, conversation ?? '')
    return undefined
  }
  const s = m.ouvrir(dossier)
  try {
    verifierRegistre(m, s, chargerPersonnes(dossier, m.roles))
  } finally {
    m.fermer(s)
  }
  return accueil.identite
}

function afficher(r: Reponse, conversation: string): void {
  console.log(`Réponse (${r.sorte}) : ${r.texte}`)
  if (r.sorte === 'precision' && r.candidats.length > 0 && !values.interactif) {
    console.log(
      `\nRépondre : pnpm parler --client ${values.client} --role ${demandeur.role}${demandeur.personne ? ` --personne ${demandeur.personne}` : ''} --conversation ${conversation} --consigne "<le nom, ou son rang>"`,
    )
  }
  if ((r.sorte === 'confirmation' || r.sorte === 'proposition') && !values.interactif) {
    console.log(
      `\nConfirmer : pnpm parler --client ${values.client} --role ${demandeur.role}${demandeur.personne ? ` --personne ${demandeur.personne}` : ''} --confirmer ${r.empreinte} --conversation ${conversation} --oui | --non`,
    )
  }
}

try {
  const identite = entrer(values.conversation)
  if (identite === undefined) process.exitCode = 1
  else if (values.consigne !== undefined) {
    const llm = modele()
    // `--conversation` : continuer une conversation (répondre à « Vous parlez de qui ? »).
    const conversation = values.conversation ?? idConversation(maintenant())
    const r = await traiterConsigne(m, dossier, llm, {
      identite,
      consigne: values.consigne as string,
      maintenant: maintenant(),
      conversation,
    })
    afficher(r, conversation)
  } else if (values.confirmer !== undefined) {
    if (!values.conversation || values.oui === values.non) usage()
    const r = await avecSession(m, dossier, identite, (s) =>
      confirmer(
        m,
        s,
        identite,
        values.conversation as string,
        values.confirmer as string,
        values.oui === true,
        maintenant(),
      ),
    )
    afficher(r, values.conversation as string)
  } else {
    const llm = modele()
    const conversation = idConversation(maintenant())
    const lecteur = createInterface({ input: process.stdin, output: process.stdout })
    let enAttente: string | undefined
    console.log(`Conversation ${conversation}. « quitter » pour sortir.`)
    for (;;) {
      const ligne = (await lecteur.question('> ')).trim()
      if (ligne === 'quitter') break
      if (ligne === '') continue
      const reponse = /^(oui|non)$/i.test(ligne) && enAttente !== undefined
      const empreinte = enAttente
      const r =
        reponse && empreinte
          ? await avecSession(m, dossier, identite, (s) =>
              confirmer(
                m,
                s,
                identite,
                conversation,
                empreinte,
                ligne.toLowerCase() === 'oui',
                maintenant(),
              ),
            )
          : await traiterConsigne(m, dossier, llm, {
              identite,
              consigne: ligne,
              maintenant: maintenant(),
              conversation,
            })
      enAttente = r.sorte === 'confirmation' || r.sorte === 'proposition' ? r.empreinte : undefined
      afficher(r, conversation)
    }
    lecteur.close()
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
