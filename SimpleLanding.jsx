import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Copy } from 'lucide-react'
import { useSession } from './src/lib/api.js'
import { motion, useReducedMotion } from 'motion/react'
import LandingBoard from './LandingBoard.jsx'
import { ScrollProgress } from './src/scroll.jsx'
import { Magnetic } from '@animate-ui/react/primitives/effects/magnetic'

export const cn = (...c) => c.filter(Boolean).join(' ')

export const C = {
  bg: '#0a0908',
  fg: '#f3efe7',
  dim: 'rgba(243,239,231,0.5)',
  faint: 'rgba(243,239,231,0.33)',
  line: 'rgba(243,239,231,0.08)',
  line2: 'rgba(243,239,231,0.16)',
  card: 'rgba(243,239,231,0.028)',
  up: '#8fbf86',
  down: '#d08a6e',
  accent: '#cd8a4c',
}

// A hex socket, not a crystal: the mark is a port, because lenar is one. Every
// model's name routes into it elsewhere on the page.
export const MARK_VB = '0 0 100 100'
export const MARK_D = 'M50 4 L89.84 27 L89.84 73 L50 96 L10.16 73 L10.16 27 Z'

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
            {/* the port: every model routes into this */}
            <circle cx={w / 2} cy={h / 2} r={w * 0.185} fill="#0a0908" stroke="url(#mm-stroke)" strokeWidth={w / 60} />
            <circle cx={w / 2} cy={h / 2} r={w * 0.07} fill="#cd8a4c" />
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
          ctx.fillStyle = '#e9d9c3'
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

/** The lenar hex, small: a port with a dot in it. */
export function HexGlyph({ className, color = 'currentColor', dot = '#cd8a4c', hole = '#0a0908' }) {
  return (
    <svg viewBox={MARK_VB} className={className} aria-hidden>
      <path d={MARK_D} fill={color} />
      <circle cx="50" cy="50" r="19" fill={hole} />
      <circle cx="50" cy="50" r="8" fill={dot} className="lb-hexdot" />
    </svg>
  )
}

const BTN_TONES = {
  bone: { bg: '#f3efe7', fg: '#0a0908', glyph: '#0a0908', hole: '#f3efe7', dot: '#cd8a4c' },
  copper: { bg: '#cd8a4c', fg: '#0a0908', glyph: '#0a0908', hole: '#cd8a4c', dot: '#f3efe7' },
  ghost: { bg: '#27221c', fg: '#f3efe7', glyph: '#f3efe7', hole: '#27221c', dot: '#cd8a4c' },
  ink: { bg: '#0a0908', fg: '#f3efe7', glyph: '#cd8a4c', hole: '#0a0908', dot: '#f3efe7' },
  copperDark: { bg: '#b57438', fg: '#0a0908', glyph: '#0a0908', hole: '#b57438', dot: '#f3efe7' },
}

/**
 * lenar's button: a flat pill with the hex port at its head. The hex turns, its dot swells,
 * the label rolls over to a second copy, the whole thing leans toward the cursor and
 * presses in on click.
 */
export function PrimaryButton({ children, small, href, to, className, type, onClick, tone = 'bone' }) {
  const t = BTN_TONES[tone] ?? BTN_TONES.bone
  const dest = to ?? href
  const cls = cn(
    'lb-btn group relative inline-flex select-none items-center rounded-full font-medium outline-none transition-transform duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[#cd8a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0908]',
    small ? 'gap-2 py-2 pl-2.5 pr-4 text-[14px]' : 'gap-2.5 py-3 pl-3.5 pr-5 text-[16px]',
    className,
  )
  const style = { background: t.bg, color: t.fg }
  const inner = (
    <>
      <HexGlyph className={cn('shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[240deg]', small ? 'h-4 w-4' : 'h-5 w-5')} color={t.glyph} hole={t.hole} dot={t.dot} />
      <span className="lb-roll"><span>{children}</span><span aria-hidden>{children}</span></span>
    </>
  )
  let el
  if (type === 'submit' || type === 'button' || onClick) {
    el = <button type={type || 'button'} onClick={onClick} className={cls} style={style}>{inner}</button>
  } else if (dest && dest.startsWith('/')) {
    el = <Link to={dest} className={cls} style={style}>{inner}</Link>
  } else {
    el = <a href={dest || '#'} className={cls} style={style}>{inner}</a>
  }
  return <Magnetic strength={0.22} range={110} onlyOnHover disableOnTouch className="inline-block">{el}</Magnetic>
}

const NAV = [
  { label: 'Models', to: '/#models' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Docs', to: '/docs' },
  { label: 'Status', to: '/status' },
]

export function Nav({ wide = false }) {
  const { pathname } = useLocation()
  const session = useSession()
  const [hover, setHover] = useState(null)
  const current = NAV.find((n) => n.to === pathname)?.to
  const pill = hover ?? current
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ boxShadow: wide ? 'none' : `inset 0 -1px 0 ${C.line}`, background: 'rgba(10,9,8,0.82)' }}>
      <div className={cn(wide ? 'mx-auto w-full max-w-[1480px] px-4 sm:px-5' : SHELL, 'flex h-16 items-center gap-8')}>
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

export function Footer() {
  const cols = [
    ['Product', [
      { label: 'Models and prices', to: '/#models' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Status', to: '/status' },
    ]],
    ['Build', [
      { label: 'Documentation', to: '/docs' },
      { label: 'API reference', to: '/docs#chat-completions' },
      { label: 'Changelog', to: '/docs#changelog' },
    ]],
    ['Account', [
      { label: 'Create account', to: '/signup' },
      { label: 'Sign in', to: '/signin' },
      { label: 'Dashboard', to: '/dashboard' },
    ]],
  ]
  return (
    <footer className="relative z-10 mt-2" style={{ background: C.bg }}>
      <div className="mx-auto w-full max-w-[1480px] px-3 sm:px-4">
        <div className="grid gap-10 px-1 pb-10 pt-20 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-12"><Link to="/" aria-label="lenar home"><Wordmark height={22} /></Link></div>
          {cols.map(([title, links]) => (
            <div key={title} className="lg:col-span-2">
              <p className="text-[15px]" style={{ color: C.dim }}>{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[15px] transition-colors hover:text-[#cd8a4c]" style={{ color: C.fg }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="text-[15px]" style={{ color: C.dim }}>One key, every model</p>
            <p className="mt-4 max-w-[34ch] text-[15px]" style={{ color: C.fg }}>One OpenAI-compatible endpoint for GPT, Claude, Gemini, DeepSeek and more, paid per token.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-8 text-[14px]" style={{ color: C.dim }}>
          <span>© {new Date().getFullYear()} lenar</span>
          <PrimaryButton small to="/signup" tone="copper">Get your key</PrimaryButton>
        </div>
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
.calc-range { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 999px; background: rgba(243,239,231,0.14); cursor: pointer }
.calc-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 999px; background: #cd8a4c; box-shadow: 0 0 0 4px rgba(205,138,76,0.18); transition: box-shadow 150ms }
.calc-range::-webkit-slider-thumb:hover { box-shadow: 0 0 0 6px rgba(205,138,76,0.22) }
.calc-range::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 999px; background: #cd8a4c; box-shadow: 0 0 0 4px rgba(205,138,76,0.18) }
.lb-roll { position: relative; display: inline-grid; overflow: hidden; line-height: 1.3 }
.lb-roll > span { grid-area: 1 / 1; display: inline-flex; align-items: center; gap: .4em; transition: transform 520ms cubic-bezier(0.22,1,0.36,1) }
.lb-roll > span:last-child { transform: translateY(115%) }
.group:hover .lb-roll > span:first-child, .group:focus-visible .lb-roll > span:first-child { transform: translateY(-115%) }
.group:hover .lb-roll > span:last-child, .group:focus-visible .lb-roll > span:last-child { transform: none }
.lb-hexdot { transform-origin: 50px 50px; transform-box: view-box; transition: transform 400ms cubic-bezier(0.22,1,0.36,1) }
.group:hover .lb-hexdot { transform: scale(1.5) }
@media (prefers-reduced-motion: reduce) {
  .lb-roll > span { transition: none }
  .ssy-rise, .ssy-sway, .ssy-sheen, .ssy-float, .ssy-fade, .ssy-in-right, .ssy-in-left { animation: none }
}
`

export default function SimpleLanding() {
  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{STYLES}</style>
      <Nav wide />
      <ScrollProgress />
      <main>
        <LandingBoard />
      </main>
      <Footer />
    </div>
  )
}
