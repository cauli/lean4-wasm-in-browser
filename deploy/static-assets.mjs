// 🤖 Static bundle checks shared by packaging, CI, and deployment.
import os from 'node:os';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRelease, verifyInit } from './runtime-release.mjs';
import { downloadArchive, extractArchive } from './archive.mjs';

export async function verifyCore(root) {
  const manifest = JSON.parse(await fsp.readFile(path.join(root, 'core-layer.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(manifest.leanCommit)
      || !Array.isArray(manifest.packs) || manifest.packs.length === 0) {
    throw new Error('Packed core requires a Lean commit and at least one pack');
  }
  await verifyInit(path.join(root, 'lean-lib/Init.olean'), manifest);
  const names = new Set();
  for (const pack of manifest.packs) {
    if (!/^artifacts-\d+\.pack$/.test(pack.file) || names.has(pack.file)
        || !Number.isSafeInteger(pack.compressedBytes) || pack.compressedBytes <= 0) {
      throw new Error('Invalid or duplicate packed core entry');
    }
    names.add(pack.file);
    const stat = await fsp.stat(path.join(root, 'core-lib', pack.file));
    if (!stat.isFile() || stat.size !== pack.compressedBytes) {
      throw new Error(`Packed core size mismatch: ${pack.file}`);
    }
  }
  return manifest;
}

export async function fetchStaticAssets({ release = loadRelease(), out = 'public/lean-wasm', fetchImpl = fetch } = {}) {
  if (!release.staticAssets) throw new Error('Missing checked-in static asset bundle pin');
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), 'lean-static-'));
  try {
    const archive = path.join(scratch, 'static.tar.gz');
    await downloadArchive(release.staticAssets, archive, fetchImpl);
    // 🤖 A clean destination prevents stale packs from masking an incomplete tar.
    await fsp.mkdir(out, { recursive: true });
    const existing = (await fsp.readdir(out)).filter((name) => name !== '.gitkeep');
    if (existing.length) throw new Error(`Static asset destination is not empty: ${out}`);
    extractArchive(archive, out, (name) =>
      name === 'lean-lib-files.json' || /^[a-z-]+-layer\.json$/.test(name)
      || /^(lean|core|real-analysis|manifold-[a-z-]+)-lib(\/|$)/.test(name));
    await verifyInit(path.join(out, 'lean-lib/Init.olean'), release);
    await verifyCore(out);
  } finally {
    await fsp.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, root = 'public/lean-wasm'] = process.argv.slice(2);
  if (command === 'verify-core') await verifyCore(root);
  else if (command === 'fetch') await fetchStaticAssets({ out: root });
  else throw new Error('Usage: node deploy/static-assets.mjs verify-core|fetch [root]');
}
