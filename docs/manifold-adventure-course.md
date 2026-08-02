# Manifold Adventure: complete course review

> This is a reviewer-facing Markdown rendering of the generated course data.
> Every level includes the prose, Lean goal, official solution, hints, and unlocks.
> A **3D MODEL** callout appears wherever the web course displays a 3D scene.

**Course status:** 0/40 reference solutions are recorded against the exact browser compiler for this revision. Native reference checks run separately during development; the exact browser pin remains the release gate.

**Caption:** A kernel-checked course on Mathlib topology and manifolds, with optional paths through map projections and robot motion.

## Revision notes (r2)

- Every level now has a conceptual hint, a tool hint, and a hidden solution hint.
- New levels exercise the inverse side of a partial chart, both directions of the self-atlas equivalence, an actual transition map, and stereographic source membership.
- Definition-only exercises that accepted any well-typed term were removed from Tangent Spaces and Robot Arm.
- Repeated 3D assets now use different named-object highlights, and the robot arm opens its own world.
- Completing the final robot proof grants `fun_prop`; it is not available while solving that level.
- The course revision changed, so the old numeric-ID conformance record is ignored until exact pinned CI checks r2.

## Course map

| World | Levels | Prerequisite | 3D content |
| --- | ---: | --- | --- |
| 1. Homeomorphisms | 4 | None | None |
| 2. Open partial homeomorphisms | 5 | `Homeomorphisms` | 1 lesson scene |
| 3. Charted spaces and atlases | 5 | `LocalCharts` | 1 lesson scene |
| 4. Identity and product charts | 5 | `ChartedSpaces` | seven-model explorer; 2 lesson scenes |
| 5. Smooth manifolds | 5 | `CanonicalCharts` | None |
| 6. Tangent spaces and the tangent bundle | 3 | `SmoothManifolds` | 2 lesson scenes |
| 7. One pole is missing | 5 | `LocalCharts` | 2 lesson scenes |
| 8. The dial comes around | 4 | `SmoothManifolds` | None |
| 9. Two hinges, one reach | 4 | `CircleMotion` | 1 world scene; 3 lesson scenes |

## 3D model index

World 4 opens with a seven-model explorer, and World 9 opens with the robot arm. Individual lessons also embed models:

| Location | Model | Asset |
| --- | --- | --- |
| LocalCharts, level 4: Back to the same spot | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| ChartedSpaces, level 5: No place left uncovered | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| CanonicalCharts, level 4: Two readings at once | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| CanonicalCharts, level 5: The paired chart contains her place | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| TangentSpaces, level 1: Ada stands still | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| TangentSpaces, level 2: Read the location tag | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| MapProjections, level 1: The pole stays off the leaf | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| MapProjections, level 5: The second leaf covers the hole | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| RobotArm, level 1: Find the tip of the arm | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, level 3: A full shoulder turn reaches the same point | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, level 4: The arm moves without a jump | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, world overview: Where the arm can reach | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |

The World 4 explorer additionally includes:

- **Sphere with two charts**: Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates. ([`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb))
- **Torus with its two loops**: Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface. ([`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb))
- **Möbius band** *(outlook, beyond this course)*: Ada carries an arrow once around the band and finds it flipped on her return. There is no consistent choice of "up" across the whole surface. ([`mobius-band.glb`](../public/game-assets/manifolds/models/mobius-band.glb))
- **Circle and trefoil embeddings** *(outlook, beyond this course)*: From inside either tube, Ada experiences the same one-manifold: a circle. The knot belongs to the way one circle sits in three-dimensional space. ([`trefoil-circle.glb`](../public/game-assets/manifolds/models/trefoil-circle.glb))
- **A triangle with three right angles** *(outlook, beyond this course)*: Ada walks three geodesic edges and turns through a right angle at every corner. The 270° angle total reveals curvature from within the sphere. ([`sphere-triangle.glb`](../public/game-assets/manifolds/models/sphere-triangle.glb))
- **Figure-eight crossing** *(outlook, beyond this course)*: Ada tests the red crossing as a possible point on a one-manifold. Removing it leaves four nearby arms instead of the two she would find on an interval. ([`figure-eight.glb`](../public/game-assets/manifolds/models/figure-eight.glb))
- **Tangent plane at a point**: The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear. ([`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb))

## Course introduction

### The Manifold Adventure

Ada is an ant, so she can only inspect her world from the inside. Manifold theory takes the same point of view: understand the whole space through local coordinates.

The main path uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the start. First come [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) and [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). A [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) supplies an [`atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) and a [`chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt) for each point. A [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners) lets [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) express smooth compatibility, leading to [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) and [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle). Optional paths apply the same structures to stereographic maps, circular motion, and a two-joint arm.

### Course information

The formal sources are in `lean/ManifoldAdventure/`. Each world imports the smallest Mathlib area it needs, from homeomorphisms through smooth manifolds, at pinned Mathlib commit `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`.

Hints are staged. The first gives a conceptual nudge, the second names the tool, and the third contains the full solution. A tactic may appear as new in more than one level when optional branches make the first encounter order-dependent.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.

### Formal source

- Repository: https://github.com/cauli/lean4-wasm-in-browser
- Course source revision: `mathlib-manifolds-de3a9cf330-r2`
- Lean toolchain: `cauli/lean4@62b6a22913 (upstream ecf55de08b)`
- Mathlib commit: `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`
- License: Apache-2.0 for Mathlib; original course text in this repository

## World 1: Homeomorphisms

**Prerequisites:** None

### One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing.

A [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) is Mathlib's bundled version of such a correspondence. In the goals, `Trail` is the actual path, `Drawing` is the inked route rather than the whole leaf, and `trailMap` connects them. The structure contains an equivalence and continuity proofs in both directions.

This world names its instance assumptions, such as `trailTopology`, so the lessons can point at them. Later worlds leave them anonymous, which is ordinary Lean style.

### 1.1 The drawing matches the trail

- **Level ID:** `homeomorphisms-1`
- **Verification:** native reference check required; exact browser record pending
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

1. A homeomorphism carries its continuity proofs with it.
2. The forward proof is the field `trailMap.continuous`.
3. *(hidden)* `exact trailMap.continuous`

#### Unlocks

- **Lean tactics:** `exact`
- **Mathlib theorems/declarations:** `Homeomorph.continuous`
- **Structures, definitions, and notation:** `TopologicalSpace`, `Homeomorph`, `Continuous`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_continuous`

#### After the proof

Ada's drawing now moves continuously with the trail.

### 1.2 The drawing leads Ada back

- **Level ID:** `homeomorphisms-2`
- **Verification:** native reference check required; exact browser record pending
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

1. The inverse map carries its continuity proof too.
2. The inverse field is `trailMap.continuous_symm`.
3. *(hidden)* `exact trailMap.continuous_symm`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.continuous_symm`
- **Structures, definitions, and notation:** `Homeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_inverse_continuous`

#### After the proof

Ada can read the same map in either direction without a jump.

### 1.3 Back where she started

- **Level ID:** `homeomorphisms-3`
- **Verification:** native reference check required; exact browser record pending
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

1. Round trips through an equivalence obey a stored law.
2. The dot-notation theorem is `trailMap.symm_apply_apply`, applied to `place`.
3. *(hidden)* `exact trailMap.symm_apply_apply place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.symm_apply_apply`
- **Structures, definitions, and notation:** `Eq`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_round_trip`

#### After the proof

The mark on the leaf still names exactly one place on the trail.

### 1.4 Into the route book

- **Level ID:** `homeomorphisms-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.homeomorph_composition_apply` (theorem)

#### Lesson

Ada copies the trail onto a leaf, then copies the leaf into the nest's larger route book. Her position passes through the first map and then the second.

Here `trailMap` goes from the actual `Trail` to the `Drawing`, while `bookMap` transfers that drawing into the `RouteBook`. Mathlib composes them with `trailMap.trans bookMap`. The pointwise rule is [`Homeomorph.trans_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.trans_apply), and in dot notation it reads `trailMap.trans_apply bookMap place`. The equation also holds by definition, so Lean accepts `rfl` here. The named lemma is the habit that keeps working once definitional unfolding stops.

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
  exact trailMap.trans_apply bookMap place
```

#### Hints

1. Composition has a named pointwise rule.
2. Use `trailMap.trans_apply` with the second map and the point. A plain `rfl` also works here.
3. *(hidden)* `exact trailMap.trans_apply bookMap place`

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

The trail soon climbs onto a rounded stone. From where Ada stands she can survey only the patch around her, and no single leaf can record the whole closed surface, so she draws just the part she can see.

Mathlib represents one local chart by [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph). In these goals, `Stone` is the curved surface, `Drawing` is Ada's coordinate picture, and `chart` connects only the part she has drawn. It has a `source` on the stone, a `target` in the drawing, and inverse laws that apply inside the patch.

From this world on, background structure appears in anonymous instance brackets such as `[TopologicalSpace Stone]`. World 1 named these assumptions only so its text could point at them.

### 2.1 Room around every place

- **Level ID:** `localcharts-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.local_chart_source_open` (theorem)

#### Lesson

Ada shades the usable part of the stone on her leaf. Every included spot needs a little room around it, so the drawing does not stop at Ada's feet.

In Lean, `chart.source` is the shaded part of `Stone`. Requiring that patch to be open formalizes the room around each included point. An [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph) stores the proof as `chart.open_source`.

#### Human-readable objective

**Objective:** Prove that the chart's source is an open set.

#### Goal

```lean
theorem local_chart_source_open {Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing) : IsOpen chart.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart.open_source
```

#### Hints

1. Openness is part of what an `OpenPartialHomeomorph` is.
2. The stored proof is `chart.open_source`.
3. *(hidden)* `exact chart.open_source`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.open_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph`, `OpenPartialHomeomorph.source`, `IsOpen`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_source_open`

#### After the proof

The shaded patch is open, so every point in it has some room around it.

### 2.2 No jumps inside the patch

- **Level ID:** `localcharts-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.local_chart_continuous` (theorem)

#### Lesson

Ada walks inside the shaded patch while her mark moves across the leaf. Within that patch, neither motion should jump.

Because `chart` covers only part of `Stone`, Mathlib asks for `ContinuousOn chart chart.source` rather than continuity everywhere. The bundled proof is [`OpenPartialHomeomorph.continuousOn`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.continuousOn).

#### Human-readable objective

**Objective:** Prove that the chart is continuous wherever its local coordinates are valid.

#### Goal

```lean
theorem local_chart_continuous {Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
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

1. A partial map promises continuity only on its valid patch.
2. The stored proof is `chart.continuousOn`.
3. *(hidden)* `exact chart.continuousOn`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.continuousOn`
- **Structures, definitions, and notation:** `ContinuousOn`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_continuous`

#### After the proof

The chart only promises continuity inside the patch where it is valid.

### 2.3 Her mark lands in the drawing

- **Level ID:** `localcharts-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.local_chart_maps_source` (theorem)

#### Lesson

Ada chooses a point inside the shaded patch and places its mark on the leaf. Since the point is in the part she mapped, the mark must lie in the drawn coordinate region.

Lean names Ada's chosen point `place`. The hypothesis `inPatch : place ∈ chart.source` says that it lies in the shaded part of the stone. Mathlib's [`OpenPartialHomeomorph.map_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.map_source) then concludes that `chart place` lies in the drawn target. Type `\in` for `∈`.

#### Human-readable objective

**Objective:** Show that a point in the chart source maps into its coordinate target.

#### Goal

```lean
theorem local_chart_maps_source {Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
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
3. *(hidden)* `apply chart.map_source`, then `exact inPatch`

#### Unlocks

- **Lean tactics:** `apply`
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.map_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.target`, `Membership.mem`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_maps_source`

#### After the proof

Once Lean knows that `place` is in the source, its coordinates belong to the target.

### 2.4 Back to the same spot

- **Level ID:** `localcharts-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.local_chart_round_trip` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. A chart can take a point to its drawing and back only inside the colored patch where that chart is valid. Highlight state: the amber chart.
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
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
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

1. The partial round-trip law needs source membership.
2. Give `chart.left_inv` the proof `inPatch`.
3. *(hidden)* `exact chart.left_inv inPatch`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.left_inv`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_round_trip`

#### After the proof

Inside her patch, Ada can move from stone to leaf and back without losing her place.

### 2.5 The leaf reads back into the patch

- **Level ID:** `localcharts-5`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.local_chart_reads_back` (theorem)

#### Lesson

Ada picks a mark inside the drawn region and reads it back onto the stone. Two things should hold at once: the recovered point lies in her shaded patch, and pressing it forward again reproduces the mark she chose.

You have met `chart.map_source` and `chart.left_inv`. Mathlib names their mirror images predictably: [`OpenPartialHomeomorph.map_target`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.map_target) and [`OpenPartialHomeomorph.right_inv`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.right_inv). Guessing a lemma's name from this convention is a useful Mathlib skill. The goal is a conjunction, written `∧` (type `\and`). The `constructor` tactic splits it into two parts, and a focus dot `·` (type `\.`) gives each part its own proof.

#### Human-readable objective

**Objective:** From `mark ∈ chart.target`, show that the read-back point lies in the source and maps forward to `mark`.

#### Goal

```lean
theorem local_chart_reads_back {Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart : OpenPartialHomeomorph Stone Drawing)
    (mark : Drawing) (inDrawing : mark ∈ chart.target) :
    chart.symm mark ∈ chart.source ∧ chart (chart.symm mark) = mark := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  constructor
  · exact chart.map_target inDrawing
  · exact chart.right_inv inDrawing
```

#### Hints

1. Split the conjunction, then handle each goal after a focus dot.
2. Use `constructor`; the mirror lemmas are `chart.map_target` and `chart.right_inv`.
3. *(hidden)* `constructor`, then `· exact chart.map_target inDrawing`, then `· exact chart.right_inv inDrawing`

#### Unlocks

- **Lean tactics:** `constructor`, `·`
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.map_target`, `OpenPartialHomeomorph.right_inv`
- **Structures, definitions, and notation:** `And`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_reads_back`

#### After the proof

Both directions of the chart now behave, and Ada guessed the lemma names herself.

## World 3: Charted spaces and atlases

**Prerequisites:** `LocalCharts`

### A stack of maps

The stone is larger than one patch. Ada carries a stack of leaves, each covering a different part, and keeps them together as her atlas.

The class [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) equips a surface with an atlas. The goals call the actual world `Surface`, the shared coordinate space `Coordinates`, and Ada's location `place`. Mathlib often writes the same three objects as `M`, `H`, and `x`.

### 3.1 A leaf for where she stands

- **Level ID:** `chartedspaces-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.point_mem_preferred_chart` (theorem)

#### Lesson

Wherever Ada stops, she selects a leaf whose shaded patch contains her current position. A preferred map that missed her would be useless.

The instance `[ChartedSpace Coordinates Surface]` is Ada's collection of local leaves. Mathlib's [`mem_chart_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_source) says that `chartAt Coordinates place`, the leaf chosen at her current location, contains `place` in its source. Smooth compatibility between overlapping leaves comes later, with `IsManifold`.

#### Human-readable objective

**Objective:** Show that `place` lies in the source of the chart chosen there.

#### Goal

```lean
theorem point_mem_preferred_chart {Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    place ∈ (chartAt Coordinates place).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mem_chart_source Coordinates place
```

#### Hints

1. The preferred chart is built not to miss its chosen point.
2. Use `mem_chart_source Coordinates place`.
3. *(hidden)* `exact mem_chart_source Coordinates place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_source`
- **Structures, definitions, and notation:** `ChartedSpace`, `chartAt`
- **Reusable course declaration:** `ManifoldAdventure.point_mem_preferred_chart`

#### After the proof

Ada can always choose a chart that contains where she stands.

### 3.2 This leaf is in the atlas

- **Level ID:** `chartedspaces-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.preferred_chart_mem_atlas` (theorem)

#### Lesson

Ada checks the leaf she chose and files it back with the others. A preferred map must be one of the maps in her atlas.

In Lean, Ada's stack is `atlas Coordinates Surface`, and her chosen leaf is `chartAt Coordinates place`. Mathlib's [`chart_mem_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_mem_atlas) proves that the chosen chart belongs to that atlas.

#### Human-readable objective

**Objective:** Show that the chart chosen at `place` belongs to the atlas.

#### Goal

```lean
theorem preferred_chart_mem_atlas {Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place ∈ atlas Coordinates Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_mem_atlas Coordinates place
```

#### Hints

1. The preferred chart came from the atlas.
2. Use `chart_mem_atlas Coordinates place`.
3. *(hidden)* `exact chart_mem_atlas Coordinates place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_mem_atlas`
- **Structures, definitions, and notation:** `atlas`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_mem_atlas`

#### After the proof

The leaf chosen at `place` really is one of the leaves in the atlas.

### 3.3 Her place lands on the leaf

- **Level ID:** `chartedspaces-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.preferred_chart_maps_to_target` (theorem)

#### Lesson

Ada presses her current position through the chosen chart. Its mark lands inside the coordinate patch drawn on the leaf.

Read `chartAt Coordinates place place` as `(chartAt Coordinates place) place`. The first `place` selects Ada's chart, and the second is the point drawn in `Coordinates`. No new lemma is needed. World 2's `map_source` sends a source point into its chart's target, and level 3.1 put `place` in this chart's source. Mathlib also packages the combination as [`mem_chart_target`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_target), which joins your book after this proof.

#### Human-readable objective

**Objective:** Show that the coordinates of `place` lie inside the chosen chart's target.

#### Goal

```lean
theorem preferred_chart_maps_to_target {Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    chartAt Coordinates place place ∈ (chartAt Coordinates place).target := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  apply (chartAt Coordinates place).map_source
  exact mem_chart_source Coordinates place
```

#### Hints

1. Combine a World 2 fact about arbitrary charts with level 3.1.
2. Apply `(chartAt Coordinates place).map_source`; the remaining goal is `mem_chart_source Coordinates place`.
3. *(hidden)* `apply (chartAt Coordinates place).map_source`, then `exact mem_chart_source Coordinates place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_target`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_maps_to_target`

#### After the proof

Ada built the target fact from parts she already owned. Mathlib's one-step `mem_chart_target` is now in her book too.

### 3.4 The map works nearby

- **Level ID:** `chartedspaces-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.preferred_chart_source_is_neighborhood` (theorem)

#### Lesson

The chosen leaf covers a patch around Ada's footprint. Throughout that neighborhood, the same coordinates remain valid.

Mathlib writes the neighborhood filter at Ada's location as `𝓝 place`; type `\nhds` for `𝓝`. This filter is a collection of sets. Thus `source ∈ 𝓝 place` says that the source contains an open set around `place`, not that a point belongs to a set. The theorem [`chart_source_mem_nhds`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_source_mem_nhds) supplies exactly that fact for `chartAt Coordinates place`.

#### Human-readable objective

**Objective:** Show that the chosen chart is valid on a whole neighborhood of `place`.

#### Goal

```lean
theorem preferred_chart_source_is_neighborhood {Coordinates : Type u} {Surface : Type v}
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
    (chartAt Coordinates place).source ∈ 𝓝 place := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_source_mem_nhds Coordinates place
```

#### Hints

1. Upgrade point membership to a whole neighborhood.
2. Use `chart_source_mem_nhds Coordinates place`.
3. *(hidden)* `exact chart_source_mem_nhds Coordinates place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_source_mem_nhds`
- **Structures, definitions, and notation:** `Filter`, `nhds`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_source_is_neighborhood`

#### After the proof

The chosen coordinates work throughout a neighborhood of `place`.

### 3.5 No place left uncovered

- **Level ID:** `chartedspaces-5`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.preferred_charts_cover` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. The amber and teal chart sources overlap and together cover the sphere, just as an atlas covers a surface with local maps. Highlight state: both charts.
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
    [TopologicalSpace Coordinates] [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] :
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

1. Every point lies in its own preferred chart, so their union is universal.
2. Use `iUnion_source_chartAt Coordinates Surface`.
3. *(hidden)* `exact iUnion_source_chartAt Coordinates Surface`

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

Ada sets two identical reference grids on top of each other before returning to the curved surface. One maps to the other without moving a mark. A place with two independent readings needs a pair of maps.

Mathlib supplies canonical [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) instances for self charts and products. Here the goal names the two torus factors `FirstSurface` and `SecondSurface`, together with their coordinate spaces. The types determine which instance Lean uses, even though the notation `chartAt` stays the same. The shape gallery below is optional; some objects return in the levels, while others preview later topology.

> **3D MODEL LAB: seven-model explorer**
>
> The web course places an interactive model selector on this world overview. It contains every model listed in the [3D model index](#3d-model-index).

### 4.1 The reference grid stays put

- **Level ID:** `canonicalcharts-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.self_chart_is_identity` (theorem)

#### Lesson

Ada lays one reference grid on top of an identical grid. Every mark already sits in the right place, so the map does nothing.

Both grids are represented by the same type, `Coordinates`, and `mark` is one point on them. Mathlib's canonical `ChartedSpace Coordinates Coordinates` instance uses `OpenPartialHomeomorph.refl Coordinates`. The theorem [`chartAt_self_eq`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt_self_eq) describes this chosen self-chart; it does not say that every atlas on `Coordinates` must use only identity charts.

#### Human-readable objective

**Objective:** Show that a space used as its own coordinate model has the identity as its preferred chart.

#### Goal

```lean
theorem self_chart_is_identity {Coordinates : Type u}
    [TopologicalSpace Coordinates]
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

1. The canonical self-charted instance uses one chart.
2. Use `chartAt_self_eq`; all arguments are implicit.
3. *(hidden)* `exact chartAt_self_eq`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chartAt_self_eq`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.refl`, `chartedSpaceSelf`
- **Reusable course declaration:** `ManifoldAdventure.self_chart_is_identity`

#### After the proof

The reference leaf needs only the identity chart.

### 4.2 The identity is filed in the atlas

- **Level ID:** `canonicalcharts-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.identity_mem_self_atlas` (theorem)

#### Lesson

Ada opens the small atlas that came with the reference grid and files the identity chart into it. Matching the grid with itself is the only map this atlas was meant to hold.

Mathlib's [`chartedSpaceSelf_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartedSpaceSelf_atlas) is an `↔`: a chart belongs to `atlas Coordinates Coordinates` exactly when it is the identity. Its two directions are `.mp` (left to right) and `.mpr` (right to left). This membership goal uses the right-to-left direction, fed with `rfl`, a proof that the identity equals itself.

#### Human-readable objective

**Objective:** Show that the identity chart belongs to the self-atlas.

#### Goal

```lean
theorem identity_mem_self_atlas {Coordinates : Type u}
    [TopologicalSpace Coordinates] :
    OpenPartialHomeomorph.refl Coordinates ∈ atlas Coordinates Coordinates := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chartedSpaceSelf_atlas.mpr rfl
```

#### Hints

1. Read the atlas-membership equivalence backwards.
2. Use `chartedSpaceSelf_atlas.mpr`; it wants the equality proof `rfl`.
3. *(hidden)* `exact chartedSpaceSelf_atlas.mpr rfl`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chartedSpaceSelf_atlas`
- **Structures, definitions, and notation:** `Iff`, `Iff.mpr`
- **Reusable course declaration:** `ManifoldAdventure.identity_mem_self_atlas`

#### After the proof

The reference atlas accepts its one and only chart.

### 4.3 Only the identity is filed there

- **Level ID:** `canonicalcharts-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.self_atlas_chart_is_identity` (theorem)

#### Lesson

Ada pulls a chart out of the reference atlas. Whatever leaf she is holding, the atlas accepted only one map, so it must be the identity.

This is the forward direction of [`chartedSpaceSelf_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartedSpaceSelf_atlas). Its `.mp` projection turns the membership hypothesis `inAtlas` into the required equality.

#### Human-readable objective

**Objective:** From atlas membership, conclude that the chart is the identity.

#### Goal

```lean
theorem self_atlas_chart_is_identity {Coordinates : Type u}
    [TopologicalSpace Coordinates]
    (chart : OpenPartialHomeomorph Coordinates Coordinates)
    (inAtlas : chart ∈ atlas Coordinates Coordinates) :
    chart = OpenPartialHomeomorph.refl Coordinates := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chartedSpaceSelf_atlas.mp inAtlas
```

#### Hints

1. Read the same equivalence forwards this time.
2. Use `.mp` to turn `inAtlas` into the equality.
3. *(hidden)* `exact chartedSpaceSelf_atlas.mp inAtlas`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Iff.mp`
- **Reusable course declaration:** `ManifoldAdventure.self_atlas_chart_is_identity`

#### After the proof

Every chart the reference atlas hands Ada is the identity.

### 4.4 Two readings at once

- **Level ID:** `canonicalcharts-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.product_chart_is_product` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. The two highlighted loops picture Ada's two circle readings. A product chart combines one local chart from each factor. Highlight state: both loops.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

On a torus, Ada records two positions at once: how far she has gone around the hole and how far she has gone around the tube. Each reading has its own local map.

Think first of `FirstSurface` and `SecondSurface` as two circles whose product is a torus. The two entries of `position : FirstSurface × SecondSurface` are Ada's two readings. Mathlib combines their coordinate types as `ModelProd FirstCoordinates SecondCoordinates`. The theorem [`prodChartedSpace_chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#prodChartedSpace_chartAt) says that the preferred chart is the product of the two component charts.

#### Human-readable objective

**Objective:** Show that the preferred chart of a paired point is the product of its two component charts.

#### Goal

```lean
theorem product_chart_is_product {FirstCoordinates : Type u} {SecondCoordinates : Type u'}
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
        (chartAt SecondCoordinates position.2) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rw [prodChartedSpace_chartAt]
```

#### Hints

1. The product instance computes its chart by a stated rule.
2. Rewrite with `prodChartedSpace_chartAt`.
3. *(hidden)* `rw [prodChartedSpace_chartAt]`

#### Unlocks

- **Lean tactics:** `rw`
- **Mathlib theorems/declarations:** `prodChartedSpace_chartAt`
- **Structures, definitions, and notation:** `ModelProd`, `OpenPartialHomeomorph.prod`, `prodChartedSpace`
- **Reusable course declaration:** `ManifoldAdventure.product_chart_is_product`

#### After the proof

The torus chart is built by reading its two coordinates side by side.

### 4.5 The paired chart contains her place

- **Level ID:** `canonicalcharts-5`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.product_point_mem_chart_source` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. The paired position belongs to the surface described by those two readings. Highlight state: the torus surface.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

Ada combines one position from each loop of the torus. The paired point must lie inside the source of the paired chart.

The pair `(firstPosition, secondPosition)` records Ada's place in both factors. The earlier theorem [`mem_chart_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_source) also applies to the product charted-space instance, which Lean infers from `ModelProd FirstCoordinates SecondCoordinates`. Here `exact` needs help because `ModelProd` is a type synonym. The tactic `simpa only using h` unfolds just enough notation in the goal and `h` to make them match. Its cousin `simp` uses Mathlib's default simplification lemmas.

#### Human-readable objective

**Objective:** Show that the paired position lies inside its preferred product chart.

#### Goal

```lean
theorem product_point_mem_chart_source {FirstCoordinates : Type u} {SecondCoordinates : Type u'}
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
3. *(hidden)* `simpa only using`, then `  (mem_chart_source (ModelProd FirstCoordinates SecondCoordinates)`, then `    (firstPosition, secondPosition))`

#### Unlocks

- **Lean tactics:** `simpa`, `simp`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.product_point_mem_chart_source`

#### After the proof

The paired chart contains the paired point, just as each component chart contains its own point.

## World 5: Smooth manifolds

**Prerequisites:** `CanonicalCharts`

### When chart changes are smooth

Ada's leaves now overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives.

[`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) supplies the charts. Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) adds differentiability conditions to their transition maps. For a first picture, take `Scalar = ℝ` and imagine `Coordinates` as ordinary Euclidean coordinates. The goals state the same ideas for a general `Surface`, `Coordinates`, `Vectors`, `model`, and `order`. The first level meets the transition map itself before the rest of the world asks such maps to be differentiable.

### 5.1 Two leaves in conversation

- **Level ID:** `smoothmanifolds-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.transition_map_source` (theorem)

#### Lesson

Ada holds two overlapping leaves of the same stone. She reads a mark from the first leaf back onto the stone, then presses that point through the second. This is the transition map between the drawings.

Formally, the transition map is `chart.symm.trans chart'`: invert one chart, then apply the other. Its domain contains marks in the first chart's target whose read-back lands in the second chart's source. The preimage `chart.symm ⁻¹' chart'.source` collects those marks. Mathlib computes the domain with [`OpenPartialHomeomorph.trans_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.trans_source), while [`OpenPartialHomeomorph.symm_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.symm_source) renames the inverse chart's source to `chart.target`.

#### Human-readable objective

**Objective:** Compute the transition map's domain from the two charts.

#### Goal

```lean
theorem transition_map_source {Stone : Type u} {Drawing : Type v}
    [TopologicalSpace Stone] [TopologicalSpace Drawing]
    (chart chart' : OpenPartialHomeomorph Stone Drawing) :
    (chart.symm.trans chart').source =
      chart.target ∩ chart.symm ⁻¹' chart'.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rw [OpenPartialHomeomorph.trans_source, OpenPartialHomeomorph.symm_source]
```

#### Hints

1. Unfold the source of the composite, then rename the inverse chart's source.
2. Rewrite with `OpenPartialHomeomorph.trans_source` and `OpenPartialHomeomorph.symm_source`.
3. *(hidden)* `rw [OpenPartialHomeomorph.trans_source, OpenPartialHomeomorph.symm_source]`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.trans_source`, `OpenPartialHomeomorph.symm_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.trans`, `Set.inter`, `Set.preimage`
- **Reusable course declaration:** `ManifoldAdventure.transition_map_source`

#### After the proof

The transition map now has an explicit home: the overlap as seen from the first leaf.

### 5.2 The reference leaf is ready

- **Level ID:** `smoothmanifolds-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.model_space_is_manifold` (theorem)

#### Lesson

Ada places a model leaf beside the world she is charting. The leaf is already its own coordinate space, so it needs no further change of coordinates to qualify as a manifold.

In the goal, `Scalar` supplies the numbers, `Vectors` supplies directions, and `Coordinates` is the model leaf itself. The [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners) named `model` connects those pieces. The ordered type `WithTop ℕ∞` records differentiability levels. Here `0` means continuity-level regularity, `∞` means smoothness at every finite order, and the top element `ω` means analyticity. World 8's circle will meet that stronger standard. Mathlib registers [`instIsManifoldModelSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#instIsManifoldModelSpace) for every order.

#### Human-readable objective

**Objective:** Establish that `Coordinates` carries the manifold structure supplied by `model`.

#### Goal

```lean
theorem model_space_is_manifold {Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
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
3. *(hidden)* `infer_instance`

#### Unlocks

- **Lean tactics:** `infer_instance`
- **Mathlib theorems/declarations:** `instIsManifoldModelSpace`
- **Structures, definitions, and notation:** `ModelWithCorners`, `IsManifold`, `WithTop`, `ENat`
- **Reusable course declaration:** `ManifoldAdventure.model_space_is_manifold`

#### After the proof

The model space is already a manifold at the requested order.

### 5.3 Passing an easier check

- **Level ID:** `smoothmanifolds-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.manifold_of_higher_smoothness` (theorem)

#### Lesson

Ada checks her map changes to a demanding standard. If they pass that test, they also pass any test that asks for fewer derivatives.

For example, an atlas of class $C^5$ also meets a $C^2$ requirement. Lean calls the demanding standard `higherOrder` and the weaker one `lowerOrder`. This time the comparison arrives inside the goal as an implication. The `intro` tactic moves its assumption into the context. Mathlib's [`IsManifold.of_le`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold.of_le) then finishes.

#### Human-readable objective

**Objective:** Assuming `lowerOrder ≤ higherOrder`, lower the known differentiability order from `higherOrder` to `lowerOrder`.

#### Goal

```lean
theorem manifold_of_higher_smoothness {Scalar : Type u}
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
    lowerOrder ≤ higherOrder → IsManifold model lowerOrder Surface := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  intro order_le
  exact IsManifold.of_le order_le
```

#### Hints

1. Bring the implication's assumption into the context first.
2. After `intro order_le`, pass it to `IsManifold.of_le`.
3. *(hidden)* `intro order_le`, then `exact IsManifold.of_le order_le`

#### Unlocks

- **Lean tactics:** `intro`
- **Mathlib theorems/declarations:** `IsManifold.of_le`
- **Structures, definitions, and notation:** `LE.le`
- **Reusable course declaration:** `ManifoldAdventure.manifold_of_higher_smoothness`

#### After the proof

The higher-order manifold instance now works at the requested lower order.

### 5.4 The smooth atlas passes the basic check

- **Level ID:** `smoothmanifolds-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.smooth_manifold_is_topological` (theorem)

#### Lesson

Ada's smoothest leaf changes never crease or kink. They certainly still preserve the nearby-point structure she needed for her first maps.

The assumption `IsManifold model ∞ Surface` says that Ada's chart changes have derivatives of every finite order. Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) hierarchy registers the implication to `IsManifold model 0 Surface`, where order `0` retains the basic topological requirement. This `0` is a regularity order, not the dimension of `Surface`.

#### Human-readable objective

**Objective:** Derive the topological manifold structure from the smooth one.

#### Goal

```lean
theorem smooth_manifold_is_topological {Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    {model : ModelWithCorners Scalar Vectors Coordinates}
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
    [IsManifold model ∞ Surface] :
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
3. *(hidden)* `infer_instance`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.smooth_manifold_is_topological`

#### After the proof

The smooth atlas also gives Ada the topological atlas she started with.

### 5.5 Two circles make a torus

- **Level ID:** `smoothmanifolds-5`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.product_of_manifolds` (theorem)

#### Lesson

Ada's two circular readings describe the torus together. If each circle has smooth coordinate changes, pairing the readings should preserve that smoothness.

Read the final line of the goal first: it asks for a manifold structure on `FirstSurface × SecondSurface`. In Ada's torus, those surfaces are circles. The instance lines above provide their two manifold structures, and Mathlib's [`IsManifold.prod`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold.prod) combines them with `firstModel.prod secondModel` at the same `order`.

#### Human-readable objective

**Objective:** Build the manifold structure on `FirstSurface × SecondSurface` from its two factors.

#### Goal

```lean
theorem product_of_manifolds {Scalar : Type u}
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
3. *(hidden)* `exact IsManifold.prod FirstSurface SecondSurface`

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
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.tangent_zero` (noncomputable def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The attached plane pictures the tangent space at Ada's chosen place. Standing still is its zero vector. Highlight state: Ada and the tangent plane, with no velocity arrow.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Ada stands still at `place`. Even without choosing a direction, staying still is a valid tangent velocity.

The [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) `TangentSpace model place` is the intrinsic space of velocities available at Ada's current location. The plane in the 3D scene pictures this tangent space; it is not an arbitrary plane floating beside the surface. The space inherits an additive group structure from `Vectors`, so it contains a zero vector. The expected type tells Lean which `0` is intended.

This is a definition level, so the kernel accepts any well-typed term. Only one velocity here is canonical, and level 6.3 reuses the course's official `tangent_zero`, so make it the zero vector.

#### Human-readable objective

**Objective:** Construct the zero tangent vector at `place`.

#### Goal

```lean
noncomputable def tangent_zero {Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
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
3. *(hidden)* `exact 0`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentSpace`, `Zero.zero`
- **Reusable course declaration:** `ManifoldAdventure.tangent_zero`

#### After the proof

Standing still is now a genuine vector in `TangentSpace model place`.

### 6.2 Read the location tag

- **Level ID:** `tangentspaces-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.tangent_bundle_base` (theorem)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. A tangent-bundle point keeps the location on the surface together with a velocity from the tangent space attached there. Highlight state: Ada, the plane, and one velocity arrow.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Ada records both where she is and the direction she is moving, then reads the record's location tag. A direction without its point would be ambiguous because the available tangent plane changes from place to place. The tag must give back the point she stored.

A point of the [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) is the dependent pair `⟨place, velocity⟩` (angle brackets: type `\<` and `\>`). The tangent space may change with `place`, so `velocity : TangentSpace model place` remembers where the velocity belongs. The first projection `.1` reduces by definition to `place`, and the `rfl` tactic checks that reduction.

#### Human-readable objective

**Objective:** Show that projecting the base point from `⟨place, velocity⟩` returns `place`.

#### Goal

```lean
theorem tangent_bundle_base {Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface]
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
3. *(hidden)* `rfl`

#### Unlocks

- **Lean tactics:** `rfl`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentBundle`, `Bundle.TotalSpace`, `Sigma`, `Sigma.fst`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_base`

#### After the proof

Reading the bundle point's location tag returns `place`.

### 6.3 Standing still anywhere

- **Level ID:** `tangentspaces-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.tangent_bundle_has_zero` (theorem)

#### Lesson

Ada can stand still anywhere on the manifold, not just at one chosen point. The tangent bundle should therefore contain a zero direction record over every location.

The course definition `tangent_zero model place` gives the standing-still velocity in `TangentSpace model place`. Pairing it with `place` produces a point of the [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) whose location tag is `place`. This constructs the zero bundle point over one arbitrary place; it does not yet define the zero section as a function.

#### Human-readable objective

**Objective:** For an arbitrary `place`, construct a tangent-bundle point lying over it.

#### Goal

```lean
theorem tangent_bundle_has_zero {Scalar : Type u}
    [NontriviallyNormedField Scalar]
    {Vectors : Type v} [NormedAddCommGroup Vectors]
    [NormedSpace Scalar Vectors]
    {Coordinates : Type w}
    [TopologicalSpace Coordinates]
    (model : ModelWithCorners Scalar Vectors Coordinates)
    {Surface : Type u'} [TopologicalSpace Surface]
    [ChartedSpace Coordinates Surface] (place : Surface) :
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
3. *(hidden)* `refine ⟨⟨place, tangent_zero model place⟩, ?_⟩`, then `rfl`

#### Unlocks

- **Lean tactics:** `refine`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Exists`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_has_zero`

#### After the proof

Every point now has a canonical bundle point for standing still.

## World 7: One pole is missing

**Prerequisites:** `LocalCharts`

### A round world on a flat leaf

Ada finds a glass bead near the trail. She wants to copy its surface onto a leaf, but one drawing cannot include the point where she holds the bead. She makes a second drawing from another pole to cover the gap.

Mathlib builds this map as [`stereographic`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic), an `OpenPartialHomeomorph` from the unit sphere to a flat orthogonal plane. This branch uses the local-chart ideas from the main path on a concrete sphere. It assumes only World 2, and introduces the extra tactics it needs on the way to the covering proof.

### 7.1 The pole stays off the leaf

- **Level ID:** `mapprojections-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.stereographic_map_misses_pole` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. A stereographic chart draws every point except its chosen pole. The missing point is the price of flattening the sphere onto one leaf. Highlight state: the first chart.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

Ada presses one point of the bead between her feet while she draws. That point is the pole of the projection, so it cannot appear in this chart.

The source of `stereographic unitPole` is the sphere with the pole removed. Mathlib states this as [`stereographic_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_source). The complement notation `{⟨pole, ...⟩}ᶜ` means every sphere point except that one.

The singleton's element appears as `⟨pole, by simp [unitPole]⟩`. A sphere point is a vector paired with a certificate that its norm is one. Read the embedded proof as Mathlib filling in that certificate from `unitPole`.

#### Human-readable objective

**Objective:** Show that the stereographic chart covers the sphere except for its chosen pole.

#### Goal

```lean
theorem stereographic_map_misses_pole {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : Space) (unitPole : ‖pole‖ = 1) :
    (stereographic unitPole).source = {⟨pole, by simp [unitPole]⟩}ᶜ := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact stereographic_source unitPole
```

#### Hints

1. Mathlib states the source of a stereographic chart directly.
2. Use `stereographic_source unitPole`.
3. *(hidden)* `exact stereographic_source unitPole`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `stereographic_source`
- **Structures, definitions, and notation:** `Metric.sphere`, `stereographic`, `Set.compl`
- **Reusable course declaration:** `ManifoldAdventure.stereographic_map_misses_pole`

#### After the proof

The first drawing now has an exact missing point.

### 7.2 The far pole lands in the middle

- **Level ID:** `mapprojections-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.opposite_pole_is_origin` (theorem)

#### Lesson

Ada marks the point opposite the missing pole. On her flat drawing, that point sits at the center.

The value `-pole` is the antipodal point on the sphere. Mathlib's [`stereographic_apply_neg`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_apply_neg) computes its stereographic coordinate as the zero vector in the flat model space.

The pole has changed representation since the previous level. There it was a raw vector plus `‖pole‖ = 1`. Here it is already a point of the sphere subtype, and `norm_eq_of_mem_sphere pole` recovers the norm certificate from membership.

#### Human-readable objective

**Objective:** Prove that the antipodal point maps to the origin of the drawing.

#### Goal

```lean
theorem opposite_pole_is_origin {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : sphere (0 : Space) 1) :
    stereographic (norm_eq_of_mem_sphere pole) (-pole) = 0 := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact stereographic_apply_neg pole
```

#### Hints

1. The antipode's coordinate is a named computation.
2. Apply `stereographic_apply_neg` to `pole`.
3. *(hidden)* `exact stereographic_apply_neg pole`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `stereographic_apply_neg`, `norm_eq_of_mem_sphere`
- **Structures, definitions, and notation:** `Neg.neg`
- **Reusable course declaration:** `ManifoldAdventure.opposite_pole_is_origin`

#### After the proof

Ada can use the opposite pole as the center of her coordinates.

### 7.3 Every mark has a place on the bead

- **Level ID:** `mapprojections-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.every_stereographic_mark_has_source` (theorem)

#### Lesson

Ada points to an arbitrary mark on the leaf and traces it back to the bead. No coordinate on the drawing is wasted.

The chart target is the whole orthogonal plane. The theorem [`surjective_stereographic`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#surjective_stereographic) says that every coordinate has a preimage on the sphere away from the missing pole.

#### Human-readable objective

**Objective:** Show that every point in the coordinate plane comes from the sphere.

#### Goal

```lean
theorem every_stereographic_mark_has_source {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (pole : Space) (unitPole : ‖pole‖ = 1) :
    Function.Surjective (stereographic unitPole) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact surjective_stereographic unitPole
```

#### Hints

1. Surjectivity of the stereographic map is already proved.
2. Use `surjective_stereographic unitPole`.
3. *(hidden)* `exact surjective_stereographic unitPole`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `surjective_stereographic`
- **Structures, definitions, and notation:** `Function.Surjective`
- **Reusable course declaration:** `ManifoldAdventure.every_stereographic_mark_has_source`

#### After the proof

Every mark on the leaf now names a point on the bead.

### 7.4 Off the pole, onto the leaf

- **Level ID:** `mapprojections-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.stereographic_off_pole` (theorem)

#### Lesson

Ada checks a point that is not the pinned pole. Every such point earned a mark on the first leaf.

Membership in the source is membership in a complement. The condition `place ∈ {north}ᶜ` becomes `place ∉ {north}`, and singleton membership becomes equality, so the whole condition is `place ≠ north`. The tactic `simp only [h₁, h₂, …]` rewrites with exactly the listed lemmas. Here those lemmas include [`stereographic_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_source), `Set.mem_compl_iff`, and `Set.mem_singleton_iff`.

#### Human-readable objective

**Objective:** Show that any point other than the pole lies in that pole's chart source.

#### Goal

```lean
theorem stereographic_off_pole {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north place : sphere (0 : Space) 1) (notNorth : place ≠ north) :
    place ∈ (stereographic (norm_eq_of_mem_sphere north)).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]
  exact notNorth
```

#### Hints

1. Unwind the chart source and the two membership statements.
2. Use `simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]`; the result is `notNorth`.
3. *(hidden)* `simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]`, then `exact notNorth`

#### Unlocks

- **Lean tactics:** `simp`
- **Mathlib theorems/declarations:** `Set.mem_compl_iff`, `Set.mem_singleton_iff`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.stereographic_off_pole`

#### After the proof

Only the pinned pole is missing. Everything else already has coordinates on the first leaf.

### 7.5 The second leaf covers the hole

- **Level ID:** `mapprojections-5`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.two_stereographic_maps_cover` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. Each colored chart misses one pole. Because the poles differ, the two chart sources cover the whole sphere. Highlight state: both charts.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

Ada makes a second drawing from a different pole. The first leaf misses only the north point, and the second misses only the south point. Since those points differ, every place appears on at least one leaf.

The proof starts from [`stereographic_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_source) and has a useful shape. `ext place` turns the set equation into a statement about one point. `simp only` with the membership lemmas from the previous level reduces it to a disjunction: the point differs from north, or it differs from south. `by_cases atNorth : place = north` splits the situations, while `left` and `right` choose a side. At north, assume `place = south` with `intro` and chain equalities as `atNorth.symm.trans atSouth` to contradict `different`.

#### Human-readable objective

**Objective:** Prove that two stereographic charts with different poles cover the whole sphere.

#### Goal

```lean
theorem two_stereographic_maps_cover {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north south : sphere (0 : Space) 1) (different : north ≠ south) :
    (stereographic (norm_eq_of_mem_sphere north)).source ∪
      (stereographic (norm_eq_of_mem_sphere south)).source = Set.univ := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  ext place
  simp only [stereographic_source, Set.mem_union, Set.mem_compl_iff,
    Set.mem_singleton_iff, Set.mem_univ, iff_true]
  by_cases atNorth : place = north
  · right
    intro atSouth
    exact different (atNorth.symm.trans atSouth)
  · left
    exact atNorth
```

#### Hints

1. Reduce the set equality to one point, expose the disjunction, then split on whether that point is north.
2. Use `ext`, `simp only`, and `by_cases`. Choose branches with `left` or `right`.
3. *(hidden)* `ext place`, then `simp only [stereographic_source, Set.mem_union, Set.mem_compl_iff,`, then `  Set.mem_singleton_iff, Set.mem_univ, iff_true]`, then `by_cases atNorth : place = north`, then `· right`, then `  intro atSouth`, then `  exact different (atNorth.symm.trans atSouth)`, then `· left`, then `  exact atNorth`

#### Unlocks

- **Lean tactics:** `ext`, `by_cases`, `left`, `right`, `intro`
- **Mathlib theorems/declarations:** `Set.mem_union`, `Set.mem_univ`, `iff_true`, `Eq.symm`, `Eq.trans`
- **Structures, definitions, and notation:** `Set.union`, `Set.univ`, `Or`
- **Reusable course declaration:** `ManifoldAdventure.two_stereographic_maps_cover`

#### After the proof

Two leaves are enough to record every point on the bead. This pair is the atlas Mathlib uses to make the sphere a `ChartedSpace`, tying this branch back to World 3.

## World 8: The dial comes around

**Prerequisites:** `SmoothManifolds`

### An angle becomes a position

Ada finds a brass dial on an old field box. Turning it changes the pointer's position, but a full turn brings the pointer home. She needs a way to compose turns without losing that circular behavior.

Mathlib's `Circle` is the unit circle in the complex plane. The map [`Circle.exp`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp) sends a real angle to a point on that circle. Mathlib also knows that the circle is an analytic Lie group, so composing positions and moving smoothly are part of the same structure.

### 8.1 No turn leaves the pointer home

- **Level ID:** `circlemotion-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.circle_zero_turn` (theorem)

#### Lesson

Ada starts with the pointer at its home mark. Before she turns the dial, its angle is zero and its position on the circle is one.

The identity of the circle group is `1`. Mathlib records the zero-angle calculation as [`Circle.exp_zero`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp_zero).

#### Human-readable objective

**Objective:** Show that angle zero gives the identity position on the circle.

#### Goal

```lean
theorem circle_zero_turn : Circle.exp 0 = 1 := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Circle.exp_zero
```

#### Hints

1. The zero-angle value is a recorded calculation.
2. Use `Circle.exp_zero`.
3. *(hidden)* `exact Circle.exp_zero`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Circle.exp_zero`
- **Structures, definitions, and notation:** `Circle`, `Circle.exp`, `One.one`
- **Reusable course declaration:** `ManifoldAdventure.circle_zero_turn`

#### After the proof

The dial's home position now agrees with the circle-group identity.

### 8.2 Two turns compose

- **Level ID:** `circlemotion-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.circle_turns_compose` (theorem)

#### Lesson

Ada turns the dial once, then turns it again. The final position is the same as adding the two angles before moving the pointer.

Circle positions compose by multiplication. The theorem [`Circle.exp_add`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp_add) says that `Circle.exp` changes addition of angles into multiplication on the circle. This is the group law used for planar rotations.

#### Human-readable objective

**Objective:** Prove that adding two angles agrees with composing their circle positions.

#### Goal

```lean
theorem circle_turns_compose (first second : ℝ) :
    Circle.exp (first + second) = Circle.exp first * Circle.exp second := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Circle.exp_add first second
```

#### Hints

1. The exponential turns angle addition into circle multiplication.
2. Give both angles to `Circle.exp_add`.
3. *(hidden)* `exact Circle.exp_add first second`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Circle.exp_add`
- **Structures, definitions, and notation:** `Mul.mul`
- **Reusable course declaration:** `ManifoldAdventure.circle_turns_compose`

#### After the proof

Ada can combine consecutive turns with the circle-group operation.

### 8.3 One full turn changes nothing

- **Level ID:** `circlemotion-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.circle_full_turn` (theorem)

#### Lesson

Ada turns the dial through one complete revolution. The pointer travels, but it finishes at the position where it began.

Angles on the real line are not unique coordinates for a circle point. Adding `2 * Real.pi` gives the same point. Mathlib names this calculation [`Circle.exp_add_two_pi`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp_add_two_pi).

#### Human-readable objective

**Objective:** Show that adding one full turn does not change the pointer's position.

#### Goal

```lean
theorem circle_full_turn (angle : ℝ) :
    Circle.exp (angle + 2 * Real.pi) = Circle.exp angle := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Circle.exp_add_two_pi angle
```

#### Hints

1. Mathlib records what adding one revolution does.
2. Use `Circle.exp_add_two_pi angle`.
3. *(hidden)* `exact Circle.exp_add_two_pi angle`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Circle.exp_add_two_pi`
- **Structures, definitions, and notation:** `Real.pi`
- **Reusable course declaration:** `ManifoldAdventure.circle_full_turn`

#### After the proof

The formal dial now returns to the same state after one revolution.

### 8.4 The pointer turns smoothly

- **Level ID:** `circlemotion-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.circle_turning_is_smooth` (theorem)

#### Lesson

Ada turns the dial slowly. The pointer follows without a jump or corner, even when it crosses the home mark.

The statement `CMDiff ∞ Circle.exp` uses Mathlib's manifold notation. `CMDiff n f` elaborates to `ContMDiff I J n f`, with the two models inferred instead of written out. It says that the angle-to-circle map has derivatives of every finite order as a map between manifolds. Mathlib proves this in [`contMDiff_circleExp`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#contMDiff_circleExp).

#### Human-readable objective

**Objective:** Prove that converting an angle into a circle position is smooth.

#### Goal

```lean
theorem circle_turning_is_smooth : CMDiff ∞ Circle.exp := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact contMDiff_circleExp
```

#### Hints

1. Mathlib already knows the circle exponential is manifold-smooth.
2. Use `contMDiff_circleExp`.
3. *(hidden)* `exact contMDiff_circleExp`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `contMDiff_circleExp`
- **Structures, definitions, and notation:** `ContMDiff`, `CMDiff`
- **Reusable course declaration:** `ManifoldAdventure.circle_turning_is_smooth`

#### After the proof

A continuously turning angle now gives smooth motion on the circle.

## World 9: Two hinges, one reach

**Prerequisites:** `CircleMotion`

### Where the arm can reach

Inside the field box, Ada finds a small arm with two rotating hinges. Each hinge position lies on Mathlib's [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle), and reading both rings at once gives one point of `Circle × Circle`. This is the arm's configuration space, a concrete torus and the product manifold of the main path. A value of a product type is written with plain parentheses, as in `(shoulder, elbow)`.

We represent the work surface by `ℂ`, viewed as a plane. The first link points in the shoulder direction. The second link turns by the shoulder and elbow angles together.

> **3D MODEL: Two-joint robot arm**
>
> This interactive scene appears on the world overview. Each ring is one circle-valued joint. Reading both rings gives one point of the arm's configuration space. Highlight state: both joint arcs.
>
> Asset: [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb)

### 9.1 Find the tip of the arm

- **Level ID:** `robotarm-1`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.robot_arm_tip` (noncomputable def)

> **3D MODEL: Two-joint robot arm**
>
> This interactive scene appears immediately after the lesson introduction. The orange displacement ends at the elbow. Adding the teal displacement places the red tip on the work plane. Highlight state: both links and the tip.
>
> Asset: [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb)

#### Lesson

Ada follows the first bar from the base, then the second bar from the elbow. Adding those two displacements gives the tip position.

Complex numbers describe vectors in the work plane. The first displacement uses `joints.1`. The second multiplies two [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle) values as `joints.1 * joints.2`, because the elbow direction is measured after the shoulder has already turned.

This is a definition level, so any well-typed term would satisfy the kernel. The next three levels reason about the course's official `robot_arm_tip`, so match the two-link formula described here.

#### Human-readable objective

**Objective:** Define the tip as the sum of the two link vectors.

#### Goal

```lean
noncomputable def robot_arm_tip (firstLength secondLength : ℝ)
    (joints : Circle × Circle) : ℂ := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact
    (firstLength : ℂ) * (joints.1 : ℂ) +
      (secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)
```

#### Hints

1. The first link contributes `firstLength * joints.1`.
2. The second direction is the product `joints.1 * joints.2`.
3. *(hidden)* `exact`, then `  (firstLength : ℂ) * (joints.1 : ℂ) +`, then `    (secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Complex`, `Prod.fst`, `Prod.snd`
- **Reusable course declaration:** `ManifoldAdventure.robot_arm_tip`

#### After the proof

The configuration now determines a point on the work surface.

### 9.2 Both bars point forward

- **Level ID:** `robotarm-2`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.robot_arm_at_rest` (theorem)

#### Lesson

Ada returns both hinges to their home marks. The two bars lie in one straight line, so the tip sits at the sum of their lengths.

The identity `1` in [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle) points along the positive real axis. Unfolding `robot_arm_tip` leaves a direct complex-number calculation. The `simp` tactic knows the identity laws involved.

#### Human-readable objective

**Objective:** Compute the tip position when both joints are at the identity.

#### Goal

```lean
theorem robot_arm_at_rest (firstLength secondLength : ℝ) :
    robot_arm_tip firstLength secondLength (1, 1) =
      (firstLength + secondLength : ℝ) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  simp [robot_arm_tip]
```

#### Hints

1. This is a direct computation with the definition unfolded.
2. Simplify with `simp [robot_arm_tip]`.
3. *(hidden)* `simp [robot_arm_tip]`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_arm_at_rest`

#### After the proof

At rest, the arm reaches straight ahead by the sum of its link lengths.

### 9.3 A full shoulder turn reaches the same point

- **Level ID:** `robotarm-3`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.robot_full_turn_same_tip` (theorem)

> **3D MODEL: Two-joint robot arm**
>
> This interactive scene appears immediately after the lesson introduction. Turning the shoulder through a full revolution changes the angle but not either link direction, so the tip returns to the same point. Highlight state: the shoulder arc and arm.
>
> Asset: [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb)

#### Lesson

Ada rotates the shoulder through one complete turn while leaving the elbow reading alone. The arm sweeps around and returns to the same physical pose.

The previous world proved [`Circle.exp_add_two_pi`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp_add_two_pi). Rewriting that one joint makes the two configurations, and therefore their tip positions, equal.

#### Human-readable objective

**Objective:** Show that adding a full turn to the shoulder angle leaves the endpoint unchanged.

#### Goal

```lean
theorem robot_full_turn_same_tip (firstLength secondLength shoulder elbow : ℝ) :
    robot_arm_tip firstLength secondLength
        (Circle.exp (shoulder + 2 * Real.pi), Circle.exp elbow) =
      robot_arm_tip firstLength secondLength
        (Circle.exp shoulder, Circle.exp elbow) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rw [Circle.exp_add_two_pi]
```

#### Hints

1. Only the shoulder reading differs between the two configurations.
2. Rewrite it with `Circle.exp_add_two_pi`.
3. *(hidden)* `rw [Circle.exp_add_two_pi]`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_full_turn_same_tip`

#### After the proof

Different real angles can now describe the same arm pose.

### 9.4 The arm moves without a jump

- **Level ID:** `robotarm-4`
- **Verification:** native reference check required; exact browser record pending
- **Creates:** `ManifoldAdventure.robot_arm_tip_continuous` (theorem)

> **3D MODEL: Two-joint robot arm**
>
> This interactive scene appears immediately after the lesson introduction. Small changes at either circular joint produce small changes at the tip. Highlight state: both joint arcs, both links, and the tip.
>
> Asset: [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb)

#### Lesson

Ada nudges either hinge. The tip moves with it instead of jumping to a distant point on the table.

The coordinate projections from `Circle × Circle` are [`Continuous`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Defs/Basic.html#Continuous). Coercing a circle point into `ℂ` is continuous too, and sums and products of continuous complex-valued functions stay continuous. The proof assembles those facts in the same order as the arm formula.

#### Human-readable objective

**Objective:** Prove that the forward-kinematics map from joint states to tip positions is continuous.

#### Goal

```lean
theorem robot_arm_tip_continuous (firstLength secondLength : ℝ) :
    Continuous (robot_arm_tip firstLength secondLength) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  unfold robot_arm_tip
  exact (continuous_const.mul (continuous_subtype_val.comp continuous_fst)).add
    (continuous_const.mul ((continuous_subtype_val.comp continuous_fst).mul
      (continuous_subtype_val.comp continuous_snd)))
```

#### Hints

1. Unfold `robot_arm_tip` so that the two link contributions are visible.
2. Build continuity with `.comp`, `.mul`, and `.add` in the same shape as the formula.
3. *(hidden)* `unfold robot_arm_tip`, then `exact (continuous_const.mul (continuous_subtype_val.comp continuous_fst)).add`, then `  (continuous_const.mul ((continuous_subtype_val.comp continuous_fst).mul`, then `    (continuous_subtype_val.comp continuous_snd)))`

#### Unlocks

- **Lean tactics:** `unfold`, `fun_prop`
- **Mathlib theorems/declarations:** `continuous_const`, `continuous_subtype_val`, `continuous_fst`, `continuous_snd`, `Continuous.comp`, `Continuous.mul`, `Continuous.add`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_arm_tip_continuous`

#### After the proof

Small changes at the hinges now produce small changes at the tip. Now that Ada has built the proof by hand, the course gives her the power tool: with `fun_prop` unlocked, `unfold robot_arm_tip; fun_prop` closes the same goal in one line.

## End-state inventory

After completing all 9 worlds, including the optional branches, the player has unlocked the following named Mathlib declarations and Lean tactics.

### Tactics

- `exact`
- `apply`
- `constructor`
- `·`
- `rw`
- `simpa`
- `simp`
- `infer_instance`
- `intro`
- `rfl`
- `refine`
- `ext`
- `by_cases`
- `left`
- `right`
- `unfold`
- `fun_prop`

### Mathlib theorems and declarations

- `Homeomorph.continuous`
- `Homeomorph.continuous_symm`
- `Homeomorph.symm_apply_apply`
- `Homeomorph.trans_apply`
- `OpenPartialHomeomorph.open_source`
- `OpenPartialHomeomorph.continuousOn`
- `OpenPartialHomeomorph.map_source`
- `OpenPartialHomeomorph.left_inv`
- `OpenPartialHomeomorph.map_target`
- `OpenPartialHomeomorph.right_inv`
- `mem_chart_source`
- `chart_mem_atlas`
- `mem_chart_target`
- `chart_source_mem_nhds`
- `iUnion_source_chartAt`
- `chartAt_self_eq`
- `chartedSpaceSelf_atlas`
- `prodChartedSpace_chartAt`
- `OpenPartialHomeomorph.trans_source`
- `OpenPartialHomeomorph.symm_source`
- `instIsManifoldModelSpace`
- `IsManifold.of_le`
- `IsManifold.prod`
- `stereographic_source`
- `stereographic_apply_neg`
- `norm_eq_of_mem_sphere`
- `surjective_stereographic`
- `Set.mem_compl_iff`
- `Set.mem_singleton_iff`
- `Set.mem_union`
- `Set.mem_univ`
- `iff_true`
- `Eq.symm`
- `Eq.trans`
- `Circle.exp_zero`
- `Circle.exp_add`
- `Circle.exp_add_two_pi`
- `contMDiff_circleExp`
- `continuous_const`
- `continuous_subtype_val`
- `continuous_fst`
- `continuous_snd`
- `Continuous.comp`
- `Continuous.mul`
- `Continuous.add`

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
- `And`
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
- `Iff.mpr`
- `Iff.mp`
- `ModelProd`
- `OpenPartialHomeomorph.prod`
- `prodChartedSpace`
- `OpenPartialHomeomorph.trans`
- `Set.inter`
- `Set.preimage`
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
- `Metric.sphere`
- `stereographic`
- `Set.compl`
- `Neg.neg`
- `Function.Surjective`
- `Set.union`
- `Or`
- `Circle`
- `Circle.exp`
- `One.one`
- `Mul.mul`
- `Real.pi`
- `ContMDiff`
- `CMDiff`
- `Complex`
- `Prod.fst`
- `Prod.snd`

### Course declarations

- `ManifoldAdventure.homeomorph_continuous`: The drawing matches the trail
- `ManifoldAdventure.homeomorph_inverse_continuous`: The drawing leads Ada back
- `ManifoldAdventure.homeomorph_round_trip`: Back where she started
- `ManifoldAdventure.homeomorph_composition_apply`: Into the route book
- `ManifoldAdventure.local_chart_source_open`: Room around every place
- `ManifoldAdventure.local_chart_continuous`: No jumps inside the patch
- `ManifoldAdventure.local_chart_maps_source`: Her mark lands in the drawing
- `ManifoldAdventure.local_chart_round_trip`: Back to the same spot
- `ManifoldAdventure.local_chart_reads_back`: The leaf reads back into the patch
- `ManifoldAdventure.point_mem_preferred_chart`: A leaf for where she stands
- `ManifoldAdventure.preferred_chart_mem_atlas`: This leaf is in the atlas
- `ManifoldAdventure.preferred_chart_maps_to_target`: Her place lands on the leaf
- `ManifoldAdventure.preferred_chart_source_is_neighborhood`: The map works nearby
- `ManifoldAdventure.preferred_charts_cover`: No place left uncovered
- `ManifoldAdventure.self_chart_is_identity`: The reference grid stays put
- `ManifoldAdventure.identity_mem_self_atlas`: The identity is filed in the atlas
- `ManifoldAdventure.self_atlas_chart_is_identity`: Only the identity is filed there
- `ManifoldAdventure.product_chart_is_product`: Two readings at once
- `ManifoldAdventure.product_point_mem_chart_source`: The paired chart contains her place
- `ManifoldAdventure.transition_map_source`: Two leaves in conversation
- `ManifoldAdventure.model_space_is_manifold`: The reference leaf is ready
- `ManifoldAdventure.manifold_of_higher_smoothness`: Passing an easier check
- `ManifoldAdventure.smooth_manifold_is_topological`: The smooth atlas passes the basic check
- `ManifoldAdventure.product_of_manifolds`: Two circles make a torus
- `ManifoldAdventure.tangent_zero`: Ada stands still
- `ManifoldAdventure.tangent_bundle_base`: Read the location tag
- `ManifoldAdventure.tangent_bundle_has_zero`: Standing still anywhere
- `ManifoldAdventure.stereographic_map_misses_pole`: The pole stays off the leaf
- `ManifoldAdventure.opposite_pole_is_origin`: The far pole lands in the middle
- `ManifoldAdventure.every_stereographic_mark_has_source`: Every mark has a place on the bead
- `ManifoldAdventure.stereographic_off_pole`: Off the pole, onto the leaf
- `ManifoldAdventure.two_stereographic_maps_cover`: The second leaf covers the hole
- `ManifoldAdventure.circle_zero_turn`: No turn leaves the pointer home
- `ManifoldAdventure.circle_turns_compose`: Two turns compose
- `ManifoldAdventure.circle_full_turn`: One full turn changes nothing
- `ManifoldAdventure.circle_turning_is_smooth`: The pointer turns smoothly
- `ManifoldAdventure.robot_arm_tip`: Find the tip of the arm
- `ManifoldAdventure.robot_arm_at_rest`: Both bars point forward
- `ManifoldAdventure.robot_full_turn_same_tip`: A full shoulder turn reaches the same point
- `ManifoldAdventure.robot_arm_tip_continuous`: The arm moves without a jump
