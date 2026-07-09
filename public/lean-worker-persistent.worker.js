// Persistent Lean WASM host — Web Worker version.
//
// Runs the Lean runtime in a real Worker so the synchronous ~1-minute Init
// import happens OFF the page's main thread (a same-origin iframe shares the
// main thread, which froze the whole tab). Same boot sequence as before; the
// messaging is self.postMessage / self.onmessage instead of parent/iframe.
//
// Initializes the runtime ONCE (without running main(), which would tear it
// down via EXIT_RUNTIME=1) and serves repeated compiles through the fork's
// `lean_wasm_compile` export. The first compile imports Init and caches the
// environment inside Lean; subsequent compiles reuse it.

Error.stackTraceLimit = 1000;

let libraryFiles = [];
let moduleReady = false;
let compileBusy = false;

const assetBase = (new URLSearchParams(location.search).get('assetBase') || '/lean-wasm').replace(/\/$/, '');
// Per-build version, appended to lean.js/lean.wasm so each build is a distinct
// (safely-immutable) CDN URL and a redeploy is picked up without a cache purge.
const assetVer = new URLSearchParams(location.search).get('v') || '';
const assetQ = assetVer ? '?v=' + encodeURIComponent(assetVer) : '';

// The build and wasmCompile emit verbose tracing; keep it out of the UI.
function isDebugLine(text) {
  return /^\s*\[(WASM DEBUG|DEBUG|IFRAME|PROFILE|PWORKER|COMPILE)/.test(text);
}

// "[DEBUG:PROGRESS] N/506" during the import -> a structured progress event so
// the loading bar can move (and now it actually can, off the main thread).
function reportImportProgress(text) {
  const m = /\[DEBUG:PROGRESS\]\s*(\d+)\/(\d+)/.exec(text);
  if (m) {
    self.postMessage({ type: 'import_progress', loaded: +m[1], total: +m[2] });
    return true;
  }
  // The build also prints bare "  - /lib/lean/<Mod>.olean" lines while loading
  // modules; keep them out of the user-visible output (the one-shot worker
  // filters the same pattern).
  return /^\s*-\s+\/lib\/lean\/.*\.olean\s*$/.test(text);
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

// Build a Lean String from a JS string (EXPORT_ALL exposes the runtime helpers).
function mkLeanString(str) {
  const ptr = Module.stringToNewUTF8(str);
  const obj = Module._lean_mk_string(ptr);
  Module._free(ptr);
  return obj;
}

function compileCode(code, fileName) {
  if (!moduleReady) return { success: false, error: 'Module not ready' };
  if (compileBusy) return { success: false, error: 'Compile already in progress' };
  compileBusy = true;
  const t0 = performance.now();
  try {
    const codeObj = mkLeanString(code);
    const fnameObj = mkLeanString(fileName || '/workspace/input.lean');
    const resObj = Module._lean_wasm_compile(codeObj, fnameObj);
    const elapsed = performance.now() - t0;
    // IO result: ctor tag byte at offset 7 (0 = ok, else error).
    const tag = Module.getValue(resObj + 7, 'i8') & 0xff;
    console.log(`[COMPILE] done in ${elapsed.toFixed(0)}ms (tag ${tag})`);
    if (tag !== 0) {
      try { Module._lean_io_result_show_error(resObj); } catch (e) { /* ignore */ }
      return { success: false, error: 'lean_wasm_compile returned an IO error (see output)', elapsed };
    }
    return { success: true, elapsed };
  } catch (e) {
    console.error('[COMPILE] threw:', e);
    return { success: false, error: (e && e.message) || String(e) };
  } finally {
    compileBusy = false;
  }
}

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === 'load_library') {
    libraryFiles = msg.files || [];
    self.postMessage({ type: 'library_received' });
  } else if (msg.type === 'add_files') {
    let written = 0;
    for (const file of (msg.files || [])) {
      try { writeLibFile(Module.FS, file); written++; } catch (e) { /* keep going */ }
    }
    self.postMessage({ type: 'files_added', count: written });
  } else if (msg.type === 'start_worker') {
    startLeanModule();
  } else if (msg.type === 'compile') {
    self.postMessage({ type: 'compile_result', ...compileCode(msg.code, msg.path) });
  }
};

function startLeanModule() {
  self.Module = {
    // 4.28 ships a 16MB memory cap (patched to 2GB MAX in lean.wasm).
    INITIAL_MEMORY: 2048 * 1024 * 1024,
    locateFile: (path) => assetBase + '/' + path + assetQ,
    // Tell Emscripten where the runtime script is, so the pthread sub-workers
    // this Worker spawns can load lean.js (the Worker's own script is this file).
    mainScriptUrlOrBlob: assetBase + '/lean.js' + assetQ,
    print: (text) => { if (reportImportProgress(text)) return; if (isDebugLine(text)) console.log(text); else self.postMessage({ type: 'stdout', data: text }); },
    printErr: (text) => { if (reportImportProgress(text)) return; if (isDebugLine(text)) console.log(text); else self.postMessage({ type: 'stderr', data: text }); },
    setStatus: (text) => { if (text) self.postMessage({ type: 'progress', data: text }); },
    noInitialRun: true,

    preRun: [function () {
      const FS = Module.FS;
      Module.ENV['LEAN_PATH'] = '/lib/lean';
      for (const d of ['/lib', '/lib/lean', '/workspace', '/bin']) { try { FS.mkdir(d); } catch (e) { /* exists */ } }
      let errors = 0;
      for (const file of libraryFiles) { try { writeLibFile(FS, file); } catch (e) { errors++; } }
      if (errors > 0) console.error('library write errors:', errors);
      libraryFiles = []; // release the transferred buffers
      try { FS.chdir('/workspace'); } catch (e) { /* ignore */ }
    }],

    onRuntimeInitialized: function () {
      try {
        Module._lean_initialize_runtime_module();
        Module._lean_initialize();
        Module._lean_io_mark_end_initialization();
        if (Module._lean_init_task_manager) Module._lean_init_task_manager();
        if (Module._lean_enable_initializer_execution) Module._lean_enable_initializer_execution();
        const spRes = Module._lean_init_search_path();
        if ((Module.getValue(spRes + 7, 'i8') & 0xff) !== 0) {
          try { Module._lean_io_result_show_error(spRes); } catch (e) { /* ignore */ }
          throw new Error('lean_init_search_path failed (see stderr)');
        }
        moduleReady = true;
        self.postMessage({ type: 'worker_ready' });
      } catch (e) {
        self.postMessage({ type: 'error', data: 'Lean init failed: ' + ((e && e.message) || e) });
      }
    },

    onAbort: function (what) {
      moduleReady = false;
      self.postMessage({ type: 'error', data: 'Aborted: ' + (what || 'unknown') });
    },
  };

  try {
    importScripts(assetBase + '/lean.js' + assetQ);
  } catch (e) {
    self.postMessage({ type: 'error', data: 'Failed to load lean.js: ' + ((e && e.message) || e) });
  }
}

self.postMessage({ type: 'worker_boot' });
