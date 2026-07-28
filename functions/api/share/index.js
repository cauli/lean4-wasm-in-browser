// POST /api/share — store a shared workspace in R2, content-addressed.
//
// The body is the gzipped workspace JSON exactly as the client would embed in
// a #s= URL; beyond a size threshold the client stores it here instead and
// shares a short #r2=<id> link. The id is the SHA-256 of the bytes, computed
// SERVER-side: links are immutable, deduplicated, and nobody can choose (or
// overwrite) a key. Same bucket as the Lean assets, under its own prefix.
const MAX_BYTES = 256 * 1024 // gzipped; workspaces are text, this is plenty
const MAX_EXPANDED_BYTES = 2 * 1024 * 1024
const MAX_FILES = 64
const MAX_FILE_NAME_BYTES = 240

class PayloadError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function readCompressedBody(request) {
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      throw new PayloadError(`too large (max ${MAX_BYTES} bytes gzipped)`, 413)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function decompressWithLimit(bytes) {
  let reader
  try {
    reader = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
      .getReader()
  } catch {
    throw new PayloadError('invalid gzip payload')
  }

  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_EXPANDED_BYTES) {
        await reader.cancel()
        throw new PayloadError(
          `expanded workspace is too large (max ${MAX_EXPANDED_BYTES} bytes)`,
          413,
        )
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof PayloadError) throw error
    throw new PayloadError('invalid gzip payload')
  }

  const expanded = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    expanded.set(chunk, offset)
    offset += chunk.byteLength
  }
  return expanded
}

export function validateWorkspace(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PayloadError('workspace must be an object')
  }
  if (!Array.isArray(value.files) || value.files.length === 0 || value.files.length > MAX_FILES) {
    throw new PayloadError(`workspace must contain 1 through ${MAX_FILES} files`)
  }
  if (typeof value.active !== 'string') {
    throw new PayloadError('workspace active file is invalid')
  }

  const names = new Set()
  for (const file of value.files) {
    if (!file || typeof file !== 'object' || Array.isArray(file)) {
      throw new PayloadError('workspace file is invalid')
    }
    if (typeof file.name !== 'string' || typeof file.content !== 'string') {
      throw new PayloadError('workspace file fields are invalid')
    }
    const nameBytes = new TextEncoder().encode(file.name).byteLength
    if (
      nameBytes === 0
      || nameBytes > MAX_FILE_NAME_BYTES
      || !file.name.endsWith('.lean')
      || file.name.trim() !== file.name
      || /[/\\\0\r\n]/.test(file.name)
    ) {
      throw new PayloadError('workspace file name is invalid')
    }
    if (names.has(file.name)) {
      throw new PayloadError('workspace file names must be unique')
    }
    names.add(file.name)
  }
  if (!names.has(value.active)) {
    throw new PayloadError('workspace active file was not found')
  }
}

async function inspectWorkspace(bytes) {
  const expanded = await decompressWithLimit(bytes)
  let parsed
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(expanded)
    parsed = JSON.parse(text)
  } catch {
    throw new PayloadError('workspace is not valid UTF-8 JSON')
  }
  validateWorkspace(parsed)
}

export async function onRequestPost(context) {
  const { request, env } = context
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_BYTES) {
    return new Response(`too large (max ${MAX_BYTES} bytes gzipped)`, { status: 413 })
  }
  let bytes
  try {
    bytes = await readCompressedBody(request)
  } catch (error) {
    if (error instanceof PayloadError) {
      return new Response(error.message, { status: error.status })
    }
    return new Response('invalid request body', { status: 400 })
  }
  if (bytes.length === 0) return new Response('empty body', { status: 400 })
  // Require the gzip magic so the bucket only ever holds what the app writes.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return new Response('not a gzip payload', { status: 400 })
  }
  try {
    await inspectWorkspace(bytes)
  } catch (error) {
    if (error instanceof PayloadError) {
      return new Response(error.message, { status: error.status })
    }
    return new Response('invalid workspace payload', { status: 400 })
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
