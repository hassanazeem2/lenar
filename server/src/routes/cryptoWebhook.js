import { Router } from 'express'
import { q } from '../db.js'
import { verifyWolvPayWebhook, paidInvoice } from '../wolvpay.js'
import { fundPayment } from '../fund.js'

const router = Router()

// Mounted with express.raw() so the body WolvPay signed is the body we verify.
router.post('/', async (req, res) => {
  const secret = process.env.WOLVPAY_WEBHOOK_SECRET
  if (!verifyWolvPayWebhook(req.body, req.headers['x-wolvpay-signature'], secret)) {
    return res.status(400).send('bad signature')
  }

  let body
  try { body = JSON.parse(req.body.toString('utf8')) } catch { return res.status(400).send('bad payload') }

  if (body.status !== 'PAID') return res.send('ignored')

  const paid = paidInvoice(body)
  if (!paid) {
    console.error('crypto webhook: paid invoice did not match a lenar top-up', body.invoice_id, body.amount)
    return res.status(400).send('unexpected payment')
  }

  const { rows } = await q(
    'select user_id, amount_cents from crypto_invoices where invoice_id = $1',
    [paid.invoiceId],
  )
  const invoice = rows[0]
  if (!invoice || invoice.amount_cents !== paid.amountCents) {
    console.error('crypto webhook: unknown invoice', paid.invoiceId)
    return res.status(400).send('unknown invoice')
  }

  try {
    const result = await fundPayment({
      id: `wp_${paid.invoiceId}`,
      userId: invoice.user_id,
      paidCents: invoice.amount_cents,
      provider: 'crypto',
    })
    if (result === 'busy') return res.status(409).send('in progress')
    res.send(result === 'funded' ? 'already funded' : 'ok')
  } catch {
    res.status(500).send('funding failed')
  }
})

export default router
