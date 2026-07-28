import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const game = JSON.parse(fs.readFileSync(
  new URL('../src/game/nng4.generated.json', import.meta.url),
  'utf8',
))
const conformance = JSON.parse(fs.readFileSync(
  new URL('../src/game/nng4.conformance.json', import.meta.url),
  'utf8',
))
const realAnalysisGame = JSON.parse(fs.readFileSync(
  new URL('../src/game/real-analysis.generated.json', import.meta.url),
  'utf8',
))
const realAnalysisVerifier = JSON.parse(fs.readFileSync(
  new URL('../src/game/real-analysis-verifier.generated.json', import.meta.url),
  'utf8',
))
const realAnalysisConformance = JSON.parse(fs.readFileSync(
  new URL('../src/game/real-analysis.conformance.json', import.meta.url),
  'utf8',
))

test('all imported NNG4 levels include a clean reference solution', () => {
  const levels = game.worlds.flatMap((world) => world.levels)
  assert.equal(levels.length, 79)

  for (const level of levels) {
    assert.ok(level.solution.trim(), `${level.id} has no reference solution`)
    assert.doesNotMatch(
      level.solution,
      /^\s*(Hint|Branch)\b|\b(sorry|admit)\b/m,
      `${level.id} still contains a game-only command or placeholder`,
    )
  }
})

test('NNG4 imports the upstream prose attached to theorem statements', () => {
  const levels = game.worlds.flatMap((world) => world.levels)
  const statements = levels.filter((level) => level.statementText)
  const rewriteLevel = levels.find((level) => level.id === 'tutorial-2')

  assert.equal(statements.length, 69)
  assert.equal(
    rewriteLevel.statementText,
    'If $x$ and $y$ are natural numbers, and $y = x + 7$, then $2y = 2(x + 7)$.',
  )
})

test('the NNG4 reference-solution matrix covers the imported snapshot', () => {
  const levels = game.worlds.flatMap((world) => world.levels)
  const ids = new Set(levels.map((level) => level.id))
  const verified = new Set(conformance.verifiedReferenceSolutions)

  assert.equal(conformance.sourceCommit, game.source.commit)
  assert.equal(conformance.summary.total, levels.length)
  assert.equal(conformance.summary.kernel, verified.size)
  assert.equal(conformance.summary.partial, levels.length - verified.size)
  for (const id of verified) assert.ok(ids.has(id), `matrix contains unknown level ${id}`)
})

test('hidden NNG4 tactics are imported without exposing them as visible unlocks', () => {
  const levels = game.worlds.flatMap((world) => world.levels)
  const hidden = new Map(
    levels
      .filter((level) => level.hiddenTactics?.length)
      .map((level) => [level.id, level.hiddenTactics]),
  )

  assert.deepEqual(hidden.get('tutorial-2'), ['repeat', 'nth_rewrite'])
  assert.deepEqual(hidden.get('algorithm-7'), ['contrapose!'])
  assert.deepEqual(hidden.get('power-10'), ['xyzzy'])
  assert.equal(hidden.size, 3)
})

test('the full Real Analysis Game snapshot is imported with its dependency tree', () => {
  const levels = realAnalysisGame.worlds.flatMap((world) => world.levels)
  const dependencyCount = realAnalysisGame.worlds.reduce(
    (total, world) => total + world.prerequisites.length,
    0,
  )

  assert.equal(realAnalysisGame.title, 'Real Analysis, The Game')
  assert.equal(realAnalysisGame.source.repository, 'https://github.com/alexkontorovich/realanalysisgame')
  assert.equal(realAnalysisGame.source.commit, '930c38333b2edcc3ad27c5f68b9f09210cfaaf62')
  assert.equal(realAnalysisGame.source.license, 'Apache-2.0')
  assert.equal(realAnalysisGame.source.toolchain, 'leanprover/lean4:v4.26.0')
  assert.equal(realAnalysisGame.worlds.length, 44)
  assert.equal(levels.length, 139)
  // Includes Lean4Game MakeGame's inventory-inferred dependencies in addition
  // to the 42 hand-written Dependency commands.
  assert.equal(dependencyCount, 61)
  assert.equal(new Set(levels.map((level) => level.id)).size, levels.length)

  for (const level of levels) {
    assert.ok(level.statement.trim(), `${level.id} has no statement`)
    assert.ok(level.solution.trim(), `${level.id} has no reference solution text`)
    assert.equal(level.verification, 'blocked')
  }
})

test('every Real Analysis level has generated verifier metadata and a shared browser base', () => {
  const levels = realAnalysisGame.worlds.flatMap((world) => world.levels)
  const metadata = realAnalysisVerifier.levels
  const contexts = new Set(Object.values(metadata).map((level) => level.contextModule))

  assert.equal(realAnalysisVerifier.source.commit, realAnalysisGame.source.commit)
  assert.equal(realAnalysisVerifier.baseModule, 'RealAnalysisGame.BrowserBase')
  assert.deepEqual(Object.keys(metadata).sort(), levels.map((level) => level.id).sort())
  assert.equal(contexts.size, levels.length)
  for (const level of levels) {
    assert.equal(metadata[level.id].sourcePath, level.sourcePath)
    assert.equal(metadata[level.id].declaration, level.statement)
    assert.match(metadata[level.id].contextModule, /^RealAnalysisGame\.Context\./)
  }
})

test('the Real Analysis browser matrix covers every reference answer exactly', () => {
  const levels = realAnalysisGame.worlds.flatMap((world) => world.levels)
  const ids = levels.map((level) => level.id)
  const reportedIds = realAnalysisConformance.results.map((result) => result.id)

  assert.equal(realAnalysisConformance.total, 139)
  assert.equal(realAnalysisConformance.passed, 125)
  assert.equal(realAnalysisConformance.failed, 14)
  assert.deepEqual(reportedIds, ids)
  assert.deepEqual(
    realAnalysisConformance.failedReferenceSolutions.map((result) => result.id),
    [
      'lecture10-1',
      'lecture19-3',
      'lecture19-4',
      'l22pset-2',
      'l22pset-3',
      'lecture23-1',
      'lecture23-2',
      'lecture23-3',
      'lecture24-3',
      'lecture24-4',
      'l24pset-1',
      'l24pset-2',
      'lecture25-1',
      'lecture25-2',
    ],
  )
})

test('Real Analysis verifier preserves active open commands and clean proof boundaries', () => {
  const levels = realAnalysisGame.worlds.flatMap((world) => world.levels)
  const byId = new Map(levels.map((level) => [level.id, level]))

  assert.deepEqual(realAnalysisVerifier.levels['lecture9-1'].openCommands, ['open Finset'])
  assert.deepEqual(
    realAnalysisVerifier.levels['lecture24-5'].openCommands,
    ['open Set', 'open Classical'],
  )
  for (const level of levels) {
    assert.doesNotMatch(level.solution, /^end RealAnalysisGame$/m, `${level.id} leaks a namespace close`)
  }
  assert.deepEqual(
    levels.filter((level) => /\bsorry\b/.test(level.solution)).map((level) => level.id),
    [
      'lecture19-4',
      'l22pset-2',
      'l22pset-3',
      'lecture23-1',
      'lecture23-2',
      'lecture23-3',
      'lecture24-3',
      'lecture24-4',
      'lecture25-1',
      'lecture25-2',
    ],
  )
  assert.ok(byId.get('lecture4-1').newTactics.includes('congr'))
  assert.ok(byId.get('lecture4-1').newTactics.includes('ring'))
  assert.ok(byId.get('lecture4-1').newTheorems.includes('pow_succ'))
  assert.ok(byId.get('lecture15-1').newTactics.includes('norm_cast'))
  assert.deepEqual(
    byId.get('realanalysisstory-1').hiddenTactics,
    ['Type', 'match', 'exfalso'],
  )
  assert.ok(byId.get('l18pset-6').newTheorems.includes('even_two_mul'))
  assert.ok(byId.get('l24pset-2').newTheorems.includes('isOpen_Ioo'))
})

test('Real Analysis course images referenced by the imported game are bundled locally', () => {
  const imageDirectory = new URL('../public/game-assets/real-analysis/', import.meta.url)
  const images = new Set(fs.readdirSync(imageDirectory))

  assert.ok(images.has('cover.png'))
  assert.ok(images.has('Deriv.jpg'))
  assert.ok(images.has('Integral.jpg'))
  assert.ok(images.has('People.jpg'))
  assert.equal(images.size, 19)
})
