// pnpm remplacer <commande> --client <dossier> [--maintenant AAAA-MM-JJTHH:MM] …
//   absence --agent A-11 --jour 2026-10-11   un agent se déclare absent
//   valider --demande D-V-17 [--agent A-1]   le patron valide (ou choisit un autre possible)
//   reponse --demande D-V-17 --oui | --non   la réponse de l'agent sollicité
//   suivre  --demande D-V-17                 sans réponse après l'attente, ou trop tard
// Le planning du client est réécrit après les deux accords : travailler sur
// une copie du client fictif, jamais sur `exemples/`.
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { FUSEAU, Temporal } from '@harnais/moteur'
import {
  aParis,
  type Etape,
  ouvrir,
  type Proposition,
  repondre,
  STATUT,
  signalerAbsence,
  suivre,
  valider,
} from '../remplacement'
import { decrire } from '../veille'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: 'string' },
    maintenant: { type: 'string' },
    agent: { type: 'string' },
    jour: { type: 'string' },
    demande: { type: 'string' },
    oui: { type: 'boolean' },
    non: { type: 'boolean' },
  },
})
const [commande] = positionals
const usage = () => {
  console.error(
    'usage : pnpm remplacer absence|valider|reponse|suivre --client <dossier> [--maintenant AAAA-MM-JJTHH:MM] …',
  )
  process.exit(2)
}
if (!commande || !values.client) usage()

const s = ouvrir(resolve(values.client as string))
const maintenant = values.maintenant
  ? aParis(values.maintenant)
  : Temporal.Now.zonedDateTimeISO(FUSEAU)
const exiger = (v: string | undefined, nom: string) => {
  if (!v) {
    console.error(`--${nom} manquant`)
    process.exit(2)
  }
  return v
}

function proposition(p: Proposition): string[] {
  const [premier, ...autres] = p.possibles
  return [
    `Absence : ${decrire(s.ctx, p.vacation)}`,
    '',
    premier
      ? `Je propose ${premier.nom} (${premier.raisons.join(', ')}).`
      : 'Aucun remplaçant possible.',
    ...(autres.length > 0
      ? ['', 'Autres possibles :', ...autres.map((c) => `  - ${c.nom} : ${c.raisons.join(', ')}`)]
      : []),
    ...(p.exclus.length > 0
      ? [
          '',
          'Exclus (un interdit s’y oppose) :',
          ...p.exclus.map((c) => `  - ${c.nom} : ${c.raisons.join(' ; ')}`),
        ]
      : []),
    ...(p.ecartes.length > 0
      ? [
          '',
          'Écartés (une donnée manque, rien n’est supposé) :',
          ...p.ecartes.map((c) => `  - ${c.nom} : ${c.raisons.join(' ; ')}`),
        ]
      : []),
    '',
    `Valider : pnpm remplacer valider --client ${values.client} --demande ${p.demande} [--agent <autre possible>]`,
  ]
}

function afficher(e: Etape | null, demande: string): string[] {
  if (!e) return [`${demande} : rien de nouveau.`]
  switch (e.statut) {
    case STATUT.proposee:
      return proposition(e.proposition)
    case STATUT.demandee:
      return [
        `Message envoyé à l'agent : « ${e.message} »`,
        '',
        `Sa réponse : pnpm remplacer reponse --client ${values.client} --demande ${demande} --oui | --non`,
      ]
    case STATUT.ecrite:
      return ['Planning mis à jour.', ...e.messages.map((m) => `Message : « ${m} »`)]
    default:
      return [`${demande} : ${e.statut}. ${e.motif}`]
  }
}

try {
  let lignes: string[]
  switch (commande) {
    case 'absence': {
      const r = signalerAbsence(
        s,
        exiger(values.agent, 'agent'),
        Temporal.PlainDate.from(exiger(values.jour, 'jour')),
        maintenant,
      )
      lignes = [`Demande ${r.demande}`, ...afficher(r, r.demande)]
      break
    }
    case 'valider': {
      const d = exiger(values.demande, 'demande')
      lignes = afficher(valider(s, d, maintenant, values.agent), d)
      break
    }
    case 'reponse': {
      const d = exiger(values.demande, 'demande')
      if (values.oui === values.non) usage()
      lignes = afficher(repondre(s, d, values.oui === true, maintenant), d)
      break
    }
    case 'suivre': {
      const d = exiger(values.demande, 'demande')
      lignes = afficher(suivre(s, d, maintenant), d)
      break
    }
    default:
      usage()
      lignes = []
  }
  console.log(lignes.join('\n'))
} catch (erreur) {
  console.error((erreur as Error).message)
  process.exitCode = 1
} finally {
  s.journal.fermer()
}
