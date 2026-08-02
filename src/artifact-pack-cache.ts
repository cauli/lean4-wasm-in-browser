export interface ArtifactPackCacheDescriptor {
  family: string
  version: string
}

interface ArtifactPackCacheResult {
  data: ArrayBuffer
  cacheHit: boolean
}

const CACHE_PREFIX = 'lean-artifact-packs-'
const cachePromises = new Map<string, Promise<Cache | null>>()
const cleanupPromises = new Map<string, Promise<void>>()
let persistencePromise: Promise<boolean | null> | null = null

function cacheToken(value: string): string {
  return encodeURIComponent(value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'))
}

function cacheFamilyPrefix(descriptor: ArtifactPackCacheDescriptor): string {
  return `${CACHE_PREFIX}${cacheToken(descriptor.family)}-`
}

function cacheName(descriptor: ArtifactPackCacheDescriptor): string {
  return `${cacheFamilyPrefix(descriptor)}${cacheToken(descriptor.version)}`
}

function versionedPackUrl(url: string, descriptor: ArtifactPackCacheDescriptor): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}artifact=${encodeURIComponent(descriptor.version)}`
}

async function openArtifactPackCache(
  descriptor: ArtifactPackCacheDescriptor,
): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  const name = cacheName(descriptor)
  let promise = cachePromises.get(name)
  if (!promise) {
    promise = caches.open(name).catch(() => null)
    cachePromises.set(name, promise)
  }
  return promise
}

// Keep one exact artifact build per course. This runs on the main thread before
// staging starts; pack workers only open the selected cache, so parallel workers
// cannot prune one another while a layer is loading.
export async function prepareArtifactPackCache(
  descriptor: ArtifactPackCacheDescriptor,
): Promise<void> {
  if (typeof caches === 'undefined') return
  const familyPrefix = cacheFamilyPrefix(descriptor)
  const currentName = cacheName(descriptor)
  let promise = cleanupPromises.get(currentName)
  if (!promise) {
    promise = (async () => {
      try {
        const names = await caches.keys()
        await Promise.all(names
          .filter((name) => name.startsWith(familyPrefix) && name !== currentName)
          .map((name) => caches.delete(name)))
      } catch {
        // Cache cleanup is an optimization. Loading must still work when a
        // browser disables Cache Storage or refuses an individual deletion.
      }
      await openArtifactPackCache(descriptor)
    })()
    cleanupPromises.set(currentName, promise)
  }
  await promise
}

// Cache Storage is normally best-effort and may be evicted under disk pressure.
// Calling this from the Verify gesture lets supporting browsers protect the
// large Mathlib cache. A refusal is harmless: the same cache remains usable.
export function requestArtifactStoragePersistence(): Promise<boolean | null> {
  if (persistencePromise) return persistencePromise
  persistencePromise = (async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null
    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  })()
  return persistencePromise
}

export async function fetchCachedArtifactPack(
  url: string,
  expectedCompressedBytes: number,
  descriptor?: ArtifactPackCacheDescriptor,
): Promise<ArtifactPackCacheResult> {
  const requestUrl = descriptor ? versionedPackUrl(url, descriptor) : url
  const cache = descriptor ? await openArtifactPackCache(descriptor) : null

  if (cache) {
    try {
      const cached = await cache.match(requestUrl)
      if (cached) {
        const data = await cached.arrayBuffer()
        if (data.byteLength === expectedCompressedBytes) {
          return { data, cacheHit: true }
        }
        await cache.delete(requestUrl)
      }
    } catch {
      // Fall through to the network. A damaged or inaccessible cache should
      // never prevent Lean from starting.
    }
  }

  const response = await fetch(requestUrl)
  if (!response.ok) {
    throw new Error(`Lean artifact pack returned ${response.status}.`)
  }
  const data = await response.arrayBuffer()
  if (data.byteLength !== expectedCompressedBytes) {
    throw new Error(
      `Lean artifact pack has ${data.byteLength} compressed bytes; expected ${expectedCompressedBytes}.`,
    )
  }

  if (cache) {
    try {
      await cache.put(requestUrl, new Response(data, {
        headers: {
          'content-length': String(data.byteLength),
          'content-type': 'application/octet-stream',
        },
      }))
    } catch (error) {
      console.warn('Lean artifact pack cache write failed:', error)
    }
  }

  return { data, cacheHit: false }
}

export async function deleteCachedArtifactPack(
  url: string,
  descriptor?: ArtifactPackCacheDescriptor,
): Promise<void> {
  if (!descriptor) return
  const cache = await openArtifactPackCache(descriptor)
  if (!cache) return
  try {
    await cache.delete(versionedPackUrl(url, descriptor))
  } catch {
    // The original staging error is more useful than a cleanup failure.
  }
}
