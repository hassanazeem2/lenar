import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, Check, ChevronRight, Copy, Gauge, KeyRound,
  Layers, LayoutTemplate, Plus, RefreshCw, Sparkles, Tag, Zap,
} from 'lucide-react'
import { CATALOG, MODEL_COUNT, PROVIDER_COUNT } from './models.js'
import { API_BASE, useSession } from './src/lib/supabase.js'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Tabs } from './src/ui.jsx'
import { Tabs as TabsP } from '@animate-ui/react/primitives/radix-ui'
import { motion } from 'motion/react'
import HeroScroll from './HeroScroll.jsx'
import { ScrollIn, ScrollTitle, ScrollProgress, RisingFooterArt } from './src/scroll.jsx'

export const cn = (...c) => c.filter(Boolean).join(' ')

export const C = {
  bg: '#08090a',
  fg: '#f4f5f6',
  dim: 'rgba(244,245,246,0.45)',
  faint: 'rgba(244,245,246,0.32)',
  line: 'rgba(244,245,246,0.07)',
  line2: 'rgba(244,245,246,0.14)',
  card: 'rgba(244,245,246,0.025)',
  up: '#4ade80',
  down: '#f87171',
  blue: '#60a5fa',
}

const MARK_VB = '0 0 100 100'
const MARK_D = 'M50 6 L94 50 L50 94 L6 50 Z'

const MODELS = MODEL_COUNT

const SDK_TABS = [
  {
    label: 'OpenAI · Python',
    icon: Zap,
    lang: 'python',
    copy: `from openai import OpenAI
client = OpenAI(
    base_url="${API_BASE}",
    api_key="sk-lenar-...",
)`,
  },
  {
    label: 'Anthropic · TS',
    icon: Layers,
    lang: 'typescript',
    copy: `import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({
  baseURL: "${API_BASE}",
  apiKey: "sk-lenar-...",
});`,
  },
  {
    label: 'Gemini · Python',
    icon: Sparkles,
    lang: 'python',
    copy: `from google import genai
client = genai.Client(
    api_key="sk-lenar-...",
    http_options={"base_url": "${API_BASE}"},
)`,
  },
  {
    label: 'cURL',
    icon: Activity,
    lang: 'bash',
    copy: `curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer sk-lenar-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'`,
  },
]

const SCREENS = [
  { slug: 'usage-overview', label: 'Usage overview' },
  { slug: 'model-breakdown', label: 'Model breakdown' },
  { slug: 'keys-table', label: 'API keys' },
  { slug: 'live-status', label: 'Live status' },
]

const FEATURES = [
  { icon: Zap, title: 'One endpoint', body: 'Same request shape across every provider. Point your existing SDK at Lenar and keep shipping.' },
  { icon: Tag, title: 'Real usage billing', body: 'Token-level cost, not a flat-rate guess. See exactly what each call burned.' },
  { icon: KeyRound, title: 'Per-key limits', body: 'Rate limits and model allowlists per customer key, enforced at the edge.' },
  { icon: RefreshCw, title: 'Automatic failover', body: 'A dead upstream doesn\'t take you down. We route around outages without a deploy.' },
  { icon: Activity, title: 'Live model status', body: 'Uptime and latency per model, not a promise. Watch health before your users feel it.' },
  { icon: Gauge, title: 'Your own pricing', body: 'Set markup per model, white-label the name, and bill your customers on your terms.' },
]

const FAQ = [
  ['Which models do you support?', 'Claude, GPT, Gemini, DeepSeek, GLM, Grok, Kimi, Qwen, and more — eighty models behind one key, with new releases added as they ship.'],
  ['Is this a drop-in replacement for the official SDKs?', `Yes. Keep the SDK you already use and set base_url to ${API_BASE} with your lenar API key. Request and response shapes stay the same.`],
  ['How is billing calculated?', 'Per token, per model, at the rate shown on pricing. You see spend and usage live — not a monthly flat guess.'],
  ['Can I set my own markup / white-label this?', 'Yes. Set markup per model and rename what your customers see. White-label the gateway without forking the stack.'],
]

export const SHELL = 'mx-auto w-full max-w-6xl px-6 sm:px-10'
export const AIR = 'py-28 sm:py-36'
const EASE = 'cubic-bezier(0.22,1,0.36,1)'

export function TwoTone({ lead, claim }) {
  return (
    <>
      <span style={{ color: C.fg }}>{lead} </span>
      <span style={{ color: 'rgba(244,245,246,0.35)' }}>{claim}</span>
    </>
  )
}

export function Title({ lead, claim, className, children }) {
  return (
    <h2 className={cn('font-medium leading-tight', className)} style={{ fontSize: 'clamp(30px, 4.4vw, 46px)', letterSpacing: '-0.03em', textWrap: 'balance' }}>
      {children ?? <TwoTone lead={lead} claim={claim} />}
    </h2>
  )
}

function useInView(once = true) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return setSeen(true)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        if (once) io.disconnect()
      }
    }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [once])
  return [ref, seen]
}

export function Reveal({ children, delay = 0, className }) {
  const [ref, seen] = useInView()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (el && el.getBoundingClientRect().top > window.innerHeight) setArmed(true)
  }, [ref])
  const hidden = armed && !seen
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(20px)' : 'none',
        transition: `opacity 700ms ${EASE} ${delay}ms, transform 700ms ${EASE} ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export function Rise({ children, i = 0, className }) {
  return (
    <div className={cn('ssy-rise', className)} style={{ animationDelay: `${80 + i * 90}ms` }}>
      {children}
    </div>
  )
}

function CountUp({ target }) {
  const [ref, seen] = useInView()
  const [v, setV] = useState(target)
  useEffect(() => {
    if (!seen || target === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / 1400, 1)
      setV(Math.round(target * (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    setV(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, target])
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
}

export function Wordmark({ height = 17 }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ color: C.fg }}>
      <svg viewBox={MARK_VB} style={{ height: height + 4, width: 'auto' }} aria-hidden>
        <path d={MARK_D} fill="currentColor" />
      </svg>
      <span className="font-semibold" style={{ fontSize: height + 3, letterSpacing: '-0.04em', lineHeight: 1 }}>lenar</span>
    </span>
  )
}

export function MetalMark({ size = 250 }) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const [spin, setSpin] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (e) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 520))
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 520))
      setTilt({ x: -dy * 16, y: dx * 16, on: true })
    }
    const leave = () => setTilt({ x: 0, y: 0, on: false })
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])
  const w = 100
  const h = 100
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Flip the lenar mark"
      onClick={() => setSpin((s) => s + 720)}
      className="relative cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      style={{ perspective: size * 4 }}
    >
      <div
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + spin}deg)`,
          transition: `transform ${spin ? 1900 : 450}ms ${EASE}`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className={tilt.on ? '' : 'ssy-sway'}>
          <svg viewBox={MARK_VB} width={size} height={size} style={{ overflow: 'visible', filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.9))' }}>
            <defs>
              <linearGradient id="mm-fill" x1={0.497 * w} y1={-0.045 * h} x2={0.283 * w} y2={0.964 * h} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.478" stopColor="#e4e4e4" />
                <stop offset="0.608" stopColor="#c4c4c4" />
                <stop offset="0.861" stopColor="#a0a0a0" />
                <stop offset="1" stopColor="#5c5c5c" />
              </linearGradient>
              <radialGradient id="mm-stroke" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${0.728 * w} ${0.071 * h}) rotate(124.8) scale(${0.977 * w} ${1.31 * h})`}>
                <stop offset="0.072" stopColor="#f7f7f7" />
                <stop offset="0.385" stopColor="#e4e4e4" />
                <stop offset="0.764" stopColor="#7b7b7b" />
                <stop offset="1" stopColor="#ffffff" />
              </radialGradient>
              <linearGradient id="mm-sheen" x1="0" y1="0" x2="1" y2="0.3">
                <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <clipPath id="mm-clip"><path d={MARK_D} /></clipPath>
            </defs>
            <path d={MARK_D} fill="url(#mm-fill)" stroke="url(#mm-stroke)" strokeWidth={w / 40} strokeLinejoin="round" />
            <g clipPath="url(#mm-clip)" style={{ opacity: tilt.on ? 0 : 1, transition: 'opacity 300ms' }}>
              <rect className="ssy-sheen" x={-w} y="0" width={w} height={h} fill="url(#mm-sheen)" />
            </g>
          </svg>
        </div>
      </div>
    </button>
  )
}

export function AsciiRidge({ flip = false, height = 420, opacity = 0.5 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const ramp = ' .:-=+*#%@'
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const wpx = canvas.offsetWidth
      const hpx = canvas.offsetHeight
      canvas.width = wpx * dpr
      canvas.height = hpx * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, wpx, hpx)
      const cell = 7
      ctx.font = `${cell}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const cols = Math.ceil(wpx / cell)
      const rows = Math.ceil(hpx / cell)
      const ridge = (x) => {
        const u = x / cols
        return 0.42 + 0.16 * Math.sin(u * 7.1 + 1.3) + 0.09 * Math.sin(u * 17.3 + 0.4) + 0.05 * Math.sin(u * 41.7) + 0.025 * Math.sin(u * 93.1 + 2)
      }
      const hash = (x, y) => {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
        return n - Math.floor(n)
      }
      for (let gx = 0; gx < cols; gx++) {
        const top = ridge(gx) * rows
        for (let gy = 0; gy < rows; gy++) {
          const ry = flip ? rows - 1 - gy : gy
          if (ry < top) continue
          const depth = (ry - top) / (rows - top + 1)
          const slope = ridge(gx + 1) - ridge(gx)
          let v = 0.95 - depth * 0.85 + slope * 6 + (hash(gx, ry) - 0.5) * 0.35
          if (ry - top < 2) v += 0.3
          v = Math.max(0, Math.min(1, v))
          if (v < 0.08) continue
          const ch = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))]
          if (ch === ' ') continue
          ctx.globalAlpha = 0.15 + v * 0.85
          ctx.fillStyle = '#dceaff'
          ctx.fillText(ch, gx * cell + cell / 2, gy * cell + cell / 2)
        }
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [flip])
  const fade = flip
    ? 'linear-gradient(to bottom, black 0%, black 20%, transparent 100%)'
    : 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none block w-full select-none"
      style={{ height, opacity, maskImage: fade, WebkitMaskImage: fade }}
    />
  )
}

export function Chevron() {
  return <ChevronRight size={13} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-0.5" />
}

export function TextLink({ children, to, href, chevron = true }) {
  const dest = to ?? href ?? '#'
  const cls = 'group inline-flex items-center gap-1 text-sm transition-colors hover:text-white'
  const style = { color: 'rgba(244,245,246,0.55)' }
  const inner = (
    <>
      {children}
      {chevron ? <Chevron /> : null}
    </>
  )
  if (typeof dest === 'string' && dest.startsWith('/')) {
    return <Link to={dest} className={cls} style={style}>{inner}</Link>
  }
  return <a href={dest} className={cls} style={style}>{inner}</a>
}

export function PrimaryButton({ children, small, href, to, className, type, onClick }) {
  const dest = to ?? href
  const cls = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-opacity hover:opacity-90',
    small ? 'px-3.5 py-2 text-sm' : 'px-5 py-3 text-sm',
    className,
  )
  const style = { background: C.fg, color: C.bg }
  if (type === 'submit' || type === 'button' || onClick) {
    return (
      <button type={type || 'button'} onClick={onClick} className={cls} style={style}>
        {children}
      </button>
    )
  }
  if (dest && dest.startsWith('/')) {
    return <Link to={dest} className={cls} style={style}>{children}</Link>
  }
  return (
    <a href={dest || '#'} className={cls} style={style}>
      {children}
    </a>
  )
}

const NAV = [
  { label: 'Models', to: '/#models' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Docs', to: '/docs' },
  { label: 'Status', to: '/status' },
]

export function Nav() {
  const { pathname } = useLocation()
  const session = useSession()
  const [hover, setHover] = useState(null)
  const current = NAV.find((n) => n.to === pathname)?.to
  const pill = hover ?? current
  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: C.line, background: 'rgba(8,9,10,0.8)' }}>
      <div className={cn(SHELL, 'flex h-16 items-center gap-8')}>
        <Link to="/" className="shrink-0"><Wordmark /></Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" onMouseLeave={() => setHover(null)}>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onMouseEnter={() => setHover(n.to)}
              className="relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200"
              style={{ color: n.to === current || n.to === hover ? C.fg : C.dim }}
            >
              {pill === n.to ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full"
                  style={{ background: n.to === current && !hover ? 'rgba(244,245,246,0.09)' : 'rgba(244,245,246,0.06)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {session ? (
            <PrimaryButton small to="/dashboard">Dashboard <ArrowRight size={14} strokeWidth={2.5} /></PrimaryButton>
          ) : (
            <>
              <TextLink to="/signin" chevron={false}>Sign in</TextLink>
              <PrimaryButton small to="/signup">Create account <ArrowRight size={14} strokeWidth={2.5} /></PrimaryButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function GlassFrame({ children, className }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border p-5 sm:p-6', className)} style={{ background: 'rgba(244,245,246,0.06)', borderColor: 'rgba(244,245,246,0.1)' }}>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: C.line, background: 'rgba(8,9,10,0.6)' }}>
        {children}
      </div>
    </div>
  )
}

export function CopyLine({ text }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok).catch(ok)
    else ok()
  }
  return (
    <button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/5 hover:text-white" style={{ color: C.dim }}>
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'copied' : 'copy'}
    </button>
  )
}

export function SectionIcon({ icon: Icon }) {
  return (
    <div className="mb-5 flex justify-center">
      <span className="ssy-float grid h-14 w-14 place-items-center rounded-2xl border" style={{ borderColor: C.line2, background: 'linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))', color: '#e4e4e4', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}>
        <Icon size={24} strokeWidth={1.75} />
      </span>
    </div>
  )
}

function SdkCode({ code }) {
  return (
    <pre className="overflow-x-auto px-4 py-5 text-left font-mono text-xs leading-relaxed sm:text-sm" style={{ color: 'rgba(244,245,246,0.7)' }}>
      {code.split('\n').map((line, i) => (
        <span key={i}>
          {line.includes(API_BASE) || line.includes('sk-lenar') ? (
            <>
              {line.split(new RegExp(`(${API_BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}|sk-lenar-\\.\\.\\.)`, 'g')).map((part, j) => (
                <span key={j} style={part === API_BASE || part.startsWith('sk-lenar') ? { color: C.fg } : undefined}>{part}</span>
              ))}
            </>
          ) : (
            <span style={line.trim().startsWith('#') || line.trim().startsWith('//') ? { color: C.faint } : undefined}>{line}</span>
          )}
          {'\n'}
        </span>
      ))}
    </pre>
  )
}

function SdkSwitcher() {
  return (
    <section id="models" className={cn(SHELL, AIR, 'text-center')}>
      <SectionIcon icon={Layers} />
      <ScrollTitle lead="Switch providers," claim="not code" />
      <Tabs defaultValue={SDK_TABS[0].label}>
        <ScrollIn>
          <TabsP.List className="relative mx-auto mt-14 flex w-max max-w-full flex-wrap items-start justify-center gap-2">
            {SDK_TABS.map((c) => {
              const Icon = c.icon
              return (
                <TabsP.Trigger
                  key={c.label}
                  value={c.label}
                  className="group relative z-10 flex w-24 flex-col items-center gap-2 rounded-2xl py-2 outline-none transition-colors data-[state=active]:bg-white/[0.06] sm:w-28"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.14] text-white/45 transition-all duration-300 group-hover:text-white/80 group-focus-visible:ring-2 group-focus-visible:ring-white/30 group-data-[state=active]:border-white/25 group-data-[state=active]:text-white">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs leading-tight text-white/30 transition-colors group-data-[state=active]:text-white">{c.label}</span>
                </TabsP.Trigger>
              )
            })}
          </TabsP.List>
        </ScrollIn>
        <ScrollIn tilt i={1}>
          <GlassFrame className="mx-auto mt-14 max-w-3xl">
            {SDK_TABS.map((c) => (
              <TabsP.Content key={c.label} value={c.label}>
                <div className="flex items-center gap-2 border-b px-4 py-2.5 text-left" style={{ borderColor: C.line }}>
                  <span className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(244,245,246,0.07)', color: 'rgba(244,245,246,0.85)' }}>{c.label}</span>
                  <span className="text-xs" style={{ color: C.faint }}>base_url + api_key</span>
                  <CopyLine text={c.copy} />
                </div>
                <SdkCode code={c.copy} />
              </TabsP.Content>
            ))}
          </GlassFrame>
        </ScrollIn>
      </Tabs>
    </section>
  )
}

function Features() {
  return (
    <section className={cn(SHELL, AIR)}>
      <div className="text-center">
        <ScrollTitle lead="Built for teams" claim="that ship on models" />
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon
          return (
            <ScrollIn key={f.title} i={i % 3}>
              <div className="h-full rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/5" style={{ borderColor: C.line, background: C.card }}>
                <span className="grid h-9 w-9 place-items-center rounded-lg border" style={{ borderColor: 'rgba(244,245,246,0.09)', color: 'rgba(244,245,246,0.7)' }}>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-medium" style={{ fontSize: 15, color: 'rgba(244,245,246,0.9)' }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.dim }}>{f.body}</p>
              </div>
            </ScrollIn>
          )
        })}
      </div>
    </section>
  )
}

function Numbers({ models, uptime, requests, providers }) {
  const stats = [
    { n: models, l: 'models supported' },
    { n: uptime, l: 'avg uptime %' },
    { n: requests, l: 'M requests routed daily' },
    { n: providers, l: 'providers behind the scenes' },
  ]
  return (
    <section className={cn(SHELL, 'pb-10')}>
      <ScrollIn>
        <div className="grid grid-cols-2 gap-y-8 rounded-2xl border px-6 py-10 text-center sm:grid-cols-4" style={{ borderColor: C.line, background: C.card }}>
          {stats.map((s) => (
            <div key={s.l}>
              <div className="font-medium" style={{ fontSize: 34, letterSpacing: '-0.03em', color: C.fg }}>
                <CountUp target={s.n} />
              </div>
              <div className="mt-1 text-xs" style={{ color: 'rgba(244,245,246,0.4)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </ScrollIn>
    </section>
  )
}

function ScreenChrome({ title, children }) {
  return (
    <div className="flex flex-col" style={{ aspectRatio: '16 / 10', maxWidth: '100%' }}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: C.line }}>
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.16)' }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.11)' }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.08)' }} />
        <span className="ml-3 truncate text-xs" style={{ color: C.faint }}>{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">{children}</div>
    </div>
  )
}

export const Mini = ({ label, value, delta, up = true }) => (
  <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.card }}>
    <div className="text-xs uppercase tracking-wider" style={{ color: C.faint, fontSize: 10 }}>{label}</div>
    <div className="mt-1 font-medium" style={{ fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    {delta && <div className="text-xs" style={{ color: up ? C.up : C.down, fontVariantNumeric: 'tabular-nums' }}>{delta}</div>}
  </div>
)

const SERIES = [42, 44, 43, 47, 46, 51, 49, 53, 57, 55, 58, 62, 60, 64, 67, 65, 69, 72, 70, 74]

function LineChart({ data = SERIES, color = C.blue }) {
  const w = 600
  const h = 160
  const min = Math.min(...data) - 4
  const max = Math.max(...data) + 4
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / (max - min)) * h])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="rgba(244,245,246,0.06)" strokeDasharray="3 5" />
      ))}
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill="url(#lc-area)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0] - 3} cy={last[1]} r="4" fill={color} />
    </svg>
  )
}

export function UsageScreen() {
  return (
    <ScreenChrome title="Usage · Overview">
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Spend today" value="$1.18" delta="last 24h" />
          <Mini label="Tokens (24h)" value="11.7M" delta="79% cached" />
          <Mini label="Active keys" value="1" delta="balance $4.82" />
          <Mini label="Avg latency" value="16.1s" delta="probe avg" />
        </div>
        <div className="min-h-0 flex-1 rounded-lg border p-3" style={{ borderColor: C.line }}>
          <LineChart />
        </div>
      </div>
    </ScreenChrome>
  )
}

function BreakdownScreen() {
  const rows = [
    ['gpt-6-astra', 45, '#60a5fa'],
    ['claude-opus-5', 30, '#a78bfa'],
    ['claude-fable-5', 17, '#fbbf24'],
    ['Other', 8, 'rgba(244,245,246,0.4)'],
  ]
  return (
    <ScreenChrome title="Spend · By model">
      <div className="grid h-full gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-3">
          <div className="flex h-3 overflow-hidden rounded-full">
            {rows.map(([l, p, c]) => <span key={l} style={{ width: `${p}%`, background: c }} />)}
          </div>
          {rows.map(([l, p, c]) => (
            <div key={l} className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
              <span style={{ color: 'rgba(244,245,246,0.75)' }}>{l}</span>
              <span className="ml-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>{p}%</span>
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-3 sm:flex">
          <Mini label="Top model" value="gpt-6-astra" delta="45% of spend" />
          <Mini label="Cache savings" value="$3.13" delta="last 24h" />
          <Mini label="Cheapest route" value="deepseek-v4.1-flash" delta="$0.02/M" />
        </div>
      </div>
    </ScreenChrome>
  )
}

function KeysScreen() {
  const rows = [
    ['prod-web', 'All models', '182.4k', 'Active', true],
    ['staging', 'GPT + Claude', '41.2k', 'Active', true],
    ['partner-acme', 'Gemini only', '9.1k', 'Limited', false],
    ['ci-bots', 'DeepSeek', '7.5k', 'Active', true],
    ['legacy-mobile', 'GPT-4o', '2.1k', 'Revoked', false],
  ]
  return (
    <ScreenChrome title="Keys · Access">
      <div className="h-full overflow-x-auto">
        <table className="w-full text-xs sm:text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="text-left" style={{ color: C.faint }}>
              <th className="pb-3 font-normal">Key label</th>
              <th className="pb-3 font-normal">Model access</th>
              <th className="pb-3 text-right font-normal">Requests (24h)</th>
              <th className="hidden pb-3 text-right font-normal sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, access, reqs, status, ok]) => (
              <tr key={label} className="border-t" style={{ borderColor: C.line }}>
                <td className="py-2.5 font-medium">{label}</td>
                <td className="py-2.5" style={{ color: C.dim }}>{access}</td>
                <td className="py-2.5 text-right">{reqs}</td>
                <td className="hidden py-2.5 text-right sm:table-cell">
                  <span className="rounded px-1.5 py-0.5" style={{ color: ok ? C.up : C.down, background: ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>{status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenChrome>
  )
}

function StatusScreen() {
  const models = CATALOG.slice(0, 8).map((m) => {
    const status = m.availability >= 100 ? 'up' : m.availability >= 90 ? 'degraded' : 'down'
    return [m.id, status, m.latency]
  })
  const tone = (s) => (s === 'up' ? C.up : s === 'degraded' ? '#fbbf24' : C.down)
  return (
    <ScreenChrome title="Status · Live">
      <div className="grid h-full gap-3 sm:grid-cols-3">
        <div className="hidden min-h-0 rounded-lg border p-3 sm:col-span-2 sm:block" style={{ borderColor: C.line }}>
          <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: C.faint, fontSize: 10 }}>Request volume</div>
          <LineChart data={[61, 60, 63, 62, 66, 64, 63, 67, 70, 68, 69, 66, 68, 71, 73, 72, 70, 74]} color={C.up} />
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto rounded-lg border p-3" style={{ borderColor: C.line }}>
          {models.map(([name, status, lat]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone(status) }} />
              <span className="truncate" style={{ color: 'rgba(244,245,246,0.8)' }}>{name}</span>
              <span className="ml-auto shrink-0 capitalize" style={{ color: tone(status) }}>{status}</span>
              <span className="w-12 shrink-0 text-right" style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{lat}</span>
            </div>
          ))}
        </div>
      </div>
    </ScreenChrome>
  )
}

const SCREEN_VIEWS = {
  'usage-overview': UsageScreen,
  'model-breakdown': BreakdownScreen,
  'keys-table': KeysScreen,
  'live-status': StatusScreen,
}

function Dashboards({ screens }) {
  const shown = screens.slice(0, 4)
  return (
    <section className={cn(SHELL, AIR)}>
      <div className="text-center">
        <SectionIcon icon={LayoutTemplate} />
        <ScrollTitle lead="See what you're" claim="spending" />
      </div>
      <Tabs defaultValue={shown[0].slug}>
        <ScrollIn>
          <TabsP.List className="relative mx-auto mt-14 flex w-max max-w-full gap-1.5 overflow-x-auto whitespace-nowrap px-1">
            {shown.map((x) => (
              <TabsP.Trigger
                key={x.slug}
                value={x.slug}
                className="relative z-10 shrink-0 rounded-full px-3.5 py-1.5 text-sm text-white/40 outline-none transition-colors duration-300 hover:text-white data-[state=active]:bg-white/[0.09] data-[state=active]:text-white focus-visible:ring-2 focus-visible:ring-white/25"
              >
                {x.label}
              </TabsP.Trigger>
            ))}
          </TabsP.List>
        </ScrollIn>
        <ScrollIn tilt i={1} className="mt-8">
          <GlassFrame>
            {shown.map((x) => {
              const View = SCREEN_VIEWS[x.slug] || UsageScreen
              return (
                <TabsP.Content key={x.slug} value={x.slug}>
                  <View />
                </TabsP.Content>
              )
            })}
          </GlassFrame>
        </ScrollIn>
      </Tabs>
    </section>
  )
}

function Faq() {
  return (
    <section className={cn(SHELL, AIR)}>
      <div className="mx-auto max-w-3xl">
        <SectionIcon icon={Sparkles} />
        <ScrollTitle lead="Questions," claim="answered" className="text-center" />
        <ScrollIn>
          <Accordion type="single" collapsible defaultValue={FAQ[0][0]} className="mt-14 border-y" style={{ borderColor: C.line }}>
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollIn>
      </div>
    </section>
  )
}

function Close() {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div className={cn(SHELL, 'relative z-10 text-center')}>
        <ScrollIn>
          <div className="mb-10 flex justify-center"><Wordmark height={24} /></div>
        </ScrollIn>
        <ScrollIn i={1}>
          <ScrollTitle lead="One key." claim="Every model." className="mx-auto max-w-xl" />
        </ScrollIn>
        <ScrollIn i={3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <PrimaryButton to="/signup">Create account</PrimaryButton>
            <TextLink to="/pricing">Compare pricing</TextLink>
          </div>
        </ScrollIn>
      </div>
      <RisingFooterArt>
        <div className="-mt-10">
          <AsciiRidge height={300} opacity={0.55} />
        </div>
      </RisingFooterArt>
    </section>
  )
}

export function Footer() {
  const cols = [
    ['Product', [
      { label: 'Models', to: '/#models' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Status page', to: '/status' },
    ]],
    ['Resources', [
      { label: 'Documentation', to: '/docs' },
      { label: 'API reference', to: '/docs#chat-completions' },
      { label: 'Changelog', to: '/docs#changelog' },
    ]],
  ]
  return (
    <footer className="relative z-10 border-t" style={{ borderColor: C.line, background: C.bg }}>
      <div className={cn(SHELL, 'grid gap-10 py-14 sm:grid-cols-3')}>
        <div><Wordmark /></div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: C.faint }}>{title}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map((l) => (
                <li key={l.label}>
                  {l.to.startsWith('/') ? (
                    <Link to={l.to} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(244,245,246,0.55)' }}>{l.label}</Link>
                  ) : (
                    <a href={l.to} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(244,245,246,0.55)' }}>{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn(SHELL, 'flex flex-wrap items-center justify-between gap-2 border-t py-6 text-xs')} style={{ borderColor: C.line, color: 'rgba(244,245,246,0.3)' }}>
        <span>lenar — one key, every model</span>
        <span>AI API gateway</span>
      </div>
    </footer>
  )
}

export const STYLES = `
@keyframes ssy-rise { from { opacity: 0; transform: translateY(18px); filter: blur(4px) } to { opacity: 1; transform: none; filter: none } }
@keyframes ssy-sway { 0%,100% { transform: rotate3d(0.22,1,0,-8deg) } 50% { transform: rotate3d(0.22,1,0,8deg) } }
@keyframes ssy-sheen { 0%,100% { transform: translateX(0) } 50% { transform: translateX(874px) } }
@keyframes ssy-float { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-4px) rotate(3deg) } }
@keyframes ssy-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes ssy-in-right { from { opacity: 0; transform: translateX(40px); filter: blur(3px) } to { opacity: 1; transform: none; filter: none } }
@keyframes ssy-in-left { from { opacity: 0; transform: translateX(-40px); filter: blur(3px) } to { opacity: 1; transform: none; filter: none } }
.ssy-rise { animation: ssy-rise 900ms cubic-bezier(0.16,1,0.3,1) both }
.ssy-sway { animation: ssy-sway 8s ease-in-out infinite }
.ssy-sheen { animation: ssy-sheen 8s ease-in-out infinite }
.ssy-float { animation: ssy-float 6s ease-in-out infinite }
.ssy-fade { animation: ssy-fade 400ms ease-out both }
.ssy-in-right { animation: ssy-in-right 450ms cubic-bezier(0.22,1,0.36,1) both }
.ssy-in-left { animation: ssy-in-left 450ms cubic-bezier(0.22,1,0.36,1) both }
@media (prefers-reduced-motion: reduce) {
  .ssy-rise, .ssy-sway, .ssy-sheen, .ssy-float, .ssy-fade, .ssy-in-right, .ssy-in-left { animation: none }
}
`

export default function SimpleLanding({ screens = SCREENS, models = MODELS }) {
  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: C.bg, color: C.fg, fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{STYLES}</style>
      <Nav />
      <ScrollProgress />
      <main>
        <HeroScroll count={models} />
        <SdkSwitcher />
        <Features />
        <Numbers models={models} uptime={99} requests={12} providers={PROVIDER_COUNT} />
        <Dashboards screens={screens} />
        <Faq />
        <Close />
      </main>
      <Footer />
    </div>
  )
}
