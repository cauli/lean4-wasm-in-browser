#!/usr/bin/env bash
# Build the Pages deployment.
#
# Hybrid hosting to stay well inside Cloudflare's free tier:
#   - lean.js + lean.wasm (too big for Pages' 25MB/file limit) -> R2, served
#     same-origin by functions/lean-wasm/. Uploaded separately (deploy/upload-r2.sh).
#   - the base .olean tree + lean-lib-files.json -> STATIC Pages assets (free,
#     unlimited, CDN-cached, and they don't count against the Functions quota).
#
# The app fetches everything under the relative `/lean-wasm` base at runtime, so
# the assets don't need to exist during `vite build`. We move the (symlinked,
# multi-GB) public/lean-wasm aside so Vite doesn't copy it, then place exactly
# the static subset into dist afterward.
set -euo pipefail
cd "$(dirname "$0")/.."

export VITE_LEAN_WASM_BASE=/lean-wasm

STASH="$(mktemp -d)"
restore() { [ -e "$STASH/lean-wasm" ] && mv "$STASH/lean-wasm" public/lean-wasm || true; rmdir "$STASH" 2>/dev/null || true; }
trap restore EXIT
mv public/lean-wasm "$STASH/lean-wasm"

npm run build

restore
trap - EXIT

# Static subset Pages should host: base .olean files only (skip .olean.server /
# .olean.private / .c / .ilean and the js/wasm), plus the file list.
mkdir -p dist/lean-wasm/lean-lib
cp -L public/lean-wasm/lean-lib-files.json dist/lean-wasm/lean-lib-files.json
rsync -aL --prune-empty-dirs --include='*/' --include='*.olean' --exclude='*' \
  public/lean-wasm/lean-lib/ dist/lean-wasm/lean-lib/

echo "Pages output ready in dist/ ($(du -shL dist | cut -f1)):"
echo "  static .olean files: $(find dist/lean-wasm/lean-lib -name '*.olean' | wc -l | tr -d ' ')"
echo "  R2 (upload via deploy/upload-r2.sh): lean.js, lean.wasm"
