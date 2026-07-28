#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const mathlibRoot = path.resolve(process.argv[2] || '/tmp/mathlib4-lean62')
const courseRoot = path.resolve(process.argv[3] || '/tmp/real-analysis-game-lean-port')
const outputRoot = path.resolve(process.argv[4] || '/tmp/real-analysis-wasm-artifact')
const manifestPath = path.join(repoRoot, 'public/lean-wasm/real-analysis-layer.json')
const coreRoot = path.join(repoRoot, 'public/lean-wasm/lean-lib')

const safeTemporaryRoots = [
  path.resolve(os.tmpdir()),
  path.resolve('/tmp'),
  path.resolve('/private/tmp'),
]
if (!safeTemporaryRoots.some((root) => outputRoot.startsWith(`${root}${path.sep}`))) {
  throw new Error(`Artifact staging must stay under the temporary directory: ${outputRoot}`)
}
for (const required of [manifestPath, coreRoot, mathlibRoot, courseRoot]) {
  if (!fs.existsSync(required)) throw new Error(`Required path not found: ${required}`)
}

function libraryRoots(workspaceRoot) {
  const roots = [path.join(workspaceRoot, '.lake/build/lib/lean')]
  const packages = path.join(workspaceRoot, '.lake/packages')
  if (fs.existsSync(packages)) {
    for (const name of fs.readdirSync(packages)) {
      roots.push(path.join(packages, name, '.lake/build/lib/lean'))
    }
  }
  return roots.filter((root) => fs.existsSync(root))
}

const sourceRoots = [
  path.resolve(coreRoot),
  ...libraryRoots(courseRoot),
  ...libraryRoots(mathlibRoot),
]
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const files = manifest.files || []
if (files.length === 0) throw new Error('The Real Analysis layer manifest is empty.')

fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(path.join(outputRoot, 'bin'), { recursive: true })
fs.mkdirSync(path.join(outputRoot, 'lib/lean'), { recursive: true })

function stageFile(source, destination) {
  // Hard links remain zero-copy on the local APFS volume but, unlike absolute
  // symlinks, do not require every source directory to be visible inside
  // Emscripten's virtual filesystem.
  try {
    fs.linkSync(source, destination)
  } catch (error) {
    if (!['EXDEV', 'EPERM', 'EACCES'].includes(error?.code)) throw error
    fs.copyFileSync(source, destination)
  }
}

for (const binary of ['lean.js', 'lean.wasm']) {
  const source = fs.realpathSync(path.join(repoRoot, 'public/lean-wasm', binary))
  stageFile(source, path.join(outputRoot, 'bin', binary))
}

let missing = 0
for (const relativePath of files) {
  const source = sourceRoots
    .map((root) => path.join(root, relativePath))
    .find((candidate) => fs.existsSync(candidate))
  if (!source) {
    missing += 1
    console.error(`Missing ${relativePath}`)
    continue
  }
  const destination = path.join(outputRoot, 'lib/lean', relativePath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  stageFile(source, destination)
}

if (missing > 0) {
  throw new Error(`${missing} manifest artifacts could not be staged.`)
}

console.log(`Staged ${files.length} compiled artifacts at ${outputRoot}`)
