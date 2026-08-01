import type { LeanArtifactPack } from '../lean-loader'

export interface StagedArtifactPack {
  files: Map<string, Uint8Array<ArrayBuffer>>
  compressedBytes: number
  downloadMs: number
  inflateMs: number
  elapsedMs: number
}

interface PackStagedMessage {
  type: 'pack_staged'
  id: number
  files: Array<{ name: string; data: ArrayBuffer }>
  compressedBytes: number
  downloadMs: number
  inflateMs: number
  elapsedMs: number
}

interface PackStageErrorMessage {
  type: 'pack_stage_error'
  id: number
  error: string
}

type PackWorkerMessage = PackStagedMessage | PackStageErrorMessage

interface PendingPack {
  resolve: (result: StagedArtifactPack) => void
  reject: (error: Error) => void
}

export class ArtifactPackStagerPool {
  private readonly workers: Worker[]
  private readonly pending = new Map<number, PendingPack>()
  private nextWorker = 0
  private nextId = 1

  constructor(size: number) {
    if (!Number.isInteger(size) || size < 1 || size > 3) {
      throw new Error('Artifact pack staging supports between one and three workers.')
    }
    this.workers = Array.from({ length: size }, () => {
      const worker = new Worker(
        new URL('./artifact-pack-stager.worker.ts', import.meta.url),
        { type: 'module' },
      )
      worker.onmessage = (event: MessageEvent<PackWorkerMessage>) => {
        const message = event.data
        const request = this.pending.get(message.id)
        if (!request) return
        this.pending.delete(message.id)
        if (message.type === 'pack_stage_error') {
          request.reject(new Error(message.error))
          return
        }
        request.resolve({
          files: new Map(message.files.map(({ name, data }) => [name, new Uint8Array(data)])),
          compressedBytes: message.compressedBytes,
          downloadMs: message.downloadMs,
          inflateMs: message.inflateMs,
          elapsedMs: message.elapsedMs,
        })
      }
      worker.onerror = (event) => {
        this.failAll(new Error(event.message || 'Artifact staging worker failed.'))
      }
      return worker
    })
  }

  stage(pack: LeanArtifactPack, url: string): Promise<StagedArtifactPack> {
    const id = this.nextId
    this.nextId += 1
    const worker = this.workers[this.nextWorker]
    this.nextWorker = (this.nextWorker + 1) % this.workers.length
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      worker.postMessage({ type: 'stage_pack', id, url, pack })
    })
  }

  terminate(): void {
    for (const worker of this.workers) worker.terminate()
    this.failAll(new Error('Artifact staging stopped.'))
  }

  private failAll(error: Error): void {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }
}

export function requestedArtifactPackWorkers(search = window.location.search): number {
  const raw = new URLSearchParams(search).get('artifactWorkers')
  if (raw === null) return 0
  const requested = Number(raw)
  return Number.isInteger(requested) ? Math.max(0, Math.min(3, requested)) : 0
}
