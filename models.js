/** Model catalog. Prices are 7api's real rates × our markup, in $ per million tokens.
 *
 * 7api publishes two rates per model: a standard rate per million tokens, and a lower rate for
 * cached input. Those are the only prices shown anywhere on the site. The live numbers come from
 * our backend's /status (already marked up there); SNAPSHOT is the fallback before it answers. */
import { useEffect, useState } from 'react'
import { MARKUP } from './src/lib/api.js'

// [id, 7api standard $/M, 7api cached-input $/M, availability %, avg latency s, status]
// Taken from 7api /v1/status on Oct 21.
const SNAPSHOT = [
  ['gpt-6-astra', 0.45, 0.04, 100, 4.6, 'up'],
  ['gpt-6.1-sol', 0.15, 0.04, 100, 4.7, 'up'],
  ['gpt-6-sol', 0.15, 0.04, 100, 19.4, 'up'],
  ['gpt-6-luna', 0.05, 0.01, 95, 48.3, 'up'],
  ['gpt-5.6-sol', 0.45, 0.04, 100, 7.3, 'down'],
  ['gpt-5.6-terra', 0.45, 0.04, 100, 8.1, 'up'],
  ['gpt-5.6-luna', 0.45, 0.04, 65, 5.1, 'up'],
  ['gpt-5.5', 0.45, 0.04, 100, 2.3, 'up'],
  ['claude-fable-5', 0.45, 0.04, 100, 19.8, 'up'],
  ['claude-haiku-5-5', 0.03, 0.01, 100, 4.8, 'up'],
  ['claude-sonnet-5', 0.45, 0.04, 75, 18.6, 'up'],
  ['claude-sonnet-5-5', 0.5, 0.06, 100, 6.4, 'up'],
  ['claude-opus-4-6', 0.45, 0.04, 95, 36.6, 'up'],
  ['claude-opus-4-7', 0.45, 0.04, 100, 2.5, 'up'],
  ['claude-opus-4-8', 0.45, 0.04, 100, 26.7, 'up'],
  ['claude-opus-5', 0.45, 0.04, 100, 29.9, 'up'],
  ['claude-opus-5-5', 0.7, 0.07, 100, 2.3, 'up'],
  ['gemini-4-argon', 0.25, 0.04, 80, 62.7, 'up'],
  ['glm-5.2', 0.06, 0.017, 100, 2.5, 'up'],
  ['glm-5.3', 0.06, 0.017, 100, 4.8, 'up'],
  ['glm-5.3-uncensored', 0.06, 0.017, 100, 46.6, 'up'],
  ['glm-5.3-flash', 0.028, 0.0028, 100, 5, 'up'],
  ['glm-5.3-flash-uncensored', 0.028, 0.0028, 100, 5, 'up'],
  ['glm-5.3-abliterated', 0.75, 0.22, 10, 1.3, 'down'],
  ['glm-5.3-flash-abliterated', 0.22, 0.06, 0, null, 'down'],
  ['deepseek-v4.1-flash', 0.02, 0.005, 100, 2.9, 'up'],
  ['deepseek-v4.1-flash-1017', 0.02, 0.005, 95, 28.6, 'up'],
  ['deepseek-v4.1-flash-1017-abliterated', 0.02, 0.005, 0, null, 'down'],
  ['deepseek-v4-flash-0731', 0.03, 0.0026, 100, 7.1, 'up'],
  ['deepseek-v4-pro-0813', 0.25, 0.05, 100, 46.1, 'up'],
  ['deepseek-v4-pro-uncensored', 0.25, 0.05, 95, 41.8, 'up'],
  ['grok-4.7', 0.1, 0.02, 0, null, 'down'],
  ['grok-4.6', 0.1, 0.02, 0, null, 'down'],
  ['grok-4.5', 0.1, 0.02, 0, null, 'down'],
  ['kimi-k3', 0.15, 0.03, 100, 26.2, 'up'],
  ['mimo-v2.6-pro', 0.1, 0.003, 100, 6.1, 'down'],
  ['mimo-v2.6-flash', 0.03, 0.002, 100, 6, 'down'],
]

export const FAMILY_ORDER = [
  { id: 'gpt', label: 'GPT Models', short: 'GPT' },
  { id: 'claude', label: 'Claude Models', short: 'Claude' },
  { id: 'gemini', label: 'Gemini Models', short: 'Gemini' },
  { id: 'deepseek', label: 'DeepSeek Models', short: 'DeepSeek' },
  { id: 'glm', label: 'GLM Models', short: 'GLM' },
  { id: 'grok', label: 'Grok Models', short: 'Grok' },
  { id: 'kimi', label: 'Kimi Models', short: 'Kimi' },
  { id: 'mimo', label: 'MiMo Models', short: 'MiMo' },
]

export const familyOf = (id) => FAMILY_ORDER.find((f) => id.startsWith(f.id))?.id ?? 'other'

const WORDS = { gpt: 'GPT', glm: 'GLM', deepseek: 'DeepSeek', mimo: 'MiMo', k3: 'K3' }
/** "claude-opus-5-5" → "Claude Opus 5.5", "deepseek-v4.1-flash" → "DeepSeek V4.1 Flash". */
export function modelName(id) {
  const parts = id.split('-')
  const out = []
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    // Claude writes versions as 5-5; join two single digits back into 5.5.
    if (/^\d$/.test(p) && /^\d$/.test(parts[i + 1] ?? '')) {
      out.push(`${p}.${parts[i + 1]}`)
      i++
      continue
    }
    out.push(WORDS[p] ?? (/^v\d/.test(p) ? p.toUpperCase() : /^\d/.test(p) ? p : p[0].toUpperCase() + p.slice(1)))
  }
  return out.join(' ')
}

const round = (v) => +v.toFixed(4)

function entry({ id, price, cacheRead, availability, latency, status }) {
  return {
    id,
    name: modelName(id),
    family: familyOf(id),
    price, // standard $/M tokens, what the customer pays
    cacheRead, // cached input $/M tokens
    availability,
    latencyS: latency,
    latency: latency == null ? '—' : `${latency}s`,
    status: status ?? 'unknown',
  }
}

export const CATALOG = SNAPSHOT.map(([id, p, c, availability, latency, status]) =>
  entry({ id, price: round(p * MARKUP), cacheRead: round(c * MARKUP), availability, latency, status }))

export const FAMILIES = FAMILY_ORDER.map((f) => ({ ...f, models: CATALOG.filter((m) => m.family === f.id) }))
export const MODEL_COUNT = CATALOG.length
export const PROVIDER_COUNT = FAMILY_ORDER.filter((f) => CATALOG.some((m) => m.family === f.id)).length
export const AVG_AVAILABILITY = Math.round((CATALOG.reduce((s, m) => s + (m.availability ?? 0), 0) / CATALOG.length) * 10) / 10

/* ---------- live catalog ---------- */

let cache = null
let inflight = null

async function fetchLive() {
  const res = await fetch('/api/status')
  const body = await res.json()
  if (!body.ok || !body.models?.length) throw new Error('status unavailable')
  return {
    live: !body.stale,
    checkedAt: body.checked_at,
    models: body.models
      .filter((m) => m.price_per_mtok != null)
      .map((m) => entry({
        id: m.model,
        price: m.price_per_mtok,
        cacheRead: m.cache_read_per_mtok ?? m.price_per_mtok,
        availability: m.availability_pct,
        latency: m.avg_latency_s == null ? null : Math.round(m.avg_latency_s * 10) / 10,
        status: m.status,
      })),
  }
}

/** The catalog with live prices and health. Starts on the snapshot, swaps to live when it lands. */
export function useLiveModels() {
  const [state, setState] = useState(cache ?? { live: false, checkedAt: null, models: CATALOG })
  useEffect(() => {
    if (cache) return
    let on = true
    inflight ??= fetchLive().then((v) => (cache = v)).finally(() => { inflight = null })
    inflight.then((v) => on && setState(v)).catch(() => {})
    return () => { on = false }
  }, [])
  return state
}
