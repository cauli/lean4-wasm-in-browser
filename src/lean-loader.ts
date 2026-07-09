/**
 * Dynamic Lean module loader
 * Parses user code for imports and computes required .olean files
 */

import { LEAN_WASM_BASE, LEAN_ASSET_VERSION } from './config';

interface ModuleInfo {
  path: string;
  imports: string[];
  size?: number; // .olean byte size, when the manifest was generated with a lib dir
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

// ---------------------------------------------------------------------------
// Persistent olean cache (survives reloads) + optional gzip transport.
//
// .olean files are immutable for a given library build, so once fetched they
// can live in the Cache API indefinitely. The cache is keyed by the manifest's
// `generated` timestamp, which changes whenever a new artifact is swapped in,
// so a new build automatically orphans (and we prune) the previous cache.
//
// Cached entries hold DECOMPRESSED olean bytes under their canonical URL, so
// compression is purely a network detail invisible to callers. If a sibling
// `<path>.gz` exists on the server it's fetched and inflated via
// DecompressionStream; otherwise the raw `.olean` is fetched. Whether `.gz`
// files exist is probed once (see gzipAvailable).
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'lean-olean-';
let cachePromise: Promise<Cache | null> | null = null;

async function openOleanCache(): Promise<Cache | null> {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    if (typeof caches === 'undefined') return null; // e.g. non-secure context
    const m = await loadManifest();
    // Key by the build githash so the cache invalidates on every new artifact
    // (the wasm strictly rejects oleans with a mismatched githash, so a stale
    // cache would break the app after a deploy). Fall back to the manifest's
    // `generated` timestamp in dev, where no version is baked in.
    const name = CACHE_PREFIX + (LEAN_ASSET_VERSION || m.generated);
    // Prune caches from previous library builds.
    try {
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== name) await caches.delete(key);
      }
    } catch { /* non-fatal */ }
    try {
      return await caches.open(name);
    } catch {
      return null;
    }
  })();
  return cachePromise;
}

// Probe once whether the server ships precompressed `<olean>.gz` siblings.
// A plain `r.ok` check isn't enough: the Vite dev server (and SPA hosts)
// answer a missing `.gz` with index.html at 200. So GET the probe file and
// require the gzip magic bytes (0x1f 0x8b) — that only passes on a real gzip.
let gzipProbe: Promise<boolean> | null = null;
function gzipAvailable(): Promise<boolean> {
  if (gzipProbe) return gzipProbe;
  gzipProbe = (async () => {
    if (typeof DecompressionStream === 'undefined') return false;
    try {
      const r = await fetch(`${LEAN_WASM_BASE}/lean-lib/Init/Prelude.olean.gz`);
      if (!r.ok) return false;
      const head = new Uint8Array(await r.arrayBuffer());
      return head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;
    } catch {
      return false;
    }
  })();
  return gzipProbe;
}

async function inflateGzip(data: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Response(data).body!.pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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

// Get all required .olean paths for given imports.
// Only base .olean files: the WASM build imports at the `exported` olean level,
// so the .olean.server/.olean.private parts are never read.
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

  const paths: string[] = [];
  for (const mod of allModules) {
    paths.push(`${mod.replace(/\./g, '/')}.olean`);
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

// Fetch specific .olean files, using the persistent cache and gzip transport
// when available. 404s are tolerated (a module may be in the manifest but not
// the shipped library); lean itself reports missing modules precisely.
export async function fetchOleanFiles(
  paths: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const total = paths.length;
  let loaded = 0;
  let invalidCount = 0;
  let fromCache = 0;

  let cache = await openOleanCache();
  const useGzip = await gzipAvailable();

  const concurrency = 20;  // Many small files: fetch in parallel
  const queue = [...paths];
  const workers: Promise<void>[] = [];

  const fetchOne = async () => {
    while (queue.length > 0) {
      const path = queue.shift()!;
      const url = `${LEAN_WASM_BASE}/lean-lib/${path}`;
      try {
        // 1. Persistent cache (holds decompressed bytes under the canonical URL)
        if (cache) {
          const cached = await cache.match(url);
          if (cached) {
            files.set(path, new Uint8Array(await cached.arrayBuffer()));
            fromCache++;
            loaded++;
            onProgress?.(loaded, total);
            continue;
          }
        }

        // 2. Network — gzip sibling if the deployment ships one, else raw
        const response = useGzip
          ? await fetch(`${url}.gz`)
          : await fetch(url);
        if (response.ok) {
          const buf = await response.arrayBuffer();
          const data: Uint8Array<ArrayBuffer> = useGzip ? await inflateGzip(buf) : new Uint8Array(buf);
          if (isValidOlean(data)) {
            files.set(path, data);
            // Store decompressed so cache hits skip the inflate step. Cache
            // writes are best-effort: on quota exhaustion, stop caching for the
            // rest of this run rather than throw per file (the data is already
            // in `files`, so the run still succeeds without persistence).
            if (cache) {
              try {
                await cache.put(url, new Response(data));
              } catch (e) {
                console.warn('Olean cache write failed, disabling cache for this run:', e);
                cache = null;
              }
            }
          } else {
            invalidCount++;
            if (invalidCount <= 3) {
              console.error(`Invalid .olean file: ${path} (size=${data.length}, first bytes: ${Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')})`);
            }
          }
        }
      } catch (e) {
        console.warn(`Error fetching ${path}:`, e);
      }
      loaded++;
      onProgress?.(loaded, total);
    }
  };

  for (let i = 0; i < concurrency; i++) {
    workers.push(fetchOne());
  }

  await Promise.all(workers);

  if (fromCache > 0) {
    console.log(`Olean cache: ${fromCache}/${total} served from persistent cache`);
  }
  if (invalidCount > 0) {
    console.error(`Found ${invalidCount} invalid .olean files. Make sure .olean files match the lean.wasm version!`);
  }

  return files;
}

// Sum the manifest-recorded byte sizes for a set of .olean paths. Returns
// { bytes, known } where `known` is how many paths had a recorded size, so
// callers can tell an accurate total from a fallback estimate.
export async function closureDownloadSize(
  oleanPaths: string[]
): Promise<{ bytes: number; known: number; total: number }> {
  const m = await loadManifest();
  const byOleanPath = new Map<string, ModuleInfo>();
  for (const info of Object.values(m.modules)) byOleanPath.set(info.path, info);

  let bytes = 0;
  let known = 0;
  for (const p of oleanPaths) {
    const size = byOleanPath.get(p)?.size;
    if (typeof size === 'number') {
      bytes += size;
      known++;
    }
  }
  return { bytes, known, total: oleanPaths.length };
}

// Best-effort byte estimate for a set of paths: exact where the manifest has
// sizes, ~50KB/file for any remainder.
export async function estimateDownloadSize(oleanPaths: string[]): Promise<number> {
  const { bytes, known, total } = await closureDownloadSize(oleanPaths);
  return bytes + (total - known) * 50 * 1024;
}

// Fetch complete file list from server
// This bypasses manifest-based dependency resolution
let fileListCache: string[] | null = null;

export async function fetchCompleteFileList(): Promise<string[]> {
  if (fileListCache) return fileListCache;
  
  try {
    const response = await fetch(`${LEAN_WASM_BASE}/lean-lib-files.json`);
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
