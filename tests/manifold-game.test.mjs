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
      ['Charts', 4],
      ['Sphere', 5],
      ['ChartedSpaces', 5],
      ['SmoothManifolds', 5],
      ['TangentSpaces', 5],
      ['CanonicalCharts', 5],
      ['SmoothOrders', 3],
      ['CircleMotion', 5],
      ['RobotArm', 4],
      ['RobotReachability', 4],
    ],
  )
  assert.equal(levels.length, 45)
  assert.equal(new Set(levels.map((level) => level.id)).size, 45)
  assert.deepEqual(game.worlds[0].prerequisites, [])

  // Game worlds pick levels from several Lean modules but keep each level's
  // Lean-side id, so conformance records and player progress stay valid.
  assert.deepEqual(
    game.worlds.slice(0, 5).map((world) => world.levels.map((level) => level.id)),
    [
      ['homeomorphisms-1', 'localcharts-3', 'localcharts-4', 'localcharts-5'],
      ['mapprojections-1', 'mapprojections-2', 'mapprojections-4', 'course-1', 'mapprojections-5'],
      ['chartedspaces-1', 'chartedspaces-3', 'chartedspaces-5', 'course-2', 'course-3'],
      ['smoothmanifolds-1', 'course-4', 'course-5', 'course-6', 'smoothmanifolds-5'],
      ['tangentspaces-1', 'tangentspaces-2', 'course-7', 'course-8', 'course-9'],
    ],
  )

  for (let index = 1; index < 5; index += 1) {
    assert.deepEqual(
      game.worlds[index].prerequisites,
      [game.worlds[index - 1].id],
      `${game.worlds[index].id} should follow the previous world`,
    )
  }
  assert.deepEqual(game.worlds[5].prerequisites, ['ChartedSpaces'])
  assert.deepEqual(game.worlds[6].prerequisites, ['SmoothManifolds'])
  assert.deepEqual(game.worlds[7].prerequisites, ['SmoothManifolds'])
  assert.deepEqual(game.worlds[8].prerequisites, ['CircleMotion'])
  assert.deepEqual(game.worlds[9].prerequisites, ['RobotArm'])
  assert.ok(game.worlds.slice(0, 5).every((world) => !world.optional))
  assert.ok(game.worlds.slice(5).every((world) => world.optional))
  assert.ok(game.worlds.every((world) => world.mapPosition))
})

test('the main path meets the sphere before the general vocabulary', () => {
  const mainPath = game.worlds.slice(0, 5).flatMap((world) => world.levels)
  const firstSphere = mainPath.findIndex((level) => /stereographic/.test(level.statement))
  const firstAtlas = mainPath.findIndex((level) => /\bChartedSpace\b/.test(level.statement))
  const firstSmooth = mainPath.findIndex((level) => /\bIsManifold\b/.test(level.statement))
  const firstTangent = mainPath.findIndex((level) => /\bmfderiv\b|\bTangentSpace\b/.test(level.statement))
  assert.ok(firstSphere > 0 && firstSphere < firstAtlas, 'the sphere must come before charted spaces')
  assert.ok(firstAtlas < firstSmooth && firstSmooth < firstTangent)

  // The heart of the subject: transition maps are stated in general, spelled
  // out as differentiability, and checked on the sphere.
  const byTheorem = Object.fromEntries(mainPath.map((level) => [level.theoremName, level]))
  assert.match(byTheorem.chart_change_is_smooth.statement, /≫ₕ .* ∈ contDiffGroupoid/)
  assert.match(byTheorem.chart_change_contDiffOn.statement, /ContDiffOn Scalar order/)
  assert.match(byTheorem.sphere_chart_change_smooth.statement, /stereographic' dimension pole/)
  assert.match(byTheorem.tangent_plane_is_orthogonal.statement, /ᗮ$/)
  assert.match(byTheorem.tangent_vectors_are_vectors.statement, /Function\.Injective/)

  // No main-path level is solved by asking Lean to look up an instance.
  for (const level of mainPath) {
    assert.doesNotMatch(level.solution, /infer_instance/, `${level.id} teaches nothing`)
  }

  // Concept checks sit before the key proofs and never leak a tactic.
  const prompted = mainPath.filter((level) => level.question)
  assert.ok(prompted.length >= 6, 'the main path needs think-first prompts')
  for (const level of levels) {
    if (!level.question) continue
    assert.match(level.question.prompt, /\?$/, `${level.id} prompt is not a question`)
    assert.ok(level.question.answer.length > 20, `${level.id} answer is too thin`)
    assert.doesNotMatch(
      `${level.question.prompt} ${level.question.answer}`,
      /\b(?:exact|apply|intro|rw|simp|rfl|constructor|by_cases)\b/,
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
  for (const name of ['atlas', 'IsManifold', 'TangentSpace']) {
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
    game.worlds.slice(0, 5).flatMap((world) => world.levels.map((level) => level.title)),
    [
      'The drawing matches the trail',
      'Her mark lands in the drawing',
      'Back to the same spot',
      'The leaf reads back into the patch',
      'The pole stays off the leaf',
      'The far pole lands in the middle',
      'Off the pole, onto the leaf',
      'One of the two leaves shows her place',
      'The second leaf covers the hole',
      'A leaf for where she stands',
      'Her place lands on the leaf',
      'No place left uncovered',
      'The preferred leaf comes from the far pole',
      'Every projection is filed in the atlas',
      'Two leaves in conversation',
      'Changing leaves is a smooth move',
      'The smooth move, spelled out in calculus',
      'Two drawings of the bead agree smoothly',
      'Two circles make a torus',
      'Ada stands still',
      'Read the location tag',
      'Leaving the bead for the room around it',
      'Her velocities are real vectors',
      'The tangent plane stands square to the radius',
    ],
  )
  for (const level of levels) {
    assert.doesNotMatch(level.title, /\b(lemma|theorem|instance|tactic)\b/i, `${level.id} title is a Lean label`)
  }
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

  const worlds = Object.fromEntries(game.worlds.map((world) => [world.id, world]))
  assert.doesNotMatch(byTheorem.point_mem_preferred_chart.introduction, /compatible leaves/)
  assert.match(byTheorem.point_mem_preferred_chart.introduction, /Smooth compatibility.*comes later/)
  assert.match(byTheorem.point_mem_preferred_chart.introduction, /is a collection of sets/)
  assert.match(byTheorem.point_mem_preferred_chart.introduction, /contains an open set around/)
  assert.match(byTheorem.preferred_chart_maps_to_target.introduction, /\(chartAt Coordinates place\) place/)
  assert.match(byTheorem.smooth_manifold_is_topological.introduction, /not the dimension/)
  assert.match(byTheorem.tangent_zero.introduction, /does not yet define the zero section as a function/)
  // The three words that stop newcomers get a plain reading where they first appear.
  assert.match(worlds.SmoothManifolds.introduction, /read it as `ℝ`/)
  assert.match(worlds.SmoothManifolds.introduction, /corners only matter for manifolds with boundary/)
  assert.match(worlds.SmoothManifolds.introduction, /how many derivatives are required/)
  assert.match(byTheorem.sphere_preferred_chart.introduction, /`dimension`-dimensional/)
  assert.match(byTheorem.same_point_iff_full_turns.introduction, /local chart rather than a global one/)
  assert.match(worlds.Charts.introduction, /Glossary for this course/)
})

test('the unlock ladder exposes real Mathlib declarations and Lean tactics', () => {
  const mainPath = game.worlds.slice(0, 5).flatMap((world) => world.levels)
  const introducedTactics = [...new Set(mainPath.flatMap((level) => [
    ...level.newTactics,
    ...(level.completionTactics || []),
  ]))]
  assert.deepEqual(introducedTactics, [
    'exact',
    'apply',
    'constructor',
    '·',
    'simp',
    'by_cases',
    'left',
    'right',
    'intro',
    'ext',
    'rfl',
    'rw',
    'have',
  ])
  const optionalTactics = [...new Set(game.worlds.slice(5).flatMap((world) => world.levels).flatMap((level) => [
    ...level.newTactics,
    ...(level.completionTactics || []),
  ]))]
  assert.deepEqual(optionalTactics, [
    'rw',
    'simpa',
    'simp',
    'infer_instance',
    'intro',
    'unfold',
    'fun_prop',
    'calc',
    'have',
    'obtain',
    'rcases',
  ])

  const introducedTheorems = mainPath.flatMap((level) => level.newTheorems)
  const expectedTheorems = [
    // The opening level grants its cut siblings' lemmas as inventory asides.
    'Homeomorph.continuous',
    'Homeomorph.continuous_symm',
    'Homeomorph.symm_apply_apply',
    'Homeomorph.trans_apply',
    'OpenPartialHomeomorph.map_source',
    'OpenPartialHomeomorph.open_source',
    'OpenPartialHomeomorph.continuousOn',
    'OpenPartialHomeomorph.left_inv',
    'OpenPartialHomeomorph.map_target',
    'OpenPartialHomeomorph.right_inv',
    'stereographic_source',
    'surjective_stereographic',
    'stereographic_apply_neg',
    'norm_eq_of_mem_sphere',
    'Set.mem_compl_iff',
    'Set.mem_singleton_iff',
    'Eq.symm',
    'Eq.trans',
    'Set.mem_union',
    'Set.mem_univ',
    'iff_true',
    'mem_chart_source',
    'chart_mem_atlas',
    'chart_source_mem_nhds',
    'mem_chart_target',
    'iUnion_source_chartAt',
    'OpenPartialHomeomorph.trans_source',
    'OpenPartialHomeomorph.symm_source',
    'instIsManifoldModelSpace',
    'HasGroupoid.compatible',
    'mem_groupoid_of_pregroupoid',
    'IsManifold.prod',
    'contMDiff_coe_sphere',
    'mfderiv_coe_sphere_injective',
    'range_mfderiv_coe_sphere',
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
    'contDiffGroupoid',
    'ContMDiff',
    'mfderiv',
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

  const sphereTransition = levels.find((level) => level.theoremName === 'sphere_chart_change_smooth')
  assert.match(sphereTransition.solution, /\bsphere_chart_in_atlas pole\b/)
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
  // One Lean module per original world plus the r5 Course module; game
  // worlds pick across them.
  assert.equal(contextModules.length, 11)
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
  // Every level compiles against the single Course header, which imports the
  // leaves of the earlier module graph, so every module's declarations stay
  // citable from every level.
  assert.deepEqual(verifier.contextImports, ['ManifoldAdventure.Course'])
  const courseSource = worldSources.get('ManifoldAdventure.Course')
  for (const moduleName of contextModules) {
    if (moduleName === 'ManifoldAdventure.Course') continue
    const reachable = new Set()
    const visit = (name) => {
      if (reachable.has(name)) return
      reachable.add(name)
      for (const match of worldSources.get(name).matchAll(/^public import (ManifoldAdventure\.\w+)$/gm)) {
        if (worldSources.has(match[1])) visit(match[1])
      }
    }
    visit('ManifoldAdventure.Course')
    assert.ok(reachable.has(moduleName), `${moduleName} is not reachable from the Course header`)
  }
  assert.match(courseSource, /^public import ManifoldAdventure\.MapProjections$/m)
  // The ten earlier modules keep every declaration compiled into the deployed
  // layers (44); the Course module adds the ten r5 levels.
  assert.equal(
    [...allSources.matchAll(/^(?:theorem|(?:noncomputable )?def) /gm)].length,
    54,
  )
  assert.equal([...courseSource.matchAll(/^theorem /gm)].length, 10)
  assert.equal(levels.length, 45)
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
