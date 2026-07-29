import { expect, test, type Page } from '@playwright/test'

async function resetManifoldGame(page: Page) {
  await page.goto('/games/manifold-adventure')
  await page.evaluate(() => localStorage.removeItem('manifoldAdventureLocalProgress'))
  await page.reload()
}

test('opens the full Manifold Adventure and verifies its first beginner proof locally', async ({ page }) => {
  await resetManifoldGame(page)

  await expect(page.getByRole('heading', { name: 'Welcome, tiny geometer' })).toBeVisible()
  await expect(page.locator('.course-world-card')).toHaveCount(6)
  await expect(page.locator('.course-level-dots a')).toHaveCount(25)
  await expect(page.getByText('6 worlds · 25 levels')).toBeVisible()
  await expect(page.locator('.game-header').getByLabel('Work in progress')).toBeVisible()
  await expect(page.getByText(/Loring Tu/).first()).toBeVisible()
  await expect(page.locator('.course-world-card').first()).toHaveClass(/unlocked/)
  await expect(page.locator('.course-world-card').nth(1)).toHaveClass(/locked/)

  await page.goto('/games/manifold-adventure/flatland')
  await expect(page.locator('.world-introduction img')).toHaveAttribute(
    'src',
    '/game-assets/manifolds/flatland-ant.svg',
  )

  await page.goto('/games/manifold-adventure/flatland/1')
  await expect(page.getByRole('heading', { name: 'Evidence in hand' })).toBeVisible()
  await expect(page.locator('.goal-target')).toContainText('groundIsNear')
  await expect(page.locator('.level-introduction')).not.toContainText('What Lean checks here')

  await page.getByRole('button', { name: 'View solution' }).click()
  await expect(page.getByText('reference answer')).toBeVisible()
  await page.getByRole('button', { name: 'Use in editor' }).click()
  await expect(page.locator('.game-editor')).toContainText('exact evidence')
  await expect(page.locator('.proof-feedback').getByText('No goals remain', { exact: true })).toBeVisible({
    timeout: 180_000,
  })
  await expect(page.locator('.goal-panel .goal-target')).toContainText('groundIsNear')

  await page.getByRole('button', { name: 'Verify answer' }).click()
  await expect(page.locator('.proof-feedback .verification-result')).toBeVisible({ timeout: 180_000 })
  await expect(page.getByRole('heading', {
    name: 'Proof accepted by the local Lean kernel.',
  })).toBeVisible()
  await expect(page.locator('.goal-panel .goal-target')).toContainText('groundIsNear')
  await expect(page.locator('.game-header-complete')).toContainText('Completed')
  await expect(page.getByRole('link', { name: 'Next level: The same spot' })).toBeVisible()
})

test('catalog lists the original course separately with local-only progress', async ({ page }) => {
  await page.goto('/games')
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'The Manifold Adventure' })).toBeVisible()

  const card = page.locator('.game-card-manifold-adventure')
  await expect(card.locator('img')).toHaveAttribute('src', '/game-assets/manifolds/cover.svg')
  await expect(card).toContainText('6 worlds')
  await expect(card).toContainText('25 levels')
  await expect(card).toContainText('25 browser-kernel levels')
  await expect(card.getByLabel('Work in progress')).toContainText('WIP')
  await expect(card.getByLabel('Work in progress')).toContainText('Work in progress')
  await expect(card).toContainText('By this project')

  const worldsBox = await card.locator('.game-card-meta > span').first().boundingBox()
  const badgeBox = await card.getByLabel('Work in progress').boundingBox()
  expect(worldsBox).not.toBeNull()
  expect(badgeBox).not.toBeNull()
  expect(Math.abs(
    (worldsBox!.y + worldsBox!.height / 2) - (badgeBox!.y + badgeBox!.height / 2),
  )).toBeLessThan(1)
})

test('explores the Blender-built shape cabinet in the local 3D lab', async ({ page }) => {
  await page.goto('/games/manifold-adventure/cabinet')

  const lab = page.locator('.manifold-object-lab')
  const canvas = lab.getByRole('img', { name: /Interactive 3D model of a Sphere with two charts/ })
  await expect(lab).toBeVisible()
  await expect(canvas).toBeVisible()
  await expect(lab.getByRole('tab')).toHaveCount(7)
  await expect(lab).not.toContainText('could not display the interactive 3D model')

  await lab.getByRole('tab', { name: 'Torus with its two loops' }).click()
  await expect(lab.getByRole('heading', { name: 'Torus with its two loops' })).toBeVisible()
  await expect(lab.getByRole('img', { name: /Interactive 3D model of a Torus/ })).toBeVisible()

  await lab.getByRole('tab', { name: 'Möbius band' }).click()
  await expect(lab.getByRole('heading', { name: 'Möbius band' })).toBeVisible()
  const mobius = lab.getByRole('img', { name: /Interactive 3D model of a Möbius band/ })
  await expect(mobius).toBeVisible()

  const rotation = lab.getByRole('button', { name: 'Pause rotation' })
  await expect(rotation).toHaveAttribute('aria-pressed', 'true')
  await rotation.click()
  await expect(lab.getByRole('button', { name: 'Resume rotation' })).toHaveAttribute('aria-pressed', 'false')

  const box = await mobius.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.4, { steps: 8 })
  await page.mouse.up()
})

test('level pages embed the purpose-built model for their lesson', async ({ page }) => {
  await page.goto('/games/manifold-adventure')
  await page.evaluate(() => {
    const worlds = ['flatland', 'localtest', 'charts', 'cabinet', 'smooth', 'curvature']
    const completed = worlds.flatMap((world) => (
      Array.from({ length: 5 }, (_, index) => `${world}-${index + 1}`)
    ))
    localStorage.setItem('manifoldAdventureLocalProgress', JSON.stringify({
      answers: {}, completed, attempts: {}, rules: 'regular',
    }))
  })

  await page.goto('/games/manifold-adventure/localtest/4')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a The crossing that fails/ }))
    .toBeVisible()

  await page.goto('/games/manifold-adventure/curvature/2')
  await expect(page.getByRole('img', { name: /Interactive 3D model of a A triangle with three right angles/ }))
    .toBeVisible()
})
