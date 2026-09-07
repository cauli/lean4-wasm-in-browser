#!/usr/bin/env node
// Record src/game/manifolds.conformance.json from the real browser kernel.
//
// Opens the course in headless Chromium against a running dev server, runs
// every reference solution through the same verifier the player uses, checks
// the empty live-goal preview and the two inventory rejections, and writes
// the record only if everything passes. This is the wasm-kernel counterpart
// of scripts/verify-manifold-references.mjs, for a machine without the
// native Mathlib checkout.
//
// Usage: node scripts/record-manifold-conformance-browser.mjs [base-url]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = process.argv[2] || 'http://127.0.0.1:5177'
const game = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/game/manifolds.generated.json'), 'utf8'))
const verifier = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/game/manifolds-verifier.generated.json'), 'utf8'))
const levels = game.worlds.flatMap((world) => world.levels)
const first = levels[0]

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (error) => console.error('page error:', error.message))
await page.goto(`${baseUrl}/games/manifold-adventure/charts/1?conformance=1`)
await page.waitForFunction(() => Boolean(window.__leanGameConformance?.runManifoldReferences))

const started = Date.now()
const results = await page.evaluate(() => window.__leanGameConformance.runManifoldReferences('regular'))
console.log(`reference matrix finished in ${Math.round((Date.now() - started) / 1000)}s`)
const failures = results.filter(({ result }) => !result.success)
for (const { id, result } of results) console.log(`${result.success ? '✓' : '✗'} ${id}${result.success ? '' : `: ${result.detail}`}`)

// Policy checks phrased like the native script's. The live goal preview is
// exercised with a partial proof, since the app refuses to send an empty one
// to Lean: the policy wrapper must leave the trace commands one open goal.
const previewLevel = levels.find((level) => level.id === 'localcharts-3')
const negative = await page.evaluate(async ([levelId, selfProof, previewId]) => {
  const api = window.__leanGameConformance
  const level = api.findManifoldLevel(levelId)
  const preview = await api.inspectManifoldGoals(api.findManifoldLevel(previewId), 'apply chart.map_source')
  const selfReference = await api.verifyManifoldProof(level, selfProof)
  const locked = await api.verifyManifoldProof(level, 'exact Continuous.comp continuous_id trailMap.continuous')
  return { preview, selfReference, locked }
}, [first.id, `exact ${first.theoremName} trailMap`, previewLevel.id])

const checks = [
  ['policy:partial-goal-preview', negative.preview.ok && negative.preview.goals === 1, JSON.stringify(negative.preview)],
  ['policy:self-reference', !negative.selfReference.success && /prove itself/i.test(negative.selfReference.detail), negative.selfReference.detail],
  ['policy:locked-declaration', !negative.locked.success && /not unlocked/i.test(negative.locked.detail), negative.locked.detail],
]
for (const [name, ok, detail] of checks) console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `: ${detail}`}`)
await browser.close()

if (failures.length > 0 || checks.some(([, ok]) => !ok)) {
  console.error(`${levels.length - failures.length}/${levels.length} reference solutions verified; not recording.`)
  process.exit(1)
}

const conformance = {
  sourceCommit: game.source.commit,
  leanCommit: verifier.leanCommit,
  leanUpstreamCommit: verifier.leanUpstreamCommit,
  mathlibCommit: verifier.mathlibCommit,
  testedAt: new Date().toISOString(),
  rules: 'regular',
  validation: {
    kind: 'pinned-mathlib-wasm-kernel',
    compilerCommit: verifier.leanCommit,
    targetBrowserLeanCommit: verifier.leanCommit,
    referenceModule: verifier.contextImports.join(' + '),
    semanticInventoryPolicy: true,
    policyImplementation: 'precompiled-course-module',
    goalPreviewCheck: 'partial-proof',
    negativePolicyChecks: [
      `${first.id} rejects a tactic outside the unlocked inventory`,
      `${first.id} rejects the reference theorem of the level itself`,
    ],
  },
  summary: { total: levels.length, kernel: levels.length, partial: 0 },
  verifiedReferenceSolutions: levels.map((level) => level.id),
}
fs.writeFileSync(
  path.join(repoRoot, 'src/game/manifolds.conformance.json'),
  `${JSON.stringify(conformance, null, 2)}\n`,
)
console.log(`Recorded ${levels.length}/${levels.length} for ${conformance.sourceCommit}`)
