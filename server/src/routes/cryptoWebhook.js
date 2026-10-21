import { Router } from 'express'
import { verifyNowPaymentsIpn, finishedTopup } from '../nowpayments.js'
import { fundPayment } from '../fund.js'

const router = Router()

// Mounted with express.raw() so the body NOWPayments signed is the body we verify.
router.post('/', async (req, res) => {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!verifyNowPaymentsIpn(req.body, req.headers['x-nowpayments-sig'], secret)) {
    return res.status(400).send('bad signature')
  }

  let body
  try { body = JSON.parse(req.body.toString('utf8')) } catch { return res.status(400).send('bad payload') }

  if (body.payment_status !== 'finished') return res.send('ignored')

  const paid = finishedTopup(body)
  if (!paid) {
    console.error('crypto webhook: finished payment did not match a lenar top-up', body.payment_id, body.order_id, body.price_amount)
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
