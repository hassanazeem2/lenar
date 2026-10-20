import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { q } from '../db.js'
import { display, MARKUP } from '../money.js'
import { getSubkey, getUsage, UpstreamError } from '../upstream.js'
import { decrypt } from '../crypto.js'

const router = Router()
const SNAPSHOT_EVERY_MS = 20 * 60 * 1000

async function activeKey(userId) {
  const { rows } = await q('select * from api_keys where user_id = $1 and revoked_at is null', [userId])
  return rows[0] || null
}

// Everything the dashboard shows, in customer dollars (7api figures × markup).
router.get('/', requireAuth, async (req, res) => {
  const userId = req.userId
  const [userRow, key, topups, snaps] = await Promise.all([
    q('select email from users where id = $1', [userId]),
    activeKey(userId),
    q(
      `select stripe_session_id, paid_cents, credit_cents, funded_at, created_at from topups
       where user_id = $1 order by created_at desc limit 50`,
      [userId],
    ),
    q(
      `select spent_usd, taken_at from usage_snapshots
       where user_id = $1 and taken_at >= now() - interval '30 days' order by taken_at asc`,
      [userId],
    ),
  ])

  const out = {
    email: userRow.rows[0]?.email,
    markup: MARKUP,
    key: key && {
      prefix: key.key_prefix,
      created_at: key.created_at,
      can_reveal: key.needs_reveal,
    },
    topups: topups.rows.map((t) => ({
      id: t.stripe_session_id.slice(-8),
      paid: t.paid_cents / 100,
      credited: display(t.credit_cents / 100),
      status: t.funded_at ? 'funded' : 'pending',
      created_at: t.created_at,
    })),
    balance: null,
    spent: null,
    usage: null,
    series: [],
    upstream_error: null,
  }

  if (key) {
    try {
      const [sub, usage] = await Promise.all([getSubkey(key.subkey_id), getUsage(decrypt(key.secret_enc))])
      out.balance = display(sub.balance_usd)
      out.spent = display(sub.spent_usd)
      const w = usage?.windows ?? {}
      out.usage = Object.fromEntries(['1h', '24h', '7d'].map((k) => [k, {
        tokens: w[k]?.total_tokens ?? 0,
        cached: w[k]?.cached_tokens ?? 0,
        cost: display(w[k]?.cost_usd ?? 0),
        savings: display(w[k]?.cache_savings_usd ?? 0),
      }]))

      // Cumulative spend snapshots power the chart; take one if the last is stale.
      const points = snaps.rows
      const last = points.at(-1)
      if (!last || Date.now() - new Date(last.taken_at).getTime() > SNAPSHOT_EVERY_MS) {
        const row = { spent_usd: sub.spent_usd, taken_at: new Date().toISOString() }
        await q('insert into usage_snapshots (user_id, spent_usd) values ($1, $2)', [userId, sub.spent_usd])
        points.push(row)
      }
      out.series = points.map((p) => ({ t: p.taken_at, spent: display(Number(p.spent_usd)) }))
    } catch (e) {
      console.error('account: upstream read failed', e)
      out.upstream_error = e instanceof UpstreamError ? e.code : 'unavailable'
    }
  }

  res.json(out)
})

export default router
export { activeKey }
