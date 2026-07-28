import { expect, test, type Page } from '@playwright/test'

async function resetManifoldGame(page: Page) {
  await page.goto('/games/manifold-adventure')
  await page.evaluate(() => localStorage.removeItem('manifoldAdventureLocalProgress'))
  await page.reload()
}

test('opens the full Manifold Adventure and verifies its first beginner proof locally', async ({ page }) => {
  await resetManifoldGame(page)

  await expect(page.getByRole('heading', { name: 'Welcome, tiny geometer' })).toBeVisible()
  await expect(page.locator('.course-world-card')).toHaveCount(10)
  await expect(page.locator('.course-level-dots a')).toHaveCount(50)
  await expect(page.getByText('10 worlds · 50 levels')).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'A proof is an object' })).toBeVisible()
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
  await expect(page.getByRole('link', { name: 'Next level: The same place' })).toBeVisible()
})

test('catalog lists the original course separately with local-only progress', async ({ page }) => {
  await page.goto('/games')
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'The Manifold Adventure' })).toBeVisible()

  const card = page.locator('.game-card-manifold-adventure')
  await expect(card.locator('img')).toHaveAttribute('src', '/game-assets/manifolds/cover.svg')
  await expect(card).toContainText('10 worlds')
  await expect(card).toContainText('50 levels')
  await expect(card).toContainText('50 browser-kernel levels')
  await expect(card.getByLabel('Work in progress')).toContainText('WIP')
  await expect(card.getByLabel('Work in progress')).toContainText('Work in progress')
  await expect(card).toContainText('By this project')
})

test('explores the sphere, torus, and Möbius strip in the local 3D lab', async ({ page }) => {
  await page.goto('/games/manifold-adventure/objects')

  const lab = page.locator('.manifold-object-lab')
  const canvas = lab.getByRole('img', { name: /Interactive 3D model of a Sphere/ })
  await expect(lab).toBeVisible()
  await expect(canvas).toBeVisible()
  await expect(lab.getByRole('tab')).toHaveCount(3)
  await expect(lab).not.toContainText('could not display the interactive 3D model')

  await lab.getByRole('tab', { name: 'Torus' }).click()
  await expect(lab.getByRole('heading', { name: 'Torus' })).toBeVisible()
  await expect(lab.getByRole('img', { name: /Interactive 3D model of a Torus/ })).toBeVisible()

  await lab.getByRole('tab', { name: 'Möbius strip' }).click()
  await expect(lab.getByRole('heading', { name: 'Möbius strip' })).toBeVisible()
  const mobius = lab.getByRole('img', { name: /Interactive 3D model of a Möbius strip/ })
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
