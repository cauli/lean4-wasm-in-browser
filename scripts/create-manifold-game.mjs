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
  introduction: `# Learn the structures Lean geometers actually use

Ada is an ant who can only inspect her world from the inside. That is exactly the point of manifold theory: global spaces are understood through local coordinate patches.

This version of the course works directly with **Mathlib's real manifold API**. The first goal already contains a \`Homeomorph\`; later worlds use \`OpenPartialHomeomorph\`, \`ChartedSpace\`, \`atlas\`, \`chartAt\`, \`ModelWithCorners\`, \`IsManifold\`, \`TangentSpace\`, and \`TangentBundle\`.

There are two kinds of names in your inventory:

- Names such as \`Homeomorph.continuous\` and \`mem_chart_source\` are **Mathlib declarations**. The course unlocks them when their mathematical meaning has been introduced.
- Names such as \`homeomorph_continuous\` and \`tangent_zero\` are **your course declarations**, defined in the \`ManifoldAdventure\` namespace. Propositions become theorems; constructed mathematical values become definitions. Both are reusable in later levels.

Every reference solution is compiled against pinned Mathlib source and checked by Lean's kernel. There are no course axioms, \`sorry\` declarations, or toy stand-ins for the manifold structures.

## Reading the notation

- \`X ≃ₜ Y\` is Mathlib notation for a homeomorphism.
- \`x ∈ s\` is typed with \`\\in\`.
- \`𝓝 x\` is the neighborhood filter at \`x\`; type \`\\nhds\`.
- \`ℝ\`, \`∞\`, and \`ℕ∞\` are Lean objects, not prose abbreviations.

Start with **Homeomorphisms**. The difficulty rises from field projection and theorem application to typeclass-driven constructions and dependent pairs.`,
  information: `The formal source is \`lean/ManifoldAdventure/BrowserBase.lean\`. It imports \`Mathlib.Geometry.Manifold.IsManifold.Basic\` at pinned Mathlib commit \`${MATHLIB_COMMIT}\`.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.`,
  caption: 'A kernel-checked path through Mathlib homeomorphisms, local charts, atlases, smooth manifolds, products, and tangent bundles.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Homeomorphisms',
      'Homeomorphisms',
      `# Same topology, different labels

A homeomorphism is not merely a function with a suggestive name. In Mathlib, \`Homeomorph X Y\`—written \`X ≃ₜ Y\`—contains an equivalence, a proof that its forward map is continuous, and a proof that its inverse is continuous.

This world teaches you to read a bundled mathematical structure. You will project facts from the bundle, use its inverse laws, and compose two homeomorphisms.`,
      [],
      [
        {
          title: 'Continuity is bundled',
          theoremName: 'homeomorph_continuous',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) : Continuous e`,
          introduction: `The hypothesis \`e : X ≃ₜ Y\` already stores the proof that its forward function is continuous. Mathlib exposes that field through the theorem \`Homeomorph.continuous\`, and dot notation lets you write it as \`e.continuous\`.

Use \`exact\` to supply that proof to the goal.`,
          conclusion: `You just proved a theorem about Mathlib's bundled \`Homeomorph\` structure. No informal “looks the same” proposition was substituted for continuity.`,
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
          introduction: `A continuous bijection is not automatically a homeomorphism: the inverse must also be continuous. Mathlib records this separately as \`Homeomorph.continuous_symm\`.

The expression \`e.symm\` is itself the inverse homeomorphism, coerced here to its underlying function.`,
          conclusion: `The forward and inverse continuity fields are why a homeomorphism preserves topology in both directions.`,
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
          introduction: `Coordinates must not lose the point they describe. A homeomorphism sends \`x\` to \`Y\`; its inverse sends the result back to exactly \`x\`.

This is the genuine inverse law \`Homeomorph.symm_apply_apply\`, inherited from the equivalence inside the homeomorphism.`,
          conclusion: `Round-trip equations are the algebraic heart of changing coordinates.`,
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

Apply the named library theorem explicitly. This makes the mathematical API visible instead of letting simplification hide it.`,
          conclusion: `You now have the basic coordinate-change algebra: continuity, inverse continuity, round trips, and composition.`,
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
      `# A chart is deliberately partial

A globe cannot be flattened by one global homeomorphism. A chart only maps an open patch of the manifold to an open patch of a model space.

Mathlib represents that object as \`OpenPartialHomeomorph X Y\`. It has a \`source\`, a \`target\`, local continuity, and inverse laws that require a proof that the point lies in the relevant patch.`,
      ['Homeomorphisms'],
      [
        {
          title: 'The source is open',
          theoremName: 'local_chart_source_open',
          signature: `{X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) : IsOpen e.source`,
          introduction: `The domain of a local chart is not arbitrary. \`OpenPartialHomeomorph\` stores the theorem \`open_source : IsOpen e.source\`.

Read the target first: Lean wants proof that a set is open. Then inspect the bundled chart for a field with exactly that type.`,
          conclusion: `Open chart domains ensure that every point in the patch still has room for local analysis.`,
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
          introduction: `A partial chart is only required to behave continuously on its source. Mathlib states that precisely with \`ContinuousOn e e.source\`.

Unlock \`OpenPartialHomeomorph.continuousOn\` by projecting it from \`e\`.`,
          conclusion: `The type distinguishes global continuity from continuity restricted to the chart domain.`,
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
          introduction: `Now membership matters. The chart is a total Lean function syntactically, but its geometric guarantees are conditional on \`hx : x ∈ e.source\`.

Feed that evidence to \`OpenPartialHomeomorph.map_source\`.`,
          conclusion: `Mathlib uses explicit source-membership hypotheses to keep partial geometry honest.`,
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
          introduction: `The global round-trip theorem from world 1 needed no side condition. A partial homeomorphism needs \`hx\`: only points in the chart source are promised to return.

Use the actual local inverse law \`OpenPartialHomeomorph.left_inv\`.`,
          conclusion: `This is the equation a coordinate chart must satisfy on its patch.`,
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

\`ChartedSpace H M\` says that the topological space \`M\` has charts into the model space \`H\`. Its data consists of an \`atlas H M\` and a preferred \`chartAt H x\` for every point.

The class deliberately stores both the covering facts needed constantly in later proofs: the point lies in its preferred chart's source, and that chart belongs to the atlas.`,
      ['LocalCharts'],
      [
        {
          title: 'Every point has a chart',
          theoremName: 'point_mem_preferred_chart',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : x ∈ (chartAt H x).source`,
          introduction: `The chosen chart \`chartAt H x\` is useful because Mathlib guarantees that it contains \`x\`. The public theorem is \`mem_chart_source H x\`.

Notice how the instance argument \`[ChartedSpace H M]\` supplies an entire atlas without appearing as an ordinary named hypothesis.`,
          conclusion: `You have proved the local-cover condition for one arbitrary point using the real \`ChartedSpace\` class.`,
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
          introduction: `A preferred chart is not extra data floating beside the atlas. \`chart_mem_atlas H x\` proves it is one of the atlas charts.

This connection is used when smooth compatibility is known for atlas members.`,
          conclusion: `The class ties pointwise chart selection back to the global atlas.`,
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
          introduction: `Combine the selected chart with its source-membership guarantee: the coordinate value \`chartAt H x x\` lies in the chart's target.

Mathlib has already packaged that composition as \`mem_chart_target H x\`. Use it rather than replaying \`map_source\` manually.`,
          conclusion: `Named theorems let later formalization operate at the manifold level instead of unpacking chart fields each time.`,
          solution: 'exact mem_chart_target H x',
          hints: ['Use the newly introduced theorem `mem_chart_target H x`.'],
          newTheorems: ['mem_chart_target'],
        },
        {
          title: 'A chart source is a neighborhood',
          theoremName: 'preferred_chart_source_is_neighborhood',
          signature: `{H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : (chartAt H x).source ∈ 𝓝 x`,
          introduction: `Open sets containing \`x\` are neighborhoods of \`x\`. Mathlib's filter notation \`𝓝 x\` records all neighborhoods at once.

\`chart_source_mem_nhds H x\` combines openness of the chart source with \`mem_chart_source\`.`,
          conclusion: `This is a genuinely topological formulation of “the chart is valid near the point.”`,
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
          introduction: `The pointwise condition becomes a global cover: union all preferred chart sources and obtain all of \`M\`.

Mathlib exposes this theorem as \`iUnion_source_chartAt H M\`. It is the atlas-covering idea stated with actual sets and indexed unions.`,
          conclusion: `You have reached the central theorem of a charted space: its selected local coordinate patches cover the whole space.`,
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

This world makes typeclass inference visible: the same notation \`chartAt\` selects different structured instances from the types in the goal.`,
      ['ChartedSpaces'],
      [
        {
          title: 'A model charts itself by identity',
          theoremName: 'self_chart_is_identity',
          signature: `{H : Type u} [TopologicalSpace H] (x : H) :
    chartAt H x = OpenPartialHomeomorph.refl H`,
          introduction: `For the canonical \`ChartedSpace H H\` instance, the preferred chart is the identity open partial homeomorphism.

Prove the exact Mathlib theorem \`chartAt_self_eq\`.`,
          conclusion: `The model space itself is the simplest charted space: one global identity chart is enough.`,
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
          introduction: `The self-charted atlas is the singleton containing the identity chart. Mathlib states membership in that atlas as an equivalence.

Split the \`↔\` with \`constructor\`, then use the forward and backward directions of \`chartedSpaceSelf_atlas\`.`,
          conclusion: `You can now see both components of the canonical instance: the selected chart and the atlas it belongs to.`,
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
          introduction: `The model for a product manifold is \`ModelProd H H'\`. Its preferred chart is built by pairing the preferred charts of the two factors.

This is not an analogy: \`prodChartedSpace_chartAt\` is the definitional theorem used throughout Mathlib.`,
          conclusion: `Product manifolds inherit coordinates componentwise.`,
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
          introduction: `The general covering theorem \`mem_chart_source\` also works for the product instance. Lean infers that instance from the model and manifold types in the goal.

Instantiate the theorem with \`ModelProd H H'\` and the pair \`(x, y)\`.`,
          conclusion: `Typeclass composition has constructed and verified the product charted space for you.`,
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

\`ChartedSpace\` only supplies topological charts. Mathlib's \`IsManifold I n M\` adds compatibility with a differentiability groupoid determined by:

- a scalar field \`𝕜\`,
- a normed model vector space \`E\`,
- a \`ModelWithCorners 𝕜 E H\`, and
- a differentiability order \`n : WithTop ℕ∞\`.

Here \`n = 0\` is topological, \`n = ∞\` is smooth, and \`n = ω\` is analytic.`,
      ['CanonicalCharts'],
      [
        {
          title: 'The model space is a manifold',
          theoremName: 'model_space_is_manifold',
          signature: `{𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H) (n : WithTop ℕ∞) :
    IsManifold I n H`,
          introduction: `Every model with corners is itself a manifold of every differentiability order. Mathlib registers this as an instance, so the tactic \`infer_instance\` can synthesize the proof from the types alone.

This is your first deliberate use of the typeclass system as a proof engine.`,
          conclusion: `The base case for manifold constructions is now in place: the model space carries its canonical manifold structure.`,
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
          introduction: `If every transition map is \`C^n\`, it is also \`C^m\` whenever \`m ≤ n\`.

Mathlib packages the downgrade as \`IsManifold.of_le\`. Supply the inequality \`hmn\`; the existing \`IsManifold I n M\` instance is found automatically.`,
          conclusion: `Smoothness levels form a hierarchy, and the theorem records the direction precisely.`,
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
          introduction: `A smooth manifold is, in particular, a topological manifold relative to the same model with corners.

Mathlib has an instance that applies the smoothness hierarchy automatically. Let \`infer_instance\` find the chain.`,
          conclusion: `The differentiability parameter is real formal structure: Lean has derived the \`C^0\` manifold from the \`C^∞\` one.`,
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
          introduction: `The product of two \`C^n\` manifolds is a \`C^n\` manifold. Mathlib combines the product chart instance from the last world with the product model-with-corners and a compatibility proof.

The declaration is registered as the instance \`IsManifold.prod\`. Apply that actual Mathlib declaration to the two manifold types.`,
          conclusion: `This construction formally covers spaces such as the torus viewed as a product of two circles, once the circle instances are supplied.`,
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

For a manifold modelled on a normed vector space \`E\`, Mathlib defines \`TangentSpace I x\` at every point \`x\`. The total tangent bundle \`TangentBundle I M\` is a dependent pair: a base point together with a tangent vector in that point's fiber.

This final world moves from propositions about structures to constructing values of dependent types.`,
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
          introduction: `Every tangent space inherits an additive commutative group structure from the model vector space. Therefore it has a zero vector.

The expected type tells Lean which \`0\` you mean. Supply it with \`exact 0\`.`,
          conclusion: `You have constructed a real value of Mathlib's \`TangentSpace I x\`, not merely proved that a tangent vector “exists.”`,
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
          introduction: `A point of the tangent bundle is a dependent pair \`⟨x, v⟩\`: the fiber type of \`v\` depends on the chosen base point \`x\`.

Lean knows \`x\` implicitly from the type of \`v\`, so construct the pair directly.`,
          conclusion: `The tangent bundle is now concrete: its elements carry both location and direction.`,
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
          introduction: `The first projection of \`⟨x, v⟩\` computes to \`x\`. This equality holds by definitional reduction, so \`rfl\` closes it.

Here \`rfl\` is proving a fact about a dependent bundle representation, not an invented natural-number example.`,
          conclusion: `Definitional equality makes the bundle projection computationally transparent.`,
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
          introduction: `Finish by constructing a tangent-bundle point over an arbitrary base point. Use the course theorem \`tangent_zero I x\` that you proved in this world, package it with \`x\`, and prove that the first projection is \`x\`.

This is a pointwise form of the zero section of the tangent bundle.`,
          conclusion: `You have crossed the full ladder: bundled homeomorphisms → partial charts → atlases → smooth-manifold instances → dependent tangent-bundle values.`,
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
