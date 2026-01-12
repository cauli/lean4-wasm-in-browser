/**
 * Dynamic Lean module loader
 * Parses user code for imports and computes required .olean files
 */

interface ModuleInfo {
  path: string;
  imports: string[];
}

interface Manifest {
  version: string;
  generated: string;
  modules: Record<string, ModuleInfo>;
}

let manifest: Manifest | null = null;
let manifestPromise: Promise<Manifest> | null = null;

// Load manifest (cached)
export async function loadManifest(): Promise<Manifest> {
  if (manifest) return manifest;
  if (manifestPromise) return manifestPromise;
  
  manifestPromise = fetch('/lean-manifest.json')
    .then(r => {
      if (!r.ok) throw new Error('Failed to load lean-manifest.json');
      return r.json();
    })
    .then(m => {
      manifest = m;
      return m;
    });
  
  return manifestPromise;
}

// Parse import statements from user's Lean code
export function parseUserImports(code: string): string[] {
  const imports: string[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('--')) continue;
    
    // Match import statements
    const importMatch = trimmed.match(/^(?:public\s+)?(?:meta\s+)?import\s+(\S+)/);
    if (importMatch) {
      imports.push(importMatch[1]);
    }
  }
  
  return imports;
}

// Determine implicit imports based on code features
export function detectImplicitImports(code: string): string[] {
  const imports: string[] = [];
  
  // If no explicit imports, Lean implicitly imports Init
  // This is the prelude behavior
  if (!code.includes('prelude')) {
    imports.push('Init');
  }
  
  return imports;
}

// Compute transitive dependencies for a module
function getTransitiveDeps(
  moduleName: string,
  modules: Record<string, ModuleInfo>,
  cache: Map<string, Set<string>> = new Map(),
  visited: Set<string> = new Set()
): Set<string> {
  // Prevent infinite loops
  if (visited.has(moduleName)) {
    return cache.get(moduleName) || new Set();
  }
  visited.add(moduleName);
  
  if (cache.has(moduleName)) {
    return cache.get(moduleName)!;
  }
  
  const deps = new Set<string>();
  const moduleInfo = modules[moduleName];
  
  if (!moduleInfo) {
    // Module not in manifest - might be external or typo
    console.warn(`Module not found in manifest: ${moduleName}`);
    return deps;
  }
  
  // Add direct dependencies
  for (const imp of moduleInfo.imports) {
    // Skip special markers like "all" that appear in some imports
    if (imp === 'all') continue;
    
    deps.add(imp);
    
    // Recursively get transitive deps
    const transitive = getTransitiveDeps(imp, modules, cache, visited);
    for (const t of transitive) {
      deps.add(t);
    }
  }
  
  cache.set(moduleName, deps);
  return deps;
}

// Get all required .olean paths for given imports
// Returns all possible file paths (.olean, .olean.server, .olean.private)
export async function getRequiredOleanPaths(imports: string[]): Promise<string[]> {
  const m = await loadManifest();
  const allModules = new Set<string>();
  const cache = new Map<string, Set<string>>();
  
  // Add each import and its transitive deps
  for (const imp of imports) {
    allModules.add(imp);
    const deps = getTransitiveDeps(imp, m.modules, cache);
    for (const dep of deps) {
      allModules.add(dep);
    }
  }
  
  // Convert module names to all possible .olean paths
  // Modules using `module` keyword have .olean.server and .olean.private files
  const paths: string[] = [];
  for (const mod of allModules) {
    const basePath = mod.replace(/\./g, '/');
    paths.push(`${basePath}.olean`);
    paths.push(`${basePath}.olean.server`);
    paths.push(`${basePath}.olean.private`);
  }
  
  return paths.sort();
}

// Main function: analyze code and return required .olean paths
export async function analyzeCodeDependencies(code: string): Promise<{
  explicitImports: string[];
  implicitImports: string[];
  allModules: string[];
  oleanPaths: string[];
}> {
  const explicitImports = parseUserImports(code);
  const implicitImports = detectImplicitImports(code);
  const allImports = [...new Set([...explicitImports, ...implicitImports])];
  
  const m = await loadManifest();
  const allModules = new Set<string>();
  const cache = new Map<string, Set<string>>();
  
  for (const imp of allImports) {
    allModules.add(imp);
    const deps = getTransitiveDeps(imp, m.modules, cache);
    for (const dep of deps) {
      allModules.add(dep);
    }
  }
  
  const oleanPaths = await getRequiredOleanPaths(allImports);
  
  return {
    explicitImports,
    implicitImports,
    allModules: [...allModules].sort(),
    oleanPaths,
  };
}

// .olean file magic bytes (first 4 bytes should be "olean" header marker)
const OLEAN_MAGIC = new Uint8Array([0x6f, 0x6c, 0x65, 0x61]); // "olea"

// Validate that data looks like an .olean file
function isValidOlean(data: Uint8Array): boolean {
  if (data.length < 32) return false; // Too small for header
  // Check magic bytes
  for (let i = 0; i < 4; i++) {
    if (data[i] !== OLEAN_MAGIC[i]) return false;
  }
  return true;
}

// Fetch specific .olean files from the server
// Silently ignores 404s for .olean.server/.olean.private (they don't exist for all modules)
export async function fetchOleanFiles(
  paths: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const total = paths.length;
  let loaded = 0;
  let invalidCount = 0;
  
  // Fetch in parallel with concurrency limit
  const concurrency = 20;  // Increase for many small files
  const queue = [...paths];
  const workers: Promise<void>[] = [];
  
  const fetchOne = async () => {
    while (queue.length > 0) {
      const path = queue.shift()!;
      try {
        const response = await fetch(`/lean-wasm/lean-lib/${path}`);
        if (response.ok) {
          const data = new Uint8Array(await response.arrayBuffer());
          // Validate the file looks like an .olean
          if (isValidOlean(data)) {
            files.set(path, data);
          } else if (!path.includes('.olean.server') && !path.includes('.olean.private')) {
            // Only warn for base .olean files (not optional .server/.private)
            invalidCount++;
            if (invalidCount <= 3) {
              console.error(`Invalid .olean file: ${path} (size=${data.length}, first bytes: ${Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
            }
          }
        }
        // Silently ignore 404s - .olean.server/.olean.private may not exist
      } catch (e) {
        // Network error - also ignore for optional files
        if (!path.includes('.olean.')) {
          console.warn(`Error fetching ${path}:`, e);
        }
      }
      loaded++;
      onProgress?.(loaded, total);
    }
  };
  
  for (let i = 0; i < concurrency; i++) {
    workers.push(fetchOne());
  }
  
  await Promise.all(workers);
  
  if (invalidCount > 0) {
    console.error(`Found ${invalidCount} invalid .olean files. Make sure .olean files match the lean.wasm version!`);
  }
  
  return files;
}

// Quick estimate of download size (approximate)
export async function estimateDownloadSize(oleanPaths: string[]): Promise<number> {
  // Average .olean file size is roughly 50KB based on typical stdlib
  // This is a rough estimate for progress display
  return oleanPaths.length * 50 * 1024;
}

// Fetch complete file list from server
// This bypasses manifest-based dependency resolution
let fileListCache: string[] | null = null;

export async function fetchCompleteFileList(): Promise<string[]> {
  if (fileListCache) return fileListCache;
  
  try {
    const response = await fetch('/lean-wasm/lean-lib-files.json');
    if (response.ok) {
      fileListCache = await response.json();
      return fileListCache!;
    }
  } catch (e) {
    console.warn('lean-lib-files.json not available:', e);
  }
  
  // Fallback: return empty (caller should handle)
  return [];
}

// Fetch ALL .olean files from the library (bypasses manifest)
export async function fetchAllOleanFiles(
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, Uint8Array>> {
  const fileList = await fetchCompleteFileList();
  
  if (fileList.length === 0) {
    console.error('No file list available! Generate lean-lib-files.json');
    return new Map();
  }
  
  console.log(`Fetching ALL ${fileList.length} library files...`);
  return fetchOleanFiles(fileList, onProgress);
}
