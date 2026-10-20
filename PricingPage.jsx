import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import {
  C, cn, SHELL, AIR, STYLES, Nav, Footer, GlassFrame, Title, Reveal, SectionIcon,
} from './SimpleLanding.jsx'
import { FAMILIES } from './models.js'

const RATE_ROWS = [
  ['Input', 'input'],
  ['Text output', 'output'],
  ['Cache write', 'cacheWrite'],
  ['Cache read', 'cacheRead'],
]

function fmt(n) {
  const s = n < 0.1 ? n.toFixed(3) : n.toFixed(2)
  return `$${s}/M tokens`
}

function RateTable({ rates }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
      {RATE_ROWS.map(([label, key]) => (
        <div key={key} className="contents">
          <div className="text-xs uppercase tracking-wider" style={{ color: C.faint, fontSize: 10 }}>{label}</div>
          <div className="text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(244,245,246,0.85)' }}>{fmt(rates[key])}</div>
        </div>
      ))}
    </div>
  )
}

function ModelCard({ model }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border p-5 text-left" style={{ borderColor: C.line, background: C.card }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium" style={{ fontSize: 16, color: 'rgba(244,245,246,0.92)' }}>{model.name}</h3>
          <p className="mt-0.5 font-mono text-xs" style={{ color: C.faint }}>{model.id}</p>
        </div>
        {model.discount > 0 ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs"
            style={{ color: C.up, background: 'rgba(74,222,128,0.1)', fontVariantNumeric: 'tabular-nums' }}
          >
            {model.discount}% below official
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: C.dim }}>
        The rate is selected from the full input context, including cached input tokens.
      </p>
      <p className="mt-4 text-sm font-medium" style={{ color: 'rgba(244,245,246,0.85)' }}>{model.tier}</p>
      <RateTable rates={model.rates} />
      <div className="mt-4 border-t" style={{ borderColor: C.line }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 py-3 text-left outline-none"
        >
          <span className="text-sm" style={{ color: 'rgba(244,245,246,0.7)' }}>Compare official pricing</span>
          <Plus size={16} className="shrink-0 transition-transform duration-300" style={{ color: C.faint, transform: open ? 'rotate(45deg)' : 'none' }} />
        </button>
        <div className="grid transition-all duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}>
          <div className="overflow-hidden">
            <p className="pb-2 text-sm font-medium" style={{ color: 'rgba(244,245,246,0.85)' }}>{model.compareTier}</p>
            <div className="pb-3">
              <RateTable rates={model.compare} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [active, setActive] = useState(0)
  const family = FAMILIES[active]

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: C.bg, color: C.fg, fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{STYLES}</style>
      <Nav />
      <main className={cn(SHELL, AIR)}>
        <div className="text-center">
          <SectionIcon icon={Tag} />
          <Title lead="Transparent rates." claim="Every model." />
        </div>

        <Reveal>
          <GlassFrame className="mx-auto mt-12 max-w-3xl">
            <p className="px-4 py-3 text-left text-xs leading-relaxed sm:text-sm" style={{ color: C.dim }}>
              Text rates are shown per million tokens. Context-tiered models select a rate from the full
              input context. Comparisons use standard API rates and exclude batch discounts and premium modes.
            </p>
          </GlassFrame>
        </Reveal>

        <Reveal delay={60}>
          <div className="mx-auto mt-10 flex w-max max-w-full flex-wrap justify-center gap-1.5 px-1">
            {FAMILIES.map((f, i) => {
              const on = i === active
              const count = f.models.length
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 hover:text-white"
                  style={{ background: on ? 'rgba(244,245,246,0.09)' : 'transparent', color: on ? C.fg : 'rgba(244,245,246,0.4)' }}
                >
                  {f.label}
                  <span
                    className="rounded-md px-1.5 py-0.5 text-xs"
                    style={{ background: on ? 'rgba(244,245,246,0.1)' : 'rgba(244,245,246,0.05)', color: on ? C.fg : C.faint, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {family.models.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  )
}
