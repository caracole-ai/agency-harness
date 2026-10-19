// La page /glossaire de smarttailor.fr, générée depuis GLOSSAIRE.md : une page
// HTML autonome (styles et script en ligne, polices auto-hébergées dans son
// `fonts/`), comme /dispos-harnais. Le glossaire fait foi ; la page se
// régénère d'un bloc, jamais retouchée à la main dans le site.
// Usage : node presentation/glossaire.mjs GLOSSAIRE.md ../smart-tailor/public/glossaire/index.html
import { readFileSync, writeFileSync } from 'node:fs'
import { nav as navHarnais } from './nav.mjs'

const [, , source, sortie] = process.argv
const md = readFileSync(source, 'utf8')

// La date du relevé, lue dans l'en-tête du glossaire (« relevé sur le code le AAAA-MM-JJ »).
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const dateReleve = (() => {
  const m = md.match(/relevé sur le code le (\d{4})-(\d{2})-(\d{2})/)
  if (!m) throw new Error('GLOSSAIRE.md ne dit pas « relevé sur le code le AAAA-MM-JJ »')
  return `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}`
})()

// Sur une page publique, une entrée se dit sans détailler une faiblesse ouverte.
const REECRITURES = {
  'Bac à sable':
    'ouvert : isoler le code d’un chantier dans un utilisateur dédié, sans accès aux clés de l’agence. Avant le premier client réel.',
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
const texte = (s) => s.replace(/`/g, '').replace(/\*\*/g, '')
const slug = (s) =>
  texte(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Découpe en sections « ## ».
const sections = []
let courante
for (const ligne of md.split('\n')) {
  const h = ligne.match(/^## (.+)$/)
  if (h) {
    courante = { titre: h[1], entrees: [], tableau: [], notes: [] }
    sections.push(courante)
    continue
  }
  if (!courante) continue
  const e = ligne.match(/^- \*\*(.+?)\*\*(.*?) : (.*)$/)
  if (e) {
    const [, terme, qualif, def] = e
    const d = REECRITURES[terme] ?? def
    courante.entrees.push({ terme, qualif: qualif.trim(), def: d.charAt(0).toUpperCase() + d.slice(1) })
    continue
  }
  if (ligne.startsWith('|')) {
    const cellules = ligne
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'))
    if (cellules[0] === 'Commande' || /^-+$/.test(cellules[0])) continue
    courante.tableau.push({ commande: cellules[0].replace(/^`|`$/g, ''), def: cellules[1] })
    continue
  }
  if (ligne.trim() && courante.tableau.length) courante.notes.push(ligne.trim())
}

const ids = new Set()
const idUnique = (base) => {
  let id = base
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`
  ids.add(id)
  return id
}

const index = []
const nav = []
const corps = sections
  .map((s) => {
    const sid = idUnique(slug(s.titre))
    const retire = /retirés/.test(s.titre)
    const n = s.entrees.length + s.tableau.length
    nav.push(`<li><a href="#${sid}">${esc(s.titre)}<span class="nb">${n}</span></a></li>`)
    const entrees = s.entrees
      .map((e) => {
        const id = idUnique(slug(e.terme.split(',')[0]))
        index.push({ terme: texte(e.terme), id })
        return `<div class="entree${retire ? ' retire' : ''}" id="${id}" data-q="${esc(
          `${texte(e.terme)} ${texte(e.qualif)} ${texte(e.def)}`.toLowerCase(),
        )}">
  <dt><a class="ancre" href="#${id}" aria-label="Lien vers ${esc(texte(e.terme))}">#</a><span class="terme">${inline(e.terme)}</span>${retire ? '<span class="badge">retiré</span>' : ''}${
    e.qualif ? `<span class="qualif">${inline(e.qualif.replace(/^\(|\)$/g, ''))}</span>` : ''
  }</dt>
  <dd>${inline(e.def)}</dd>
</div>`
      })
      .join('\n')
    const commandes = s.tableau
      .map((c) => {
        const mots = c.commande.replace(/`/g, '').split(/\s+/)
        const garde = []
        for (let i = 0; i < mots.length; i++) {
          if (mots[i] === '--filter') { garde.push(mots[i], mots[i + 1]); i++; continue }
          if (/^(\[|<|-|")/.test(mots[i])) break
          garde.push(mots[i])
        }
        const nom = garde.join(' ')
        const id = idUnique(`cmd-${slug(nom)}`)
        index.push({ terme: nom, id })
        return `<div class="commande" id="${id}" data-q="${esc(`${c.commande} ${texte(c.def)}`.toLowerCase())}">
  <div class="ligne"><code>${esc(c.commande.replace(/`/g, ''))}</code>${
    c.commande.includes(', ')
      ? ''
      : `<button type="button" class="copier" data-copie="${esc(c.commande.replace(/`/g, ''))}" aria-label="Copier la commande">Copier</button>`
  }</div>
  <p>${inline(c.def)}</p>
</div>`
      })
      .join('\n')
    const notes = s.notes.length ? `<p class="note">${inline(s.notes.join(' '))}</p>` : ''
    return `<section id="${sid}" class="section">
<h2>${esc(s.titre)} <span class="nb">${n}</span></h2>
${entrees ? `<dl>${entrees}</dl>` : ''}${commandes ? `<div class="commandes">${commandes}</div>` : ''}${notes}
</section>`
  })
  .join('\n')

const az = index
  .slice()
  .sort((a, b) => a.terme.localeCompare(b.terme, 'fr', { sensitivity: 'base' }))
const lettres = new Map()
for (const t of az) {
  const l = t.terme
    .replace(/^[^A-Za-zÀ-ÿ]+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .charAt(0)
    .toUpperCase()
  if (!lettres.has(l)) lettres.set(l, [])
  lettres.get(l).push(t)
}
const azHtml = [...lettres]
  .map(
    ([l, ts]) =>
      `<div class="lettre"><h3>${l}</h3><ul>${ts
        .map((t) => `<li><a href="#${t.id}">${esc(t.terme)}</a></li>`)
        .join('')}</ul></div>`,
  )
  .join('')
const total = index.length

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Glossaire du harnais · Smart Tailor</title>
<meta name="description" content="L’abécédaire du harnais de Smart Tailor : le vocabulaire, les commandes et les fichiers, une ligne chacun.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
/* Polices auto-hébergées (la CSP de smarttailor.fr n'admet que font-src 'self') ; licence SIL OFL. */
@font-face { font-family: "Archivo"; src: url("/glossaire/fonts/archivo.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Public Sans"; src: url("/glossaire/fonts/public-sans.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Martian Mono"; src: url("/glossaire/fonts/martian-mono.woff2") format("woff2"); font-weight: 100 800; font-display: swap; }

/* Une page de référence : fond clair pour la lecture longue, la marine et le bleu de la marque,
   le sombre suit le système. Deux colonnes au large (sommaire collant, texte), une au téléphone. */
:root {
  --bg: #f7f8fa; --surface: #ffffff; --ink: #041723; --ink-soft: #3d4f5c; --ink-faint: #6b7b87;
  --line: #e2e7ec; --blue: #2f6fe8; --blue-ink: #1f56c2; --blue-soft: #eaf1ff; --amber: #a86a12; --amber-soft: #fff4e2;
  --mark: #fff1b8;
  --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Public Sans", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Martian Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  --gutter: clamp(16px, 4vw, 48px);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #041723; --surface: #0a2231; --ink: #ffffff; --ink-soft: rgba(255,255,255,0.78); --ink-faint: rgba(255,255,255,0.55);
    --line: rgba(255,255,255,0.13); --blue: #568eff; --blue-ink: #8cb2ff; --blue-soft: rgba(86,142,255,0.13);
    --amber: #f2b45a; --amber-soft: rgba(242,180,90,0.1); --mark: rgba(242,180,90,0.32);
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 5.5rem; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 1.0625rem/1.6 var(--font-body); -webkit-font-smoothing: antialiased; overflow-x: clip; }
a { color: inherit; }
code { font: 500 0.82em/1.4 var(--font-mono); color: var(--blue-ink); background: var(--blue-soft); padding: 0.08em 0.35em; border-radius: 3px; overflow-wrap: anywhere; }
strong { font-weight: 650; }

/* l'en-tête */
.haut { padding: clamp(2rem, 6vw, 4.5rem) var(--gutter) clamp(1.5rem, 3vw, 2.5rem); border-bottom: 1px solid var(--line); background: var(--surface); }
.haut .in { width: min(100%, 76rem); margin-inline: auto; display: grid; gap: 0.9rem; }
.eyebrow { font: 500 0.72rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.12em; color: var(--blue-ink); margin: 0; }
.eyebrow a { text-decoration: none; }
.eyebrow a:hover { text-decoration: underline; }
h1 { font: 400 clamp(2.6rem, 1.8rem + 4vw, 4.6rem)/1 var(--font-display); letter-spacing: -0.03em; margin: 0; }
.lede { margin: 0; max-width: 58ch; color: var(--ink-soft); font-size: 1.12rem; text-wrap: pretty; }
.meta { margin: 0; font: 500 0.75rem var(--font-mono); color: var(--ink-faint); letter-spacing: 0.04em; }

/* la recherche, collante */
.barre { position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); padding: 0.75rem var(--gutter); }
.barre .in { width: min(100%, 76rem); margin-inline: auto; display: flex; gap: 0.8rem; align-items: center; }
.champ { position: relative; flex: 1; max-width: 34rem; }
.champ input { width: 100%; font: 400 1rem var(--font-body); color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 0.65rem 2.6rem 0.65rem 0.9rem; outline: none; }
.champ input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }
.champ kbd { position: absolute; right: 0.6rem; top: 50%; translate: 0 -50%; font: 500 0.7rem var(--font-mono); color: var(--ink-faint); border: 1px solid var(--line); border-radius: 4px; padding: 0.1rem 0.4rem; }
.compte { font: 500 0.75rem var(--font-mono); color: var(--ink-faint); white-space: nowrap; }

/* deux colonnes */
.page { width: min(100% - 2 * var(--gutter), 76rem); margin-inline: auto; padding: 0 0 5rem; display: grid; grid-template-columns: 15rem minmax(0, 1fr); gap: clamp(2rem, 4vw, 4rem); }
.sommaire { position: sticky; top: 4.8rem; align-self: start; padding-top: 2.2rem; max-height: calc(100dvh - 5rem); overflow-y: auto; }
.sommaire p { font: 500 0.7rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-faint); margin: 0 0 0.6rem; padding-left: 0.6rem; }
.sommaire ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.1rem; }
.sommaire a { display: flex; justify-content: space-between; gap: 0.6rem; text-decoration: none; padding: 0.4rem 0.6rem; border-radius: 6px; color: var(--ink-soft); font-size: 0.92rem; line-height: 1.3; border-left: 2px solid transparent; }
.sommaire a:hover { background: var(--surface); color: var(--ink); }
.sommaire a.actif { color: var(--ink); border-left-color: var(--blue); background: var(--surface); font-weight: 600; }
.nb { font: 500 0.7rem var(--font-mono); color: var(--ink-faint); font-weight: 500; }

/* les sections */
.section { padding-top: 2.2rem; }
.section[hidden] { display: none; }
h2 { font: 500 clamp(1.5rem, 1.2rem + 1.2vw, 2.1rem)/1.15 var(--font-display); letter-spacing: -0.015em; margin: 0 0 1rem; display: flex; align-items: baseline; gap: 0.6rem; }
dl { margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.entree { display: grid; grid-template-columns: minmax(10rem, 15rem) minmax(0, 1fr); gap: 0.3rem 1.6rem; padding: 0.95rem 1.2rem; border-top: 1px solid var(--line); }
.entree:first-child { border-top: 0; }
.entree[hidden] { display: none; }
.entree:target { background: var(--amber-soft); }
dt { position: relative; display: grid; gap: 0.25rem; align-content: start; }
.terme { font: 600 1.02rem/1.35 var(--font-body); color: var(--ink); }
.terme code { font-size: 0.86em; }
.qualif { font-size: 0.82rem; line-height: 1.4; color: var(--ink-faint); }
.qualif code { font-size: 0.85em; background: transparent; padding: 0; color: var(--ink-faint); }
dd { margin: 0; color: var(--ink-soft); text-wrap: pretty; }
.ancre { position: absolute; left: -1.05rem; top: 0.05rem; text-decoration: none; color: var(--ink-faint); opacity: 0; font: 500 0.85rem var(--font-mono); }
.entree:hover .ancre, .ancre:focus { opacity: 1; }
.retire .terme { color: var(--ink-soft); }
.badge { justify-self: start; font: 500 0.65rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--amber); border: 1px solid currentColor; border-radius: 999px; padding: 0.05rem 0.5rem; }
mark { background: var(--mark); color: inherit; border-radius: 2px; padding: 0 0.05em; }

/* les commandes */
.commandes { display: grid; gap: 0.7rem; }
.commande { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 0.85rem 1rem; display: grid; gap: 0.45rem; }
.commande[hidden] { display: none; }
.commande:target { background: var(--amber-soft); }
.commande .ligne { display: flex; gap: 0.6rem; align-items: flex-start; }
.commande .ligne code { flex: 1; display: block; font-size: 0.8rem; line-height: 1.55; padding: 0.5rem 0.65rem; border-radius: 6px; }
.commande p { margin: 0; color: var(--ink-soft); }
.copier { font: 500 0.7rem var(--font-mono); color: var(--ink-faint); background: transparent; border: 1px solid var(--line); border-radius: 6px; padding: 0.45rem 0.6rem; cursor: pointer; }
.copier:hover { color: var(--blue-ink); border-color: var(--blue); }
.note { margin: 1rem 0 0; padding: 0.85rem 1rem; border-left: 3px solid var(--amber); background: var(--amber-soft); border-radius: 0 8px 8px 0; color: var(--ink); }

/* l'index de A à Z */
.az { columns: 13rem; column-gap: 2rem; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 1.2rem 1.4rem; }
.lettre { break-inside: avoid; margin-bottom: 1rem; }
.lettre h3 { font: 500 1.3rem/1 var(--font-display); color: var(--blue-ink); margin: 0 0 0.4rem; }
.lettre ul { list-style: none; margin: 0; padding: 0; }
.lettre a { text-decoration: none; font-size: 0.92rem; color: var(--ink-soft); line-height: 1.7; }
.lettre a:hover { color: var(--blue-ink); text-decoration: underline; }
.vide { display: none; padding: 2rem 0; color: var(--ink-faint); }
.vide.visible { display: block; }

.pied { border-top: 1px solid var(--line); padding: 1.6rem var(--gutter) 2.4rem; font: 500 0.75rem var(--font-mono); color: var(--ink-faint); }
.pied .in { width: min(100%, 76rem); margin-inline: auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.6rem; }

@media (max-width: 56rem) {
  .page { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .sommaire { position: static; max-height: none; padding-top: 1.2rem; overflow: visible; }
  .sommaire ul { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.4rem; scrollbar-width: none; }
  .sommaire a { white-space: nowrap; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); padding: 0.35rem 0.8rem; }
  .sommaire a.actif { border-color: var(--blue); }
}
@media (max-width: 40rem) {
  .entree { grid-template-columns: minmax(0, 1fr); padding: 0.9rem 1rem; }
  .ancre { display: none; }
  .champ kbd { display: none; }
}
@media print {
  .barre, .sommaire, .copier { display: none; }
  .page { grid-template-columns: 1fr; }
  body { background: #fff; color: #000; }
}
</style>
</head>
<body>
${navHarnais('/glossaire')}
<header class="haut"><div class="in">
  <p class="eyebrow"><a href="/">Smart Tailor</a> · le harnais</p>
  <h1>Glossaire</h1>
  <p class="lede">L’abécédaire du harnais : chaque mot du projet, chaque commande, chaque fichier, en une ligne. Pour lire les plans et suivre le code sans se perdre.</p>
  <p class="meta">${total} entrées · relevé sur le code le ${dateReleve}</p>
</div></header>

<div class="barre"><div class="in">
  <label class="champ"><input id="q" type="search" aria-label="Chercher dans le glossaire" placeholder="Chercher un terme" autocomplete="off" spellcheck="false"><kbd>/</kbd></label>
  <span class="compte" id="compte" aria-live="polite"></span>
</div></div>

<div class="page">
<nav class="sommaire" aria-label="Sommaire">
  <p>Sommaire</p>
  <ul>${nav.join('')}<li><a href="#a-z">Index de A à Z<span class="nb">${total}</span></a></li></ul>
</nav>
<main>
${corps}
<p class="vide" id="vide">Aucune entrée ne correspond.</p>
<section id="a-z" class="section">
<h2>Index de A à Z <span class="nb">${total}</span></h2>
<div class="az">${azHtml}</div>
</section>
</main>
</div>

<footer class="pied"><div class="in">
  <span>Source : GLOSSAIRE.md, dépôt du harnais</span>
  <a href="/">smarttailor.fr</a>
</div></footer>

<script>
(() => {
  const q = document.getElementById('q');
  const compte = document.getElementById('compte');
  const vide = document.getElementById('vide');
  const items = [...document.querySelectorAll('.entree, .commande')];
  const sections = [...document.querySelectorAll('main > .section')];
  const az = document.getElementById('a-z');
  const sans = (s) => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  const cles = new Map(items.map((el) => [el, sans(el.dataset.q)]));
  const originaux = new Map(items.map((el) => [el, el.innerHTML]));
  const total = items.length;
  const marquer = (el, mot) => {
    el.innerHTML = originaux.get(el);
    if (!mot) return;
    const marche = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const noeuds = [];
    while (marche.nextNode()) noeuds.push(marche.currentNode);
    for (const n of noeuds) {
      const i = sans(n.nodeValue).indexOf(mot);
      if (i < 0 || n.parentElement.closest('button')) continue;
      const r = document.createRange();
      r.setStart(n, i); r.setEnd(n, i + mot.length);
      const m = document.createElement('mark');
      r.surroundContents(m);
    }
  };
  const filtrer = () => {
    const mot = sans(q.value.trim());
    let vus = 0;
    for (const el of items) {
      const ok = !mot || cles.get(el).includes(mot);
      el.hidden = !ok;
      if (ok) vus++;
      marquer(el, ok ? mot : '');
    }
    for (const s of sections) {
      if (s === az) { s.hidden = !!mot; continue; }
      const n = s.querySelectorAll('.entree:not([hidden]), .commande:not([hidden])').length;
      s.hidden = n === 0;
      const nb = s.querySelector('h2 .nb');
      if (nb) nb.textContent = n;
    }
    vide.classList.toggle('visible', vus === 0);
    compte.textContent = mot ? vus + ' sur ' + total : total + ' entrées';
  };
  q.addEventListener('input', filtrer);
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
    if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; filtrer(); q.blur(); }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.copier');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copie); b.textContent = 'Copié'; }
    catch { b.textContent = 'Échec'; }
    setTimeout(() => { b.textContent = 'Copier'; }, 1400);
  });
  // le sommaire suit la lecture
  const liens = new Map([...document.querySelectorAll('.sommaire a')].map((a) => [a.getAttribute('href').slice(1), a]));
  const obs = new IntersectionObserver((entrees) => {
    for (const en of entrees) {
      if (!en.isIntersecting) continue;
      for (const a of liens.values()) a.classList.remove('actif');
      liens.get(en.target.id)?.classList.add('actif');
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  for (const s of sections) obs.observe(s);
  filtrer();
})();
</script>
</body>
</html>
`
writeFileSync(sortie, html)
console.log(`sections ${sections.length}, entrées ${total}, lettres ${lettres.size}`)
