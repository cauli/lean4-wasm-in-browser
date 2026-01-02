#!/bin/bash
#
# Creates lean-lib.tar.gz from the lib/lean directory with only .olean files
# 
# Usage: ./scripts/create-lean-lib.sh
#
# This script creates a tarball of the Lean standard library .olean files
# that can be loaded into the WASM filesystem at runtime.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$PROJECT_ROOT/public/lean-wasm/lib/lean"
OUTPUT_FILE="$PROJECT_ROOT/public/lean-wasm/lean-lib.tar.gz"

echo "=== Creating Lean Library Tarball ==="
echo "Source directory: $LIB_DIR"
echo "Output file: $OUTPUT_FILE"
echo ""

# Check if source directory exists
if [ ! -d "$LIB_DIR" ]; then
    echo "ERROR: Source directory does not exist: $LIB_DIR"
    exit 1
fi

# Count files before creating tarball
OLEAN_COUNT=$(find "$LIB_DIR" -name "*.olean" -type f | wc -l | tr -d ' ')
echo "Found $OLEAN_COUNT .olean files"

# Create tarball with only .olean files
# Using relative paths from the lib/lean directory
cd "$LIB_DIR"

echo ""
echo "Creating tarball..."
# Find all .olean files and create tar.gz
# The paths in the tar will be relative (e.g., "Init.olean", "Init/Prelude.olean")
find . -name "*.olean" -type f | sed 's|^\./||' | tar -czf "$OUTPUT_FILE" -T -

# Get output file size
OUTPUT_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')

echo ""
echo "=== Done ==="
echo "Created: $OUTPUT_FILE"
echo "Size: $OUTPUT_SIZE"
echo "Files included: $OLEAN_COUNT .olean files"
echo ""
echo "To verify contents:"
echo "  tar -tzf $OUTPUT_FILE | head -20"


