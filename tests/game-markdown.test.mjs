import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundleDir = await mkdtemp(path.join(tmpdir(), 'lean4game-markdown-'))
const bundlePath = path.join(bundleDir, 'renderer.cjs')
after(() => rm(bundleDir, { force: true, recursive: true }))
await build({
  stdin: {
    contents: `
      import React from 'react'
      import { renderToStaticMarkup } from 'react-dom/server'
      import { GameMarkdown } from './src/game/GameMarkdown.tsx'

      export function renderMarkdown(markdown, assetBase) {
        return renderToStaticMarkup(
          React.createElement(GameMarkdown, { children: markdown, assetBase }),
        )
      }
    `,
    loader: 'tsx',
    resolveDir: repoRoot,
    sourcefile: 'game-markdown-test-entry.tsx',
  },
  bundle: true,
  format: 'cjs',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  outfile: bundlePath,
  platform: 'node',
})
const { renderMarkdown } = await import(pathToFileURL(bundlePath).href)
const game = JSON.parse(readFileSync(
  path.join(repoRoot, 'src/game/nng4.generated.json'),
  'utf8',
))
const realAnalysisGame = JSON.parse(readFileSync(
  path.join(repoRoot, 'src/game/real-analysis.generated.json'),
  'utf8',
))
const manifoldGame = JSON.parse(readFileSync(
  path.join(repoRoot, 'src/game/manifolds.generated.json'),
  'utf8',
))

test('GameMarkdown renders GFM, nested lists, KaTeX, and local images', () => {
  const html = renderMarkdown(String.raw`
# Formatting

Inline math is $x^2 + y_1$.

$$
\sum_{i=0}^{n} i
$$

| Item | Meaning |
| --- | --- |
| \`rfl\` | reflexivity |

- parent
  - nested child

~~retired text~~

![A number line](images/number-line.svg)
`)

  assert.match(html, /<h2>Formatting<\/h2>/)
  assert.match(html, /class="katex"/)
  assert.match(html, /class="katex-display"/)
  assert.match(html, /<table>/)
  assert.match(html, /<ul>\s*<li>parent\s*<ul>\s*<li>nested child<\/li>/)
  assert.match(html, /<del>retired text<\/del>/)
  assert.match(
    html,
    /<img src="\/images\/number-line\.svg" alt="A number line" loading="lazy" decoding="async"\/>/,
  )
})

test('GameMarkdown sanitizes embedded HTML without stripping safe content', () => {
  const html = renderMarkdown(`
<table><tbody><tr><td>safe cell</td></tr></tbody></table>
<img src="images/raw.png" alt="Raw" width="320" onerror="alert(1)">
<a href="javascript:alert(2)">unsafe link</a>
<script>alert(3)</script>
`)

  assert.match(html, /<table><tbody><tr><td>safe cell<\/td><\/tr><\/tbody><\/table>/)
  const [rawImage] = html.match(/<img [^>]+>/) || []
  assert.match(rawImage, /src="\/images\/raw\.png"/)
  assert.match(rawImage, /alt="Raw"/)
  assert.match(rawImage, /width="320"/)
  assert.match(rawImage, /loading="lazy"/)
  assert.match(rawImage, /decoding="async"/)
  assert.match(html, /<a target="_blank" rel="noreferrer">unsafe link<\/a>/)
  assert.doesNotMatch(html, /onerror|javascript:|<script|alert\(/i)
})

test('GameMarkdown resolves game-scoped image assets and upstream real-number macros', () => {
  const html = renderMarkdown(
    String.raw`A map $f : \R \to \R$.

![Course image](images/Deriv.jpg)`,
    '/game-assets/real-analysis',
  )

  assert.doesNotMatch(html, /class="katex-error"/)
  assert.match(html, /mathbb/)
  assert.match(html, /src="\/game-assets\/real-analysis\/Deriv\.jpg"/)
})

test('every imported NNG prose formula renders without a KaTeX error', () => {
  const prose = [
    game.introduction,
    ...game.worlds.flatMap((world) => [
      world.introduction,
      ...world.levels.flatMap((level) => [
        level.introduction,
        level.statementText,
        ...level.hints,
        level.conclusion,
      ]),
    ]),
  ].filter(Boolean)
  let formulaCount = 0

  for (const markdown of prose) {
    const html = renderMarkdown(markdown)
    assert.doesNotMatch(
      html,
      /class="katex-error"/,
      `KaTeX rejected prose containing: ${markdown}`,
    )
    formulaCount += html.match(/class="katex"/g)?.length || 0
  }

  assert.ok(formulaCount > 130, `expected imported theorem statements, found ${formulaCount} formulas`)
})

test('every imported Real Analysis prose formula renders without a KaTeX error', () => {
  const prose = [
    realAnalysisGame.introduction,
    realAnalysisGame.information,
    ...realAnalysisGame.worlds.flatMap((world) => [
      world.introduction,
      ...world.levels.flatMap((level) => [
        level.introduction,
        level.statementText,
        ...level.hints,
        level.conclusion,
      ]),
    ]),
  ].filter(Boolean)
  let formulaCount = 0

  for (const markdown of prose) {
    const html = renderMarkdown(markdown, '/game-assets/real-analysis')
    assert.doesNotMatch(
      html,
      /class="katex-error"/,
      `KaTeX rejected Real Analysis prose containing: ${markdown}`,
    )
    formulaCount += html.match(/class="katex"/g)?.length || 0
  }

  assert.ok(formulaCount > 250, `expected a mathematics-heavy course, found ${formulaCount} formulas`)
})

test('every Mathlib-native Manifold Adventure lesson renders cleanly', () => {
  const prose = [
    manifoldGame.introduction,
    manifoldGame.information,
    ...manifoldGame.worlds.flatMap((world) => [
      world.introduction,
      ...world.levels.flatMap((level) => [
        level.introduction,
        ...level.hints,
        level.conclusion,
      ]),
    ]),
  ].filter(Boolean)
  let codeCount = 0
  let mathlibNameCount = 0

  for (const markdown of prose) {
    const html = renderMarkdown(markdown, '/game-assets/manifolds')
    assert.doesNotMatch(
      html,
      /class="katex-error"/,
      `KaTeX rejected Manifold Adventure prose containing: ${markdown}`,
    )
    codeCount += html.match(/<code>/g)?.length || 0
    mathlibNameCount += html.match(
      /(Homeomorph|OpenPartialHomeomorph|ChartedSpace|ModelWithCorners|IsManifold|TangentSpace|TangentBundle)/g,
    )?.length || 0
  }

  assert.ok(codeCount >= 75, `expected Lean-rich lessons, found ${codeCount} code spans`)
  assert.ok(
    mathlibNameCount >= 40,
    `expected repeated contact with Mathlib's structures, found ${mathlibNameCount} names`,
  )
})
