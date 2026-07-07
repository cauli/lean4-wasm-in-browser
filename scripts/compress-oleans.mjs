#!/usr/bin/env node
/**
 * Precompress .olean files to gzip siblings for smaller first-load transfers.
 *
 * Usage: node scripts/compress-oleans.mjs [lean-lib-dir]
 *   default lean-lib-dir: public/lean-wasm/lean-lib
 *
 * Writes `<file>.olean.gz` next to each `<file>.olean`. The loader probes for
 * these at runtime (Init/Prelude.olean.gz) and, when present, fetches the gzip
 * siblings and inflates them via DecompressionStream — so running this script
 * is optional: without it the app just serves raw .olean files.
 *
 * gzip (not brotli) because browsers expose DecompressionStream('gzip') for
 * in-page inflation with zero server configuration; brotli would require the
 * host to send Content-Encoding: br, which not all static hosts do.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

function findOleans(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findOleans(full, out);
    else if (entry.name.endsWith('.olean')) out.push(full);
  }
  return out;
}

async function main() {
  const libDir = process.argv[2] || 'public/lean-wasm/lean-lib';
  if (!fs.existsSync(libDir)) {
    console.error(`Library directory not found: ${libDir}`);
    process.exit(1);
  }

  const files = findOleans(libDir);
  console.log(`Compressing ${files.length} .olean files in ${libDir}...`);

  let rawTotal = 0;
  let gzTotal = 0;
  let skipped = 0;
  let done = 0;

  const concurrency = 8;
  const queue = [...files];

  const worker = async () => {
    while (queue.length) {
      const file = queue.pop();
      const gzPath = file + '.gz';
      const srcStat = fs.statSync(file);
      // Skip if an up-to-date .gz already exists.
      if (fs.existsSync(gzPath) && fs.statSync(gzPath).mtimeMs >= srcStat.mtimeMs) {
        rawTotal += srcStat.size;
        gzTotal += fs.statSync(gzPath).size;
        skipped++;
      } else {
        const compressed = await gzip(fs.readFileSync(file), { level: 9 });
        fs.writeFileSync(gzPath, compressed);
        rawTotal += srcStat.size;
        gzTotal += compressed.length;
      }
      if (++done % 250 === 0) console.log(`  ${done}/${files.length}`);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  const mb = (b) => (b / 1048576).toFixed(1);
  console.log(`\nDone. ${files.length} files (${skipped} already current).`);
  console.log(`  raw:  ${mb(rawTotal)} MB`);
  console.log(`  gzip: ${mb(gzTotal)} MB (${(100 * gzTotal / rawTotal).toFixed(0)}% of raw)`);
}

main();
