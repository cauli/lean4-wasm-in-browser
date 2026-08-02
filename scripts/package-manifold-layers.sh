#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

MATHLIB_ROOT="${1:-/tmp/manifold-mathlib4}"
LEAN_SOURCE_ROOT="${2:-../lean4/src}"
ASSET_ROOT="$PWD/public/lean-wasm"
WORLD_SLUGS=(
  homeomorphisms local-charts charted-spaces
  canonical-charts smooth-manifolds tangent-spaces
  map-projections circle-motion robot-arm
)
WORLD_MODULES=(
  Homeomorphisms LocalCharts ChartedSpaces
  CanonicalCharts SmoothManifolds TangentSpaces
  MapProjections CircleMotion RobotArm
)
# These are transitive artifact dependencies, not merely the visible course
# edges. A branch receives the declarations and Mathlib files it builds on,
# without forcing the player to download an unrelated sibling branch.
WORLD_BASE_SLUGS=(
  ""
  "homeomorphisms"
  "homeomorphisms,local-charts"
  "homeomorphisms,local-charts,charted-spaces"
  "homeomorphisms,local-charts,charted-spaces,canonical-charts"
  "homeomorphisms,local-charts,charted-spaces,canonical-charts,smooth-manifolds"
  "homeomorphisms,local-charts"
  "homeomorphisms,local-charts,charted-spaces,canonical-charts,smooth-manifolds"
  "homeomorphisms,local-charts,charted-spaces,canonical-charts,smooth-manifolds,circle-motion"
)

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
  BASE_MANIFESTS=()
  if [ -n "${WORLD_BASE_SLUGS[$INDEX]}" ]; then
    IFS=, read -r -a BASE_SLUGS <<< "${WORLD_BASE_SLUGS[$INDEX]}"
    for BASE_SLUG in "${BASE_SLUGS[@]}"; do
      BASE_MANIFESTS+=("$ASSET_ROOT/manifold-$BASE_SLUG-layer.json")
    done
    BASE_CSV="$(IFS=,; echo "${BASE_MANIFESTS[*]}")"
    ARGS+=("$BASE_CSV")
  fi
  node scripts/package-real-analysis-layer.mjs "${ARGS[@]}"
done

node scripts/create-manifold-layer-index.mjs "$ASSET_ROOT"
