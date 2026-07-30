#!/usr/bin/env node

import fs from 'node:fs'

const gameOutputUrl = new URL('../src/game/manifolds.generated.json', import.meta.url)
const verifierOutputUrl = new URL('../src/game/manifolds-verifier.generated.json', import.meta.url)
const leanOutputUrl = new URL('../lean/ManifoldAdventure/BrowserBase.lean', import.meta.url)

const LEAN_COMMIT = '62b6a2291302d4bbeace37642a066b7510d0145c'
const LEAN_UPSTREAM_COMMIT = 'ecf55de08b9d855e749f80c491c6f294dd307e60'
const MATHLIB_COMMIT = 'de3a9cf33016bbb6d15880d7680643f7ca2d25ba'
const BASE_MODULE = 'ManifoldAdventure.BrowserBase'
const NAMESPACE = 'ManifoldAdventure'

function makeLevel(world, number, level) {
  return {
    id: `${world.toLowerCase()}-${number}`,
    world,
    number,
    title: level.title,
    introduction: level.introduction.trim(),
    conclusion: level.conclusion.trim(),
    statementText: level.statementText?.trim(),
    statement: `${level.theoremName} ${level.signature}`,
    theoremName: level.theoremName,
    declarationKind: level.declarationKind || 'theorem',
    solution: level.solution,
    hints: level.hints,
    newTactics: level.newTactics || [],
    hiddenTactics: [],
    newTheorems: level.newTheorems || [],
    newDefinitions: level.newDefinitions || [],
    disabledTactics: [],
    disabledTheorems: [],
    disabledDefinitions: [],
    sourcePath: `lean/ManifoldAdventure/BrowserBase.lean`,
    verification: 'kernel',
  }
}

function makeWorld(id, title, introduction, prerequisites, levels) {
  return {
    id,
    title,
    introduction: introduction.trim(),
    prerequisites,
    verification: 'kernel',
    levels: levels.map((level, index) => makeLevel(id, index + 1, level)),
  }
}

const game = {
  source: {
    repository: 'https://github.com/cauli/lean4-wasm-in-browser',
    commit: `mathlib-manifolds-${MATHLIB_COMMIT.slice(0, 10)}`,
    license: 'Apache-2.0 for Mathlib; original course text in this repository',
    toolchain: `cauli/lean4@${LEAN_COMMIT.slice(0, 10)} (upstream ${LEAN_UPSTREAM_COMMIT.slice(0, 10)})`,
    mathlibCommit: MATHLIB_COMMIT,
    importedAt: '2026-07-29T00:00:00.000Z',
  },
  title: 'The Manifold Adventure',
  introduction: `# The Manifold Adventure

Ada is an ant who can only inspect her world from the inside. Manifold theory works the same way: it studies a global space through local coordinate patches.

The course uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the first level. You begin with a [\`Homeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph), then work with [\`OpenPartialHomeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph), [\`ChartedSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace), [\`atlas\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas), [\`chartAt\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt), [\`ModelWithCorners\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners), [\`IsManifold\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold), [\`TangentSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace), and [\`TangentBundle\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle).`,
  information: `The formal source is \`lean/ManifoldAdventure/BrowserBase.lean\`. It imports \`Mathlib.Geometry.Manifold.IsManifold.Basic\` at pinned Mathlib commit \`${MATHLIB_COMMIT}\`.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.`,
  caption: 'A kernel-checked course on Mathlib homeomorphisms, local charts, atlases, smooth manifolds, products, and tangent bundles.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Homeomorphisms',
      'Homeomorphisms',
      `# Same topology, different labels

A Mathlib homeomorphism is a bundled structure. \`Homeomorph X Y\` contains an equivalence and continuity proofs for both directions.

In this world, you will read fields from that structure, use its inverse laws, and compose two homeomorphisms.`,
      [],
      [
        {
          title: 'Continuity is bundled',
          theoremName: 'homeomorph_continuous',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) : Continuous e`,
          introduction: `The notation \`X ≃ₜ Y\` means a homeomorphism from \`X\` to \`Y\`. The hypothesis \`e : X ≃ₜ Y\` already contains a proof that its forward function is continuous. Mathlib exposes the field as \`Homeomorph.continuous\`. With dot notation, it becomes \`e.continuous\`.

Use \`exact\` to give Lean that proof.`,
          conclusion: `The proof came directly from the continuity field of Mathlib's bundled \`Homeomorph\`.`,
          solution: 'exact e.continuous',
          hints: ['The homeomorphism `e` has a theorem named `e.continuous`.', 'Enter `exact e.continuous`.'],
          newTactics: ['exact'],
          newTheorems: ['Homeomorph.continuous'],
          newDefinitions: ['TopologicalSpace', 'Homeomorph', 'Continuous'],
        },
        {
          title: 'The inverse is continuous too',
          theoremName: 'homeomorph_inverse_continuous',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) : Continuous e.symm`,
          introduction: `A continuous bijection needs a continuous inverse to qualify as a homeomorphism. Mathlib records the inverse proof separately as \`Homeomorph.continuous_symm\`.

Here, Lean coerces the inverse homeomorphism \`e.symm\` to its underlying function.`,
          conclusion: `A homeomorphism carries continuity proofs in both directions.`,
          solution: 'exact e.continuous_symm',
          hints: ['Look for the inverse counterpart of `e.continuous`.', 'Use `exact e.continuous_symm`.'],
          newTheorems: ['Homeomorph.continuous_symm'],
          newDefinitions: ['Homeomorph.symm'],
        },
        {
          title: 'There and back',
          theoremName: 'homeomorph_round_trip',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) (x : X) : e.symm (e x) = x`,
          introduction: `A coordinate change needs a reliable round trip. The homeomorphism sends \`x\` to \`Y\`, and its inverse sends the result back to \`x\`.

The equivalence inside the homeomorphism supplies this inverse law as \`Homeomorph.symm_apply_apply\`.`,
          conclusion: `The round-trip equation says that changing coordinates and returning leaves the point unchanged.`,
          solution: 'exact e.symm_apply_apply x',
          hints: ['The theorem is unlocked as `Homeomorph.symm_apply_apply`.', 'With dot notation: `exact e.symm_apply_apply x`.'],
          newTheorems: ['Homeomorph.symm_apply_apply'],
          newDefinitions: ['Eq'],
        },
        {
          title: 'Compose coordinate changes',
          theoremName: 'homeomorph_composition_apply',
          signature: `{X : Type u} {Y : Type v} {Z : Type w}
    [TopologicalSpace X] [TopologicalSpace Y] [TopologicalSpace Z]
    (e : X ≃ₜ Y) (f : Y ≃ₜ Z) (x : X) : e.trans f x = f (e x)`,
          introduction: `Mathlib composes homeomorphisms with \`e.trans f\`: first \`e\`, then \`f\`. The theorem \`Homeomorph.trans_apply\` tells Lean how that bundled composition acts on a point.

Apply the named library theorem explicitly so that you can see which part of the API proves the equation.`,
          conclusion: `You can now use the continuity fields, inverse law, and composition rule for homeomorphisms.`,
          solution: 'exact Homeomorph.trans_apply e f x',
          hints: ['Use the fully qualified theorem name.', 'Enter `exact Homeomorph.trans_apply e f x`.'],
          newTheorems: ['Homeomorph.trans_apply'],
          newDefinitions: ['Homeomorph.trans'],
        },
      ],
    ),
    makeWorld(
      'LocalCharts',
      'Open partial homeomorphisms',
      `# A chart is partial

A globe cannot be flattened by one global homeomorphism. A chart instead maps an open patch of the manifold to an open patch of a model space.

Mathlib represents a chart as \`OpenPartialHomeomorph X Y\`. The structure has a \`source\`, a \`target\`, local continuity, and inverse laws. To use those laws, you must prove that the point lies in the relevant patch.`,
      ['Homeomorphisms'],
      [
        {
          title: 'The source is open',
          theoremName: 'local_chart_source_open',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) : IsOpen e.source`,
          introduction: `A local chart has an open domain. \`OpenPartialHomeomorph\` stores the proof as \`open_source : IsOpen e.source\`.

Read the goal first: Lean wants a proof that the source is open. The bundled chart already has a field of that type.`,
          conclusion: `The source of an open partial homeomorphism is an open set.`,
          solution: 'exact e.open_source',
          hints: ['The relevant structure projection is `e.open_source`.'],
          newTheorems: ['OpenPartialHomeomorph.open_source'],
          newDefinitions: ['OpenPartialHomeomorph', 'OpenPartialHomeomorph.source', 'IsOpen'],
        },
        {
          title: 'Continuity on the patch',
          theoremName: 'local_chart_continuous',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) : ContinuousOn e e.source`,
          introduction: `A partial chart only needs to be continuous on its source. Mathlib expresses that condition as \`ContinuousOn e e.source\`.

Project \`OpenPartialHomeomorph.continuousOn\` from \`e\`.`,
          conclusion: `The type records continuity on the chart domain rather than on the whole space.`,
          solution: 'exact e.continuousOn',
          hints: ['Use the theorem `e.continuousOn`.'],
          newTheorems: ['OpenPartialHomeomorph.continuousOn'],
          newDefinitions: ['ContinuousOn'],
        },
        {
          title: 'A source point reaches the target',
          theoremName: 'local_chart_maps_source',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) (x : X) (hx : x ∈ e.source) : e x ∈ e.target`,
          introduction: `Lean writes set membership as \`x ∈ s\`; type \`\\in\` to enter \`∈\`. It treats the chart as a total function, but its geometric guarantees require \`hx : x ∈ e.source\`.

Give that membership proof to \`OpenPartialHomeomorph.map_source\`.`,
          conclusion: `The source-membership hypothesis is what lets Mathlib conclude that \`e x\` lies in the target.`,
          solution: 'apply e.map_source\nexact hx',
          hints: ['Apply `e.map_source` first; its remaining input is the source-membership proof.', 'Then close the new goal with `exact hx`.'],
          newTactics: ['apply'],
          newTheorems: ['OpenPartialHomeomorph.map_source'],
          newDefinitions: ['OpenPartialHomeomorph.target', 'Membership.mem'],
        },
        {
          title: 'A local round trip',
          theoremName: 'local_chart_round_trip',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) (x : X) (hx : x ∈ e.source) : e.symm (e x) = x`,
          introduction: `The global round-trip theorem from world 1 had no side condition. For a partial homeomorphism, the inverse law only applies to points in the source, so it needs \`hx\`.

Use the local inverse law \`OpenPartialHomeomorph.left_inv\`.`,
          conclusion: `On its source, the chart followed by its inverse returns the original point.`,
          solution: 'exact e.left_inv hx',
          hints: ['Apply `e.left_inv` to the source-membership proof.'],
          newTheorems: ['OpenPartialHomeomorph.left_inv'],
          newDefinitions: ['OpenPartialHomeomorph.symm'],
        },
      ],
    ),
    makeWorld(
      'ChartedSpaces',
      'Charted spaces and atlases',
      `# Mathlib's chart data

\`ChartedSpace H M\` equips the topological space \`M\` with charts into the model space \`H\`. It contains an \`atlas H M\` and chooses a preferred \`chartAt H x\` at each point.

The class also stores two facts used throughout manifold proofs. Each point lies in the source of its preferred chart, and that chart belongs to the atlas.`,
      ['LocalCharts'],
      [
        {
          title: 'Every point has a chart',
          theoremName: 'point_mem_preferred_chart',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : x ∈ (chartAt H x).source`,
          introduction: `Mathlib guarantees that the chosen chart \`chartAt H x\` contains \`x\`. The public theorem for this fact is \`mem_chart_source H x\`.

The instance argument \`[ChartedSpace H M]\` supplies the atlas even though it does not appear as a named hypothesis.`,
          conclusion: `Every point lies in the source of the chart that \`ChartedSpace\` chooses for it.`,
          solution: 'exact mem_chart_source H x',
          hints: ['Use `mem_chart_source H x`.'],
          newTheorems: ['mem_chart_source'],
          newDefinitions: ['ChartedSpace', 'chartAt'],
        },
        {
          title: 'The chosen chart belongs to the atlas',
          theoremName: 'preferred_chart_mem_atlas',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : chartAt H x ∈ atlas H M`,
          introduction: `The preferred chart is part of the atlas. The theorem \`chart_mem_atlas H x\` proves that membership.

Later proofs use this theorem to apply compatibility results stated for atlas members.`,
          conclusion: `The selected chart at a point belongs to the space's atlas.`,
          solution: 'exact chart_mem_atlas H x',
          hints: ['The matching library theorem is `chart_mem_atlas`.'],
          newTheorems: ['chart_mem_atlas'],
          newDefinitions: ['atlas'],
        },
        {
          title: 'The point reaches coordinate space',
          theoremName: 'preferred_chart_maps_to_target',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : chartAt H x x ∈ (chartAt H x).target`,
          introduction: `Since \`x\` lies in the source of its preferred chart, its coordinate value \`chartAt H x x\` lies in that chart's target.

Mathlib packages the argument as \`mem_chart_target H x\`, so you do not need to apply \`map_source\` yourself.`,
          conclusion: `The preferred chart sends its chosen point into coordinate space.`,
          solution: 'exact mem_chart_target H x',
          hints: ['Use the newly introduced theorem `mem_chart_target H x`.'],
          newTheorems: ['mem_chart_target'],
        },
        {
          title: 'A chart source is a neighborhood',
          theoremName: 'preferred_chart_source_is_neighborhood',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : (chartAt H x).source ∈ 𝓝 x`,
          introduction: `An open set containing \`x\` is a neighborhood of \`x\`. Mathlib writes the neighborhood filter as \`𝓝 x\`; type \`\\nhds\` to enter \`𝓝\`.

\`chart_source_mem_nhds H x\` combines the openness of the chart source with \`mem_chart_source\`.`,
          conclusion: `In filter notation, the preferred chart is valid on a neighborhood of its point.`,
          solution: 'exact chart_source_mem_nhds H x',
          hints: ['Use `chart_source_mem_nhds H x`.'],
          newTheorems: ['chart_source_mem_nhds'],
          newDefinitions: ['Filter', 'nhds'],
        },
        {
          title: 'The preferred charts cover',
          theoremName: 'preferred_charts_cover',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] : (⋃ x : M, (chartAt H x).source) = (Set.univ : Set M)`,
          introduction: `The preferred chart sources cover \`M\`. Their union is the whole space.

Mathlib states the result with sets and an indexed union in \`iUnion_source_chartAt H M\`.`,
          conclusion: `The selected local coordinate patches cover the charted space.`,
          solution: 'exact iUnion_source_chartAt H M',
          hints: ['Apply `iUnion_source_chartAt H M`.'],
          newTheorems: ['iUnion_source_chartAt'],
          newDefinitions: ['Set.iUnion', 'Set.univ'],
        },
      ],
    ),
    makeWorld(
      'CanonicalCharts',
      'Identity and product charts',
      `# Instances build geometry for you

Mathlib supplies canonical \`ChartedSpace\` instances. Every topological space is charted over itself by the identity chart. Products of charted spaces are charted by products of their component charts.

In this world, the types in the goal determine which \`ChartedSpace\` instance Lean uses. The notation \`chartAt\` stays the same even when the underlying instance changes.`,
      ['ChartedSpaces'],
      [
        {
          title: 'A model charts itself by identity',
          theoremName: 'self_chart_is_identity',
          signature: `{H : Type u} [TopologicalSpace H] (x : H) :
    chartAt H x = OpenPartialHomeomorph.refl H`,
          introduction: `In the canonical \`ChartedSpace H H\` instance, the preferred chart is the identity open partial homeomorphism.

The Mathlib theorem \`chartAt_self_eq\` states this equality.`,
          conclusion: `A model space charts itself with one global identity chart.`,
          solution: 'exact chartAt_self_eq',
          hints: ['The theorem has all arguments implicit: `exact chartAt_self_eq`.'],
          newTheorems: ['chartAt_self_eq'],
          newDefinitions: ['OpenPartialHomeomorph.refl', 'chartedSpaceSelf'],
        },
        {
          title: 'Its atlas contains only identity',
          theoremName: 'self_atlas_only_identity',
          signature: `{H : Type u} [TopologicalSpace H] (e : OpenPartialHomeomorph H H) :
    e ∈ atlas H H ↔ e = OpenPartialHomeomorph.refl H`,
          introduction: `The self-charted atlas contains only the identity chart. Mathlib states membership in that atlas as an equivalence.

Split the \`↔\` with \`constructor\`, then use the forward and backward directions of \`chartedSpaceSelf_atlas\`.`,
          conclusion: `The canonical self-charted instance uses the identity both as its preferred chart and as the sole member of its atlas.`,
          solution: 'constructor\n· intro h\n  exact chartedSpaceSelf_atlas.mp h\n· intro h\n  exact chartedSpaceSelf_atlas.mpr h',
          hints: ['Use `constructor` to prove the two directions of the equivalence.', 'In each direction, introduce the hypothesis and use `.mp` or `.mpr` from `chartedSpaceSelf_atlas`.'],
          newTactics: ['constructor', 'intro'],
          newTheorems: ['chartedSpaceSelf_atlas'],
          newDefinitions: ['Iff'],
        },
        {
          title: 'A product chart is a product',
          theoremName: 'product_chart_is_product',
          signature: `{H : Type u} {H' : Type u'} {M : Type v} {M' : Type v'}
    [TopologicalSpace H] [TopologicalSpace H'] [TopologicalSpace M] [TopologicalSpace M']
    [ChartedSpace H M] [ChartedSpace H' M'] (x : M × M') :
    chartAt (ModelProd H H') x = (chartAt H x.1).prod (chartAt H' x.2)`,
          introduction: `A product manifold uses \`ModelProd H H'\` as its model. Its preferred chart pairs the preferred charts of the two factors.

\`prodChartedSpace_chartAt\` is the Mathlib theorem that unfolds this construction.`,
          conclusion: `The product chart applies the two component charts coordinate by coordinate.`,
          solution: 'rw [prodChartedSpace_chartAt]',
          hints: ['Rewrite the left-hand chart with `rw [prodChartedSpace_chartAt]`.'],
          newTactics: ['rw'],
          newTheorems: ['prodChartedSpace_chartAt'],
          newDefinitions: ['ModelProd', 'OpenPartialHomeomorph.prod', 'prodChartedSpace'],
        },
        {
          title: 'The product point is covered',
          theoremName: 'product_point_mem_chart_source',
          signature: `{H : Type u} {H' : Type u'} {M : Type v} {M' : Type v'}
    [TopologicalSpace H] [TopologicalSpace H'] [TopologicalSpace M] [TopologicalSpace M']
    [ChartedSpace H M] [ChartedSpace H' M'] (x : M) (y : M') :
    (x, y) ∈ (chartAt (ModelProd H H') (x, y)).source`,
          introduction: `The covering theorem \`mem_chart_source\` also applies to the product instance. Lean infers that instance from the model and manifold types in the goal.

Instantiate the theorem with \`ModelProd H H'\` and the pair \`(x, y)\`.`,
          conclusion: `The product \`ChartedSpace\` instance puts \`(x, y)\` in the source of its preferred chart.`,
          solution: 'simpa only using (mem_chart_source (ModelProd H H\') (x, y))',
          hints: ['Specialize the earlier theorem to the product model and pair.', 'Use `simpa only using (mem_chart_source (ModelProd H H\') (x, y))`.'],
          newTactics: ['simpa'],
        },
      ],
    ),
    makeWorld(
      'SmoothManifolds',
      'Smooth manifolds',
      `# From charts to compatible calculus

\`ChartedSpace\` supplies topological charts. Mathlib's \`IsManifold I n M\` adds the compatibility conditions needed for calculus on those charts.`,
      ['CanonicalCharts'],
      [
        {
          title: 'The model space is a manifold',
          theoremName: 'model_space_is_manifold',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H) (n : WithTop ℕ∞) :
    IsManifold I n H`,
          introduction: `The signature introduces a scalar field \`𝕜\`, a normed vector space \`E\`, and a model with corners \`I\`. For real manifolds, the scalar field is written \`ℝ\`. The order \`n : WithTop ℕ∞\` is a Lean value recording how many derivatives are available.

Every model with corners is a manifold at every differentiability order. Mathlib registers this fact as an instance, so \`infer_instance\` can synthesize the proof from the types.

This level uses the typeclass system to prove the goal.`,
          conclusion: `The model space carries the canonical manifold structure supplied by its model with corners.`,
          solution: 'infer_instance',
          hints: ['The result is a registered instance.', 'Use `infer_instance`.'],
          newTactics: ['infer_instance'],
          newTheorems: ['instIsManifoldModelSpace'],
          newDefinitions: ['ModelWithCorners', 'IsManifold', 'WithTop', 'ENat'],
        },
        {
          title: 'More smoothness implies less',
          theoremName: 'manifold_of_higher_smoothness',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] {I : ModelWithCorners 𝕜 E H}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {m n : WithTop ℕ∞} [IsManifold I n M] (hmn : m ≤ n) : IsManifold I m M`,
          introduction: `If every transition map is \`C^n\`, then it is \`C^m\` whenever \`m ≤ n\`.

Mathlib calls this theorem \`IsManifold.of_le\`. Supply \`hmn\`; Lean finds the existing \`IsManifold I n M\` instance automatically.`,
          conclusion: `The inequality \`m ≤ n\` lets you lower the differentiability order of a manifold instance.`,
          solution: 'exact IsManifold.of_le hmn',
          hints: ['Apply `IsManifold.of_le` to `hmn`.'],
          newTheorems: ['IsManifold.of_le'],
          newDefinitions: ['LE.le'],
        },
        {
          title: 'Smooth implies topological',
          theoremName: 'smooth_manifold_is_topological',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] {I : ModelWithCorners 𝕜 E H}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    [IsManifold I ∞ M] : IsManifold I 0 M`,
          introduction: `The order \`∞\` in \`IsManifold I ∞ M\` means smooth: transition maps have derivatives of every finite order. A smooth manifold is also a topological manifold relative to the same model with corners.

Mathlib has an instance for this step in the smoothness hierarchy. Let \`infer_instance\` find it.`,
          conclusion: `Lean derives the \`C^0\` manifold instance from the \`C^∞\` instance.`,
          solution: 'infer_instance',
          hints: ['This implication is registered with typeclass inference.', 'Use `infer_instance`.'],
        },
        {
          title: 'Products preserve manifolds',
          theoremName: 'product_of_manifolds',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {E' : Type v'} [NormedAddCommGroup E'] [NormedSpace 𝕜 E']
    {H : Type w} [TopologicalSpace H] {H' : Type*} [TopologicalSpace H']
    {I : ModelWithCorners 𝕜 E H} {I' : ModelWithCorners 𝕜 E' H'}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {M' : Type*} [TopologicalSpace M'] [ChartedSpace H' M']
    (n : WithTop ℕ∞) [IsManifold I n M] [IsManifold I' n M'] :
    IsManifold (I.prod I') n (M × M')`,
          introduction: `The product of two \`C^n\` manifolds is again a \`C^n\` manifold. Mathlib combines the product chart instance from the last world with the product model with corners and the required compatibility proof.

The instance is named \`IsManifold.prod\`. Apply it to the two manifold types.`,
          conclusion: `Once the circle instances are available, this construction also handles a torus presented as a product of two circles.`,
          solution: 'exact IsManifold.prod M M\'',
          hints: ['The product instance takes the two manifold types explicitly.', 'Use `exact IsManifold.prod M M\'`.'],
          newTheorems: ['IsManifold.prod'],
          newDefinitions: ['ModelWithCorners.prod', 'Prod'],
        },
      ],
    ),
    makeWorld(
      'TangentSpaces',
      'Tangent spaces and the tangent bundle',
      `# Dependent geometry

For a manifold modelled on a normed vector space \`E\`, Mathlib defines \`TangentSpace I x\` at each point \`x\`. The total tangent bundle \`TangentBundle I M\` is a dependent pair containing a base point and a tangent vector in that point's fiber.

The earlier worlds mostly proved propositions about structures. This one asks you to construct values of dependent types.`,
      ['SmoothManifolds'],
      [
        {
          title: 'The zero tangent vector',
          theoremName: 'tangent_zero',
          declarationKind: 'noncomputable def',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M] (x : M) : TangentSpace I x`,
          introduction: `Every tangent space inherits an additive commutative group structure from the model vector space, so it has a zero vector.

The expected type tells Lean which \`0\` you mean. Supply it with \`exact 0\`.`,
          conclusion: `The result is a value of Mathlib's \`TangentSpace I x\`: its zero vector.`,
          solution: 'exact 0',
          hints: ['The tangent space has a zero instance.', 'Enter `exact 0`.'],
          newDefinitions: ['TangentSpace', 'Zero.zero'],
        },
        {
          title: 'Package a tangent vector',
          theoremName: 'tangent_vector_as_bundle_point',
          declarationKind: 'def',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {x : M} (v : TangentSpace I x) : TangentBundle I M`,
          introduction: `A point of the tangent bundle is a dependent pair \`⟨x, v⟩\`. The fiber type of \`v\` depends on the base point \`x\`.

Lean knows \`x\` implicitly from the type of \`v\`, so construct the pair directly.`,
          conclusion: `An element of the tangent bundle carries its base point together with a tangent vector at that point.`,
          solution: 'exact ⟨x, v⟩',
          hints: ['Construct the dependent pair `⟨x, v⟩`.'],
          newDefinitions: ['TangentBundle', 'Bundle.TotalSpace', 'Sigma'],
        },
        {
          title: 'Project the base point',
          theoremName: 'tangent_bundle_base',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {x : M} (v : TangentSpace I x) : (⟨x, v⟩ : TangentBundle I M).1 = x`,
          introduction: `The first projection of \`⟨x, v⟩\` computes to \`x\`. Definitional reduction proves the equality, so \`rfl\` closes the goal.

\`rfl\` is working here because of the dependent bundle's representation.`,
          conclusion: `The bundle projection reduces directly to its stored base point.`,
          solution: 'rfl',
          hints: ['The first projection reduces to `x`.', 'Use `rfl`.'],
          newTactics: ['rfl'],
          newDefinitions: ['Sigma.fst'],
        },
        {
          title: 'A zero section, point by point',
          theoremName: 'tangent_bundle_has_zero',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M] (x : M) :
    ∃ p : TangentBundle I M, p.1 = x`,
          introduction: `Construct a tangent-bundle point over an arbitrary base point. Use the course theorem \`tangent_zero I x\`, package that vector with \`x\`, and prove that the first projection is \`x\`.

This gives a pointwise form of the tangent bundle's zero section.`,
          conclusion: `The course ends with a dependent tangent-bundle value built from the zero vector at an arbitrary point.`,
          solution: 'refine ⟨⟨x, tangent_zero I x⟩, ?_⟩\nrfl',
          hints: ['Use `refine` with the witness `⟨x, tangent_zero I x⟩` and leave its base equation as `?_`.', 'The remaining projection equation is `rfl`.'],
          newTactics: ['refine'],
          newDefinitions: ['Exists'],
        },
      ],
    ),
  ],
}

const levels = game.worlds.flatMap((world) => world.levels)
const verifier = {
  baseModule: BASE_MODULE,
  leanCommit: LEAN_COMMIT,
  leanUpstreamCommit: LEAN_UPSTREAM_COMMIT,
  mathlibCommit: MATHLIB_COMMIT,
  levels: Object.fromEntries(levels.map((level) => [
    level.id,
    {
      sourcePath: level.sourcePath,
      fullModule: BASE_MODULE,
      contextModule: BASE_MODULE,
      namespaces: [NAMESPACE],
      openCommands: [
        'open scoped Topology ContDiff',
        'open Filter ENat',
      ],
      declaration: level.statement,
      declarationKind: level.declarationKind,
      referenceTheorem: `${NAMESPACE}.${level.theoremName}`,
    },
  ])),
}

const leanHeader = `module

public import Mathlib.Geometry.Manifold.IsManifold.Basic

@[expose] public section

/-!
# Manifold Adventure: browser theorem base

Generated by \`scripts/create-manifold-game.mjs\`.

Exercise declarations live in \`ManifoldAdventure\`; the mathematical
structures and library theorems they use come directly from pinned Mathlib.
-/

namespace ${NAMESPACE}

universe u v w u' v'

open scoped Topology ContDiff
open Filter ENat
`

const leanDeclarations = levels.map((level) => {
  const body = level.solution.split('\n').map((line) => `  ${line}`).join('\n')
  return `${level.declarationKind} ${level.statement} := by\n${body}`
}).join('\n\n')

const leanSource = `${leanHeader}\n${leanDeclarations}\n\nend ${NAMESPACE}\n`

fs.mkdirSync(new URL('.', leanOutputUrl), { recursive: true })
fs.writeFileSync(gameOutputUrl, `${JSON.stringify(game, null, 2)}\n`)
fs.writeFileSync(verifierOutputUrl, `${JSON.stringify(verifier, null, 2)}\n`)
fs.writeFileSync(leanOutputUrl, leanSource)

console.log(`Generated ${game.worlds.length} worlds and ${levels.length} Mathlib-backed levels.`)
console.log(`Lean: ${leanOutputUrl.pathname}`)
console.log(`Game: ${gameOutputUrl.pathname}`)
console.log(`Verifier: ${verifierOutputUrl.pathname}`)
