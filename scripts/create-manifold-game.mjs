#!/usr/bin/env node

import fs from 'node:fs'

const gameOutputUrl = new URL('../src/game/manifolds.generated.json', import.meta.url)
const verifierOutputUrl = new URL('../src/game/manifolds-verifier.generated.json', import.meta.url)
const leanOutputRootUrl = new URL('../lean/', import.meta.url)

const LEAN_COMMIT = '62b6a2291302d4bbeace37642a066b7510d0145c'
const LEAN_UPSTREAM_COMMIT = 'ecf55de08b9d855e749f80c491c6f294dd307e60'
const MATHLIB_COMMIT = 'de3a9cf33016bbb6d15880d7680643f7ca2d25ba'
const BASE_MODULE = 'ManifoldAdventure.BrowserBase'
const POLICY_MODULE = 'ManifoldAdventure.BrowserPolicy'
const NAMESPACE = 'ManifoldAdventure'
const WORLD_MODULES = {
  Homeomorphisms: {
    module: 'ManifoldAdventure.Homeomorphisms',
    mathlibImports: ['Mathlib.Topology.Homeomorph.Defs'],
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  LocalCharts: {
    module: 'ManifoldAdventure.LocalCharts',
    mathlibImports: ['Mathlib.Topology.OpenPartialHomeomorph.Defs'],
    courseImports: ['ManifoldAdventure.Homeomorphisms'],
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  ChartedSpaces: {
    module: 'ManifoldAdventure.ChartedSpaces',
    mathlibImports: ['Mathlib.Geometry.Manifold.ChartedSpace'],
    courseImports: ['ManifoldAdventure.LocalCharts'],
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  CanonicalCharts: {
    module: 'ManifoldAdventure.CanonicalCharts',
    mathlibImports: ['Mathlib.Geometry.Manifold.ChartedSpace'],
    courseImports: ['ManifoldAdventure.ChartedSpaces'],
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  SmoothManifolds: {
    module: 'ManifoldAdventure.SmoothManifolds',
    mathlibImports: ['Mathlib.Geometry.Manifold.IsManifold.Basic'],
    courseImports: ['ManifoldAdventure.CanonicalCharts'],
    openCommands: ['open scoped Topology ContDiff', 'open Filter ENat'],
  },
  TangentSpaces: {
    module: 'ManifoldAdventure.TangentSpaces',
    mathlibImports: ['Mathlib.Geometry.Manifold.IsManifold.Basic'],
    courseImports: ['ManifoldAdventure.SmoothManifolds'],
    openCommands: ['open scoped Topology ContDiff', 'open Filter ENat'],
  },
  MapProjections: {
    module: 'ManifoldAdventure.MapProjections',
    mathlibImports: ['Mathlib.Geometry.Manifold.Instances.Sphere'],
    courseImports: ['ManifoldAdventure.LocalCharts'],
    openCommands: ['open scoped Topology Manifold ContDiff', 'open Metric Set Function'],
  },
  CircleMotion: {
    module: 'ManifoldAdventure.CircleMotion',
    mathlibImports: [
      'Mathlib.Geometry.Manifold.Instances.Sphere',
      'Mathlib.Analysis.SpecialFunctions.Complex.Circle',
    ],
    courseImports: ['ManifoldAdventure.SmoothManifolds'],
    openCommands: ['open scoped Topology Manifold ContDiff', 'open Function'],
  },
  RobotArm: {
    module: 'ManifoldAdventure.RobotArm',
    mathlibImports: [],
    courseImports: ['ManifoldAdventure.CircleMotion'],
    openCommands: ['open scoped Topology Manifold ContDiff', 'open Function'],
  },
  RobotReachability: {
    module: 'ManifoldAdventure.RobotReachability',
    mathlibImports: [],
    courseImports: ['ManifoldAdventure.RobotArm'],
    openCommands: ['open scoped Topology Manifold ContDiff', 'open Function'],
  },
}
const MATHLIB_DOCS = {
  homeomorph: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html',
  openPartialHomeomorph: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html',
  chartedSpace: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html',
  isManifold: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html',
  sphere: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html',
  circle: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html',
  normedGroup: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Normed/Group/Basic.html',
  topologyBasic: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Defs/Basic.html',
}

const WORLD_PRESENTATION = {
  Homeomorphisms: { mapPosition: { x: 500, y: 120 } },
  LocalCharts: { mapPosition: { x: 500, y: 360 } },
  ChartedSpaces: { mapPosition: { x: 500, y: 600 } },
  CanonicalCharts: { mapPosition: { x: 500, y: 840 } },
  SmoothManifolds: { mapPosition: { x: 500, y: 1080 } },
  TangentSpaces: { mapPosition: { x: 500, y: 1320 } },
  MapProjections: { optional: true, mapPosition: { x: 820, y: 600 } },
  CircleMotion: { optional: true, mapPosition: { x: 180, y: 1320 } },
  RobotArm: { optional: true, mapPosition: { x: 180, y: 1580 } },
  RobotReachability: { optional: true, mapPosition: { x: 180, y: 1840 } },
}

function mathlibDoc(name, page, anchor = name) {
  return `[\`${name}\`](${page}#${anchor})`
}

function lessonText(introduction, statementText) {
  const paragraphs = introduction.trim().split(/\n\n+/)
  const objective = paragraphs.at(-1)

  if (!objective?.startsWith('**Objective:**')) {
    throw new Error('Every Manifold Adventure level must end with an **Objective:** paragraph.')
  }

  return {
    introduction: paragraphs.slice(0, -1).join('\n\n'),
    statementText: statementText?.trim() || objective,
  }
}

function hiddenSolutionHint(solution) {
  const lines = solution.split('\n')
  if (lines.length === 1) return `*(hidden)* \`${lines[0]}\``
  return `*(hidden)* ${lines.map((line) => `\`${line}\``).join(', then ')}`
}

function makeLevel(world, number, level) {
  const lesson = lessonText(level.introduction, level.statementText)
  const worldModule = WORLD_MODULES[world]
  if (!worldModule) throw new Error(`No Lean module configured for ${world}.`)
  if (level.hints.length !== 2) {
    throw new Error(`${world} level ${number} must have a conceptual hint and a tool hint.`)
  }

  return {
    id: `${world.toLowerCase()}-${number}`,
    world,
    number,
    title: level.title,
    introduction: lesson.introduction,
    conclusion: level.conclusion.trim(),
    statementText: lesson.statementText,
    statement: `${level.theoremName} ${level.signature}`,
    theoremName: level.theoremName,
    declarationKind: level.declarationKind || 'theorem',
    solution: level.solution,
    hints: [...level.hints, hiddenSolutionHint(level.solution)],
    newTactics: level.newTactics || [],
    completionTactics: level.completionTactics || [],
    hiddenTactics: [],
    newTheorems: level.newTheorems || [],
    newDefinitions: level.newDefinitions || [],
    disabledTactics: [],
    disabledTheorems: [],
    disabledDefinitions: [],
    sourcePath: `lean/${worldModule.module.replaceAll('.', '/')}.lean`,
    verification: 'kernel',
  }
}

function makeWorld(id, title, introduction, prerequisites, levels, options = {}) {
  const presentation = { ...WORLD_PRESENTATION[id], ...options }
  return {
    id,
    title,
    introduction: introduction.trim(),
    prerequisites,
    optional: presentation.optional || false,
    mapPosition: presentation.mapPosition,
    verification: 'kernel',
    levels: levels.map((level, index) => makeLevel(id, index + 1, level)),
  }
}

const game = {
  source: {
    repository: 'https://github.com/cauli/lean4-wasm-in-browser',
    commit: `mathlib-manifolds-${MATHLIB_COMMIT.slice(0, 10)}-r3`,
    license: 'Apache-2.0 for Mathlib; original course text in this repository',
    toolchain: `cauli/lean4@${LEAN_COMMIT.slice(0, 10)} (upstream ${LEAN_UPSTREAM_COMMIT.slice(0, 10)})`,
    mathlibCommit: MATHLIB_COMMIT,
    importedAt: '2026-07-29T00:00:00.000Z',
  },
  title: 'The Manifold Adventure',
  introduction: `# The Manifold Adventure

Ada is an ant, so she can only inspect her world from the inside. Manifold theory takes the same point of view: understand the whole space through local coordinates.

The main path uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the start. First come [\`Homeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) and [\`OpenPartialHomeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). A [\`ChartedSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) supplies an [\`atlas\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) and a [\`chartAt\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt) for each point. A [\`ModelWithCorners\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners) lets [\`IsManifold\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) express smooth compatibility, leading to [\`TangentSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) and [\`TangentBundle\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle). Optional paths apply the same structures to stereographic maps, circular motion, and a two-joint arm.`,
  information: `The formal sources are in \`lean/ManifoldAdventure/\`. Each world imports the smallest Mathlib area it needs, from homeomorphisms through smooth manifolds, at pinned Mathlib commit \`${MATHLIB_COMMIT}\`.

Hints are staged. The first gives a conceptual nudge, the second names the tool, and the third contains the full solution. A tactic may appear as new in more than one level when optional branches make the first encounter order-dependent.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.`,
  caption: 'A kernel-checked course on Mathlib topology and manifolds, with optional paths through map projections and robot motion.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Homeomorphisms',
      'Homeomorphisms',
      `# One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing.

A ${mathlibDoc('Homeomorph', MATHLIB_DOCS.homeomorph)} is Mathlib's bundled version of such a correspondence. In the goals, \`Trail\` is the actual path, \`Drawing\` is the inked route rather than the whole leaf, and \`trailMap\` connects them. The structure contains an equivalence and continuity proofs in both directions.

This world names its instance assumptions, such as \`trailTopology\`, so the lessons can point at them. Later worlds leave them anonymous, which is ordinary Lean style.`,
      [],
      [
        {
          title: 'The drawing matches the trail',
          theoremName: 'homeomorph_continuous',
          signature: `{Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) : Continuous trailMap`,
          introduction: `Ada stands midway along a path. North leads back to the nest; south leads to a patch of berries. She copies the path onto a leaf. As she moves a little along the trail, her mark should move only a little on the drawing. There can be no sudden jump.

Here \`Trail\` is the actual path and \`Drawing\` is the line Ada drew. The objects \`trailTopology\` and \`drawingTopology\` tell Lean what it means for points to be nearby in each space. Then \`trailMap : Trail ≃ₜ Drawing\` matches their points homeomorphically. It already contains a proof that its forward function is continuous, exposed as ${mathlibDoc('Homeomorph.continuous', MATHLIB_DOCS.homeomorph)} or \`trailMap.continuous\`.

**Objective:** Prove that the map from the actual trail to Ada's drawing is continuous.`,
          conclusion: `Ada's drawing now moves continuously with the trail.`,
          solution: 'exact trailMap.continuous',
          hints: ['A homeomorphism carries its continuity proofs with it.', 'The forward proof is the field `trailMap.continuous`.'],
          newTactics: ['exact'],
          newTheorems: ['Homeomorph.continuous'],
          newDefinitions: ['TopologicalSpace', 'Homeomorph', 'Continuous'],
        },
        {
          title: 'The drawing leads Ada back',
          theoremName: 'homeomorph_inverse_continuous',
          signature: `{Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) : Continuous trailMap.symm`,
          introduction: `Ada also needs the leaf to guide her home. A small move across the drawing should send her to a nearby place on the trail, not somewhere far away.

The inverse homeomorphism is \`trailMap.symm\`: it reads a mark on \`Drawing\` as a place on \`Trail\`. Its continuity proof is ${mathlibDoc('Homeomorph.continuous_symm', MATHLIB_DOCS.homeomorph)}, available through dot notation as \`trailMap.continuous_symm\`.

**Objective:** Prove that reading the leaf back onto the trail is continuous.`,
          conclusion: `Ada can read the same map in either direction without a jump.`,
          solution: 'exact trailMap.continuous_symm',
          hints: ['The inverse map carries its continuity proof too.', 'The inverse field is `trailMap.continuous_symm`.'],
          newTheorems: ['Homeomorph.continuous_symm'],
          newDefinitions: ['Homeomorph.symm'],
        },
        {
          title: 'Back where she started',
          theoremName: 'homeomorph_round_trip',
          signature: `{Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) (place : Trail) :
    trailMap.symm (trailMap place) = place`,
          introduction: `Ada marks her position on the leaf, then reads that mark back onto the trail. She should land at the exact place where she started.

The equation \`trailMap.symm (trailMap place) = place\` is the round-trip law for a homeomorphism. Mathlib stores it as ${mathlibDoc('Homeomorph.symm_apply_apply', MATHLIB_DOCS.homeomorph)}.

**Objective:** Show that mapping \`place\` to the drawing and back returns the same place.`,
          conclusion: `The mark on the leaf still names exactly one place on the trail.`,
          solution: 'exact trailMap.symm_apply_apply place',
          hints: ['Round trips through an equivalence obey a stored law.', 'The dot-notation theorem is `trailMap.symm_apply_apply`, applied to `place`.'],
          newTheorems: ['Homeomorph.symm_apply_apply'],
          newDefinitions: ['Eq'],
        },
        {
          title: 'Into the route book',
          theoremName: 'homeomorph_composition_apply',
          signature: `{Trail : Type u} {Drawing : Type v} {RouteBook : Type w}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    [routeBookTopology : TopologicalSpace RouteBook]
    (trailMap : Trail ≃ₜ Drawing) (bookMap : Drawing ≃ₜ RouteBook)
    (place : Trail) :
    trailMap.trans bookMap place = bookMap (trailMap place)`,
          introduction: `Ada copies the trail onto a leaf, then copies the leaf into the nest's larger route book. Her position passes through the first map and then the second.

Here \`trailMap\` goes from the actual \`Trail\` to the \`Drawing\`, while \`bookMap\` transfers that drawing into the \`RouteBook\`. Mathlib composes them with \`trailMap.trans bookMap\`. The pointwise rule is ${mathlibDoc('Homeomorph.trans_apply', MATHLIB_DOCS.homeomorph)}, and in dot notation it reads \`trailMap.trans_apply bookMap place\`. The equation also holds by definition, so Lean accepts \`rfl\` here. The named lemma is the habit that keeps working once definitional unfolding stops.

**Objective:** Show that the composed map sends \`place\` first through \`trailMap\` and then through \`bookMap\`.`,
          conclusion: `The two drawings now behave like one map from the trail to the route book.`,
          solution: 'exact trailMap.trans_apply bookMap place',
          hints: ['Composition has a named pointwise rule.', 'Use `trailMap.trans_apply` with the second map and the point. A plain `rfl` also works here.'],
          newTheorems: ['Homeomorph.trans_apply'],
          newDefinitions: ['Homeomorph.trans'],
        },
      ],
    ),
    makeWorld(
      'LocalCharts',
      'Open partial homeomorphisms',
      `# A chart only sees a patch

The trail soon climbs onto a rounded stone. From where Ada stands she can survey only the patch around her, and no single leaf can record the whole closed surface, so she draws just the part she can see.

Mathlib represents one local chart by ${mathlibDoc('OpenPartialHomeomorph', MATHLIB_DOCS.openPartialHomeomorph)}. In these goals, \`Stone\` is the curved surface, \`Drawing\` is Ada's coordinate picture, and \`chart\` connects only the part she has drawn. It has a \`source\` on the stone, a \`target\` in the drawing, and inverse laws that apply inside the patch.

From this world on, background structure appears in anonymous instance brackets such as \`[TopologicalSpace Stone]\`. World 1 named these assumptions only so its text could point at them.`,
      ['Homeomorphisms'],
      [
        {
          title: 'Room around every place',
          theoremName: 'local_chart_source_open',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) : IsOpen chart.source`,
          introduction: `Ada shades the usable part of the stone on her leaf. Every included spot needs a little room around it, so the drawing does not stop at Ada's feet.

In Lean, \`chart.source\` is the shaded part of \`Stone\`. Requiring that patch to be open formalizes the room around each included point. An ${mathlibDoc('OpenPartialHomeomorph', MATHLIB_DOCS.openPartialHomeomorph)} stores the proof as \`chart.open_source\`.

**Objective:** Prove that the chart's source is an open set.`,
          conclusion: `The shaded patch is open, so every point in it has some room around it.`,
          solution: 'exact chart.open_source',
          hints: ['Openness is part of what an `OpenPartialHomeomorph` is.', 'The stored proof is `chart.open_source`.'],
          newTheorems: ['OpenPartialHomeomorph.open_source'],
          newDefinitions: ['OpenPartialHomeomorph', 'OpenPartialHomeomorph.source', 'IsOpen'],
        },
        {
          title: 'No jumps inside the patch',
          theoremName: 'local_chart_continuous',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) :
    ContinuousOn chart chart.source`,
          introduction: `Ada walks inside the shaded patch while her mark moves across the leaf. Within that patch, neither motion should jump.

Because \`chart\` covers only part of \`Stone\`, Mathlib asks for \`ContinuousOn chart chart.source\` rather than continuity everywhere. The bundled proof is ${mathlibDoc('OpenPartialHomeomorph.continuousOn', MATHLIB_DOCS.openPartialHomeomorph)}.

**Objective:** Prove that the chart is continuous wherever its local coordinates are valid.`,
          conclusion: `The chart only promises continuity inside the patch where it is valid.`,
          solution: 'exact chart.continuousOn',
          hints: ['A partial map promises continuity only on its valid patch.', 'The stored proof is `chart.continuousOn`.'],
          newTheorems: ['OpenPartialHomeomorph.continuousOn'],
          newDefinitions: ['ContinuousOn'],
        },
        {
          title: 'Her mark lands in the drawing',
          theoremName: 'local_chart_maps_source',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (place : Stone) (inPatch : place ∈ chart.source) :
    chart place ∈ chart.target`,
          introduction: `Ada chooses a point inside the shaded patch and places its mark on the leaf. Since the point is in the part she mapped, the mark must lie in the drawn coordinate region.

Lean names Ada's chosen point \`place\`. The hypothesis \`inPatch : place ∈ chart.source\` says that it lies in the shaded part of the stone. Mathlib's ${mathlibDoc('OpenPartialHomeomorph.map_source', MATHLIB_DOCS.openPartialHomeomorph)} then concludes that \`chart place\` lies in the drawn target. Type \`\\in\` for \`∈\`.

**Objective:** Show that a point in the chart source maps into its coordinate target.`,
          conclusion: `Once Lean knows that \`place\` is in the source, its coordinates belong to the target.`,
          solution: 'apply chart.map_source\nexact inPatch',
          hints: ['Start with `apply chart.map_source`.', 'The remaining goal is the hypothesis `inPatch`.'],
          newTactics: ['apply'],
          newTheorems: ['OpenPartialHomeomorph.map_source'],
          newDefinitions: ['OpenPartialHomeomorph.target', 'Membership.mem'],
        },
        {
          title: 'Back to the same spot',
          theoremName: 'local_chart_round_trip',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (place : Stone) (inPatch : place ∈ chart.source) :
    chart.symm (chart place) = place`,
          introduction: `Ada marks a place in her local drawing and traces it back onto the stone. The round trip is reliable only because that place lies inside the patch she drew.

For a partial homeomorphism, the inverse law needs \`inPatch : place ∈ chart.source\`. This is the formal bridge between "Ada drew this place" and the side condition in Mathlib's ${mathlibDoc('OpenPartialHomeomorph.left_inv', MATHLIB_DOCS.openPartialHomeomorph)}.

**Objective:** Show that a source point returns to itself after passing through the chart and its inverse.`,
          conclusion: `Inside her patch, Ada can move from stone to leaf and back without losing her place.`,
          solution: 'exact chart.left_inv inPatch',
          hints: ['The partial round-trip law needs source membership.', 'Give `chart.left_inv` the proof `inPatch`.'],
          newTheorems: ['OpenPartialHomeomorph.left_inv'],
          newDefinitions: ['OpenPartialHomeomorph.symm'],
        },
        {
          title: 'The leaf reads back into the patch',
          theoremName: 'local_chart_reads_back',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (mark : Drawing) (inDrawing : mark ∈ chart.target) :
    chart.symm mark ∈ chart.source ∧ chart (chart.symm mark) = mark`,
          introduction: `Ada picks a mark inside the drawn region and reads it back onto the stone. Two things should hold at once: the recovered point lies in her shaded patch, and pressing it forward again reproduces the mark she chose.

You have met \`chart.map_source\` and \`chart.left_inv\`. Mathlib names their mirror images predictably: ${mathlibDoc('OpenPartialHomeomorph.map_target', MATHLIB_DOCS.openPartialHomeomorph)} and ${mathlibDoc('OpenPartialHomeomorph.right_inv', MATHLIB_DOCS.openPartialHomeomorph)}. Guessing a lemma's name from this convention is a useful Mathlib skill. The goal is a conjunction, written \`∧\` (type \`\\and\`). The \`constructor\` tactic splits it into two parts, and a focus dot \`·\` (type \`\\.\`) gives each part its own proof.

**Objective:** From \`mark ∈ chart.target\`, show that the read-back point lies in the source and maps forward to \`mark\`.`,
          conclusion: `Both directions of the chart now behave, and Ada guessed the lemma names herself.`,
          solution: 'constructor\n· exact chart.map_target inDrawing\n· exact chart.right_inv inDrawing',
          hints: ['Split the conjunction, then handle each goal after a focus dot.', 'Use `constructor`; the mirror lemmas are `chart.map_target` and `chart.right_inv`.'],
          newTactics: ['constructor', '·'],
          newTheorems: ['OpenPartialHomeomorph.map_target', 'OpenPartialHomeomorph.right_inv'],
          newDefinitions: ['And'],
        },
      ],
    ),
    makeWorld(
      'ChartedSpaces',
      'Charted spaces and atlases',
      `# A stack of maps

The stone is larger than one patch. Ada carries a stack of leaves, each covering a different part, and keeps them together as her atlas.

The class ${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} equips a surface with an atlas. The goals call the actual world \`Surface\`, the shared coordinate space \`Coordinates\`, and Ada's location \`place\`. Mathlib often writes the same three objects as \`M\`, \`H\`, and \`x\`.`,
      ['LocalCharts'],
      [
        {
          title: 'A leaf for where she stands',
          theoremName: 'point_mem_preferred_chart',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    place ∈ (chartAt Coordinates place).source`,
          introduction: `Wherever Ada stops, she selects a leaf whose shaded patch contains her current position. A preferred map that missed her would be useless.

The instance \`[ChartedSpace Coordinates Surface]\` is Ada's collection of local leaves. Mathlib's ${mathlibDoc('mem_chart_source', MATHLIB_DOCS.chartedSpace)} says that \`chartAt Coordinates place\`, the leaf chosen at her current location, contains \`place\` in its source. Smooth compatibility between overlapping leaves comes later, with \`IsManifold\`.

**Objective:** Show that \`place\` lies in the source of the chart chosen there.`,
          conclusion: `Ada can always choose a chart that contains where she stands.`,
          solution: 'exact mem_chart_source Coordinates place',
          hints: ['The preferred chart is built not to miss its chosen point.', 'Use `mem_chart_source Coordinates place`.'],
          newTheorems: ['mem_chart_source'],
          newDefinitions: ['ChartedSpace', 'chartAt'],
        },
        {
          title: 'This leaf is in the atlas',
          theoremName: 'preferred_chart_mem_atlas',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place ∈ atlas Coordinates Surface`,
          introduction: `Ada checks the leaf she chose and files it back with the others. A preferred map must be one of the maps in her atlas.

In Lean, Ada's stack is \`atlas Coordinates Surface\`, and her chosen leaf is \`chartAt Coordinates place\`. Mathlib's ${mathlibDoc('chart_mem_atlas', MATHLIB_DOCS.chartedSpace)} proves that the chosen chart belongs to that atlas.

**Objective:** Show that the chart chosen at \`place\` belongs to the atlas.`,
          conclusion: `The leaf chosen at \`place\` really is one of the leaves in the atlas.`,
          solution: 'exact chart_mem_atlas Coordinates place',
          hints: ['The preferred chart came from the atlas.', 'Use `chart_mem_atlas Coordinates place`.'],
          newTheorems: ['chart_mem_atlas'],
          newDefinitions: ['atlas'],
        },
        {
          title: 'Her place lands on the leaf',
          theoremName: 'preferred_chart_maps_to_target',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place place ∈ (chartAt Coordinates place).target`,
          introduction: `Ada presses her current position through the chosen chart. Its mark lands inside the coordinate patch drawn on the leaf.

Read \`chartAt Coordinates place place\` as \`(chartAt Coordinates place) place\`. The first \`place\` selects Ada's chart, and the second is the point drawn in \`Coordinates\`. No new lemma is needed. World 2's \`map_source\` sends a source point into its chart's target, and level 3.1 put \`place\` in this chart's source. Mathlib also packages the combination as ${mathlibDoc('mem_chart_target', MATHLIB_DOCS.chartedSpace)}, which joins your book after this proof.

**Objective:** Show that the coordinates of \`place\` lie inside the chosen chart's target.`,
          conclusion: `Ada built the target fact from parts she already owned. Mathlib's one-step \`mem_chart_target\` is now in her book too.`,
          solution: 'apply (chartAt Coordinates place).map_source\nexact mem_chart_source Coordinates place',
          hints: ['Combine a World 2 fact about arbitrary charts with level 3.1.', 'Apply `(chartAt Coordinates place).map_source`; the remaining goal is `mem_chart_source Coordinates place`.'],
          newTheorems: ['mem_chart_target'],
        },
        {
          title: 'The map works nearby',
          theoremName: 'preferred_chart_source_is_neighborhood',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    (chartAt Coordinates place).source ∈ 𝓝 place`,
          introduction: `The chosen leaf covers a patch around Ada's footprint. Throughout that neighborhood, the same coordinates remain valid.

Mathlib writes the neighborhood filter at Ada's location as \`𝓝 place\`; type \`\\nhds\` for \`𝓝\`. This filter is a collection of sets. Thus \`source ∈ 𝓝 place\` says that the source contains an open set around \`place\`, not that a point belongs to a set. The theorem ${mathlibDoc('chart_source_mem_nhds', MATHLIB_DOCS.chartedSpace)} supplies exactly that fact for \`chartAt Coordinates place\`.

**Objective:** Show that the chosen chart is valid on a whole neighborhood of \`place\`.`,
          conclusion: `The chosen coordinates work throughout a neighborhood of \`place\`.`,
          solution: 'exact chart_source_mem_nhds Coordinates place',
          hints: ['Upgrade point membership to a whole neighborhood.', 'Use `chart_source_mem_nhds Coordinates place`.'],
          newTheorems: ['chart_source_mem_nhds'],
          newDefinitions: ['Filter', 'nhds'],
        },
        {
          title: 'No place left uncovered',
          theoremName: 'preferred_charts_cover',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] :
    (⋃ place : Surface, (chartAt Coordinates place).source) =
      (Set.univ : Set Surface)`,
          introduction: `Ada spreads every preferred leaf across the stone. No point remains uncovered; wherever she stands, at least one local map is ready.

The indexed union \`⋃ place : Surface, (chartAt Coordinates place).source\` spreads out the preferred leaf at every possible location. Mathlib proves in ${mathlibDoc('iUnion_source_chartAt', MATHLIB_DOCS.chartedSpace)} that their sources equal all of \`Surface\`.

**Objective:** Show that the preferred chart sources cover every point of \`Surface\`.`,
          conclusion: `Together, Ada's leaves cover the whole space.`,
          solution: 'exact iUnion_source_chartAt Coordinates Surface',
          hints: ['Every point lies in its own preferred chart, so their union is universal.', 'Use `iUnion_source_chartAt Coordinates Surface`.'],
          newTheorems: ['iUnion_source_chartAt'],
          newDefinitions: ['Set.iUnion', 'Set.univ'],
        },
      ],
    ),
    makeWorld(
      'CanonicalCharts',
      'Identity and product charts',
      `# Charts Lean already knows

Ada sets two identical reference grids on top of each other before returning to the curved surface. One maps to the other without moving a mark. A place with two independent readings needs a pair of maps.

Mathlib supplies canonical ${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} instances for self charts and products. Here the goal names the two torus factors \`FirstSurface\` and \`SecondSurface\`, together with their coordinate spaces. The types determine which instance Lean uses, even though the notation \`chartAt\` stays the same. The shape gallery below is optional; some objects return in the levels, while others preview later topology.`,
      ['ChartedSpaces'],
      [
        {
          title: 'The reference grid stays put',
          theoremName: 'self_chart_is_identity',
          signature: `{Coordinates : Type u}
    [TopologicalSpace Coordinates]
    (mark : Coordinates) :
    chartAt Coordinates mark = OpenPartialHomeomorph.refl Coordinates`,
          introduction: `Ada lays one reference grid on top of an identical grid. Every mark already sits in the right place, so the map does nothing.

Both grids are represented by the same type, \`Coordinates\`, and \`mark\` is one point on them. Mathlib's canonical \`ChartedSpace Coordinates Coordinates\` instance uses \`OpenPartialHomeomorph.refl Coordinates\`. The theorem ${mathlibDoc('chartAt_self_eq', MATHLIB_DOCS.chartedSpace)} describes this chosen self-chart; it does not say that every atlas on \`Coordinates\` must use only identity charts.

**Objective:** Show that a space used as its own coordinate model has the identity as its preferred chart.`,
          conclusion: `The reference leaf needs only the identity chart.`,
          solution: 'exact chartAt_self_eq',
          hints: ['The canonical self-charted instance uses one chart.', 'Use `chartAt_self_eq`; all arguments are implicit.'],
          newTheorems: ['chartAt_self_eq'],
          newDefinitions: ['OpenPartialHomeomorph.refl', 'chartedSpaceSelf'],
        },
        {
          title: 'The identity is filed in the atlas',
          theoremName: 'identity_mem_self_atlas',
          signature: `{Coordinates : Type u}
    [TopologicalSpace Coordinates] :
    OpenPartialHomeomorph.refl Coordinates ∈ atlas Coordinates Coordinates`,
          introduction: `Ada opens the small atlas that came with the reference grid and files the identity chart into it. Matching the grid with itself is the only map this atlas was meant to hold.

Mathlib's ${mathlibDoc('chartedSpaceSelf_atlas', MATHLIB_DOCS.chartedSpace)} is an \`↔\`: a chart belongs to \`atlas Coordinates Coordinates\` exactly when it is the identity. Its two directions are \`.mp\` (left to right) and \`.mpr\` (right to left). This membership goal uses the right-to-left direction, fed with \`rfl\`, a proof that the identity equals itself.

**Objective:** Show that the identity chart belongs to the self-atlas.`,
          conclusion: `The reference atlas accepts its one and only chart.`,
          solution: 'exact chartedSpaceSelf_atlas.mpr rfl',
          hints: ['Read the atlas-membership equivalence backwards.', 'Use `chartedSpaceSelf_atlas.mpr`; it wants the equality proof `rfl`.'],
          newTheorems: ['chartedSpaceSelf_atlas'],
          newDefinitions: ['Iff', 'Iff.mpr'],
        },
        {
          title: 'Only the identity is filed there',
          theoremName: 'self_atlas_chart_is_identity',
          signature: `{Coordinates : Type u}
    [TopologicalSpace Coordinates]
    (chart : OpenPartialHomeomorph Coordinates Coordinates)
    (inAtlas : chart ∈ atlas Coordinates Coordinates) :
    chart = OpenPartialHomeomorph.refl Coordinates`,
          introduction: `Ada pulls a chart out of the reference atlas. Whatever leaf she is holding, the atlas accepted only one map, so it must be the identity.

This is the forward direction of ${mathlibDoc('chartedSpaceSelf_atlas', MATHLIB_DOCS.chartedSpace)}. Its \`.mp\` projection turns the membership hypothesis \`inAtlas\` into the required equality.

**Objective:** From atlas membership, conclude that the chart is the identity.`,
          conclusion: `Every chart the reference atlas hands Ada is the identity.`,
          solution: 'exact chartedSpaceSelf_atlas.mp inAtlas',
          hints: ['Read the same equivalence forwards this time.', 'Use `.mp` to turn `inAtlas` into the equality.'],
          newDefinitions: ['Iff.mp'],
        },
        {
          title: 'Two readings at once',
          theoremName: 'product_chart_is_product',
          signature: `{FirstCoordinates : Type u} {SecondCoordinates : Type u'}
    {FirstSurface : Type v} {SecondSurface : Type v'}
    [TopologicalSpace FirstCoordinates]
    [TopologicalSpace SecondCoordinates]
    [TopologicalSpace FirstSurface]
    [TopologicalSpace SecondSurface]
    [ChartedSpace FirstCoordinates FirstSurface]
    [ChartedSpace SecondCoordinates SecondSurface]
    (position : FirstSurface × SecondSurface) :
    chartAt (ModelProd FirstCoordinates SecondCoordinates) position =
      (chartAt FirstCoordinates position.1).prod
        (chartAt SecondCoordinates position.2)`,
          introduction: `On a torus, Ada records two positions at once: how far she has gone around the hole and how far she has gone around the tube. Each reading has its own local map.

Think first of \`FirstSurface\` and \`SecondSurface\` as two circles whose product is a torus. The two entries of \`position : FirstSurface × SecondSurface\` are Ada's two readings. Mathlib combines their coordinate types as \`ModelProd FirstCoordinates SecondCoordinates\`. The theorem ${mathlibDoc('prodChartedSpace_chartAt', MATHLIB_DOCS.chartedSpace)} says that the preferred chart is the product of the two component charts.

**Objective:** Show that the preferred chart of a paired point is the product of its two component charts.`,
          conclusion: `The torus chart is built by reading its two coordinates side by side.`,
          solution: 'rw [prodChartedSpace_chartAt]',
          hints: ['The product instance computes its chart by a stated rule.', 'Rewrite with `prodChartedSpace_chartAt`.'],
          newTactics: ['rw'],
          newTheorems: ['prodChartedSpace_chartAt'],
          newDefinitions: ['ModelProd', 'OpenPartialHomeomorph.prod', 'prodChartedSpace'],
        },
        {
          title: 'The paired chart contains her place',
          theoremName: 'product_point_mem_chart_source',
          signature: `{FirstCoordinates : Type u} {SecondCoordinates : Type u'}
    {FirstSurface : Type v} {SecondSurface : Type v'}
    [TopologicalSpace FirstCoordinates]
    [TopologicalSpace SecondCoordinates]
    [TopologicalSpace FirstSurface]
    [TopologicalSpace SecondSurface]
    [ChartedSpace FirstCoordinates FirstSurface]
    [ChartedSpace SecondCoordinates SecondSurface]
    (firstPosition : FirstSurface) (secondPosition : SecondSurface) :
    (firstPosition, secondPosition) ∈
      (chartAt (ModelProd FirstCoordinates SecondCoordinates)
        (firstPosition, secondPosition)).source`,
          introduction: `Ada combines one position from each loop of the torus. The paired point must lie inside the source of the paired chart.

The pair \`(firstPosition, secondPosition)\` records Ada's place in both factors. The earlier theorem ${mathlibDoc('mem_chart_source', MATHLIB_DOCS.chartedSpace)} also applies to the product charted-space instance, which Lean infers from \`ModelProd FirstCoordinates SecondCoordinates\`. Here \`exact\` needs help because \`ModelProd\` is a type synonym. The tactic \`simpa only using h\` unfolds just enough notation in the goal and \`h\` to make them match. Its cousin \`simp\` uses Mathlib's default simplification lemmas.

**Objective:** Show that the paired position lies inside its preferred product chart.`,
          conclusion: `The paired chart contains the paired point, just as each component chart contains its own point.`,
          solution: 'simpa only using\n  (mem_chart_source (ModelProd FirstCoordinates SecondCoordinates)\n    (firstPosition, secondPosition))',
          hints: ['Specialize the earlier covering theorem to the product model.', 'Then use `simpa only` with the paired position.'],
          newTactics: ['simpa', 'simp'],
        },
      ],
    ),
    makeWorld(
      'SmoothManifolds',
      'Smooth manifolds',
      `# When chart changes are smooth

Ada's leaves now overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives.

${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} supplies the charts. Mathlib's ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} adds differentiability conditions to their transition maps. For a first picture, take \`Scalar = ℝ\` and imagine \`Coordinates\` as ordinary Euclidean coordinates. The goals state the same ideas for a general \`Surface\`, \`Coordinates\`, \`Vectors\`, \`model\`, and \`order\`. The first level meets the transition map itself before the rest of the world asks such maps to be differentiable.`,
      ['CanonicalCharts'],
      [
        {
          title: 'Two leaves in conversation',
          theoremName: 'transition_map_source',
          signature: `{Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart chart' : OpenPartialHomeomorph Stone Drawing) :
    (chart.symm.trans chart').source =
      chart.target ∩ chart.symm ⁻¹' chart'.source`,
          introduction: `Ada holds two overlapping leaves of the same stone. She reads a mark from the first leaf back onto the stone, then presses that point through the second. This is the transition map between the drawings.

Formally, the transition map is \`chart.symm.trans chart'\`: invert one chart, then apply the other. Its domain contains marks in the first chart's target whose read-back lands in the second chart's source. The preimage \`chart.symm ⁻¹' chart'.source\` collects those marks. Mathlib computes the domain with ${mathlibDoc('OpenPartialHomeomorph.trans_source', MATHLIB_DOCS.openPartialHomeomorph)}, while ${mathlibDoc('OpenPartialHomeomorph.symm_source', MATHLIB_DOCS.openPartialHomeomorph)} renames the inverse chart's source to \`chart.target\`.

**Objective:** Compute the transition map's domain from the two charts.`,
          conclusion: `The transition map now has an explicit home: the overlap as seen from the first leaf.`,
          solution: 'rw [OpenPartialHomeomorph.trans_source, OpenPartialHomeomorph.symm_source]',
          hints: ['Unfold the source of the composite, then rename the inverse chart\'s source.', 'Rewrite with `OpenPartialHomeomorph.trans_source` and `OpenPartialHomeomorph.symm_source`.'],
          newTheorems: ['OpenPartialHomeomorph.trans_source', 'OpenPartialHomeomorph.symm_source'],
          newDefinitions: ['OpenPartialHomeomorph.trans', 'Set.inter', 'Set.preimage'],
        },
        {
          title: 'The reference leaf is ready',
          theoremName: 'model_space_is_manifold',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    (order : WithTop ℕ∞) :
    IsManifold model order Coordinates`,
          introduction: `Ada places a model leaf beside the world she is charting. The leaf is already its own coordinate space, so it needs no further change of coordinates to qualify as a manifold.

In the goal, \`Scalar\` supplies the numbers, \`Vectors\` supplies directions, and \`Coordinates\` is the model leaf itself. The ${mathlibDoc('ModelWithCorners', MATHLIB_DOCS.isManifold)} named \`model\` connects those pieces. The ordered type \`WithTop ℕ∞\` records differentiability levels. Here \`0\` means continuity-level regularity, \`∞\` means smoothness at every finite order, and the top element \`ω\` means analyticity. World 8's circle will meet that stronger standard. Mathlib registers ${mathlibDoc('instIsManifoldModelSpace', MATHLIB_DOCS.isManifold)} for every order.

**Objective:** Establish that \`Coordinates\` carries the manifold structure supplied by \`model\`.`,
          conclusion: `The model space is already a manifold at the requested order.`,
          solution: 'infer_instance',
          hints: ['Mathlib has registered this result as an instance.', 'Ask typeclass inference to find it.'],
          newTactics: ['infer_instance'],
          newTheorems: ['instIsManifoldModelSpace'],
          newDefinitions: ['ModelWithCorners', 'IsManifold', 'WithTop', 'ENat'],
        },
        {
          title: 'Passing an easier check',
          theoremName: 'manifold_of_higher_smoothness',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    {lowerOrder higherOrder : WithTop ℕ∞}
    [IsManifold model higherOrder Surface] :
    lowerOrder ≤ higherOrder → IsManifold model lowerOrder Surface`,
          introduction: `Ada checks her map changes to a demanding standard. If they pass that test, they also pass any test that asks for fewer derivatives.

For example, an atlas of class $C^5$ also meets a $C^2$ requirement. Lean calls the demanding standard \`higherOrder\` and the weaker one \`lowerOrder\`. This time the comparison arrives inside the goal as an implication. The \`intro\` tactic moves its assumption into the context. Mathlib's ${mathlibDoc('IsManifold.of_le', MATHLIB_DOCS.isManifold)} then finishes.

**Objective:** Assuming \`lowerOrder ≤ higherOrder\`, lower the known differentiability order from \`higherOrder\` to \`lowerOrder\`.`,
          conclusion: `The higher-order manifold instance now works at the requested lower order.`,
          solution: 'intro order_le\nexact IsManifold.of_le order_le',
          hints: ['Bring the implication\'s assumption into the context first.', 'After `intro order_le`, pass it to `IsManifold.of_le`.'],
          newTactics: ['intro'],
          newTheorems: ['IsManifold.of_le'],
          newDefinitions: ['LE.le'],
        },
        {
          title: 'The smooth atlas passes the basic check',
          theoremName: 'smooth_manifold_is_topological',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    [IsManifold model ∞ Surface] :
    IsManifold model 0 Surface`,
          introduction: `Ada's smoothest leaf changes never crease or kink. They certainly still preserve the nearby-point structure she needed for her first maps.

The assumption \`IsManifold model ∞ Surface\` says that Ada's chart changes have derivatives of every finite order. Mathlib's ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} hierarchy registers the implication to \`IsManifold model 0 Surface\`, where order \`0\` retains the basic topological requirement. This \`0\` is a regularity order, not the dimension of \`Surface\`.

**Objective:** Derive the topological manifold structure from the smooth one.`,
          conclusion: `The smooth atlas also gives Ada the topological atlas she started with.`,
          solution: 'infer_instance',
          hints: ['Mathlib registers this implication as an instance.', 'Let `infer_instance` find it.'],
        },
        {
          title: 'Two circles make a torus',
          theoremName: 'product_of_manifolds',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {FirstVectors : Type v}
    [NormedAddCommGroup FirstVectors]
    [NormedSpace Scalar FirstVectors]
    {SecondVectors : Type v'}
    [NormedAddCommGroup SecondVectors]
    [NormedSpace Scalar SecondVectors]
    {FirstCoordinates : Type w}
    [TopologicalSpace FirstCoordinates]
    {SecondCoordinates : Type w'}
    [TopologicalSpace SecondCoordinates]
    {firstModel : ModelWithCorners Scalar FirstVectors FirstCoordinates}
    {secondModel : ModelWithCorners Scalar SecondVectors SecondCoordinates}
    {FirstSurface : Type u'}
    [TopologicalSpace FirstSurface]
    [ChartedSpace FirstCoordinates FirstSurface]
    {SecondSurface : Type u''}
    [TopologicalSpace SecondSurface]
    [ChartedSpace SecondCoordinates SecondSurface]
    (order : WithTop ℕ∞)
    [IsManifold firstModel order FirstSurface]
    [IsManifold secondModel order SecondSurface] :
    IsManifold (firstModel.prod secondModel) order (FirstSurface × SecondSurface)`,
          introduction: `Ada's two circular readings describe the torus together. If each circle has smooth coordinate changes, pairing the readings should preserve that smoothness.

Read the final line of the goal first: it asks for a manifold structure on \`FirstSurface × SecondSurface\`. In Ada's torus, those surfaces are circles. The instance lines above provide their two manifold structures, and Mathlib's ${mathlibDoc('IsManifold.prod', MATHLIB_DOCS.isManifold)} combines them with \`firstModel.prod secondModel\` at the same \`order\`.

**Objective:** Build the manifold structure on \`FirstSurface × SecondSurface\` from its two factors.`,
          conclusion: `Two smooth circles now give the torus its smooth manifold structure.`,
          solution: 'exact IsManifold.prod FirstSurface SecondSurface',
          hints: ['The product theorem wants the two surface types.', 'Supply them as `FirstSurface` and `SecondSurface`.'],
          newTheorems: ['IsManifold.prod'],
          newDefinitions: ['ModelWithCorners.prod', 'Prod'],
        },
      ],
    ),
    makeWorld(
      'TangentSpaces',
      'Tangent spaces and the tangent bundle',
      `# A direction at every point

Ada's atlas tells her where she is. At one point on the surface, she now asks which directions she could move without leaving it.

Mathlib assigns a ${mathlibDoc('TangentSpace', MATHLIB_DOCS.isManifold)} to every point. In the goals, \`Surface\` is Ada's world, \`place\` is her location, \`model\` describes its coordinates, and \`velocity\` is a tangent vector there. The ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} collects each place together with one of its possible velocities.`,
      ['SmoothManifolds'],
      [
        {
          title: 'Ada stands still',
          theoremName: 'tangent_zero',
          declarationKind: 'noncomputable def',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    TangentSpace model place`,
          introduction: `Ada stands still at \`place\`. Even without choosing a direction, staying still is a valid tangent velocity.

The ${mathlibDoc('TangentSpace', MATHLIB_DOCS.isManifold)} \`TangentSpace model place\` is the intrinsic space of velocities available at Ada's current location. The plane in the 3D scene pictures this tangent space; it is not an arbitrary plane floating beside the surface. The space inherits an additive group structure from \`Vectors\`, so it contains a zero vector. The expected type tells Lean which \`0\` is intended.

This is a definition level, so the kernel accepts any well-typed term. Only one velocity here is canonical, and level 6.3 reuses the course's official \`tangent_zero\`, so make it the zero vector.

**Objective:** Construct the zero tangent vector at \`place\`.`,
          conclusion: `Standing still is now a genuine vector in \`TangentSpace model place\`.`,
          solution: 'exact 0',
          hints: ['The tangent space has a zero instance.', 'The expected type is enough for Lean to understand `0`.'],
          newDefinitions: ['TangentSpace', 'Zero.zero'],
        },
        {
          title: 'Read the location tag',
          theoremName: 'tangent_bundle_base',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    {place : Surface} (velocity : TangentSpace model place) :
    (⟨place, velocity⟩ : TangentBundle model Surface).1 = place`,
          introduction: `Ada records both where she is and the direction she is moving, then reads the record's location tag. A direction without its point would be ambiguous because the available tangent plane changes from place to place. The tag must give back the point she stored.

A point of the ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} is the dependent pair \`⟨place, velocity⟩\` (angle brackets: type \`\\<\` and \`\\>\`). The tangent space may change with \`place\`, so \`velocity : TangentSpace model place\` remembers where the velocity belongs. The first projection \`.1\` reduces by definition to \`place\`, and the \`rfl\` tactic checks that reduction.

**Objective:** Show that projecting the base point from \`⟨place, velocity⟩\` returns \`place\`.`,
          conclusion: `Reading the bundle point's location tag returns \`place\`.`,
          solution: 'rfl',
          hints: ['The first projection reduces to `place` by definition.', 'A reflexivity proof closes such a goal.'],
          newTactics: ['rfl'],
          newDefinitions: ['TangentBundle', 'Bundle.TotalSpace', 'Sigma', 'Sigma.fst'],
        },
        {
          title: 'Standing still anywhere',
          theoremName: 'tangent_bundle_has_zero',
          signature: `{Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    ∃ bundlePoint : TangentBundle model Surface, bundlePoint.1 = place`,
          introduction: `Ada can stand still anywhere on the manifold, not just at one chosen point. The tangent bundle should therefore contain a zero direction record over every location.

The course definition \`tangent_zero model place\` gives the standing-still velocity in \`TangentSpace model place\`. Pairing it with \`place\` produces a point of the ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} whose location tag is \`place\`. This constructs the zero bundle point over one arbitrary place; it does not yet define the zero section as a function.

**Objective:** For an arbitrary \`place\`, construct a tangent-bundle point lying over it.`,
          conclusion: `Every point now has a canonical bundle point for standing still.`,
          solution: 'refine ⟨⟨place, tangent_zero model place⟩, ?_⟩\nrfl',
          hints: ['Use `⟨place, tangent_zero model place⟩` as the witness.', 'Its base-point equation holds by reflexivity.'],
          newTactics: ['refine'],
          newDefinitions: ['Exists'],
        },
      ],
    ),
    makeWorld(
      'MapProjections',
      'One pole is missing',
      `# A round world on a flat leaf

Ada finds a glass bead near the trail. She wants to copy its surface onto a leaf, but one drawing cannot include the point where she holds the bead. She makes a second drawing from another pole to cover the gap.

Mathlib builds this map as ${mathlibDoc('stereographic', MATHLIB_DOCS.sphere)}, an \`OpenPartialHomeomorph\` from the unit sphere to a flat orthogonal plane. This branch uses the local-chart ideas from the main path on a concrete sphere. It assumes only World 2, and introduces the extra tactics it needs on the way to the covering proof.`,
      ['LocalCharts'],
      [
        {
          title: 'The pole stays off the leaf',
          theoremName: 'stereographic_map_misses_pole',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : Space) (unitPole : ‖pole‖ = 1) :
    (stereographic unitPole).source = {⟨pole, by simp [unitPole]⟩}ᶜ`,
          introduction: `Ada presses one point of the bead between her feet while she draws. That point is the pole of the projection, so it cannot appear in this chart.

The source of \`stereographic unitPole\` is the sphere with the pole removed. Mathlib states this as ${mathlibDoc('stereographic_source', MATHLIB_DOCS.sphere)}. The complement notation \`{⟨pole, ...⟩}ᶜ\` means every sphere point except that one.

The singleton's element appears as \`⟨pole, by simp [unitPole]⟩\`. A sphere point is a vector paired with a certificate that its norm is one. Read the embedded proof as Mathlib filling in that certificate from \`unitPole\`.

**Objective:** Show that the stereographic chart covers the sphere except for its chosen pole.`,
          conclusion: `The first drawing now has an exact missing point.`,
          solution: 'exact stereographic_source unitPole',
          hints: ['Mathlib states the source of a stereographic chart directly.', 'Use `stereographic_source unitPole`.'],
          newTheorems: ['stereographic_source'],
          newDefinitions: ['Metric.sphere', 'stereographic', 'Set.compl'],
        },
        {
          title: 'The far pole lands in the middle',
          theoremName: 'opposite_pole_is_origin',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : sphere (0 : Space) 1) :
    stereographic (norm_eq_of_mem_sphere pole) (-pole) = 0`,
          introduction: `Ada marks the point opposite the missing pole. On her flat drawing, that point sits at the center.

The value \`-pole\` is the antipodal point on the sphere. Mathlib's ${mathlibDoc('stereographic_apply_neg', MATHLIB_DOCS.sphere)} computes its stereographic coordinate as the zero vector in the flat model space.

The pole has changed representation since the previous level. There it was a raw vector plus \`‖pole‖ = 1\`. Here it is already a point of the sphere subtype, and \`norm_eq_of_mem_sphere pole\` recovers the norm certificate from membership.

**Objective:** Prove that the antipodal point maps to the origin of the drawing.`,
          conclusion: `Ada can use the opposite pole as the center of her coordinates.`,
          solution: 'exact stereographic_apply_neg pole',
          hints: ['The antipode\'s coordinate is a named computation.', 'Apply `stereographic_apply_neg` to `pole`.'],
          newTheorems: ['stereographic_apply_neg', 'norm_eq_of_mem_sphere'],
          newDefinitions: ['Neg.neg'],
        },
        {
          title: 'Every mark has a place on the bead',
          theoremName: 'every_stereographic_mark_has_source',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : Space) (unitPole : ‖pole‖ = 1) :
    Function.Surjective (stereographic unitPole)`,
          introduction: `Ada points to an arbitrary mark on the leaf and traces it back to the bead. No coordinate on the drawing is wasted.

The chart target is the whole orthogonal plane. The theorem ${mathlibDoc('surjective_stereographic', MATHLIB_DOCS.sphere)} says that every coordinate has a preimage on the sphere away from the missing pole.

**Objective:** Show that every point in the coordinate plane comes from the sphere.`,
          conclusion: `Every mark on the leaf now names a point on the bead.`,
          solution: 'exact surjective_stereographic unitPole',
          hints: ['Surjectivity of the stereographic map is already proved.', 'Use `surjective_stereographic unitPole`.'],
          newTheorems: ['surjective_stereographic'],
          newDefinitions: ['Function.Surjective'],
        },
        {
          title: 'Off the pole, onto the leaf',
          theoremName: 'stereographic_off_pole',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north place : sphere (0 : Space) 1) (notNorth : place ≠ north) :
    place ∈ (stereographic (norm_eq_of_mem_sphere north)).source`,
          introduction: `Ada checks a point that is not the pinned pole. Every such point earned a mark on the first leaf.

Membership in the source is membership in a complement. The condition \`place ∈ {north}ᶜ\` becomes \`place ∉ {north}\`, and singleton membership becomes equality, so the whole condition is \`place ≠ north\`. The tactic \`simp only [h₁, h₂, …]\` rewrites with exactly the listed lemmas. Here those lemmas include ${mathlibDoc('stereographic_source', MATHLIB_DOCS.sphere)}, \`Set.mem_compl_iff\`, and \`Set.mem_singleton_iff\`.

**Objective:** Show that any point other than the pole lies in that pole's chart source.`,
          conclusion: `Only the pinned pole is missing. Everything else already has coordinates on the first leaf.`,
          solution: 'simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]\nexact notNorth',
          hints: ['Unwind the chart source and the two membership statements.', 'Use `simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]`; the result is `notNorth`.'],
          newTactics: ['simp'],
          newTheorems: ['Set.mem_compl_iff', 'Set.mem_singleton_iff'],
        },
        {
          title: 'The second leaf covers the hole',
          theoremName: 'two_stereographic_maps_cover',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north south : sphere (0 : Space) 1) (different : north ≠ south) :
    (stereographic (norm_eq_of_mem_sphere north)).source ∪
      (stereographic (norm_eq_of_mem_sphere south)).source = Set.univ`,
          introduction: `Ada makes a second drawing from a different pole. The first leaf misses only the north point, and the second misses only the south point. Since those points differ, every place appears on at least one leaf.

The proof starts from ${mathlibDoc('stereographic_source', MATHLIB_DOCS.sphere)} and has a useful shape. \`ext place\` turns the set equation into a statement about one point. \`simp only\` with the membership lemmas from the previous level reduces it to a disjunction: the point differs from north, or it differs from south. \`by_cases atNorth : place = north\` splits the situations, while \`left\` and \`right\` choose a side. At north, assume \`place = south\` with \`intro\` and chain equalities as \`atNorth.symm.trans atSouth\` to contradict \`different\`.

**Objective:** Prove that two stereographic charts with different poles cover the whole sphere.`,
          conclusion: `Two leaves are enough to record every point on the bead. This pair is the atlas Mathlib uses to make the sphere a \`ChartedSpace\`, tying this branch back to World 3.`,
          solution: `ext place
simp only [stereographic_source, Set.mem_union, Set.mem_compl_iff,
  Set.mem_singleton_iff, Set.mem_univ, iff_true]
by_cases atNorth : place = north
· right
  intro atSouth
  exact different (atNorth.symm.trans atSouth)
· left
  exact atNorth`,
          hints: [
            'Reduce the set equality to one point, expose the disjunction, then split on whether that point is north.',
            'Use `ext`, `simp only`, and `by_cases`. Choose branches with `left` or `right`.',
          ],
          newTactics: ['ext', 'by_cases', 'left', 'right', 'intro'],
          newTheorems: [
            'Set.mem_union',
            'Set.mem_univ',
            'iff_true',
            'Eq.symm',
            'Eq.trans',
          ],
          newDefinitions: ['Set.union', 'Set.univ', 'Or'],
        },
      ],
    ),
    makeWorld(
      'CircleMotion',
      'The dial comes around',
      `# An angle becomes a position

Ada finds a brass dial on an old field box. Turning it changes the pointer's position, but a full turn brings the pointer home. She needs a way to compose turns without losing that circular behavior.

Mathlib's \`Circle\` is the unit circle in the complex plane. The map ${mathlibDoc('Circle.exp', MATHLIB_DOCS.circle)} sends a real angle to a point on that circle. Mathlib also knows that the circle is an analytic Lie group, so composing positions and moving smoothly are part of the same structure.`,
      ['SmoothManifolds'],
      [
        {
          title: 'No turn leaves the pointer home',
          theoremName: 'circle_zero_turn',
          signature: `: Circle.exp 0 = 1`,
          introduction: `Ada starts with the pointer at its home mark. Before she turns the dial, its angle is zero and its position on the circle is one.

The identity of the circle group is \`1\`. Mathlib records the zero-angle calculation as ${mathlibDoc('Circle.exp_zero', MATHLIB_DOCS.circle)}.

**Objective:** Show that angle zero gives the identity position on the circle.`,
          conclusion: `The dial's home position now agrees with the circle-group identity.`,
          solution: 'exact Circle.exp_zero',
          hints: ['The zero-angle value is a recorded calculation.', 'Use `Circle.exp_zero`.'],
          newTheorems: ['Circle.exp_zero'],
          newDefinitions: ['Circle', 'Circle.exp', 'One.one'],
        },
        {
          title: 'Two turns compose',
          theoremName: 'circle_turns_compose',
          signature: `(first second : ℝ) :
    Circle.exp (first + second) = Circle.exp first * Circle.exp second`,
          introduction: `Ada turns the dial once, then turns it again. The final position is the same as adding the two angles before moving the pointer.

Circle positions compose by multiplication. The theorem ${mathlibDoc('Circle.exp_add', MATHLIB_DOCS.circle)} says that \`Circle.exp\` changes addition of angles into multiplication on the circle. This is the group law used for planar rotations.

**Objective:** Prove that adding two angles agrees with composing their circle positions.`,
          conclusion: `Ada can combine consecutive turns with the circle-group operation.`,
          solution: 'exact Circle.exp_add first second',
          hints: ['The exponential turns angle addition into circle multiplication.', 'Give both angles to `Circle.exp_add`.'],
          newTheorems: ['Circle.exp_add'],
          newDefinitions: ['Mul.mul'],
        },
        {
          title: 'One full turn changes nothing',
          theoremName: 'circle_full_turn',
          signature: `(angle : ℝ) :
    Circle.exp (angle + 2 * Real.pi) = Circle.exp angle`,
          introduction: `Ada turns the dial through one complete revolution. The pointer travels, but it finishes at the position where it began.

Angles on the real line are not unique coordinates for a circle point. Adding \`2 * Real.pi\` gives the same point. Mathlib names this calculation ${mathlibDoc('Circle.exp_add_two_pi', MATHLIB_DOCS.circle)}.

**Objective:** Show that adding one full turn does not change the pointer's position.`,
          conclusion: `The formal dial now returns to the same state after one revolution.`,
          solution: 'exact Circle.exp_add_two_pi angle',
          hints: ['Mathlib records what adding one revolution does.', 'Use `Circle.exp_add_two_pi angle`.'],
          newTheorems: ['Circle.exp_add_two_pi'],
          newDefinitions: ['Real.pi'],
        },
        {
          title: 'The pointer turns smoothly',
          theoremName: 'circle_turning_is_smooth',
          signature: `: CMDiff ∞ Circle.exp`,
          introduction: `Ada turns the dial slowly. The pointer follows without a jump or corner, even when it crosses the home mark.

The statement \`CMDiff ∞ Circle.exp\` uses Mathlib's manifold notation. \`CMDiff n f\` elaborates to \`ContMDiff I J n f\`, with the two models inferred instead of written out. It says that the angle-to-circle map has derivatives of every finite order as a map between manifolds. Mathlib proves this in ${mathlibDoc('contMDiff_circleExp', MATHLIB_DOCS.sphere)}.

**Objective:** Prove that converting an angle into a circle position is smooth.`,
          conclusion: `A continuously turning angle now gives smooth motion on the circle.`,
          solution: 'exact contMDiff_circleExp',
          hints: ['Mathlib already knows the circle exponential is manifold-smooth.', 'Use `contMDiff_circleExp`.'],
          newTheorems: ['contMDiff_circleExp'],
          newDefinitions: ['ContMDiff', 'CMDiff'],
        },
      ],
    ),
    makeWorld(
      'RobotArm',
      'Two hinges, one reach',
      `# Where the arm can reach

Inside the field box, Ada finds a small arm with two rotating hinges. Each hinge position lies on Mathlib's ${mathlibDoc('Circle', MATHLIB_DOCS.circle)}, and reading both rings at once gives one point of \`Circle × Circle\`. This is the arm's configuration space, a concrete torus and the product manifold of the main path. A value of a product type is written with plain parentheses, as in \`(shoulder, elbow)\`.

We represent the work surface by \`ℂ\`, viewed as a plane. The first link points in the shoulder direction. The second link turns by the shoulder and elbow angles together.`,
      ['CircleMotion'],
      [
        {
          title: 'Find the tip of the arm',
          theoremName: 'robot_arm_tip',
          declarationKind: 'noncomputable def',
          signature: `(firstLength secondLength : ℝ)
    (joints : Circle × Circle) : ℂ`,
          introduction: `Ada follows the first bar from the base, then the second bar from the elbow. Adding those two displacements gives the tip position.

Complex numbers describe vectors in the work plane. The first displacement uses \`joints.1\`. The second multiplies two ${mathlibDoc('Circle', MATHLIB_DOCS.circle)} values as \`joints.1 * joints.2\`, because the elbow direction is measured after the shoulder has already turned.

This is a definition level, so any well-typed term would satisfy the kernel. The next three levels reason about the course's official \`robot_arm_tip\`, so match the two-link formula described here.

**Objective:** Define the tip as the sum of the two link vectors.`,
          conclusion: `The configuration now determines a point on the work surface.`,
          solution: `exact
  (firstLength : ℂ) * (joints.1 : ℂ) +
    (secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)`,
          hints: [
            'The first link contributes `firstLength * joints.1`.',
            'The second direction is the product `joints.1 * joints.2`.',
          ],
          newDefinitions: ['Complex', 'Prod.fst', 'Prod.snd'],
        },
        {
          title: 'Both bars point forward',
          theoremName: 'robot_arm_at_rest',
          signature: `(firstLength secondLength : ℝ) :
    robot_arm_tip firstLength secondLength (1, 1) =
      (firstLength + secondLength : ℝ)`,
          introduction: `Ada returns both hinges to their home marks. The two bars lie in one straight line, so the tip sits at the sum of their lengths.

The identity \`1\` in ${mathlibDoc('Circle', MATHLIB_DOCS.circle)} points along the positive real axis. Unfolding \`robot_arm_tip\` leaves a direct complex-number calculation. The \`simp\` tactic knows the identity laws involved.

**Objective:** Compute the tip position when both joints are at the identity.`,
          conclusion: `At rest, the arm reaches straight ahead by the sum of its link lengths.`,
          solution: 'simp [robot_arm_tip]',
          hints: ['This is a direct computation with the definition unfolded.', 'Simplify with `simp [robot_arm_tip]`.'],
        },
        {
          title: 'A full shoulder turn reaches the same point',
          theoremName: 'robot_full_turn_same_tip',
          signature: `(firstLength secondLength shoulder elbow : ℝ) :
    robot_arm_tip firstLength secondLength
        (Circle.exp (shoulder + 2 * Real.pi), Circle.exp elbow) =
      robot_arm_tip firstLength secondLength
        (Circle.exp shoulder, Circle.exp elbow)`,
          introduction: `Ada rotates the shoulder through one complete turn while leaving the elbow reading alone. The arm sweeps around and returns to the same physical pose.

The previous world proved ${mathlibDoc('Circle.exp_add_two_pi', MATHLIB_DOCS.circle)}. Rewriting that one joint makes the two configurations, and therefore their tip positions, equal.

**Objective:** Show that adding a full turn to the shoulder angle leaves the endpoint unchanged.`,
          conclusion: `Different real angles can now describe the same arm pose.`,
          solution: 'rw [Circle.exp_add_two_pi]',
          hints: ['Only the shoulder reading differs between the two configurations.', 'Rewrite it with `Circle.exp_add_two_pi`.'],
        },
        {
          title: 'The arm moves without a jump',
          theoremName: 'robot_arm_tip_continuous',
          signature: `(firstLength secondLength : ℝ) :
    Continuous (robot_arm_tip firstLength secondLength)`,
          introduction: `Ada nudges either hinge. The tip moves with it instead of jumping to a distant point on the table.

The coordinate projections from \`Circle × Circle\` are ${mathlibDoc('Continuous', MATHLIB_DOCS.topologyBasic)}. Coercing a circle point into \`ℂ\` is continuous too, and sums and products of continuous complex-valued functions stay continuous. The proof assembles those facts in the same order as the arm formula.

**Objective:** Prove that the forward-kinematics map from joint states to tip positions is continuous.`,
          conclusion: `Small changes at the hinges now produce small changes at the tip. Now that Ada has built the proof by hand, the course gives her the power tool: with \`fun_prop\` unlocked, \`unfold robot_arm_tip; fun_prop\` closes the same goal in one line.`,
          solution: `unfold robot_arm_tip
exact (continuous_const.mul (continuous_subtype_val.comp continuous_fst)).add
  (continuous_const.mul ((continuous_subtype_val.comp continuous_fst).mul
    (continuous_subtype_val.comp continuous_snd)))`,
          hints: [
            'Unfold `robot_arm_tip` so that the two link contributions are visible.',
            'Build continuity with `.comp`, `.mul`, and `.add` in the same shape as the formula.',
          ],
          newTactics: ['unfold'],
          completionTactics: ['fun_prop'],
          newTheorems: [
            'continuous_const',
            'continuous_subtype_val',
            'continuous_fst',
            'continuous_snd',
            'Continuous.comp',
            'Continuous.mul',
            'Continuous.add',
          ],
        },
      ],
    ),
    makeWorld(
      'RobotReachability',
      'Can the arm touch it?',
      `# The ring of reach

Ada sees a crumb on the work surface and asks a practical question before turning either hinge: can the tip touch it at all? The two bars can stretch only so far, and when one is longer, folding the shorter bar leaves a gap near the base.

For nonnegative lengths \`firstLength\` and \`secondLength\`, every endpoint lies between the radii \`|firstLength - secondLength|\` and \`firstLength + secondLength\`. Each link direction is a point of Mathlib's ${mathlibDoc('Circle', MATHLIB_DOCS.circle)}, while the endpoint lies in the complex plane. The interactive lab turns those inequalities into a shaded annulus. Drag the target to see the two inverse-kinematics poses meet at its boundaries.

The three-link switch is an outlook. An extra hinge can close the central gap and turns isolated solutions into a continuous family. The Lean levels keep their formal argument on the two-link arm, where the obstruction is already useful and precise.`,
      ['RobotArm'],
      [
        {
          title: 'The arm has an outer limit',
          theoremName: 'robot_tip_norm_le',
          signature: `(firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    ‖robot_arm_tip firstLength secondLength joints‖ ≤
      firstLength + secondLength`,
          introduction: `Ada straightens both bars toward the crumb. Even in this longest pose, the tip cannot travel farther than the two bar lengths added together.

The endpoint is a sum of two complex displacement vectors. The triangle inequality \`norm_add_le\` bounds the norm of their sum by the sum of their norms. Each ${mathlibDoc('Circle', MATHLIB_DOCS.circle)} direction has norm one, recorded by \`Circle.norm_coe\`, so the two terms simplify to the two nonnegative lengths.

**Objective:** Prove that the endpoint is no farther from the base than the sum of the link lengths.`,
          conclusion: `The outer dashed circle is now a proved limit, not just a feature of the drawing.`,
          solution: `unfold robot_arm_tip
calc
  _ ≤ ‖(firstLength : ℂ) * (joints.1 : ℂ)‖ +
      ‖(secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)‖ := norm_add_le _ _
  _ = firstLength + secondLength := by
    simp [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond]`,
          hints: [
            'Treat the endpoint as the sum of the two link vectors, then bound the length of that sum.',
            'Unfold `robot_arm_tip`, use a `calc` block with `norm_add_le`, then simplify the two unit-circle norms.',
          ],
          newTactics: ['calc'],
          newTheorems: ['norm_add_le', 'Circle.norm_coe'],
        },
        {
          title: 'The folded arm leaves a gap',
          theoremName: 'robot_tip_norm_ge',
          signature: `(firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    |firstLength - secondLength| ≤
      ‖robot_arm_tip firstLength secondLength joints‖`,
          introduction: `Ada folds the second bar back toward the base. If one bar is longer, the shorter one cannot cancel all of it, so a circular gap remains around the hinge.

The reverse triangle inequality appears in Mathlib as ${mathlibDoc('norm_sub_norm_le', MATHLIB_DOCS.normedGroup)}. Since absolute value asks for both orders of subtraction, \`abs_sub_le_iff\` splits the claim into \`firstLength - secondLength ≤ ...\` and its mirror image. Each half uses the same reverse-triangle argument with the bars exchanged.

**Objective:** Prove that the endpoint stays at least the difference of the link lengths away from the base.`,
          conclusion: `The hole around the base now has the exact lower radius forced by the two bars.`,
          solution: `unfold robot_arm_tip
apply abs_sub_le_iff.mpr
constructor
· have h := norm_sub_norm_le
    ((firstLength : ℂ) * (joints.1 : ℂ))
    (-((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)))
  simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond] using h
· have h := norm_sub_norm_le
    ((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ))
    (-((firstLength : ℂ) * (joints.1 : ℂ)))
  simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond, add_comm] using h`,
          hints: [
            'Absolute value hides two inequalities. Prove the reverse-triangle estimate in both orders.',
            'Use `abs_sub_le_iff.mpr`, split with `constructor`, then apply `norm_sub_norm_le` to one link and the negative of the other.',
          ],
          newTactics: ['have'],
          newTheorems: ['norm_sub_norm_le', 'abs_sub_le_iff'],
        },
        {
          title: 'Every pose stays in the ring',
          theoremName: 'robot_tip_mem_reach_annulus',
          signature: `(firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    |firstLength - secondLength| ≤
        ‖robot_arm_tip firstLength secondLength joints‖ ∧
      ‖robot_arm_tip firstLength secondLength joints‖ ≤
        firstLength + secondLength`,
          introduction: `Ada lays the two limits over the work surface. Every pose of the arm must land in the ring between them.

The goal is the conjunction of the lower and upper bounds from the previous levels. Each endpoint still comes from two ${mathlibDoc('Circle', MATHLIB_DOCS.circle)}-valued joints. This is where the two inequalities become one reusable description of the arm's workspace obstruction. Split the conjunction and cite the course declarations you have just proved.

**Objective:** Combine the two radius bounds to show that every endpoint lies in the closed annulus.`,
          conclusion: `Every configuration on the torus now maps into the shaded ring.`,
          solution: `constructor
· exact robot_tip_norm_ge firstLength secondLength hFirst hSecond joints
· exact robot_tip_norm_le firstLength secondLength hFirst hSecond joints`,
          hints: [
            'The two halves of this conjunction are exactly the previous two course declarations.',
            'Use `constructor`, then apply `robot_tip_norm_ge` and `robot_tip_norm_le`.',
          ],
        },
        {
          title: 'Outside the ring is out of reach',
          theoremName: 'robot_target_outside_annulus_unreachable',
          signature: `(firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (point : ℂ)
    (outside : ‖point‖ < |firstLength - secondLength| ∨
      firstLength + secondLength < ‖point‖) :
    ¬ ∃ joints : Circle × Circle,
      robot_arm_tip firstLength secondLength joints = point`,
          introduction: `Ada places the crumb outside the shaded ring. No amount of turning can make the tip land there: either the crumb is inside the folded gap or it lies beyond both bars.

Reachability is written as an existential statement: some \`joints : Circle × Circle\` send the tip to \`point\`, with ${mathlibDoc('Circle', MATHLIB_DOCS.circle)} carrying each joint angle modulo a full turn. Assume such joints exist, replace \`point\` with their endpoint, then split the two ways \`outside\` can hold. Each branch contradicts one of the bounds already proved. The lab constructs poses for interior targets; this level proves the complementary obstruction in Lean.

**Objective:** Prove that a target outside the annulus has no inverse-kinematics solution.`,
          conclusion: `Ada can now reject an impossible target before moving either hinge.`,
          solution: `intro reaches
obtain ⟨joints, rfl⟩ := reaches
rcases outside with tooClose | tooFar
· exact (not_lt_of_ge
    (robot_tip_norm_ge firstLength secondLength hFirst hSecond joints)) tooClose
· exact (not_lt_of_ge
    (robot_tip_norm_le firstLength secondLength hFirst hSecond joints)) tooFar`,
          hints: [
            'Assume a reaching configuration exists, substitute its endpoint for the target, then contradict the appropriate radius bound.',
            'Use `intro`, unpack the existential with `obtain`, split `outside` with `rcases`, and close each branch with `not_lt_of_ge`.',
          ],
          newTactics: ['obtain', 'rcases'],
          newTheorems: ['not_lt_of_ge'],
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
      fullModule: WORLD_MODULES[level.world].module,
      contextModule: WORLD_MODULES[level.world].module,
      namespaces: [NAMESPACE],
      openCommands: WORLD_MODULES[level.world].openCommands,
      declaration: level.statement,
      declarationKind: level.declarationKind,
      referenceTheorem: `${NAMESPACE}.${level.theoremName}`,
    },
  ])),
}

function leanHeader(world) {
  const config = WORLD_MODULES[world.id]
  const imports = [
    ...(config.mathlibImports || []),
    POLICY_MODULE,
    ...(config.courseImports || []),
  ].map((module) => `public import ${module}`).join('\n')
  return `module

${imports}

@[expose] public section

/-!
# Manifold Adventure: ${world.title}

Generated by \`scripts/create-manifold-game.mjs\`.

Exercise declarations live in \`ManifoldAdventure\`; the mathematical
structures and library theorems they use come directly from pinned Mathlib.
-/

namespace ${NAMESPACE}

universe u v w u' v' w' u''

${config.openCommands.join('\n')}
`
}

function leanDeclarations(levelsForWorld) {
  return levelsForWorld.map((level) => {
    const body = level.solution.split('\n').map((line) => `  ${line}`).join('\n')
    return `${level.declarationKind} ${level.statement} := by\n${body}`
  }).join('\n\n')
}

function leanOutputUrl(moduleName) {
  return new URL(`${moduleName.replaceAll('.', '/')}.lean`, leanOutputRootUrl)
}

fs.writeFileSync(gameOutputUrl, `${JSON.stringify(game, null, 2)}\n`)
fs.writeFileSync(verifierOutputUrl, `${JSON.stringify(verifier, null, 2)}\n`)
for (const world of game.worlds) {
  const moduleName = WORLD_MODULES[world.id].module
  const outputUrl = leanOutputUrl(moduleName)
  const source = `${leanHeader(world)}\n${leanDeclarations(world.levels)}\n\nend ${NAMESPACE}\n`
  fs.mkdirSync(new URL('.', outputUrl), { recursive: true })
  fs.writeFileSync(outputUrl, source)
}

const browserBaseUrl = leanOutputUrl(BASE_MODULE)
const browserBaseImports = Object.values(WORLD_MODULES)
  .map(({ module }) => `public import ${module}`)
  .join('\n')
fs.writeFileSync(browserBaseUrl, `module

${browserBaseImports}

@[expose] public section

/-!
# Manifold Adventure: complete browser theorem base

Generated by \`scripts/create-manifold-game.mjs\`. Browser verification imports
the narrower world modules above; this umbrella is retained for full-course
validation and review.
-/
`)

console.log(`Generated ${game.worlds.length} worlds and ${levels.length} Mathlib-backed levels.`)
console.log(`Lean: ${new URL('ManifoldAdventure/', leanOutputRootUrl).pathname}`)
console.log(`Game: ${gameOutputUrl.pathname}`)
console.log(`Verifier: ${verifierOutputUrl.pathname}`)
