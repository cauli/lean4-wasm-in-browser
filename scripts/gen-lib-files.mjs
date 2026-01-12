#!/usr/bin/env node
/**
 * Generate lean-lib-files.json - a list of all library files for dynamic loading
 * 
 * Usage: node scripts/gen-lib-files.mjs [lean-lib-dir] [output-file]
 * 
 * Defaults:
 *   lean-lib-dir: public/lean-wasm/lean-lib
 *   output-file: public/lean-wasm/lean-lib-files.json
 */

import fs from 'fs';
import path from 'path';

function findAllFiles(dir, basePath = '') {
  const files = [];
  
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      // Include all .olean, .olean.server, .olean.private files
      if (entry.name.includes('.olean')) {
        files.push(relativePath);
      }
    }
  }
  
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const leanLibDir = args[0] || 'public/lean-wasm/lean-lib';
  const outputFile = args[1] || 'public/lean-wasm/lean-lib-files.json';
  
  if (!fs.existsSync(leanLibDir)) {
    console.error(`ERROR: ${leanLibDir} not found!`);
    console.error('Run ./scripts/create-lean-lib.sh first to create the lean-lib directory.');
    process.exit(1);
  }
  
  console.log(`Scanning ${leanLibDir} for library files...`);
  const files = findAllFiles(leanLibDir);
  
  // Sort for consistency
  files.sort();
  
  console.log(`Found ${files.length} library files`);
  
  // Write JSON array
  fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
  
  console.log(`Written to ${outputFile}`);
  console.log(`\nFile breakdown:`);
  const olean = files.filter(f => f.endsWith('.olean')).length;
  const oleanServer = files.filter(f => f.endsWith('.olean.server')).length;
  const oleanPrivate = files.filter(f => f.endsWith('.olean.private')).length;
  console.log(`  .olean: ${olean}`);
  console.log(`  .olean.server: ${oleanServer}`);
  console.log(`  .olean.private: ${oleanPrivate}`);
}

main();
