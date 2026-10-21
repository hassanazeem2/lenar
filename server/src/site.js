// SITE_URL may be one origin, or several separated by commas. The first is the
// canonical site (email links, Stripe return URLs, OAuth redirects). The rest
// are extra browser origins allowed by CORS.
const origins = (process.env.SITE_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const siteOrigins = origins.length ? origins : ['*']
export const siteUrl = origins[0] || ''
