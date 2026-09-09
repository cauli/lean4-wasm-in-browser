// 🤖 Shared pin and checksum checks for release builds, fixtures, and R2 uploads.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const releaseFile = new URL('./runtime-release.json', import.meta.url);
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hashPattern = /^[a-f0-9]{64}$/;
const objectPattern = /^(?:slim\/)?(?:lean\.(?:js|wasm)|snapshots\/[a-zA-Z0-9._-]+\.snap)$/;

export function validateDigest(value, label) {
  if (!value || typeof value.sha256 !== 'string' || value.sha256.length !== 64 || !hashPattern.test(value.sha256)
      || !Number.isSafeInteger(value.bytes) || value.bytes <= 0) {
    throw new Error(`${label}: expected SHA-256 and positive byte count`);
  }
}

export function validateRelease(release) {
  if (release.schemaVersion !== 1 || release.leanCommit?.length !== 40 || !/^[a-f0-9]{40}$/.test(release.leanCommit)
      || !/^\d+\.\d+\.\d+$/.test(release.emscriptenVersion)) {
    throw new Error('Invalid runtime release schema or toolchain pin');
  }
  if (!release.assetVersion?.startsWith(`${release.leanCommit}-`)
      || /[^a-zA-Z0-9._-]/.test(release.assetVersion)) {
    throw new Error('Asset version must include the exact Lean commit and a release suffix');
  }
  if (!release.objects || Array.isArray(release.objects)) throw new Error('Missing release objects');
  for (const required of ['lean.js', 'lean.wasm', 'slim/lean.js', 'slim/lean.wasm']) {
    if (!Object.hasOwn(release.objects, required)) throw new Error(`Missing release object: ${required}`);
  }
  for (const [key, descriptor] of Object.entries(release.objects)) {
    if (key.trim() !== key || !objectPattern.test(key)) throw new Error(`Invalid release object key: ${key}`);
    validateDigest(descriptor, key);
  }
  validateDigest(release.fixture, 'fixture');
  const url = new URL(release.fixture.url);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Fixture URL must use HTTPS without credentials');
  }
  if (release.staticAssets !== undefined) {
    validateDigest(release.staticAssets, 'staticAssets');
    const staticUrl = new URL(release.staticAssets.url);
    if (staticUrl.protocol !== 'https:' || staticUrl.username || staticUrl.password) {
      throw new Error('Static asset URL must use HTTPS without credentials');
    }
  }
  return release;
}

export function assertReleaseEnvironment(release, env = process.env) {
  const expectedTag = release.assetVersion.slice(release.leanCommit.length + 1);
  if (env.LEAN_ASSET_TAG !== undefined && env.LEAN_ASSET_TAG !== expectedTag) {
    throw new Error(`LEAN_ASSET_TAG conflicts with pinned release ${release.assetVersion}`);
  }
  if (env.VITE_LEAN_ASSET_VERSION !== undefined
      && env.VITE_LEAN_ASSET_VERSION !== release.assetVersion) {
    throw new Error(`VITE_LEAN_ASSET_VERSION conflicts with pinned release ${release.assetVersion}`);
  }
  if (env.PAGES_ASSETS_URL !== undefined && env.PAGES_ASSETS_URL !== release.staticAssets?.url) {
    throw new Error('PAGES_ASSETS_URL conflicts with the pinned static bundle');
  }
  if (env.LEAN_ARTIFACTS_URL !== undefined && env.LEAN_ARTIFACTS_URL !== release.fixture.url) {
    throw new Error('LEAN_ARTIFACTS_URL conflicts with the pinned fixture');
  }
}

export function loadRelease(file = releaseFile, env = process.env) {
  const release = validateRelease(JSON.parse(fs.readFileSync(file, 'utf8')));
  assertReleaseEnvironment(release, env);
  return release;
}

export async function fileDigest(file) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest('hex'), bytes };
}

export async function verifyFile(file, expected) {
  const actual = await fileDigest(file);
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(`Checksum mismatch for ${file}: expected ${expected.sha256} (${expected.bytes} bytes), got ${actual.sha256} (${actual.bytes} bytes)`);
  }
  return actual;
}

export async function verifyInit(file, release) {
  const handle = await fsp.open(file, 'r');
  const header = Buffer.alloc(120);
  try { await handle.read(header, 0, header.length, 0); } finally { await handle.close(); }
  const commit = header.toString('latin1').match(/[a-f0-9]{40}/)?.[0];
  if (commit !== release.leanCommit) {
    throw new Error(`Init.olean Lean commit ${commit ?? '(missing)'} does not match ${release.leanCommit}`);
  }
}

export async function verifyRuntime(root, release, keys = Object.keys(release.objects)) {
  for (const key of keys) {
    if (!Object.hasOwn(release.objects, key)) throw new Error(`Unpinned release object: ${key}`);
    await verifyFile(path.join(root, key), release.objects[key]);
  }
}

export async function verifyFixture(root, release) {
  for (const key of ['lean.js', 'lean.wasm']) {
    await verifyFile(path.join(root, 'bin', key), release.objects[key]);
  }
  await verifyInit(path.join(root, 'lib/lean/Init.olean'), release);
  await verifyRuntime(path.join(root, 'runtime'), release);
}

export async function buildVersion(root, release) {
  await verifyInit(path.join(root, 'lean-lib/Init.olean'), release);
  return release.assetVersion;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = loadRelease();
  const [command, root = path.join(repoRoot, 'public/lean-wasm')] = process.argv.slice(2);
  if (command === 'version') console.log(release.assetVersion);
  else if (command === 'build-version') console.log(await buildVersion(root, release));
  else if (command === 'verify-runtime') await verifyRuntime(root, release);
  else if (command === 'verify-fixture') await verifyFixture(root, release);
  else throw new Error('Usage: node deploy/runtime-release.mjs version|build-version|verify-runtime|verify-fixture [root]');
}
