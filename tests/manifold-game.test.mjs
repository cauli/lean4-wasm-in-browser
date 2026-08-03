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

test('the Mathlib-native Manifold Adventure has a core path and optional branches', () => {
  assert.equal(game.title, 'The Manifold Adventure')
  assert.deepEqual(
    game.worlds.map((world) => [world.id, world.levels.length]),
    [
      ['Homeomorphisms', 4],
      ['LocalCharts', 5],
      ['ChartedSpaces', 5],
      ['CanonicalCharts', 5],
      ['SmoothManifolds', 5],
      ['TangentSpaces', 3],
      ['MapProjections', 5],
      ['CircleMotion', 4],
      ['RobotArm', 4],
      ['RobotReachability', 4],
    ],
  )
  assert.equal(levels.length, 44)
  assert.equal(new Set(levels.map((level) => level.id)).size, 44)
  assert.deepEqual(game.worlds[0].prerequisites, [])

  for (let index = 1; index < 6; index += 1) {
    assert.deepEqual(
      game.worlds[index].prerequisites,
      [game.worlds[index - 1].id],
      `${game.worlds[index].id} should follow the previous world`,
    )
  }
  assert.deepEqual(game.worlds[6].prerequisites, ['LocalCharts'])
  assert.deepEqual(game.worlds[7].prerequisites, ['SmoothManifolds'])
  assert.deepEqual(game.worlds[8].prerequisites, ['CircleMotion'])
  assert.deepEqual(game.worlds[9].prerequisites, ['RobotArm'])
  assert.ok(game.worlds.slice(6).every((world) => world.optional))
  assert.ok(game.worlds.every((world) => world.mapPosition))
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
  assert.match(statements, /\[ChartedSpace Coordinates Surface\]/)
  assert.match(statements, /\(velocity : TangentSpace model place\)/)

  assert.doesNotMatch(
    statements,
    /[{(]\s*(?:X|Y|Z|H|H'|M|M'|E|E'|I|I'|x|y|e|f|v|m|n|𝕜)\s*:/,
  )
  const afterWorldOne = game.worlds.slice(1).flatMap((world) => world.levels)
    .map((level) => level.statement).join('\n')
  assert.doesNotMatch(afterWorldOne, /\[\s*[a-z][A-Za-z0-9_]*\s*:/)
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
      'The leaf reads back into the patch',
      'A leaf for where she stands',
      'This leaf is in the atlas',
      'Her place lands on the leaf',
      'The map works nearby',
      'No place left uncovered',
      'The reference grid stays put',
      'The identity is filed in the atlas',
      'Only the identity is filed there',
      'Two readings at once',
      'The paired chart contains her place',
      'Two leaves in conversation',
      'The reference leaf is ready',
      'Passing an easier check',
      'The smooth atlas passes the basic check',
      'Two circles make a torus',
      'Ada stands still',
      'Read the location tag',
      'Standing still anywhere',
      'The pole stays off the leaf',
      'The far pole lands in the middle',
      'Every mark has a place on the bead',
      'Off the pole, onto the leaf',
      'The second leaf covers the hole',
      'No turn leaves the pointer home',
      'Two turns compose',
      'One full turn changes nothing',
      'The pointer turns smoothly',
      'Find the tip of the arm',
      'Both bars point forward',
      'A full shoulder turn reaches the same point',
      'The arm moves without a jump',
      'The arm has an outer limit',
      'The folded arm leaves a gap',
      'Every pose stays in the ring',
      'Outside the ring is out of reach',
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
    assert.ok(paragraphs.length >= 2, `${level.id} needs story and technical paragraphs`)
    assert.match(paragraphs[0], /\bAda\b/, `${level.id} does not begin with Ada`)
    assert.match(
      paragraphs.slice(1).join('\n\n'),
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
      /\b(?:apply|constructor|exact|infer_instance|intro|refine|rfl|rw|simp|simpa|unfold)\b/,
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

  for (const level of levels) {
    assert.equal(level.hints.length, 3, `${level.id} does not have three staged hints`)
    assert.match(level.hints[2], /^\*\(hidden\)\*/, `${level.id} exposes its solution hint`)
  }
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
  const introducedTactics = [...new Set(levels.flatMap((level) => [
    ...level.newTactics,
    ...(level.completionTactics || []),
  ]))]
  assert.deepEqual(introducedTactics, [
    'exact',
    'apply',
    'constructor',
    '·',
    'rw',
    'simpa',
    'simp',
    'infer_instance',
    'intro',
    'rfl',
    'refine',
    'ext',
    'by_cases',
    'left',
    'right',
    'unfold',
    'fun_prop',
    'calc',
    'have',
    'obtain',
    'rcases',
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
    'OpenPartialHomeomorph.map_target',
    'OpenPartialHomeomorph.right_inv',
    'mem_chart_source',
    'chart_mem_atlas',
    'mem_chart_target',
    'chart_source_mem_nhds',
    'iUnion_source_chartAt',
    'chartAt_self_eq',
    'chartedSpaceSelf_atlas',
    'prodChartedSpace_chartAt',
    'OpenPartialHomeomorph.trans_source',
    'OpenPartialHomeomorph.symm_source',
    'instIsManifoldModelSpace',
    'IsManifold.of_le',
    'IsManifold.prod',
    'stereographic_source',
    'stereographic_apply_neg',
    'norm_eq_of_mem_sphere',
    'surjective_stereographic',
    'Set.mem_compl_iff',
    'Set.mem_singleton_iff',
    'Set.mem_union',
    'Set.mem_univ',
    'iff_true',
    'Eq.symm',
    'Eq.trans',
    'Circle.exp_zero',
    'Circle.exp_add',
    'Circle.exp_add_two_pi',
    'contMDiff_circleExp',
    'continuous_const',
    'continuous_subtype_val',
    'continuous_fst',
    'continuous_snd',
    'Continuous.comp',
    'Continuous.mul',
    'Continuous.add',
    'norm_add_le',
    'Circle.norm_coe',
    'norm_sub_norm_le',
    'abs_sub_le_iff',
    'not_lt_of_ge',
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
    'Circle',
    'Complex',
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

  const tangentFinal = levels.find((level) => level.theoremName === 'tangent_bundle_has_zero')
  assert.match(tangentFinal.solution, /\btangent_zero model place\b/)
  const robotFinal = levels.find((level) => level.theoremName === 'robot_arm_tip_continuous')
  assert.equal(robotFinal.theoremName, 'robot_arm_tip_continuous')
  assert.match(robotFinal.solution, /continuous_subtype_val/)
  assert.deepEqual(robotFinal.completionTactics, ['fun_prop'])
  assert.doesNotMatch(robotFinal.newTactics.join(' '), /fun_prop/)

  const reachabilityFinal = levels.at(-1)
  assert.equal(reachabilityFinal.theoremName, 'robot_target_outside_annulus_unreachable')
  assert.match(reachabilityFinal.solution, /robot_tip_norm_(?:ge|le)/)
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
  for (const world of game.worlds) {
    const moduleName = verifier.levels[world.levels[0].id].contextModule
    for (const prerequisite of world.prerequisites) {
      assert.match(
        worldSources.get(moduleName),
        new RegExp(`public import ManifoldAdventure\\.${prerequisite}`),
        `${moduleName} must retain declarations unlocked in ${prerequisite}`,
      )
    }
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

test('exact conformance covers every level in the current course revision', () => {
  assert.equal(conformance.sourceCommit, game.source.commit)
  assert.equal(conformance.leanCommit, verifier.leanCommit)
  assert.equal(conformance.leanUpstreamCommit, verifier.leanUpstreamCommit)
  assert.equal(conformance.mathlibCommit, verifier.mathlibCommit)
  assert.equal(conformance.validation.compilerCommit, verifier.leanCommit)
  assert.equal(conformance.validation.targetBrowserLeanCommit, verifier.leanCommit)
  const verified = new Set(conformance.verifiedReferenceSolutions)
  assert.equal(conformance.summary.total, verified.size)
  assert.equal(conformance.summary.kernel, verified.size)
  assert.equal(conformance.summary.partial, 0)
  assert.equal(verified.size, levels.length)
  assert.ok(levels.every((level) => verified.has(level.id)))

  const gameData = fs.readFileSync(new URL('../src/game/game-data.ts', import.meta.url), 'utf8')
  assert.match(gameData, /manifoldConformanceMatchesSource/)
  assert.match(gameData, /manifoldConformanceMatchesSource\s*\?\s*manifoldConformance\.verifiedReferenceSolutions\s*:\s*\[\]/s)
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
    'robot-arm.glb',
  ]
  for (const model of expected) {
    assert.ok(models.has(model), `missing 3D model ${model}`)
  }
})
