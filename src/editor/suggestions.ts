// The suggestions of Lean's search tactics (`rw?`, `exact?`, `apply?`,
// `simp?`) as quick fixes, as Lean's VS Code extension offers them. A
// "Try this" message lists replacements for the tactic: each an
// `[apply] <tactic>` line (the text of the button Lean's editors show), the
// lines of a long tactic that continue it indented further, then its notes as
// `--` comments, such as the goals it would leave.
import * as monaco from 'monaco-editor/editor/editor.api.js'
import { LEAN_LANGUAGE_ID } from './lean-language'
import { monacoColumn } from './lean-services'

export interface Suggestion {
  text: string
  notes: string[]
}

export function suggestions(data: string): Suggestion[] | null {
  if (!/^Try th(is|ese):/.test(data)) return null
  const out: Suggestion[] = []
  let indent = 0
  for (const line of data.split('\n').slice(1)) {
    const apply = /^(\s*)\[apply\]\s?(.*)$/.exec(line)
    const last = out[out.length - 1]
    if (apply) {
      indent = apply[1].length
      out.push({ text: apply[2], notes: [] })
    } else if (!last || !line.trim()) {
      continue
    } else if (line.search(/\S/) > indent && !last.notes.length && !line.trim().startsWith('--')) {
      last.text += '\n' + line.slice(indent)
    } else {
      last.notes.push(line.trim())
    }
  }
  return out.length ? out : null
}

// `rw?` also reports each lemma that matched but whose rewrite failed, and
// `apply?` each partial proof whose tactic failed.
const FAILURES = {
  rewrite: {
    pattern: /^found an applicable rewrite lemma, but the corresponding tactic failed/,
    summary: (n: number) => `${n} more lemma${n > 1 ? 's' : ''} matched, but rewriting with ${n > 1 ? 'them' : 'it'} failed`,
  },
  partial: {
    pattern: /^found a partial proof, but the corresponding tactic failed/,
    summary: (n: number) => `${n} more partial proof${n > 1 ? 's were' : ' was'} found, but ${n > 1 ? 'their tactics' : 'its tactic'} failed`,
  },
}
type Failure = keyof typeof FAILURES

export function failure(data: string): Failure | null {
  return (Object.keys(FAILURES) as Failure[]).find((kind) => FAILURES[kind].pattern.test(data)) ?? null
}

export function failureSummary(kind: Failure, count: number): string {
  return FAILURES[kind].summary(count)
}

export type Entry<T> =
  | { message: T; offered: Suggestion[] | null }
  | { failed: Failure; messages: T[] }

// Lean's messages as a list shows them. When `apply?` finds no whole proof
// it reports every partial one, a message each, a hundred or more: the
// suggestions made at one place become one entry, and the failed attempts
// one entry per kind, at the end.
export function grouped<T extends { data: string; pos: { line: number; column: number } }>(messages: T[]): Entry<T>[] {
  const entries: Entry<T>[] = []
  const at = new Map<string, { message: T; offered: Suggestion[] }>()
  const failed = new Map<Failure, T[]>()
  for (const m of messages) {
    const kind = failure(m.data)
    const offered = kind ? null : suggestions(m.data)
    const key = `${m.pos.line}:${m.pos.column}`
    if (kind) {
      failed.set(kind, [...(failed.get(kind) ?? []), m])
    } else if (offered && at.has(key)) {
      at.get(key)!.offered.push(...offered)
    } else if (offered) {
      const entry = { message: m, offered: [...offered] }
      at.set(key, entry)
      entries.push(entry)
    } else {
      entries.push({ message: m, offered: null })
    }
  }
  for (const [kind, list] of failed) entries.push({ failed: kind, messages: list })
  return entries
}

// The edit that puts `text` in place of the search tactic at Lean's
// `line`/`column` in `model`: the tactic runs to the end of its line, or to
// a `;`, `<;>` or `)` after it, and a suggestion of several lines keeps its
// indentation relative to the tactic. Null when no search tactic is there.
export function suggestionEdit(model: monaco.editor.ITextModel, line: number, column: number, text: string) {
  if (line < 1 || line > model.getLineCount()) return null
  const lineText = model.getLineContent(line)
  const start = monacoColumn(lineText, column)
  const rest = lineText.slice(start - 1)
  if (!/^[\w.]+\?/.test(rest)) return null
  const end = rest.search(/\s*(<;>|;|\))/)
  const length = end < 0 ? rest.trimEnd().length : end
  return {
    range: new monaco.Range(line, start, line, start + length),
    text: text.replace(/\n/g, '\n' + ' '.repeat(start - 1)),
  }
}

export interface Offered {
  line: number
  column: number
  offered: Suggestion[]
}

// The suggestions about each model's code, and the version of the code they
// are about; after an edit, the next check brings new ones.
const offeredByModel = new Map<string, { version: number; at: Offered[] }>()

export function setOffered(model: monaco.editor.ITextModel, at: Offered[]): void {
  offeredByModel.set(model.uri.toString(), { version: model.getVersionId(), at })
}

export function offeredFor(model: monaco.editor.ITextModel): Offered[] {
  const known = offeredByModel.get(model.uri.toString())
  return known && known.version === model.getVersionId() ? known.at : []
}

// The quick fixes on a line: its lightbulb, and ⌘. (Ctrl+.) to list them.
export function registerSuggestions(): void {
  monaco.languages.registerCodeActionProvider(LEAN_LANGUAGE_ID, {
    provideCodeActions(model, range) {
      const actions: monaco.languages.CodeAction[] = []
      for (const { line, column, offered } of offeredFor(model)) {
        if (line < range.startLineNumber || line > range.endLineNumber) continue
        offered.forEach((suggestion, i) => {
          const edit = suggestionEdit(model, line, column, suggestion.text)
          if (!edit) return
          actions.push({
            title: `Try this: ${suggestion.text.split('\n')[0]}`,
            kind: 'quickfix',
            isPreferred: i === 0,
            edit: { edits: [{ resource: model.uri, textEdit: edit, versionId: model.getVersionId() }] },
          })
        })
      }
      return { actions, dispose() {} }
    },
  }, { providedCodeActionKinds: ['quickfix'] })
}

// The text of the suggestions made at one place, where a list shows them as
// text: the first few, as Lean writes them, and how many more the quick
// fixes list.
export function suggestionsText(offered: Suggestion[], shown = 3): string {
  const lines = [offered.length > 1 ? 'Try these:' : 'Try this:']
  for (const s of offered.slice(0, shown)) {
    lines.push('  ' + s.text.replace(/\n/g, '\n  '), ...s.notes.map((note) => '  ' + note))
  }
  if (offered.length > shown) lines.push(`  and ${offered.length - shown} more in the quick fixes`)
  return lines.join('\n')
}
