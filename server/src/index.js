import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import accountRoutes from './routes/account.js'
import rollKeyRoutes from './routes/rollKey.js'
import revealKeyRoutes from './routes/revealKey.js'
import checkoutRoutes from './routes/checkout.js'
import stripeWebhookRoutes from './routes/stripeWebhook.js'
import statusRoutes from './routes/status.js'
import { siteOrigins } from './site.js'

for (const k of ['DATABASE_URL', 'JWT_SECRET', 'KEY_ENCRYPTION_SECRET', 'UPSTREAM_MAIN_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SITE_URL']) {
  if (!process.env[k]) console.warn(`[config] ${k} is not set — some routes will fail`)
}

const app = express()
app.set('trust proxy', 1)

app.use(cors({ origin: siteOrigins, credentials: false }))

// Stripe needs the raw body to verify its signature, so this is mounted before express.json()
// and given its own raw-body parser instead of the JSON one.
app.use('/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes)

app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/auth', authRoutes)
app.use('/account', accountRoutes)
app.use('/roll-key', rollKeyRoutes)
app.use('/reveal-key', revealKeyRoutes)
app.use('/create-checkout', checkoutRoutes)
app.use('/status', statusRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'internal error' })
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`lenar-server listening on ${port}`))
