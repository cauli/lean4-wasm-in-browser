// Monaco-based Lean editor. One editor instance, one model per open file —
// models keep their own undo stacks and view state, so switching tabs
// preserves both. Diagnostics arrive as `markers` and are applied to the
// active file's model.
import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { registerLeanLanguage, LEAN_LANGUAGE_ID } from './lean-language'
import { attachAbbreviations } from './abbreviations'

// Only the base editor worker: we register Lean ourselves and ship none of
// Monaco's built-in language services.
;(self as unknown as { MonacoEnvironment: object }).MonacoEnvironment = { getWorker: () => new EditorWorker() }

registerLeanLanguage()

export interface LeanMarker {
  severity: 'error' | 'warning' | 'information' | string
  message: string
  startLine: number   // 1-based
  startColumn: number // 0-based (Lean convention; converted here)
  endLine: number
  endColumn: number
}

const models = new Map<string, monaco.editor.ITextModel>()
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

export function dropModel(file: string): void {
  models.get(file)?.dispose()
  models.delete(file)
  viewStates.delete(file)
}

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
}

export function LeanEditor({ file, content, markers, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const fileRef = useRef(file)

  useEffect(() => {
    if (!hostRef.current) return
    const editor = monaco.editor.create(hostRef.current, {
      model: modelFor(file, content),
      theme: 'lean-dark',
      automaticLayout: true,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      fixedOverflowWidgets: true,
      unicodeHighlight: { ambiguousCharacters: false }, // Lean is FULL of legit unicode
      padding: { top: 8 },
    })
    editorRef.current = editor
    // For e2e tests and console debugging.
    ;(window as unknown as { __leanEditor?: unknown }).__leanEditor = editor
    const abbrev = attachAbbreviations(editor)
    const sub = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue())
    })
    return () => { abbrev.dispose(); sub.dispose(); editor.dispose(); editorRef.current = null }
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

  // Diagnostics → squiggles on the active model.
  useEffect(() => {
    const model = models.get(file)
    if (!model || model.isDisposed()) return
    const sev = (s: string) =>
      s === 'error' ? monaco.MarkerSeverity.Error
      : s === 'warning' ? monaco.MarkerSeverity.Warning
      : monaco.MarkerSeverity.Info
    monaco.editor.setModelMarkers(model, 'lean', markers.map((m) => ({
      severity: sev(m.severity),
      message: m.message,
      startLineNumber: Math.max(1, m.startLine),
      startColumn: Math.max(1, m.startColumn + 1), // Lean cols are 0-based
      endLineNumber: Math.max(1, m.endLine),
      endColumn: Math.max(1, m.endColumn + 1),
    })))
  }, [file, markers])

  return <div ref={hostRef} className="monaco-host" />
}
