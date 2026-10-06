// pnpm registre:generer | registre:verifier [metiers/<métier> …]
// Sans argument : tous les métiers qui ont un registre.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { regenererFiche } from '../regles/fiche'
import {
  type CodeMetier,
  chargerRegistre,
  codesCites,
  FICHIER_REGLES,
  incoherences,
  incoherencesDuCode,
} from '../regles/registre'
import type { Registre } from '../regles/schema'
import { relecturesEnRetard } from '../regles/veille'
import { FUSEAU, Temporal } from '../temps/temporal'

const RACINE = fileURLToPath(new URL('../../..', import.meta.url))
const METIERS = join(RACINE, 'metiers')
const SOCLE = join(RACINE, 'methode', 'socle.md')
/** Les fichiers d'un métier qui font foi ou en dérivent ; les instantanés datés n'en font pas partie. */
const VUES = ['fiche.md', 'prospection.md', 'entretien.md', 'observation.md']

const lignesDeTable = (texte: string) =>
  new Set(
    codesCites(
      texte
        .split('\n')
        .filter((l) => /^\| [A-Z]-\d/.test(l))
        .map((l) => l.split(' | ')[0])
        .join(' '),
    ),
  )

/** Chaque code cité par une vue existe : I, E, T au registre ; O, D, B en ligne de la fiche ; G au socle. */
function codesOrphelins(dossier: string, registre: Registre): string[] {
  const fiche = readFileSync(join(dossier, 'fiche.md'), 'utf8')
  const connus = new Set([
    ...[...registre.interdits, ...registre.escalades, ...registre.scenarios].map((r) => r.id),
    ...lignesDeTable(fiche),
    ...lignesDeTable(readFileSync(SOCLE, 'utf8')),
  ])
  const erreurs: string[] = []
  for (const vue of VUES) {
    const chemin = join(dossier, vue)
    if (!existsSync(chemin)) continue
    for (const code of new Set(codesCites(readFileSync(chemin, 'utf8')))) {
      if (!connus.has(code)) erreurs.push(`${vue} cite ${code}, qui n'existe nulle part`)
    }
  }
  return erreurs
}

function dossiers(args: string[]): string[] {
  if (args.length > 0) return args.map((a) => resolve(a))
  return readdirSync(METIERS)
    .map((m) => join(METIERS, m))
    .filter((d) => existsSync(join(d, FICHIER_REGLES)))
}

const [commande, ...args] = process.argv.slice(2)
let echecs = 0
for (const dossier of dossiers(args)) {
  const nom = relative(RACINE, dossier)
  const registre = chargerRegistre(dossier)
  const cheminFiche = join(dossier, 'fiche.md')
  const fiche = readFileSync(cheminFiche, 'utf8')
  const regeneree = regenererFiche(fiche, registre)

  if (commande === 'generer') {
    if (regeneree !== fiche) writeFileSync(cheminFiche, regeneree)
    console.log(`${nom} : fiche ${regeneree === fiche ? 'déjà à jour' : 'régénérée'}`)
  } else if (commande === 'verifier') {
    const erreurs = [...incoherences(registre), ...codesOrphelins(dossier, registre)]
    const cheminCode = join(dossier, 'code', 'src', 'index.ts')
    if (existsSync(cheminCode)) {
      const code = (await import(pathToFileURL(cheminCode).href)) as CodeMetier
      erreurs.push(...incoherencesDuCode(registre, code))
      const codees = [...code.CONTROLES, ...(code.VEILLES ?? [])]
      for (const c of codees) {
        if (c.nonCouvert?.length)
          console.log(
            `${nom} : ${c.regle} codé en partie, non couvert : ${c.nonCouvert.join(' ; ')}`,
          )
      }
      console.log(`${nom} : règles codées : ${codees.map((c) => c.regle).join(', ')}`)
    }
    if (regeneree !== fiche)
      erreurs.push(
        'fiche.md a dérivé du registre : lancer pnpm registre:generer, ou reporter la modification dans le registre',
      )
    // Pour l'ingénieur du harnais seulement : ce n'est pas une erreur, c'est la veille à faire.
    for (const r of relecturesEnRetard(registre, Temporal.Now.plainDateISO(FUSEAU))) {
      console.log(
        `${nom} : veille en retard : ${r.id} relu le ${r.relu}, relecture due le ${r.due}`,
      )
    }
    for (const e of erreurs) console.error(`${nom} : ${e}`)
    if (erreurs.length === 0) {
      console.log(
        `${nom} : ${registre.interdits.length} interdits, ${registre.scenarios.length} tests, ${registre.escalades.length} escalades, cohérents`,
      )
    }
    echecs += erreurs.length
  } else {
    console.error('usage : registre.ts generer|verifier [metiers/<métier> …]')
    process.exit(2)
  }
}
process.exit(echecs > 0 ? 1 : 0)
