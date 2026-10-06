// pnpm rapport:html <rapport.md> <rapport.html> [--bandeau "texte"]
// Met en page un rapport de veille pour l'écran et l'impression (A4) : une
// page HTML autonome, à imprimer en PDF depuis n'importe quel navigateur. Le
// format de livraison chez un vrai client reste à choisir avec lui.
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { marked } from 'marked'
import { PARTIES } from '../archetypes/rapport'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { bandeau: { type: 'string' } },
})
const [entree, sortie] = positionals
if (!entree || !sortie) {
  console.error('usage : pnpm rapport:html <rapport.md> <rapport.html> [--bandeau "texte"]')
  process.exit(2)
}

const echapper = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const corps = marked.parse(readFileSync(entree, 'utf8'), { async: false, breaks: true })

// Chaque partie devient une <section> qui porte sa clé, pour la couleur
// (marked échappe les titres comme `echapper`).
const [tete = '', ...parties] = corps.split('<h2>')
const sections = parties.map((p) => {
  const cle = Object.entries(PARTIES).find(([, titre]) => p.startsWith(echapper(titre)))?.[0]
  if (!cle) throw new Error(`partie inconnue du rapport : ${p.slice(0, 40)}`)
  return `<section class="${cle}"><h2>${p}</section>`
})
const titre = /<h1>(.*?)<\/h1>/.exec(tete)?.[1] ?? 'Rapport de veille'

writeFileSync(
  sortie,
  `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<style>
  :root {
    --encre: #1d2329; --doux: #5b6672; --filet: #d9dee3; --fond: #ffffff;
    --refus: #b42318; --decider: #b54708; --note: #175cd3; --preparer: #8a6a00;
  }
  @page { size: A4; margin: 14mm 15mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto; max-width: 190mm; padding: 16px; background: var(--fond); color: var(--encre);
    font: 9.6pt/1.42 -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  @media print { body { padding: 0; max-width: none; } }
  .bandeau {
    margin: 0 0 10px; padding: 5px 9px; border-radius: 4px; background: #f2f4f7;
    color: var(--doux); font-size: 8.6pt; letter-spacing: .02em;
  }
  h1 { font-size: 15pt; margin: 0 0 6px; letter-spacing: -.01em; }
  h1 + p { margin: 0 0 12px; color: var(--doux); font-size: 8.8pt; }
  section { margin: 0 0 10px; padding-left: 10px; border-left: 3px solid var(--filet); }
  section.refus, section.escalades { border-color: var(--refus); }
  section.aDecider { border-color: var(--decider); }
  section.aNoter { border-color: var(--note); }
  section.alertes { border-color: var(--preparer); }
  h2 { font-size: 10.6pt; margin: 0 0 4px; break-after: avoid; }
  section.refus h2, section.escalades h2 { color: var(--refus); }
  section.aDecider h2 { color: var(--decider); }
  section.aNoter h2 { color: var(--note); }
  section.alertes h2 { color: var(--preparer); }
  ul { margin: 0; padding-left: 14px; }
  li { margin: 0 0 3px; break-inside: avoid; }
  li li { margin: 1px 0 0; }
  li ul ul { color: var(--doux); }
  em { color: var(--doux); font-style: normal; font-size: 8pt; }
  section.sources { border-color: var(--filet); color: var(--doux); font-size: 8pt; }
  section.sources h2 { color: var(--doux); font-size: 9pt; }
  section.sources li { margin: 0; }
</style>
</head>
<body>
${values.bandeau ? `<p class="bandeau">${echapper(values.bandeau)}</p>` : ''}
${tete}
${sections.join('\n')}
</body>
</html>
`,
)
