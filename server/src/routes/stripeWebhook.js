import { Router } from 'express'
import Stripe from 'stripe'
import { q } from '../db.js'
import { creditFor } from '../money.js'
import { createSubkey, topupSubkey, withBusyRetry, UpstreamError } from '../upstream.js'
import { encrypt } from '../crypto.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const SECRET = process.env.STRIPE_WEBHOOK_SECRET

async function activeKey(userId) {
  const { rows } = await q('select * from api_keys where user_id = $1 and revoked_at is null', [userId])
  return rows[0] || null
}

// Stripe retries any non-2xx for up to 3 days, so transient failures (7api busy, our 7api
// balance too low) heal themselves once fixed. claim_topup makes sure each payment funds once.
// Mounted with express.raw() in index.js — req.body is a Buffer here, not parsed JSON.
router.post('/', async (req, res) => {
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], SECRET)
  } catch {
    return res.status(400).send('bad signature')
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return res.send('ignored')
  }
  const session = event.data.object
  if (session.payment_status !== 'paid') return res.send('not paid yet')

  const userId = session.metadata?.user_id
  const paid = session.amount_total
  if (!userId || !paid) return res.status(400).send('missing metadata')
  const credit = creditFor(paid)

  const { rows } = await q('select claim_topup($1, $2, $3, $4) as claim', [session.id, userId, paid, credit])
  const claim = rows[0].claim
  if (claim === 'funded') return res.send('already funded')
  if (claim === 'busy') return res.status(409).send('in progress') // Stripe retries later

  try {
    const key = await activeKey(userId)
    if (key) {
      await withBusyRetry(() => topupSubkey(key.subkey_id, credit))
    } else {
      // First purchase: mint the customer's subkey funded with this payment.
      const sub = await createSubkey(credit, `lenar:${userId}`)
      if (!sub.api_key) throw new Error('7api did not return api_key for the new subkey')
      await q(
        `insert into api_keys (user_id, subkey_id, key_prefix, secret_enc) values ($1, $2, $3, $4)`,
        [userId, sub.id, `${sub.api_key.slice(0, 10)}…${sub.api_key.slice(-4)}`, encrypt(sub.api_key)],
      )
    }
    await q('update topups set funded_at = now() where stripe_session_id = $1', [session.id])
  } catch (e) {
    // Release the claim so the retry can try again straight away.
    await q('update topups set claimed_at = null where stripe_session_id = $1', [session.id])
    const why = e instanceof UpstreamError ? `${e.status} ${e.code}` : String(e)
    console.error(`funding failed for ${session.id} (user ${userId}): ${why}`)
    if (e instanceof UpstreamError && e.code === 'insufficient_balance') {
      console.error('ACTION NEEDED: your 7api main balance is too low to fund customer top-ups. Top it up at 7api.')
    }
    return res.status(500).send('funding failed')
  }

  res.send('ok')
})

export default router
