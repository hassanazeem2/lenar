// Forwards https://<your-domain>/v1/* to 7api so customers use your base URL, not 7api's.
// Streams responses through untouched (works for SSE / stream: true).

const UPSTREAM = (process.env.UPSTREAM_BASE_URL || 'https://7api.st/v1').replace(/\/$/, '')

// Customer price ÷ 7api cost (same value as CREDIT_MARKUP in Supabase). Dollar figures on the
// info endpoints are scaled so customers see what they paid, not 7api's wholesale numbers.
const MARKUP = Math.max(1, Number(process.env.CREDIT_MARKUP) || 1)
const SCALED_PATHS = new Set(['/balance', '/usage', '/status'])

function scaleUsd(value) {
  if (Array.isArray(value)) return value.map(scaleUsd)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [
      k,
      typeof v === 'number' && /_usd(_per_mtok)?$/.test(k) ? Math.round(v * MARKUP * 1e6) / 1e6 : scaleUsd(v),
    ]))
  }
  return value
}

// Request headers worth passing on. Everything else (cookies, host, Vercel headers) is dropped.
const PASS_REQ = ['authorization', 'x-api-key', 'content-type', 'accept', 'anthropic-version', 'anthropic-beta', 'openai-organization', 'openai-beta', 'user-agent']
// Response headers we don't forward: the body is re-encoded by the platform.
const DROP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'])

async function proxy(request) {
  const url = new URL(request.url)
  // Works whether we're reached as /v1/... (rewrite) or /api/v1/... (direct).
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/v1/, '')

  // Subkey management needs the main key; never expose it through the public gateway.
  if (/^\/subkeys(\/|$)/.test(path)) {
    return Response.json({ error: { type: 'not_found', message: 'Not found' } }, { status: 404 })
  }

  const headers = new Headers()
  for (const h of PASS_REQ) {
    const v = request.headers.get(h)
    if (v) headers.set(h, v)
  }

  const init = { method: request.method, headers, redirect: 'manual' }
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body
    init.duplex = 'half'
  }

  let upstream
  try {
    upstream = await fetch(`${UPSTREAM}${path}${url.search}`, init)
  } catch {
    return Response.json({ error: { type: 'upstream_unavailable', message: 'Upstream is unreachable. Retry shortly.' } }, { status: 502 })
  }

  const out = new Headers()
  upstream.headers.forEach((v, k) => { if (!DROP_RES.has(k.toLowerCase())) out.set(k, v) })

  if (MARKUP !== 1 && SCALED_PATHS.has(path) && upstream.ok && (upstream.headers.get('content-type') || '').includes('json')) {
    const data = scaleUsd(await upstream.json())
    return Response.json(data, { status: upstream.status, headers: out })
  }
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
