import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface RawLevel {
  id: string
  world: string
  number: number
  title: string
}

interface RawGame {
  source: {
    repository: string
    commit: string
    toolchain: string
  }
  worlds: Array<{ levels: RawLevel[] }>
}

interface BrowserResult {
  id: string
  result: {
    success: boolean
    kind: string
    headline: string
    detail: string
    elapsedMs?: number
    diagnostics: Array<{ severity: string; message: string }>
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const game = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'src/game/real-analysis.generated.json'), 'utf8'),
) as RawGame
const levels = game.worlds.flatMap((world) => world.levels)
const reportPath = path.join(repoRoot, 'src/game/real-analysis.conformance.json')
const expectedFailedIds = [
  'lecture10-1',
  'lecture19-3',
  'lecture19-4',
  'l22pset-2',
  'l22pset-3',
  'lecture23-1',
  'lecture23-2',
  'lecture23-3',
  'lecture24-3',
  'lecture24-4',
  'l24pset-1',
  'l24pset-2',
  'lecture25-1',
  'lecture25-2',
]

test('Real Analysis reference-solution browser matrix', async ({ page }) => {
  test.skip(
    process.env.UPDATE_REAL_ANALYSIS_MATRIX !== '1',
    'Set UPDATE_REAL_ANALYSIS_MATRIX=1 to run the 139-level browser conformance build.',
  )
  test.setTimeout(60 * 60 * 1000)

  const batchSize = Number(process.env.REAL_ANALYSIS_MATRIX_BATCH_SIZE || 35)
  const results: BrowserResult[] = []
  let layer: Record<string, unknown> | undefined
  for (let start = 0; start < levels.length; start += batchSize) {
    const end = Math.min(start + batchSize, levels.length)
    await page.goto('/games/real-analysis-game?conformance=1')
    await page.waitForFunction(() => Boolean(window.__leanGameConformance), undefined, {
      timeout: 30_000,
    })
    if (!layer) {
      layer = await page.evaluate(async () => {
        const response = await fetch('/lean-wasm/real-analysis-layer.json')
        if (!response.ok) throw new Error(`Layer manifest returned ${response.status}`)
        return response.json()
      })
    }
    const batch = await page.evaluate(async ({ startIndex, endIndex }) => (
      window.__leanGameConformance!.runRealAnalysisReferences(
        'regular',
        { start: startIndex, end: endIndex },
      )
    ), { startIndex: start, endIndex: end }) as BrowserResult[]
    console.log(
      `Real Analysis levels ${start + 1}-${end}: `
      + `${batch.filter(({ result }) => result.success).length}/${batch.length} passed`,
    )
    results.push(...batch)
  }

  expect(results).toHaveLength(levels.length)
  expect(results.map(({ id }) => id)).toEqual(levels.map(({ id }) => id))
  expect(layer).toBeDefined()

  const byId = new Map(levels.map((level) => [level.id, level]))
  const passed = results.filter(({ result }) => result.success)
  const failed = results.filter(({ result }) => !result.success)
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: 'regular',
    gameSource: game.source,
    browserLayer: {
      version: layer!.version,
      leanCommit: layer!.leanCommit,
      mathlibCommit: layer!.mathlibCommit,
      gameCommit: layer!.gameCommit,
      modules: layer!.modules,
      bytes: layer!.bytes,
    },
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    verifiedReferenceSolutions: passed.map(({ id }) => id),
    failedReferenceSolutions: failed.map(({ id, result }) => ({
      id,
      world: byId.get(id)?.world,
      level: byId.get(id)?.number,
      title: byId.get(id)?.title,
      kind: result.kind,
      detail: result.detail,
      diagnostics: result.diagnostics
        .filter((diagnostic) => diagnostic.severity === 'error')
        .slice(0, 3)
        .map((diagnostic) => diagnostic.message),
    })),
    results: results.map(({ id, result }) => ({
      id,
      success: result.success,
      kind: result.kind,
      elapsedMs: result.elapsedMs,
      detail: result.detail,
    })),
  }

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  expect(passed).toHaveLength(125)
  expect(failed.map(({ id }) => id)).toEqual(expectedFailedIds)
})
