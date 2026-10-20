import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

// Service role: bypasses RLS. Only used server side.
export const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

/**
 * Customer price ÷ 7api cost. 1.25 means a customer paying $10 gets $8 of 7api credit,
 * and every dollar figure shown to them is 7api's number × 1.25. Must match VITE_CREDIT_MARKUP.
 */
export const MARKUP = Math.max(1, Number(Deno.env.get('CREDIT_MARKUP') ?? '1') || 1)

/** Cents the customer paid → cents of 7api credit to fund. */
export const creditFor = (paidCents: number) => Math.floor(paidCents / MARKUP)

/** A 7api dollar amount → what we show the customer. */
export const display = (usd: number | null | undefined) => (usd == null ? null : Math.round(usd * MARKUP * 1e6) / 1e6)

export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } })
}

/** Resolves the signed-in user from the request's bearer token. */
export async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user
}

/** The user's active key row, if any. */
export async function activeKey(userId: string) {
  const { data, error } = await admin.from('api_keys')
    .select('*').eq('user_id', userId).is('revoked_at', null).maybeSingle()
  if (error) throw error
  return data
}
