import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const manifest = JSON.parse(fs.readFileSync(
  new URL('../public/lean-wasm/manifold-canonical-charts-layer.json', import.meta.url),
  'utf8',
)) as {
  leanCommit: string
  mathlibCommit: string
  manifoldCourseCommit: string
  packs: Array<{
    file: string
    bytes: number
    compressedBytes: number
    entries: Array<{ path: string; offset: number; bytes: number }>
  }>
}

test('artifact packs remain available from Cache Storage while offline', async ({ context, page }) => {
  const pack = manifest.packs[0]
  const descriptor = {
    family: 'manifold-cache-test',
    version: [
      manifest.leanCommit,
      manifest.mathlibCommit,
      manifest.manifoldCourseCommit,
    ].join('-'),
  }
  const url = `/lean-wasm/manifold-canonical-charts-lib/${pack.file}`

  await page.goto('/')
  const first = await page.evaluate(async ({ url, pack, descriptor }) => {
    const cacheModule = await import('/src/artifact-pack-cache.ts')
    const stagingModule = await import('/src/game/artifact-pack-stager.ts')
    for (const name of await caches.keys()) {
      if (name.startsWith('lean-artifact-packs-manifold-cache-test-')) {
        await caches.delete(name)
      }
    }
    await cacheModule.prepareArtifactPackCache(descriptor)
    const pool = new stagingModule.ArtifactPackStagerPool(1)
    const cacheWindow = window as typeof window & {
      __artifactCacheTestPool: InstanceType<typeof stagingModule.ArtifactPackStagerPool>
    }
    cacheWindow.__artifactCacheTestPool = pool
    const result = await pool.stage(pack, new URL(url, location.origin).href, descriptor)
    return { files: result.files.size, cacheHit: result.cacheHit }
  }, { url, pack, descriptor })

  expect(first).toEqual({ files: pack.entries.length, cacheHit: false })

  await context.setOffline(true)
  try {
    const second = await page.evaluate(async ({ url, pack, descriptor }) => {
      const cacheWindow = window as typeof window & {
        __artifactCacheTestPool: {
          stage: (
            pack: typeof pack,
            url: string,
            descriptor: typeof descriptor,
          ) => Promise<{ files: Map<string, Uint8Array>; cacheHit: boolean }>
          terminate: () => void
        }
      }
      const pool = cacheWindow.__artifactCacheTestPool
      try {
        const result = await pool.stage(pack, new URL(url, location.origin).href, descriptor)
        return { files: result.files.size, cacheHit: result.cacheHit }
      } finally {
        pool.terminate()
      }
    }, { url, pack, descriptor })
    expect(second).toEqual({ files: pack.entries.length, cacheHit: true })
  } finally {
    await context.setOffline(false)
  }
})
