#!/usr/bin/env node
// Compile every generated Manifold Adventure challenge, including its semantic
// unlock-policy wrapper, against the exact pinned Mathlib checkout.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mathlibRoot = path.resolve(process.env.MATHLIB_ROOT || '/tmp/manifold-mathlib4')
const courseLib = path.join(repoRoot, 'lean/.lake/build/lib/lean')
const verifierJson = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'src/game/manifolds-verifier.generated.json'),
  'utf8',
))

if (!fs.existsSync(path.join(mathlibRoot, 'lakefile.toml'))
    && !fs.existsSync(path.join(mathlibRoot, 'lakefile.lean'))) {
  throw new Error(`Mathlib checkout not found at ${mathlibRoot}`)
}
if (!fs.existsSync(path.join(courseLib, 'ManifoldAdventure/BrowserBase.olean'))) {
  throw new Error('Compile BrowserBase first with scripts/build-manifold-course.sh')
}

const bundled = await build({
  stdin: {
    contents: [
      "export * from './src/game/manifold-verification-source'",
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
const levels = game.worlds.flatMap((world) => world.levels)
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'manifold-references-'))
const leanPath = [
  courseLib,
  process.env.LEAN_PATH,
].filter(Boolean).join(path.delimiter)
const compilerResult = spawnSync(
  'lake',
  ['env', 'lean', '--githash'],
  { cwd: mathlibRoot, encoding: 'utf8', env: process.env },
)
const compilerCommit = compilerResult.stdout.trim()
// The WASM fork's native-i386 `lean --githash` currently prints the correct
// commit and then exits nonzero. Treat the hash itself as the contract; the CI
// package validation below still requires it to equal the exact browser pin.
if (!/^[0-9a-f]{40}$/i.test(compilerCommit)) {
  throw new Error([
    `Could not identify the native Lean compiler (exit ${compilerResult.status}).`,
    `stdout: ${compilerResult.stdout}`,
    `stderr: ${compilerResult.stderr}`,
  ].join('\n'))
}

function compileSource(filename, code) {
  const sourcePath = path.join(tempRoot, filename)
  fs.writeFileSync(sourcePath, code)
  return spawnSync(
    'lake',
    ['env', 'lean', sourcePath],
    {
      cwd: mathlibRoot,
      encoding: 'utf8',
      env: { ...process.env, LEAN_PATH: leanPath },
      maxBuffer: 16 * 1024 * 1024,
    },
  )
}

const passed = []
const failed = []

function nestedChallenge(namespace, code) {
  const lines = code.split('\n')
  if (!lines[0].startsWith('import ')) {
    throw new Error(`Challenge ${namespace} does not start with an import`)
  }
  return [
    'section',
    'open ManifoldAdventure',
    `namespace ${namespace}`,
    ...lines.slice(1),
    `end ${namespace}`,
    'end',
  ].join('\n')
}

try {
  const positiveSources = levels.map((level) => {
    const challenge = verification.buildManifoldChallengeSource(
      level,
      level.solution,
      true,
    )
    return nestedChallenge(`Reference_${level.id.replaceAll('-', '_')}`, challenge.code)
  })
  const positiveResult = compileSource('all-references.lean', [
    `import ${verifierJson.baseModule}`,
    ...positiveSources,
  ].join('\n\n'))
  if (positiveResult.status !== 0) {
    failed.push({
      id: 'reference-matrix',
      status: positiveResult.status,
      output: `${positiveResult.stdout}${positiveResult.stderr}`.trim(),
    })
    console.log('✗ reference-matrix')
  } else {
    passed.push(...levels.map((level) => level.id))
    for (const level of levels) console.log(`✓ ${level.id}`)
  }

  const first = levels[0]
  const negativeChecks = [
    {
      name: 'self-reference',
      proof: 'exact homeomorph_continuous e',
      message: 'prove itself',
    },
    {
      name: 'locked-declaration',
      proof: 'exact e.continuous_symm',
      message: 'not unlocked',
    },
  ]
  for (const check of negativeChecks) {
    const challenge = verification.buildManifoldChallengeSource(first, check.proof, true)
    const result = compileSource(`negative-${check.name}.lean`, challenge.code)
    const output = `${result.stdout}${result.stderr}`
    if (result.status === 0 || !output.includes(check.message)) {
      failed.push({
        id: `policy:${check.name}`,
        status: result.status,
        output: output.trim(),
      })
      console.log(`✗ policy:${check.name}`)
    } else {
      console.log(`✓ policy:${check.name}`)
    }
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true })
}

console.log(`\n${passed.length}/${levels.length} reference solutions verified`)
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2))
  process.exit(1)
}

const conformance = {
  sourceCommit: game.source.commit,
  leanCommit: verifierJson.leanCommit,
  leanUpstreamCommit: verifierJson.leanUpstreamCommit,
  mathlibCommit: verifierJson.mathlibCommit,
  testedAt: new Date().toISOString(),
  rules: 'regular',
  validation: {
    kind: 'pinned-mathlib-native-kernel',
    compilerCommit,
    targetBrowserLeanCommit: verifierJson.leanCommit,
    referenceModule: verifierJson.baseModule,
    semanticInventoryPolicy: true,
    negativePolicyChecks: ['self-reference', 'locked-declaration'],
  },
  summary: { total: levels.length, kernel: passed.length, partial: 0 },
  verifiedReferenceSolutions: passed,
}
fs.writeFileSync(
  path.join(repoRoot, 'src/game/manifolds.conformance.json'),
  `${JSON.stringify(conformance, null, 2)}\n`,
)
console.log('Updated src/game/manifolds.conformance.json')
