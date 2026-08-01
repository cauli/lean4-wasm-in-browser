#!/usr/bin/env node

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

function usage() {
  console.error(
    'Usage: node scripts/unpack-browser-library-closure.mjs '
      + '<artifact-dir> <output-lib-dir> [expected-lean-commit] [expected-mathlib-commit]',
  )
}

const artifactRoot = process.argv[2] ? path.resolve(process.argv[2]) : null
const outputRoot = process.argv[3] ? path.resolve(process.argv[3]) : null
const expectedLeanCommit = process.argv[4] || null
const expectedMathlibCommit = process.argv[5] || null

if (!artifactRoot || !outputRoot) {
  usage()
  process.exit(2)
}

const manifestPath = path.join(artifactRoot, 'manifest.json')
const checksumsPath = path.join(artifactRoot, 'SHA256SUMS')
for (const required of [manifestPath, checksumsPath]) {
  if (!fs.existsSync(required)) throw new Error(`Required artifact file not found: ${required}`)
}

if (
  outputRoot === artifactRoot
  || outputRoot === path.parse(outputRoot).root
  || artifactRoot.startsWith(`${outputRoot}${path.sep}`)
) {
  throw new Error(`Refusing unsafe output directory: ${outputRoot}`)
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

function artifactFile(relativePath) {
  if (
    !relativePath
    || path.isAbsolute(relativePath)
    || relativePath.includes('\\')
    || relativePath.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new Error(`Unsafe artifact path: ${relativePath}`)
  }
  const resolved = path.resolve(artifactRoot, ...relativePath.split('/'))
  if (!resolved.startsWith(`${artifactRoot}${path.sep}`)) {
    throw new Error(`Artifact path escapes its root: ${relativePath}`)
  }
  return resolved
}

const expectedChecksums = new Map()
for (const line of fs.readFileSync(checksumsPath, 'utf8').trim().split('\n')) {
  const match = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim())
  if (!match) throw new Error(`Invalid SHA256SUMS line: ${line}`)
  expectedChecksums.set(match[2], match[1])
}

for (const relativePath of ['manifest.json', ...[...expectedChecksums.keys()].filter((file) => file !== 'manifest.json')]) {
  const expected = expectedChecksums.get(relativePath)
  if (!expected) throw new Error(`SHA256SUMS is missing ${relativePath}`)
  const actual = sha256(fs.readFileSync(artifactFile(relativePath)))
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${relativePath}: expected ${expected}, found ${actual}`)
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
if (manifest.kind !== 'mathlib-dependency-closure' || manifest.fullMathlib !== false) {
  throw new Error('The artifact is not a labelled Mathlib dependency closure')
}
if (expectedLeanCommit && manifest.lean?.commit !== expectedLeanCommit) {
  throw new Error(`Closure uses Lean ${manifest.lean?.commit}; expected ${expectedLeanCommit}`)
}
if (expectedMathlibCommit && manifest.mathlib?.commit !== expectedMathlibCommit) {
  throw new Error(`Closure uses Mathlib ${manifest.mathlib?.commit}; expected ${expectedMathlibCommit}`)
}
if (!Array.isArray(manifest.files) || !Array.isArray(manifest.packs) || manifest.packs.length === 0) {
  throw new Error('Closure manifest has no files or packs')
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-library-closure-'))
const extractedFiles = new Set()

try {
  for (const pack of manifest.packs) {
    const relativePackPath = `packs/${pack.file}`
    if (expectedChecksums.get(relativePackPath) !== pack.sha256) {
      throw new Error(`Manifest and SHA256SUMS disagree for ${relativePackPath}`)
    }
    const compressed = fs.readFileSync(artifactFile(relativePackPath))
    if (compressed.byteLength !== pack.compressedBytes) {
      throw new Error(
        `${relativePackPath} has ${compressed.byteLength} compressed bytes; expected ${pack.compressedBytes}`,
      )
    }
    const raw = gunzipSync(compressed)
    if (raw.byteLength !== pack.bytes) {
      throw new Error(`${relativePackPath} expands to ${raw.byteLength} bytes; expected ${pack.bytes}`)
    }

    for (const entry of pack.entries || []) {
      const sourceEnd = entry.offset + entry.bytes
      if (
        !Number.isSafeInteger(entry.offset)
        || !Number.isSafeInteger(entry.bytes)
        || entry.offset < 0
        || entry.bytes <= 0
        || sourceEnd > raw.byteLength
      ) {
        throw new Error(`Invalid entry bounds for ${entry.path} in ${relativePackPath}`)
      }
      if (extractedFiles.has(entry.path)) throw new Error(`Duplicate closure file: ${entry.path}`)
      artifactFile(entry.path)

      const data = raw.subarray(entry.offset, sourceEnd)
      if (data.byteLength < 5 || data.subarray(0, 5).toString('ascii') !== 'olean') {
        throw new Error(`Invalid Lean artifact header for ${entry.path}`)
      }
      const destination = path.resolve(temporaryRoot, ...entry.path.split('/'))
      if (!destination.startsWith(`${temporaryRoot}${path.sep}`)) {
        throw new Error(`Closure file escapes the output root: ${entry.path}`)
      }
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.writeFileSync(destination, data)
      extractedFiles.add(entry.path)
    }
  }

  const declaredFiles = new Set(manifest.files)
  const missing = [...declaredFiles].filter((file) => !extractedFiles.has(file))
  const undeclared = [...extractedFiles].filter((file) => !declaredFiles.has(file))
  if (missing.length > 0 || undeclared.length > 0) {
    throw new Error(
      `Closure contents disagree with manifest (${missing.length} missing, ${undeclared.length} undeclared)`,
    )
  }

  fs.rmSync(outputRoot, { force: true, recursive: true })
  fs.mkdirSync(path.dirname(outputRoot), { recursive: true })
  fs.renameSync(temporaryRoot, outputRoot)
} catch (error) {
  fs.rmSync(temporaryRoot, { force: true, recursive: true })
  throw error
}

console.log(
  `Unpacked ${extractedFiles.size} files from ${manifest.packs.length} packs into ${outputRoot}`,
)
console.log(`Lean: ${manifest.lean.commit}`)
console.log(`Mathlib: ${manifest.mathlib.commit}`)
