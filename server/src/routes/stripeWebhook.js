import { Router } from 'express'
import Stripe from 'stripe'
import { fundPayment } from '../fund.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const SECRET = process.env.STRIPE_WEBHOOK_SECRET

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

  try {
    const result = await fundPayment({ id: session.id, userId, paidCents: paid, provider: 'card' })
    if (result === 'busy') return res.status(409).send('in progress')
    res.send(result === 'funded' ? 'already funded' : 'ok')
  } catch {
    res.status(500).send('funding failed')
  }
})

export default router
