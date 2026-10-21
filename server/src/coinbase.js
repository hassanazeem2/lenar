import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { TOPUP_CENTS } from './amounts.js'

const HOST = 'business.coinbase.com'
const PATH = '/api/v1/checkouts'

export const cryptoConfigured = () => Boolean(
  process.env.COINBASE_API_KEY_NAME && process.env.COINBASE_API_KEY_SECRET && process.env.COINBASE_WEBHOOK_SECRET,
)

function pem(secret) {
  return secret.includes('\\n') ? secret.replace(/\\n/g, '\n') : secret
}

// CDP secret keys sign a short-lived JWT bound to this exact request.
// Create the key as ECDSA. Ed25519 keys use a different signature and will not work here.
function bearer(method, path) {
  const keyName = process.env.COINBASE_API_KEY_NAME
  const keySecret = pem(process.env.COINBASE_API_KEY_SECRET)
  const uri = `${method} ${HOST}${path}`
  return jwt.sign(
    {
      iss: 'cdp',
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120,
      sub: keyName,
      uri,
    },
    keySecret,
    {
      algorithm: 'ES256',
      header: { kid: keyName, nonce: crypto.randomBytes(16).toString('hex') },
    },
  )
}

export async function createCryptoCheckout({ amountCents, userId, successUrl, failUrl }) {
  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer('POST', PATH)}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      amount: (amountCents / 100).toFixed(2),
      currency: 'USD',
      network: 'base',
      description: `lenar credits — $${amountCents / 100}`,
      metadata: { user_id: userId, amount_cents: String(amountCents) },
      successRedirectUrl: successUrl,
      failRedirectUrl: failUrl,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url || !data.id) {
    const msg = data.errorMessage || `Coinbase checkout failed (${res.status})`
    throw new Error(msg)
  }
  return { url: data.url, id: data.id }
}

function sigField(header, key) {
  const row = header.split(',').find((part) => part.startsWith(`${key}=`))
  return row ? row.slice(key.length + 1) : ''
}

function safeEqual(a, b) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right)
}

// Coinbase signs the raw body. v1 also binds the headers named in the signature.
// A replay of a real event is harmless: fundPayment claims each checkout once.
export function verifyCoinbaseWebhook(rawBody, signatureHeader, headers, secret) {
  if (!signatureHeader || !secret) return false
  const timestamp = sigField(signatureHeader, 't')
  const v1 = sigField(signatureHeader, 'v1')
  const v0 = sigField(signatureHeader, 'v0')
  if (!timestamp || (!v1 && !v0)) return false

  const ageMs = Date.now() - Number(timestamp) * 1000
  if (!Number.isFinite(ageMs) || ageMs < -5 * 60 * 1000 || ageMs > 24 * 60 * 60 * 1000) return false

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)
  const headerNames = sigField(signatureHeader, 'h')
  const headerValues = headerNames.split(' ').filter(Boolean).map((name) => headers[name.toLowerCase()] || '').join('.')
  const mac = (signed) => crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex')
  const v1ok = v1 && safeEqual(mac(`${timestamp}.${headerNames}.${headerValues}.${payload}`), v1)
  const v0ok = v0 && safeEqual(mac(`${timestamp}.${payload}`), v0)
  return Boolean(v1ok || v0ok)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Pulls the paid checkout out of a webhook body, or null when this event should not fund credit.
export function paidCheckout(body) {
  if (body?.eventType !== 'checkout.payment.success' || body.status !== 'COMPLETED') return null
  if (!/^[0-9a-f]{24}$/.test(body.id || '')) return null
  const userId = body.metadata?.user_id
  const amountCents = Number(body.metadata?.amount_cents)
  if (!UUID.test(userId || '') || !TOPUP_CENTS.has(amountCents)) return null

  const expected = (amountCents / 100).toFixed(2)
  const fiat = body.fiatAmount
  const currency = String(body.currency || '').toUpperCase()
  const amountOk = fiat
    ? fiat === expected
    : (currency === 'USD' || currency === 'USDC') && body.amount === expected
  if (!amountOk) return null

  return { id: `cb_${body.id}`, userId, amountCents }
}
