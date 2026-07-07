// Fetch the test fixtures (lean.js, the 2GB-patched lean.wasm, and the Init-closure
// oleans) for the headless Node integration tests. They come from a GitHub release
// asset rather than the live site, because Cloudflare's Bot Fight Mode challenges
// (403s) the deploy from CI's datacenter IPs, and the free plan can't exempt a path.
//
// Re-bundle + re-upload the asset when the Lean WASM build changes:
//   cd tests/.artifacts && tar czf fixtures.tar.gz bin lib
//   gh release upload test-fixtures-<ver> fixtures.tar.gz --clobber
//
// Override the source with LEAN_ARTIFACTS_URL, or the output dir with LEAN_ROOT.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ASSET_URL =
  process.env.LEAN_ARTIFACTS_URL ||
  'https://github.com/cauli/lean4-wasm-in-browser/releases/download/test-fixtures-4.28/lean-wasm-4.28-testfixture.tar.gz';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.LEAN_ROOT || path.join(repoRoot, 'tests/.artifacts');

console.log(`Fetching test fixtures\n  from ${ASSET_URL}\n  -> ${OUT}`);

const r = await fetch(ASSET_URL, { redirect: 'follow' });
if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${ASSET_URL}`);

const tar = path.join(os.tmpdir(), 'lean-fixtures.tar.gz');
fs.writeFileSync(tar, Buffer.from(await r.arrayBuffer()));
fs.mkdirSync(OUT, { recursive: true });
execSync(`tar xzf "${tar}" -C "${OUT}"`, { stdio: 'inherit' });
fs.rmSync(tar, { force: true });

// The Emscripten glue is CommonJS; this dir sits under a repo whose package.json
// is "type": "module", so pin CommonJS here or the pthread workers load lean.js as
// ESM and hit "require is not defined". (Also in the tarball, but be defensive.)
fs.writeFileSync(path.join(OUT, 'bin/package.json'), '{ "type": "commonjs" }\n');

const ok = fs.existsSync(path.join(OUT, 'bin/lean.wasm')) && fs.existsSync(path.join(OUT, 'lib/lean/Init.olean'));
console.log(ok ? 'Done.' : 'ERROR: fixtures missing after extract');
if (!ok) process.exit(1);
