#!/usr/bin/env node

// Package the Lean core (Init closure) into concatenated artifact packs.
//
// The game runtime stages Init.olean plus every Init/** artifact — with the
// .ir and .ir.sig siblings the interpreter and module reader need — before the
// first compile. Served as individual files that is ~3,800 HTTP requests whose
// per-request overhead dominates the transfer; grouped into ~16MB packs it is
// a dozen requests through the exact pack pipeline the course layers already
// use (same manifest schema, same Cache API layer, same worker staging).

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const libRoot = path.resolve(process.argv[2] || 'public/lean-wasm/lean-lib')
const fileListPath = path.resolve(process.argv[3] || 'public/lean-wasm/lean-lib-files.json')
const outputRoot = path.resolve(process.argv[4] || 'public/lean-wasm/core-lib')
const manifestPath = path.resolve(process.argv[5] || 'public/lean-wasm/core-layer.json')

if (!fs.existsSync(libRoot)) throw new Error(`lean-lib not found: ${libRoot}`)
if (!fs.existsSync(fileListPath)) throw new Error(`file list not found: ${fileListPath}`)
if (outputRoot === libRoot || outputRoot === path.parse(outputRoot).root) {
  throw new Error(`Refusing to replace unsafe output path: ${outputRoot}`)
}

// The build githash is baked into every olean header; the app uses it as the
// asset version, and the pack cache descriptor derives from it, so packs made
// from the same artifact always share one cache generation.
const initHeader = fs.readFileSync(path.join(libRoot, 'Init.olean')).subarray(0, 120)
const leanCommit = initHeader.toString('latin1').match(/[0-9a-f]{40}/)?.[0]
if (!leanCommit) throw new Error('Could not read the Lean githash from Init.olean')

const oleanPaths = JSON.parse(fs.readFileSync(fileListPath, 'utf8'))
  .filter((name) => name === 'Init.olean' || name.startsWith('Init/'))
if (oleanPaths.length === 0) throw new Error('No Init closure files in the file list')

// Same artifact kinds addInitFiles staged per-file: the .olean, and the
// .ir/.ir.sig pair when the artifact ships one (the reader only loads an .ir
// whose .ir.sig exists, so a lone missing sibling is fine to skip).
const sources = new Map()
for (const olean of oleanPaths) {
  for (const rel of [olean, olean.replace(/\.olean$/, '.ir'), olean.replace(/\.olean$/, '.ir.sig')]) {
    const abs = path.join(libRoot, rel)
    if (fs.existsSync(abs)) sources.set(rel, abs)
  }
}

fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputRoot, { recursive: true })

const maxPackBytes = 16 * 1024 * 1024
let bytes = 0
let compressedBytes = 0
const packs = []
let packParts = []
let packEntries = []
let packBytes = 0

function flushPack() {
  if (packEntries.length === 0) return
  const raw = Buffer.concat(packParts, packBytes)
  const compressed = gzipSync(raw, { level: 9 })
  // Opaque extension: dev/static servers attach Content-Encoding to `.gz`,
  // which would make fetch pre-decode the body under our DecompressionStream.
  const file = `artifacts-${String(packs.length).padStart(3, '0')}.pack`
  fs.writeFileSync(path.join(outputRoot, file), compressed)
  packs.push({
    file,
    bytes: raw.byteLength,
    compressedBytes: compressed.byteLength,
    entries: packEntries,
  })
  compressedBytes += compressed.byteLength
  packParts = []
  packEntries = []
  packBytes = 0
}

for (const [relativePath, sourcePath] of [...sources].sort()) {
  const source = fs.readFileSync(sourcePath)
  if (packBytes > 0 && packBytes + source.byteLength > maxPackBytes) flushPack()
  packEntries.push({
    path: relativePath,
    offset: packBytes,
    bytes: source.byteLength,
  })
  packParts.push(source)
  packBytes += source.byteLength
  bytes += source.byteLength
}
flushPack()

const files = [...sources.keys()].sort()
const manifest = {
  version: `lean-core-${leanCommit.slice(0, 10)}`,
  leanCommit,
  mathlibCommit: null,
  // The cache descriptor keys the pack generation on this instead of
  // generatedAt, so repackaging the same artifact reuses the existing cache.
  gameCommit: leanCommit,
  manifoldCourseCommit: null,
  baseModules: ['Init'],
  extends: null,
  generatedAt: new Date().toISOString(),
  files,
  packs,
  modules: files.filter((file) => file.endsWith('.olean')).length,
  bytes,
  compressedBytes,
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `Packed ${files.length} Lean core files into ${packs.length} packs `
  + `(${Math.round(bytes / 1048576)} MB raw, ${Math.round(compressedBytes / 1048576)} MB gzip) `
  + `for build ${leanCommit.slice(0, 10)}`,
)
