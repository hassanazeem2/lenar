import crypto from 'node:crypto'
import { TOPUP_CENTS } from './amounts.js'

const API_BASE = (process.env.NOWPAYMENTS_API_BASE || 'https://api.nowpayments.io/v1').replace(/\/$/, '')

export const cryptoConfigured = () => Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET)

// NOWPayments signs JSON.stringify of the body after sorting keys. Nested objects are sorted too.
// Their example walks arrays with Object.keys, so this function does the same.
function sortObject(obj) {
  return Object.keys(obj).sort().reduce((result, key) => {
    const child = obj[key]
    result[key] = child && typeof child === 'object' ? sortObject(child) : child
    return result
  }, {})
}

export function verifyNowPaymentsIpn(rawBody, signature, secret) {
  if (!signature || !secret) return false
  let parsed
  try { parsed = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)) } catch { return false }
  const expected = crypto.createHmac('sha512', secret).update(JSON.stringify(sortObject(parsed))).digest('hex')
  const left = Buffer.from(expected, 'hex')
  const right = Buffer.from(String(signature), 'hex')
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}

export async function createCryptoInvoice({ amountCents, userId, successUrl, cancelUrl, ipnUrl }) {
  const orderId = `lenar:${userId}:${amountCents}:${crypto.randomUUID()}`
  const res = await fetch(`${API_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amountCents / 100,
      price_currency: 'usd',
      order_id: orderId,
      order_description: `lenar credits — $${amountCents / 100}`,
      ipn_callback_url: ipnUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.invoice_url || data.id == null) {
    throw new Error(data.message || data.error || `NOWPayments invoice failed (${res.status})`)
  }
  return { url: data.invoice_url, id: String(data.id) }
}

const ORDER = /^lenar:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d+):/i

// Credit is added only when NOWPayments says the payment is finished.
// Earlier statuses (waiting, confirming, confirmed, sending) are ignored.
export function finishedTopup(body) {
  if (body?.payment_status !== 'finished') return null
  if (body.payment_id == null) return null
  const match = ORDER.exec(String(body.order_id || ''))
  if (!match) return null
  const amountCents = Number(match[2])
  if (!TOPUP_CENTS.has(amountCents)) return null
  if (String(body.price_currency || '').toLowerCase() !== 'usd') return null
  const price = Number(body.price_amount)
  if (!Number.isFinite(price) || Math.round(price * 100) !== amountCents) return null
  return { id: `np_${body.payment_id}`, userId: match[1], amountCents }
}
