import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// The 4.28 build is a pthread build with SHARED WebAssembly memory, which needs
// SharedArrayBuffer — hence the cross-origin isolation headers below. (The
// single-threaded 4.33 build didn't need these, but its olean reader OOMs; see
// project notes.) A cross-origin CDN would then need CORP/credentialless COEP.
const coopCoep = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
export default defineConfig({
  plugins: [react()],
  server: { headers: coopCoep },
  preview: { headers: coopCoep },
  optimizeDeps: {
    exclude: ['lean-wasm'], // Don't try to optimize the WASM module
  },
})
