#!/usr/bin/env bash
# Upload the heavy, immutable Lean assets (lean.js, lean.wasm, the .olean
# library, and its file list) to the R2 bucket that sits behind the CDN.
#
# These files are content-addressed by the Lean build: they never change for a
# given artifact, so they get a one-year immutable cache. When you swap in a new
# artifact, re-run this — rclone only uploads what changed.
#
# Prereqs:
#   - rclone installed (brew install rclone)
#   - an rclone remote for R2 (S3 API). Configure once with:
#       rclone config   # new remote, type "s3", provider "Cloudflare",
#                       # endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#     or set the R2_* env vars below inline.
#
# Usage:
#   R2_BUCKET=lean-assets deploy/upload-r2.sh
set -euo pipefail

REMOTE="${R2_REMOTE:-r2}"        # rclone remote name
BUCKET="${R2_BUCKET:-lean-assets}"
SRC="public/lean-wasm"           # contains lean.js, lean.wasm, lean-lib/, lean-lib-files.json
CACHE="public, max-age=31536000, immutable"

if [ ! -e "$SRC/lean.wasm" ]; then
  echo "error: $SRC/lean.wasm not found — put the WASM artifact in place first." >&2
  exit 1
fi

# --copy-links: follow the symlinks that point at the extracted artifact.
# --header-upload: mark every object immutable for a year.
# Junk and the optional .gz siblings are handled explicitly below.
rclone copy --copy-links --progress --transfers 16 --checkers 32 \
  --header-upload "Cache-Control: $CACHE" \
  --exclude ".gitkeep" --exclude ".DS_Store" --exclude "*.map" \
  "$SRC" "$REMOTE:$BUCKET/"

echo
echo "Uploaded to $REMOTE:$BUCKET/ — verify: rclone ls $REMOTE:$BUCKET/ | head"
echo "If you ran 'npm run compress-oleans', the .olean.gz siblings were included."
