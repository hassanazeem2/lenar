// AES-GCM encryption for stored subkeys. KEY_ENCRYPTION_SECRET is 32 random bytes, base64
// (generate with: openssl rand -base64 32). Losing it means stored keys can't be read back.

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

let keyPromise: Promise<CryptoKey> | null = null
function key() {
  keyPromise ??= crypto.subtle.importKey('raw', unb64(Deno.env.get('KEY_ENCRYPTION_SECRET')!), 'AES-GCM', false, ['encrypt', 'decrypt'])
  return keyPromise
}

export async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(plain))
  return `${b64(iv)}.${b64(ct)}`
}

export async function decrypt(stored: string) {
  const [iv, ct] = stored.split('.')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(), unb64(ct))
  return new TextDecoder().decode(pt)
}
