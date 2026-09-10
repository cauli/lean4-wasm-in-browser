import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { variantPlan, validateSession, verifyRequests, verifyServedFile, snapshotSession } from '../scripts/check-snapshot-restoration.mjs';

const digest = (body) => ({ bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') });
const release = {
  schemaVersion: 1, leanCommit: 'a'.repeat(40), emscriptenVersion: '4.0.22',
  assetVersion: `${'a'.repeat(40)}-dlsym1-compact1`, fixture: null,
  objects: Object.fromEntries(['lean.js', 'lean.wasm', 'snapshots/init.snap', 'slim/lean.js', 'slim/lean.wasm', 'slim/snapshots/init.snap'].map((key) => [key, digest(key)])),
};
const diagnostic = (severity, data) => JSON.stringify({ severity, data });
const session = (bytes) => ({
  emptyLibrary: true, snapshot: { success: true }, received: bytes,
  valid: { result: { success: true }, output: [diagnostic('information', 'snapshot_gate_valid (n : Nat) : n + 0 = n')] },
  invalid: { result: { success: true }, output: [diagnostic('error', 'tactic rfl failed')] },
});

test('snapshot plans pin separate full/slim URLs without requiring fixture archive metadata', () => {
  for (const variant of ['full', 'slim']) {
    const plan = variantPlan('http://127.0.0.1:5177', variant, release);
    const prefix = variant === 'slim' ? 'slim/' : '';
    assert.equal(plan.snapshotUrl, `http://127.0.0.1:5177/lean-wasm/${prefix}snapshots/init.snap?v=${release.assetVersion}`);
    assert.equal(plan.expectedSnapshotBytes, release.objects[`${prefix}snapshots/init.snap`].bytes);
    assert.equal(new URL(plan.workerUrl).pathname, '/lean-worker-persistent.worker.js');
    assert.equal(new URL(plan.workerUrl).searchParams.get('assetBase'), `/lean-wasm${variant === 'slim' ? '/slim' : ''}`);
  }
  assert.throws(() => variantPlan('https://example.test/path', 'full', release), /origin/);
  assert.throws(() => variantPlan('https://example.test', 'mobile', release), /variant/);
});

test('restoration requires explicit snapshot success, complete download, and real diagnostics', () => {
  assert.doesNotThrow(() => validateSession(session(123), 123));
  for (const mutate of [
    (s) => { s.snapshot.success = false; },
    (s) => { s.emptyLibrary = false; },
    (s) => { s.received = 122; },
    (s) => { s.valid.output = [diagnostic('error', 'failed')]; },
    (s) => { s.valid.output = []; },
    (s) => { s.invalid.output = []; },
    (s) => { s.invalid.result.success = false; },
  ]) {
    const wrong = session(123); mutate(wrong);
    assert.throws(() => validateSession(wrong, 123));
  }
});

test('browser evidence must include the three exact served URLs and no library fallback', () => {
  const plan = variantPlan('https://example.test', 'full', release);
  const responses = plan.objects.map(({ url }) => ({ url, status: 200 }));
  assert.doesNotThrow(() => verifyRequests(plan, { responses, failed: [] }));
  assert.throws(() => verifyRequests(plan, { responses: responses.slice(0, 2), failed: [] }), /Missing/);
  assert.throws(() => verifyRequests(plan, { responses: [...responses, { url: 'https://example.test/lean-wasm/core-layer.json', status: 200 }], failed: [] }), /Unexpected/);
  assert.throws(() => verifyRequests(plan, { responses: responses.map((r) => ({ ...r, status: 404 })), failed: [] }), /status/);
  assert.throws(() => verifyRequests(plan, { responses, failed: [{ url: plan.snapshotUrl, error: 'failed' }] }), /failed/);
});

test('served-byte preflight streams and rejects HTTP errors, same-size drift, and excess bytes', async () => {
  const good = 'snapshot';
  const expected = digest(good);
  assert.equal((await verifyServedFile('https://example.test/init.snap', expected, async (_url, options) => {
    assert.equal(options.redirect, 'error');
    return new Response(good);
  })).sha256, expected.sha256);
  for (const response of [new Response('SNAPSHOT'), new Response('snapshot-extra'), new Response('missing', { status: 404 })]) {
    await assert.rejects(verifyServedFile('https://example.test/init.snap', expected, async () => response));
  }
});

test('real worker protocol loads snapshot before any compile and never sends library files', async () => {
  const original = globalThis.Worker;
  const sent = [];
  class FakeWorker {
    constructor() { queueMicrotask(() => this.onmessage({ data: { type: 'worker_boot' } })); }
    terminate() {}
    postMessage(message) {
      sent.push(message);
      const emit = (data) => queueMicrotask(() => this.onmessage({ data }));
      if (message.type === 'load_library') emit({ type: 'library_received' });
      if (message.type === 'start_worker') emit({ type: 'worker_ready' });
      if (message.type === 'load_snapshot') {
        emit({ type: 'snapshot_progress', received: 123 });
        emit({ type: 'snapshot_loaded', success: true });
      }
      if (message.type === 'compile') {
        emit({ type: 'stdout', data: diagnostic(message.code === 'valid' ? 'information' : 'error', message.code === 'valid' ? 'snapshot_gate_valid' : 'rfl failed') });
        emit({ type: 'compile_result', success: true });
      }
    }
  }
  globalThis.Worker = FakeWorker;
  try {
    const result = await snapshotSession({ workerUrl: '/worker', snapshotUrl: '/snap', expectedSnapshotBytes: 123, timeoutMs: 1000, validCode: 'valid', invalidCode: 'invalid' });
    validateSession(result, 123);
    assert.deepEqual(sent.map((m) => m.type), ['load_library', 'start_worker', 'load_snapshot', 'compile', 'compile']);
    assert.deepEqual(sent[0].files, []);
  } finally { globalThis.Worker = original; }
});

test('a rejected snapshot stops the real protocol without compiling or falling back', async () => {
  const original = globalThis.Worker;
  const sent = [];
  globalThis.Worker = class {
    constructor() { queueMicrotask(() => this.onmessage({ data: { type: 'worker_boot' } })); }
    terminate() {}
    postMessage(message) {
      sent.push(message.type);
      const response = { load_library: 'library_received', start_worker: 'worker_ready', load_snapshot: 'snapshot_loaded' }[message.type];
      queueMicrotask(() => this.onmessage({ data: { type: response, success: false, error: 'incompatible snapshot' } }));
    }
  };
  try {
    const result = await snapshotSession({ workerUrl: '/worker', snapshotUrl: '/snap', timeoutMs: 1000 });
    assert.match(result.error, /Snapshot restoration failed/);
    assert.deepEqual(sent, ['load_library', 'start_worker', 'load_snapshot']);
  } finally { globalThis.Worker = original; }
});
