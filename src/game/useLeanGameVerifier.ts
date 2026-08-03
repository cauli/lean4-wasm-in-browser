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
  realAnalysisContextModule,
} from './real-analysis-verification-source'
import {
  buildManifoldChallengeSource,
  buildManifoldGoalInspectionSource,
  manifoldContextModule,
} from './manifold-verification-source'
import {
  ArtifactPackStagerPool,
  requestedArtifactPackWorkers,
  type StagedArtifactPack,
} from './artifact-pack-stager'
import {
  fetchCachedArtifactPack,
  prepareArtifactPackCache,
  requestArtifactStoragePersistence,
  type ArtifactPackCacheDescriptor,
} from '../artifact-pack-cache'
import { createInactivityWatchdog, type InactivityWatchdog } from './inactivity-watchdog.js'

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
  prerequisites?: string[]
}

interface ManifoldLayerIndex {
  kind: 'manifold-course-layer-index'
  layers: ManifoldWorldLayer[]
}

function manifoldLayersForWorld(
  index: ManifoldLayerIndex,
  targetWorld: string,
): ManifoldWorldLayer[] {
  const targetIndex = index.layers.findIndex((layer) => layer.world === targetWorld)
  if (targetIndex < 0) throw new Error(`No browser layer was generated for ${targetWorld}.`)

  // Older six-world indexes were linear and did not record their edges. Keep
  // accepting them while deployed clients and cached HTML catch up.
  if (!index.layers.some((layer) => Array.isArray(layer.prerequisites))) {
    return index.layers.slice(0, targetIndex + 1)
  }

  const byWorld = new Map(index.layers.map((layer) => [layer.world, layer]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: ManifoldWorldLayer[] = []

  const visit = (world: string) => {
    if (visited.has(world)) return
    if (visiting.has(world)) throw new Error(`The browser layer graph contains a cycle at ${world}.`)
    const layer = byWorld.get(world)
    if (!layer) throw new Error(`The browser layer graph refers to missing world ${world}.`)

    visiting.add(world)
    for (const prerequisite of layer.prerequisites || []) visit(prerequisite)
    visiting.delete(world)
    visited.add(world)
    ordered.push(layer)
  }

  visit(targetWorld)
  return ordered
}

interface ArtifactLayerManifest {
  files?: string[]
  packs?: LeanArtifactPack[]
  version?: string
  leanCommit?: string
  mathlibCommit?: string
  gameCommit?: string | null
  manifoldCourseCommit?: string | null
  generatedAt?: string
}

interface LayerTiming {
  label: string
  mode: 'main-thread' | 'worker-pool'
  workers: number
  packs: number
  files: number
  manifestMs: number
  downloadWorkMs: number
  inflateWorkMs: number
  stageWorkMs: number
  transferMs: number
  cacheHits: number
  cachedCompressedBytes: number
  totalMs: number
}

function artifactPackCacheDescriptor(
  libraryRoot: string,
  manifest: ArtifactLayerManifest,
): ArtifactPackCacheDescriptor {
  const family = manifest.manifoldCourseCommit ? 'manifold' : libraryRoot
  const courseVersion = manifest.manifoldCourseCommit
    || manifest.gameCommit
    || manifest.generatedAt
    || manifest.version
    || 'development'
  return {
    family,
    version: [
      manifest.leanCommit || LEAN_ASSET_VERSION || 'lean-development',
      manifest.mathlibCommit || 'mathlib-development',
      courseVersion,
    ].join('-'),
  }
}

declare global {
  interface Window {
    __leanGameLayerTimings?: LayerTiming[]
  }
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
  const [progress, setProgress] = useState('Lean will start in the background.')
  const [loadPercent, setLoadPercent] = useState(0)
  const [preparedContextKeys, setPreparedContextKeys] = useState<Set<string>>(() => new Set())
  const workerRef = useRef<Worker | null>(null)
  const initializePromiseRef = useRef<Promise<void> | null>(null)
  const initFilesPromiseRef = useRef<Promise<void> | null>(null)
  const realAnalysisLayerPromiseRef = useRef<Promise<void> | null>(null)
  const manifoldLayerIndexPromiseRef = useRef<Promise<ManifoldLayerIndex> | null>(null)
  const manifoldLayerPromisesRef = useRef<Map<string, Promise<void>>>(new Map())
  const bootPendingRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null)
  const filesPendingRef = useRef<{ resolve: () => void } | null>(null)
  const snapshotPendingRef = useRef<{ resolve: (result: WorkerResult) => void } | null>(null)
  const compilePendingRef = useRef<{
    resolve: (result: WorkerResult) => void
    watchdog: InactivityWatchdog
  } | null>(null)
  const outputRef = useRef<WorkerOutput[]>([])
  const compileQueueRef = useRef<Promise<void>>(Promise.resolve())
  const preparedContextKeysRef = useRef(new Set<string>())
  const contextPreparationPromisesRef = useRef<Map<string, Promise<void>>>(new Map())
  const runtimePrefetchStartedRef = useRef(false)
  const layerCacheWarmedRef = useRef(new Set<string>())
  const layerStagingStartedRef = useRef(new Set<string>())

  const advanceLoadPercent = useCallback((next: number) => {
    setLoadPercent((current) => Math.max(current, Math.min(100, Math.round(next))))
  }, [])

  const contextKeyForLevel = useCallback((level: GameLevel): string => {
    const verifier = gameForLevel(level).verifier
    if (verifier === 'manifold') return `manifold:${level.world}`
    if (verifier === 'real-analysis') return 'real-analysis'
    return 'lean-core'
  }, [])

  const markContextPrepared = useCallback((key: string) => {
    preparedContextKeysRef.current.add(key)
    setPreparedContextKeys(new Set(preparedContextKeysRef.current))
  }, [])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const ensureWorker = useCallback(async () => {
    if (workerRef.current) return
    setProgress('Starting the local Lean runtime...')
    advanceLoadPercent(3)
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
        compilePendingRef.current?.watchdog.stop()
        compilePendingRef.current?.resolve(message as WorkerResult)
        compilePendingRef.current = null
      } else if (message.type === 'stdout' || message.type === 'stderr') {
        compilePendingRef.current?.watchdog.pulse()
        outputRef.current.push({ stream: message.type, data: String(message.data || '') })
      } else if (message.type === 'snapshot_progress') {
        const received = Number(message.received || 0)
        const total = Number(message.total || 0)
        if (total > 0) advanceLoadPercent(8 + (received / total) * 32)
        setProgress(total > 0
          ? `Loading Lean environment: ${Math.round(received / 1048576)} / ${Math.round(total / 1048576)} MB`
          : `Loading Lean environment: ${Math.round(received / 1048576)} MB`)
      } else if (message.type === 'import_progress') {
        compilePendingRef.current?.watchdog.pulse()
        const loaded = Number(message.loaded || 0)
        const total = Number(message.total || 0)
        if (total > 0) advanceLoadPercent(48 + (loaded / total) * 10)
        setProgress(`Importing Lean modules: ${message.loaded || 0} / ${message.total || 0}`)
      } else if (message.type === 'progress' && message.data) {
        compilePendingRef.current?.watchdog.pulse()
        setProgress(String(message.data))
      } else if (message.type === 'activity') {
        // Heartbeat from otherwise-filtered debug output: no user-visible
        // text, but proof the compile is alive during its silent stretches.
        compilePendingRef.current?.watchdog.pulse()
      } else if (message.type === 'error') {
        const error = new Error(String(message.error || message.data || 'Lean worker error'))
        bootPendingRef.current?.reject(error)
        bootPendingRef.current = null
        compilePendingRef.current?.watchdog.stop()
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
  }, [advanceLoadPercent])

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
    allowSlim = false,
    percentRange = [60, 85],
  }: {
    manifestFile: string
    libraryRoot: string
    label: string
    readyMessage: string
    allowSlim?: boolean
    percentRange?: [number, number]
  }) => {
      const layerStarted = performance.now()
      // The opportunistic cache warmer stands down once real staging begins;
      // the stager pool serves cache hits for whatever warming completed.
      layerStagingStartedRef.current.add(manifestFile)
      const worker = workerRef.current
      if (!worker) throw new Error('Lean worker is unavailable.')
      if (LEAN_VARIANT === 'slim' && !allowSlim) {
        throw new Error(`${label} verification requires the desktop full Lean runtime.`)
      }
      setProgress(`Reading the local ${label} package...`)
      const response = await fetch(`${LEAN_WASM_BASE}/${manifestFile}`, { cache: 'no-cache' })
      if (!response.ok) {
        throw new Error(`The local ${label} Lean package was not found.`)
      }
      const manifest = await response.json() as ArtifactLayerManifest
      const paths = manifest.files || []
      const manifestReadyAt = performance.now()
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
        const cacheDescriptor = artifactPackCacheDescriptor(libraryRoot, manifest)
        await prepareArtifactPackCache(cacheDescriptor)
        const workerCount = requestedArtifactPackWorkers()
        const stager = workerCount > 0
          ? new ArtifactPackStagerPool(Math.min(workerCount, packs.length))
          : null
        const pending = new Map<number, Promise<StagedArtifactPack>>()
        let downloadWorkMs = 0
        let inflateWorkMs = 0
        let stageWorkMs = 0
        let transferMs = 0
        let cacheHits = 0
        let cachedCompressedBytes = 0
        let loaded = 0
        const stagePack = (index: number): Promise<StagedArtifactPack> => {
          const pack = packs[index]
          if (stager) {
            const url = new URL(
              `${LEAN_WASM_BASE}/${libraryRoot}/${pack.file}`,
              window.location.origin,
            ).href
            return stager.stage(pack, url, cacheDescriptor)
          }
          return (async () => {
            const started = performance.now()
            let downloadMs = 0
            let inflateMs = 0
            let cacheHit = false
            const files = await fetchLeanArtifactPack(pack, libraryRoot, (timing) => {
              downloadMs = timing.downloadMs
              inflateMs = timing.inflateMs
              cacheHit = timing.cacheHit
            }, cacheDescriptor)
            return {
              files,
              compressedBytes: pack.compressedBytes,
              cacheHit,
              downloadMs,
              inflateMs,
              elapsedMs: performance.now() - started,
            }
          })()
        }
        const schedule = (index: number) => {
          if (index < packs.length) pending.set(index, stagePack(index))
        }
        const lookahead = stager ? Math.min(workerCount, packs.length) : 1
        for (let index = 0; index < lookahead; index += 1) schedule(index)

        try {
          for (let index = 0; index < packs.length; index += 1) {
            setProgress(
              `Loading ${label}: pack ${index + 1} / ${packs.length}`,
            )
            advanceLoadPercent(
              percentRange[0] + ((index + 1) / packs.length) * (percentRange[1] - percentRange[0]),
            )
            const staged = await pending.get(index)!
            pending.delete(index)
            schedule(index + lookahead)
            downloadWorkMs += staged.downloadMs
            inflateWorkMs += staged.inflateMs
            stageWorkMs += staged.elapsedMs
            const expectedPaths = new Set(packs[index].entries.map((entry) => entry.path))
            const missing = [...expectedPaths].filter((file) => !staged.files.has(file))
            if (missing.length > 0) {
              throw new Error(`The local ${label} package is incomplete (${missing.length} files missing).`)
            }
            const transferStarted = performance.now()
            await addFilesToWorker(staged.files)
            transferMs += performance.now() - transferStarted
            if (staged.cacheHit) {
              cacheHits += 1
              cachedCompressedBytes += staged.compressedBytes
            }
            loaded += staged.files.size
            setProgress(`Loading ${label}: ${loaded} / ${paths.length} files`)
          }
        } finally {
          stager?.terminate()
          await Promise.allSettled(pending.values())
        }

        const timing: LayerTiming = {
          label,
          mode: stager ? 'worker-pool' : 'main-thread',
          workers: stager ? workerCount : 0,
          packs: packs.length,
          files: loaded,
          manifestMs: manifestReadyAt - layerStarted,
          downloadWorkMs,
          inflateWorkMs,
          stageWorkMs,
          transferMs,
          cacheHits,
          cachedCompressedBytes,
          totalMs: performance.now() - layerStarted,
        }
        window.__leanGameLayerTimings ??= []
        window.__leanGameLayerTimings.push(timing)
        console.info('[LEAN LAYER TIMING]', JSON.stringify(timing))
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
  }, [advanceLoadPercent])

  const addInitFiles = useCallback(async () => {
    if (initFilesPromiseRef.current) return initFilesPromiseRef.current
    const promise = (async () => {
      const worker = workerRef.current
      if (!worker) throw new Error('Lean worker is unavailable.')
      // Packed transport: the Init closure as a handful of ~16MB packs instead
      // of ~3,800 individual artifact requests, through the same pack pipeline
      // (and Cache API layer) the course layers use.
      try {
        await loadArtifactLayer({
          manifestFile: 'core-layer.json',
          libraryRoot: 'core-lib',
          label: 'Lean core',
          readyMessage: 'Lean core modules are ready.',
          allowSlim: true,
          percentRange: [40, 56],
        })
        return
      } catch (error) {
        // A deployment without the packed core (or a mid-transfer failure)
        // still starts through the per-file route below; the worker overwrites
        // any files a partial pack load already staged.
        console.warn('Packed Lean core unavailable, using per-file transport:', error)
      }
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
        if (total > 0) advanceLoadPercent(40 + (loaded / total) * 8)
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
  }, [advanceLoadPercent, loadArtifactLayer])

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

  const getManifoldLayerIndex = useCallback((): Promise<ManifoldLayerIndex> => {
    if (!manifoldLayerIndexPromiseRef.current) {
      const suffix = LEAN_ASSET_VERSION ? `?v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : ''
      manifoldLayerIndexPromiseRef.current = fetch(
        `${LEAN_WASM_BASE}/manifold-layer.json${suffix}`,
        { cache: 'no-cache' },
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
    return manifoldLayerIndexPromiseRef.current
  }, [])

  // Download a layer's packs straight into the Cache API, without touching the
  // worker. Staging later finds them as cache hits, so the network transfer
  // overlaps runtime boot, the core transfer, and the Init import instead of
  // serializing after them. Purely opportunistic: any failure is swallowed and
  // real staging re-fetches whatever is missing.
  const warmLayerPackCache = useCallback(async (manifestFile: string, libraryRoot: string) => {
    if (typeof caches === 'undefined') return
    if (layerCacheWarmedRef.current.has(manifestFile)) return
    if (layerStagingStartedRef.current.has(manifestFile)) return
    layerCacheWarmedRef.current.add(manifestFile)
    try {
      const response = await fetch(`${LEAN_WASM_BASE}/${manifestFile}`, { cache: 'no-cache' })
      if (!response.ok) return
      const manifest = await response.json() as ArtifactLayerManifest
      const packs = manifest.packs || []
      if (packs.length === 0) return
      const descriptor = artifactPackCacheDescriptor(libraryRoot, manifest)
      await prepareArtifactPackCache(descriptor)
      // Same order the stager consumes, so a handover mid-warm leaves the
      // stager finishing the tail rather than re-downloading the head.
      const queue = [...packs]
      const worker = async () => {
        for (;;) {
          if (layerStagingStartedRef.current.has(manifestFile)) return
          const pack = queue.shift()
          if (!pack) return
          const url = new URL(
            `${LEAN_WASM_BASE}/${libraryRoot}/${pack.file}`,
            window.location.origin,
          ).href
          await fetchCachedArtifactPack(url, pack.compressedBytes, descriptor)
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, packs.length) }, worker))
    } catch {
      layerCacheWarmedRef.current.delete(manifestFile)
    }
  }, [])

  const warmLevelLayerCache = useCallback(async (level: GameLevel) => {
    if (LEAN_VARIANT === 'slim') return
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return
    const verifier = gameForLevel(level).verifier
    if (verifier === 'real-analysis') {
      await warmLayerPackCache('real-analysis-layer.json', 'real-analysis-lib')
    } else if (verifier === 'manifold') {
      const index = await getManifoldLayerIndex()
      for (const layer of manifoldLayersForWorld(index, level.world)) {
        await warmLayerPackCache(layer.manifestFile, layer.libraryRoot)
      }
    }
  }, [getManifoldLayerIndex, warmLayerPackCache])

  const ensureManifoldLayer = useCallback(async (level: GameLevel) => {
    const index = await getManifoldLayerIndex()
    for (const layer of manifoldLayersForWorld(index, level.world)) {
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
  }, [getManifoldLayerIndex, loadArtifactLayer])

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
    const result = await new Promise<WorkerResult>((resolve) => {
      const watchdog = createInactivityWatchdog(600000, () => {
        if (compilePendingRef.current?.watchdog !== watchdog) return
        compilePendingRef.current = null

        // A synchronous WASM compile cannot be interrupted in place. Retire
        // the worker so a retry cannot consume the late result of this compile.
        worker.terminate()
        if (workerRef.current === worker) workerRef.current = null
        initializePromiseRef.current = null
        initFilesPromiseRef.current = null
        realAnalysisLayerPromiseRef.current = null
        manifoldLayerIndexPromiseRef.current = null
        manifoldLayerPromisesRef.current.clear()
        contextPreparationPromisesRef.current.clear()
        preparedContextKeysRef.current.clear()
        setPreparedContextKeys(new Set())

        resolve({
          success: false,
          error: 'Lean stopped reporting progress for 10 minutes.',
        })
      })
      compilePendingRef.current = { resolve, watchdog }
      worker.postMessage({ type: 'compile', code, path: '/workspace/GameLevel.lean' })
    })
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
      setLoadPercent(1)
      setProgress('Starting Lean in this browser...')
      const wasmResponse = await fetch(`${LEAN_WASM_BASE}/lean.js`, { method: 'HEAD' })
      if (!wasmResponse.ok) {
        throw new Error(`Lean WASM was not found at ${LEAN_WASM_BASE}.`)
      }
      await ensureWorker()
      await trySnapshot()
      // A restored environment does not replace the module resolver's files:
      // later Mathlib imports still traverse Init's .olean dependency tree.
      await addInitFiles()
      setProgress('Warming the local kernel...')
      const warm = await compileCode('')
      if (!warm.result.success) throw new Error(warm.result.error || 'Lean warmup failed.')
      advanceLoadPercent(58)
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
  }, [addInitFiles, advanceLoadPercent, compileCode, ensureWorker, trySnapshot, updateStatus])

  const prepareRuntime = useCallback(async () => {
    await initialize()
    if (contextPreparationPromisesRef.current.size === 0) advanceLoadPercent(100)
  }, [advanceLoadPercent, initialize])

  const prepareLevel = useCallback((level: GameLevel): Promise<void> => {
    const contextKey = contextKeyForLevel(level)
    if (preparedContextKeysRef.current.has(contextKey)) return Promise.resolve()
    const existing = contextPreparationPromisesRef.current.get(contextKey)
    if (existing) return existing

    const promise = (async () => {
      updateStatus('loading')
      if (initializePromiseRef.current) setLoadPercent(58)
      // Course-layer packs download into the Cache API while the runtime
      // boots and imports Init, instead of waiting in line behind them.
      void warmLevelLayerCache(level).catch(() => undefined)
      await initialize()
      setLoadPercent(58)
      updateStatus('loading')
      const verifier = gameForLevel(level).verifier
      let contextModule: string | null = null
      if (verifier === 'real-analysis') {
        // This packed layer also stages Init, Lean, and Std. A snapshot restores
        // Init's environment, but module imports still resolve those artifacts
        // through Lean's virtual filesystem.
        await ensureRealAnalysisLayer()
        contextModule = realAnalysisContextModule(level)
      } else if (verifier === 'manifold') {
        await ensureManifoldLayer(level)
        contextModule = manifoldContextModule(level)
      }

      if (contextModule) {
        advanceLoadPercent(90)
        setProgress(`Opening the ${level.world} world in Lean...`)
        const warmed = await compileCode(`import ${contextModule}\n`)
        if (!warmed.result.success) {
          throw new Error(warmed.result.error || `Lean could not open ${contextModule}.`)
        }
      }

      markContextPrepared(contextKey)
      setLoadPercent(100)
      updateStatus('ready')
      setProgress(`${level.world} is ready for local proof checking.`)
    })().catch((error) => {
      contextPreparationPromisesRef.current.delete(contextKey)
      updateStatus('error')
      setProgress(error instanceof Error ? error.message : String(error))
      throw error
    })
    contextPreparationPromisesRef.current.set(contextKey, promise)
    return promise
  }, [
    advanceLoadPercent,
    compileCode,
    contextKeyForLevel,
    ensureManifoldLayer,
    ensureRealAnalysisLayer,
    initialize,
    markContextPrepared,
    updateStatus,
    warmLevelLayerCache,
  ])

  const prefetchRuntimeAssets = useCallback(() => {
    if (runtimePrefetchStartedRef.current) return
    runtimePrefetchStartedRef.current = true
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return
    const suffix = LEAN_ASSET_VERSION ? `?v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : ''
    for (const file of ['lean.js', 'lean.wasm']) {
      const href = `${LEAN_BIN_BASE}/${file}${suffix}`
      if (document.head.querySelector(`link[data-lean-runtime-prefetch="${file}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'fetch'
      link.href = href
      link.dataset.leanRuntimePrefetch = file
      if (file.endsWith('.wasm')) link.type = 'application/wasm'
      document.head.append(link)
    }
  }, [])

  const isLevelReady = useCallback((level: GameLevel): boolean => (
    preparedContextKeys.has(contextKeyForLevel(level))
  ), [contextKeyForLevel, preparedContextKeys])

  const initializeForLevel = prepareLevel

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
    // `verify` starts in the button's user gesture, which gives browsers the
    // best chance of granting persistent storage for the large Mathlib cache.
    void requestArtifactStoragePersistence()
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

  return {
    status,
    progress,
    loadPercent,
    inspectGoals,
    verify,
    prepareRuntime,
    prepareLevel,
    prefetchRuntimeAssets,
    isLevelReady,
  }
}

export type LeanGameVerifier = ReturnType<typeof useLeanGameVerifier>
