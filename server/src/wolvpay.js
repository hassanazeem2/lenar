import crypto from 'node:crypto'
import { TOPUP_CENTS } from './amounts.js'

const API = 'https://wolvpay.com/api/v1'

export const cryptoConfigured = () => Boolean(process.env.WOLVPAY_API_KEY && process.env.WOLVPAY_WEBHOOK_SECRET)

export async function createCryptoInvoice({ amountCents, redirectUrl }) {
  const res = await fetch(`${API}/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WOLVPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountCents / 100,
      currency: 'USD',
      description: `lenar credits — $${amountCents / 100}`,
      white_label: false,
      redirect_url: redirectUrl,
    }),
  })
  const data = await res.json().catch(() => ({}))
  const invoice = data.data || {}
  if (!res.ok || data.success === false || !invoice.url || !invoice.invoice_id) {
    const message = data.message || data.error?.message || data.error || `WolvPay invoice failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : 'WolvPay invoice failed')
  }
  return { url: invoice.url, id: String(invoice.invoice_id) }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}

// WolvPay signs the raw body with HMAC-SHA256. The header is X-WolvPay-Signature.
export function verifyWolvPayWebhook(rawBody, signature, secret) {
  if (!signature || !secret) return false
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return safeEqual(expected, String(signature).trim().toLowerCase())
}

const INVOICE_ID = /^[A-Za-z0-9_-]{6,80}$/

// Credit is added only when WolvPay reports the invoice as PAID.
export function paidInvoice(body) {
  if (body?.status !== 'PAID') return null
  const invoiceId = String(body.invoice_id || '')
  if (!INVOICE_ID.test(invoiceId)) return null
  const amountCents = Math.round(Number(body.amount) * 100)
  if (!TOPUP_CENTS.has(amountCents)) return null
  return { invoiceId, amountCents }
}
