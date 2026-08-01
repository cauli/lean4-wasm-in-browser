# Undergraduate playthrough report: The Manifold Adventure

## Perspective

I reviewed all 25 levels in order as a mathematics undergraduate who has seen point-set topology and the basic definition of a smooth manifold, but is still learning Lean and Mathlib.

The course has a clear mathematical spine:

\[
\text{homeomorphisms}
\to \text{local charts}
\to \text{atlases}
\to \text{product charts}
\to \text{smooth manifolds}
\to \text{tangent bundles}.
\]

Ada's story makes the first three worlds substantially easier to enter. The strongest parts are where the story objects, the Lean variable names, and the mathematical structure all line up. The weakest parts are the sudden walls of typeclass parameters in Worlds 4 and 5, where the proof remains easy but reading the goal becomes much harder.

## World 1: Homeomorphisms

### 1.1 The drawing matches the trail

Clarity is excellent. `Trail`, `Drawing`, and `trailMap` immediately tell me what the types and map represent. The transition from "nearby points do not jump" to `Continuous trailMap` feels natural.

I learned the first important Mathlib lesson: a `Homeomorph` is bundled, so continuity is already inside it. Using `exact trailMap.continuous` feels like inspecting a mathematical object rather than invoking unexplained automation.

What was cool: the theorem is genuinely about Mathlib's structure, but it still reads like Ada's situation.

What could improve: the two topology instances are visually noisy for a first-ever goal. A one-sentence note that square brackets mean "Lean is being given a notion of nearness" would help. A tiny arrow diagram, `Trail → Drawing`, would also make the direction unmistakable.

### 1.2 The drawing leads Ada back

This follows naturally from 1.1. The story gives a real reason to care about inverse continuity: a map that guides Ada outward but cannot reliably guide her back is not enough.

I learned `trailMap.symm` and the distinction between forward and inverse continuity. The mirrored theorem name `continuous_symm` is easy to remember.

The level is slightly repetitive, but productively so. I would keep it, though the text could explicitly say that this second continuity condition is what distinguishes a homeomorphism from a merely continuous bijection.

### 1.3 Back where she started

This is one of the clearest levels. The story, equation, and theorem name all express the same round trip.

I learned that the equivalence inside a homeomorphism supplies inverse laws such as `symm_apply_apply`. It is also useful to see equality enter the course before more elaborate topology.

What was cool: `exact trailMap.symm_apply_apply place` almost reads as an English explanation of the proof.

A small improvement would be to say that continuity is not used in this particular theorem; this fact comes from the equivalence part of the bundled homeomorphism.

### 1.4 Into the route book

The route book is a good extension of the leaf metaphor. It gives composition a reason to exist rather than introducing it abstractly.

I learned that `trailMap.trans bookMap` means "first `trailMap`, then `bookMap`." That order is worth emphasizing because it may surprise someone accustomed to conventional function-composition notation.

What was cool: this is the first time Ada's map system begins to feel expandable.

Concrete improvement: include a one-line diagram:

```text
Trail ─trailMap→ Drawing ─bookMap→ RouteBook
```

That would make `Homeomorph.trans_apply` almost self-evident.

## World 2: Open partial homeomorphisms

### 2.1 Room around every place

The move from a whole trail to one patch of a curved stone is a convincing reason for partial homeomorphisms. I understood why the course changes from a global map to a chart with a source and target.

I learned that `chart.source` lives on the stone and that `chart.open_source` is bundled into `OpenPartialHomeomorph`.

One phrase is potentially confusing: Ada "shades the usable part of the stone on her leaf," but the source is a subset of `Stone`, not the drawing. The lesson later corrects this, but I would state the distinction immediately:

- source: the patch on the stone;
- target: its coordinate image on the leaf.

### 2.2 No jumps inside the patch

The distinction between `Continuous` and `ContinuousOn` is introduced at exactly the right moment. The local nature of a chart makes the restricted continuity statement intuitive.

I learned that partial maps carry domain-sensitive properties rather than global ones.

The sentence "neither motion should jump" sounds as if the level proves both forward and inverse continuity. The goal only asks for `ContinuousOn chart chart.source`. I would either make that sentence specifically about the mark moving from stone to leaf or add a companion inverse-continuity exercise.

### 2.3 Her mark lands in the drawing

This is the first level where I use a hypothesis rather than simply project a field. That makes it feel like a real step in Lean.

I learned how `apply` transforms the target-membership goal into the source-membership condition already available as `inPatch`.

What was cool: the source/target story makes a dry membership theorem quite concrete.

The first hint gives nearly the complete proof. A more educational first hint might say, "Which theorem turns source membership into target membership?" The exact command could remain in the second hint.

### 2.4 Back to the same spot (3D model: sphere with two charts)

The inverse law now has a side condition, and the story explains why: Ada only gets a reliable round trip inside the patch she actually drew. This is a strong bridge between informal local coordinates and the Mathlib hypothesis `inPatch`.

I learned the key difference between global and partial homeomorphisms: inverse identities require domain membership.

The sphere model helps show why one chart is only local and why overlap matters. It is especially useful here because "source membership" is otherwise an abstract condition.

The caption introduces transition maps, although this level only proves a one-chart round trip. That is useful foreshadowing, but the model would teach the current theorem more directly if it also marked one point, showed that point inside a colored chart patch, and visually traced its round trip.

## World 3: Charted spaces and atlases

### 3.1 A leaf for where she stands

This is a good transition from one chart to an atlas. `Surface`, `Coordinates`, and `place` preserve the story roles in the Lean goal.

I learned what `chartAt Coordinates place` means and how a `ChartedSpace` instance supplies a preferred chart at each point.

Important mathematical wording issue: the world introduction calls the leaves "compatible." A `ChartedSpace` supplies charts and coverage, but smooth compatibility is introduced later through `IsManifold`. Calling them a "collection of local leaves" here would avoid teaching compatibility too early.

### 3.2 This leaf is in the atlas

The distinction between "the chart selected at this point" and "the whole atlas" becomes clear.

I learned that `chartAt` is not an arbitrary chart manufactured outside the atlas; `chart_mem_atlas` connects the preferred chart back to the collection.

This level is mathematically close to 3.1, but the two together establish two separate facts: the selected chart contains the point and belongs to the atlas. A small atlas diagram with the selected leaf highlighted would reinforce that difference.

### 3.3 Her place lands on the leaf

The explanation of `chartAt Coordinates place place` is necessary and effective. Without it, seeing `place` twice is initially alarming.

I learned that the first `place` selects the chart while the second is the argument mapped into coordinates.

This is a nice Mathlib-reading lesson. I would visually parenthesize it in the prose:

```lean
(chartAt Coordinates place) place
```

That makes the two roles easier to parse.

### 3.4 The map works nearby

This is the first substantial notation jump. The story meaning is clear: a chart works around Ada, not only at her exact footprint. Still, `source ∈ 𝓝 place` is not obvious to someone new to filters.

I learned that Mathlib represents the collection of neighborhoods of a point using `𝓝 place`.

The course should explicitly say that `𝓝 place` is a filter of sets, so the left side is a set being a neighborhood, not a point belonging to a set. It would also help to translate the statement as "the source contains some open set around `place`." Otherwise this can feel like symbol memorization.

### 3.5 No place left uncovered (3D model: sphere with two charts)

This is a satisfying end to the atlas world. The indexed union looks formidable, but the prose gives it a clear meaning: spread out every preferred chart source and recover the entire surface.

I learned `Set.iUnion`, `Set.univ`, and the global coverage theorem `iUnion_source_chartAt`.

The sphere model fits this level very well. The two translucent regions make "local charts collectively cover a global object" visible. This is more directly relevant than its earlier appearance in 2.4.

A useful enhancement would be a coverage toggle that shows the amber patch, teal patch, their overlap, and their union separately.

## World 4: Identity and product charts

### World overview (3D model lab: seven-model explorer)

This is the most playful part of the course. The sphere, torus, Möbius band, trefoil/circle, spherical triangle, figure-eight, and tangent plane form a good miniature topology museum.

The models make me want to know more, but four of them are not used in any subsequent level. As a student, that makes the lab feel partly detached from the formal course. Either label these as optional mathematical excursions or add later exercises that return to the Möbius band, embeddings, curvature, and the figure-eight's singular point.

### 4.1 A blank leaf maps to itself

The identity-chart idea is clear. I learned that Mathlib provides a canonical self-charted-space instance and that `chartAt_self_eq` identifies its chart.

"Blank leaf" is slightly odd because a blank leaf has no coordinate markings. "Reference grid laid on an identical grid" might better convey identity coordinates.

The level should emphasize the word "canonical." It is not claiming that every possible atlas on a space contains only the identity chart; it is describing Mathlib's selected self-charted instance.

### 4.2 Only the do-nothing map

This is the first genuine multi-step proof and a welcome increase in Lean difficulty. I learned how to prove an `↔` using `constructor`, two cases, `intro`, `.mp`, and `.mpr`.

What was cool: the proof structure corresponds to the two logical directions, rather than merely recalling one theorem name.

The same canonical-instance warning matters here. "The self-atlas" could sound like the unique possible atlas on a space. It is specifically Mathlib's canonical atlas for a coordinate space charting itself.

The jump from one-line `exact` proofs to bullets and `Iff` is noticeable but reasonable.

### 4.3 Two readings at once (3D model: torus with its two loops)

The story gives an intuitive interpretation of a product: one reading around the hole and one around the tube. The highlighted loops make the two independent directions memorable.

I learned `ModelProd`, product charted-space inference, `.prod`, `position.1`, `position.2`, and theorem rewriting with `rw`.

The main difficulty is not the proof; it is the enormous declaration header. As a mathematics student, I have to work hard to discover the simple statement inside all the topology and typeclass parameters.

The model caption's noncontractible-loop fact is interesting but not what the Lean theorem proves. The stronger connection would be to say explicitly: "Think of `FirstSurface` and `SecondSurface` as two circles; their product is the torus." Highlighting the two coordinate parameters rather than only the two homotopy generators would better match the goal.

### 4.4 The paired chart contains her place (3D model: torus with its two loops)

This is a good reuse of `mem_chart_source` in a more complicated inferred product instance. I learned that an earlier theorem can be specialized to a new structure without proving coverage again.

`simpa only using` is a large Lean-language step, and the course does not fully explain what mismatch it is simplifying. The proof feels like magic unless the learner already understands elaboration and simplification.

The repeated torus model is less effective here because it shows the same scene and caption as 4.3. A variant highlighting one point, its pair of coordinates, and the product of the two local patches would better serve this theorem.

## World 5: Smooth manifolds

### 5.1 The reference leaf is ready

Mathematically, the fact that the model space is itself a manifold is satisfying. I learned the roles of `Scalar`, `Vectors`, `Coordinates`, `ModelWithCorners`, `WithTop ℕ∞`, and `IsManifold`, as well as `infer_instance`.

This is the largest readability shock in the course. The solution is one word, but the signature introduces a field, a normed additive group, a normed space, three universe levels, a topology, a model, and a differentiability order.

A concrete first version over `ℝ` and `ℝⁿ` would help enormously before revealing the general theorem. The course should also explain `WithTop ℕ∞` more directly: finite differentiability orders plus infinity. At present, `ℕ∞` and the outer `WithTop` are difficult to interpret from the story alone.

### 5.2 Passing an easier check

The mathematical content is very clear: more differentiability implies less differentiability. `lowerOrder ≤ higherOrder` provides the exact direction needed.

I learned `IsManifold.of_le` and saw how regularity assumptions form a hierarchy.

A concrete example such as "a \(C^5\) atlas is also \(C^2\)" would make the abstract order variables easier to absorb. The proof is simple enough that the real learning task is reading the statement.

### 5.3 Smooth maps still keep points close

I understood the intended lesson: \(C^\infty\) compatibility implies \(C^0\) compatibility, and Mathlib can infer the lower-order instance.

The title is slightly misleading. The theorem is not directly proving that an arbitrary smooth map is continuous; it lowers the regularity of an `IsManifold` structure. "A smooth atlas still works topologically" would be more precise.

The course should explicitly warn that order `0` does not mean a zero-dimensional manifold. That is a very plausible undergraduate misunderstanding.

### 5.4 Two circles make a torus

This is the strongest mathematical payoff in World 5. I learned that `IsManifold.prod` combines two manifold structures and that the coordinate model becomes `firstModel.prod secondModel`.

What was cool: this is recognizably a theorem from a manifold course, not merely a structure projection.

Again, the theorem is completely general while the story is specifically about circles and a torus. That is fine, but it should explicitly frame the story as the motivating special case. This would also be a more relevant place for the torus model than repeating it in both product-chart levels.

The declaration is the most intimidating in the course. A collapsible "infrastructure assumptions" section or a highlighted final conclusion would let the learner see the theorem before parsing every instance.

## World 6: Tangent spaces and the tangent bundle

### 6.1 Ada stands still (3D model: tangent plane at a point)

This model helps more than any other individual scene. Seeing a plane attached at one point makes the type `TangentSpace model place` feel like a fiber rather than another abstract type.

I learned that the tangent space has an additive zero and that the expected type lets Lean interpret `0`.

The story and goal align perfectly. A useful addition would explain that the displayed plane is a visualization of the intrinsic tangent space, not merely an arbitrary plane floating in the ambient three-dimensional picture.

### 6.2 Place and velocity together (3D model: tangent plane at a point)

This is one of the coolest Lean levels. The story explains exactly why a velocity must remember its base point, and the dependent pair `⟨place, velocity⟩` expresses that dependence.

I learned that `TangentBundle` is a total space built from fibers and that Lean can recover the implicit `place` from the type of `velocity`.

The model is helpful, though repeating exactly the same scene limits its value. Showing tangent planes at two different points would make "the available tangent plane changes from place to place" visually undeniable.

### 6.3 Read the location tag

This is a clean introduction to definitional equality. I learned that the first projection of the dependent pair reduces directly to `place`, so `rfl` is enough.

The mathematical content is tiny, but it is useful preparation for the final existential proof. It would be nice to mention the second projection as well and explain why its type depends on the first.

### 6.4 Standing still anywhere

This is a good capstone for the existing course. It reuses the course's own `tangent_zero`, constructs an existential witness with `refine`, and finishes the projection equation with `rfl`.

I learned how a previously created definition can become part of later formal mathematics. That makes the unlock system feel real.

The prose calls this the "pointwise content of the zero section," which is fair but slightly overstates the formal result. The theorem proves that every base point has a tangent-bundle point above it, using zero as the witness. It does not yet define the zero section as a function or prove that it is continuous or smooth. Constructing that function would make an excellent final challenge.

## Course-wide conclusions

### What the course teaches well

The course is very good at introducing the actual structures Lean geometers encounter:

- bundled homeomorphisms;
- open partial homeomorphisms with sources and targets;
- `ChartedSpace`, `chartAt`, and `atlas`;
- canonical and product instances;
- `ModelWithCorners` and `IsManifold`;
- tangent spaces and dependent tangent bundles.

The variable renaming is a major success. `Trail`, `Drawing`, `Stone`, `Surface`, `Coordinates`, `place`, and `velocity` do much more pedagogical work than generic `X`, `Y`, `M`, `H`, and `x`.

The human-readable objective is also correctly placed beside the formal goal. It lets me check that I understand the mathematics before deciphering the Lean statement.

The Mathlib documentation links are useful, but those pages are much denser than the lessons. It would help to label them as reference material rather than expected prerequisite reading. Since the course pins Mathlib, links to a matching source revision, or a note that the online docs may describe a newer version, would prevent possible signature confusion.

### What I actually learned

By the end, I can explain:

1. why a homeomorphism bundles more than a function;
2. why charts have restricted domains;
3. how a charted space chooses a chart at every point;
4. how chart sources collectively cover a surface;
5. how product charts and product manifold instances are assembled;
6. how Mathlib represents differentiability order;
7. why a tangent-bundle point is a dependent pair.

That is a coherent and worthwhile course outcome.

### Storytelling assessment

Ada is strongest in Worlds 1 through 3 and World 6. The story does not merely decorate those lessons; it explains why the hypotheses and types exist.

The bridge weakens in World 4 and especially World 5. There, Ada says something simple while the Lean goal presents a large block of abstract algebra and typeclass infrastructure. The technical paragraph needs one additional layer between story and code: either a concrete example over real coordinate spaces or a small type diagram.

The course should avoid saying ChartedSpace charts are already "compatible." Smooth compatibility belongs later with `IsManifold`.

### Difficulty progression

The perceived difficulty rises, but the proof difficulty does not rise steadily:

- Worlds 1 through 3 are mostly one-line theorem projection or theorem recall.
- World 4 suddenly introduces `constructor`, bullets, `rw`, and `simpa`.
- World 5 has the most intimidating statements but mostly one-line proofs.
- World 6 becomes concrete again and ends with a modest constructed witness.

This makes the course an effective Mathlib API tour, but not yet a stiff theorem-proving ladder. Many hints give the exact declaration and exact command, so success often measures copying the right theorem name rather than combining ideas.

I would add one capstone per world that requires two or three previously unlocked facts:

- compose continuity with a homeomorphism inverse;
- prove both source-to-target membership and a round trip;
- derive atlas coverage from pointwise chart coverage;
- reason about the source of a product chart;
- specialize a product-manifold theorem to a torus;
- define the zero section and prove its base projection is the identity.

A challenge mode could preserve the existing hints but reveal them more gradually.

### 3D-model assessment

Level-embedded 3D scenes occur at:

- 2.4, sphere with two charts;
- 3.5, sphere with two charts;
- 4.3, torus with two loops;
- 4.4, torus with two loops;
- 6.1, tangent plane at a point;
- 6.2, tangent plane at a point.

World 4 also contains the seven-model explorer.

The sphere and tangent-plane scenes directly improve comprehension. The torus scene is memorable, but its loop/homotopy caption is only indirectly connected to the product-chart goals. Repeating identical models in adjacent levels is less helpful than showing a new state of the same concept.

The seven-model explorer is mathematically delightful, but it currently promises more content than the formal levels deliver. It would become much stronger if each model either linked to a relevant exercise or was clearly presented as an optional gallery of future ideas.

### Highest-priority improvements

1. Correct the early implication that a `ChartedSpace` already contains compatible charts.
2. Add a concrete real-coordinate example before the general `ModelWithCorners` signatures.
3. Explain filter neighborhood notation more fully in 3.4.
4. Explain `simpa only using` before requiring it in the largest product goal.
5. Clarify that order `0` is regularity, not dimension.
6. Make repeated 3D scenes change state to illustrate the exact theorem.
7. Add synthesis levels that combine unlocked declarations.
8. End by constructing the actual zero-section function, not only a pointwise existential witness.

## Overall verdict

As a mathematics undergraduate, I would keep playing. The course now has a recognizable character, and Ada's maps provide a surprisingly effective route into Mathlib's manifold API. It succeeds best as an introduction to how manifold concepts are represented in Lean.

The next major improvement is not more prose. It is deeper exercises: fewer levels whose whole proof is a named projection, and more short proofs where previously unlocked structures and theorems interact. That would turn a strong guided API tour into a genuine manifold theorem-proving adventure.
