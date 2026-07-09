// One-shot Lean WASM host — Web Worker version.
//
// Runs a single `lean <args>` invocation (via main()) in a real Worker so the
// synchronous import + elaboration happens OFF the page's main thread. The
// existing lean-worker-simple.html does the same thing in a SAME-ORIGIN IFRAME,
// which shares the page's event loop — so a multi-minute `import Std` froze the
// whole tab and looked like a hang. A Worker keeps the page responsive.
//
// Unlike the persistent worker (which keeps one Init-only environment resident
// and serves repeated `lean_wasm_compile` calls), this imports whatever the
// user's file imports (Std, Lean, …) and tears down after the run
// (EXIT_RUNTIME=1), so every run re-imports. The parent uses it only for code
// with explicit non-Init imports.

Error.stackTraceLimit = 1000;

const assetBase = (new URLSearchParams(location.search).get('assetBase') || '/lean-wasm').replace(/\/$/, '');
// Per-build version → versioned lean.js/lean.wasm URLs (see the persistent worker).
const assetVer = new URLSearchParams(location.search).get('v') || '';
const assetQ = assetVer ? '?v=' + encodeURIComponent(assetVer) : '';

// Keep the build's verbose [DEBUG:...]/[WASM DEBUG] tracing out of the UI, but
// use the per-module "loading" lines to drive a progress counter.
function isDebugLine(text) {
  return /^\s*\[(WASM DEBUG|DEBUG|IFRAME|PROFILE|PWORKER|COMPILE)/.test(text);
}
let importedCount = 0;
function reportImportProgress(text) {
  // The build prints "[DEBUG:PROGRESS] N/M" per imported module.
  const m = /\[DEBUG:PROGRESS\]\s*(\d+)\/(\d+)/.exec(text);
  if (m) {
    self.postMessage({ type: 'import_progress', loaded: +m[1], total: +m[2] });
    return true;
  }
  // Fallback: "  - /lib/lean/<Mod>.olean" lines emitted while loading modules.
  if (/^\s*-\s+\/lib\/lean\/.*\.olean\s*$/.test(text)) {
    importedCount++;
    self.postMessage({ type: 'import_progress', loaded: importedCount });
    return true;
  }
  return false;
}

function mkdirp(FS, path) {
  let current = '';
  for (const part of path.split('/').filter((p) => p)) {
    current += '/' + part;
    try { FS.mkdir(current); } catch (e) { /* exists */ }
  }
}

function writeLibFile(FS, file) {
  let fileName = file.name;
  for (const prefix of ['library/', 'lean-lib/', 'lib/lean/', 'lean/']) {
    if (fileName.startsWith(prefix)) { fileName = fileName.substring(prefix.length); break; }
  }
  const fullPath = '/lib/lean/' + fileName;
  mkdirp(FS, fullPath.substring(0, fullPath.lastIndexOf('/')));
  FS.writeFile(fullPath, new Uint8Array(file.data));
}

function runMain(args) {
  if (typeof Module.callMain === 'function') return Module.callMain(args);
  const fullArgs = ['lean'].concat(args);
  const argc = fullArgs.length;
  const argPtrs = fullArgs.map((a) => Module.stringToNewUTF8(a));
  const ptrSize = 4;
  const argvPtr = Module._malloc(ptrSize * (argc + 1));
  for (let i = 0; i < argc; i++) Module.setValue(argvPtr + i * ptrSize, argPtrs[i], 'i32');
  Module.setValue(argvPtr + argc * ptrSize, 0, 'i32');
  return Module.ccall('main', 'number', ['number', 'number'], [argc, argvPtr]);
}

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type !== 'run') return;
  const libraryFiles = msg.files || [];
  const args = msg.args || [];
  const code = msg.code;
  const codePath = msg.path || '/workspace/input.lean';

  self.Module = {
    // 4.28 ships a 16MB memory cap (patched to 2GB MAX in lean.wasm); create the
    // 2GB shared memory up front (shared memory does not grow in this build).
    INITIAL_MEMORY: 2048 * 1024 * 1024,
    locateFile: (path) => assetBase + '/' + path + assetQ,
    // pthread sub-workers this Worker spawns load lean.js (not this file).
    mainScriptUrlOrBlob: assetBase + '/lean.js' + assetQ,
    noInitialRun: true,
    arguments: args,
    print: (text) => { if (reportImportProgress(text)) return; if (isDebugLine(text)) console.log(text); else self.postMessage({ type: 'stdout', data: text }); },
    printErr: (text) => { if (reportImportProgress(text)) return; if (isDebugLine(text)) console.log(text); else self.postMessage({ type: 'stderr', data: text }); },
    setStatus: (text) => { if (text) self.postMessage({ type: 'progress', data: text }); },

    preRun: [function () {
      const FS = Module.FS;
      Module.ENV['LEAN_PATH'] = '/lib/lean';
      for (const d of ['/lib', '/lib/lean', '/workspace', '/bin']) { try { FS.mkdir(d); } catch (e) { /* exists */ } }
      let errors = 0;
      for (const file of libraryFiles) { try { writeLibFile(FS, file); } catch (e) { errors++; } }
      if (errors > 0) console.error('library write errors:', errors);
      if (typeof code === 'string') { try { FS.writeFile(codePath, code); } catch (e) { console.error('write code failed', e); } }
      try { FS.chdir('/workspace'); } catch (e) { /* ignore */ }
    }],

    onRuntimeInitialized: function () {
      // Defer to a fresh task so preRun's FS is fully set up.
      setTimeout(function () {
        let exitCode = 0;
        try {
          runMain(args);
        } catch (e) {
          if (typeof e === 'number') { exitCode = e; }
          else if (e && e.name === 'ExitStatus') { exitCode = e.status; }
          else { self.postMessage({ type: 'stderr', data: 'Error: ' + ((e && e.message) || e) }); exitCode = 1; }
        }
        self.postMessage({ type: 'done', exitCode: exitCode });
      }, 0);
    },

    onAbort: function (what) {
      self.postMessage({ type: 'stderr', data: 'Aborted: ' + (what || 'unknown') });
      self.postMessage({ type: 'done', exitCode: 1 });
    },
  };

  try {
    importScripts(assetBase + '/lean.js' + assetQ);
  } catch (e) {
    self.postMessage({ type: 'stderr', data: 'Failed to load lean.js: ' + ((e && e.message) || e) });
    self.postMessage({ type: 'done', exitCode: 1 });
  }
};

self.postMessage({ type: 'worker_boot' });
