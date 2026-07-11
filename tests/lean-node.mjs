// Boot the Lean WASM compiler headless in Node (no browser) and expose a
// synchronous-ish compile(code) -> { tag, diagnostics }.
//
// This is the same binary the deployed playground runs, driven directly instead
// of through the browser UI. It's a pthread build, but Emscripten's glue speaks
// Node (worker_threads + SharedArrayBuffer), so it runs under `node`.
//
// Layout expected under `root`:
//   root/bin/lean.js     the Emscripten glue
//   root/bin/lean.wasm   the wasm (must be the 2GB-memory-patched build)
//   root/lib/lean/**     the .olean library (at least Init's closure)
//
// getBuildDir (inside lean_init_search_path) resolves the lib dir relative to the
// executable, so we mount the artifact at its REAL host path inside the wasm FS.

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

export async function bootLean({ root, wasmPath, quiet = true } = {}) {
  const leanJsPath = path.join(root, 'bin/lean.js');
  // The 2GB-patched wasm; defaults to root/bin/lean.wasm (that's what a CI fetch
  // of the deployed, already-patched wasm produces). Override for local dev,
  // where the raw artifact's wasm is the unpatched 16MB build.
  wasmPath = wasmPath || path.join(root, 'bin/lean.wasm');
  if (!fs.existsSync(leanJsPath)) throw new Error(`lean.js not found at ${leanJsPath}`);
  if (!fs.existsSync(wasmPath)) throw new Error(`lean.wasm not found at ${wasmPath}`);

  const source = fs.readFileSync(leanJsPath, 'utf8');
  const require = createRequire(leanJsPath);

  // Per-compile capture of the JSON diagnostic lines Lean prints to stdout.
  let capture = null;
  const onLine = (text) => {
    if (capture && text.startsWith('{')) {
      try {
        const d = JSON.parse(text);
        if (d && typeof d.severity === 'string') capture.push(d);
      } catch { /* not a diagnostic line */ }
    } else if (!quiet && !/^\[(DEBUG|WASM DEBUG)/.test(text)) {
      console.error('[lean]', text);
    }
  };

  let resolveReady, rejectReady;
  const ready = new Promise((res, rej) => { (resolveReady = res), (rejectReady = rej); });

  const Module = {
    noInitialRun: true,
    INITIAL_MEMORY: 2048 * 1024 * 1024,
    locateFile: (p) => (p.endsWith('.wasm') ? wasmPath : path.join(root, 'bin', p)),
    print: onLine,
    printErr: onLine,
    preRun: [
      function () {
        const FS = Module.FS;
        const mkdirp = (p) => { let cur = ''; for (const seg of p.split('/').filter(Boolean)) { cur += '/' + seg; try { FS.mkdir(cur); } catch {} } };
        mkdirp(root);
        // FS.filesystems works on any glue; Module.NODEFS only existed as an
        // EXPORT_ALL side effect and is gone from the explicit-exports build.
        FS.mount(FS.filesystems.NODEFS, { root }, root);
        Module.ENV['LEAN_PATH'] = path.join(root, 'lib/lean');
        try { FS.mkdir('/workspace'); } catch {}
        try { FS.chdir('/workspace'); } catch {}
      },
    ],
    onRuntimeInitialized: function () {
      try {
        Module._lean_initialize_runtime_module();
        Module._lean_initialize();
        Module._lean_io_mark_end_initialization();
        if (Module._lean_init_task_manager) Module._lean_init_task_manager();
        if (Module._lean_enable_initializer_execution) Module._lean_enable_initializer_execution();
        const sp = Module._lean_init_search_path();
        if ((Module.getValue(sp + 7, 'i8') & 0xff) !== 0) {
          try { Module._lean_io_result_show_error(sp); } catch {}
          throw new Error('lean_init_search_path failed');
        }
        resolveReady();
      } catch (e) { rejectReady(e); }
    },
    onAbort: (w) => rejectReady(new Error('wasm abort: ' + w)),
  };

  // Inject config past the glue's hoisted `var Module`, and run as CJS with the
  // real __filename so pthread workers can resolve lean.js.
  globalThis.__leanCfg = Module;
  const wrapped = 'Module = globalThis.__leanCfg;\n' + source;
  const fn = vm.compileFunction(wrapped, ['exports', 'require', 'module', '__filename', '__dirname'], { filename: leanJsPath });
  fn({}, require, { exports: {} }, leanJsPath, path.dirname(leanJsPath));

  await ready;

  const mkStr = (s) => {
    const p = Module.stringToNewUTF8(s);
    const o = Module._lean_mk_string(p);
    Module._free(p);
    return o;
  };

  function compile(code, fileName = 'test.lean') {
    capture = [];
    const res = Module._lean_wasm_compile(mkStr(code), mkStr(fileName));
    const tag = Module.getValue(res + 7, 'i8') & 0xff;
    const diagnostics = capture;
    capture = null;
    // tag != 0 means the IO computation itself threw (import failure etc.),
    // not "the code had errors" — surface the message instead of losing it.
    if (tag !== 0) { try { Module._lean_io_result_show_error(res); } catch { /* best effort */ } }
    return { tag, diagnostics };
  }

  // Warm up: the first compile triggers the one-time Init import (~45s), after
  // which the environment is resident and every compile is milliseconds.
  compile('#check Nat');

  return { compile };
}
