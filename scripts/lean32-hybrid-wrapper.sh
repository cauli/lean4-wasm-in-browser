#!/bin/sh
set -eu

lean32_sysroot="${LEAN32_SYSROOT:-/hybrid}"
lean32_binary="${LEAN32_REAL_LEAN:-/lean4/build32/stage0/bin/lean}"

export LEAN_SYSROOT="$lean32_sysroot"
if [ -n "${LEAN_PATH:-}" ]; then
  export LEAN_PATH="$lean32_sysroot/lib/lean:$LEAN_PATH"
else
  export LEAN_PATH="$lean32_sysroot/lib/lean"
fi

exec "$lean32_binary" "$@"
