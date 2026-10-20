// AES-GCM encryption for stored subkeys. KEY_ENCRYPTION_SECRET is 32 random bytes, base64
// (generate with: openssl rand -base64 32). Losing it means stored keys can't be read back.
import crypto from 'node:crypto'

const key = Buffer.from(process.env.KEY_ENCRYPTION_SECRET, 'base64')

export function encrypt(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // iv.ciphertext+tag, both base64, dot-separated — tag appended to match Web Crypto's AES-GCM output.
  return `${iv.toString('base64')}.${Buffer.concat([ct, tag]).toString('base64')}`
}

export function decrypt(stored) {
  const [ivB64, ctB64] = stored.split('.')
  const iv = Buffer.from(ivB64, 'base64')
  const blob = Buffer.from(ctB64, 'base64')
  const tag = blob.subarray(blob.length - 16)
  const ct = blob.subarray(0, blob.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
