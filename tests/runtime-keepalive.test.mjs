// Regression test for issue #4: once a compile generates equation lemmas, a
// Lean task thread proxies work to the main thread, and the next timer turn of
// the event loop used to exit the Emscripten runtime and close stderr. Every
// later compile then failed with EBADF before printing anything.
//
// The fix needs a runtime that exports _emscripten_runtime_keepalive_push. The
// test runs as a TODO only while the pinned release is the one linked before
// that export existed, so a newer release that drops the export fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootLean } from './lean-node.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(repoRoot, 'public/lean-wasm');
const fetched = path.join(repoRoot, 'tests/.artifacts');
const haveFetched = fs.existsSync(path.join(fetched, 'bin/lean.js'));
const root = process.env.LEAN_ROOT || (haveFetched ? fetched : path.dirname(path.dirname(fs.realpathSync(path.join(pub, 'lean.js')))));
const wasmPath = process.env.LEAN_WASM || (haveFetched ? path.join(fetched, 'bin/lean.wasm') : fs.realpathSync(path.join(pub, 'lean.wasm')));

const releaseWithoutKeepalive = '62b6a2291302d4bbeace37642a066b7510d0145c-dlsym1-compact1';
const pinnedRelease = JSON.parse(fs.readFileSync(path.join(repoRoot, 'deploy/runtime-release.json'), 'utf8')).assetVersion;

// The compact glue attaches exports at load time, so only the booted Module can
// say whether the function exists; the glue text doesn't name it.
const lean = await bootLean({ root, wasmPath });

const timerTurn = () => new Promise((resolve) => setTimeout(resolve, 0));

// Simp unfolding a structurally recursive def realizes its equation lemmas.
const unfoldsRecursiveDef = (name) => `def ${name} : List Nat → Nat
  | [] => 0
  | _ :: xs => ${name} xs + 1

theorem ${name}_length (xs : List Nat) : ${name} xs = xs.length := by
  induction xs <;> simp [${name}, *]
`;

test('compiles keep working across event-loop turns after equation-lemma generation', {
  todo: !lean.holdsKeepalive && pinnedRelease === releaseWithoutKeepalive
    && `release ${pinnedRelease} predates the _emscripten_runtime_keepalive_push export`,
}, async () => {
  // Which turn first breaks depends on thread timing, so alternate several times.
  for (let i = 0; i < 10; i++) {
    const first = lean.compile(unfoldsRecursiveDef(`f${i}`));
    assert.equal(first.tag, 0, `compile ${i} threw an IO error`);
    assert.deepEqual(first.diagnostics.filter((d) => d.severity === 'error'), []);
    await timerTurn();
    assert.equal(lean.compile('#check Nat').tag, 0, `compile after turn ${i} threw an IO error`);
  }
});
