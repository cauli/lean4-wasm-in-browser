// What the editor asks Lean as the reader works: what Lean has at a position
// (the goals, the type expected there, hover text) and the names that could
// go there. The playground supplies a service once its Lean worker answers
// these; until then, and in a runtime without the queries, the editor shows
// only its markers.
//
// Positions are Lean's: a 1-based line and a 0-based column counted in
// codepoints. Monaco counts columns from 1 in UTF-16 units.
import * as monaco from 'monaco-editor/editor/editor.api.js'
import { LEAN_LANGUAGE_ID } from './lean-language'
import { abbreviationProvider } from './abbreviations'

export interface LeanPos { line: number; column: number }

export interface LeanGoal {
  name: string | null
  hyps: { names: string[]; type: string; value: string | null }[]
  target: string
}

export interface LeanInfo {
  /** Null outside tactic proofs, empty where a proof is complete. */
  goals: LeanGoal[] | null
  termGoal: LeanGoal | null
  hover: { text: string; pos: LeanPos; endPos: LeanPos } | null
}

export interface LeanCompletions {
  items: { label: string; kind?: number; deprecated: boolean }[]
  incomplete: boolean
}

export interface LeanService {
  info(code: string, pos: LeanPos): Promise<LeanInfo | null>
  complete(code: string, pos: LeanPos): Promise<LeanCompletions | null>
  /** The type and docstring of item `index` of the last completions. */
  resolve(index: number): Promise<{ detail: string | null; documentation: string | null } | null>
}

let service: LeanService | null = null

export function setLeanService(next: LeanService | null): void {
  service = next
}

export function leanPos(model: monaco.editor.ITextModel, position: monaco.IPosition): LeanPos {
  const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
  return { line: position.lineNumber, column: Array.from(before).length }
}

export function monacoColumn(lineText: string, column: number): number {
  let offset = 0
  for (let n = 0; n < column && offset < lineText.length; n++) {
    offset += (lineText.codePointAt(offset) ?? 0) > 0xffff ? 2 : 1
  }
  return offset + 1
}

// Lean reports LSP completion kinds; Monaco numbers its own differently.
const LSP_KINDS = [
  'Text', 'Method', 'Function', 'Constructor', 'Field', 'Variable', 'Class', 'Interface', 'Module',
  'Property', 'Unit', 'Value', 'Enum', 'Keyword', 'Snippet', 'Color', 'File', 'Reference', 'Folder',
  'EnumMember', 'Constant', 'Struct', 'Event', 'Operator', 'TypeParameter',
] as const

function monacoKind(kind: number | undefined): monaco.languages.CompletionItemKind {
  const name = kind ? LSP_KINDS[kind - 1] : undefined
  return name ? monaco.languages.CompletionItemKind[name] : monaco.languages.CompletionItemKind.Text
}

interface LeanCompletionItem extends monaco.languages.CompletionItem {
  leanIndex?: number
}

// The symbols a newcomer needs most, listed first when only `\` is typed.
const COMMON_ABBREVIATIONS = [
  'to', 'l', 'iff', 'and', 'or', 'not', 'forall', 'exists', 'ne', 'le', 'ge', '.', 'x', 'circ',
  'fun', 'N', 'Z', 'R', 'in', 'notin', 'sub', 'cup', 'cap', 'empty', '<>', 'a', 'b', 'g', '|-',
  'top', 'bot',
]

let registered = false

export function registerLeanServices(): void {
  if (registered) return
  registered = true

  // Names: Lean lists what fits where the name is typed, as its language
  // server does; Monaco narrows and ranks them as typing goes on. A
  // completion replaces the part of the name after its last dot.
  monaco.languages.registerCompletionItemProvider(LEAN_LANGUAGE_ID, {
    triggerCharacters: ['.'],
    async provideCompletionItems(model, position) {
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
      const name = /[\w'α-ωΑ-Ωₐ-ₜ₀-₉ᵢ-ᵪ!?.]*$/u.exec(before)![0]
      if (!service || /^\d/.test(name) || before[before.length - name.length - 1] === '\\') {
        return { suggestions: [] }
      }
      const segment = name.slice(name.lastIndexOf('.') + 1)
      const list = await service.complete(model.getValue(), leanPos(model, position))
      if (!list) return { suggestions: [] }
      const range = new monaco.Range(position.lineNumber, position.column - segment.length,
        position.lineNumber, position.column)
      const suggestions: LeanCompletionItem[] = list.items.map((item, index) => ({
        label: item.label,
        kind: monacoKind(item.kind),
        insertText: item.label,
        range,
        tags: item.deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : [],
        // Deprecated names last; otherwise Monaco's own ranking decides.
        sortText: item.deprecated ? '1' : '0',
        leanIndex: index,
      }))
      return { suggestions, incomplete: list.incomplete }
    },
    async resolveCompletionItem(item: LeanCompletionItem) {
      if (!service || item.leanIndex === undefined) return item
      const about = await service.resolve(item.leanIndex)
      if (about?.detail) item.detail = about.detail
      if (about?.documentation) item.documentation = { value: about.documentation }
      return item
    },
  })

  // Symbols: after a backslash, the abbreviations that start with what has
  // been typed, so a reader need not know their names. The abbreviation
  // tracker still expands an exact one on space or Tab.
  monaco.languages.registerCompletionItemProvider(LEAN_LANGUAGE_ID, {
    triggerCharacters: ['\\'],
    provideCompletionItems(model, position) {
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
      const m = /\\([^\s\\]*)$/.exec(before)
      if (!m) return { suggestions: [] }
      const typed = m[1]
      const table = abbreviationProvider.getSymbolsByAbbreviation()
      const keys = typed
        ? Object.keys(table).filter((k) => k.startsWith(typed))
        : COMMON_ABBREVIATIONS.filter((k) => k in table)
      const range = new monaco.Range(position.lineNumber, position.column - m[0].length,
        position.lineNumber, position.column)
      const rank = (k: string) => (k === typed ? 0 : COMMON_ABBREVIATIONS.includes(k)
        ? 1 + COMMON_ABBREVIATIONS.indexOf(k) : 1000 + k.length)
      const suggestions = keys.slice(0, 400).map((k): monaco.languages.CompletionItem => {
        const symbol = table[k]
        return {
          label: { label: symbol.replace('$CURSOR', ''), description: '\\' + k },
          kind: monaco.languages.CompletionItemKind.Text,
          filterText: '\\' + k,
          sortText: String(rank(k)).padStart(5, '0'),
          // `$CURSOR` marks where the cursor goes, as in `\<>` for `⟨⟩`.
          insertText: symbol.includes('$CURSOR') ? symbol.replace('$CURSOR', '$0') : symbol,
          insertTextRules: symbol.includes('$CURSOR')
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
          range,
        }
      })
      return { suggestions }
    },
  })

  // Hover: the type and docstring of what is under the mouse. Monaco shows
  // the markers there as well.
  monaco.languages.registerHoverProvider(LEAN_LANGUAGE_ID, {
    async provideHover(model, position) {
      if (!service) return null
      const info = await service.info(model.getValue(), leanPos(model, position))
      const hover = info?.hover
      if (!hover) return null
      const start = monacoColumn(model.getLineContent(hover.pos.line), hover.pos.column)
      const end = monacoColumn(model.getLineContent(hover.endPos.line), hover.endPos.column)
      return {
        range: new monaco.Range(hover.pos.line, start, hover.endPos.line, end),
        contents: [{ value: hover.text }],
      }
    },
  })
}
