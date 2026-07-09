// Base URL for the heavy, immutable Lean WASM assets: lean.js, lean.wasm, and
// the .olean library. In dev these are served from the local `public/lean-wasm`
// folder (same origin). In production they live in a Cloudflare R2 bucket
// behind the CDN, set at build time via VITE_LEAN_WASM_BASE, e.g.
//   VITE_LEAN_WASM_BASE=https://assets.cau.li
// No trailing slash.
export const LEAN_WASM_BASE: string =
  (import.meta.env.VITE_LEAN_WASM_BASE as string | undefined)?.replace(/\/$/, '') ||
  '/lean-wasm';

// A per-build id (the Lean githash) baked in at build time. It's appended as
// `?v=<id>` to the lean.js / lean.wasm request URLs so each build gets a unique,
// safely-immutable CDN cache key — a redeploy is picked up without a cache
// purge, instead of the CDN serving a stale glue against a new wasm. The oleans
// are content-addressed differently and don't need this. Empty in dev (no `?v`).
export const LEAN_ASSET_VERSION: string =
  (import.meta.env.VITE_LEAN_ASSET_VERSION as string | undefined) || '';

// Worker/iframe query string: the asset base plus the version, so a worker can
// build versioned lean.js / lean.wasm URLs from its own `location.search`.
export const workerAssetQuery: string =
  `assetBase=${encodeURIComponent(LEAN_WASM_BASE)}` +
  (LEAN_ASSET_VERSION ? `&v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : '');
