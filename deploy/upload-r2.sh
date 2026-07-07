#!/usr/bin/env bash
# Upload the two large assets to R2. Everything else (the .olean tree, the file
# list) ships as static Pages assets, so only lean.js and lean.wasm — which
# exceed Pages' 25MB/file limit — need R2. Just two objects, so plain wrangler
# does it; no rclone or R2 API token required.
#
# Account safety: pin the target account so this can never hit the wrong one.
#   export CLOUDFLARE_ACCOUNT_ID=<your personal account id>
#   deploy/upload-r2.sh
#
# Re-run after swapping in a new Lean artifact (same keys, immutable cache — the
# Pages Function serves them, so purge Cloudflare cache after a swap).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID to your personal account id}"
BUCKET="${R2_BUCKET:-lean-assets}"

if [ ! -e public/lean-wasm/lean.wasm ]; then
  echo "error: public/lean-wasm/lean.wasm not found — put the WASM artifact in place first." >&2
  exit 1
fi

put() { # <key> <file> <content-type>
  echo "→ $BUCKET/$1  ($(du -hL "$2" | cut -f1))"
  npx wrangler r2 object put "$BUCKET/$1" --file "$2" --content-type "$3" --remote
}

# Upload raw. We do NOT pre-gzip + content-encoding: Cloudflare re-compresses the
# already-encoded body (double-gzip) regardless of `no-transform`, breaking the
# browser. Instead the raw bytes are served and Cloudflare compresses on the fly
# (cached at the edge after the first cold request per PoP).
put lean.js   public/lean-wasm/lean.js   text/javascript
put lean.wasm public/lean-wasm/lean.wasm application/wasm

echo
echo "Done. Verify: wrangler r2 object get $BUCKET/lean.wasm --file /tmp/x.wasm --remote && ls -la /tmp/x.wasm"
