// Fetch the deployed playground artifacts into tests/.artifacts/ so the Node
// integration test can boot the exact binary that's live. Run this before
// `node --test` (CI does both). Downloads:
//   bin/lean.js, bin/lean.wasm        (the wasm is the 2GB-patched, deployed build)
//   lib/lean/<Init closure>.olean     (506 files — all the tests need)
//
// Source base defaults to https://lean.cau.li; override with LEAN_URL.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.LEAN_URL || 'https://lean.cau.li').replace(/\/$/, '');
const WASM_BASE = `${BASE}/lean-wasm`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.LEAN_ROOT || path.join(repoRoot, 'tests/.artifacts');

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// bounded-concurrency map
async function pool(items, width, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx], idx);
      }
    }),
  );
}

console.log(`Fetching Lean artifacts from ${BASE}`);
console.log(`  -> ${OUT}`);

const js = await download(`${WASM_BASE}/lean.js`, path.join(OUT, 'bin/lean.js'));
const wasm = await download(`${WASM_BASE}/lean.wasm`, path.join(OUT, 'bin/lean.wasm'));
// The Emscripten glue is CommonJS. This dir lives under a repo whose package.json
// declares "type": "module", so the pthread workers (which load lean.js through
// Node's module resolution) would otherwise treat it as ESM and hit
// "require is not defined". Pin CommonJS for this directory.
fs.writeFileSync(path.join(OUT, 'bin/package.json'), '{ "type": "commonjs" }\n');
console.log(`  bin/lean.js (${(js / 1e6).toFixed(0)} MB), bin/lean.wasm (${(wasm / 1e6).toFixed(0)} MB)`);

const list = await (await fetch(`${WASM_BASE}/lean-lib-files.json`)).json();
const initClosure = list.filter((f) => f === 'Init.olean' || (f.startsWith('Init/') && f.endsWith('.olean')));
console.log(`  ${initClosure.length} Init-closure oleans…`);

let done = 0;
await pool(initClosure, 24, async (f) => {
  await download(`${WASM_BASE}/lean-lib/${f}`, path.join(OUT, 'lib/lean', f));
  if (++done % 150 === 0 || done === initClosure.length) console.log(`  ${done}/${initClosure.length}`);
});

console.log('Done.');
