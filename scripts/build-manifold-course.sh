#!/usr/bin/env bash
set -euo pipefail

# Compile the generated Manifold Adventure theorem base in an existing Mathlib
# checkout. The caller controls which `lake`/`lean` are first on PATH:
#
#   Native validation:
#     scripts/build-manifold-course.sh /tmp/manifold-mathlib4
#
#   wasm32-compatible artifacts:
#     PATH=/path/to/lean-linux_32/bin:$PATH \
#       scripts/build-manifold-course.sh /tmp/manifold-mathlib4

cd "$(dirname "$0")/.."

MATHLIB_ROOT="${1:-/tmp/manifold-mathlib4}"
COURSE_SOURCE="$PWD/lean/ManifoldAdventure/BrowserBase.lean"
COURSE_ROOT="$PWD/lean"
COURSE_BUILD_ROOT="$PWD/lean/.lake/build/lib/lean"
COURSE_OLEAN="$COURSE_BUILD_ROOT/ManifoldAdventure/BrowserBase.olean"
COURSE_ILEAN="$COURSE_BUILD_ROOT/ManifoldAdventure/BrowserBase.ilean"

if [ ! -f "$MATHLIB_ROOT/lakefile.toml" ] && [ ! -f "$MATHLIB_ROOT/lakefile.lean" ]; then
  echo "error: Mathlib checkout not found at $MATHLIB_ROOT" >&2
  exit 1
fi
if [ ! -f "$COURSE_SOURCE" ]; then
  echo "error: generated course source not found at $COURSE_SOURCE" >&2
  exit 1
fi

mkdir -p "$(dirname "$COURSE_OLEAN")"

(
  cd "$MATHLIB_ROOT"
  lake env lean \
    -R "$COURSE_ROOT" \
    -o "$COURSE_OLEAN" \
    -i "$COURSE_ILEAN" \
    "$COURSE_SOURCE"
)

echo "Compiled ManifoldAdventure.BrowserBase"
echo "  $COURSE_OLEAN"
