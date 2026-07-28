#!/usr/bin/env node
// Run the wasm `lean` under Node — the browser workers do this with MEMFS, this
// driver mounts the real filesystem through NODEFS instead. Exists so deploy
// scripts can run one-off lean invocations against the wasm binary itself
// (e.g. baking `--incr-header-save` snapshots, which must share the binary's
// function table — a native lean's snapshot would embed untranslatable code
// pointers).
//
// lean.js is evaluated with vm.runInThisContext, not require(): its top-level
// `var Module` would be scoped to the CommonJS wrapper and shadow the config
// object below (importScripts in the browser evaluates at global scope, which
// is why the same pattern works in workers).
//
// Usage: node scripts/lean-wasm-node.cjs <artifact-dir> <workdir> [lean args...]
//   <artifact-dir>  directory holding bin/lean.js + lib/lean (the extracted build)
//   <workdir>       real directory mounted at /work (cwd for the run; snapshot
//                   files written under /work land here)
//   [lean args...]  passed to lean verbatim; /lib/lean is LEAN_PATH, so paths
//                   inside args should use /work/... or /lib/lean/...
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const [artifactDir, workDir, ...leanArgs] = process.argv.slice(2);
if (!artifactDir || !workDir) {
  console.error('usage: lean-wasm-node.cjs <artifact-dir> <workdir> [lean args...]');
  process.exit(2);
}
const leanJs = path.resolve(artifactDir, 'bin/lean.js');
const libLean = path.resolve(artifactDir, 'lib/lean');
const realWork = path.resolve(workDir);
const memoryMb = process.env.LEAN_WASM_NODE_MEMORY_MB
  ? Number(process.env.LEAN_WASM_NODE_MEMORY_MB)
  : null;
const wasmPageBytes = 65536;
if (memoryMb !== null && (!Number.isInteger(memoryMb) || memoryMb < 64 || memoryMb > 2048)) {
  throw new Error(`LEAN_WASM_NODE_MEMORY_MB must be an integer from 64 through 2048, got ${memoryMb}`);
}
const memoryConfig = memoryMb === null ? {} : {
  wasmMemory: new WebAssembly.Memory({
    initial: memoryMb * 1024 * 1024 / wasmPageBytes,
    maximum: 32768,
    shared: true,
  }),
  INITIAL_MEMORY: memoryMb * 1024 * 1024,
};

// The glue chdirs the virtual FS to process.cwd() during startup, and only
// '/' is guaranteed to exist there — launched from anywhere else it dies with
// a bare ErrnoError. All host paths are resolved above, so the real cwd is
// free to change.
process.chdir('/');
// Emscripten forwards process.argv[1] as argv[0]. Present the same virtual
// install layout used in browser workers so Lean derives `/lib/lean` instead
// of trying to stat the host-side staging directory inside MEMFS.
process.argv[1] = '/bin/lean';

globalThis.Module = {
  arguments: leanArgs,
  ...memoryConfig,
  // Keep the executable's virtual app path at /bin so Lean derives /lib/lean
  // as its sysroot.  The JS glue and pthreads still load from the real host
  // artifact through these explicit hooks.
  locateFile: (file) => path.join(path.dirname(leanJs), file),
  mainScriptUrlOrBlob: leanJs,
  preRun: [function () {
    const FS = Module.FS;
    const NODEFS = FS.filesystems.NODEFS;
    const mkdirTree = (p) => {
      let cur = '';
      for (const part of p.split('/').filter(Boolean)) {
        cur += '/' + part;
        try { FS.mkdir(cur); } catch (e) { /* exists */ }
      }
    };
    for (const d of ['/lib/lean', '/work', '/bin', '/workspace']) mkdirTree(d);
    if (process.env.LEAN_WASM_NODE_DEBUG_FS === '1') {
      console.error('library root:', libLean);
      console.error('workspace root:', realWork);
    }
    FS.mount(NODEFS, { root: libLean }, '/lib/lean');
    FS.mount(NODEFS, { root: realWork }, '/work');
    Module.ENV.LEAN_PATH = '/lib/lean';
    FS.chdir('/work');
  }],
  onExit: (code) => { process.exitCode = code; },
  onAbort: (what) => { console.error('ABORT:', what); process.exit(3); },
};

// Script-scope shims for the CJS facilities the glue expects.
globalThis.require = require;
globalThis.__filename = '/bin/lean.js';
globalThis.__dirname = '/bin';

vm.runInThisContext(fs.readFileSync(leanJs, 'utf8'), { filename: leanJs });
