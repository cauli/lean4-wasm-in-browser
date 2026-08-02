import { expect, test, type Page } from '@playwright/test'

const progressKey = 'manifoldAdventureV5MathlibProgress'
const coldMathlibTimeout = 600_000

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
    name: 'The Manifold Adventure',
  })).toBeVisible()
  await expect(page.locator('.course-world-graph .tree-world')).toHaveCount(10)
  await expect(page.locator('.course-world-graph .tree-level')).toHaveCount(44)
  await expect(page.getByText('10 worlds · 44 levels')).toBeVisible()
  await expect(page.getByText('optional path', { exact: true })).toHaveCount(4)
  await expect(page.locator('.game-header').getByLabel('Work in progress')).toBeVisible()
  await expect(page.getByText(/Mathlib's manifold API/).first()).toBeVisible()
  await expect(page.locator('.course-world-graph .tree-world').first()).toHaveClass(/unlocked/)
  await expect(page.locator('.course-world-graph .tree-world').nth(1)).toHaveClass(/locked/)

  await page.goto('/games/manifold-adventure/homeomorphisms/1')
  await expect(page.getByRole('heading', { name: 'The drawing matches the trail' })).toBeVisible()
  await expect(page.locator('.goal-target')).toContainText('Continuous trailMap')
  const verifyButton = page.getByRole('button', { name: 'Verify answer' })
  await expect(verifyButton).toBeDisabled()
  await expect(page.getByRole('progressbar', { name: 'Preparing local Lean' })).toBeVisible()
  await expect(page.locator('.verify-button-tooltip')).toHaveAttribute(
    'title',
    /Lean is still preparing this level/,
  )

  const rewards = page.getByLabel('Level unlocks')
  await expect(rewards).toContainText('exact')
  await expect(rewards).toContainText('Homeomorph.continuous')
  await expect(rewards).toContainText('Homeomorph')
  await expect(rewards).toContainText('Prove this course declaration')
  await expect(rewards).toContainText('homeomorph_continuous')

  await setEditor(page, 'exact trailMap.continuous_symm')
  await expect(page.locator('.proof-feedback .live-goal-error')).toContainText(
    /not unlocked.*continuous_symm/i,
    { timeout: coldMathlibTimeout },
  )
  await expect(verifyButton).toBeEnabled()
  await expect(page.getByRole('progressbar', { name: 'Preparing local Lean' })).toHaveCount(0)

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
  await expect(page.locator('head link[data-lean-runtime-prefetch]')).toHaveCount(2)
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'The Manifold Adventure' })).toBeVisible()

  const card = page.locator('.game-card-manifold-adventure')
  await expect(card.locator('img')).toHaveAttribute('src', '/game-assets/manifolds/cover.svg')
  await expect(card).toContainText('10 worlds')
  await expect(card).toContainText('44 levels')
  await expect(card).toContainText('0 browser-kernel levels · local Mathlib')
  await expect(card.getByLabel('Work in progress')).toContainText('WIP')
  await expect(card).toContainText('By this project')
})

test('keeps the full solution behind the third explicit hint request', async ({ page }) => {
  await page.goto('/games/manifold-adventure/homeomorphisms/1')
  await expect(page.locator('.hint-panel')).toHaveCount(0)

  await page.getByRole('button', { name: 'Show a hint' }).click()
  await expect(page.locator('.hint-panel')).toContainText('carries its continuity proofs')
  await expect(page.locator('.hint-panel')).not.toContainText('exact trailMap.continuous')

  await page.getByRole('button', { name: 'Next hint' }).click()
  await expect(page.locator('.hint-panel')).toContainText('trailMap.continuous')
  await expect(page.locator('.hint-panel')).not.toContainText('exact trailMap.continuous')
  const solutionHintButton = page.getByRole('button', { name: 'Reveal solution hint' })
  await expect(solutionHintButton).toBeEnabled()
  await solutionHintButton.click()
  await expect(page.locator('.hint-panel')).toContainText('(hidden)')
  await expect(page.getByRole('button', { name: 'Solution hint shown' })).toBeDisabled()
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

test('opens the robot world with its configuration-space model', async ({ page }) => {
  await page.goto('/games/manifold-adventure/robotarm')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a Two-joint robot arm/ }))
    .toBeVisible()
  await expect(page.getByText(/Each ring is one circle-valued joint/)).toBeVisible()
})

test('the reachability world has a course-native interactive workspace lab', async ({ page }) => {
  await page.goto('/games/manifold-adventure/robotreachability')

  const lab = page.locator('.robot-workspace-lab')
  await expect(lab).toBeVisible()
  await expect(lab.getByRole('img', { name: /2-link robot workspace/ })).toBeVisible()
  await expect(lab).toContainText('Reachable')

  await lab.getByRole('button', { name: 'Three links' }).click()
  await expect(lab.getByRole('img', { name: /3-link robot workspace/ })).toBeVisible()
  await expect(lab.getByText('Third link', { exact: false }).first()).toBeVisible()
  await expect(lab).toContainText('continuous family of poses')

  await lab.getByLabel('Target radius').fill('6.5')
  await expect(lab).toContainText('Unreachable')
})

test('level pages embed models alongside matching Mathlib lessons', async ({ page }) => {
  await page.goto('/games/manifold-adventure')
  await page.evaluate((key) => {
    const completed = [
      'homeomorphisms-1', 'homeomorphisms-2', 'homeomorphisms-3', 'homeomorphisms-4',
      'localcharts-1', 'localcharts-2', 'localcharts-3', 'localcharts-4',
      'localcharts-5',
      'chartedspaces-1', 'chartedspaces-2', 'chartedspaces-3', 'chartedspaces-4',
      'chartedspaces-5',
      'canonicalcharts-1', 'canonicalcharts-2', 'canonicalcharts-3', 'canonicalcharts-4',
      'canonicalcharts-5',
      'smoothmanifolds-1', 'smoothmanifolds-2', 'smoothmanifolds-3', 'smoothmanifolds-4',
      'smoothmanifolds-5',
      'circlemotion-1', 'circlemotion-2', 'circlemotion-3', 'circlemotion-4',
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

  await page.goto('/games/manifold-adventure/robotarm/1')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a Two-joint robot arm/ }))
    .toBeVisible()
})
