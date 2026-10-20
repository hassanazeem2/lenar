// 7api client. Subkey management uses our main key; usage/balance calls use the customer's subkey.
// Docs: https://7api.st (Subkeys: resell your balance).

const BASE = (process.env.UPSTREAM_BASE_URL || 'https://7api.st/v1').replace(/\/$/, '')
const MAIN_KEY = process.env.UPSTREAM_MAIN_KEY

export class UpstreamError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function call(path, { key, method, body, headers } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${key ?? MAIN_KEY}`,
      'Content-Type': 'application/json',
      ...headers,
    },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const code = data?.error?.code ?? data?.error?.type ?? data?.code ?? `http_${res.status}`
    const msg = data?.error?.message ?? data?.message ?? text.slice(0, 200)
    throw new UpstreamError(res.status, String(code), `7api ${path}: ${res.status} ${code} ${msg}`)
  }
  return data
}

const usd = (cents) => Math.floor(cents) / 100

/** Creates a subkey funded with `cents` from our main balance (7api minimum is $2). */
export const createSubkey = (cents, label) =>
  call('/subkeys', { method: 'POST', body: JSON.stringify({ amount_usd: usd(cents), label }) })

export const getSubkey = (id) => call(`/subkeys/${encodeURIComponent(id)}`)

export const topupSubkey = (id, cents) =>
  call(`/subkeys/${encodeURIComponent(id)}/topup`, { method: 'POST', body: JSON.stringify({ amount_usd: usd(cents) }) })

/** Revokes a subkey; its remaining balance returns to our main key. */
export const deleteSubkey = (id) => call(`/subkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })

/** Usage for one customer, read with their own subkey. */
export const getUsage = (subkeySecret) => call('/usage', { key: subkeySecret })

/** Model health. Works with the main key or any subkey. */
export const getStatus = (key = process.env.STATUS_API_KEY || MAIN_KEY) => call('/status', { key })

/** Retries 7api's "409 subkey_busy" (key mid-request) a few times before giving up. */
export async function withBusyRetry(fn, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (!(e instanceof UpstreamError) || e.code !== 'subkey_busy' || i >= tries - 1) throw e
      await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
}
