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
  // Revision r5 levels. Importing the three leaves of the earlier module graph
  // keeps every prior declaration citable and leaves the Mathlib closure, and
  // so the deployed artifact layers, unchanged.
  Course: {
    module: 'ManifoldAdventure.Course',
    mathlibImports: [],
    courseImports: [
      'ManifoldAdventure.TangentSpaces',
      'ManifoldAdventure.MapProjections',
      'ManifoldAdventure.RobotReachability',
    ],
    openCommands: ['open scoped Topology Manifold ContDiff', 'open Metric Set Function'],
  },
}

// Titles of the generated Lean modules. The deployed layers were compiled from
// these exact headers, so they stay fixed even when the game world that shows
// a module's levels is renamed.
const MODULE_TITLES = {
  Homeomorphisms: 'Homeomorphisms',
  LocalCharts: 'Open partial homeomorphisms',
  ChartedSpaces: 'Charted spaces and atlases',
  CanonicalCharts: 'Identity and product charts',
  SmoothManifolds: 'Smooth manifolds',
  TangentSpaces: 'Tangent spaces and the tangent bundle',
  MapProjections: 'One pole is missing',
  CircleMotion: 'The dial comes around',
  RobotArm: 'Two hinges, one reach',
  RobotReachability: 'Can the arm touch it?',
  Course: 'Sphere, transition maps, and tangent vectors',
}
const MATHLIB_DOCS = {
  contDiff: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Calculus/ContDiff/Defs.html',
  contMDiff: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ContMDiff/Defs.html',
  mfderiv: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/MFDeriv/Defs.html',
  function: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Function/Defs.html',
  linearMap: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Algebra/Module/Submodule/Range.html',
  orthogonal: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/InnerProductSpace/Orthogonal.html',
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
  Charts: { mapPosition: { x: 500, y: 120 } },
  Sphere: { mapPosition: { x: 500, y: 360 } },
  ChartedSpaces: { mapPosition: { x: 500, y: 600 } },
  SmoothManifolds: { mapPosition: { x: 500, y: 840 } },
  TangentSpaces: { mapPosition: { x: 500, y: 1080 } },
  CanonicalCharts: { optional: true, mapPosition: { x: 820, y: 840 } },
  SmoothOrders: { optional: true, mapPosition: { x: 820, y: 1080 } },
  CircleMotion: { optional: true, mapPosition: { x: 180, y: 1080 } },
  RobotArm: { optional: true, mapPosition: { x: 180, y: 1340 } },
  RobotReachability: { optional: true, mapPosition: { x: 180, y: 1600 } },
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
  // A game world may gather levels from several Lean modules (the opening
  // world spans Homeomorphisms and LocalCharts). `leanWorld`/`leanNumber`
  // preserve each level's Lean-side identity: module, source path, and the
  // id that conformance records and player progress are keyed by.
  const leanWorld = level.leanWorld || world
  const worldModule = WORLD_MODULES[leanWorld]
  if (!worldModule) throw new Error(`No Lean module configured for ${leanWorld}.`)
  if (level.hints.length !== 2) {
    throw new Error(`${world} level ${number} must have a conceptual hint and a tool hint.`)
  }

  return {
    id: `${leanWorld.toLowerCase()}-${level.leanNumber ?? number}`,
    world,
    leanWorld,
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
    question: level.question,
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

// The original opening worlds' level definitions. The GAME now surfaces a
// merged five-level opening world, but the Lean modules must keep every
// declaration exactly as compiled into the deployed artifact layers, so the
// full lists remain the source for Lean emission below.
const HOMEOMORPHISM_LEVELS = [
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
]

const LOCAL_CHART_LEVELS = [
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
]

// Insert a "by the way" paragraph before a level's closing objective: the
// vehicle for granting sibling lemmas without a level dedicated to each.
function withAside(level, aside) {
  const paragraphs = level.introduction.trim().split(/\n\n+/)
  const objective = paragraphs.pop()
  return { ...level, introduction: [...paragraphs, aside.trim(), objective].join('\n\n') }
}


const CHARTED_SPACE_LEVELS = [
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

Read \`chartAt Coordinates place place\` as \`(chartAt Coordinates place) place\`. The first \`place\` selects Ada's chart, and the second is the point drawn in \`Coordinates\`. No new lemma is needed. The first world's \`map_source\` sends a source point into its chart's target, and the first level of this world put \`place\` in this chart's source. Mathlib also packages the combination as ${mathlibDoc('mem_chart_target', MATHLIB_DOCS.chartedSpace)}, which joins your book after this proof.

**Objective:** Show that the coordinates of \`place\` lie inside the chosen chart's target.`,
          conclusion: `Ada built the target fact from parts she already owned. Mathlib's one-step \`mem_chart_target\` is now in her book too.`,
          solution: 'apply (chartAt Coordinates place).map_source\nexact mem_chart_source Coordinates place',
          hints: ['Combine the chart law `map_source` with the fact that the preferred chart contains its point.', 'Apply `(chartAt Coordinates place).map_source`; the remaining goal is `mem_chart_source Coordinates place`.'],
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
]

const CANONICAL_CHART_LEVELS = [
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
]

const SMOOTH_MANIFOLD_LEVELS = [
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

In the goal, \`Scalar\` supplies the numbers, \`Vectors\` supplies directions, and \`Coordinates\` is the model leaf itself. The ${mathlibDoc('ModelWithCorners', MATHLIB_DOCS.isManifold)} named \`model\` connects those pieces. The ordered type \`WithTop ℕ∞\` records differentiability levels. Here \`0\` means continuity-level regularity, \`∞\` means smoothness at every finite order, and the top element \`ω\` means analyticity. The optional circle world meets that stronger standard. Mathlib registers ${mathlibDoc('instIsManifoldModelSpace', MATHLIB_DOCS.isManifold)} for every order.

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
]

const TANGENT_SPACE_LEVELS = [
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

This is a definition level, so the kernel accepts any well-typed term. Only one velocity here is canonical, and later levels reuse the course's official \`tangent_zero\`, so make it the zero vector.

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
]

const MAP_PROJECTION_LEVELS = [
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
          conclusion: `Two leaves are enough to record every point on the bead. This pair is the atlas Mathlib uses to make the sphere a \`ChartedSpace\`, which the next world states in general.`,
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
]

const CIRCLE_MOTION_LEVELS = [
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
]

const ROBOT_ARM_LEVELS = [
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
]

const ROBOT_REACHABILITY_LEVELS = [
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
]

// The ten levels added for revision r5 live in one module, ManifoldAdventure.Course,
// that imports the whole earlier course. Their declaration order here is their
// order in that module, so each level's id (`course-N`) is fixed by position.
const COURSE_LEVELS = [
        {
          title: 'One of the two leaves shows her place',
          theoremName: 'two_leaves_cover_point',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north south : sphere (0 : Space) 1) (different : north ≠ south)
    (place : sphere (0 : Space) 1) :
    place ∈ (stereographic (norm_eq_of_mem_sphere north)).source ∨
      place ∈ (stereographic (norm_eq_of_mem_sphere south)).source`,
          introduction: `Ada holds two drawings of the bead, one made from the north pole and one from the south pole. She picks any point of the bead and asks which drawing shows it. If the point is the north pole, the south drawing has it. Otherwise the north drawing does.

Each source is the sphere with one pole removed, so after ${mathlibDoc('stereographic_source', MATHLIB_DOCS.sphere)} and the membership lemmas from the previous level, the goal reads "\`place ≠ north\` or \`place ≠ south\`". A proof by cases on \`place = north\` (the tactic \`by_cases\`) splits the world in two. In each half, \`left\` or \`right\` chooses which side of the \`∨\` to prove. To prove \`place ≠ south\`, which means \`place = south → False\`, use \`intro\` to assume the equality and derive the contradiction with \`different\`, chaining the two equalities as \`atNorth.symm.trans atSouth\`.

**Objective:** Show that every point of the bead lies in the source of the north chart or in the source of the south chart.`,
          conclusion: `Every point of the bead appears on at least one of Ada's two leaves.`,
          solution: `simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]
by_cases atNorth : place = north
· right
  intro atSouth
  exact different (atNorth.symm.trans atSouth)
· left
  exact atNorth`,
          hints: ['Split on whether the point is the north pole. In each case one of the two leaves must show it.', 'After `simp only` with the source and membership lemmas, use `by_cases atNorth : place = north`, then `right` or `left`; the north case needs `intro` and `different (atNorth.symm.trans atSouth)`.'],
          question: {
            prompt: 'Before proving it: which single point of the bead is missing from the north drawing, and why can the south drawing not miss that same point?',
            answer: 'The north drawing misses exactly the north pole. The south drawing misses exactly the south pole, and the two poles are different points, so no point is missing from both.',
          },
          newTactics: ['by_cases', 'left', 'right', 'intro'],
          newTheorems: ['Eq.symm', 'Eq.trans'],
          newDefinitions: ['Or', 'Ne', 'Not'],
        },
        {
          title: 'The preferred leaf comes from the far pole',
          theoremName: 'sphere_preferred_chart',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    chartAt (EuclideanSpace ℝ (Fin dimension)) place = stereographic' dimension (-place)`,
          introduction: `Ada stands on the bead and asks for the leaf her atlas prefers at her location. Mathlib hands her the projection made from the point directly opposite her, so that her own place lands near the middle of the drawing.

The sphere's ${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} instance in Mathlib chooses \`chartAt\` to be ${mathlibDoc("stereographic'", MATHLIB_DOCS.sphere, "stereographic'")} from the antipodal point \`-place\`. Here \`stereographic'\` is the same projection as before, rewritten to land in \`EuclideanSpace ℝ (Fin dimension)\`, the ordinary coordinate space of the right dimension. The assumption \`Fact (Module.finrank ℝ Space = dimension + 1)\` records that a sphere inside a space of dimension \`dimension + 1\` is itself \`dimension\`-dimensional. Because this is how the instance is defined, the two sides are equal by definition, and \`rfl\` closes the goal.

**Objective:** Show that the chart Mathlib prefers at \`place\` is the stereographic projection from the opposite point.`,
          conclusion: `The abstract \`chartAt\` and the concrete projection are the same leaf.`,
          solution: 'rfl',
          hints: ['The instance was defined by this very formula.', 'Definitional equalities close with `rfl`.'],
          question: {
            prompt: 'Before proving it: if Ada stands at the north pole, which point is the pole of her preferred chart, and where does she herself land on that drawing?',
            answer: 'Her preferred chart projects from the south pole. She stands opposite that pole, so her own position lands at the origin of the drawing.',
          },
          newTactics: ['rfl'],
          newDefinitions: ["stereographic'", 'EuclideanSpace', 'Fact', 'Module.finrank'],
        },
        {
          title: 'Every projection is filed in the atlas',
          theoremName: 'sphere_chart_in_atlas',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (pole : sphere (0 : Space) 1) :
    stereographic' dimension pole ∈ atlas (EuclideanSpace ℝ (Fin dimension)) (sphere (0 : Space) 1)`,
          introduction: `Ada can project the bead from any pole she likes. Each such drawing belongs in her atlas, not only the two she happened to make first.

Mathlib defines the sphere's atlas as the set of all charts of the form \`stereographic' dimension pole\` for some pole: in Lean, membership in ${mathlibDoc('atlas', MATHLIB_DOCS.chartedSpace)} unfolds to the statement "there exists a \`pole\` with \`stereographic' dimension pole = stereographic' dimension pole\`". An existence statement is proved by supplying a witness and a proof, written with angle brackets as \`⟨pole, rfl⟩\`.

**Objective:** Show that the projection from any pole belongs to the sphere's atlas.`,
          conclusion: `Ada's atlas holds one leaf for every pole she could choose.`,
          solution: 'exact ⟨pole, rfl⟩',
          hints: ['The atlas is defined as "all projections from some pole", so exhibit the pole.', 'Use the anonymous constructor `⟨pole, rfl⟩` with `exact`.'],
          newDefinitions: ['Exists'],
        },
        {
          title: 'Changing leaves is a smooth move',
          theoremName: 'chart_change_is_smooth',
          signature: `{Scalar : Type u} [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w} [TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    {order : WithTop ℕ∞} [IsManifold model order Surface]
    (chart chart' : OpenPartialHomeomorph Surface Coordinates)
    (inAtlas : chart ∈ atlas Coordinates Surface)
    (inAtlas' : chart' ∈ atlas Coordinates Surface) :
    chart.symm ≫ₕ chart' ∈ contDiffGroupoid order model`,
          introduction: `Ada compares two leaves from her atlas over the region where both apply. Reading a mark from the first leaf back onto the surface and then onto the second leaf is the transition between the two drawings. On a smooth manifold, this transition never creases.

This level is the definition of a smooth manifold. ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} says the atlas has a structure groupoid: every change of charts \`chart.symm ≫ₕ chart'\` between atlas members belongs to ${mathlibDoc('contDiffGroupoid', MATHLIB_DOCS.isManifold)}, the collection of local maps of the coordinate space that are differentiable to the given \`order\`. The symbol \`≫ₕ\` composes partial homeomorphisms. The field ${mathlibDoc('HasGroupoid.compatible', MATHLIB_DOCS.chartedSpace)} states exactly this, given the two atlas memberships.

**Objective:** Show that the change of coordinates between two atlas charts belongs to the smooth groupoid.`,
          conclusion: `The transition between any two of Ada's leaves is as smooth as the manifold promises.`,
          solution: "exact HasGroupoid.compatible inAtlas inAtlas'",
          hints: ['A smooth manifold is, by definition, an atlas whose chart changes are smooth.', 'The instance field `HasGroupoid.compatible` takes the two atlas memberships.'],
          question: {
            prompt: 'Before proving it: the surface itself has no coordinates. Where does the derivative that "smooth" talks about actually live?',
            answer: 'In the coordinate space. Smoothness is a property of the transition maps between charts, which are maps between open sets of the coordinate space, where derivatives make sense.',
          },
          newTheorems: ['HasGroupoid.compatible'],
          newDefinitions: ['contDiffGroupoid', 'OpenPartialHomeomorph.trans', 'IsManifold', 'ModelWithCorners', 'WithTop'],
        },
        {
          title: 'The smooth move, spelled out in calculus',
          theoremName: 'chart_change_contDiffOn',
          signature: `{Scalar : Type u} [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w} [TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    {order : WithTop ℕ∞} [IsManifold model order Surface]
    (chart chart' : OpenPartialHomeomorph Surface Coordinates)
    (inAtlas : chart ∈ atlas Coordinates Surface)
    (inAtlas' : chart' ∈ atlas Coordinates Surface) :
    ContDiffOn Scalar order (model ∘ (chart.symm ≫ₕ chart') ∘ model.symm)
      (model.symm ⁻¹' (chart.symm ≫ₕ chart').source ∩ Set.range model)`,
          introduction: `Ada wants the previous level in plain calculus. Membership in the smooth groupoid was a label; now she unpacks it into the sentence "this function is differentiable \`order\` times on this set".

${mathlibDoc('ContDiffOn', MATHLIB_DOCS.contDiff)} is Mathlib's differentiability on a set. The function is the transition map wrapped by the \`model\`, which converts the abstract coordinate space \`Coordinates\` into the vector space \`Vectors\` where derivatives live; for ordinary Euclidean coordinates the model is the identity and can be ignored. The set is the transition's domain, seen through that model. Unpacking uses ${mathlibDoc('mem_groupoid_of_pregroupoid', MATHLIB_DOCS.chartedSpace)}, an \`↔\` statement: membership in the groupoid is equivalent to the conjunction of this condition for the map and for its inverse. An \`↔\` has two directions, \`.mp\` (left to right) and \`.mpr\` (right to left), and a conjunction's first part is \`.1\`. The tactic \`have\` names an intermediate fact so the next line can use it.

**Objective:** Show that the change of coordinates between two atlas charts is differentiable to the manifold's order on its domain.`,
          conclusion: `The word "smooth" now means a concrete differentiability statement about a concrete map.`,
          solution: `have compatible := HasGroupoid.compatible (G := contDiffGroupoid order model) inAtlas inAtlas'
exact (mem_groupoid_of_pregroupoid.mp compatible).1`,
          hints: ['Groupoid membership is a pair of differentiability facts, one for the map and one for its inverse.', 'Name the membership with `have`, then take the first component of `mem_groupoid_of_pregroupoid.mp`.'],
          newTactics: ['have'],
          newTheorems: ['mem_groupoid_of_pregroupoid'],
          newDefinitions: ['ContDiffOn', 'Set.range', 'Set.preimage', 'Set.inter', 'And', 'Iff', 'Iff.mp', 'Iff.mpr'],
        },
        {
          title: 'Two drawings of the bead agree smoothly',
          theoremName: 'sphere_chart_change_smooth',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (pole pole' : sphere (0 : Space) 1) :
    (stereographic' dimension pole).symm ≫ₕ stereographic' dimension pole' ∈
      contDiffGroupoid ∞ (𝓡 dimension)`,
          introduction: `Ada returns to the bead with the general fact in hand. Two of her projections, from any two poles, overlap on most of the bead. Reading one drawing into the other must be a smooth map of the plane.

Mathlib proves that the sphere is a smooth manifold, and that instance is enough. The model here is \`𝓡 dimension\`, Mathlib's notation for the identity model on \`EuclideanSpace ℝ (Fin dimension)\`, and \`∞\` asks for derivatives of every finite order. The general fact ${mathlibDoc('HasGroupoid.compatible', MATHLIB_DOCS.chartedSpace)} applies once both projections are known to be atlas members, which is the course theorem \`sphere_chart_in_atlas\` from the atlas world. Coordinates for the projection change are computed by ${mathlibDoc("stereographic'_symm_apply", MATHLIB_DOCS.sphere, "stereographic'_symm_apply")}, but no computation is needed here.

**Objective:** Show that the coordinate change between two stereographic projections of the sphere is smooth.`,
          conclusion: `Ada's two drawings of the bead translate into each other without a crease, which is what makes the bead a smooth manifold.`,
          solution: "exact HasGroupoid.compatible (sphere_chart_in_atlas pole) (sphere_chart_in_atlas pole')",
          hints: ['The sphere is a smooth manifold, so the general fact about atlas members applies.', 'Feed `HasGroupoid.compatible` the two memberships `sphere_chart_in_atlas pole` and `sphere_chart_in_atlas pole\'`.'],
          question: {
            prompt: 'Before proving it: in the plane, the change between the north and south drawings sends a point at distance r from the origin to a point at distance 4/r (with Mathlib\'s scaling). Where does that formula fail, and why does it not matter?',
            answer: 'It fails at r = 0, the image of the far pole. That point is missing from the other drawing anyway, so it is not in the overlap where the transition is defined.',
          },
          newDefinitions: ['modelWithCornersSelf'],
        },
        {
          title: 'Leaving the bead for the room around it',
          theoremName: 'sphere_inclusion_smooth',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)] :
    ContMDiff (𝓡 dimension) 𝓘(ℝ, Space) ∞ ((↑) : sphere (0 : Space) 1 → Space)`,
          introduction: `Ada has only ever measured positions on the bead. The bead also sits in the room, and each of her positions is a point of the room. Forgetting the bead and remembering only the room point should be a smooth operation.

${mathlibDoc('ContMDiff', MATHLIB_DOCS.contMDiff)} is smoothness for a map between two manifolds, each with its own model: \`𝓡 dimension\` for the sphere and \`𝓘(ℝ, Space)\`, the identity model, for the surrounding vector space. The map \`(↑)\` is the inclusion that forgets the constraint \`‖place‖ = 1\`. Mathlib records its smoothness as ${mathlibDoc('contMDiff_coe_sphere', MATHLIB_DOCS.sphere)}.

**Objective:** Show that the inclusion of the sphere into the surrounding space is smooth as a map between manifolds.`,
          conclusion: `Ada's first smooth map between manifolds sends the bead into the room without a kink.`,
          solution: 'exact contMDiff_coe_sphere',
          hints: ['Mathlib proves that the inclusion of the sphere is a smooth map of manifolds.', 'The theorem is `contMDiff_coe_sphere`.'],
          newTheorems: ['contMDiff_coe_sphere'],
          newDefinitions: ['ContMDiff', 'Subtype.val'],
        },
        {
          title: 'Her velocities are real vectors',
          theoremName: 'tangent_vectors_are_vectors',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    Function.Injective
      (mfderiv (𝓡 dimension) 𝓘(ℝ, Space) ((↑) : sphere (0 : Space) 1 → Space) place)`,
          introduction: `Ada picks a velocity at her place on the bead. Since the bead sits in the room, that velocity is also a velocity in the room. Two different velocities on the bead must stay different in the room; nothing is flattened away.

The derivative of a smooth map between manifolds is ${mathlibDoc('mfderiv', MATHLIB_DOCS.mfderiv)}. At \`place\`, it is a linear map from \`TangentSpace (𝓡 dimension) place\` to the tangent space of the room, which is the room itself. ${mathlibDoc('Function.Injective', MATHLIB_DOCS.function)} says this linear map loses nothing, and ${mathlibDoc('mfderiv_coe_sphere_injective', MATHLIB_DOCS.sphere)} proves it for the inclusion of the sphere.

**Objective:** Show that the derivative of the inclusion at \`place\` is injective, so tangent vectors of the sphere are genuine vectors of the surrounding space.`,
          conclusion: `Every abstract tangent vector at Ada's place is a real vector in the room, and different ones stay different.`,
          solution: 'exact mfderiv_coe_sphere_injective place',
          hints: ['The derivative of the inclusion embeds each tangent space into the room.', 'The theorem is `mfderiv_coe_sphere_injective` applied to `place`.'],
          newTheorems: ['mfderiv_coe_sphere_injective'],
          newDefinitions: ['mfderiv', 'Function.Injective'],
        },
        {
          title: 'The tangent plane stands square to the radius',
          theoremName: 'tangent_plane_is_orthogonal',
          signature: `{Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    LinearMap.range (ContinuousLinearMap.toLinearMap
      (mfderiv (𝓡 dimension) 𝓘(ℝ, Space) ((↑) : sphere (0 : Space) 1 → Space) place))
      = (ℝ ∙ (place : Space))ᗮ`,
          introduction: `Ada asks which room vectors her bead velocities become. She expects exactly the vectors that lie flat against the bead at her place: perpendicular to the line from the center through her feet.

The image of the derivative is ${mathlibDoc('LinearMap.range', MATHLIB_DOCS.linearMap)}; the derivative is a continuous linear map, and \`ContinuousLinearMap.toLinearMap\` forgets the continuity so that \`range\` applies. The line through \`place\` is the span \`ℝ ∙ (place : Space)\`, and \`ᗮ\` (type \`\\perp\`) is its ${mathlibDoc('Submodule.orthogonal', MATHLIB_DOCS.orthogonal)} complement. Mathlib's ${mathlibDoc('range_mfderiv_coe_sphere', MATHLIB_DOCS.sphere)} identifies the two. This is the tangent plane drawn in the scene, now as a theorem.

**Objective:** Show that the tangent vectors at \`place\`, seen in the room, are exactly the vectors orthogonal to \`place\`.`,
          conclusion: `The tangent plane at Ada's place is the plane perpendicular to her radius, exactly as the picture suggested.`,
          solution: 'exact range_mfderiv_coe_sphere place',
          hints: ['The tangent plane of a sphere is perpendicular to the radius, and Mathlib says so about the range of the derivative.', 'The theorem is `range_mfderiv_coe_sphere` applied to `place`.'],
          question: {
            prompt: 'Before proving it: the sphere in a space of dimension d+1 has tangent spaces of which dimension, and how does the orthogonal complement of one vector confirm it?',
            answer: 'Dimension d. The orthogonal complement of a single nonzero vector in a (d+1)-dimensional space has dimension d.',
          },
          newTheorems: ['range_mfderiv_coe_sphere'],
          newDefinitions: ['LinearMap.range', 'ContinuousLinearMap.toLinearMap', 'Submodule.span', 'Submodule.orthogonal'],
        },
        {
          title: 'Two angles, one pointer position',
          theoremName: 'same_point_iff_full_turns',
          signature: `(first second : ℝ) :
    Circle.exp first = Circle.exp second ↔
      ∃ turns : ℤ, first = second + turns * (2 * Real.pi)`,
          introduction: `Ada records the dial with two different angle readings and sees the pointer in the same place. The only way that can happen is that the two readings differ by some whole number of full turns.

This is the exact rule for when two angle coordinates name the same circle point, and it is why an angle is a local chart rather than a global one. Mathlib states it as ${mathlibDoc('Circle.exp_eq_exp', MATHLIB_DOCS.circle)}: the positions agree if and only if the angles differ by an integer multiple of \`2 * Real.pi\`. The integer is coerced to a real number in the statement.

**Objective:** Show that two angles give the same pointer position exactly when they differ by a whole number of turns.`,
          conclusion: `An angle chart of the dial is honest on any arc shorter than a full turn, and on the whole circle it repeats.`,
          solution: 'exact Circle.exp_eq_exp',
          hints: ['Angles that agree on the circle differ by whole turns.', 'The two-way statement is `Circle.exp_eq_exp`.'],
          question: {
            prompt: 'Before proving it: how long can an arc of the dial be before one angle reading stops being a chart of it?',
            answer: 'Strictly less than a full turn. On an arc of length 2π or more, two different angles would name the same point, so the reading is no longer one-to-one.',
          },
          newTheorems: ['Circle.exp_eq_exp'],
          newDefinitions: ['Iff', 'Int'],
        },
]

// Take level `number` of a Lean module's list for a game world, keeping the
// module and number that fix its id and reference declaration.
function pick(moduleLevels, leanWorld, number, overrides = {}) {
  return { ...moduleLevels[number - 1], leanWorld, leanNumber: number, ...overrides }
}

function course(number, overrides = {}) {
  return pick(COURSE_LEVELS, 'Course', number, overrides)
}

const game = {
  source: {
    repository: 'https://github.com/cauli/lean4-wasm-in-browser',
    commit: `mathlib-manifolds-${MATHLIB_COMMIT.slice(0, 10)}-r5`,
    license: 'Apache-2.0 for Mathlib; original course text in this repository',
    toolchain: `cauli/lean4@${LEAN_COMMIT.slice(0, 10)} (upstream ${LEAN_UPSTREAM_COMMIT.slice(0, 10)})`,
    mathlibCommit: MATHLIB_COMMIT,
    importedAt: '2026-07-29T00:00:00.000Z',
  },
  title: 'The Manifold Adventure',
  introduction: `# The Manifold Adventure

Ada is an ant, so she can only inspect her world from the inside. Manifold theory takes the same point of view: understand the whole space through local coordinates.

The main path is short and concrete. It starts with one chart, moves at once to a sphere that no single chart can cover, then builds the general words: an ${mathlibDoc('atlas', MATHLIB_DOCS.chartedSpace)} of charts, smooth changes between them (${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)}), and the ${mathlibDoc('TangentSpace', MATHLIB_DOCS.isManifold)} of velocities at a point. Every word is checked on the sphere before it is stated in general. Optional paths go deeper into Mathlib's chart instances, regularity orders, circular motion, and a two-joint robot arm whose configuration space is a torus.`,
  information: `The formal sources are in \`lean/ManifoldAdventure/\`. Each world module imports the smallest Mathlib area it needs, from homeomorphisms through smooth manifolds, at pinned Mathlib commit \`${MATHLIB_COMMIT}\`. The browser loads their union once, so every level shares one Lean environment and switching worlds costs nothing.

Hints are staged. The first gives a conceptual nudge, the second names the tool, and the third contains the full solution. A tactic may appear as new in more than one level when optional branches make the first encounter order-dependent.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.`,
  caption: 'A kernel-checked course on Mathlib topology and manifolds, with optional paths through map projections and robot motion.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Charts',
      'One trail, one leaf',
      `# One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing. A ${mathlibDoc('Homeomorph', MATHLIB_DOCS.homeomorph)} is Mathlib's bundled version of such a correspondence: an equivalence together with continuity proofs in both directions.

The trail soon climbs onto a rounded stone. From where Ada stands she can survey only the patch around her, so she draws just the part she can see. Mathlib represents one local chart by ${mathlibDoc('OpenPartialHomeomorph', MATHLIB_DOCS.openPartialHomeomorph)}: it has a \`source\` on the stone, a \`target\` in the drawing, and inverse laws that apply inside the patch.

Glossary for this course: a leaf is a chart, the shaded patch is its \`source\`, the drawing is its \`target\`, a stack of leaves is an atlas, and the stone or bead is the manifold. The first level names its instance assumptions, such as \`trailTopology\`, so the lesson can point at them. Later levels leave them anonymous, which is ordinary Lean style.`,
      [],
      [
        {
          ...withAside(HOMEOMORPHISM_LEVELS[0], `Three more facts about \`trailMap\` ride along in the same bundle and join the inventory now: the reverse map \`trailMap.symm\` is continuous, ${mathlibDoc('Homeomorph.continuous_symm', MATHLIB_DOCS.homeomorph)}; the round trip \`trailMap.symm (trailMap place) = place\` is ${mathlibDoc('Homeomorph.symm_apply_apply', MATHLIB_DOCS.homeomorph)}; and composing two such maps applies them in order, ${mathlibDoc('Homeomorph.trans_apply', MATHLIB_DOCS.homeomorph)}.`),
          leanWorld: 'Homeomorphisms',
          leanNumber: 1,
          newTheorems: ['Homeomorph.continuous', 'Homeomorph.continuous_symm', 'Homeomorph.symm_apply_apply', 'Homeomorph.trans_apply'],
          newDefinitions: ['TopologicalSpace', 'Homeomorph', 'Continuous', 'Homeomorph.symm', 'Homeomorph.trans', 'Eq'],
        },
        {
          ...withAside(LOCAL_CHART_LEVELS[2], `Two chart facts come along without their own levels: the shaded patch \`chart.source\` is open, stored as ${mathlibDoc('OpenPartialHomeomorph.open_source', MATHLIB_DOCS.openPartialHomeomorph)}, and the chart is continuous on that patch, stored as ${mathlibDoc('OpenPartialHomeomorph.continuousOn', MATHLIB_DOCS.openPartialHomeomorph)}. Both are in the inventory.`),
          leanWorld: 'LocalCharts',
          leanNumber: 3,
          newTheorems: ['OpenPartialHomeomorph.map_source', 'OpenPartialHomeomorph.open_source', 'OpenPartialHomeomorph.continuousOn'],
          newDefinitions: ['OpenPartialHomeomorph.target', 'Membership.mem', 'OpenPartialHomeomorph', 'OpenPartialHomeomorph.source', 'IsOpen', 'ContinuousOn'],
          question: {
            prompt: 'Before proving it: why does a chart need a source at all? What goes wrong if Ada tries to draw the whole stone on one leaf?',
            answer: 'A leaf is flat and the stone is closed, so no single continuous one-to-one drawing of the whole stone fits on a leaf. Restricting to a patch is what makes the chart possible.',
          },
        },
        { ...LOCAL_CHART_LEVELS[3], leanWorld: 'LocalCharts', leanNumber: 4 },
        { ...LOCAL_CHART_LEVELS[4], leanWorld: 'LocalCharts', leanNumber: 5 },
      ],
    ),
    makeWorld(
      'Sphere',
      'One pole is missing',
      `# A round world on a flat leaf

Ada finds a glass bead near the trail. She wants to copy its surface onto a leaf, but one drawing cannot include the point where she holds the bead. She makes a second drawing from the other pole to cover the gap. This is the whole reason manifolds need atlases, so the course meets it before it meets the general words.

Mathlib builds the drawing as ${mathlibDoc('stereographic', MATHLIB_DOCS.sphere)}, an \`OpenPartialHomeomorph\` from the unit sphere to a flat plane. Try the projection lab below: drag Ada around the bead and watch her mark race off the leaf as she nears the pole, then switch poles and compare the two readings of the same point. The levels prove what the lab shows, and introduce the case-splitting tactics they need on the way to the covering proof.`,
      ['Charts'],
      [
        {
          ...withAside(MAP_PROJECTION_LEVELS[0], `One more fact rides along: every mark on the leaf comes from some point of the bead, ${mathlibDoc('surjective_stereographic', MATHLIB_DOCS.sphere)}, so no coordinate on the drawing is wasted. It is in the inventory.`),
          leanWorld: 'MapProjections',
          leanNumber: 1,
          newTheorems: ['stereographic_source', 'surjective_stereographic'],
          question: {
            prompt: 'Before proving it: as Ada walks toward the pole she is projecting from, what happens to her mark on the leaf?',
            answer: 'It runs off toward infinity. The pole itself has no mark, which is why it must be removed from the chart\'s source.',
          },
        },
        pick(MAP_PROJECTION_LEVELS, 'MapProjections', 2),
        pick(MAP_PROJECTION_LEVELS, 'MapProjections', 4),
        course(1),
        pick(MAP_PROJECTION_LEVELS, 'MapProjections', 5, { newTactics: ['ext'], newTheorems: ['Set.mem_union', 'Set.mem_univ', 'iff_true'] }),
      ],
    ),
    makeWorld(
      'ChartedSpaces',
      'A stack of maps',
      `# A stack of maps

The bead needed two leaves; a rougher stone may need many. Ada keeps her leaves together as her atlas, and for every place she stands she has a preferred leaf that shows it.

The class ${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} equips a surface with an atlas and a preferred chart \`chartAt\` for each point. The goals call the actual world \`Surface\`, the shared coordinate space \`Coordinates\`, and Ada's location \`place\`. Mathlib often writes the same three objects as \`M\`, \`H\`, and \`x\`. The last two levels return to the bead and identify its preferred leaves with the projections of the previous world. The angle lab below shows the same idea on a circle: two arcs, each with its own angle reading, and an overlap where the readings differ by a fixed shift.`,
      ['Sphere'],
      [
        {
          ...withAside(CHARTED_SPACE_LEVELS[0], `Two neighbouring facts join the inventory here: the preferred leaf is one of the leaves in the atlas, ${mathlibDoc('chart_mem_atlas', MATHLIB_DOCS.chartedSpace)}, and its shaded patch contains a whole neighbourhood of \`place\`, ${mathlibDoc('chart_source_mem_nhds', MATHLIB_DOCS.chartedSpace)}. The second is stated with the neighbourhood filter \`𝓝 place\`, which is a collection of sets, so \`source ∈ 𝓝 place\` says that the source contains an open set around \`place\`.`),
          leanWorld: 'ChartedSpaces',
          leanNumber: 1,
          newTheorems: ['mem_chart_source', 'chart_mem_atlas', 'chart_source_mem_nhds'],
          newDefinitions: ['ChartedSpace', 'chartAt', 'atlas', 'nhds'],
        },
        pick(CHARTED_SPACE_LEVELS, 'ChartedSpaces', 3),
        pick(CHARTED_SPACE_LEVELS, 'ChartedSpaces', 5),
        course(2),
        course(3),
      ],
    ),
    makeWorld(
      'SmoothManifolds',
      'Smooth manifolds',
      `# When chart changes are smooth

Ada's leaves overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives. That change is the only place where "smooth" can be defined, because the surface itself has no coordinates.

Mathlib's ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} adds exactly this condition to a \`ChartedSpace\`. Three words appear in the goals and deserve a plain reading. \`Scalar\` is the number field; read it as \`ℝ\`. \`ModelWithCorners\` connects the coordinate space to the vector space where derivatives live; for ordinary Euclidean coordinates it is the identity, written \`𝓡 n\` or \`𝓘(ℝ, E)\`, and corners only matter for manifolds with boundary. \`order : WithTop ℕ∞\` is how many derivatives are required: a number, \`∞\` for all finite orders, or \`ω\` for analytic. The world states the definition in general, checks it on the bead, and ends with the torus as a product.`,
      ['ChartedSpaces'],
      [
        {
          ...withAside(SMOOTH_MANIFOLD_LEVELS[0], `Two related facts join the inventory: a smooth atlas is also a continuous atlas, so \`IsManifold model 0 Surface\` follows from any higher order, and the model coordinate space is itself a manifold at every order, ${mathlibDoc('instIsManifoldModelSpace', MATHLIB_DOCS.isManifold)}. The optional "How smooth is smooth" world proves these.`),
          leanWorld: 'SmoothManifolds',
          leanNumber: 1,
          newTactics: ['rw'],
          newTheorems: ['OpenPartialHomeomorph.trans_source', 'OpenPartialHomeomorph.symm_source', 'instIsManifoldModelSpace'],
        },
        course(4),
        course(5),
        course(6),
        pick(SMOOTH_MANIFOLD_LEVELS, 'SmoothManifolds', 5, { newTactics: [] }),
      ],
    ),
    makeWorld(
      'TangentSpaces',
      'A direction at every point',
      `# A direction at every point

Ada's atlas tells her where she is. At one point on the surface, she now asks which directions she could move without leaving it. On the bead the answer is visible: a plane touching the bead at her feet, square to the radius. The world builds that picture as theorems.

Mathlib assigns a ${mathlibDoc('TangentSpace', MATHLIB_DOCS.isManifold)} to every point, and the derivative of a smooth map between manifolds, ${mathlibDoc('mfderiv', MATHLIB_DOCS.mfderiv)}, carries velocities from one tangent space to another. In the goals, \`Surface\` is Ada's world, \`place\` is her location, \`model\` describes its coordinates, and \`velocity\` is a tangent vector there. Drag the point in the tangent lab below to see the plane follow it around the bead.`,
      ['SmoothManifolds'],
      [
        {
          ...withAside(TANGENT_SPACE_LEVELS[0], `The ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} collects each place together with one of its velocities as a dependent pair \`⟨place, velocity⟩\`. This level constructs one velocity at one point; it does not yet define the zero section as a function of the point.`),
          leanWorld: 'TangentSpaces',
          leanNumber: 1,
        },
        pick(TANGENT_SPACE_LEVELS, 'TangentSpaces', 2, { newTactics: [] }),
        course(7),
        course(8),
        course(9),
      ],
    ),
    makeWorld(
      'CanonicalCharts',
      'Identity and product charts',
      `# Charts Lean already knows

Ada sets two identical reference grids on top of each other before returning to the curved surface. One maps to the other without moving a mark. A place with two independent readings needs a pair of maps.

Mathlib supplies canonical ${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} instances for self charts and products. Here the goal names the two torus factors \`FirstSurface\` and \`SecondSurface\`, together with their coordinate spaces. The types determine which instance Lean uses, even though the notation \`chartAt\` stays the same. The shape gallery below is optional; some objects return in the levels, while others preview later topology.`,
      ['ChartedSpaces'],
      CANONICAL_CHART_LEVELS.map((level, index) => pick(CANONICAL_CHART_LEVELS, 'CanonicalCharts', index + 1)),
    ),
    makeWorld(
      'SmoothOrders',
      'How smooth is smooth',
      `# Counting derivatives

Ada checks her map changes against standards of different strictness. A leaf change that passes a demanding test passes every easier one, and the model leaf passes them all.

These three levels spell out how Mathlib's ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} orders relate: the model space is a manifold at every order, a higher order implies a lower one, and a smooth atlas is in particular a topological one. The order \`0\` here is a regularity order, not a dimension.`,
      ['SmoothManifolds'],
      [
        pick(SMOOTH_MANIFOLD_LEVELS, 'SmoothManifolds', 2),
        pick(SMOOTH_MANIFOLD_LEVELS, 'SmoothManifolds', 3, { newTactics: ['intro'] }),
        pick(SMOOTH_MANIFOLD_LEVELS, 'SmoothManifolds', 4),
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
        pick(CIRCLE_MOTION_LEVELS, 'CircleMotion', 1),
        pick(CIRCLE_MOTION_LEVELS, 'CircleMotion', 2),
        pick(CIRCLE_MOTION_LEVELS, 'CircleMotion', 3),
        course(10),
        pick(CIRCLE_MOTION_LEVELS, 'CircleMotion', 4),
      ],
    ),
    makeWorld(
      'RobotArm',
      'Two hinges, one reach',
      `# Where the arm can reach

Inside the field box, Ada finds a small arm with two rotating hinges. Each hinge position lies on Mathlib's ${mathlibDoc('Circle', MATHLIB_DOCS.circle)}, and reading both rings at once gives one point of \`Circle × Circle\`. This is the arm's configuration space, a concrete torus and the product manifold of the main path. A value of a product type is written with plain parentheses, as in \`(shoulder, elbow)\`.

We represent the work surface by \`ℂ\`, viewed as a plane. The first link points in the shoulder direction. The second link turns by the shoulder and elbow angles together.`,
      ['CircleMotion'],
      ROBOT_ARM_LEVELS.map((level, index) => pick(ROBOT_ARM_LEVELS, 'RobotArm', index + 1)),
    ),
    makeWorld(
      'RobotReachability',
      'Can the arm touch it?',
      `# The ring of reach

Ada sees a crumb on the work surface and asks a practical question before turning either hinge: can the tip touch it at all? The two bars can stretch only so far, and when one is longer, folding the shorter bar leaves a gap near the base.

For nonnegative lengths \`firstLength\` and \`secondLength\`, every endpoint lies between the radii \`|firstLength - secondLength|\` and \`firstLength + secondLength\`. Each link direction is a point of Mathlib's ${mathlibDoc('Circle', MATHLIB_DOCS.circle)}, while the endpoint lies in the complex plane. The interactive lab turns those inequalities into a shaded annulus. Drag the target to see the two inverse-kinematics poses meet at its boundaries.

The three-link switch is an outlook. An extra hinge can close the central gap and turns isolated solutions into a continuous family. The Lean levels keep their formal argument on the two-link arm, where the obstruction is already useful and precise.`,
      ['RobotArm'],
      ROBOT_REACHABILITY_LEVELS.map((level, index) => pick(ROBOT_REACHABILITY_LEVELS, 'RobotReachability', index + 1, {
        // `simpa` used to arrive from the identity-chart world, which is now
        // optional, so the folded-arm level unlocks it itself.
        ...(index === 1 ? { newTactics: [...(level.newTactics || []), 'simpa'] } : {}),
      })),
    ),
  ],
}

const levels = game.worlds.flatMap((world) => world.levels)
// The leaves of the course-import graph. Importing them reaches every world
// module, so all levels can share ONE resident Lean environment: the browser
// keys environments by the exact header import set, and per-world headers made
// every world switch re-pay the full multi-minute Mathlib import.
const importedByOtherWorlds = new Set(
  Object.values(WORLD_MODULES).flatMap((config) => config.courseImports || []),
)
const contextImports = Object.values(WORLD_MODULES)
  .map(({ module }) => module)
  .filter((module) => !importedByOtherWorlds.has(module))
const verifier = {
  baseModule: BASE_MODULE,
  leanCommit: LEAN_COMMIT,
  leanUpstreamCommit: LEAN_UPSTREAM_COMMIT,
  mathlibCommit: MATHLIB_COMMIT,
  contextImports,
  levels: Object.fromEntries(levels.map((level) => [
    level.id,
    {
      sourcePath: level.sourcePath,
      fullModule: WORLD_MODULES[level.leanWorld].module,
      contextModule: WORLD_MODULES[level.leanWorld].module,
      namespaces: [NAMESPACE],
      openCommands: WORLD_MODULES[level.leanWorld].openCommands,
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
// Lean sources are emitted per MODULE, not per game world. A game world may
// pick levels from several modules and skip others, but each module's
// declaration list must stay exactly as compiled into the deployed layers.
const MODULE_LEVELS = {
  Homeomorphisms: HOMEOMORPHISM_LEVELS,
  LocalCharts: LOCAL_CHART_LEVELS,
  ChartedSpaces: CHARTED_SPACE_LEVELS,
  CanonicalCharts: CANONICAL_CHART_LEVELS,
  SmoothManifolds: SMOOTH_MANIFOLD_LEVELS,
  TangentSpaces: TANGENT_SPACE_LEVELS,
  MapProjections: MAP_PROJECTION_LEVELS,
  CircleMotion: CIRCLE_MOTION_LEVELS,
  RobotArm: ROBOT_ARM_LEVELS,
  RobotReachability: ROBOT_REACHABILITY_LEVELS,
  Course: COURSE_LEVELS,
}
const leanWorlds = Object.entries(MODULE_LEVELS).map(([id, definitions]) => ({
  id,
  title: MODULE_TITLES[id],
  levels: definitions.map((def, index) => makeLevel(id, index + 1, def)),
}))
for (const world of leanWorlds) {
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
