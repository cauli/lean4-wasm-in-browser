// Examples for the "Load example…" dropdown, derived from the test suite
// (tests/cases.mjs) but adjusted to PRINT something when run: each proof is
// named (with a trailing ' so it can't clash with an Init declaration) and
// followed by #check, so running it shows output instead of a silent success.

export interface Example {
  name: string
  code: string
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
    name: 'limitation: #eval List.reverse',
    code: `-- Runtime #eval of tail-recursive List ops (reverse/map/filter/++) isn't
-- available in this Init-only build — the compiled ._redArg helper is absent.
-- The same ops work inside PROOFS; only #eval trips. Running this prints it:
#eval [1, 2, 3].reverse`,
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
]
