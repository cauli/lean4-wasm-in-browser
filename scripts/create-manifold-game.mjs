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
    commit: 'original-local-course-2026-07-28-v2',
    license: 'No separate course license specified',
    toolchain: 'local Lean WASM',
    importedAt: '2026-07-28T00:00:00.000Z',
  },
  title: 'The Manifold Adventure',
  introduction: `# Welcome, tiny geometer

Ada is an ant. She lives on a surface she has never seen from outside, and she never will. Everything she knows comes from measurements made at her own scale: the ground under her feet, the trail behind her, the loop that somehow brought her home.

Manifold theory works under the same restriction: it studies what an inhabitant of a space can define and measure without an outside view. The surprising answer, worked out from Riemann onward, is that this includes coordinates, calculus, and curvature.

Each level gives you one idea, one picture, and one small Lean proposition that the browser's Lean kernel checks on the spot. The Lean statements capture the logical shape of each lesson, meaning how the pieces of an argument fit together. They are not the full Mathlib definitions of topological or smooth manifolds, and the text points out the difference where it matters.

## Typing mathematical symbols

The Lean editor converts backslash commands into symbols: type the command, then press Space or Tab. Whenever a lesson introduces a symbol, the command appears beside it.

## Where the story comes from

- [Paulina Rowińska's Quanta explainer](https://www.quantamagazine.org/what-is-a-manifold-20251103/) inspired Ada's point of view and the lessons on charts, intrinsic geometry, Riemann, and the double pendulum.
- Edwin A. Abbott's 1884 [*Flatland*](https://www.gutenberg.org/ebooks/97) gives us the idea of imagining dimensions from inside them. We borrow that premise, not the book's Victorian social world.
- [Loring Tu's *An Introduction to Manifolds*](https://link.springer.com/book/10.1007/978-1-4419-7400-6) is the textbook to open the day you finish this game.
- [John Milnor's *Topology from the Differentiable Viewpoint*](https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf), [Guillemin–Pollack's *Differential Topology*](https://bookstore.ams.org/CHEL/370.H), and [John Lee's *Introduction to Smooth Manifolds*](https://link.springer.com/book/10.1007/978-0-387-21752-9) continue the topics the later worlds only outline.
- [MIT 18.950](https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/) has rigorous notes and problems on curvature, once you know multivariable calculus and linear algebra.

Start with **Ada in Flatland**. Spin the models, draw the shapes, and open a hint whenever you want one; hints are part of the course, not a penalty.`,
  information: `This local course is an introduction, not a replacement for a textbook.

After the game, read Tu, then Milnor. From there, choose Lee for a broad reference or Guillemin–Pollack for differential topology. MIT 18.950 is a free option once you know multivariable calculus and linear algebra.`,
  caption: 'Follow Ada the ant from Flatland to charts, tangent spaces, curvature, and the topology of a doughnut, with 3D models to spin and a Lean kernel checking every step in your browser.',
  coverImage: 'images/cover.svg',
  worlds: [
    makeWorld(
      'Flatland',
      'Ada in Flatland',
      `# The view from inside

Edwin A. Abbott's 1884 *Flatland* asked how a two-dimensional creature could ever reason about a third dimension. Ada inherits that predicament: **what can she learn about her world without leaving it?**

![Ada explores a locally flat world](images/flatland-ant.svg)

Before she can learn anything, she needs a language for evidence. That language is Lean, and this course runs on five moves. This world teaches all five, one short level each. None takes more than a minute, and every proof you write later is assembled from them.`,
      [],
      [
        {
          title: 'Evidence in hand',
          theoremName: 'manifold_proof_is_object',
          statement: '(groundIsNear : Prop) (evidence : groundIsNear) : groundIsNear',
          introduction: `# Ada's first fact

Ada's headlamp shows solid ground ahead. Can she *prove* it?

In Lean, a claim like \`groundIsNear\` is a type, and a proof is an object of that type: something you can hold and hand over. Ada holds \`evidence\`. The goal, written after \`⊢\`, is the very claim that \`evidence\` proves. So hand it over: \`exact evidence\`.`,
          conclusion: `Most proofs end like this: the goal matches something you already hold. Get in the habit of reading the hypotheses before trying anything else.`,
          solution: 'exact evidence',
          hints: ['Compare the type of `evidence` with the goal after `⊢`. They are identical.', 'Enter `exact evidence`.'],
          newTactics: ['exact'],
          newDefinitions: ['Prop'],
        },
        {
          title: 'The same spot',
          theoremName: 'manifold_same_place',
          statement: '(position : ℕ) : position = position',
          introduction: `# Equality for free

Ada drops a crumb, turns around twice, and checks: is this still the same spot? Lean's \`rfl\` tactic proves any goal of the form \`x = x\`, where the two sides are literally the same expression. The name is short for *reflexivity*.

The equals sign [=](https://en.wikipedia.org/wiki/Equals_sign) is already on your keyboard, so it does not need a backslash command. The natural-number symbol [ℕ](https://en.wikipedia.org/wiki/Natural_number) is typed as \`\\N\`, followed by Space or Tab.`,
          conclusion: `\`rfl\` looks too easy to matter. It comes back later with more weight: "leave through a chart and return to the same point" is an equation of exactly this shape.`,
          solution: 'rfl',
          hints: ['Both sides of `=` are the same expression.', 'Use `rfl`.'],
          newTactics: ['rfl'],
          newDefinitions: ['Eq'],
        },
        {
          title: 'Two clues at once',
          theoremName: 'manifold_two_local_clues',
          statement: '(looksFlat canWalk : Prop) (hFlat : looksFlat) (hWalk : canWalk) : looksFlat ∧ canWalk',
          introduction: `# Bundling observations

Ada notices two things: the ground nearby looks flat, **and** she can walk on it. The conjunction symbol [∧](https://en.wikipedia.org/wiki/Logical_conjunction) means "and"; type it as \`\\and\`, then Space or Tab.

To prove an "and", prove each half. The \`constructor\` tactic splits the goal into the two pieces, and you finish each one with what you hold.`,
          conclusion: `Definitions in this subject are usually bundles of requirements. "Manifold" will turn out to mean *locally Euclidean ∧ Hausdorff ∧ second countable*, and \`constructor\` is how such a bundle comes apart, one requirement at a time.`,
          solution: 'constructor\n· exact hFlat\n· exact hWalk',
          hints: ['`constructor` turns the `∧` goal into two goals.', 'Finish with `exact hFlat`, then `exact hWalk`.'],
          newTactics: ['constructor'],
          newDefinitions: ['And'],
        },
        {
          title: 'A fork in the trail',
          theoremName: 'manifold_one_route',
          statement: '(east west : Prop) (hEast : east) : east ∨ west',
          introduction: `# One route is enough

The trail forks. The disjunction symbol [∨](https://en.wikipedia.org/wiki/Logical_disjunction) means "or"; type it as \`\\or\`, then Space or Tab. To prove \`east ∨ west\` you only need one of the routes, and you must say which. Ada holds evidence for the east route, so commit with \`left\`, then present it.

(The \`right\` tactic picks the other branch. You will want it soon.)`,
          conclusion: `Proving an "or" means choosing a side. Atlases produce exactly this situation later: a point lies in one chart or another, and an argument has to say which one it will use.`,
          solution: 'left\nexact hEast',
          hints: ["Ada's evidence supports the left branch.", 'Use `left`, then `exact hEast`.'],
          newTactics: ['left', 'right'],
          newDefinitions: ['Or'],
        },
        {
          title: 'What if',
          theoremName: 'manifold_local_implication',
          statement: '(looksLikeLine : Prop) : looksLikeLine → looksLikeLine',
          introduction: `# Assume, then reason

The arrow [→](https://en.wikipedia.org/wiki/Material_conditional) in \`A → B\` promises: give me evidence for \`A\`, and I return evidence for \`B\`. Type it as \`\\to\`, then Space or Tab.

To prove an implication, step *into* the assumption: \`intro h\` takes the input and hands it to you as a hypothesis named \`h\`. Here, what you receive is exactly what you must produce.

Always give the hypothesis a name. A bare \`intro\` files it under an inaccessible placeholder, shown as \`a✝\`, that no tactic can refer to afterwards.`,
          conclusion: `That completes the toolkit: \`exact\`, \`rfl\`, \`constructor\`, \`left\`/\`right\`, \`intro\`. The remaining worlds add only two more tactics (\`apply\` and \`cases\`) and spend the rest of their attention on geometry.`,
          solution: 'intro h\nexact h',
          hints: ['Start with `intro h` to assume the input.', 'The new hypothesis is exactly the goal: `exact h`.'],
          newTactics: ['intro'],
        },
      ],
    ),
    makeWorld(
      'LocalTest',
      'The local test',
      `# Zoom in far enough and everything looks boring

A circle drawn on paper looks nothing like a straight line. But Ada, standing *on* a vast circle, sees exactly what she would see on a line: one direction forward, one direction back. Zoom in far enough, and the curve is indistinguishable from a straight interval.

That is the defining test of a manifold: **every point must have a neighborhood that looks like an open piece of $\\mathbb{R}^n$**. The real-number symbol [ℝ](https://en.wikipedia.org/wiki/Real_number) is typed as \`\\R\`, then Space or Tab.

"Looks like" has a precise meaning, and it never mentions distance: there must be a continuous relabeling in both directions, a *homeomorphism*. Topology only tracks which points are near which; distances come later, as extra structure.

(The textbook definition adds two housekeeping conditions, *Hausdorff* and *second countable*, which exclude certain pathological gluings. Tu states them precisely; this course mentions them and moves on.)

A space that passes the test at every point is a manifold. One failing point is enough to disqualify it, and this world ends with a famous example.`,
      ['Flatland'],
      [
        {
          title: 'A trail to the food',
          theoremName: 'manifold_continuous_trail',
          statement: '(trailContinuous reachesFood : Prop) (bridge : trailContinuous → reachesFood) (hTrail : trailContinuous) : reachesFood',
          introduction: `# Reasoning backwards

Informally, a continuous trail is one with no gaps and no jumps. Ada knows her trail is continuous, and she knows a rule: *continuous trails reach the food*.

The \`apply\` tactic uses a rule backwards. The goal is \`reachesFood\`; \`apply bridge\` says "by the rule, it suffices to show the trail is continuous", and that becomes your new goal.`,
          conclusion: `\`apply\` is the tactic of "it suffices to show". Working backwards from the goal is normal mathematical practice, and Lean keeps track of exactly what remains to be shown.`,
          solution: 'apply bridge\nexact hTrail',
          hints: ['`apply bridge` replaces the goal with what the rule needs.', 'Finish with `exact hTrail`.'],
          newTactics: ['apply'],
        },
        {
          title: 'Trails chain together',
          theoremName: 'manifold_trails_compose',
          statement: '(campReached streamReached nestReached : Prop) (walkToStream : campReached → streamReached) (walkToNest : streamReached → nestReached) : campReached → nestReached',
          introduction: `# Composing trails

One continuous trail leads from camp to stream; another from stream to nest. Gluing them end to end gives a continuous trail from camp to nest: the composition of continuous maps is continuous.

Prove it the way you would walk it. Name your starting point with \`intro hCamp\`, then \`apply\` the legs of the journey backwards: to reach the nest it suffices to reach the stream, and to reach the stream it suffices to start at camp.`,
          conclusion: `You will compose maps constantly from here on: charts with inverse charts, smooth maps with smooth maps. The chain rule, when it appears, is a statement about exactly this operation.`,
          solution: 'intro hCamp\napply walkToNest\napply walkToStream\nexact hCamp',
          hints: ['Begin with `intro hCamp`.', 'Work backwards: `apply walkToNest`, then `apply walkToStream`.', 'The final goal is `campReached`, which is `hCamp`.'],
        },
        {
          title: 'Locally a line, globally a loop',
          theoremName: 'manifold_circle_local_line',
          statement: '(looksLikeLineNearby closesIntoLoop : Prop) (hNear : looksLikeLineNearby) (hLoop : closesIntoLoop) : looksLikeLineNearby ∧ closesIntoLoop',
          introduction: `# Same nearby, different overall

Every point of the circle passes the local test: a short arc, relabeled by one coordinate, is an interval of $\\mathbb{R}$. And yet the circle is not a line: walk far enough in one direction and you return to your starting point, which no line permits.

Both facts are true at once. Record them together.`,
          conclusion: `The circle agrees with the line locally and disagrees with it globally. Much of this course examines that kind of disagreement; the sphere, the torus, and the Möbius band all show versions of it.`,
          solution: 'constructor\n· exact hNear\n· exact hLoop',
          hints: ['`constructor` splits the two claims.', 'Each half is a hypothesis you hold.'],
        },
        {
          title: 'The crossing that fails',
          theoremName: 'manifold_figure_eight_crossing',
          statement: '(crossingLooksLikeLine : Prop) (fourArms : ¬ crossingLooksLikeLine) (hopeful : crossingLooksLikeLine) : False',
          introduction: `# One bad point spoils a space

Trace a figure eight and stand at the crossing, marked red on the model. Remove that single point and its neighborhood falls into four arms; remove a point from an open interval and only two pieces remain. Four is not two, and the number of pieces survives any continuous relabeling, so no neighborhood of the crossing is homeomorphic to an interval. Every other point of the figure eight passes the test; this one failure disqualifies the whole curve.

In Lean, the negation symbol [¬](https://en.wikipedia.org/wiki/Negation) (typed \`\\not\`, then Space or Tab) is defined as an implication: \`¬ A\` *is* \`A → False\`. So the hypothesis \`fourArms\` is a function that turns evidence for \`crossingLooksLikeLine\` into \`False\`. Apply it to the evidence you have.`,
          conclusion: `In Lean, refuting a claim means building a function into \`False\`, and applying \`fourArms\` to \`hopeful\` is the usual proof by contradiction in that form. When you test whether a space is a manifold, check crossings, endpoints, seams, and corners first.`,
          solution: 'exact fourArms hopeful',
          hints: ['`¬ A` means `A → False`, so `fourArms` is a function.', 'Apply it to the evidence: `exact fourArms hopeful`.'],
          newDefinitions: ['Not', 'False'],
        },
      ],
    ),
    makeWorld(
      'Charts',
      'Charts and atlases',
      `# Coordinates are local tools

You cannot flatten a globe onto one page without distortion. Cartographers solved this long ago: an atlas of Earth uses many pages, each accurate for one region, with margins explaining how neighboring pages fit together.

![Overlapping charts turn patches into coordinates](images/charts-atlas.svg)

Mathematics borrows the whole metaphor, names included. A **chart** is one page: a homeomorphism from an open patch of the manifold to an open subset of Euclidean space. An **atlas** is enough charts to cover every point. Where two pages overlap, the **transition map** (out through one chart, back through the other) must itself be continuous. That consistency requirement lets purely local coordinates describe one coherent space.`,
      ['LocalTest'],
      [
        {
          title: 'A page of the atlas',
          theoremName: 'manifold_chart_two_sides',
          statement: '(patchOpen coordinatesOpen : Prop) (hPatch : patchOpen) (hCoordinates : coordinatesOpen) : patchOpen ∧ coordinatesOpen',
          introduction: `# A chart has two sides

A chart identifies a patch of Ada's world with a region of coordinate space, and both sides must be open sets. Openness keeps "nearby" meaningful on each side of the identification: no point of the patch sits on an edge where the relabeling breaks down.`,
          conclusion: `Coordinates belong to a chart, never to the manifold. Asking "what are the coordinates of this point?" without naming a chart is like asking "what page is Portugal on?" without naming the atlas.`,
          solution: 'constructor\n· exact hPatch\n· exact hCoordinates',
          hints: ['Split the conjunction with `constructor`.'],
        },
        {
          title: 'There and back',
          theoremName: 'manifold_chart_round_trip',
          statement: '(onSphere inCoordinates : Prop) (chart : onSphere → inCoordinates) (chartInv : inCoordinates → onSphere) (ada : onSphere) : onSphere',
          introduction: `# The round trip

A chart is invertible by definition: \`chart\` carries Ada into coordinates, \`chartInv\` brings her home. Send her on the round trip: apply \`chart\` to \`ada\`, then \`chartInv\` to the result. Function applications nest, so read \`chartInv (chart ada)\` from the inside out.

One caveat: our proposition only records that the round trip lands somewhere on the sphere. The full definition demands that it land on the *same point*, an equation of the \`rfl\` shape you met in Flatland.`,
          conclusion: `You composed two maps by hand. The full definition requires this round trip to return every point of the patch unchanged, and that requirement is what makes coordinate computations trustworthy.`,
          solution: 'exact chartInv (chart ada)',
          hints: ['First `chart ada` gives a coordinate point.', 'Then wrap it: `exact chartInv (chart ada)`.'],
        },
        {
          title: 'Whichever page you are on',
          theoremName: 'manifold_sphere_chart_cover',
          statement: '(inNorthPage inSouthPage located : Prop) (fromNorth : inNorthPage → located) (fromSouth : inSouthPage → located) (covered : inNorthPage ∨ inSouthPage) : located',
          introduction: `# Using a cover

Two stereographic projections chart the sphere: one from the north pole (it misses only the north pole itself), one from the south. Every point of the sphere lies on at least one page. The model shows the two pages as amber and teal caps; note the band where they overlap.

To use the covering, split into cases with the \`cases\` tactic: if Ada is on the north page, locate her there; if on the south page, locate her there. Either way, she is located.`,
          conclusion: `An atlas is used through case analysis: a global argument picks whichever chart covers the point at hand and computes there. \`cases\` is the Lean form of that step.`,
          solution: 'cases covered with\n| inl h => exact fromNorth h\n| inr h => exact fromSouth h',
          hints: ['Start with `cases covered with`.', 'Handle each branch: `| inl h => exact fromNorth h` and `| inr h => exact fromSouth h`.'],
          newTactics: ['cases'],
        },
        {
          title: 'Where pages overlap',
          theoremName: 'manifold_chart_compatibility',
          statement: '(overlapDefined transitionContinuous : Prop) (hOverlap : overlapDefined) (hTransition : transitionContinuous) : overlapDefined ∧ transitionContinuous',
          introduction: `# The seam condition

Where two charts overlap, compose one chart's inverse with the other chart: the result translates between two coordinate systems for the same ground. For a topological atlas this transition map must be continuous, so that a calculation begun on one page survives the move to the neighboring page.`,
          conclusion: `Remember the seams. Changing one word in this condition, *continuous* to *smooth*, is the entire definition of a smooth manifold; it arrives two worlds from now.`,
          solution: 'constructor\n· exact hOverlap\n· exact hTransition',
          hints: ['`constructor`, then the two seam facts.'],
        },
      ],
    ),
    makeWorld(
      'Cabinet',
      'A cabinet of shapes',
      `# Four recurring shapes

![A circle, sphere, torus, and Möbius strip](images/manifold-objects.svg)

Four shapes recur through the rest of the course, and each breaks a different plausible assumption. The sphere and the torus are locally identical but globally different. The Möbius band has an edge, and a twist that defeats any consistent notion of "clockwise". A knotted circle shows that what a space is and how it sits inside another space are separate questions.

Every level in this world has a model you can spin and zoom. Each was built for the argument on its page.`,
      ['Charts'],
      [
        {
          title: 'The globe beneath Ada',
          theoremName: 'manifold_sphere_surface',
          statement: '(locallyPlaneLike globallyClosed : Prop) (hLocal : locallyPlaneLike) (hGlobal : globallyClosed) : locallyPlaneLike ∧ globallyClosed',
          introduction: `# The two-sphere

The sphere $S^2$ means the *surface*: the soap film, not the solid ball inside it. It is a two-manifold, since every patch under Ada's feet relabels as a piece of the plane. (This is also why a flat Earth stayed believable for so long.) As a whole, though, the surface closes on itself: it has finite area and no edge.`,
          conclusion: `When a geometer says "sphere", read "surface" unless told otherwise. The solid ball is a different object, a three-dimensional manifold with boundary.`,
          solution: 'constructor\n· exact hLocal\n· exact hGlobal',
          hints: ['`constructor`, then the local and global facts in order.'],
        },
        {
          title: 'The torus is two circles',
          theoremName: 'manifold_torus_surface',
          statement: '(aroundTheTube aroundTheHole : Prop) (hTube : aroundTheTube) (hHole : aroundTheHole) : aroundTheTube ∧ aroundTheHole',
          introduction: `# Circle × circle

The model highlights two loops on the torus: coral around the tube, magenta around the central hole. Neither can be shrunk to a point without leaving the surface. A torus is the Cartesian product of two circles, $T^2 = S^1 \\times S^1$, where [×](https://en.wikipedia.org/wiki/Cartesian_product) (typed \`\\times\`, then Space or Tab) pairs the spaces: one angle says where around the tube, a second says where around the hole.

This has a practical reading. A double pendulum, an arm swinging on the end of an arm, has a state given by two angles, and a pair of angles is a point on a torus. The pendulum's configuration space is this doughnut; as the pendulum swings, its state traces a path on the surface.`,
          conclusion: `A manifold need not describe a physical place; it can describe the possible states of a system. Mechanics and robotics use such configuration spaces routinely.`,
          solution: 'constructor\n· exact hTube\n· exact hHole',
          hints: ['Two loops, two hypotheses, one `constructor`.'],
        },
        {
          title: 'The twisted band',
          theoremName: 'manifold_mobius_band',
          statement: '(hasOneBoundaryCurve orientable : Prop) (hEdge : hasOneBoundaryCurve) (mirror : orientable → False) : hasOneBoundaryCurve ∧ ¬ orientable',
          introduction: `# A band with a half twist

Glue a paper strip end to end with a half twist. The result misbehaves in two separate ways.

First, run a finger along the edge: you pass along every part of it and return to where you started. The band has one boundary curve, not two. Because of that edge, the Möbius strip is a **two-manifold with boundary**: interior points have disk neighborhoods, edge points have half-disk neighborhoods. Having a boundary is not a defect; it is a category with its own local test.

Second, watch the model's arrows. Suppose you chose a consistent "up" across the whole band. Carried once around, the choice returns reversed; that is the hypothesis \`mirror\`. In the last world you used a negation; here you prove one. Since \`¬ orientable\` is \`orientable → False\`, prove it like any implication: after \`constructor\`, name the supposed orientation with \`intro hOrient\` and hand it to \`mirror\`.

Note the fine print: every small patch of the band is orientable. The problem only appears when the choices are carried around the full loop.`,
          conclusion: `Orientability is your second example of a purely global property; the circle's loop was the first. You have now used a negation (the figure eight) and proved one (here).`,
          solution: 'constructor\n· exact hEdge\n· intro hOrient\n  exact mirror hOrient',
          hints: ['`constructor` splits the goal. The second half is `¬ orientable`, i.e. `orientable → False`.', 'Prove the negation like an implication: `intro hOrient`, then `exact mirror hOrient`.'],
        },
        {
          title: 'The knot is in the embedding',
          theoremName: 'manifold_intrinsic_loop',
          statement: '(sameIntrinsicCircle differentEmbedding : Prop) (hCircle : sameIntrinsicCircle) (hEmbedding : differentEmbedding) : sameIntrinsicCircle ∧ differentEmbedding',
          introduction: `# What it is vs. how it sits

The model shows two closed tubes, a plain ring and a trefoil knot. An ant walking either one has the same experience: one direction forward, one direction back, and eventually the starting point again. Intrinsically both are the same one-manifold, the circle.

The knotting is real, but it is a property of the *embedding*, the way the circle sits inside three-dimensional space, not of the circle itself. Ada, who never leaves her tube, cannot even state the question of whether her world is knotted.`,
          conclusion: `Keep the intrinsic/extrinsic distinction close; the next world depends on it. Riemann's program was to do geometry using only intrinsic data.`,
          solution: 'constructor\n· exact hCircle\n· exact hEmbedding',
          hints: ['Both claims are hypotheses; bundle them.'],
        },
      ],
    ),
    makeWorld(
      'Smooth',
      'Smooth worlds, tangent spaces',
      `# Riemann, and calculus on curved spaces

In June 1854, in Göttingen, Bernhard Riemann gave the habilitation lecture this subject descends from. His proposal: stop treating space as a fixed stage for figures, and study each space as an object in its own right, a *Mannigfaltigkeit* ("manifold"), of any finite dimension, measured from within. The lecture was published only after his death, and it took decades of work by later mathematicians to become the chart-based definitions you are using now.

Riemann's program needs calculus on curved spaces, and the modern recipe changes one word in the atlas condition: every transition map must be not merely continuous but *infinitely differentiable*. With smooth seams, a derivative computed on one page agrees with the neighboring page's answer, so calculus stops depending on which chart you opened. An atlas with this property is a **smooth structure**, and a space carrying one is a **smooth manifold**.

Once you can differentiate, each point acquires a linear approximation: the velocities of curves through a point $p$ form an $n$-dimensional vector space, the **tangent space** at $p$.

![Ada studies a tangent plane and a velocity](images/tangent-space.svg)

This is where linear algebra enters geometry.`,
      ['Cabinet'],
      [
        {
          title: 'Smooth seams',
          theoremName: 'manifold_smooth_charts',
          statement: '(chartsOverlap transitionsSmooth : Prop) (hOverlap : chartsOverlap) (hSmooth : transitionsSmooth) : chartsOverlap ∧ transitionsSmooth',
          introduction: `# A condition on overlaps

A smooth structure is an atlas whose transition maps are infinitely differentiable; that is the entire definition. No chart is special. Smoothness is not a property of any single page but a compatibility condition between pages, checked on their overlaps.`,
          conclusion: `Smoothness is extra information, not something you can read off from the topology. Choosing a smooth atlas equips the space for calculus; choosing a metric, later, will equip it for measurement.`,
          solution: 'constructor\n· exact hOverlap\n· exact hSmooth',
          hints: ['`constructor`, then both halves of the pact.'],
        },
        {
          title: 'Smoothness survives composition',
          theoremName: 'manifold_smooth_composition',
          statement: '(fSmooth gSmooth compositeSmooth : Prop) (chainRule : fSmooth → gSmooth → compositeSmooth) (hf : fSmooth) (hg : gSmooth) : compositeSmooth',
          introduction: `# The chain rule

Follow a smooth map with another smooth map: the composite is smooth, and in coordinates the proof is the multivariable chain rule.

The hypothesis \`chainRule\` takes two inputs, smoothness of each map, and returns smoothness of the composite. Apply a function to two arguments by listing them in order: \`chainRule hf hg\`.`,
          conclusion: `Because smoothness survives composition, smooth manifolds and smooth maps form a category: composing two maps in the class never leaves the class.`,
          solution: 'exact chainRule hf hg',
          hints: ['`chainRule` wants two arguments, in order.', 'Enter `exact chainRule hf hg`.'],
        },
        {
          title: 'The tangent plane',
          theoremName: 'manifold_tangent_plane',
          statement: '(surfaceTwoDimensional tangentPlaneTwoDimensional : Prop) (hSurface : surfaceTwoDimensional) (hPlane : tangentPlaneTwoDimensional) : surfaceTwoDimensional ∧ tangentPlaneTwoDimensional',
          introduction: `# Why the ground feels flat

Stand Ada anywhere on the sphere and collect every velocity she could have at that instant, every direction at every speed. Together they form a plane: the tangent plane at her point, shown in the model as a sheet of glass. It is written $T_p M$, read "the tangent space to $M$ at $p$".

The tangent space always matches the manifold's dimension: a curve gets tangent lines, a surface gets tangent planes, an $n$-manifold gets a copy of $\\mathbb{R}^n$. It is the linear space Ada mistakes for her world when she only looks near her feet.`,
          conclusion: `The tangent plane changes from point to point. The collection of all of them, with the right bookkeeping, is itself a manifold, the *tangent bundle*, where vector fields and flows are defined. This course goes no further in that direction; Tu and Lee both do.`,
          solution: 'constructor\n· exact hSurface\n· exact hPlane',
          hints: ['Surface dimension and tangent dimension: two facts, one `constructor`.'],
        },
        {
          title: 'Velocities push forward',
          theoremName: 'manifold_differential_pushes',
          statement: '(velocityHere velocityThere : Prop) (differential : velocityHere → velocityThere) (v : velocityHere) : velocityThere',
          introduction: `# The differential

A smooth map from Ada's world into another manifold carries her curves along, and with them each curve's velocity. The induced map between tangent spaces is the **differential** (also called the pushforward) of the map at that point, and it is linear.

You hold a velocity \`v\` at Ada's point. Push it forward.`,
          conclusion: `From now on, "derivative" means this: at each point, a linear map between tangent spaces, defined without coordinates. In any pair of charts it becomes the familiar matrix of partial derivatives.`,
          solution: 'apply differential\nexact v',
          hints: ['`apply differential` asks you for a velocity here.', 'You hold one: `exact v`.'],
        },
      ],
    ),
    makeWorld(
      'Curvature',
      'Curvature from within',
      `# Geometry measured from inside

A smooth manifold still has no distances; smoothness lets you differentiate, not measure. A **Riemannian metric** supplies the missing structure: an inner product on each tangent space, varying smoothly from point to point. From it, one defines lengths, angles, areas, straightest-possible paths (*geodesics*), and curvature.

![Flat, spherical, and toroidal geometry](images/curvature-topology.svg)

Gauss proved the surprising part: curvature is *intrinsic*. An inhabitant can measure it with surveying tools, without leaving the surface and without assuming an outside exists. Gauss named the result the Theorema Egregium, the "remarkable theorem", and Riemann extended it to every dimension.

This world is a first look, not a course. Differential forms, the objects one integrates over curves and surfaces and the setting for Stokes' theorem, need more room than a game level; Tu covers them properly. Here we take what fits: the metric, triangles, holes, and one theorem connecting local measurements to global shape.`,
      ['Smooth'],
      [
        {
          title: 'A metric adds geometry',
          theoremName: 'manifold_metric_geometry',
          statement: '(lengthsDefined anglesDefined : Prop) (hLengths : lengthsDefined) (hAngles : anglesDefined) : lengthsDefined ∧ anglesDefined',
          introduction: `# Topology is not geometry

To a topologist, the mug and the doughnut are the same. Add a metric and they stop being the same: with an inner product on every tangent space, curves acquire lengths, crossings acquire angles, and the two shapes become measurably different.

One smooth manifold admits many metrics. A marble-sized sphere and an Earth-sized one are the same manifold with different metrics.`,
          conclusion: `The hierarchy so far: topology says what is near, smoothness lets you differentiate, a metric lets you measure. Each layer is a separate choice added to the one below.`,
          solution: 'constructor\n· exact hLengths\n· exact hAngles',
          hints: ['Lengths and angles: `constructor`, then both.'],
        },
        {
          title: 'Triangles detect curvature',
          theoremName: 'manifold_triangle_curvature',
          statement: '(sphereTriangleExcess planeTriangleFlat : Prop) (hSphere : sphereTriangleExcess) (hPlane : planeTriangleFlat) : sphereTriangleExcess ∧ planeTriangleFlat',
          introduction: `# Surveying from inside

Walk the triangle on the model: down a meridian from the pole, along the equator, back up to the pole. Every turn is a right angle, so the angles sum to

$$90^\\circ + 90^\\circ + 90^\\circ = 270^\\circ,$$

a full $90^\\circ$ more than the $180^\\circ$ that every flat triangle carries.

No aerial view is needed: an inhabitant with a protractor detects the sphere's curvature by walking, which is Gauss's Theorema Egregium in action. An angle sum above $180^\\circ$ indicates positive curvature, as on the sphere; below $180^\\circ$, negative curvature, as on a saddle; exactly $180^\\circ$, a flat region.`,
          conclusion: `Curvature here does not mean bending visible from outside. A rolled sheet of paper is bent in space but intrinsically flat, and triangles drawn on it still sum to $180^\\circ$; the triangle test measures the intrinsic kind.`,
          solution: 'constructor\n· exact hSphere\n· exact hPlane',
          hints: ['Record the spherical and the flat observation.'],
        },
        {
          title: 'Holes are global facts',
          theoremName: 'manifold_torus_topology',
          statement: '(sphereHasNoHandle torusHasHandle : Prop) (hSphere : sphereHasNoHandle) (hTorus : torusHasHandle) : sphereHasNoHandle ∧ torusHasHandle',
          introduction: `# What no chart can see

The sphere and the torus are both closed surfaces, and chart by chart they are indistinguishable: every page of either atlas is a disk. The difference is global. The torus carries loops that cannot be shrunk to a point, and no inspection of a single chart can detect them.

Local geometry nevertheless records the difference. The Gauss–Bonnet theorem says that for any closed surface $M$ the total curvature is a topological constant:

$$\\int_M K \\, dA = 2\\pi \\, \\chi(M),$$

where the *Euler characteristic* $\\chi$ counts holes: $\\chi = 2$ for the sphere, giving total curvature $4\\pi$, and $\\chi = 0$ for the torus, giving exactly zero for every metric. Summed over the whole surface, local measurements determine the global shape.`,
          conclusion: `Local data, assembled over the whole space, detecting global structure: differential topology is built from arguments of this kind. Milnor's book is the classic introduction; Guillemin–Pollack continues it.`,
          solution: 'constructor\n· exact hSphere\n· exact hTorus',
          hints: ['Two global facts, one `constructor`.'],
        },
        {
          title: 'Choose your next world',
          theoremName: 'manifold_learning_route',
          statement: '(topologyReviewed calculusReady linearAlgebraReady : Prop) (hTopology : topologyReviewed) (hCalculus : calculusReady) (hLinear : linearAlgebraReady) : topologyReviewed ∧ calculusReady ∧ linearAlgebraReady',
          introduction: `# Where to go next

This course ends here; the subject continues. A sensible route onward:

1. Review sets, functions, and point-set topology, then work through [Loring Tu](https://link.springer.com/book/10.1007/978-1-4419-7400-6), exercises included.
2. Read [Milnor](https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf) once you know tangent spaces and smooth maps; it pairs well with those chapters of Tu.
3. Keep [Lee](https://link.springer.com/book/10.1007/978-0-387-21752-9) as the broad reference, or take [Guillemin–Pollack](https://bookstore.ams.org/CHEL/370.H) for differential topology.
4. Try [MIT 18.950](https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/) after multivariable calculus and linear algebra.

One last proof: the goal nests as \`A ∧ (B ∧ C)\`, so it wants \`constructor\` twice. You have known how to do this since Flatland.`,
          conclusion: `The course kept one restriction from start to finish: every construction used only what an inhabitant of the space could observe. That was enough for neighborhoods, charts, derivatives, and curvature. Ada never left her world, and nothing in these six worlds required her to.`,
          solution: 'constructor\n· exact hTopology\n· constructor\n  · exact hCalculus\n  · exact hLinear',
          hints: ['The goal is `topologyReviewed ∧ (calculusReady ∧ linearAlgebraReady)`.', '`constructor`, close the first goal, then `constructor` again.'],
        },
      ],
    ),
  ],
}

fs.writeFileSync(outputUrl, `${JSON.stringify(game, null, 2)}\n`)
console.log(`Wrote ${game.worlds.length} worlds and ${game.worlds.flatMap((world) => world.levels).length} levels to ${outputUrl.pathname}`)
