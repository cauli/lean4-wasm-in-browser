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
it *fast enough to be interactive*. A naive build re-imports the `Init` library on
every run (~45 s inside WASM). This project runs a **custom Lean fork**
([`cauli/lean4` @ `wasm-resident-imports`](https://github.com/cauli/lean4/tree/wasm-resident-imports)):

- A `wasmCompile` entry point keeps a **resident environment per import set**:
  the first compile for a given set of `import`s pays the import, every one after
  is **milliseconds**. The app warms the `Init` env during page load, so the first
  Run is instant.
- The build ships each module's **`.ir` file** (compiled bodies) next to its
  `.olean`, so `#eval` of library functions actually executes — exported-level
  oleans alone carry no code.
- It's a pthread build with shared memory, so the page is **cross-origin
  isolated** (COOP/COEP → `SharedArrayBuffer`).

## What you can do

- Core tactics and terms: `induction`, `rw`, `simp`, `omega`, `decide`,
  `#check` / `#eval` / `#print`, recursive `def`s.
- **`import Std`, `import Lean` (metaprogramming), `import Batteries`** — enable
  them in the *Libraries* dropdown (preference persists) or just write the
  `import`; the first use downloads that layer and imports it once. Batteries is
  compiled for wasm by a **native 32-bit toolchain** from the same commit
  (32-bit oleans are pointer-width compatible with wasm32).
- No Mathlib yet (its exact-version build is the next milestone).
- iPhones/iPads get a notice instead of a playground: Safari can't fit the 137 MB
  module in a tab. A lighter memory-growth build is in progress.

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
| `lean.js` (~85 MB), `lean.wasm` (~131 MB) | **R2** via `functions/lean-wasm/`, under a **per-build githash prefix** matching the `?v=` the app requests — builds coexist, deploys never break open sessions |
| Shared snippets | R2 `snippets/<sha256>` via `functions/api/share/` |

The two big files come through the Function **same-origin** (pthread workers can't
load cross-origin scripts) and it sets COEP on its own responses — `_headers`
doesn't apply to Function responses.

## Local development

You need a WASM build of the fork under `public/lean-wasm/`: `lean.js`, a
`lean.wasm` **memory-patched to 2 GB** (`scripts/patch-wasm-memory.py` — the stock
artifact caps at 16 MB), and `lean-lib/` — a directory of symlinks into the
artifact's olean tree (plus merged extra libraries like Batteries). Regenerate
`lean-lib-files.json` / `lean-manifest.json` with `npm run gen-lib-files` /
`gen-manifest`. Build artifacts come from the fork's CI (`Web Assembly` and
`Linux 32bit` jobs; `build-batteries.yml` for Batteries).

```bash
npm install
npm run dev        # http://localhost:5173 (COOP/COEP set by Vite)
```

## Tests

`tests/` boots the real Lean WASM binary headless in Node and checks a suite of
snippets: induction proofs, `omega`, `#eval` output (including library `#eval`
via `.ir`), and error cases the checker must reject.

```bash
npm run test:fetch   # download the deployed artifacts into tests/.artifacts/
npm test
```

## Deployment

```bash
export CLOUDFLARE_ACCOUNT_ID=<account>
bash deploy/build-pages.sh   # bakes the Lean githash into asset URLs, assembles dist/
bash deploy/upload-r2.sh     # lean.js / lean.wasm → R2 under <githash>/
npx wrangler pages deploy dist --project-name lean-playground --branch main
```

Deploys are self-healing: versioned asset URLs + the githash-keyed olean cache
mean no cache purges, ever. Use `--branch staging-ir` for a staging preview.

## Repo layout

```
src/               React app; src/editor/ = Monaco setup, Lean grammar, unicode input
functions/         lean-wasm/ (R2 big files, COEP) · api/share/ (snippet storage)
public/lean-wasm/  the WASM artifact (gitignored; symlink dir + patched wasm)
scripts/           manifest/lib-file generation, the wasm memory patch
deploy/            build-pages.sh, upload-r2.sh, DEPLOY.md
tests/             headless Node integration tests
```

Built on a fork of [leanprover/lean4](https://github.com/leanprover/lean4).
