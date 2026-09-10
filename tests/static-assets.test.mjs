import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { verifyCore, fetchStaticAssets } from '../deploy/static-assets.mjs';
import { createHash } from 'node:crypto';

const commit = 'a'.repeat(40);
async function stage(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-static-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  for (const dir of ['lean-lib', 'core-lib', 'real-analysis-lib']) await fs.mkdir(path.join(source, dir), { recursive: true });
  await fs.writeFile(path.join(source, 'lean-lib/Init.olean'), commit);
  await fs.writeFile(path.join(source, 'core-lib/artifacts-000.pack'), 'core');
  await fs.writeFile(path.join(source, 'core-layer.json'), JSON.stringify({ leanCommit: commit, packs: [{ file: 'artifacts-000.pack', compressedBytes: 4 }] }));
  return { root, source };
}

test('packed core checks missing packs, exact size, and the Init Lean commit', async (t) => {
  const { source } = await stage(t);
  await verifyCore(source);
  await fs.writeFile(path.join(source, 'core-lib/artifacts-000.pack'), 'wrong size');
  await assert.rejects(verifyCore(source), /size mismatch/);
  await fs.rm(path.join(source, 'core-lib/artifacts-000.pack'));
  await assert.rejects(verifyCore(source), /ENOENT/);
  await fs.writeFile(path.join(source, 'lean-lib/Init.olean'), 'b'.repeat(40));
  await assert.rejects(verifyCore(source), /does not match/);
});

test('Pages packer includes the validated core manifest and packs, never runtime binaries', async (t) => {
  const { root, source } = await stage(t);
  for (const file of ['lean-lib-files.json', 'real-analysis-layer.json', 'manifold-layer.json']) {
    await fs.writeFile(path.join(source, file), '{}');
  }
  for (const world of ['homeomorphisms', 'local-charts', 'charted-spaces', 'canonical-charts', 'smooth-manifolds', 'tangent-spaces', 'map-projections', 'circle-motion', 'robot-arm', 'robot-reachability', 'course']) {
    await fs.writeFile(path.join(source, `manifold-${world}-layer.json`), '{}');
    await fs.mkdir(path.join(source, `manifold-${world}-lib`));
    await fs.writeFile(path.join(source, `manifold-${world}-lib/artifacts-000.pack`), 'pack');
  }
  await fs.writeFile(path.join(source, 'lean.wasm'), 'must not ship in static bundle');
  const archive = path.join(root, 'static.tar.gz');
  execFileSync('bash', ['deploy/pack-pages-assets.sh', archive], { env: { ...process.env, PAGES_ASSET_ROOT: source }, stdio: 'pipe' });
  const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).split('\n');
  assert.ok(names.includes('./core-layer.json'));
  assert.ok(names.includes('./core-lib/artifacts-000.pack'));
  assert.ok(names.includes('./lean-lib/Init.olean'));
  assert.ok(!names.includes('./lean.wasm'));
  await fs.rm(path.join(source, 'core-lib/artifacts-000.pack'));
  assert.throws(() => execFileSync('bash', ['deploy/pack-pages-assets.sh', path.join(root, 'bad.tar.gz')], { env: { ...process.env, PAGES_ASSET_ROOT: source }, stdio: 'pipe' }));
});

test('static fetch checks the archive digest before extraction and refuses stale destinations', async (t) => {
  const { root, source } = await stage(t);
  const archive = path.join(root, 'static.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', source, '.']);
  const bytes = await fs.readFile(archive);
  const release = {
    leanCommit: commit,
    staticAssets: { url: 'https://example.test/static.tar.gz', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length },
  };
  const out = path.join(root, 'out');
  const fetchImpl = async () => new Response(bytes);
  const corrupt = structuredClone(release);
  corrupt.staticAssets.sha256 = '0'.repeat(64);
  await assert.rejects(fetchStaticAssets({ release: corrupt, out, fetchImpl }), /Checksum mismatch/);
  await assert.rejects(fs.stat(out), /ENOENT/);
  await fetchStaticAssets({ release, out, fetchImpl });
  await verifyCore(out);
  await assert.rejects(fetchStaticAssets({ release, out, fetchImpl }), /not empty/);
});
