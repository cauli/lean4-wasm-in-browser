import { expect, test, type Page } from '@playwright/test'

async function resetGame(page: Page) {
  await page.goto('/game')
  await page.evaluate(() => localStorage.removeItem('nng4LocalProgress'))
  await page.reload()
}

async function useReferenceSolution(page: Page) {
  await page.getByRole('button', { name: 'View solution' }).click()
  await expect(page.getByText('Reference solution')).toBeVisible()
  await page.getByRole('button', { name: 'Use in editor' }).click()
}

async function setEditor(page: Page, value: string) {
  await page.waitForFunction(() => {
    const editor = (window as unknown as {
      __leanEditor?: { getModel: () => unknown }
    }).__leanEditor
    return Boolean(editor?.getModel())
  })
  await page.evaluate((nextValue) => {
    const editor = (window as unknown as {
      __leanEditor?: { setValue: (content: string) => void }
    }).__leanEditor
    editor?.setValue(nextValue)
  }, value)
}

async function verifyAccepted(page: Page) {
  await page.getByRole('button', { name: 'Verify answer' }).click()
  await expect(page.locator('.proof-panel > .proof-feedback .verification-result')).toBeVisible({
    timeout: 180_000,
  })
  await expect(page.getByRole('heading', {
    name: 'Proof accepted by the local Lean kernel.',
  })).toBeVisible()
}

test('plays multiple lessons through the local Lean kernel and updates the full tree', async ({ page }) => {
  await resetGame(page)

  await expect(page.getByRole('heading', { name: 'Natural Number Game' })).toBeVisible()
  await expect(page.locator('.tree-world')).toHaveCount(9)
  await expect(page.locator('.tree-level')).toHaveCount(79)
  await expect(page.locator('.game-welcome-pane')).toBeVisible()
  await expect(page.locator('.game-tree-panel')).toBeVisible()
  await expect(page.locator('.map-inventory')).toBeVisible()
  await expect(page.getByText('This is a convenience port for running the game locally in a browser.')).toBeVisible()
  await expect(page.getByLabel('regular')).toBeChecked()

  const mapColumns = await page.locator('.game-map-shell > *').evaluateAll((elements) => (
    elements.map((element) => Math.round(element.getBoundingClientRect().width))
  ))
  expect(mapColumns).toHaveLength(3)
  expect(mapColumns[1]).toBeGreaterThan(mapColumns[0])
  expect(mapColumns[1]).toBeGreaterThan(mapColumns[2])
  await expect(page.locator('.game-header-map')).toHaveCSS('background-color', 'rgb(25, 118, 210)')

  const additionWorld = page.locator('.tree-world[href="/game/addition/1"]')
  const additionHub = additionWorld.locator('.tree-world-hub')
  await expect(additionWorld).toHaveClass(/locked/)
  await additionHub.click()
  await expect(page).toHaveURL(/\/game$/)

  await page.getByLabel('relaxed').check()
  await additionHub.click()
  await expect(page).toHaveURL(/\/game\/addition\/1$/)
  await expect(page.getByRole('heading', { name: 'zero_add' })).toBeVisible()

  await page.goto('/game')
  await page.getByLabel('regular').check()
  await page.goto('/game/tutorial/1')
  await expect(page.getByRole('heading', { name: 'The rfl tactic' })).toBeVisible()
  await expect(page.locator('.level-introduction .katex').first()).toBeVisible()
  await expect(page.locator('.level-introduction .katex-mathml').first()).toBeAttached()
  await expect(page.locator('.level-introduction')).not.toContainText('$37x + q$')
  const storyOrder = await page.locator('.level-story > *').evaluateAll((elements) => (
    elements.map((element) => element.className)
  ))
  expect(storyOrder).toEqual(['level-story-scroll', 'game-toc'])

  await setEditor(page, 'rw [mul_comm]')
  await page.getByRole('button', { name: 'Verify answer' }).click()
  await expect(page.getByRole('heading', {
    name: 'This answer is outside the current inventory.',
  })).toBeVisible()
  await expect(page.locator('.proof-feedback .verification-result')).toContainText(
    "You have not unlocked the tactic 'rw' yet.",
  )
  await expect(page.locator('.goal-panel .structured-goal')).toBeVisible()
  await expect(page.locator('.level-story .verification-result')).toHaveCount(0)

  await useReferenceSolution(page)
  await expect(page.getByText('No goals remain', { exact: true })).toBeVisible({ timeout: 180_000 })
  await verifyAccepted(page)
  const verifyButton = page.getByRole('button', { name: 'Verify answer' })
  const nextLevelButton = page.getByRole('link', { name: 'Next level: the rw tactic' })
  await expect(page.locator('.game-header-complete')).toContainText('Completed')
  await expect(page.locator('.game-header-complete')).toBeVisible()
  await expect(nextLevelButton).toBeVisible()
  await expect(page.getByRole('link', { name: 'Next: the rw tactic' })).toBeVisible()

  const verifyBox = await verifyButton.boundingBox()
  const nextLevelBox = await nextLevelButton.boundingBox()
  expect(verifyBox).not.toBeNull()
  expect(nextLevelBox).not.toBeNull()
  expect(Math.abs(nextLevelBox!.y - verifyBox!.y)).toBeLessThan(8)
  expect(nextLevelBox!.x).toBeGreaterThan(verifyBox!.x)

  await nextLevelButton.click()
  await expect(page).toHaveURL(/\/game\/tutorial\/2$/)
  const statement = page.locator('.level-statement')
  await expect(statement).toContainText('are natural numbers')
  await expect(statement).toContainText('then')
  await expect(statement.locator('.katex')).toHaveCount(4)
  await expect(page.locator('.goal-context-section').first().getByRole('heading', { name: 'Objects' })).toBeVisible()
  await expect(page.locator('.goal-context-section').nth(1).getByRole('heading', { name: 'Assumptions' })).toBeVisible()
  await expect(page.locator('.goal-context')).toContainText('x y')
  await expect(page.locator('.goal-context')).toContainText('h')
  await expect(page.locator('.goal-target')).toContainText('2 * y = 2 * (x + 7)')

  await setEditor(page, 'rw [h]')
  await expect(page.locator('.proof-feedback').getByText('No goals remain', { exact: true })).toBeVisible({
    timeout: 180_000,
  })
  await expect(page.locator('.goal-panel .goal-target')).toContainText('2 * y = 2 * (x + 7)')

  await setEditor(page, 'rw [mul_comm]')
  await expect(page.locator('.proof-feedback .live-goal-error')).toContainText(
    "You have not unlocked the theorem or definition 'mul_comm' yet.",
    { timeout: 180_000 },
  )
  await expect(page.locator('.goal-panel .goal-target')).toContainText('2 * y = 2 * (x + 7)')
  await useReferenceSolution(page)
  await expect(page.getByText('No goals remain', { exact: true })).toBeVisible({ timeout: 180_000 })
  await verifyAccepted(page)

  await page.getByRole('link', { name: 'Next: Numbers' }).click()
  await setEditor(page, 'rw [two_eq_succ_one]')
  await expect(page.locator('.live-goal-list .structured-goal')).toBeVisible({ timeout: 180_000 })
  await expect(page.locator('.live-goal-list')).toContainText('⊢')
  await expect(page.locator('.live-goal-list')).toContainText('succ 1')

  await page.goto('/game')
  await expect(page.locator('.tree-level[href="/game/tutorial/1"]')).toHaveClass(/complete/)
  await expect(page.locator('.tree-level[href="/game/tutorial/2"]')).toHaveClass(/complete/)
  await expect(page.locator('.tree-level[href="/game/tutorial/3"]')).toHaveClass(/unlocked/)
  await expect(page.locator('.tree-level[href="/game/tutorial/4"]')).toHaveClass(/locked/)

  const storedProgress = await page.evaluate(() => (
    JSON.parse(localStorage.getItem('nng4LocalProgress') || '{}')
  ))
  expect(storedProgress.completed).toEqual(expect.arrayContaining(['tutorial-1', 'tutorial-2']))
  expect(storedProgress.attempts['tutorial-1']).toBe(2)
  expect(storedProgress.attempts['tutorial-2']).toBe(1)

  await page.getByLabel('none').check()
  await page.goto('/game/advmultiplication/3')
  await setEditor(page, 'constructor')
  await expect(page.locator('.live-goal-list li')).toHaveCount(2)
  await expect(page.locator('.live-goal-list')).toContainText('case h')
  await expect(page.locator('.live-goal-list')).toContainText('case w')

  await page.goto('/game/addition/1')
  await useReferenceSolution(page)
  await verifyAccepted(page)
})

test('keeps completion and next-level cues visible on a narrow screen and revisit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/game/tutorial/1')
  await page.evaluate(() => {
    localStorage.setItem('nng4LocalProgress', JSON.stringify({
      answers: { 'tutorial-1': 'rfl' },
      attempts: { 'tutorial-1': 1 },
      completed: ['tutorial-1'],
      rules: 'regular',
    }))
  })
  await page.reload()

  const completedBadge = page.locator('.game-header-complete')
  const verifyButton = page.getByRole('button', { name: 'Verify answer' })
  const nextLevelButton = page.getByRole('link', { name: 'Next level: the rw tactic' })
  await expect(completedBadge).toBeVisible()
  await expect(completedBadge).toContainText('Completed')
  await expect(nextLevelButton).toBeVisible()

  const verifyBox = await verifyButton.boundingBox()
  const nextLevelBox = await nextLevelButton.boundingBox()
  expect(verifyBox).not.toBeNull()
  expect(nextLevelBox).not.toBeNull()
  expect(Math.abs(nextLevelBox!.y - verifyBox!.y)).toBeLessThan(8)
})

test('catalogs all games and verifies the first Real Analysis lesson in local Mathlib', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/games')
  await page.evaluate(() => {
    localStorage.removeItem('realAnalysisGameLocalProgress')
    localStorage.setItem('nng4LocalProgress', JSON.stringify({
      answers: {},
      attempts: {},
      completed: ['tutorial-1'],
      rules: 'regular',
    }))
  })
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Choose a game' })).toBeVisible()
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Natural Number Game' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Real Analysis, The Game' })).toBeVisible()
  await expect(page.locator('.game-card-real-analysis-game img')).toHaveAttribute(
    'src',
    '/game-assets/real-analysis/cover.png',
  )
  await expect(page.locator('.game-card-natural-number-game')).toContainText('1 completed')
  await expect(page.locator('.game-card-real-analysis-game')).toContainText(
    'local Mathlib',
  )
  await expect(page.getByText('Built on the original Lean4Game')).toBeVisible()

  await page.locator('.game-card-real-analysis-game').getByRole('link', { name: 'Open game' }).click()
  await expect(page).toHaveURL(/\/games\/real-analysis-game$/)
  await expect(page.getByRole('heading', { name: 'Welcome to Real Analysis, The Game! (v0.1)' })).toBeVisible()
  await expect(page.locator('.course-world-card')).toHaveCount(44)
  await expect(page.locator('.course-level-dots a')).toHaveCount(139)
  await expect(page.locator('.map-inventory')).toBeVisible()
  await expect(page.getByText(/Alex Kontorovich/).first()).toBeVisible()
  await expect(page.locator('.game-map-shell')).toContainText('Mathlib')

  await page.goto('/games/real-analysis-game/realanalysisstory')
  await expect(page.getByRole('heading', { name: 'Lecture 1: The Story of Real Analysis' })).toBeVisible()
  const courseImage = page.locator('.world-introduction img').first()
  await expect(courseImage).toHaveAttribute(
    'src',
    /\/game-assets\/real-analysis\/(Deriv|Integral|People)\.jpg/,
  )

  await page.goto('/games/real-analysis-game/realanalysisstory/1')
  await expect(page.getByRole('heading', { name: 'Introduction to Lean' })).toBeVisible()
  await expect(page.locator('.game-toc details')).toHaveCount(44)
  await expect(page.locator('.goal-target')).toContainText('x = 5')
  await useReferenceSolution(page)
  await expect(page.locator('.game-editor')).toContainText('apply h')
  await expect(
    page.locator('.live-goal-complete, .live-goal-error'),
  ).toBeVisible({ timeout: 600_000 })
  await expect(page.locator('.live-goal-error')).toHaveCount(0)
  await expect(page.getByText('No goals remain', { exact: true })).toBeVisible({ timeout: 600_000 })

  await page.getByRole('button', { name: 'Verify answer' }).click()
  await expect(page.getByRole('heading', {
    name: 'Proof accepted by the local Lean kernel.',
  })).toBeVisible({ timeout: 600_000 })
  await expect(page.locator('.verification-stage')).toHaveCount(4)
  await expect(page.locator('.game-header-complete')).toContainText('Completed')
  await expect(page.getByRole('link', { name: 'Next level: The rfl tactic' })).toBeVisible()

  const stores = await page.evaluate(() => ({
    nng: JSON.parse(localStorage.getItem('nng4LocalProgress') || '{}'),
    real: JSON.parse(localStorage.getItem('realAnalysisGameLocalProgress') || '{}'),
  }))
  expect(stores.nng.completed).toContain('tutorial-1')
  expect(stores.real.completed).toEqual(['realanalysisstory-1'])
  expect(stores.real.answers['realanalysisstory-1']).toBe('apply h')
  expect(stores.real.attempts['realanalysisstory-1']).toBe(1)
})
