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
// Baked environment snapshots (`snapshots/*.snap`, ~240MB each) are R2-only
// for the same reason as the binaries.
const FROM_R2 = new Set(['lean.js', 'lean.wasm'])
// The slim (iOS) binary variant lives under a slim/ prefix with the same
// layout, so gate on the path with that prefix stripped.
const fromR2 = (key) => {
  const k = key.startsWith('slim/') ? key.slice('slim/'.length) : key
  return FROM_R2.has(k) || k.startsWith('snapshots/')
}

// Handle GET and HEAD (the app does a HEAD reachability check on lean.js).
export async function onRequest(context) {
  const { request, env, params, next } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path

  if (!fromR2(key)) return next()

  // Serve raw bytes; Cloudflare compresses on the fly. Pre-gzipping in R2 +
  // content-encoding does NOT survive Cloudflare here: with default compression
  // it double-gzips the already-encoded body, and with a Compression Rule set to
  // "off" it strips the content-encoding header while keeping the gzip body — the
  // browser then gets gzip where it expects wasm. Neither is fixable from the
  // Function, so raw it is. (A true fix needs the files on an R2 custom domain
  // served directly, not proxied through a Worker.)
  //
  // The app requests these with `?v=<lean githash>`; builds are stored under
  // that prefix (`<githash>/lean.wasm`), so several builds coexist in the
  // bucket and uploading a new one never changes the bytes an already-open
  // session gets. The bare key is the fallback for pre-versioning sessions.
  const version = new URL(request.url).searchParams.get('v')
  const versionedKey = version && /^[0-9a-zA-Z._-]+$/.test(version) ? `${version}/${key}` : null
  const obj = (versionedKey && await env.LEAN_ASSETS.get(versionedKey))
    || await env.LEAN_ASSETS.get(key)
  if (!obj) return new Response(`Not found: ${key}`, { status: 404 })

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  const ext = key.slice(key.lastIndexOf('.') + 1)
  headers.set('content-type', TYPES[ext] || 'application/octet-stream')
  // Immutable is safe: each build lives at its own `?v=` URL (and R2 prefix),
  // so a cached response can never be paired with a different build's files.
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
