#!/usr/bin/env node
// 🤖 Run one Real Analysis reference against a running local or hosted release.
// 🤖 Observe startup script sources through CDP. Never evaluate any pthread.
// 🤖 Usage: RELEASE_BASE_URL=http://127.0.0.1:5177 node scripts/check-release-browser.mjs
// 🤖 Light checks only: node scripts/check-release-browser.mjs --self-test
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadRelease } from '../deploy/runtime-release.mjs';

const digest = (body) => ({ sha256: createHash('sha256').update(body).digest('hex'), bytes: Buffer.byteLength(body) });
function deadline(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
function checkDigest(actual, expected, label) {
  assert.equal(actual.sha256, expected.sha256, `${label}: SHA-256 differs`);
  assert.equal(actual.bytes, expected.bytes, `${label}: byte count differs`);
}
function checkWorkerIdentity(workers, release, base) {
  assert.equal(workers.length, 5, 'Expected one host and exactly four pthread workers');
  assert.equal(new Set(workers.map((worker) => worker.targetId)).size, 5, 'Duplicate worker targets');
  const hosts = workers.filter((worker) => worker.role === 'host');
  assert.equal(hosts.length, 1, 'Expected exactly one persistent host worker');
  assert.equal(workers.filter((worker) => worker.role === 'pthread').length, 4, 'Expected four pthread workers');
  const expectedScript = new URL(`/lean-wasm/lean.js?v=${release.assetVersion}`, base).href;
  const hostUrl = new URL(hosts[0].targetUrl);
  assert.equal(hostUrl.origin, new URL(base).origin);
  assert.equal(hostUrl.pathname, '/lean-worker-persistent.worker.js');
  assert.deepEqual(hostUrl.searchParams.getAll('v'), [release.assetVersion]);
  assert.equal(new URL(hostUrl.searchParams.get('assetBase') || '/lean-wasm', base).href, new URL('/lean-wasm', base).href);
  for (const worker of workers) {
    assert.equal(worker.scriptUrl, expectedScript, `${worker.role}: wrong runtime script URL`);
    checkDigest(worker.source, release.objects['lean.js'], worker.targetId);
    if (worker.role === 'pthread') assert.equal(worker.targetUrl, expectedScript, 'Wrong pthread entry URL');
  }
}
function checkReference(results, firstId) {
  assert.equal(results.length, 1, 'The smoke must run exactly one reference, not the full matrix');
  assert.equal(results[0].id, firstId);
  const result = results[0].result;
  assert.equal(result.success, true, result.detail);
  assert.equal(result.kind, 'verified', 'Expected a kernel verification result');
  assert.equal(result.headline, 'Proof accepted by the local Lean kernel.');
  assert.ok(Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0, 'Missing kernel elapsed time');
  assert.ok(result.stages.some((stage) => stage.label === 'Kernel' && stage.state === 'passed'));
  assert.ok(Array.isArray(result.diagnostics), 'Kernel diagnostics must be present, even when empty');
  assert.ok(!result.diagnostics.some((item) => item.severity === 'error'
    || /declaration uses 'sorry'|declaration has metavariables/i.test(item.message)));
}

// 🤖 Public CDPSession cannot address arbitrary nested session IDs directly.
// 🤖 Tunnel non-flattened CDP messages, preserving the worker's real script URLs.
function childSession(parent, sessionId) {
  const events = new EventEmitter();
  const pending = new Map();
  let nextId = 0;
  parent.on('Target.receivedMessageFromTarget', (event) => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    if (message.id) {
      const operation = pending.get(message.id);
      if (!operation) return;
      pending.delete(message.id);
      if (message.error) operation.reject(new Error(JSON.stringify(message.error)));
      else operation.resolve(message.result);
    } else events.emit(message.method, message.params);
  });
  events.send = (method, params = {}) => {
    const id = ++nextId;
    const response = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      parent.send('Target.sendMessageToTarget', {
        sessionId, message: JSON.stringify({ id, method, params }),
      }).catch(reject);
    });
    return deadline(response, 20_000, method).finally(() => pending.delete(id));
  };
  return events;
}

async function observeWorkers(pageSession, report) {
  let rejectFailure;
  const failure = new Promise((_, reject) => { rejectFailure = reject; });
  const jobs = new Set();
  const run = (promise) => {
    const observed = promise.catch((error) => {
      report.observationErrors.push(String(error.stack || error));
      rejectFailure(error);
    }).finally(() => jobs.delete(observed));
    jobs.add(observed);
  };
  const attach = (parent) => {
    parent.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
      run((async () => {
        const session = childSession(parent, sessionId);
        attach(session);
        const pathname = new URL(targetInfo.url || 'about:blank').pathname;
        const role = pathname === '/lean-worker-persistent.worker.js' ? 'host'
          : /\/lean\.js$/.test(pathname) ? 'pthread' : null;
        if (targetInfo.type !== 'worker' || !role) {
          await session.send('Runtime.runIfWaitingForDebugger');
          return;
        }
        const record = { targetId: targetInfo.targetId, targetUrl: targetInfo.url, role };
        report.workers.push(record);
        let capture;
        // 🤖 Debugger.enable replays an initial pthread script that may already
        // 🤖 be parsed. A beforeScriptExecution breakpoint can miss that script.
        session.on('Debugger.scriptParsed', (script) => {
          record.parsedScriptCount = (record.parsedScriptCount || 0) + 1;
          if (capture || !/\/lean\.js(?:\?|$)/.test(script.url)) return;
          record.sourceReadStarted = true;
          capture = (async () => {
            const { scriptSource } = await session.send('Debugger.getScriptSource', { scriptId: script.scriptId });
            record.scriptUrl = script.url;
            record.source = digest(scriptSource);
            record.sourceObservation = 'Debugger.scriptParsed';
            await session.send('Debugger.disable');
            record.debuggerDisabled = true;
          })();
          run(capture);
        });
        await session.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: false });
        await session.send('Debugger.enable');
        record.debuggerEnabled = true;
        // 🤖 Capture replayed source before releasing startup. No evaluation or
        // 🤖 pause request is sent to a pthread that can enter a native Task.
        if (capture) await capture;
        await session.send('Runtime.runIfWaitingForDebugger');
        record.startupReleased = true;
      })());
    });
  };
  attach(pageSession);
  await pageSession.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: false });
  return { failure, settle: () => Promise.all([...jobs]) };
}

async function streamedDigest(body) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of body) {
    hash.update(chunk);
    bytes += chunk.byteLength;
  }
  return { sha256: hash.digest('hex'), bytes };
}
async function wasmPreflight(url, expected, fetchImpl = fetch) {
  // 🤖 This is a separate HTTP request, NOT a hash of the browser's response.
  // 🤖 Streaming avoids the inspector cache eviction seen with the 100 MB WASM.
  const response = await fetchImpl(url, {
    redirect: 'error', signal: AbortSignal.timeout(60_000), headers: { 'accept-encoding': 'identity' },
  });
  assert.equal(response.status, 200, 'WASM HTTP preflight failed');
  assert.ok(response.body, 'WASM HTTP preflight returned no body');
  const body = await streamedDigest(response.body);
  checkDigest(body, expected, 'Separate HTTP WASM preflight');
  return { kind: 'separate-streamed-http-preflight', url, status: response.status, headers: Object.fromEntries(response.headers), body };
}

async function smoke() {
  assert.ok(process.env.RELEASE_BASE_URL, 'Set RELEASE_BASE_URL to the local server or intended hosted preview');
  const base = new URL(process.env.RELEASE_BASE_URL);
  assert.ok(['http:', 'https:'].includes(base.protocol));
  assert.ok(!base.username && !base.password, 'Base URL must not include credentials');
  const release = loadRelease();
  const timeout = Number(process.env.RELEASE_BROWSER_TIMEOUT_MS || 900_000);
  assert.ok(Number.isSafeInteger(timeout) && timeout > 0);
  const output = path.resolve(process.env.RELEASE_BROWSER_OUTPUT
    || `/tmp/lean-compact-release/browser-${base.host.replace(/[^a-zA-Z0-9.-]/g, '-')}.json`);
  const game = JSON.parse(await readFile(new URL('../src/game/real-analysis.generated.json', import.meta.url), 'utf8'));
  const firstId = game.worlds.flatMap((world) => world.levels)[0].id;
  const report = {
    startedAt: new Date().toISOString(), baseUrl: base.href, assetVersion: release.assetVersion,
    leanCommit: release.leanCommit, workers: [], runtimeResponses: [], runtimeWarmups: [], realAnalysisFetches: [],
    wasmIdentityEvidence: 'Separate HTTP body hash plus actual browser request URL/status/headers; no browser response-body hash.',
    observationErrors: [], pageErrors: [], passed: false,
  };
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const networkJobs = [];
    const requests = new Map();
    context.on('requestfinished', (request) => {
      const record = requests.get(request);
      if (record) { record.events.push('requestfinished'); record.finished = true; }
    });
    context.on('requestfailed', (request) => {
      const record = requests.get(request);
      if (record) { record.events.push('requestfailed'); record.requestFailure = request.failure(); }
    });
    context.on('response', (response) => {
      const url = new URL(response.url());
      const runtime = /\/lean\.(js|wasm)$/.test(url.pathname);
      const analysisPack = /\/real-analysis-lib\/artifacts-[^/]+\.pack$/.test(url.pathname);
      if (!runtime && !analysisPack) return;
      const record = { url: url.href, status: response.status(), headers: response.headers(), fromServiceWorker: response.fromServiceWorker(), events: ['response'] };
      requests.set(response.request(), record);
      // 🤖 An unconsumed JS warm-up/preload may never emit requestfinished.
      // 🤖 Its response is not a worker identity and must not hold this gate open.
      if (url.pathname.endsWith('/lean.js') && !url.searchParams.has('v')) {
        report.runtimeWarmups.push(record);
        return;
      }
      (runtime ? report.runtimeResponses : report.realAnalysisFetches).push(record);
      if (url.pathname.endsWith('/lean.js')) return;
      networkJobs.push(deadline(response.finished(), 60_000, `Response completion: ${url.href}`)
        .then((failure) => {
          if (failure) throw failure;
          record.finished = true;
          record.events.push('response.finished');
        }).catch((error) => { record.error = String(error); }));
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.pageErrors.push(String(error)));
    const cdp = await context.newCDPSession(page);
    const observation = await observeWorkers(cdp, report);
    await deadline(Promise.race([observation.failure, (async () => {
      const expectedWasm = new URL(`/lean-wasm/lean.wasm?v=${release.assetVersion}`, base).href;
      report.wasmPreflight = await wasmPreflight(expectedWasm, release.objects['lean.wasm']);
      // 🤖 One fresh page/context and one [0, 1) reference call. No tracked report is updated.
      await page.goto(new URL('/games/real-analysis-game?conformance=1&variant=full', base).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      report.crossOriginIsolated = await page.evaluate(() => crossOriginIsolated);
      assert.equal(report.crossOriginIsolated, true, 'Shared-memory isolation is required');
      await page.waitForFunction(() => Boolean(window.__leanGameConformance?.runRealAnalysisReferences), null, { timeout: 60_000 });
      report.references = await page.evaluate(() => window.__leanGameConformance.runRealAnalysisReferences('regular', { start: 0, end: 1 }));
      checkReference(report.references, firstId);
      await observation.settle();
      await Promise.all(networkJobs);
      checkWorkerIdentity(report.workers, release, base);
      const wasm = report.runtimeResponses.filter((response) => new URL(response.url).pathname.endsWith('/lean.wasm'));
      assert.ok(wasm.length > 0, 'No actual WASM response was observed');
      for (const response of wasm) {
        assert.equal(response.url, expectedWasm);
        assert.equal(response.status, 200);
        assert.equal(response.error, undefined);
        assert.equal(response.finished, true, 'Pinned browser WASM response did not finish');
        assert.equal(response.fromServiceWorker, false);
        assert.match(response.headers['content-type'] || '', /^application\/wasm(?:;|$)/);
      }
      assert.ok(report.realAnalysisFetches.some((response) => response.status === 200 && response.finished && !response.error
        && !response.fromServiceWorker && new URL(response.url).origin === base.origin), 'No completed same-origin Real Analysis package fetch');
      assert.deepEqual(report.pageErrors, []);
      assert.deepEqual(report.observationErrors, []);
      report.passed = true;
    })()]), timeout, 'Release browser smoke');
  } catch (error) {
    report.error = String(error.stack || error);
    process.exitCode = 1;
  } finally {
    await deadline(browser.close(), 30_000, 'Browser cleanup').catch((error) => {
      report.cleanupError = String(error);
      report.passed = false;
      process.exitCode = 1;
    });
    report.finishedAt = new Date().toISOString();
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ passed: report.passed, output, workers: report.workers.length, reference: firstId, error: report.error }));
  }
}

async function selfTest() {
  const release = { assetVersion: 'test-release', objects: { 'lean.js': digest('actual glue') } };
  const base = 'https://preview.example.test';
  const scriptUrl = `${base}/lean-wasm/lean.js?v=test-release`;
  const workers = Array.from({ length: 5 }, (_, index) => ({
    role: index ? 'pthread' : 'host', targetId: String(index), scriptUrl, source: digest('actual glue'),
    targetUrl: index ? scriptUrl : `${base}/lean-worker-persistent.worker.js?assetBase=%2Flean-wasm&v=test-release`,
  }));
  checkWorkerIdentity(workers, release, base);
  assert.throws(() => checkWorkerIdentity(workers.slice(0, 4), release, base));
  for (const patch of [{ scriptUrl: scriptUrl.replace('test-release', 'stale') }, { source: digest('wrong glue') }, { targetUrl: scriptUrl.replace('/lean.js', '/slim/lean.js') }]) {
    const wrong = structuredClone(workers);
    Object.assign(wrong[4], patch);
    assert.throws(() => checkWorkerIdentity(wrong, release, base));
  }
  const result = { id: 'first', result: { success: true, kind: 'verified', elapsedMs: 12, headline: 'Proof accepted by the local Lean kernel.', stages: [{ label: 'Kernel', state: 'passed' }], diagnostics: [] } };
  checkReference([result], 'first');
  assert.throws(() => checkReference([result, result], 'first'));
  const bad = structuredClone(result);
  bad.result.diagnostics.push({ severity: 'error', message: 'kernel error' });
  assert.throws(() => checkReference([bad], 'first'));
  const parent = new EventEmitter();
  parent.send = async (method, { sessionId, message }) => {
    assert.equal(method, 'Target.sendMessageToTarget');
    const request = JSON.parse(message);
    queueMicrotask(() => parent.emit('Target.receivedMessageFromTarget', { sessionId, message: JSON.stringify({ id: request.id, result: { scriptSource: 'actual glue' } }) }));
  };
  const child = childSession(parent, 'worker-session');
  assert.deepEqual(await child.send('Debugger.getScriptSource', { scriptId: '1' }), { scriptSource: 'actual glue' });
  const replayParent = new EventEmitter();
  const methods = [];
  replayParent.send = async (method, params) => {
    if (method !== 'Target.sendMessageToTarget') return {};
    const request = JSON.parse(params.message);
    methods.push(request.method);
    if (request.method === 'Debugger.enable') {
      queueMicrotask(() => replayParent.emit('Target.receivedMessageFromTarget', {
        sessionId: params.sessionId,
        message: JSON.stringify({ method: 'Debugger.scriptParsed', params: { scriptId: 'initial', url: scriptUrl } }),
      }));
    }
    const result = request.method === 'Debugger.getScriptSource' ? { scriptSource: 'actual glue' } : {};
    queueMicrotask(() => replayParent.emit('Target.receivedMessageFromTarget', {
      sessionId: params.sessionId, message: JSON.stringify({ id: request.id, result }),
    }));
    return {};
  };
  const replayReport = { workers: [], observationErrors: [] };
  const observation = await observeWorkers(replayParent, replayReport);
  replayParent.emit('Target.attachedToTarget', {
    sessionId: 'initial-pthread', targetInfo: { type: 'worker', targetId: 'initial-pthread', url: scriptUrl },
  });
  await Promise.race([observation.settle(), observation.failure]);
  checkDigest(replayReport.workers[0].source, release.objects['lean.js'], 'Replayed initial pthread script');
  assert.equal(replayReport.workers[0].debuggerDisabled, true);
  assert.ok(methods.indexOf('Debugger.getScriptSource') < methods.indexOf('Runtime.runIfWaitingForDebugger'));
  assert.ok(!methods.some((method) => /evaluate|callFunctionOn|pause|InstrumentationBreakpoint/.test(method)));

  const wasmBytes = Buffer.from('small WASM fixture');
  const preflight = await wasmPreflight(`${base}/lean-wasm/lean.wasm?v=test-release`, digest(wasmBytes), async () => new Response(wasmBytes));
  assert.equal(preflight.kind, 'separate-streamed-http-preflight');
  checkDigest(preflight.body, digest(wasmBytes), 'Streamed preflight');
  await assert.rejects(wasmPreflight(`${base}/wrong`, digest('different'), async () => new Response(wasmBytes)));
  console.log('Release browser smoke light checks passed; no browser launched.');
}

if (process.argv.includes('--self-test')) await selfTest();
else await smoke();
