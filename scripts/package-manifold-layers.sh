#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

MATHLIB_ROOT="${1:-/tmp/manifold-mathlib4}"
LEAN_SOURCE_ROOT="${2:-../lean4/src}"
ASSET_ROOT="$PWD/public/lean-wasm"
WORLD_SLUGS=(
  homeomorphisms local-charts charted-spaces
  canonical-charts smooth-manifolds tangent-spaces
)
WORLD_MODULES=(
  Homeomorphisms LocalCharts ChartedSpaces
  CanonicalCharts SmoothManifolds TangentSpaces
)
BASE_MANIFESTS=()

for INDEX in "${!WORLD_SLUGS[@]}"; do
  SLUG="${WORLD_SLUGS[$INDEX]}"
  MODULE="ManifoldAdventure.${WORLD_MODULES[$INDEX]}"
  MANIFEST="$ASSET_ROOT/manifold-$SLUG-layer.json"
  ARGS=(
    "$MATHLIB_ROOT"
    "$PWD/lean"
    "$ASSET_ROOT/manifold-$SLUG-lib"
    "$MANIFEST"
    "$ASSET_ROOT/lean-lib"
    "$ASSET_ROOT/lean-lib-files.json"
    "$LEAN_SOURCE_ROOT"
    "$PWD/lean"
    "$MODULE"
  )
  if [ "${#BASE_MANIFESTS[@]}" -gt 0 ]; then
    BASE_CSV="$(IFS=,; echo "${BASE_MANIFESTS[*]}")"
    ARGS+=("$BASE_CSV")
  fi
  node scripts/package-real-analysis-layer.mjs "${ARGS[@]}"
  BASE_MANIFESTS+=("$MANIFEST")
done

node scripts/create-manifold-layer-index.mjs "$ASSET_ROOT"
