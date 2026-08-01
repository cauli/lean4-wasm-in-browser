#!/usr/bin/env bash
# Bundle the static Lean assets the Pages build needs (the same subset
# deploy/build-pages.sh copies into dist) into one tarball, so CI can deploy
# without a local Lean WASM build tree:
#
#   lean-lib-files.json
#   real-analysis-layer.json
#   manifold-layer.json + six world-layer manifests
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
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -L public/lean-wasm/lean-lib-files.json "$STAGE/"
cp -L public/lean-wasm/real-analysis-layer.json "$STAGE/"
cp -L public/lean-wasm/manifold-layer.json "$STAGE/"
cp -L public/lean-wasm/manifold-*-layer.json "$STAGE/"
rsync -aL --prune-empty-dirs --include='*/' \
  --include='*.olean' --include='*.ir' --include='*.ir.sig' --exclude='*' \
  public/lean-wasm/lean-lib/ "$STAGE/lean-lib/"
rsync -aL --include='artifacts-*.pack' --exclude='*' \
  public/lean-wasm/real-analysis-lib/ "$STAGE/real-analysis-lib/"
for SLUG in \
  homeomorphisms local-charts charted-spaces \
  canonical-charts smooth-manifolds tangent-spaces
do
  rsync -aL --include='artifacts-*.pack' --exclude='*' \
    "public/lean-wasm/manifold-$SLUG-lib/" \
    "$STAGE/manifold-$SLUG-lib/"
done

tar -C "$STAGE" -cf - . | gzip -6 > "$OUT"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1)):"
tar -tzf "$OUT" | head -3
echo "  files: $(tar -tzf "$OUT" | wc -l | tr -d ' ')"
