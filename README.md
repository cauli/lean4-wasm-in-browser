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
every run (~45s inside WASM). This project runs a **custom Lean fork** that keeps
the environment resident:

- [`cauli/lean4` @ `wasm-fast-exported`](https://github.com/cauli/lean4/tree/wasm-fast-exported)
  adds a `wasmCompile` entry point whose `getOrCreateWasmEnv` imports `Init` **once**
  and reuses it for every compile. First compile pays the import; every one after is
  **milliseconds**.
- The app boots a persistent worker and **warms that import during page load**
  (progress bar), so even the first Run you press is instant.
- It's a pthread build with shared memory, so the page must be
  **cross-origin isolated** (COOP/COEP → `SharedArrayBuffer`).

The editor has lightweight Lean syntax highlighting (a tokenizer + a `<pre>` overlay
behind the textarea — no CodeMirror/Monaco) and renders Lean's JSON diagnostics
inline.

## What compiles here

The resident environment is **`Init`-only** (Lean core), imported at the `exported`
olean level. In practice:

- ✅ Core tactics: `induction`, `rw`, `simp`, `omega`, `decide`, term mode, recursive
  `def`s, `#check` / `#eval` / `#print`.
- ❌ **No Mathlib / Std** — e.g. `Nat.Prime` is unknown.
- ❌ **`import` in your code hangs the worker** — everything runs in the pre-imported
  `Init` env; don't add `import` lines.
- ⚠️ **`#eval` of tail-recursive `List` ops** (`reverse`, `map`, `filter`, `++`) fails
  with `Unknown constant '..._redArg'` — those compiler-generated helpers aren't in the
  exported-level env. The same operations work fine **inside proofs**; only runtime
  `#eval` trips. `foldl`, `List.range`, `String` and arithmetic `#eval` all work.

## Architecture

Deployed on Cloudflare as a static app plus one Function:

| Piece | Served as | Why |
|-------|-----------|-----|
| App shell (React/Vite) | Cloudflare **Pages** (static) | tiny, CDN-cached |
| `Init` closure — 506 `.olean` (~65 MB); full base is 2098/~240 MB | static Pages assets | free, cached; the app fetches the `Init` subset it needs |
| `lean.js` (~85 MB), `lean.wasm` (~131 MB) | **R2** via a Pages Function | exceed Pages' 25 MB/file limit |

The two big files come from R2 **same-origin** through `functions/lean-wasm/`,
because the pthread runtime spawns workers from `lean.js` and cross-origin worker
scripts are blocked. That Function also sets `Cross-Origin-Embedder-Policy` on its
own responses — `_headers` doesn't apply to Function responses, and without COEP on
`lean.js` the pthread pool never becomes cross-origin-isolated and the runtime hangs.

## Local development

You need a WASM build of the Lean fork under `public/lean-wasm/`:

- `lean.js`, `lean.wasm` (the wasm must be **memory-patched to 2 GB** — the stock
  4.28 artifact hard-caps at 16 MB and OOMs; see `scripts/patch-wasm-memory.py`),
- `lean-lib/` — the `.olean` library,
- `lean-lib-files.json` + `public/lean-manifest.json` (regenerate with
  `npm run gen-lib-files` / `npm run gen-manifest`).

Build the fork via its CI (the `Web Assembly` job) and drop the artifact in, then:

```bash
npm install
npm run dev        # http://localhost:5173
```

Vite sets COOP/COEP in dev/preview so `SharedArrayBuffer` is available.

## Tests

`tests/` boots the **real Lean WASM binary headless in Node** (no browser — the
Emscripten glue speaks Node via `worker_threads` + `SharedArrayBuffer`) and checks
that a suite of Lean snippets compiles correctly: NNG-style induction proofs, `omega`,
`#eval` output checks, and error cases the checker must reject.

```bash
npm run test:fetch   # download the deployed artifacts into tests/.artifacts/
npm test             # node --test tests/*.test.mjs
```

CI (`.github/workflows/playground-tests.yml`) runs this against the deployed
`lean.cau.li` artifacts on push, daily, and on demand. See `tests/README.md`.

## Deployment

```bash
export CLOUDFLARE_ACCOUNT_ID=<account>
bash deploy/build-pages.sh          # build shell + assemble dist/ (oleans, not the big files)
bash deploy/upload-r2.sh            # push lean.js / lean.wasm to R2
npx wrangler pages deploy           # deploy dist/ to the Pages project
```

`lean.cau.li` is a custom domain on the Pages project; `cau.li` (the homepage) is a
separate Worker. Notes in `deploy/DEPLOY.md`.

## Repo layout

```
src/               React app: App.tsx, lean-loader.ts, leanHighlight.ts, config.ts
functions/         Pages Function serving lean.js/lean.wasm from R2 (same-origin, COEP)
public/lean-wasm/  the WASM artifact (gitignored; symlinks/patched wasm live here)
scripts/           manifest + lib-file generation, the wasm memory patch
deploy/            build-pages.sh, upload-r2.sh, DEPLOY.md
tests/             headless Node integration tests + fetch-artifacts
```

Built on a fork of [leanprover/lean4](https://github.com/leanprover/lean4).
