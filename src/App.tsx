import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeCodeDependencies, fetchOleanFiles, loadManifest } from './lean-loader'
import './App.css'

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
  const [leanCode, setLeanCode] = useState<string>(`#eval 2 + 2`)
  const [leanFlags, setLeanFlags] = useState<string>('--json')  // Additional flags for Lean
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [wasmLoaded, setWasmLoaded] = useState(false)  // Track if WASM is cached
  const [manifestLoaded, setManifestLoaded] = useState(false)  // Track if manifest is loaded
  const moduleRef = useRef<LeanModule | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const loadedOleansRef = useRef<Map<string, Uint8Array>>(new Map())  // Cache of loaded .olean files

  // Check if SharedArrayBuffer is available and cross-origin isolated
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
  const isCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated
  
  // Log isolation status on mount
  useEffect(() => {
    console.log('=== PARENT CROSS-ORIGIN ISOLATION STATUS ===')
    console.log('crossOriginIsolated:', crossOriginIsolated)
    console.log('SharedArrayBuffer available:', hasSharedArrayBuffer)
    if (!isCrossOriginIsolated) {
      console.warn('⚠️ Parent page is NOT cross-origin isolated!')
      console.warn('   pthreads will NOT work in iframes.')
    } else {
      console.log('✓ Parent is cross-origin isolated')
    }
    console.log('=============================================')
  }, [])

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
      iframe.src = '/lean-worker-simple.html'
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

  // Run Lean command in the iframe
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

  // Load just the manifest (lightweight)
  const loadDependencyManifest = useCallback(async () => {
    setLoadingProgress('Loading dependency manifest...')
    await loadManifest()
    setManifestLoaded(true)
    console.log('Manifest loaded')
  }, [])

  // Load required .olean files for given code
  const loadRequiredOleans = useCallback(async (code: string): Promise<Map<string, Uint8Array>> => {
    setLoadingProgress('Analyzing dependencies...')
    const deps = await analyzeCodeDependencies(code)
    
    console.log('Dependencies analysis:', {
      explicit: deps.explicitImports,
      implicit: deps.implicitImports,
      totalModules: deps.allModules.length,
      oleanFiles: deps.oleanPaths.length,
    })
    
    appendOutput(`Loading ${deps.oleanPaths.length} modules (${deps.allModules.length} with transitive deps)\n`)
    
    // Check what's already cached
    const needed: string[] = []
    for (const path of deps.oleanPaths) {
      if (!loadedOleansRef.current.has(path)) {
        needed.push(path)
      }
    }
    
    if (needed.length > 0) {
      setLoadingProgress(`Downloading ${needed.length} .olean files...`)
      const newFiles = await fetchOleanFiles(needed, (loaded, total) => {
        setLoadingProgress(`Downloading: ${loaded}/${total} files`)
      })
      
      // Add to cache
      newFiles.forEach((data, path) => {
        loadedOleansRef.current.set(path, data)
      })
      console.log(`Downloaded ${newFiles.size} new .olean files, cache size: ${loadedOleansRef.current.size}`)
    } else {
      console.log(`All ${deps.oleanPaths.length} .olean files already cached`)
    }
    
    // Return only the files needed for this run
    const result = new Map<string, Uint8Array>()
    for (const path of deps.oleanPaths) {
      const data = loadedOleansRef.current.get(path)
      if (data) {
        result.set(path, data)
      }
    }
    
    return result
  }, [appendOutput])

  // Initial load - verify WASM and load manifest
  const loadLean = useCallback(async () => {
    if (!hasSharedArrayBuffer) {
      setError('SharedArrayBuffer is not available. This page must be served with proper COOP/COEP headers.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setLoadingProgress('Checking WASM files...')
    setOutput('')
    setError('')

    try {
      // Check if lean.js exists in public folder
      const checkResponse = await fetch('/lean-wasm/lean.js', { method: 'HEAD' })
      if (!checkResponse.ok) {
        throw new Error(`Lean WASM files not found. Please extract the WASM build to public/lean-wasm/`)
      }

      // Load manifest for dependency resolution
      if (!manifestLoaded) {
        await loadDependencyManifest()
        appendOutput('Dependency manifest loaded (dynamic loading enabled)\n')
      }

      setLoadingProgress('Loading Lean WASM module (~100MB, please wait)...')
      
      // Load the module once to verify it works and cache the WASM
      await createFreshModule()
      
      appendOutput('WASM module ready\n')
      appendOutput('Libraries will be loaded on-demand based on your imports.\n')
      
      setWasmLoaded(true)
      setLoadingProgress('Lean 4 WASM ready!')
      setStatus('ready')

    } catch (err) {
      console.error('Load error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [hasSharedArrayBuffer, manifestLoaded, loadDependencyManifest, createFreshModule, appendOutput])

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

  // Run user's Lean code
  const runLean = useCallback(async () => {
    if (!wasmLoaded) {
      setError('Lean WASM not loaded yet')
      return
    }

    setStatus('running')
    setOutput('')
    setError('')

    const inputPath = '/workspace/input.lean'
    // Parse flags from the input field
    const flags = leanFlags.trim().split(/\s+/).filter(f => f.length > 0)
    const args = [...flags, inputPath]
    appendOutput(`Running: lean ${args.join(' ')}\n`)

    try {
      // First, load required .olean files based on the code
      const requiredFiles = await loadRequiredOleans(leanCode)
      appendOutput(`Loaded ${requiredFiles.size} .olean files\n\n`)
      
      setLoadingProgress('Creating fresh WASM instance...')
      await createFreshModule()
      // Add small delay to let pthread workers spawn
      await new Promise(resolve => setTimeout(resolve, 150))
      setLoadingProgress('Workers ready, running...')
      const exitCode = await runInIframe(args, leanCode, inputPath, requiredFiles)
      appendOutput(`\nExit code: ${exitCode}`)
    } catch (err) {
      console.error('Error running code:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingProgress('')
      setStatus('ready')
    }
  }, [wasmLoaded, leanCode, leanFlags, appendOutput, createFreshModule, runInIframe, loadRequiredOleans])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, error])

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="lean-logo">λ</span>
          Lean 4 WASM Playground
        </h1>
        <p className="subtitle">
          ⚠️ AI-generated demo
        </p>
      </header>

      <main className="main">
        {!hasSharedArrayBuffer && (
          <div className="warning">
            ⚠️ SharedArrayBuffer is not available. Make sure the server sends:
            <code>Cross-Origin-Opener-Policy: same-origin</code>
            <code>Cross-Origin-Embedder-Policy: require-corp</code>
          </div>
        )}

        <div className="controls">
          {status === 'idle' && (
            <button onClick={loadLean} className="btn btn-primary">
              Load Lean 4 WASM
            </button>
          )}
          {status === 'loading' && (
            <div className="loading">
              <div className="spinner"></div>
              <span>{loadingProgress}</span>
            </div>
          )}
          {(status === 'ready' || status === 'running') && (
            <>
              {status === 'running' && loadingProgress && (
                <div className="loading" style={{ marginRight: '1rem' }}>
                  <div className="spinner"></div>
                  <span>{loadingProgress}</span>
                </div>
              )}
              <button 
                onClick={testVersion} 
                disabled={status === 'running'}
                className="btn btn-secondary"
                title="Test basic initialization"
              >
                --version
              </button>
              <button 
                onClick={testHelp} 
                disabled={status === 'running'}
                className="btn btn-secondary"
                title="Show help"
              >
                --help
              </button>
              <button 
                onClick={runLean} 
                disabled={status === 'running'}
                className="btn btn-primary"
              >
                {status === 'running' ? 'Running...' : 'Run Code'}
              </button>
            </>
          )}
          {status === 'error' && (
            <button onClick={loadLean} className="btn btn-secondary">
              Retry
            </button>
          )}
          <span className={`status status-${status}`}>
            {status === 'idle' && 'Not loaded'}
            {status === 'loading' && 'Loading...'}
            {status === 'ready' && 'Ready'}
            {status === 'running' && 'Running'}
            {status === 'error' && 'Error'}
          </span>
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
            <textarea
              className="code-editor"
              value={leanCode}
              onChange={(e) => setLeanCode(e.target.value)}
              placeholder="Enter Lean 4 code here..."
              spellCheck={false}
            />
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
            <pre className="output" ref={outputRef}>
              {output && <span className="output-text">{output}</span>}
              {error && <span className="output-error">{error}</span>}
              {!output && !error && (
                <span className="output-placeholder">
                  Output will appear here...
                </span>
              )}
            </pre>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Check browser console (F12) for detailed debugging info
        </p>
      </footer>
    </div>
  )
}

export default App
