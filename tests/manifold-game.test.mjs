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
const browserPolicy = fs.readFileSync(
  new URL('../lean/ManifoldAdventure/BrowserPolicy.lean', import.meta.url),
  'utf8',
)

const levels = game.worlds.flatMap((world) => world.levels)
const statements = levels.map((level) => level.statement).join('\n')

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
  assert.match(
    game.introduction,
    /\[Mathlib's manifold API\]\(https:\/\/leanprover-community\.github\.io\/mathlib4_docs\//,
  )
  for (const name of requiredStructures.map(([structure]) => structure)) {
    assert.ok(
      game.introduction.includes(
        `[\`${name}\`](https://leanprover-community.github.io/mathlib4_docs/`,
      ),
      `${name} is not linked to its Mathlib documentation`,
    )
  }
  assert.doesNotMatch(game.introduction, /Your inventory will contain names from two sources/)
  assert.doesNotMatch(game.introduction, /Reading the notation/)
  assert.doesNotMatch(statements, /\b(manifoldLike|chartCompatible|smoothLike)\b/i)
})

test('formal goal objects use the names introduced by Ada\'s story', () => {
  assert.match(statements, /\{Trail : Type u\}/)
  assert.match(statements, /\{Drawing : Type v\}/)
  assert.match(statements, /\(trailMap : Trail ≃ₜ Drawing\)/)
  assert.match(statements, /\(chart : OpenPartialHomeomorph Stone Drawing\)/)
  assert.match(statements, /\(place : Stone\)/)
  assert.match(statements, /\[surfaceCharts : ChartedSpace Coordinates Surface\]/)
  assert.match(statements, /\(velocity : TangentSpace model place\)/)

  assert.doesNotMatch(
    statements,
    /[{(]\s*(?:X|Y|Z|H|H'|M|M'|E|E'|I|I'|x|y|e|f|v|m|n|𝕜)\s*:/,
  )
  assert.doesNotMatch(
    statements,
    /\[\s*(?:TopologicalSpace|ChartedSpace|IsManifold|NormedAddCommGroup|NormedSpace|NontriviallyNormedField)\b/,
  )
})

test('level titles describe moments in Ada\'s story', () => {
  assert.deepEqual(
    levels.map((level) => level.title),
    [
      'The drawing matches the trail',
      'The drawing leads Ada back',
      'Back where she started',
      'Into the route book',
      'Room around every place',
      'No jumps inside the patch',
      'Her mark lands in the drawing',
      'Back to the same spot',
      'A leaf for where she stands',
      'This leaf is in the atlas',
      'Her place lands on the leaf',
      'The map works nearby',
      'No place left uncovered',
      'The reference grid stays put',
      'One map in the reference atlas',
      'Two readings at once',
      'The paired chart contains her place',
      'The reference leaf is ready',
      'Passing an easier check',
      'The smooth atlas passes the basic check',
      'Two circles make a torus',
      'Ada stands still',
      'Place and velocity together',
      'Read the location tag',
      'Standing still anywhere',
    ],
  )
})

test('every lesson moves from Ada to Mathlib, with its objective beside the formal goal', () => {
  for (const world of game.worlds) {
    assert.match(world.introduction, /\bAda\b/, `${world.id} has no story context`)
    assert.match(
      world.introduction,
      /\]\(https:\/\/leanprover-community\.github\.io\/mathlib4_docs\//,
      `${world.id} does not connect its story to Mathlib`,
    )
  }

  for (const level of levels) {
    const paragraphs = level.introduction.split(/\n\n+/)
    assert.equal(paragraphs.length, 2, `${level.id} does not have two lesson paragraphs`)
    assert.match(paragraphs[0], /\bAda\b/, `${level.id} does not begin with Ada`)
    assert.match(
      paragraphs[1],
      /\]\(https:\/\/leanprover-community\.github\.io\/mathlib4_docs\//,
      `${level.id} does not link its technical concept to Mathlib`,
    )
    assert.match(
      level.statementText,
      /^\*\*Objective:\*\*/,
      `${level.id} has no separate human-readable objective`,
    )
    assert.doesNotMatch(
      level.statementText,
      /\b(?:apply|constructor|exact|infer_instance|refine|rfl|rw|simpa)\b/,
      `${level.id} objective gives away a Lean tactic`,
    )
    assert.doesNotMatch(
      level.introduction,
      /\*\*Objective:\*\*/,
      `${level.id} duplicates its objective in the lesson prose`,
    )
  }

  const courseProse = [
    game.introduction,
    game.information,
    game.caption,
    ...game.worlds.flatMap((world) => [
      world.introduction,
      ...world.levels.flatMap((level) => [
        level.introduction,
        level.statementText,
        level.conclusion,
        ...level.hints,
      ]),
    ]),
  ].join('\n')

  assert.doesNotMatch(courseProse, /[—–]/)
})

test('the course explains the main undergraduate notation traps', () => {
  const byTheorem = Object.fromEntries(levels.map((level) => [level.theoremName, level]))

  assert.doesNotMatch(byTheorem.point_mem_preferred_chart.introduction, /compatible leaves/)
  assert.match(byTheorem.point_mem_preferred_chart.introduction, /Smooth compatibility.*comes later/)
  assert.match(byTheorem.preferred_chart_maps_to_target.introduction, /\(chartAt Coordinates place\) place/)
  assert.match(byTheorem.preferred_chart_source_is_neighborhood.introduction, /filter is a collection of sets/)
  assert.match(byTheorem.preferred_chart_source_is_neighborhood.introduction, /contains an open set around/)
  assert.match(byTheorem.smooth_manifold_is_topological.introduction, /not the dimension/)
  assert.match(byTheorem.tangent_bundle_has_zero.introduction, /does not yet define the zero section as a function/)
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
  assert.match(finalLevel.solution, /\btangent_zero model place\b/)
})

test('the generated verifier maps every challenge to its narrow world module', () => {
  assert.equal(verifier.baseModule, 'ManifoldAdventure.BrowserBase')
  assert.equal(game.source.mathlibCommit, verifier.mathlibCommit)
  assert.equal(verifier.leanCommit, '62b6a2291302d4bbeace37642a066b7510d0145c')
  assert.equal(verifier.leanUpstreamCommit, 'ecf55de08b9d855e749f80c491c6f294dd307e60')
  assert.deepEqual(new Set(Object.keys(verifier.levels)), new Set(levels.map((level) => level.id)))

  for (const level of levels) {
    const metadata = verifier.levels[level.id]
    assert.equal(metadata.declaration, level.statement)
    assert.equal(metadata.fullModule, metadata.contextModule)
    assert.equal(
      metadata.sourcePath,
      `lean/${metadata.contextModule.replaceAll('.', '/')}.lean`,
    )
    assert.deepEqual(metadata.namespaces, ['ManifoldAdventure'])
    assert.equal(metadata.referenceTheorem, `ManifoldAdventure.${level.theoremName}`)
  }
})

test('generated world modules are the source of truth for all reference proofs', () => {
  const contextModules = [...new Set(
    levels.map((level) => verifier.levels[level.id].contextModule),
  )]
  assert.equal(contextModules.length, game.worlds.length)
  for (const moduleName of contextModules) {
    assert.match(browserBase, new RegExp(`public import ${moduleName.replaceAll('.', '\\.')}`))
  }

  const worldSources = new Map(contextModules.map((moduleName) => [
    moduleName,
    fs.readFileSync(
      new URL(`../lean/${moduleName.replaceAll('.', '/')}.lean`, import.meta.url),
      'utf8',
    ),
  ]))
  const allSources = [...worldSources.values()].join('\n')
  for (const source of worldSources.values()) {
    assert.match(source, /public import ManifoldAdventure\.BrowserPolicy/)
  }
  assert.match(browserPolicy, /syntax \(name := manifoldBrowserUser\)/)
  assert.match(browserPolicy, /private meta partial def checkInventory/)
  assert.match(browserPolicy, /Lean\.Elab\.Tactic\.evalTactic tactics/)
  for (let index = 1; index < contextModules.length; index += 1) {
    assert.match(
      worldSources.get(contextModules[index]),
      new RegExp(`public import ${contextModules[index - 1].replaceAll('.', '\\.')}`),
      `${contextModules[index]} must retain declarations unlocked in the previous world`,
    )
  }
  assert.equal(
    [...allSources.matchAll(/^(?:theorem|(?:noncomputable )?def) /gm)].length,
    levels.length,
  )
  assert.equal([...allSources.matchAll(/^(?:noncomputable )?def /gm)].length, 2)
  assert.doesNotMatch(allSources, /\b(sorry|admit|axiom|unsafe)\b/)

  for (const level of levels) {
    const source = worldSources.get(verifier.levels[level.id].contextModule)
    assert.match(
      source,
      new RegExp(`^${level.declarationKind} ${level.theoremName}\\b`, 'm'),
    )
    for (const line of level.solution.split('\n')) {
      assert.ok(source.includes(`  ${line}`), `${level.id} reference proof drifted`)
    }
  }
})

test('the conformance record covers all pinned reference solutions', () => {
  assert.equal(conformance.sourceCommit, game.source.commit)
  assert.equal(conformance.leanCommit, verifier.leanCommit)
  assert.equal(conformance.leanUpstreamCommit, verifier.leanUpstreamCommit)
  assert.equal(conformance.mathlibCommit, verifier.mathlibCommit)
  assert.equal(conformance.validation.compilerCommit, verifier.leanCommit)
  assert.equal(conformance.validation.targetBrowserLeanCommit, verifier.leanCommit)
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
