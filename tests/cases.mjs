// Test cases for the lean.cau.li playground, shared by the Playwright e2e suite.
//
// The playground compiles against a resident, Init-only Lean environment: core
// tactics work (induction, rw, simp, omega, decide) but there is no Mathlib/Std,
// and an `import` in user code hangs the worker — so every case is pure Init.
//
// Each case is { name, code, expect } where expect is:
//   'ok'          the code compiles with zero errors
//   'error'       the code reports >= 1 error (proves the checker actually checks)
//   { has: 's' }  some diagnostic contains substring s (checks #eval output)

import fs from 'node:fs';

const verificationSource = fs.readFileSync(
  new URL('../src/game/verification-source.ts', import.meta.url),
  'utf8',
);
const gamePrelude = /const BASE_PRELUDE = String\.raw`([\s\S]*?)`\.trim\(\)/.exec(verificationSource)?.[1];
if (!gamePrelude) throw new Error('Could not extract the Natural Number Game browser prelude');

const nng4Data = JSON.parse(fs.readFileSync(
  new URL('../src/game/nng4.generated.json', import.meta.url),
  'utf8',
));
const nng4Signatures = nng4Data.worlds
  .flatMap((world) => world.levels)
  .map((level, index) => {
    const signature = level.theoremName
      ? level.statement.slice(level.theoremName.length).trim()
      : level.statement;
    return `axiom imported_level_${index + 1} ${signature}`;
  })
  .join('\n');

const tutorialRflChallenge = `${gamePrelude}

theorem browser_challenge (x q : ℕ) : 37 * x + q = 37 * x + q := by
  rfl

end MyNat`;

const additionZeroChallenge = `${gamePrelude}

theorem zero_add (n : ℕ) : 0 + n = n := by
  induction n with
  | zero =>
    rw [add_zero]
    exact browser_zero_eq_zero
  | succ d hd =>
    rw [add_succ]
    rw [hd]

end MyNat`;

const additionZeroWrongChallenge = `${gamePrelude}

theorem zero_add (n : ℕ) : 0 + n = n := by
  rfl

end MyNat`;

export const cases = [
  { name: 'NNG4 tutorial rfl in the browser game prelude', expect: 'ok', code: tutorialRflChallenge },
  { name: 'NNG4 addition induction proof after syntax adaptation', expect: 'ok', code: additionZeroChallenge },
  { name: 'NNG4 opaque addition rejects an overpowered rfl', expect: 'error', code: additionZeroWrongChallenge },
  { name: 'all 79 imported NNG4 level statements elaborate', expect: 'ok', code:
`${gamePrelude}
${nng4Signatures}
end MyNat` },

  { name: 'live goal instrumentation reports every open goal', expect: { has: 'case left' }, code:
`example : True ∧ True := by
  constructor
  all_goals
    trace "__LEAN4GAME_LIVE_GOAL_7D4B2A__"
    trace_state
  all_goals trivial` },

  // Natural Number Game territory: Nat lemmas proved from core, by induction.
  { name: 'add_comm by induction', expect: 'ok', code:
`example (a b : Nat) : a + b = b + a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.add_succ, Nat.succ_add, hd]` },

  { name: 'zero_add by induction', expect: 'ok', code:
`example (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, hd]` },

  { name: 'add_assoc by induction', expect: 'ok', code:
`example (a b c : Nat) : a + b + c = a + (b + c) := by
  induction c with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, Nat.add_succ, Nat.add_succ, hd]` },

  { name: 'mul_comm by induction', expect: 'ok', code:
`example (a b : Nat) : a * b = b * a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.mul_succ, hd, Nat.succ_mul]` },

  // Decision procedures and core lemmas.
  { name: 'omega linear arithmetic', expect: 'ok', code:
`example (a b c : Nat) (h : a ≤ b) : a + c ≤ b + c := by omega` },

  { name: 'Nat.le_trans (Init lemma)', expect: 'ok', code:
`example (a b c : Nat) (h1 : a ≤ b) (h2 : b ≤ c) : a ≤ c := Nat.le_trans h1 h2` },

  { name: 'List.reverse_reverse by simp', expect: 'ok', code:
`example (l : List Nat) : l.reverse.reverse = l := by simp` },

  // Term-mode logic and existentials.
  { name: 'and_comm term mode', expect: 'ok', code:
`example (p q : Prop) : p ∧ q → q ∧ p := fun h => ⟨h.2, h.1⟩` },

  { name: 'exists intro', expect: 'ok', code:
`example : ∃ n : Nat, n + n = 6 := ⟨3, rfl⟩` },

  // A recursive definition plus a decidable check over it.
  { name: 'fibonacci def + decide fib 10 = 55', expect: 'ok', code:
`def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib n + fib (n + 1)
example : fib 10 = 55 := by decide` },

  // #eval: computation correctness.
  { name: 'gauss sum #eval = 5050', expect: { has: '5050' }, code:
`#eval (List.range 101).foldl (· + ·) 0` },

  { name: 'string concat #eval = cau.li', expect: { has: 'cau.li' }, code:
`#eval "cau" ++ "." ++ "li"` },

  { name: 'factorial #eval = 120', expect: { has: '120' }, code:
`#eval (List.range 5).foldl (fun a b => a * (b + 1)) 1` },

  // #eval of library functions: the build ships each module's compiled IR
  // (`.ir`) next to its `.olean`, so the interpreter has executable code for
  // tail-recursive List ops and friends (these used to be a pinned limitation:
  // "Unknown constant 'List.reverse._redArg'").
  { name: '#eval List.reverse runs (library IR)', expect: { has: '[3, 2, 1]' }, code:
`#eval [1, 2, 3].reverse` },

  { name: '#eval List.map runs (library IR)', expect: { has: '[2, 3, 4]' }, code:
`#eval [1, 2, 3].map (· + 1)` },

  // Error cases: a correct checker must REJECT wrong code, not rubber-stamp it.
  { name: 'wrong proof rejected', expect: 'error', code:
`example (n : Nat) : n + 1 = n := by rfl` },

  { name: 'type mismatch rejected', expect: 'error', code:
`#check (1 : String)` },

  { name: 'unknown identifier rejected', expect: 'error', code:
`#check thisSymbolDoesNotExist` },

  { name: 'false goal rejected by omega', expect: 'error', code:
`example (n : Nat) : n = n + 1 := by omega` },
];
