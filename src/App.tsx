import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  fetchCompleteFileList,
  fetchOleanFiles,
  getRequiredOleanPaths,
  parseUserImports,
  closureDownloadSize,
} from './lean-loader'
import { LEAN_WASM_BASE } from './config'
import { highlightLean } from './leanHighlight'
import { examples } from './examples'
import './App.css'

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
  const [leanCode, setLeanCode] = useState<string>(`#check 2 + 2
#check Nat.add
def hello := "Hello, WASM!"
#check hello`)
  const [leanFlags, setLeanFlags] = useState<string>('--json')  // Additional flags for Lean
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [loadPercent, setLoadPercent] = useState<number>(0)  // 0-100 for the preload bar
  const [wasmLoaded, setWasmLoaded] = useState(false)  // Track if WASM is cached
  const [manifestLoaded, setManifestLoaded] = useState(false)  // Track if manifest is loaded
  const moduleRef = useRef<LeanModule | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const tabEscapeRef = useRef(false)  // Esc arms the next Tab to move focus out
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const loadedOleansRef = useRef<Map<string, Uint8Array>>(new Map())  // Cache of loaded .olean files
  // Persistent worker: one live wasm instance serving repeated compiles via
  // lean_wasm_compile. The first compile imports Init inside Lean and caches the
  // environment; later compiles skip the import entirely (~0.2s each).
  const persistentWorkerRef = useRef<Worker | null>(null)
  const persistentReadyRef = useRef(false)
  const persistentCompiledOnceRef = useRef(false)
  const persistentPendingRef = useRef<{ resolve: (r: { success: boolean; error?: string }) => void } | null>(null)

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
      iframe.src = `/lean-worker-simple.html?assetBase=${encodeURIComponent(LEAN_WASM_BASE)}`
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
      if (imports.length === 1 && imports[0] === 'Init') {
        paths = paths.filter(p => p === 'Init.olean' || p.startsWith('Init/'))
      }
    } catch (e) {
      console.warn('Complete file list unavailable, falling back to manifest closure:', e)
      paths = await getRequiredOleanPaths(imports)
    }
    const missing = paths.filter(p => !loadedOleansRef.current.has(p))
    if (missing.length > 0) {
      const { bytes, known } = await closureDownloadSize(missing)
      const mb = (bytes / 1048576).toFixed(0)
      // Only claim a size when the manifest actually knew most files' sizes.
      const sizeLabel = known >= missing.length * 0.9 ? ` (~${mb} MB)` : ''
      setLoadingProgress(`Downloading ${missing.length} library files${sizeLabel}...`)
      const fetched = await fetchOleanFiles(missing, (loaded, total) => {
        setLoadingProgress(`Downloading: ${loaded}/${total} files${sizeLabel}`)
      })
      fetched.forEach((data, path) => loadedOleansRef.current.set(path, data))
    }
    const result = new Map<string, Uint8Array>()
    for (const p of paths) {
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
        `/lean-worker-persistent.worker.js?assetBase=${encodeURIComponent(LEAN_WASM_BASE)}`,
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
          })
          worker.postMessage({ type: 'load_library', files: filesArray }, transfer)
        } else if (type === 'library_received') {
          worker.postMessage({ type: 'start_worker' })
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
      setTimeout(() => {
        if (persistentPendingRef.current) {
          persistentPendingRef.current = null
          resolve({ success: false, error: 'Compile timeout (240s)' })
        }
      }, 240000)
    })

    if (!result.success) {
      throw new Error(result.error || 'compile failed')
    }
    persistentCompiledOnceRef.current = true
  }, [ensurePersistentWorker])

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
      const allPaths = (await fetchCompleteFileList())
        .filter(p => p === 'Init.olean' || p.startsWith('Init/'))
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

    } catch (err) {
      console.error('Load error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
      loadStartedRef.current = false  // allow Retry
    }
  }, [manifestLoaded, loadFileList, ensurePersistentWorker, runPersistent])

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
    appendOutput('(olean files are version 4.28.0-pre - should match!)\n\n')
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

  // Run user's Lean code via a one-shot `lean input.lean` invocation.
  //
  // We deliberately do NOT use the resident `lean_wasm_compile` fast path: on
  // this 4.28 build it can't elaborate numerals/infix (`#check 2+2` fails), and
  // its cached environment is single-shot (the 2nd compile returns an IO error
  // from corrupted task-manager/env state). The one-shot frontend runs the real
  // `lean` pipeline, so it's correct for all code and reliable across runs; it
  // re-imports Init each run (~6-10s, mostly cached). Init is imported
  // implicitly when the code has no explicit `import`.
  const runLean = useCallback(async () => {
    if (!wasmLoaded) {
      setError('Lean WASM not loaded yet')
      return
    }

    setStatus('running')
    setOutput('')
    setError('')

    const explicitImports = parseUserImports(leanCode)
    // Code that needs only Init goes through the resident instance
    // (lean_wasm_compile, env cached across runs → ~0.2s repeat compiles). Code
    // with other explicit imports needs a full `lean` run, so it takes the
    // one-shot worker with a manifest-resolved subset of the library.
    const initOnly = explicitImports.every(i => i === 'Init')

    try {
      if (initOnly) {
        await runPersistent(leanCode)
      } else {
        const inputPath = '/workspace/input.lean'
        const flags = leanFlags.trim().split(/\s+/).filter(f => f.length > 0)
        const args = [...flags, inputPath]
        const files = await loadOleansFor([...new Set(['Init', ...explicitImports])])

        setLoadingProgress('Creating WASM instance...')
        await createFreshModule()
        await new Promise(resolve => setTimeout(resolve, 150))
        setLoadingProgress('Running...')
        const exitCode = await runInIframe(args, leanCode, inputPath, files)
        appendOutput(`\nExit code: ${exitCode}`)
      }
    } catch (err) {
      console.error('Error running code:', err)
      const msg = err instanceof Error ? err.message : String(err)
      // Append: stderr collected so far (e.g. the decoded IO error) must stay visible
      setError(prev => prev ? `${prev}\n${msg}` : msg)
    } finally {
      setLoadingProgress('')
      setStatus('ready')
    }
  }, [wasmLoaded, leanCode, leanFlags, appendOutput, createFreshModule, runInIframe, loadOleansFor, runPersistent])

  // Parse output for display
  const parsedOutput = useMemo(() => {
    return parseLeanOutput(output)
  }, [output])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, error])

  // Preload the library + WASM as soon as the page opens, so the first Run is
  // fast. Guard against React strict-mode's double-invoke in dev.
  const startedLoadRef = useRef(false)
  useEffect(() => {
    if (startedLoadRef.current) return
    startedLoadRef.current = true
    loadLean()
  }, [loadLean])

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
          {(status === 'idle' || status === 'loading') && (
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
                {examples.map((ex) => (
                  <option key={ex.name} value={ex.name}>{ex.name}</option>
                ))}
              </select>
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
            <div className="code-editor-wrap">
              <pre className="code-highlight" aria-hidden="true" ref={highlightRef}>
                <code dangerouslySetInnerHTML={{ __html: highlightLean(leanCode) + '\n' }} />
              </pre>
              <textarea
                className="code-editor"
                value={leanCode}
                onChange={(e) => setLeanCode(e.target.value)}
                onKeyDown={(e) => {
                  // Esc arms the next Tab to move focus out of the editor (the
                  // accessible way to escape a Tab-inserting textarea).
                  if (e.key === 'Escape') {
                    tabEscapeRef.current = true
                    return
                  }
                  if (e.key === 'Tab') {
                    if (tabEscapeRef.current) {
                      tabEscapeRef.current = false
                      return // let Tab move focus normally
                    }
                    // Otherwise insert two spaces (matches tab-size) at the caret
                    // instead of leaving the field, keeping focus (and Cmd+A) here.
                    e.preventDefault()
                    const el = e.currentTarget
                    const { selectionStart: s, selectionEnd: en, value } = el
                    const indent = '  '
                    setLeanCode(value.slice(0, s) + indent + value.slice(en))
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = s + indent.length
                    })
                    return
                  }
                  tabEscapeRef.current = false // any other key disarms
                }}
                onScroll={(e) => {
                  const el = highlightRef.current
                  if (el) {
                    el.scrollTop = e.currentTarget.scrollTop
                    el.scrollLeft = e.currentTarget.scrollLeft
                  }
                }}
                placeholder="Enter Lean 4 code here..."
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
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
          Lean 4.28.0-pre ·{' '}
          <a
            href="https://github.com/cauli/lean4/tree/wasm-fast-exported"
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
