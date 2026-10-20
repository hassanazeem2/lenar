import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATALOG } from './models.js'
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import {
  C, cn, SHELL, TwoTone, Rise, Chevron, MetalMark, GlassFrame, PrimaryButton, TextLink,
} from './SimpleLanding.jsx'

/* ---------- live ASCII terrain ----------
 * Hangs from the top of the screen like the old ridge, but it's alive: the ridge drifts,
 * characters flicker, the cursor lights up nearby cells, and `flood` (0..1) pours the
 * terrain down until it covers the screen. */

const RAMP = ' .:-=+*#%@'
const CELL = 8

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function AsciiTerrain({ flood, className }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, raf = 0, last = 0, visible = true
    const mouse = { x: -1e4, y: -1e4 }

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${CELL}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
    }

    const draw = (now) => {
      const t = now / 1000
      const f = flood.get()
      ctx.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      // Ridge depth from the top, as a fraction of the height. Flood pushes it past the bottom.
      const ridge = (gx) => {
        const u = gx / cols
        const base = 0.36 + 0.13 * Math.sin(u * 7.1 + 1.3 + t * 0.12) + 0.07 * Math.sin(u * 17.3 + 0.4 - t * 0.2)
          + 0.04 * Math.sin(u * 41.7 + t * 0.35) + 0.02 * Math.sin(u * 93.1 + 2)
        return base + f * 0.95
      }
      for (let gx = 0; gx < cols; gx++) {
        const edge = ridge(gx) * rows
        const slope = ridge(gx + 1) - ridge(gx)
        const lim = Math.min(rows, Math.ceil(edge))
        for (let gy = 0; gy < lim; gy++) {
          const depth = (edge - gy) / (edge + 1) // 0 at the ridge, 1 at the top
          let v = 0.95 - depth * 0.8 - slope * 6 + (hash(gx, gy) - 0.5) * 0.35
          if (edge - gy < 2) v += 0.3
          // Flicker: a slow wave of sparkle travelling through the field.
          v += Math.sin(t * 2.2 + hash(gy, gx) * 40) * 0.08
          // Cursor glow.
          const dx = gx * CELL - mouse.x, dy = gy * CELL - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < 22000) v += (1 - d2 / 22000) * 0.55
          v = Math.max(0, Math.min(1, v))
          if (v < 0.08) continue
          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))]
          if (ch === ' ') continue
          ctx.globalAlpha = 0.12 + v * 0.8
          ctx.fillStyle = d2 < 22000 ? '#ffffff' : '#dceaff'
          ctx.fillText(ch, gx * CELL + CELL / 2, gy * CELL + CELL / 2)
        }
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 33) return // ~30fps is plenty for ASCII and spares the battery
      last = now
      draw(now)
    }

    size()
    if (reduce) draw(0)
    else raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => { size(); if (reduce) draw(0) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    const move = (e) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    window.addEventListener('pointermove', move)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', move)
    }
  }, [flood, reduce])

  return <canvas ref={ref} aria-hidden className={cn('pointer-events-none block h-full w-full select-none', className)} />
}

/* ---------- copy ---------- */

function HeroCopy({ count }) {
  return (
    <div className="max-w-xl">
      <Rise i={0}>
        <a href="#models" className="group inline-flex items-center gap-2 rounded-full border py-1 pl-3 pr-2.5 text-xs transition-colors hover:text-white" style={{ borderColor: 'rgba(244,245,246,0.12)', background: C.card, color: 'rgba(244,245,246,0.7)' }}>
          {count}+ models, one key
          <Chevron />
        </a>
      </Rise>
      <Rise i={1}>
        <h1 className="mt-7 font-medium" style={{ fontSize: 'clamp(42px, 6.4vw, 66px)', lineHeight: 1.04, letterSpacing: '-0.035em', textWrap: 'balance' }}>
          <TwoTone lead="One key." claim="Every model." />
        </h1>
      </Rise>
      <Rise i={2}>
        <p className="mt-6 max-w-md leading-relaxed" style={{ color: C.dim, fontSize: 15.5 }}>
          Claude, GPT, Gemini, DeepSeek and {count - 1} more, behind one endpoint. Same SDK you already use, just point it at us.
        </p>
      </Rise>
      <Rise i={3}>
        <div className="mt-9 flex flex-wrap items-center gap-5">
          <PrimaryButton to="/signup">Create account</PrimaryButton>
          <TextLink to="/pricing">Compare pricing</TextLink>
        </div>
      </Rise>
    </div>
  )
}

// Below this width the dashboard is laid out at desktop size and shrunk, so it reads as a miniature instead of cropping.
const SHOT_W = 760

function useViewportWidth() {
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))
  useEffect(() => {
    const on = () => setVw(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vw
}

function useIsLarge() {
  const q = '(min-width: 1024px)'
  const [lg, setLg] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setLg(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return lg
}

/* ---------- price comparison (what the hero opens into) ---------- */

// One flagship per provider, in this order, if it's in the catalog and actually cheaper.
const SHOWCASE = ['claude-opus-5-5', 'gpt-6-astra', 'gemini-4-argon', 'claude-sonnet-5-5', 'deepseek-v4-pro-0813', 'grok-4.7']
const SHOWN = SHOWCASE.map((id) => CATALOG.find((m) => m.id === id)).filter((m) => m && m.discount > 0)
export const BEST_SAVING = Math.max(0, ...CATALOG.map((m) => m.discount))

const usd = (v) => `$${v < 0.1 ? v.toFixed(3) : v.toFixed(2)}`

function PriceRow({ m, p, i }) {
  // Our bar starts at full official length and shrinks to our real price as you scroll.
  const ratio = m.rates.input / m.official
  const start = 0.5 + i * 0.035
  const ours = useTransform(p, [start, start + 0.22], [1, ratio])
  const badge = useTransform(p, [start + 0.12, start + 0.24], [0, 1])
  const badgeScale = useTransform(p, [start + 0.12, start + 0.24], [0.6, 1])
  return (
    <div className="grid grid-cols-[180px_1fr_64px] items-center gap-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" style={{ color: 'rgba(244,245,246,0.9)' }}>{m.name}</p>
        <p className="truncate font-mono text-[11px]" style={{ color: C.faint }}>{m.id}</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full" style={{ background: 'rgba(244,245,246,0.14)' }} />
          <span className="w-16 text-right font-mono text-xs line-through" style={{ color: C.faint }}>{usd(m.official)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1">
            <motion.div className="h-full origin-left rounded-full" style={{ scaleX: ours, background: `linear-gradient(90deg, ${C.blue}, #93c5fd)`, boxShadow: '0 0 16px rgba(96,165,250,0.45)' }} />
          </div>
          <span className="w-16 text-right font-mono text-xs" style={{ color: C.fg }}>{usd(m.rates.input)}</span>
        </div>
      </div>
      <motion.span className="justify-self-end rounded-full px-2 py-0.5 text-xs font-medium" style={{ opacity: badge, scale: badgeScale, color: C.up, background: 'rgba(74,222,128,0.1)', fontVariantNumeric: 'tabular-nums' }}>
        −{m.discount}%
      </motion.span>
    </div>
  )
}

function PriceCompare({ p }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: C.line }}>
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.16)' }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.11)' }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(244,245,246,0.08)' }} />
        <span className="ml-3 truncate text-xs" style={{ color: C.faint }}>Pricing · input, $ per million tokens</span>
        <span className="ml-auto flex items-center gap-4 text-[11px]" style={{ color: C.faint }}>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: 'rgba(244,245,246,0.25)' }} />Official</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: C.blue }} />lenar</span>
        </span>
      </div>
      <div className="divide-y divide-white/[0.06] px-5 py-2 sm:px-6">
        {SHOWN.map((m, i) => <PriceRow key={m.id} m={m} p={p} i={i} />)}
      </div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-xs sm:px-6" style={{ borderColor: C.line, color: C.faint }}>
        <span>Same models, same request format. Billed per token.</span>
        <Link to="/pricing" className="pointer-events-auto hover:text-white" style={{ color: C.dim }}>All {CATALOG.length} models →</Link>
      </div>
    </div>
  )
}

/* ---------- reduced motion: the plain hero, no pinning ---------- */

function StaticHero({ count }) {
  const flood = useRef({ get: () => 0 }).current
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[480px] opacity-40"><AsciiTerrain flood={flood} /></div>
      <div className={cn(SHELL, 'relative grid items-center gap-12 pb-28 pt-24 lg:grid-cols-2 lg:pb-40 lg:pt-36')}>
        <HeroCopy count={count} />
        <div className="hidden justify-self-center lg:flex"><MetalMark size={250} /></div>
      </div>
    </section>
  )
}

/* ---------- scroll-driven hero ---------- */

export default function HeroScroll({ count }) {
  const reduce = useReducedMotion()
  const lg = useIsLarge()
  const vw = useViewportWidth()
  const shrink = Math.min(1, (vw - 32) / SHOT_W)
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // A little spring so wheel ticks glide instead of stepping.
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

  // 1. Copy lifts away.
  const copyY = useTransform(p, [0, 0.28], [0, -90])
  const copyOpacity = useTransform(p, [0, 0.22], [1, 0])
  const copyBlur = useTransform(p, [0, 0.28], [0, 10])
  const copyFilter = useMotionTemplate`blur(${copyBlur}px)`
  const copyPointer = useTransform(copyOpacity, (o) => (o < 0.15 ? 'none' : 'auto'))

  // 2. Terrain pours down, then dims behind the product.
  const flood = useTransform(p, [0.04, 0.5], [0, 1])
  const terrainOpacity = useTransform(p, [0, 0.45, 0.8], [0.45, 0.6, 0.14])
  const terrainY = useTransform(p, [0, 1], [0, -60])

  // 3. Diamond glides to the centre, turns square and swells.
  const startX = lg ? 288 : 0
  const markX = useTransform(p, [0, 0.38], [startX, 0])
  const markRotate = useTransform(p, [0.05, 0.42], [0, 45])
  const markScale = useTransform(p, [0, 0.36, 0.46], [1, lg ? 1.6 : 1.25, lg ? 3 : 2.4])
  const markOpacity = useTransform(p, lg ? [0.34, 0.44] : [0, 0.12, 0.34, 0.44], lg ? [1, 0] : [0, 1, 1, 0])
  const markBlur = useTransform(p, [0.36, 0.44], [0, 14])
  const markFilter = useMotionTemplate`blur(${markBlur}px)`
  const glow = useTransform(p, [0, 0.4, 0.6], [0.07, 0.16, 0])

  // 4. ...and opens into the dashboard.
  const shotScale = useTransform(p, [0.36, 0.78], [0.28, 1])
  const shotOpacity = useTransform(p, [0.4, 0.52], [0, 1])
  const shotRotateX = useTransform(p, [0.36, 0.8], [38, 0])
  const shotY = useTransform(p, [0.36, 0.8], [60, 0])
  const shotRadius = useTransform(p, [0.36, 0.7], [60, 16])

  // 5. Caption.
  const capOpacity = useTransform(p, [0.74, 0.9], [0, 1])
  const capY = useTransform(p, [0.74, 0.9], [16, 0])
  const hintOpacity = useTransform(p, [0, 0.06], [1, 0])

  if (reduce) return <StaticHero count={count} />

  return (
    <section ref={ref} className="relative" style={{ height: '300vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* terrain */}
        <motion.div className="absolute inset-0" style={{ opacity: terrainOpacity, y: terrainY }}>
          <AsciiTerrain flood={flood} />
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }} />

        {/* copy */}
        <motion.div className={cn(SHELL, 'relative flex h-full items-center')} style={{ y: copyY, opacity: copyOpacity, filter: copyFilter, pointerEvents: copyPointer }}>
          <HeroCopy count={count} />
        </motion.div>

        {/* diamond */}
        <motion.div
          className="absolute left-1/2 top-1/2"
          style={{ x: markX, opacity: markOpacity }}
        >
          <motion.div className="-translate-x-1/2 -translate-y-1/2" style={{ rotate: markRotate, scale: markScale, filter: markFilter }}>
            <motion.div className="pointer-events-none absolute -inset-28 rounded-full" style={{ opacity: glow, background: 'radial-gradient(50% 50% at 50% 50%, #ffffff, transparent 70%)' }} />
            <Rise i={4}><MetalMark size={lg ? 250 : 160} /></Rise>
          </motion.div>
        </motion.div>

        {/* dashboard */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 pt-16" style={{ perspective: 1400 }}>
          <motion.div
            className="w-full overflow-hidden"
            style={{ maxWidth: shrink < 1 ? SHOT_W * shrink : '48rem', scale: shotScale, opacity: shotOpacity, rotateX: shotRotateX, y: shotY, borderRadius: shotRadius, transformOrigin: '50% 40%', boxShadow: '0 60px 140px -40px rgba(96,165,250,0.25)' }}
          >
            {shrink < 1 ? (
              <div style={{ width: SHOT_W, zoom: shrink }}>
                <GlassFrame className="rounded-[inherit]"><PriceCompare p={p} /></GlassFrame>
              </div>
            ) : (
              <GlassFrame className="rounded-[inherit]"><PriceCompare p={p} /></GlassFrame>
            )}
          </motion.div>
          <motion.p className="mt-8 text-center text-sm" style={{ opacity: capOpacity, y: capY, color: C.dim }}>
            The same models you already use. <span style={{ color: C.fg }}>{BEST_SAVING > 0 ? `Up to ${BEST_SAVING}% cheaper than going direct.` : 'One key for all of them.'}</span>
          </motion.p>
        </div>

        {/* scroll hint */}
        <motion.div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.2em]" style={{ opacity: hintOpacity, color: C.faint }}>
          Scroll
          <span className="relative h-8 w-px overflow-hidden" style={{ background: C.line2 }}>
            <span className="hs-drip absolute inset-x-0 top-0 h-3" style={{ background: C.fg }} />
          </span>
          <style>{'@keyframes hs-drip{from{transform:translateY(-12px)}to{transform:translateY(32px)}}.hs-drip{animation:hs-drip 1.6s cubic-bezier(.6,0,.4,1) infinite}'}</style>
        </motion.div>
      </div>
    </section>
  )
}
