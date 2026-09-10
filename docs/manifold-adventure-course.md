# Manifold Adventure: complete course review

> This is a reviewer-facing Markdown rendering of the generated course data.
> Every level includes the prose, Lean goal, official solution, hints, and unlocks.
> A **3D MODEL** callout appears wherever the web course displays a 3D scene.

**Course status:** 45/45 reference solutions are recorded against the exact browser compiler for this revision. Native reference checks run separately during development; the exact browser pin remains the release gate.

**Caption:** A kernel-checked course on Mathlib topology and manifolds, with optional paths through map projections and robot motion.

## Revision notes (r5)

- The main path was rebuilt around understanding rather than API coverage: one chart, then the sphere that no single chart covers, then atlases, smooth transitions, and tangent vectors, each checked on the sphere before it is stated in general.
- Ten new levels (module `ManifoldAdventure.Course`): the pointwise covering of the sphere, the sphere's preferred chart and atlas, chart changes as groupoid membership and as `ContDiffOn`, the smooth transition between two stereographic charts, the smooth inclusion of the sphere, and the tangent plane as the orthogonal complement of the radius.
- Eight bookkeeping levels left the main path: chart membership facts are granted as inventory asides, the identity-chart world and the regularity-order levels became optional worlds.
- No main-path level is closed by `infer_instance`.
- Three interactive labs sit beside the lessons: a draggable stereographic projection with both poles and the transition map, an angle-chart dial, and a tangent plane that follows a point around the sphere.
- Key levels carry a "Think first" prompt with a hidden answer.

### Earlier (r4)

- Homeomorphisms and Open partial homeomorphisms merged into one five-level opening world. The lemmas of the cut levels are granted as inventory from a neighbouring lesson instead.
- Every level compiles against one shared Lean environment, so the Mathlib import runs once per session and moving between worlds is instant.
- Level identifiers are unchanged, so earlier conformance records and saved player progress carry over.

### Earlier (r3)

- Every level has a conceptual hint, a tool hint, and a hidden solution hint.
- Levels exercise the inverse side of a partial chart, both directions of the self-atlas equivalence, an actual transition map, and stereographic source membership.
- Definition-only exercises that accepted any well-typed term were removed from Tangent Spaces and Robot Arm.
- Repeated 3D assets use different named-object highlights, and the robot arm has its own world.
- Completing the final robot proof grants `fun_prop`; it is not available while solving that level.
- The optional reachability world proves the two radial obstructions for a planar two-link arm and includes an interactive annulus lab in every lesson.
- The world overview lets reviewers compare two and three links. The three-link mode is explicitly marked as an outlook rather than part of the four Lean goals.

## Course map

| World | Levels | Prerequisite | Interactive content |
| --- | ---: | --- | --- |
| 1. One trail, one leaf | 4 | None | 1 lesson scene |
| 2. One pole is missing | 5 | `Charts` | projection lab in overview; 4 lesson labs |
| 3. A stack of maps | 5 | `Sphere` | angle lab in overview; 1 lesson lab; 1 lesson scene |
| 4. Smooth manifolds | 5 | `ChartedSpaces` | 2 lesson labs |
| 5. A direction at every point | 5 | `SmoothManifolds` | tangent lab in overview; 3 lesson labs; 2 lesson scenes |
| 6. Identity and product charts | 5 | `ChartedSpaces` | seven-model explorer; 2 lesson scenes |
| 7. How smooth is smooth | 3 | `SmoothManifolds` | None |
| 8. The dial comes around | 5 | `SmoothManifolds` | 2 lesson labs |
| 9. Two hinges, one reach | 4 | `CircleMotion` | 1 world scene; 3 lesson scenes |
| 10. Can the arm touch it? | 4 | `RobotArm` | reachability lab in overview and 4 lessons |

## 3D model index

The identity-and-product-charts world opens with a seven-model explorer, the robot-arm world opens with the arm itself, and the reachability world contains an interactive workspace lab. The sphere, atlas, and tangent worlds open with draggable labs described in the course map. Individual lessons also embed models:

| Location | Model | Asset |
| --- | --- | --- |
| Charts, level 3: Back to the same spot | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| ChartedSpaces, level 3: No place left uncovered | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| CanonicalCharts, level 4: Two readings at once | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| CanonicalCharts, level 5: The paired chart contains her place | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| TangentSpaces, level 1: Ada stands still | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| TangentSpaces, level 2: Read the location tag | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| RobotArm, level 1: Find the tip of the arm | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, level 3: A full shoulder turn reaches the same point | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, level 4: The arm moves without a jump | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |
| RobotArm, world overview: Where the arm can reach | Two-joint robot arm | [`robot-arm.glb`](../public/game-assets/manifolds/models/robot-arm.glb) |

The seven-model explorer additionally includes:

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

The main path is short and concrete. It starts with one chart, moves at once to a sphere that no single chart can cover, then builds the general words: an [`atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) of charts, smooth changes between them ([`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold)), and the [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) of velocities at a point. Every word is checked on the sphere before it is stated in general. Optional paths go deeper into Mathlib's chart instances, regularity orders, circular motion, and a two-joint robot arm whose configuration space is a torus.

### Course information

The formal sources are in `lean/ManifoldAdventure/`. Each world module imports the smallest Mathlib area it needs, from homeomorphisms through smooth manifolds, at pinned Mathlib commit `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`. The browser loads their union once, so every level shares one Lean environment and switching worlds costs nothing.

Hints are staged. The first gives a conceptual nudge, the second names the tool, and the third contains the full solution. A tactic may appear as new in more than one level when optional branches make the first encounter order-dependent.

For the mathematics, continue with Loring Tu's *An Introduction to Manifolds*, John Lee's *Introduction to Smooth Manifolds*, or John Milnor's *Topology from the Differentiable Viewpoint*.

### Formal source

- Repository: https://github.com/cauli/lean4-wasm-in-browser
- Course source revision: `mathlib-manifolds-de3a9cf330-r5`
- Lean toolchain: `cauli/lean4@62b6a22913 (upstream ecf55de08b)`
- Mathlib commit: `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`
- License: Apache-2.0 for Mathlib; original course text in this repository

## World 1: One trail, one leaf

**Prerequisites:** None

### One path, two descriptions

Ada begins on a single trail. She can copy the whole route onto one leaf, matching every place on the trail with one place in the drawing. A [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph) is Mathlib's bundled version of such a correspondence: an equivalence together with continuity proofs in both directions.

The trail soon climbs onto a rounded stone. From where Ada stands she can survey only the patch around her, so she draws just the part she can see. Mathlib represents one local chart by [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph): it has a `source` on the stone, a `target` in the drawing, and inverse laws that apply inside the patch.

Glossary for this course: a leaf is a chart, the shaded patch is its `source`, the drawing is its `target`, a stack of leaves is an atlas, and the stone or bead is the manifold. The first level names its instance assumptions, such as `trailTopology`, so the lesson can point at them. Later levels leave them anonymous, which is ordinary Lean style.

### 1.1 The drawing matches the trail

- **Level ID:** `homeomorphisms-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_continuous` (theorem)

#### Lesson

Ada stands midway along a path. North leads back to the nest; south leads to a patch of berries. She copies the path onto a leaf. As she moves a little along the trail, her mark should move only a little on the drawing. There can be no sudden jump.

Here `Trail` is the actual path and `Drawing` is the line Ada drew. The objects `trailTopology` and `drawingTopology` tell Lean what it means for points to be nearby in each space. Then `trailMap : Trail ≃ₜ Drawing` matches their points homeomorphically. It already contains a proof that its forward function is continuous, exposed as [`Homeomorph.continuous`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.continuous) or `trailMap.continuous`.

Three more facts about `trailMap` ride along in the same bundle and join the inventory now: the reverse map `trailMap.symm` is continuous, [`Homeomorph.continuous_symm`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.continuous_symm); the round trip `trailMap.symm (trailMap place) = place` is [`Homeomorph.symm_apply_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.symm_apply_apply); and composing two such maps applies them in order, [`Homeomorph.trans_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph.trans_apply).

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
- **Mathlib theorems/declarations:** `Homeomorph.continuous`, `Homeomorph.continuous_symm`, `Homeomorph.symm_apply_apply`, `Homeomorph.trans_apply`
- **Structures, definitions, and notation:** `TopologicalSpace`, `Homeomorph`, `Continuous`, `Homeomorph.symm`, `Homeomorph.trans`, `Eq`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_continuous`

#### After the proof

Ada's drawing now moves continuously with the trail.

### 1.2 Her mark lands in the drawing

- **Level ID:** `localcharts-3`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_maps_source` (theorem)

#### Lesson

Ada chooses a point inside the shaded patch and places its mark on the leaf. Since the point is in the part she mapped, the mark must lie in the drawn coordinate region.

Lean names Ada's chosen point `place`. The hypothesis `inPatch : place ∈ chart.source` says that it lies in the shaded part of the stone. Mathlib's [`OpenPartialHomeomorph.map_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.map_source) then concludes that `chart place` lies in the drawn target. Type `\in` for `∈`.

Two chart facts come along without their own levels: the shaded patch `chart.source` is open, stored as [`OpenPartialHomeomorph.open_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.open_source), and the chart is continuous on that patch, stored as [`OpenPartialHomeomorph.continuousOn`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.continuousOn). Both are in the inventory.

#### Human-readable objective

**Objective:** Show that a point in the chart source maps into its coordinate target.

#### Think first

> **Before proving it: why does a chart need a source at all? What goes wrong if Ada tries to draw the whole stone on one leaf?**
>
> A leaf is flat and the stone is closed, so no single continuous one-to-one drawing of the whole stone fits on a leaf. Restricting to a patch is what makes the chart possible.

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
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.map_source`, `OpenPartialHomeomorph.open_source`, `OpenPartialHomeomorph.continuousOn`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.target`, `Membership.mem`, `OpenPartialHomeomorph`, `OpenPartialHomeomorph.source`, `IsOpen`, `ContinuousOn`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_maps_source`

#### After the proof

Once Lean knows that `place` is in the source, its coordinates belong to the target.

### 1.3 Back to the same spot

- **Level ID:** `localcharts-4`
- **Verification:** exact browser Lean kernel
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

### 1.4 The leaf reads back into the patch

- **Level ID:** `localcharts-5`
- **Verification:** exact browser Lean kernel
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

## World 2: One pole is missing

**Prerequisites:** `Charts`

### A round world on a flat leaf

Ada finds a glass bead near the trail. She wants to copy its surface onto a leaf, but one drawing cannot include the point where she holds the bead. She makes a second drawing from the other pole to cover the gap. This is the whole reason manifolds need atlases, so the course meets it before it meets the general words.

Mathlib builds the drawing as [`stereographic`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic), an `OpenPartialHomeomorph` from the unit sphere to a flat plane. Try the projection lab below: drag Ada around the bead and watch her mark race off the leaf as she nears the pole, then switch poles and compare the two readings of the same point. The levels prove what the lab shows, and introduce the case-splitting tactics they need on the way to the covering proof.

### 2.1 The pole stays off the leaf

- **Level ID:** `mapprojections-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.stereographic_map_misses_pole` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada presses one point of the bead between her feet while she draws. That point is the pole of the projection, so it cannot appear in this chart.

The source of `stereographic unitPole` is the sphere with the pole removed. Mathlib states this as [`stereographic_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_source). The complement notation `{⟨pole, ...⟩}ᶜ` means every sphere point except that one.

The singleton's element appears as `⟨pole, by simp [unitPole]⟩`. A sphere point is a vector paired with a certificate that its norm is one. Read the embedded proof as Mathlib filling in that certificate from `unitPole`.

One more fact rides along: every mark on the leaf comes from some point of the bead, [`surjective_stereographic`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#surjective_stereographic), so no coordinate on the drawing is wasted. It is in the inventory.

#### Human-readable objective

**Objective:** Show that the stereographic chart covers the sphere except for its chosen pole.

#### Think first

> **Before proving it: as Ada walks toward the pole she is projecting from, what happens to her mark on the leaf?**
>
> It runs off toward infinity. The pole itself has no mark, which is why it must be removed from the chart's source.

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
- **Mathlib theorems/declarations:** `stereographic_source`, `surjective_stereographic`
- **Structures, definitions, and notation:** `Metric.sphere`, `stereographic`, `Set.compl`
- **Reusable course declaration:** `ManifoldAdventure.stereographic_map_misses_pole`

#### After the proof

The first drawing now has an exact missing point.

### 2.2 The far pole lands in the middle

- **Level ID:** `mapprojections-2`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.opposite_pole_is_origin` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

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

### 2.3 Off the pole, onto the leaf

- **Level ID:** `mapprojections-4`
- **Verification:** exact browser Lean kernel
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

### 2.4 One of the two leaves shows her place

- **Level ID:** `course-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.two_leaves_cover_point` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada holds two drawings of the bead, one made from the north pole and one from the south pole. She picks any point of the bead and asks which drawing shows it. If the point is the north pole, the south drawing has it. Otherwise the north drawing does.

Each source is the sphere with one pole removed, so after [`stereographic_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic_source) and the membership lemmas from the previous level, the goal reads "`place ≠ north` or `place ≠ south`". A proof by cases on `place = north` (the tactic `by_cases`) splits the world in two. In each half, `left` or `right` chooses which side of the `∨` to prove. To prove `place ≠ south`, which means `place = south → False`, use `intro` to assume the equality and derive the contradiction with `different`, chaining the two equalities as `atNorth.symm.trans atSouth`.

#### Human-readable objective

**Objective:** Show that every point of the bead lies in the source of the north chart or in the source of the south chart.

#### Think first

> **Before proving it: which single point of the bead is missing from the north drawing, and why can the south drawing not miss that same point?**
>
> The north drawing misses exactly the north pole. The south drawing misses exactly the south pole, and the two poles are different points, so no point is missing from both.

#### Goal

```lean
theorem two_leaves_cover_point {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space]
    (north south : sphere (0 : Space) 1) (different : north ≠ south)
    (place : sphere (0 : Space) 1) :
    place ∈ (stereographic (norm_eq_of_mem_sphere north)).source ∨
      place ∈ (stereographic (norm_eq_of_mem_sphere south)).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]
  by_cases atNorth : place = north
  · right
    intro atSouth
    exact different (atNorth.symm.trans atSouth)
  · left
    exact atNorth
```

#### Hints

1. Split on whether the point is the north pole. In each case one of the two leaves must show it.
2. After `simp only` with the source and membership lemmas, use `by_cases atNorth : place = north`, then `right` or `left`; the north case needs `intro` and `different (atNorth.symm.trans atSouth)`.
3. *(hidden)* `simp only [stereographic_source, Set.mem_compl_iff, Set.mem_singleton_iff]`, then `by_cases atNorth : place = north`, then `· right`, then `  intro atSouth`, then `  exact different (atNorth.symm.trans atSouth)`, then `· left`, then `  exact atNorth`

#### Unlocks

- **Lean tactics:** `by_cases`, `left`, `right`, `intro`
- **Mathlib theorems/declarations:** `Eq.symm`, `Eq.trans`
- **Structures, definitions, and notation:** `Or`, `Ne`, `Not`
- **Reusable course declaration:** `ManifoldAdventure.two_leaves_cover_point`

#### After the proof

Every point of the bead appears on at least one of Ada's two leaves.

### 2.5 The second leaf covers the hole

- **Level ID:** `mapprojections-5`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.two_stereographic_maps_cover` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

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

- **Lean tactics:** `ext`
- **Mathlib theorems/declarations:** `Set.mem_union`, `Set.mem_univ`, `iff_true`
- **Structures, definitions, and notation:** `Set.union`, `Set.univ`, `Or`
- **Reusable course declaration:** `ManifoldAdventure.two_stereographic_maps_cover`

#### After the proof

Two leaves are enough to record every point on the bead. This pair is the atlas Mathlib uses to make the sphere a `ChartedSpace`, which the next world states in general.

## World 3: A stack of maps

**Prerequisites:** `Sphere`

### A stack of maps

The bead needed two leaves; a rougher stone may need many. Ada keeps her leaves together as her atlas, and for every place she stands she has a preferred leaf that shows it.

The class [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) equips a surface with an atlas and a preferred chart `chartAt` for each point. The goals call the actual world `Surface`, the shared coordinate space `Coordinates`, and Ada's location `place`. Mathlib often writes the same three objects as `M`, `H`, and `x`. The last two levels return to the bead and identify its preferred leaves with the projections of the previous world. The angle lab below shows the same idea on a circle: two arcs, each with its own angle reading, and an overlap where the readings differ by a fixed shift.

### 3.1 A leaf for where she stands

- **Level ID:** `chartedspaces-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.point_mem_preferred_chart` (theorem)

#### Lesson

Wherever Ada stops, she selects a leaf whose shaded patch contains her current position. A preferred map that missed her would be useless.

The instance `[ChartedSpace Coordinates Surface]` is Ada's collection of local leaves. Mathlib's [`mem_chart_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_source) says that `chartAt Coordinates place`, the leaf chosen at her current location, contains `place` in its source. Smooth compatibility between overlapping leaves comes later, with `IsManifold`.

Two neighbouring facts join the inventory here: the preferred leaf is one of the leaves in the atlas, [`chart_mem_atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_mem_atlas), and its shaded patch contains a whole neighbourhood of `place`, [`chart_source_mem_nhds`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chart_source_mem_nhds). The second is stated with the neighbourhood filter `𝓝 place`, which is a collection of sets, so `source ∈ 𝓝 place` says that the source contains an open set around `place`.

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
- **Mathlib theorems/declarations:** `mem_chart_source`, `chart_mem_atlas`, `chart_source_mem_nhds`
- **Structures, definitions, and notation:** `ChartedSpace`, `chartAt`, `atlas`, `nhds`
- **Reusable course declaration:** `ManifoldAdventure.point_mem_preferred_chart`

#### After the proof

Ada can always choose a chart that contains where she stands.

### 3.2 Her place lands on the leaf

- **Level ID:** `chartedspaces-3`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_maps_to_target` (theorem)

#### Lesson

Ada presses her current position through the chosen chart. Its mark lands inside the coordinate patch drawn on the leaf.

Read `chartAt Coordinates place place` as `(chartAt Coordinates place) place`. The first `place` selects Ada's chart, and the second is the point drawn in `Coordinates`. No new lemma is needed. The first world's `map_source` sends a source point into its chart's target, and the first level of this world put `place` in this chart's source. Mathlib also packages the combination as [`mem_chart_target`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_chart_target), which joins your book after this proof.

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

1. Combine the chart law `map_source` with the fact that the preferred chart contains its point.
2. Apply `(chartAt Coordinates place).map_source`; the remaining goal is `mem_chart_source Coordinates place`.
3. *(hidden)* `apply (chartAt Coordinates place).map_source`, then `exact mem_chart_source Coordinates place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_target`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_maps_to_target`

#### After the proof

Ada built the target fact from parts she already owned. Mathlib's one-step `mem_chart_target` is now in her book too.

### 3.3 No place left uncovered

- **Level ID:** `chartedspaces-5`
- **Verification:** exact browser Lean kernel
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

### 3.4 The preferred leaf comes from the far pole

- **Level ID:** `course-2`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.sphere_preferred_chart` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada stands on the bead and asks for the leaf her atlas prefers at her location. Mathlib hands her the projection made from the point directly opposite her, so that her own place lands near the middle of the drawing.

The sphere's [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) instance in Mathlib chooses `chartAt` to be [`stereographic'`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic') from the antipodal point `-place`. Here `stereographic'` is the same projection as before, rewritten to land in `EuclideanSpace ℝ (Fin dimension)`, the ordinary coordinate space of the right dimension. The assumption `Fact (Module.finrank ℝ Space = dimension + 1)` records that a sphere inside a space of dimension `dimension + 1` is itself `dimension`-dimensional. Because this is how the instance is defined, the two sides are equal by definition, and `rfl` closes the goal.

#### Human-readable objective

**Objective:** Show that the chart Mathlib prefers at `place` is the stereographic projection from the opposite point.

#### Think first

> **Before proving it: if Ada stands at the north pole, which point is the pole of her preferred chart, and where does she herself land on that drawing?**
>
> Her preferred chart projects from the south pole. She stands opposite that pole, so her own position lands at the origin of the drawing.

#### Goal

```lean
theorem sphere_preferred_chart {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    chartAt (EuclideanSpace ℝ (Fin dimension)) place = stereographic' dimension (-place) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rfl
```

#### Hints

1. The instance was defined by this very formula.
2. Definitional equalities close with `rfl`.
3. *(hidden)* `rfl`

#### Unlocks

- **Lean tactics:** `rfl`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `stereographic'`, `EuclideanSpace`, `Fact`, `Module.finrank`
- **Reusable course declaration:** `ManifoldAdventure.sphere_preferred_chart`

#### After the proof

The abstract `chartAt` and the concrete projection are the same leaf.

### 3.5 Every projection is filed in the atlas

- **Level ID:** `course-3`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.sphere_chart_in_atlas` (theorem)

#### Lesson

Ada can project the bead from any pole she likes. Each such drawing belongs in her atlas, not only the two she happened to make first.

Mathlib defines the sphere's atlas as the set of all charts of the form `stereographic' dimension pole` for some pole: in Lean, membership in [`atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas) unfolds to the statement "there exists a `pole` with `stereographic' dimension pole = stereographic' dimension pole`". An existence statement is proved by supplying a witness and a proof, written with angle brackets as `⟨pole, rfl⟩`.

#### Human-readable objective

**Objective:** Show that the projection from any pole belongs to the sphere's atlas.

#### Goal

```lean
theorem sphere_chart_in_atlas {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (pole : sphere (0 : Space) 1) :
    stereographic' dimension pole ∈ atlas (EuclideanSpace ℝ (Fin dimension)) (sphere (0 : Space) 1) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact ⟨pole, rfl⟩
```

#### Hints

1. The atlas is defined as "all projections from some pole", so exhibit the pole.
2. Use the anonymous constructor `⟨pole, rfl⟩` with `exact`.
3. *(hidden)* `exact ⟨pole, rfl⟩`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Exists`
- **Reusable course declaration:** `ManifoldAdventure.sphere_chart_in_atlas`

#### After the proof

Ada's atlas holds one leaf for every pole she could choose.

## World 4: Smooth manifolds

**Prerequisites:** `ChartedSpaces`

### When chart changes are smooth

Ada's leaves overlap, so she can compare two coordinate drawings of the same place. Continuity keeps nearby points nearby, but calculus also needs the change between drawings to have controlled derivatives. That change is the only place where "smooth" can be defined, because the surface itself has no coordinates.

Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) adds exactly this condition to a `ChartedSpace`. Three words appear in the goals and deserve a plain reading. `Scalar` is the number field; read it as `ℝ`. `ModelWithCorners` connects the coordinate space to the vector space where derivatives live; for ordinary Euclidean coordinates it is the identity, written `𝓡 n` or `𝓘(ℝ, E)`, and corners only matter for manifolds with boundary. `order : WithTop ℕ∞` is how many derivatives are required: a number, `∞` for all finite orders, or `ω` for analytic. The world states the definition in general, checks it on the bead, and ends with the torus as a product.

### 4.1 Two leaves in conversation

- **Level ID:** `smoothmanifolds-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.transition_map_source` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada holds two overlapping leaves of the same stone. She reads a mark from the first leaf back onto the stone, then presses that point through the second. This is the transition map between the drawings.

Formally, the transition map is `chart.symm.trans chart'`: invert one chart, then apply the other. Its domain contains marks in the first chart's target whose read-back lands in the second chart's source. The preimage `chart.symm ⁻¹' chart'.source` collects those marks. Mathlib computes the domain with [`OpenPartialHomeomorph.trans_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.trans_source), while [`OpenPartialHomeomorph.symm_source`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph.symm_source) renames the inverse chart's source to `chart.target`.

Two related facts join the inventory: a smooth atlas is also a continuous atlas, so `IsManifold model 0 Surface` follows from any higher order, and the model coordinate space is itself a manifold at every order, [`instIsManifoldModelSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#instIsManifoldModelSpace). The optional "How smooth is smooth" world proves these.

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

- **Lean tactics:** `rw`
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.trans_source`, `OpenPartialHomeomorph.symm_source`, `instIsManifoldModelSpace`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.trans`, `Set.inter`, `Set.preimage`
- **Reusable course declaration:** `ManifoldAdventure.transition_map_source`

#### After the proof

The transition map now has an explicit home: the overlap as seen from the first leaf.

### 4.2 Changing leaves is a smooth move

- **Level ID:** `course-4`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.chart_change_is_smooth` (theorem)

#### Lesson

Ada compares two leaves from her atlas over the region where both apply. Reading a mark from the first leaf back onto the surface and then onto the second leaf is the transition between the two drawings. On a smooth manifold, this transition never creases.

This level is the definition of a smooth manifold. [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) says the atlas has a structure groupoid: every change of charts `chart.symm ≫ₕ chart'` between atlas members belongs to [`contDiffGroupoid`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#contDiffGroupoid), the collection of local maps of the coordinate space that are differentiable to the given `order`. The symbol `≫ₕ` composes partial homeomorphisms. The field [`HasGroupoid.compatible`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#HasGroupoid.compatible) states exactly this, given the two atlas memberships.

#### Human-readable objective

**Objective:** Show that the change of coordinates between two atlas charts belongs to the smooth groupoid.

#### Think first

> **Before proving it: the surface itself has no coordinates. Where does the derivative that "smooth" talks about actually live?**
>
> In the coordinate space. Smoothness is a property of the transition maps between charts, which are maps between open sets of the coordinate space, where derivatives make sense.

#### Goal

```lean
theorem chart_change_is_smooth {Scalar : Type u} [NontriviallyNormedField Scalar]
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
    chart.symm ≫ₕ chart' ∈ contDiffGroupoid order model := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact HasGroupoid.compatible inAtlas inAtlas'
```

#### Hints

1. A smooth manifold is, by definition, an atlas whose chart changes are smooth.
2. The instance field `HasGroupoid.compatible` takes the two atlas memberships.
3. *(hidden)* `exact HasGroupoid.compatible inAtlas inAtlas'`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `HasGroupoid.compatible`
- **Structures, definitions, and notation:** `contDiffGroupoid`, `OpenPartialHomeomorph.trans`, `IsManifold`, `ModelWithCorners`, `WithTop`
- **Reusable course declaration:** `ManifoldAdventure.chart_change_is_smooth`

#### After the proof

The transition between any two of Ada's leaves is as smooth as the manifold promises.

### 4.3 The smooth move, spelled out in calculus

- **Level ID:** `course-5`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.chart_change_contDiffOn` (theorem)

#### Lesson

Ada wants the previous level in plain calculus. Membership in the smooth groupoid was a label; now she unpacks it into the sentence "this function is differentiable `order` times on this set".

[`ContDiffOn`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Calculus/ContDiff/Defs.html#ContDiffOn) is Mathlib's differentiability on a set. The function is the transition map wrapped by the `model`, which converts the abstract coordinate space `Coordinates` into the vector space `Vectors` where derivatives live; for ordinary Euclidean coordinates the model is the identity and can be ignored. The set is the transition's domain, seen through that model. Unpacking uses [`mem_groupoid_of_pregroupoid`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#mem_groupoid_of_pregroupoid), an `↔` statement: membership in the groupoid is equivalent to the conjunction of this condition for the map and for its inverse. An `↔` has two directions, `.mp` (left to right) and `.mpr` (right to left), and a conjunction's first part is `.1`. The tactic `have` names an intermediate fact so the next line can use it.

#### Human-readable objective

**Objective:** Show that the change of coordinates between two atlas charts is differentiable to the manifold's order on its domain.

#### Goal

```lean
theorem chart_change_contDiffOn {Scalar : Type u} [NontriviallyNormedField Scalar]
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
      (model.symm ⁻¹' (chart.symm ≫ₕ chart').source ∩ Set.range model) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  have compatible := HasGroupoid.compatible (G := contDiffGroupoid order model) inAtlas inAtlas'
  exact (mem_groupoid_of_pregroupoid.mp compatible).1
```

#### Hints

1. Groupoid membership is a pair of differentiability facts, one for the map and one for its inverse.
2. Name the membership with `have`, then take the first component of `mem_groupoid_of_pregroupoid.mp`.
3. *(hidden)* `have compatible := HasGroupoid.compatible (G := contDiffGroupoid order model) inAtlas inAtlas'`, then `exact (mem_groupoid_of_pregroupoid.mp compatible).1`

#### Unlocks

- **Lean tactics:** `have`
- **Mathlib theorems/declarations:** `mem_groupoid_of_pregroupoid`
- **Structures, definitions, and notation:** `ContDiffOn`, `Set.range`, `Set.preimage`, `Set.inter`, `And`, `Iff`, `Iff.mp`, `Iff.mpr`
- **Reusable course declaration:** `ManifoldAdventure.chart_change_contDiffOn`

#### After the proof

The word "smooth" now means a concrete differentiability statement about a concrete map.

### 4.4 Two drawings of the bead agree smoothly

- **Level ID:** `course-6`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.sphere_chart_change_smooth` (theorem)

> **INTERACTIVE LAB:** the projection lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada returns to the bead with the general fact in hand. Two of her projections, from any two poles, overlap on most of the bead. Reading one drawing into the other must be a smooth map of the plane.

Mathlib proves that the sphere is a smooth manifold, and that instance is enough. The model here is `𝓡 dimension`, Mathlib's notation for the identity model on `EuclideanSpace ℝ (Fin dimension)`, and `∞` asks for derivatives of every finite order. The general fact [`HasGroupoid.compatible`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#HasGroupoid.compatible) applies once both projections are known to be atlas members, which is the course theorem `sphere_chart_in_atlas` from the atlas world. Coordinates for the projection change are computed by [`stereographic'_symm_apply`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#stereographic'_symm_apply), but no computation is needed here.

#### Human-readable objective

**Objective:** Show that the coordinate change between two stereographic projections of the sphere is smooth.

#### Think first

> **Before proving it: in the plane, the change between the north and south drawings sends a point at distance r from the origin to a point at distance 4/r (with Mathlib's scaling). Where does that formula fail, and why does it not matter?**
>
> It fails at r = 0, the image of the far pole. That point is missing from the other drawing anyway, so it is not in the overlap where the transition is defined.

#### Goal

```lean
theorem sphere_chart_change_smooth {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (pole pole' : sphere (0 : Space) 1) :
    (stereographic' dimension pole).symm ≫ₕ stereographic' dimension pole' ∈
      contDiffGroupoid ∞ (𝓡 dimension) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact HasGroupoid.compatible (sphere_chart_in_atlas pole) (sphere_chart_in_atlas pole')
```

#### Hints

1. The sphere is a smooth manifold, so the general fact about atlas members applies.
2. Feed `HasGroupoid.compatible` the two memberships `sphere_chart_in_atlas pole` and `sphere_chart_in_atlas pole'`.
3. *(hidden)* `exact HasGroupoid.compatible (sphere_chart_in_atlas pole) (sphere_chart_in_atlas pole')`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `modelWithCornersSelf`
- **Reusable course declaration:** `ManifoldAdventure.sphere_chart_change_smooth`

#### After the proof

Ada's two drawings of the bead translate into each other without a crease, which is what makes the bead a smooth manifold.

### 4.5 Two circles make a torus

- **Level ID:** `smoothmanifolds-5`
- **Verification:** exact browser Lean kernel
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

## World 5: A direction at every point

**Prerequisites:** `SmoothManifolds`

### A direction at every point

Ada's atlas tells her where she is. At one point on the surface, she now asks which directions she could move without leaving it. On the bead the answer is visible: a plane touching the bead at her feet, square to the radius. The world builds that picture as theorems.

Mathlib assigns a [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) to every point, and the derivative of a smooth map between manifolds, [`mfderiv`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/MFDeriv/Defs.html#mfderiv), carries velocities from one tangent space to another. In the goals, `Surface` is Ada's world, `place` is her location, `model` describes its coordinates, and `velocity` is a tangent vector there. Drag the point in the tangent lab below to see the plane follow it around the bead.

### 5.1 Ada stands still

- **Level ID:** `tangentspaces-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.tangent_zero` (noncomputable def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The attached plane pictures the tangent space at Ada's chosen place. Standing still is its zero vector. Highlight state: Ada and the tangent plane, with no velocity arrow.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Ada stands still at `place`. Even without choosing a direction, staying still is a valid tangent velocity.

The [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace) `TangentSpace model place` is the intrinsic space of velocities available at Ada's current location. The plane in the 3D scene pictures this tangent space; it is not an arbitrary plane floating beside the surface. The space inherits an additive group structure from `Vectors`, so it contains a zero vector. The expected type tells Lean which `0` is intended.

This is a definition level, so the kernel accepts any well-typed term. Only one velocity here is canonical, and later levels reuse the course's official `tangent_zero`, so make it the zero vector.

The [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle) collects each place together with one of its velocities as a dependent pair `⟨place, velocity⟩`. This level constructs one velocity at one point; it does not yet define the zero section as a function of the point.

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

### 5.2 Read the location tag

- **Level ID:** `tangentspaces-2`
- **Verification:** exact browser Lean kernel
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

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentBundle`, `Bundle.TotalSpace`, `Sigma`, `Sigma.fst`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_base`

#### After the proof

Reading the bundle point's location tag returns `place`.

### 5.3 Leaving the bead for the room around it

- **Level ID:** `course-7`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.sphere_inclusion_smooth` (theorem)

> **INTERACTIVE LAB:** the tangent lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada has only ever measured positions on the bead. The bead also sits in the room, and each of her positions is a point of the room. Forgetting the bead and remembering only the room point should be a smooth operation.

[`ContMDiff`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ContMDiff/Defs.html#ContMDiff) is smoothness for a map between two manifolds, each with its own model: `𝓡 dimension` for the sphere and `𝓘(ℝ, Space)`, the identity model, for the surrounding vector space. The map `(↑)` is the inclusion that forgets the constraint `‖place‖ = 1`. Mathlib records its smoothness as [`contMDiff_coe_sphere`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#contMDiff_coe_sphere).

#### Human-readable objective

**Objective:** Show that the inclusion of the sphere into the surrounding space is smooth as a map between manifolds.

#### Goal

```lean
theorem sphere_inclusion_smooth {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)] :
    ContMDiff (𝓡 dimension) 𝓘(ℝ, Space) ∞ ((↑) : sphere (0 : Space) 1 → Space) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact contMDiff_coe_sphere
```

#### Hints

1. Mathlib proves that the inclusion of the sphere is a smooth map of manifolds.
2. The theorem is `contMDiff_coe_sphere`.
3. *(hidden)* `exact contMDiff_coe_sphere`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `contMDiff_coe_sphere`
- **Structures, definitions, and notation:** `ContMDiff`, `Subtype.val`
- **Reusable course declaration:** `ManifoldAdventure.sphere_inclusion_smooth`

#### After the proof

Ada's first smooth map between manifolds sends the bead into the room without a kink.

### 5.4 Her velocities are real vectors

- **Level ID:** `course-8`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.tangent_vectors_are_vectors` (theorem)

> **INTERACTIVE LAB:** the tangent lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada picks a velocity at her place on the bead. Since the bead sits in the room, that velocity is also a velocity in the room. Two different velocities on the bead must stay different in the room; nothing is flattened away.

The derivative of a smooth map between manifolds is [`mfderiv`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/MFDeriv/Defs.html#mfderiv). At `place`, it is a linear map from `TangentSpace (𝓡 dimension) place` to the tangent space of the room, which is the room itself. [`Function.Injective`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Logic/Function/Defs.html#Function.Injective) says this linear map loses nothing, and [`mfderiv_coe_sphere_injective`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#mfderiv_coe_sphere_injective) proves it for the inclusion of the sphere.

#### Human-readable objective

**Objective:** Show that the derivative of the inclusion at `place` is injective, so tangent vectors of the sphere are genuine vectors of the surrounding space.

#### Goal

```lean
theorem tangent_vectors_are_vectors {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    Function.Injective
      (mfderiv (𝓡 dimension) 𝓘(ℝ, Space) ((↑) : sphere (0 : Space) 1 → Space) place) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mfderiv_coe_sphere_injective place
```

#### Hints

1. The derivative of the inclusion embeds each tangent space into the room.
2. The theorem is `mfderiv_coe_sphere_injective` applied to `place`.
3. *(hidden)* `exact mfderiv_coe_sphere_injective place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mfderiv_coe_sphere_injective`
- **Structures, definitions, and notation:** `mfderiv`, `Function.Injective`
- **Reusable course declaration:** `ManifoldAdventure.tangent_vectors_are_vectors`

#### After the proof

Every abstract tangent vector at Ada's place is a real vector in the room, and different ones stay different.

### 5.5 The tangent plane stands square to the radius

- **Level ID:** `course-9`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.tangent_plane_is_orthogonal` (theorem)

> **INTERACTIVE LAB:** the tangent lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada asks which room vectors her bead velocities become. She expects exactly the vectors that lie flat against the bead at her place: perpendicular to the line from the center through her feet.

The image of the derivative is [`LinearMap.range`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Algebra/Module/Submodule/Range.html#LinearMap.range); the derivative is a continuous linear map, and `ContinuousLinearMap.toLinearMap` forgets the continuity so that `range` applies. The line through `place` is the span `ℝ ∙ (place : Space)`, and `ᗮ` (type `\perp`) is its [`Submodule.orthogonal`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/InnerProductSpace/Orthogonal.html#Submodule.orthogonal) complement. Mathlib's [`range_mfderiv_coe_sphere`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/Instances/Sphere.html#range_mfderiv_coe_sphere) identifies the two. This is the tangent plane drawn in the scene, now as a theorem.

#### Human-readable objective

**Objective:** Show that the tangent vectors at `place`, seen in the room, are exactly the vectors orthogonal to `place`.

#### Think first

> **Before proving it: the sphere in a space of dimension d+1 has tangent spaces of which dimension, and how does the orthogonal complement of one vector confirm it?**
>
> Dimension d. The orthogonal complement of a single nonzero vector in a (d+1)-dimensional space has dimension d.

#### Goal

```lean
theorem tangent_plane_is_orthogonal {Space : Type u} [NormedAddCommGroup Space]
    [InnerProductSpace ℝ Space] {dimension : ℕ}
    [Fact (Module.finrank ℝ Space = dimension + 1)]
    (place : sphere (0 : Space) 1) :
    LinearMap.range (ContinuousLinearMap.toLinearMap
      (mfderiv (𝓡 dimension) 𝓘(ℝ, Space) ((↑) : sphere (0 : Space) 1 → Space) place))
      = (ℝ ∙ (place : Space))ᗮ := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact range_mfderiv_coe_sphere place
```

#### Hints

1. The tangent plane of a sphere is perpendicular to the radius, and Mathlib says so about the range of the derivative.
2. The theorem is `range_mfderiv_coe_sphere` applied to `place`.
3. *(hidden)* `exact range_mfderiv_coe_sphere place`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `range_mfderiv_coe_sphere`
- **Structures, definitions, and notation:** `LinearMap.range`, `ContinuousLinearMap.toLinearMap`, `Submodule.span`, `Submodule.orthogonal`
- **Reusable course declaration:** `ManifoldAdventure.tangent_plane_is_orthogonal`

#### After the proof

The tangent plane at Ada's place is the plane perpendicular to her radius, exactly as the picture suggested.

## World 6: Identity and product charts

**Prerequisites:** `ChartedSpaces`

### Charts Lean already knows

Ada sets two identical reference grids on top of each other before returning to the curved surface. One maps to the other without moving a mark. A place with two independent readings needs a pair of maps.

Mathlib supplies canonical [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace) instances for self charts and products. Here the goal names the two torus factors `FirstSurface` and `SecondSurface`, together with their coordinate spaces. The types determine which instance Lean uses, even though the notation `chartAt` stays the same. The shape gallery below is optional; some objects return in the levels, while others preview later topology.

> **3D MODEL LAB: seven-model explorer**
>
> The web course places an interactive model selector on this world overview. It contains every model listed in the [3D model index](#3d-model-index).

### 6.1 The reference grid stays put

- **Level ID:** `canonicalcharts-1`
- **Verification:** exact browser Lean kernel
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

### 6.2 The identity is filed in the atlas

- **Level ID:** `canonicalcharts-2`
- **Verification:** exact browser Lean kernel
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

### 6.3 Only the identity is filed there

- **Level ID:** `canonicalcharts-3`
- **Verification:** exact browser Lean kernel
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

### 6.4 Two readings at once

- **Level ID:** `canonicalcharts-4`
- **Verification:** exact browser Lean kernel
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

### 6.5 The paired chart contains her place

- **Level ID:** `canonicalcharts-5`
- **Verification:** exact browser Lean kernel
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

## World 7: How smooth is smooth

**Prerequisites:** `SmoothManifolds`

### Counting derivatives

Ada checks her map changes against standards of different strictness. A leaf change that passes a demanding test passes every easier one, and the model leaf passes them all.

These three levels spell out how Mathlib's [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold) orders relate: the model space is a manifold at every order, a higher order implies a lower one, and a smooth atlas is in particular a topological one. The order `0` here is a regularity order, not a dimension.

### 7.1 The reference leaf is ready

- **Level ID:** `smoothmanifolds-2`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.model_space_is_manifold` (theorem)

#### Lesson

Ada places a model leaf beside the world she is charting. The leaf is already its own coordinate space, so it needs no further change of coordinates to qualify as a manifold.

In the goal, `Scalar` supplies the numbers, `Vectors` supplies directions, and `Coordinates` is the model leaf itself. The [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners) named `model` connects those pieces. The ordered type `WithTop ℕ∞` records differentiability levels. Here `0` means continuity-level regularity, `∞` means smoothness at every finite order, and the top element `ω` means analyticity. The optional circle world meets that stronger standard. Mathlib registers [`instIsManifoldModelSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#instIsManifoldModelSpace) for every order.

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

### 7.2 Passing an easier check

- **Level ID:** `smoothmanifolds-3`
- **Verification:** exact browser Lean kernel
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

### 7.3 The smooth atlas passes the basic check

- **Level ID:** `smoothmanifolds-4`
- **Verification:** exact browser Lean kernel
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

## World 8: The dial comes around

**Prerequisites:** `SmoothManifolds`

### An angle becomes a position

Ada finds a brass dial on an old field box. Turning it changes the pointer's position, but a full turn brings the pointer home. She needs a way to compose turns without losing that circular behavior.

Mathlib's `Circle` is the unit circle in the complex plane. The map [`Circle.exp`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp) sends a real angle to a point on that circle. Mathlib also knows that the circle is an analytic Lie group, so composing positions and moving smoothly are part of the same structure.

### 8.1 No turn leaves the pointer home

- **Level ID:** `circlemotion-1`
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.circle_full_turn` (theorem)

> **INTERACTIVE LAB:** the angle lab appears after the lesson introduction, tuned to this level's claim.

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

### 8.4 Two angles, one pointer position

- **Level ID:** `course-10`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.same_point_iff_full_turns` (theorem)

> **INTERACTIVE LAB:** the angle lab appears after the lesson introduction, tuned to this level's claim.

#### Lesson

Ada records the dial with two different angle readings and sees the pointer in the same place. The only way that can happen is that the two readings differ by some whole number of full turns.

This is the exact rule for when two angle coordinates name the same circle point, and it is why an angle is a local chart rather than a global one. Mathlib states it as [`Circle.exp_eq_exp`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle.exp_eq_exp): the positions agree if and only if the angles differ by an integer multiple of `2 * Real.pi`. The integer is coerced to a real number in the statement.

#### Human-readable objective

**Objective:** Show that two angles give the same pointer position exactly when they differ by a whole number of turns.

#### Think first

> **Before proving it: how long can an arc of the dial be before one angle reading stops being a chart of it?**
>
> Strictly less than a full turn. On an arc of length 2π or more, two different angles would name the same point, so the reading is no longer one-to-one.

#### Goal

```lean
theorem same_point_iff_full_turns (first second : ℝ) :
    Circle.exp first = Circle.exp second ↔
      ∃ turns : ℤ, first = second + turns * (2 * Real.pi) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Circle.exp_eq_exp
```

#### Hints

1. Angles that agree on the circle differ by whole turns.
2. The two-way statement is `Circle.exp_eq_exp`.
3. *(hidden)* `exact Circle.exp_eq_exp`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Circle.exp_eq_exp`
- **Structures, definitions, and notation:** `Iff`, `Int`
- **Reusable course declaration:** `ManifoldAdventure.same_point_iff_full_turns`

#### After the proof

An angle chart of the dial is honest on any arc shorter than a full turn, and on the whole circle it repeats.

### 8.5 The pointer turns smoothly

- **Level ID:** `circlemotion-4`
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
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
- **Verification:** exact browser Lean kernel
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

## World 10: Can the arm touch it?

**Prerequisites:** `RobotArm`

### The ring of reach

Ada sees a crumb on the work surface and asks a practical question before turning either hinge: can the tip touch it at all? The two bars can stretch only so far, and when one is longer, folding the shorter bar leaves a gap near the base.

For nonnegative lengths `firstLength` and `secondLength`, every endpoint lies between the radii `|firstLength - secondLength|` and `firstLength + secondLength`. Each link direction is a point of Mathlib's [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle), while the endpoint lies in the complex plane. The interactive lab turns those inequalities into a shaded annulus. Drag the target to see the two inverse-kinematics poses meet at its boundaries.

The three-link switch is an outlook. An extra hinge can close the central gap and turns isolated solutions into a continuous family. The Lean levels keep their formal argument on the two-link arm, where the obstruction is already useful and precise.

> **INTERACTIVE LAB: Robot reachability**
>
> The world overview lets the reviewer drag a target, change link lengths, and compare two-link inverse kinematics with a three-link outlook. The lesson versions focus the same instrument on the theorem at hand.

### 10.1 The arm has an outer limit

- **Level ID:** `robotreachability-1`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.robot_tip_norm_le` (theorem)

> **INTERACTIVE LAB: Robot reachability**
>
> This lesson opens the lab in its outer-limit state. Players can still drag the target and change both link lengths.

#### Lesson

Ada straightens both bars toward the crumb. Even in this longest pose, the tip cannot travel farther than the two bar lengths added together.

The endpoint is a sum of two complex displacement vectors. The triangle inequality `norm_add_le` bounds the norm of their sum by the sum of their norms. Each [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle) direction has norm one, recorded by `Circle.norm_coe`, so the two terms simplify to the two nonnegative lengths.

#### Human-readable objective

**Objective:** Prove that the endpoint is no farther from the base than the sum of the link lengths.

#### Goal

```lean
theorem robot_tip_norm_le (firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    ‖robot_arm_tip firstLength secondLength joints‖ ≤
      firstLength + secondLength := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  unfold robot_arm_tip
  calc
    _ ≤ ‖(firstLength : ℂ) * (joints.1 : ℂ)‖ +
        ‖(secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)‖ := norm_add_le _ _
    _ = firstLength + secondLength := by
      simp [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond]
```

#### Hints

1. Treat the endpoint as the sum of the two link vectors, then bound the length of that sum.
2. Unfold `robot_arm_tip`, use a `calc` block with `norm_add_le`, then simplify the two unit-circle norms.
3. *(hidden)* `unfold robot_arm_tip`, then `calc`, then `  _ ≤ ‖(firstLength : ℂ) * (joints.1 : ℂ)‖ +`, then `      ‖(secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)‖ := norm_add_le _ _`, then `  _ = firstLength + secondLength := by`, then `    simp [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond]`

#### Unlocks

- **Lean tactics:** `calc`
- **Mathlib theorems/declarations:** `norm_add_le`, `Circle.norm_coe`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_tip_norm_le`

#### After the proof

The outer dashed circle is now a proved limit, not just a feature of the drawing.

### 10.2 The folded arm leaves a gap

- **Level ID:** `robotreachability-2`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.robot_tip_norm_ge` (theorem)

> **INTERACTIVE LAB: Robot reachability**
>
> This lesson opens the lab in its folded-gap state. Players can still drag the target and change both link lengths.

#### Lesson

Ada folds the second bar back toward the base. If one bar is longer, the shorter one cannot cancel all of it, so a circular gap remains around the hinge.

The reverse triangle inequality appears in Mathlib as [`norm_sub_norm_le`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Normed/Group/Basic.html#norm_sub_norm_le). Since absolute value asks for both orders of subtraction, `abs_sub_le_iff` splits the claim into `firstLength - secondLength ≤ ...` and its mirror image. Each half uses the same reverse-triangle argument with the bars exchanged.

#### Human-readable objective

**Objective:** Prove that the endpoint stays at least the difference of the link lengths away from the base.

#### Goal

```lean
theorem robot_tip_norm_ge (firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    |firstLength - secondLength| ≤
      ‖robot_arm_tip firstLength secondLength joints‖ := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  unfold robot_arm_tip
  apply abs_sub_le_iff.mpr
  constructor
  · have h := norm_sub_norm_le
      ((firstLength : ℂ) * (joints.1 : ℂ))
      (-((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)))
    simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond] using h
  · have h := norm_sub_norm_le
      ((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ))
      (-((firstLength : ℂ) * (joints.1 : ℂ)))
    simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond, add_comm] using h
```

#### Hints

1. Absolute value hides two inequalities. Prove the reverse-triangle estimate in both orders.
2. Use `abs_sub_le_iff.mpr`, split with `constructor`, then apply `norm_sub_norm_le` to one link and the negative of the other.
3. *(hidden)* `unfold robot_arm_tip`, then `apply abs_sub_le_iff.mpr`, then `constructor`, then `· have h := norm_sub_norm_le`, then `    ((firstLength : ℂ) * (joints.1 : ℂ))`, then `    (-((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ)))`, then `  simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond] using h`, then `· have h := norm_sub_norm_le`, then `    ((secondLength : ℂ) * ((joints.1 * joints.2 : Circle) : ℂ))`, then `    (-((firstLength : ℂ) * (joints.1 : ℂ)))`, then `  simpa [Circle.norm_coe, abs_of_nonneg, hFirst, hSecond, add_comm] using h`

#### Unlocks

- **Lean tactics:** `have`, `simpa`
- **Mathlib theorems/declarations:** `norm_sub_norm_le`, `abs_sub_le_iff`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_tip_norm_ge`

#### After the proof

The hole around the base now has the exact lower radius forced by the two bars.

### 10.3 Every pose stays in the ring

- **Level ID:** `robotreachability-3`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.robot_tip_mem_reach_annulus` (theorem)

> **INTERACTIVE LAB: Robot reachability**
>
> This lesson opens the lab in its annulus state. Players can still drag the target and change both link lengths.

#### Lesson

Ada lays the two limits over the work surface. Every pose of the arm must land in the ring between them.

The goal is the conjunction of the lower and upper bounds from the previous levels. Each endpoint still comes from two [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle)-valued joints. This is where the two inequalities become one reusable description of the arm's workspace obstruction. Split the conjunction and cite the course declarations you have just proved.

#### Human-readable objective

**Objective:** Combine the two radius bounds to show that every endpoint lies in the closed annulus.

#### Goal

```lean
theorem robot_tip_mem_reach_annulus (firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (joints : Circle × Circle) :
    |firstLength - secondLength| ≤
        ‖robot_arm_tip firstLength secondLength joints‖ ∧
      ‖robot_arm_tip firstLength secondLength joints‖ ≤
        firstLength + secondLength := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  constructor
  · exact robot_tip_norm_ge firstLength secondLength hFirst hSecond joints
  · exact robot_tip_norm_le firstLength secondLength hFirst hSecond joints
```

#### Hints

1. The two halves of this conjunction are exactly the previous two course declarations.
2. Use `constructor`, then apply `robot_tip_norm_ge` and `robot_tip_norm_le`.
3. *(hidden)* `constructor`, then `· exact robot_tip_norm_ge firstLength secondLength hFirst hSecond joints`, then `· exact robot_tip_norm_le firstLength secondLength hFirst hSecond joints`

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_tip_mem_reach_annulus`

#### After the proof

Every configuration on the torus now maps into the shaded ring.

### 10.4 Outside the ring is out of reach

- **Level ID:** `robotreachability-4`
- **Verification:** exact browser Lean kernel
- **Creates:** `ManifoldAdventure.robot_target_outside_annulus_unreachable` (theorem)

> **INTERACTIVE LAB: Robot reachability**
>
> This lesson opens the lab in its unreachable-target state. Players can still drag the target and change both link lengths.

#### Lesson

Ada places the crumb outside the shaded ring. No amount of turning can make the tip land there: either the crumb is inside the folded gap or it lies beyond both bars.

Reachability is written as an existential statement: some `joints : Circle × Circle` send the tip to `point`, with [`Circle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/SpecialFunctions/Complex/Circle.html#Circle) carrying each joint angle modulo a full turn. Assume such joints exist, replace `point` with their endpoint, then split the two ways `outside` can hold. Each branch contradicts one of the bounds already proved. The lab constructs poses for interior targets; this level proves the complementary obstruction in Lean.

#### Human-readable objective

**Objective:** Prove that a target outside the annulus has no inverse-kinematics solution.

#### Goal

```lean
theorem robot_target_outside_annulus_unreachable (firstLength secondLength : ℝ)
    (hFirst : 0 ≤ firstLength) (hSecond : 0 ≤ secondLength)
    (point : ℂ)
    (outside : ‖point‖ < |firstLength - secondLength| ∨
      firstLength + secondLength < ‖point‖) :
    ¬ ∃ joints : Circle × Circle,
      robot_arm_tip firstLength secondLength joints = point := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  intro reaches
  obtain ⟨joints, rfl⟩ := reaches
  rcases outside with tooClose | tooFar
  · exact (not_lt_of_ge
      (robot_tip_norm_ge firstLength secondLength hFirst hSecond joints)) tooClose
  · exact (not_lt_of_ge
      (robot_tip_norm_le firstLength secondLength hFirst hSecond joints)) tooFar
```

#### Hints

1. Assume a reaching configuration exists, substitute its endpoint for the target, then contradict the appropriate radius bound.
2. Use `intro`, unpack the existential with `obtain`, split `outside` with `rcases`, and close each branch with `not_lt_of_ge`.
3. *(hidden)* `intro reaches`, then `obtain ⟨joints, rfl⟩ := reaches`, then `rcases outside with tooClose | tooFar`, then `· exact (not_lt_of_ge`, then `    (robot_tip_norm_ge firstLength secondLength hFirst hSecond joints)) tooClose`, then `· exact (not_lt_of_ge`, then `    (robot_tip_norm_le firstLength secondLength hFirst hSecond joints)) tooFar`

#### Unlocks

- **Lean tactics:** `obtain`, `rcases`
- **Mathlib theorems/declarations:** `not_lt_of_ge`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.robot_target_outside_annulus_unreachable`

#### After the proof

Ada can now reject an impossible target before moving either hinge.

## End-state inventory

After completing all 10 worlds, including the optional branches, the player has unlocked the following named Mathlib declarations and Lean tactics.

### Tactics

- `exact`
- `apply`
- `constructor`
- `·`
- `simp`
- `by_cases`
- `left`
- `right`
- `intro`
- `ext`
- `rfl`
- `rw`
- `have`
- `simpa`
- `infer_instance`
- `unfold`
- `fun_prop`
- `calc`
- `obtain`
- `rcases`

### Mathlib theorems and declarations

- `Homeomorph.continuous`
- `Homeomorph.continuous_symm`
- `Homeomorph.symm_apply_apply`
- `Homeomorph.trans_apply`
- `OpenPartialHomeomorph.map_source`
- `OpenPartialHomeomorph.open_source`
- `OpenPartialHomeomorph.continuousOn`
- `OpenPartialHomeomorph.left_inv`
- `OpenPartialHomeomorph.map_target`
- `OpenPartialHomeomorph.right_inv`
- `stereographic_source`
- `surjective_stereographic`
- `stereographic_apply_neg`
- `norm_eq_of_mem_sphere`
- `Set.mem_compl_iff`
- `Set.mem_singleton_iff`
- `Eq.symm`
- `Eq.trans`
- `Set.mem_union`
- `Set.mem_univ`
- `iff_true`
- `mem_chart_source`
- `chart_mem_atlas`
- `chart_source_mem_nhds`
- `mem_chart_target`
- `iUnion_source_chartAt`
- `OpenPartialHomeomorph.trans_source`
- `OpenPartialHomeomorph.symm_source`
- `instIsManifoldModelSpace`
- `HasGroupoid.compatible`
- `mem_groupoid_of_pregroupoid`
- `IsManifold.prod`
- `contMDiff_coe_sphere`
- `mfderiv_coe_sphere_injective`
- `range_mfderiv_coe_sphere`
- `chartAt_self_eq`
- `chartedSpaceSelf_atlas`
- `prodChartedSpace_chartAt`
- `IsManifold.of_le`
- `Circle.exp_zero`
- `Circle.exp_add`
- `Circle.exp_add_two_pi`
- `Circle.exp_eq_exp`
- `contMDiff_circleExp`
- `continuous_const`
- `continuous_subtype_val`
- `continuous_fst`
- `continuous_snd`
- `Continuous.comp`
- `Continuous.mul`
- `Continuous.add`
- `norm_add_le`
- `Circle.norm_coe`
- `norm_sub_norm_le`
- `abs_sub_le_iff`
- `not_lt_of_ge`

### Structures, definitions, and notation

- `TopologicalSpace`
- `Homeomorph`
- `Continuous`
- `Homeomorph.symm`
- `Homeomorph.trans`
- `Eq`
- `OpenPartialHomeomorph.target`
- `Membership.mem`
- `OpenPartialHomeomorph`
- `OpenPartialHomeomorph.source`
- `IsOpen`
- `ContinuousOn`
- `OpenPartialHomeomorph.symm`
- `And`
- `Metric.sphere`
- `stereographic`
- `Set.compl`
- `Neg.neg`
- `Or`
- `Ne`
- `Not`
- `Set.union`
- `Set.univ`
- `ChartedSpace`
- `chartAt`
- `atlas`
- `nhds`
- `Set.iUnion`
- `stereographic'`
- `EuclideanSpace`
- `Fact`
- `Module.finrank`
- `Exists`
- `OpenPartialHomeomorph.trans`
- `Set.inter`
- `Set.preimage`
- `contDiffGroupoid`
- `IsManifold`
- `ModelWithCorners`
- `WithTop`
- `ContDiffOn`
- `Set.range`
- `Iff`
- `Iff.mp`
- `Iff.mpr`
- `modelWithCornersSelf`
- `ModelWithCorners.prod`
- `Prod`
- `TangentSpace`
- `Zero.zero`
- `TangentBundle`
- `Bundle.TotalSpace`
- `Sigma`
- `Sigma.fst`
- `ContMDiff`
- `Subtype.val`
- `mfderiv`
- `Function.Injective`
- `LinearMap.range`
- `ContinuousLinearMap.toLinearMap`
- `Submodule.span`
- `Submodule.orthogonal`
- `OpenPartialHomeomorph.refl`
- `chartedSpaceSelf`
- `ModelProd`
- `OpenPartialHomeomorph.prod`
- `prodChartedSpace`
- `ENat`
- `LE.le`
- `Circle`
- `Circle.exp`
- `One.one`
- `Mul.mul`
- `Real.pi`
- `Int`
- `CMDiff`
- `Complex`
- `Prod.fst`
- `Prod.snd`

### Course declarations

- `ManifoldAdventure.homeomorph_continuous`: The drawing matches the trail
- `ManifoldAdventure.local_chart_maps_source`: Her mark lands in the drawing
- `ManifoldAdventure.local_chart_round_trip`: Back to the same spot
- `ManifoldAdventure.local_chart_reads_back`: The leaf reads back into the patch
- `ManifoldAdventure.stereographic_map_misses_pole`: The pole stays off the leaf
- `ManifoldAdventure.opposite_pole_is_origin`: The far pole lands in the middle
- `ManifoldAdventure.stereographic_off_pole`: Off the pole, onto the leaf
- `ManifoldAdventure.two_leaves_cover_point`: One of the two leaves shows her place
- `ManifoldAdventure.two_stereographic_maps_cover`: The second leaf covers the hole
- `ManifoldAdventure.point_mem_preferred_chart`: A leaf for where she stands
- `ManifoldAdventure.preferred_chart_maps_to_target`: Her place lands on the leaf
- `ManifoldAdventure.preferred_charts_cover`: No place left uncovered
- `ManifoldAdventure.sphere_preferred_chart`: The preferred leaf comes from the far pole
- `ManifoldAdventure.sphere_chart_in_atlas`: Every projection is filed in the atlas
- `ManifoldAdventure.transition_map_source`: Two leaves in conversation
- `ManifoldAdventure.chart_change_is_smooth`: Changing leaves is a smooth move
- `ManifoldAdventure.chart_change_contDiffOn`: The smooth move, spelled out in calculus
- `ManifoldAdventure.sphere_chart_change_smooth`: Two drawings of the bead agree smoothly
- `ManifoldAdventure.product_of_manifolds`: Two circles make a torus
- `ManifoldAdventure.tangent_zero`: Ada stands still
- `ManifoldAdventure.tangent_bundle_base`: Read the location tag
- `ManifoldAdventure.sphere_inclusion_smooth`: Leaving the bead for the room around it
- `ManifoldAdventure.tangent_vectors_are_vectors`: Her velocities are real vectors
- `ManifoldAdventure.tangent_plane_is_orthogonal`: The tangent plane stands square to the radius
- `ManifoldAdventure.self_chart_is_identity`: The reference grid stays put
- `ManifoldAdventure.identity_mem_self_atlas`: The identity is filed in the atlas
- `ManifoldAdventure.self_atlas_chart_is_identity`: Only the identity is filed there
- `ManifoldAdventure.product_chart_is_product`: Two readings at once
- `ManifoldAdventure.product_point_mem_chart_source`: The paired chart contains her place
- `ManifoldAdventure.model_space_is_manifold`: The reference leaf is ready
- `ManifoldAdventure.manifold_of_higher_smoothness`: Passing an easier check
- `ManifoldAdventure.smooth_manifold_is_topological`: The smooth atlas passes the basic check
- `ManifoldAdventure.circle_zero_turn`: No turn leaves the pointer home
- `ManifoldAdventure.circle_turns_compose`: Two turns compose
- `ManifoldAdventure.circle_full_turn`: One full turn changes nothing
- `ManifoldAdventure.same_point_iff_full_turns`: Two angles, one pointer position
- `ManifoldAdventure.circle_turning_is_smooth`: The pointer turns smoothly
- `ManifoldAdventure.robot_arm_tip`: Find the tip of the arm
- `ManifoldAdventure.robot_arm_at_rest`: Both bars point forward
- `ManifoldAdventure.robot_full_turn_same_tip`: A full shoulder turn reaches the same point
- `ManifoldAdventure.robot_arm_tip_continuous`: The arm moves without a jump
- `ManifoldAdventure.robot_tip_norm_le`: The arm has an outer limit
- `ManifoldAdventure.robot_tip_norm_ge`: The folded arm leaves a gap
- `ManifoldAdventure.robot_tip_mem_reach_annulus`: Every pose stays in the ring
- `ManifoldAdventure.robot_target_outside_annulus_unreachable`: Outside the ring is out of reach
