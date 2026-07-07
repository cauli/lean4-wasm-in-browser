#!/usr/bin/env bash
# Build the Pages app shell. Vite copies everything under public/ into dist/,
# which includes the symlinked public/lean-wasm (lean.js, lean.wasm, the whole
# olean tree) — gigabytes that belong in R2, not in the Pages deploy. Strip them
# so only the small app shell ships to Pages.
#
# Usage: VITE_LEAN_WASM_BASE=https://assets.cau.li deploy/build-pages.sh
set -euo pipefail

: "${VITE_LEAN_WASM_BASE:?set VITE_LEAN_WASM_BASE, e.g. https://assets.cau.li}"

npm run build

# These are served from R2 (see VITE_LEAN_WASM_BASE), never from Pages.
rm -rf dist/lean-wasm

echo "Pages output ready in dist/ ($(du -sh dist | cut -f1)):"
find dist -maxdepth 1 -mindepth 1 -printf '  %f\n' 2>/dev/null || ls -1 dist | sed 's/^/  /'
