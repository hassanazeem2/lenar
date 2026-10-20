import { useEffect, useState } from 'react'

// Your Railway backend (auth, account, keys, Stripe checkout). The public model API itself
// goes through API_BASE below, which is this domain's own /v1 (proxied to 7api by the worker).
const API_URL = (import.meta.env.VITE_API_URL || 'https://lenar-api.up.railway.app').replace(/\/$/, '')

export const configured = Boolean(import.meta.env.VITE_API_URL)
if (!configured) console.warn('VITE_API_URL is not set: copy .env.example to .env and fill it in.')

/** Base URL customers point their SDK at. Your domain (proxied to 7api by the Cloudflare worker). */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://lenar.ai/v1').replace(/\/$/, '')

/** Customer price ÷ 7api cost. Must match CREDIT_MARKUP on the server and the worker. */
export const MARKUP = Math.max(1, Number(import.meta.env.VITE_CREDIT_MARKUP) || 1)

const TOKEN_KEY = 'lenar_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

let listeners = new Set()
/** Current session: undefined while loading, null when signed out, {user} when signed in. */
export function useSession() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) return setSession(null)
      try {
        const { user } = await api('/auth/me')
        if (!cancelled) setSession({ user, token })
      } catch {
        setToken(null)
        if (!cancelled) setSession(null)
      }
    }
    load()
    listeners.add(load)
    return () => { cancelled = true; listeners.delete(load) }
  }, [])
  return session
}

/** Call after sign-in/sign-up/sign-out so every mounted useSession() picks up the change. */
function notifySessionChanged() {
  listeners.forEach((fn) => fn())
}

/** Calls the backend. Attaches the bearer token automatically. Throws with the server's own error message. */
export async function api(path, body) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const auth = {
  async signUp(email, password) {
    const { token } = await api('/auth/signup', { email, password })
    setToken(token)
    notifySessionChanged()
  },
  async signIn(email, password) {
    const { token } = await api('/auth/login', { email, password })
    setToken(token)
    notifySessionChanged()
  },
  signInWithGoogle() {
    window.location.href = `${API_URL}/auth/google`
  },
  async forgotPassword(email) {
    await api('/auth/forgot-password', { email })
  },
  async resetPassword(resetToken, password) {
    const { token } = await api('/auth/reset-password', { token: resetToken, password })
    setToken(token)
    notifySessionChanged()
  },
  signOut() {
    setToken(null)
    notifySessionChanged()
  },
}

/** Public status endpoint URL (no auth), or null if the backend isn't configured yet. */
export const statusUrl = () => (configured ? `${API_URL}/status` : null)
