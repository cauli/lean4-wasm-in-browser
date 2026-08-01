#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const assetRoot = path.resolve(process.argv[2] || 'public/lean-wasm')
const outputPath = path.join(assetRoot, 'manifold-layer.json')
const verifier = JSON.parse(fs.readFileSync(
  path.resolve('src/game/manifolds-verifier.generated.json'),
  'utf8',
))

const layers = [
  ['Homeomorphisms', 'homeomorphisms', 'homeomorphisms'],
  ['LocalCharts', 'local-charts', 'local charts'],
  ['ChartedSpaces', 'charted-spaces', 'charted spaces'],
  ['CanonicalCharts', 'canonical-charts', 'canonical charts'],
  ['SmoothManifolds', 'smooth-manifolds', 'smooth manifolds'],
  ['TangentSpaces', 'tangent-spaces', 'tangent spaces'],
].map(([world, slug, label]) => ({
  world,
  module: `ManifoldAdventure.${world}`,
  manifestFile: `manifold-${slug}-layer.json`,
  libraryRoot: `manifold-${slug}-lib`,
  label,
}))

const seenFiles = new Set()
let compressedBytes = 0
let bytes = 0
let packs = 0
let files = 0
let courseCommit = null

for (const [index, layer] of layers.entries()) {
  const manifestPath = path.join(assetRoot, layer.manifestFile)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (manifest.leanCommit !== verifier.leanCommit) {
    throw new Error(`${layer.manifestFile} uses a different Lean commit.`)
  }
  if (manifest.mathlibCommit !== verifier.mathlibCommit) {
    throw new Error(`${layer.manifestFile} uses a different Mathlib commit.`)
  }
  if (!manifest.baseModules?.includes(layer.module)) {
    throw new Error(`${layer.manifestFile} does not package ${layer.module}.`)
  }
  if (index === 0 && manifest.extends !== null) {
    throw new Error('The first manifold world must be standalone.')
  }
  if (index > 0 && manifest.extends?.manifests?.length !== index) {
    throw new Error(`${layer.manifestFile} does not extend every earlier world.`)
  }
  for (const file of manifest.files || []) {
    if (seenFiles.has(file)) throw new Error(`${file} occurs in more than one world layer.`)
    seenFiles.add(file)
  }
  courseCommit ??= manifest.manifoldCourseCommit
  if (manifest.manifoldCourseCommit !== courseCommit) {
    throw new Error('Manifold world layers came from different course commits.')
  }
  compressedBytes += manifest.compressedBytes || 0
  bytes += manifest.bytes || 0
  packs += manifest.packs?.length || 0
  files += manifest.files?.length || 0
}

const index = {
  version: `lean-${verifier.leanCommit.slice(0, 10)}-manifold-worlds`,
  kind: 'manifold-course-layer-index',
  leanCommit: verifier.leanCommit,
  leanUpstreamCommit: verifier.leanUpstreamCommit,
  mathlibCommit: verifier.mathlibCommit,
  manifoldCourseCommit: courseCommit,
  generatedAt: new Date().toISOString(),
  layers,
  totals: { files, packs, bytes, compressedBytes },
}

fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`)
console.log(
  `Indexed ${layers.length} Manifold Adventure layers: ${packs} packs, `
  + `${Math.round(compressedBytes / 1048576)} MB compressed in total.`,
)
