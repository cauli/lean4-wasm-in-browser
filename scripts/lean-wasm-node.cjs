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

// The glue chdirs the virtual FS to process.cwd() during startup, and only
// '/' is guaranteed to exist there — launched from anywhere else it dies with
// a bare ErrnoError. All host paths are resolved above, so the real cwd is
// free to change.
process.chdir('/');

globalThis.Module = {
  arguments: leanArgs,
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
    // lean derives its install layout by stat'ing dirname(argv[0]); under node
    // argv[0] is lean.js's real path, so that directory must exist in the
    // virtual FS (the browser workers mkdir /bin for the same reason).
    mkdirTree(path.dirname(leanJs));
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
globalThis.__filename = leanJs;
globalThis.__dirname = path.dirname(leanJs);

vm.runInThisContext(fs.readFileSync(leanJs, 'utf8'), { filename: leanJs });
