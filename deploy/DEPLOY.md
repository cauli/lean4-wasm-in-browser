# Deploying to Cloudflare

## Continuous deployment

`deploy/runtime-release.json` pins the runtime release. It records the exact Lean
commit, Emscripten SDK, immutable R2 prefix, each object's SHA-256 and byte count,
and the fixture and static bundle identities. Uploads, Pages builds, and CI read
this same file. Do not add a manual tag or use a timestamp to select a release.
Conflicting `LEAN_ASSET_TAG`, `VITE_LEAN_ASSET_VERSION`, `LEAN_ARTIFACTS_URL`, or
`PAGES_ASSETS_URL` values abort instead of selecting different artifacts.

The `playground tests` workflow calls the required `runtime release gate`. It:

1. Authenticates the pinned fixture archive before extraction.
2. Checks the Node and browser runtime bytes and the `Init.olean` Lean commit.
3. Runs the Node tests, including the NNG reference matrix.
4. Authenticates the static bundle and stages the six pinned runtime objects.
5. Requires first-attempt Chromium Manifold and NNG kernel acceptance.

A successful **push-to-main** gate run triggers production deployment of that
exact commit. A manual gate run, pull-request run, or release-branch run cannot
trigger production. Configure `runtime-gate / validate` as a required branch
check. Protect the GitHub `production` environment and restrict it to `main`.

Manual `deploy pages` runs require an explicit `preview-...` branch. They run
the same gate before publishing a Pages preview. They never use the `main`
Pages branch, even when dispatched from GitHub's `main` branch. For example,
select `preview-compact1` as the input to review a candidate without promotion.

CI needs these repository or environment secrets:

```text
CLOUDFLARE_API_TOKEN   token with Cloudflare Pages edit permission
CLOUDFLARE_ACCOUNT_ID the intended account id
```

CI cannot use a developer's local Wrangler OAuth login. A missing API token
blocks deployment, not the artifact checks.

## Runtime release procedure

Use a new immutable release name for any binary, glue, or snapshot change.
Keep the six object entries together: full JS/WASM, slim JS/WASM, and each
variant's `snapshots/init.snap`. The compact-exports release retains its
existing slim pair and snapshots; the manifest pins their unchanged bytes.

The fixture archive contains regular files and directories only:

```text
bin/lean.js
bin/lean.wasm
bin/package.json                 { "type": "commonjs" }
lib/lean/Init.olean              plus the Init .olean/.ir/.ir.sig closure
runtime/lean.js
runtime/lean.wasm
runtime/slim/lean.js
runtime/slim/lean.wasm
runtime/snapshots/init.snap
runtime/slim/snapshots/init.snap
```

Dereference symlinks and hardlinks when making the tarball. The fetcher rejects
links and unsafe paths. It verifies the archive before extraction and verifies
the full JS/WASM twice: the Node `bin/` pair and the browser `runtime/` pair.
An unsuccessful fetch keeps the previous Node fixture directory intact.

Before publishing:

1. Stage the exact local objects and compute their hashes and byte counts.
2. Package the fixture and static assets. Record their immutable URLs, SHA-256,
   and byte counts in the release manifest. Do not reuse a release asset URL.
3. Run the [browser validation gate](../docs/browser-artifact-validation.md) on
   the candidate and require the CI gate for the candidate commit.
4. Have one publisher run `bash deploy/upload-r2.sh`. It validates every local
   object and preflights **all** remote keys before the first write. Identical
   objects are skipped. Different bytes or unknown read failures abort.
5. Deploy a preview. Confirm the pinned runtime requests, response headers,
   and local kernel acceptance before moving the tested change to `main`.

The R2 check is a checksum preflight, not an atomic create-only write. Do not
run concurrent publishers against the same prefix. Keep incomplete prefixes
out of production. Do not overwrite existing R2 objects or GitHub release
assets with `--clobber`.

The Pages bundle includes the base `.olean`/`.ir` tree, `lean-lib-files.json`,
**`core-layer.json` and `core-lib` packs**, Real Analysis packs, and the Manifold
layers. `bash deploy/pack-pages-assets.sh` checks that the core packs exist,
have the declared sizes, and match the base Lean commit. This packaging step
does not rebuild Lean or Mathlib.

Requests with an explicit `?v=` read only that R2 prefix. A missing versioned
object returns 404, never bytes from a different release. Only old requests
without a `v` parameter can read the bare legacy objects. Invalid or repeated
version parameters return 400. Audit any old version prefixes before changing
the serving function; old explicit versions also require their own objects.

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

That artifact covers the original six-world path only. The optional
Map Projections, Circle Motion, and Robot Arm worlds add two closure roots:

```text
Mathlib.Geometry.Manifold.Instances.Sphere
Mathlib.Analysis.SpecialFunctions.Complex.Circle
```

The Lean fork's closure packager already accepts repeated `--root` arguments.
Its lock file and `build-browser-mathlib-manifold-closure.yml` must list those
two modules alongside `Mathlib.Geometry.Manifold.IsManifold.Basic`. Run that
sidecar first, then pass the new action run as `mathlib_layer_run_id` when
dispatching `build-manifold-layer.yml`. The web workflow rejects the older
single-root artifact before compilation, so it cannot publish a course with
missing Sphere or Circle files.

GitHub action artifacts expire. If this exact artifact is no longer available,
rerun the same workflow on `reinstate-wasm` with `toolchain_run_id=29165653896`.
The lock file in the Lean fork and the downloaded `manifest.json` retain every
Lean, Mathlib, Lake-package, root-module, and source-workflow pin. `SHA256SUMS`
authenticates the manifest and all packs.

This repository's
[`build-manifold-layer.yml`](../.github/workflows/build-manifold-layer.yml)
downloads that closure, verifies its checksums and pins, unpacks it, compiles
the ten graph-linked `ManifoldAdventure` world modules with the matching native
i386 toolchain, checks all reference solutions in Lean's kernel, and packages
each world's new dependencies as a separate layer. The first world is
standalone; it does not depend on the Real Analysis package.

The previously published six-world course layer came from
[web integration run `30743932602`](https://github.com/cauli/lean4-wasm-in-browser/actions/runs/30743932602).
Its artifact is
`manifold-layer-62b6a2291302d4bbeace37642a066b7510d0145c` and contains
`manifold-layer.json`, six world manifests, six world library directories, and
the kernel conformance record. It also contains the precompiled browser policy
module in the first world, including executable IR. The Homeomorphisms layer is
218 MiB compressed; those six layers total 330 MiB in 58 packs. It does not
contain the three optional worlds in revision r2. Download
it with:

```bash
gh run download 30743932602 \
  -R cauli/lean4-wasm-in-browser \
  -n manifold-layer-62b6a2291302d4bbeace37642a066b7510d0145c \
  -D /tmp/manifold-browser-layer
```

The immutable Pages bundle that combines this supplement with the unchanged
shared Lean and Real Analysis assets is the
[`pages-assets-manifold-policy-ccfc081` release](https://github.com/cauli/lean4-wasm-in-browser/releases/tag/pages-assets-manifold-policy-ccfc081).
Its SHA-256 is
`0b441e86c41a37c3782b263b7e1217640fc2d0596e6a92f3b952aaf36ded9dcc`.

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
manifold-map-projections-layer.json
manifold-map-projections-lib/artifacts-000.pack ...
manifold-circle-motion-layer.json
manifold-circle-motion-lib/artifacts-000.pack ...
manifold-robot-arm-layer.json
manifold-robot-arm-lib/artifacts-000.pack ...
```

The pinned `slim/` and `snapshots/` objects are required. Missing files abort
the upload; the uploader never silently skips a release object.
The Pages build validates every Real Analysis and manifold pack against its
manifest and fails if either layer is absent, incomplete, or pinned to a
different Lean/Mathlib pair.

## Local preview

After the required candidate checks, an authorized release publisher can use
Wrangler OAuth for a local preview when CI deployment credentials are absent:

```bash
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
node deploy/runtime-release.mjs verify-runtime
bash deploy/build-pages.sh
npx wrangler@4 pages deploy dist \
  --project-name lean-playground \
  --branch preview-compact1
```

This does not promote production. Production follows the gated workflow above.
Upload R2 objects only when the runtime release changes. Build Pages for every
app deployment so its static manifests and packs ship with the matching UI.

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
