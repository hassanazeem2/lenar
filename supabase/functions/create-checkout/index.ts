import { stripe, cors, json, requireUser } from '../_shared/clients.ts'

// Top-up amounts the dashboard offers, in cents. Anything else is rejected.
const AMOUNTS = new Set([1000, 2500, 5000, 10000])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const user = await requireUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  const { amount_cents } = await req.json().catch(() => ({}))
  if (!AMOUNTS.has(amount_cents)) return json({ error: 'invalid amount' }, 400)

  const site = Deno.env.get('SITE_URL')!
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amount_cents,
        product_data: { name: `lenar credits — $${amount_cents / 100}` },
      },
    }],
    metadata: { user_id: user.id, amount_cents: String(amount_cents) },
    success_url: `${site}/dashboard/billing?topup=success`,
    cancel_url: `${site}/dashboard/billing`,
  })

  return json({ url: session.url })
})
