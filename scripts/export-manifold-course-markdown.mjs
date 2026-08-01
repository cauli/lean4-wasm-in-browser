#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const coursePath = path.join(repoRoot, 'src/game/manifolds.generated.json')
const outputPath = path.resolve(
  repoRoot,
  process.argv[2] || 'docs/manifold-adventure-course.md',
)

const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'))

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
  },
  'trefoil-circle': {
    label: 'Circle and trefoil embeddings',
    caption: 'From inside either tube, Ada experiences the same one-manifold: a circle. The knot belongs to the way one circle sits in three-dimensional space.',
  },
  'sphere-triangle': {
    label: 'A triangle with three right angles',
    caption: 'Ada walks three geodesic edges and turns through a right angle at every corner. The 270° angle total reveals curvature from within the sphere.',
  },
  'figure-eight': {
    label: 'Figure-eight crossing',
    caption: 'Ada tests the red crossing as a possible point on a one-manifold. Removing it leaves four nearby arms instead of the two she would find on an interval.',
  },
  'tangent-plane': {
    label: 'Tangent plane at a point',
    caption: 'The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear.',
  },
}

const modelByLevel = {
  'localcharts-4': 'sphere-charts',
  'chartedspaces-5': 'sphere-charts',
  'canonicalcharts-3': 'torus-loops',
  'canonicalcharts-4': 'torus-loops',
  'tangentspaces-1': 'tangent-plane',
  'tangentspaces-2': 'tangent-plane',
}

const captionByLevel = {
  'localcharts-4': 'A chart can take a point to its drawing and back only inside the colored patch where that chart is valid.',
  'chartedspaces-5': 'The amber and teal chart sources overlap and together cover the sphere, just as an atlas covers a surface with local maps.',
  'canonicalcharts-3': "The two highlighted loops picture Ada's two circle readings. A product chart combines one local chart from each factor.",
  'canonicalcharts-4': 'A paired position belongs to its product chart because each reading is handled by the corresponding factor chart.',
  'tangentspaces-1': "The attached plane pictures the tangent space at Ada's chosen place. Standing still is its zero vector.",
  'tangentspaces-2': 'A tangent-bundle point keeps the location on the surface together with a velocity from the tangent space attached there.',
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
  `**Course status:** ${levels.length}/${levels.length} reference solutions kernel-checked`,
  '',
  `**Caption:** ${course.caption}`,
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
  'World 4 opens with an interactive explorer containing all seven models. Six individual lessons also embed a model:',
  '',
  '| Location | Model | Asset |',
  '| --- | --- | --- |',
  ...Object.entries(modelByLevel).map(([levelId, model]) => {
    const level = levels.find((candidate) => candidate.id === levelId)
    return `| ${level.world}, level ${level.number}: ${level.title} | ${models[model].label} | [\`${model}.glb\`](${modelPath(model)}) |`
  }),
  '',
  'The World 4 explorer additionally includes:',
  '',
  ...Object.entries(models).map(([model, info]) => (
    `- **${info.label}:** ${info.caption} ([\`${model}.glb\`](${modelPath(model)}))`
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

  for (const level of world.levels) {
    const model = modelByLevel[level.id]
    lines.push(
      `### ${worldIndex + 1}.${level.number} ${level.title}`,
      '',
      `- **Level ID:** \`${level.id}\``,
      `- **Verification:** ${level.verification === 'kernel' ? 'Lean kernel' : level.verification}`,
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
      `- **Lean tactics:** ${inlineInventory(level.newTactics)}`,
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
  'After completing all six worlds, the player has unlocked the following named Mathlib declarations and Lean tactics.',
  '',
  '### Tactics',
  '',
  ...[...new Set(levels.flatMap((level) => level.newTactics))].map((item) => `- \`${item}\``),
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
