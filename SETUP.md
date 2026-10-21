# Setting up lenar

This gets the site live with working sign-in, payments and API keys.

**How it fits together**

- **Cloudflare Pages** hosts the website (`dist/`, the Vite build) and the `/v1` API proxy, which forwards your customers' requests to 7api. Both are served by one `_worker.js` ("advanced mode"), built automatically from `worker/src/index.js` by `npm run build`.
- **Railway** runs the backend: a Node/Express server (`server/`) plus a Postgres database, handling sign-in, payments and keys.
- **Stripe** takes card payments. **WolvPay** takes crypto. When either payment confirms, the webhook creates their 7api subkey funded with the credit, or tops up the one they already have.
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

## 2b. Crypto (WolvPay)

Customers pick the coin on a WolvPay invoice. Credit is added only when the webhook says the invoice is `PAID`.

1. In the WolvPay dashboard, copy the API key and the webhook secret.
2. Set the webhook URL to `https://lenar-production.up.railway.app/crypto-webhook`. WolvPay signs each delivery with `X-WolvPay-Signature`. Their requests come from `128.140.76.192`.
3. On the Railway service set `WOLVPAY_API_KEY` and `WOLVPAY_WEBHOOK_SECRET`, then redeploy. Billing offers **Crypto** next to **Card**. The same amounts apply, and the key is still created on the first confirmed payment.

A refund in WolvPay does not remove credit by itself. Take it back with 7api's withdraw endpoint, the same as a Stripe refund.

## 3. Google sign-in (optional)

1. In Google Cloud Console, create an OAuth client (type: Web application).
2. Authorized redirect URI: `https://YOUR_RAILWAY_API_URL/auth/google/callback`
3. Put the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Railway. Leave them blank to disable the "Continue with Google" button (the backend just won't redirect anywhere useful).

## 4. Cloudflare Pages — frontend + /v1 proxy

`npm run build` runs `vite build` and then copies `worker/src/index.js` to `dist/_worker.js`. That file is Pages' ["advanced mode"](https://developers.cloudflare.com/pages/functions/advanced-mode/): Pages serves everything in `dist/` as static assets, except `_worker.js` runs as a real Worker in front of them, which is how `/v1/*` gets proxied to 7api while everything else falls through to the static site.

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick `hassanazeem2/lenar`.
2. Build settings:
   - **Framework preset:** None (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Leave **Root directory** as `/` (the repo root — `package.json` lives there).
3. Add these as **environment variables** on the Pages project (Settings → Environment variables), for both Production and Preview:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | your Railway backend's public URL, e.g. `https://lenar-server-production.up.railway.app` |
   | `VITE_API_BASE_URL` | `https://YOUR_DOMAIN/v1` (your Cloudflare domain + `/v1`) |
   | `VITE_CREDIT_MARKUP` | same as `CREDIT_MARKUP` on Railway |
   | `UPSTREAM_BASE_URL` | `https://7api.st/v1` |
   | `CREDIT_MARKUP` | same value, e.g. `1.25` (used by `_worker.js` at request time, not just at build time) |

   The `VITE_` ones are baked in at build time; `UPSTREAM_BASE_URL` and `CREDIT_MARKUP` are read by `_worker.js` at runtime, so both need to be set here even though they overlap with the build-time ones.
4. Click **Save and Deploy**. Pages builds and deploys automatically on every push to `main` after this.
5. **Domain:** add your custom domain under the Pages project's **Custom domains** tab. It answers both the site and `/v1/*`.
6. Redeploy after changing any `VITE_` variable (trigger a new deployment from the dashboard, or push a commit) — they're baked in at build time, not read at runtime.

If you'd rather deploy from your own machine instead of connecting Git, `npm run pages:deploy` does the same build and runs `wrangler pages deploy dist --project-name=lenar` (first time, run `wrangler login`).

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
