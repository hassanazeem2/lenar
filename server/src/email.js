// Transactional email via Resend. If RESEND_API_KEY isn't set, emails are logged instead of
// sent — fine for local dev, not for production (set it before you need real verify/reset emails).
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'lenar <onboarding@resend.dev>'

async function send(to, subject, html) {
  if (!resend) {
    console.warn(`[email not sent — no RESEND_API_KEY] to=${to} subject="${subject}"\n${html}`)
    return
  }
  await resend.emails.send({ from: FROM, to, subject, html })
}

export const sendVerifyEmail = (to, link) =>
  send(to, 'Verify your lenar account', `<p>Confirm your email to finish signing up:</p><p><a href="${link}">${link}</a></p>`)

export const sendResetEmail = (to, link) =>
  send(to, 'Reset your lenar password', `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>If you didn't ask for this, ignore it.</p>`)
