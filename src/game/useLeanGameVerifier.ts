import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchCompleteFileList,
  fetchLeanArtifactPack,
  fetchOleanFiles,
  type LeanArtifactPack,
} from '../lean-loader'
import {
  LEAN_ASSET_VERSION,
  LEAN_BIN_BASE,
  LEAN_VARIANT,
  LEAN_WASM_BASE,
  workerAssetQuery,
} from '../config'
import type { LeanMarker } from '../editor/LeanEditor'
import { gameForLevel, type GameLevel, type GameRules } from './game-data'
import {
  buildChallengeSource,
  buildGoalInspectionSource,
  checkProofPolicy,
  INVENTORY_POLICY_MARKER,
} from './verification-source'
import {
  buildRealAnalysisChallengeSource,
  buildRealAnalysisGoalInspectionSource,
} from './real-analysis-verification-source'
import {
  buildManifoldChallengeSource,
  buildManifoldGoalInspectionSource,
} from './manifold-verification-source'

export type CheckerStatus = 'idle' | 'loading' | 'ready' | 'checking' | 'error'

export interface GameDiagnostic extends LeanMarker {
  caption?: string
  kind?: string
}

export interface VerificationStage {
  label: string
  state: 'passed' | 'failed' | 'partial' | 'pending'
  detail: string
}

export interface GameVerificationResult {
  success: boolean
  kind: 'verified' | 'policy' | 'compiler' | 'runtime'
  headline: string
  detail: string
  diagnostics: GameDiagnostic[]
  stages: VerificationStage[]
  elapsedMs?: number
}

export interface GameGoalInspection {
  kind: 'goals' | 'complete' | 'policy' | 'compiler' | 'runtime'
  goals: string[]
  detail: string
  diagnostics: GameDiagnostic[]
  elapsedMs?: number
}

interface WorkerResult {
  success: boolean
  error?: string
  elapsed?: number
}

interface WorkerOutput {
  stream: 'stdout' | 'stderr'
  data: string
}

interface ManifoldWorldLayer {
  world: string
  manifestFile: string
  libraryRoot: string
  label: string
}

interface ManifoldLayerIndex {
  kind: 'manifold-course-layer-index'
  layers: ManifoldWorldLayer[]
}

interface JsonDiagnostic {
  severity?: string
  data?: string
  caption?: string
  kind?: string
  pos?: { line?: number; column?: number }
  endPos?: { line?: number; column?: number }
}

function resolveAfter<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(fallback), ms)
  })
}

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms)
  })
}

function parseDiagnostics(
  output: WorkerOutput[],
  proofStartLine: number,
  proofLineMap: number[],
): GameDiagnostic[] {
  const diagnostics: GameDiagnostic[] = []
  for (const entry of output) {
    for (const line of entry.data.split('\n')) {
      if (!line.trim()) continue
      try {
        const parsed = JSON.parse(line) as JsonDiagnostic
        if (!parsed.pos || parsed.data === undefined) continue
        const sourceLine = parsed.pos.line || 1
        const endSourceLine = parsed.endPos?.line || sourceLine
        const normalizedStartLine = Math.max(1, sourceLine - proofStartLine + 1)
        const normalizedEndLine = Math.max(1, endSourceLine - proofStartLine + 1)
        diagnostics.push({
          severity: parsed.severity || (entry.stream === 'stderr' ? 'error' : 'information'),
          message: parsed.data,
          caption: parsed.caption,
          kind: parsed.kind,
          startLine: proofLineMap[normalizedStartLine - 1] || normalizedStartLine,
          startColumn: parsed.pos.column || 0,
          endLine: proofLineMap[normalizedEndLine - 1] || normalizedEndLine,
          endColumn: parsed.endPos?.column ?? (parsed.pos.column || 0) + 1,
        })
      } catch {
        if (entry.stream === 'stderr' && line.trim()) {
          diagnostics.push({
            severity: 'error',
            message: line.trim(),
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 1,
          })
        }
      }
    }
  }
  return diagnostics
}

function liveGoalsFromDiagnostics(
  diagnostics: GameDiagnostic[],
  traceMarker: string,
): string[] {
  const goals: string[] = []
  let waitingForState = false

  for (const diagnostic of diagnostics) {
    if (diagnostic.kind !== 'trace') continue
    const traceLines = diagnostic.message.trim().split('\n').map((line) => line.trim())
    if (traceLines.length > 0 && traceLines.every((line) => line === traceMarker)) {
      waitingForState = true
      continue
    }
    if (!waitingForState) continue
    waitingForState = false
    if (!diagnostic.message.includes('⊢')) continue

    const state = diagnostic.message.trim()
    const caseStarts = [...state.matchAll(/^case .+$/gm)].map((match) => match.index || 0)
    if (caseStarts.length <= 1) {
      goals.push(state)
      continue
    }
    for (let index = 0; index < caseStarts.length; index += 1) {
      const goal = state.slice(caseStarts[index], caseStarts[index + 1]).trim()
      if (goal.includes('⊢')) goals.push(goal)
    }
  }

  return [...new Set(goals)]
}

function inventoryPolicyDiagnostics(diagnostics: GameDiagnostic[]): GameDiagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.message.includes(INVENTORY_POLICY_MARKER))
    .map((diagnostic) => ({
      ...diagnostic,
      message: diagnostic.message
        .replace(INVENTORY_POLICY_MARKER, '')
        .trim(),
    }))
}

export function useLeanGameVerifier() {
  const [status, setStatus] = useState<CheckerStatus>('idle')
  const statusRef = useRef<CheckerStatus>(status)
  const updateStatus = useCallback((nextStatus: CheckerStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])
  const [progress, setProgress] = useState('Lean starts when you verify an answer.')
  const workerRef = useRef<Worker | null>(null)
  const initializePromiseRef = useRef<Promise<void> | null>(null)
  const initFilesPromiseRef = useRef<Promise<void> | null>(null)
  const realAnalysisLayerPromiseRef = useRef<Promise<void> | null>(null)
  const manifoldLayerIndexPromiseRef = useRef<Promise<ManifoldLayerIndex> | null>(null)
  const manifoldLayerPromisesRef = useRef<Map<string, Promise<void>>>(new Map())
  const bootPendingRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null)
  const filesPendingRef = useRef<{ resolve: () => void } | null>(null)
  const snapshotPendingRef = useRef<{ resolve: (result: WorkerResult) => void } | null>(null)
  const compilePendingRef = useRef<{ resolve: (result: WorkerResult) => void } | null>(null)
  const outputRef = useRef<WorkerOutput[]>([])
  const compileQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const ensureWorker = useCallback(async () => {
    if (workerRef.current) return
    setProgress('Starting the local Lean runtime...')
    const worker = new Worker(`/lean-worker-persistent.worker.js?${workerAssetQuery}`)
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data || {}
      if (message.type === 'worker_boot') {
        worker.postMessage({ type: 'load_library', files: [] })
      } else if (message.type === 'library_received') {
        worker.postMessage({ type: 'start_worker' })
      } else if (message.type === 'worker_ready') {
        bootPendingRef.current?.resolve()
        bootPendingRef.current = null
      } else if (message.type === 'files_added') {
        filesPendingRef.current?.resolve()
        filesPendingRef.current = null
      } else if (message.type === 'snapshot_loaded') {
        snapshotPendingRef.current?.resolve(message as WorkerResult)
        snapshotPendingRef.current = null
      } else if (message.type === 'compile_result') {
        compilePendingRef.current?.resolve(message as WorkerResult)
        compilePendingRef.current = null
      } else if (message.type === 'stdout' || message.type === 'stderr') {
        outputRef.current.push({ stream: message.type, data: String(message.data || '') })
      } else if (message.type === 'snapshot_progress') {
        const received = Number(message.received || 0)
        const total = Number(message.total || 0)
        setProgress(total > 0
          ? `Loading Lean environment: ${Math.round(received / 1048576)} / ${Math.round(total / 1048576)} MB`
          : `Loading Lean environment: ${Math.round(received / 1048576)} MB`)
      } else if (message.type === 'import_progress') {
        setProgress(`Importing Lean core: ${message.loaded || 0} / ${message.total || 0} modules`)
      } else if (message.type === 'progress' && message.data) {
        setProgress(String(message.data))
      } else if (message.type === 'error') {
        const error = new Error(String(message.error || message.data || 'Lean worker error'))
        bootPendingRef.current?.reject(error)
        bootPendingRef.current = null
        compilePendingRef.current?.resolve({ success: false, error: error.message })
        compilePendingRef.current = null
      }
    }

    worker.onerror = (event) => {
      const error = new Error(event.message || 'The local Lean worker could not start.')
      bootPendingRef.current?.reject(error)
      bootPendingRef.current = null
    }

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        bootPendingRef.current = { resolve, reject }
      }),
      rejectAfter(300000, 'Lean startup timed out.'),
    ])
  }, [])

  const addInitFiles = useCallback(async () => {
    if (initFilesPromiseRef.current) return initFilesPromiseRef.current
    const promise = (async () => {
      const worker = workerRef.current
      if (!worker) throw new Error('Lean worker is unavailable.')
      const oleanPaths = (await fetchCompleteFileList())
        .filter((name) => name === 'Init.olean' || name.startsWith('Init/'))
      const paths = [
        ...oleanPaths,
        ...oleanPaths.flatMap((name) => [
          name.replace(/\.olean$/, '.ir'),
          name.replace(/\.olean$/, '.ir.sig'),
        ]),
      ]
      setProgress(`Downloading ${paths.length} Lean core files...`)
      const files = await fetchOleanFiles(paths, (loaded, total) => {
        setProgress(`Downloading Lean core: ${loaded} / ${total} files`)
      })
      const payload: Array<{ name: string; data: ArrayBuffer }> = []
      const transfer: ArrayBuffer[] = []
      files.forEach((bytes, name) => {
        const copy = new ArrayBuffer(bytes.byteLength)
        new Uint8Array(copy).set(bytes)
        payload.push({ name, data: copy })
        transfer.push(copy)
      })
      await Promise.race([
        new Promise<void>((resolve) => {
          filesPendingRef.current = { resolve }
          worker.postMessage({ type: 'add_files', files: payload }, transfer)
        }),
        rejectAfter(120000, 'Lean core file transfer timed out.'),
      ])
    })().catch((error) => {
      initFilesPromiseRef.current = null
      throw error
    })
    initFilesPromiseRef.current = promise
    return promise
  }, [])

  const loadSnapshot = useCallback(async (
    name: string,
    relativeUrl: string,
    label: string,
  ): Promise<boolean> => {
    const worker = workerRef.current
    if (!worker || LEAN_VARIANT === 'slim') return false
    try {
      const response = await fetch(relativeUrl, { method: 'HEAD' })
      if (!response.ok) return false
    } catch {
      return false
    }
    setProgress(label)
    const result = await Promise.race([
      new Promise<WorkerResult>((resolve) => {
        snapshotPendingRef.current = { resolve }
        worker.postMessage({
          type: 'load_snapshot',
          name,
          url: new URL(relativeUrl, location.origin).href,
        })
      }),
      resolveAfter<WorkerResult>(300000, { success: false, error: 'Snapshot load timed out.' }),
    ])
    return result.success
  }, [])

  const loadArtifactLayer = useCallback(async ({
    manifestFile,
    libraryRoot,
    label,
    readyMessage,
  }: {
    manifestFile: string
    libraryRoot: string
    label: string
    readyMessage: string
  }) => {
      const worker = workerRef.current
      if (!worker) throw new Error('Lean worker is unavailable.')
      if (LEAN_VARIANT === 'slim') {
        throw new Error(`${label} verification requires the desktop full Lean runtime.`)
      }
      setProgress(`Reading the local ${label} package...`)
      const response = await fetch(`${LEAN_WASM_BASE}/${manifestFile}`)
      if (!response.ok) {
        throw new Error(`The local ${label} Lean package was not found.`)
      }
      const manifest = await response.json() as {
        files?: string[]
        packs?: LeanArtifactPack[]
      }
      const paths = manifest.files || []
      if (paths.length === 0) {
        throw new Error(`The local ${label} Lean package is empty.`)
      }

      const addFilesToWorker = async (files: Map<string, Uint8Array>) => {
        const payload: Array<{ name: string; data: ArrayBuffer }> = []
        const transfer: ArrayBuffer[] = []
        files.forEach((bytes, name) => {
          const data = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
            ? bytes.buffer as ArrayBuffer
            : bytes.slice().buffer
          payload.push({ name, data })
          transfer.push(data)
        })
        await Promise.race([
          new Promise<void>((resolve) => {
            filesPendingRef.current = { resolve }
            worker.postMessage({ type: 'add_files', files: payload }, transfer)
          }),
          rejectAfter(120000, `${label} package transfer timed out.`),
        ])
      }

      const packs = manifest.packs || []
      if (packs.length > 0) {
        let loaded = 0
        for (let index = 0; index < packs.length; index += 1) {
          const pack = packs[index]
          setProgress(
            `Loading ${label}: pack ${index + 1} / ${packs.length}`,
          )
          const files = await fetchLeanArtifactPack(pack, libraryRoot)
          const expectedPaths = new Set(pack.entries.map((entry) => entry.path))
          const missing = [...expectedPaths].filter((file) => !files.has(file))
          if (missing.length > 0) {
            throw new Error(`The local ${label} package is incomplete (${missing.length} files missing).`)
          }
          await addFilesToWorker(files)
          loaded += files.size
          setProgress(`Loading ${label}: ${loaded} / ${paths.length} files`)
        }
      } else {
        const batchSize = 80
        for (let offset = 0; offset < paths.length; offset += batchSize) {
          const batch = paths.slice(offset, offset + batchSize)
          const files = await fetchOleanFiles(batch, (loaded) => {
            setProgress(`Loading ${label}: ${offset + loaded} / ${paths.length} files`)
          }, libraryRoot)
          const missing = batch.filter((file) => !files.has(file))
          if (missing.length > 0) {
            throw new Error(`The local ${label} package is incomplete (${missing.length} files missing).`)
          }
          await addFilesToWorker(files)
        }
      }

      setProgress(readyMessage)
  }, [])

  const ensureRealAnalysisLayer = useCallback(async () => {
    if (realAnalysisLayerPromiseRef.current) return realAnalysisLayerPromiseRef.current
    const promise = (async () => {
      await loadArtifactLayer({
        manifestFile: 'real-analysis-layer.json',
        libraryRoot: 'real-analysis-lib',
        label: 'Mathlib and Real Analysis',
        readyMessage: 'Mathlib and the Real Analysis course are ready.',
      })
      const suffix = LEAN_ASSET_VERSION ? `?v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : ''
      await loadSnapshot(
        'real-analysis.snap',
        `${LEAN_BIN_BASE}/snapshots/real-analysis.snap${suffix}`,
        'Restoring the local Mathlib and Real Analysis environment...',
      )
      setProgress('Mathlib and the Real Analysis course are ready.')
    })().catch((error) => {
      realAnalysisLayerPromiseRef.current = null
      throw error
    })
    realAnalysisLayerPromiseRef.current = promise
    return promise
  }, [loadArtifactLayer, loadSnapshot])

  const ensureManifoldLayer = useCallback(async (level: GameLevel) => {
    if (!manifoldLayerIndexPromiseRef.current) {
      const suffix = LEAN_ASSET_VERSION ? `?v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : ''
      manifoldLayerIndexPromiseRef.current = fetch(
        `${LEAN_WASM_BASE}/manifold-layer.json${suffix}`,
      ).then(async (response) => {
        if (!response.ok) throw new Error('The Manifold Adventure layer index was not found.')
        const index = await response.json() as ManifoldLayerIndex
        if (index.kind !== 'manifold-course-layer-index' || !Array.isArray(index.layers)) {
          throw new Error('The Manifold Adventure layer index is invalid.')
        }
        return index
      }).catch((error) => {
        manifoldLayerIndexPromiseRef.current = null
        throw error
      })
    }

    const index = await manifoldLayerIndexPromiseRef.current
    const targetIndex = index.layers.findIndex((layer) => layer.world === level.world)
    if (targetIndex < 0) throw new Error(`No browser layer was generated for ${level.world}.`)

    for (const layer of index.layers.slice(0, targetIndex + 1)) {
      let promise = manifoldLayerPromisesRef.current.get(layer.world)
      if (!promise) {
        promise = loadArtifactLayer({
          manifestFile: layer.manifestFile,
          libraryRoot: layer.libraryRoot,
          label: `Mathlib ${layer.label}`,
          readyMessage: `The ${layer.label} definitions are ready.`,
        }).catch((error) => {
          manifoldLayerPromisesRef.current.delete(layer.world)
          throw error
        })
        manifoldLayerPromisesRef.current.set(layer.world, promise)
      }
      await promise
    }
  }, [loadArtifactLayer])

  const trySnapshot = useCallback(async (): Promise<boolean> => {
    const suffix = LEAN_ASSET_VERSION ? `?v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : ''
    const relativeUrl = `${LEAN_BIN_BASE}/snapshots/init.snap${suffix}`
    return loadSnapshot(
      'init.snap',
      relativeUrl,
      'Loading the prebuilt Lean core environment...',
    )
  }, [loadSnapshot])

  const runCompile = useCallback(async (code: string): Promise<{ result: WorkerResult; output: WorkerOutput[] }> => {
    const worker = workerRef.current
    if (!worker) throw new Error('Lean worker is unavailable.')
    outputRef.current = []
    const result = await Promise.race([
      new Promise<WorkerResult>((resolve) => {
        compilePendingRef.current = { resolve }
        worker.postMessage({ type: 'compile', code, path: '/workspace/GameLevel.lean' })
      }),
      resolveAfter<WorkerResult>(600000, { success: false, error: 'Verification timed out.' }),
    ])
    return { result, output: [...outputRef.current] }
  }, [])

  const compileCode = useCallback((code: string): Promise<{ result: WorkerResult; output: WorkerOutput[] }> => {
    const operation = compileQueueRef.current.then(
      () => runCompile(code),
      () => runCompile(code),
    )
    compileQueueRef.current = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }, [runCompile])

  const initialize = useCallback(async () => {
    if (statusRef.current === 'ready' || statusRef.current === 'checking') return
    if (initializePromiseRef.current) return initializePromiseRef.current
    const promise = (async () => {
      updateStatus('loading')
      const wasmResponse = await fetch(`${LEAN_WASM_BASE}/lean.js`, { method: 'HEAD' })
      if (!wasmResponse.ok) {
        throw new Error(`Lean WASM was not found at ${LEAN_WASM_BASE}.`)
      }
      await ensureWorker()
      const loadedSnapshot = await trySnapshot()
      if (!loadedSnapshot) await addInitFiles()
      setProgress('Warming the local kernel...')
      const warm = await compileCode('')
      if (!warm.result.success) throw new Error(warm.result.error || 'Lean warmup failed.')
      updateStatus('ready')
      setProgress('Local Lean kernel ready.')
    })().catch((error) => {
      updateStatus('error')
      setProgress(error instanceof Error ? error.message : String(error))
      initializePromiseRef.current = null
      throw error
    })
    initializePromiseRef.current = promise
    return promise
  }, [addInitFiles, compileCode, ensureWorker, trySnapshot, updateStatus])

  const initializeForLevel = useCallback(async (level: GameLevel) => {
    await initialize()
    const verifier = gameForLevel(level).verifier
    if (verifier === 'real-analysis') {
      // This packed layer also stages Init, Lean, and Std. A snapshot restores
      // Init's environment, but module imports still resolve those artifacts
      // through Lean's virtual filesystem.
      await ensureRealAnalysisLayer()
    } else if (verifier === 'manifold') {
      await ensureManifoldLayer(level)
    }
  }, [ensureManifoldLayer, ensureRealAnalysisLayer, initialize])

  const inspectGoals = useCallback(async (
    level: GameLevel,
    proof: string,
    rules: GameRules = 'regular',
  ): Promise<GameGoalInspection> => {
    const verifier = gameForLevel(level).verifier
    const policy = checkProofPolicy(level, proof, { enforceInventory: rules !== 'none' })
    if (!policy.ok) {
      const diagnostics = policy.messages.map((message) => ({
        severity: 'error',
        message,
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 1,
      }))
      return {
        kind: 'policy',
        goals: [],
        detail: policy.messages.join(' '),
        diagnostics,
      }
    }

    const source = verifier === 'real-analysis'
      ? buildRealAnalysisGoalInspectionSource(level, proof, rules !== 'none')
      : verifier === 'manifold'
        ? buildManifoldGoalInspectionSource(level, proof, rules !== 'none')
        : buildGoalInspectionSource(level, proof, {
          unlockAll: rules === 'none',
          enforceInventory: rules !== 'none',
        })
    try {
      await initializeForLevel(level)
      setProgress(`Opening the ${level.world} world and reading its Lean definitions...`)
      const started = performance.now()
      const compiled = await compileCode(source.code)
      const elapsedMs = compiled.result.elapsed ?? performance.now() - started
      const diagnostics = parseDiagnostics(
        compiled.output,
        source.proofStartLine,
        source.proofLineMap,
      )
      const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
      const inventoryErrors = inventoryPolicyDiagnostics(errors)
      const goals = liveGoalsFromDiagnostics(diagnostics, source.traceMarker)

      if (inventoryErrors.length > 0) {
        return {
          kind: 'policy',
          goals: [],
          detail: inventoryErrors[0].message,
          diagnostics: inventoryErrors,
          elapsedMs,
        }
      }
      if (errors.length > 0 || !compiled.result.success) {
        return {
          kind: 'compiler',
          goals,
          detail: errors[0]?.message || compiled.result.error || 'Lean could not inspect this proof state.',
          diagnostics: errors,
          elapsedMs,
        }
      }
      if (goals.length === 0) {
        return {
          kind: 'complete',
          goals: [],
          detail: 'No goals remain. Verify the answer to record this level.',
          diagnostics: [],
          elapsedMs,
        }
      }
      return {
        kind: 'goals',
        goals,
        detail: `Updated locally in ${Math.round(elapsedMs)} ms.`,
        diagnostics: [],
        elapsedMs,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        kind: 'runtime',
        goals: [],
        detail: message,
        diagnostics: [],
      }
    }
  }, [compileCode, initializeForLevel])

  const verify = useCallback(async (
    level: GameLevel,
    proof: string,
    rules: GameRules = 'regular',
  ): Promise<GameVerificationResult> => {
    const verifier = gameForLevel(level).verifier
    const policy = checkProofPolicy(level, proof, { enforceInventory: rules !== 'none' })
    if (!policy.ok) {
      return {
        success: false,
        kind: 'policy',
        headline: 'This answer is outside the current inventory.',
        detail: policy.messages.join(' '),
        diagnostics: policy.messages.map((message) => ({
          severity: 'error',
          message,
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 1,
        })),
        stages: [
          { label: 'Answer policy', state: 'failed', detail: 'Locked or unsafe proof features were found.' },
          { label: 'Elaboration', state: 'pending', detail: 'Not run.' },
          { label: 'Kernel', state: 'pending', detail: 'Not run.' },
          {
            label: 'Game rules',
            state: 'passed',
            detail: rules === 'none'
              ? 'Inventory locks are disabled, but unsafe placeholders remain blocked.'
              : 'Unsafe placeholders are blocked before Lean parses the answer.',
          },
        ],
      }
    }

    const challenge = verifier === 'real-analysis'
      ? buildRealAnalysisChallengeSource(level, proof, rules !== 'none')
      : verifier === 'manifold'
        ? buildManifoldChallengeSource(level, proof, rules !== 'none')
        : buildChallengeSource(level, proof, {
          unlockAll: rules === 'none',
          enforceInventory: rules !== 'none',
        })
    try {
      await initializeForLevel(level)
      updateStatus('checking')
      setProgress(`Checking your proof in the ${level.world} world...`)
      const started = performance.now()
      const compiled = await compileCode(challenge.code)
      const elapsedMs = compiled.result.elapsed ?? performance.now() - started
      const diagnostics = parseDiagnostics(
        compiled.output,
        challenge.proofStartLine,
        challenge.proofLineMap,
      )
      const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
      const inventoryErrors = inventoryPolicyDiagnostics(errors)
      const sorry = diagnostics.find((diagnostic) => /declaration uses 'sorry'|declaration has metavariables/i.test(diagnostic.message))
      const success = compiled.result.success && errors.length === 0 && !sorry
      const policyFailure = inventoryErrors.length > 0

      updateStatus('ready')
      setProgress('Local Lean kernel ready.')
      return {
        success,
        kind: success ? 'verified' : policyFailure ? 'policy' : 'compiler',
        headline: success
          ? 'Proof accepted by the local Lean kernel.'
          : policyFailure
            ? 'This answer is outside the current inventory.'
            : 'Lean could not verify this answer.',
        detail: success
          ? `Elaboration and kernel checking completed in ${Math.round(elapsedMs)} ms.`
          : (inventoryErrors[0]?.message || errors[0]?.message || sorry?.message || compiled.result.error || 'The proof did not close the goal.'),
        diagnostics: policyFailure ? inventoryErrors : diagnostics,
        elapsedMs,
        stages: [
          {
            label: 'Answer policy',
            state: policyFailure ? 'failed' : 'passed',
            detail: policyFailure
              ? inventoryErrors[0].message
              : challenge.compatibilityNotes.length
                ? challenge.compatibilityNotes.join(' ')
                : 'Lean parsed every tactic and resolved every referenced theorem in this level’s local course context.',
          },
          {
            label: 'Elaboration',
            state: policyFailure ? 'pending' : success ? 'passed' : 'failed',
            detail: policyFailure ? 'Stopped by the parsed inventory check.' : success ? 'The proof term was constructed.' : 'Lean reported a diagnostic.',
          },
          { label: 'Kernel', state: success ? 'passed' : 'pending', detail: success ? 'The proof term passed kernel checking.' : 'No accepted proof term was produced.' },
          {
            label: 'Game rules',
            state: 'passed',
            detail: rules === 'none'
              ? 'Inventory restrictions were intentionally disabled for this check.'
              : verifier !== 'natural-number'
                ? 'Unsafe placeholders were blocked and the proof was checked in the exact local course context.'
                : 'Lean syntax and semantic theorem inventory restrictions were enforced locally.',
          },
        ],
      }
    } catch (error) {
      updateStatus('error')
      const message = error instanceof Error ? error.message : String(error)
      setProgress(message)
      return {
        success: false,
        kind: 'runtime',
        headline: 'The local Lean runtime did not finish.',
        detail: message,
        diagnostics: [],
        stages: [
          { label: 'Answer policy', state: 'passed', detail: 'The answer passed the local policy gate.' },
          { label: 'Elaboration', state: 'pending', detail: 'The checker did not complete.' },
          { label: 'Kernel', state: 'pending', detail: 'The checker did not complete.' },
          { label: 'Game rules', state: 'partial', detail: 'The local checker did not finish applying the game rules.' },
        ],
      }
    }
  }, [compileCode, initializeForLevel, updateStatus])

  return { status, progress, inspectGoals, verify }
}

export type LeanGameVerifier = ReturnType<typeof useLeanGameVerifier>
