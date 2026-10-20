import { admin, cors, json, requireUser, activeKey } from '../_shared/clients.ts'
import { createSubkey, deleteSubkey, getSubkey, withBusyRetry, UpstreamError } from '../_shared/upstream.ts'
import { encrypt } from '../_shared/crypto.ts'

// Replaces the customer's key with a new one carrying the same balance.
// New key first, then revoke the old one, so a failure never leaves them keyless.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await requireUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  const old = await activeKey(user.id)
  if (!old) return json({ error: 'You have no key yet. Top up to create one.' }, 400)

  try {
    const current = await getSubkey(old.subkey_id)
    const cents = Math.floor(current.balance_usd * 100)
    if (cents < 200) return json({ error: 'A new key needs at least $2 of credit on it. Top up first, then roll.' }, 400)

    const fresh = await createSubkey(cents, `lenar:${user.id}`)
    if (!fresh.api_key) throw new Error('7api did not return api_key')

    // Old key stops working now; its balance returns to our main key, offsetting the new one.
    await withBusyRetry(() => deleteSubkey(old.subkey_id))

    const now = new Date().toISOString()
    await admin.from('api_keys').update({ revoked_at: now }).eq('id', old.id)
    const { error } = await admin.from('api_keys').insert({
      user_id: user.id,
      subkey_id: fresh.id,
      key_prefix: `${fresh.api_key.slice(0, 10)}…${fresh.api_key.slice(-4)}`,
      secret_enc: await encrypt(fresh.api_key),
      needs_reveal: false,
      revealed_at: now,
    })
    if (error) throw error

    // The cumulative spend counter restarts with the new key; a zero snapshot keeps the chart honest.
    await admin.from('usage_snapshots').insert({ user_id: user.id, spent_usd: 0 })

    return json({ key: fresh.api_key })
  } catch (e) {
    console.error('roll-key failed', e)
    const msg = e instanceof UpstreamError && e.code === 'insufficient_balance'
      ? 'Rolling is temporarily unavailable. Please try again later or contact support.'
      : 'Could not roll your key. Your current key still works.'
    return json({ error: msg }, 502)
  }
})
