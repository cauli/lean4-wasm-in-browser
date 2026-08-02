# Browser artifact validation

Run this check whenever a change can alter what Lean loads or executes in the
browser. Node tests are useful, but they do not exercise Chromium's WebAssembly
call stack, web workers, Cache API, snapshot restoration, or COOP/COEP setup.

Changes that require this check include:

- replacing `lean.js`, `lean.wasm`, or a snapshot;
- changing Lean or Mathlib commits, link flags, exports, or memory settings;
- rebuilding `.olean` or `.ir` files;
- changing a layer manifest, pack, dependency closure, or course module;
- changing worker startup, snapshot loading, artifact staging, or module import;
- changing the Lean source generated for a browser proof.

## Record the artifact identity

Before running the browser, record what is actually under test. Do not rely on
the branch name or the name of a downloaded archive.

```bash
readlink public/lean-wasm/lean.wasm
shasum -a 256 public/lean-wasm/lean.js public/lean-wasm/lean.wasm
jq '{leanCommit, mathlibCommit, layers}' public/lean-wasm/manifold-layer.json
```

Confirm that the binary, snapshot, base library, and Manifold layer use the
same Lean commit. Confirm the Mathlib commit separately. A snapshot is paired
with the exact linked WebAssembly function table; rebake it after relinking,
even if the Lean githash did not change.

## Run the browser gate

Install dependencies and make sure the intended local artifacts are present
under `public/lean-wasm/`. Then run the first Manifold level in headless
Chromium:

```bash
npx playwright test e2e/manifold-game.spec.ts \
  --grep 'opens the Mathlib-native course and kernel-checks its first proof locally' \
  --timeout=900000 \
  --reporter=line
```

The test opens a fresh browser context, loads Homeomorphisms level 1, checks an
inventory rejection, inserts the reference proof, clicks **Verify answer**, and
waits for **Proof accepted by the local Lean kernel**. It also asserts that the
standalone Homeomorphisms layer does not fetch the Real Analysis artifact.

A real pass ends with Playwright reporting `1 passed`. These are not passes:

- all packs downloaded;
- `3005 / 3005 modules` displayed;
- the live goal looked correct;
- the same answer worked after clicking Verify a second time;
- the worker stayed alive without reaching kernel acceptance.

The first live-goal assertion has a ten-minute cold-start allowance because it
includes construction of the complete imported environment. Later assertions
retain their shorter limits and therefore measure warm proof checking. Do not
raise either limit in a release change merely to obtain a green result. A
temporary longer wait is useful while diagnosing a slow failure, but restore
the test afterward.

## Keep the failure evidence

Playwright writes a screenshot, an accessibility snapshot, and a trace under
`test-results/`. Copy them somewhere safe before rerunning the test because the
next run replaces that directory.

Open the trace with:

```bash
npx playwright show-trace test-results/*/trace.zip
```

For worker failures, the useful sequence is usually visible directly in the
trace console. A quick text check is:

```bash
unzip -p test-results/*/trace.zip 0-trace.trace |
  rg -i 'Loading [0-9]+ modules|importModules completed|COMPILE.*(done|threw)|RangeError|Maximum call stack'
```

Record at least:

- the Lean and Mathlib commits;
- hashes of `lean.js` and `lean.wasm`;
- the exact test command and URL parameters;
- the last successful worker stage;
- the first exception and its timestamp;
- whether the failure reproduces in a fresh browser context.

## Diagnose with one-variable comparisons

Start from a reproducible failing artifact. Change one thing, open a fresh
browser context, and run the same proof. Keep source, `.olean` files, Mathlib
closure, browser, and test input fixed unless one of them is the variable under
test.

Do not treat an automatic retry as a fix. A useful result changes the first run
from red to green. Once a candidate fix passes, switch the changed component
back and reproduce the failure once more when practical.

Separate these stages in the trace:

1. artifact download and decompression;
2. module import and environment construction;
3. elaboration and generated-code compilation;
4. kernel acceptance.

This distinction matters. A page can display every module as loaded while Lean
is still compiling the generated proof module.

## Precompiled inventory policy

The Manifold course enforces its unlock rules twice. TypeScript catches obvious
mistakes quickly, while Lean checks the parsed tactic syntax before elaborating
the proof. The Lean check is authoritative because it resolves declarations in
the imported Mathlib environment.

The old generator copied that recursive Lean checker into every temporary proof
file. Each edit therefore asked the browser compiler to compile the checker as
well as the student's few lines. The replacement divides the work this way:

- `lean/ManifoldAdventure/BrowserPolicy.lean` owns the syntax walk, declaration
  resolution, and inventory error messages;
- `src/game/mathlib-verification-source.ts` sends the eight level-specific name
  sets as newline-delimited strings;
- each generated world publicly imports the policy module;
- `scripts/build-manifold-course.sh` compiles the policy before the worlds;
- `scripts/create-manifold-layer-index.mjs` refuses a first-world package that
  lacks `BrowserPolicy.olean`, `BrowserPolicy.ir`, or `BrowserPolicy.ir.sig`.

A generated attempt now has this shape:

```lean
import ManifoldAdventure.Homeomorphisms

namespace ManifoldAdventure

theorem browser_challenge ... := by
  manifold_browser_user
    "allowed keywords"
    "allowed tactics"
    "known tactics"
    "disabled tactics"
    "allowed declarations"
    "known declarations"
    "disabled declarations"
    "this level's declaration"
    exact trailMap.continuous

end ManifoldAdventure
```

`tacticSeqIndentGt` gives the user proof a strict indentation boundary. This is
important for live goals: the wrapper must not consume the verifier's following
`all_goals` and `trace_state` commands when the editor is empty.

Run the native contract before requesting a browser artifact:

```bash
node scripts/create-manifold-game.mjs
bash scripts/build-manifold-course.sh /tmp/manifold-mathlib4
MATHLIB_ROOT=/tmp/manifold-mathlib4 node scripts/verify-manifold-references.mjs
```

That command checks all 25 reference solutions, an empty live-goal preview,
self-reference rejection, and locked-declaration rejection. A local compiler
whose commit differs from the browser pin may run these checks, but it does not
overwrite the pinned conformance record. The exact native-i386 compiler in
`build-manifold-layer.yml` produces the publishable record and browser files.

## Incident record: Manifold inventory overflow

On 2026-08-02, Homeomorphisms level 1 reproduced `RangeError: Maximum call
stack size exceeded` in headless Chromium with a correct proof. The trace showed
all 3,005 modules finishing their import before the exception.

Relinking the same Lean object kit and Mathlib artifacts with 16 MB, 32 MB, and
48 MB Emscripten `STACK_SIZE` values produced the same failure. The repeated
WASM frame mapped to
`Lean.Compiler.LCNF.JoinPointContextExtender.extend`, so increasing the linear
memory stack was not the fix.

As a control, the test used the original 16 MB binary but omitted the Lean
inventory prelude generated for each proof. The valid proof then reached
**No goals remain**, Verify completed, and Playwright reported `1 passed` in
5.1 minutes. This isolated the overflow to recompiling the generated inventory
checker, while also leaving a separate cold-import performance problem visible.

The inventory checker now lives in the precompiled
`ManifoldAdventure.BrowserPolicy` course module. Generated proof files contain
only the level's policy as eight newline-delimited strings and a call to
`manifold_browser_user`; they no longer redefine and compile the recursive
checker for every edit. The first world layer must contain
`BrowserPolicy.olean`, `BrowserPolicy.ir`, and `BrowserPolicy.ir.sig`.

Native validation compiles all 25 reference solutions, an empty goal preview,
and the self-reference and locked-declaration rejection cases. That protects
the policy contract, but it does not replace this browser gate. A rebuilt,
commit-matched i386 course layer must still complete the first proof in
Chromium before publication.

The exact layer built by [Actions run 30743932602](https://github.com/cauli/lean4-wasm-in-browser/actions/runs/30743932602)
from course commit `ccfc08159915c9a12ebe0d4509af4266a1e040a7` passed the gate
in a fresh Chromium context in 5.6 minutes. The locked-declaration preview and
the valid proof both completed on their first attempt, and the valid proof was
accepted by the local kernel without fetching the Real Analysis layer.
