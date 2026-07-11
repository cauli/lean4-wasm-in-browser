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

// Pick the largest shared wasm memory this device will actually grant.
// Desktop gets the full 2GB; iOS Safari kills the tab on a 2GB up-front
// commit (jetsam), so probe downward and boot with what fits. The build has
// ALLOW_MEMORY_GROWTH=0, so whatever we pick here is the heap for the whole
// session — maximum stays 32768 pages (2GB, virtual reservation only) to
// match the patched module's declared import.
function pickWasmMemory() {
  const PAGE = 65536;
  // iOS reports allocation success and then jetsam-kills the tab when the
  // pages are actually touched, so don't even attempt desktop-sized commits
  // there — start at 1GB and step down.
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const candidates = isIOS ? [1024, 768, 512] : [2048, 1536, 1024, 768];
  for (const mb of candidates) {
    try {
      const memory = new WebAssembly.Memory({ initial: (mb * 1024 * 1024) / PAGE, maximum: 32768, shared: true });
      if (mb < 2048) console.warn('[MEM] reduced wasm memory: ' + mb + 'MB (device limit)');
      return { memory, bytes: mb * 1024 * 1024 };
    } catch (e) { /* try smaller */ }
  }
  return null; // let Emscripten try its own default and fail loudly
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
  } else if (msg.type === 'load_snapshot') {
    loadSnapshot(msg.name, msg.url)
      .then((r) => self.postMessage({ type: 'snapshot_loaded', ...r }))
      .catch((e) => self.postMessage({ type: 'snapshot_loaded', success: false, error: (e && e.message) || String(e) }));
  }
};

// Seed Lean's environment cache from a baked `--incr-header-save` snapshot,
// replacing the multi-minute Init import. The snapshot is githash-paired with
// lean.wasm (its closure relocation is only valid for that binary), which the
// app guarantees by requesting it under the same ?v= as the binary itself.
//
// The worker fetches and streams the file into MEMFS itself: the ~240MB never
// exists as one JS buffer, let alone two (download + structured-clone copy on
// the main thread). Memory-starved tabs — iOS Safari — live or die on that
// peak, and everyone else parses the page while the download proceeds here.
async function loadSnapshot(name, url) {
  if (!moduleReady) return { success: false, error: 'Module not ready' };
  const t0 = performance.now();
  const FS = Module.FS;
  const p = '/snapshots/' + (name || 'init.snap');
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) return { success: false, error: `snapshot fetch: ${response.status}` };
    const total = Number(response.headers.get('content-length')) || 0;
    try { FS.mkdir('/snapshots'); } catch (e) { /* exists */ }
    const reader = response.body.getReader();
    const stream = FS.open(p, 'w');
    let received = 0;
    let lastReport = 0;
    let first = true;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // Guard against an SPA fallback page served with 200: snapshots are
      // compacted-region files and start with the olean magic.
      if (first) {
        first = false;
        if (value.length < 5 || value[0] !== 0x6f || value[1] !== 0x6c || value[2] !== 0x65 || value[3] !== 0x61 || value[4] !== 0x6e) {
          FS.close(stream);
          try { FS.unlink(p); } catch (e) { /* ignore */ }
          return { success: false, error: 'snapshot fetch returned non-olean content' };
        }
      }
      FS.write(stream, value, 0, value.length, received);
      received += value.length;
      if (received - lastReport > 8 * 1024 * 1024) {
        lastReport = received;
        self.postMessage({ type: 'snapshot_progress', received, total });
      }
    }
    FS.close(stream);
    self.postMessage({ type: 'snapshot_progress', received, total: total || received });
    // The loader reads a `<file>.deps` sidecar; self-contained snapshots use `[]`.
    FS.writeFile(p + '.deps', new Uint8Array([0x5b, 0x5d]));
    const resObj = Module._lean_wasm_load_snapshot(mkLeanString(p));
    const tag = Module.getValue(resObj + 7, 'i8') & 0xff;
    // The ok value is a UInt32, which wasm32 heap-boxes: field 0 points to a
    // scalar-box object with the payload at +8. 0 = loaded, 1 = load failed.
    const boxPtr = Module.getValue(resObj + 8, 'i32');
    const ret = Module.getValue(boxPtr + 8, 'i32');
    const success = tag === 0 && ret === 0;
    // The MEMFS copy served its purpose; the env holds the loaded region.
    try { FS.unlink(p); FS.unlink(p + '.deps'); } catch (e) { /* ignore */ }
    const elapsed = performance.now() - t0;
    console.log(`[SNAPSHOT] load ${success ? 'ok' : 'FAILED'} in ${elapsed.toFixed(0)}ms (tag ${tag}, ret ${ret})`);
    return { success, elapsed };
  } catch (e) {
    try { FS.unlink(p); } catch (e2) { /* ignore */ }
    console.error('[SNAPSHOT] threw:', e);
    return { success: false, error: (e && e.message) || String(e) };
  }
}

function startLeanModule() {
  self.Module = {
    // 4.28 ships a 16MB memory cap (patched to 2GB MAX in lean.wasm); the
    // probed memory below is as much as the device grants (2GB on desktop).
    ...(function () { const p = pickWasmMemory(); return p ? { wasmMemory: p.memory, INITIAL_MEMORY: p.bytes } : {}; })(),
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
