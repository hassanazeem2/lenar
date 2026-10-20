# Setting up lenar

This gets the site live with working sign-in, payments and API keys.

**How it fits together**

- **Cloudflare Workers** hosts the website (`dist/`, the Vite build) and the `/v1` API proxy, which forwards your customers' requests to 7api. Both are served by one Worker (`worker/src/index.js`).
- **Railway** runs the backend: a Node/Express server (`server/`) plus a Postgres database, handling sign-in, payments and keys.
- **Stripe** takes payments. When a customer pays, the webhook creates their 7api subkey funded with the credit, or tops up the one they already have.
- **7api** runs the models. Each customer gets one subkey, funded from your 7api main balance.

**Your margin:** `CREDIT_MARKUP` sets it. With `1.25`, a customer who pays $10 gets $8 of 7api credit, and every price and balance they see is 7api's number × 1.25. Stripe's fee (about 2.9% + 30¢) comes out of your margin, so don't set it near 1. `CREDIT_MARKUP` must be the same value on the Railway backend, the Cloudflare worker, and the frontend's `VITE_CREDIT_MARKUP`.

---

## 1. Railway — backend + database

1. Create a new project at [railway.app](https://railway.app), and inside it: **New → Database → PostgreSQL**.
2. Add a second service in the same project: **New → GitHub Repo** (or **Empty Service** + deploy from this folder), pointing at the `server/` directory. Railway auto-detects it as Node via `railway.json`.
3. On the backend service, open **Variables** and set everything in `server/.env.example` *except* `DATABASE_URL`:
   - `DATABASE_URL` — click **Variables → Add Reference** and point it at the Postgres service's `DATABASE_URL`. Railway wires this up for you.
   - `JWT_SECRET` — `openssl rand -hex 32`
   - `KEY_ENCRYPTION_SECRET` — `openssl rand -base64 32`. **Back this up somewhere safe.** If it's lost, stored keys can't be read, so dashboards can't show usage until customers roll their keys.
   - `SITE_URL` — your domain, e.g. `https://lenar.ai` (no trailing slash)
   - `API_BASE_URL` — this backend's own public URL, e.g. `https://lenar-server-production.up.railway.app` (Railway shows it under **Settings → Networking → Public Networking**, or use your own custom domain)
   - `UPSTREAM_MAIN_KEY` — your 7api **main** key
   - `CREDIT_MARKUP` — e.g. `1.25`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — from step 2 below
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, see step 3
   - `RESEND_API_KEY` / `EMAIL_FROM` — optional; without these, verification and password-reset emails are just logged, not sent
4. Deploy. The start command (`npm run migrate && npm start`) creates the tables automatically on first boot and on every deploy after.

## 2. Stripe

1. Get your secret key from the Stripe dashboard (Developers → API keys). Use `sk_test_…` until everything works.
2. Add a webhook (Developers → Webhooks → Add endpoint):
   - URL: `https://YOUR_RAILWAY_API_URL/stripe-webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - Copy the **signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` on Railway.

## 3. Google sign-in (optional)

1. In Google Cloud Console, create an OAuth client (type: Web application).
2. Authorized redirect URI: `https://YOUR_RAILWAY_API_URL/auth/google/callback`
3. Put the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Railway. Leave them blank to disable the "Continue with Google" button (the backend just won't redirect anywhere useful).

## 4. Cloudflare — frontend + /v1 proxy

1. `wrangler.json` at the repo root is already set up: static assets from `dist/`, SPA fallback, and the Worker script at `worker/src/index.js` handling `/v1/*`.
2. Add these as **secrets** on the Worker (Cloudflare dashboard → your Worker → Settings → Variables, or `wrangler secret put`): nothing needed here beyond what's already in `wrangler.json`'s `vars` — `UPSTREAM_BASE_URL` and `CREDIT_MARKUP` are plain vars there, not secrets, since neither is sensitive.
3. Set these as **plain environment variables at build time** (`.env` locally, or in your CI/deploy step — Vite bakes `VITE_` vars in at build time, so they must be present when `npm run build` runs):

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | your Railway backend's public URL, e.g. `https://lenar-server-production.up.railway.app` |
   | `VITE_API_BASE_URL` | `https://YOUR_DOMAIN/v1` (your Cloudflare domain + `/v1`) |
   | `VITE_CREDIT_MARKUP` | same as `CREDIT_MARKUP` on Railway |

4. Deploy: `npm run deploy` (runs `vite build && wrangler deploy`). The first time, `wrangler login` to authenticate.
5. **Domain:** add your custom domain to the Worker under **Settings → Domains & Routes**. The Worker answers both the site and `/v1/*` on it.
6. Redeploy after changing any `VITE_` variable — they're baked in at build time, not read at runtime.

## 5. Test it end to end

1. Sign up on the live site.
2. In the dashboard, go to **Billing** and click **+ $10**. Pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC).
3. Within a few seconds you're back on Billing and the payment shows **Added**. **API key** now has **Reveal key**.
4. Reveal it and try it:
   ```bash
   curl https://YOUR_DOMAIN/v1/chat/completions \
     -H "Authorization: Bearer THE_KEY" -H "Content-Type: application/json" \
     -d '{"model":"gpt-6-luna","messages":[{"role":"user","content":"hi"}]}'
   ```
5. Refresh **Overview**: spend and tokens update. The daily chart fills in over the following days.

Then switch Stripe to live keys (`STRIPE_SECRET_KEY`, plus a live-mode webhook and its new `whsec_`) and redeploy the Railway service.

## Running it

- **Keep your 7api main balance funded.** Every customer top-up moves money from it into their subkey. If it runs short, funding fails. The customer has paid but sees "Processing", and Stripe keeps retrying for 3 days, so topping up 7api fixes it automatically. Watch the Railway logs for `ACTION NEEDED`.
- **The limit is 200 active subkeys per 7api account** (one per paying customer).
- **Refunds:** refund in Stripe, then take the credit back with 7api's withdraw endpoint (`POST /v1/subkeys/{id}/withdraw`). The subkey id is in the backend's `api_keys` table.
- **Local development, frontend:** `cp .env.example .env`, fill in the `VITE_` values, then `npm run dev`. Without them, the dashboard shows demo data and the status page shows the built-in snapshot.
- **Local development, backend:** `cd server`, `cp .env.example .env`, fill it in (a local Postgres via `DATABASE_URL`, or Railway's), then `npm install && npm run migrate && npm run dev`.
