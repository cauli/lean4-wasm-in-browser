#!/usr/bin/env node
// Copyright (c) 2026 cauli. All rights reserved.
// Released under Apache 2.0 license as described in the file LICENSE.
// 🤖 Snapshot-only gate. This does not test game startup, which imports core packs.
// Usage: node scripts/check-snapshot-restoration.mjs --origin http://127.0.0.1:5177 --output /tmp/snapshot-gate.json
// Start the real server separately. Full then slim run in separate Chromium processes.
// No rebake, library fallback, artifact interception, retries, or publication.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { fileDigest, releaseFile, repoRoot, validateDigest } from '../deploy/runtime-release.mjs';

export function variantPlan(origin, variant, release) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
      || base.pathname !== '/' || base.search || base.hash) throw new Error('Use an HTTP(S) origin without a path or credentials');
  if (!['full', 'slim'].includes(variant)) throw new Error('Unknown snapshot variant');
  if (release.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(release.leanCommit)
      || release.emscriptenVersion !== '4.0.22'
      || !release.assetVersion?.startsWith(`${release.leanCommit}-`)
      || /[^a-zA-Z0-9._-]/.test(release.assetVersion)) throw new Error('Invalid pinned snapshot runtime identity');
  // 🤖 Snapshot tests need these object pins, not a Node fixture/static archive.
  for (const prefix of ['', 'slim/']) {
    for (const name of ['lean.js', 'lean.wasm', 'snapshots/init.snap']) validateDigest(release.objects?.[prefix + name], prefix + name);
  }
  const prefix = variant === 'slim' ? 'slim/' : '';
  const assetBase = `/lean-wasm/${prefix}`.replace(/\/$/, '');
  const objects = ['lean.js', 'lean.wasm', 'snapshots/init.snap'].map((name) => ({
    key: prefix + name,
    url: `${base.origin}${assetBase}/${name}?v=${encodeURIComponent(release.assetVersion)}`,
    ...release.objects[prefix + name],
  }));
  const worker = new URL('/lean-worker-persistent.worker.js', base);
  worker.searchParams.set('assetBase', assetBase);
  worker.searchParams.set('v', release.assetVersion);
  return {
    variant, origin: base.origin, objects, workerUrl: worker.href,
    hostUrl: new URL('/lean-worker-persistent.html', base).href,
    snapshotUrl: objects[2].url, expectedSnapshotBytes: objects[2].bytes,
    validCode: 'theorem snapshot_gate_valid (n : Nat) : n + 0 = n := by rfl\n#check snapshot_gate_valid',
    invalidCode: 'theorem snapshot_gate_invalid : (0 : Nat) = 1 := by rfl',
  };
}

export async function verifyServedFile(url, expected, fetchImpl = fetch, timeoutMs = 900000) {
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  if (response.status !== 200 || !response.body) throw new Error(`Served preflight status ${response.status}: ${url}`);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > expected.bytes) throw new Error(`Served object exceeds pinned byte count: ${url}`);
    hash.update(chunk);
  }
  const sha256 = hash.digest('hex');
  if (bytes !== expected.bytes || sha256 !== expected.sha256) throw new Error(`Served checksum mismatch: ${url}`);
  return { url, bytes, sha256, headers: Object.fromEntries(response.headers), status: response.status };
}

// 🤖 This function runs unchanged in page.evaluate and has no Node dependencies.
export function snapshotSession({ workerUrl, snapshotUrl, expectedSnapshotBytes, timeoutMs, validCode, invalidCode }) {
  return new Promise((resolve) => {
    const record = { emptyLibrary: false, received: 0 };
    let phase = 'boot';
    let output = [];
    let finished = false;
    const worker = new Worker(workerUrl);
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...record, phase, ...(error ? { error } : {}) });
    };
    const timer = setTimeout(() => finish(`Snapshot gate timeout in ${phase}`), timeoutMs);
    worker.onerror = (event) => finish(`Worker error: ${event.message}`);
    worker.onmessageerror = () => finish('Worker message could not be decoded');
    worker.onmessage = ({ data: message }) => {
      if (finished) return;
      if (message.type === 'error') return finish(`Worker error: ${message.data}`);
      if (message.type === 'stdout' || message.type === 'stderr') {
        output.push(String(message.data));
        if (output.length > 5000) finish('Worker output exceeded the diagnostic limit');
      } else if (message.type === 'worker_boot' && phase === 'boot') {
        phase = 'library';
        record.emptyLibrary = true;
        worker.postMessage({ type: 'load_library', files: [] });
      } else if (message.type === 'library_received' && phase === 'library') {
        phase = 'initialize';
        worker.postMessage({ type: 'start_worker' });
      } else if (message.type === 'worker_ready' && phase === 'initialize') {
        phase = 'snapshot';
        worker.postMessage({ type: 'load_snapshot', name: 'init.snap', url: snapshotUrl });
      } else if (message.type === 'snapshot_progress') {
        record.received = message.received;
      } else if (message.type === 'snapshot_loaded' && phase === 'snapshot') {
        record.snapshot = message;
        record.startupOutput = output;
        output = [];
        if (message.success !== true) return finish(`Snapshot restoration failed: ${message.error || 'runtime rejected snapshot'}`);
        if (record.received !== expectedSnapshotBytes) return finish('Snapshot download byte count differs from the release pin');
        phase = 'valid';
        worker.postMessage({ type: 'compile', code: validCode, path: '/workspace/snapshot-valid.lean' });
      } else if (message.type === 'compile_result' && ['valid', 'invalid'].includes(phase)) {
        record[phase] = { result: message, output };
        output = [];
        if (phase === 'valid') {
          phase = 'invalid';
          worker.postMessage({ type: 'compile', code: invalidCode, path: '/workspace/snapshot-invalid.lean' });
        } else {
          phase = 'complete';
          finish();
        }
      }
    };
  });
}

export function validateSession(session, expectedSnapshotBytes) {
  if (session.error) throw new Error(session.error);
  if (!session.emptyLibrary || session.snapshot?.success !== true || session.received !== expectedSnapshotBytes) {
    throw new Error('Snapshot success, empty library, and complete pinned download are required');
  }
  const diagnostics = (entry) => (entry?.output || []).flatMap((text) => text.split('\n')).flatMap((line) => {
    try { const value = JSON.parse(line); return typeof value.severity === 'string' ? [value] : []; } catch { return []; }
  });
  const valid = diagnostics(session.valid);
  const invalid = diagnostics(session.invalid);
  if (session.valid?.result.success !== true || valid.some((d) => d.severity === 'error')
      || !valid.some((d) => String(d.data ?? d.caption ?? '').includes('snapshot_gate_valid'))) {
    throw new Error('Valid theorem was not demonstrably accepted after restoration');
  }
  // 🤖 compile_result.success is the IO result, not Lean proof acceptance.
  if (session.invalid?.result.success !== true || !invalid.some((d) => d.severity === 'error')) {
    throw new Error('Invalid theorem must produce Lean error diagnostics, not an IO failure');
  }
}

export function verifyRequests(plan, { responses, failed }) {
  const expected = new Set(plan.objects.map(({ url }) => url));
  const runtimeRequest = (url) => new URL(url).pathname.startsWith('/lean-wasm/');
  for (const response of responses.filter((r) => runtimeRequest(r.url))) {
    if (!expected.has(response.url)) throw new Error(`Unexpected runtime/library request: ${response.url}`);
    if (response.status !== 200) throw new Error(`Browser runtime status ${response.status}: ${response.url}`);
  }
  for (const url of expected) if (!responses.some((r) => r.url === url)) throw new Error(`Missing browser request: ${url}`);
  if (failed.some((r) => runtimeRequest(r.url))) throw new Error('Browser runtime request failed');
}

async function runVariant(plan, result, timeoutMs) {
  result.preflight = [];
  // 🤖 Stream HTTP bodies in Node before Chromium to avoid CDP copies of 240MB snapshots.
  // Browser request evidence below uses the same URLs; no response is mocked or replaced.
  for (const object of plan.objects) result.preflight.push(await verifyServedFile(object.url, object, fetch, timeoutMs));
  const localWorker = await fileDigest(path.join(repoRoot, 'public/lean-worker-persistent.worker.js'));
  result.worker = await verifyServedFile(new URL('/lean-worker-persistent.worker.js', plan.origin).href, localWorker, fetch, timeoutMs);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  result.browserVersion = browser.version();
  result.responses = [];
  result.failed = [];
  result.console = [];
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    context.on('response', (response) => result.responses.push({ url: response.url(), status: response.status(), headers: response.headers() }));
    context.on('requestfailed', (request) => result.failed.push({ url: request.url(), error: request.failure()?.errorText }));
    const page = await context.newPage();
    page.on('console', (message) => { if (result.console.length < 2000) result.console.push(message.text().slice(0, 4000)); });
    page.on('pageerror', (error) => result.console.push(`pageerror: ${error.message}`));
    // 🤖 The served legacy host page is inert until messaged. Only our real Worker starts.
    const response = await page.goto(plan.hostUrl, { waitUntil: 'load', timeout: 60000 });
    if (response?.status() !== 200 || new URL(page.url()).origin !== plan.origin) throw new Error('Snapshot host page was not served from the requested origin');
    if (!await page.evaluate(() => crossOriginIsolated)) throw new Error('Served host page is not cross-origin isolated');
    result.session = await page.evaluate(snapshotSession, { ...plan, timeoutMs });
    validateSession(result.session, plan.expectedSnapshotBytes);
    verifyRequests(plan, result);
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    origin: { type: 'string' }, output: { type: 'string' }, variant: { type: 'string', default: 'both' },
    'timeout-ms': { type: 'string', default: '900000' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('Usage: node scripts/check-snapshot-restoration.mjs --origin <served-origin> --output <new-report.json> [--variant both|full|slim] [--timeout-ms 900000]');
    console.log('No server/build/bake is started. Actual served objects must match deploy/runtime-release.json. Full/slim use separate Chromium processes, empty libraries, and existing snapshots. This is not iOS/WebKit or game-startup validation.');
    return 0;
  }
  if (!values.origin || !values.output || !['both', 'full', 'slim'].includes(values.variant)) throw new Error('Require --origin, --output, and variant both|full|slim');
  const timeoutMs = Number(values['timeout-ms']);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3600000) throw new Error('timeout-ms must be 1000 through 3600000');
  const release = JSON.parse(await fs.readFile(releaseFile, 'utf8'));
  for (const key of ['VITE_LEAN_ASSET_VERSION', 'LEAN_ASSET_TAG']) {
    const expected = key === 'LEAN_ASSET_TAG' ? release.assetVersion.slice(release.leanCommit.length + 1) : release.assetVersion;
    if (process.env[key] !== undefined && process.env[key] !== expected) throw new Error(`${key} conflicts with the snapshot release pin`);
  }
  const variants = values.variant === 'both' ? ['full', 'slim'] : [values.variant];
  const plans = variants.map((variant) => variantPlan(values.origin, variant, release));
  const report = {
    schemaVersion: 1, kind: 'served-classic-worker-init-snapshot-restoration', startedAt: new Date().toISOString(),
    webCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
    webWorktreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim()),
    gateDigest: await fileDigest(fileURLToPath(import.meta.url)),
    release, manifestDigest: await fileDigest(fileURLToPath(releaseFile)), origin: plans[0].origin,
    limits: ['Chromium desktop, including slim on desktop; not iOS/WebKit', 'Node streams served-byte checks before the browser; browser records URLs/headers and snapshot byte progress, not a second SHA256', 'No library files or core packs supplied; no game startup tested', 'No snapshot rebake or fallback; one attempt per variant'],
    variants: [], passed: false,
  };
  const output = path.resolve(values.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  for (const plan of plans) {
    const result = { variant: plan.variant, plan, passed: false, startedAt: new Date().toISOString() };
    report.variants.push(result);
    console.log(`Snapshot gate: ${plan.variant} at ${plan.snapshotUrl}`);
    try { await runVariant(plan, result, timeoutMs); result.passed = true; }
    catch (error) { result.error = error.stack || String(error); }
    result.finishedAt = new Date().toISOString();
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${plan.variant}: ${result.passed ? 'PASS' : `FAIL: ${result.error}`}`);
  }
  report.passed = report.variants.every((result) => result.passed);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`Local report: ${output}`);
  return report.passed ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error.stack || String(error)); process.exitCode = 1; }
}
