/** Catalog from 7api status probes. Rates are $/M tokens, shown with our markup applied. */
import { MARKUP } from './src/lib/api.js'

// `discount` is how far 7api's price sits below the provider's official list price.
// From it we derive the official price, then compute what the customer actually saves
// after our markup, so "x% below official" stays true whatever CREDIT_MARKUP is.
function card(id, upstreamPrice, opts = {}) {
  const upstreamDiscount = opts.discount ?? 20
  const official = +(upstreamPrice / (1 - upstreamDiscount / 100)).toFixed(4)
  const price = +(upstreamPrice * MARKUP).toFixed(4)
  const savings = Math.round((1 - price / official) * 100)
  const input = price
  const output = opts.output ?? +(price * 4).toFixed(3)
  const cacheWrite = opts.cacheWrite ?? +(price * 1.25).toFixed(3)
  const cacheRead = opts.cacheRead ?? +Math.max(0.001, price * 0.05).toFixed(3)
  const hi = opts.hi ?? 2
  return {
    id,
    name: opts.name ?? id,
    discount: savings, // % below official, after markup (can be ≤ 0 if the markup is too high)
    official,          // official input price, $/M tokens
    availability: opts.availability ?? 100,
    latency: opts.latency ?? '—',
    tier: opts.tier ?? 'Up to 200k full input tokens',
    rates: { input, output, cacheWrite, cacheRead },
    compareTier: opts.compareTier ?? 'Above 200k full input tokens',
    compare: {
      input: +(input * hi).toFixed(3),
      output: +(output * hi).toFixed(3),
      cacheWrite: +(cacheWrite * hi).toFixed(3),
      cacheRead: +(cacheRead * hi).toFixed(3),
    },
  }
}

// Latest probe set (35 up) — Oct 20 status
export const CATALOG = [
  // Gemini
  { family: 'gemini', ...card('gemini-4-argon', 0.25, { name: 'Gemini 4 Argon', availability: 100, latency: '27s', discount: 18 }) },

  // GPT
  { family: 'gpt', ...card('gpt-6-astra', 0.45, { name: 'GPT 6 Astra', availability: 100, latency: '11.5s', discount: 15 }) },
  { family: 'gpt', ...card('gpt-6.1-sol', 0.15, { name: 'GPT 6.1 Sol', availability: 100, latency: '17.6s', discount: 22 }) },
  { family: 'gpt', ...card('gpt-6-sol', 0.15, { name: 'GPT 6 Sol', availability: 100, latency: '2s', discount: 22 }) },
  { family: 'gpt', ...card('gpt-6-luna', 0.05, { name: 'GPT 6 Luna', availability: 100, latency: '4.3s', discount: 28 }) },
  { family: 'gpt', ...card('gpt-5.6-sol', 0.45, { name: 'GPT 5.6 Sol', availability: 100, latency: '3.4s', discount: 15 }) },
  { family: 'gpt', ...card('gpt-5.6-terra', 0.45, { name: 'GPT 5.6 Terra', availability: 100, latency: '1.8s', discount: 15 }) },
  { family: 'gpt', ...card('gpt-5.6-luna', 0.45, { name: 'GPT 5.6 Luna', availability: 100, latency: '14.7s', discount: 15 }) },
  { family: 'gpt', ...card('gpt-5.5', 0.45, { name: 'GPT 5.5', availability: 100, latency: '2.2s', discount: 15 }) },

  // Claude
  { family: 'claude', ...card('claude-fable-5', 0.45, { name: 'Claude Fable 5', availability: 100, latency: '6s', discount: 18 }) },
  { family: 'claude', ...card('claude-haiku-5-5', 0.03, { name: 'Claude Haiku 5.5', availability: 100, latency: '35.5s', discount: 30 }) },
  { family: 'claude', ...card('claude-sonnet-5', 0.45, { name: 'Claude Sonnet 5', availability: 95, latency: '4s', discount: 18 }) },
  { family: 'claude', ...card('claude-sonnet-5-5', 0.5, { name: 'Claude Sonnet 5.5', availability: 100, latency: '11.6s', discount: 16 }) },
  { family: 'claude', ...card('claude-opus-4-6', 0.45, { name: 'Claude Opus 4.6', availability: 100, latency: '7.7s', discount: 18 }) },
  { family: 'claude', ...card('claude-opus-4-7', 0.45, { name: 'Claude Opus 4.7', availability: 100, latency: '11s', discount: 18 }) },
  { family: 'claude', ...card('claude-opus-4-8', 0.45, { name: 'Claude Opus 4.8', availability: 100, latency: '13.6s', discount: 18 }) },
  { family: 'claude', ...card('claude-opus-5', 0.45, { name: 'Claude Opus 5', availability: 85, latency: '36s', discount: 18 }) },
  { family: 'claude', ...card('claude-opus-5-5', 0.7, { name: 'Claude Opus 5.5', availability: 100, latency: '4.9s', discount: 14 }) },

  // GLM
  { family: 'glm', ...card('glm-5.2', 0.06, { name: 'GLM 5.2', availability: 100, latency: '5s', discount: 25 }) },
  { family: 'glm', ...card('glm-5.3', 0.06, { name: 'GLM 5.3', availability: 100, latency: '8.7s', discount: 25 }) },
  { family: 'glm', ...card('glm-5.3-uncensored', 0.06, { name: 'GLM 5.3 Uncensored', availability: 100, latency: '8.7s', discount: 25 }) },
  { family: 'glm', ...card('glm-5.3-flash', 0.028, { name: 'GLM 5.3 Flash', availability: 100, latency: '10.9s', discount: 28 }) },
  { family: 'glm', ...card('glm-5.3-flash-uncensored', 0.028, { name: 'GLM 5.3 Flash Uncensored', availability: 100, latency: '14.6s', discount: 28 }) },
  { family: 'glm', ...card('glm-5.3-abliterated', 0.75, { name: 'GLM 5.3 Abliterated', availability: 100, latency: '189.2s', discount: 12 }) },
  { family: 'glm', ...card('glm-5.3-flash-abliterated', 0.22, { name: 'GLM 5.3 Flash Abliterated', availability: 100, latency: '9.1s', discount: 20 }) },

  // DeepSeek
  { family: 'deepseek', ...card('deepseek-v4.1-flash', 0.02, { name: 'DeepSeek V4.1 Flash', availability: 100, latency: '7.9s', discount: 30 }) },
  { family: 'deepseek', ...card('deepseek-v4.1-flash-1017', 0.02, { name: 'DeepSeek V4.1 Flash 1017', availability: 100, latency: '22.7s', discount: 30 }) },
  { family: 'deepseek', ...card('deepseek-v4.1-flash-abliterated', 0.35, { name: 'DeepSeek V4.1 Flash Abliterated', availability: 95, latency: '17.2s', discount: 18 }) },
  { family: 'deepseek', ...card('deepseek-v4-flash-0731', 0.03, { name: 'DeepSeek V4 Flash 0731', availability: 100, latency: '3.6s', discount: 28 }) },
  { family: 'deepseek', ...card('deepseek-v4-pro-0813', 0.25, { name: 'DeepSeek V4 Pro 0813', availability: 100, latency: '5.2s', discount: 20 }) },
  { family: 'deepseek', ...card('deepseek-v4-pro-uncensored', 0.25, { name: 'DeepSeek V4 Pro Uncensored', availability: 100, latency: '4.3s', discount: 20 }) },

  // Grok
  { family: 'grok', ...card('grok-4.7', 0.1, { name: 'Grok 4.7', availability: 100, latency: '13.9s', discount: 22 }) },
  { family: 'grok', ...card('grok-4.6', 0.1, { name: 'Grok 4.6', availability: 100, latency: '11.9s', discount: 22 }) },
  { family: 'grok', ...card('grok-4.5', 0.1, { name: 'Grok 4.5', availability: 100, latency: '10.7s', discount: 22 }) },

  // Kimi
  { family: 'kimi', ...card('kimi-k3', 0.15, { name: 'Kimi K3', availability: 100, latency: '3.8s', discount: 20 }) },
]

export const FAMILY_ORDER = [
  { id: 'gpt', label: 'GPT Models' },
  { id: 'claude', label: 'Claude Models' },
  { id: 'gemini', label: 'Gemini Models' },
  { id: 'deepseek', label: 'DeepSeek Models' },
  { id: 'glm', label: 'GLM Models' },
  { id: 'grok', label: 'Grok Models' },
  { id: 'kimi', label: 'Kimi Models' },
]

export const FAMILIES = FAMILY_ORDER.map((f) => ({
  ...f,
  models: CATALOG.filter((m) => m.family === f.id),
}))

export const MODEL_COUNT = CATALOG.length
export const AVG_AVAILABILITY = Math.round(
  (CATALOG.reduce((s, m) => s + m.availability, 0) / CATALOG.length) * 10,
) / 10
export const PROVIDER_COUNT = FAMILY_ORDER.filter((f) =>
  CATALOG.some((m) => m.family === f.id),
).length
