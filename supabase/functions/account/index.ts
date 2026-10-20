import { admin, cors, json, requireUser, activeKey, display, MARKUP } from '../_shared/clients.ts'
import { getSubkey, getUsage, UpstreamError } from '../_shared/upstream.ts'
import { decrypt } from '../_shared/crypto.ts'

const SNAPSHOT_EVERY_MS = 20 * 60 * 1000

// Everything the dashboard shows, in customer dollars (7api figures × markup).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await requireUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  const [key, { data: topups }, { data: snaps }] = await Promise.all([
    activeKey(user.id),
    admin.from('topups').select('stripe_session_id, paid_cents, credit_cents, funded_at, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    admin.from('usage_snapshots').select('spent_usd, taken_at')
      .eq('user_id', user.id).gte('taken_at', new Date(Date.now() - 30 * 864e5).toISOString())
      .order('taken_at', { ascending: true }),
  ])

  const out: Record<string, unknown> = {
    email: user.email,
    markup: MARKUP,
    key: key && {
      prefix: key.key_prefix,
      created_at: key.created_at,
      can_reveal: key.needs_reveal,
    },
    topups: (topups ?? []).map((t) => ({
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
      const [sub, usage] = await Promise.all([
        getSubkey(key.subkey_id),
        decrypt(key.secret_enc).then(getUsage),
      ])
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
      const last = snaps?.at(-1)
      const points = [...(snaps ?? [])]
      if (!last || Date.now() - new Date(last.taken_at).getTime() > SNAPSHOT_EVERY_MS) {
        const row = { user_id: user.id, spent_usd: sub.spent_usd, taken_at: new Date().toISOString() }
        await admin.from('usage_snapshots').insert(row)
        points.push(row)
      }
      out.series = points.map((p) => ({ t: p.taken_at, spent: display(Number(p.spent_usd)) }))
    } catch (e) {
      console.error('account: upstream read failed', e)
      out.upstream_error = e instanceof UpstreamError ? e.code : 'unavailable'
    }
  }

  return json(out)
})
