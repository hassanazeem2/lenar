import { Router } from 'express'
import { verifyCoinbaseWebhook, paidCheckout } from '../coinbase.js'
import { fundPayment } from '../fund.js'

const router = Router()

// Mounted with express.raw() in index.js — req.body is a Buffer, which the signature covers.
router.post('/', async (req, res) => {
  const secret = process.env.COINBASE_WEBHOOK_SECRET
  if (!verifyCoinbaseWebhook(req.body, req.headers['x-hook0-signature'], req.headers, secret)) {
    return res.status(400).send('bad signature')
  }

  let body
  try { body = JSON.parse(req.body.toString('utf8')) } catch { return res.status(400).send('bad payload') }

  if (body.eventType !== 'checkout.payment.success') return res.send('ignored')

  const paid = paidCheckout(body)
  if (!paid) {
    console.error('crypto webhook: success event did not match a lenar top-up', body.id, body.amount, body.currency)
    return res.status(400).send('unexpected payment')
  }

  try {
    const result = await fundPayment({ id: paid.id, userId: paid.userId, paidCents: paid.amountCents, provider: 'crypto' })
    if (result === 'busy') return res.status(409).send('in progress')
    res.send(result === 'funded' ? 'already funded' : 'ok')
  } catch {
    res.status(500).send('funding failed')
  }
})

export default router
