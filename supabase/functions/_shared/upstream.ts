// 7api client. Subkey management uses our main key; usage/balance calls use the customer's subkey.
// Docs: https://7api.st (Subkeys: resell your balance).

const BASE = (Deno.env.get('UPSTREAM_BASE_URL') ?? 'https://7api.st/v1').replace(/\/$/, '')
const MAIN_KEY = Deno.env.get('UPSTREAM_MAIN_KEY')!

export class UpstreamError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

async function call(path: string, init: RequestInit & { key?: string } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.key ?? MAIN_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const code = data?.error?.code ?? data?.error?.type ?? data?.code ?? `http_${res.status}`
    const msg = data?.error?.message ?? data?.message ?? text.slice(0, 200)
    throw new UpstreamError(res.status, String(code), `7api ${path}: ${res.status} ${code} ${msg}`)
  }
  return data
}

export type Subkey = {
  id: string
  label?: string
  api_key?: string // only returned on create
  revoked: boolean
  balance_usd: number
  spent_usd: number
}

const usd = (cents: number) => Math.floor(cents) / 100

/** Creates a subkey funded with `cents` from our main balance (7api minimum is $2). */
export const createSubkey = (cents: number, label: string): Promise<Subkey> =>
  call('/subkeys', { method: 'POST', body: JSON.stringify({ amount_usd: usd(cents), label }) })

export const getSubkey = (id: string): Promise<Subkey> => call(`/subkeys/${encodeURIComponent(id)}`)

export const topupSubkey = (id: string, cents: number): Promise<Subkey> =>
  call(`/subkeys/${encodeURIComponent(id)}/topup`, { method: 'POST', body: JSON.stringify({ amount_usd: usd(cents) }) })

/** Revokes a subkey; its remaining balance returns to our main key. */
export const deleteSubkey = (id: string) => call(`/subkeys/${encodeURIComponent(id)}`, { method: 'DELETE' })

export type UsageWindow = { total_tokens?: number; cached_tokens?: number; cost_usd?: number; cache_savings_usd?: number }

/** Usage for one customer, read with their own subkey. */
export const getUsage = (subkeySecret: string): Promise<{ windows?: Record<string, UsageWindow> }> =>
  call('/usage', { key: subkeySecret })

/** Model health. Works with the main key or any subkey. */
export const getStatus = (key = Deno.env.get('STATUS_API_KEY') || MAIN_KEY) => call('/status', { key })

/** Retries 7api's "409 subkey_busy" (key mid-request) a few times before giving up. */
export async function withBusyRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (!(e instanceof UpstreamError) || e.code !== 'subkey_busy' || i >= tries - 1) throw e
      await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
}
