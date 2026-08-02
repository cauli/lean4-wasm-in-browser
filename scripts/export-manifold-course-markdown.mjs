#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const coursePath = path.join(repoRoot, 'src/game/manifolds.generated.json')
const conformancePath = path.join(repoRoot, 'src/game/manifolds.conformance.json')
const outputPath = path.resolve(
  repoRoot,
  process.argv[2] || 'docs/manifold-adventure-course.md',
)

const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'))
const conformance = JSON.parse(fs.readFileSync(conformancePath, 'utf8'))
const exactVerified = new Set(
  conformance.sourceCommit === course.source.commit
    ? conformance.verifiedReferenceSolutions
    : [],
)

const models = {
  'sphere-charts': {
    label: 'Sphere with two charts',
    caption: 'Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates.',
  },
  'torus-loops': {
    label: 'Torus with its two loops',
    caption: 'Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface.',
  },
  'mobius-band': {
    label: 'Möbius band',
    caption: 'Ada carries an arrow once around the band and finds it flipped on her return. There is no consistent choice of "up" across the whole surface.',
    outlook: true,
  },
  'trefoil-circle': {
    label: 'Circle and trefoil embeddings',
    caption: 'From inside either tube, Ada experiences the same one-manifold: a circle. The knot belongs to the way one circle sits in three-dimensional space.',
    outlook: true,
  },
  'sphere-triangle': {
    label: 'A triangle with three right angles',
    caption: 'Ada walks three geodesic edges and turns through a right angle at every corner. The 270° angle total reveals curvature from within the sphere.',
    outlook: true,
  },
  'figure-eight': {
    label: 'Figure-eight crossing',
    caption: 'Ada tests the red crossing as a possible point on a one-manifold. Removing it leaves four nearby arms instead of the two she would find on an interval.',
    outlook: true,
  },
  'tangent-plane': {
    label: 'Tangent plane at a point',
    caption: 'The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear.',
  },
  'robot-arm': {
    label: 'Two-joint robot arm',
    caption: 'The orange and teal links turn at two circular joints. Their joint state determines the red tip position on the work plane.',
  },
}

const modelByLevel = {
  'localcharts-4': 'sphere-charts',
  'chartedspaces-5': 'sphere-charts',
  'canonicalcharts-4': 'torus-loops',
  'canonicalcharts-5': 'torus-loops',
  'tangentspaces-1': 'tangent-plane',
  'tangentspaces-2': 'tangent-plane',
  'mapprojections-1': 'sphere-charts',
  'mapprojections-5': 'sphere-charts',
  'robotarm-1': 'robot-arm',
  'robotarm-3': 'robot-arm',
  'robotarm-4': 'robot-arm',
}

const captionByLevel = {
  'localcharts-4': 'A chart can take a point to its drawing and back only inside the colored patch where that chart is valid. Highlight state: the amber chart.',
  'chartedspaces-5': 'The amber and teal chart sources overlap and together cover the sphere, just as an atlas covers a surface with local maps. Highlight state: both charts.',
  'canonicalcharts-4': "The two highlighted loops picture Ada's two circle readings. A product chart combines one local chart from each factor. Highlight state: both loops.",
  'canonicalcharts-5': 'The paired position belongs to the surface described by those two readings. Highlight state: the torus surface.',
  'tangentspaces-1': "The attached plane pictures the tangent space at Ada's chosen place. Standing still is its zero vector. Highlight state: Ada and the tangent plane, with no velocity arrow.",
  'tangentspaces-2': 'A tangent-bundle point keeps the location on the surface together with a velocity from the tangent space attached there. Highlight state: Ada, the plane, and one velocity arrow.',
  'mapprojections-1': 'A stereographic chart draws every point except its chosen pole. The missing point is the price of flattening the sphere onto one leaf. Highlight state: the first chart.',
  'mapprojections-5': 'Each colored chart misses one pole. Because the poles differ, the two chart sources cover the whole sphere. Highlight state: both charts.',
  'robotarm-1': 'The orange displacement ends at the elbow. Adding the teal displacement places the red tip on the work plane. Highlight state: both links and the tip.',
  'robotarm-3': 'Turning the shoulder through a full revolution changes the angle but not either link direction, so the tip returns to the same point. Highlight state: the shoulder arc and arm.',
  'robotarm-4': 'Small changes at either circular joint produce small changes at the tip. Highlight state: both joint arcs, both links, and the tip.',
}

function demoteHeadings(markdown, depth) {
  return markdown.replace(/^(#{1,6}) /gm, (_, hashes) => (
    `${'#'.repeat(Math.min(6, hashes.length + depth))} `
  ))
}

function codeBlock(language, contents) {
  return `\`\`\`${language}\n${contents}\n\`\`\``
}

function inlineInventory(values) {
  return values.length > 0
    ? values.map((value) => `\`${value}\``).join(', ')
    : '_None_'
}

function modelPath(model) {
  return `../public/game-assets/manifolds/models/${model}.glb`
}

function modelCallout(model, context, caption) {
  const info = models[model]
  return [
    `> **3D MODEL: ${info.label}**`,
    '>',
    `> ${context} ${caption ?? info.caption}`,
    '>',
    `> Asset: [\`${model}.glb\`](${modelPath(model)})`,
  ].join('\n')
}

const levels = course.worlds.flatMap((world) => world.levels)
const lines = [
  '# Manifold Adventure: complete course review',
  '',
  '> This is a reviewer-facing Markdown rendering of the generated course data.',
  '> Every level includes the prose, Lean goal, official solution, hints, and unlocks.',
  '> A **3D MODEL** callout appears wherever the web course displays a 3D scene.',
  '',
  `**Course status:** ${exactVerified.size}/${levels.length} reference solutions are recorded against the exact browser compiler for this revision. Native reference checks run separately during development; the exact browser pin remains the release gate.`,
  '',
  `**Caption:** ${course.caption}`,
  '',
  '## Revision notes (r2)',
  '',
  '- Every level now has a conceptual hint, a tool hint, and a hidden solution hint.',
  '- New levels exercise the inverse side of a partial chart, both directions of the self-atlas equivalence, an actual transition map, and stereographic source membership.',
  '- Definition-only exercises that accepted any well-typed term were removed from Tangent Spaces and Robot Arm.',
  '- Repeated 3D assets now use different named-object highlights, and the robot arm opens its own world.',
  '- Completing the final robot proof grants `fun_prop`; it is not available while solving that level.',
  '- The course revision changed, so the old numeric-ID conformance record is ignored until exact pinned CI checks r2.',
  '',
  '## Course map',
  '',
  '| World | Levels | Prerequisite | 3D content |',
  '| --- | ---: | --- | --- |',
  ...course.worlds.map((world, index) => {
    const modelLevels = world.levels.filter((level) => modelByLevel[level.id])
    const lab = world.id === 'CanonicalCharts'
    const modelSummary = [
      ...(lab ? ['seven-model explorer'] : []),
      ...(world.id === 'RobotArm' ? ['1 world scene'] : []),
      ...(modelLevels.length > 0 ? [`${modelLevels.length} lesson scene${modelLevels.length === 1 ? '' : 's'}`] : []),
    ].join('; ') || 'None'
    const prerequisite = world.prerequisites.length > 0
      ? world.prerequisites.map((item) => `\`${item}\``).join(', ')
      : 'None'
    return `| ${index + 1}. ${world.title} | ${world.levels.length} | ${prerequisite} | ${modelSummary} |`
  }),
  '',
  '## 3D model index',
  '',
  'World 4 opens with a seven-model explorer, and World 9 opens with the robot arm. Individual lessons also embed models:',
  '',
  '| Location | Model | Asset |',
  '| --- | --- | --- |',
  ...Object.entries(modelByLevel).map(([levelId, model]) => {
    const level = levels.find((candidate) => candidate.id === levelId)
    return `| ${level.world}, level ${level.number}: ${level.title} | ${models[model].label} | [\`${model}.glb\`](${modelPath(model)}) |`
  }),
  `| RobotArm, world overview: Where the arm can reach | ${models['robot-arm'].label} | [\`robot-arm.glb\`](${modelPath('robot-arm')}) |`,
  '',
  'The World 4 explorer additionally includes:',
  '',
  ...Object.entries(models).filter(([model]) => model !== 'robot-arm').map(([model, info]) => (
    `- **${info.label}**${info.outlook ? ' *(outlook, beyond this course)*' : ''}: ${info.caption} ([\`${model}.glb\`](${modelPath(model)}))`
  )),
  '',
  '## Course introduction',
  '',
  demoteHeadings(course.introduction, 2),
  '',
  '### Course information',
  '',
  course.information,
  '',
  '### Formal source',
  '',
  `- Repository: ${course.source.repository}`,
  `- Course source revision: \`${course.source.commit}\``,
  `- Lean toolchain: \`${course.source.toolchain}\``,
  `- Mathlib commit: \`${course.source.mathlibCommit}\``,
  `- License: ${course.source.license}`,
  '',
]

for (const [worldIndex, world] of course.worlds.entries()) {
  lines.push(
    `## World ${worldIndex + 1}: ${world.title}`,
    '',
    `**Prerequisites:** ${world.prerequisites.length > 0 ? world.prerequisites.map((item) => `\`${item}\``).join(', ') : 'None'}`,
    '',
    demoteHeadings(world.introduction, 2),
    '',
  )

  if (world.id === 'CanonicalCharts') {
    lines.push(
      '> **3D MODEL LAB: seven-model explorer**',
      '>',
      '> The web course places an interactive model selector on this world overview. It contains every model listed in the [3D model index](#3d-model-index).',
      '',
    )
  }
  if (world.id === 'RobotArm') {
    lines.push(
      modelCallout(
        'robot-arm',
        'This interactive scene appears on the world overview.',
        "Each ring is one circle-valued joint. Reading both rings gives one point of the arm's configuration space. Highlight state: both joint arcs.",
      ),
      '',
    )
  }

  for (const level of world.levels) {
    const model = modelByLevel[level.id]
    lines.push(
      `### ${worldIndex + 1}.${level.number} ${level.title}`,
      '',
      `- **Level ID:** \`${level.id}\``,
      `- **Verification:** ${exactVerified.has(level.id) ? 'exact browser Lean kernel' : 'native reference check required; exact browser record pending'}`,
      `- **Creates:** \`ManifoldAdventure.${level.theoremName}\` (${level.declarationKind})`,
      '',
    )

    if (model) {
      lines.push(
        modelCallout(
          model,
          'This interactive scene appears immediately after the lesson introduction.',
          captionByLevel[level.id],
        ),
        '',
      )
    }

    lines.push(
      '#### Lesson',
      '',
      level.introduction,
      '',
      '#### Human-readable objective',
      '',
      level.statementText,
      '',
      '#### Goal',
      '',
      codeBlock('lean', `${level.declarationKind} ${level.statement} := by\n  -- Write your proof here.`),
      '',
      '#### Official solution',
      '',
      codeBlock('lean', `by\n${level.solution.split('\n').map((line) => `  ${line}`).join('\n')}`),
      '',
      '#### Hints',
      '',
      ...level.hints.map((hint, index) => `${index + 1}. ${hint}`),
      '',
      '#### Unlocks',
      '',
      `- **Lean tactics:** ${inlineInventory([...(level.newTactics || []), ...(level.completionTactics || [])])}`,
      `- **Mathlib theorems/declarations:** ${inlineInventory(level.newTheorems)}`,
      `- **Structures, definitions, and notation:** ${inlineInventory(level.newDefinitions)}`,
      `- **Reusable course declaration:** \`ManifoldAdventure.${level.theoremName}\``,
      '',
      '#### After the proof',
      '',
      level.conclusion,
      '',
    )
  }
}

lines.push(
  '## End-state inventory',
  '',
  `After completing all ${course.worlds.length} worlds, including the optional branches, the player has unlocked the following named Mathlib declarations and Lean tactics.`,
  '',
  '### Tactics',
  '',
  ...[...new Set(levels.flatMap((level) => [...(level.newTactics || []), ...(level.completionTactics || [])]))].map((item) => `- \`${item}\``),
  '',
  '### Mathlib theorems and declarations',
  '',
  ...[...new Set(levels.flatMap((level) => level.newTheorems))].map((item) => `- \`${item}\``),
  '',
  '### Structures, definitions, and notation',
  '',
  ...[...new Set(levels.flatMap((level) => level.newDefinitions))].map((item) => `- \`${item}\``),
  '',
  '### Course declarations',
  '',
  ...levels.map((level) => `- \`ManifoldAdventure.${level.theoremName}\`: ${level.title}`),
  '',
)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${lines.join('\n').trimEnd()}\n`)
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`)
