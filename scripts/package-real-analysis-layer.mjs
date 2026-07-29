#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'

const mathlibRoot = path.resolve(process.argv[2] || '/tmp/mathlib4-lean62')
const courseRoot = path.resolve(process.argv[3] || '/tmp/real-analysis-game-lean-port')
const outputRoot = path.resolve(
  process.argv[4] || 'public/lean-wasm/real-analysis-lib',
)
const manifestPath = path.resolve(
  process.argv[5] || 'public/lean-wasm/real-analysis-layer.json',
)
const coreRoot = path.resolve(process.argv[6] || 'public/lean-wasm/lean-lib')
const coreFileListPath = path.resolve(
  process.argv[7] || 'public/lean-wasm/lean-lib-files.json',
)
const leanSourceRoot = path.resolve(
  process.argv[8] || '/tmp/lean4-62b6a22/src',
)
const manifoldRoot = process.argv[9]
  ? path.resolve(process.argv[9])
  : null
const seedModules = (process.argv[10]
  ? process.argv[10].split(',').map((name) => name.trim()).filter(Boolean)
  : ['RealAnalysisGame.BrowserBase'])
const baseManifestPath = process.argv[11]
  ? path.resolve(process.argv[11])
  : null
const baseManifest = baseManifestPath
  ? JSON.parse(fs.readFileSync(baseManifestPath, 'utf8'))
  : null
const baseFiles = new Set(baseManifest?.files || [])
const hasExactCoreSources = fs.existsSync(path.join(leanSourceRoot, 'Init.lean'))

for (const [label, root] of [
  ['Mathlib', mathlibRoot],
  ['Real Analysis course', courseRoot],
  ...(manifoldRoot ? [['Manifold Adventure course', manifoldRoot]] : []),
]) {
  if (!fs.existsSync(root)) throw new Error(`${label} build root not found: ${root}`)
}
if (
  outputRoot === mathlibRoot
  || outputRoot === courseRoot
  || (manifoldRoot && outputRoot === manifoldRoot)
  || outputRoot === path.parse(outputRoot).root
) {
  throw new Error(`Refusing to replace unsafe layer path: ${outputRoot}`)
}

function gitCommit(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function packageLibraryRoots() {
  const roots = [
    path.join(mathlibRoot, '.lake/build/lib/lean'),
    path.join(courseRoot, '.lake/build/lib/lean'),
    ...(manifoldRoot ? [path.join(manifoldRoot, '.lake/build/lib/lean')] : []),
  ]
  for (const workspaceRoot of [courseRoot, mathlibRoot]) {
    const packages = path.join(workspaceRoot, '.lake/packages')
    if (fs.existsSync(packages)) {
      for (const name of fs.readdirSync(packages)) {
        roots.push(path.join(packages, name, '.lake/build/lib/lean'))
      }
    }
  }
  return roots.filter((root) => fs.existsSync(root))
}

function packageSourceRoots() {
  const roots = [mathlibRoot, courseRoot, ...(manifoldRoot ? [manifoldRoot] : [])]
  if (hasExactCoreSources) roots.push(leanSourceRoot)
  for (const workspaceRoot of [courseRoot, mathlibRoot]) {
    const packages = path.join(workspaceRoot, '.lake/packages')
    if (!fs.existsSync(packages)) continue
    for (const name of fs.readdirSync(packages)) {
      roots.push(path.join(packages, name))
    }
  }
  return [...new Set(roots.filter((root) => fs.existsSync(root)))]
}

function walk(root, relative = '', output = []) {
  const current = path.join(root, relative)
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      walk(root, child, output)
    } else if (
      entry.isFile()
      && (entry.name.endsWith('.olean') || entry.name.endsWith('.ir') || entry.name.endsWith('.ir.sig'))
    ) {
      output.push(child)
    }
  }
  return output
}

function walkLeanSources(root, relative = '', output = []) {
  const current = path.join(root, relative)
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      walkLeanSources(root, child, output)
    } else if (entry.isFile() && entry.name.endsWith('.lean')) {
      output.push(child)
    }
  }
  return output
}

function moduleForLeanPath(relativePath) {
  return relativePath.replace(/\.lean$/, '').split(path.sep).join('.')
}

function withoutLeanComments(source) {
  let output = ''
  let index = 0
  let blockDepth = 0
  while (index < source.length) {
    const current = source[index]
    const next = source[index + 1]
    if (blockDepth > 0) {
      if (current === '/' && next === '-') {
        blockDepth += 1
        output += '  '
        index += 2
      } else if (current === '-' && next === '/') {
        blockDepth -= 1
        output += '  '
        index += 2
      } else {
        output += current === '\n' ? '\n' : ' '
        index += 1
      }
    } else if (current === '/' && next === '-') {
      blockDepth = 1
      output += '  '
      index += 2
    } else if (current === '-' && next === '-') {
      while (index < source.length && source[index] !== '\n') {
        output += ' '
        index += 1
      }
    } else {
      output += current
      index += 1
    }
  }
  return output
}

function importedModules(source) {
  const imports = []
  let sawHeader = false
  for (const line of withoutLeanComments(source).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === 'module' || trimmed === 'prelude') {
      sawHeader = true
      continue
    }
    const match = /^(?:(?:public|meta|all)\s+)*import\s+(?:(?:public|meta|all)\s+)*([A-Za-z0-9_'.]+)$/.exec(trimmed)
    if (match) {
      sawHeader = true
      imports.push(match[1])
      continue
    }
    if (sawHeader || imports.length > 0) break
  }
  return imports
}

const moduleSources = new Map()
for (const sourceRoot of packageSourceRoots()) {
  for (const relativePath of walkLeanSources(sourceRoot)) {
    const moduleName = moduleForLeanPath(relativePath)
    if (!moduleSources.has(moduleName)) {
      moduleSources.set(moduleName, path.join(sourceRoot, relativePath))
    }
  }
}

const neededModules = new Set()
// Lean inserts `Init` implicitly into ordinary modules. Seed it explicitly so
// the browser layer includes precisely that core dependency closure too.
const pendingModules = [...seedModules, 'Init']
while (pendingModules.length > 0) {
  const moduleName = pendingModules.pop()
  if (!moduleName || neededModules.has(moduleName)) continue
  neededModules.add(moduleName)
  const sourcePath = moduleSources.get(moduleName)
  if (!sourcePath) {
    // Retain the older full-core fallback for packaging environments that do
    // not have the exact pinned Lean source checkout.
    if (!hasExactCoreSources && /^(?:Init|Lean|Std)(?:\.|$)/.test(moduleName)) continue
    throw new Error(`Could not resolve source for imported module ${moduleName}`)
  }
  for (const imported of importedModules(fs.readFileSync(sourcePath, 'utf8'))) {
    if (!neededModules.has(imported)) pendingModules.push(imported)
  }
}

function moduleForArtifact(relativePath) {
  return relativePath
    .replace(/(?:\.ir\.sig|\.olean|\.ir)$/, '')
    .split(path.sep)
    .join('.')
}

const allSources = new Map()
for (const libraryRoot of packageLibraryRoots()) {
  for (const relativePath of walk(libraryRoot)) {
    const sourcePath = path.join(libraryRoot, relativePath)
    const previous = allSources.get(relativePath)
    if (previous) {
      const previousBytes = fs.readFileSync(previous)
      const nextBytes = fs.readFileSync(sourcePath)
      if (!previousBytes.equals(nextBytes)) {
        throw new Error(`Conflicting package artifacts for ${relativePath}`)
      }
      continue
    }
    allSources.set(relativePath, sourcePath)
  }
}

const sources = new Map(
  [...allSources].filter(([relativePath]) => (
    neededModules.has(moduleForArtifact(relativePath))
    && !baseFiles.has(relativePath)
  )),
)

// Importing Mathlib resolves core artifacts from /lib/lean. With the exact
// pinned Lean sources available, include only the traced Init/Lean/Std closure.
// Fall back to the full trees when this script is run without that checkout.
if (!fs.existsSync(coreRoot) || !fs.existsSync(coreFileListPath)) {
  throw new Error(`Lean core browser library was not found at ${coreRoot}`)
}
const coreOleans = JSON.parse(fs.readFileSync(coreFileListPath, 'utf8'))
  .filter((file) => /^(?:Init|Lean|Std)(?:\.olean|\/)/.test(file))
for (const oleanPath of coreOleans) {
  for (const relativePath of [
    oleanPath,
    oleanPath.replace(/\.olean$/, '.ir'),
    oleanPath.replace(/\.olean$/, '.ir.sig'),
  ]) {
    if (baseFiles.has(relativePath)) continue
    if (
      hasExactCoreSources
      && !neededModules.has(moduleForArtifact(relativePath))
    ) continue
    const sourcePath = path.join(coreRoot, relativePath)
    if (!fs.existsSync(sourcePath)) continue
    const previous = sources.get(relativePath)
    if (previous && !fs.readFileSync(previous).equals(fs.readFileSync(sourcePath))) {
      throw new Error(`Conflicting core artifact for ${relativePath}`)
    }
    sources.set(relativePath, sourcePath)
  }
}

if (sources.size === 0) throw new Error('No built .olean/.ir artifacts were found.')

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
  // Use an opaque extension. Dev/static servers commonly attach
  // `Content-Encoding: gzip` to `.gz`, which makes fetch transparently decode
  // the body before our explicit DecompressionStream sees it.
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
const manifoldVerifier = JSON.parse(fs.readFileSync(
  path.resolve('src/game/manifolds-verifier.generated.json'),
  'utf8',
))
const manifest = {
  version: `lean-${manifoldVerifier.leanCommit.slice(0, 10)}-mathlib-games`,
  leanCommit: manifoldVerifier.leanCommit,
  leanUpstreamCommit: manifoldVerifier.leanUpstreamCommit,
  mathlibCommit: gitCommit(mathlibRoot),
  gameCommit: baseManifest?.gameCommit ?? gitCommit('/tmp/realanalysisgame-port'),
  manifoldCourseCommit: seedModules.some((name) => name.startsWith('ManifoldAdventure.'))
    ? gitCommit(path.resolve('.'))
    : null,
  baseModules: seedModules,
  extends: baseManifestPath
    ? {
        manifest: path.basename(baseManifestPath),
        leanCommit: baseManifest.leanCommit,
        mathlibCommit: baseManifest.mathlibCommit,
      }
    : null,
  generatedAt: new Date().toISOString(),
  files,
  packs,
  dependencyModules: neededModules.size,
  modules: files.filter((file) => file.endsWith('.olean')).length,
  bytes,
  compressedBytes,
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(
  `Packaged ${manifest.modules} modules `
  + `in ${packs.length} packs `
  + `(${Math.round(bytes / 1048576)} MB raw, ${Math.round(compressedBytes / 1048576)} MB gzip)`,
)
console.log(`Layer: ${outputRoot}`)
console.log(`Manifest: ${manifestPath}`)
