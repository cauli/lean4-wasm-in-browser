import { expect, test } from '@playwright/test'

test.skip(
  process.env.UPDATE_MANIFOLD_MATRIX !== '1',
  'Set UPDATE_MANIFOLD_MATRIX=1 to run all 50 browser-kernel references.',
)

test('Manifold Adventure reference-solution matrix', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/games/manifold-adventure?conformance=1')
  await page.waitForFunction(() => Boolean(
    (window as unknown as {
      __leanGameConformance?: { runManifoldReferences?: unknown }
    }).__leanGameConformance?.runManifoldReferences,
  ))

  const results = await page.evaluate(async () => {
    const api = (window as unknown as {
      __leanGameConformance?: {
        runManifoldReferences: () => Promise<Array<{
          id: string
          result: {
            success: boolean
            kind: string
            headline: string
            detail: string
          }
        }>>
      }
    }).__leanGameConformance
    if (!api) throw new Error('Manifold conformance API did not start.')
    return api.runManifoldReferences()
  })

  const failures = results.filter(({ result }) => !result.success)
  console.log(JSON.stringify({
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
  }, null, 2))

  expect(results).toHaveLength(50)
  expect(failures).toEqual([])
})
