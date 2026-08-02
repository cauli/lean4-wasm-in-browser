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
  ['Homeomorphisms', 'homeomorphisms', 'homeomorphisms', [], []],
  ['LocalCharts', 'local-charts', 'local charts', ['Homeomorphisms'], ['homeomorphisms']],
  ['ChartedSpaces', 'charted-spaces', 'charted spaces', ['LocalCharts'], ['homeomorphisms', 'local-charts']],
  ['CanonicalCharts', 'canonical-charts', 'canonical charts', ['ChartedSpaces'], ['homeomorphisms', 'local-charts', 'charted-spaces']],
  ['SmoothManifolds', 'smooth-manifolds', 'smooth manifolds', ['CanonicalCharts'], ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts']],
  ['TangentSpaces', 'tangent-spaces', 'tangent spaces', ['SmoothManifolds'], ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds']],
  ['MapProjections', 'map-projections', 'map projections', ['LocalCharts'], ['homeomorphisms', 'local-charts']],
  ['CircleMotion', 'circle-motion', 'circular motion', ['SmoothManifolds'], ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds']],
  ['RobotArm', 'robot-arm', 'robot arm', ['CircleMotion'], ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds', 'circle-motion']],
  ['RobotReachability', 'robot-reachability', 'robot reachability', ['RobotArm'], ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds', 'circle-motion', 'robot-arm']],
].map(([world, slug, label, prerequisites, artifactBases]) => ({
  world,
  module: `ManifoldAdventure.${world}`,
  manifestFile: `manifold-${slug}-layer.json`,
  libraryRoot: `manifold-${slug}-lib`,
  label,
  prerequisites,
  artifactBases,
}))

const fileOwners = new Map()
let compressedBytes = 0
let bytes = 0
let packs = 0
let files = 0
let courseCommit = null

for (const layer of layers) {
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
  const expectedBases = layer.artifactBases.map((slug) => `manifold-${slug}-layer.json`)
  const actualBases = manifest.extends?.manifests || []
  if (JSON.stringify(actualBases) !== JSON.stringify(expectedBases)) {
    throw new Error(
      `${layer.manifestFile} extends ${actualBases.join(', ') || 'nothing'}, `
      + `expected ${expectedBases.join(', ') || 'nothing'}.`,
    )
  }
  if (layer.world === 'Homeomorphisms') {
    for (const file of [
      'ManifoldAdventure/BrowserPolicy.olean',
      'ManifoldAdventure/BrowserPolicy.ir',
      'ManifoldAdventure/BrowserPolicy.ir.sig',
    ]) {
      if (!manifest.files?.includes(file)) {
        throw new Error(`The first manifold world is missing precompiled policy file ${file}.`)
      }
    }
  }
  for (const file of manifest.files || []) {
    const owners = fileOwners.get(file) || []
    for (const owner of owners) {
      if (expectedBases.includes(owner.manifestFile) || owner.expectedBases.includes(layer.manifestFile)) {
        throw new Error(`${file} is repeated by dependent world layers.`)
      }
    }
    owners.push({ manifestFile: layer.manifestFile, expectedBases })
    fileOwners.set(file, owners)
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
  layers: layers.map(({ artifactBases, ...layer }) => layer),
  totals: { files, packs, bytes, compressedBytes },
}

fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`)
console.log(
  `Indexed ${layers.length} Manifold Adventure layers: ${packs} packs, `
  + `${Math.round(compressedBytes / 1048576)} MB compressed in total.`,
)
