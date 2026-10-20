import { cors, json, MARKUP } from '../_shared/clients.ts'
import { getStatus } from '../_shared/upstream.ts'

// Public, cached model health for the status page. Prices include our markup.
let cache: { at: number; body: unknown } | null = null
const TTL = 60_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  if (!cache || Date.now() - cache.at > TTL) {
    try {
      const raw = await getStatus()
      const models = (raw?.models ?? []).map((m: any) => ({
        model: m.model,
        status: m.status ?? 'unknown',
        availability_pct: m.availability_pct ?? null,
        avg_latency_s: m.avg_latency_s ?? null,
        price_per_mtok: m.price_usd_per_mtok == null ? null : +(m.price_usd_per_mtok * MARKUP).toFixed(4),
        cache_read_per_mtok: m.cache_read_usd_per_mtok == null ? null : +(m.cache_read_usd_per_mtok * MARKUP).toFixed(4),
      }))
      cache = { at: Date.now(), body: { ok: true, checked_at: new Date().toISOString(), models } }
    } catch (e) {
      console.error('status: upstream failed', e)
      // Serve the last good answer if we have one, flagged as stale.
      if (cache) return json({ ...(cache.body as object), stale: true }, 200, { 'Cache-Control': 'public, max-age=30' })
      return json({ ok: false, error: 'status_unavailable' }, 503)
    }
  }
  return json(cache.body, 200, { 'Cache-Control': 'public, max-age=60' })
})
