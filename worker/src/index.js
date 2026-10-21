// Cloudflare Worker serving the lenar site: static assets from the Vite build, plus a /v1/*
// proxy to 7api so customers use your domain as their base URL instead of 7api's.
// Replaces the old Vercel `api/v1/[...path].js` function — same logic, Workers runtime.

const SCALED_PATHS = new Set(['/balance', '/usage', '/status'])

function scaleUsd(value, markup) {
  if (Array.isArray(value)) return value.map((v) => scaleUsd(v, markup))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [
      k,
      typeof v === 'number' && /_usd(_per_mtok)?$/.test(k) ? Math.round(v * markup * 1e6) / 1e6 : scaleUsd(v, markup),
    ]))
  }
  return value
}

// Request headers worth passing on. Everything else (cookies, host) is dropped.
const PASS_REQ = ['authorization', 'x-api-key', 'content-type', 'accept', 'anthropic-version', 'anthropic-beta', 'openai-organization', 'openai-beta', 'user-agent']
// Response headers we don't forward: the body is re-encoded by the platform.
const DROP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'])

async function proxyToUpstream(request, env) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/v1/, '')
  const upstreamBase = (env.UPSTREAM_BASE_URL || 'https://7api.st/v1').replace(/\/$/, '')
  const markup = Math.max(1, Number(env.CREDIT_MARKUP) || 1)

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
  }

  let upstream
  try {
    upstream = await fetch(`${upstreamBase}${path}${url.search}`, init)
  } catch {
    return Response.json({ error: { type: 'upstream_unavailable', message: 'Upstream is unreachable. Retry shortly.' } }, { status: 502 })
  }

  const out = new Headers()
  upstream.headers.forEach((v, k) => { if (!DROP_RES.has(k.toLowerCase())) out.set(k, v) })

  if (markup !== 1 && SCALED_PATHS.has(path) && upstream.ok && (upstream.headers.get('content-type') || '').includes('json')) {
    const data = scaleUsd(await upstream.json(), markup)
    return Response.json(data, { status: upstream.status, headers: out })
  }
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}

// Browser calls for accounts stay on this domain. The worker forwards them to Railway,
// so lenar.cc does not have to be added to the backend's CORS list.
const ACCOUNT_API = ['/auth', '/account', '/roll-key', '/reveal-key', '/create-checkout', '/status']

function isAccountApi(pathname) {
  return ACCOUNT_API.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

async function proxyAccountApi(request, env) {
  const url = new URL(request.url)
  const origin = (env.VITE_API_URL || 'https://lenar-production.up.railway.app').replace(/\/$/, '')
  const headers = new Headers()
  for (const name of ['authorization', 'content-type', 'accept']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const init = { method: request.method, headers, redirect: 'manual' }
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body
  const upstream = await fetch(`${origin}${url.pathname}${url.search}`, init)
  const out = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!DROP_RES.has(key.toLowerCase())) out.set(key, value)
  })
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/v1' || url.pathname.startsWith('/v1/')) {
      return proxyToUpstream(request, env)
    }
    if (isAccountApi(url.pathname)) return proxyAccountApi(request, env)
    // Everything else: the static Vite build, via Workers assets (configured in wrangler.json).
    return env.ASSETS.fetch(request)
  },
}
