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
| LocalCharts, level 4: A local round trip | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| ChartedSpaces, level 5: The preferred charts cover | Sphere with two charts | [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb) |
| CanonicalCharts, level 3: A product chart is a product | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| CanonicalCharts, level 4: The product point is covered | Torus with its two loops | [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb) |
| TangentSpaces, level 1: The zero tangent vector | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |
| TangentSpaces, level 2: Package a tangent vector | Tangent plane at a point | [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb) |

The World 4 explorer additionally includes:

- **Sphere with two charts:** Two translucent chart regions cover the sphere. The amber chart comes from the north, the teal chart comes from the south, and their transition map is defined on the overlap. ([`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb))
- **Torus with its two loops:** Neither highlighted loop can be shrunk to a point while staying on the surface. The two loops are the standard generators for paths around a torus. ([`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb))
- **Möbius band:** Follow the arrows around the band once and they return flipped. The band has one boundary curve and no consistent choice of "up". ([`mobius-band.glb`](../public/game-assets/manifolds/models/mobius-band.glb))
- **Circle and trefoil embeddings:** Both tubes are copies of the same one-manifold, the circle. They differ only in how they are embedded in three-dimensional space. ([`trefoil-circle.glb`](../public/game-assets/manifolds/models/trefoil-circle.glb))
- **A triangle with three right angles:** This geodesic triangle on the sphere has three right angles. Its angles total 270°, and the 90° excess measures curvature from within the surface. ([`sphere-triangle.glb`](../public/game-assets/manifolds/models/sphere-triangle.glb))
- **Figure-eight crossing:** Every point except the red crossing has a neighborhood like an interval. Removing the crossing leaves four arms instead of two, so that point fails the local interval test. ([`figure-eight.glb`](../public/game-assets/manifolds/models/figure-eight.glb))
- **Tangent plane at a point:** The plane contains the possible velocity vectors at Ada's point. It is the tangent space where calculus on the surface takes place. ([`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb))

## Course introduction

### The Manifold Adventure

Ada is an ant who can only inspect her world from the inside. Manifold theory works the same way: it studies a global space through local coordinate patches.

The course uses [Mathlib's manifold API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html) from the first level. You begin with a [`Homeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Homeomorph/Defs.html#Homeomorph), then work with [`OpenPartialHomeomorph`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/OpenPartialHomeomorph/Defs.html#OpenPartialHomeomorph), [`ChartedSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#ChartedSpace), [`atlas`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#atlas), [`chartAt`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/ChartedSpace.html#chartAt), [`ModelWithCorners`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#ModelWithCorners), [`IsManifold`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#IsManifold), [`TangentSpace`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentSpace), and [`TangentBundle`](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Geometry/Manifold/IsManifold/Basic.html#TangentBundle).

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

### Same topology, different labels

A Mathlib homeomorphism is a bundled structure. `Homeomorph X Y` contains an equivalence and continuity proofs for both directions.

In this world, you will read fields from that structure, use its inverse laws, and compose two homeomorphisms.

### 1.1 Continuity is bundled

- **Level ID:** `homeomorphisms-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_continuous` (theorem)

#### Lesson

The notation `X ≃ₜ Y` means a homeomorphism from `X` to `Y`. The hypothesis `e : X ≃ₜ Y` already contains a proof that its forward function is continuous. Mathlib exposes the field as `Homeomorph.continuous`. With dot notation, it becomes `e.continuous`.

Use `exact` to give Lean that proof.

#### Goal

```lean
theorem homeomorph_continuous {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) : Continuous e := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.continuous
```

#### Hints

1. The homeomorphism `e` has a theorem named `e.continuous`.
2. Enter `exact e.continuous`.

#### Unlocks

- **Lean tactics:** `exact`
- **Mathlib theorems/declarations:** `Homeomorph.continuous`
- **Structures, definitions, and notation:** `TopologicalSpace`, `Homeomorph`, `Continuous`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_continuous`

#### After the proof

The proof came directly from the continuity field of Mathlib's bundled `Homeomorph`.

### 1.2 The inverse is continuous too

- **Level ID:** `homeomorphisms-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_inverse_continuous` (theorem)

#### Lesson

A continuous bijection needs a continuous inverse to qualify as a homeomorphism. Mathlib records the inverse proof separately as `Homeomorph.continuous_symm`.

Here, Lean coerces the inverse homeomorphism `e.symm` to its underlying function.

#### Goal

```lean
theorem homeomorph_inverse_continuous {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) : Continuous e.symm := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.continuous_symm
```

#### Hints

1. Look for the inverse counterpart of `e.continuous`.
2. Use `exact e.continuous_symm`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.continuous_symm`
- **Structures, definitions, and notation:** `Homeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_inverse_continuous`

#### After the proof

A homeomorphism carries continuity proofs in both directions.

### 1.3 There and back

- **Level ID:** `homeomorphisms-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_round_trip` (theorem)

#### Lesson

A coordinate change needs a reliable round trip. The homeomorphism sends `x` to `Y`, and its inverse sends the result back to `x`.

The equivalence inside the homeomorphism supplies this inverse law as `Homeomorph.symm_apply_apply`.

#### Goal

```lean
theorem homeomorph_round_trip {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : X ≃ₜ Y) (x : X) : e.symm (e x) = x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.symm_apply_apply x
```

#### Hints

1. The theorem is unlocked as `Homeomorph.symm_apply_apply`.
2. With dot notation: `exact e.symm_apply_apply x`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.symm_apply_apply`
- **Structures, definitions, and notation:** `Eq`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_round_trip`

#### After the proof

The round-trip equation says that changing coordinates and returning leaves the point unchanged.

### 1.4 Compose coordinate changes

- **Level ID:** `homeomorphisms-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.homeomorph_composition_apply` (theorem)

#### Lesson

Mathlib composes homeomorphisms with `e.trans f`: first `e`, then `f`. The theorem `Homeomorph.trans_apply` tells Lean how that bundled composition acts on a point.

Apply the named library theorem explicitly so that you can see which part of the API proves the equation.

#### Goal

```lean
theorem homeomorph_composition_apply {X : Type u} {Y : Type v} {Z : Type w}
    [TopologicalSpace X] [TopologicalSpace Y] [TopologicalSpace Z]
    (e : X ≃ₜ Y) (f : Y ≃ₜ Z) (x : X) : e.trans f x = f (e x) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact Homeomorph.trans_apply e f x
```

#### Hints

1. Use the fully qualified theorem name.
2. Enter `exact Homeomorph.trans_apply e f x`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `Homeomorph.trans_apply`
- **Structures, definitions, and notation:** `Homeomorph.trans`
- **Reusable course declaration:** `ManifoldAdventure.homeomorph_composition_apply`

#### After the proof

You can now use the continuity fields, inverse law, and composition rule for homeomorphisms.

## World 2: Open partial homeomorphisms

**Prerequisites:** `Homeomorphisms`

### A chart is partial

A globe cannot be flattened by one global homeomorphism. A chart instead maps an open patch of the manifold to an open patch of a model space.

Mathlib represents a chart as `OpenPartialHomeomorph X Y`. The structure has a `source`, a `target`, local continuity, and inverse laws. To use those laws, you must prove that the point lies in the relevant patch.

### 2.1 The source is open

- **Level ID:** `localcharts-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_source_open` (theorem)

#### Lesson

A local chart has an open domain. `OpenPartialHomeomorph` stores the proof as `open_source : IsOpen e.source`.

Read the goal first: Lean wants a proof that the source is open. The bundled chart already has a field of that type.

#### Goal

```lean
theorem local_chart_source_open {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) : IsOpen e.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.open_source
```

#### Hints

1. The relevant structure projection is `e.open_source`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.open_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph`, `OpenPartialHomeomorph.source`, `IsOpen`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_source_open`

#### After the proof

The source of an open partial homeomorphism is an open set.

### 2.2 Continuity on the patch

- **Level ID:** `localcharts-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_continuous` (theorem)

#### Lesson

A partial chart only needs to be continuous on its source. Mathlib expresses that condition as `ContinuousOn e e.source`.

Project `OpenPartialHomeomorph.continuousOn` from `e`.

#### Goal

```lean
theorem local_chart_continuous {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) : ContinuousOn e e.source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.continuousOn
```

#### Hints

1. Use the theorem `e.continuousOn`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.continuousOn`
- **Structures, definitions, and notation:** `ContinuousOn`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_continuous`

#### After the proof

The type records continuity on the chart domain rather than on the whole space.

### 2.3 A source point reaches the target

- **Level ID:** `localcharts-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_maps_source` (theorem)

#### Lesson

Lean writes set membership as `x ∈ s`; type `\in` to enter `∈`. It treats the chart as a total function, but its geometric guarantees require `hx : x ∈ e.source`.

Give that membership proof to `OpenPartialHomeomorph.map_source`.

#### Goal

```lean
theorem local_chart_maps_source {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) (x : X) (hx : x ∈ e.source) : e x ∈ e.target := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  apply e.map_source
  exact hx
```

#### Hints

1. Apply `e.map_source` first; its remaining input is the source-membership proof.
2. Then close the new goal with `exact hx`.

#### Unlocks

- **Lean tactics:** `apply`
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.map_source`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.target`, `Membership.mem`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_maps_source`

#### After the proof

The source-membership hypothesis is what lets Mathlib conclude that `e x` lies in the target.

### 2.4 A local round trip

- **Level ID:** `localcharts-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.local_chart_round_trip` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. Two translucent chart regions cover the sphere. The amber chart comes from the north, the teal chart comes from the south, and their transition map is defined on the overlap.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

The global round-trip theorem from world 1 had no side condition. For a partial homeomorphism, the inverse law only applies to points in the source, so it needs `hx`.

Use the local inverse law `OpenPartialHomeomorph.left_inv`.

#### Goal

```lean
theorem local_chart_round_trip {X : Type u} {Y : Type v} [TopologicalSpace X] [TopologicalSpace Y]
    (e : OpenPartialHomeomorph X Y) (x : X) (hx : x ∈ e.source) : e.symm (e x) = x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact e.left_inv hx
```

#### Hints

1. Apply `e.left_inv` to the source-membership proof.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `OpenPartialHomeomorph.left_inv`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.symm`
- **Reusable course declaration:** `ManifoldAdventure.local_chart_round_trip`

#### After the proof

On its source, the chart followed by its inverse returns the original point.

## World 3: Charted spaces and atlases

**Prerequisites:** `LocalCharts`

### Mathlib's chart data

`ChartedSpace H M` equips the topological space `M` with charts into the model space `H`. It contains an `atlas H M` and chooses a preferred `chartAt H x` at each point.

The class also stores two facts used throughout manifold proofs. Each point lies in the source of its preferred chart, and that chart belongs to the atlas.

### 3.1 Every point has a chart

- **Level ID:** `chartedspaces-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.point_mem_preferred_chart` (theorem)

#### Lesson

Mathlib guarantees that the chosen chart `chartAt H x` contains `x`. The public theorem for this fact is `mem_chart_source H x`.

The instance argument `[ChartedSpace H M]` supplies the atlas even though it does not appear as a named hypothesis.

#### Goal

```lean
theorem point_mem_preferred_chart {H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : x ∈ (chartAt H x).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mem_chart_source H x
```

#### Hints

1. Use `mem_chart_source H x`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_source`
- **Structures, definitions, and notation:** `ChartedSpace`, `chartAt`
- **Reusable course declaration:** `ManifoldAdventure.point_mem_preferred_chart`

#### After the proof

Every point lies in the source of the chart that `ChartedSpace` chooses for it.

### 3.2 The chosen chart belongs to the atlas

- **Level ID:** `chartedspaces-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_mem_atlas` (theorem)

#### Lesson

The preferred chart is part of the atlas. The theorem `chart_mem_atlas H x` proves that membership.

Later proofs use this theorem to apply compatibility results stated for atlas members.

#### Goal

```lean
theorem preferred_chart_mem_atlas {H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : chartAt H x ∈ atlas H M := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_mem_atlas H x
```

#### Hints

1. The matching library theorem is `chart_mem_atlas`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_mem_atlas`
- **Structures, definitions, and notation:** `atlas`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_mem_atlas`

#### After the proof

The selected chart at a point belongs to the space's atlas.

### 3.3 The point reaches coordinate space

- **Level ID:** `chartedspaces-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_maps_to_target` (theorem)

#### Lesson

Since `x` lies in the source of its preferred chart, its coordinate value `chartAt H x x` lies in that chart's target.

Mathlib packages the argument as `mem_chart_target H x`, so you do not need to apply `map_source` yourself.

#### Goal

```lean
theorem preferred_chart_maps_to_target {H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : chartAt H x x ∈ (chartAt H x).target := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact mem_chart_target H x
```

#### Hints

1. Use the newly introduced theorem `mem_chart_target H x`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `mem_chart_target`
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_maps_to_target`

#### After the proof

The preferred chart sends its chosen point into coordinate space.

### 3.4 A chart source is a neighborhood

- **Level ID:** `chartedspaces-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_chart_source_is_neighborhood` (theorem)

#### Lesson

An open set containing `x` is a neighborhood of `x`. Mathlib writes the neighborhood filter as `𝓝 x`; type `\nhds` to enter `𝓝`.

`chart_source_mem_nhds H x` combines the openness of the chart source with `mem_chart_source`.

#### Goal

```lean
theorem preferred_chart_source_is_neighborhood {H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] (x : M) : (chartAt H x).source ∈ 𝓝 x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chart_source_mem_nhds H x
```

#### Hints

1. Use `chart_source_mem_nhds H x`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chart_source_mem_nhds`
- **Structures, definitions, and notation:** `Filter`, `nhds`
- **Reusable course declaration:** `ManifoldAdventure.preferred_chart_source_is_neighborhood`

#### After the proof

In filter notation, the preferred chart is valid on a neighborhood of its point.

### 3.5 The preferred charts cover

- **Level ID:** `chartedspaces-5`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.preferred_charts_cover` (theorem)

> **3D MODEL: Sphere with two charts**
>
> This interactive scene appears immediately after the lesson introduction. Two translucent chart regions cover the sphere. The amber chart comes from the north, the teal chart comes from the south, and their transition map is defined on the overlap.
>
> Asset: [`sphere-charts.glb`](../public/game-assets/manifolds/models/sphere-charts.glb)

#### Lesson

The preferred chart sources cover `M`. Their union is the whole space.

Mathlib states the result with sets and an indexed union in `iUnion_source_chartAt H M`.

#### Goal

```lean
theorem preferred_charts_cover {H : Type u} {M : Type v} [TopologicalSpace H] [TopologicalSpace M]
    [ChartedSpace H M] : (⋃ x : M, (chartAt H x).source) = (Set.univ : Set M) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact iUnion_source_chartAt H M
```

#### Hints

1. Apply `iUnion_source_chartAt H M`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `iUnion_source_chartAt`
- **Structures, definitions, and notation:** `Set.iUnion`, `Set.univ`
- **Reusable course declaration:** `ManifoldAdventure.preferred_charts_cover`

#### After the proof

The selected local coordinate patches cover the charted space.

## World 4: Identity and product charts

**Prerequisites:** `ChartedSpaces`

### Instances build geometry for you

Mathlib supplies canonical `ChartedSpace` instances. Every topological space is charted over itself by the identity chart. Products of charted spaces are charted by products of their component charts.

In this world, the types in the goal determine which `ChartedSpace` instance Lean uses. The notation `chartAt` stays the same even when the underlying instance changes.

> **3D MODEL LAB: seven-model explorer**
>
> The web course places an interactive model selector on this world overview. It contains every model listed in the [3D model index](#3d-model-index).

### 4.1 A model charts itself by identity

- **Level ID:** `canonicalcharts-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.self_chart_is_identity` (theorem)

#### Lesson

In the canonical `ChartedSpace H H` instance, the preferred chart is the identity open partial homeomorphism.

The Mathlib theorem `chartAt_self_eq` states this equality.

#### Goal

```lean
theorem self_chart_is_identity {H : Type u} [TopologicalSpace H] (x : H) :
    chartAt H x = OpenPartialHomeomorph.refl H := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact chartAt_self_eq
```

#### Hints

1. The theorem has all arguments implicit: `exact chartAt_self_eq`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `chartAt_self_eq`
- **Structures, definitions, and notation:** `OpenPartialHomeomorph.refl`, `chartedSpaceSelf`
- **Reusable course declaration:** `ManifoldAdventure.self_chart_is_identity`

#### After the proof

A model space charts itself with one global identity chart.

### 4.2 Its atlas contains only identity

- **Level ID:** `canonicalcharts-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.self_atlas_only_identity` (theorem)

#### Lesson

The self-charted atlas contains only the identity chart. Mathlib states membership in that atlas as an equivalence.

Split the `↔` with `constructor`, then use the forward and backward directions of `chartedSpaceSelf_atlas`.

#### Goal

```lean
theorem self_atlas_only_identity {H : Type u} [TopologicalSpace H] (e : OpenPartialHomeomorph H H) :
    e ∈ atlas H H ↔ e = OpenPartialHomeomorph.refl H := by
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

1. Use `constructor` to prove the two directions of the equivalence.
2. In each direction, introduce the hypothesis and use `.mp` or `.mpr` from `chartedSpaceSelf_atlas`.

#### Unlocks

- **Lean tactics:** `constructor`, `intro`
- **Mathlib theorems/declarations:** `chartedSpaceSelf_atlas`
- **Structures, definitions, and notation:** `Iff`
- **Reusable course declaration:** `ManifoldAdventure.self_atlas_only_identity`

#### After the proof

The canonical self-charted instance uses the identity both as its preferred chart and as the sole member of its atlas.

### 4.3 A product chart is a product

- **Level ID:** `canonicalcharts-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_chart_is_product` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. Neither highlighted loop can be shrunk to a point while staying on the surface. The two loops are the standard generators for paths around a torus.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

A product manifold uses `ModelProd H H'` as its model. Its preferred chart pairs the preferred charts of the two factors.

`prodChartedSpace_chartAt` is the Mathlib theorem that unfolds this construction.

#### Goal

```lean
theorem product_chart_is_product {H : Type u} {H' : Type u'} {M : Type v} {M' : Type v'}
    [TopologicalSpace H] [TopologicalSpace H'] [TopologicalSpace M] [TopologicalSpace M']
    [ChartedSpace H M] [ChartedSpace H' M'] (x : M × M') :
    chartAt (ModelProd H H') x = (chartAt H x.1).prod (chartAt H' x.2) := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rw [prodChartedSpace_chartAt]
```

#### Hints

1. Rewrite the left-hand chart with `rw [prodChartedSpace_chartAt]`.

#### Unlocks

- **Lean tactics:** `rw`
- **Mathlib theorems/declarations:** `prodChartedSpace_chartAt`
- **Structures, definitions, and notation:** `ModelProd`, `OpenPartialHomeomorph.prod`, `prodChartedSpace`
- **Reusable course declaration:** `ManifoldAdventure.product_chart_is_product`

#### After the proof

The product chart applies the two component charts coordinate by coordinate.

### 4.4 The product point is covered

- **Level ID:** `canonicalcharts-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_point_mem_chart_source` (theorem)

> **3D MODEL: Torus with its two loops**
>
> This interactive scene appears immediately after the lesson introduction. Neither highlighted loop can be shrunk to a point while staying on the surface. The two loops are the standard generators for paths around a torus.
>
> Asset: [`torus-loops.glb`](../public/game-assets/manifolds/models/torus-loops.glb)

#### Lesson

The covering theorem `mem_chart_source` also applies to the product instance. Lean infers that instance from the model and manifold types in the goal.

Instantiate the theorem with `ModelProd H H'` and the pair `(x, y)`.

#### Goal

```lean
theorem product_point_mem_chart_source {H : Type u} {H' : Type u'} {M : Type v} {M' : Type v'}
    [TopologicalSpace H] [TopologicalSpace H'] [TopologicalSpace M] [TopologicalSpace M']
    [ChartedSpace H M] [ChartedSpace H' M'] (x : M) (y : M') :
    (x, y) ∈ (chartAt (ModelProd H H') (x, y)).source := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  simpa only using (mem_chart_source (ModelProd H H') (x, y))
```

#### Hints

1. Specialize the earlier theorem to the product model and pair.
2. Use `simpa only using (mem_chart_source (ModelProd H H') (x, y))`.

#### Unlocks

- **Lean tactics:** `simpa`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.product_point_mem_chart_source`

#### After the proof

The product `ChartedSpace` instance puts `(x, y)` in the source of its preferred chart.

## World 5: Smooth manifolds

**Prerequisites:** `CanonicalCharts`

### From charts to compatible calculus

`ChartedSpace` supplies topological charts. Mathlib's `IsManifold I n M` adds the compatibility conditions needed for calculus on those charts.

### 5.1 The model space is a manifold

- **Level ID:** `smoothmanifolds-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.model_space_is_manifold` (theorem)

#### Lesson

The signature introduces a scalar field `𝕜`, a normed vector space `E`, and a model with corners `I`. For real manifolds, the scalar field is written `ℝ`. The order `n : WithTop ℕ∞` is a Lean value recording how many derivatives are available.

Every model with corners is a manifold at every differentiability order. Mathlib registers this fact as an instance, so `infer_instance` can synthesize the proof from the types.

This level uses the typeclass system to prove the goal.

#### Goal

```lean
theorem model_space_is_manifold {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H) (n : WithTop ℕ∞) :
    IsManifold I n H := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  infer_instance
```

#### Hints

1. The result is a registered instance.
2. Use `infer_instance`.

#### Unlocks

- **Lean tactics:** `infer_instance`
- **Mathlib theorems/declarations:** `instIsManifoldModelSpace`
- **Structures, definitions, and notation:** `ModelWithCorners`, `IsManifold`, `WithTop`, `ENat`
- **Reusable course declaration:** `ManifoldAdventure.model_space_is_manifold`

#### After the proof

The model space carries the canonical manifold structure supplied by its model with corners.

### 5.2 More smoothness implies less

- **Level ID:** `smoothmanifolds-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.manifold_of_higher_smoothness` (theorem)

#### Lesson

If every transition map is `C^n`, then it is `C^m` whenever `m ≤ n`.

Mathlib calls this theorem `IsManifold.of_le`. Supply `hmn`; Lean finds the existing `IsManifold I n M` instance automatically.

#### Goal

```lean
theorem manifold_of_higher_smoothness {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] {I : ModelWithCorners 𝕜 E H}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {m n : WithTop ℕ∞} [IsManifold I n M] (hmn : m ≤ n) : IsManifold I m M := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact IsManifold.of_le hmn
```

#### Hints

1. Apply `IsManifold.of_le` to `hmn`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `IsManifold.of_le`
- **Structures, definitions, and notation:** `LE.le`
- **Reusable course declaration:** `ManifoldAdventure.manifold_of_higher_smoothness`

#### After the proof

The inequality `m ≤ n` lets you lower the differentiability order of a manifold instance.

### 5.3 Smooth implies topological

- **Level ID:** `smoothmanifolds-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.smooth_manifold_is_topological` (theorem)

#### Lesson

The order `∞` in `IsManifold I ∞ M` means smooth: transition maps have derivatives of every finite order. A smooth manifold is also a topological manifold relative to the same model with corners.

Mathlib has an instance for this step in the smoothness hierarchy. Let `infer_instance` find it.

#### Goal

```lean
theorem smooth_manifold_is_topological {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] {I : ModelWithCorners 𝕜 E H}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    [IsManifold I ∞ M] : IsManifold I 0 M := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  infer_instance
```

#### Hints

1. This implication is registered with typeclass inference.
2. Use `infer_instance`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** _None_
- **Reusable course declaration:** `ManifoldAdventure.smooth_manifold_is_topological`

#### After the proof

Lean derives the `C^0` manifold instance from the `C^∞` instance.

### 5.4 Products preserve manifolds

- **Level ID:** `smoothmanifolds-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.product_of_manifolds` (theorem)

#### Lesson

The product of two `C^n` manifolds is again a `C^n` manifold. Mathlib combines the product chart instance from the last world with the product model with corners and the required compatibility proof.

The instance is named `IsManifold.prod`. Apply it to the two manifold types.

#### Goal

```lean
theorem product_of_manifolds {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {E' : Type v'} [NormedAddCommGroup E'] [NormedSpace 𝕜 E']
    {H : Type w} [TopologicalSpace H] {H' : Type*} [TopologicalSpace H']
    {I : ModelWithCorners 𝕜 E H} {I' : ModelWithCorners 𝕜 E' H'}
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {M' : Type*} [TopologicalSpace M'] [ChartedSpace H' M']
    (n : WithTop ℕ∞) [IsManifold I n M] [IsManifold I' n M'] :
    IsManifold (I.prod I') n (M × M') := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact IsManifold.prod M M'
```

#### Hints

1. The product instance takes the two manifold types explicitly.
2. Use `exact IsManifold.prod M M'`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** `IsManifold.prod`
- **Structures, definitions, and notation:** `ModelWithCorners.prod`, `Prod`
- **Reusable course declaration:** `ManifoldAdventure.product_of_manifolds`

#### After the proof

Once the circle instances are available, this construction also handles a torus presented as a product of two circles.

## World 6: Tangent spaces and the tangent bundle

**Prerequisites:** `SmoothManifolds`

### Dependent geometry

For a manifold modelled on a normed vector space `E`, Mathlib defines `TangentSpace I x` at each point `x`. The total tangent bundle `TangentBundle I M` is a dependent pair containing a base point and a tangent vector in that point's fiber.

The earlier worlds mostly proved propositions about structures. This one asks you to construct values of dependent types.

### 6.1 The zero tangent vector

- **Level ID:** `tangentspaces-1`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_zero` (noncomputable def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The plane contains the possible velocity vectors at Ada's point. It is the tangent space where calculus on the surface takes place.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

Every tangent space inherits an additive commutative group structure from the model vector space, so it has a zero vector.

The expected type tells Lean which `0` you mean. Supply it with `exact 0`.

#### Goal

```lean
noncomputable def tangent_zero {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M] (x : M) : TangentSpace I x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact 0
```

#### Hints

1. The tangent space has a zero instance.
2. Enter `exact 0`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentSpace`, `Zero.zero`
- **Reusable course declaration:** `ManifoldAdventure.tangent_zero`

#### After the proof

The result is a value of Mathlib's `TangentSpace I x`: its zero vector.

### 6.2 Package a tangent vector

- **Level ID:** `tangentspaces-2`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_vector_as_bundle_point` (def)

> **3D MODEL: Tangent plane at a point**
>
> This interactive scene appears immediately after the lesson introduction. The plane contains the possible velocity vectors at Ada's point. It is the tangent space where calculus on the surface takes place.
>
> Asset: [`tangent-plane.glb`](../public/game-assets/manifolds/models/tangent-plane.glb)

#### Lesson

A point of the tangent bundle is a dependent pair `⟨x, v⟩`. The fiber type of `v` depends on the base point `x`.

Lean knows `x` implicitly from the type of `v`, so construct the pair directly.

#### Goal

```lean
def tangent_vector_as_bundle_point {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {x : M} (v : TangentSpace I x) : TangentBundle I M := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  exact ⟨x, v⟩
```

#### Hints

1. Construct the dependent pair `⟨x, v⟩`.

#### Unlocks

- **Lean tactics:** _None_
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `TangentBundle`, `Bundle.TotalSpace`, `Sigma`
- **Reusable course declaration:** `ManifoldAdventure.tangent_vector_as_bundle_point`

#### After the proof

An element of the tangent bundle carries its base point together with a tangent vector at that point.

### 6.3 Project the base point

- **Level ID:** `tangentspaces-3`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_bundle_base` (theorem)

#### Lesson

The first projection of `⟨x, v⟩` computes to `x`. Definitional reduction proves the equality, so `rfl` closes the goal.

`rfl` is working here because of the dependent bundle's representation.

#### Goal

```lean
theorem tangent_bundle_base {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M]
    {x : M} (v : TangentSpace I x) : (⟨x, v⟩ : TangentBundle I M).1 = x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  rfl
```

#### Hints

1. The first projection reduces to `x`.
2. Use `rfl`.

#### Unlocks

- **Lean tactics:** `rfl`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Sigma.fst`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_base`

#### After the proof

The bundle projection reduces directly to its stored base point.

### 6.4 A zero section, point by point

- **Level ID:** `tangentspaces-4`
- **Verification:** Lean kernel
- **Creates:** `ManifoldAdventure.tangent_bundle_has_zero` (theorem)

#### Lesson

Construct a tangent-bundle point over an arbitrary base point. Use the course theorem `tangent_zero I x`, package that vector with `x`, and prove that the first projection is `x`.

This gives a pointwise form of the tangent bundle's zero section.

#### Goal

```lean
theorem tangent_bundle_has_zero {𝕜 : Type u} [NontriviallyNormedField 𝕜]
    {E : Type v} [NormedAddCommGroup E] [NormedSpace 𝕜 E]
    {H : Type w} [TopologicalSpace H] (I : ModelWithCorners 𝕜 E H)
    {M : Type u'} [TopologicalSpace M] [ChartedSpace H M] (x : M) :
    ∃ p : TangentBundle I M, p.1 = x := by
  -- Write your proof here.
```

#### Official solution

```lean
by
  refine ⟨⟨x, tangent_zero I x⟩, ?_⟩
  rfl
```

#### Hints

1. Use `refine` with the witness `⟨x, tangent_zero I x⟩` and leave its base equation as `?_`.
2. The remaining projection equation is `rfl`.

#### Unlocks

- **Lean tactics:** `refine`
- **Mathlib theorems/declarations:** _None_
- **Structures, definitions, and notation:** `Exists`
- **Reusable course declaration:** `ManifoldAdventure.tangent_bundle_has_zero`

#### After the proof

The course ends with a dependent tangent-bundle value built from the zero vector at an arbitrary point.

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

- `ManifoldAdventure.homeomorph_continuous`: Continuity is bundled
- `ManifoldAdventure.homeomorph_inverse_continuous`: The inverse is continuous too
- `ManifoldAdventure.homeomorph_round_trip`: There and back
- `ManifoldAdventure.homeomorph_composition_apply`: Compose coordinate changes
- `ManifoldAdventure.local_chart_source_open`: The source is open
- `ManifoldAdventure.local_chart_continuous`: Continuity on the patch
- `ManifoldAdventure.local_chart_maps_source`: A source point reaches the target
- `ManifoldAdventure.local_chart_round_trip`: A local round trip
- `ManifoldAdventure.point_mem_preferred_chart`: Every point has a chart
- `ManifoldAdventure.preferred_chart_mem_atlas`: The chosen chart belongs to the atlas
- `ManifoldAdventure.preferred_chart_maps_to_target`: The point reaches coordinate space
- `ManifoldAdventure.preferred_chart_source_is_neighborhood`: A chart source is a neighborhood
- `ManifoldAdventure.preferred_charts_cover`: The preferred charts cover
- `ManifoldAdventure.self_chart_is_identity`: A model charts itself by identity
- `ManifoldAdventure.self_atlas_only_identity`: Its atlas contains only identity
- `ManifoldAdventure.product_chart_is_product`: A product chart is a product
- `ManifoldAdventure.product_point_mem_chart_source`: The product point is covered
- `ManifoldAdventure.model_space_is_manifold`: The model space is a manifold
- `ManifoldAdventure.manifold_of_higher_smoothness`: More smoothness implies less
- `ManifoldAdventure.smooth_manifold_is_topological`: Smooth implies topological
- `ManifoldAdventure.product_of_manifolds`: Products preserve manifolds
- `ManifoldAdventure.tangent_zero`: The zero tangent vector
- `ManifoldAdventure.tangent_vector_as_bundle_point`: Package a tangent vector
- `ManifoldAdventure.tangent_bundle_base`: Project the base point
- `ManifoldAdventure.tangent_bundle_has_zero`: A zero section, point by point
