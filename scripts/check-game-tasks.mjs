import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 🤖 Task checks use only the host worker, never a pthread blocked in native code.
const BASE_URL = process.env.PROFILE_BASE_URL || 'http://127.0.0.1:5177';
const BIN_BASE = process.env.PROFILE_BIN_BASE || '/lean-wasm';
const OUTPUT = process.env.PROFILE_TASK_OUTPUT || '/tmp/lean-memory-profile/task-compatibility.json';
await mkdir(path.dirname(OUTPUT), { recursive: true });
const programs = [
  { name: 'spawn-get', code: '#eval (Task.spawn (fun _ => (42 : Nat))).get\n', expected: '42' },
  { name: 'sixteen-tasks', code: '#eval Id.run do\n  let tasks := (List.range 16).map fun n => Task.spawn fun _ => n + 1\n  return tasks.foldl (fun total task => total + task.get) 0\n', expected: '136' },
];
const results = [];
for (const base of new Set(['/lean-wasm', BIN_BASE])) {
  const browser = await chromium.launch();
  const arm = { base, probes: [] };
  results.push(arm);
  try {
    const context = await browser.newContext();
    await context.addInitScript(base => {
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          const target = new URL(url, location.href);
          if (target.pathname.endsWith('/lean-worker-persistent.worker.js')) target.searchParams.set('assetBase', base);
          super(target, options);
        }
      };
    }, base);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/game/tutorial/1`);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Verify answer' && !b.disabled), null, { timeout: 120000 });
    const worker = page.workers().find(w => w.url().includes('lean-worker-persistent.worker.js'));
    for (const probe of programs) {
      let timer;
      try {
        const result = await Promise.race([
          worker.evaluate(source => {
            const messages = [];
            const original = self.postMessage;
            self.postMessage = function(message, ...args) {
              if (message.type === 'stdout' || message.type === 'stderr') messages.push(message);
              return original.call(self, message, ...args);
            };
            try { return { compile: compileCode(source, '/workspace/TaskCompatibility.lean'), messages }; }
            finally { self.postMessage = original; }
          }, probe.code),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Task compile timed out')), 30000); }),
        ]);
        const diagnostics = result.messages.flatMap(m => m.data.split('\n')).filter(Boolean).map(line => {
          try { return JSON.parse(line); } catch { return { data: line }; }
        });
        const passed = result.compile.success && diagnostics.some(d => d.severity === 'information' && d.data === probe.expected) && !diagnostics.some(d => d.severity === 'error');
        arm.probes.push({ ...probe, passed, result });
        console.log(JSON.stringify({ base, name: probe.name, passed, result }));
        if (!passed) throw new Error('Task result did not match');
      } finally { clearTimeout(timer); }
    }
  } catch (error) { arm.error = String(error.stack || error); }
  finally { await browser.close(); await writeFile(OUTPUT, JSON.stringify(results, null, 2)); }
}
process.exitCode = results.every(a => !a.error && a.probes.length === programs.length && a.probes.every(p => p.passed)) ? 0 : 1;
