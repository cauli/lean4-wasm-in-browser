// Base URL for the heavy, immutable Lean WASM assets: lean.js, lean.wasm, and
// the .olean library. In dev these are served from the local `public/lean-wasm`
// folder (same origin). In production they live in a Cloudflare R2 bucket
// behind the CDN, set at build time via VITE_LEAN_WASM_BASE, e.g.
//   VITE_LEAN_WASM_BASE=https://assets.cau.li
// No trailing slash.
export const LEAN_WASM_BASE: string =
  (import.meta.env.VITE_LEAN_WASM_BASE as string | undefined)?.replace(/\/$/, '') ||
  '/lean-wasm';
