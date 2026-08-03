import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'

// Bundle the parser the same way the conformance harness bundles app modules.
const bundled = await build({
  stdin: {
    contents: "export * from './src/game/live-goals'",
    resolveDir: new URL('..', import.meta.url).pathname,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  write: false,
  logLevel: 'silent',
})
const { liveGoalsFromDiagnostics } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
)

const MARKER = '__LEAN4GAME_LIVE_GOAL_7D4B2A__'

// Verbatim diagnostic stream captured from the deployed 62b6a22913 binary for
// localcharts-3 with the partial proof `apply chart.map_source`: the binary
// reports trace messages with kind `[anonymous]`, which the old kind gate
// rejected, previewing every partial proof as "No goals remain".
const capturedDiagnostics = [
  { severity: 'information', kind: '[anonymous]', message: MARKER },
  {
    severity: 'information',
    kind: '[anonymous]',
    message: [
      'Stone : Type u',
      'Drawing : Type v',
      'inst✝¹ : TopologicalSpace Stone',
      'inst✝ : TopologicalSpace Drawing',
      'chart : OpenPartialHomeomorph Stone Drawing',
      'place : Stone',
      'inPatch : place ∈ chart.source',
      '⊢ place ∈ chart.source',
    ].join('\n'),
  },
  {
    severity: 'warning',
    kind: 'linter.unusedVariables',
    message: 'Variable name `inPatch` is not explicitly referenced.',
  },
  {
    severity: 'warning',
    kind: 'linter.unusedTactic',
    message: `'all_goals\n  trace "${MARKER}"\n  trace_state' tactic does nothing`,
  },
]

test('an open goal survives the deployed binary’s [anonymous] trace kind', () => {
  const goals = liveGoalsFromDiagnostics(capturedDiagnostics, MARKER)
  assert.equal(goals.length, 1)
  assert.match(goals[0], /⊢ place ∈ chart.source/)
})

test('newer binaries that tag traces still parse', () => {
  const tagged = capturedDiagnostics.map((diagnostic) => (
    diagnostic.severity === 'information' ? { ...diagnostic, kind: 'trace' } : diagnostic
  ))
  const goals = liveGoalsFromDiagnostics(tagged, MARKER)
  assert.equal(goals.length, 1)
})

test('a linter warning quoting the marker never arms the parser', () => {
  const goals = liveGoalsFromDiagnostics([capturedDiagnostics[3], capturedDiagnostics[1]], MARKER)
  assert.equal(goals.length, 0)
})

test('a solved proof yields no goals', () => {
  const goals = liveGoalsFromDiagnostics([
    { severity: 'warning', kind: 'linter.unusedTactic', message: 'does nothing' },
  ], MARKER)
  assert.equal(goals.length, 0)
})

test('case-split states produce one goal per case', () => {
  const goals = liveGoalsFromDiagnostics([
    { severity: 'information', kind: '[anonymous]', message: MARKER },
    {
      severity: 'information',
      kind: '[anonymous]',
      message: 'case inl\nh : p\n⊢ q\n\ncase inr\nh : r\n⊢ s',
    },
  ], MARKER)
  assert.equal(goals.length, 2)
})
