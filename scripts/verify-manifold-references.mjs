#!/usr/bin/env node
// Verify every Manifold Adventure reference solution against the real Lean
// kernel, headless (same binary and challenge builder the browser uses), and
// rewrite src/game/manifolds.conformance.json from the results.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { bootLean } from '../tests/lean-node.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Bundle the exact browser verifier plus the enriched game data: the policy
// resolves inventories through level.gameId, which only the enriched game has.
const bundled = await build({
  stdin: {
    contents: [
      "export * from './src/game/verification-source'",
      "export { manifoldGame } from './src/game/game-data'",
    ].join('\n'),
    resolveDir: repoRoot,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  write: false,
  logLevel: 'silent',
})
const verification = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
)
const game = verification.manifoldGame

const pub = path.join(repoRoot, 'public/lean-wasm')
const root = process.env.LEAN_ROOT
  || path.dirname(path.dirname(fs.realpathSync(path.join(pub, 'lean.js'))))
const wasmPath = process.env.LEAN_WASM || fs.realpathSync(path.join(pub, 'lean.wasm'))

const levels = game.worlds.flatMap((world) => world.levels)
console.log(`Booting Lean (one-time Init import)...`)
const lean = await bootLean({ root, wasmPath })

const passed = []
const failed = []
for (const level of levels) {
  const policy = verification.checkProofPolicy(level, level.solution, { enforceInventory: true })
  if (!policy.ok) {
    failed.push({ id: level.id, stage: 'policy', messages: policy.messages })
    console.log(`✗ ${level.id} [policy] ${policy.messages.join(' | ')}`)
    continue
  }
  const challenge = verification.buildChallengeSource(level, level.solution, { enforceInventory: true })
  const { tag, diagnostics } = lean.compile(challenge.code, `${level.id}.lean`)
  const errors = diagnostics.filter((d) => d.severity === 'error')
  if (tag !== 0 || errors.length > 0) {
    failed.push({ id: level.id, stage: 'kernel', tag, errors: errors.map((e) => e.data || e.caption) })
    console.log(`✗ ${level.id} [kernel] tag=${tag}\n  ${errors.map((e) => e.data || e.caption).join('\n  ')}`)
  } else {
    passed.push(level.id)
    console.log(`✓ ${level.id}`)
  }
}

console.log(`\n${passed.length}/${levels.length} reference solutions verified`)
if (failed.length > 0) {
  console.log(JSON.stringify(failed, null, 2))
  process.exit(1)
}

const conformance = {
  sourceCommit: game.source.commit,
  leanCommit: JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'src/game/manifolds.conformance.json'), 'utf8',
  )).leanCommit,
  testedAt: new Date().toISOString(),
  rules: 'regular',
  summary: { total: levels.length, kernel: passed.length, partial: 0 },
  verifiedReferenceSolutions: passed,
}
fs.writeFileSync(
  path.join(repoRoot, 'src/game/manifolds.conformance.json'),
  `${JSON.stringify(conformance, null, 2)}\n`,
)
console.log('Updated src/game/manifolds.conformance.json')
