#!/usr/bin/env bash
# Bundle the static Lean assets the Pages build needs (the same subset
# deploy/build-pages.sh copies into dist) into one tarball, so CI can deploy
# without a local Lean WASM build tree:
#
#   lean-lib-files.json
# 🤖 core-layer.json + core-lib/artifacts-*.pack
#   real-analysis-layer.json
#   manifold-layer.json + ten world-layer manifests
#   lean-lib/**.olean, **.ir, **.ir.sig
#   real-analysis-lib/artifacts-*.pack
#   manifold-<world>-lib/artifacts-*.pack
#
# lean.js / lean.wasm are excluded on purpose: they are R2-served and only
# change on a Lean artifact swap (deploy/upload-r2.sh).
#
# Upload the result as a GitHub release asset and point the deploy workflow's
# PAGES_ASSETS_URL at it:
#
#   bash deploy/pack-pages-assets.sh
#   gh release create pages-assets-<ver> --notes "Static Pages assets" \
#     /tmp/pages-assets.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-/tmp/pages-assets.tar.gz}"
# 🤖 Tests can use a small staging tree without touching the release artifacts.
SOURCE="${PAGES_ASSET_ROOT:-public/lean-wasm}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# 🤖 The build requires the packed core. Verify it before packaging, rather than
# 🤖 publishing a tarball that cannot pass build-pages.sh.
node deploy/static-assets.mjs verify-core "$SOURCE"
cp -L "$SOURCE/core-layer.json" "$STAGE/"
rsync -aL --include='artifacts-*.pack' --exclude='*' \
  "$SOURCE/core-lib/" "$STAGE/core-lib/"
cp -L "$SOURCE/lean-lib-files.json" "$STAGE/"
cp -L "$SOURCE/real-analysis-layer.json" "$STAGE/"
cp -L "$SOURCE/manifold-layer.json" "$STAGE/"
rsync -aL --prune-empty-dirs --include='*/' \
  --include='*.olean' --include='*.ir' --include='*.ir.sig' --exclude='*' \
  "$SOURCE/lean-lib/" "$STAGE/lean-lib/"
rsync -aL --include='artifacts-*.pack' --exclude='*' \
  "$SOURCE/real-analysis-lib/" "$STAGE/real-analysis-lib/"
for SLUG in \
  homeomorphisms local-charts charted-spaces \
  canonical-charts smooth-manifolds tangent-spaces \
  map-projections circle-motion robot-arm robot-reachability course
do
  cp -L \
    "$SOURCE/manifold-$SLUG-layer.json" \
    "$STAGE/manifold-$SLUG-layer.json"
  rsync -aL --include='artifacts-*.pack' --exclude='*' \
    "$SOURCE/manifold-$SLUG-lib/" \
    "$STAGE/manifold-$SLUG-lib/"
done

tar -C "$STAGE" -cf - . | gzip -6 > "$OUT"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1)):"
tar -tzf "$OUT" | sed -n '1,3p'
echo "  files: $(tar -tzf "$OUT" | wc -l | tr -d ' ')"
