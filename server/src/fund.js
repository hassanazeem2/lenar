import { q } from './db.js'
import { creditFor } from './money.js'
import { createSubkey, topupSubkey, withBusyRetry, UpstreamError } from './upstream.js'
import { encrypt } from './crypto.js'

async function activeKey(userId) {
  const { rows } = await q('select * from api_keys where user_id = $1 and revoked_at is null', [userId])
  return rows[0] || null
}

// Claims the payment once, then moves credit onto the customer's 7api subkey
// (creating that subkey on their first payment). Returns 'funded', 'busy', or 'ok'.
// A non-2xx from the caller makes Stripe or Coinbase retry; releasing the claim
// lets that retry try again. claim_topup keeps a second delivery from funding twice.
export async function fundPayment({ id, userId, paidCents, provider }) {
  const credit = creditFor(paidCents)
  if (!credit) throw new Error('credit rounds to zero')

  const { rows } = await q('select claim_topup($1, $2, $3, $4) as claim', [id, userId, paidCents, credit])
  const claim = rows[0].claim
  if (claim !== 'claimed') return claim

  await q('update topups set provider = $2 where stripe_session_id = $1', [id, provider])

  try {
    const key = await activeKey(userId)
    if (key) {
      await withBusyRetry(() => topupSubkey(key.subkey_id, credit))
    } else {
      const sub = await createSubkey(credit, `lenar:${userId}`)
      if (!sub.api_key) throw new Error('7api did not return api_key for the new subkey')
      await q(
        `insert into api_keys (user_id, subkey_id, key_prefix, secret_enc) values ($1, $2, $3, $4)`,
        [userId, sub.id, `${sub.api_key.slice(0, 10)}…${sub.api_key.slice(-4)}`, encrypt(sub.api_key)],
      )
    }
    await q('update topups set funded_at = now() where stripe_session_id = $1', [id])
    return 'ok'
  } catch (e) {
    await q('update topups set claimed_at = null where stripe_session_id = $1', [id])
    const why = e instanceof UpstreamError ? `${e.status} ${e.code}` : String(e)
    console.error(`funding failed for ${id} (user ${userId}): ${why}`)
    if (e instanceof UpstreamError && e.code === 'insufficient_balance') {
      console.error('ACTION NEEDED: your 7api main balance is too low to fund customer top-ups. Top it up at 7api.')
    }
    throw e
  }
}
