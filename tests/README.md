# lean.cau.li test suite

End-to-end tests that the deployed playground actually compiles real Lean 4 code
correctly — famous Natural Number Game–style proofs, computation checks, and
error cases that must be rejected.

## How to run

1. Open https://lean.cau.li and wait until it shows **Ready**.
2. Open DevTools → Console.
3. Paste the contents of [`console-suite.js`](./console-suite.js) and press Enter.

It drives the real editor (types each snippet, clicks Run, reads the diagnostics)
and prints a pass/fail table. ~120 ms per case; the whole suite runs in a couple
of seconds.

Each case is `{ name, code, expect }`:

| `expect`      | passes when                                             |
|---------------|---------------------------------------------------------|
| `'ok'`        | compiles with zero errors                               |
| `'error'`     | reports ≥ 1 error (proves the checker is actually checking) |
| `{ has: 's' }`| some diagnostic contains substring `s` (checks `#eval` output) |

## What the environment is

The playground compiles against a **resident, Init-only** Lean environment (the
fork's `getOrCreateWasmEnv` imports `Init` once at `level := .exported` and reuses
it per compile). Confirmed behavior:

- **Core tactics work**: `induction`, `rw`, `simp`, `omega`, `decide`, term-mode.
- **No Mathlib / Std**: e.g. `Nat.Prime` is an unknown constant.
- **`import` in user code hangs the worker** — the suite is deliberately pure
  Init. Don't put `import` lines in a snippet.
- **`#eval` limitation**: evaluating tail-recursive `List` operations
  (`reverse`, `map`, `filter`, `++`) fails with
  `Unknown constant 'List.reverse._redArg'` (and `List.appendTR._redArg`). Those
  `._redArg` specializations are compiler-generated and aren't present in the
  exported-level env. The very same operations succeed **inside proofs** — it's
  only runtime `#eval` that trips. `foldl`, `List.range`, and all `String` /
  arithmetic evaluation work fine. The suite pins this as a regression test: if a
  future build ships the missing helpers, those two cases flip to FAIL, signalling
  it's time to update the suite.

## Coverage

- **NNG-style Nat arithmetic, proved from core by induction**: `add_comm`,
  `zero_add`, `add_assoc`, `mul_comm`.
- **Decision procedures / core lemmas**: `omega`, `Nat.le_trans`, `simp`.
- **Term-mode logic & existentials**: `and_comm`, `∃` introduction.
- **Recursion + evaluation**: a `fibonacci` definition checked with `decide`;
  `#eval` computation checks (Gauss sum = 5050, factorial = 120, string concat).
- **Rejection (the checker must say no)**: a false equation, a type mismatch, an
  unknown identifier, a false goal fed to `omega`.
- **Known limitations pinned as regression tests**: `#eval` of `List.reverse` /
  `List.map`.
