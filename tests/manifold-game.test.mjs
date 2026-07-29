import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const game = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds.generated.json', import.meta.url),
  'utf8',
))
const verifier = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds-verifier.generated.json', import.meta.url),
  'utf8',
))
const conformance = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds.conformance.json', import.meta.url),
  'utf8',
))
const browserBase = fs.readFileSync(
  new URL('../lean/ManifoldAdventure/BrowserBase.lean', import.meta.url),
  'utf8',
)

const levels = game.worlds.flatMap((world) => world.levels)

test('the Mathlib-native Manifold Adventure is a complete linear path', () => {
  assert.equal(game.title, 'The Manifold Adventure')
  assert.deepEqual(
    game.worlds.map((world) => [world.id, world.levels.length]),
    [
      ['Homeomorphisms', 4],
      ['LocalCharts', 4],
      ['ChartedSpaces', 5],
      ['CanonicalCharts', 4],
      ['SmoothManifolds', 4],
      ['TangentSpaces', 4],
    ],
  )
  assert.equal(levels.length, 25)
  assert.equal(new Set(levels.map((level) => level.id)).size, 25)
  assert.deepEqual(game.worlds[0].prerequisites, [])

  for (let index = 1; index < game.worlds.length; index += 1) {
    assert.deepEqual(
      game.worlds[index].prerequisites,
      [game.worlds[index - 1].id],
      `${game.worlds[index].id} should follow the previous world`,
    )
  }
})

test('the goals use actual Mathlib manifold structures instead of local stand-ins', () => {
  const statements = levels.map((level) => level.statement).join('\n')
  const requiredStructures = [
    ['Homeomorph', /≃ₜ/],
    ['OpenPartialHomeomorph', /\bOpenPartialHomeomorph\b/],
    ['ChartedSpace', /\bChartedSpace\b/],
    ['atlas', /\batlas\b/],
    ['chartAt', /\bchartAt\b/],
    ['ModelWithCorners', /\bModelWithCorners\b/],
    ['IsManifold', /\bIsManifold\b/],
    ['TangentSpace', /\bTangentSpace\b/],
    ['TangentBundle', /\bTangentBundle\b/],
  ]

  for (const [name, pattern] of requiredStructures) {
    assert.match(statements, pattern, `${name} never appears in a goal`)
  }
  assert.match(game.introduction, /Mathlib's real manifold API/)
  assert.match(game.introduction, /Mathlib declarations/)
  assert.match(game.introduction, /your course declarations/)
  assert.doesNotMatch(statements, /\b(manifoldLike|chartCompatible|smoothLike)\b/i)
})

test('the unlock ladder exposes real Mathlib declarations and Lean tactics', () => {
  const introducedTactics = [...new Set(levels.flatMap((level) => level.newTactics))]
  assert.deepEqual(introducedTactics, [
    'exact',
    'apply',
    'constructor',
    'intro',
    'rw',
    'simpa',
    'infer_instance',
    'rfl',
    'refine',
  ])

  const introducedTheorems = levels.flatMap((level) => level.newTheorems)
  const expectedTheorems = [
    'Homeomorph.continuous',
    'Homeomorph.continuous_symm',
    'Homeomorph.symm_apply_apply',
    'Homeomorph.trans_apply',
    'OpenPartialHomeomorph.open_source',
    'OpenPartialHomeomorph.continuousOn',
    'OpenPartialHomeomorph.map_source',
    'OpenPartialHomeomorph.left_inv',
    'mem_chart_source',
    'chart_mem_atlas',
    'mem_chart_target',
    'chart_source_mem_nhds',
    'iUnion_source_chartAt',
    'chartAt_self_eq',
    'chartedSpaceSelf_atlas',
    'prodChartedSpace_chartAt',
    'instIsManifoldModelSpace',
    'IsManifold.of_le',
    'IsManifold.prod',
  ]
  assert.deepEqual(introducedTheorems, expectedTheorems)

  const introducedDefinitions = new Set(levels.flatMap((level) => level.newDefinitions))
  for (const name of [
    'TopologicalSpace',
    'Homeomorph',
    'OpenPartialHomeomorph',
    'ChartedSpace',
    'ModelWithCorners',
    'IsManifold',
    'TangentSpace',
    'TangentBundle',
  ]) {
    assert.ok(introducedDefinitions.has(name), `${name} is not unlocked explicitly`)
  }
})

test('each level creates a reusable course declaration without placeholders', () => {
  for (const level of levels) {
    assert.equal(level.verification, 'kernel', `${level.id} support changed`)
    assert.ok(level.statement.startsWith(`${level.theoremName} `), `${level.id} lost its theorem name`)
    assert.ok(level.solution.trim(), `${level.id} has no solution`)
    assert.doesNotMatch(level.solution, /\b(sorry|admit|unsafe)\b/, `${level.id} uses a placeholder`)
  }

  const finalLevel = levels.at(-1)
  assert.equal(finalLevel.theoremName, 'tangent_bundle_has_zero')
  assert.match(finalLevel.solution, /\btangent_zero I x\b/)
})

test('the generated verifier maps every challenge to the pinned browser module', () => {
  assert.equal(verifier.baseModule, 'ManifoldAdventure.BrowserBase')
  assert.equal(game.source.mathlibCommit, verifier.mathlibCommit)
  assert.equal(verifier.leanCommit, '62b6a2291302d4bbeace37642a066b7510d0145c')
  assert.equal(verifier.leanUpstreamCommit, 'ecf55de08b9d855e749f80c491c6f294dd307e60')
  assert.deepEqual(new Set(Object.keys(verifier.levels)), new Set(levels.map((level) => level.id)))

  for (const level of levels) {
    const metadata = verifier.levels[level.id]
    assert.equal(metadata.declaration, level.statement)
    assert.equal(metadata.fullModule, verifier.baseModule)
    assert.equal(metadata.contextModule, verifier.baseModule)
    assert.deepEqual(metadata.namespaces, ['ManifoldAdventure'])
    assert.equal(metadata.referenceTheorem, `ManifoldAdventure.${level.theoremName}`)
  }
})

test('one generated Lean module is the source of truth for all reference proofs', () => {
  assert.match(browserBase, /public import Mathlib\.Geometry\.Manifold\.IsManifold\.Basic/)
  assert.match(browserBase, /namespace ManifoldAdventure/)
  assert.equal(
    [...browserBase.matchAll(/^(?:theorem|(?:noncomputable )?def) /gm)].length,
    levels.length,
  )
  assert.equal([...browserBase.matchAll(/^(?:noncomputable )?def /gm)].length, 2)
  assert.doesNotMatch(browserBase, /\b(sorry|admit|axiom|unsafe)\b/)

  for (const level of levels) {
    assert.match(
      browserBase,
      new RegExp(`^${level.declarationKind} ${level.theoremName}\\b`, 'm'),
    )
    for (const line of level.solution.split('\n')) {
      assert.ok(browserBase.includes(`  ${line}`), `${level.id} reference proof drifted`)
    }
  }
})

test('the conformance record covers all pinned reference solutions', () => {
  assert.equal(conformance.sourceCommit, game.source.commit)
  assert.equal(conformance.leanCommit, verifier.leanCommit)
  assert.equal(conformance.leanUpstreamCommit, verifier.leanUpstreamCommit)
  assert.equal(conformance.mathlibCommit, verifier.mathlibCommit)
  assert.equal(conformance.summary.total, levels.length)
  assert.equal(conformance.summary.kernel, levels.length)
  assert.equal(conformance.summary.partial, 0)
  assert.deepEqual(
    new Set(conformance.verifiedReferenceSolutions),
    new Set(levels.map((level) => level.id)),
  )
})

test('all Blender-built GLB models used by the 3D scenes are bundled', () => {
  const modelDirectory = new URL('../public/game-assets/manifolds/models/', import.meta.url)
  const models = new Set(fs.readdirSync(modelDirectory))
  const expected = [
    'sphere-charts.glb',
    'torus-loops.glb',
    'mobius-band.glb',
    'trefoil-circle.glb',
    'sphere-triangle.glb',
    'figure-eight.glb',
    'tangent-plane.glb',
  ]
  for (const model of expected) {
    assert.ok(models.has(model), `missing 3D model ${model}`)
  }
})
