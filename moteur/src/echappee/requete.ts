import { spawn } from 'node:child_process'
import type { Copie } from './copie'

// L'outil `requete` de l'échappée : une lecture SQL sur la copie, bornée en
// longueur, en lignes et en temps, rendue en tableau texte pour le modèle. Un
// refus ou une erreur SQLite reviennent en `{ erreur }`, jamais levés. La
// copie est déjà en lecture seule ; la liste de mots refusés est une ceinture
// en plus (PLAN-ESPACES.md § 6.3). `node:sqlite` est synchrone : une requête
// sans fin (récursion, produit de tables) figerait le processus ; elle tourne
// donc dans un processus à part, tué passé le délai. Un geste appris passe
// ses paramètres liés (`:nom`), jamais collés dans le SQL
// (PLAN-PROMOTION.md § 4.1).

export const LIGNES_MAX = 200
export const SQL_MAX = 2000
/** Le temps laissé à une requête, en millisecondes. */
export const DELAI_REQUETE_MS = 5000

export type ResultatRequete =
  | { colonnes: string[]; lignes: unknown[][]; tronque: boolean }
  | { erreur: string }

/** Les valeurs liées aux paramètres nommés d'une requête : `{ nom: 'valeur' }` pour `:nom`. */
export type ParametresRequete = Record<string, string | number | null>

const DEBUT_LECTURE = /^(select|with)\b/i
const MOTS_REFUSES =
  /\b(attach|detach|pragma|insert|update|delete|drop|create|alter|replace|vacuum|reindex|randomblob|zeroblob)\b/i
/** Une chaîne ou un identifiant entre guillemets : ce qu'ils contiennent n'est pas un paramètre. */
const ENTRE_GUILLEMETS = /'(?:[^']|'')*'|"(?:[^"]|"")*"/g
const PARAMETRE_NOMME = /[:@$][A-Za-z_][A-Za-z0-9_]*/g

/** Les paramètres nommés d'une requête (`:nom`, `@nom`, `$nom`), sans leur préfixe, hors guillemets. */
export function parametresNommes(sql: string): string[] {
  const nus = sql.replace(ENTRE_GUILLEMETS, '')
  return [...new Set([...nus.matchAll(PARAMETRE_NOMME)].map((m) => m[0].slice(1)))]
}

/**
 * Le processus qui exécute la requête : il rouvre la copie en lecture seule,
 * lit au plus `max + 1` lignes et écrit le résultat en JSON. Un processus et
 * non un fil : une boucle SQLite native ne s'interrompt pas, seul le système
 * peut l'arrêter (`SIGKILL`). Du JavaScript, passé à `node -e`. Les
 * paramètres arrivent avec le SQL, en JSON, et sont liés par SQLite ; une clé
 * que la requête ne nomme pas est tolérée (un geste passe tous ses paramètres
 * à chacune de ses requêtes).
 */
const PROCESSUS = `
const { DatabaseSync } = require('node:sqlite')
let entree = ''
process.stdin.on('data', (d) => { entree += d })
process.stdin.on('end', () => {
  const { chemin, sql, max, parametres } = JSON.parse(entree)
  let sortie
  try {
    const db = new DatabaseSync(chemin, { readOnly: true })
    db.exec('PRAGMA query_only = 1')
    const requete = db.prepare('SELECT * FROM (' + sql + ') LIMIT ' + (max + 1))
    if (parametres) requete.setAllowUnknownNamedParameters(true)
    const lues = []
    for (const ligne of parametres ? requete.iterate(parametres) : requete.iterate()) {
      lues.push(ligne)
      if (lues.length > max) break
    }
    const colonnes = lues.length > 0 ? Object.keys(lues[0]) : requete.columns().map((c) => c.name)
    sortie = {
      colonnes,
      lignes: lues.slice(0, max).map((ligne) => colonnes.map((nom) => ligne[nom])),
      tronque: lues.length > max,
    }
    db.close()
  } catch (erreur) {
    sortie = { erreur: erreur instanceof Error ? erreur.message : String(erreur) }
  }
  process.stdout.write(JSON.stringify(sortie, (_, v) => (typeof v === 'bigint' ? Number(v) : v)))
})
`

export async function executerRequete(
  copie: Copie,
  sql: string,
  parametres?: ParametresRequete,
  delaiMs = DELAI_REQUETE_MS,
): Promise<ResultatRequete> {
  if (sql.length > SQL_MAX) {
    return { erreur: `requête trop longue : ${sql.length} caractères, ${SQL_MAX} au plus` }
  }
  const lecture = sql.trim().replace(/;$/, '')
  if (!DEBUT_LECTURE.test(lecture)) {
    return { erreur: 'seules les lectures sont permises : la requête commence par SELECT ou WITH' }
  }
  if (lecture.includes(';')) {
    return { erreur: 'une seule requête à la fois : « ; » seulement en fin' }
  }
  const mot = MOTS_REFUSES.exec(lecture)
  if (mot) return { erreur: `mot refusé dans une lecture : ${mot[1]}` }
  if (parametres) {
    // Un paramètre nommé sans valeur serait lié à null en silence : refusé.
    const absent = parametresNommes(lecture).find((nom) => !(nom in parametres))
    if (absent !== undefined) {
      return { erreur: `paramètre « ${absent} » nommé dans la requête, sans valeur` }
    }
  }
  const enfant = spawn(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', '-e', PROCESSUS],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  return new Promise<ResultatRequete>((rendre) => {
    let sortie = ''
    let erreurs = ''
    let rendu = false
    const fin = (r: ResultatRequete) => {
      if (rendu) return
      rendu = true
      clearTimeout(minuterie)
      enfant.kill('SIGKILL')
      rendre(r)
    }
    const minuterie = setTimeout(
      () => fin({ erreur: `requête arrêtée : plus de ${delaiMs / 1000} s d'exécution` }),
      delaiMs,
    )
    enfant.stdout.on('data', (d: Buffer) => {
      sortie += d.toString('utf8')
    })
    enfant.stderr.on('data', (d: Buffer) => {
      erreurs += d.toString('utf8')
    })
    enfant.once('error', (e) => fin({ erreur: e.message }))
    enfant.once('close', (code) => {
      try {
        fin(JSON.parse(sortie) as ResultatRequete)
      } catch {
        fin({ erreur: `requête interrompue (code ${code}) ${erreurs.trim().slice(0, 300)}`.trim() })
      }
    })
    enfant.stdin.end(
      JSON.stringify({
        chemin: copie.chemin,
        sql: lecture,
        max: LIGNES_MAX,
        ...(parametres ? { parametres } : {}),
      }),
    )
  })
}

/** Le résultat pour le modèle : `col | col`, puis une ligne par résultat ; ou `erreur : …`. */
export function rendreResultat(r: ResultatRequete): string {
  if ('erreur' in r) return `erreur : ${r.erreur}`
  const texte = [
    r.colonnes.join(' | '),
    ...r.lignes.map((ligne) => ligne.map((v) => (v === null ? 'null' : String(v))).join(' | ')),
  ]
  if (r.lignes.length === 0) texte.push('(aucune ligne)')
  if (r.tronque) texte.push(`(tronqué à ${LIGNES_MAX} lignes)`)
  return texte.join('\n')
}
