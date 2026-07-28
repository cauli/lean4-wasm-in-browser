#!/usr/bin/env bash
# Build the Pages deployment.
#
# Hybrid hosting to stay well inside Cloudflare's free tier:
#   - lean.js + lean.wasm (too big for Pages' 25MB/file limit) -> R2, served
#     same-origin by functions/lean-wasm/. Uploaded separately (deploy/upload-r2.sh).
#   - the base .olean tree + lean-lib-files.json -> STATIC Pages assets (free,
#     unlimited, CDN-cached, and they don't count against the Functions quota).
#   - the compressed Real Analysis Mathlib/course packs -> STATIC Pages assets.
#     Each pack is below Pages' per-file limit and is fetched only when that game
#     first verifies a proof.
#
# The app fetches everything under the relative `/lean-wasm` base at runtime, so
# the assets don't need to exist during `vite build`. We move the (symlinked,
# multi-GB) public/lean-wasm aside so Vite doesn't copy it, then place exactly
# the static subset into dist afterward.
set -euo pipefail
cd "$(dirname "$0")/.."

export VITE_LEAN_WASM_BASE=/lean-wasm

# Per-build asset version = the Lean githash (baked into every olean/lean.wasm at
# build time). The app appends it as `?v=<hash>` to the lean.js / lean.wasm URLs
# so each build is a unique, safely-immutable CDN cache key: a redeploy is picked
# up without a cache purge, and app-only redeploys (same binary → same hash) keep
# reusing the cached lean.js / lean.wasm. Falls back to a timestamp if unreadable.
VITE_LEAN_ASSET_VERSION=$(node -e "const b=require('fs').readFileSync('public/lean-wasm/lean-lib/Init.olean'); const m=b.subarray(0,120).toString('latin1').match(/[0-9a-f]{40}/); process.stdout.write(m?m[0]:'')" 2>/dev/null || true)
export VITE_LEAN_ASSET_VERSION="${VITE_LEAN_ASSET_VERSION:-$(date -u +%Y%m%d%H%M%S)}"
echo "Asset version (lean.js/lean.wasm ?v=): $VITE_LEAN_ASSET_VERSION"

STASH="$(mktemp -d)"
restore() { [ -e "$STASH/lean-wasm" ] && mv "$STASH/lean-wasm" public/lean-wasm || true; rmdir "$STASH" 2>/dev/null || true; }
trap restore EXIT
mv public/lean-wasm "$STASH/lean-wasm"
# test artifacts (e.g. public/lean-wasm-433 harness trees) must never ship
for d in public/lean-wasm-*; do [ -e "$d" ] && rm -rf "$d"; done

npm run build

restore
trap - EXIT

# Static subset Pages should host: base .olean files plus their .ir and
# .ir.sig siblings (the reader only loads an .ir when its .ir.sig exists)
# (compiled bodies the interpreter needs for #eval of library code; ~17% extra).
# Skip .olean.server / .olean.private / .c / .ilean and the js/wasm.
mkdir -p dist/lean-wasm/lean-lib
cp -L public/lean-wasm/lean-lib-files.json dist/lean-wasm/lean-lib-files.json
rsync -aL --prune-empty-dirs --include='*/' --include='*.olean' --include='*.ir' --include='*.ir.sig' --exclude='*' \
  public/lean-wasm/lean-lib/ dist/lean-wasm/lean-lib/

# Real Analysis is part of the published catalog, so never silently deploy the
# UI without its matching compiled Mathlib/course layer.
REAL_ANALYSIS_MANIFEST=public/lean-wasm/real-analysis-layer.json
REAL_ANALYSIS_PACKS=public/lean-wasm/real-analysis-lib
if [ ! -f "$REAL_ANALYSIS_MANIFEST" ] || [ ! -d "$REAL_ANALYSIS_PACKS" ]; then
  echo "error: Real Analysis browser layer is missing." >&2
  echo "run npm run package:real-analysis before building Pages." >&2
  exit 1
fi
node -e '
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(manifest.packs) || manifest.packs.length === 0) {
  throw new Error("Real Analysis manifest contains no packs");
}
for (const pack of manifest.packs) {
  const file = `${process.argv[2]}/${pack.file}`;
  const stat = fs.statSync(file);
  if (stat.size !== pack.compressedBytes) {
    throw new Error(`${pack.file} has ${stat.size} bytes; expected ${pack.compressedBytes}`);
  }
}
' "$REAL_ANALYSIS_MANIFEST" "$REAL_ANALYSIS_PACKS"
mkdir -p dist/lean-wasm/real-analysis-lib
cp -L "$REAL_ANALYSIS_MANIFEST" dist/lean-wasm/real-analysis-layer.json
rsync -aL --delete --include='artifacts-*.pack' --exclude='*' \
  "$REAL_ANALYSIS_PACKS/" dist/lean-wasm/real-analysis-lib/

echo "Pages output ready in dist/ ($(du -shL dist | cut -f1)):"
echo "  static .olean files: $(find dist/lean-wasm/lean-lib -name '*.olean' | wc -l | tr -d ' ')"
echo "  static .ir files:    $(find dist/lean-wasm/lean-lib -name '*.ir' | wc -l | tr -d ' ')"
echo "  static .ir.sig files: $(find dist/lean-wasm/lean-lib -name '*.ir.sig' | wc -l | tr -d ' ')"
echo "  Real Analysis packs: $(find dist/lean-wasm/real-analysis-lib -name 'artifacts-*.pack' | wc -l | tr -d ' ')"
echo "  R2 (upload via deploy/upload-r2.sh): lean.js, lean.wasm, snapshots"
