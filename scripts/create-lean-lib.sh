#!/bin/bash
#
# Extracts Lean WASM distribution and copies library files
# 
# Usage: ./scripts/create-lean-lib.sh
#
# This script:
# 1. Unzips build-Web Assembly.zip
# 2. Extracts lean-4.28.0-pre-linux_wasm32.tar.zst
# 3. Copies bin files to lean-wasm/
# 4. Copies all .olean* files to lean-lib/ for dynamic loading
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LEAN_WASM_DIR="$PROJECT_ROOT/public/lean-wasm"
ZIP_FILE="$LEAN_WASM_DIR/build-Web Assembly.zip"
LEAN_LIB_DIR="$LEAN_WASM_DIR/lean-lib"

cd "$LEAN_WASM_DIR"

# Step 1: Unzip build-Web Assembly.zip
echo "=== Step 1: Unzipping build-Web Assembly.zip ==="
if [ -f "$ZIP_FILE" ]; then
    unzip -o "$ZIP_FILE"
else
    echo "Zip file not found, skipping: $ZIP_FILE"
fi

# Step 2: Extract .tar.zst file
echo ""
echo "=== Step 2: Extracting .tar.zst ==="
ZSTD_FILE=$(find . -maxdepth 1 -name "*.tar.zst" | head -1)
if [ -n "$ZSTD_FILE" ]; then
    echo "Found: $ZSTD_FILE"
    zstd -d -f "$ZSTD_FILE"
else
    echo "No .tar.zst file found, skipping"
fi

# Step 3: Extract .tar file
echo ""
echo "=== Step 3: Extracting .tar ==="
TAR_FILE=$(find . -maxdepth 1 -name "*.tar" | head -1)
if [ -n "$TAR_FILE" ]; then
    echo "Found: $TAR_FILE"
    tar -xf "$TAR_FILE"
else
    echo "No .tar file found, skipping"
fi

# Find extracted directory (lean-*)
EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "lean-*" | head -1)
if [ -z "$EXTRACTED_DIR" ]; then
    echo "ERROR: Could not find extracted lean-* directory"
    exit 1
fi
echo "Extracted directory: $EXTRACTED_DIR"

# Step 4: Copy bin files to lean-wasm/
echo ""
echo "=== Step 4: Copying bin files ==="
if [ -d "$EXTRACTED_DIR/bin" ]; then
    cp -v "$EXTRACTED_DIR/bin/"* "$LEAN_WASM_DIR/"
    echo "Copied bin files to $LEAN_WASM_DIR"
else
    echo "WARNING: No bin directory found in $EXTRACTED_DIR"
fi

# Step 5: Copy all .olean* files to lean-lib/
echo ""
echo "=== Step 5: Copying library files to lean-lib/ ==="
# Try both possible directory structures
if [ -d "$EXTRACTED_DIR/lib/lean" ]; then
    LIB_DIR="$EXTRACTED_DIR/lib/lean"
elif [ -d "$EXTRACTED_DIR" ]; then
    LIB_DIR="$EXTRACTED_DIR"
else
    echo "ERROR: Could not find library directory"
    exit 1
fi

# Count files to copy (all .olean variants)
OLEAN_COUNT=$(find "$LIB_DIR" -name "*.olean" -type f | wc -l | tr -d ' ')
OLEAN_SERVER_COUNT=$(find "$LIB_DIR" -name "*.olean.server" -type f | wc -l | tr -d ' ')
OLEAN_PRIVATE_COUNT=$(find "$LIB_DIR" -name "*.olean.private" -type f | wc -l | tr -d ' ')
echo "Found in $LIB_DIR:"
echo "  - $OLEAN_COUNT .olean files"
echo "  - $OLEAN_SERVER_COUNT .olean.server files"
echo "  - $OLEAN_PRIVATE_COUNT .olean.private files"

# Clean and recreate lean-lib directory
rm -rf "$LEAN_LIB_DIR"
mkdir -p "$LEAN_LIB_DIR"

# Copy all .olean* files preserving directory structure
cd "$LIB_DIR"
find . \( -name "*.olean" -o -name "*.olean.server" -o -name "*.olean.private" \) -type f | while read file; do
    # Create parent directory
    dir=$(dirname "$file")
    mkdir -p "$LEAN_LIB_DIR/$dir"
    # Copy file
    cp "$file" "$LEAN_LIB_DIR/$file"
done
cd "$LEAN_WASM_DIR"

# Count copied files
TOTAL_FILES=$(find "$LEAN_LIB_DIR" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$LEAN_LIB_DIR" | cut -f1)
echo ""
echo "Copied to: $LEAN_LIB_DIR"
echo "Total files: $TOTAL_FILES"
echo "Total size: $TOTAL_SIZE"

# Step 6: Cleanup
echo ""
echo "=== Step 6: Cleanup ==="
# Delete temporary files
if [ -f "$ZIP_FILE" ]; then
    rm "$ZIP_FILE"
    echo "Deleted: $ZIP_FILE"
fi
if [ -n "$ZSTD_FILE" ] && [ -f "$ZSTD_FILE" ]; then
    rm "$ZSTD_FILE"
    echo "Deleted: $ZSTD_FILE"
fi
if [ -n "$TAR_FILE" ] && [ -f "$TAR_FILE" ]; then
    rm "$TAR_FILE"
    echo "Deleted: $TAR_FILE"
fi

# Step 7: Generate lean-lib-files.json
echo ""
echo "=== Step 7: Generating lean-lib-files.json ==="
cd "$PROJECT_ROOT"
node scripts/gen-lib-files.mjs "$LEAN_LIB_DIR" "$LEAN_WASM_DIR/lean-lib-files.json"

echo ""
echo "=== Done ==="
echo "Output directory: $LEAN_LIB_DIR"
echo "File list: $LEAN_WASM_DIR/lean-lib-files.json"
echo ""
echo "To verify contents:"
echo "  find $LEAN_LIB_DIR -name '*.olean*' | head -20"
