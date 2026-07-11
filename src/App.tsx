import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  fetchCompleteFileList,
  fetchOleanFiles,
  getRequiredOleanPaths,
  parseUserImports,
  closureDownloadSize,
} from './lean-loader'
import { LEAN_WASM_BASE, workerAssetQuery } from './config'
import { examples } from './examples'
import { LeanEditor, dropModel, renameModel, type LeanMarker } from './editor/LeanEditor'
import { makeZip } from './zip'
import './App.css'

// A file in the in-browser workspace (persisted to localStorage).
interface WorkFile { name: string; content: string }

const DEFAULT_CODE = `#check 2 + 2
#check Nat.add
def hello := "Hello, WASM!"
#check hello`

// Normalize a user-entered file name: strip path bits, ensure .lean.
function normalizeFileName(raw: string): string | null {
  const base = raw.trim().replace(/[/\\]/g, '')
  if (!base) return null
  return base.endsWith('.lean') ? base : `${base}.lean`
}

// Share links. Small workspaces travel entirely in the URL (#s= gzip +
// base64url — eternal, no storage involved); past a size where links start
// getting mangled by chat apps and email, the gzipped payload is stored
// content-addressed in R2 via /api/share and the URL carries only #r2=<id>.
const SHARE_URL_LIMIT = 2000 // encoded chars; beyond this, store in R2

async function gzipWorkspace(files: WorkFile[], active: string): Promise<Uint8Array> {
  const raw = new TextEncoder().encode(JSON.stringify({ files, active }))
  const gz = new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')))
  return new Uint8Array(await gz.arrayBuffer())
}

async function gunzipWorkspace(bytes: Uint8Array): Promise<{ files: WorkFile[]; active: string } | null> {
  try {
    const raw = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')))
    const parsed = JSON.parse(await raw.text())
    if (parsed?.files?.length && parsed.files.every((f: WorkFile) => f.name && typeof f.content === 'string')) {
      return parsed
    }
  } catch { /* malformed payload */ }
  return null
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64url: string): Uint8Array | null {
  try {
    const bin = atob(b64url.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch { return null }
}

// Libraries that can be preloaded into the resident worker. Each maps to a
// top-level olean namespace that ships in the build; enabling it fetches that
// namespace's closure so `import <name>…` needs no download on first use.
// (Init is always loaded; Lean's closure includes Std.)
const AVAILABLE_LIBS: Array<{ name: string; label: string; size: string }> = [
  { name: 'Std', label: 'Std', size: '~70 MB' },
  { name: 'Lean', label: 'Lean (metaprogramming)', size: '~230 MB' },
  // Batteries is built separately against the exact Lean commit (native i386
  // toolchain) and merged into the served lean-lib tree. No build exists yet
  // for the current 4.33 toolchain, so the entry is off; loadOleansFor and the
  // gated examples pick it back up when one lands.
  // { name: 'Batteries', label: 'Batteries (community stdlib)', size: '~320 MB' },
]

// Parsed Lean diagnostic message
interface LeanDiagnostic {
  severity: 'information' | 'warning' | 'error' | string
  data: string
  pos: { line: number; column: number }
  endPos: { line: number; column: number }
  fileName: string
  caption?: string
  kind?: string
}

// Parse JSON output lines from Lean
function parseLeanOutput(output: string): { diagnostics: LeanDiagnostic[]; rawLines: string[] } {
  const diagnostics: LeanDiagnostic[] = []
  const rawLines: string[] = []
  
  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    try {
      const parsed = JSON.parse(line)
      if (parsed.pos && parsed.data !== undefined) {
        diagnostics.push(parsed as LeanDiagnostic)
      } else {
        rawLines.push(line)
      }
    } catch {
      rawLines.push(line)
    }
  }
  
  return { diagnostics, rawLines }
}

// Type for the Lean WASM module
interface LeanModule {
  // Different ways Emscripten might expose main
  callMain?: (args: string[]) => number
  _main?: (argc: number, argv: number) => number
  ccall?: (name: string, returnType: string, argTypes: string[], args: unknown[]) => unknown
  cwrap?: (name: string, returnType: string, argTypes: string[]) => (...args: unknown[]) => unknown
  
  // Filesystem
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void
    readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array
    mkdir: (path: string) => void
    readdir: (path: string) => string[]
    stat: (path: string) => { isDirectory: () => boolean }
    cwd: () => string
    chdir: (path: string) => void
  }
  ENV: Record<string, string>
  
  // Memory/utilities
  allocateUTF8?: (str: string) => number
  stringToNewUTF8?: (str: string) => number
  _malloc?: (size: number) => number
  _free?: (ptr: number) => void
  HEAPU8?: Uint8Array
  HEAPU32?: Uint32Array
  HEAP32?: Int32Array
  setValue?: (ptr: number, value: number, type: string) => void
  lengthBytesUTF8?: (str: string) => number
  stringToUTF8?: (str: string, ptr: number, maxBytes: number) => void
  
  print: (text: string) => void
  printErr: (text: string) => void
}

declare global {
  interface Window {
    Module?: LeanModule
  }
}

type Status = 'idle' | 'loading' | 'ready' | 'running' | 'error'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string>('')
  // Multi-file workspace: Monaco keeps one model per file; the app owns the
  // names + contents and persists them to localStorage. Compilation is still
  // per-file (the active one) — cross-file imports need saved user oleans,
  // which is the next phase of the Lean side.
  const [files, setFiles] = useState<WorkFile[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('leanWorkspace') || 'null')
      if (saved?.files?.length && saved.files.every((f: WorkFile) => f.name && typeof f.content === 'string')) {
        return saved.files
      }
    } catch { /* fresh start */ }
    return [{ name: 'Main.lean', content: DEFAULT_CODE }]
  })
  const [activeFile, setActiveFile] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('leanWorkspace') || 'null')
      if (saved?.active && saved?.files?.some((f: WorkFile) => f.name === saved.active)) return saved.active
    } catch { /* default */ }
    return 'Main.lean'
  })
  const leanCode = files.find((f) => f.name === activeFile)?.content ?? ''
  const setLeanCode = useCallback((content: string) => {
    setFiles((fs) => fs.map((f) => (f.name === activeFile ? { ...f, content } : f)))
  }, [activeFile])
  const [leanFlags, setLeanFlags] = useState<string>('--json')  // Additional flags for Lean
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [loadPercent, setLoadPercent] = useState<number>(0)  // 0-100 for the preload bar
  const [wasmLoaded, setWasmLoaded] = useState(false)  // Track if WASM is cached
  const [manifestLoaded, setManifestLoaded] = useState(false)  // Track if manifest is loaded
  // Libraries the user has opted into. Enabling one downloads its oleans into
  // the resident worker's filesystem (so `import <Lib>…` skips that download on
  // first use) and is remembered in localStorage as a permanent preference.
  const [enabledLibs, setEnabledLibs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('leanEnabledLibs') || '[]') } catch { return [] }
  })
  const [libLoading, setLibLoading] = useState<string | null>(null)  // lib currently being fetched
  const moduleRef = useRef<LeanModule | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const loadedOleansRef = useRef<Map<string, Uint8Array>>(new Map())  // Cache of loaded .olean files
  // Persistent worker: one live wasm instance serving repeated compiles via
  // lean_wasm_compile. The first compile imports Init inside Lean and caches the
  // environment; later compiles skip the import entirely (~0.2s each).
  const persistentWorkerRef = useRef<Worker | null>(null)
  const persistentReadyRef = useRef(false)
  const persistentCompiledOnceRef = useRef(false)
  const persistentPendingRef = useRef<{ resolve: (r: { success: boolean; error?: string }) => void } | null>(null)
  // Which .olean paths are present in the resident worker's in-WASM filesystem,
  // and a pending resolver for the worker's `files_added` ack. The resident
  // worker imports whatever the user's code imports, so we push the needed
  // oleans into its FS on demand (Init's closure is written at boot).
  const residentOleansRef = useRef<Set<string>>(new Set())
  const residentAddPendingRef = useRef<{ resolve: () => void } | null>(null)

  const appendOutput = useCallback((text: string, isError = false) => {
    if (isError) {
      setError(prev => prev + text + '\n')
    } else {
      setOutput(prev => prev + text + '\n')
    }
  }, [])


  // Create a fresh WASM module instance using an iframe for isolation
  // Note: Library loading is now handled by runInIframe, not createFreshModule
  const createFreshModule = useCallback((): Promise<LeanModule> => {
    return new Promise((resolve, reject) => {
      console.log('Creating fresh WASM module instance via iframe...')
      
      // Remove old iframe if exists
      if (scriptRef.current) {
        (scriptRef.current as unknown as HTMLIFrameElement).remove()
        scriptRef.current = null
      }
      moduleRef.current = null
      
      // Create iframe for isolation - each iframe gets a fresh JS environment
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      
      // For SharedArrayBuffer/pthreads to work in the iframe:
      // 1. Parent must be cross-origin isolated (COOP/COEP headers) ✓
      // 2. iframe must be same-origin (it is - served from same Vite server) ✓
      // 3. No restrictive sandbox attribute that blocks SharedArrayBuffer
      // See: https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated
      
      // Store reference (reusing scriptRef to avoid adding new refs)
      scriptRef.current = iframe as unknown as HTMLScriptElement
      
      // Message handler for this specific module creation
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return
        
        const { type, data } = event.data || {}
        
        if (type === 'iframe_ready') {
          console.log('Iframe ready, will configure on run...')
          // Create a proxy module - actual execution happens via runInIframe
          const proxyModule: LeanModule = {
            FS: {
              writeFile: () => {},
              readFile: () => { throw new Error('readFile not implemented') },
              mkdir: () => {},
              readdir: () => [],
              stat: () => ({ isDirectory: () => false }),
              cwd: () => '/workspace',
              chdir: () => {},
            },
            ENV: {},
            print: appendOutput,
            printErr: (text: string) => appendOutput(text, true),
            ccall: () => {
              throw new Error('Use runInIframe instead of direct ccall')
            },
          }
          moduleRef.current = proxyModule
          window.removeEventListener('message', messageHandler)
          resolve(proxyModule)
        } else if (type === 'stdout') {
          appendOutput(data)
        } else if (type === 'stderr') {
          appendOutput(data, true)
        } else if (type === 'progress') {
          setLoadingProgress(data)
        } else if (type === 'error') {
          console.error('Iframe error:', data)
          window.removeEventListener('message', messageHandler)
          reject(new Error(data))
        }
      }
      
      window.addEventListener('message', messageHandler)
      
      // Load the iframe content from separate HTML file
      iframe.src = `/lean-worker-simple.html?${workerAssetQuery}`
      document.body.appendChild(iframe)
      
      // Timeout for loading
      setTimeout(() => {
        if (!moduleRef.current) {
          window.removeEventListener('message', messageHandler)
          reject(new Error('Iframe initialization timeout'))
        }
      }, 120000)  // Increased timeout for library loading
    })
  }, [appendOutput])

  // Run Lean command in the iframe (one-shot mode)
  const runInIframe = useCallback((
    args: string[], 
    code?: string, 
    path?: string, 
    libraryFiles?: Map<string, Uint8Array>
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      const iframe = scriptRef.current as unknown as HTMLIFrameElement
      if (!iframe?.contentWindow) {
        reject(new Error('Iframe not ready'))
        return
      }
      
      const handler = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return
        const { type, exitCode, error, data } = event.data || {}
        
        if (type === 'library_received') {
          console.log('Library received by iframe')
          // Now start Lean
          iframe.contentWindow?.postMessage({ type: 'start' }, '*')
        } else if (type === 'done') {
          window.removeEventListener('message', handler)
          resolve(exitCode)
        } else if (type === 'error') {
          window.removeEventListener('message', handler)
          reject(new Error(error || data))
        } else if (type === 'stdout') {
          appendOutput(data)
        } else if (type === 'stderr') {
          appendOutput(data, true)
        } else if (type === 'progress') {
          setLoadingProgress(data)
        }
      }
      
      window.addEventListener('message', handler)
      
      // Step 1: Send configuration
      console.log('Sending configuration to iframe:', { args, code: !!code, path })
      iframe.contentWindow.postMessage({ 
        type: 'configure', 
        args, 
        code, 
        path 
      }, '*')
      
      // Step 2: Send library files if provided
      if (libraryFiles && libraryFiles.size > 0) {
        console.log(`Sending ${libraryFiles.size} library files to iframe...`)
        setLoadingProgress(`Sending ${libraryFiles.size} library files...`)
        
        // Convert Map to array for postMessage
        const filesArray: Array<{name: string, data: ArrayBuffer}> = []
        libraryFiles.forEach((data, name) => {
          const copy = new ArrayBuffer(data.byteLength)
          new Uint8Array(copy).set(data)
          filesArray.push({ name, data: copy })
        })
        
        try {
          iframe.contentWindow.postMessage({ 
            type: 'load_library', 
            files: filesArray 
          }, '*')
          console.log('postMessage for load_library sent successfully')
        } catch (e) {
          console.error('Failed to send library files:', e)
        }
      } else {
        // No library needed, start immediately
        console.log('No library files, starting Lean...')
        iframe.contentWindow.postMessage({ type: 'start' }, '*')
      }
      
      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', handler)
        reject(new Error('Lean execution timeout'))
      }, 120000)
    })
  }, [appendOutput])

  // Run a one-shot `lean <args>` in a Web Worker (off the page's main thread).
  // The same-origin iframe path above shares the main thread, so a multi-minute
  // `import Std` froze the whole tab; a Worker keeps the page responsive and
  // streams per-module import progress.
  const runOneShot = useCallback((
    args: string[],
    code: string,
    path: string,
    libraryFiles: Map<string, Uint8Array>,
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        `/lean-worker-oneshot.worker.js?${workerAssetQuery}`,
      )
      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        worker.terminate()
        fn()
      }
      // Generous cap: a large import (Std/Lean) can take a few minutes.
      const timeout = setTimeout(
        () => finish(() => reject(new Error('Lean execution timed out (5 min)'))),
        300000,
      )
      worker.onmessage = (event: MessageEvent) => {
        const { type, exitCode, data, loaded, total } = event.data || {}
        if (type === 'stdout') appendOutput(data)
        else if (type === 'stderr') appendOutput(data, true)
        else if (type === 'import_progress') setLoadingProgress(
          total ? `Importing modules: ${loaded} / ${total}…` : `Importing modules: ${loaded}…`)
        else if (type === 'progress') setLoadingProgress(data)
        else if (type === 'done') finish(() => resolve(exitCode))
      }
      worker.onerror = (e) => finish(() => reject(new Error(e.message || 'one-shot worker error')))

      const filesArray: Array<{ name: string, data: ArrayBuffer }> = []
      const transfer: ArrayBuffer[] = []
      libraryFiles.forEach((d, name) => {
        const copy = new ArrayBuffer(d.byteLength)
        new Uint8Array(copy).set(d)
        filesArray.push({ name, data: copy })
        transfer.push(copy)
      })
      worker.postMessage({ type: 'run', files: filesArray, args, code, path }, transfer)
    })
  }, [appendOutput])

  // Pre-fetch the file list (lightweight)
  const loadFileList = useCallback(async () => {
    setLoadingProgress('Loading library file list...')
    const files = await fetchCompleteFileList()
    setManifestLoaded(true)
    console.log(`File list loaded: ${files.length} files`)
  }, [])

  // Fetch the .olean files needed for the given imports, reusing the cache.
  // We start from the COMPLETE base-.olean file list rather than a manifest
  // closure: the manifest is parsed from source `import` lines, which diverge
  // from the modules an .olean actually pulls in (e.g. auto-bound helpers), so
  // a closure can miss files and the import then fails with "object file ...
  // does not exist".
  //
  // Exception: the resident worker only ever elaborates Init-only code, so it
  // needs just Init's closure — which is exactly the `Init` namespace, since
  // Init is the base library and doesn't depend on Std/Lean. Loading those ~506
  // files (~65MB) instead of all ~2098 (~240MB) cuts the dominant preload cost:
  // transferring the oleans into the in-WASM filesystem.
  const loadOleansFor = useCallback(async (imports: string[]): Promise<Map<string, Uint8Array>> => {
    let paths: string[]
    try {
      paths = await fetchCompleteFileList()
      if (paths.length === 0) throw new Error('empty file list')
      // Load the namespace closure for the requested imports. The shipped library
      // is layered Init < Std < Lean < Lake, and each layer's oleans are self-
      // contained given the layers below it, so we load Init plus every layer up
      // to the highest one referenced. This keeps an Init-only run at ~65MB and a
      // Std import at ~135MB instead of transferring the whole ~240MB library.
      const tops = new Set(imports.map(i => i.split('.')[0]))
      const load = new Set(['Init'])
      if (tops.has('Std') || tops.has('Lean') || tops.has('Lake') || tops.has('Batteries')) load.add('Std')
      // Batteries' tactics meta-import Lean, so it sits above the Lean layer.
      if (tops.has('Lean') || tops.has('Lake') || tops.has('Batteries')) load.add('Lean')
      if (tops.has('Lake')) load.add('Lake')
      if (tops.has('Batteries')) load.add('Batteries')
      paths = paths.filter(p => load.has(p.split('/')[0].replace(/\.olean$/, '')))
    } catch (e) {
      console.warn('Complete file list unavailable, falling back to manifest closure:', e)
      paths = await getRequiredOleanPaths(imports)
    }
    // Also load each module's sibling `.ir` part: it carries the compiled
    // bodies the interpreter needs to `#eval` library code (the exported
    // `.olean` alone has none). They're olean-format (same magic/validation)
    // and small (~17% of the closure). A few modules ship no `.ir`; those
    // 404s are tolerated by fetchOleanFiles.
    const irPaths = paths.map(p => p.replace(/\.olean$/, '.ir'))
    const allPaths = [...paths, ...irPaths]
    const missing = allPaths.filter(p => !loadedOleansRef.current.has(p))
    if (missing.length > 0) {
      // Only oleans have manifest-recorded sizes; base the label on them so the
      // untracked `.ir` sizes don't suppress it.
      const missingOleans = missing.filter(p => p.endsWith('.olean'))
      const { bytes, known } = await closureDownloadSize(missingOleans)
      const mb = (bytes / 1048576).toFixed(0)
      const sizeLabel = known >= missingOleans.length * 0.9 ? ` (~${mb} MB +ir)` : ''
      setLoadingProgress(`Downloading ${missing.length} library files${sizeLabel}...`)
      const fetched = await fetchOleanFiles(missing, (loaded, total) => {
        setLoadingProgress(`Downloading: ${loaded}/${total} files${sizeLabel}`)
      })
      fetched.forEach((data, path) => loadedOleansRef.current.set(path, data))
    }
    const result = new Map<string, Uint8Array>()
    for (const p of allPaths) {
      const data = loadedOleansRef.current.get(p)
      if (data) result.set(p, data)
    }
    console.log(`Library ready: ${result.size} files for imports [${imports.join(', ')}] (${missing.length} newly fetched)`)
    return result
  }, [])

  // Boot the persistent worker: fetch the library, load one wasm instance, and
  // initialize the Lean runtime without running main(). Returns once ready.
  const ensurePersistentWorker = useCallback(async (): Promise<void> => {
    if (persistentWorkerRef.current && persistentReadyRef.current) return

    const files = await loadOleansFor(['Init'])

    setLoadingProgress('Starting persistent Lean instance…')
    await new Promise<void>((resolve, reject) => {
      // A Web Worker (not a same-origin iframe): the ~1-minute synchronous Init
      // import runs on the worker's own thread, so the page stays responsive.
      const worker = new Worker(
        `/lean-worker-persistent.worker.js?${workerAssetQuery}`,
      )
      persistentWorkerRef.current = worker

      const timeout = setTimeout(() => {
        worker.terminate()
        persistentWorkerRef.current = null
        reject(new Error('Persistent worker initialization timeout'))
      }, 300000)

      worker.onmessage = (event: MessageEvent) => {
        const { type, data, error } = event.data || {}
        if (type === 'worker_boot') {
          // Hand the olean buffers to the worker as transferables — no copy on
          // the main thread (those copies were part of the ~1s load stalls).
          const filesArray: Array<{ name: string, data: ArrayBuffer }> = []
          const transfer: ArrayBuffer[] = []
          files.forEach((d, name) => {
            const copy = new ArrayBuffer(d.byteLength)
            new Uint8Array(copy).set(d)
            filesArray.push({ name, data: copy })
            transfer.push(copy)
            residentOleansRef.current.add(name)
          })
          worker.postMessage({ type: 'load_library', files: filesArray }, transfer)
        } else if (type === 'library_received') {
          worker.postMessage({ type: 'start_worker' })
        } else if (type === 'files_added') {
          residentAddPendingRef.current?.resolve()
          residentAddPendingRef.current = null
        } else if (type === 'worker_ready') {
          persistentReadyRef.current = true
          clearTimeout(timeout)
          // Keep this handler installed: it also serves compile traffic below.
          resolve()
        } else if (type === 'stdout') {
          appendOutput(data)
        } else if (type === 'stderr') {
          appendOutput(data, true)
        } else if (type === 'progress') {
          setLoadingProgress(data)
        } else if (type === 'import_progress') {
          const { loaded, total } = event.data
          // The import spans the 70–95% band of the preload bar.
          setLoadPercent(70 + Math.round(25 * loaded / Math.max(total, 1)))
          setLoadingProgress(`Importing Lean core: ${loaded} / ${total} modules…`)
        } else if (type === 'compile_result') {
          persistentPendingRef.current?.resolve(event.data)
          persistentPendingRef.current = null
        } else if (type === 'error') {
          clearTimeout(timeout)
          persistentReadyRef.current = false
          const err = new Error(error || data || 'persistent worker error')
          if (persistentPendingRef.current) {
            persistentPendingRef.current.resolve({ success: false, error: err.message })
            persistentPendingRef.current = null
          } else {
            reject(err)
          }
        }
      }

      worker.onerror = (e) => {
        clearTimeout(timeout)
        persistentReadyRef.current = false
        reject(new Error(`Worker failed: ${e.message || 'could not start'}`))
      }
    })
  }, [appendOutput, loadOleansFor])

  // Compile Init-only code in the resident instance (fast path).
  const runPersistent = useCallback(async (code: string): Promise<void> => {
    await ensurePersistentWorker()
    const worker = persistentWorkerRef.current
    if (!worker) throw new Error('Persistent worker not available')

    setLoadingProgress(persistentCompiledOnceRef.current
      ? 'Running…'
      : 'First compile: importing Init inside WASM…')

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      persistentPendingRef.current = { resolve }
      worker.postMessage({ type: 'compile', code, path: '/workspace/input.lean' })
      // Generous: a first compile legitimately runs for minutes — the env
      // import of a big library layer (Lean/Batteries ≈ 2300+ modules), plus
      // on a cold first visit the pthread pool may still be streaming lean.js
      // from the CDN underneath it (observed >240s on staging).
      setTimeout(() => {
        if (persistentPendingRef.current) {
          persistentPendingRef.current = null
          resolve({ success: false, error: 'Compile timeout (600s)' })
        }
      }, 600000)
    })

    if (!result.success) {
      throw new Error(result.error || 'compile failed')
    }
    persistentCompiledOnceRef.current = true
  }, [ensurePersistentWorker])

  // Make sure the resident worker's in-WASM filesystem has the oleans for the
  // given imports, writing any that aren't there yet. The resident `wasmCompile`
  // reads the file's `import` header and imports that closure, so the modules
  // must be on disk first. Init's closure is written at boot.
  const ensureResidentOleans = useCallback(async (imports: string[]): Promise<void> => {
    const worker = persistentWorkerRef.current
    if (!worker) return
    const files = await loadOleansFor(imports)
    const missing: Array<{ name: string, data: ArrayBuffer }> = []
    const transfer: ArrayBuffer[] = []
    files.forEach((d, name) => {
      if (residentOleansRef.current.has(name)) return
      const copy = new ArrayBuffer(d.byteLength)
      new Uint8Array(copy).set(d)
      missing.push({ name, data: copy })
      transfer.push(copy)
      residentOleansRef.current.add(name)
    })
    if (missing.length === 0) return
    setLoadingProgress(`Adding ${missing.length} library files…`)
    await new Promise<void>((resolve) => {
      residentAddPendingRef.current = { resolve }
      worker.postMessage({ type: 'add_files', files: missing }, transfer)
    })
  }, [loadOleansFor])

  // Toggle a library preference. Enabling it downloads its oleans into the
  // resident worker now (if the worker is up) and persists the choice; on later
  // visits the preload step loads it automatically. Import stays lazy — this
  // only puts the oleans on disk so the first `import` skips the download.
  const toggleLib = useCallback(async (name: string) => {
    const enabling = !enabledLibs.includes(name)
    const next = enabling ? [...enabledLibs, name] : enabledLibs.filter(l => l !== name)
    setEnabledLibs(next)
    try { localStorage.setItem('leanEnabledLibs', JSON.stringify(next)) } catch { /* ignore */ }
    if (enabling && persistentReadyRef.current) {
      setLibLoading(name)
      try {
        await ensureResidentOleans(['Init', name])
      } catch (e) {
        console.error(`Failed to preload ${name}:`, e)
      } finally {
        setLibLoading(null)
        setLoadingProgress('')
      }
    }
  }, [enabledLibs, ensureResidentOleans])

  // Preload everything up front so pressing Run does no network I/O: download
  // Init's closure, boot the resident worker, and warm the Init import — all
  // behind the progress bar on page load. Guarded so it can't run twice (React
  // strict-mode double-invoke, or a re-render re-firing the mount effect),
  // which would boot two workers and import Init twice.
  const loadStartedRef = useRef(false)
  const loadLean = useCallback(async () => {
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    setStatus('loading')
    setLoadPercent(0)
    setLoadingProgress('Checking WASM files…')
    setError('')

    try {
      const checkResponse = await fetch(`${LEAN_WASM_BASE}/lean.js`, { method: 'HEAD' })
      if (!checkResponse.ok) {
        throw new Error(`Lean WASM files not found at ${LEAN_WASM_BASE}. In dev, extract the WASM build to public/lean-wasm/.`)
      }

      if (!manifestLoaded) {
        await loadFileList()
      }

      // Download just Init's closure (the `Init` namespace) — all the resident
      // worker needs. Cached in the Cache API on later visits. Code with
      // explicit non-Init imports takes the one-shot path, which fetches the
      // rest of the library on demand.
      const oleanPaths = (await fetchCompleteFileList())
        .filter(p => p === 'Init.olean' || p.startsWith('Init/'))
      // Prefetch the sibling `.ir` parts too (needed so `#eval` runs library
      // code); loadOleansFor loads the same set into the worker.
      const allPaths = [...oleanPaths, ...oleanPaths.map(p => p.replace(/\.olean$/, '.ir'))]
      const cached = loadedOleansRef.current
      const missing = allPaths.filter(p => !cached.has(p))
      if (missing.length > 0) {
        setLoadingProgress(`Downloading Lean library (${missing.length} files)…`)
        const fetched = await fetchOleanFiles(missing, (loaded, total) => {
          // Reserve the last 40% of the bar for booting + importing Init.
          setLoadPercent(Math.round(60 * loaded / total))
          setLoadingProgress(`Downloading Lean library: ${loaded} / ${total} files`)
        })
        fetched.forEach((d, p) => cached.set(p, d))
      }
      setLoadPercent(60)

      // Boot the resident Lean instance (loads the .oleans into the in-WASM
      // filesystem and initializes the runtime), then warm it with an empty
      // compile that imports Init inside Lean. Both are one-time costs; doing
      // them here means the first real Run is as fast as every subsequent one.
      setLoadingProgress('Starting Lean instance…')
      await ensurePersistentWorker()
      setLoadPercent(70)
      setLoadingProgress('Importing Lean core (one-time, about a minute)…')
      await runPersistent('')
      setOutput('')
      setError('')

      setWasmLoaded(true)
      setLoadPercent(100)
      setLoadingProgress('Ready')
      setStatus('ready')

      // Background-load any libraries the user has enabled (persisted). The app
      // is already usable; these just put the oleans on disk so the first
      // `import` skips the download. Read localStorage directly so this doesn't
      // depend on React state timing.
      let savedLibs: string[] = []
      try { savedLibs = JSON.parse(localStorage.getItem('leanEnabledLibs') || '[]') } catch { /* ignore */ }
      for (const lib of savedLibs) {
        setLibLoading(lib)
        try {
          await ensureResidentOleans(['Init', lib])
        } catch (e) {
          console.error(`Failed to preload ${lib}:`, e)
        } finally {
          setLibLoading(null)
          setLoadingProgress('')
        }
      }

    } catch (err) {
      console.error('Load error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
      loadStartedRef.current = false  // allow Retry
    }
  }, [manifestLoaded, loadFileList, ensurePersistentWorker, runPersistent, ensureResidentOleans])

  // Test with --version (simplest test)
  const testVersion = useCallback(async () => {
    if (!wasmLoaded) {
      setError('Lean WASM not loaded yet')
      return
    }

    setStatus('running')
    setOutput('')
    setError('')
    appendOutput('Running: lean --version\n')
    appendOutput('(olean files are version 4.33.0-pre - should match!)\n\n')
    setLoadingProgress('Creating fresh WASM instance...')

    try {
      // Create fresh iframe
      await createFreshModule()
      // Add small delay to let pthread workers spawn
      await new Promise(resolve => setTimeout(resolve, 150))
      setLoadingProgress('Workers ready, running...')
      const exitCode = await runInIframe(['--version'])
      appendOutput(`\nExit code: ${exitCode}`)
    } catch (err) {
      console.error('Error running --version:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingProgress('')
      setStatus('ready')
    }
  }, [wasmLoaded, appendOutput, createFreshModule, runInIframe])

  // Test with --help
  const testHelp = useCallback(async () => {
    if (!wasmLoaded) {
      setError('Lean WASM not loaded yet')
      return
    }

    setStatus('running')
    setOutput('')
    setError('')
    appendOutput('Running: lean --help\n')
    setLoadingProgress('Creating fresh WASM instance...')

    try {
      await createFreshModule()
      // Add small delay to let pthread workers spawn
      await new Promise(resolve => setTimeout(resolve, 150))
      setLoadingProgress('Workers ready, running...')
      const exitCode = await runInIframe(['--help'])
      appendOutput(`\nExit code: ${exitCode}`)
    } catch (err) {
      console.error('Error running --help:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingProgress('')
      setStatus('ready')
    }
  }, [wasmLoaded, appendOutput, createFreshModule, runInIframe])

  // Run the user's Lean code in the resident instance. Its `wasmCompile` reads
  // the file's `import` header and imports that closure into a per-import-set
  // environment cache, so the first compile of a given import set is slow and
  // every repeat is ~0.2s — Init-only *and* `import Std …` code alike. We push
  // the needed oleans into the resident filesystem first. If the resident
  // compile fails for any reason, we fall back to a one-shot `lean` run.
  const runLean = useCallback(async () => {
    if (!wasmLoaded) {
      setError('Lean WASM not loaded yet')
      return
    }

    setStatus('running')
    setOutput('')
    setError('')

    const explicitImports = parseUserImports(leanCode)
    const extraImports = explicitImports.filter(i => i !== 'Init')

    try {
      await ensurePersistentWorker()
      if (extraImports.length > 0) {
        setLoadingProgress(`Importing ${extraImports.join(', ')} (first run is slow)…`)
        await ensureResidentOleans([...new Set(['Init', ...explicitImports])])
      }
      await runPersistent(leanCode)
    } catch (err) {
      // Fall back to a one-shot `lean` run (a fresh module + the standard
      // frontend), which is slower but independent of the resident state.
      console.error('Resident compile failed; falling back to one-shot:', err)
      try {
        const inputPath = '/workspace/input.lean'
        const flags = leanFlags.trim().split(/\s+/).filter(f => f.length > 0)
        const args = [...flags, inputPath]
        const files = await loadOleansFor([...new Set(['Init', ...explicitImports])])
        setOutput('')
        setError('')
        const exitCode = await runOneShot(args, leanCode, inputPath, files)
        appendOutput(`\nExit code: ${exitCode}`)
      } catch (err2) {
        const msg = err2 instanceof Error ? err2.message : String(err2)
        setError(prev => prev ? `${prev}\n${msg}` : msg)
      }
    } finally {
      setLoadingProgress('')
      setStatus('ready')
    }
  }, [wasmLoaded, leanCode, leanFlags, appendOutput, ensurePersistentWorker, ensureResidentOleans, runPersistent, runOneShot, loadOleansFor])

  // Parse output for display
  const parsedOutput = useMemo(() => {
    return parseLeanOutput(output)
  }, [output])

  // Diagnostics as Monaco markers (squiggles) on the active file. Lean's
  // JSON positions are 1-based lines / 0-based columns.
  const editorMarkers = useMemo<LeanMarker[]>(() =>
    parsedOutput.diagnostics.map((d) => ({
      severity: d.severity,
      message: d.data,
      startLine: d.pos.line,
      startColumn: d.pos.column,
      endLine: d.endPos?.line ?? d.pos.line,
      endColumn: d.endPos?.column ?? d.pos.column + 1,
    })), [parsedOutput])

  // Persist the workspace (debounced — this fires per keystroke).
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem('leanWorkspace', JSON.stringify({ files, active: activeFile })) }
      catch { /* quota */ }
    }, 400)
    return () => clearTimeout(t)
  }, [files, activeFile])

  // Load a share link once on mount; it replaces the workspace. Two forms:
  // #s= carries the payload itself, #r2= is an id into /api/share storage.
  useEffect(() => {
    const apply = (shared: { files: WorkFile[]; active: string } | null) => {
      if (shared) {
        setFiles(shared.files)
        setActiveFile(shared.active)
      }
      history.replaceState(null, '', location.pathname + location.search)
    }
    const inline = location.hash.match(/^#s=(.+)$/)
    if (inline) {
      const bytes = fromBase64Url(inline[1])
      if (bytes) gunzipWorkspace(bytes).then(apply)
      else apply(null)
      return
    }
    const stored = location.hash.match(/^#r2=([0-9a-f]{64})$/)
    if (stored) {
      fetch(`/api/share/${stored[1]}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((buf) => gunzipWorkspace(new Uint8Array(buf)))
        .then(apply)
        .catch(() => apply(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFile = useCallback(() => {
    const raw = prompt('New file name:', 'Scratch.lean')
    if (raw === null) return
    const name = normalizeFileName(raw)
    if (!name) return
    setFiles((fs) => fs.some((f) => f.name === name) ? fs : [...fs, { name, content: '' }])
    setActiveFile(name)
  }, [])

  const closeFile = useCallback((name: string) => {
    const f = files.find((x) => x.name === name)
    if (f && f.content.trim() && !confirm(`Delete ${name}? Its contents will be lost.`)) return
    setFiles((fs) => {
      const next = fs.filter((x) => x.name !== name)
      return next.length ? next : [{ name: 'Main.lean', content: '' }]
    })
    dropModel(name)
    if (activeFile === name) {
      const rest = files.filter((x) => x.name !== name)
      setActiveFile(rest[0]?.name ?? 'Main.lean')
    }
  }, [files, activeFile])

  const renameFile = useCallback((name: string) => {
    const raw = prompt('Rename file:', name)
    if (raw === null) return
    const next = normalizeFileName(raw)
    if (!next || next === name || files.some((f) => f.name === next)) return
    setFiles((fs) => fs.map((f) => (f.name === name ? { ...f, name: next } : f)))
    renameModel(name, next)
    if (activeFile === name) setActiveFile(next)
  }, [files, activeFile])

  const shareWorkspace = useCallback(async () => {
    const bytes = await gzipWorkspace(files, activeFile)
    const encoded = toBase64Url(bytes)
    let fragment: string
    if (encoded.length <= SHARE_URL_LIMIT) {
      fragment = `#s=${encoded}`
    } else {
      // Too long to survive chat apps/email — store in R2, share the id.
      const resp = await fetch('/api/share', { method: 'POST', body: bytes as BodyInit })
      if (!resp.ok) {
        appendOutput(`Share failed: ${resp.status} ${await resp.text()}`, true)
        return
      }
      const { id } = await resp.json()
      fragment = `#r2=${id}`
    }
    const url = `${location.origin}${location.pathname}${fragment}`
    history.replaceState(null, '', fragment)
    try {
      await navigator.clipboard.writeText(url)
      appendOutput('Share link copied to clipboard.')
    } catch {
      appendOutput(`Share link: ${url}`)
    }
  }, [files, activeFile, appendOutput])

  // Download the workspace: a single file directly, several as a zip.
  const downloadWorkspace = useCallback(() => {
    const save = (blob: Blob, name: string) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    }
    if (files.length === 1) {
      save(new Blob([files[0].content], { type: 'text/plain' }), files[0].name)
    } else {
      save(makeZip(files), 'lean-workspace.zip')
    }
  }, [files])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, error])

  // iOS Safari can't fit the runtime in a tab: WebKit's compilation of the
  // 137MB wasm module alone costs hundreds of MB of transient memory on top
  // of the heap commit, and the tab gets jetsam-killed at "Starting persistent
  // Lean instance" no matter how small a heap we probe for. Gate instead of
  // crash-looping; a lighter (memory-growth) build is the real fix.
  const isIOS = useMemo(() =>
    /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), [])
  const [iosOverride, setIosOverride] = useState(false)

  // Preload the library + WASM as soon as the page opens, so the first Run is
  // fast. Guard against React strict-mode's double-invoke in dev.
  const startedLoadRef = useRef(false)
  useEffect(() => {
    if (startedLoadRef.current || (isIOS && !iosOverride)) return
    startedLoadRef.current = true
    loadLean()
  }, [loadLean, isIOS, iosOverride])

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="lean-logo">λ</span>
          Lean 4 WASM Playground
        </h1>
        <p className="subtitle">
          Run Lean 4 directly in your browser via WebAssembly
        </p>
      </header>

      <main className="main">
        <div className="controls">
          {isIOS && !iosOverride && status === 'idle' ? (
            <div className="preload">
              <span className="preload-label">
                iPhones and iPads can&apos;t fit the full Lean runtime in a browser
                tab yet (Safari runs out of memory compiling the 137&nbsp;MB WebAssembly
                module) — a lighter build is in the works. Please use a desktop
                browser for now.{' '}
                <button className="btn" onClick={() => setIosOverride(true)}>
                  Try anyway
                </button>
              </span>
            </div>
          ) : (status === 'idle' || status === 'loading') && (
            <div className="preload">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${loadPercent}%` }} />
              </div>
              <span className="preload-label">{loadingProgress || 'Starting…'}</span>
            </div>
          )}
          {(status === 'ready' || status === 'running') && (
            <>
              <button
                onClick={runLean}
                disabled={status === 'running'}
                className="btn btn-primary"
              >
                {status === 'running' ? 'Running...' : 'Run Code'}
              </button>
              <select
                className="example-select"
                disabled={status === 'running'}
                value=""
                onChange={(e) => {
                  const ex = examples.find((x) => x.name === e.target.value)
                  if (ex) setLeanCode(ex.code)
                }}
                title="Load an example into the editor"
              >
                <option value="" disabled>Load example…</option>
                <optgroup label="Core (Init)">
                  {examples.filter((ex) => !ex.requires).map((ex) => (
                    <option key={ex.name} value={ex.name}>{ex.name}</option>
                  ))}
                </optgroup>
                {AVAILABLE_LIBS.map((lib) => {
                  const exs = examples.filter((ex) => ex.requires === lib.name)
                  if (exs.length === 0) return null
                  const loaded = enabledLibs.includes(lib.name)
                  return (
                    <optgroup key={lib.name} label={loaded ? lib.label : `${lib.label} — enable in Libraries`}>
                      {exs.map((ex) => (
                        <option key={ex.name} value={ex.name} disabled={!loaded}>
                          {ex.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
              <details className="lib-dropdown">
                <summary className="example-select">
                  Libraries{enabledLibs.length ? ` (${enabledLibs.length})` : ''}
                </summary>
                <div className="lib-menu">
                  <div className="lib-menu-hint">
                    Preload a library so <code>import</code> needs no download. Init is always loaded.
                  </div>
                  {AVAILABLE_LIBS.map((lib) => (
                    <label key={lib.name} className="lib-item">
                      <input
                        type="checkbox"
                        checked={enabledLibs.includes(lib.name)}
                        disabled={libLoading !== null}
                        onChange={() => toggleLib(lib.name)}
                      />
                      <span className="lib-item-label">{lib.label}</span>
                      <span className="lib-size">
                        {libLoading === lib.name ? 'loading…' : lib.size}
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            </>
          )}
          {status === 'error' && (
            <button onClick={loadLean} className="btn btn-secondary">
              Retry
            </button>
          )}
          {/* Right side: while running, the spinner + progress; otherwise the status. */}
          {status === 'running' && loadingProgress ? (
            <div className="loading" style={{ marginLeft: 'auto' }}>
              <span>{loadingProgress}</span>
              <div className="spinner"></div>
            </div>
          ) : (
            <span className={`status status-${status}`}>
              {status === 'idle' && 'Not loaded'}
              {status === 'loading' && 'Loading...'}
              {status === 'ready' && 'Ready'}
              {status === 'running' && 'Running'}
              {status === 'error' && 'Error'}
            </span>
          )}
        </div>

        <div className="editor-container">
          <div className="panel">
            <div className="panel-header">
              <span>Code</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <button
                  className="btn btn-small"
                  onClick={shareWorkspace}
                  title="Copy a link that opens this workspace"
                >
                  Share
                </button>
                <button
                  className="btn btn-small"
                  onClick={downloadWorkspace}
                  title="Download your files (.lean, or a .zip for several)"
                >
                  Download
                </button>
                <label htmlFor="lean-flags" style={{ opacity: 0.7 }}>Flags:</label>
                <input
                  id="lean-flags"
                  type="text"
                  value={leanFlags}
                  onChange={(e) => setLeanFlags(e.target.value)}
                  placeholder="--json --quiet"
                  style={{
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #262626',
                    background: '#0a0a0a',
                    color: '#f5f5f5',
                    width: '200px',
                    fontSize: '0.75rem',
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}
                  title="Additional flags to pass to Lean (e.g., --json, --quiet, --stats)"
                />
              </div>
            </div>
            <div className="file-tabs" role="tablist">
              {files.map((f) => (
                <div
                  key={f.name}
                  role="tab"
                  aria-selected={f.name === activeFile}
                  className={`file-tab${f.name === activeFile ? ' file-tab-active' : ''}`}
                  onClick={() => setActiveFile(f.name)}
                  onDoubleClick={() => renameFile(f.name)}
                  title={`${f.name} — double-click to rename`}
                >
                  <span>{f.name}</span>
                  {files.length > 1 && (
                    <button
                      className="file-tab-close"
                      aria-label={`Close ${f.name}`}
                      onClick={(e) => { e.stopPropagation(); closeFile(f.name) }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className="file-tab-add" onClick={addFile} title="New file">+</button>
            </div>
            <div className="code-editor-wrap">
              <LeanEditor
                file={activeFile}
                content={leanCode}
                markers={editorMarkers}
                onChange={setLeanCode}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Output</span>
              <button 
                onClick={() => { setOutput(''); setError('') }}
                className="btn btn-small"
              >
                Clear
              </button>
            </div>
            <div className="output" ref={outputRef}>
              {/* Show parsed diagnostics */}
              {parsedOutput.diagnostics.length > 0 && (
                <div className="diagnostics">
                  {parsedOutput.diagnostics.map((diag, i) => (
                    <div 
                      key={i} 
                      className={`diagnostic diagnostic-${diag.severity}`}
                    >
                      <div className="diagnostic-header">
                        <span className="diagnostic-pos">
                          {diag.pos.line}:{diag.pos.column}
                        </span>
                        <span className={`diagnostic-badge diagnostic-badge-${diag.severity}`}>
                          {diag.severity === 'information' ? 'info' : diag.severity}
                        </span>
                      </div>
                      <div className="diagnostic-data">{diag.data}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Show raw lines (non-JSON output) */}
              {parsedOutput.rawLines.length > 0 && (
                <div className="raw-output">
                  {parsedOutput.rawLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
              {/* Show errors */}
              {error && <span className="output-error">{error}</span>}
              {/* Placeholder */}
              {!output && !error && (
                <span className="output-placeholder">
                  Output will appear here...
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-tools">
          <button
            onClick={testVersion}
            disabled={status !== 'ready'}
            className="btn btn-small"
            title="Run lean --version"
          >
            lean --version
          </button>
          <button
            onClick={testHelp}
            disabled={status !== 'ready'}
            className="btn btn-small"
            title="Run lean --help"
          >
            lean --help
          </button>
        </div>
        <p className="footer-meta">
          Lean 4.33.0-pre ·{' '}
          <a
            href="https://github.com/cauli/lean4/tree/reinstate-wasm"
            target="_blank"
            rel="noopener noreferrer"
          >
            lean4 fork
          </a>
          {' · '}
          <a
            href="https://github.com/cauli/lean4-wasm-in-browser"
            target="_blank"
            rel="noopener noreferrer"
          >
            playground
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
