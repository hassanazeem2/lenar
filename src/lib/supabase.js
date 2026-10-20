import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until .env has the Supabase keys. Pages fall back to demo data. */
export const configured = Boolean(url && anon)
if (!configured) console.warn('Supabase is not configured: copy .env.example to .env and fill it in.')

// A placeholder lets the marketing pages render before Supabase is set up.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder')

/** Base URL customers point their SDK at. Your domain (proxied to 7api by api/v1) by default. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.lenar.ai/v1').replace(/\/$/, '')

/** Customer price ÷ 7api cost. Must match CREDIT_MARKUP on the server. */
export const MARKUP = Math.max(1, Number(import.meta.env.VITE_CREDIT_MARKUP) || 1)

/** Calls an edge function as the signed-in user. Surfaces the function's own error message. */
export async function callFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, body === undefined ? { method: 'GET' } : { body })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* not JSON */ }
    throw new Error(msg)
  }
  return data
}

/** Public edge function URL (no auth), e.g. for the status page. */
export const fnUrl = (name) => (configured ? `${url}/functions/v1/${name}` : null)

/** Current session: undefined while loading, null when signed out. */
export function useSession() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    if (!configured) { setSession(null); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}
