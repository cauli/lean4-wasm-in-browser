// Examples for the "Load example…" dropdown, derived from the test suite
// (tests/cases.mjs) but adjusted to PRINT something when run: each proof is
// named (with a trailing ' so it can't clash with an Init declaration) and
// followed by #check, so running it shows output instead of a silent success.

export interface Example {
  name: string
  code: string
  /** Library this example needs (matches a Libraries dropdown entry). Undefined
   *  means it only needs Init and always works. */
  requires?: string
}

export const examples: Example[] = [
  {
    name: 'add_comm — by induction',
    code: `-- Commutativity of + on Nat, by induction (Natural Number Game style).
theorem add_comm' (a b : Nat) : a + b = b + a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.add_succ, Nat.succ_add, hd]

#check @add_comm'`,
  },
  {
    name: 'zero_add — by induction',
    code: `theorem zero_add' (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, hd]

#check @zero_add'`,
  },
  {
    name: 'add_assoc — by induction',
    code: `theorem add_assoc' (a b c : Nat) : a + b + c = a + (b + c) := by
  induction c with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, Nat.add_succ, Nat.add_succ, hd]

#check @add_assoc'`,
  },
  {
    name: 'mul_comm — by induction',
    code: `theorem mul_comm' (a b : Nat) : a * b = b * a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.mul_succ, hd, Nat.succ_mul]

#check @mul_comm'`,
  },
  {
    name: 'omega — linear arithmetic',
    code: `-- omega decides linear arithmetic over Nat and Int.
theorem add_le_right' (a b c : Nat) (h : a ≤ b) : a + c ≤ b + c := by omega

#check @add_le_right'`,
  },
  {
    name: 'le_trans — core lemma',
    code: `theorem le_trans' (a b c : Nat) (h1 : a ≤ b) (h2 : b ≤ c) : a ≤ c :=
  Nat.le_trans h1 h2

#check @le_trans'`,
  },
  {
    name: 'reverse_reverse — by simp',
    code: `theorem rev_rev' (l : List Nat) : l.reverse.reverse = l := by simp

#check @rev_rev'`,
  },
  {
    name: 'and_comm — term mode',
    code: `theorem and_comm' (p q : Prop) : p ∧ q → q ∧ p :=
  fun h => ⟨h.2, h.1⟩

#check @and_comm'`,
  },
  {
    name: 'exists intro',
    code: `theorem exists_six' : ∃ n : Nat, n + n = 6 := ⟨3, rfl⟩

#check @exists_six'`,
  },
  {
    name: 'fibonacci — #eval + decide',
    code: `def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib n + fib (n + 1)

#eval fib 10          -- 55
example : fib 10 = 55 := by decide`,
  },
  {
    name: 'Gauss sum — #eval',
    code: `-- 0 + 1 + ... + 100
#eval (List.range 101).foldl (· + ·) 0`,
  },
  {
    name: 'string concat — #eval',
    code: `#eval "cau" ++ "." ++ "li"`,
  },
  {
    name: 'factorial — #eval',
    code: `-- 1 * 2 * 3 * 4 * 5
#eval (List.range 5).foldl (fun a b => a * (b + 1)) 1`,
  },
  {
    name: 'List ops — #eval',
    code: `-- Library functions run in #eval: the build ships each module's compiled
-- IR (.ir) alongside its .olean, so the interpreter has executable code.
#eval [1, 2, 3].reverse
#eval (List.range 5).map (· * 2)
#eval [3, 1, 2].mergeSort`,
  },
  {
    name: 'error: false statement',
    code: `-- The checker rejects a false statement:
example (n : Nat) : n + 1 = n := by rfl`,
  },
  {
    name: 'error: type mismatch',
    code: `#check (1 : String)`,
  },
  {
    name: 'error: unknown identifier',
    code: `#check thisSymbolDoesNotExist`,
  },
  {
    name: 'error: omega on a false goal',
    code: `example (n : Nat) : n = n + 1 := by omega`,
  },

  // ── Requires the Std library (enable it in "Libraries") ──
  {
    name: 'Std.HashMap — the API',
    requires: 'Std',
    code: `import Std.Data.HashMap
-- Std adds hash maps, sets, trees, and more on top of Init.
#check @Std.HashMap.insert
#check @Std.HashMap.get?
#check @Std.HashMap.size`,
  },
  {
    name: 'Std.HashMap — build a map',
    requires: 'Std',
    code: `import Std.Data.HashMap
open Std
-- ∅ is the empty map (via its EmptyCollection instance).
def fruit : HashMap String Nat :=
  (∅ : HashMap String Nat).insert "apple" 3 |>.insert "pear" 5
#eval fruit.getD "apple" 0   -- 3
#eval fruit.size             -- 2
#eval fruit.toList`,
  },
  {
    name: 'Std.HashSet',
    requires: 'Std',
    code: `import Std.Data.HashSet
open Std
def primes : HashSet Nat :=
  (∅ : HashSet Nat).insert 2 |>.insert 3 |>.insert 5
#eval primes.contains 3      -- true
#eval primes.contains 4      -- false
#eval primes.size            -- 3`,
  },

  // ── Requires the Lean library — metaprogramming (enable in "Libraries") ──
  {
    name: 'Lean — the metaprogramming API',
    requires: 'Lean',
    code: `import Lean
open Lean
-- \`import Lean\` exposes the compiler/prover framework itself: the syntax and
-- term representations, the elaboration monads, and the tactic infrastructure —
-- the machinery you'd use to write your own tactics, macros, and elaborators.
#check Lean.Syntax                   -- surface syntax trees
#check Lean.Expr                     -- the internal term representation
#check @Lean.Elab.Tactic.getMainGoal -- read the current goal in a tactic`,
  },
  {
    name: 'Lean — building terms (Expr)',
    requires: 'Lean',
    code: `import Lean
open Lean
-- Metaprograms build and inspect \`Expr\`, Lean's internal term representation.
-- Here are some of its constructors and helpers:
#check @Lean.Expr.app        -- function application
#check @Lean.mkApp           -- smart constructor
#check @Lean.Expr.isApp`,
  },

  // ── Requires the Batteries library (enable in "Libraries") ──
  {
    name: 'Batteries.RBMap — ordered map',
    requires: 'Batteries',
    code: `import Batteries.Data.RBMap.Basic
open Batteries
-- An ordered (red-black tree) map, iterated in key order.
def scores : RBMap String Nat compare :=
  RBMap.ofList [("carol", 9), ("alice", 7), ("bob", 5)] compare
#eval scores.toList          -- sorted by key
#eval scores.find? "bob"`,
  },
  {
    name: 'Batteries — List extras',
    requires: 'Batteries',
    code: `import Batteries.Data.List.Basic
-- Batteries extends core List with many utilities.
#eval [1, 2, 3].sublists
#eval (List.range 6).splitOn 3`,
  },
]
