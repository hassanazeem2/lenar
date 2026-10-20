import { Router } from 'express'
import { MARKUP } from '../money.js'
import { getStatus } from '../upstream.js'

const router = Router()

// Public, cached model health for the status page. Prices include our markup.
let cache = null
const TTL = 60_000

router.get('/', async (req, res) => {
  if (!cache || Date.now() - cache.at > TTL) {
    try {
      const raw = await getStatus()
      const models = (raw?.models ?? []).map((m) => ({
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
      if (cache) return res.set('Cache-Control', 'public, max-age=30').json({ ...cache.body, stale: true })
      return res.status(503).json({ ok: false, error: 'status_unavailable' })
    }
  }
  res.set('Cache-Control', 'public, max-age=60').json(cache.body)
})

export default router
