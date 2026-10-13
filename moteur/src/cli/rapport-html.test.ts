import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// `pnpm rapport:html` sur un rapport qui porte une section déclarée par le
// métier (PLAN-METIER-2.md M12) : elle se met en page, sans couleur à elle.

const CLI = join(import.meta.dirname, 'rapport-html.ts')
let dossier = ''
afterEach(() => rmSync(dossier, { recursive: true, force: true }))

describe('rapport:html', () => {
  it('une section du métier, après « Sources », se met en page sans erreur', () => {
    dossier = mkdtempSync(join(tmpdir(), 'rapport-html-'))
    const md = join(dossier, 'rapport.md')
    const html = join(dossier, 'rapport.html')
    writeFileSync(
      md,
      [
        '# Veille du 12/10/2026 — client',
        '',
        '## À corriger (0)',
        '',
        'Rien.',
        '',
        '## Sources',
        '',
        '—',
        '',
        '## Écarts',
        '',
        '- PRJ-10 : 36 j consommés sur 24 vendus (150 %)',
        '',
      ].join('\n'),
    )
    execFileSync('pnpm', ['exec', 'tsx', CLI, md, html], { stdio: 'pipe' })
    const page = readFileSync(html, 'utf8')
    expect(page).toContain('<section class="refus"><h2>À corriger (0)</h2>')
    expect(page).toContain('<section class="sources"><h2>Sources</h2>')
    expect(page).toContain('<section class="metier"><h2>Écarts</h2>')
  })
})
