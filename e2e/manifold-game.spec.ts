import { expect, test, type Page } from '@playwright/test'

const progressKey = 'manifoldAdventureV4MathlibProgress'

async function resetManifoldGame(page: Page) {
  await page.goto('/games/manifold-adventure')
  await page.evaluate((key) => localStorage.removeItem(key), progressKey)
  await page.reload()
}

async function setEditor(page: Page, value: string) {
  await page.waitForFunction(() => Boolean(
    (window as unknown as {
      __leanEditor?: { getModel: () => unknown }
    }).__leanEditor?.getModel(),
  ))
  await page.evaluate((nextValue) => {
    const editor = (window as unknown as {
      __leanEditor?: { setValue: (content: string) => void }
    }).__leanEditor
    editor?.setValue(nextValue)
  }, value)
}

test('opens the Mathlib-native course and kernel-checks its first proof locally', async ({ page }) => {
  const realAnalysisRequests: string[] = []
  page.on('request', (request) => {
    if (/real-analysis(?:-layer\.json|-lib|\.snap)/.test(request.url())) {
      realAnalysisRequests.push(request.url())
    }
  })
  await resetManifoldGame(page)

  await expect(page.getByRole('heading', {
    name: 'Learn the structures Lean geometers actually use',
  })).toBeVisible()
  await expect(page.locator('.course-world-card')).toHaveCount(6)
  await expect(page.locator('.course-level-dots a')).toHaveCount(25)
  await expect(page.getByText('6 worlds · 25 levels')).toBeVisible()
  await expect(page.locator('.game-header').getByLabel('Work in progress')).toBeVisible()
  await expect(page.getByText(/Mathlib's real manifold API/).first()).toBeVisible()
  await expect(page.locator('.course-world-card').first()).toHaveClass(/unlocked/)
  await expect(page.locator('.course-world-card').nth(1)).toHaveClass(/locked/)

  await page.goto('/games/manifold-adventure/homeomorphisms/1')
  await expect(page.getByRole('heading', { name: 'The drawing matches the trail' })).toBeVisible()
  await expect(page.locator('.goal-target')).toContainText('Continuous trailMap')

  const rewards = page.getByLabel('Level unlocks')
  await expect(rewards).toContainText('exact')
  await expect(rewards).toContainText('Homeomorph.continuous')
  await expect(rewards).toContainText('Homeomorph')
  await expect(rewards).toContainText('Prove this course declaration')
  await expect(rewards).toContainText('homeomorph_continuous')

  await setEditor(page, 'exact trailMap.continuous_symm')
  await expect(page.locator('.proof-feedback .live-goal-error')).toContainText(
    /not unlocked.*continuous_symm/i,
    { timeout: 180_000 },
  )

  await page.getByRole('button', { name: 'View solution' }).click()
  await expect(page.getByText('reference answer')).toBeVisible()
  await page.getByRole('button', { name: 'Use in editor' }).click()
  await expect(page.locator('.game-editor')).toContainText('exact trailMap.continuous')
  await expect(page.locator('.proof-feedback').getByText('No goals remain', { exact: true })).toBeVisible({
    timeout: 180_000,
  })

  await page.getByRole('button', { name: 'Verify answer' }).click()
  await expect(page.locator('.proof-feedback .verification-result')).toBeVisible({ timeout: 180_000 })
  await expect(page.getByRole('heading', {
    name: 'Proof accepted by the local Lean kernel.',
  })).toBeVisible()
  await expect(rewards).toContainText('Level rewards earned')
  await expect(rewards).toContainText('Course declaration earned')
  await expect(page.locator('.game-header-complete')).toContainText('Completed')
  await expect(page.getByRole('link', { name: 'Next: The drawing leads Ada back' })).toBeVisible()
  expect(realAnalysisRequests).toEqual([])
})

test('catalog presents the manifold course as local Mathlib', async ({ page }) => {
  await page.goto('/games')
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'The Manifold Adventure' })).toBeVisible()

  const card = page.locator('.game-card-manifold-adventure')
  await expect(card.locator('img')).toHaveAttribute('src', '/game-assets/manifolds/cover.svg')
  await expect(card).toContainText('6 worlds')
  await expect(card).toContainText('25 levels')
  await expect(card).toContainText('25 browser-kernel levels · local Mathlib')
  await expect(card.getByLabel('Work in progress')).toContainText('WIP')
  await expect(card).toContainText('By this project')
})

test('keeps the Blender-built manifold lab in the canonical-chart world', async ({ page }) => {
  await page.goto('/games/manifold-adventure/canonicalcharts')

  const lab = page.locator('.manifold-object-lab')
  const canvas = lab.getByRole('img', { name: /Interactive 3D model of a Sphere with two charts/ })
  await expect(lab).toBeVisible()
  await expect(canvas).toBeVisible()
  await expect(lab.getByRole('tab')).toHaveCount(7)
  await expect(lab).not.toContainText('could not display the interactive 3D model')

  await lab.getByRole('tab', { name: 'Torus with its two loops' }).click()
  await expect(lab.getByRole('heading', { name: 'Torus with its two loops' })).toBeVisible()
  await expect(lab.getByRole('img', { name: /Interactive 3D model of a Torus/ })).toBeVisible()
})

test('level pages embed models alongside matching Mathlib lessons', async ({ page }) => {
  await page.goto('/games/manifold-adventure')
  await page.evaluate((key) => {
    const completed = [
      'homeomorphisms-1', 'homeomorphisms-2', 'homeomorphisms-3', 'homeomorphisms-4',
      'localcharts-1', 'localcharts-2', 'localcharts-3', 'localcharts-4',
      'chartedspaces-1', 'chartedspaces-2', 'chartedspaces-3', 'chartedspaces-4',
      'chartedspaces-5',
      'canonicalcharts-1', 'canonicalcharts-2', 'canonicalcharts-3', 'canonicalcharts-4',
      'smoothmanifolds-1', 'smoothmanifolds-2', 'smoothmanifolds-3', 'smoothmanifolds-4',
    ]
    localStorage.setItem(key, JSON.stringify({
      answers: {}, completed, attempts: {}, rules: 'regular',
    }))
  }, progressKey)

  await page.goto('/games/manifold-adventure/localcharts/4')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a Sphere with two charts/ }))
    .toBeVisible()

  await page.goto('/games/manifold-adventure/tangentspaces/1')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a Tangent plane/ }))
    .toBeVisible()
})
