// 🤖 Immutable release uploader. Preflight every remote key before the first put.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileDigest, loadRelease, repoRoot, verifyRuntime } from './runtime-release.mjs';

export function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
  });
}

export function wranglerStore(bucket, runCommand = run) {
  const invoke = (args) => runCommand('npx', ['wrangler@4', 'r2', 'object', ...args, '--remote']);
  return {
    async get(key, destination) {
      const result = await invoke(['get', `${bucket}/${key}`, '--file', destination]);
      if (result.code === 0) return true;
      // 🤖 Only a specific missing-object response authorizes a new upload.
      // 🤖 Authentication, network, bucket, and unknown errors must fail closed.
      if (/The specified key does not exist\.|NoSuchKey/.test(result.output)) return false;
      throw new Error(`R2 preflight failed for ${key}: ${result.output}`);
    },
    async put(key, file, contentType) {
      const result = await invoke(['put', `${bucket}/${key}`, '--file', file, '--content-type', contentType]);
      if (result.code !== 0) throw new Error(`R2 upload failed for ${key}: ${result.output}`);
    },
  };
}

export async function uploadRelease({ release, root, store, log = console.log }) {
  await verifyRuntime(root, release);
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-r2-preflight-'));
  const pending = [];
  try {
    for (const [key, expected] of Object.entries(release.objects)) {
      const remoteKey = `${release.assetVersion}/${key}`;
      const downloaded = path.join(scratch, 'object');
      if (await store.get(remoteKey, downloaded)) {
        const actual = await fileDigest(downloaded);
        if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) {
          throw new Error(`Refusing to overwrite immutable R2 object ${remoteKey}: existing checksum differs`);
        }
        log(`Already matches: ${remoteKey}`);
      } else pending.push(key);
      await fs.rm(downloaded, { force: true });
    }
    // 🤖 This is a checksum preflight, not an atomic create-only API. The release
    // 🤖 publisher must serialize uploads and keep the prefix private until done.
    for (const key of pending) {
      const type = key.endsWith('.js') ? 'text/javascript' : key.endsWith('.wasm')
        ? 'application/wasm' : 'application/octet-stream';
      const remoteKey = `${release.assetVersion}/${key}`;
      await store.put(remoteKey, path.join(root, key), type);
      log(`Uploaded: ${remoteKey}`);
    }
    return { uploaded: pending.length, unchanged: Object.keys(release.objects).length - pending.length };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Set CLOUDFLARE_ACCOUNT_ID to the intended account');
  const release = loadRelease();
  const result = await uploadRelease({
    release,
    root: path.join(repoRoot, 'public/lean-wasm'),
    store: wranglerStore(process.env.R2_BUCKET || 'lean-assets'),
  });
  console.log(`Release ${release.assetVersion}: ${result.uploaded} uploaded, ${result.unchanged} unchanged`);
}
