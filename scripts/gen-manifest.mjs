#!/usr/bin/env node
/**
 * Generate a dependency manifest from Lean source files.
 * 
 * Usage: node scripts/gen-manifest.mjs <lean-src-dir> <output-manifest.json>
 * Example: node scripts/gen-manifest.mjs ../lean4/src public/lean-manifest.json
 * 
 * @note currently unused, we are testing with all files first (gen-lib-files)
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

// Compute transitive closure of dependencies
function computeTransitiveDeps(moduleName, modules, cache = new Map()) {
  if (cache.has(moduleName)) {
    return cache.get(moduleName);
  }
  
  const deps = new Set();
  const moduleInfo = modules[moduleName];
  
  if (!moduleInfo) {
    return deps;
  }
  
  for (const imp of moduleInfo.imports) {
    deps.add(imp);
    const transitive = computeTransitiveDeps(imp, modules, cache);
    for (const t of transitive) {
      deps.add(t);
    }
  }
  
  cache.set(moduleName, deps);
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
  
  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
  }
  
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
    
    modules[moduleName] = {
      path: moduleToOleanPath(moduleName),
      imports,
    };
  }
  
  // Also add root modules (Init, Std, Lean) from their .lean files
  for (const rootModule of ['Init', 'Std', 'Lean']) {
    const rootFile = path.join(srcDir, `${rootModule}.lean`);
    if (fs.existsSync(rootFile)) {
      const content = fs.readFileSync(rootFile, 'utf-8');
      const imports = parseImports(content);
      modules[rootModule] = {
        path: `${rootModule}.olean`,
        imports,
      };
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
  
  // Example: show what Init.Data.String needs
  const exampleModule = 'Init.Data.String';
  if (modules[exampleModule]) {
    const transDeps = computeTransitiveDeps(exampleModule, modules);
    console.log(`\nExample: ${exampleModule} has ${transDeps.size} transitive dependencies`);
  }
}

main();
