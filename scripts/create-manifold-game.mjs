#!/usr/bin/env node

import fs from 'node:fs'

const outputUrl = new URL('../src/game/manifolds.generated.json', import.meta.url)

function makeLevel(world, number, level) {
  return {
    id: `${world.toLowerCase()}-${number}`,
    world,
    number,
    title: level.title,
    introduction: level.introduction.trim(),
    conclusion: level.conclusion.trim(),
    statement: `${level.theoremName} ${level.statement}`,
    theoremName: level.theoremName,
    solution: level.solution,
    hints: level.hints,
    newTactics: level.newTactics || [],
    hiddenTactics: [],
    newTheorems: level.newTheorems || [],
    newDefinitions: level.newDefinitions || [],
    disabledTactics: [],
    disabledTheorems: [],
    disabledDefinitions: [],
    sourcePath: `Original/Manifolds/${world}/L${String(number).padStart(2, '0')}.lean`,
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
    commit: 'original-local-course-2026-07-28',
    license: 'No separate course license specified',
    toolchain: 'local Lean WASM',
    importedAt: '2026-07-27T23:15:16.000Z',
  },
  title: 'The Manifold Adventure',
  introduction: `# Welcome, tiny geometer

Imagine an ant named **Ada** walking across a shape. She cannot float above it to see the whole thing. She knows only the ground near her feet. On a huge sphere, that ground feels flat. A loop looks like an ordinary line until she walks far enough to return to where she started.

Manifolds are full of this tension between what a space looks like nearby and what it is like as a whole.

This course starts from scratch. You do not need topology, calculus, or experience with proofs. Each level contains:

1. a geometric idea, picture, or story;
2. a small Lean proposition checked by the local browser kernel.

The Lean statements capture only the logical shape of each lesson. They do not replace the full Mathlib definitions of topological or smooth manifolds.

## Typing mathematical symbols

The Lean editor converts backslash commands into symbols. Type the command, then press Space or Tab. When a lesson introduces a symbol, it gives you the command beside it.

## Where the story comes from

- [Paulina Rowińska's Quanta explainer](https://www.quantamagazine.org/what-is-a-manifold-20251103/) inspired Ada's point of view and the lessons on charts, intrinsic geometry, Riemann, and the double pendulum.
- Edwin A. Abbott's 1884 [*Flatland*](https://www.gutenberg.org/ebooks/97) gives us the idea of imagining dimensions from inside them. We borrow that premise, not the book's Victorian social world.
- [Loring Tu's *An Introduction to Manifolds*](https://link.springer.com/book/10.1007/978-1-4419-7400-6) is a good first textbook after this game.
- [John Milnor's *Topology from the Differentiable Viewpoint*](https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf), [Guillemin-Pollack's *Differential Topology*](https://bookstore.ams.org/CHEL/370.H), and [John Lee's *Introduction to Smooth Manifolds*](https://link.springer.com/book/10.1007/978-0-387-21752-9) continue topics previewed in the later worlds.
- [MIT 18.950](https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/) has rigorous notes and problems about curvature. It assumes multivariable calculus and linear algebra.

Start with **Ada in Flatland**. Take your time. Draw the objects, and open a hint whenever you need one.`,
  information: `This local course is an introduction, not a replacement for a textbook.

After the game, try Tu and then Milnor. From there, choose Lee for a broad reference or Guillemin-Pollack for differential topology. MIT 18.950 is a free option once you know multivariable calculus and linear algebra.`,
  caption: 'Follow Ada from Flatland to charts, tangent spaces, curvature, and the topology of a doughnut. Lean checks each small logical exercise in your browser.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Flatland',
      'Ada in Flatland',
      `# The view from inside

Edwin A. Abbott's 1884 *Flatland* asks how a two-dimensional creature might understand higher dimensions. Ada has a related problem: **what can she learn about a space without leaving it?**

![Ada explores a locally flat world](images/flatland-ant.svg)

We begin with some basic Lean ingredients. You will use propositions and evidence, then equality, "and," "or," and implication.`,
      [],
      [
        {
          title: 'A proof is an object',
          theoremName: 'manifold_proof_is_object',
          statement: '(groundIsNear : Prop) (evidence : groundIsNear) : groundIsNear',
          introduction: `# Ada's first fact

In Lean, a proposition is a type that represents a claim. The hypothesis \`evidence : groundIsNear\` is evidence that the claim is true. Since the goal is \`groundIsNear\`, you can give Lean that hypothesis with \`exact evidence\`.`,
          conclusion: `You proved the goal by naming evidence you already had. Get used to checking the goal against the hypotheses before trying anything complicated.`,
          solution: 'exact evidence',
          hints: ['Look at the type of `evidence`. It is the same as the goal.', 'Enter `exact evidence`.'],
          newTactics: ['exact'],
          newDefinitions: ['Prop'],
        },
        {
          title: 'The same place',
          theoremName: 'manifold_same_place',
          statement: '(position : ℕ) : position = position',
          introduction: `# Equality without calculation

Ada marks a spot, then checks that it is still the same spot. Lean's \`rfl\` tactic proves that an expression equals itself. The name comes from *reflexivity*.

The equals sign [=](https://en.wikipedia.org/wiki/Equals_sign) is already on your keyboard, so it does not need a backslash command. The natural-number symbol [ℕ](https://en.wikipedia.org/wiki/Natural_number) in the goal is typed as \`\\N\`, followed by Space or Tab.`,
          conclusion: `This kind of equality looks almost too easy, but it appears everywhere. Later, chart maps and their inverses will have to take you out and bring you back to the same place.`,
          solution: 'rfl',
          hints: ['Both sides are literally the same expression.', 'Use `rfl`.'],
          newTactics: ['rfl'],
          newDefinitions: ['Eq'],
        },
        {
          title: 'Two local clues',
          theoremName: 'manifold_two_local_clues',
          statement: '(looksFlat canWalk : Prop) (hFlat : looksFlat) (hWalk : canWalk) : looksFlat ∧ canWalk',
          introduction: `# Package observations

Ada sees that the ground nearby looks flat **and** that she can walk on it. The logical conjunction symbol [∧](https://en.wikipedia.org/wiki/Logical_conjunction) means "and." Type it as \`\\and\`, followed by Space or Tab. The \`constructor\` tactic turns this "and" goal into two separate goals.`,
          conclusion: `Definitions often bundle several requirements together. A modern definition of a manifold does this with local Euclidean structure, separation, and countability conditions.`,
          solution: 'constructor\n· exact hFlat\n· exact hWalk',
          hints: ['Use `constructor` to split the `∧` goal.', 'The first new goal matches `hFlat`; the second matches `hWalk`.'],
          newTactics: ['constructor'],
          newDefinitions: ['And'],
        },
        {
          title: 'One route is enough',
          theoremName: 'manifold_one_route',
          statement: '(east west : Prop) (hEast : east) : east ∨ west',
          introduction: `# A fork in the path

The logical disjunction symbol [∨](https://en.wikipedia.org/wiki/Logical_disjunction) means "or." Type it as \`\\or\`, followed by Space or Tab. To prove \`east ∨ west\`, you may prove either side. Ada has evidence for the route on the left, so choose that branch with \`left\`.`,
          conclusion: `A disjunction records alternatives. We will use the same logical shape when a point can lie in one chart or another.`,
          solution: 'left\nexact hEast',
          hints: ['Choose the side supported by `hEast`.', 'Use `left`, then `exact hEast`.'],
          newTactics: ['left'],
          newDefinitions: ['Or'],
        },
        {
          title: 'Assume, then reason',
          theoremName: 'manifold_local_implication',
          statement: '(looksLikeLine : Prop) : looksLikeLine → looksLikeLine',
          introduction: `# An implication

The implication arrow [→](https://en.wikipedia.org/wiki/Material_conditional) in \`A → B\` says that evidence for \`A\` can be turned into evidence for \`B\`. Type it as \`\\to\`, followed by Space or Tab. To prove an implication, \`intro h\` moves its input into your hypotheses. Here the input and output coincide.`,
          conclusion: `You now know the few Lean moves used in most of this course: name an object, prove an equality, split an "and," choose a side of an "or," or introduce an implication.`,
          solution: 'intro h\nexact h',
          hints: ['Use `intro h` to assume the left side.', 'The new hypothesis is exactly the goal.'],
          newTactics: ['intro'],
        },
      ],
    ),
    makeWorld(
      'Topology',
      'A trail through topology',
      `# Shape without rulers

Topology studies notions such as continuity, neighborhoods, and connectedness. It also asks which features survive continuous deformation. Lengths and angles are not part of the starting data.

A topological space specifies which sets are open. From open sets, we can define what "nearby" and "continuous" mean. In this world, the topology stays conceptual while Lean checks the small logical exercises.`,
      ['Flatland'],
      [
        {
          title: 'Nearness before distance',
          theoremName: 'manifold_nearness_before_distance',
          statement: '(hasNeighborhood : Prop) (h : hasNeighborhood) : hasNeighborhood',
          introduction: `# No ruler required

A neighborhood is a region around a point. Topology lets us discuss neighborhoods before choosing any formula for distance, so the same ideas work on many different spaces.`,
          conclusion: `A metric produces a topology, but a topology does not always come from a metric.`,
          solution: 'exact h',
          hints: ['The goal repeats hypothesis `h`.'],
        },
        {
          title: 'An open neighborhood',
          theoremName: 'manifold_open_neighborhood',
          statement: '(isOpen containsAda : Prop) (hOpen : isOpen) (hAda : containsAda) : isOpen ∧ containsAda',
          introduction: `# Two jobs for a neighborhood

For a set to be a neighborhood of Ada, it must contain an open region around her. Our small proposition simplifies this to two facts: the region is open, and Ada is in it.`,
          conclusion: `When a definition feels dense, separate its requirements. You can usually handle them one at a time.`,
          solution: 'constructor\n· exact hOpen\n· exact hAda',
          hints: ['Split the `∧` with `constructor`.', 'Use `hOpen`, then `hAda`.'],
        },
        {
          title: 'A continuous trail',
          theoremName: 'manifold_continuous_trail',
          statement: '(trailContinuous reachesFood : Prop) (bridge : trailContinuous → reachesFood) (hTrail : trailContinuous) : reachesFood',
          introduction: `# Follow a rule

Informally, continuity says that nearby inputs give nearby outputs. A path is a continuous map from an interval into a space. Here, \`bridge\` turns evidence that the trail is continuous into evidence that Ada reaches the food. The \`apply\` tactic uses this rule and asks you to prove its input.`,
          conclusion: `When you apply a theorem, Lean replaces the current goal with whatever that theorem still needs.`,
          solution: 'apply bridge\nexact hTrail',
          hints: ['Use `apply bridge`.', 'The remaining goal is exactly `hTrail`.'],
          newTactics: ['apply'],
        },
        {
          title: 'Two-way deformation',
          theoremName: 'manifold_two_way_deformation',
          statement: '(forward backward : Prop) (hForward : forward) (hBackward : backward) : forward ∧ backward',
          introduction: `# The homeomorphism idea

Two spaces are homeomorphic when there is a continuous bijection between them and its inverse is continuous too. You can think of this as a continuous relabeling that works in both directions.`,
          conclusion: `Homeomorphic spaces have the same topological shape. The familiar picture of reshaping a coffee mug into a torus is an informal example, with both objects idealized as surfaces.`,
          solution: 'constructor\n· exact hForward\n· exact hBackward',
          hints: ['A two-direction package calls for `constructor`.'],
        },
        {
          title: 'Connected choices',
          theoremName: 'manifold_connected_choice',
          statement: '(connected disconnected : Prop) (hConnected : connected) : disconnected ∨ connected',
          introduction: `# One piece or several?

A connected space cannot be divided into two disjoint, nonempty open pieces. Ada knows that her world is connected, but the goal lists \`disconnected\` first. Her evidence belongs on the right.`,
          conclusion: `The order of the two branches matters. Lean asks you to say which one your evidence proves.`,
          solution: 'right\nexact hConnected',
          hints: ['Your evidence supports the second branch.', 'Use `right`.'],
          newTactics: ['right'],
        },
      ],
    ),
    makeWorld(
      'LocalEuclidean',
      'The local Euclidean test',
      `# Zoom in

Every point of an $n$-dimensional manifold has a neighborhood that looks like an open part of $\\mathbb{R}^n$.

A circle looks like a line nearby, and the surface of a sphere looks like a plane nearby. A figure eight is different at its crossing. Four arms meet there, so no small neighborhood of the crossing looks like an interval.

The real-number symbol [ℝ](https://en.wikipedia.org/wiki/Real_number) is typed in Lean as \`\\R\`, followed by Space or Tab.

Most modern definitions also require the space to be Hausdorff and second countable. Authors do not all use exactly the same convention, so check the definition in the book you are reading.`,
      ['Topology'],
      [
        {
          title: 'A line close up',
          theoremName: 'manifold_line_local_model',
          statement: '(locallyRealLine : Prop) (h : locallyRealLine) : locallyRealLine',
          introduction: `# Dimension one

The real line $\\mathbb{R}$ is the model one-dimensional Euclidean space. An open interval is the local template for a one-manifold without boundary.`,
          conclusion: `The dimension tells you how many coordinates a chart needs.`,
          solution: 'exact h',
          hints: ['Use the matching hypothesis.'],
        },
        {
          title: 'A circle is locally a line',
          theoremName: 'manifold_circle_local_line',
          statement: '(circleLooksLinearNearby : Prop) (h : circleLooksLinearNearby) : circleLooksLinearNearby',
          introduction: `# Loop globally, line locally

On a huge circle, Ada sees only a short arc. One real coordinate can label that arc, just as it labels an interval. If she keeps walking, she eventually discovers the loop. The local coordinate never claimed to describe the whole circle.`,
          conclusion: `The line and the circle are both one-manifolds, but they are not homeomorphic. Looking the same nearby does not make them the same globally.`,
          solution: 'exact h',
          hints: ['The hypothesis already supplies the local claim.'],
        },
        {
          title: 'The crossing alarm',
          theoremName: 'manifold_figure_eight_crossing',
          statement: '(crossingIsLineLike : Prop) (alarm : ¬ crossingIsLineLike) : ¬ crossingIsLineLike',
          introduction: `# A non-example

Take a small neighborhood of the crossing in a planar figure eight and remove the crossing itself. Four arms remain. Do the same to an open interval and only two pieces remain. The neighborhoods cannot be homeomorphic, so the crossing is not locally a line.

In the goal, the logical negation symbol [¬](https://en.wikipedia.org/wiki/Negation) means "not." Type it as \`\\not\`, followed by Space or Tab.`,
          conclusion: `A single bad point is enough to spoil the manifold condition. Crossings, tips, seams, and boundaries are good places to check first.`,
          solution: 'exact alarm',
          hints: ['`alarm` has exactly the negated goal.'],
          newDefinitions: ['Not'],
        },
        {
          title: 'Dimension is local',
          theoremName: 'manifold_dimension_local',
          statement: '(localDimension : ℕ) : localDimension = localDimension',
          introduction: `# Count coordinates, not embedding axes

A circle drawn in a plane is still one-dimensional because one local coordinate locates Ada. The surface of a sphere is two-dimensional even when we draw it in three-dimensional space. The dimension of the surrounding space is a separate matter.`,
          conclusion: `To find the intrinsic dimension, count the independent local coordinates.`,
          solution: 'rfl',
          hints: ['This is reflexive equality.'],
        },
        {
          title: 'The modern package',
          theoremName: 'manifold_modern_package',
          statement: '(locallyEuclidean hausdorff secondCountable : Prop) (hLocal : locallyEuclidean) (hHaus : hausdorff) (hCount : secondCountable) : locallyEuclidean ∧ hausdorff ∧ secondCountable',
          introduction: `# More than the slogan

"Looks Euclidean nearby" is the part worth remembering first. Textbooks commonly add the Hausdorff and second-countability conditions. These conditions rule out troublesome spaces and make standard results available.`,
          conclusion: `This goal packages all three requirements. Tu reviews the point-set topology needed to understand what each one does.`,
          solution: 'constructor\n· exact hLocal\n· constructor\n  · exact hHaus\n  · exact hCount',
          hints: ['The goal is nested as `locallyEuclidean ∧ (hausdorff ∧ secondCountable)`.', 'Use `constructor` twice.'],
        },
      ],
    ),
    makeWorld(
      'Charts',
      'Charts and atlases',
      `# Coordinates are local tools

A **chart** pairs an open patch of a manifold with coordinates in Euclidean space. An **atlas** is a family of compatible charts covering the manifold.

![Overlapping charts turn patches into coordinates](images/charts-atlas.svg)

Think of an atlas of Earth. No page needs to show the entire globe without seams or distortion. Where two charts overlap, a transition map translates between their coordinate systems.`,
      ['LocalEuclidean'],
      [
        {
          title: 'A chart has two sides',
          theoremName: 'manifold_chart_two_sides',
          statement: '(patchOpen coordinatesOpen : Prop) (hPatch : patchOpen) (hCoordinates : coordinatesOpen) : patchOpen ∧ coordinatesOpen',
          introduction: `# Patch and coordinate image

A topological chart is a homeomorphism between an open patch of the manifold and an open subset of Euclidean space. The patch and its coordinate image both matter.`,
          conclusion: `Coordinates belong to a particular chart. The whole manifold may not have one coordinate system.`,
          solution: 'constructor\n· exact hPatch\n· exact hCoordinates',
          hints: ['Split the conjunction.'],
        },
        {
          title: 'Go there and back',
          theoremName: 'manifold_chart_round_trip',
          statement: '(coordinate : ℕ) : coordinate = coordinate',
          introduction: `# Inverses

A chart map and its inverse undo each other wherever both are defined. This exercise represents that round trip with a coordinate that returns unchanged.`,
          conclusion: `A full proof would state these inverse laws as equations between functions.`,
          solution: 'rfl',
          hints: ['Use `rfl`.'],
        },
        {
          title: 'The globe needs seams',
          theoremName: 'manifold_globe_needs_charts',
          statement: '(needsSeveralCharts : Prop) (h : needsSeveralCharts) : needsSeveralCharts',
          introduction: `# No perfect flat world map

Latitude and longitude are useful, but the coordinates have a seam and behave badly at the poles. Choosing different coordinates can move those problems, but it does not give the sphere one perfect flat map.`,
          conclusion: `The sphere is still a manifold. It simply needs more than one chart.`,
          solution: 'exact h',
          hints: ['Use the matching evidence.'],
        },
        {
          title: 'Cover the sphere',
          theoremName: 'manifold_sphere_chart_cover',
          statement: '(northChart southChart : Prop) (covered : northChart ∨ southChart) : northChart ∨ southChart',
          introduction: `# An atlas covers every point

Stereographic projection from the north pole misses the north pole. Projection from the south pole misses the south pole. Used together, the two charts cover the sphere.`,
          conclusion: `One chart may miss some points. The atlas only requires that the charts cover the manifold together.`,
          solution: 'exact covered',
          hints: ['The whole disjunction is already a hypothesis.'],
        },
        {
          title: 'Agree on the overlap',
          theoremName: 'manifold_chart_compatibility',
          statement: '(overlapDefined transitionContinuous : Prop) (hOverlap : overlapDefined) (hTransition : transitionContinuous) : overlapDefined ∧ transitionContinuous',
          introduction: `# Translation between maps

Where two charts overlap, compose one coordinate map with the inverse of the other. For a topological atlas, that transition is continuous. For a smooth atlas, it must be smooth.`,
          conclusion: `These transition maps make calculations from different charts agree on the same space.`,
          solution: 'constructor\n· exact hOverlap\n· exact hTransition',
          hints: ['Package both compatibility conditions with `constructor`.'],
        },
      ],
    ),
    makeWorld(
      'Objects',
      'A cabinet of surfaces',
      `# Meet the recurring objects

![A circle, sphere, torus, and Möbius strip](images/manifold-objects.svg)

We will keep returning to a few examples: the sphere, the torus, the configuration space of a double pendulum, and the Möbius strip. They let us separate intrinsic dimension from the dimension of the surrounding space, compare local and global shape, and meet manifolds with boundary.`,
      ['Charts'],
      [
        {
          title: 'The globe beneath Ada',
          theoremName: 'manifold_sphere_surface',
          statement: '(locallyPlaneLike globallyClosed : Prop) (hLocal : locallyPlaneLike) (hGlobal : globallyClosed) : locallyPlaneLike ∧ globallyClosed',
          introduction: `# The two-sphere

The surface $S^2$ is a two-manifold. Every small patch looks like an open piece of $\\mathbb{R}^2$, although the surface closes around itself as a whole. The solid ball inside is a different object.`,
          conclusion: `In discussions of manifolds, "sphere" often means the surface rather than the filled ball. Check the notation and context.`,
          solution: 'constructor\n· exact hLocal\n· exact hGlobal',
          hints: ['Use `constructor`; prove local and global facts separately.'],
        },
        {
          title: 'The doughnut',
          theoremName: 'manifold_torus_surface',
          statement: '(locallyPlaneLike hasLoopingDirections : Prop) (hLocal : locallyPlaneLike) (hLoops : hasLoopingDirections) : locallyPlaneLike ∧ hasLoopingDirections',
          introduction: `# The torus

The surface of a doughnut is a two-manifold called a torus. A small patch looks planar. Across the whole torus, one loop goes around the tube and another goes around the central hole.`,
          conclusion: `The torus and sphere have the same local dimension, but their global topology differs.`,
          solution: 'constructor\n· exact hLocal\n· exact hLoops',
          hints: ['Build the conjunction from `hLocal` and `hLoops`.'],
        },
        {
          title: 'Two pendulum angles',
          theoremName: 'manifold_pendulum_torus',
          statement: '(firstAngleLoops secondAngleLoops : Prop) (hFirst : firstAngleLoops) (hSecond : secondAngleLoops) : firstAngleLoops ∧ secondAngleLoops',
          introduction: `# A space of possibilities

In Quanta's example, each arm of a double pendulum contributes one angle. Each angle runs around a circle, so a pair of angles runs over circle × circle, which is a torus. Here the Cartesian product symbol [×](https://en.wikipedia.org/wiki/Cartesian_product) is typed in Lean as \`\\times\`, followed by Space or Tab. A point on this torus records a **configuration** of the pendulum. It is not a point traced by either arm.`,
          conclusion: `A manifold can describe the possible states of a system. The same point of view is used in mechanics, robotics, dynamical systems, and data analysis.`,
          solution: 'constructor\n· exact hFirst\n· exact hSecond',
          hints: ['There are two independent looping angle facts.'],
        },
        {
          title: 'The Möbius edge',
          theoremName: 'manifold_mobius_boundary',
          statement: '(interiorLooksPlanar boundaryLooksHalfPlanar : Prop) (hInterior : interiorLooksPlanar) (hBoundary : boundaryLooksHalfPlanar) : interiorLooksPlanar ∧ boundaryLooksHalfPlanar',
          introduction: `# Twist before gluing

A Möbius strip is a **two-manifold with boundary**. Interior points have disk-like neighborhoods. Points on its single boundary curve have neighborhoods like a half-disk, not an open disk. So it is not a two-manifold *without* boundary under the usual definition.

Its one-sided behavior concerns orientability, which we will meet later.`,
          conclusion: `Having a boundary is not a flaw. Manifolds with boundary form a separate category with their own local model.`,
          solution: 'constructor\n· exact hInterior\n· exact hBoundary',
          hints: ['Keep the interior and boundary local models separate.'],
        },
        {
          title: 'Intrinsic loop, extrinsic knot',
          theoremName: 'manifold_intrinsic_loop',
          statement: '(sameIntrinsicLoop differentEmbedding : Prop) (hLoop : sameIntrinsicLoop) (hEmbedding : differentEmbedding) : sameIntrinsicLoop ∧ differentEmbedding',
          introduction: `# How a space sits versus what it is

A closed string can be embedded in three-dimensional space as an unknot or a knot. Intrinsically, the string itself is still a circle. Knotting is information about the embedding in ambient space.`,
          conclusion: `The circle describes the string itself. The knot describes how that circle sits in the surrounding space.`,
          solution: 'constructor\n· exact hLoop\n· exact hEmbedding',
          hints: ['Both the intrinsic and embedding claims are supplied.'],
        },
      ],
    ),
    makeWorld(
      'Riemann',
      'Riemann changes "space"',
      `# From a stage to an object

In an 1854 lecture on the foundations of geometry, Bernhard Riemann extended ideas about curved surfaces to spaces of arbitrary dimension. The lecture was published in 1868, after his death.

The word "manifold" comes from Riemann's German term *Mannigfaltigkeit*, associated with multiplicity or variety. Later mathematicians developed today's precise definitions in terms of charts. Riemann introduced the underlying ideas, but he did not write down every modern axiom.`,
      ['Objects'],
      [
        {
          title: 'Space becomes an object',
          theoremName: 'manifold_space_as_object',
          statement: '(spaceCanBeStudied : Prop) (h : spaceCanBeStudied) : spaceCanBeStudied',
          introduction: `# Space becomes part of the problem

Classical geometry often put figures inside a fixed Euclidean space. With manifolds, the space itself can vary and become the thing we study.`,
          conclusion: `We can now compare spaces, define maps between them, classify them, and add further structure.`,
          solution: 'exact h',
          hints: ['Use `h`.'],
        },
        {
          title: 'The 1854 lecture',
          theoremName: 'manifold_riemann_lecture',
          statement: '(lectureGeneralizedDimension : Prop) (historicalEvidence : lectureGeneralizedDimension) : lectureGeneralizedDimension',
          introduction: `# A careful historical marker

Riemann delivered his habilitation lecture in Göttingen on June 10, 1854. He discussed geometry in arbitrary dimensions, although the ideas took time to spread.`,
          conclusion: `The date does not define a manifold. It marks a point when geometry began moving beyond one fixed Euclidean setting.`,
          solution: 'exact historicalEvidence',
          hints: ['The named evidence matches the goal.'],
        },
        {
          title: 'Mannigfaltigkeit',
          theoremName: 'manifold_name_origin',
          statement: '(termSignalsVariety : Prop) (h : termSignalsVariety) : termSignalsVariety',
          introduction: `# The name

Quanta notes that "manifold" comes from Riemann's German *Mannigfaltigkeit*, a word associated with variety or multiplicity. It suggests a space whose points can vary through one or more parameters.`,
          conclusion: `The name carries some history, but the definition in your text determines its precise meaning.`,
          solution: 'exact h',
          hints: ['Use the matching hypothesis.'],
        },
        {
          title: 'Measure from within',
          theoremName: 'manifold_intrinsic_geometry',
          statement: '(usesInternalMeasurements ignoresAmbientView : Prop) (hInternal : usesInternalMeasurements) (hAmbient : ignoresAmbientView) : usesInternalMeasurements ∧ ignoresAmbientView',
          introduction: `# Intrinsic geometry

Ada can ask intrinsic questions by measuring distances and angles along her surface. She does not need an outside observer or an embedding into a larger Euclidean space.`,
          conclusion: `Gauss developed this way of thinking about surfaces, and Riemann carried it into higher dimensions.`,
          solution: 'constructor\n· exact hInternal\n· exact hAmbient',
          hints: ['Package the two intrinsic features.'],
        },
        {
          title: 'Any finite dimension',
          theoremName: 'manifold_arbitrary_dimension',
          statement: '(dimensionChosen localCoordinatesMatch : Prop) (hDimension : dimensionChosen) (hCoordinates : localCoordinatesMatch) : dimensionChosen ∧ localCoordinatesMatch',
          introduction: `# Beyond visualization

We can picture dimensions one, two, and three, but the definition works in every finite dimension. An $n$-manifold needs $n$ local coordinates even when we cannot picture the space.`,
          conclusion: `Charts let us calculate in dimensions that we cannot draw.`,
          solution: 'constructor\n· exact hDimension\n· exact hCoordinates',
          hints: ['Use `constructor`.'],
        },
      ],
    ),
    makeWorld(
      'SmoothMaps',
      'Smooth maps',
      `# Add calculus to the atlas

A topological manifold lets us talk about continuity. A **smooth manifold** has an atlas whose transition maps are infinitely differentiable. This extra condition lets us do calculus without depending on one choice of coordinates.

This world is only a preview. The full subject needs multivariable calculus and careful definitions. Tu introduces smooth structures and maps early; Lee treats them in more detail.`,
      ['Riemann'],
      [
        {
          title: 'Compatible smooth charts',
          theoremName: 'manifold_smooth_charts',
          statement: '(chartsOverlap transitionsSmooth : Prop) (hOverlap : chartsOverlap) (hSmooth : transitionsSmooth) : chartsOverlap ∧ transitionsSmooth',
          introduction: `# Smooth stitching

Where two charts overlap, the transition function changes from one Euclidean coordinate system to the other. If these functions are smooth, derivatives computed in different charts agree.`,
          conclusion: `A smooth structure adds mathematical information to a topological manifold. It is not a property of how we draw the space.`,
          solution: 'constructor\n· exact hOverlap\n· exact hSmooth',
          hints: ['Prove both parts of the smooth compatibility package.'],
        },
        {
          title: 'Test a map in coordinates',
          theoremName: 'manifold_coordinate_test',
          statement: '(coordinateExpressionSmooth mapSmooth : Prop) (criterion : coordinateExpressionSmooth → mapSmooth) (hCoordinate : coordinateExpressionSmooth) : mapSmooth',
          introduction: `# Translate, calculate, translate back

To test a map between smooth manifolds, write it in local coordinates. The resulting map between Euclidean spaces should be smooth. The definition is arranged so that the answer does not depend on picking a lucky pair of charts.`,
          conclusion: `We use charts to perform familiar calculus, but smoothness is a property of the map itself.`,
          solution: 'apply criterion\nexact hCoordinate',
          hints: ['Apply `criterion` to reduce the goal.', 'Finish with `hCoordinate`.'],
        },
        {
          title: 'Composition stays smooth',
          theoremName: 'manifold_smooth_composition',
          statement: '(firstSmooth secondSmooth : Prop) (hFirst : firstSmooth) (hSecond : secondSmooth) : firstSmooth ∧ secondSmooth',
          introduction: `# Chain maps

The composition of two smooth maps is smooth. In coordinates, this follows from the multivariable chain rule. This exercise records the two smoothness facts that the full proof would use.`,
          conclusion: `Because composition stays smooth, smooth manifolds and smooth maps form a category.`,
          solution: 'constructor\n· exact hFirst\n· exact hSecond',
          hints: ['Package the two supplied smoothness facts.'],
        },
        {
          title: 'Smooth in both directions',
          theoremName: 'manifold_diffeomorphism',
          statement: '(forwardSmooth inverseSmooth : Prop) (hForward : forwardSmooth) (hInverse : inverseSmooth) : forwardSmooth ∧ inverseSmooth',
          introduction: `# Diffeomorphism

A diffeomorphism is a smooth bijection whose inverse is also smooth. It is the smooth version of a homeomorphism. Two diffeomorphic manifolds count as the same smooth shape.`,
          conclusion: `Different formulas and coordinates may still describe diffeomorphic manifolds.`,
          solution: 'constructor\n· exact hForward\n· exact hInverse',
          hints: ['Both directions are required.'],
        },
        {
          title: 'Local formulas, global map',
          theoremName: 'manifold_local_to_global_map',
          statement: '(localFormulasAgree coverWholeManifold : Prop) (hAgree : localFormulasAgree) (hCover : coverWholeManifold) : localFormulasAgree ∧ coverWholeManifold',
          introduction: `# Gluing

Suppose formulas are defined on separate chart domains and agree wherever the domains overlap. Under suitable conditions, we can glue them into one global object. This move appears often in geometry.`,
          conclusion: `Charts divide the work into local pieces. Agreement on overlaps puts those pieces back together.`,
          solution: 'constructor\n· exact hAgree\n· exact hCover',
          hints: ['Use `constructor`, then the two hypotheses.'],
        },
      ],
    ),
    makeWorld(
      'Tangent',
      'Tangent spaces',
      `# Every point gets a linear world

At each point of a smooth $n$-manifold, the tangent space is an $n$-dimensional vector space of possible instantaneous directions. Tangent vectors can be defined as velocities of curves or as derivations acting on smooth functions.

![Ada studies a tangent plane and a velocity](images/tangent-space.svg)

This is where linear algebra becomes part of the story.`,
      ['SmoothMaps'],
      [
        {
          title: 'Velocity at an instant',
          theoremName: 'manifold_curve_velocity',
          statement: '(curvePassesPoint velocityDefined : Prop) (hCurve : curvePassesPoint) (hVelocity : velocityDefined) : curvePassesPoint ∧ velocityDefined',
          introduction: `# A curve leaves a direction

A smooth curve through a point has a velocity at that point. Two different curves can represent the same tangent vector when they agree to first order there.`,
          conclusion: `A tangent vector records the motion at one instant, not the whole path.`,
          solution: 'constructor\n· exact hCurve\n· exact hVelocity',
          hints: ['Record both the point condition and velocity condition.'],
        },
        {
          title: 'The tangent line',
          theoremName: 'manifold_tangent_line',
          statement: '(oneDimensionalManifold oneDimensionalTangent : Prop) (hManifold : oneDimensionalManifold) (hTangent : oneDimensionalTangent) : oneDimensionalManifold ∧ oneDimensionalTangent',
          introduction: `# Circle at one point

At any point on a circle, the tangent space is a line. That line is not the circle. It is the linear space of directions available at that point.`,
          conclusion: `The circle is curved, but each tangent space is an ordinary vector space.`,
          solution: 'constructor\n· exact hManifold\n· exact hTangent',
          hints: ['Use both supplied facts.'],
        },
        {
          title: 'The tangent plane',
          theoremName: 'manifold_tangent_plane',
          statement: '(surfaceTwoDimensional tangentPlaneTwoDimensional : Prop) (hSurface : surfaceTwoDimensional) (hPlane : tangentPlaneTwoDimensional) : surfaceTwoDimensional ∧ tangentPlaneTwoDimensional',
          introduction: `# Sphere at Ada's feet

At a point on a smooth surface, the tangent directions form a plane. This explains why the ground feels flat to Ada even though the whole surface may curve.`,
          conclusion: `The tangent plane changes as Ada moves. The collection of all those planes is the tangent bundle.`,
          solution: 'constructor\n· exact hSurface\n· exact hPlane',
          hints: ['Package the surface and tangent-space dimensions.'],
        },
        {
          title: 'Push directions forward',
          theoremName: 'manifold_differential_pushes',
          statement: '(mapSmooth tangentVectorGiven : Prop) (hMap : mapSmooth) (hVector : tangentVectorGiven) : mapSmooth ∧ tangentVectorGiven',
          introduction: `# The differential

A smooth map gives a linear map between tangent spaces. This map is called the differential, or pushforward, and it tells us what happens to velocities.`,
          conclusion: `The familiar derivative becomes a map between tangent spaces that does not depend on coordinates.`,
          solution: 'constructor\n· exact hMap\n· exact hVector',
          hints: ['The differential needs a smooth map and a tangent input.'],
        },
        {
          title: 'A bundle of directions',
          theoremName: 'manifold_tangent_bundle',
          statement: '(everyPointHasTangent spacesVarySmoothly : Prop) (hEvery : everyPointHasTangent) (hSmoothly : spacesVarySmoothly) : everyPointHasTangent ∧ spacesVarySmoothly',
          introduction: `# Tangent bundle

Collect every tangent space while keeping track of the point to which each vector belongs. The result is itself a manifold called the tangent bundle $TM$. A vector field smoothly chooses one tangent vector at each point.`,
          conclusion: `Vector bundles generalize this idea of attaching a vector space to every point. They occur throughout geometry and physics.`,
          solution: 'constructor\n· exact hEvery\n· exact hSmoothly',
          hints: ['Use `constructor`.'],
        },
      ],
    ),
    makeWorld(
      'FormsMetrics',
      'Forms, metrics, and orientation',
      `# Measure directions and regions

Tangent vectors represent directions, while covectors assign numbers to tangent vectors. Differential forms extend this idea to quantities that we can integrate over curves, surfaces, and higher-dimensional regions.

A Riemannian metric puts an inner product on each tangent space. It gives us lengths, angles, areas, and geodesics. An orientation makes a consistent choice of positive direction for integration.`,
      ['Tangent'],
      [
        {
          title: 'A covector measures',
          theoremName: 'manifold_covector_measures',
          statement: '(tangentVectorAvailable covectorAvailable : Prop) (hVector : tangentVectorAvailable) (hCovector : covectorAvailable) : tangentVectorAvailable ∧ covectorAvailable',
          introduction: `# Linear measurement

A covector is a linear function that takes a tangent vector and returns a number. If a tangent vector is an arrow, a covector is a linear way to measure it.`,
          conclusion: `All covectors at a point form the cotangent space, which is dual to the tangent space.`,
          solution: 'constructor\n· exact hVector\n· exact hCovector',
          hints: ['Provide the vector and its measuring covector.'],
        },
        {
          title: 'One-forms along paths',
          theoremName: 'manifold_one_form_path',
          statement: '(oneFormGiven pathOriented : Prop) (hForm : oneFormGiven) (hPath : pathOriented) : oneFormGiven ∧ pathOriented',
          introduction: `# Integrate along a route

A differential one-form chooses a covector smoothly at every point. Integrating the form along an oriented path adds up those local measurements.`,
          conclusion: `One-forms provide an intrinsic way to write familiar line integrals.`,
          solution: 'constructor\n· exact hForm\n· exact hPath',
          hints: ['Both a form and an oriented path are recorded.'],
        },
        {
          title: 'Forms measure area',
          theoremName: 'manifold_two_form_area',
          statement: '(twoFormGiven surfaceOriented : Prop) (hForm : twoFormGiven) (hSurface : surfaceOriented) : twoFormGiven ∧ surfaceOriented',
          introduction: `# Higher-degree forms

A two-form can be integrated over an oriented surface. More generally, a $k$-form can be integrated over a $k$-dimensional region. Stokes' theorem relates an integral over a region to an integral over its boundary.`,
          conclusion: `Tu develops forms, integration, and de Rham theory. Milnor uses related tools to study topology.`,
          solution: 'constructor\n· exact hForm\n· exact hSurface',
          hints: ['Use `constructor`.'],
        },
        {
          title: 'A metric adds geometry',
          theoremName: 'manifold_metric_geometry',
          statement: '(lengthsDefined anglesDefined : Prop) (hLengths : lengthsDefined) (hAngles : anglesDefined) : lengthsDefined ∧ anglesDefined',
          introduction: `# Topology is not distance

A smooth manifold does not come with lengths or angles by default. A Riemannian metric adds an inner product to every tangent space, and those inner products vary smoothly with the point.`,
          conclusion: `After choosing a metric, we can define length, distance, angle, volume, geodesics, and curvature.`,
          solution: 'constructor\n· exact hLengths\n· exact hAngles',
          hints: ['Package the two metric consequences.'],
        },
        {
          title: 'The Möbius orientation test',
          theoremName: 'manifold_mobius_not_orientable',
          statement: '(mobiusOrientable : Prop) (twistObstruction : ¬ mobiusOrientable) : ¬ mobiusOrientable',
          introduction: `# Carry an arrow around the strip

Carry a local orientation once around the Möbius strip. When it returns, it points the other way. No choice of orientation works consistently over the whole strip, so the Möbius strip is non-orientable. It is still a smooth two-manifold **with boundary**.`,
          conclusion: `Every small patch can be oriented. The problem appears only when we try to make those choices agree around the full loop.`,
          solution: 'exact twistObstruction',
          hints: ['The obstruction hypothesis is exactly the negated goal.'],
        },
      ],
    ),
    makeWorld(
      'Curvature',
      'Curvature and what comes next',
      `# Local calculus meets global shape

Curvature measures how a geometry differs from flat Euclidean geometry. On a Riemannian manifold, it can be defined using the metric alone. Some theorems connect these local measurements with the topology of the whole space.

![Flat, spherical, and toroidal geometry](images/curvature-topology.svg)

This world gives you a first look at those connections. It does not try to squeeze a graduate course into five levels.`,
      ['FormsMetrics'],
      [
        {
          title: 'Curvature from within',
          theoremName: 'manifold_intrinsic_curvature',
          statement: '(metricChosen curvatureIntrinsic : Prop) (hMetric : metricChosen) (hCurvature : curvatureIntrinsic) : metricChosen ∧ curvatureIntrinsic',
          introduction: `# No outside bending required

The metric of a Riemannian manifold determines its intrinsic curvature. A cylinder and a plane sit differently in three-dimensional space, but both have zero Gaussian curvature away from any crease.`,
          conclusion: `Bending in the surrounding space and intrinsic curvature are different ideas.`,
          solution: 'constructor\n· exact hMetric\n· exact hCurvature',
          hints: ['Use both the metric and curvature facts.'],
        },
        {
          title: 'Triangles notice curvature',
          theoremName: 'manifold_triangle_curvature',
          statement: '(sphereTriangleExcess planeTriangleFlat : Prop) (hSphere : sphereTriangleExcess) (hPlane : planeTriangleFlat) : sphereTriangleExcess ∧ planeTriangleFlat',
          introduction: `# A navigational experiment

Some geodesic triangles on a unit sphere have angles that add up to more than $180^\\circ$. A triangle in the Euclidean plane has angle sum $180^\\circ$. Travelers can discover the difference without leaving either surface.`,
          conclusion: `An inhabitant can detect curvature by making measurements within the space.`,
          solution: 'constructor\n· exact hSphere\n· exact hPlane',
          hints: ['Record the spherical and planar observations.'],
        },
        {
          title: 'Holes are global',
          theoremName: 'manifold_torus_topology',
          statement: '(sphereHasNoHandle torusHasHandle : Prop) (hSphere : sphereHasNoHandle) (hTorus : torusHasHandle) : sphereHasNoHandle ∧ torusHasHandle',
          introduction: `# Same local dimension, different topology

The sphere and torus are both connected $2$-manifolds without boundary. The torus has a handle and essential loops that the sphere does not. A single local chart cannot reveal this difference.`,
          conclusion: `Topologists use invariants such as fundamental groups, homology, cohomology, and degree to tell spaces apart.`,
          solution: 'constructor\n· exact hSphere\n· exact hTorus',
          hints: ['Package the contrasting global facts.'],
        },
        {
          title: 'Local data, global theorem',
          theoremName: 'manifold_local_global_bridge',
          statement: '(localCalculus globalTopology : Prop) (hLocal : localCalculus) (hGlobal : globalTopology) : localCalculus ∧ globalTopology',
          introduction: `# From local calculations to global facts

Differential topology uses local smooth calculations to prove facts about an entire space. Milnor develops this approach through regular values, Sard's theorem, degree, orientation, and the Poincaré-Hopf theorem. Guillemin-Pollack continues with transversality and intersection theory.`,
          conclusion: `Local calculations can carry information about the topology of the whole manifold.`,
          solution: 'constructor\n· exact hLocal\n· exact hGlobal',
          hints: ['Combine the local and global ingredients.'],
        },
        {
          title: 'What to study next',
          theoremName: 'manifold_learning_route',
          statement: '(topologyReviewed calculusReady linearAlgebraReady : Prop) (hTopology : topologyReviewed) (hCalculus : calculusReady) (hLinear : linearAlgebraReady) : topologyReviewed ∧ calculusReady ∧ linearAlgebraReady',
          introduction: `# A route into the subject

If you want to continue on your own, this is a sensible route:

1. Review functions, basic proofs, sets, and point-set topology.
2. Study multivariable calculus and linear algebra if either subject is new to you.
3. Work through [Loring Tu](https://link.springer.com/book/10.1007/978-1-4419-7400-6), including the exercises.
4. Read [Milnor](https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf) once you know tangent spaces and smooth maps. You can also read it alongside those chapters in Tu.
5. Use [Lee](https://link.springer.com/book/10.1007/978-0-387-21752-9) as a broad reference, or choose [Guillemin-Pollack](https://bookstore.ams.org/CHEL/370.H) for differential topology.
6. Try [MIT 18.950](https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/) after multivariable calculus and linear algebra.

You do not have to feel completely ready before starting. Draw the examples, work out computations, and attempt the exercises.`,
          conclusion: `You now have a map of the subject. Topology gives us neighborhoods and global invariants. Charts supply coordinates, smoothness allows calculus, tangent spaces turn local motion into linear algebra, forms can be integrated, and metrics let us measure curvature. Ada still has plenty to explore.`,
          solution: 'constructor\n· exact hTopology\n· constructor\n  · exact hCalculus\n  · exact hLinear',
          hints: ['The goal is a nested three-part conjunction.', 'Use `constructor` twice.'],
        },
      ],
    ),
  ],
}

fs.writeFileSync(outputUrl, `${JSON.stringify(game, null, 2)}\n`)
console.log(`Wrote ${game.worlds.length} worlds and ${game.worlds.flatMap((world) => world.levels).length} levels to ${outputUrl.pathname}`)
