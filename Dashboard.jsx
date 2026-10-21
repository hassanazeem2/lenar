import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import {
  Activity, AlertTriangle, BookOpen, CreditCard, KeyRound, LayoutGrid, LogOut, RefreshCw,
} from 'lucide-react'
import { C, cn, STYLES, Wordmark, CopyLine } from './SimpleLanding.jsx'
import { auth, api, configured, useSession, API_BASE } from './src/lib/api.js'
import { Dialog, DialogContent, Tabs, TabsList, TabsTrigger, TooltipProvider } from './src/ui.jsx'

const TOPUPS = [1000, 2500, 5000, 10000]
const FONT = "'Instrument Sans', ui-sans-serif, system-ui, sans-serif"

/* ---------- formatting ---------- */

const money = (v, digits) => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', {
  minimumFractionDigits: digits ?? (Math.abs(v) < 10 ? 2 : 2),
  maximumFractionDigits: digits ?? (Math.abs(v) < 1 && v !== 0 ? 4 : 2),
})}`)
const compact = (n) => (n == null ? '—' : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n))
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}% cached` : 'no cache hits yet')

/* ---------- demo data (until the backend is configured) ---------- */

function demoAccount() {
  const now = Date.now()
  let spent = 0
  const series = Array.from({ length: 15 }, (_, i) => {
    spent += 0.4 + Math.abs(Math.sin(i * 1.7)) * 1.6 + i * 0.08
    return { t: new Date(now - (14 - i) * 864e5).toISOString(), spent: +spent.toFixed(2) }
  })
  return {
    demo: true,
    email: 'you@example.com',
    key: { prefix: 'sk-7a3f91c2…e04b', created_at: new Date(now - 9 * 864e5).toISOString(), can_reveal: false },
    balance: 18.42,
    spent: spent,
    usage: {
      '1h': { tokens: 412_000, cached: 301_000, cost: 0.09, savings: 0.03 },
      '24h': { tokens: 11_700_000, cached: 9_240_000, cost: 1.18, savings: 0.61 },
      '7d': { tokens: 64_300_000, cached: 47_100_000, cost: 9.84, savings: 4.02 },
    },
    series,
    topups: [
      { id: 'a91c2e04', paid: 25, credited: 25, status: 'funded', created_at: new Date(now - 9 * 864e5).toISOString() },
      { id: 'c88d10fa', paid: 10, credited: 10, status: 'funded', created_at: new Date(now - 2 * 864e5).toISOString() },
    ],
  }
}

/* ---------- data ---------- */

function useAccount(enabled) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    if (!configured) return setData(demoAccount())
    try {
      setData(await api('/account'))
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])
  useEffect(() => { if (enabled) load() }, [enabled, load])
  return { data, error, reload: load }
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
    const day = byDay.get(new Date(series[i].t).toDateString())
    if (day) day.v += delta
  }
  return [...byDay.values()]
}

/* ---------- bits ---------- */

function AnimatedNumber({ value, format }) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 })
  const text = useTransform(spring, (v) => format(v))
  useEffect(() => { if (value != null) spring.set(value) }, [value, spring])
  if (value == null) return <span>—</span>
  return <motion.span style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</motion.span>
}

function Stat({ label, value, format, sub, subTone = C.up, i = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border px-4 py-3.5"
      style={{ borderColor: C.line, background: 'rgba(244,245,246,0.02)' }}
    >
      <p className="uppercase tracking-wider" style={{ fontSize: 10, color: C.faint }}>{label}</p>
      <p className="mt-1.5 text-xl font-medium sm:text-[22px]">
        {typeof value === 'number' || value == null ? <AnimatedNumber value={value} format={format} /> : value}
      </p>
      {sub ? <p className="mt-0.5 text-xs" style={{ color: subTone }}>{sub}</p> : null}
    </motion.div>
  )
}

function Card({ title, right, children, className }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border', className)} style={{ borderColor: C.line2, background: 'rgba(244,245,246,0.035)' }}>
      <div className="m-2 overflow-hidden rounded-xl border sm:m-3" style={{ borderColor: C.line, background: 'rgba(8,9,10,0.75)' }}>
        <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: C.line }}>
          <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.16)' }} />
          <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.11)' }} />
          <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.08)' }} />
          <span className="ml-3 truncate text-xs" style={{ color: C.faint }}>{title}</span>
          <div className="ml-auto">{right}</div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </section>
  )
}

function SpendChart({ days }) {
  const [hover, setHover] = useState(null)
  const W = 800, H = 260, PX = 8, PY = 18
  const max = Math.max(0.01, ...days.map((d) => d.v)) * 1.15
  const pts = days.map((d, i) => [PX + (i / Math.max(1, days.length - 1)) * (W - PX * 2), H - PY - (d.v / max) * (H - PY * 2)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts.at(-1)[0]},${H} L${pts[0][0]},${H} Z`
  const empty = days.every((d) => d.v === 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-56 w-full sm:h-64" preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * W
          let best = 0
          pts.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(pts[best][0] - x)) best = i })
          setHover(best)
        }}
      >
        <defs>
          <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.accent} stopOpacity="0.32" />
            <stop offset="1" stopColor={C.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="rgba(244,245,246,0.05)" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path d={area} fill="url(#dash-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path d={line} fill="none" stroke={C.accent} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
        {hover != null ? (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1="0" y2={H} stroke="rgba(244,245,246,0.18)" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {/* end dot + hover dot (HTML so they stay round with preserveAspectRatio=none) */}
      {[hover ?? pts.length - 1].map((i) => (
        <span key={i} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${(pts[i][0] / W) * 100}%`, top: `${(pts[i][1] / H) * 100}%`, background: C.accent, boxShadow: `0 0 0 4px rgba(205,138,76,0.18)` }} />
      ))}
      {hover != null ? (
        <div className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs"
          style={{ left: `${Math.min(88, Math.max(12, (pts[hover][0] / W) * 100))}%`, borderColor: C.line2, background: '#111214' }}>
          <span style={{ color: C.dim }}>{days[hover].label}</span> · {money(days[hover].v)}
        </div>
      ) : null}
      {empty ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm" style={{ color: C.dim }}>
          Your daily spend shows up here once you start making requests.
        </div>
      ) : null}
      <div className="mt-2 flex justify-between text-[11px]" style={{ color: C.faint }}>
        <span>{days[0].label}</span><span>{days[Math.floor(days.length / 2)].label}</span><span>Today</span>
      </div>
    </div>
  )
}

function Page({ title, sub, actions, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(3px)', transition: { duration: 0.15 } }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
          {sub ? <p className="mt-1 text-sm" style={{ color: C.dim }}>{sub}</p> : null}
        </div>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </motion.div>
  )
}

function UpstreamNotice({ code }) {
  if (!code) return null
  return (
    <div role="alert" className="alert alert-warning alert-soft mb-5 text-sm">
      <AlertTriangle size={15} />
      <span>Live balance and usage are temporarily unavailable. Your key still works; numbers will refresh shortly.</span>
    </div>
  )
}

/* ---------- pages ---------- */

function Overview({ acct, reload }) {
  const [win, setWin] = useState('24h')
  const u = acct.usage?.[win]
  const days = useMemo(() => dailySpend(acct.series ?? []), [acct.series])
  const [refreshing, setRefreshing] = useState(false)
  const refresh = async () => { setRefreshing(true); await reload(); setRefreshing(false) }

  return (
    <Page
      title="Overview"
      sub={acct.key ? 'Live from your key. Numbers include all models.' : 'Top up to create your API key.'}
      actions={(
        <>
          <button type="button" onClick={refresh} className="btn btn-ghost btn-sm font-normal text-white/60" aria-label="Refresh">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to="/dashboard/billing" className="btn btn-primary btn-sm">Top up</Link>
        </>
      )}
    >
      <UpstreamNotice code={acct.upstream_error} />
      {!acct.key ? (
        <EmptyKey />
      ) : (
        <Card
          title="Usage · Overview"
          right={(
            <Tabs value={win} onValueChange={setWin}>
              <TabsList className="p-0.5">
                {['1h', '24h', '7d'].map((w) => <TabsTrigger key={w} value={w} className="px-2.5 py-1 text-[11px]">{w}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          )}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat i={0} label={`Spend (${win})`} value={u?.cost ?? null} format={(v) => money(v)} sub={`last ${win}`} />
            <Stat i={1} label={`Tokens (${win})`} value={u?.tokens ?? null} format={compact} sub={u ? pct(u.cached, u.tokens) : null} />
            <Stat i={2} label="Balance" value={acct.balance} format={(v) => money(v, 2)} sub={acct.balance != null && acct.balance < 2 ? 'running low' : 'available credit'} subTone={acct.balance != null && acct.balance < 2 ? '#fbbf24' : C.up} />
            <Stat i={3} label={`Cache savings (${win})`} value={u?.savings ?? null} format={(v) => money(v)} sub="saved by caching" />
          </div>
          <div className="mt-4 rounded-xl border p-3 sm:p-4" style={{ borderColor: C.line }}>
            <div className="mb-2 flex items-center justify-between text-xs" style={{ color: C.faint }}>
              <span className="uppercase tracking-wider" style={{ fontSize: 10 }}>Daily spend · 14 days</span>
              <span>Total all time · {money(acct.spent)}</span>
            </div>
            <SpendChart days={days} />
          </div>
        </Card>
      )}
    </Page>
  )
}

function EmptyKey() {
  return (
    <Card title="Get started">
      <div className="py-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: C.line2 }}>
          <KeyRound size={20} style={{ color: C.dim }} />
        </div>
        <h2 className="text-lg font-medium">No API key yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: C.dim }}>
          Add credit and we'll create your key straight away. It works with every model on one base URL.
        </p>
        <Link to="/dashboard/billing" className="btn btn-primary mt-6">Add credit</Link>
      </div>
    </Card>
  )
}

function KeyPage({ acct, reload }) {
  const [secret, setSecret] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const [confirmRoll, setConfirmRoll] = useState(false)

  const run = async (name) => {
    setBusy(name); setErr(null)
    try {
      if (acct.demo) throw new Error('Demo mode: set VITE_API_URL to manage real keys.')
      const { key } = await api(`/${name}`, {})
      setSecret(key)
      reload()
    } catch (e) { setErr(e.message) } finally { setBusy(null); setConfirmRoll(false) }
  }

  const snippet = `from openai import OpenAI

client = OpenAI(
    base_url="${API_BASE}",
    api_key="${secret ?? 'YOUR_KEY'}",
)`

  return (
    <Page title="API key" sub="One key for every model. Keep it on your server.">
      {err ? <div role="alert" className="alert alert-error alert-soft mb-5 text-sm"><span>{err}</span></div> : null}
      {!acct.key ? <EmptyKey /> : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card title="Your key">
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3 font-mono text-sm" style={{ borderColor: C.line2 }}>
              <span className="truncate">{acct.key.prefix}</span>
              <span className={cn('badge badge-sm badge-soft ml-auto shrink-0', acct.key.can_reveal ? 'badge-warning' : 'badge-success')}>
                {acct.key.can_reveal ? 'Not revealed' : 'Active'}
              </span>
            </div>
            <p className="mt-3 text-xs" style={{ color: C.faint }}>Created {new Date(acct.key.created_at).toLocaleDateString()}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {acct.key.can_reveal ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => run('reveal-key')} disabled={!!busy}>
                  {busy === 'reveal-key' ? <span className="loading loading-spinner loading-xs" /> : null} Reveal key (one time)
                </button>
              ) : null}
              <button type="button" className="btn btn-outline btn-sm border-white/15 font-normal hover:border-white/30 hover:bg-white/5" onClick={() => setConfirmRoll(true)} disabled={!!busy}>
                <RefreshCw size={13} /> Roll key
              </button>
            </div>
            <p className="mt-4 text-xs leading-relaxed" style={{ color: C.faint }}>
              Lost it, or think it leaked? Rolling creates a new key with your full balance and switches off the old one immediately.
            </p>
          </Card>
          <Card title="Quickstart · Python" right={<CopyLine text={snippet} />}>
            <pre className="overflow-x-auto font-mono text-[12.5px] leading-relaxed" style={{ color: 'rgba(244,245,246,0.75)' }}>{snippet}</pre>
            <Link to="/docs#quickstart" className="mt-3 inline-flex items-center gap-1.5 text-xs hover:text-white" style={{ color: C.dim }}>
              <BookOpen size={13} /> More examples in the docs
            </Link>
          </Card>
        </div>
      )}

      <Dialog open={confirmRoll} onOpenChange={setConfirmRoll}>
        <DialogContent title="Roll your API key?" description="Your current key stops working right away. Your balance moves to the new key.">
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRoll(false)}>Cancel</button>
            <button type="button" className="btn btn-error btn-sm" onClick={() => run('roll-key')} disabled={!!busy}>
              {busy === 'roll-key' ? <span className="loading loading-spinner loading-xs" /> : null} Roll key
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(secret)} onOpenChange={(o) => { if (!o) setSecret(null) }}>
        <DialogContent title="Your API key" description="Copy it now. This is the only time we can show the full key.">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-sm" style={{ borderColor: C.line2 }}>
            <span className="truncate">{secret}</span>
            <CopyLine text={secret ?? ''} />
          </div>
          <div role="alert" className="alert alert-warning alert-soft mt-4 text-sm">
            <AlertTriangle size={15} />
            <span>Store it on your server or in a secrets manager. Never put it in front-end code.</span>
          </div>
          <button type="button" onClick={() => setSecret(null)} className="btn btn-primary mt-5 w-full">I've saved it</button>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

function Billing({ acct, reload }) {
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(null)
  const [method, setMethod] = useState('card')
  const [err, setErr] = useState(null)
  const success = params.get('topup') === 'success'

  // The webhook lands a few seconds after the customer comes back; poll until it shows up.
  useEffect(() => {
    if (!success) return
    const t = setInterval(reload, 3000)
    const stop = setTimeout(() => { clearInterval(t); setParams({}, { replace: true }) }, 30000)
    return () => { clearInterval(t); clearTimeout(stop) }
  }, [success, reload, setParams])

  const topUp = async (amount_cents) => {
    setBusy(amount_cents); setErr(null)
    try {
      if (acct.demo) throw new Error('Demo mode: set VITE_API_URL to take real payments.')
      const path = method === 'crypto' ? '/create-checkout/crypto' : '/create-checkout'
      const { url } = await api(path, { amount_cents })
      window.location.href = url
    } catch (e) { setErr(e.message); setBusy(null) }
  }

  return (
    <Page title="Billing" sub="Prepaid credit. Charged per token at the rates on the pricing page.">
      {success ? (
        <div role="status" className="alert alert-success alert-soft mb-5 text-sm">
          <span>Payment received. Your credit appears here within a few seconds.</span>
        </div>
      ) : null}
      {err ? <div role="alert" className="alert alert-error alert-soft mb-5 text-sm"><span>{err}</span></div> : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card title="Add credit">
          <p className="uppercase tracking-wider" style={{ fontSize: 10, color: C.faint }}>Balance</p>
          <p className="mt-1 text-4xl font-medium"><AnimatedNumber value={acct.balance ?? (acct.key ? null : 0)} format={(v) => money(v, 2)} /></p>
          <div className="mt-6 flex rounded-lg border p-0.5" style={{ borderColor: C.line2 }}>
            {[['card', 'Card'], ['crypto', 'Crypto']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className="h-8 flex-1 rounded-md text-sm"
                style={{ background: method === id ? 'rgba(244,245,246,0.08)' : 'transparent', color: method === id ? C.fg : C.dim }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TOPUPS.map((c) => (
              <motion.button
                key={c}
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={busy !== null}
                onClick={() => topUp(c)}
                className="btn h-12 border-white/15 bg-transparent font-normal hover:border-white/30 hover:bg-white/5"
              >
                {busy === c ? <span className="loading loading-spinner loading-xs" /> : `+ ${money(c / 100, 0)}`}
              </motion.button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed" style={{ color: C.faint }}>
            {method === 'crypto'
              ? 'Crypto is paid through WolvPay. You choose the coin at checkout. Credit is added when the payment confirms, and it does not expire.'
              : 'Card payments are handled by Stripe. Credit does not expire.'}
          </p>
        </Card>
        <Card title="History">
          {acct.topups?.length ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr style={{ color: C.faint }}><th>Date</th><th>Method</th><th>Paid</th><th>Credit</th><th>Status</th></tr></thead>
                <tbody>
                  {acct.topups.map((t) => (
                    <tr key={t.id} className="border-white/5">
                      <td style={{ color: C.dim }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>{t.provider === 'crypto' ? 'Crypto' : 'Card'}</td>
                      <td>{money(t.paid, 2)}</td>
                      <td>{money(t.credited, 2)}</td>
                      <td><span className={cn('badge badge-sm badge-soft', t.status === 'funded' ? 'badge-success' : 'badge-warning')}>{t.status === 'funded' ? 'Added' : 'Processing'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: C.dim }}>No payments yet.</p>
          )}
        </Card>
      </div>
    </Page>
  )
}

/* ---------- shell ---------- */

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/dashboard/key', label: 'API key', icon: KeyRound },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
]
const EXTERNAL = [
  { to: '/docs', label: 'Docs', icon: BookOpen },
  { to: '/status', label: 'Status', icon: Activity },
]

function SideLink({ item, layoutId }) {
  return (
    <NavLink to={item.to} end={item.end} className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors">
      {({ isActive }) => (
        <>
          {isActive ? <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg" style={{ background: 'rgba(244,245,246,0.08)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
          <item.icon size={15} className="relative" style={{ color: isActive ? C.fg : C.faint }} />
          <span className="relative" style={{ color: isActive ? C.fg : C.dim }}>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Dashboard() {
  const session = useSession()
  const location = useLocation()
  const signedIn = configured ? Boolean(session) : true
  const { data: acct, error, reload } = useAccount(signedIn)

  if (configured && session === undefined) return null
  if (configured && !session) return <Navigate to="/signin" replace />

  const email = acct?.email ?? session?.user?.email

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen antialiased" style={{ background: C.bg, color: C.fg, fontFamily: FONT }}>
        <style>{STYLES}</style>
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px]" style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(205,138,76,0.08), transparent 70%)' }} />

        {/* sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r px-3 py-5 lg:flex" style={{ borderColor: C.line, background: 'rgba(8,9,10,0.85)' }}>
          <Link to="/" className="mb-8 px-3"><Wordmark /></Link>
          <nav className="space-y-0.5">{NAV.map((n) => <SideLink key={n.to} item={n} layoutId="side-pill" />)}</nav>
          <p className="mb-2 mt-8 px-3 uppercase tracking-widest" style={{ fontSize: 10, color: C.faint }}>Resources</p>
          <nav className="space-y-0.5">{EXTERNAL.map((n) => <SideLink key={n.to} item={n} layoutId="side-pill-ext" />)}</nav>
          <div className="mt-auto border-t px-3 pt-4" style={{ borderColor: C.line }}>
            <p className="truncate text-xs" style={{ color: C.dim }}>{email}</p>
            {configured ? (
              <button type="button" onClick={() => auth.signOut()} className="mt-2 inline-flex items-center gap-1.5 text-xs hover:text-white" style={{ color: C.faint }}>
                <LogOut size={12} /> Sign out
              </button>
            ) : null}
          </div>
        </aside>

        {/* mobile top bar */}
        <header className="sticky top-0 z-30 border-b backdrop-blur-xl lg:hidden" style={{ borderColor: C.line, background: 'rgba(8,9,10,0.85)' }}>
          <div className="flex h-14 items-center px-4">
            <Link to="/"><Wordmark height={14} /></Link>
            {configured ? (
              <button type="button" onClick={() => auth.signOut()} className="btn btn-ghost btn-xs ml-auto font-normal text-white/50"><LogOut size={12} /> Sign out</button>
            ) : null}
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{NAV.map((n) => <SideLink key={n.to} item={n} layoutId="top-pill" />)}</nav>
        </header>

        <main className="relative px-4 py-8 sm:px-8 lg:ml-60 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-5xl">
            {acct?.demo ? (
              <div className="alert alert-info alert-soft mb-6 text-sm">
                <span><b>Demo data.</b> Set <code>VITE_API_URL</code> in <code>.env</code> to see your real account. See SETUP.md.</span>
              </div>
            ) : null}
            {error ? <div role="alert" className="alert alert-error alert-soft mb-6 text-sm"><span>{error}</span></div> : null}
            {!acct ? (
              <div className="grid gap-3">
                <span className="skeleton h-8 w-40" />
                <span className="skeleton h-[420px] w-full rounded-2xl" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route index element={<Overview acct={acct} reload={reload} />} />
                  <Route path="key" element={<KeyPage acct={acct} reload={reload} />} />
                  <Route path="billing" element={<Billing acct={acct} reload={reload} />} />
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
