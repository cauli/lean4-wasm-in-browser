import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/lean-wasm/[[path]].js';

function harness({ query = '', key = 'lean.wasm', method = 'GET', objects = {} } = {}) {
  const calls = [];
  const context = {
    request: new Request(`https://example.test/lean-wasm/${key}${query}`, { method }),
    params: { path: key.split('/') },
    env: { LEAN_ASSETS: { async get(key) {
      calls.push(key);
      if (!Object.hasOwn(objects, key)) return null;
      return { body: objects[key], httpEtag: '"checksum"', writeHttpMetadata(headers) { headers.set('custom-metadata', 'preserved'); } };
    } } },
    next: () => new Response('static', { status: 202 }),
  };
  return { context, calls };
}

test('missing explicit version never falls back to a bare object', async () => {
  const { context, calls } = harness({ query: '?v=new-release', objects: { 'lean.wasm': 'wrong old bytes' } });
  assert.equal((await onRequest(context)).status, 404);
  assert.deepEqual(calls, ['new-release/lean.wasm']);
});

test('explicit versions route full, slim, and snapshot paths exactly', async () => {
  for (const key of ['lean.js', 'lean.wasm', 'snapshots/init.snap', 'slim/lean.js', 'slim/lean.wasm', 'slim/snapshots/init.snap']) {
    const { context, calls } = harness({ key, query: '?v=release-1', objects: { [`release-1/${key}`]: 'correct bytes' } });
    const response = await onRequest(context);
    assert.equal(await response.text(), 'correct bytes');
    assert.deepEqual(calls, [`release-1/${key}`]);
    assert.match(response.headers.get('cache-control'), /immutable/);
    assert.equal(response.headers.get('cross-origin-embedder-policy'), 'require-corp');
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(response.headers.get('etag'), '"checksum"');
  }
});

test('invalid, empty, and duplicate version parameters fail without any R2 read', async () => {
  for (const query of ['?v=', '?v=../old', '?v=a&v=b', '?v=%2F', '?v=release%0A']) {
    const { context, calls } = harness({ query, objects: { 'lean.wasm': 'legacy' } });
    assert.equal((await onRequest(context)).status, 400);
    assert.deepEqual(calls, []);
  }
});

test('unversioned legacy requests retain bare compatibility without immutable caching', async () => {
  const { context, calls } = harness({ objects: { 'lean.wasm': 'legacy' } });
  const response = await onRequest(context);
  assert.equal(await response.text(), 'legacy');
  assert.deepEqual(calls, ['lean.wasm']);
  assert.doesNotMatch(response.headers.get('cache-control'), /immutable/);
});

test('HEAD has no body and the same isolation, type, and cache headers as GET', async () => {
  const { context } = harness({ method: 'HEAD', query: '?v=r1', objects: { 'r1/lean.wasm': 'body' } });
  const response = await onRequest(context);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('content-type'), 'application/wasm');
  assert.match(response.headers.get('cache-control'), /immutable/);
});

test('static files and non-read requests never touch R2', async () => {
  for (const options of [{ key: 'lean-lib/Init.olean' }, { method: 'POST' }, { key: 'lean-lib-files.json' }]) {
    const { context, calls } = harness(options);
    assert.equal((await onRequest(context)).status, 202);
    assert.deepEqual(calls, []);
  }
});
