import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertReleaseEnvironment, buildVersion, validateRelease,
  verifyFixture, verifyRuntime,
} from '../deploy/runtime-release.mjs';
import { uploadRelease, wranglerStore } from '../deploy/upload-r2.mjs';
import { fetchArtifacts, validateArchiveEntries } from './fetch-artifacts.mjs';

const commit = 'a'.repeat(40);
const digest = (body) => ({ sha256: createHash('sha256').update(body).digest('hex'), bytes: Buffer.byteLength(body) });
const files = { 'lean.js': 'full glue', 'lean.wasm': 'full wasm', 'slim/lean.js': 'slim glue', 'slim/lean.wasm': 'slim wasm', 'snapshots/init.snap': 'snapshot' };
const makeRelease = () => ({
  schemaVersion: 1, leanCommit: commit, emscriptenVersion: '4.0.22', assetVersion: `${commit}-compact1`,
  objects: Object.fromEntries(Object.entries(files).map(([key, body]) => [key, digest(body)])),
  fixture: { url: 'https://example.test/immutable-fixture.tar.gz', ...digest('archive') },
});
async function temp(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-release-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function write(root, file, body) {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), body);
}
async function stageRuntime(root) {
  for (const [key, body] of Object.entries(files)) await write(root, key, body);
}

test('release manifest rejects incomplete pins, unsafe keys, and manual version drift', () => {
  const release = makeRelease();
  assert.equal(validateRelease(release), release);
  for (const env of [{ LEAN_ASSET_TAG: 'wrong' }, { LEAN_ASSET_TAG: '' }, { VITE_LEAN_ASSET_VERSION: 'old' }, { LEAN_ARTIFACTS_URL: 'https://example.test/old.tar.gz' }, { PAGES_ASSETS_URL: 'https://example.test/unpinned.tar.gz' }]) {
    assert.throws(() => assertReleaseEnvironment(release, env), /conflicts/);
  }
  assert.doesNotThrow(() => assertReleaseEnvironment(release, { LEAN_ASSET_TAG: 'compact1', VITE_LEAN_ASSET_VERSION: release.assetVersion }));
  for (const mutate of [
    (r) => { delete r.objects['slim/lean.wasm']; },
    (r) => { r.objects['../lean.js'] = digest('bad'); },
    (r) => { r.objects['lean.js'].sha256 = 'unknown'; },
    (r) => { r.fixture = null; },
    (r) => { r.fixture.url = 'http://example.test/fixture'; },
    (r) => { r.assetVersion = 'timestamp'; },
    (r) => { r.staticAssets = { url: 'http://example.test/static.tar.gz', ...digest('archive') }; },
  ]) {
    const invalid = structuredClone(release);
    mutate(invalid);
    assert.throws(() => validateRelease(invalid));
  }
});

test('build pin requires a matching Init header and never falls back to a timestamp', async (t) => {
  const root = await temp(t);
  const release = makeRelease();
  await assert.rejects(buildVersion(root, release), /ENOENT/);
  await write(root, 'lean-lib/Init.olean', `olean-header:${'b'.repeat(40)}`);
  await assert.rejects(buildVersion(root, release), /does not match/);
  await write(root, 'lean-lib/Init.olean', `olean-header:${commit}`);
  assert.equal(await buildVersion(root, release), release.assetVersion);
});

test('full runtime checksum catches same-size drift and NODEFS fixture paths are mandatory', async (t) => {
  const root = await temp(t);
  const release = makeRelease();
  await stageRuntime(root);
  await verifyRuntime(root, release);
  await write(root, 'lean.js', 'FULL GLUE');
  await assert.rejects(verifyRuntime(root, release), /Checksum mismatch/);
  await write(root, 'bin/lean.js', files['lean.js']);
  await write(root, 'bin/lean.wasm', files['lean.wasm']);
  await write(root, 'lib/lean/Init.olean', `olean-header:${commit}`);
  await stageRuntime(path.join(root, 'runtime'));
  await verifyFixture(root, release);
  await fs.rename(path.join(root, 'lib/lean'), path.join(root, 'lib/wrong'));
  await assert.rejects(verifyFixture(root, release), /ENOENT/);
});

test('R2 refuses different immutable bytes before any put, including a later conflicting key', async (t) => {
  const root = await temp(t);
  await stageRuntime(root);
  const release = makeRelease();
  const puts = [];
  const store = {
    async get(key, destination) {
      if (!key.endsWith('snapshots/init.snap')) return false;
      await fs.writeFile(destination, 'different snapshot');
      return true;
    },
    async put(...args) { puts.push(args); },
  };
  await assert.rejects(uploadRelease({ release, root, store, log() {} }), /Refusing to overwrite immutable/);
  assert.deepEqual(puts, []);
});

test('R2 checks local bytes before reads and skips identical remote objects', async (t) => {
  const root = await temp(t);
  await stageRuntime(root);
  const release = makeRelease();
  const calls = [];
  const store = {
    async get(key, destination) {
      calls.push(['get', key]);
      if (key.endsWith('/lean.js')) return false;
      await fs.writeFile(destination, files[key.slice(release.assetVersion.length + 1)]);
      return true;
    },
    async put(key) { calls.push(['put', key]); },
  };
  const result = await uploadRelease({ release, root, store, log() {} });
  assert.deepEqual(result, { uploaded: 2, unchanged: 3 });
  assert.deepEqual(calls.map(([method]) => method), ['get', 'get', 'get', 'get', 'get', 'put', 'put']);
  assert.ok(calls.every(([, key]) => key.startsWith(`${release.assetVersion}/`)));
  await write(root, 'lean.wasm', 'bad');
  calls.length = 0;
  await assert.rejects(uploadRelease({ release, root, store, log() {} }), /Checksum mismatch/);
  assert.deepEqual(calls, []);
});

test('R2 transport treats authentication and unknown failures as fatal, not a missing key', async () => {
  for (const output of ['Authentication error', '404 Bucket not found', 'network error']) {
    const store = wranglerStore('bucket', async () => ({ code: 1, output }));
    await assert.rejects(store.get('key', '/tmp/unused'), /R2 preflight failed/);
  }
  const store = wranglerStore('bucket', async () => ({ code: 1, output: 'The specified key does not exist.' }));
  assert.equal(await store.get('key', '/tmp/unused'), false);
});

test('fixture archive paths reject traversal, absolute paths, and symlink entries', () => {
  assert.doesNotThrow(() => validateArchiveEntries('./\n./bin/\n./bin/lean.js\n', 'drwxr-xr-x root bin\n-rw-r--r-- root bin/lean.js'));
  for (const name of ['../bin/lean.js', '/bin/lean.js', 'bin/../../oops', 'other/lean.js']) {
    assert.throws(() => validateArchiveEntries(name, '-rw-r--r-- root file'), /Unsafe/);
  }
  assert.throws(() => validateArchiveEntries('bin/lean.js', 'lrwxr-xr-x root bin/lean.js -> /tmp/source'), /Unsupported/);
});

test('fetch authenticates archive and full runtime before atomically replacing old NODEFS fixtures', async (t) => {
  const root = await temp(t);
  const source = path.join(root, 'source');
  await write(source, 'bin/lean.js', files['lean.js']);
  await write(source, 'bin/lean.wasm', files['lean.wasm']);
  await write(source, 'lib/lean/Init.olean', `olean-header:${commit}`);
  await stageRuntime(path.join(source, 'runtime'));
  const archive = path.join(root, 'fixture.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', source, 'bin', 'lib', 'runtime']);
  const archiveBody = await fs.readFile(archive);
  const release = makeRelease();
  release.fixture = { ...release.fixture, ...digest(archiveBody) };
  const out = path.join(root, 'output');
  await write(out, 'previous.txt', 'keep until verified');
  const download = async () => new Response(archiveBody);
  const wrongArchive = structuredClone(release);
  wrongArchive.fixture.sha256 = '0'.repeat(64);
  await assert.rejects(fetchArtifacts({ release: wrongArchive, out, fetchImpl: download }), /Checksum mismatch/);
  assert.equal(await fs.readFile(path.join(out, 'previous.txt'), 'utf8'), 'keep until verified');
  for (const key of ['lean.wasm', 'slim/lean.js', 'snapshots/init.snap']) {
    const wrongRuntime = structuredClone(release);
    wrongRuntime.objects[key] = digest('wrong runtime');
    await assert.rejects(fetchArtifacts({ release: wrongRuntime, out, fetchImpl: download }), /Checksum mismatch/);
    assert.equal(await fs.readFile(path.join(out, 'previous.txt'), 'utf8'), 'keep until verified');
  }
  await fetchArtifacts({ release, out, fetchImpl: download });
  await verifyFixture(out, release);
  assert.equal(JSON.parse(await fs.readFile(path.join(out, 'bin/package.json'), 'utf8')).type, 'commonjs');
  await assert.rejects(fs.stat(path.join(out, 'previous.txt')), /ENOENT/);
});
