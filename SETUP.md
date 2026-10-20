# Setting up lenar

This gets the site live with working sign-in, payments and API keys. It takes about 30 minutes.

**How it fits together**

- **Vercel** hosts the website and the `/v1` API proxy, which forwards your customers' requests to 7api.
- **Supabase** handles sign-in, the database and the backend functions (payments, keys, dashboard data, live status).
- **Stripe** takes payments. When a customer pays, the webhook creates their 7api subkey funded with the credit, or tops up the one they already have.
- **7api** runs the models. Each customer gets one subkey, funded from your 7api main balance.

**Your margin:** `CREDIT_MARKUP` sets it. With `1.25`, a customer who pays $10 gets $8 of 7api credit, and every price and balance they see is 7api's number × 1.25. Stripe's fee (about 2.9% + 30¢) comes out of your margin, so don't set it near 1.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Note the **Project URL**, the **anon key** and the **project ref** (Settings → API).
2. Install the CLI and link the project:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref YOUR_REF
   ```
3. Create the tables:
   ```bash
   supabase db push
   ```
4. **Auth settings** (Dashboard → Authentication):
   - **URL Configuration:** set Site URL to `https://YOUR_DOMAIN`. Add these redirect URLs: `https://YOUR_DOMAIN/dashboard`, `https://YOUR_DOMAIN/reset-password`, `http://localhost:5173/**`.
   - **Providers → Google** (optional): paste a Google OAuth client ID and secret. In Google Cloud, the authorized redirect URI is `https://YOUR_REF.supabase.co/auth/v1/callback`.
   - **Emails:** the built-in sender is heavily rate-limited. Before launch, add your own SMTP (Resend, Postmark and so on) under Authentication → SMTP.

## 2. Stripe

1. Get your secret key from the Stripe dashboard (Developers → API keys). Use `sk_test_…` until everything works.
2. Add a webhook (Developers → Webhooks → Add endpoint):
   - URL: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - Copy the **signing secret** (`whsec_…`).

## 3. Backend functions

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  SITE_URL=https://YOUR_DOMAIN \
  UPSTREAM_MAIN_KEY=YOUR_7API_MAIN_KEY \
  CREDIT_MARKUP=1.25 \
  KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

supabase functions deploy
```

Back up `KEY_ENCRYPTION_SECRET` somewhere safe (a password manager). If it's lost, stored keys can't be read, so dashboards can't show usage until customers roll their keys.

## 4. Vercel

1. Push this folder to a GitHub repo and import it at [vercel.com/new](https://vercel.com/new). The framework is detected from `vercel.json`.
2. Add these environment variables (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon key |
   | `VITE_API_BASE_URL` | `https://api.YOUR_DOMAIN/v1` (or `https://YOUR_DOMAIN/v1`) |
   | `VITE_CREDIT_MARKUP` | same as `CREDIT_MARKUP` |
   | `CREDIT_MARKUP` | same value |

3. **Domains:** add `YOUR_DOMAIN`, and also `api.YOUR_DOMAIN` if you want that as the API address. Both point at the same project. The proxy answers on `/v1/*` for either.
4. Redeploy after changing any `VITE_` variable, because they're baked in at build time.

## 5. Test it end to end

1. Sign up on the live site and confirm your email.
2. In the dashboard, go to **Billing** and click **+ $10**. Pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC).
3. Within a few seconds you're back on Billing and the payment shows **Added**. **API key** now has **Reveal key**.
4. Reveal it and try it:
   ```bash
   curl https://api.YOUR_DOMAIN/v1/chat/completions \
     -H "Authorization: Bearer THE_KEY" -H "Content-Type: application/json" \
     -d '{"model":"gpt-6-luna","messages":[{"role":"user","content":"hi"}]}'
   ```
5. Refresh **Overview**: spend and tokens update. The daily chart fills in over the following days.

Then switch Stripe to live keys (`STRIPE_SECRET_KEY`, plus a live-mode webhook and its new `whsec_`) and run `supabase functions deploy` again.

## Running it

- **Keep your 7api main balance funded.** Every customer top-up moves money from it into their subkey. If it runs short, funding fails. The customer has paid but sees "Processing", and Stripe keeps retrying for 3 days, so topping up 7api fixes it automatically. Watch the logs under Supabase → Edge Functions → stripe-webhook for `ACTION NEEDED`.
- **The limit is 200 active subkeys per 7api account** (one per paying customer).
- **Refunds:** refund in Stripe, then take the credit back with 7api's withdraw endpoint (`POST /v1/subkeys/{id}/withdraw`). The subkey id is in the `api_keys` table.
- **Local development:** `cp .env.example .env`, fill in the `VITE_` values, then `npm run dev`. Without them, the dashboard shows demo data and the status page shows the built-in snapshot.
