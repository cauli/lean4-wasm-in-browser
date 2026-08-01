# Manifold Adventure: complete course review

> This is a reviewer-facing Markdown rendering of the generated course data.
> Every level includes the prose, Lean goal, official solution, hints, and unlocks.
> A **3D MODEL** callout appears wherever the web course displays a 3D scene.

**Course status:** 25/25 reference solutions kernel-checked

**Caption:** A kernel-checked course on Mathlib homeomorphisms, local charts, atlases, smooth manifolds, products, and tangent bundles.

## Course map

| World | Levels | Prerequisite | 3D content |
| --- | ---: | --- | --- |
| 1. Homeomorphisms | 4 | None | None |
| 2. Open partial homeomorphisms | 4 | `Homeomorphisms` | 1 lesson scene |
| 3. Charted spaces and atlases | 5 | `LocalCharts` | 1 lesson scene |
| 4. Identity and product charts | 4 | `ChartedSpaces` | seven-model explorer; 2 lesson scenes |
| 5. Smooth manifolds | 4 | `CanonicalCharts` | None |
| 6. Tangent spaces and the tangent bundle | 4 | `SmoothManifolds` | 2 lesson scenes |

## 3D model index

World 4 opens with an interactive explorer containing all seven models. Six individual lessons also embed a model:

| Location | Model | Asset |
| --- | --- | --- |
| LocalCharts, level 4: Back to the same spot | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| ChartedSpaces, level 5: No place left uncovered | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| CanonicalCharts, level 3: Two readings at once | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| CanonicalCharts, level 4: The paired chart contains her place | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| TangentSpaces, level 1: Ada stands still | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| TangentSpaces, level 2: Place and velocity together | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |

The World 4 explorer additionally includes:

- **Sphere with two charts:** Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates. ([`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb))
- **Torus with its two loops:** Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface. ([`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb))
- **Möbius band:** Ada carries an arrow once around the band and finds it flipped on her return. There is no consistent choice of "up" across the whole surface. ([`mobius-band.glb`](../public/game-assets/manifolds/models/mobius-band.glb))
- **Circle and trefoil embeddings:** From inside either tube, Ada experiences the same one-manifold: a circle. The knot belongs to the way one circle sits in three-dimensional space. ([`trefoil-circle.glb`](../public/game-assets/manifolds/models/trefoil-circle.glb))
- **A triangle with three right angles:** Ada walks three geodesic edges and turns through a right angle at every corner. The 270° angle total reveals curvature from within the sphere. ([`sphere-triangle.glb`](../public/game-assets/manifolds/models/sphere-triangle.glb))
- **Figure-eight crossing:** Ada tests the red crossing as a possible point on a one-manifold. Removing it leaves four nearby arms instead of the two she would find on an interval. ([`figure-eight.glb`](../public/game-assets/manifolds/models/figure-eight.glb))
- **Tangent plane at a point:** The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear. ([`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb))

## Course introduction

### The Manifold Adventure

Ada is an ant, so she can only inspect her world from the inside. Manifold theory takes the same point of view: understand the whole space through local coordinates.

The course uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the start. First come [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) and [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). Then you build a [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) from an [`atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) and [`chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt). The last worlds introduce [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners), [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold), [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace), and [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle).

### Course information

The formal source is `lean/ManifoldAdventure/BrowserBase.lean`. It imports `Mathlib.Geometry.Manifold.IsManifold.Basic` at pinned Mathlib commit `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.

### Formal source

- Repository: https://github.com/cauli/lean4-wasm-in-browser
- Course source revision: `mathlib-manifolds-de3a9cf330`
- Lean toolchain: `cauli/lean4@62b6a22913 (upstream ecf55de08b)`
- Mathlib commit: `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`
- License: Apache-2.0 for Mathlib; original course text in this repository

## World 1: Homeomorphisms

**Prerequisites:** None

### One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing.

A [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) is Mathlib's bundled version of such a correspondence. In the goals, `Trail` is the actual path, `Drawing` is the inked route rather than the whole leaf, and `trailMap` connects them. The structure contains an equivalence and continuity proofs in both directions.

### 1.1 The drawing matches the trail

- **Level ID:** `homeomorphisms-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_continuous` (theorem)

#### Lesson

Ada stands midway along a path. North leads back to the nest; south leads to a patch of berries. She copies the path onto a leaf. As she moves a little along the trail, her mark should move only a little on the drawing. There can be no sudden jump.

Here `Trail` is the actual path and `Drawing` is the line Ada drew. The objects `trailTopology` and `drawingTopology` tell Lean what it means for points to be nearby in each space. Then `trailMap : Trail ≃ₜ Drawing` matches their points homeomorphically. It already contains a proof that its forward function is continuous, exposed as [`Homeomorph.continuous`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.continuous) or `trailMap.continuous`.

#### Human-readable objective

**Objective:** Prove that the map from the actual trail to Ada's drawing is continuous.

#### Goal

```lean
theorem homeomorph_continuous {Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) : Continuous trailMap := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact trailMap.continuous
```

#### Hints

1. The forward continuity proof is a field of `trailMap`.
2. Close the goal with `exact trailMap.continuous`.

#### Unlocks

- **Lean tactics:** `exact`
- **Mathlib theorems/declarations:** `Homeomorph.continuous`
- **Structures, definitions, and notation:** `TopologicalSpace`, `Homeomorph`, `Continuous`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_continuous`

#### After the proof

Ada's drawing now moves continuously with the trail.

### 1.2 The drawing leads Ada back

- **Level ID:** `homeomorphisms-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_inverse_continuous` (theorem)

#### Lesson

Ada also needs the leaf to guide her home. A small move across the drawing should send her to a nearby place on the trail, not somewhere far away.

The inverse homeomorphism is `trailMap.symm`: it reads a mark on `Drawing` as a place on `Trail`. Its continuity proof is [`Homeomorph.continuous_symm`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.continuous_symm), available through dot notation as `trailMap.continuous_symm`.

#### Human-readable objective

**Objective:** Prove that reading the leaf back onto the trail is continuous.

#### Goal

```lean
theorem homeomorph_inverse_continuous {Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) : Continuous trailMap.symm := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact trailMap.continuous_symm
```

#### Hints

1. The inverse field sits next to `trailMap.continuous`.
2. Try `exact trailMap.continuous_symm`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.continuous_symm`
- **Structures, definitions, and notation:** `Homeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_inverse_continuous`

#### After the proof

Ada can read the same map in either direction without a jump.

### 1.3 Back where she started

- **Level ID:** `homeomorphisms-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_round_trip` (theorem)

#### Lesson

Ada marks her position on the leaf, then reads that mark back onto the trail. She should land at the exact place where she started.

The equation `trailMap.symm (trailMap place) = place` is the round-trip law for a homeomorphism. Mathlib stores it as [`Homeomorph.symm_apply_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.symm_apply_apply).

#### Human-readable objective

**Objective:** Show that mapping `place` to the drawing and back returns the same place.

#### Goal

```lean
theorem homeomorph_round_trip {Trail : Type u} {Drawing : Type v}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    (trailMap : Trail ≃ₜ Drawing) (place : Trail) :
    trailMap.symm (trailMap place) = place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact trailMap.symm_apply_apply place
```

#### Hints

1. The unlocked theorem is `Homeomorph.symm_apply_apply`.
2. In dot notation, write `exact trailMap.symm_apply_apply place`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.symm_apply_apply`
- **Structures, definitions, and notation:** `Eq`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_round_trip`

#### After the proof

The mark on the leaf still names exactly one place on the trail.

### 1.4 Into the route book

- **Level ID:** `homeomorphisms-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_composition_apply` (theorem)

#### Lesson

Ada copies the trail onto a leaf, then copies the leaf into the nest's larger route book. Her position passes through the first map and then the second.

Here `trailMap` goes from the actual `Trail` to the `Drawing`, while `bookMap` transfers that drawing into the `RouteBook`. Mathlib composes them with `trailMap.trans bookMap`. The pointwise rule is [`Homeomorph.trans_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.trans_apply).

#### Human-readable objective

**Objective:** Show that the composed map sends `place` first through `trailMap` and then through `bookMap`.

#### Goal

```lean
theorem homeomorph_composition_apply {Trail : Type u} {Drawing : Type v} {RouteBook : Type w}
    [trailTopology : TopologicalSpace Trail]
    [drawingTopology : TopologicalSpace Drawing]
    [routeBookTopology : TopologicalSpace RouteBook]
    (trailMap : Trail ≃ₜ Drawing) (bookMap : Drawing ≃ₜ RouteBook)
    (place : Trail) :
    trailMap.trans bookMap place = bookMap (trailMap place) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Homeomorph.trans_apply trailMap bookMap place
```

#### Hints

1. This step uses the fully qualified theorem name.
2. Try `exact Homeomorph.trans_apply trailMap bookMap place`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.trans_apply`
- **Structures, definitions, and notation:** `Homeomorph.trans`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_composition_apply`

#### After the proof

The two drawings now behave like one map from the trail to the route book.

## World 2: Open partial homeomorphisms

**Prerequisites:** `Homeomorphisms`

### A chart only sees a patch

The trail soon climbs onto a rounded stone. Ada cannot press the whole curved surface onto one leaf without distortion, so she draws only the patch around her.

Mathlib represents one local chart by [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). In these goals, `Stone` is the curved surface, `Drawing` is Ada's coordinate picture, and `chart` connects only the part she has drawn. It has a `source` on the stone, a `target` in the drawing, and inverse laws that apply inside the patch.

### 2.1 Room around every place

- **Level ID:** `localcharts-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_source_open` (theorem)

#### Lesson

Ada shades the usable part of the stone on her leaf. Every included spot needs a little room around it, so the drawing does not stop at Ada's feet.

In Lean, `chart.source` is the shaded part of `Stone`. Requiring that patch to be open formalizes the room around each included point. An [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph) stores the proof as `chart.open_source`.

#### Human-readable objective

**Objective:** Prove that the chart's source is an open set.

#### Goal

```lean
theorem local_chart_source_open {Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) : IsOpen chart.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart.open_source
```

#### Hints

1. The openness proof is the structure projection `chart.open_source`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.open_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph`, `OpenPartialHomeomorph.source`, `IsOpen`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_source_open`

#### After the proof

The shaded patch is open, so every point in it has some room around it.

### 2.2 No jumps inside the patch

- **Level ID:** `localcharts-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_continuous` (theorem)

#### Lesson

Ada walks inside the shaded patch while her mark moves across the leaf. Within that patch, neither motion should jump.

Because `chart` covers only part of `Stone`, Mathlib asks for `ContinuousOn chart chart.source` rather than continuity everywhere. The bundled proof is [`OpenPartialHomeomorph.continuousOn`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.continuousOn).

#### Human-readable objective

**Objective:** Prove that the chart is continuous wherever its local coordinates are valid.

#### Goal

```lean
theorem local_chart_continuous {Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) :
    ContinuousOn chart chart.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart.continuousOn
```

#### Hints

1. The needed field is `chart.continuousOn`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.continuousOn`
- **Structures, definitions, and notation:** `ContinuousOn`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_continuous`

#### After the proof

The chart only promises continuity inside the patch where it is valid.

### 2.3 Her mark lands in the drawing

- **Level ID:** `localcharts-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_maps_source` (theorem)

#### Lesson

Ada chooses a point inside the shaded patch and places its mark on the leaf. Since the point is in the part she mapped, the mark must lie in the drawn coordinate region.

Lean names Ada's chosen point `place`. The hypothesis `inPatch : place ∈ chart.source` says that it lies in the shaded part of the stone. Mathlib's [`OpenPartialHomeomorph.map_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.map_source) then concludes that `chart place` lies in the drawn target. Type `\in` for `∈`.

#### Human-readable objective

**Objective:** Show that a point in the chart source maps into its coordinate target.

#### Goal

```lean
theorem local_chart_maps_source {Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (place : Stone) (inPatch : place ∈ chart.source) :
    chart place ∈ chart.target := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  apply chart.map_source
  exact inPatch
```

#### Hints

1. Start with `apply chart.map_source`.
2. The remaining goal is the hypothesis `inPatch`.

#### Unlocks

- **Lean tactics:** `apply`
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.map_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.target`, `Membership.mem`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_maps_source`

#### After the proof

Once Lean knows that `place` is in the source, its coordinates belong to the target.

### 2.4 Back to the same spot

- **Level ID:** `localcharts-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_round_trip` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

Ada marks a place in her local drawing and traces it back onto the stone. The round trip is reliable only because that place lies inside the patch she drew.

For a partial homeomorphism, the inverse law needs `inPatch : place ∈ chart.source`. This is the formal bridge between "Ada drew this place" and the side condition in Mathlib's [`OpenPartialHomeomorph.left_inv`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.left_inv).

#### Human-readable objective

**Objective:** Show that a source point returns to itself after passing through the chart and its inverse.

#### Goal

```lean
theorem local_chart_round_trip {Stone : Type u} {Drawing : Type v}
    [stoneTopology : TopologicalSpace Stone]
    [drawingTopology : TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (place : Stone) (inPatch : place ∈ chart.source) :
    chart.symm (chart place) = place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart.left_inv inPatch
```

#### Hints

1. Give `chart.left_inv` the source-membership proof `inPatch`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.left_inv`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_round_trip`

#### After the proof

Inside her patch, Ada can move from stone to leaf and back without losing her place.

## World 3: Charted spaces and atlases

**Prerequisites:** `LocalCharts`

### A stack of maps

The stone is larger than one patch. Ada carries a stack of leaves, each covering a different part, and keeps them together as her atlas.

The class [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) equips a surface with an atlas. The goals call the actual world `Surface`, the shared coordinate space `Coordinates`, and Ada's location `place`. Mathlib often writes the same three objects as `M`, `H`, and `x`.

### 3.1 A leaf for where she stands

- **Level ID:** `chartedspaces-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.point_mem_preferred_chart` (theorem)

#### Lesson

Wherever Ada stops, she selects a leaf whose shaded patch contains her current position. A preferred map that missed her would be useless.

The instance `[ChartedSpace Coordinates Surface]` is Ada's whole stack of compatible leaves. Mathlib's [`mem_chart_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_source) says that `chartAt Coordinates place`, the leaf chosen at her current location, contains `place` in its source.

#### Human-readable objective

**Objective:** Show that `place` lies in the source of the chart chosen there.

#### Goal

```lean
theorem point_mem_preferred_chart {Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    place ∈ (chartAt Coordinates place).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mem_chart_source Coordinates place
```

#### Hints

1. The covering theorem takes `Coordinates` and `place`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_source`
- **Structures, definitions, and notation:** `ChartedSpace`, `chartAt`
- **Reusable course declaration:** `ManifoldAdventure.point_mem_preferred_chart`

#### After the proof

Ada can always choose a chart that contains where she stands.

### 3.2 This leaf is in the atlas

- **Level ID:** `chartedspaces-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_mem_atlas` (theorem)

#### Lesson

Ada checks the leaf she chose and files it back with the others. A preferred map must be one of the maps in her atlas.

In Lean, Ada's stack is `atlas Coordinates Surface`, and her chosen leaf is `chartAt Coordinates place`. Mathlib's [`chart_mem_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_mem_atlas) proves that the chosen chart belongs to that atlas.

#### Human-readable objective

**Objective:** Show that the chart chosen at `place` belongs to the atlas.

#### Goal

```lean
theorem preferred_chart_mem_atlas {Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place ∈ atlas Coordinates Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_mem_atlas Coordinates place
```

#### Hints

1. The matching theorem is `chart_mem_atlas Coordinates place`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_mem_atlas`
- **Structures, definitions, and notation:** `atlas`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_mem_atlas`

#### After the proof

The leaf chosen at `place` really is one of the leaves in the atlas.

### 3.3 Her place lands on the leaf

- **Level ID:** `chartedspaces-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_maps_to_target` (theorem)

#### Lesson

Ada presses her current position through the chosen chart. Its mark lands inside the coordinate patch drawn on the leaf.

The expression `chartAt Coordinates place place` first selects Ada's chart at `place`, then uses it to draw that same place in `Coordinates`. Mathlib packages the target-membership proof as [`mem_chart_target`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_target).

#### Human-readable objective

**Objective:** Show that the coordinates of `place` lie inside the chosen chart's target.

#### Goal

```lean
theorem preferred_chart_maps_to_target {Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place place ∈ (chartAt Coordinates place).target := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mem_chart_target Coordinates place
```

#### Hints

1. The target version of the earlier theorem is `mem_chart_target Coordinates place`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_target`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_maps_to_target`

#### After the proof

Ada's current position now has coordinates inside the drawn patch.

### 3.4 The map works nearby

- **Level ID:** `chartedspaces-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_source_is_neighborhood` (theorem)

#### Lesson

The chosen leaf covers a patch around Ada's footprint. Throughout that neighborhood, the same coordinates remain valid.

Mathlib writes the neighborhoods of Ada's location as `𝓝 place`; type `\nhds` for `𝓝`. The theorem [`chart_source_mem_nhds`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_source_mem_nhds) says that the source of `chartAt Coordinates place` is one of those neighborhoods.

#### Human-readable objective

**Objective:** Show that the chosen chart is valid on a whole neighborhood of `place`.

#### Goal

```lean
theorem preferred_chart_source_is_neighborhood {Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    (chartAt Coordinates place).source ∈ 𝓝 place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_source_mem_nhds Coordinates place
```

#### Hints

1. The theorem ending in `_mem_nhds` has exactly this conclusion.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_source_mem_nhds`
- **Structures, definitions, and notation:** `Filter`, `nhds`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_source_is_neighborhood`

#### After the proof

The chosen coordinates work throughout a neighborhood of `place`.

### 3.5 No place left uncovered

- **Level ID:** `chartedspaces-5`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_charts_cover` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

Ada spreads every preferred leaf across the stone. No point remains uncovered; wherever she stands, at least one local map is ready.

The indexed union `⋃ place : Surface, (chartAt Coordinates place).source` spreads out the preferred leaf at every possible location. Mathlib proves in [`iUnion_source_chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#iUnion_source_chartAt) that their sources equal all of `Surface`.

#### Human-readable objective

**Objective:** Show that the preferred chart sources cover every point of `Surface`.

#### Goal

```lean
theorem preferred_charts_cover {Coordinates : Type u} {Surface : Type v}
    [coordinateTopology : TopologicalSpace Coordinates]
    [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] :
    (⋃ place : Surface, (chartAt Coordinates place).source) =
      (Set.univ : Set Surface) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact iUnion_source_chartAt Coordinates Surface
```

#### Hints

1. The covering theorem is `iUnion_source_chartAt Coordinates Surface`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `iUnion_source_chartAt`
- **Structures, definitions, and notation:** `Set.iUnion`, `Set.univ`
- **Reusable course declaration:** `ManifoldAdventure.preferred_charts_cover`

#### After the proof

Together, Ada's leaves cover the whole space.

## World 4: Identity and product charts

**Prerequisites:** `ChartedSpaces`

### Charts Lean already knows

Ada pauses over a blank leaf before returning to the curved surface. A flat reference sheet maps to itself. A place with two independent directions needs a pair of maps.

Mathlib supplies canonical [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) instances for self charts and products. Here the goal names the two torus factors `FirstSurface` and `SecondSurface`, together with their coordinate spaces. The types determine which instance Lean uses, even though the notation `chartAt` stays the same.

> **3D MODEL LAB: seven-model explorer**
>
> The web course places an interactive model selector on this world overview. It contains every model listed in the [3D model index](#3d-model-index).

### 4.1 A blank leaf maps to itself

- **Level ID:** `canonicalcharts-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.self_chart_is_identity` (theorem)

#### Lesson

Ada lays a blank leaf on top of an identical reference leaf. Every mark already sits in the right place, so the map does nothing.

Both leaves are represented by the same type, `Coordinates`, and `mark` is one point on them. The canonical `ChartedSpace Coordinates Coordinates` therefore uses `OpenPartialHomeomorph.refl Coordinates`. Mathlib states this as [`chartAt_self_eq`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt_self_eq).

#### Human-readable objective

**Objective:** Show that a space used as its own coordinate model has the identity as its preferred chart.

#### Goal

```lean
theorem self_chart_is_identity {Coordinates : Type u}
    [coordinateTopology : TopologicalSpace Coordinates]
    (mark : Coordinates) :
    chartAt Coordinates mark = OpenPartialHomeomorph.refl Coordinates := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chartAt_self_eq
```

#### Hints

1. All arguments to `chartAt_self_eq` are implicit.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chartAt_self_eq`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.refl`, `chartedSpaceSelf`
- **Reusable course declaration:** `ManifoldAdventure.self_chart_is_identity`

#### After the proof

The reference leaf needs only the identity chart.

### 4.2 Only the do-nothing map

- **Level ID:** `canonicalcharts-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.self_atlas_only_identity` (theorem)

#### Lesson

Ada checks the atlas for the reference leaf. There is only one chart in it: the leaf matched with itself.

The formal `chart` is any candidate leaf-to-itself map. Mathlib's [`chartedSpaceSelf_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartedSpaceSelf_atlas) says that it belongs to `atlas Coordinates Coordinates` exactly when it is the identity chart. The goal is an `↔`, so Lean expects one proof in each direction.

#### Human-readable objective

**Objective:** Show that membership in the self-atlas is equivalent to being the identity chart.

#### Goal

```lean
theorem self_atlas_only_identity {Coordinates : Type u}
    [coordinateTopology : TopologicalSpace Coordinates]
    (chart : OpenPartialHomeomorph Coordinates Coordinates) :
    chart ∈ atlas Coordinates Coordinates ↔
      chart = OpenPartialHomeomorph.refl Coordinates := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  constructor
  · intro h
    exact chartedSpaceSelf_atlas.mp h
  · intro h
    exact chartedSpaceSelf_atlas.mpr h
```

#### Hints

1. Split the equivalence with `constructor`.
2. After introducing each hypothesis, use `.mp` in one direction and `.mpr` in the other.

#### Unlocks

- **Lean tactics:** `constructor`, `intro`
- **Mathlib theorems/declarations:** `chartedSpaceSelf_atlas`
- **Structures, definitions, and notation:** `Iff`
- **Reusable course declaration:** `ManifoldAdventure.self_atlas_only_identity`

#### After the proof

The self-atlas contains one chart, and it is the identity.

### 4.3 Two readings at once

- **Level ID:** `canonicalcharts-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_chart_is_product` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

On a torus, Ada records two positions at once: how far she has gone around the hole and how far she has gone around the tube. Each reading has its own local map.

The two entries of `position : FirstSurface × SecondSurface` are Ada's two readings. Mathlib combines their coordinate types as `ModelProd FirstCoordinates SecondCoordinates`. The theorem [`prodChartedSpace_chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#prodChartedSpace_chartAt) says that the preferred chart is the product of the two component charts.

#### Human-readable objective

**Objective:** Show that the preferred chart of a paired point is the product of its two component charts.

#### Goal

```lean
theorem product_chart_is_product {FirstCoordinates : Type u} {SecondCoordinates : Type u'}
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
        (chartAt SecondCoordinates position.2) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rw [prodChartedSpace_chartAt]
```

#### Hints

1. Rewrite the chart with `prodChartedSpace_chartAt`.

#### Unlocks

- **Lean tactics:** `rw`
- **Mathlib theorems/declarations:** `prodChartedSpace_chartAt`
- **Structures, definitions, and notation:** `ModelProd`, `OpenPartialHomeomorph.prod`, `prodChartedSpace`
- **Reusable course declaration:** `ManifoldAdventure.product_chart_is_product`

#### After the proof

The torus chart is built by reading its two coordinates side by side.

### 4.4 The paired chart contains her place

- **Level ID:** `canonicalcharts-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_point_mem_chart_source` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

Ada combines one position from each loop of the torus. The paired point must lie inside the source of the paired chart.

The pair `(firstPosition, secondPosition)` records Ada's place in both factors. The earlier theorem [`mem_chart_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_source) also applies to the product charted-space instance, which Lean infers from `ModelProd FirstCoordinates SecondCoordinates`.

#### Human-readable objective

**Objective:** Show that the paired position lies inside its preferred product chart.

#### Goal

```lean
theorem product_point_mem_chart_source {FirstCoordinates : Type u} {SecondCoordinates : Type u'}
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
        (firstPosition, secondPosition)).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  simpa only using
    (mem_chart_source (ModelProd FirstCoordinates SecondCoordinates)
      (firstPosition, secondPosition))
```

#### Hints

1. Specialize the earlier covering theorem to the product model.
2. Then use `simpa only` with the paired position.

#### Unlocks

- **Lean tactics:** `simpa`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.product_point_mem_chart_source`

#### After the proof

The paired chart contains the paired point, just as each component chart contains its own point.

## World 5: Smooth manifolds

**Prerequisites:** `CanonicalCharts`

### When chart changes are smooth

Ada's leaves now overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives.

[`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) supplies the charts. Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) adds differentiability conditions to their transition maps. The goals now name the geometric roles directly: `Surface`, `Coordinates`, `Vectors`, `model`, and `order`. Mathlib papers often abbreviate these as `M`, `H`, `E`, `I`, and `n`.

### 5.1 The reference leaf is ready

- **Level ID:** `smoothmanifolds-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.model_space_is_manifold` (theorem)

#### Lesson

Ada places a model leaf beside the world she is charting. The leaf is already its own coordinate space, so it needs no further change of coordinates to qualify as a manifold.

In the goal, `Scalar` supplies the numbers, `Vectors` supplies directions, and `Coordinates` is the model leaf itself. The [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners) named `model` connects those pieces, while `order : WithTop ℕ∞` records differentiability. Mathlib registers [`instIsManifoldModelSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#instIsManifoldModelSpace) for every order.

#### Human-readable objective

**Objective:** Establish that `Coordinates` carries the manifold structure supplied by `model`.

#### Goal

```lean
theorem model_space_is_manifold {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    (order : WithTop ℕ∞) :
    IsManifold model order Coordinates := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  infer_instance
```

#### Hints

1. Mathlib has registered this result as an instance.
2. Ask typeclass inference to find it.

#### Unlocks

- **Lean tactics:** `infer_instance`
- **Mathlib theorems/declarations:** `instIsManifoldModelSpace`
- **Structures, definitions, and notation:** `ModelWithCorners`, `IsManifold`, `WithTop`, `ENat`
- **Reusable course declaration:** `ManifoldAdventure.model_space_is_manifold`

#### After the proof

The model space is already a manifold at the requested order.

### 5.2 Passing an easier check

- **Level ID:** `smoothmanifolds-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.manifold_of_higher_smoothness` (theorem)

#### Lesson

Ada checks her map changes to a demanding standard. If they pass that test, they also pass any test that asks for fewer derivatives.

Lean calls the demanding standard `higherOrder` and the weaker one `lowerOrder`. The hypothesis `order_le : lowerOrder ≤ higherOrder` is the formal reason the stronger atlas is enough. Mathlib packages this step as [`IsManifold.of_le`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold.of_le).

#### Human-readable objective

**Objective:** Lower the known differentiability order from `higherOrder` to `lowerOrder`.

#### Goal

```lean
theorem manifold_of_higher_smoothness {Scalar : Type u}
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
    IsManifold model lowerOrder Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact IsManifold.of_le order_le
```

#### Hints

1. Pass the inequality `order_le` to `IsManifold.of_le`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `IsManifold.of_le`
- **Structures, definitions, and notation:** `LE.le`
- **Reusable course declaration:** `ManifoldAdventure.manifold_of_higher_smoothness`

#### After the proof

The higher-order manifold instance now works at the requested lower order.

### 5.3 Smooth maps still keep points close

- **Level ID:** `smoothmanifolds-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.smooth_manifold_is_topological` (theorem)

#### Lesson

Ada's smoothest leaf changes never crease or kink. They certainly still preserve the nearby-point structure she needed for her first maps.

The assumption `IsManifold model ∞ Surface` says that Ada's chart changes have derivatives of every finite order. Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) hierarchy registers the implication to `IsManifold model 0 Surface`, where order `0` retains only the topological requirement.

#### Human-readable objective

**Objective:** Derive the topological manifold structure from the smooth one.

#### Goal

```lean
theorem smooth_manifold_is_topological {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    [smoothSurface : IsManifold model ∞ Surface] :
    IsManifold model 0 Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  infer_instance
```

#### Hints

1. Mathlib registers this implication as an instance.
2. Let `infer_instance` find it.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.smooth_manifold_is_topological`

#### After the proof

The smooth atlas also gives Ada the topological atlas she started with.

### 5.4 Two circles make a torus

- **Level ID:** `smoothmanifolds-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_of_manifolds` (theorem)

#### Lesson

Ada's two circular readings describe the torus together. If each circle has smooth coordinate changes, pairing the readings should preserve that smoothness.

In the torus example, `FirstSurface` and `SecondSurface` are the two circular factors. The theorem remains general: Mathlib's [`IsManifold.prod`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold.prod) combines any two manifold structures with `firstModel.prod secondModel` at the same `order`.

#### Human-readable objective

**Objective:** Build the manifold structure on `FirstSurface × SecondSurface` from its two factors.

#### Goal

```lean
theorem product_of_manifolds {Scalar : Type u}
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
    IsManifold (firstModel.prod secondModel) order (FirstSurface × SecondSurface) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact IsManifold.prod FirstSurface SecondSurface
```

#### Hints

1. The product theorem wants the two surface types.
2. Supply them as `FirstSurface` and `SecondSurface`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `IsManifold.prod`
- **Structures, definitions, and notation:** `ModelWithCorners.prod`, `Prod`
- **Reusable course declaration:** `ManifoldAdventure.product_of_manifolds`

#### After the proof

Two smooth circles now give the torus its smooth manifold structure.

## World 6: Tangent spaces and the tangent bundle

**Prerequisites:** `SmoothManifolds`

### A direction at every point

Ada's atlas tells her where she is. At one point on the surface, she now asks which directions she could move without leaving it.

Mathlib assigns a [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) to every point. In the goals, `Surface` is Ada's world, `place` is her location, `model` describes its coordinates, and `velocity` is a tangent vector there. The [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) collects each place together with one of its possible velocities.

### 6.1 Ada stands still

- **Level ID:** `tangentspaces-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_zero` (noncomputable def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Ada stands still at `place`. Even without choosing a direction, staying still is a valid tangent velocity.

Here [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) `model place` is the space of velocities available at Ada's current location. It inherits an additive group structure from `Vectors`, so it contains a zero vector. The expected tangent-space type tells Lean which `0` is intended.

#### Human-readable objective

**Objective:** Construct the zero tangent vector at `place`.

#### Goal

```lean
noncomputable def tangent_zero {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    TangentSpace model place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact 0
```

#### Hints

1. The tangent space has a zero instance.
2. The expected type is enough for Lean to understand `0`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentSpace`, `Zero.zero`
- **Reusable course declaration:** `ManifoldAdventure.tangent_zero`

#### After the proof

Standing still is now a genuine vector in `TangentSpace model place`.

### 6.2 Place and velocity together

- **Level ID:** `tangentspaces-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_vector_as_bundle_point` (def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Ada records both where she is and the direction she is moving. A direction without its point would be ambiguous because the available tangent plane changes from place to place.

A point of the [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) is a dependent pair `⟨place, velocity⟩`. The type `velocity : TangentSpace model place` remembers where the velocity belongs, so Lean can recover `place` from it.

#### Human-readable objective

**Objective:** Package `place` and `velocity` as one tangent-bundle point.

#### Goal

```lean
def tangent_vector_as_bundle_point {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    {place : Surface} (velocity : TangentSpace model place) :
    TangentBundle model Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact ⟨place, velocity⟩
```

#### Hints

1. The dependent pair is written `⟨place, velocity⟩`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentBundle`, `Bundle.TotalSpace`, `Sigma`
- **Reusable course declaration:** `ManifoldAdventure.tangent_vector_as_bundle_point`

#### After the proof

Ada's position and velocity now travel as one bundle point.

### 6.3 Read the location tag

- **Level ID:** `tangentspaces-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_bundle_base` (theorem)

#### Lesson

Ada opens one of her direction records and reads its location tag. The tag gives back the point where that direction belongs.

The [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) is represented by a dependent pair. Its first projection `(⟨place, velocity⟩ : TangentBundle model Surface).1` reduces by definition to `place`.

#### Human-readable objective

**Objective:** Show that projecting the base point from `⟨place, velocity⟩` returns `place`.

#### Goal

```lean
theorem tangent_bundle_base {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface]
    {place : Surface} (velocity : TangentSpace model place) :
    (⟨place, velocity⟩ : TangentBundle model Surface).1 = place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rfl
```

#### Hints

1. The first projection reduces to `place` by definition.
2. A reflexivity proof closes such a goal.

#### Unlocks

- **Lean tactics:** `rfl`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Sigma.fst`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_base`

#### After the proof

Reading the bundle point's location tag returns `place`.

### 6.4 Standing still anywhere

- **Level ID:** `tangentspaces-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_bundle_has_zero` (theorem)

#### Lesson

Ada can stand still anywhere on the manifold, not just at one chosen point. The tangent bundle should therefore contain a zero direction record over every location.

The course definition `tangent_zero model place` gives the standing-still velocity in `TangentSpace model place`. Pairing it with `place` produces a point of the [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) whose location tag is `place`. This is the pointwise content of the zero section.

#### Human-readable objective

**Objective:** For an arbitrary `place`, construct a tangent-bundle point lying over it.

#### Goal

```lean
theorem tangent_bundle_has_zero {Scalar : Type u}
    [scalarField : NontriviallyNormedField Scalar]
    {Vectors : Type v} [vectorGroup : NormedAddCommGroup Vectors]
    [vectorSpace : NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [coordinateTopology : TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [surfaceTopology : TopologicalSpace Surface]
    [surfaceCharts : ChartedSpace Coordinates Surface] (place : Surface) :
    ∃ bundlePoint : TangentBundle model Surface, bundlePoint.1 = place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  refine ⟨⟨place, tangent_zero model place⟩, ?_⟩
  rfl
```

#### Hints

1. Use `⟨place, tangent_zero model place⟩` as the witness.
2. Its base-point equation holds by reflexivity.

#### Unlocks

- **Lean tactics:** `refine`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Exists`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_has_zero`

#### After the proof

Every point now has a canonical bundle point for standing still.

## End-state inventory

After completing all six worlds, the player has unlocked the following named Mathlib declarations and Lean tactics.

### Tactics

- `exact`
- `apply`
- `constructor`
- `intro`
- `rw`
- `simpa`
- `infer_instance`
- `rfl`
- `refine`

### Mathlib theorems and declarations

- `Homeomorph.continuous`
- `Homeomorph.continuous_symm`
- `Homeomorph.symm_apply_apply`
- `Homeomorph.trans_apply`
- `OpenPartialHomeomorph.open_source`
- `OpenPartialHomeomorph.continuousOn`
- `OpenPartialHomeomorph.map_source`
- `OpenPartialHomeomorph.left_inv`
- `mem_chart_source`
- `chart_mem_atlas`
- `mem_chart_target`
- `chart_source_mem_nhds`
- `iUnion_source_chartAt`
- `chartAt_self_eq`
- `chartedSpaceSelf_atlas`
- `prodChartedSpace_chartAt`
- `instIsManifoldModelSpace`
- `IsManifold.of_le`
- `IsManifold.prod`

### Structures, definitions, and notation

- `TopologicalSpace`
- `Homeomorph`
- `Continuous`
- `Homeomorph.symm`
- `Eq`
- `Homeomorph.trans`
- `OpenPartialHomeomorph`
- `OpenPartialHomeomorph.source`
- `IsOpen`
- `ContinuousOn`
- `OpenPartialHomeomorph.target`
- `Membership.mem`
- `OpenPartialHomeomorph.symm`
- `ChartedSpace`
- `chartAt`
- `atlas`
- `Filter`
- `nhds`
- `Set.iUnion`
- `Set.univ`
- `OpenPartialHomeomorph.refl`
- `chartedSpaceSelf`
- `Iff`
- `ModelProd`
- `OpenPartialHomeomorph.prod`
- `prodChartedSpace`
- `ModelWithCorners`
- `IsManifold`
- `WithTop`
- `ENat`
- `LE.le`
- `ModelWithCorners.prod`
- `Prod`
- `TangentSpace`
- `Zero.zero`
- `TangentBundle`
- `Bundle.TotalSpace`
- `Sigma`
- `Sigma.fst`
- `Exists`

### Course declarations

- `ManifoldAdventure.homeomorph_continuous`: The drawing matches the trail
- `ManifoldAdventure.homeomorph_inverse_continuous`: The drawing leads Ada back
- `ManifoldAdventure.homeomorph_round_trip`: Back where she started
- `ManifoldAdventure.homeomorph_composition_apply`: Into the route book
- `ManifoldAdventure.local_chart_source_open`: Room around every place
- `ManifoldAdventure.local_chart_continuous`: No jumps inside the patch
- `ManifoldAdventure.local_chart_maps_source`: Her mark lands in the drawing
- `ManifoldAdventure.local_chart_round_trip`: Back to the same spot
- `ManifoldAdventure.point_mem_preferred_chart`: A leaf for where she stands
- `ManifoldAdventure.preferred_chart_mem_atlas`: This leaf is in the atlas
- `ManifoldAdventure.preferred_chart_maps_to_target`: Her place lands on the leaf
- `ManifoldAdventure.preferred_chart_source_is_neighborhood`: The map works nearby
- `ManifoldAdventure.preferred_charts_cover`: No place left uncovered
- `ManifoldAdventure.self_chart_is_identity`: A blank leaf maps to itself
- `ManifoldAdventure.self_atlas_only_identity`: Only the do-nothing map
- `ManifoldAdventure.product_chart_is_product`: Two readings at once
- `ManifoldAdventure.product_point_mem_chart_source`: The paired chart contains her place
- `ManifoldAdventure.model_space_is_manifold`: The reference leaf is ready
- `ManifoldAdventure.manifold_of_higher_smoothness`: Passing an easier check
- `ManifoldAdventure.smooth_manifold_is_topological`: Smooth maps still keep points close
- `ManifoldAdventure.product_of_manifolds`: Two circles make a torus
- `ManifoldAdventure.tangent_zero`: Ada stands still
- `ManifoldAdventure.tangent_vector_as_bundle_point`: Place and velocity together
- `ManifoldAdventure.tangent_bundle_base`: Read the location tag
- `ManifoldAdventure.tangent_bundle_has_zero`: Standing still anywhere
