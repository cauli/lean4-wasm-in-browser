// 🤖 Verify an archive before extracting only regular files and directories.
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { verifyFile } from './runtime-release.mjs';

export function validateArchiveEntries(names, details, allowedPath = () => true) {
  for (const name of names.trim().split('\n')) {
    const clean = name.replace(/^\.\//, '').replace(/\/$/, '');
    if (clean === '.' || clean === '') continue;
    if (name.startsWith('/') || name.includes('\\') || clean.split('/').includes('..') || !allowedPath(clean)) {
      throw new Error(`Unsafe archive path: ${name}`);
    }
  }
  // 🤖 Reject symlinks, hardlinks, devices, and other special archive entries.
  for (const line of details.trim().split('\n')) {
    if (!/^[-d]/.test(line)) throw new Error(`Unsupported archive entry: ${line}`);
  }
}

export async function downloadArchive(descriptor, destination, fetchImpl = fetch) {
  const response = await fetchImpl(descriptor.url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Artifact download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
  await verifyFile(destination, descriptor);
}

export function extractArchive(archive, destination, allowedPath) {
  const options = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  const names = execFileSync('tar', ['-tzf', archive], options);
  const details = execFileSync('tar', ['-tvzf', archive], options);
  validateArchiveEntries(names, details, allowedPath);
  fs.mkdirSync(destination, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '-C', destination], { stdio: 'inherit' });
}
