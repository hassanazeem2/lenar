// Rate limits for the account API. Browser traffic reaches us through the Cloudflare worker,
// so every request arrives from Cloudflare's addresses; the worker passes the visitor's real IP
// in x-lenar-client-ip, signed with a shared PROXY_KEY so nobody calling Railway directly can
// fake it. Login and password-reset limits are also keyed by email, which works either way.
import crypto from 'node:crypto'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

const PROXY_KEY = process.env.PROXY_KEY || ''

function sameSecret(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y)
}

/** The visitor's IP: from the worker when the request carries the proxy key, else the socket. */
export function clientIp(req) {
  const forwarded = req.headers['x-lenar-client-ip']
  if (PROXY_KEY && forwarded && sameSecret(req.headers['x-lenar-proxy-key'], PROXY_KEY)) return String(forwarded)
  return req.ip
}

const byIp = (req) => ipKeyGenerator(clientIp(req))
const byEmail = (req) => `email:${String(req.body?.email || '').trim().toLowerCase()}`

function limiter({ windowMs, limit, key = byIp, message }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: key,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: message }),
  })
}

const MIN = 60 * 1000
const wait = (what) => `Too many ${what}. Wait a few minutes and try again.`

// Sign-in: per address (stops password guessing on one account) and per IP (stops spraying many).
export const loginLimits = [
  limiter({ windowMs: 15 * MIN, limit: 10, key: byEmail, message: wait('sign-in attempts for this email') }),
  limiter({ windowMs: 15 * MIN, limit: 40, message: wait('sign-in attempts') }),
]
// New accounts: per IP, to slow bot sign-ups.
export const signupLimits = [limiter({ windowMs: 60 * MIN, limit: 5, message: wait('new accounts from this network') })]
// Reset emails: per address (no inbox gets flooded) and per IP.
export const forgotLimits = [
  limiter({ windowMs: 60 * MIN, limit: 3, key: byEmail, message: wait('reset emails for this address') }),
  limiter({ windowMs: 60 * MIN, limit: 10, message: wait('reset requests') }),
]
// Token checks (verify, reset): per IP, so tokens can't be guessed.
export const tokenLimits = [limiter({ windowMs: 15 * MIN, limit: 20, message: wait('attempts') })]
// Checkout sessions and key actions: per IP, generous for real people.
export const actionLimits = [limiter({ windowMs: 15 * MIN, limit: 30, message: wait('requests') })]
// Emails a signed-in user can trigger for themselves (resend verification, reset link): per user.
export const userLimits = [rateLimit({
  windowMs: 60 * MIN, limit: 5, keyGenerator: (req) => `user:${req.userId}`, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: wait('emails') }),
})]
