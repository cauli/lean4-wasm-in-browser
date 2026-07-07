// Integration tests for the Lean WASM playground compiler, run headless in Node
// (no browser) via `node --test`. Boots the real Lean WASM binary once, then
// compiles each case and asserts on the JSON diagnostics it emits.
//
// Artifact locations (override with env vars for CI, which fetches the deployed
// build into a temp dir):
//   LEAN_ROOT  dir holding bin/lean.js + lib/lean/**   (default: local symlinks)
//   LEAN_WASM  the 2GB-patched lean.wasm               (default: public/lean-wasm)

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases } from './cases.mjs';
import { bootLean } from './lean-node.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(repoRoot, 'public/lean-wasm');
const fetched = path.join(repoRoot, 'tests/.artifacts'); // populated by fetch-artifacts.mjs (CI)
const haveFetched = fs.existsSync(path.join(fetched, 'bin/lean.js'));

// Prefer fetched artifacts (CI, or after `node tests/fetch-artifacts.mjs`); fall
// back to the local dev symlinks under public/lean-wasm.
const root = process.env.LEAN_ROOT || (haveFetched ? fetched : path.dirname(path.dirname(fs.realpathSync(path.join(pub, 'lean.js')))));
const wasmPath = process.env.LEAN_WASM || (haveFetched ? path.join(fetched, 'bin/lean.wasm') : fs.realpathSync(path.join(pub, 'lean.wasm')));

let lean;

before(async () => {
  lean = await bootLean({ root, wasmPath });
}, { timeout: 240_000 }); // cold boot + one-time Init import (~45s), plus headroom

for (const c of cases) {
  test(c.name, () => {
    const { diagnostics } = lean.compile(c.code);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    if (c.expect === 'ok') {
      assert.equal(errors.length, 0, 'unexpected errors:\n' + errors.map((e) => e.data || e.caption).join('\n'));
    } else if (c.expect === 'error') {
      assert.ok(errors.length > 0, 'expected an error diagnostic, got none');
    } else if (c.expect?.has) {
      const hit = diagnostics.some((d) => JSON.stringify(d).includes(c.expect.has));
      assert.ok(hit, `no diagnostic contained "${c.expect.has}":\n` + diagnostics.map((d) => d.data).join('\n'));
    } else {
      throw new Error(`case "${c.name}" has an unknown expectation`);
    }
  });
}
