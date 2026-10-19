// La barre discrète qui relie les pages de présentation du harnais : la même
// sur chacune, la page courante marquée. Elle hérite de la couleur du texte de
// la page (claire ou sombre) et défile seule au téléphone, sans élargir la page.
// `base` : '' sur smarttailor.fr (chemins du site), 'https://smarttailor.fr' ailleurs
// (un artefact claude.ai). `dans` : 'barre' pour la loger dans la barre du diaporama.

/** Les pages, dans l'ordre de lecture : chemin public, nom dans la barre. */
export const PAGES = [
  ['/harnais-en-clair', 'En clair'],
  ['/harnais-en-clair/demo', 'La démo'],
  ['/harnais-en-clair/espaces', 'Parler à l’outil'],
  ['/dispos-harnais', 'Diaporama'],
  ['/schema-harnais', 'Schéma'],
  ['/carte-harnais', 'Carte'],
  ['/glossaire', 'Glossaire'],
]

const STYLE = `<style>
.nav-harnais { display: flex; gap: 0.2rem 1.1rem; overflow-x: auto; white-space: nowrap; scrollbar-width: none; padding: 0.55rem clamp(16px, 4vw, 40px); font: 500 0.62rem/1.4 "Martian Mono", ui-monospace, Menlo, monospace; letter-spacing: 0.07em; text-transform: uppercase; color: inherit; pointer-events: auto; }
.nav-harnais::-webkit-scrollbar { display: none; }
.nav-harnais.barre { padding: 0; min-width: 0; flex: 1 1 auto; }
.nav-harnais a { color: inherit; opacity: 0.55; text-decoration: none; padding: 0.15rem 0; border-bottom: 1px solid transparent; }
.nav-harnais a:hover, .nav-harnais a:focus-visible { opacity: 1; outline: none; border-bottom-color: currentColor; }
.nav-harnais a[aria-current="page"] { opacity: 1; border-bottom-color: currentColor; }
</style>`

/** La barre, avec son style ; `courante` est le chemin public de la page qui la porte. */
export function nav(courante, { base = '', dans } = {}) {
  if (!PAGES.some(([chemin]) => chemin === courante)) throw new Error(`nav : page inconnue ${courante}`)
  const liens = PAGES.map(
    ([chemin, nom]) =>
      `<a href="${base}${chemin}"${chemin === courante ? ' aria-current="page"' : ''}>${nom}</a>`,
  ).join('')
  return `${STYLE}\n<nav class="nav-harnais${dans === 'barre' ? ' barre' : ''}" aria-label="Les pages du harnais">${liens}</nav>`
}
