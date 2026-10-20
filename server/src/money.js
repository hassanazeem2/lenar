// Customer price ÷ 7api cost. 1.25 means a customer paying $10 gets $8 of 7api credit, and
// every dollar figure shown to them is 7api's number × 1.25. Must match VITE_CREDIT_MARKUP
// on the frontend and CREDIT_MARKUP on the Cloudflare /v1 proxy worker.
export const MARKUP = Math.max(1, Number(process.env.CREDIT_MARKUP) || 1)

/** Cents the customer paid → cents of 7api credit to fund. */
export const creditFor = (paidCents) => Math.floor(paidCents / MARKUP)

/** A 7api dollar amount → what we show the customer. */
export const display = (usd) => (usd == null ? null : Math.round(usd * MARKUP * 1e6) / 1e6)
