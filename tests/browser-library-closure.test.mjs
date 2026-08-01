import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { gzipSync } from 'node:zlib'

const tempRoot = await mkdtemp(path.join(tmpdir(), 'browser-library-closure-test-'))
after(() => rm(tempRoot, { force: true, recursive: true }))

const script = new URL('../scripts/unpack-browser-library-closure.mjs', import.meta.url)
const leanCommit = '1'.repeat(40)
const mathlibCommit = '2'.repeat(40)

function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

function makeClosure(root, entryPath = 'Mathlib/Geometry/Manifold/Test.olean') {
  const data = Buffer.from('olean synthetic browser library fixture')
  const compressed = gzipSync(data)
  const pack = {
    file: 'artifacts-000.pack',
    sha256: sha256(compressed),
    bytes: data.byteLength,
    compressedBytes: compressed.byteLength,
    entries: [{ path: entryPath, offset: 0, bytes: data.byteLength }],
  }
  const manifest = {
    kind: 'mathlib-dependency-closure',
    layerId: 'test-closure',
    fullMathlib: false,
    lean: { commit: leanCommit },
    mathlib: { commit: mathlibCommit },
    files: [entryPath],
    packs: [pack],
  }

  fs.mkdirSync(path.join(root, 'packs'), { recursive: true })
  fs.writeFileSync(path.join(root, 'packs', pack.file), compressed)
  fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const checksums = [
    `${sha256(fs.readFileSync(path.join(root, 'manifest.json')))}  manifest.json`,
    `${pack.sha256}  packs/${pack.file}`,
  ]
  fs.writeFileSync(path.join(root, 'SHA256SUMS'), `${checksums.join('\n')}\n`)
}

test('unpacks a checksum-verified, exactly pinned browser library closure', () => {
  const artifactRoot = path.join(tempRoot, 'valid-artifact')
  const outputRoot = path.join(tempRoot, 'valid-output')
  makeClosure(artifactRoot)

  execFileSync(
    process.execPath,
    [script.pathname, artifactRoot, outputRoot, leanCommit, mathlibCommit],
    { encoding: 'utf8' },
  )

  assert.equal(
    fs.readFileSync(path.join(outputRoot, 'Mathlib/Geometry/Manifold/Test.olean'), 'utf8'),
    'olean synthetic browser library fixture',
  )
})

test('rejects a mismatched Lean pin before replacing the output', () => {
  const artifactRoot = path.join(tempRoot, 'wrong-pin-artifact')
  const outputRoot = path.join(tempRoot, 'wrong-pin-output')
  makeClosure(artifactRoot)
  fs.mkdirSync(outputRoot)
  fs.writeFileSync(path.join(outputRoot, 'sentinel'), 'keep')

  const result = spawnSync(
    process.execPath,
    [script.pathname, artifactRoot, outputRoot, '3'.repeat(40), mathlibCommit],
    { encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Closure uses Lean/)
  assert.equal(fs.readFileSync(path.join(outputRoot, 'sentinel'), 'utf8'), 'keep')
})

test('rejects paths that escape the extracted library', () => {
  const artifactRoot = path.join(tempRoot, 'unsafe-artifact')
  const outputRoot = path.join(tempRoot, 'unsafe-output')
  makeClosure(artifactRoot, '../escape.olean')

  const result = spawnSync(
    process.execPath,
    [script.pathname, artifactRoot, outputRoot, leanCommit, mathlibCommit],
    { encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Unsafe artifact path/)
  assert.equal(fs.existsSync(path.join(tempRoot, 'escape.olean')), false)
})
