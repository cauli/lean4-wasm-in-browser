#!/usr/bin/env node
// Package ManifoldAdventure.Course as its own browser layer. The module adds
// only its three compiled files on top of the ten world layers (it imports no
// new Mathlib), so the layer is one small pack that extends all of them.
//
// Usage: node scripts/package-course-module-layer.mjs <course-lib-dir> [asset-root]
//   <course-lib-dir>  directory holding ManifoldAdventure/Course.{olean,ir,ir.sig}
//   [asset-root]      defaults to public/lean-wasm

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const courseLib = path.resolve(process.argv[2] || 'lean/.lake/build/lib/lean')
const assetRoot = path.resolve(process.argv[3] || 'public/lean-wasm')
const moduleName = 'ManifoldAdventure.Course'
const relativeFiles = ['ManifoldAdventure/Course.olean', 'ManifoldAdventure/Course.ir', 'ManifoldAdventure/Course.ir.sig']
const baseManifests = [
  'homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds',
  'tangent-spaces', 'map-projections', 'circle-motion', 'robot-arm', 'robot-reachability',
].map((slug) => `manifold-${slug}-layer.json`)

const verifier = JSON.parse(fs.readFileSync(path.resolve('src/game/manifolds-verifier.generated.json'), 'utf8'))
const firstBase = JSON.parse(fs.readFileSync(path.join(assetRoot, baseManifests[0]), 'utf8'))
if (firstBase.leanCommit !== verifier.leanCommit || firstBase.mathlibCommit !== verifier.mathlibCommit) {
  throw new Error('The world layers were built for a different Lean or Mathlib commit.')
}

// The olean header carries the compiler's githash; refuse files from any
// other build, since wasm32 Lean cannot load them.
function oleanCommit(file) {
  const header = fs.readFileSync(file).subarray(0, 96).toString('latin1')
  const match = /([0-9a-f]{40})/.exec(header)
  if (!match) throw new Error(`${file} has no recognisable olean header`)
  return match[1]
}
const courseOlean = path.join(courseLib, relativeFiles[0])
if (oleanCommit(courseOlean) !== verifier.leanCommit) {
  throw new Error(`${courseOlean} was compiled by ${oleanCommit(courseOlean)}, expected ${verifier.leanCommit}`)
}

const outputRoot = path.join(assetRoot, 'manifold-course-lib')
fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputRoot, { recursive: true })

const parts = []
const entries = []
let offset = 0
for (const relative of relativeFiles) {
  const source = fs.readFileSync(path.join(courseLib, relative))
  entries.push({ path: relative, offset, bytes: source.byteLength })
  parts.push(source)
  offset += source.byteLength
}
const raw = Buffer.concat(parts, offset)
const compressed = gzipSync(raw, { level: 9 })
const packFile = 'artifacts-000.pack'
fs.writeFileSync(path.join(outputRoot, packFile), compressed)

const manifest = {
  version: `lean-${verifier.leanCommit.slice(0, 10)}-mathlib-games`,
  leanCommit: verifier.leanCommit,
  leanUpstreamCommit: verifier.leanUpstreamCommit,
  mathlibCommit: verifier.mathlibCommit,
  gameCommit: firstBase.gameCommit ?? null,
  // The index requires one course commit across all layers; the world layers
  // were packaged before this module existed, so carry theirs.
  manifoldCourseCommit: firstBase.manifoldCourseCommit ?? null,
  baseModules: [moduleName],
  extends: {
    manifests: baseManifests,
    leanCommit: firstBase.leanCommit,
    mathlibCommit: firstBase.mathlibCommit,
  },
  generatedAt: new Date().toISOString(),
  files: relativeFiles,
  packs: [{ file: packFile, bytes: raw.byteLength, compressedBytes: compressed.byteLength, entries }],
  dependencyModules: 0,
  modules: 1,
  bytes: raw.byteLength,
  compressedBytes: compressed.byteLength,
}
const manifestPath = path.join(assetRoot, 'manifold-course-layer.json')
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Packaged ${moduleName}: ${raw.byteLength} bytes raw, ${compressed.byteLength} bytes gzip`)
console.log(`Manifest: ${manifestPath}`)
