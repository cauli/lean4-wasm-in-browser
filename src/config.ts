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

// Binary variant. The full build exports every boxed wrapper so the
// interpreter dispatches natively everywhere (external packages like
// Batteries import resident); that export table costs ~150MB of assets, which
// iPhone WebKit cannot compile inside a tab's memory budget. iOS therefore
// gets the slim binary (~74MB): identical for Init/Std/Lean work, no
// Batteries. Both variants live under the same githash prefix — slim at
// <base>/slim/ with the same lean.js / lean.wasm filenames, because the
// glue's internal wasm reference and the workers' pthread-pool bootstrap
// both assume those names.
export const IS_IOS: boolean =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// `?variant=slim|full` overrides the device default — for testing the iOS
// build on a desktop browser and vice versa.
const variantOverride = new URLSearchParams(window.location.search).get('variant');
export const LEAN_VARIANT: 'slim' | 'full' =
  variantOverride === 'slim' ? 'slim' :
  variantOverride === 'full' ? 'full' :
  IS_IOS ? 'slim' : 'full';

// Base for the binary and its paired snapshot. The olean tree stays variant-
// independent under LEAN_WASM_BASE (both binaries read the same oleans).
export const LEAN_BIN_BASE: string =
  LEAN_VARIANT === 'slim' ? `${LEAN_WASM_BASE}/slim` : LEAN_WASM_BASE;

// Worker/iframe query string: the asset base plus the version, so a worker can
// build versioned lean.js / lean.wasm URLs from its own `location.search`.
// Workers fetch only the binary pair through this, so it carries the
// variant's base.
export const workerAssetQuery: string =
  `assetBase=${encodeURIComponent(LEAN_BIN_BASE)}` +
  (LEAN_ASSET_VERSION ? `&v=${encodeURIComponent(LEAN_ASSET_VERSION)}` : '');
