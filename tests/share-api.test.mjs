import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import test from 'node:test'
import { onRequestPost, validateWorkspace } from '../functions/api/share/index.js'

function requestFor(body) {
  return new Request('https://example.test/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/gzip' },
    body,
  })
}

function mockBucket() {
  const objects = new Map()
  return {
    objects,
    async head(key) {
      return objects.has(key) ? {} : null
    },
    async put(key, value) {
      objects.set(key, new Uint8Array(value))
    },
  }
}

function gzipWorkspace(workspace) {
  return gzipSync(JSON.stringify(workspace))
}

test('share API stores a valid content-addressed Lean workspace once', async () => {
  const bytes = gzipWorkspace({
    files: [
      { name: 'Main.lean', content: '#check Nat' },
      { name: 'Proof.lean', content: 'example : True := by trivial' },
    ],
    active: 'Proof.lean',
  })
  const bucket = mockBucket()
  const context = {
    request: requestFor(bytes),
    env: { LEAN_ASSETS: bucket },
  }

  const first = await onRequestPost(context)
  assert.equal(first.status, 200)
  const { id } = await first.json()
  assert.match(id, /^[0-9a-f]{64}$/)
  assert.deepEqual(bucket.objects.get(`snippets/${id}`), new Uint8Array(bytes))

  const second = await onRequestPost({
    ...context,
    request: requestFor(bytes),
  })
  assert.equal(second.status, 200)
  assert.equal(bucket.objects.size, 1)
})

test('share API rejects malformed gzip and invalid workspace schemas', async () => {
  const bucket = mockBucket()
  const malformed = await onRequestPost({
    request: requestFor(new Uint8Array([0x1f, 0x8b, 0, 1, 2])),
    env: { LEAN_ASSETS: bucket },
  })
  assert.equal(malformed.status, 400)

  const missingActive = await onRequestPost({
    request: requestFor(gzipWorkspace({
      files: [{ name: 'Main.lean', content: '#check Nat' }],
      active: 'Missing.lean',
    })),
    env: { LEAN_ASSETS: bucket },
  })
  assert.equal(missingActive.status, 400)
  assert.equal(bucket.objects.size, 0)
})

test('share API bounds expanded payload size', async () => {
  const bucket = mockBucket()
  const compressedBomb = gzipWorkspace({
    files: [{ name: 'Main.lean', content: 'x'.repeat(2 * 1024 * 1024) }],
    active: 'Main.lean',
  })
  assert.ok(compressedBomb.byteLength < 256 * 1024)

  const response = await onRequestPost({
    request: requestFor(compressedBomb),
    env: { LEAN_ASSETS: bucket },
  })
  assert.equal(response.status, 413)
  assert.equal(bucket.objects.size, 0)
})

test('share API rejects oversized compressed request bodies while streaming', async () => {
  const bucket = mockBucket()
  const response = await onRequestPost({
    request: requestFor(new Uint8Array(256 * 1024 + 1)),
    env: { LEAN_ASSETS: bucket },
  })
  assert.equal(response.status, 413)
  assert.equal(bucket.objects.size, 0)
})

test('workspace validation rejects duplicate or unsafe file names', () => {
  assert.throws(() => validateWorkspace({
    files: [
      { name: 'Main.lean', content: '' },
      { name: 'Main.lean', content: '' },
    ],
    active: 'Main.lean',
  }), /unique/)

  assert.throws(() => validateWorkspace({
    files: [{ name: '../Main.lean', content: '' }],
    active: '../Main.lean',
  }), /name is invalid/)
})
