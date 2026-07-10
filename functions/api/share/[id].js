// GET /api/share/<id> — fetch a stored workspace (gzipped bytes; the app
// inflates with DecompressionStream). Content-addressed ids are immutable,
// so the response can be cached forever.
export async function onRequestGet(context) {
  const { params, env } = context
  const id = String(params.id || '')
  if (!/^[0-9a-f]{64}$/.test(id)) return new Response('bad id', { status: 400 })
  const obj = await env.LEAN_ASSETS.get(`snippets/${id}`)
  if (!obj) return new Response('not found', { status: 404 })
  return new Response(obj.body, {
    headers: {
      'content-type': 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'cross-origin-resource-policy': 'same-origin',
    },
  })
}
