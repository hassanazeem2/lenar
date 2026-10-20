import { stripe, admin, activeKey, creditFor } from '../_shared/clients.ts'
import { createSubkey, topupSubkey, withBusyRetry, UpstreamError } from '../_shared/upstream.ts'
import { encrypt } from '../_shared/crypto.ts'

const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

// Stripe retries any non-2xx for up to 3 days, so transient failures (7api busy, our 7api
// balance too low) heal themselves once fixed. claim_topup makes sure each payment funds once.
Deno.serve(async (req) => {
  const body = await req.text()
  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, req.headers.get('stripe-signature')!, SECRET)
  } catch {
    return new Response('bad signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return new Response('ignored')
  }
  const session = event.data.object
  if (session.payment_status !== 'paid') return new Response('not paid yet')

  const userId = session.metadata?.user_id
  const paid = session.amount_total
  if (!userId || !paid) return new Response('missing metadata', { status: 400 })
  const credit = creditFor(paid)

  const { data: claim, error } = await admin.rpc('claim_topup', {
    p_session: session.id, p_user: userId, p_paid: paid, p_credit: credit,
  })
  if (error) return new Response(error.message, { status: 500 })
  if (claim === 'funded') return new Response('already funded')
  if (claim === 'busy') return new Response('in progress', { status: 409 }) // Stripe retries later

  try {
    const key = await activeKey(userId)
    if (key) {
      await withBusyRetry(() => topupSubkey(key.subkey_id, credit))
    } else {
      // First purchase: mint the customer's subkey funded with this payment.
      const sub = await createSubkey(credit, `lenar:${userId}`)
      if (!sub.api_key) throw new Error('7api did not return api_key for the new subkey')
      const { error: insErr } = await admin.from('api_keys').insert({
        user_id: userId,
        subkey_id: sub.id,
        key_prefix: `${sub.api_key.slice(0, 10)}…${sub.api_key.slice(-4)}`,
        secret_enc: await encrypt(sub.api_key),
      })
      if (insErr) throw insErr
    }
    await admin.from('topups').update({ funded_at: new Date().toISOString() }).eq('stripe_session_id', session.id)
  } catch (e) {
    // Release the claim so the retry can try again straight away.
    await admin.from('topups').update({ claimed_at: null }).eq('stripe_session_id', session.id)
    const why = e instanceof UpstreamError ? `${e.status} ${e.code}` : String(e)
    console.error(`funding failed for ${session.id} (user ${userId}): ${why}`)
    if (e instanceof UpstreamError && e.code === 'insufficient_balance') {
      console.error('ACTION NEEDED: your 7api main balance is too low to fund customer top-ups. Top it up at 7api.')
    }
    return new Response('funding failed', { status: 500 })
  }

  return new Response('ok')
})
