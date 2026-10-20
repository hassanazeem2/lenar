import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { C, cn, SHELL, STYLES, Nav, Footer, Reveal } from './SimpleLanding.jsx'
import { TooltipProvider, Tip } from './src/ui.jsx'
import { FAMILY_ORDER, CATALOG } from './models.js'
import { statusUrl as fnUrl } from './src/lib/api.js'

const STATUS = {
  up: { label: 'Operational', cls: 'status-success', color: C.up },
  degraded: { label: 'Degraded performance', cls: 'status-warning', color: '#fbbf24' },
  down: { label: 'Outage', cls: 'status-error', color: C.down },
  unknown: { label: 'No data yet', cls: 'status-neutral', color: C.faint },
}
const fromAvailability = (a) => (a == null ? 'unknown' : a >= 99.5 ? 'up' : a >= 90 ? 'degraded' : 'down')
const familyOf = (id) => FAMILY_ORDER.find((f) => id.startsWith(f.id))?.id ?? 'other'
const NAMES = Object.fromEntries(CATALOG.map((m) => [m.id, m.name]))

// Snapshot from models.js, used before the backend is set up or if 7api's status is unreachable.
const SNAPSHOT = CATALOG.map((m) => ({
  model: m.id,
  status: fromAvailability(m.availability),
  availability_pct: m.availability,
  avg_latency_s: parseFloat(m.latency) || null,
}))

function useStatus() {
  const [state, setState] = useState({ models: null, live: false, checkedAt: null, loading: true })
  const load = async () => {
    const url = fnUrl('status')
    if (!url) return setState({ models: SNAPSHOT, live: false, checkedAt: null, loading: false })
    setState((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch(url)
      const body = await res.json()
      if (!body.ok || !body.models?.length) throw new Error('unavailable')
      setState({ models: body.models, live: !body.stale, checkedAt: body.checked_at, loading: false })
    } catch {
      setState({ models: SNAPSHOT, live: false, checkedAt: null, loading: false, failed: true })
    }
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])
  return { ...state, reload: load }
}

function Meter({ value, color, i }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(244,245,246,0.06)' }}>
      <div className="st-fill h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color, animationDelay: `${i * 40}ms` }} />
    </div>
  )
}

export default function StatusPage() {
  const { models, live, checkedAt, loading, failed, reload } = useStatus()

  const groups = useMemo(() => {
    if (!models) return []
    const order = [...FAMILY_ORDER, { id: 'other', label: 'Other models' }]
    return order
      .map((f) => ({ ...f, models: models.filter((m) => familyOf(m.model) === f.id) }))
      .filter((g) => g.models.length)
  }, [models])

  const counts = useMemo(() => {
    const c = { up: 0, degraded: 0, down: 0, unknown: 0 }
    for (const m of models ?? []) c[STATUS[m.status] ? m.status : 'unknown']++
    return c
  }, [models])
  const avg = useMemo(() => {
    const v = (models ?? []).map((m) => m.availability_pct).filter((x) => x != null)
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
  }, [models])

  const overall = counts.down ? 'down' : counts.degraded ? 'degraded' : 'up'
  const headline = !models ? 'Checking…'
    : overall === 'up' ? 'All systems operational'
      : overall === 'down' ? `${counts.down} model${counts.down > 1 ? 's' : ''} down`
        : `${counts.degraded} model${counts.degraded > 1 ? 's' : ''} degraded`
  const tone = STATUS[overall].color

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen antialiased" style={{ background: C.bg, color: C.fg, fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" }}>
        <style>{STYLES + '@keyframes st-fill{from{transform:scaleX(0)}to{transform:none}}.st-fill{transform-origin:left;animation:st-fill 1s cubic-bezier(0.16,1,0.3,1) both}@media (prefers-reduced-motion: reduce){.st-fill{animation:none}}'}</style>
        <Nav />
        <main className={cn(SHELL, 'max-w-4xl py-14')}>
          <div className="ssy-rise flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: C.faint }}>Status</p>
              <h1 className="mt-2 font-medium" style={{ fontSize: 'clamp(32px, 5vw, 44px)', letterSpacing: '-0.03em' }}>System status</h1>
            </div>
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm ml-auto font-normal text-white/50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="ssy-rise mt-8 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4" style={{ animationDelay: '120ms', borderColor: `${tone}40`, background: `${tone}0d` }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: tone }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: tone }} />
            </span>
            <span className="font-medium">{headline}</span>
            <span className="ml-auto text-sm" style={{ color: C.dim }}>
              {models?.length ?? '—'} models{avg != null ? ` · ${avg}% avg availability` : ''}
            </span>
          </div>

          <p className="mt-3 text-xs" style={{ color: C.faint }}>
            {live
              ? `Live · checked ${new Date(checkedAt).toLocaleTimeString()} · refreshes every minute`
              : failed
                ? 'Live status is temporarily unavailable, so this is the last published snapshot.'
                : 'Showing the last published snapshot. Live status turns on once the backend is set up.'}
          </p>

          {groups.map((g) => (
            <Reveal key={g.id} className="mt-12">
              <h2 className="mb-4 text-xs uppercase tracking-widest" style={{ color: C.faint }}>{g.label}</h2>
              <div className="divide-y rounded-2xl border" style={{ borderColor: C.line, background: C.card }}>
                {g.models.map((m, i) => {
                  const st = STATUS[m.status] ?? STATUS.unknown
                  return (
                    <div key={m.model} className="px-5 py-4" style={{ borderColor: C.line }}>
                      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Tip content={st.label}><span aria-label={st.label} className={cn('status', st.cls)} /></Tip>
                        <span className="text-sm font-medium">{NAMES[m.model] ?? m.model}</span>
                        <span className="font-mono text-xs" style={{ color: C.faint }}>{m.model}</span>
                        <span className="ml-auto text-xs" style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>
                          {m.avg_latency_s != null ? <span className="badge badge-ghost badge-sm mr-2 font-mono">{m.avg_latency_s.toFixed(1)}s</span> : null}
                          <span style={{ color: st.color }}>{m.availability_pct != null ? `${m.availability_pct}%` : '—'}</span>
                        </span>
                      </div>
                      <Tip content={m.availability_pct != null ? `${m.availability_pct}% recent availability${m.avg_latency_s != null ? ` · ${m.avg_latency_s.toFixed(1)}s average response` : ''}` : 'No measurement yet'}>
                        <div className="py-1"><Meter value={m.availability_pct} color={st.color} i={i} /></div>
                      </Tip>
                    </div>
                  )
                })}
              </div>
            </Reveal>
          ))}
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  )
}
