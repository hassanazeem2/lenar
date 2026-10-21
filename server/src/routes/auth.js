import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { q } from '../db.js'
import { signToken, requireAuth } from '../auth.js'
import { sendVerifyEmail, sendResetEmail } from '../email.js'
import { siteUrl as SITE_URL } from '../site.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const token = () => crypto.randomBytes(32).toString('hex')

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email.' })
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

  const { rows: exists } = await q('select id from users where email = $1', [email.toLowerCase()])
  if (exists.length) return res.status(400).json({ error: 'An account with that email already exists.' })

  const hash = await bcrypt.hash(password, 12)
  const verifyToken = token()
  const { rows } = await q(
    `insert into users (email, password_hash, verify_token, verify_token_expires)
     values ($1, $2, $3, now() + interval '24 hours') returning id`,
    [email.toLowerCase(), hash, verifyToken],
  )
  await sendVerifyEmail(email, `${SITE_URL}/verify?token=${verifyToken}`)
  res.json({ token: signToken(rows[0].id) })
})

router.post('/verify', async (req, res) => {
  const { token: t } = req.body || {}
  if (!t) return res.status(400).json({ error: 'missing token' })
  const { rows } = await q(
    `update users set email_verified = true, verify_token = null
     where verify_token = $1 and verify_token_expires > now() returning id`,
    [t],
  )
  if (!rows.length) return res.status(400).json({ error: 'That verification link is invalid or expired.' })
  res.json({ ok: true })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const { rows } = await q('select id, password_hash from users where email = $1', [String(email || '').toLowerCase()])
  const user = rows[0]
  if (!user || !user.password_hash || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' })
  }
  res.json({ token: signToken(user.id) })
})

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await q('select id, email, email_verified from users where id = $1', [req.userId])
  if (!rows.length) return res.status(401).json({ error: 'unauthorized' })
  res.json({ user: rows[0] })
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  const { rows } = await q('select id from users where email = $1', [String(email || '').toLowerCase()])
  // Always 200 — don't reveal whether an email is registered.
  if (rows.length) {
    const resetToken = token()
    await q(`update users set reset_token = $1, reset_token_expires = now() + interval '1 hour' where id = $2`, [resetToken, rows[0].id])
    await sendResetEmail(email, `${SITE_URL}/reset-password?token=${resetToken}`)
  }
  res.json({ ok: true })
})

router.post('/reset-password', async (req, res) => {
  const { token: t, password } = req.body || {}
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  const hash = await bcrypt.hash(password, 12)
  const { rows } = await q(
    `update users set password_hash = $1, reset_token = null
     where reset_token = $2 and reset_token_expires > now() returning id`,
    [hash, t],
  )
  if (!rows.length) return res.status(400).json({ error: 'That reset link is invalid or expired.' })
  res.json({ token: signToken(rows[0].id) })
})

// --- Google OAuth (Authorization Code flow) ---

router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.API_BASE_URL}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email',
    access_type: 'online',
    prompt: 'select_account',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.get('/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect(`${SITE_URL}/sign-in?error=google_failed`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.API_BASE_URL}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    }).then((r) => r.json())
    if (!tokenRes.id_token) throw new Error('no id_token')

    const payload = JSON.parse(Buffer.from(tokenRes.id_token.split('.')[1], 'base64url').toString())
    const { sub: googleId, email } = payload
    if (!email) throw new Error('no email in id_token')

    const { rows } = await q('select id from users where google_id = $1 or email = $2', [googleId, email.toLowerCase()])
    let userId
    if (rows.length) {
      userId = rows[0].id
      await q('update users set google_id = $1, email_verified = true where id = $2', [googleId, userId])
    } else {
      const ins = await q(
        `insert into users (email, google_id, email_verified) values ($1, $2, true) returning id`,
        [email.toLowerCase(), googleId],
      )
      userId = ins.rows[0].id
    }
    res.redirect(`${SITE_URL}/auth/callback?token=${signToken(userId)}`)
  } catch (e) {
    console.error('google oauth failed', e)
    res.redirect(`${SITE_URL}/sign-in?error=google_failed`)
  }
})

export default router
