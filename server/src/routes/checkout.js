import { Router } from 'express'
import Stripe from 'stripe'
import { requireAuth } from '../auth.js'
import { q } from '../db.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Top-up amounts the dashboard offers, in cents. Anything else is rejected.
const AMOUNTS = new Set([1000, 2500, 5000, 10000])

router.post('/', requireAuth, async (req, res) => {
  const { amount_cents } = req.body || {}
  if (!AMOUNTS.has(amount_cents)) return res.status(400).json({ error: 'invalid amount' })

  const { rows } = await q('select email from users where id = $1', [req.userId])
  const email = rows[0]?.email
  const site = process.env.SITE_URL

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amount_cents,
        product_data: { name: `lenar credits — $${amount_cents / 100}` },
      },
    }],
    metadata: { user_id: req.userId, amount_cents: String(amount_cents) },
    success_url: `${site}/dashboard/billing?topup=success`,
    cancel_url: `${site}/dashboard/billing`,
  })

  res.json({ url: session.url })
})

export default router
