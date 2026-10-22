// Transactional email via Resend. If RESEND_API_KEY isn't set, emails are logged instead of
// sent — fine for local dev, not for production. EMAIL_FROM must be on a domain verified in
// Resend (e.g. "lenar <noreply@lenar.cc>"); Resend's test sender only delivers to your own inbox.
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'lenar <onboarding@resend.dev>'

export const emailConfigured = () => Boolean(resend)

async function send(to, subject, html, text) {
  if (!resend) {
    console.warn(`[email not sent — no RESEND_API_KEY] to=${to} subject="${subject}"\n${text}`)
    return
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text })
  if (error) throw new Error(`resend: ${error.message || error.name}`)
}

// One simple, dark layout for every email: the wordmark, a line of text, one button, the raw link.
function layout({ title, body, button, link, foot }) {
  const html = `<!doctype html><html><body style="margin:0;background:#0a0908;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f3efe7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0908;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14120f;border-radius:14px;padding:32px">
<tr><td style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f3efe7">lenar</td></tr>
<tr><td style="padding-top:28px;font-size:22px;font-weight:600;color:#f3efe7">${title}</td></tr>
<tr><td style="padding-top:10px;font-size:15px;line-height:1.55;color:#b9b2a7">${body}</td></tr>
<tr><td style="padding-top:24px"><a href="${link}" style="display:inline-block;background:#cd8a4c;color:#0a0908;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">${button}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;line-height:1.5;color:#968f85">Or paste this link into your browser:<br><a href="${link}" style="color:#cd8a4c;word-break:break-all">${link}</a></td></tr>
<tr><td style="padding-top:20px;font-size:12px;line-height:1.5;color:#968f85">${foot}</td></tr>
</table></td></tr></table></body></html>`
  const text = `${title}\n\n${body}\n\n${button}: ${link}\n\n${foot}`
  return { html, text }
}

export function sendVerifyEmail(to, link) {
  const { html, text } = layout({
    title: 'Confirm your email',
    body: 'Thanks for signing up to lenar. Confirm this is your address so we can reach you about your account and payments.',
    button: 'Confirm email',
    link,
    foot: 'This link works for 24 hours. If you didn’t create a lenar account, you can ignore this email.',
  })
  return send(to, 'Confirm your lenar email', html, text)
}

export function sendResetEmail(to, link) {
  const { html, text } = layout({
    title: 'Reset your password',
    body: 'Someone asked to reset the password for your lenar account. Choose a new one with the button below.',
    button: 'Choose a new password',
    link,
    foot: 'This link works for 1 hour. If you didn’t ask for this, ignore this email and your password stays the same.',
  })
  return send(to, 'Reset your lenar password', html, text)
}
