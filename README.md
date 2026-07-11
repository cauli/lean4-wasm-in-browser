# Lean 4 in your browser

A playground that runs the real **Lean 4** compiler entirely in the browser via
WebAssembly — type a proof, hit Run, get the kernel's diagnostics back. No server
does the checking; the Lean binary runs in a Web Worker on your machine.

**Live:** https://lean.cau.li

```lean
theorem add_comm (a b : Nat) : a + b = b + a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.add_succ, Nat.succ_add, hd]
```

## How it works

The hard part of "Lean in the browser" isn't compiling Lean to WASM — it's making
it *fast enough to be interactive* and *small enough to load*. This project runs
a **custom Lean fork**
([`cauli/lean4` @ `reinstate-wasm`](https://github.com/cauli/lean4/tree/reinstate-wasm),
tracking upstream master):

- A `wasmCompile` entry point keeps a **resident environment per import set**:
  the first compile for a given set of `import`s pays the import, every one after
  is **milliseconds**. The app warms the `Init` env during page load, so the
  first Run is instant.
- Instead of Emscripten's export-everything mode (`-sMAIN_MODULE=1 -sEXPORT_ALL`,
  which cost ~105 MB of JS glue for a ~231k-entry export table), the binary ships
  an **explicit export list**: the C runtime, the symbols the interpreter
  resolves via `dlsym` — extern stems, `@[export]` names, the guarded
  `initialize_<Module>` functions, `initialize`-decl value cells — plus every
  `l_*___boxed` wrapper, which is the interpreter's native-dispatch contract.
  Getting that list right is most of the story; getting it wrong traps wasm's
  strict `call_indirect` type check.
- Shipping module `initialize` functions turned out to make the in-WASM `Init`
  import take **~4 seconds** (it was minutes when initializers were
  interpreted), so imports are cheap enough to run on page load.
- The build ships each module's **`.ir` file** (compiled bodies) next to its
  `.olean`, so `#eval` of library functions actually executes — exported-level
  oleans alone carry no code.
- It's a pthread build with shared memory, so the page is **cross-origin
  isolated** (COOP/COEP → `SharedArrayBuffer`).

### Two binaries

Both are linked from the same build tree; the app picks per device
(`?variant=slim|full` overrides):

| | full (desktop) | slim (iOS) |
|---|---|---|
| lean.js + lean.wasm | 48 MB + 101 MB | 3.4 MB + 70 MB |
| exports | + all ~88k boxed wrappers | 17k (no wholesale boxed set) |
| libraries | Std, Lean, Batteries resident | **Init only** |

The boxed wrappers keep interpretation shallow enough for external packages
(Batteries ships no native code, and interpreting its initializers otherwise
overflows the worker's fixed JS stack) — but they cost ~450 bytes of glue per
export, and iPhone WebKit can't compile the result inside a tab's memory
budget. The slim binary fits, which is what finally put Lean on an iPhone;
each extra resident environment is too much for iOS, so the phone stays
Init-only (all core tactics, proofs and `#eval`).

## What you can do

- Core tactics and terms: `induction`, `rw`, `simp`, `omega`, `decide`,
  `#check` / `#eval` / `#print`, recursive `def`s.
- **`import Std`, `import Lean` (metaprogramming), `import Batteries`** (desktop) —
  enable them in the *Libraries* dropdown (preference persists) or just write the
  `import`; the first use downloads that layer and imports it once. Batteries is
  compiled for wasm by a **native 32-bit toolchain** from the same commit
  (32-bit oleans are pointer-width compatible with wasm32).
- No Mathlib yet (its exact-version build is the next milestone).

## Editor

Monaco (VS Code's editor core) with a Lean grammar, **unicode abbreviations**
(`\alpha` → `α`, `\to` → `→`; space/Enter commit, Tab commits bare), multi-file
tabs (double-click renames), and diagnostics as squiggles at their exact span.
The workspace persists in `localStorage`; **Share** produces a link — small
workspaces travel inside the URL (`#s=`), larger ones are stored content-addressed
in R2 (`#r2=<sha256>`, immutable) via `/api/share`; **Download** saves your file,
or a zip for several.

## Architecture

Cloudflare, static-first:

| Piece | Served as |
|-------|-----------|
| App shell (React/Vite) | **Pages** (static) |
| `.olean` + `.ir` trees (core + Batteries) | static Pages assets, fetched per layer, cached in the browser's Cache API **keyed by build githash** |
| `lean.js` / `lean.wasm` (both variants) + baked env snapshots | **R2** via `functions/lean-wasm/`, under a **per-build githash prefix** (`<githash>/…`, slim at `<githash>/slim/…`) matching the `?v=` the app requests — builds coexist, deploys never break open sessions |
| Shared snippets | R2 `snippets/<sha256>` via `functions/api/share/` |

The big files come through the Function **same-origin** (pthread workers can't
load cross-origin scripts) and it sets COEP on its own responses — `_headers`
doesn't apply to Function responses.

## Local development

You need a WASM build of the fork under `public/lean-wasm/`: `lean.js`,
`lean.wasm` (memory growth works on the 4.33 builds — no patching), and
`lean-lib/` — a directory of symlinks into the artifact's olean tree (plus
merged extra libraries like Batteries). Optional: `slim/` with the slim
variant's pair for `?variant=slim`, and `snapshots/init.snap` (bake with
`scripts/bake-snapshots.sh`) for the full variant's fast preload. Regenerate
`lean-lib-files.json` / `lean-manifest.json` with `npm run gen-lib-files` /
`gen-manifest`. Build artifacts come from the fork's CI (`Web Assembly` and
`Linux 32bit` jobs; `build-batteries.yml` for Batteries). For link-flag or
export-list experiments, the CI also uploads a **link kit** — the fork's
`docker-wasm/relink-local.sh` relinks `lean.js`/`lean.wasm` from it locally in
minutes, no rebuild.

```bash
npm install
npm run dev        # http://localhost:5173 (COOP/COEP set by Vite)
```

`scripts/lean-wasm-node.cjs` runs any artifact's Lean under plain Node with
real-filesystem access — used for snapshot baking and quick probes.

## Tests

`tests/` boots the real Lean WASM binary headless in Node and checks a suite of
snippets: induction proofs, `omega`, `#eval` output (including library `#eval`
via `.ir`), and error cases the checker must reject. It prefers artifacts
fetched into `tests/.artifacts/` and falls back to `public/lean-wasm/`
(override with `LEAN_ROOT`/`LEAN_WASM`).

```bash
npm run test:fetch   # download the deployed artifacts into tests/.artifacts/
npm test
```

## Deployment

```bash
export CLOUDFLARE_ACCOUNT_ID=<account>
bash deploy/build-pages.sh   # bakes the Lean githash into asset URLs, assembles dist/
bash deploy/upload-r2.sh     # lean.js / lean.wasm / snapshots (+ slim/) → R2 under <githash>/
npx wrangler pages deploy dist --project-name lean-playground --branch main
```

Deploys are self-healing: versioned asset URLs + the githash-keyed olean cache
mean no cache purges, ever. Use `--branch staging-ir` for a staging preview.

## Repo layout

```
src/               React app; src/editor/ = Monaco setup, Lean grammar, unicode input
functions/         lean-wasm/ (R2 big files, COEP) · api/share/ (snippet storage)
public/lean-wasm/  the WASM artifact (gitignored; symlink dir, optional slim/ + snapshots/)
scripts/           manifest/lib-file generation, snapshot baking, the Node runner
deploy/            build-pages.sh, upload-r2.sh, DEPLOY.md
tests/             headless Node integration tests
```

Built on a fork of [leanprover/lean4](https://github.com/leanprover/lean4).
