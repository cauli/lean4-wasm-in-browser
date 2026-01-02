# Lean 4 WASM Playground

A React app to test the Lean 4 WebAssembly build in the browser.

## Setup

### 1. Extract the WASM build

First, download or copy your `lean-4.28.0-pre-linux_wasm32.tar.zst` artifact.

```bash
# Create the public directory for WASM files
mkdir -p public/lean-wasm

# Extract the archive (requires zstd)
# On macOS: brew install zstd
# On Ubuntu: apt install zstd
zstd -d lean-4.28.0-pre-linux_wasm32.tar.zst -o lean.tar
tar -xf lean.tar

# Copy the necessary files to public/lean-wasm
# The key files needed are:
cp lean-4.28.0-pre-linux_wasm32/bin/lean.js public/lean-wasm/
cp lean-4.28.0-pre-linux_wasm32/bin/lean.wasm public/lean-wasm/
cp lean-4.28.0-pre-linux_wasm32/bin/lean.worker.js public/lean-wasm/  # if it exists

# Copy the standard library
cp -r lean-4.28.0-pre-linux_wasm32/lib public/lean-wasm/

# Create the lean-lib.tar.gz archive from the library
bash ./scripts/create-lean-lib.sh

# Clean up the lib folder (no longer needed after creating the archive)
rm -rf public/lean-wasm/lib
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Important Notes

### SharedArrayBuffer Requirements

The Lean WASM build uses pthreads (Web Workers with SharedArrayBuffer). This requires specific HTTP headers:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These are already configured in `vite.config.ts` for both development and preview modes.
