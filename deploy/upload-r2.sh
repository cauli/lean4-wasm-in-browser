#!/usr/bin/env bash
# 🤖 Upload only the checked-in runtime release. Existing different objects abort
# 🤖 the entire preflight; matching objects are skipped. No bare keys are written.
# 🤖 Keep a single publisher: checksum preflight is not an atomic create-only put.
set -euo pipefail
cd "$(dirname "$0")/.."
node deploy/upload-r2.mjs
