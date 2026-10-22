// The signed-in dashboard. Style: true-black flat on lenar's warm near-black. One ground for the
// sidebar, top bar and canvas; cards are one lightness step up with no borders or shadows; the
// active nav item is its label brightening; copper sits on data only; the primary action is the
// bone pill. Every figure comes from /account (or the demo account before the backend is set up).
//
// Grid: sidebar 232px + 1px rule. Canvas: 32px gutters, content max 1120px.
// Overview lead row: 2fr + 1fr with a 16px gap. Usage row: 2fr + 1fr. KPI strip: 4 equal cells.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, Copy, CreditCard,
  KeyRound, Layers, LayoutGrid, LogOut, Menu, RefreshCw, X,
} from 'lucide-react'
import { STYLES, MetalHex } from './SimpleLanding.jsx'
import { BOARD_STYLES, ModelBoard, Segmented } from './LandingBoard.jsx'
import { useLiveModels } from './models.js'
import { auth, api, configured, useSession, API_BASE } from './src/lib/api.js'
import { Dialog, DialogContent, TooltipProvider } from './src/ui.jsx'

const D = {
  ground: '#0a0908',
  surface: '#141210',
  raised: '#1d1a17',
  active: '#25211d',
  rule: '#1f1c19',
  control: '#3a352f',
  text: '#f3efe7',
  muted: '#b9b2a7',
  faint: '#968f85',
  accent: '#cd8a4c',
  bone: '#f3efe7',
  ink: '#0a0908',
  positive: '#8fbf86',
  posBg: '#17231a',
  warning: '#e0b65c',
  warnBg: '#2a2214',
  negative: '#e0866a',
  negBg: '#2c1a14',
}
const FONT = "'Instrument Sans', ui-sans-serif, system-ui, sans-serif"
const EASE = [0.22, 1, 0.36, 1]
const TOPUPS = [1000, 2500, 5000, 10000]
const BUYS = ['claude-opus-5-5', 'gpt-6-astra', 'deepseek-v4.1-flash']
const WINDOWS = [{ id: '1h', label: '1 hour' }, { id: '24h', label: '24 hours' }, { id: '7d', label: '7 days' }]
// Short labels on phones so the window switch fits beside the card title.
const WINDOW_TABS = WINDOWS.map((w) => ({ id: w.id, label: <><span className="sm:hidden">{w.id}</span><span className="hidden sm:inline">{w.label}</span></> }))

/* ---------- formatting ---------- */

const money = (v, digits = 2) => (v == null ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(Number(v)).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`)
const smallMoney = (v) => (v == null ? '—' : Math.abs(v) > 0 && Math.abs(v) < 0.01 ? `$${v.toFixed(4)}` : money(v))
const compact = (n) => (n == null ? '—' : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n))
const tokensM = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)}B` : m >= 100 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`)
const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const rate = (p) => (p >= 0.1 ? p.toFixed(3) : p.toFixed(4)).replace(/(\.\d\d\d?)0+$/, '$1')

/* ---------- demo data (until the backend is configured) ---------- */

function demoAccount() {
  const now = Date.now()
  let spent = 0
  const series = Array.from({ length: 15 }, (_, i) => {
    spent += [0.42, 0.61, 0.38, 0.9, 1.12, 0.74, 0.31, 0.55, 1.28, 0.96, 0.83, 1.41, 1.06, 1.18, 0.64][i]
    return { t: new Date(now - (14 - i) * 864e5).toISOString(), spent: +spent.toFixed(2) }
  })
  return {
    demo: true,
    email: 'demo@lenar.cc',
    key: { prefix: 'sk-7a3f91c2…e04b', created_at: new Date(now - 9 * 864e5).toISOString(), can_reveal: false },
    balance: 18.42,
    spent,
    usage: {
      '1h': { tokens: 412_000, cached: 301_000, cost: 0.09, savings: 0.03 },
      '24h': { tokens: 3_900_000, cached: 2_870_000, cost: 1.18, savings: 0.61 },
      '7d': { tokens: 21_400_000, cached: 15_200_000, cost: 6.87, savings: 3.12 },
    },
    series,
    topups: [
      { id: 'c88d10fa', paid: 10, credited: 10, status: 'funded', provider: 'crypto', created_at: new Date(now - 2 * 864e5).toISOString() },
      { id: 'a91c2e04', paid: 25, credited: 25, status: 'funded', provider: 'card', created_at: new Date(now - 9 * 864e5).toISOString() },
    ],
  }
}

/* ---------- data ---------- */

function useAccount(enabled) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [at, setAt] = useState(null)
  const load = useCallback(async () => {
    if (!configured) { setData(demoAccount()); setAt(new Date()); return }
    try {
      setData(await api('/account'))
      setError(null)
      setAt(new Date())
    } catch (e) {
      setError(e.message)
    }
  }, [])
  useEffect(() => { if (enabled) load() }, [enabled, load])
  return { data, error, reload: load, at }
}

/** Per-day spend from cumulative snapshots. A drop means the key was rolled, so count from zero. */
function dailySpend(series, days = 14) {
  const byDay = new Map()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5)
    byDay.set(d.toDateString(), { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), v: 0 })
  }
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].spent ?? 0
    const cur = series[i].spent ?? 0
    const delta = cur >= prev ? cur - prev : cur
    const d = byDay.get(new Date(series[i].t).toDateString())
    if (d) d.v += delta
  }
  return [...byDay.values()]
}

/* ---------- bits ---------- */

function Num({ value, format }) {
  const spring = useSpring(value ?? 0, { stiffness: 120, damping: 24 })
  const text = useTransform(spring, (v) => format(v))
  useEffect(() => { if (value != null) spring.set(value) }, [value, spring])
  if (value == null) return <span style={{ color: D.faint }}>—</span>
  return <motion.span className="tabular-nums">{text}</motion.span>
}

function Btn({ children, to, href, onClick, variant = 'primary', small, disabled, type = 'button', className, ...rest }) {
  const cls = [
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-medium outline-none transition-[background-color,color,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-[#cd8a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0908] disabled:opacity-50',
    small ? 'h-8 px-3.5 text-[13px]' : 'h-9 px-4 text-[14px]',
    variant === 'primary' && 'bg-[#f3efe7] text-[#0a0908] hover:bg-white',
    variant === 'secondary' && 'bg-[#1d1a17] text-[#f3efe7] hover:bg-[#25211d]',
    variant === 'ghost' && 'text-[#b9b2a7] hover:bg-[#1d1a17] hover:text-[#f3efe7]',
    variant === 'danger' && 'bg-[#2c1a14] text-[#e0866a] hover:bg-[#3a2219]',
    className,
  ].filter(Boolean).join(' ')
  const inner = <motion.span className="inline-flex items-center gap-2" whileTap={{ scale: 0.96 }}>{children}</motion.span>
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} {...rest}>{inner}</button>
}

function CopyBtn({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok).catch(ok)
    else ok()
  }
  return (
    <button type="button" onClick={copy} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors hover:bg-[#25211d]" style={{ color: done ? D.positive : D.muted }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? 'y' : 'n'} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
          {done ? <Check size={14} /> : <Copy size={14} />}
        </motion.span>
      </AnimatePresence>
      {done ? 'Copied' : label}
    </button>
  )
}

function Card({ title, aside, children, className, pad = true }) {
  return (
    <section className={['min-w-0 rounded-[14px]', className].filter(Boolean).join(' ')} style={{ background: D.surface }}>
      {title ? (
        <header className="flex min-h-[56px] items-center gap-3 px-5 pt-1">
          <h2 className="text-[16px] font-medium" style={{ color: D.text }}>{title}</h2>
          <div className="ml-auto flex items-center gap-2">{aside}</div>
        </header>
      ) : null}
      <div className={pad ? 'px-5 pb-5' : ''}>{children}</div>
    </section>
  )
}

function Pill({ tone = 'neutral', children }) {
  const t = {
    positive: [D.posBg, D.positive],
    warning: [D.warnBg, D.warning],
    negative: [D.negBg, D.negative],
    neutral: [D.raised, D.muted],
  }[tone]
  return <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium" style={{ background: t[0], color: t[1] }}>{children}</span>
}

function Notice({ tone = 'warning', children, action }) {
  const c = tone === 'negative' ? [D.negBg, D.negative] : tone === 'positive' ? [D.posBg, D.positive] : [D.warnBg, D.warning]
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="status" className="mb-4 flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px]" style={{ background: c[0], color: c[1] }}>
      <AlertTriangle size={15} className="shrink-0" />
      <span className="flex-1">{children}</span>
      {action}
    </motion.div>
  )
}

/** Daily spend as columns: one copper hue, 4 round ticks, today in full copper, hover for the day. */
function SpendBars({ days, height = 200 }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...days.map((d) => d.v))
  const step = niceStep(max)
  const top = Math.max(step * 4, step * Math.ceil(max / step))
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).reverse()
  const empty = max === 0
  return (
    <div className="relative">
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-right text-[12px] tabular-nums" style={{ height, color: D.faint }}>
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:-translate-y-full">{money(t, step < 1 ? 2 : 0)}</span>)}
        </div>
        <div className="relative flex-1" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0" style={{ top: `${(i / (ticks.length - 1)) * 100}%`, borderTop: `1px ${i === ticks.length - 1 ? 'solid' : 'dashed'} ${i === ticks.length - 1 ? D.control : D.rule}` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[6px] px-1">
            {days.map((d, i) => {
              const h = top ? (d.v / top) * 100 : 0
              const today = i === days.length - 1
              return (
                <div key={d.label} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                  {/* CSS, not JS: the bars land at their height even if the tab was in the background. */}
                  <div
                    className="dash-bar w-full rounded-t-[4px]"
                    style={{ height: `${h}%`, animationDelay: `${i * 25}ms`, background: D.accent, opacity: hover == null ? (today ? 1 : 0.7) : hover === i ? 1 : 0.35, transition: 'opacity 150ms, height 500ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </div>
              )
            })}
          </div>
          <AnimatePresence>
            {hover != null && !empty ? (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                style={{ left: `${((hover + 0.5) / days.length) * 100}%`, background: D.active, color: D.text }}
              >
                <span style={{ color: D.muted }}>{days[hover].label}</span> <span className="tabular-nums">{smallMoney(days[hover].v)}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-12 text-[12px]" style={{ color: D.faint }}>
        <span>{days[0].label}</span><span>{days[7].label}</span><span>Today</span>
      </div>
      {empty ? <p className="mt-3 text-[14px]" style={{ color: D.muted }}>No spend in the last 14 days. Bars appear here as you make requests.</p> : null}
    </div>
  )
}

function niceStep(max) {
  if (max <= 0) return 0.5
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

function Page({ title, sub, actions, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold" style={{ letterSpacing: '-0.02em', color: D.text }}>{title}</h1>
          {sub ? <p className="mt-1 text-[15px]" style={{ color: D.muted }}>{sub}</p> : null}
        </div>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </motion.div>
  )
}

function Fresh({ at, onRefresh }) {
  const [spin, setSpin] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t) }, [])
  const secs = at ? Math.round((Date.now() - at.getTime()) / 1000) : null
  const label = secs == null ? '' : secs < 20 ? 'Updated just now' : secs < 90 ? `Updated ${secs}s ago` : `Updated ${Math.round(secs / 60)} min ago`
  return (
    <Btn variant="ghost" small onClick={async () => { setSpin(true); await onRefresh(); setSpin(false) }} aria-label="Refresh">
      <RefreshCw size={14} className={spin ? 'animate-spin' : ''} /> <span className="hidden sm:inline">{label}</span>
    </Btn>
  )
}

/* ---------- overview ---------- */

function useDerived(acct) {
  const days = useMemo(() => dailySpend(acct.series ?? []), [acct.series])
  const perDay = acct.usage?.['7d']?.cost != null ? acct.usage['7d'].cost / 7 : null
  const runway = acct.balance != null && perDay ? acct.balance / perDay : null
  return { days, perDay, runway }
}

function Setup({ acct }) {
  const steps = [
    { title: 'Create your account', body: 'Signed in as ' + (acct.email ?? 'you') + '.', done: true },
    { title: 'Add credit', body: 'From $10 by card or crypto. Your key is made with the payment.', done: Boolean(acct.key), to: '/dashboard/billing', cta: 'Add credit' },
    { title: 'Copy your key', body: 'It is shown once. Store it on your server.', done: Boolean(acct.key && !acct.key.can_reveal), to: '/dashboard/key', cta: acct.key ? 'Reveal key' : null },
    { title: 'Point your SDK at lenar', body: `Set base_url to ${API_BASE}.`, done: false, to: '/docs#quickstart', cta: 'Quickstart' },
  ]
  const done = steps.filter((s) => s.done).length
  return (
    <Card title="Get set up" aside={<span className="text-[14px] tabular-nums" style={{ color: D.muted }}>{done} of {steps.length} done</span>}>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: D.raised }}>
        <motion.div className="h-full rounded-full" style={{ background: D.accent }} initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
      </div>
      <div className="grid gap-px overflow-hidden rounded-[10px] sm:grid-cols-2 lg:grid-cols-4" style={{ background: D.rule }}>
        {steps.map((s) => {
          const body = (
            <>
              <div className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: s.done ? D.posBg : D.raised, color: s.done ? D.positive : D.faint }}>
                  {s.done ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: D.faint }} />}
                </span>
                <span className="text-[15px] font-medium" style={{ color: s.done ? D.muted : D.text }}>{s.title}</span>
                {s.cta && !s.done ? <ArrowUpRight size={15} className="ml-auto transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: D.faint }} /> : null}
              </div>
              <p className="mt-2 text-[14px] leading-snug" style={{ color: D.muted }}>{s.body}</p>
            </>
          )
          return s.cta && !s.done
            ? <Link key={s.title} to={s.to} className="group block p-4 transition-colors hover:bg-[#1d1a17]" style={{ background: D.surface }}>{body}</Link>
            : <div key={s.title} className="p-4" style={{ background: D.surface }}>{body}</div>
        })}
      </div>
    </Card>
  )
}

function BalanceCard({ acct, runway, perDay }) {
  const { models } = useLiveModels()
  const buys = BUYS.map((id) => models.find((m) => m.id === id)).filter(Boolean)
  const low = acct.balance != null && acct.key && acct.balance < 2
  return (
    <Card className="flex flex-col">
      <div className="pt-5">
        <p className="text-[14px]" style={{ color: D.muted }}>Balance</p>
        <p className="mt-1 text-[36px] font-semibold leading-none" style={{ letterSpacing: '-0.03em', color: D.text }}>
          <Num value={acct.balance ?? (acct.key ? null : 0)} format={(v) => money(v)} />
        </p>
        <p className="mt-3 text-[15px]" style={{ color: low ? D.warning : D.muted }}>
          {!acct.key
            ? 'Add credit to create your key.'
            : runway == null
              ? 'No spend in the last 7 days.'
              : `Lasts about ${runway < 1 ? 'less than a day' : `${Math.round(runway)} day${Math.round(runway) === 1 ? '' : 's'}`} at your 7-day pace of ${money(perDay)} a day.`}
        </p>
      </div>
      <div className="mt-5">
        <p className="text-[14px]" style={{ color: D.muted }}>{acct.key ? 'What it buys right now' : 'What $10 buys right now'}</p>
        <div className="mt-2 flex flex-col gap-1">
          {buys.map((m) => {
            const m10 = (acct.key ? acct.balance ?? 0 : 10) / m.price
            const max = (acct.key ? acct.balance ?? 0 : 10) / Math.min(...buys.map((b) => b.price))
            return (
              <div key={m.id} className="relative overflow-hidden rounded-[8px] px-3 py-2.5" style={{ background: D.raised }}>
                <motion.div className="absolute inset-y-0 left-0" style={{ background: 'rgba(205,138,76,0.16)' }} initial={{ width: 0 }} animate={{ width: `${max ? Math.max(3, (m10 / max) * 100) : 0}%` }} transition={{ duration: 0.9, ease: EASE }} />
                <div className="relative flex items-center gap-3 text-[14px]">
                  <span style={{ color: D.text }}>{m.name}</span>
                  <span className="ml-auto tabular-nums" style={{ color: D.text }}>{tokensM(m10)} tokens</span>
                  <span className="hidden w-[88px] text-right tabular-nums sm:block" style={{ color: D.faint }}>${rate(m.price)}/M</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-auto flex gap-2 pt-5">
        <Btn to="/dashboard/billing">Top up</Btn>
        <Btn to="/dashboard/models" variant="secondary">See all {models.length} models</Btn>
      </div>
    </Card>
  )
}

function ConnectCard({ acct }) {
  return (
    <Card title="Connect your app" className="flex flex-col">
      <p className="text-[14px]" style={{ color: D.muted }}>Base URL</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-[10px] pl-3 pr-1" style={{ background: D.raised }}>
        <code className="min-w-0 flex-1 truncate py-2.5 font-mono text-[14px]" style={{ color: D.text }}>{API_BASE}</code>
        <CopyBtn text={API_BASE} />
      </div>
      <p className="mt-4 text-[14px]" style={{ color: D.muted }}>API key</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-[10px] py-1 pl-3 pr-1" style={{ background: D.raised }}>
        <code className="min-w-0 flex-1 truncate py-1.5 font-mono text-[14px]" style={{ color: acct.key ? D.text : D.faint }}>{acct.key?.prefix ?? 'Made with your first top-up'}</code>
        {acct.key ? <Pill tone={acct.key.can_reveal ? 'warning' : 'positive'}>{acct.key.can_reveal ? 'Not copied yet' : 'Active'}</Pill> : null}
      </div>
      <p className="mt-4 text-[14px] leading-relaxed" style={{ color: D.muted }}>
        Works with the OpenAI, Anthropic and Gemini SDKs. Change the model name to switch models.
      </p>
      <div className="mt-auto flex gap-2 pt-5">
        <Btn to="/dashboard/key" variant="secondary">Manage key</Btn>
        <Btn to="/docs#quickstart" variant="ghost">Quickstart <ArrowUpRight size={14} /></Btn>
      </div>
    </Card>
  )
}

function UsageStrip({ acct, win, setWin }) {
  const u = acct.usage?.[win]
  const cells = [
    { label: 'Spend', value: u?.cost, format: (v) => smallMoney(v) },
    { label: 'Tokens', value: u?.tokens, format: compact },
    { label: 'Served from cache', value: u && u.tokens ? (u.cached / u.tokens) * 100 : u ? 0 : null, format: (v) => `${v.toFixed(0)}%` },
    { label: 'Saved by caching', value: u?.savings, format: (v) => smallMoney(v) },
  ]
  return (
    <Card title="Usage" aside={<Segmented id="win" options={WINDOW_TABS} value={win} onChange={setWin} />}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] lg:grid-cols-4" style={{ background: D.rule }}>
        {cells.map((c) => (
          <div key={c.label} className="px-4 py-4" style={{ background: D.surface }}>
            <p className="text-[14px]" style={{ color: D.muted }}>{c.label}</p>
            <p className="mt-1.5 text-[24px] font-medium leading-none" style={{ color: D.text }}><Num value={c.value ?? null} format={c.format} /></p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RecentTopups({ acct }) {
  const rows = (acct.topups ?? []).slice(0, 4)
  const added = (acct.topups ?? []).filter((t) => t.status === 'funded').reduce((s, t) => s + t.paid, 0)
  return (
    <Card className="flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-1 [&>div:last-child]:flex-col" title="Recent top-ups" aside={<Link to="/dashboard/billing" className="text-[14px] transition-colors hover:text-[#f3efe7]" style={{ color: D.muted }}>View all</Link>}>
      {rows.length ? (
        <ul className="mb-3 flex flex-col">
          {rows.map((t) => (
            <li key={t.id} className="flex h-12 items-center gap-3 border-t text-[14px] first:border-t-0" style={{ borderColor: D.rule }}>
              <span className="tabular-nums" style={{ color: D.text }}>{money(t.paid)}</span>
              <span style={{ color: D.faint }}>{t.provider === 'crypto' ? 'Crypto' : 'Card'} · {day(t.created_at)}</span>
              <span className="ml-auto"><Pill tone={t.status === 'funded' ? 'positive' : 'warning'}>{t.status === 'funded' ? 'Added' : 'Processing'}</Pill></span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[10px] px-4 py-3 text-[14px]" style={{ border: `1px dashed ${D.control}`, color: D.muted }}>No top-ups yet.</div>
      )}
      <div className="mt-auto flex items-center justify-between rounded-[10px] px-4 py-3 text-[14px]" style={{ background: D.raised }}>
        <span style={{ color: D.muted }}>Added in total</span>
        <span className="tabular-nums" style={{ color: D.text }}>{money(added)}</span>
      </div>
    </Card>
  )
}

function Overview({ acct, reload, at }) {
  const [win, setWin] = useState('24h')
  const { days, perDay, runway } = useDerived(acct)
  return (
    <Page
      title="Overview"
      sub={acct.key ? `You’ve spent ${money(acct.usage?.['24h']?.cost ?? 0)} in the last 24 hours.` : 'Add credit to get your API key.'}
      actions={<><Fresh at={at} onRefresh={reload} /><Btn to="/dashboard/billing">Top up</Btn></>}
    >
      {acct.upstream_error ? <Notice>Live balance and usage are briefly unavailable. Your key still works.</Notice> : null}
      <div className="flex flex-col gap-4">
        {!acct.key || acct.key.can_reveal ? <Setup acct={acct} /> : null}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <BalanceCard acct={acct} runway={runway} perDay={perDay} />
          <ConnectCard acct={acct} />
        </div>
        {acct.key ? (
          <>
            <UsageStrip acct={acct} win={win} setWin={setWin} />
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card title="Daily spend" aside={<span className="text-[14px]" style={{ color: D.muted }}>Last 14 days</span>}>
                <SpendBars days={days} height={180} />
              </Card>
              <RecentTopups acct={acct} />
            </div>
          </>
        ) : null}
      </div>
    </Page>
  )
}

/* ---------- usage ---------- */

function Usage({ acct, reload, at }) {
  const { days } = useDerived(acct)
  const total14 = days.reduce((s, d) => s + d.v, 0)
  const rows = WINDOWS.map((w) => ({ ...w, u: acct.usage?.[w.id] }))
  return (
    <Page title="Usage" sub={acct.key ? `${money(total14)} spent in the last 14 days, ${money(acct.spent)} since your key was made.` : 'Usage appears once you have a key.'} actions={<Fresh at={at} onRefresh={reload} />}>
      <div className="flex flex-col gap-4">
        <Card title="Daily spend" aside={<span className="text-[14px]" style={{ color: D.muted }}>Last 14 days</span>}>
          <SpendBars days={days} height={220} />
        </Card>
        <Card title="By period">
          <ul className="flex flex-col sm:hidden">
            {rows.map(({ id, label, u }) => (
              <li key={id} className="border-t py-3 first:border-t-0" style={{ borderColor: D.rule }}>
                <div className="flex items-baseline justify-between text-[15px]">
                  <span style={{ color: D.text }}>Last {label}</span>
                  <span className="tabular-nums" style={{ color: D.text }}>{u ? smallMoney(u.cost) : '—'}</span>
                </div>
                <p className="mt-1 text-[13px] tabular-nums" style={{ color: D.muted }}>
                  {u ? `${compact(u.tokens)} tokens · ${u.tokens ? Math.round((u.cached / u.tokens) * 100) : 0}% from cache · ${smallMoney(u.savings)} saved` : '—'}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="h-10 text-left" style={{ color: D.faint }}>
                  <th className="font-normal">Period</th>
                  <th className="text-right font-normal">Tokens</th>
                  <th className="text-right font-normal">From cache</th>
                  <th className="text-right font-normal">Spend</th>
                  <th className="text-right font-normal">Saved by caching</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map(({ id, label, u }) => (
                  <tr key={id} className="h-12 border-t" style={{ borderColor: D.rule }}>
                    <td style={{ color: D.text }}>Last {label}</td>
                    <td className="text-right" style={{ color: D.text }}>{u ? u.tokens.toLocaleString('en-US') : '—'}</td>
                    <td className="text-right" style={{ color: D.muted }}>{u ? `${u.tokens ? Math.round((u.cached / u.tokens) * 100) : 0}%` : '—'}</td>
                    <td className="text-right" style={{ color: D.text }}>{u ? smallMoney(u.cost) : '—'}</td>
                    <td className="text-right" style={{ color: D.muted }}>{u ? smallMoney(u.savings) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px]" style={{ color: D.faint }}>Cached input is billed at each model’s lower cached rate. Figures can lag a minute behind your requests.</p>
        </Card>
      </div>
    </Page>
  )
}

/* ---------- key ---------- */

function KeyPage({ acct, reload }) {
  const [secret, setSecret] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const [confirmRoll, setConfirmRoll] = useState(false)
  const [lang, setLang] = useState('python')
  const run = async (name) => {
    setBusy(name); setErr(null)
    try {
      if (acct.demo) throw new Error('Demo mode: set VITE_API_URL to manage real keys.')
      const { key } = await api(`/${name}`, {})
      setSecret(key)
      reload()
    } catch (e) { setErr(e.message) } finally { setBusy(null); setConfirmRoll(false) }
  }
  const k = secret ?? 'YOUR_KEY'
  const code = {
    python: `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${API_BASE}",\n    api_key="${k}",\n)\n\nreply = client.chat.completions.create(\n    model="claude-opus-5-5",\n    messages=[{"role": "user", "content": "Hello"}],\n)`,
    typescript: `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "${API_BASE}",\n  apiKey: "${k}",\n});\n\nconst reply = await client.chat.completions.create({\n  model: "claude-opus-5-5",\n  messages: [{ role: "user", content: "Hello" }],\n});`,
    curl: `curl ${API_BASE}/chat/completions \\\n  -H "Authorization: Bearer ${k}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"claude-opus-5-5","messages":[{"role":"user","content":"Hello"}]}'`,
  }
  return (
    <Page title="API key" sub="One key for every model. Keep it on your server, never in browser code.">
      {err ? <Notice tone="negative">{err}</Notice> : null}
      {!acct.key ? (
        <Card>
          <div className="flex flex-wrap items-center gap-4 pt-5">
            <KeyRound size={18} style={{ color: D.muted }} />
            <p className="flex-1 text-[15px]" style={{ color: D.text }}>You don’t have a key yet. It’s created the moment your first top-up clears.</p>
            <Btn to="/dashboard/billing">Add credit</Btn>
          </div>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.25fr]">
          <Card title="Your key">
            <div className="flex items-center gap-3 rounded-[10px] px-3 py-3" style={{ background: D.raised }}>
              <code className="min-w-0 flex-1 truncate font-mono text-[15px]" style={{ color: D.text }}>{acct.key.prefix}</code>
              <Pill tone={acct.key.can_reveal ? 'warning' : 'positive'}>{acct.key.can_reveal ? 'Not copied yet' : 'Active'}</Pill>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-3 text-[14px]">
              <dt style={{ color: D.muted }}>Created</dt><dd className="text-right tabular-nums" style={{ color: D.text }}>{day(acct.key.created_at)}</dd>
              <dt style={{ color: D.muted }}>Models</dt><dd className="text-right" style={{ color: D.text }}>All</dd>
              <dt style={{ color: D.muted }}>Spends from</dt><dd className="text-right tabular-nums" style={{ color: D.text }}>Your balance, {money(acct.balance)}</dd>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {acct.key.can_reveal ? (
                <Btn onClick={() => run('reveal-key')} disabled={!!busy}>{busy === 'reveal-key' ? <span className="loading loading-spinner loading-xs" /> : null} Reveal key</Btn>
              ) : null}
              <Btn variant="secondary" onClick={() => setConfirmRoll(true)} disabled={!!busy}><RefreshCw size={14} /> Roll key</Btn>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed" style={{ color: D.muted }}>
              {acct.key.can_reveal ? 'You can see the full key once. After that it stays masked.' : 'Lost it, or think it leaked? Rolling makes a new key with your whole balance and switches the old one off at once.'}
            </p>
          </Card>
          <Card title="Quickstart" aside={<CopyBtn text={code[lang]} />}>
            <Segmented id="lang" options={[{ id: 'python', label: 'Python' }, { id: 'typescript', label: 'TypeScript' }, { id: 'curl', label: 'cURL' }]} value={lang} onChange={setLang} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.pre key={lang} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="mt-3 overflow-x-auto rounded-[10px] p-4 font-mono text-[13px] leading-relaxed" style={{ background: D.ground, color: D.muted }}>
                {code[lang]}
              </motion.pre>
            </AnimatePresence>
          </Card>
        </div>
      )}

      <Dialog open={confirmRoll} onOpenChange={setConfirmRoll}>
        <DialogContent title="Roll your API key?" description="Your current key stops working right away. Your balance moves to the new key.">
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmRoll(false)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => run('roll-key')} disabled={!!busy}>{busy === 'roll-key' ? <span className="loading loading-spinner loading-xs" /> : null} Roll key</Btn>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(secret)} onOpenChange={(o) => { if (!o) setSecret(null) }}>
        <DialogContent title="Your API key" description="Copy it now. This is the only time the full key is shown.">
          <div className="flex items-center gap-2 rounded-[10px] py-1 pl-3 pr-1" style={{ background: D.raised }}>
            <code className="min-w-0 flex-1 truncate font-mono text-[14px]" style={{ color: D.text }}>{secret}</code>
            <CopyBtn text={secret ?? ''} />
          </div>
          <p className="mt-4 text-[14px]" style={{ color: D.muted }}>Store it on your server or in a secrets manager.</p>
          <Btn className="mt-5 w-full" onClick={() => setSecret(null)}>I’ve saved it</Btn>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

/* ---------- billing ---------- */

function Billing({ acct, reload, at }) {
  const [params, setParams] = useSearchParams()
  const [amount, setAmount] = useState(2500)
  const [method, setMethod] = useState('card')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const { models } = useLiveModels()
  const success = params.get('topup') === 'success'

  // The webhook lands a few seconds after the customer comes back; poll until it shows up.
  useEffect(() => {
    if (!success) return
    const t = setInterval(reload, 3000)
    const stop = setTimeout(() => { clearInterval(t); setParams({}, { replace: true }) }, 30000)
    return () => { clearInterval(t); clearTimeout(stop) }
  }, [success, reload, setParams])

  const pay = async () => {
    setBusy(true); setErr(null)
    try {
      if (acct.demo) throw new Error('Demo mode: set VITE_API_URL to take real payments.')
      const { url } = await api(method === 'crypto' ? '/create-checkout/crypto' : '/create-checkout', { amount_cents: amount })
      window.location.href = url
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const opus = models.find((m) => m.id === 'claude-opus-5-5')
  const flash = models.find((m) => m.id === 'deepseek-v4.1-flash')
  const dollars = amount / 100

  return (
    <Page title="Billing" sub="Prepaid credit, charged per token. No subscription." actions={<Fresh at={at} onRefresh={reload} />}>
      {success ? <Notice tone="positive">Payment received. Your credit shows up here within a few seconds.</Notice> : null}
      {err ? <Notice tone="negative">{err}</Notice> : null}
      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Add credit">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TOPUPS.map((c) => {
              const on = amount === c
              return (
                <motion.button
                  key={c}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAmount(c)}
                  aria-pressed={on}
                  className="relative h-[76px] rounded-[12px] px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#cd8a4c]"
                  style={{ background: D.raised }}
                >
                  {on ? <motion.span layoutId="amt" className="absolute inset-0 rounded-[12px]" style={{ boxShadow: `inset 0 0 0 1.5px ${D.text}`, background: D.active }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
                  <span className="relative block text-[22px] font-medium tabular-nums" style={{ color: D.text }}>${c / 100}</span>
                  <span className="relative block text-[13px]" style={{ color: D.muted }}>{opus ? `≈ ${tokensM(c / 100 / opus.price)} on Opus` : 'credit'}</span>
                </motion.button>
              )
            })}
          </div>
          <p className="mb-2 mt-5 text-[14px]" style={{ color: D.muted }}>Pay with</p>
          <Segmented id="method" options={[{ id: 'card', label: 'Card' }, { id: 'crypto', label: 'Crypto' }]} value={method} onChange={setMethod} />
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Btn onClick={pay} disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : null}
              Add ${dollars} with {method === 'crypto' ? 'crypto' : 'card'} <ArrowRight size={15} />
            </Btn>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={method} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[14px]" style={{ color: D.muted }}>
                {method === 'crypto' ? 'You pick the coin at checkout. Credit lands when the invoice is paid.' : 'Secure checkout by Stripe. Credit lands in seconds.'}
              </motion.p>
            </AnimatePresence>
          </div>
        </Card>
        <Card>
          <div className="pt-5">
            <p className="text-[14px]" style={{ color: D.muted }}>Balance</p>
            <p className="mt-1 text-[36px] font-semibold leading-none" style={{ letterSpacing: '-0.03em', color: D.text }}><Num value={acct.balance ?? (acct.key ? null : 0)} format={(v) => money(v)} /></p>
            <p className="mt-3 text-[15px]" style={{ color: D.muted }}>After this top-up: <span className="tabular-nums" style={{ color: D.text }}>{money((acct.balance ?? 0) + dollars)}</span></p>
          </div>
          <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2.5 text-[14px]">
            {[opus, flash].filter(Boolean).map((m) => (
              <div key={m.id} className="contents">
                <dt style={{ color: D.muted }}>${dollars} on {m.name}</dt>
                <dd className="text-right tabular-nums" style={{ color: D.text }}>≈ {tokensM(dollars / m.price)} tokens</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[13px]" style={{ color: D.faint }}>Credit never expires. One balance pays for every model.</p>
        </Card>
      </div>

      <Card title="Payment history" className="mt-4">
        {acct.topups?.length ? (
          <>
          <ul className="flex flex-col sm:hidden">
            {acct.topups.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-t py-3 first:border-t-0" style={{ borderColor: D.rule }}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] tabular-nums" style={{ color: D.text }}>{money(t.paid)}</span>
                  <span className="block text-[13px]" style={{ color: D.muted }}>{t.provider === 'crypto' ? 'Crypto' : 'Card'} · {day(t.created_at)} · <code className="font-mono">{t.id}</code></span>
                </span>
                <Pill tone={t.status === 'funded' ? 'positive' : 'warning'}>{t.status === 'funded' ? 'Added' : 'Processing'}</Pill>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="h-10 text-left" style={{ color: D.faint }}>
                  <th className="font-normal">Date</th><th className="font-normal">Method</th><th className="font-normal">Reference</th>
                  <th className="text-right font-normal">Paid</th><th className="text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {acct.topups.map((t) => (
                  <tr key={t.id} className="h-12 border-t" style={{ borderColor: D.rule }}>
                    <td style={{ color: D.text }}>{day(t.created_at)}</td>
                    <td style={{ color: D.muted }}>{t.provider === 'crypto' ? 'Crypto' : 'Card'}</td>
                    <td><code className="font-mono text-[13px]" style={{ color: D.muted }}>{t.id}</code></td>
                    <td className="text-right" style={{ color: D.text }}>{money(t.paid)}</td>
                    <td className="text-right"><Pill tone={t.status === 'funded' ? 'positive' : 'warning'}>{t.status === 'funded' ? 'Added' : 'Processing'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="rounded-[10px] px-4 py-3 text-[14px]" style={{ border: `1px dashed ${D.control}`, color: D.muted }}>No payments yet. Your first top-up will show here.</div>
        )}
      </Card>
    </Page>
  )
}

/* ---------- models ---------- */

function ModelsPage() {
  const { models, live, checkedAt } = useLiveModels()
  const [selected, setSelected] = useState(null)
  return (
    <Page title="Models" sub={`${models.length} models on your key, at the price you pay per million tokens.`}>
      <style>{BOARD_STYLES}</style>
      <ModelBoard models={models} live={live} checkedAt={checkedAt} selected={selected} setSelected={setSelected} limit={models.length} bare />
    </Page>
  )
}

/* ---------- shell ---------- */

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/dashboard/usage', label: 'Usage', icon: BarChart3 },
  { to: '/dashboard/key', label: 'API key', icon: KeyRound },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
]
const RESOURCES = [
  { to: '/dashboard/models', label: 'Models', icon: Layers },
  { to: '/docs', label: 'Docs', icon: BookOpen, external: true },
  { to: '/status', label: 'Status', icon: Activity, external: true },
]
const PAGE_NAMES = { '': 'Overview', usage: 'Usage', key: 'API key', billing: 'Billing', models: 'Models' }

function SideLink({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className="group relative flex h-9 items-center gap-3 rounded-[10px] px-3 text-[14px] outline-none transition-colors hover:bg-[#141210] focus-visible:ring-2 focus-visible:ring-[#cd8a4c]"
    >
      {({ isActive }) => (
        <>
          {isActive ? <motion.span layoutId="side-active" className="absolute inset-0 rounded-[10px]" style={{ background: D.surface }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} /> : null}
          <item.icon size={16} strokeWidth={1.75} className="relative transition-colors" style={{ color: isActive ? D.text : D.faint }} />
          <span className="relative transition-colors" style={{ color: isActive ? D.text : D.muted, fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
          {item.external ? <ArrowUpRight size={13} className="relative ml-auto opacity-0 transition-opacity group-hover:opacity-100" style={{ color: D.faint }} /> : null}
        </>
      )}
    </NavLink>
  )
}

function SideNav({ email, onNavigate }) {
  return (
    <>
      <nav className="flex flex-col gap-0.5">{NAV.map((n) => <SideLink key={n.to} item={n} onNavigate={onNavigate} />)}</nav>
      <p className="mb-2 mt-8 px-3 text-[13px]" style={{ color: D.faint }}>Resources</p>
      <nav className="flex flex-col gap-0.5">{RESOURCES.map((n) => <SideLink key={n.to} item={n} onNavigate={onNavigate} />)}</nav>
      <div className="mt-auto flex items-center gap-3 rounded-[12px] px-3 py-3" style={{ background: D.surface }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold uppercase" style={{ background: '#3a2a1c', color: '#e9c59e' }}>{(email ?? '?')[0]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]" style={{ color: D.text }}>{email}</span>
          <span className="block text-[12px]" style={{ color: D.faint }}>Your account</span>
        </span>
        {configured ? (
          <button type="button" onClick={() => auth.signOut()} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[#25211d]" aria-label="Sign out" title="Sign out">
            <LogOut size={15} style={{ color: D.muted }} />
          </button>
        ) : null}
      </div>
    </>
  )
}

export default function Dashboard() {
  const session = useSession()
  const location = useLocation()
  const signedIn = configured ? Boolean(session) : true
  const { data: acct, error, reload, at } = useAccount(signedIn)
  const [menu, setMenu] = useState(false)

  useEffect(() => { setMenu(false) }, [location.pathname])

  if (configured && session === undefined) return null
  if (configured && !session) return <Navigate to="/signin" replace />

  const email = acct?.email ?? session?.user?.email
  const page = PAGE_NAMES[location.pathname.replace(/^\/dashboard\/?/, '').split('/')[0]] ?? 'Overview'

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen antialiased" style={{ background: D.ground, color: D.text, fontFamily: FONT }}>
        <style>{STYLES}</style>
        <style>{BOARD_STYLES}</style>
        <style>{'@keyframes dash-grow{from{transform:scaleY(0)}}.dash-bar{transform-origin:bottom;animation:dash-grow 700ms cubic-bezier(0.22,1,0.36,1) both}@media (prefers-reduced-motion: reduce){.dash-bar{animation:none}}'}</style>

        {/* sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col px-3 pb-3 lg:flex" style={{ borderRight: `1px solid ${D.rule}` }}>
          <Link to="/" className="flex h-16 shrink-0 items-center px-3"><MetalHex size={24} /><span className="ml-2.5 text-[19px] font-semibold" style={{ letterSpacing: '-0.04em' }}>lenar</span></Link>
          <div className="mt-3 flex flex-1 flex-col"><SideNav email={email} /></div>
        </aside>

        {/* top bar */}
        <header className="sticky top-0 z-20 lg:ml-[232px]" style={{ background: 'rgba(10,9,8,0.92)', borderBottom: `1px solid ${D.rule}` }}>
          <div className="flex h-14 items-center gap-3 px-4 sm:px-8 lg:h-16">
            <button type="button" onClick={() => setMenu(true)} className="grid h-9 w-9 place-items-center rounded-full lg:hidden" style={{ background: D.surface }} aria-label="Open menu">
              <Menu size={17} />
            </button>
            <nav className="flex min-w-0 items-center gap-2 text-[14px]" aria-label="Breadcrumb">
              <Link to="/dashboard" className="hidden transition-colors hover:text-[#f3efe7] sm:inline" style={{ color: D.muted }}>Account</Link>
              <span className="hidden sm:inline" style={{ color: D.control }}>/</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={page} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} style={{ color: D.text }}>{page}</motion.span>
              </AnimatePresence>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/dashboard/billing" className="hidden h-9 items-center gap-2 rounded-full px-3.5 text-[14px] transition-colors hover:bg-[#1d1a17] sm:inline-flex" style={{ background: D.surface }}>
                <span style={{ color: D.muted }}>Balance</span>
                <span className="tabular-nums" style={{ color: D.text }}>{acct ? <Num value={acct.balance ?? (acct.key ? null : 0)} format={(v) => money(v)} /> : '—'}</span>
              </Link>
              <a href="/docs" className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[14px] transition-colors hover:bg-[#1d1a17] hover:text-[#f3efe7] md:inline-flex" style={{ color: D.muted }}>Docs <ArrowUpRight size={14} /></a>
            </div>
          </div>
        </header>

        {/* phone menu */}
        <AnimatePresence>
          {menu ? (
            <>
              <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
              <motion.aside
                key="sheet"
                className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[320px] flex-col px-3 pb-3 lg:hidden"
                style={{ background: D.ground, boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <div className="flex h-14 shrink-0 items-center px-3">
                  <MetalHex size={22} /><span className="ml-2.5 text-[18px] font-semibold" style={{ letterSpacing: '-0.04em' }}>lenar</span>
                  <button type="button" onClick={() => setMenu(false)} className="ml-auto grid h-9 w-9 place-items-center rounded-full" style={{ background: D.surface }} aria-label="Close menu"><X size={17} /></button>
                </div>
                <div className="mt-3 flex flex-1 flex-col"><SideNav email={email} onNavigate={() => setMenu(false)} /></div>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <main className="px-4 pb-16 pt-6 sm:px-8 lg:ml-[232px] lg:pt-8">
          <div className="mx-auto max-w-[1120px]">
            {acct?.demo ? (
              <p className="mb-5 text-[13px]" style={{ color: D.faint }}>Demo account. Set <code className="font-mono">VITE_API_URL</code> to see a real one.</p>
            ) : null}
            {error ? <Notice tone="negative" action={<button type="button" onClick={reload} className="underline underline-offset-2">Retry</button>}>Couldn’t load your account. {error}</Notice> : null}
            {!acct ? (
              <div className="flex flex-col gap-4">
                <span className="h-8 w-40 rounded-[8px]" style={{ background: D.surface }} />
                <span className="h-[300px] w-full rounded-[14px]" style={{ background: D.surface }} />
                <span className="h-[120px] w-full rounded-[14px]" style={{ background: D.surface }} />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route index element={<Overview acct={acct} reload={reload} at={at} />} />
                  <Route path="usage" element={<Usage acct={acct} reload={reload} at={at} />} />
                  <Route path="key" element={<KeyPage acct={acct} reload={reload} />} />
                  <Route path="billing" element={<Billing acct={acct} reload={reload} at={at} />} />
                  <Route path="models" element={<ModelsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
