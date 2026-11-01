import { expect, test, type Page } from '@playwright/test'

// The playground editor works like Lean's VS Code extension on a smaller
// scale: Lean checks the code as it is typed, the gutter marks errors and
// accepted theorems, hover shows types and docstrings, names and symbols
// complete, and the infoview follows the cursor.

type EditorHandle = {
  getValue(): string
  setValue(value: string): void
  setPosition(position: { lineNumber: number; column: number }): void
  focus(): void
}

async function setCode(page: Page, code: string, cursor?: { lineNumber: number; column: number }) {
  await page.evaluate(([value, position]) => {
    const editor = (window as unknown as { __leanEditor: EditorHandle }).__leanEditor
    editor.setValue(value as string)
    editor.focus()
    if (position) editor.setPosition(position as { lineNumber: number; column: number })
  }, [code, cursor ?? null] as const)
}

test('checks as you type, with gutter marks, hover, completion and goals', async ({ page }) => {
  await page.goto('/')
  const infoview = page.locator('.infoview')
  await expect(infoview).not.toContainText('once Lean has started', { timeout: 200_000 })

  // An error: a squiggle's gutter icon, and its message in the infoview.
  await setCode(page,
    'theorem t (n m : Nat) (h : n + m = 0) : n = 0 ∧ m = 0 := by\n  exact h\n',
    { lineNumber: 2, column: 10 })
  await expect(page.locator('.lean-glyph-error')).toHaveCount(1)
  await expect(infoview).toContainText('Type mismatch')

  // A finished proof: ✓✓ in the gutter, and the goals at the cursor.
  await setCode(page,
    'theorem t (n m : Nat) (h : n + m = 0) : n = 0 ∧ m = 0 := by\n  constructor\n  · omega\n  · omega\n',
    { lineNumber: 2, column: 14 })
  await expect(page.locator('.lean-glyph-done')).toHaveCount(1)
  await expect(infoview).toContainText('2 goals')
  await expect(infoview).toContainText('case left')

  // Hover: the type and docstring of a name.
  await setCode(page, '#check Nat.add_comm\n')
  const name = page.locator('.view-line', { hasText: 'Nat.add_comm' }).locator('span', { hasText: 'add_comm' }).first()
  await name.hover()
  await expect(page.locator('.monaco-hover', { hasText: 'Nat.add_comm' }).first()).toBeVisible({ timeout: 20_000 })

  // Completion: names after a dot, with the selected item's type.
  await setCode(page, 'example (n : Nat) : n + 0 = n := by\n  exact Nat.add_ze', { lineNumber: 2, column: 19 })
  await page.keyboard.press('Control+Space')
  const suggest = page.locator('.suggest-widget')
  await expect(suggest).toContainText('add_zero', { timeout: 20_000 })

  // Symbols: a backslash lists them.
  await page.keyboard.press('Escape')
  await setCode(page, 'example (p q : Prop) : p ', { lineNumber: 1, column: 26 })
  await page.keyboard.type('\\')
  await expect(suggest).toContainText('→')
})

function code(page: Page) {
  return page.evaluate(() => (window as unknown as { __leanEditor: EditorHandle }).__leanEditor.getValue())
}

test('offers the suggestions of search tactics as quick fixes', async ({ page }) => {
  await page.goto('/')
  const infoview = page.locator('.infoview')
  await expect(infoview).not.toContainText('once Lean has started', { timeout: 200_000 })

  // A proof that does not parse is an error, not a finished proof.
  await setCode(page, 'theorem t (p q : Prop) (hp : p) : p ∨ q := by\n  apply\n')
  await expect(page.locator('.lean-glyph-error')).toHaveCount(1)
  await expect(page.locator('.lean-glyph-done')).toHaveCount(0)

  // simp?: ⌘. (Ctrl+.) lists its quick fixes, and Enter applies the first.
  await setCode(page, 'theorem t (n : Nat) : n * 0 + n = n := by\n  simp?\n', { lineNumber: 2, column: 5 })
  await expect(infoview).toContainText('simp only')
  await page.keyboard.press('ControlOrMeta+.')
  await expect(page.locator('.action-widget .monaco-list-row', { hasText: 'Try this: simp only' }).first()).toBeVisible()
  await page.keyboard.press('Enter')
  await expect.poll(() => code(page)).toContain('  simp only [Nat.mul_zero, Nat.zero_add]\n')

  // apply?: a suggestion in the infoview is a link that puts it in place.
  await setCode(page, 'theorem t (a b c : Nat) (h : a ≤ b) : a ≤ b + c := by\n  apply?\n', { lineNumber: 2, column: 4 })
  await infoview.getByRole('button', { name: /^exact Nat\./ }).first().click()
  await expect.poll(() => code(page)).toContain('  exact Nat.le_add_right_of_le h\n')
  await expect(page.locator('.lean-glyph-done')).toHaveCount(1)

  // apply? with only partial proofs: one message, three suggestions shown,
  // the rest and the failed attempts folded.
  await setCode(page,
    'theorem t (xs ys : List Nat) : (xs ++ ys).length = ys.length + xs.length := by\n  apply?\n',
    { lineNumber: 2, column: 4 })
  await expect(infoview).toContainText(/partial proofs? (was|were) found, but/)
  await expect(infoview.locator('.iv-message > .iv-suggestion')).toHaveCount(3)
  await expect(infoview.locator('.iv-more > summary').first()).toHaveText(/^\d+ more$/)
})
