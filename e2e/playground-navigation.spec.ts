import { expect, test } from '@playwright/test'

test('links the Lean4 WASM playground to the game catalog', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Lean4 WASM')
  await expect(page.getByRole('heading', { name: 'Lean4 WASM' })).toBeVisible()

  const gamesLink = page.getByRole('link', { name: 'Open Lean games' })
  await expect(gamesLink).toHaveAttribute('href', '/games')
  await gamesLink.click()

  await expect(page).toHaveURL(/\/games$/)
  await expect(page.getByRole('heading', { name: 'Choose a game' })).toBeVisible()
  await expect(page.locator('.game-card-natural-number-game')).toContainText(
    "Build the natural numbers from scratch in Lean. Start with 2 + 2 = 4, prove that addition commutes, and work toward Fermat's Last Theorem.",
  )

  await page.goto('/game')
  const backToGames = page.getByRole('link', { name: 'Back to all games' })
  await expect(backToGames).toHaveAttribute('href', '/games')
  await backToGames.click()
  await expect(page).toHaveURL(/\/games$/)
})
