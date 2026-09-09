# Playground compiler tests

Integration tests that boot the **real Lean WASM compiler headless in Node** (no
browser) and check it compiles a suite of Lean snippets correctly — famous
Natural Number Game–style induction proofs, computation checks, and error cases
that must be rejected.

The compiler integration suite runs the actual pthread binary through Node
(`worker_threads` + `SharedArrayBuffer`). Separate unit suites check release
pins, fixture integrity, immutable uploads, versioned R2 serving, deployment
destinations, and static packaging without booting WASM.

## Running

```bash
# 🤖 Fetch the checked-in candidate release, not whatever is currently deployed
npm run test:fetch        # -> tests/.artifacts/  (gitignored)

npm test                  # node --test tests/*.test.mjs
```

Locally, if the `public/lean-wasm` dev symlinks point at a full artifact, `npm
test` uses those directly and you can skip the fetch. First run is ~50s (a
one-time Init import); every case after is milliseconds.

CI reads `deploy/runtime-release.json`. It checks the fixture archive SHA-256
before extraction, then checks every runtime object's bytes and the Node
`lib/lean/Init.olean` commit. Node mounts that library through
`FS.filesystems.NODEFS`; fixtures must contain `bin/` and `lib/lean/`, not the
browser's `lean-lib/` layout. The `bin/` glue loads as CommonJS for pthreads.

The required CI gate runs both Node tests and Chromium Manifold/NNG proof
checks. It runs on pushes to `main` and `release/**`, pull requests to `main`,
and manual dispatch. A manual run does not promote production. See
[deployment safety](../deploy/DEPLOY.md).

For light release tests without the compiler:

```bash
node --test tests/runtime-release.test.mjs tests/runtime-serving.test.mjs \
  tests/deploy-target.test.mjs tests/static-assets.test.mjs
```

## Files

| file | role |
|------|------|
| `cases.mjs` | the test cases: `{ name, code, expect }` |
| `lean-node.mjs` | boots the Lean WASM binary in Node, exposes `compile(code) -> { tag, diagnostics }` |
| `playground.test.mjs` | `node --test` runner: boots once, one test per case |
| `fetch-artifacts.mjs` | authenticates and installs the pinned candidate into `tests/.artifacts/` |

`expect` is `'ok'` (compiles clean), `'error'` (reports ≥1 error-severity
diagnostic), or `{ has: 's' }` (some diagnostic's JSON contains `s` — checks
`#eval` output).

## What the environment is

The playground compiles against a **resident, Init-only** Lean environment (the
fork's `getOrCreateWasmEnv` imports `Init` once at `level := .exported`). Confirmed:

- **Core tactics work**: `induction`, `rw`, `simp`, `omega`, `decide`, term-mode.
- **No Mathlib / Std**: e.g. `Nat.Prime` is an unknown constant.
- **`import` in user code hangs the worker** — the suite is deliberately pure Init.
- **`#eval` of library functions works**: the build ships each module's compiled
  IR (`.ir`) next to its `.olean`, so tail-recursive `List` ops (`reverse`, `map`,
  `filter`, `++`) evaluate (these used to fail with
  `Unknown constant 'List.reverse._redArg'`). Two cases pin the fix.

## Coverage

- **NNG-style Nat arithmetic by induction**: `add_comm`, `zero_add`, `add_assoc`, `mul_comm`.
- **Decision procedures / core lemmas**: `omega`, `Nat.le_trans`, `simp`.
- **Term-mode logic & existentials**: `and_comm`, `∃` introduction.
- **Recursion + evaluation**: a `fibonacci` definition checked with `decide`;
  `#eval` output checks (Gauss sum = 5050, factorial = 120, string concat).
- **Rejection**: a false equation, a type mismatch, an unknown identifier, a false
  goal fed to `omega`.
- **Library-IR evaluation pinned as regression tests**: `#eval` of `List.reverse` / `List.map`.
