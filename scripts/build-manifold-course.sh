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
COURSE_ROOT="$PWD/lean"
COURSE_BUILD_ROOT="$PWD/lean/.lake/build/lib/lean"
COURSE_MODULES=(
  ManifoldAdventure.Homeomorphisms
  ManifoldAdventure.LocalCharts
  ManifoldAdventure.ChartedSpaces
  ManifoldAdventure.CanonicalCharts
  ManifoldAdventure.SmoothManifolds
  ManifoldAdventure.TangentSpaces
  ManifoldAdventure.BrowserBase
)

if [ ! -f "$MATHLIB_ROOT/lakefile.toml" ] && [ ! -f "$MATHLIB_ROOT/lakefile.lean" ]; then
  echo "error: Mathlib checkout not found at $MATHLIB_ROOT" >&2
  exit 1
fi
for COURSE_MODULE in "${COURSE_MODULES[@]}"; do
  MODULE_PATH="${COURSE_MODULE//.//}"
  COURSE_SOURCE="$COURSE_ROOT/$MODULE_PATH.lean"
  COURSE_OLEAN="$COURSE_BUILD_ROOT/$MODULE_PATH.olean"
  COURSE_ILEAN="$COURSE_BUILD_ROOT/$MODULE_PATH.ilean"
  if [ ! -f "$COURSE_SOURCE" ]; then
    echo "error: generated course source not found at $COURSE_SOURCE" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$COURSE_OLEAN")"
  (
    cd "$MATHLIB_ROOT"
    export LEAN_PATH="$COURSE_BUILD_ROOT${LEAN_PATH:+:$LEAN_PATH}"
    lake env lean \
      -R "$COURSE_ROOT" \
      -o "$COURSE_OLEAN" \
      -i "$COURSE_ILEAN" \
      "$COURSE_SOURCE"
  )
  echo "Compiled $COURSE_MODULE"
done
