// POST /api/share — store a shared workspace in R2, content-addressed.
//
// The body is the gzipped workspace JSON exactly as the client would embed in
// a #s= URL; beyond a size threshold the client stores it here instead and
// shares a short #r2=<id> link. The id is the SHA-256 of the bytes, computed
// SERVER-side: links are immutable, deduplicated, and nobody can choose (or
// overwrite) a key. Same bucket as the Lean assets, under its own prefix.
const MAX_BYTES = 256 * 1024 // gzipped; workspaces are text, this is plenty

export async function onRequestPost(context) {
  const { request, env } = context
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.length === 0) return new Response('empty body', { status: 400 })
  if (bytes.length > MAX_BYTES) {
    return new Response(`too large (max ${MAX_BYTES} bytes gzipped)`, { status: 413 })
  }
  // Require the gzip magic so the bucket only ever holds what the app writes.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return new Response('not a gzip payload', { status: 400 })
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const id = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const key = `snippets/${id}`
  if (!(await env.LEAN_ASSETS.head(key))) {
    await env.LEAN_ASSETS.put(key, bytes)
  }
  return new Response(JSON.stringify({ id }), {
    headers: { 'content-type': 'application/json' },
  })
}
