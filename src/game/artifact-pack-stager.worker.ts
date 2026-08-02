import type { LeanArtifactPack } from '../lean-loader'
import {
  deleteCachedArtifactPack,
  fetchCachedArtifactPack,
  type ArtifactPackCacheDescriptor,
} from '../artifact-pack-cache'

interface StageRequest {
  type: 'stage_pack'
  id: number
  url: string
  pack: LeanArtifactPack
  cacheDescriptor?: ArtifactPackCacheDescriptor
}

const OLEAN_MAGIC = [0x6f, 0x6c, 0x65, 0x61]

function hasOleanHeader(data: Uint8Array): boolean {
  return data.byteLength >= 32 && OLEAN_MAGIC.every((byte, index) => data[index] === byte)
}

async function inflateGzip(data: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Response(data).body!.pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

self.onmessage = async (event: MessageEvent<StageRequest>) => {
  const message = event.data
  if (message?.type !== 'stage_pack') return

  const started = performance.now()
  try {
    const fetched = await fetchCachedArtifactPack(
      message.url,
      message.pack.compressedBytes,
      message.cacheDescriptor,
    )
    const compressed = fetched.data
    const downloadedAt = performance.now()
    const inflated = await inflateGzip(compressed)
    const inflatedAt = performance.now()
    if (inflated.byteLength !== message.pack.bytes) {
      throw new Error(
        `Lean artifact pack ${message.pack.file} has ${inflated.byteLength} bytes; expected ${message.pack.bytes}.`,
      )
    }

    const files: Array<{ name: string; data: ArrayBuffer }> = []
    const transfer: ArrayBuffer[] = []
    for (const entry of message.pack.entries) {
      const end = entry.offset + entry.bytes
      if (entry.offset < 0 || end > inflated.byteLength) {
        throw new Error(`Lean artifact ${entry.path} is outside ${message.pack.file}.`)
      }
      const data = inflated.slice(entry.offset, end).buffer as ArrayBuffer
      if (!hasOleanHeader(new Uint8Array(data))) {
        throw new Error(`Lean artifact ${entry.path} in ${message.pack.file} is invalid.`)
      }
      files.push({ name: entry.path, data })
      transfer.push(data)
    }

    self.postMessage({
      type: 'pack_staged',
      id: message.id,
      files,
      compressedBytes: compressed.byteLength,
      cacheHit: fetched.cacheHit,
      downloadMs: downloadedAt - started,
      inflateMs: inflatedAt - downloadedAt,
      elapsedMs: inflatedAt - started,
    }, { transfer })
  } catch (error) {
    await deleteCachedArtifactPack(message.url, message.cacheDescriptor)
    self.postMessage({
      type: 'pack_stage_error',
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
