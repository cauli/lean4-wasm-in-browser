#!/usr/bin/env node

import fs from 'node:fs'

const gameOutputUrl = new URL('../src/game/manifolds.generated.json', import.meta.url)
const verifierOutputUrl = new URL('../src/game/manifolds-verifier.generated.json', import.meta.url)
const leanOutputRootUrl = new URL('../lean/', import.meta.url)

const LEAN_COMMIT = '62b6a2291302d4bbeace37642a066b7510d0145c'
const LEAN_UPSTREAM_COMMIT = 'ecf55de08b9d855e749f80c491c6f294dd307e60'
const MATHLIB_COMMIT = 'de3a9cf33016bbb6d15880d7680643f7ca2d25ba'
const BASE_MODULE = 'ManifoldAdventure.BrowserBase'
const NAMESPACE = 'ManifoldAdventure'
const WORLD_MODULES = {
  Homeomorphisms: {
    module: 'ManifoldAdventure.Homeomorphisms',
    mathlibImport: 'Mathlib.Topology.Homeomorph.Defs',
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  LocalCharts: {
    module: 'ManifoldAdventure.LocalCharts',
    mathlibImport: 'Mathlib.Topology.OpenPartialHomeomorph.Defs',
    courseImport: 'ManifoldAdventure.Homeomorphisms',
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  ChartedSpaces: {
    module: 'ManifoldAdventure.ChartedSpaces',
    mathlibImport: 'Mathlib.Geometry.Manifold.ChartedSpace',
    courseImport: 'ManifoldAdventure.LocalCharts',
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  CanonicalCharts: {
    module: 'ManifoldAdventure.CanonicalCharts',
    mathlibImport: 'Mathlib.Geometry.Manifold.ChartedSpace',
    courseImport: 'ManifoldAdventure.ChartedSpaces',
    openCommands: ['open scoped Topology', 'open Filter'],
  },
  SmoothManifolds: {
    module: 'ManifoldAdventure.SmoothManifolds',
    mathlibImport: 'Mathlib.Geometry.Manifold.IsManifold.Basic',
    courseImport: 'ManifoldAdventure.CanonicalCharts',
    openCommands: ['open scoped Topology ContDiff', 'open Filter ENat'],
  },
  TangentSpaces: {
    module: 'ManifoldAdventure.TangentSpaces',
    mathlibImport: 'Mathlib.Geometry.Manifold.IsManifold.Basic',
    courseImport: 'ManifoldAdventure.SmoothManifolds',
    openCommands: ['open scoped Topology ContDiff', 'open Filter ENat'],
  },
}
const MATHLIB_DOCS = {
  homeomorph: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html',
  openPartialHomeomorph: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html',
  chartedSpace: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html',
  isManifold: 'https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html',
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

function makeLevel(world, number, level) {
  const lesson = lessonText(level.introduction, level.statementText)
  const worldModule = WORLD_MODULES[world]
  if (!worldModule) throw new Error(`No Lean module configured for ${world}.`)

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
    hints: level.hints,
    newTactics: level.newTactics || [],
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

Ada is an ant, so she can only inspect her world from the inside. Manifold theory takes the same point of view: understand the whole space through local coordinates.

The course uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the start. First come [\`Homeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) and [\`OpenPartialHomeomorph\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). Then you build a [\`ChartedSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) from an [\`atlas\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) and [\`chartAt\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt). The last worlds introduce [\`ModelWithCorners\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners), [\`IsManifold\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold), [\`TangentSpace\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace), and [\`TangentBundle\`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle).`,
  information: `The formal sources are in \`lean/ManifoldAdventure/\`. Each world imports the smallest Mathlib area it needs, from homeomorphisms through smooth manifolds, at pinned Mathlib commit \`${MATHLIB_COMMIT}\`.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.`,
  caption: 'A kernel-checked course on Mathlib homeomorphisms, local charts, atlases, smooth manifolds, products, and tangent bundles.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Homeomorphisms',
      'Homeomorphisms',
      `# One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing.

A ${mathlibDoc('Homeomorph', MATHLIB_DOCS.homeomorph)} is Mathlib's bundled version of such a correspondence. In the goals, \`Trail\` is the actual path, \`Drawing\` is the inked route rather than the whole leaf, and \`trailMap\` connects them. The structure contains an equivalence and continuity proofs in both directions.`,
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
          hints: ['The forward continuity proof is a field of `trailMap`.', 'Close the goal with `exact trailMap.continuous`.'],
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
          hints: ['The inverse field sits next to `trailMap.continuous`.', 'Try `exact trailMap.continuous_symm`.'],
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
          hints: ['The unlocked theorem is `Homeomorph.symm_apply_apply`.', 'In dot notation, write `exact trailMap.symm_apply_apply place`.'],
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

Here \`trailMap\` goes from the actual \`Trail\` to the \`Drawing\`, while \`bookMap\` transfers that drawing into the \`RouteBook\`. Mathlib composes them with \`trailMap.trans bookMap\`. The pointwise rule is ${mathlibDoc('Homeomorph.trans_apply', MATHLIB_DOCS.homeomorph)}.

**Objective:** Show that the composed map sends \`place\` first through \`trailMap\` and then through \`bookMap\`.`,
          conclusion: `The two drawings now behave like one map from the trail to the route book.`,
          solution: 'exact Homeomorph.trans_apply trailMap bookMap place',
          hints: ['This step uses the fully qualified theorem name.', 'Try `exact Homeomorph.trans_apply trailMap bookMap place`.'],
          newTheorems: ['Homeomorph.trans_apply'],
          newDefinitions: ['Homeomorph.trans'],
        },
      ],
    ),
    makeWorld(
      'LocalCharts',
      'Open partial homeomorphisms',
      `# A chart only sees a patch

The trail soon climbs onto a rounded stone. Ada cannot press the whole curved surface onto one leaf without distortion, so she draws only the patch around her.

Mathlib represents one local chart by ${mathlibDoc('OpenPartialHomeomorph', MATHLIB_DOCS.openPartialHomeomorph)}. In these goals, \`Stone\` is the curved surface, \`Drawing\` is Ada's coordinate picture, and \`chart\` connects only the part she has drawn. It has a \`source\` on the stone, a \`target\` in the drawing, and inverse laws that apply inside the patch.`,
      ['Homeomorphisms'],
      [
        {
          title: 'Room around every place',
          theoremName: 'local_chart_source_open',
          signature: `{Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) : IsOpen chart.source`,
          introduction: `Ada shades the usable part of the stone on her leaf. Every included spot needs a little room around it, so the drawing does not stop at Ada's feet.

In Lean, \`chart.source\` is the shaded part of \`Stone\`. Requiring that patch to be open formalizes the room around each included point. An ${mathlibDoc('OpenPartialHomeomorph', MATHLIB_DOCS.openPartialHomeomorph)} stores the proof as \`chart.open_source\`.

**Objective:** Prove that the chart's source is an open set.`,
          conclusion: `The shaded patch is open, so every point in it has some room around it.`,
          solution: 'exact chart.open_source',
          hints: ['The openness proof is the structure projection `chart.open_source`.'],
          newTheorems: ['OpenPartialHomeomorph.open_source'],
          newDefinitions: ['OpenPartialHomeomorph', 'OpenPartialHomeomorph.source', 'IsOpen'],
        },
        {
          title: 'No jumps inside the patch',
          theoremName: 'local_chart_continuous',
          signature: `{Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) :
    ContinuousOn chart chart.source`,
          introduction: `Ada walks inside the shaded patch while her mark moves across the leaf. Within that patch, neither motion should jump.

Because \`chart\` covers only part of \`Stone\`, Mathlib asks for \`ContinuousOn chart chart.source\` rather than continuity everywhere. The bundled proof is ${mathlibDoc('OpenPartialHomeomorph.continuousOn', MATHLIB_DOCS.openPartialHomeomorph)}.

**Objective:** Prove that the chart is continuous wherever its local coordinates are valid.`,
          conclusion: `The chart only promises continuity inside the patch where it is valid.`,
          solution: 'exact chart.continuousOn',
          hints: ['The needed field is `chart.continuousOn`.'],
          newTheorems: ['OpenPartialHomeomorph.continuousOn'],
          newDefinitions: ['ContinuousOn'],
        },
        {
          title: 'Her mark lands in the drawing',
          theoremName: 'local_chart_maps_source',
          signature: `{Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
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
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (place : Stone) (inPatch : place ∈ chart.source) :
    chart.symm (chart place) = place`,
          introduction: `Ada marks a place in her local drawing and traces it back onto the stone. The round trip is reliable only because that place lies inside the patch she drew.

For a partial homeomorphism, the inverse law needs \`inPatch : place ∈ chart.source\`. This is the formal bridge between "Ada drew this place" and the side condition in Mathlib's ${mathlibDoc('OpenPartialHomeomorph.left_inv', MATHLIB_DOCS.openPartialHomeomorph)}.

**Objective:** Show that a source point returns to itself after passing through the chart and its inverse.`,
          conclusion: `Inside her patch, Ada can move from stone to leaf and back without losing her place.`,
          solution: 'exact chart.left_inv inPatch',
          hints: ['Give `chart.left_inv` the source-membership proof `inPatch`.'],
          newTheorems: ['OpenPartialHomeomorph.left_inv'],
          newDefinitions: ['OpenPartialHomeomorph.symm'],
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
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    place ∈ (chartAt Coordinates place).source`,
          introduction: `Wherever Ada stops, she selects a leaf whose shaded patch contains her current position. A preferred map that missed her would be useless.

The instance \`[ChartedSpace Coordinates Surface]\` is Ada's collection of local leaves. Mathlib's ${mathlibDoc('mem_chart_source', MATHLIB_DOCS.chartedSpace)} says that \`chartAt Coordinates place\`, the leaf chosen at her current location, contains \`place\` in its source. Smooth compatibility between overlapping leaves comes later, with \`IsManifold\`.

**Objective:** Show that \`place\` lies in the source of the chart chosen there.`,
          conclusion: `Ada can always choose a chart that contains where she stands.`,
          solution: 'exact mem_chart_source Coordinates place',
          hints: ['The covering theorem takes `Coordinates` and `place`.'],
          newTheorems: ['mem_chart_source'],
          newDefinitions: ['ChartedSpace', 'chartAt'],
        },
        {
          title: 'This leaf is in the atlas',
          theoremName: 'preferred_chart_mem_atlas',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place ∈ atlas Coordinates Surface`,
          introduction: `Ada checks the leaf she chose and files it back with the others. A preferred map must be one of the maps in her atlas.

In Lean, Ada's stack is \`atlas Coordinates Surface\`, and her chosen leaf is \`chartAt Coordinates place\`. Mathlib's ${mathlibDoc('chart_mem_atlas', MATHLIB_DOCS.chartedSpace)} proves that the chosen chart belongs to that atlas.

**Objective:** Show that the chart chosen at \`place\` belongs to the atlas.`,
          conclusion: `The leaf chosen at \`place\` really is one of the leaves in the atlas.`,
          solution: 'exact chart_mem_atlas Coordinates place',
          hints: ['The matching theorem is `chart_mem_atlas Coordinates place`.'],
          newTheorems: ['chart_mem_atlas'],
          newDefinitions: ['atlas'],
        },
        {
          title: 'Her place lands on the leaf',
          theoremName: 'preferred_chart_maps_to_target',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place place ∈ (chartAt Coordinates place).target`,
          introduction: `Ada presses her current position through the chosen chart. Its mark lands inside the coordinate patch drawn on the leaf.

Read \`chartAt Coordinates place place\` as \`(chartAt Coordinates place) place\`. The first \`place\` selects Ada's chart, and the second is the point drawn in \`Coordinates\`. Mathlib packages the target-membership proof as ${mathlibDoc('mem_chart_target', MATHLIB_DOCS.chartedSpace)}.

**Objective:** Show that the coordinates of \`place\` lie inside the chosen chart's target.`,
          conclusion: `Ada's current position now has coordinates inside the drawn patch.`,
          solution: 'exact mem_chart_target Coordinates place',
          hints: ['The target version of the earlier theorem is `mem_chart_target Coordinates place`.'],
          newTheorems: ['mem_chart_target'],
        },
        {
          title: 'The map works nearby',
          theoremName: 'preferred_chart_source_is_neighborhood',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    (chartAt Coordinates place).source ∈ 𝓝 place`,
          introduction: `The chosen leaf covers a patch around Ada's footprint. Throughout that neighborhood, the same coordinates remain valid.

Mathlib writes the neighborhood filter at Ada's location as \`𝓝 place\`; type \`\\nhds\` for \`𝓝\`. This filter is a collection of sets. Thus \`source ∈ 𝓝 place\` says that the source contains an open set around \`place\`, not that a point belongs to a set. The theorem ${mathlibDoc('chart_source_mem_nhds', MATHLIB_DOCS.chartedSpace)} supplies exactly that fact for \`chartAt Coordinates place\`.

**Objective:** Show that the chosen chart is valid on a whole neighborhood of \`place\`.`,
          conclusion: `The chosen coordinates work throughout a neighborhood of \`place\`.`,
          solution: 'exact chart_source_mem_nhds Coordinates place',
          hints: ['The theorem ending in `_mem_nhds` has exactly this conclusion.'],
          newTheorems: ['chart_source_mem_nhds'],
          newDefinitions: ['Filter', 'nhds'],
        },
        {
          title: 'No place left uncovered',
          theoremName: 'preferred_charts_cover',
          signature: `{Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] :
    (⋃ place : Surface, (chartAt Coordinates place).source) =
      (Set.univ : Set Surface)`,
          introduction: `Ada spreads every preferred leaf across the stone. No point remains uncovered; wherever she stands, at least one local map is ready.

The indexed union \`⋃ place : Surface, (chartAt Coordinates place).source\` spreads out the preferred leaf at every possible location. Mathlib proves in ${mathlibDoc('iUnion_source_chartAt', MATHLIB_DOCS.chartedSpace)} that their sources equal all of \`Surface\`.

**Objective:** Show that the preferred chart sources cover every point of \`Surface\`.`,
          conclusion: `Together, Ada's leaves cover the whole space.`,
          solution: 'exact iUnion_source_chartAt Coordinates Surface',
          hints: ['The covering theorem is `iUnion_source_chartAt Coordinates Surface`.'],
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
    [coordinateTopology : TopologicalSpace Coordinates]
    (mark : Coordinates) :
    chartAt Coordinates mark = OpenPartialHomeomorph.refl Coordinates`,
          introduction: `Ada lays one reference grid on top of an identical grid. Every mark already sits in the right place, so the map does nothing.

Both grids are represented by the same type, \`Coordinates\`, and \`mark\` is one point on them. Mathlib's canonical \`ChartedSpace Coordinates Coordinates\` instance uses \`OpenPartialHomeomorph.refl Coordinates\`. The theorem ${mathlibDoc('chartAt_self_eq', MATHLIB_DOCS.chartedSpace)} describes this chosen self-chart; it does not say that every atlas on \`Coordinates\` must use only identity charts.

**Objective:** Show that a space used as its own coordinate model has the identity as its preferred chart.`,
          conclusion: `The reference leaf needs only the identity chart.`,
          solution: 'exact chartAt_self_eq',
          hints: ['All arguments to `chartAt_self_eq` are implicit.'],
          newTheorems: ['chartAt_self_eq'],
          newDefinitions: ['OpenPartialHomeomorph.refl', 'chartedSpaceSelf'],
        },
        {
          title: 'One map in the reference atlas',
          theoremName: 'self_atlas_only_identity',
          signature: `{Coordinates : Type u}
    [coordinateTopology : TopologicalSpace Coordinates]
    (chart : OpenPartialHomeomorph Coordinates Coordinates) :
    chart ∈ atlas Coordinates Coordinates ↔
      chart = OpenPartialHomeomorph.refl Coordinates`,
          introduction: `Ada checks the small atlas that came with the reference grid. It has one chart: the grid matched with itself.

The formal \`chart\` is any candidate map from the grid to itself. For Mathlib's canonical self-charted instance, ${mathlibDoc('chartedSpaceSelf_atlas', MATHLIB_DOCS.chartedSpace)} says that \`chart\` belongs to \`atlas Coordinates Coordinates\` exactly when it is the identity chart. The goal is an \`↔\`, so Lean expects one proof in each direction.

**Objective:** Show that membership in the self-atlas is equivalent to being the identity chart.`,
          conclusion: `The self-atlas contains one chart, and it is the identity.`,
          solution: 'constructor\n· intro h\n  exact chartedSpaceSelf_atlas.mp h\n· intro h\n  exact chartedSpaceSelf_atlas.mpr h',
          hints: ['Split the equivalence with `constructor`.', 'After introducing each hypothesis, use `.mp` in one direction and `.mpr` in the other.'],
          newTactics: ['constructor', 'intro'],
          newTheorems: ['chartedSpaceSelf_atlas'],
          newDefinitions: ['Iff'],
        },
        {
          title: 'Two readings at once',
          theoremName: 'product_chart_is_product',
          signature: `{FirstCoordinates : Type u} {SecondCoordinates : Type u'}
    {FirstSurface : Type v} {SecondSurface : Type v'}
    [firstCoordinateTopology : TopologicalSpace FirstCoordinates]
    [secondCoordinateTopology : TopologicalSpace SecondCoordinates]
    [firstSurfaceTopology : TopologicalSpace FirstSurface]
    [secondSurfaceTopology : TopologicalSpace SecondSurface]
    [firstSurfaceCharts : ChartedSpace FirstCoordinates FirstSurface]
    [secondSurfaceCharts : ChartedSpace SecondCoordinates SecondSurface]
    (position : FirstSurface × SecondSurface) :
    chartAt (ModelProd FirstCoordinates SecondCoordinates) position =
      (chartAt FirstCoordinates position.1).prod
        (chartAt SecondCoordinates position.2)`,
          introduction: `On a torus, Ada records two positions at once: how far she has gone around the hole and how far she has gone around the tube. Each reading has its own local map.

Think first of \`FirstSurface\` and \`SecondSurface\` as two circles whose product is a torus. The two entries of \`position : FirstSurface × SecondSurface\` are Ada's two readings. Mathlib combines their coordinate types as \`ModelProd FirstCoordinates SecondCoordinates\`. The theorem ${mathlibDoc('prodChartedSpace_chartAt', MATHLIB_DOCS.chartedSpace)} says that the preferred chart is the product of the two component charts.

**Objective:** Show that the preferred chart of a paired point is the product of its two component charts.`,
          conclusion: `The torus chart is built by reading its two coordinates side by side.`,
          solution: 'rw [prodChartedSpace_chartAt]',
          hints: ['Rewrite the chart with `prodChartedSpace_chartAt`.'],
          newTactics: ['rw'],
          newTheorems: ['prodChartedSpace_chartAt'],
          newDefinitions: ['ModelProd', 'OpenPartialHomeomorph.prod', 'prodChartedSpace'],
        },
        {
          title: 'The paired chart contains her place',
          theoremName: 'product_point_mem_chart_source',
          signature: `{FirstCoordinates : Type u} {SecondCoordinates : Type u'}
    {FirstSurface : Type v} {SecondSurface : Type v'}
    [firstCoordinateTopology : TopologicalSpace FirstCoordinates]
    [secondCoordinateTopology : TopologicalSpace SecondCoordinates]
    [firstSurfaceTopology : TopologicalSpace FirstSurface]
    [secondSurfaceTopology : TopologicalSpace SecondSurface]
    [firstSurfaceCharts : ChartedSpace FirstCoordinates FirstSurface]
    [secondSurfaceCharts : ChartedSpace SecondCoordinates SecondSurface]
    (firstPosition : FirstSurface) (secondPosition : SecondSurface) :
    (firstPosition, secondPosition) ∈
      (chartAt (ModelProd FirstCoordinates SecondCoordinates)
        (firstPosition, secondPosition)).source`,
          introduction: `Ada combines one position from each loop of the torus. The paired point must lie inside the source of the paired chart.

The pair \`(firstPosition, secondPosition)\` records Ada's place in both factors. The earlier theorem ${mathlibDoc('mem_chart_source', MATHLIB_DOCS.chartedSpace)} also applies to the product charted-space instance, which Lean infers from \`ModelProd FirstCoordinates SecondCoordinates\`. The theorem already has the needed mathematical content; \`simpa only using\` clears the small notational mismatch while keeping simplification tightly restricted.

**Objective:** Show that the paired position lies inside its preferred product chart.`,
          conclusion: `The paired chart contains the paired point, just as each component chart contains its own point.`,
          solution: 'simpa only using\n  (mem_chart_source (ModelProd FirstCoordinates SecondCoordinates)\n    (firstPosition, secondPosition))',
          hints: ['Specialize the earlier covering theorem to the product model.', 'Then use `simpa only` with the paired position.'],
          newTactics: ['simpa'],
        },
      ],
    ),
    makeWorld(
      'SmoothManifolds',
      'Smooth manifolds',
      `# When chart changes are smooth

Ada's leaves now overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives.

${mathlibDoc('ChartedSpace', MATHLIB_DOCS.chartedSpace)} supplies the charts. Mathlib's ${mathlibDoc('IsManifold', MATHLIB_DOCS.isManifold)} adds differentiability conditions to their transition maps. For a first picture, take \`Scalar = ℝ\` and imagine \`Coordinates\` as ordinary Euclidean coordinates. The goals state the same ideas for a general \`Surface\`, \`Coordinates\`, \`Vectors\`, \`model\`, and \`order\`.`,
      ['CanonicalCharts'],
      [
        {
          title: 'The reference leaf is ready',
          theoremName: 'model_space_is_manifold',
          signature: `{Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    (order : WithTop ℕ∞) :
    IsManifold model order Coordinates`,
          introduction: `Ada places a model leaf beside the world she is charting. The leaf is already its own coordinate space, so it needs no further change of coordinates to qualify as a manifold.

In the goal, \`Scalar\` supplies the numbers, \`Vectors\` supplies directions, and \`Coordinates\` is the model leaf itself. The ${mathlibDoc('ModelWithCorners', MATHLIB_DOCS.isManifold)} named \`model\` connects those pieces. The ordered type \`WithTop ℕ∞\` records differentiability levels; here, read \`0\` as continuity-level regularity and \`∞\` as smoothness at every finite order. Mathlib registers ${mathlibDoc('instIsManifoldModelSpace', MATHLIB_DOCS.isManifold)} for every order.

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
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    {lowerOrder higherOrder : WithTop ℕ∞}
    [higherSmoothness : IsManifold model higherOrder Surface]
    (order_le : lowerOrder ≤ higherOrder) :
    IsManifold model lowerOrder Surface`,
          introduction: `Ada checks her map changes to a demanding standard. If they pass that test, they also pass any test that asks for fewer derivatives.

For example, an atlas of class $C^5$ also meets a $C^2$ requirement. Lean calls the demanding standard \`higherOrder\` and the weaker one \`lowerOrder\`. The hypothesis \`order_le : lowerOrder ≤ higherOrder\` is the formal reason the stronger atlas is enough. Mathlib packages this step as ${mathlibDoc('IsManifold.of_le', MATHLIB_DOCS.isManifold)}.

**Objective:** Lower the known differentiability order from \`higherOrder\` to \`lowerOrder\`.`,
          conclusion: `The higher-order manifold instance now works at the requested lower order.`,
          solution: 'exact IsManifold.of_le order_le',
          hints: ['Pass the inequality `order_le` to `IsManifold.of_le`.'],
          newTheorems: ['IsManifold.of_le'],
          newDefinitions: ['LE.le'],
        },
        {
          title: 'The smooth atlas passes the basic check',
          theoremName: 'smooth_manifold_is_topological',
          signature: `{Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    [smoothSurface : IsManifold model ∞ Surface] :
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
    [scalarField : NontriviallyNormedField Scalar]
    {FirstVectors : Type v}
    [firstVectorGroup : NormedAddCommGroup FirstVectors]
    [firstVectorSpace : NormedSpace Scalar FirstVectors]
    {SecondVectors : Type v'}
    [secondVectorGroup : NormedAddCommGroup SecondVectors]
    [secondVectorSpace : NormedSpace Scalar SecondVectors]
    {FirstCoordinates : Type w}
    [firstCoordinateTopology : TopologicalSpace FirstCoordinates]
    {SecondCoordinates : Type*}
    [secondCoordinateTopology : TopologicalSpace SecondCoordinates]
    {firstModel : ModelWithCorners Scalar FirstVectors FirstCoordinates}
    {secondModel : ModelWithCorners Scalar SecondVectors SecondCoordinates}
    {FirstSurface : Type u'}
    [firstSurfaceTopology : TopologicalSpace FirstSurface]
    [firstSurfaceCharts : ChartedSpace FirstCoordinates FirstSurface]
    {SecondSurface : Type*}
    [secondSurfaceTopology : TopologicalSpace SecondSurface]
    [secondSurfaceCharts : ChartedSpace SecondCoordinates SecondSurface]
    (order : WithTop ℕ∞)
    [firstSmoothness : IsManifold firstModel order FirstSurface]
    [secondSmoothness : IsManifold secondModel order SecondSurface] :
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
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    TangentSpace model place`,
          introduction: `Ada stands still at \`place\`. Even without choosing a direction, staying still is a valid tangent velocity.

The ${mathlibDoc('TangentSpace', MATHLIB_DOCS.isManifold)} \`TangentSpace model place\` is the intrinsic space of velocities available at Ada's current location. The plane in the 3D scene pictures this tangent space; it is not an arbitrary plane floating beside the surface. The space inherits an additive group structure from \`Vectors\`, so it contains a zero vector. The expected type tells Lean which \`0\` is intended.

**Objective:** Construct the zero tangent vector at \`place\`.`,
          conclusion: `Standing still is now a genuine vector in \`TangentSpace model place\`.`,
          solution: 'exact 0',
          hints: ['The tangent space has a zero instance.', 'The expected type is enough for Lean to understand `0`.'],
          newDefinitions: ['TangentSpace', 'Zero.zero'],
        },
        {
          title: 'Place and velocity together',
          theoremName: 'tangent_vector_as_bundle_point',
          declarationKind: 'def',
          signature: `{Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    {place : Surface} (velocity : TangentSpace model place) :
    TangentBundle model Surface`,
          introduction: `Ada records both where she is and the direction she is moving. A direction without its point would be ambiguous because the available tangent plane changes from place to place.

A point of the ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} is a dependent pair \`⟨place, velocity⟩\`. The tangent space may change with \`place\`, so the type \`velocity : TangentSpace model place\` remembers where that velocity belongs. Lean can therefore recover \`place\` from the pair.

**Objective:** Package \`place\` and \`velocity\` as one tangent-bundle point.`,
          conclusion: `Ada's position and velocity now travel as one bundle point.`,
          solution: 'exact ⟨place, velocity⟩',
          hints: ['The dependent pair is written `⟨place, velocity⟩`.'],
          newDefinitions: ['TangentBundle', 'Bundle.TotalSpace', 'Sigma'],
        },
        {
          title: 'Read the location tag',
          theoremName: 'tangent_bundle_base',
          signature: `{Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    {place : Surface} (velocity : TangentSpace model place) :
    (⟨place, velocity⟩ : TangentBundle model Surface).1 = place`,
          introduction: `Ada opens one of her direction records and reads its location tag. The tag gives back the point where that direction belongs.

The ${mathlibDoc('TangentBundle', MATHLIB_DOCS.isManifold)} is represented by a dependent pair. Its first projection \`(⟨place, velocity⟩ : TangentBundle model Surface).1\` reduces by definition to \`place\`. The second entry has type \`TangentSpace model place\`, which depends on that first entry.

**Objective:** Show that projecting the base point from \`⟨place, velocity⟩\` returns \`place\`.`,
          conclusion: `Reading the bundle point's location tag returns \`place\`.`,
          solution: 'rfl',
          hints: ['The first projection reduces to `place` by definition.', 'A reflexivity proof closes such a goal.'],
          newTactics: ['rfl'],
          newDefinitions: ['Sigma.fst'],
        },
        {
          title: 'Standing still anywhere',
          theoremName: 'tangent_bundle_has_zero',
          signature: `{Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
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
  return `module

public import ${config.mathlibImport}
${config.courseImport ? `public import ${config.courseImport}` : ''}

@[expose] public section

/-!
# Manifold Adventure: ${world.title}

Generated by \`scripts/create-manifold-game.mjs\`.

Exercise declarations live in \`ManifoldAdventure\`; the mathematical
structures and library theorems they use come directly from pinned Mathlib.
-/

namespace ${NAMESPACE}

universe u v w u' v'

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
