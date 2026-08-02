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
- Mathlib is shipped as a separate, on-demand browser layer for the Real
  Analysis Game instead of making every playground visit download it.

## Local Lean4Game library

`/games` is a local game catalog, while the original `/game` Natural Number
Game URL remains unchanged and the Real Analysis Game lives at
`/games/real-analysis-game`. The general Lean playground stays at `/`.

The Natural Number Game renders all 9 active NNG4 worlds and 79 levels
from a pinned upstream snapshot, including introductions, statements, hints,
conclusions, and inventory unlocks. Lesson copy uses a sanitized Markdown
pipeline with GFM tables and nested lists, embedded images, and KaTeX for inline
or display mathematics.

Supported answers are wrapped in a small browser-compatible `MyNat` environment,
then elaborated and kernel-checked by the same persistent Lean WASM worker as
the playground. Proof edits are also inspected locally after a short debounce,
so the current hypotheses and every open tactic goal update without a server.
The route includes a verification audit describing the remaining Lean4Game
gaps: contextual `Hint`/`Branch` evaluation, version parity, and the full
GameServer package. Inventory policy is enforced inside Lean over the parsed
tactic syntax, with theorem declarations resolved against a generated registry
for the exact bundled Init environment.

The [Real Analysis Game](https://github.com/alexkontorovich/realanalysisgame)
port renders its full pinned course: 44 active worlds, 139 levels, dependency
edges, course images, statements, hints, and reference solutions. It has its
own progress store and a scalable full-course tree. The upstream course targets
Lean 4.26; its mathematical modules and custom tactics are reproducibly adapted
to the exact Lean commit used by this browser build and compiled with the
matching Mathlib snapshot. The first Real Analysis proof lazily loads that local
package into the persistent WASM worker. Proof elaboration, kernel checking, and
live tactic goals then run entirely in the browser.

The on-demand layer is the exact 4,303-module dependency closure of the adapted
course (52 compressed packs, about 316 MB). A full Mathlib environment snapshot
was tested but deliberately not shipped: compaction exceeded the practical WASM
heap and would have made local startup larger, not better. Playing a game never
contacts a proof server or runs a container.

The browser verifier mirrors the pinned GameServer inventory walk over parsed
Lean syntax. Tactics are checked against unlocked/disabled inventory, theorem
identifiers are resolved in the active namespace and checked semantically, and
self-reference and unsafe placeholders are rejected. The four-worker browser
matrix currently kernel-verifies 125 of 139 Real Analysis references. The exact
14 failures are recorded in `src/game/real-analysis.conformance.json`: 10
unfinished upstream proofs contain `sorry`, and four large proofs hit the
browser call-stack limit even in isolated workers. Branch-sensitive `Hint` /
`Branch` evaluation remains a separate unported GameServer feature.

The original **Manifold Adventure** at `/games/manifold-adventure` is a
from-scratch conceptual bridge: 6 worlds and 25 short kernel-checked exercises
move from Ada the ant and Flatland through the local Euclidean test, charts and
atlases, a cabinet of surfaces, smooth maps and tangent spaces, to metrics and
curvature. Every world introduces at least one new proof move (contradiction,
case analysis over an atlas, composing maps). Seven 3D teaching models (sphere
with overlapping charts, torus with its generator loops, Möbius band with
orientation arrows, trefoil vs. circle, geodesic triangle, figure eight,
tangent plane) are built in Blender by
`scripts/blender/build-topo-models.py` (run it inside Blender, e.g. through a
BlenderMCP socket) and rendered as lazy-loaded interactive Three.js scenes.
Every page explicitly distinguishes the small proposition Lean checks from the
geometric lesson around it. Its reading path credits the
[Quanta explainer](https://www.quantamagazine.org/what-is-a-manifold-20251103/),
[Loring Tu](https://link.springer.com/book/10.1007/978-1-4419-7400-6),
[John Milnor](https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf), and the
other textbooks and courses linked in the game.

### Credits and scope

This route is a convenience port for running the game locally; it is not an
original replacement for the upstream projects.

- The [Lean4Game](https://github.com/leanprover-community/lean4game) framework
  and interface were primarily developed by Alexander Bentkamp and Jon Eugster.
- The [Natural Number Game](https://github.com/leanprover-community/NNG4) is by
  Kevin Buzzard and Mohammad Pedramfar, with Patrick Massot's NNG4 prototype and
  contributions from the Lean community. Kevin Buzzard maintains the current
  NNG4 game.
- [Real Analysis, The Game](https://github.com/alexkontorovich/realanalysisgame)
  was designed and implemented by Alex Kontorovich for Rutgers University Math
  311H, with thanks in the upstream game to Jon Eugster, Heather Macbeth,
  Michael Stoll, and the students of 311H.
- The lesson text, statements, hints, solutions, inventory, and world structure
  in this port come from their respective upstream games. The local catalog,
  WASM integration, and compatibility layer are the additions made here.

Please report lesson-content issues upstream to NNG4 and framework/interface
issues upstream to Lean4Game when they reproduce in the original projects.

### License

The browser integration and original Manifold Adventure content are released
under the [Apache License 2.0](LICENSE). The imported Natural Number Game and
Real Analysis course materials retain their upstream copyright and attribution
notices and are redistributed under their respective Apache-2.0 licenses.
Pinned sources and credits are recorded in `third_party/`.

To refresh the generated course data:

```bash
git clone --depth 1 https://github.com/leanprover-community/NNG4.git /tmp/nng4
npm run import:nng4 -- /tmp/nng4

git clone --depth 1 https://github.com/alexkontorovich/realanalysisgame.git /tmp/realanalysisgame
npm run import:real-analysis -- /tmp/realanalysisgame
```

NNG4 attribution and licensing notes live in `third_party/NNG4/`.

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
| Real Analysis Mathlib/course layer | 52 compressed static Pages packs, fetched only on first Real Analysis verification |
| Manifold Adventure | 6 cumulative world layers (58 packs in the complete course); the first proof fetches only the Homeomorphisms layer |
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

The Manifold Adventure uses the fork's separately reproducible
[browser Mathlib manifold-closure workflow](https://github.com/cauli/lean4/actions/workflows/build-browser-mathlib-manifold-closure.yml?query=branch%3Areinstate-wasm).
It packages only the transitive closure rooted at
`Mathlib.Geometry.Manifold.IsManifold.Basic`, not full Mathlib. See
[`deploy/DEPLOY.md`](deploy/DEPLOY.md#browser-mathlib-artifact) for the pinned
run, artifact name, and download command used by this web project. The latest
course artifact, with its inventory checker compiled once into the first world,
is available from [web integration run `30743932602`](https://github.com/cauli/lean4-wasm-in-browser/actions/runs/30743932602).
The matching static deployment bundle is the
[`pages-assets-manifold-policy-ccfc081` release](https://github.com/cauli/lean4-wasm-in-browser/releases/tag/pages-assets-manifold-policy-ccfc081).

```bash
npm install
npm run dev        # http://localhost:5173 (COOP/COEP set by Vite)
```

For the bounded Manifold Adventure pack-staging experiment, open a level with
`?artifactWorkers=3`. The normal path is `?artifactWorkers=0`. Both paths keep
one Lean worker; the experimental helpers only fetch and decompress up to three
artifact packs ahead. Compare `window.__leanGameLayerTimings` in fresh tabs.
This does not parallelize Lean's environment import, which remains owned by the
single persistent runtime.

After any browser artifact, snapshot, layer, worker, or generated-proof-source
change, run the [browser artifact validation gate](docs/browser-artifact-validation.md).
It checks a real Manifold proof through Chromium and requires local kernel
acceptance; downloaded packs or a completed module counter are not sufficient.

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
npm run test:nng     # all 79 upstream reference solutions, exact pass/fail matrix
npm run test:real-analysis # all 139 references in four isolated browser workers
npm run test:e2e     # Playwright: live goals, lessons, solutions, locks, progress
```

The NNG conformance matrix uses the same source generator and regular inventory
policy as the browser UI, then checks every upstream reference solution with the
real WASM kernel. Its pinned capability manifest currently records 21 direct
passes and 58 compatibility gaps; an unexpected regression or newly passing
level fails the suite until the manifest is reviewed.

The Real Analysis matrix uses the same packed Mathlib/course layer, generated
source context, inventory policy, and WASM kernel as the lesson UI. It runs in
35-level worker batches to prevent accumulated WASM state from creating false
late-course failures, writes the exact diagnostics report, and asserts the
reviewed 125-pass / 14-fail capability set.

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
