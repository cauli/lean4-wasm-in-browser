// Lightweight Lean 4 tokenizer for editor syntax highlighting. Not a parser —
// just enough to colour keywords, tactics, commands, comments and literals in a
// <pre> layer behind the textarea. Produces HTML with <span class="tok-*"> spans.

const KEYWORDS = new Set([
  'import', 'open', 'namespace', 'section', 'end', 'universe', 'variable', 'variables',
  'def', 'abbrev', 'theorem', 'lemma', 'example', 'instance', 'class', 'structure',
  'inductive', 'axiom', 'opaque', 'partial', 'unsafe', 'noncomputable', 'mutual',
  'where', 'deriving', 'extends', 'private', 'protected', 'scoped', 'local',
  'macro', 'macro_rules', 'syntax', 'notation', 'infix', 'infixl', 'infixr', 'prefix',
  'postfix', 'elab', 'set_option', 'attribute', 'initialize', 'declare_syntax_cat',
  'fun', 'let', 'in', 'do', 'match', 'with', 'if', 'then', 'else', 'by', 'calc',
  'have', 'show', 'from', 'suffices', 'this', 'return', 'try', 'catch', 'finally',
  'for', 'while', 'unless', 'at', 'forall', 'assume', 'nomatch',
]);

const TACTICS = new Set([
  'exact', 'apply', 'intro', 'intros', 'rw', 'rewrite', 'simp', 'simp_all', 'simpa',
  'omega', 'decide', 'rfl', 'constructor', 'cases', 'induction', 'rcases', 'obtain',
  'refine', 'use', 'assumption', 'contradiction', 'trivial', 'ring', 'linarith',
  'nlinarith', 'norm_num', 'field_simp', 'ext', 'funext', 'subst', 'generalize',
  'specialize', 'sorry', 'admit', 'skip', 'done', 'repeat', 'first', 'all_goals',
  'any_goals', 'focus', 'next', 'case', 'unfold', 'delta', 'change', 'convert',
  'congr', 'split', 'left', 'right', 'exfalso', 'by_contra', 'by_cases', 'push_neg',
  'rintro', 'aesop', 'tauto', 'positivity', 'gcongr',
]);

const TYPES = new Set([
  'Prop', 'Type', 'Sort', 'Nat', 'Int', 'Bool', 'String', 'Char', 'List', 'Array',
  'Option', 'Fin', 'Float', 'Unit', 'Empty', 'Sum', 'Prod', 'Sigma', 'Subtype',
  'Set', 'True', 'False',
]);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, text: string) => `<span class="tok-${cls}">${escapeHtml(text)}</span>`;

// Ordered alternation, scanned sticky so every char is consumed with no gaps:
// block comment, line comment, string, char, attribute, #command, number,
// identifier, whitespace, then any single char.
const TOKEN =
  /(\/-[\s\S]*?(?:-\/|$))|(--[^\n]*)|("(?:\\.|[^"\\])*"?)|('(?:\\.|[^'\\])'?)|(@\[[^\]]*\]?)|(#[A-Za-z][\w!?]*)|(\d[\w.]*)|([\p{L}_][\p{L}\p{N}_'!?]*)|(\s+)|([^])/uy;

export function highlightLean(code: string): string {
  let out = '';
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(code)) !== null) {
    if (m[1] || m[2]) out += span('comment', m[1] ?? m[2]);
    else if (m[3] || m[4]) out += span('string', m[3] ?? m[4]);
    else if (m[5]) out += span('attr', m[5]);
    else if (m[6]) out += span('command', m[6]);
    else if (m[7]) out += span('number', m[7]);
    else if (m[8]) {
      const w = m[8];
      if (KEYWORDS.has(w)) out += span('keyword', w);
      else if (TACTICS.has(w)) out += span('tactic', w);
      else if (TYPES.has(w)) out += span('type', w);
      else out += escapeHtml(w);
    } else {
      out += escapeHtml(m[9] ?? m[10]);
    }
    if (m.index === TOKEN.lastIndex) TOKEN.lastIndex++; // safety against zero-width
  }
  return out;
}
