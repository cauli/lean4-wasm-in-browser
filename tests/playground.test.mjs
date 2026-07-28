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
import {
  nngInventoryCases,
  nngPolicyProbes,
  nngReferenceCases,
} from './nng-conformance.mjs';

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

test('NNG4 policy rejects direct access to browser-only compatibility axioms', () => {
  assert.equal(nngPolicyProbes.browserAxiom.ok, false);
  assert.match(nngPolicyProbes.browserAxiom.messages.join('\n'), /browser_xyzzy/);
});

for (const policyCase of nngInventoryCases) {
  test(`NNG4 ${policyCase.name}`, () => {
    const { tag, diagnostics } = lean.compile(
      policyCase.challenge.code,
      `nng4/policy/${policyCase.levelId}.lean`,
    );
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    const detail = diagnostics
      .map((diagnostic) => diagnostic.data || diagnostic.caption)
      .filter(Boolean)
      .join('\n');

    if (policyCase.expectation.pass) {
      assert.equal(tag, 0, detail);
      assert.equal(errors.length, 0, detail);
      return;
    }

    const policyDiagnostic = errors.find((diagnostic) => (
      String(diagnostic.data || '').includes('__LEAN4GAME_INVENTORY_POLICY_2F6C1D__')
    ));
    assert.ok(policyDiagnostic, `expected an inventory-policy diagnostic:\n${detail}`);
    assert.match(String(policyDiagnostic.data), policyCase.expectation.policy);
  });
}

for (const level of nngReferenceCases) {
  const expectedPass = level.expected === 'kernel';
  test(`NNG4 matrix ${expectedPass ? 'PASS' : 'FAIL'} ${level.id}: ${level.title}`, () => {
    const { tag, diagnostics } = level.policy.ok
      ? lean.compile(level.challenge.code, `nng4/${level.id}.lean`)
      : { tag: 0, diagnostics: [] };
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    const incomplete = diagnostics.filter((diagnostic) => (
      /declaration uses 'sorry'|declaration has metavariables/i.test(diagnostic.data || '')
    ));
    const detail = diagnostics
      .map((diagnostic) => diagnostic.data || diagnostic.caption)
      .filter(Boolean)
      .join('\n');
    const actualPass = level.policy.ok
      && tag === 0
      && errors.length === 0
      && incomplete.length === 0;
    const policyDetail = level.policy.messages.length
      ? `Policy:\n${level.policy.messages.join('\n')}\n`
      : '';

    assert.equal(
      actualPass,
      expectedPass,
      expectedPass
        ? `${policyDetail}reference solution was rejected:\n${detail}`
        : `known compatibility gap no longer reproduces; update nng4.conformance.json`,
    );
  });
}
