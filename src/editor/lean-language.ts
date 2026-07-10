// Lean 4 language registration for Monaco: a Monarch tokenizer (good-enough
// approximation of the real TextMate grammar — Monaco can't run TextMate
// grammars without shipping an Oniguruma wasm), bracket/comment config, and
// a theme matching the app's dark palette.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export const LEAN_LANGUAGE_ID = 'lean4'

const KEYWORDS = [
  'import', 'export', 'prelude', 'theorem', 'lemma', 'example', 'axiom',
  'inductive', 'coinductive', 'structure', 'class', 'instance', 'abbrev',
  'def', 'meta', 'partial', 'unsafe', 'noncomputable', 'mutual', 'namespace',
  'section', 'end', 'universe', 'universes', 'variable', 'variables', 'open',
  'set_option', 'attribute', 'macro', 'macro_rules', 'syntax', 'notation',
  'deriving', 'where', 'extends', 'protected', 'private', 'public', 'scoped',
  'local', 'renaming', 'hiding', 'exposing', 'do', 'by', 'let', 'extern',
  'fun', 'match', 'with', 'if', 'then', 'else', 'have', 'show', 'suffices',
  'calc', 'this', 'from', 'return', 'try', 'catch', 'finally', 'for', 'in',
  'unless', 'while', 'break', 'continue', 'at', 'sorry', 'admit', 'stop',
  'rec', 'termination_by', 'decreasing_by', 'exists',
]

const COMMANDS = [
  '#check', '#eval', '#print', '#reduce', '#exit', '#guard', '#help',
  '#lint', '#synth', '#unify', '#version', '#where',
]

export function registerLeanLanguage(): void {
  if (monaco.languages.getLanguages().some((l) => l.id === LEAN_LANGUAGE_ID)) return

  monaco.languages.register({ id: LEAN_LANGUAGE_ID, extensions: ['.lean'] })

  monaco.languages.setLanguageConfiguration(LEAN_LANGUAGE_ID, {
    comments: { lineComment: '--', blockComment: ['/-', '-/'] },
    brackets: [['(', ')'], ['[', ']'], ['{', '}'], ['⟨', '⟩'], ['⦃', '⦄']],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '⟨', close: '⟩' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: '/-', close: '-/' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '⟨', close: '⟩' },
      { open: '"', close: '"' },
    ],
    indentationRules: {
      // Indent after := , do, by, =>, where …
      increaseIndentPattern: /(:=|\bdo|\bby|=>|\bwhere|\bfrom|\bcalc)\s*$/,
      decreaseIndentPattern: /^\s*\b(end)\b/,
    },
  })

  monaco.languages.setMonarchTokensProvider(LEAN_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.lean',
    keywords: KEYWORDS,
    commands: COMMANDS,
    // Lean identifiers include Greek letters, subscripts, primes, etc.
    symbols: /[=><!~?:&|+\-*/^%∀∃∧∨¬→↔≤≥≠∈∉⊆⊂∪∩λ←↦∘⬝▸･]+/,
    tokenizer: {
      root: [
        [/--.*$/, 'comment'],
        [/\/-/, 'comment', '@blockComment'],
        [/#[a-zA-Z_]\w*/, {
          cases: { '@commands': 'keyword.command', '@default': '' },
        }],
        [/@[a-zA-Z_[\]]+/, 'annotation'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/'[^\\']'/, 'string'],
        [/'\\.'/, 'string'],
        [/\b\d+\.\d+([eE][+-]?\d+)?\b/, 'number.float'],
        [/\b0[xX][0-9a-fA-F]+\b/, 'number.hex'],
        [/\b\d+\b/, 'number'],
        [/\b(Prop|Type|Sort)\b/, 'type'],
        // sorry stands out
        [/\b(sorry|admit)\b/, 'invalid'],
        [/[a-zA-Z_αβγδεζηθικμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ][\w'ₐ-ₜ₀-₉ᵢⱼₖₗₘₙ!?]*/, {
          cases: { '@keywords': 'keyword', '@default': 'identifier' },
        }],
        [/@symbols/, 'operator'],
        [/[()[\]{}⟨⟩⦃⦄]/, '@brackets'],
      ],
      blockComment: [
        [/[^/-]+/, 'comment'],
        [/\/-/, 'comment', '@push'],
        [/-\//, 'comment', '@pop'],
        [/[/-]/, 'comment'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
    },
  })

  monaco.editor.defineTheme('lean-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'keyword.command', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'annotation', foreground: 'dcdcaa' },
      { token: 'invalid', foreground: 'f14c4c', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#0a0a0a',
      'editor.lineHighlightBackground': '#141414',
      'editorLineNumber.foreground': '#3a3a3a',
      'editorLineNumber.activeForeground': '#8a8a8a',
      'editorIndentGuide.background1': '#1c1c1c',
    },
  })
}
