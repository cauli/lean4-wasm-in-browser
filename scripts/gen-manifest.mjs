#!/usr/bin/env node
/**
 * Generate a dependency manifest from Lean source files.
 *
 * Usage: node scripts/gen-manifest.mjs <lean-src-dir> <output-manifest.json> [lean-lib-dir]
 * Example: node scripts/gen-manifest.mjs ../lean4/src public/lean-manifest.json public/lean-wasm/lean-lib
 *
 * Each module entry records its direct imports and, when the .olean is present
 * in [lean-lib-dir], its byte size — so the UI can show an accurate download
 * total for a given import before fetching anything.
 */

import fs from 'fs';
import path from 'path';

// Parse import statements from Lean source
function parseImports(content) {
  const imports = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('--') || trimmed.startsWith('/-')) continue;
    
    // Match various import forms:
    // import Foo.Bar
    // public import Foo.Bar
    // meta import Foo.Bar
    // public meta import Foo.Bar
    const importMatch = trimmed.match(/^(?:public\s+)?(?:meta\s+)?import\s+(\S+)/);
    if (importMatch) {
      imports.push(importMatch[1]);
    }
  }
  
  return imports;
}

// Convert file path to module name (e.g., "Init/Prelude.lean" -> "Init.Prelude")
function pathToModuleName(filePath) {
  return filePath
    .replace(/\.lean$/, '')
    .replace(/\//g, '.');
}

// Convert module name to .olean path (e.g., "Init.Prelude" -> "Init/Prelude.olean")
function moduleToOleanPath(moduleName) {
  return moduleName.replace(/\./g, '/') + '.olean';
}

// Recursively find all .lean files
function findLeanFiles(dir, basePath = '') {
  const files = [];
  
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      // Only process Init, Std, Lean directories
      if (!basePath && !['Init', 'Std', 'Lean'].includes(entry.name)) {
        continue;
      }
      files.push(...findLeanFiles(fullPath, relativePath));
    } else if (entry.name.endsWith('.lean')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

// Compute the transitive closure of a module's dependencies. Iterative with a
// visited set so import cycles don't recurse forever and deep chains (Lean's
// closure is thousands of modules) don't overflow the call stack.
function computeTransitiveDeps(moduleName, modules) {
  const deps = new Set();
  const stack = [...(modules[moduleName]?.imports || [])];
  while (stack.length) {
    const m = stack.pop();
    if (deps.has(m)) continue;
    deps.add(m);
    const info = modules[m];
    if (info) for (const imp of info.imports) if (!deps.has(imp)) stack.push(imp);
  }
  return deps;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node scripts/gen-manifest.mjs <lean-src-dir> <output-manifest.json>');
    console.error('Example: node scripts/gen-manifest.mjs ../lean4/src public/lean-manifest.json');
    process.exit(1);
  }
  
  const srcDir = args[0];
  const outputPath = args[1];
  const libDir = args[2]; // optional: enables per-module .olean sizes

  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
  }
  if (libDir && !fs.existsSync(libDir)) {
    console.error(`Library directory not found: ${libDir}`);
    process.exit(1);
  }

  // Byte size of a module's .olean, or undefined if absent / not requested.
  const oleanSize = (oleanPath) => {
    if (!libDir) return undefined;
    try {
      return fs.statSync(path.join(libDir, oleanPath)).size;
    } catch {
      return undefined;
    }
  };

  console.log(`Scanning ${srcDir} for .lean files...`);
  const leanFiles = findLeanFiles(srcDir);
  console.log(`Found ${leanFiles.length} .lean files`);

  const modules = {};

  // Process each .lean file
  for (const file of leanFiles) {
    const fullPath = path.join(srcDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const moduleName = pathToModuleName(file);
    const imports = parseImports(content);
    const oleanPath = moduleToOleanPath(moduleName);

    modules[moduleName] = { path: oleanPath, imports, size: oleanSize(oleanPath) };
  }

  // Also add root modules (Init, Std, Lean) from their .lean files
  for (const rootModule of ['Init', 'Std', 'Lean']) {
    const rootFile = path.join(srcDir, `${rootModule}.lean`);
    if (fs.existsSync(rootFile)) {
      const content = fs.readFileSync(rootFile, 'utf-8');
      const imports = parseImports(content);
      const oleanPath = `${rootModule}.olean`;
      modules[rootModule] = { path: oleanPath, imports, size: oleanSize(oleanPath) };
    }
  }
  
  console.log(`Processed ${Object.keys(modules).length} modules`);
  
  // Build manifest
  const manifest = {
    version: '1.0',
    generated: new Date().toISOString(),
    modules,
  };
  
  // Write manifest
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to ${outputPath}`);
  
  // Print some stats
  const initModules = Object.keys(modules).filter(m => m.startsWith('Init'));
  const stdModules = Object.keys(modules).filter(m => m.startsWith('Std'));
  const leanModules = Object.keys(modules).filter(m => m.startsWith('Lean'));
  
  console.log(`\nModule breakdown:`);
  console.log(`  Init: ${initModules.length} modules`);
  console.log(`  Std: ${stdModules.length} modules`);
  console.log(`  Lean: ${leanModules.length} modules`);
  
  // Download totals for the common entry points, if sizes are available.
  if (libDir) {
    const mb = (bytes) => (bytes / 1048576).toFixed(1);
    const closureBytes = (root) => {
      const deps = new Set([root, ...computeTransitiveDeps(root, modules)]);
      let total = 0;
      for (const m of deps) total += modules[m]?.size || 0;
      return { count: deps.size, bytes: total };
    };
    console.log('\nClosure download sizes:');
    for (const root of ['Init', 'Std', 'Lean']) {
      if (!modules[root]) continue;
      const { count, bytes } = closureBytes(root);
      console.log(`  ${root}: ${count} modules, ${mb(bytes)} MB`);
    }
  }

  // Example: show what Init.Data.String needs
  const exampleModule = 'Init.Data.String';
  if (modules[exampleModule]) {
    const transDeps = computeTransitiveDeps(exampleModule, modules);
    console.log(`\nExample: ${exampleModule} has ${transDeps.size} transitive dependencies`);
  }
}

main();
