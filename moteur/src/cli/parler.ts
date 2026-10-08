// pnpm parler --client <dossier> --role patron|agent [--agent A-2] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule]
//   --consigne "…"                                          une consigne, une réponse
//   --confirmer <empreinte> --conversation <C-…> --oui|--non la réponse à une confirmation en attente
//   --interactif                                            une conversation au clavier, « quitter » pour sortir
// Parler à l'outil (PLAN-ESPACES.md § 5.5) : la consigne est traduite en un
// geste, ou finit en « je ne sais pas ». Ce qui écrit attend un « oui ».
// Travailler sur une copie du client fictif, jamais sur `exemples/`.
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { ConfigBase, chargerConfig, FICHIER_CONFIG } from '../config'
import type { Identite, Role } from '../conversation/actions'
import { ROLES } from '../conversation/actions'
import {
  confirmer,
  type MetierConversation,
  type Reponse,
  traiterConsigne,
} from '../conversation/conversation'
import { idConversation } from '../conversation/id'
import { modeleDepuisConfig } from '../modele/anthropic'
import type { Modele } from '../modele/modele'
import { modeleSimule } from '../modele/simule'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    role: { type: 'string' },
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
    'usage : pnpm parler --client <dossier> --role patron|agent [--agent A-…] [--maintenant AAAA-MM-JJTHH:MM] [--modele simule] --consigne "…" | --confirmer <empreinte> --conversation <C-…> --oui|--non | --interactif',
  )
  process.exit(2)
}
if (!values.client || !ROLES.includes(values.role as Role)) usage()
const modes = [values.consigne !== undefined, values.confirmer !== undefined, values.interactif]
if (modes.filter(Boolean).length !== 1) usage()

const dossier = resolve(values.client as string)
const { metier } = chargerConfig(join(dossier, FICHIER_CONFIG), ConfigBase)
const module = (await import(
  pathToFileURL(join(RACINE, 'metiers', metier, 'code', 'src', 'index.ts')).href
)) as { CONVERSATION?: MetierConversation<unknown> }
if (!module.CONVERSATION) throw new Error(`le métier ${metier} ne sait pas encore converser`)
const m = module.CONVERSATION

const identite: Identite = {
  role: values.role as Role,
  ...(values.agent ? { agent: values.agent } : {}),
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
  const s = m.ouvrir(dossier)
  try {
    return modeleDepuisConfig(m.config(s), process.env)
  } finally {
    m.fermer(s)
  }
}

/** Une session par échange : le planning relu après chaque écriture. */
async function avecSession<T>(f: (s: unknown) => T | Promise<T>): Promise<T> {
  const s = m.ouvrir(dossier)
  try {
    return await f(s)
  } finally {
    m.fermer(s)
  }
}

function afficher(r: Reponse, conversation: string): void {
  console.log(`Réponse (${r.sorte}) : ${r.texte}`)
  if ((r.sorte === 'confirmation' || r.sorte === 'proposition') && !values.interactif) {
    console.log(
      `\nConfirmer : pnpm parler --client ${values.client} --role ${identite.role}${identite.agent ? ` --agent ${identite.agent}` : ''} --confirmer ${r.empreinte} --conversation ${conversation} --oui | --non`,
    )
  }
}

try {
  if (values.consigne !== undefined) {
    const llm = modele()
    const conversation = idConversation(maintenant())
    const r = await avecSession((s) =>
      traiterConsigne(m, s, llm, {
        identite,
        consigne: values.consigne as string,
        maintenant: maintenant(),
        conversation,
      }),
    )
    afficher(r, conversation)
  } else if (values.confirmer !== undefined) {
    if (!values.conversation || values.oui === values.non) usage()
    const r = await avecSession((s) =>
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
      const r = await avecSession((s) =>
        reponse && empreinte
          ? confirmer(
              m,
              s,
              identite,
              conversation,
              empreinte,
              ligne.toLowerCase() === 'oui',
              maintenant(),
            )
          : traiterConsigne(m, s, llm, {
              identite,
              consigne: ligne,
              maintenant: maintenant(),
              conversation,
            }),
      )
      enAttente = r.sorte === 'confirmation' || r.sorte === 'proposition' ? r.empreinte : undefined
      afficher(r, conversation)
    }
    lecteur.close()
  }
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
}
