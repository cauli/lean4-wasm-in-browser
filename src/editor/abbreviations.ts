// Unicode abbreviation input for Monaco: `\alpha` → `α`, `\to` → `→`, etc.,
// using the abbreviation database + longest-prefix matcher from vscode-lean4's
// @leanprover/unicode-input. This is a deliberately simple tracker (one
// abbreviation at a time, at the typing position) rather than the package's
// full AbbreviationRewriter, whose multi-cursor text-source protocol is
// built around the VS Code API. Space or Enter commits and keeps the typed
// whitespace; Tab commits without inserting one.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { AbbreviationProvider } from '@leanprover/unicode-input'

const provider = new AbbreviationProvider({
  abbreviationCharacter: '\\',
  customTranslations: {},
  eagerReplacementEnabled: true,
})

// Characters that may extend an abbreviation (the database uses letters,
// digits, and punctuation like `-`, `^`, `_`, `=`, `<`).
const ABBREV_CHAR = /^[a-zA-Z0-9_\-^=<>'"`~+*/!?.()[\]]$/

export function attachAbbreviations(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable {
  // Model offset of the `\` starting the abbreviation being typed, else null.
  let start: number | null = null
  let suppress = false // ignore change events from our own executeEdits

  const commit = (endOffset: number): boolean => {
    const model = editor.getModel()
    if (!model || start === null || endOffset <= start) { start = null; return false }
    const s = start
    start = null
    const abbrev = model.getValue().slice(s + 1, endOffset)
    const replacement = provider.getReplacementText(abbrev)
    if (replacement === undefined) return false
    suppress = true
    editor.executeEdits('lean-abbreviation', [{
      range: monaco.Range.fromPositions(model.getPositionAt(s), model.getPositionAt(endOffset)),
      text: replacement,
      forceMoveMarkers: true,
    }])
    suppress = false
    return true
  }

  const change = editor.onDidChangeModelContent((e) => {
    if (suppress) return
    const model = editor.getModel()
    if (!model || e.changes.length !== 1) { start = null; return }
    const c = e.changes[0]
    const insertOffset = model.getOffsetAt({ lineNumber: c.range.startLineNumber, column: c.range.startColumn })
    if (c.text === '\\' && c.rangeLength === 0) {
      start = insertOffset
      return
    }
    if (start === null) return
    if (c.rangeLength === 0 && ABBREV_CHAR.test(c.text) && insertOffset > start) {
      return // still typing the abbreviation
    }
    if ((c.text === ' ' || c.text === '\n') && c.rangeLength === 0 && insertOffset > start) {
      // The whitespace is already in the model after the abbreviation; commit
      // the `\abbrev` span that precedes it and keep the whitespace.
      commit(insertOffset)
      return
    }
    start = null // any other edit cancels tracking
  })

  // Tab commits without inserting a tab (vscode-lean4 convention).
  const key = editor.onKeyDown((e) => {
    if (e.keyCode !== monaco.KeyCode.Tab || start === null) return
    const model = editor.getModel()
    const pos = editor.getPosition()
    if (!model || !pos) { start = null; return }
    const cursor = model.getOffsetAt(pos)
    // Only intercept Tab when the commit actually replaces something.
    const abbrev = cursor > start ? model.getValue().slice(start + 1, cursor) : ''
    if (abbrev && provider.getReplacementText(abbrev) !== undefined) {
      e.preventDefault()
      e.stopPropagation()
      commit(cursor)
    } else {
      start = null
    }
  })

  const blur = editor.onDidBlurEditorText(() => { start = null })

  return { dispose() { change.dispose(); key.dispose(); blur.dispose() } }
}
