import { Router } from 'express'
import Stripe from 'stripe'
import { requireAuth } from '../auth.js'
import { q } from '../db.js'
import { siteUrl } from '../site.js'
import { TOPUP_CENTS } from '../amounts.js'
import { createCryptoInvoice, cryptoConfigured } from '../wolvpay.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

router.post('/', requireAuth, async (req, res) => {
  const { amount_cents } = req.body || {}
  if (!TOPUP_CENTS.has(amount_cents)) return res.status(400).json({ error: 'invalid amount' })

  const { rows } = await q('select email from users where id = $1', [req.userId])
  const email = rows[0]?.email
  const site = siteUrl

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

router.post('/crypto', requireAuth, async (req, res) => {
  const { amount_cents } = req.body || {}
  if (!TOPUP_CENTS.has(amount_cents)) return res.status(400).json({ error: 'invalid amount' })
  if (!cryptoConfigured()) return res.status(503).json({ error: 'Crypto payments are not turned on yet.' })
  if (!siteUrl.startsWith('https://')) return res.status(500).json({ error: 'SITE_URL must be an https address.' })

  try {
    const invoice = await createCryptoInvoice({
      amountCents: amount_cents,
      redirectUrl: `${siteUrl}/dashboard/billing?topup=success`,
    })
    await q(
      'insert into crypto_invoices (invoice_id, user_id, amount_cents) values ($1, $2, $3)',
      [invoice.id, req.userId, amount_cents],
    )
    res.json({ url: invoice.url })
  } catch (e) {
    console.error('crypto checkout failed', e)
    res.status(502).json({ error: 'Could not start the crypto payment. Try again.' })
  }
})

export default router
