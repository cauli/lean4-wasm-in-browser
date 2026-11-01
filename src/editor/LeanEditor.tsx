// Monaco-based Lean editor. One editor instance, one model per open file —
// models keep their own undo stacks and view state, so switching tabs
// preserves both. Diagnostics arrive as `markers` and are applied to the
// active file's model, drawn as Lean's VS Code extension draws them.
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor/editor/editor.api.js'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
// The bare editor API has none of the widgets the Lean services feed: hover,
// the completion list, and the lightbulb with its quick fixes.
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution.js'
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js'
import 'monaco-editor/editor/contrib/codeAction/browser/codeActionContributions.js'
import { registerLeanLanguage, LEAN_LANGUAGE_ID } from './lean-language'
import { attachAbbreviations } from './abbreviations'
import { registerLeanServices } from './lean-services'
import { registerSuggestions, setOffered, offeredFor, suggestionEdit, type Suggestion } from './suggestions'

// Only the base editor worker: we register Lean ourselves and ship none of
// Monaco's built-in language services.
;(self as unknown as { MonacoEnvironment: object }).MonacoEnvironment = { getWorker: () => new EditorWorker() }

registerLeanLanguage()
registerLeanServices()
registerSuggestions()

export interface LeanMarker {
  severity: 'error' | 'warning' | 'information' | string
  message: string
  startLine: number   // 1-based
  startColumn: number // 0-based (Lean convention; converted here)
  endLine: number
  endColumn: number
  /** Lean's message kind, e.g. `goalsAccomplished` for a theorem it accepted. */
  kind?: string
  /** Silent messages mark the gutter but are not squiggled. */
  silent?: boolean
  /** The replacements a search tactic such as `rw?` offers for itself here. */
  suggestions?: Suggestion[]
}

const models = new Map<string, monaco.editor.ITextModel>()
let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null
const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>()

function modelFor(file: string, content: string): monaco.editor.ITextModel {
  let m = models.get(file)
  if (!m || m.isDisposed()) {
    m = monaco.editor.createModel(content, LEAN_LANGUAGE_ID, monaco.Uri.file('/' + file))
    models.set(file, m)
  } else if (m.getValue() !== content) {
    // External content change (example loaded, share-link import): replace
    // wholesale but keep it on the undo stack.
    m.pushEditOperations([], [{ range: m.getFullModelRange(), text: content }], () => null)
  }
  return m
}

// eslint-disable-next-line react-refresh/only-export-components
export function dropModel(file: string): void {
  models.get(file)?.dispose()
  models.delete(file)
  viewStates.delete(file)
}

// Put a suggestion in place of the search tactic at Lean's `line`/`column`
// of `file`, as its quick fix does. A suggestion is only applied to the code
// Lean checked; false when that code has changed since.
// eslint-disable-next-line react-refresh/only-export-components
export function applySuggestion(file: string, line: number, column: number, text: string): boolean {
  const model = models.get(file)
  if (!model || model.isDisposed()) return false
  if (!offeredFor(model).some((o) => o.line === line && o.column === column)) return false
  const edit = suggestionEdit(model, line, column, text)
  if (!edit) return false
  model.pushEditOperations([], [edit], () => null)
  if (activeEditor?.getModel() === model) activeEditor.focus()
  return true
}

// eslint-disable-next-line react-refresh/only-export-components
export function renameModel(from: string, to: string): void {
  const m = models.get(from)
  if (!m) return
  models.delete(from)
  viewStates.delete(from)
  const next = monaco.editor.createModel(m.getValue(), LEAN_LANGUAGE_ID, monaco.Uri.file('/' + to))
  models.set(to, next)
  m.dispose()
}

interface Props {
  file: string
  content: string
  markers: LeanMarker[]
  onChange: (value: string) => void
  /** The cursor moved: its 1-based line and Monaco column. */
  onCursor?: (position: monaco.IPosition) => void
  theme?: 'lean-dark' | 'lean-light'
}

export function LeanEditor({ file, content, markers, onChange, onCursor, theme = 'lean-dark' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const onCursorRef = useRef(onCursor)
  const fileRef = useRef(file)
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
    onCursorRef.current = onCursor
  }, [onChange, onCursor])

  useEffect(() => {
    if (!hostRef.current) return
    const editor = monaco.editor.create(hostRef.current, {
      model: modelFor(file, content),
      theme,
      automaticLayout: true,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      glyphMargin: true,
      fixedOverflowWidgets: true,
      unicodeHighlight: { ambiguousCharacters: false }, // Lean is FULL of legit unicode
      padding: { top: 8 },
    })
    editorRef.current = editor
    activeEditor = editor
    // For e2e tests and console debugging.
    ;(window as unknown as { __leanEditor?: unknown }).__leanEditor = editor
    const abbrev = attachAbbreviations(editor)
    const sub = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue())
    })
    const cursor = editor.onDidChangeCursorPosition((e) => onCursorRef.current?.(e.position))
    decorationsRef.current = editor.createDecorationsCollection()
    return () => {
      abbrev.dispose(); sub.dispose(); cursor.dispose(); editor.dispose()
      editorRef.current = null
      if (activeEditor === editor) activeEditor = null
    }
    // The editor is created once; file switches swap the model below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap models on tab switch, preserving scroll/cursor per file.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (fileRef.current !== file) {
      viewStates.set(fileRef.current, editor.saveViewState())
      fileRef.current = file
    }
    const model = modelFor(file, content)
    if (editor.getModel() !== model) {
      editor.setModel(model)
      const vs = viewStates.get(file)
      if (vs) editor.restoreViewState(vs)
    }
  }, [file, content])

  // Diagnostics on the active model, drawn as Lean's VS Code extension draws
  // them: a squiggle under each message's first line, so a long one does not
  // paint a whole proof red; in the gutter, an icon where an error or warning
  // starts, a bar along an error's full extent, and ✓✓ on each theorem Lean
  // accepted.
  useEffect(() => {
    const model = models.get(file)
    if (!model || model.isDisposed()) return
    const sev = (s: string) =>
      s === 'error' ? monaco.MarkerSeverity.Error
      : s === 'warning' ? monaco.MarkerSeverity.Warning
      : monaco.MarkerSeverity.Info
    const lines = model.getLineCount()
    const line = (n: number) => Math.min(Math.max(1, n), lines)
    monaco.editor.setModelMarkers(model, 'lean', markers.filter((m) => !m.silent).map((m) => {
      const start = line(m.startLine)
      const end = m.endLine > m.startLine ? model.getLineMaxColumn(start) : Math.max(1, m.endColumn + 1)
      return {
        severity: sev(m.severity),
        message: m.message,
        startLineNumber: start,
        startColumn: Math.max(1, m.startColumn + 1), // Lean cols are 0-based
        endLineNumber: start,
        endColumn: end,
      }
    }))
    const decorations: monaco.editor.IModelDeltaDecoration[] = []
    const mark = (n: number, options: monaco.editor.IModelDecorationOptions) =>
      decorations.push({ range: new monaco.Range(line(n), 1, line(n), 1), options })
    for (const m of markers) {
      if (m.kind === 'goalsAccomplished') {
        mark(m.startLine, { glyphMarginClassName: 'lean-glyph lean-glyph-done', glyphMarginHoverMessage: { value: 'Goals accomplished!' } })
      } else if (!m.silent && (m.severity === 'error' || m.severity === 'warning')) {
        mark(m.startLine, { glyphMarginClassName: `lean-glyph lean-glyph-${m.severity}` })
        if (m.severity === 'error' && m.endLine > m.startLine) {
          for (let n = m.startLine; n <= Math.min(m.endLine, lines); n++) {
            const part = n === m.startLine ? 'start' : n === m.endLine ? 'end' : 'mid'
            mark(n, { linesDecorationsClassName: `lean-span lean-span-${part}` })
          }
        }
      }
    }
    if (editorRef.current?.getModel() === model) decorationsRef.current?.set(decorations)
    setOffered(model, markers.flatMap((m) =>
      m.suggestions ? [{ line: m.startLine, column: m.startColumn, offered: m.suggestions }] : []))
  }, [file, markers])

  return <div ref={hostRef} className="monaco-host" />
}
