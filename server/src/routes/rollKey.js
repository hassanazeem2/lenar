import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { q } from '../db.js'
import { activeKey } from './account.js'
import { createSubkey, deleteSubkey, getSubkey, withBusyRetry, UpstreamError } from '../upstream.js'
import { encrypt } from '../crypto.js'

const router = Router()

// Replaces the customer's key with a new one carrying the same balance.
// New key first, then revoke the old one, so a failure never leaves them keyless.
router.post('/', requireAuth, async (req, res) => {
  const userId = req.userId
  const old = await activeKey(userId)
  if (!old) return res.status(400).json({ error: 'You have no key yet. Top up to create one.' })

  try {
    const current = await getSubkey(old.subkey_id)
    const cents = Math.floor(current.balance_usd * 100)
    if (cents < 200) return res.status(400).json({ error: 'A new key needs at least $2 of credit on it. Top up first, then roll.' })

    const fresh = await createSubkey(cents, `lenar:${userId}`)
    if (!fresh.api_key) throw new Error('7api did not return api_key')

    // Old key stops working now; its balance returns to our main key, offsetting the new one.
    await withBusyRetry(() => deleteSubkey(old.subkey_id))

    const now = new Date().toISOString()
    await q('update api_keys set revoked_at = $1 where id = $2', [now, old.id])
    await q(
      `insert into api_keys (user_id, subkey_id, key_prefix, secret_enc, needs_reveal, revealed_at)
       values ($1, $2, $3, $4, false, $5)`,
      [userId, fresh.id, `${fresh.api_key.slice(0, 10)}…${fresh.api_key.slice(-4)}`, encrypt(fresh.api_key), now],
    )

    // The cumulative spend counter restarts with the new key; a zero snapshot keeps the chart honest.
    await q('insert into usage_snapshots (user_id, spent_usd) values ($1, 0)', [userId])

    res.json({ key: fresh.api_key })
  } catch (e) {
    console.error('roll-key failed', e)
    const msg = e instanceof UpstreamError && e.code === 'insufficient_balance'
      ? 'Rolling is temporarily unavailable. Please try again later or contact support.'
      : 'Could not roll your key. Your current key still works.'
    res.status(502).json({ error: msg })
  }
})

export default router
