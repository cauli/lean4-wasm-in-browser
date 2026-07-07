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

# Raw only. Cloudflare compresses on the fly per request. Pre-gzipping in R2 +
# content-encoding was tried and abandoned: through a Pages Function, Cloudflare
# either double-gzips the encoded body (default) or strips the content-encoding
# header (Compression Rule "off"), both of which break the browser. Serving
# pre-compressed correctly would require an R2 custom domain (direct, not proxied
# through a Worker) — see deploy notes.
put lean.js   public/lean-wasm/lean.js   text/javascript
put lean.wasm public/lean-wasm/lean.wasm application/wasm

echo
echo "Done. Verify: wrangler r2 object get $BUCKET/lean.wasm --file /tmp/x.wasm --remote && ls -la /tmp/x.wasm"
