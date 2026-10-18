// La page /carte-harnais de smarttailor.fr, générée depuis la section « La carte »
// du README : ses quatre schémas Mermaid, rendus dans le navigateur par une copie
// de Mermaid servie par le site (la CSP n'admet que des scripts du site), polices
// auto-hébergées, comme /glossaire et /schema-harnais. Le README fait foi ; la
// page se régénère d'un bloc, jamais retouchée à la main dans le site.
// Usage : node presentation/carte.mjs README.md ../smart-tailor/public/carte-harnais/index.html
import { readFileSync, writeFileSync } from 'node:fs'

const [, , source, sortie] = process.argv
const md = readFileSync(source, 'utf8')

/** Le chemin public de la page : les polices et Mermaid y sont servis à côté. */
const ROUTE = '/carte-harnais'

const debut = md.indexOf('\n## La carte\n')
const fin = md.indexOf('\n## ', debut + 1)
if (debut === -1 || fin === -1) throw new Error('le README n’a pas de section « La carte »')
const section = md.slice(debut, fin)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/« ([^»]+) »/g, '«&nbsp;$1&nbsp;»')

// L'introduction : les paragraphes avant le premier « ### ».
const intro = section
  .slice(0, section.indexOf('\n### '))
  .replace('\n## La carte\n', '')
  .trim()
  .split(/\n\n+/)
  .map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`)
  .join('\n')

// Les schémas : un titre, un bloc mermaid, et la prose éventuelle entre les deux.
const schemas = [...section.matchAll(/\n### (.*)\n([\s\S]*?)```mermaid\n([\s\S]*?)```/g)].map((m) => ({
  titre: m[1].trim(),
  prose: m[2].trim(),
  code: m[3],
}))
if (schemas.length === 0) throw new Error('aucun schéma Mermaid dans « La carte »')

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>La carte du harnais</title>
<meta name="description" content="Les quatre schémas du harnais : qui tourne où, la vie d’une mission, ce que le moteur demande à un métier, le moteur vu de ses entrées.">
<style>
@font-face { font-family: "Archivo"; src: url("${ROUTE}/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Public Sans"; src: url("${ROUTE}/fonts/public-sans.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Martian Mono"; src: url("${ROUTE}/fonts/martian-mono.woff2") format("woff2"); font-weight: 100 800; font-display: swap; }

/* La charte des pages du harnais : papier blanc, marine, un bleu ; le sombre suit le système. */
:root {
  --bg: #ffffff; --bg-soft: #f5f7fb; --ink: #041723; --ink-soft: #3d4b57; --ink-faint: #74818c;
  --blue: #1f5eff; --blue-ink: #1649c2; --line: #d9dfe7;
  --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Public Sans", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Martian Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #041723; --bg-soft: #0a2231; --ink: #ffffff; --ink-soft: rgba(255,255,255,0.78); --ink-faint: rgba(255,255,255,0.55); --blue: #568eff; --blue-ink: #8cb2ff; --line: rgba(255,255,255,0.16); color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #041723; --bg-soft: #0a2231; --ink: #ffffff; --ink-soft: rgba(255,255,255,0.78); --ink-faint: rgba(255,255,255,0.55); --blue: #568eff; --blue-ink: #8cb2ff; --line: rgba(255,255,255,0.16); color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 1.02rem/1.55 var(--font-body); -webkit-font-smoothing: antialiased; }
.wrap { width: min(100% - 32px, 72rem); margin-inline: auto; }
header { padding: clamp(2rem, 6vh, 4rem) 0 1.5rem; border-bottom: 1px solid var(--line); }
.eyebrow { font: 500 0.72rem var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--blue-ink); margin: 0 0 1rem; }
.eyebrow a { color: inherit; text-decoration: none; }
h1 { font: 400 clamp(2.4rem, 1.6rem + 3vw, 4.4rem)/1.04 var(--font-display); letter-spacing: -0.025em; margin: 0 0 1rem; max-width: 18ch; }
h1 em { font-style: normal; color: var(--blue); }
.intro p { max-width: 62ch; color: var(--ink-soft); margin: 0 0 0.7rem; }
.liens { font: 500 0.78rem var(--font-mono); letter-spacing: 0.04em; color: var(--ink-faint); margin: 1.2rem 0 0; }
.liens a { color: var(--blue-ink); }
nav.sommaire { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; padding: 1rem 0; font: 500 0.78rem var(--font-mono); letter-spacing: 0.04em; border-bottom: 1px solid var(--line); }
nav.sommaire a { color: var(--ink-soft); text-decoration: none; }
nav.sommaire a:hover { color: var(--blue-ink); }
section.schema { padding: 2.6rem 0 1rem; scroll-margin-top: 1rem; }
section.schema h2 { font: 400 clamp(1.5rem, 1.1rem + 1.4vw, 2.3rem)/1.15 var(--font-display); letter-spacing: -0.02em; margin: 0 0 0.6rem; }
section.schema h2 .n { font: 500 0.78rem var(--font-mono); color: var(--blue-ink); letter-spacing: 0.08em; display: block; margin-bottom: 0.4rem; }
section.schema .prose { max-width: 62ch; color: var(--ink-soft); margin: 0 0 1rem; }
.figure { background: var(--bg-soft); border: 1px solid var(--line); border-radius: 6px; padding: 1rem; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.figure pre.mermaid { margin: 0; font: inherit; display: flex; justify-content: center; }
.figure svg { max-width: none; height: auto; }
.attente { color: var(--ink-faint); font: 500 0.78rem var(--font-mono); }
footer { padding: 2rem 0 3rem; border-top: 1px solid var(--line); margin-top: 2rem; color: var(--ink-faint); font: 500 0.74rem var(--font-mono); letter-spacing: 0.04em; }
@media (max-width: 36rem) { .figure { padding: 0.5rem; } }
@media print { nav.sommaire, .liens, footer { display: none; } .figure { overflow: visible; border: 0; } section.schema { break-inside: avoid; } }
</style>
</head>
<body>
<header><div class="wrap">
  <p class="eyebrow"><a href="/">Smart Tailor</a> · le harnais</p>
  <h1>La carte du <em>harnais</em></h1>
  <div class="intro">${intro}</div>
  <p class="liens">Le détail : <a href="/schema-harnais">le schéma</a> · <a href="/dispos-harnais">le diaporama</a> · <a href="/glossaire">le glossaire</a></p>
</div></header>
<div class="wrap">
<nav class="sommaire" aria-label="Les quatre schémas">
${schemas.map((s, i) => `  <a href="#${slug(s.titre)}">0${i + 1} ${esc(s.titre)}</a>`).join('\n')}
</nav>
${schemas
  .map(
    (s, i) => `<section class="schema" id="${slug(s.titre)}">
  <h2><span class="n">0${i + 1}</span>${esc(s.titre)}</h2>
${s.prose ? `  <p class="prose">${inline(s.prose.replace(/\n/g, ' '))}</p>\n` : ''}  <div class="figure"><pre class="mermaid" aria-label="${esc(s.titre)}">${esc(s.code)}</pre></div>
</section>`,
  )
  .join('\n')}
<footer>Relevé sur le code du dépôt agency-harness · la source est la section « La carte » de son README · <span class="attente" id="etat">schémas en cours de rendu…</span></footer>
</div>
<script src="${ROUTE}/mermaid.min.js"></script>
<script>
(function () {
  var sombre = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: '"Public Sans", "Helvetica Neue", Arial, sans-serif',
    themeVariables: sombre
      ? { background: '#0a2231', primaryColor: '#12304a', primaryTextColor: '#ffffff', primaryBorderColor: '#568eff', lineColor: '#8cb2ff', secondaryColor: '#0a2231', tertiaryColor: '#0f2a40', noteBkgColor: '#12304a', noteTextColor: '#ffffff', actorBkg: '#12304a', actorBorder: '#568eff', actorTextColor: '#ffffff', signalColor: '#8cb2ff', signalTextColor: '#ffffff', labelBoxBkgColor: '#12304a', labelTextColor: '#ffffff', sequenceNumberColor: '#041723' }
      : { background: '#f5f7fb', primaryColor: '#e9f0ff', primaryTextColor: '#041723', primaryBorderColor: '#1f5eff', lineColor: '#041723', secondaryColor: '#ffffff', tertiaryColor: '#ffffff', noteBkgColor: '#fff6e5', noteTextColor: '#041723', actorBkg: '#e9f0ff', actorBorder: '#1f5eff', actorTextColor: '#041723', signalColor: '#041723', signalTextColor: '#041723', labelBoxBkgColor: '#e9f0ff', labelTextColor: '#041723', sequenceNumberColor: '#ffffff' },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: false, mirrorActors: false }
  });
  var etat = document.getElementById('etat');
  mermaid.run({ querySelector: '.mermaid' }).then(function () {
    etat.textContent = 'quatre schémas rendus';
  }).catch(function (e) {
    etat.textContent = 'un schéma n’a pas pu être rendu : ' + e.message;
  });
})();
</script>
</body>
</html>
`

writeFileSync(sortie, html)
console.log(`schémas ${schemas.length} : ${schemas.map((s) => s.titre).join(' | ')}`)
