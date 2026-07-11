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
# Objects are stored under a per-build githash prefix (`<githash>/lean.wasm`),
# matching the `?v=<githash>` the app requests: builds coexist in the bucket,
# so uploading a new one never changes what an already-deployed app serves —
# no cache purge, no coordination with the Pages deploy. The bare `lean.js` /
# `lean.wasm` keys are the fallback for sessions predating URL versioning and
# are deliberately left alone here.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID to your personal account id}"
BUCKET="${R2_BUCKET:-lean-assets}"

if [ ! -e public/lean-wasm/lean.wasm ]; then
  echo "error: public/lean-wasm/lean.wasm not found — put the WASM artifact in place first." >&2
  exit 1
fi

# Same per-build version build-pages.sh bakes into the app's asset URLs: the
# Lean githash read from Init.olean's header.
VER=$(node -e "const b=require('fs').readFileSync('public/lean-wasm/lean-lib/Init.olean'); const m=b.subarray(0,120).toString('latin1').match(/[0-9a-f]{40}/); process.stdout.write(m?m[0]:'')")
[ -n "$VER" ] || { echo "error: could not read the Lean githash from Init.olean" >&2; exit 1; }
echo "Build version (R2 prefix): $VER"

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
put "$VER/lean.js"   public/lean-wasm/lean.js   text/javascript
put "$VER/lean.wasm" public/lean-wasm/lean.wasm application/wasm

# Baked environment snapshots (scripts/bake-snapshots.sh) — also above the
# Pages file limit, and githash-paired with the binaries by construction.
for snap in public/lean-wasm/snapshots/*.snap; do
  [ -e "$snap" ] || { echo "note: no baked snapshots to upload (run scripts/bake-snapshots.sh)"; break; }
  put "$VER/snapshots/$(basename "$snap")" "$snap" application/octet-stream
done

echo
echo "Done. Verify: wrangler r2 object get $BUCKET/$VER/lean.wasm --file /tmp/x.wasm --remote && ls -la /tmp/x.wasm"
