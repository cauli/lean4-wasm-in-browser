// Serve lean.js and lean.wasm from R2 at `/lean-wasm/*` on the SAME origin as
// the app. (The .olean tree ships as static Pages assets; see below.)
//
// Same-origin is required, not just convenient: this is a pthread build, so the
// runtime spawns worker threads from `lean.js` — and cross-origin worker scripts
// are blocked. It also keeps the cross-origin-isolation (COOP/COEP) story simple:
// same-origin subresources need no CORP header.
//
// Bound to the R2 bucket as `LEAN_ASSETS` (see wrangler.jsonc; `ASSETS` is a
// reserved binding name in Pages). Responses are cached at Cloudflare's edge;
// the assets are immutable per Lean build.
const TYPES = {
  js: 'text/javascript; charset=utf-8',
  wasm: 'application/wasm',
  json: 'application/json; charset=utf-8',
  olean: 'application/octet-stream',
}

// Only the two files too big for static Pages hosting (25MB/file limit) come
// from R2 through this Function. Everything else under /lean-wasm/* — the whole
// .olean tree and lean-lib-files.json — is served as a static Pages asset
// (free, unlimited, CDN-cached, doesn't count against the Functions request
// quota), so `next()` hands those requests to the static asset layer.
const FROM_R2 = new Set(['lean.js', 'lean.wasm'])

// Handle GET and HEAD (the app does a HEAD reachability check on lean.js).
export async function onRequest(context) {
  const { request, env, params, next } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path

  if (!FROM_R2.has(key)) return next()

  const obj = await env.LEAN_ASSETS.get(key)
  if (!obj) return new Response(`Not found: ${key}`, { status: 404 })

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  const ext = key.slice(key.lastIndexOf('.') + 1)
  headers.set('content-type', TYPES[ext] || 'application/octet-stream')
  // NB: we serve the raw bytes and let Cloudflare compress on the fly. Pre-
  // gzipping in R2 + content-encoding does NOT work here: Cloudflare re-
  // compresses the already-encoded body (double-gzip) regardless of
  // `no-transform`, and the browser then gets gzip where it expects wasm/js.
  // Immutable per build (a new Lean build re-uploads under the same keys, and
  // Cloudflare keys the cache on the URL — bump a query string or purge on swap).
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('cross-origin-resource-policy', 'same-origin')
  // lean.js is loaded as a pthread Worker script; the worker only joins the
  // cross-origin-isolated agent cluster (and thus gets SharedArrayBuffer) if its
  // OWN response carries COEP. `_headers` does not apply to Function responses,
  // so set it here or the pthread pool never initializes and the runtime hangs.
  headers.set('cross-origin-embedder-policy', 'require-corp')
  headers.set('cross-origin-opener-policy', 'same-origin')

  // No Function-level edge cache: browsers cache these immutably (so repeat
  // loads and the pthread pool don't re-fetch), and R2 egress is free. Avoiding
  // the edge cache also sidesteps serving a stale header set after a redeploy.
  return new Response(obj.body, { headers })
}
