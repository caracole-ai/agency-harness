// Les pages de présentation écrites à la main (le schéma, le diaporama, le
// mini-site « Le harnais en clair »), publiées d'un bloc dans smarttailor.fr :
// les polices Google remplacées par les polices du site (la CSP n'admet que
// font-src 'self'), la balise robots ajoutée, les chemins rendus absolus (les
// pages sont servies sans barre finale), la barre des pages posée à la place
// de `<!-- nav-harnais -->`. Les sources ici font foi ; le site ne se retouche
// pas à la main. Avec un second dossier, écrit aussi la version des artefacts
// claude.ai (polices Google, liens vers smarttailor.fr).
// Usage : node presentation/publier.mjs ../smart-tailor/public [dossier-artefacts]
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nav } from './nav.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const [, , site, artefacts] = process.argv
if (!site) throw new Error('usage : node presentation/publier.mjs <public du site> [dossier-artefacts]')

/** Le mini-site : ses pages se lient entre elles par nom de fichier dans la source. */
const EN_CLAIR = { 'index.html': '/harnais-en-clair', 'demo.html': '/harnais-en-clair/demo', 'espaces.html': '/harnais-en-clair/espaces', 'style.css': '/harnais-en-clair/style.css' }

/** Chaque page : sa source, son chemin public, son fichier dans le site, ses liens à rendre absolus. */
const PAGES = [
  { source: 'schema-harnais.html', route: '/schema-harnais', sortie: 'schema-harnais/index.html', liens: { 'harness-figure.js': '/schema-harnais/harness-figure.js' } },
  { source: 'diaporama.html', route: '/dispos-harnais', sortie: 'dispos-harnais/index.html', dans: 'barre' },
  ...['index', 'demo', 'espaces'].map((p) => ({
    source: `en-clair/${p}.html`,
    route: EN_CLAIR[`${p}.html`],
    sortie: `harnais-en-clair/${p}.html`,
    artefact: `en-clair/${p}.html`,
    liens: EN_CLAIR,
  })),
]

/** Les fichiers servis à côté des pages, copiés tels quels. */
const FICHIERS = [
  ['harness-figure.js', 'schema-harnais/harness-figure.js'],
  ['en-clair/style.css', 'harnais-en-clair/style.css'],
]

const POLICES = ['archivo', 'public-sans', 'martian-mono']
const GOOGLE = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">\n?/

const policesDuSite = (dossier) => `<style>
/* Polices auto-hébergées (la CSP de smarttailor.fr n'admet que font-src 'self') ; licence SIL OFL. */
@font-face { font-family: "Archivo"; src: url("/${dossier}/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Public Sans"; src: url("/${dossier}/fonts/public-sans.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Martian Mono"; src: url("/${dossier}/fonts/martian-mono.woff2") format("woff2"); font-weight: 100 800; font-display: swap; }
</style>
`

const remplacerUneFois = (texte, avant, apres, quoi) => {
  if (!texte.includes(avant)) throw new Error(`${quoi} : « ${avant.trim()} » introuvable`)
  return texte.replace(avant, apres)
}

/** Les liens `href`/`src` qui visent un fichier de la table, ancre comprise, rendus absolus. */
const rendreAbsolus = (html, liens = {}) =>
  html.replace(/(href|src)="([^"#:]+)(#[^"]*)?"/g, (tout, attr, fichier, ancre = '') =>
    liens[fichier] ? `${attr}="${liens[fichier]}${ancre}"` : tout,
  )

for (const p of PAGES) {
  const source = readFileSync(join(ICI, p.source), 'utf8')
  const marque = '<!-- nav-harnais -->'
  if (!source.includes(marque)) throw new Error(`${p.source} : pas de ${marque}`)
  if (!GOOGLE.test(source)) throw new Error(`${p.source} : pas de ligne de polices Google`)
  const dossier = p.sortie.split('/')[0]

  let html = source.replace(GOOGLE, policesDuSite(dossier))
  if (!html.includes('name="robots"')) {
    html = html.replace(/(<meta name="viewport"[^>]*>\n)/, '$1<meta name="robots" content="noindex, nofollow">\n')
  }
  html = rendreAbsolus(html, p.liens)
  html = remplacerUneFois(html, marque, nav(p.route, { dans: p.dans }), p.source)
  const sortie = join(site, p.sortie)
  mkdirSync(dirname(sortie), { recursive: true })
  writeFileSync(sortie, html)
  // Les polices : celles du glossaire, la même licence, si le dossier n'a pas les siennes.
  for (const police of POLICES) {
    const cible = join(site, dossier, 'fonts', `${police}.woff2`)
    if (!existsSync(cible)) {
      mkdirSync(dirname(cible), { recursive: true })
      copyFileSync(join(site, 'glossaire', 'fonts', `${police}.woff2`), cible)
    }
  }
  if (artefacts) {
    const a = join(artefacts, p.artefact ?? p.source)
    mkdirSync(dirname(a), { recursive: true })
    writeFileSync(a, source.replace(marque, nav(p.route, { base: 'https://smarttailor.fr', dans: p.dans })))
  }
  console.log(`${p.source} → ${p.sortie}`)
}

for (const [source, sortie] of FICHIERS) {
  cpSync(join(ICI, source), join(site, sortie))
  if (artefacts && source.startsWith('en-clair/')) cpSync(join(ICI, source), join(artefacts, source))
  console.log(`${source} → ${sortie}`)
}
