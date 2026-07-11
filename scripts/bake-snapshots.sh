#!/usr/bin/env bash
# Bake `--incr-header-save` environment snapshots with the wasm binary itself,
# run under Node (scripts/lean-wasm-node.cjs). The app's preload downloads one
# of these instead of the Init olean set, replacing the multi-minute in-WASM
# import with a seconds-long region load.
#
# The snapshot embeds closure relocations that are only valid against the
# saving binary's function table, so it MUST be baked with the same lean.js /
# lean.wasm that will load it — that is why this runs the wasm build under
# node rather than any native lean. Snapshots are served githash-keyed
# (`?v=`), which pairs them with their binary automatically.
#
# Usage: scripts/bake-snapshots.sh [artifact-dir] [out-dir]
#   artifact-dir  extracted build holding bin/lean.js + lib/lean
#                 (default: resolve through public/lean-wasm/lean.js)
#   out-dir       default public/lean-wasm/snapshots
#
# Each bake elaborates a probe file (that is what triggers the header import),
# so expect ~2 minutes per snapshot.
set -euo pipefail
cd "$(dirname "$0")/.."

ARTIFACT="${1:-}"
if [ -z "$ARTIFACT" ]; then
  LEANJS=$(readlink -f public/lean-wasm/lean.js)
  ARTIFACT=$(dirname "$(dirname "$LEANJS")")
fi
OUT="${2:-public/lean-wasm/snapshots}"
[ -e "$ARTIFACT/bin/lean.js" ] || { echo "error: $ARTIFACT/bin/lean.js not found" >&2; exit 1; }
mkdir -p "$OUT"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

bake() { # <name> <probe file contents>
  local name=$1 probe=$2
  echo "→ baking $name.snap"
  printf '%s\n' "$probe" > "$WORK/probe.lean"
  node --stack-size=8192 scripts/lean-wasm-node.cjs "$ARTIFACT" "$WORK" \
    "--incr-header-save=/work/$name.snap" /work/probe.lean > /dev/null
  # Self-contained snapshots have an empty deps list; the worker writes its
  # own `[]` sidecar, so only the snapshot itself ships.
  mv "$WORK/$name.snap" "$OUT/$name.snap"
  rm -f "$WORK/$name.snap.deps"
  ls -la "$OUT/$name.snap"
}

# The default header (no imports) — what the app preloads.
bake init '#check 2+2'

echo "Done. Snapshots in $OUT (ship via deploy/upload-r2.sh)."
