// SITE_URL may be one origin, or several separated by commas. The live domains below
// are always allowed, so signup keeps working when a domain is added before the
// variable is updated. lenar.cc is the canonical site when it is in the list.
const ALWAYS = ['https://lenar.cc', 'https://www.lenar.cc', 'https://lenar.pages.dev']
const fromEnv = (process.env.SITE_URL || '').split(',').map((s) => s.trim()).filter(Boolean)
const siteOrigins = [...fromEnv]
for (const origin of ALWAYS) {
  if (!siteOrigins.includes(origin)) siteOrigins.push(origin)
}

export { siteOrigins }
export const siteUrl = (siteOrigins.includes('https://lenar.cc') ? 'https://lenar.cc' : siteOrigins[0]) || ''
