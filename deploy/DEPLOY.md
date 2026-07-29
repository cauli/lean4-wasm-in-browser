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
# First run "build manifold Mathlib layer" in Actions. Its defaults select the
# exact Lean 62b6 native-i386 artifact and pinned Mathlib checkout. Copy the
# downloaded manifold-layer.json and manifold-lib/ into public/lean-wasm/.
bash deploy/pack-pages-assets.sh
gh release create pages-assets-<ver> --title "Pages static assets" \
  --notes "Static Pages assets" /tmp/pages-assets.tar.gz
# update PAGES_ASSETS_URL in .github/workflows/deploy-pages.yml
```

The manual path below still works and stays the fallback.

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
manifold-lib/artifacts-000.pack ...
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
load the shared Real Analysis/Mathlib layer, then only the supplemental
manifold packs.
