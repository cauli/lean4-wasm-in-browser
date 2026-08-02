# Deploying to Cloudflare

## Continuous deployment

Pushes to `main` publish automatically: the `playground tests` workflow runs
the full headless suite, and a green run triggers `deploy pages`, which builds
the Pages output and deploys the tested commit. The workflow downloads the
static Lean assets (base `.olean`/`.ir` tree, `lean-lib-files.json`, Real
Analysis packs, and the supplemental manifold packs) from the `pages-assets-*`
GitHub release because the full Lean build tree only exists on a dev machine.

CI needs two repository secrets:

```text
CLOUDFLARE_API_TOKEN   API token with "Cloudflare Pages: Edit" on the account
CLOUDFLARE_ACCOUNT_ID  the personal account id
```

After a Lean artifact swap, run `deploy/upload-r2.sh` (as before), then rebuild
and upload the release asset and point the workflow at it:

```bash
# First run "build Manifold Adventure browser layer" in Actions. Its defaults
# select the exact Lean 62b6 native-i386 artifact and the matching, prebuilt
# browser Mathlib closure. Copy the downloaded manifold-layer.json, six world
# manifests, and six world library directories into public/lean-wasm/.
bash deploy/pack-pages-assets.sh
gh release create pages-assets-<ver> --title "Pages static assets" \
  --notes "Static Pages assets" /tmp/pages-assets.tar.gz
# update PAGES_ASSETS_URL in .github/workflows/deploy-pages.yml
```

The manual path below still works and stays the fallback.

## Browser Mathlib artifact

The source is the [`cauli/lean4`](https://github.com/cauli/lean4) fork. Its
canonical browser branch is `reinstate-wasm`; `wasm-resident-imports` is a
compatibility alias of the same Lean 4.33 tip. The former Lean 4.28 line is
preserved explicitly as `wasm-resident-imports-4.28-archive` and must not be
used with this site's Lean 4.33 `.olean` files.

Use the workflow named
[**Build browser Mathlib manifold closure**](https://github.com/cauli/lean4/actions/workflows/build-browser-mathlib-manifold-closure.yml?query=branch%3Areinstate-wasm).
Despite the name “Mathlib” in the workflow, its artifact is deliberately not a
full Mathlib build. It is the dependency closure rooted at
`Mathlib.Geometry.Manifold.IsManifold.Basic`, compiled with a native i386 Lean
that has the same pointer width and exact githash as the browser WASM build.

The web project's current compatible build is
[action run `30693760471`](https://github.com/cauli/lean4/actions/runs/30693760471).
It consumes toolchain [CI run `29165653896`](https://github.com/cauli/lean4/actions/runs/29165653896),
whose concrete `Web Assembly` and `Linux 32bit` jobs both succeeded at Lean
commit `62b6a2291302d4bbeace37642a066b7510d0145c`. The Mathlib pin is
`de3a9cf33016bbb6d15880d7680643f7ca2d25ba`. Download it with:

```bash
gh run download 30693760471 \
  -R cauli/lean4 \
  -n browser-mathlib-manifold-closure-62b6a22913-de3a9cf330 \
  -D /tmp/browser-mathlib-manifold-closure
```

GitHub action artifacts expire. If this exact artifact is no longer available,
rerun the same workflow on `reinstate-wasm` with `toolchain_run_id=29165653896`.
The lock file in the Lean fork and the downloaded `manifest.json` retain every
Lean, Mathlib, Lake-package, root-module, and source-workflow pin. `SHA256SUMS`
authenticates the manifest and all packs.

This repository's
[`build-manifold-layer.yml`](../.github/workflows/build-manifold-layer.yml)
downloads that closure, verifies its checksums and pins, unpacks it, compiles
the six cumulative `ManifoldAdventure` world modules with the matching native
i386 toolchain, checks all reference solutions in Lean's kernel, and packages
each world's new dependencies as a separate layer. The first world is
standalone; it does not depend on the Real Analysis package.

The current compiled course layer comes from
[web integration run `30743932602`](https://github.com/cauli/lean4-wasm-in-browser/actions/runs/30743932602).
Its artifact is
`manifold-layer-62b6a2291302d4bbeace37642a066b7510d0145c` and contains
`manifold-layer.json`, six world manifests, six world library directories, and
the kernel conformance record. It also contains the precompiled browser policy
module in the first world, including executable IR. The Homeomorphisms layer is
218 MiB compressed; the six layers together are 330 MiB in 58 packs. Download
it with:

```bash
gh run download 30743932602 \
  -R cauli/lean4-wasm-in-browser \
  -n manifold-layer-62b6a2291302d4bbeace37642a066b7510d0145c \
  -D /tmp/manifold-browser-layer
```

The immutable Pages bundle that combines this supplement with the unchanged
shared Lean and Real Analysis assets is the
[`pages-assets-manifold-b6428ed` release](https://github.com/cauli/lean4-wasm-in-browser/releases/tag/pages-assets-manifold-b6428ed).
Its SHA-256 is
`a3fd810af68445126b15ecd2e4d0f969b0df11fa437a9cca4365007428ea4719`.

Before publishing any replacement binary, snapshot, library tree, or packed
course layer, run the
[browser artifact validation gate](../docs/browser-artifact-validation.md).
The gate must finish a first-world Manifold proof in headless Chromium and show
that the local Lean kernel accepted it. Node compilation and artifact checksum
validation remain required, but neither catches browser-only WebAssembly stack
failures.

The production deployment is static-first and keeps proof checking in each
visitor's browser:

- Cloudflare Pages serves the Vite app, worker scripts, game images, the base
  Lean library, the compressed Real Analysis Mathlib/course packs, and the
  supplemental manifold packs.
- A private R2 bucket stores the files that exceed Pages' per-file limit:
  `lean.js`, `lean.wasm`, the optional iOS/slim pair, and baked snapshots.
- `functions/lean-wasm/[[path]].js` exposes those R2 objects through the
  same-origin `/lean-wasm/*` path.
- `public/_headers` enables COOP/COEP. The pthread WASM build requires these
  headers for `SharedArrayBuffer`.

No proof server, container, database, public R2 bucket, or R2 custom domain is
required.

## One-time setup

Authenticate Wrangler and create the private asset bucket:

```bash
npx wrangler login
npx wrangler r2 bucket create lean-assets
```

Create a Cloudflare Pages project named `lean-playground`. In its settings, add
an R2 binding:

```text
Variable name: LEAN_ASSETS
R2 bucket:     lean-assets
```

The binding name and bucket are also recorded in `wrangler.jsonc`. Do not place
an account ID, API token, access key, or secret in the repository; deployment
commands read the account ID from the environment.

## Required local artifacts

`public/lean-wasm/` must contain:

```text
lean.js
lean.wasm
lean-lib/
lean-lib-files.json
real-analysis-layer.json
real-analysis-lib/artifacts-000.pack ... artifacts-051.pack
manifold-layer.json
manifold-homeomorphisms-layer.json
manifold-homeomorphisms-lib/artifacts-000.pack ...
manifold-local-charts-layer.json
manifold-local-charts-lib/artifacts-000.pack ...
manifold-charted-spaces-layer.json
manifold-charted-spaces-lib/artifacts-000.pack ...
manifold-canonical-charts-layer.json
manifold-canonical-charts-lib/artifacts-000.pack ...
manifold-smooth-manifolds-layer.json
manifold-smooth-manifolds-lib/artifacts-000.pack ...
manifold-tangent-spaces-layer.json
manifold-tangent-spaces-lib/artifacts-000.pack ...
```

The optional `slim/` and `snapshots/` directories are uploaded when present.
The Pages build validates every Real Analysis and manifold pack against its
manifest and fails if either layer is absent, incomplete, or pinned to a
different Lean/Mathlib pair.

## Deploy

```bash
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>

bash deploy/upload-r2.sh
bash deploy/build-pages.sh
npx wrangler pages deploy dist \
  --project-name lean-playground \
  --branch main
```

Run `upload-r2.sh` only when the Lean binaries or snapshots change. Run
`build-pages.sh` for every app or game deployment because the Real Analysis
manifest and packs are part of the atomic Pages output.

## Verify

Check these URLs on the deployed origin:

```text
/                         app and local Lean playground
/games                    game catalog
/game/tutorial/1          Natural Number Game
/games/real-analysis-game Real Analysis course
/games/manifold-adventure Mathlib-native manifold course
/lean-wasm/lean.wasm      application/wasm, served from R2
/lean-wasm/real-analysis-layer.json
/lean-wasm/manifold-layer.json
```

The top-level document and worker responses must include:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Finally, verify one NNG proof, one Real Analysis proof, and one Manifold
Adventure proof in a fresh browser profile. The first manifold proof should
load the standalone Homeomorphisms layer and make no Real Analysis requests.
