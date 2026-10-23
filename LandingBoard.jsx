// The landing page, built as one board of tiles: everything worth knowing is on the first
// screens, and almost every tile does something when you touch it. Prices come from the live
// catalog (models.js), so every number here is a real rate.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, AnimatePresence, LayoutGroup, motion, useInView, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, Check, Code2, Copy, Search, RefreshCw, Eye, Rocket, UserPlus, Wallet } from 'lucide-react'
import { AnimatedBeam, BorderBeam, MagicCard } from './src/magicui.jsx'
import { SlidingNumber } from '@animate-ui/react/primitives/texts/sliding-number'
import { Tilt, TiltContent } from '@animate-ui/react/primitives/effects/tilt'
import { FAMILY_ORDER, useLiveModels } from './models.js'
import { API_BASE } from './src/lib/api.js'
import { C, cn, MARK_D, MetalMark, MetalHex, PrimaryButton, HexGlyph, smoothTo, glideTo } from './SimpleLanding.jsx'

export const T = {
  tile: '#14120f',
  tile2: '#1c1915',
  tile3: '#27221c',
  copper: '#cd8a4c',
  copperDeep: '#6f4422',
  bone: '#e9d9c3',
  ink: '#0a0908',
  amber: '#d9b25f',
  fg: '#f3efe7',
  up: '#8fbf86',
  down: '#d08a6e',
}

export const BOARD = 'mx-auto w-full max-w-[1480px] px-3 sm:px-4'
const EASE = [0.22, 1, 0.36, 1]
const TOPUPS = [10, 25, 50, 100]
const FLAGSHIPS = ['claude-opus-5-5', 'gpt-6-astra', 'gemini-4-argon', 'deepseek-v4.1-flash', 'claude-sonnet-5-5', 'kimi-k3', 'glm-5.3']
const STATUS = {
  up: { label: 'Up', color: T.up },
  degraded: { label: 'Slow', color: T.amber },
  down: { label: 'Down', color: T.down },
  unknown: { label: 'No data', color: 'rgba(243,239,231,0.25)' },
}

/* ---------- formatting ---------- */

export function usd(v) {
  if (v == null) return '—'
  const s = v >= 1 ? v.toFixed(2) : v >= 0.1 ? v.toFixed(3) : v.toFixed(4)
  return `$${s.replace(/(\.\d\d\d?)0+$/, '$1')}`
}
const tokensFor = (dollars, price) => (price > 0 ? dollars / price : 0) // millions of tokens
function tok(m) {
  if (m >= 1000) return { n: m / 1000, unit: 'B', places: 1 }
  if (m >= 100) return { n: Math.round(m), unit: 'M', places: 0 }
  return { n: m, unit: 'M', places: 1 }
}
const statusOf = (m) => STATUS[m.status] ?? STATUS.unknown

/* ---------- shared bits ---------- */

/** One tile on the board: a flat filled rectangle that rises in when it first scrolls into view. */
function Tile({ children, className, style, i = 0, base = 0.06, as = 'div', ...rest }) {
  const M = motion[as]
  return (
    <M
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: base + i * 0.08, ease: EASE }}
      className={cn('relative overflow-hidden rounded-[10px]', className)}
      style={{ background: T.tile, ...style }}
      {...rest}
    >
      {children}
    </M>
  )
}

function SectionHead({ title, children, className, as = 'h2' }) {
  const H = motion[as]
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-1 pb-6 pt-28 sm:pt-40', className)}>
      <H
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="max-w-[16ch] font-medium"
        style={{ fontSize: 'clamp(36px, 4.6vw, 68px)', lineHeight: 1, letterSpacing: '-0.04em', color: C.fg }}
      >
        {title}
      </H>
      {children}
    </div>
  )
}

function useCopy() {
  const [done, setDone] = useState(false)
  const copy = (text) => {
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok).catch(ok)
    else ok()
  }
  return [done, copy]
}

/* ---------- ASCII terrain: the brand's texture, alive and lit by the cursor ---------- */

const RAMP = ' .:-=+*#%@'
const CELL = 8
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }

export function AsciiField({ className, depth = 0.38, color = '#e9d9c3', flood, flip = false }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, raf = 0, last = 0, visible = true
    const mouse = { x: -1e4, y: -1e4 }
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = canvas.offsetWidth; h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${CELL}px ui-monospace, Menlo, monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    }
    const draw = (now) => {
      const t = now / 1000
      ctx.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL)
      const ridge = (gx) => {
        const u = gx / cols
        return depth + (flood ? flood.get() * 0.95 : 0) + 0.13 * Math.sin(u * 7.1 + 1.3 + t * 0.12) + 0.07 * Math.sin(u * 17.3 + 0.4 - t * 0.2) + 0.04 * Math.sin(u * 41.7 + t * 0.35)
      }
      for (let gx = 0; gx < cols; gx++) {
        const edge = ridge(gx) * rows
        const slope = ridge(gx + 1) - ridge(gx)
        const lim = Math.min(rows, Math.ceil(edge))
        for (let gy = 0; gy < lim; gy++) {
          const d = (edge - gy) / (edge + 1)
          let v = 0.95 - d * 0.8 - slope * 6 + (hash(gx, gy) - 0.5) * 0.35
          if (edge - gy < 2) v += 0.3
          v += Math.sin(t * 2.2 + hash(gy, gx) * 40) * 0.08
          const dx = gx * CELL - mouse.x, dy = gy * CELL - mouse.y, d2 = dx * dx + dy * dy
          if (d2 < 26000) v += (1 - d2 / 26000) * 0.6
          v = Math.max(0, Math.min(1, v))
          if (v < 0.08) continue
          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))]
          if (ch === ' ') continue
          ctx.globalAlpha = 0.1 + v * 0.75
          ctx.fillStyle = d2 < 26000 ? '#ffd9ae' : color
          ctx.fillText(ch, gx * CELL + CELL / 2, gy * CELL + CELL / 2)
        }
      }
    }
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 33) return
      last = now; draw(now)
    }
    size()
    if (reduce) draw(0); else raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => { size(); if (reduce) draw(0) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    const move = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = flip ? r.bottom - e.clientY : e.clientY - r.top }
    window.addEventListener('pointermove', move)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', move) }
  }, [reduce, depth, color, flood, flip])
  return <canvas ref={ref} aria-hidden className={cn('pointer-events-none block h-full w-full select-none', className)} style={flip ? { transform: 'scaleY(-1)' } : undefined} />
}

/* ---------- 0. the intro: the mark spins in, then the page zooms out of it ---------- */

// Once per browser session, skipped under reduced motion. The hero's own entrance waits for it.
const PLAYS_INTRO = typeof window !== 'undefined'
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && !sessionStorage.getItem('lenar-intro')
const HERO_DELAY = PLAYS_INTRO ? 1.0 : 0.05

function Intro() {
  const [show, setShow] = useState(PLAYS_INTRO)
  useEffect(() => {
    if (!show) return
    sessionStorage.setItem('lenar-intro', '1')
    const t = setTimeout(() => setShow(false), 1050)
    return () => clearTimeout(t)
  }, [show])
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] grid place-items-center"
          style={{ background: T.ink }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
          aria-hidden
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.4, rotate: -120, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 170, damping: 18 } }}
            exit={{ scale: 7, opacity: 0, filter: 'blur(12px)', transition: { duration: 0.55, ease: [0.7, 0, 0.84, 0] } }}
          >
            <MetalHex size={112} />
            <motion.span
              className="mt-5 text-[28px] font-semibold"
              style={{ letterSpacing: '-0.04em', color: C.fg }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.4 } }}
            >
              lenar
            </motion.span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Each line rises out of its own mask, one after another. */
function RevealLines({ lines, delay = 0 }) {
  return lines.map((line, i) => (
    <span key={line} className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className="block"
        initial={{ y: '108%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.95, delay: delay + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {line}
      </motion.span>
    </span>
  ))
}

/* ---------- 1. the first screen ---------- */

function LiveDot({ color = C.up }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="lb-ping absolute inset-0 rounded-full" style={{ background: color }} />
      <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  )
}

/** The request your code already sends, with the model swapping under it and its real price beside it. */
function LiveRequest({ models, index, setIndex, cheapest, onPick }) {
  const reduce = useReducedMotion()
  const flagships = FLAGSHIPS.map((id) => models.find((m) => m.id === id)).filter(Boolean)
  const m = flagships[index % flagships.length]
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (reduce || paused) return
    const t = setInterval(() => setIndex((i) => (i + 1) % flagships.length), 2600)
    return () => clearInterval(t)
  }, [reduce, paused, flagships.length, setIndex])
  if (!m) return null
  return (
    <div data-ui className="grid h-full gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr_0.9fr] lg:items-center lg:gap-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <pre className="overflow-hidden font-mono text-[14px] leading-[1.7] sm:text-[15px]" style={{ color: 'rgba(243,239,231,0.6)' }}>
        <span>client.chat.completions.create(</span>{'\n'}
        <span>{'  model="'}</span>
        <span className="relative inline-flex overflow-hidden align-bottom" >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={m.id}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              style={{ color: T.copper }}
            >
              {m.id}
            </motion.span>
          </AnimatePresence>
        </span>
        <span>{'",'}</span>{'\n'}
        <span>{'  messages=[...],'}</span>{'\n'}
        <span>)</span>
      </pre>
      <div className="flex flex-wrap items-end justify-between gap-4 lg:flex-col lg:items-start">
        <div>
          <p className="text-[14px]" style={{ color: C.dim }}>{m.name} on lenar</p>
          <p className="mt-1 flex items-baseline gap-1.5 font-medium" style={{ fontSize: 30, letterSpacing: '-0.03em', color: C.fg, fontVariantNumeric: 'tabular-nums' }}>
            <span className="inline-flex">$<SlidingNumber number={m.price} decimalPlaces={m.price >= 0.1 ? 3 : 4} /></span>
            <span className="text-[15px] font-normal" style={{ color: C.dim }}>per million tokens</span>
          </p>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Pick a model">
          {flagships.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={i === index % flagships.length}
              aria-label={f.name}
              onClick={() => setIndex(i)}
              className="h-3 rounded-full transition-all duration-300 hover:opacity-100"
              style={{ width: i === index % flagships.length ? 28 : 12, background: i === index % flagships.length ? T.copper : 'rgba(243,239,231,0.18)' }}
            />
          ))}
        </div>
      </div>
      {cheapest ? (
        <div className="flex flex-col gap-3 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0" style={{ borderColor: 'rgba(243,239,231,0.08)' }}>
          <button type="button" onClick={() => onPick(cheapest.id)} className="group text-left outline-none focus-visible:underline">
            <span className="block text-[14px]" style={{ color: C.dim }}>Cheapest model up right now</span>
            <span className="mt-1 flex items-baseline gap-2">
              <span className="text-[24px] font-medium tabular-nums" style={{ letterSpacing: '-0.03em', color: C.fg }}>{usd(cheapest.price)}</span>
              <span className="flex items-center gap-1 text-[15px]" style={{ color: C.fg }}>
                {cheapest.name}
                <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: T.copper }} />
              </span>
            </span>
          </button>
          <p className="text-[14px]" style={{ color: C.dim }}>From $10, by card or crypto. No subscription.</p>
        </div>
      ) : null}
    </div>
  )
}

/** The hex port with every model family orbiting into it. */
function PortTile({ models, markRef, hideMark }) {
  const up = models.filter((m) => m.status === 'up').length
  const fams = FAMILY_ORDER.filter((f) => models.some((m) => m.family === f.id))
  return (
    <div className="relative flex h-full min-h-[420px] flex-col p-5 sm:p-6 lg:min-h-0">
      <div className="relative z-10 flex items-center gap-2.5 text-[15px]" style={{ color: C.fg }}>
        <LiveDot />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          <SlidingNumber number={up} className="inline-flex" /> of {models.length} models up right now
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <div className="lb-orbit pointer-events-none absolute" style={{ width: 0, height: 0 }}>
          {fams.map((f, i) => {
            const a = (i / fams.length) * 360
            return (
              <span key={f.id} className="absolute left-0 top-0" style={{ transform: `rotate(${a}deg) translateX(var(--orbit)) rotate(${-a}deg)` }}>
                <span className="lb-counter block">
                  <motion.span
                    className="block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[13px]"
                    style={{ background: T.tile3, color: C.fg }}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: HERO_DELAY + 0.55 + i * 0.06 }}
                  >
                    {f.short}
                  </motion.span>
                </span>
              </span>
            )
          })}
        </div>
        <div ref={markRef} className="scale-[0.8] sm:scale-100" style={hideMark ? { visibility: 'hidden' } : undefined}>
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotate: -150 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16, delay: HERO_DELAY + 0.3 }}
          >
            <MetalMark size={150} />
          </motion.div>
        </div>
      </div>
      <p className="relative z-10 text-[15px]" style={{ color: C.dim }}>Every family routes through one key. Click the mark.</p>
    </div>
  )
}

function Hero({ models, live, onPick, markRef, hideMark }) {
  const [index, setIndex] = useState(0)
  // The terrain starts above the tile and pours down into place.
  const pour = useMotionValue(PLAYS_INTRO || HERO_DELAY > 0 ? -0.55 : 0)
  useEffect(() => {
    const c = animate(pour, 0, { duration: 1.8, delay: HERO_DELAY, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [pour])
  const cheapest = useMemo(() => [...models].filter((m) => m.status === 'up').sort((a, b) => a.price - b.price)[0] ?? models[0], [models])
  return (
    <section className={cn(BOARD, 'pt-2')}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-12 lg:h-[calc(100svh-80px)] lg:max-h-[880px] lg:min-h-[660px] lg:grid-rows-6">
        {/* statement */}
        <Tile className="flex min-h-[520px] flex-col justify-end md:col-span-12 lg:col-span-8 lg:row-span-4 lg:min-h-0" i={0} base={HERO_DELAY - 0.05}>
          <div className="absolute inset-x-0 top-0 h-[78%] opacity-60"><AsciiField depth={0.42} flood={pour} /></div>
          <div className="relative z-10 p-6 sm:p-9">
            <h1 className="font-medium" style={{ fontSize: 'clamp(52px, 7.6vw, 120px)', lineHeight: 0.92, letterSpacing: '-0.05em', color: C.fg }}>
              <RevealLines lines={['One key.', 'Every model.']} delay={HERO_DELAY + 0.12} />
            </h1>
            <motion.p
              className="mt-6 max-w-[34ch]"
              style={{ fontSize: 'clamp(19px, 1.6vw, 23px)', lineHeight: 1.4, color: C.fg }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: HERO_DELAY + 0.4, ease: EASE }}
            >
              {models.length} AI models behind one OpenAI-compatible endpoint. Pay per token from $10, by card or crypto.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: HERO_DELAY + 0.52, ease: EASE }}
            >
              <PrimaryButton to="/signup" tone="copper">Get your key</PrimaryButton>
              <PrimaryButton href="#models" tone="ghost">See live prices</PrimaryButton>
            </motion.div>
          </div>
        </Tile>

        {/* the port */}
        <Tile className="md:col-span-12 lg:col-span-4 lg:row-span-4" i={1} base={HERO_DELAY - 0.05} style={{ background: T.tile2 }}>
          <PortTile models={models} markRef={markRef} hideMark={hideMark} />
        </Tile>

        {/* the live request, with the cheapest model and how to pay folded in */}
        <Tile className="md:col-span-12 lg:row-span-2" i={3} base={HERO_DELAY - 0.05}>
          <LiveRequest models={models} index={index} setIndex={setIndex} cheapest={cheapest} onPick={onPick} />
        </Tile>
      </div>
    </section>
  )
}

/* ---------- 1b. scroll: the mark grows and opens into the live price screen ---------- */

// A pale identity tint per family, so a model is recognised before its name is read.
const FAMILY_TINT = {
  claude: ['#3a2618', '#e7a873'], gpt: ['#26291f', '#cfe0b4'], gemini: ['#1d2633', '#9cc0e6'],
  deepseek: ['#1f2433', '#a9b8ef'], kimi: ['#33291a', '#e8c77a'], glm: ['#1f2b26', '#9fd6bd'],
  grok: ['#2a2a2a', '#d6d6d6'], mimo: ['#33221f', '#eaa59a'],
}
const SCREEN_MODELS = ['claude-opus-5-5', 'gpt-6-astra', 'gemini-4-argon', 'claude-sonnet-5-5', 'deepseek-v4.1-flash', 'kimi-k3', 'glm-5.3', 'claude-haiku-5-5']

/**
 * A window onto the live catalog: eight flagships as spotlight cards, each with its real price,
 * its cached rate and its live health. The cards rise in one after another as the screen opens,
 * and clicking one opens it on the board below.
 */
function PriceScreen({ models, p, onPick }) {
  // Phones show four so the whole screen fits while it's pinned.
  const lg = useIsLarge()
  const cards = SCREEN_MODELS.map((id) => models.find((m) => m.id === id)).filter(Boolean).slice(0, lg ? 8 : 4)
  const up = models.filter((m) => m.status === 'up').length
  return (
    <div data-ui className="relative overflow-hidden rounded-[18px]" style={{ background: T.tile, boxShadow: '0 40px 120px -40px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(243,239,231,0.06)' }}>
      <BorderBeam size={160} duration={9} colorFrom={T.copper} colorTo={T.bone} borderWidth={1.5} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
        <HexGlyph className="h-5 w-5" color={T.bone} hole={T.tile} />
        <span className="text-[16px] font-medium" style={{ color: C.fg }}>Live prices</span>
        <span className="text-[14px]" style={{ color: C.dim }}>$ per million tokens</span>
        <span className="ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-[13px]" style={{ background: T.tile2, color: C.fg }}>
          <LiveDot /> {up} of {models.length} up
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 px-2 pb-2 sm:px-3 sm:pb-3 lg:grid-cols-4">
        {cards.map((m, i) => <PriceCard key={m.id} m={m} p={p} i={i} onPick={onPick} />)}
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-[14px] sm:px-6" style={{ background: T.tile2, color: C.dim }}>
        <span className="hidden sm:inline">One request format for every model. Billed per token, cached input for less.</span>
        <a href="#models" onClick={smoothTo} className="pointer-events-auto group inline-flex items-center gap-1.5 transition-colors hover:text-[#cd8a4c]" style={{ color: C.fg }}>
          All {models.length} models <ArrowRight size={14} className="rotate-90 transition-transform duration-300 group-hover:translate-y-0.5" />
        </a>
      </div>
    </div>
  )
}

function PriceCard({ m, p, i, onPick }) {
  // Scroll-linked when the screen is pinned; simply shown on phones and with reduced motion.
  const start = 0.5 + i * 0.03
  const still = useMotionValue(1)
  const src = p ?? still
  const opacity = useTransform(src, p ? [start, start + 0.1] : [0, 1], p ? [0, 1] : [1, 1])
  const y = useTransform(src, p ? [start, start + 0.14] : [0, 1], p ? [28, 0] : [0, 0])
  const s = statusOf(m)
  const [bg, fg] = FAMILY_TINT[m.family] ?? [T.tile3, C.fg]
  const fam = FAMILY_ORDER.find((f) => f.id === m.family)?.short ?? ''
  return (
    <motion.div style={{ opacity, y }} className="pointer-events-auto">
      <MagicCard
        background={T.ink}
        border="rgba(243,239,231,0.05)"
        gradientSize={200}
        className="h-full rounded-[12px]"
      >
        <button type="button" onClick={() => onPick?.(m.id)} className="flex h-full flex-col p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#cd8a4c]" aria-label={`${m.name}, ${usd(m.price)} per million tokens`}>
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold" style={{ background: bg, color: fg }}>{fam[0]}</span>
            <span className="text-[13px]" style={{ color: C.dim }}>{fam}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[13px] tabular-nums" style={{ color: C.dim }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{m.latency}
            </span>
          </span>
          <span className="mt-3 block truncate text-[16px] font-medium" style={{ color: C.fg }}>{m.name}</span>
          <span className="mt-auto flex items-baseline gap-1 pt-4">
            <span className="font-medium tabular-nums" style={{ fontSize: 30, letterSpacing: '-0.04em', lineHeight: 1, color: C.fg }}>{usd(m.price)}</span>
            <span className="text-[14px]" style={{ color: C.dim }}>/M</span>
          </span>
          <span className="mt-1 text-[13px] tabular-nums" style={{ color: C.dim }}>{usd(m.cacheRead)} cached</span>
        </button>
      </MagicCard>
    </motion.div>
  )
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

/**
 * The first screen, pinned. Scrolling lifts the tiles away, pours the terrain down, glides the
 * hex mark from its tile to the centre where it swells and turns, and the mark opens into the
 * live price screen. Phones and reduced motion get the board and the screen without the pin.
 */
function HeroStage({ models, live, onPick }) {
  const lg = useIsLarge()
  const reduce = useReducedMotion()
  if (!reduce && !lg) {
    // Phones: the board scrolls normally, then the same reveal plays on its own stage.
    return (
      <>
        <Hero models={models} live={live} onPick={onPick} />
        <PinnedHero models={models} live={live} onPick={onPick} withHero={false} />
      </>
    )
  }
  if (reduce) {
    return (
      <>
        <Hero models={models} live={live} onPick={onPick} />
        <section className={cn(BOARD, 'pt-2')}>
          <Tile className="p-0" style={{ background: 'transparent' }}><PriceScreen models={models} onPick={onPick} /></Tile>
        </section>
      </>
    )
  }
  return <PinnedHero models={models} live={live} onPick={onPick} />
}

function PinnedHero({ models, live, onPick, withHero = true }) {
  const ref = useRef(null)
  const stageRef = useRef(null)
  const markRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

  // Where the mark sits in its tile, relative to the middle of the stage.
  const dx = useMotionValue(0)
  const dy = useMotionValue(0)
  // Measured from layout (offsetLeft/Top), not getBoundingClientRect, so the tiles' entrance and
  // the hero's own scroll transform can't skew it. Re-measured on resize and whenever the page is
  // back at the top, so the mark always flies home to the right spot.
  const [ready, setReady] = useState(!withHero)
  const measure = useCallback(() => {
    const stage = stageRef.current
    let el = markRef.current
    if (!stage || !el) return
    let x = el.offsetWidth / 2
    let y = el.offsetHeight / 2
    while (el && el !== stage) {
      x += el.offsetLeft
      y += el.offsetTop
      el = el.offsetParent
    }
    if (el !== stage) return
    dx.set(x - stage.clientWidth / 2)
    dy.set(y - stage.clientHeight / 2)
    setReady(true)
  }, [dx, dy])
  useEffect(() => {
    if (!withHero) return
    measure()
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [withHero, measure])

  // At rest the tile shows its own mark; the floating copy takes over only once the scroll starts.
  const [lifted, setLifted] = useState(false)
  useMotionValueEvent(p, 'change', (v) => {
    const l = v > 0.015
    setLifted((cur) => (cur === l ? cur : l))
    if (withHero && v < 0.005) measure()
  })

  // 1. The board lifts away.
  const heroOpacity = useTransform(p, [0, 0.22], [1, 0])
  const heroY = useTransform(p, [0, 0.28], [0, -90])
  const heroScale = useTransform(p, [0, 0.28], [1, 0.96])
  const heroBlurPx = useTransform(p, [0, 0.28], [0, 10])
  const heroFilter = useMotionTemplate`blur(${heroBlurPx}px)`
  const heroPointer = useTransform(heroOpacity, (o) => (o < 0.15 ? 'none' : 'auto'))

  // 2. The terrain pours down behind everything, then dims under the screen.
  const flood = useTransform(p, [0.04, 0.5], [0, 1])
  const terrainOpacity = useTransform(p, [0, 0.12, 0.45, 0.8], [0, 0.45, 0.6, 0.14])

  // 3. The mark glides to the centre, turns, swells, and dissolves.
  // `travel` is 1 while the mark is still home. The hero is already shifting in that
  // range, and the labels ride with it, so the flying copy follows the same shift.
  // Otherwise, scrolling back up leaves the hexagon below and right of the orbit.
  const travel = useTransform(p, [0.05, 0.38], [1, 0])
  const markX = useTransform([dx, travel, heroScale], ([d, t, s]) => d * t * s)
  const markY = useTransform([dy, travel, heroScale, heroY], ([d, t, s, y]) => d * t * s + y * t)
  const markRotate = useTransform(p, [0.05, 0.42], [0, 90])
  const markScale = useTransform(p, [0, 0.36, 0.46], [1, 1.7, 3.2])
  const markOpacity = useTransform(p, [0.36, 0.46], [1, 0])
  const markBlurPx = useTransform(p, [0.36, 0.46], [0, 14])
  const markFilter = useMotionTemplate`blur(${markBlurPx}px)`
  const glow = useTransform(p, [0, 0.4, 0.55], [0, 0.14, 0])

  // 4. ...and opens into the live price screen.
  const shotScale = useTransform(p, [0.36, 0.78], [0.28, 1])
  const shotOpacity = useTransform(p, [0.4, 0.52], [0, 1])
  const shotRotateX = useTransform(p, [0.36, 0.8], [38, 0])
  const shotY = useTransform(p, [0.36, 0.8], [60, 0])
  const capOpacity = useTransform(p, [0.74, 0.9], [0, 1])
  const capY = useTransform(p, [0.74, 0.9], [16, 0])

  return (
    <section ref={ref} className="relative" style={{ height: withHero ? '290vh' : '230vh' }}>
      <div ref={stageRef} className="sticky top-16 h-[calc(100svh-64px)] overflow-hidden">
        <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: terrainOpacity }}>
          <AsciiField flood={flood} depth={0.36} />
        </motion.div>

        {withHero ? (
          <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale, filter: heroFilter, pointerEvents: heroPointer }}>
            <Hero models={models} live={live} onPick={onPick} markRef={markRef} hideMark={ready && lifted} />
          </motion.div>
        ) : null}

        {/* the mark, lifted out of its tile. The centering translate has to live on a
            plain element: a motion style replaces `transform` and would drop it, which
            parks the hexagon half its own size off the centre of the labels. */}
        <motion.div className="absolute left-1/2 top-1/2" style={{ x: markX, y: markY, opacity: ready && (lifted || !withHero) ? markOpacity : 0 }}>
          <div className="-translate-x-1/2 -translate-y-1/2">
            <motion.div style={{ rotate: markRotate, scale: markScale, filter: markFilter }}>
              <motion.div className="pointer-events-none absolute -inset-24 rounded-full" style={{ opacity: glow, background: 'radial-gradient(50% 50% at 50% 50%, #cd8a4c, transparent 70%)' }} />
              <MetalMark size={withHero ? 150 : 110} />
            </motion.div>
          </div>
        </motion.div>

        {/* the screen it opens into */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 sm:px-6" style={{ perspective: 1400 }}>
          <motion.div
            className="w-full max-w-[1000px]"
            style={{ scale: shotScale, opacity: shotOpacity, rotateX: shotRotateX, y: shotY, transformOrigin: '50% 40%' }}
          >
            <PriceScreen models={models} p={p} onPick={onPick} />
          </motion.div>
          <motion.p className="mt-7 max-w-[34ch] text-center text-[17px] sm:max-w-none" style={{ opacity: capOpacity, y: capY, color: C.dim }}>
            The models you already use, at the price you’ll actually pay. <span style={{ color: C.fg }}>Every one on one key.</span>
          </motion.p>
        </div>

      </div>
    </section>
  )
}

/* ---------- 2. the marquee: real model names at real prices ---------- */

function Marquee({ models, onPick }) {
  const items = FLAGSHIPS.map((id) => models.find((m) => m.id === id)).filter(Boolean)
  const row = (hidden) => (
    <div className="lb-track-half flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          tabIndex={hidden ? -1 : 0}
          onClick={() => onPick(m.id)}
          className="lb-mq-item group flex shrink-0 items-center gap-6 px-8 outline-none"
        >
          <span className="font-medium transition-colors duration-300" style={{ fontSize: 'clamp(44px, 6vw, 96px)', letterSpacing: '-0.045em', lineHeight: 1.1 }}>{m.name}</span>
          <span className="rounded-full px-4 py-1.5 text-[18px] transition-colors duration-300 group-hover:bg-[#cd8a4c] group-hover:text-[#0a0908]" style={{ background: T.tile3, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{usd(m.price)}/M</span>
          <HexGlyph className="h-6 w-6 opacity-40" />
        </button>
      ))}
    </div>
  )
  return (
    <section aria-label="Models and prices" className="lb-marquee relative mt-2 overflow-hidden py-10 sm:py-14">
      <div className="lb-track flex w-max">{row(false)}{row(true)}</div>
    </section>
  )
}

/* ---------- 3. the board: every model, priced live ---------- */

const SORTS = [
  { id: 'price', label: 'Cheapest', fn: (a, b) => a.price - b.price },
  { id: 'speed', label: 'Fastest', fn: (a, b) => (a.latencyS ?? 1e9) - (b.latencyS ?? 1e9) },
  { id: 'name', label: 'A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
]

const GLASS_SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }

/**
 * A row of options on a frosted track, with a liquid-glass lens that slides to the chosen one.
 * The lens squashes a little as it travels and swells on press, like iOS's glass controls.
 */
export function Segmented({ options, value, onChange, id, light, scroll, wrap }) {
  return (
    <div
      className={cn('lb-glass-track inline-flex gap-1 rounded-[22px] p-1', scroll ? 'max-w-full flex-nowrap overflow-x-auto [scrollbar-width:none]' : 'flex-wrap', wrap && 'max-w-full')}
      style={light ? { background: 'rgba(10,9,8,0.12)', boxShadow: 'none' } : undefined}
    >
      {options.map((o) => {
        const on = o.id === value
        return (
          <motion.button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            whileTap={{ scale: 0.95 }}
            transition={GLASS_SPRING}
            className="relative shrink-0 rounded-full px-4 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[#cd8a4c]"
            style={{ color: light ? T.ink : C.fg }}
          >
            {on ? (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn('absolute inset-0 rounded-full', light ? '' : 'lb-glass-lens')}
                style={light ? { background: T.ink } : undefined}
                transition={GLASS_SPRING}
              />
            ) : null}
            <span className="relative transition-opacity duration-200" style={{ color: on && light ? T.bone : undefined, opacity: on || light ? 1 : 0.62 }}>{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * A slider with a glass thumb. The thumb follows the finger exactly while dragging (on a spring,
 * so it never jumps), turns to clear glass over the copper fill, and settles onto the nearest step.
 */
function GlassSlider({ value, onChange, min = 0, max = 100, step = 1, label, format = (v) => v }) {
  const track = useRef(null)
  const [drag, setDrag] = useState(false)
  const toT = (v) => (v - min) / (max - min)
  const pos = useMotionValue(toT(value))
  const smooth = useSpring(pos, { stiffness: 520, damping: 42, mass: 0.6 })
  const left = useTransform(smooth, (t) => `${t * 100}%`)
  useEffect(() => { if (!drag) pos.set(toT(value)) }, [value, drag]) // eslint-disable-line react-hooks/exhaustive-deps

  const fromX = (x) => {
    const r = track.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (x - r.left) / r.width))
    pos.set(t)
    const v = Math.round((min + t * (max - min)) / step) * step
    if (v !== value) onChange(v)
  }
  const key = (e) => {
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 4, PageDown: -step * 4 }[e.key]
    if (e.key === 'Home') { e.preventDefault(); onChange(min) } else if (e.key === 'End') { e.preventDefault(); onChange(max) } else if (d) { e.preventDefault(); onChange(Math.max(min, Math.min(max, value + d))) }
  }
  return (
    <div className="flex items-center gap-4 text-[15px]" style={{ color: C.fg }}>
      <span className="shrink-0">{label}</span>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${format(value)}`}
        onKeyDown={key}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); fromX(e.clientX) }}
        onPointerMove={(e) => { if (drag) fromX(e.clientX) }}
        onPointerUp={() => { setDrag(false); pos.set(toT(value)) }}
        onPointerCancel={() => { setDrag(false); pos.set(toT(value)) }}
        className="group relative h-11 flex-1 cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#cd8a4c]"
      >
        <div className="lb-glass-track absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full">
          <motion.div className="h-full rounded-full" style={{ width: left, background: `linear-gradient(90deg, ${T.copperDeep}, ${T.copper})` }} />
        </div>
        <motion.div className="pointer-events-none absolute top-1/2" style={{ left }}>
          <motion.div
            className={cn('-translate-x-1/2 -translate-y-1/2 rounded-full', drag ? 'lb-glass-lens' : '')}
            animate={{ width: drag ? 52 : 34, height: drag ? 32 : 24, backgroundColor: drag ? 'rgba(255,255,255,0.10)' : T.bone }}
            transition={GLASS_SPRING}
            style={{ boxShadow: drag ? undefined : '0 2px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.8)' }}
          />
        </motion.div>
      </div>
      <span className="w-11 shrink-0 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{format(value)}</span>
    </div>
  )
}

function StatusBlock({ m }) {
  const s = statusOf(m)
  return (
    <span className="inline-flex w-[58px] items-center justify-center rounded-md py-1.5 text-[13px] font-medium sm:w-[84px] sm:text-[14px]" style={{ background: s.color, color: T.ink }}>
      {s.label}
    </span>
  )
}

function OpenRow({ m, onClose }) {
  const [done, copy] = useCopy()
  const cachedLess = m.price > 0 ? Math.round((1 - m.cacheRead / m.price) * 100) : 0
  const t10 = tok(tokensFor(10, m.price))
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="grid gap-6 rounded-[10px] p-5 sm:p-7 md:grid-cols-12"
      style={{ background: T.copper, color: T.ink }}
    >
      <div className="md:col-span-5">
        <button type="button" onClick={onClose} className="text-left outline-none focus-visible:underline">
          <p className="font-medium" style={{ fontSize: 'clamp(30px, 3.2vw, 46px)', lineHeight: 1, letterSpacing: '-0.04em' }}>{m.name}</p>
        </button>
        <button type="button" onClick={() => copy(m.id)} className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[14px] transition-colors hover:bg-black/20" style={{ background: 'rgba(10,9,8,0.12)' }}>
          {done ? <Check size={14} /> : <Copy size={14} />} <code>{done ? 'copied' : m.id}</code>
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[16px] md:col-span-5 md:grid-cols-2">
        <div><dt style={{ color: 'rgba(10,9,8,0.65)' }}>Standard</dt><dd className="mt-0.5 text-[22px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(m.price)}<span className="text-[15px] font-normal"> /M</span></dd></div>
        <div><dt style={{ color: 'rgba(10,9,8,0.65)' }}>Cached input</dt><dd className="mt-0.5 text-[22px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{usd(m.cacheRead)}<span className="text-[15px] font-normal"> /M{cachedLess > 0 ? `, ${cachedLess}% less` : ''}</span></dd></div>
        <div><dt style={{ color: 'rgba(10,9,8,0.65)' }}>$10 buys about</dt><dd className="mt-0.5 text-[22px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{t10.n.toFixed(t10.places)}{t10.unit} tokens</dd></div>
        <div><dt style={{ color: 'rgba(10,9,8,0.65)' }}>Response time</dt><dd className="mt-0.5 text-[22px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.latency}{m.availability != null ? <span className="text-[15px] font-normal">, {m.availability}% up</span> : null}</dd></div>
      </dl>
      <div className="flex items-end md:col-span-2 md:justify-end">
        <PrimaryButton to="/signup" tone="ink" small>Use it</PrimaryButton>
      </div>
    </motion.div>
  )
}

export function ModelBoard({ models, live, checkedAt, selected, setSelected, title = 'Every model, priced live.', limit = 9, headingAs = 'h2', bare = false }) {
  const [family, setFamily] = useState('all')
  const [sort, setSort] = useState('price')
  const [q, setQ] = useState('')
  const [all, setAll] = useState(false)
  const fams = [{ id: 'all', label: `All ${models.length}` }, ...FAMILY_ORDER.filter((f) => models.some((m) => m.family === f.id)).map((f) => ({ id: f.id, label: f.short }))]
  const rows = useMemo(() => {
    const s = SORTS.find((x) => x.id === sort).fn
    const needle = q.trim().toLowerCase()
    return models
      .filter((m) => family === 'all' || m.family === family)
      .filter((m) => !needle || m.id.includes(needle) || m.name.toLowerCase().includes(needle))
      .sort(s)
  }, [models, family, sort, q])
  // Keep the open row in view when the list is cut short.
  const shown = all ? rows : rows.slice(0, limit)
  if (!all && selected && !shown.some((m) => m.id === selected) && rows.some((m) => m.id === selected)) {
    shown.splice(shown.length - 1, 1, rows.find((m) => m.id === selected))
  }
  const ago = checkedAt ? Math.max(0, Math.round((Date.now() - new Date(checkedAt).getTime()) / 1000)) : null
  return (
    <section id={bare ? undefined : 'models'} className={bare ? '' : cn(BOARD, 'scroll-mt-20')}>
      {bare ? null : <SectionHead title={title} as={headingAs} className="!pt-12 sm:!pt-16">
        <p className="flex items-center gap-2.5 text-[16px]" style={{ color: C.fg }}>
          <LiveDot color={live ? C.up : T.amber} />
          {live ? `Live${ago != null ? `, checked ${ago < 90 ? `${ago}s` : `${Math.round(ago / 60)} min`} ago` : ''}` : 'Today’s rates, live data loading'}
        </p>
      </SectionHead>}

      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <Segmented id="fam" options={fams} value={family} onChange={setFamily} scroll />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented id="sort" options={SORTS} value={sort} onChange={setSort} />
          <label className="flex items-center gap-2 rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#cd8a4c]" style={{ background: T.tile2 }}>
            <Search size={16} style={{ color: C.dim }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models" className="w-36 bg-transparent text-[15px] outline-none placeholder:text-[rgba(243,239,231,0.45)]" style={{ color: C.fg }} />
          </label>
        </div>
      </div>

      <LayoutGroup>
        <motion.div layout data-ui className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {shown.map((m) => m.id === selected ? (
              <OpenRow key={m.id} m={m} onClose={() => setSelected(null)} />
            ) : (
              <motion.button
                layout
                key={m.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                onClick={() => setSelected(m.id)}
                className={cn('lb-row group grid grid-cols-[1fr_auto] items-center gap-4 rounded-[10px] px-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#cd8a4c] md:grid-cols-12', bare ? 'min-h-[52px]' : 'min-h-[68px]')}
                style={{ background: T.tile }}
              >
                <span className="flex min-w-0 flex-col py-2.5 md:col-span-4 md:py-0">
                  <span className="font-medium transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: bare ? 16 : 'clamp(18px, 1.7vw, 24px)', letterSpacing: '-0.02em', color: C.fg }}>{m.name}</span>
                  <span className="mt-0.5 text-[14px] tabular-nums md:hidden" style={{ color: C.dim }}>
                    <span style={{ color: C.fg }}>{usd(m.price)}/M</span> · {usd(m.cacheRead)} cached · {m.latency}
                  </span>
                </span>
                <span className="hidden text-[15px] md:col-span-2 md:block" style={{ color: C.dim }}>{FAMILY_ORDER.find((f) => f.id === m.family)?.short}</span>
                <span className="hidden text-[18px] md:col-span-2 md:block" style={{ color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{usd(m.price)} <span className="text-[14px]" style={{ color: C.dim }}>/M</span></span>
                <span className="hidden text-[16px] md:col-span-2 md:block" style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{usd(m.cacheRead)} cached</span>
                <span className="hidden text-[16px] lg:col-span-1 lg:block" style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{m.latency}</span>
                <span className="justify-self-end md:col-span-2 lg:col-span-1"><StatusBlock m={m} /></span>
              </motion.button>
            ))}
          </AnimatePresence>
          {!rows.length ? (
            <div className="rounded-[10px] px-5 py-8 text-[16px]" style={{ background: T.tile, color: C.dim }}>No model matches “{q}”.</div>
          ) : null}
        </motion.div>
      </LayoutGroup>

      {rows.length > limit ? (
        <div className="mt-3 flex justify-center">
          <PrimaryButton tone="ghost" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${rows.length}`}</PrimaryButton>
        </div>
      ) : null}
    </section>
  )
}

/* ---------- 4. top-ups that step up ---------- */

const DIAL_PICKS = ['claude-opus-5-5', 'gpt-6-astra', 'claude-sonnet-5-5', 'gemini-4-argon', 'kimi-k3', 'deepseek-v4.1-flash']
const TOKENS_PER_PAGE = 650 // about 500 words of English
const RING_R = 132
const RING_C = 2 * Math.PI * RING_R

/** The amount as a dial: a copper ring filled to its share of $100, springing as the amount changes. */
function CreditDial({ amt, t, m }) {
  const fill = useSpring(amt / 100, { stiffness: 120, damping: 22 })
  useEffect(() => { fill.set(amt / 100) }, [amt, fill])
  const dash = useTransform(fill, (v) => `${v * RING_C} ${RING_C}`)
  const size = 340
  const c = size / 2
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={RING_R} fill="none" stroke={T.tile2} strokeWidth="16" />
        <motion.circle cx={c} cy={c} r={RING_R} fill="none" stroke={T.copper} strokeWidth="16" strokeLinecap="round" style={{ strokeDasharray: dash }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="flex items-start font-medium" style={{ fontSize: 'clamp(56px, 6vw, 76px)', lineHeight: 1, letterSpacing: '-0.05em', color: C.fg }}>
          <span className="mt-2 text-[0.5em]">$</span><SlidingNumber number={amt} />
        </p>
        <p className="mt-3 flex items-baseline gap-1 text-[20px] font-medium tabular-nums" style={{ color: T.copper }}>
          ≈ <SlidingNumber number={t.n} decimalPlaces={t.places} />{t.unit} tokens
        </p>
        <p className="mt-1 max-w-[18ch] truncate text-[15px]" style={{ color: C.dim }}>on {m.name}</p>
      </div>
    </div>
  )
}

export function TopUps({ models, selected, setSelected }) {
  const [cached, setCached] = useState(0)
  const [amt, setAmt] = useState(25)
  const picks = DIAL_PICKS.map((id) => models.find((x) => x.id === id)).filter(Boolean)
  const m = models.find((x) => x.id === selected) ?? picks[0]
  const effOf = (x) => x.price * (1 - cached / 100) + x.cacheRead * (cached / 100)
  const tokensM = (x) => tokensFor(amt, effOf(x))
  const t = tok(tokensM(m))
  // Bars on a square-root scale: DeepSeek buys ~35x what Opus does, and a linear bar would hide Opus.
  const maxRoot = Math.sqrt(Math.max(...picks.map(tokensM)))
  const pages = Math.round((tokensM(m) * 1e6) / TOKENS_PER_PAGE)
  const replies = Math.round((tokensM(m) * 1e6) / 1000)
  return (
    <section className={BOARD}>
      <SectionHead title={<>Top up once.<br />Spend it anywhere.</>}>
        <p className="max-w-[40ch] text-[16px]" style={{ color: C.dim }}>Pick an amount. One balance pays for every model, at each model’s own rate.</p>
      </SectionHead>
      <div className="grid items-center gap-10 px-1 lg:grid-cols-12 lg:gap-12">
        {/* the dial and the action */}
        <div className="flex flex-col items-center lg:col-span-5">
          <CreditDial amt={amt} t={t} m={m} />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Segmented id="amt" options={TOPUPS.map((v) => ({ id: v, label: `$${v}` }))} value={amt} onChange={setAmt} />
          </div>
          <div className="mt-5"><PrimaryButton to="/signup" tone="copper">Top up ${amt}</PrimaryButton></div>
        </div>

        {/* what it buys, model by model */}
        <div className="lg:col-span-7">
          <h3 className="text-[22px] font-medium" style={{ letterSpacing: '-0.02em', color: C.fg }}>
            What ${amt} gets you
          </h3>
          <ul className="mt-4 flex flex-col gap-1">
            {picks.map((x) => {
              const on = x.id === m.id
              const v = tok(tokensM(x))
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(x.id)}
                    aria-pressed={on}
                    className="group grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-4 rounded-[12px] px-4 py-3 text-left outline-none transition-colors duration-200 hover:bg-[#1c1915] focus-visible:ring-2 focus-visible:ring-[#cd8a4c] sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
                    style={{ background: on ? T.tile2 : 'transparent' }}
                  >
                    <span className="truncate text-[16px]" style={{ color: on ? C.fg : 'rgba(243,239,231,0.78)', fontWeight: on ? 500 : 400 }}>{x.name}</span>
                    <span className="h-2 overflow-hidden rounded-full" style={{ background: T.tile3 }}>
                      <motion.span
                        className="block h-full rounded-full"
                        animate={{ width: `${Math.max(3, (Math.sqrt(tokensM(x)) / maxRoot) * 100)}%`, backgroundColor: on ? T.copper : 'rgba(205,138,76,0.45)' }}
                        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                      />
                    </span>
                    <span className="w-[7.5rem] text-right text-[16px] tabular-nums" style={{ color: on ? C.fg : C.dim }}>
                      {v.n.toFixed(v.places)}{v.unit} <span className="text-[13px]">tokens</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[12px] px-4 py-3.5" style={{ background: T.tile }}>
              <p className="text-[24px] font-medium tabular-nums" style={{ letterSpacing: '-0.02em', color: C.fg }}>≈ {pages.toLocaleString('en-US')}</p>
              <p className="text-[14px]" style={{ color: C.dim }}>pages of text written by {m.name}</p>
            </div>
            <div className="rounded-[12px] px-4 py-3.5" style={{ background: T.tile }}>
              <p className="text-[24px] font-medium tabular-nums" style={{ letterSpacing: '-0.02em', color: C.fg }}>≈ {replies.toLocaleString('en-US')}</p>
              <p className="text-[14px]" style={{ color: C.dim }}>replies of about 1,000 tokens each</p>
            </div>
          </div>

          <div className="mt-6 max-w-[520px]">
            <GlassSlider label="Cached input" value={cached} onChange={setCached} min={0} max={80} step={5} format={(v) => `${v}%`} />
          </div>
          <p className="mt-3 max-w-[64ch] text-[14px]" style={{ color: C.dim }}>
            Estimates use live rates{cached ? ` with ${cached}% of input served from cache` : ''}. A page is about 650 tokens. No subscription and no monthly fee.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------- 5. how it works: three steps flow into the port, the port fans out to every model ---------- */

const STEPS = [
  { icon: UserPlus, time: 'A minute', title: 'Make an account', body: 'Email or Google.' },
  { icon: Wallet, time: 'Two minutes', title: 'Top up', body: 'Card or crypto. Your key is made with the payment.' },
  { icon: Code2, time: 'One line', title: 'Set base_url', body: `${API_BASE} in the SDK you already use.` },
]

function FlowNode({ nodeRef, children, className, style, active, onEnter }) {
  return (
    <motion.div
      ref={nodeRef}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      tabIndex={onEnter ? 0 : undefined}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn('relative z-10 rounded-[14px] outline-none transition-[background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-[#cd8a4c]', className)}
      style={{ background: active ? T.tile2 : T.tile, boxShadow: active ? `inset 0 0 0 1px rgba(205,138,76,0.45)` : 'inset 0 0 0 1px rgba(243,239,231,0.05)', ...style }}
    >
      {children}
    </motion.div>
  )
}

function Workflow({ models }) {
  const box = useRef(null)
  const hub = useRef(null)
  const ship = useRef(null)
  const s0 = useRef(null), s1 = useRef(null), s2 = useRef(null)
  const stepRefs = [s0, s1, s2]
  const m0 = useRef(null), m1 = useRef(null), m2 = useRef(null), m3 = useRef(null), m4 = useRef(null), m5 = useRef(null)
  const modelRefs = [m0, m1, m2, m3, m4, m5]
  const fams = FAMILY_ORDER.filter((f) => models.some((m) => m.family === f.id)).slice(0, 6)
  const [active, setActive] = useState(null)
  const lg = useIsLarge()
  return (
    <section className={BOARD}>
      <SectionHead title="Live in under five minutes.">
        <p className="max-w-[40ch] text-[16px]" style={{ color: C.dim }}>Three steps into one port. From there every model is one string away.</p>
      </SectionHead>
      <div ref={box} className="relative overflow-hidden rounded-[14px] p-4 sm:p-6 lg:p-10" style={{ background: '#0e0c0b' }} onMouseLeave={() => setActive(null)}>
        <div className="grid items-center gap-y-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.7fr)_minmax(0,1fr)] lg:gap-x-10">
          {/* steps */}
          <div className="flex flex-col gap-3">
            {STEPS.map((st, i) => (
              <FlowNode key={st.title} nodeRef={stepRefs[i]} active={active === i} onEnter={() => setActive(i)} className="flex items-start gap-4 p-4 sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: active === i ? T.copper : T.tile3, color: active === i ? T.ink : C.fg, transition: 'background-color 300ms, color 300ms' }}>
                  <st.icon size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[17px] font-medium" style={{ color: C.fg }}>{st.title}</span>
                    <span className="text-[14px]" style={{ color: T.copper }}>{st.time}</span>
                  </span>
                  <span className="mt-1 block text-[15px] leading-snug" style={{ color: 'rgba(243,239,231,0.72)' }}>{st.body}</span>
                </span>
              </FlowNode>
            ))}
          </div>

          {/* the port */}
          <div className="flex flex-col items-center gap-4">
            <div ref={hub} className="relative z-10 grid h-[132px] w-[132px] place-items-center rounded-full" style={{ background: T.tile, boxShadow: 'inset 0 0 0 1px rgba(243,239,231,0.07)' }}>
              <span className="lb-pulse absolute inset-0 rounded-full" />
              <HexGlyph className="h-16 w-16" color={T.bone} hole={T.tile} dot={T.copper} />
            </div>
            <code className="rounded-full px-3 py-1 font-mono text-[13px]" style={{ background: T.tile2, color: C.fg }}>{API_BASE}</code>
          </div>

          {/* every model, then ship */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {fams.map((f, i) => (
                <FlowNode key={f.id} nodeRef={modelRefs[i]} className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-[15px] font-medium" style={{ color: C.fg }}>{f.short}</span>
                  <span className="text-[13px] tabular-nums" style={{ color: C.dim }}>{models.filter((m) => m.family === f.id).length}</span>
                </FlowNode>
              ))}
            </div>
            <FlowNode nodeRef={ship} className="flex items-center gap-4 p-4 sm:p-5" style={{ background: T.bone }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: T.ink, color: T.bone }}><Rocket size={18} strokeWidth={1.8} /></span>
              <span>
                <span className="block text-[17px] font-medium" style={{ color: T.ink }}>The rest is yours</span>
                <span className="block text-[15px]" style={{ color: 'rgba(10,9,8,0.7)' }}>Ship, and switch models by changing one string.</span>
              </span>
            </FlowNode>
          </div>
        </div>

        {/* beams: steps into the port, the port out to each family; vertical on phones */}
        {stepRefs.map((r, i) => (
          <AnimatedBeam
            key={`in${i}`}
            containerRef={box}
            fromRef={r}
            toRef={hub}
            curvature={lg ? (i - 1) * -40 : 0}
            duration={3.2}
            delay={i * 0.35}
            pathOpacity={active === i ? 0.4 : 0.12}
            pathWidth={active === i ? 2.5 : 2}
          />
        ))}
        {lg ? modelRefs.slice(0, fams.length).map((r, i) => (
          <AnimatedBeam key={`out${i}`} containerRef={box} fromRef={hub} toRef={r} curvature={(i % 2 ? 1 : -1) * 20} duration={3.2} delay={1.1 + i * 0.12} />
        )) : <AnimatedBeam containerRef={box} fromRef={hub} toRef={modelRefs[0]} duration={3.2} delay={1.1} />}
      </div>
    </section>
  )
}

/* ---------- 6. what you get: cells with a working piece of the product in each ---------- */

function SdkFragment({ model }) {
  const tabs = {
    Python: `from openai import OpenAI\nclient = OpenAI(\n  base_url="${API_BASE}",\n  api_key="sk-lenar-...",\n)\nclient.chat.completions.create(\n  model="${model}", ...)`,
    TypeScript: `import OpenAI from "openai"\nconst client = new OpenAI({\n  baseURL: "${API_BASE}",\n  apiKey: "sk-lenar-...",\n})\nawait client.chat.completions.create({\n  model: "${model}", ... })`,
    cURL: `curl ${API_BASE}/chat/completions \\\n  -H "Authorization: Bearer sk-lenar-..." \\\n  -d '{"model":"${model}",\n       "messages":[...]}'`,
  }
  const [tab, setTab] = useState('Python')
  const [done, copy] = useCopy()
  return (
    <div data-ui className="flex h-full flex-col rounded-[10px]" style={{ background: T.ink }}>
      <div className="flex items-center gap-1 p-2">
        {Object.keys(tabs).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className="relative rounded-md px-3 py-1.5 text-[14px] outline-none" style={{ color: tab === k ? C.fg : C.dim }}>
            {tab === k ? <motion.span layoutId="sdk-tab" className="absolute inset-0 rounded-md" style={{ background: T.tile3 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
            <span className="relative">{k}</span>
          </button>
        ))}
        <button type="button" onClick={() => copy(tabs[tab])} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] transition-colors hover:bg-white/5" style={{ color: C.dim }}>
          {done ? <Check size={14} /> : <Copy size={14} />}{done ? 'Copied' : 'Copy'}
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.pre key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="overflow-x-auto px-4 pb-4 font-mono text-[13.5px] leading-relaxed" style={{ color: 'rgba(243,239,231,0.75)' }}>
          {tabs[tab]}
        </motion.pre>
      </AnimatePresence>
    </div>
  )
}

const USAGE = [0.42, 0.51, 0.47, 0.66, 0.58, 0.81, 0.74, 0.92, 0.88, 1.12, 0.97, 1.18, 1.05, 1.31]

function UsageFragment() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [hi, setHi] = useState(USAGE.length - 1)
  const W = 320, H = 120, max = 1.4
  const pts = USAGE.map((v, i) => [(i / (USAGE.length - 1)) * W, H - (v / max) * H])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <div data-ui ref={ref} className="rounded-[10px] p-4" style={{ background: T.ink }}>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px]" style={{ color: C.dim }}>Spend per day</p>
        <p className="text-[20px] font-medium" style={{ color: C.fg, fontVariantNumeric: 'tabular-nums' }}>${USAGE[hi].toFixed(2)}</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full cursor-crosshair overflow-visible"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHi(Math.max(0, Math.min(USAGE.length - 1, Math.round(((e.clientX - r.left) / r.width) * (USAGE.length - 1)))))
        }}
        onPointerLeave={() => setHi(USAGE.length - 1)}
      >
        <motion.path d={d} fill="none" stroke={T.copper} strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: inView ? 1 : 0 }} transition={{ duration: 1.4, ease: EASE }} />
        <line x1={pts[hi][0]} x2={pts[hi][0]} y1="0" y2={H} stroke="rgba(243,239,231,0.15)" />
        <circle cx={pts[hi][0]} cy={pts[hi][1]} r="5" fill={T.bone} />
      </svg>
      <p className="mt-2 text-[13px]" style={{ color: C.dim }}>Sample account. Move across the chart.</p>
    </div>
  )
}

const KEY_SAMPLE = 'sk-lenar-7Qx2mN8vRk4tWb9Lc3Hd'
const SCRAMBLE = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function KeyFragment() {
  const [text, setText] = useState(`sk-lenar-${'•'.repeat(16)}3Hd`)
  const [state, setState] = useState('hidden')
  const reveal = () => {
    if (state !== 'hidden') return
    setState('revealing')
    let f = 0
    const t = setInterval(() => {
      f++
      setText(KEY_SAMPLE.split('').map((c, i) => (i < 9 || i < f * 1.6 ? c : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)])).join(''))
      if (f * 1.6 >= KEY_SAMPLE.length) { clearInterval(t); setText(KEY_SAMPLE); setState('shown') }
    }, 40)
  }
  const roll = () => { setState('hidden'); setText(`sk-lenar-${'•'.repeat(16)}${['9fA', 'q2K', 'Lm7'][Math.floor(Math.random() * 3)]}`) }
  return (
    <div data-ui className="rounded-[10px] p-4" style={{ background: T.ink }}>
      <p className="text-[14px]" style={{ color: C.dim }}>Your API key</p>
      <p className="mt-2 break-all text-[15px]" style={{ color: state === 'shown' ? T.copper : C.fg }}><code className="font-mono">{text}</code></p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={reveal} disabled={state !== 'hidden'} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] transition-colors disabled:opacity-50" style={{ background: T.bone, color: T.ink }}>
          <Eye size={14} /> {state === 'shown' ? 'Shown once' : 'Reveal'}
        </button>
        <button type="button" onClick={roll} className="group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px]" style={{ background: T.tile3, color: C.fg }}>
          <RefreshCw size={14} className="transition-transform duration-500 group-hover:rotate-180" /> Roll
        </button>
      </div>
      <p className="mt-3 text-[13px]" style={{ color: C.dim }}>Sample key, not a real one.</p>
    </div>
  )
}

function PayFragment() {
  const [method, setMethod] = useState('card')
  const [amt, setAmt] = useState(25)
  return (
    <div data-ui className="rounded-[10px] p-4" style={{ background: T.ink }}>
      <Segmented id="pay" options={[{ id: 'card', label: 'Card' }, { id: 'crypto', label: 'Crypto' }]} value={method} onChange={setMethod} />
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {TOPUPS.map((t) => (
          <button key={t} type="button" onClick={() => setAmt(t)} className="rounded-lg py-2.5 text-[15px] font-medium transition-colors" style={{ background: amt === t ? T.copper : T.tile2, color: amt === t ? T.ink : C.fg }}>${t}</button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={method + amt} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mt-3 text-[14px]" style={{ color: C.dim }}>
          {method === 'card' ? `Pay $${amt} with any card through Stripe.` : `Pay $${amt} in the coin you choose. Credit lands once the invoice is paid.`}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function StatusFragment({ models }) {
  const rows = FLAGSHIPS.map((id) => models.find((m) => m.id === id)).filter(Boolean).slice(0, 5)
  return (
    <div data-ui className="rounded-[10px] p-4" style={{ background: T.ink }}>
      <div className="flex flex-col gap-2.5">
        {rows.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[14px]">
            <span className="flex items-center gap-2" style={{ color: C.fg }}>
              <span className="h-2 w-2 rounded-full" style={{ background: statusOf(m).color }} />{m.name}
            </span>
            <span style={{ color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{m.latency}</span>
            <div className="col-span-2 h-1.5 overflow-hidden rounded-full" style={{ background: T.tile3 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.availability ?? 0}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.08, ease: EASE }} className="h-full rounded-full" style={{ background: statusOf(m).color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PassFragment() {
  const reduce = useReducedMotion()
  return (
    <div data-ui className="rounded-[10px] p-4" style={{ background: T.ink }}>
      <svg viewBox="0 0 320 110" className="w-full" role="img" aria-label="A request passes through lenar to the model and the answer comes back">
        <rect x="0" y="35" width="76" height="40" rx="8" fill={T.tile3} />
        <text x="38" y="60" textAnchor="middle" fontSize="13" fill={C.fg}>Your app</text>
        <rect x="244" y="35" width="76" height="40" rx="8" fill={T.tile3} />
        <text x="282" y="60" textAnchor="middle" fontSize="13" fill={C.fg}>Model</text>
        <path d="M76 48 H244" stroke="rgba(243,239,231,0.18)" strokeWidth="2" strokeDasharray="4 6" />
        <path d="M244 62 H76" stroke="rgba(243,239,231,0.18)" strokeWidth="2" strokeDasharray="4 6" />
        <g transform="translate(160 55) scale(0.34) translate(-50 -50)">
          <path d={MARK_D} fill={T.bone} />
          <circle cx="50" cy="50" r="17" fill={T.ink} />
          <circle cx="50" cy="50" r="7" fill={T.copper} />
        </g>
        {!reduce && (
          <>
            <motion.circle r="5" cy="48" fill={T.copper} animate={{ cx: [80, 240] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.6 }} />
            <motion.circle r="5" cy="62" fill={T.bone} animate={{ cx: [240, 80] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 1.6, repeatDelay: 1.6 }} />
          </>
        )}
      </svg>
      <p className="mt-1 text-[14px]" style={{ color: C.dim }}>Request out, answer back. Nothing kept in between.</p>
    </div>
  )
}

function Cell({ title, body, children, flip, i }) {
  return (
    <Tile i={i % 3} className={cn('flex min-h-[400px] flex-col gap-6 p-5 sm:p-6', flip && 'flex-col-reverse')}>
      <div>
        <h3 className="font-medium" style={{ fontSize: 22, letterSpacing: '-0.02em', color: C.fg }}>{title}</h3>
        <p className="mt-2 max-w-[38ch] text-[16px] leading-relaxed" style={{ color: 'rgba(243,239,231,0.75)' }}>{body}</p>
      </div>
      <div className={cn('flex-1', flip ? 'flex items-start' : 'flex items-end')}>
        <Tilt maxTilt={6} perspective={900} className="w-full">
          <TiltContent className="w-full">{children}</TiltContent>
        </Tilt>
      </div>
    </Tile>
  )
}

function Features({ models, selected }) {
  const model = selected ?? FLAGSHIPS[0]
  return (
    <section className={BOARD}>
      <SectionHead title="What comes with the key." />
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        <Cell i={0} title="Keep the SDK you have" body="OpenAI, Anthropic and Gemini SDKs all work. Change the base URL and the key, and nothing else.">
          <SdkFragment model={model} />
        </Cell>
        <Cell i={1} flip title="See every cent" body="Your dashboard shows spend, tokens and cache savings for the last hour, day and week.">
          <UsageFragment />
        </Cell>
        <Cell i={2} title="A key that is yours alone" body="It’s shown once, then masked. Lost it? Roll a new one and your balance moves across.">
          <KeyFragment />
        </Cell>
        <Cell i={3} flip title="Card or crypto" body="Top up $10, $25, $50 or $100. Credit is added the moment the payment clears.">
          <PayFragment />
        </Cell>
        <Cell i={4} title="Health you can check" body="Response time and uptime for every model, measured live. Pick one that’s up before you ship.">
          <StatusFragment models={models} />
        </Cell>
        <Cell i={5} flip title="Your prompts stay yours" body="lenar passes each request to the model and the answer back to you. We don’t store either.">
          <PassFragment />
        </Cell>
      </div>
    </section>
  )
}

/* ---------- 7. questions: one list, one answer ---------- */

function FaqIndex({ models }) {
  const faq = [
    ['Which models can I use?', `All ${models.length} on the board above: GPT, Claude, Gemini, DeepSeek, GLM, Grok, Kimi and MiMo. Use the model id exactly as it’s written there.`],
    ['Will my existing code work?', `Yes. Set the base URL to ${API_BASE} and use your lenar key. Requests and responses keep the OpenAI shape, and the Anthropic and Gemini SDKs work too.`],
    ['How am I charged?', 'Per token, at the model’s rate on the board. Cached input is charged at the lower cached rate. There’s no subscription and no monthly minimum.'],
    ['How do I get a key?', 'Make an account and top up. Your key is created with your first payment and shown once. If you lose it, roll a new one from the dashboard and your balance moves with it.'],
    ['Can I pay with crypto?', 'Yes. Pick Crypto at checkout and pay in the coin you prefer. Credit lands as soon as the invoice is paid.'],
    ['Do you keep my prompts?', 'No. lenar forwards each request to the model and the answer back to you, without storing either.'],
  ]
  const [open, setOpen] = useState(0)
  return (
    <section className={BOARD}>
      <div className="grid gap-2 pt-28 sm:pt-40 lg:grid-cols-12">
        <div className="px-1 lg:col-span-5">
          <h2 className="font-medium" style={{ fontSize: 'clamp(36px, 4.6vw, 68px)', lineHeight: 1, letterSpacing: '-0.04em', color: C.fg }}>Questions.</h2>
          <ul className="mt-10 flex flex-col gap-1">
            {faq.map(([q, a], i) => (
              <li key={q}>
                <button
                  type="button"
                  onMouseEnter={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                  onClick={() => setOpen(i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center gap-4 rounded-[10px] px-4 py-3.5 text-left outline-none transition-colors duration-200"
                  style={{ background: open === i ? T.tile2 : 'transparent', color: open === i ? C.fg : C.dim, fontSize: 18 }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full transition-colors duration-200" style={{ background: open === i ? T.copper : 'rgba(243,239,231,0.3)' }} />
                  {q}
                </button>
                <AnimatePresence initial={false}>
                  {open === i ? (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-10 pr-4 text-[17px] leading-relaxed lg:hidden" style={{ color: C.fg }}>
                      <span className="block pb-4">{a}</span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden lg:col-span-6 lg:col-start-7 lg:block">
          <div className="sticky top-28 flex min-h-[420px] items-end rounded-[10px] p-10" style={{ background: T.tile }}>
            <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-[10px] opacity-40"><AsciiField depth={0.5} /></div>
            <AnimatePresence mode="wait">
              <motion.p key={open} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }} className="relative max-w-[30ch]" style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.3, color: C.fg }}>
                {faq[open][1]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 8. the close: the action tile, cropped from a longer row ---------- */

/** The close: no boxes. The mark floats over a terrain that rises as you arrive. */
function Close({ models }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const rise = useSpring(useTransform(scrollYProgress, [0, 1], [-0.45, 0.12]), { stiffness: 90, damping: 24 })
  const up = models.filter((m) => m.status === 'up').length
  const facts = [`${models.length} models, ${up} up now`, 'From $10, card or crypto', 'No subscription']
  return (
    <section ref={ref} className="relative overflow-hidden pt-28 sm:pt-40">
      <div className={cn(BOARD, 'relative z-10 flex flex-col items-center text-center')}>
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="relative"
        >
          <span className="lb-pulse absolute inset-[18%] rounded-full" />
          <div className="lb-float"><MetalMark size={112} /></div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className="mt-10 max-w-[14ch] font-medium"
          style={{ fontSize: 'clamp(44px, 6.4vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.05em', color: C.fg }}
        >
          Your key is five minutes away.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="mt-6 max-w-[44ch] text-[18px] leading-relaxed"
          style={{ color: 'rgba(243,239,231,0.78)' }}
        >
          Make an account, top up $10, and call any model on this page with the code you already have.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="mt-9 flex flex-wrap justify-center gap-3"
        >
          <PrimaryButton to="/signup" tone="copper">Create account</PrimaryButton>
          <PrimaryButton to="/docs" tone="ghost">Read the docs</PrimaryButton>
        </motion.div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px]" style={{ color: C.dim }}>
          {facts.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check size={15} style={{ color: T.copper }} /> {f}
            </li>
          ))}
        </ul>
      </div>
      {/* the terrain rises from the bottom edge as the section scrolls in */}
      <div className="pointer-events-none relative -mt-6 h-[300px] sm:h-[360px]" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 45%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 45%)' }}>
        <AsciiField flip depth={0.45} flood={rise} />
      </div>
    </section>
  )
}

export const BOARD_STYLES = `
.lb-glass-track {
  background: rgba(255,255,255,0.045);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.05);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}
.lb-glass-lens {
  background: linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.07) 55%, rgba(255,255,255,0.12));
  box-shadow:
    inset 0 1px 0.5px rgba(255,255,255,0.55),
    inset 0 -1px 1px rgba(255,255,255,0.12),
    inset 0 0 0 1px rgba(255,255,255,0.10),
    0 6px 18px rgba(0,0,0,0.35);
  backdrop-filter: blur(10px) saturate(180%) brightness(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(180%) brightness(1.15);
}
@keyframes lb-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes lb-spin { to { transform: rotate(360deg) } }
@keyframes lb-nudge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
.lb-nudge { animation: lb-nudge 2.2s ease-in-out infinite }
@keyframes lb-ping { 0% { transform: scale(1); opacity: .7 } 80%,100% { transform: scale(2.6); opacity: 0 } }
.lb-track { animation: lb-marquee 70s linear infinite }
.lb-marquee:hover .lb-track, .lb-marquee:focus-within .lb-track { animation-play-state: paused }
.lb-mq-item { color: rgba(243,239,231,0.22) }
.lb-mq-item:hover, .lb-mq-item:focus-visible { color: #f3efe7 }
.lb-orbit { animation: lb-spin 60s linear infinite }
.lb-counter { animation: lb-spin 60s linear infinite reverse }
.lb-ping { animation: lb-ping 1.8s cubic-bezier(0,0,.2,1) infinite }
@keyframes lb-pulse { 0% { box-shadow: 0 0 0 0 rgba(205,138,76,0.35) } 100% { box-shadow: 0 0 0 28px rgba(205,138,76,0) } }
.lb-pulse { animation: lb-pulse 2.4s ease-out infinite }
.lb-spin-slow { animation: lb-spin 24s linear infinite }
@keyframes lb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
.lb-float { animation: lb-float 5s ease-in-out infinite }
.lb-row { transition: background-color 200ms }
.lb-row:hover { background-color: #1c1915 !important }
:root { --orbit: 100px; --h0: 300px; --h1: 370px; --h2: 450px; --h3: 530px }
@media (min-width: 640px) { :root { --orbit: 132px } }
@media (min-width: 1280px) { :root { --orbit: 150px } }
@media (max-width: 1023px) { :root { --h0: auto; --h1: auto; --h2: auto; --h3: auto } }
@media (prefers-reduced-motion: reduce) {
  .lb-track, .lb-orbit, .lb-counter, .lb-ping, .lb-spin-slow, .lb-nudge, .lb-pulse, .lb-float { animation: none }
}
`

export default function LandingBoard() {
  const { models, live, checkedAt } = useLiveModels()
  const [selected, setSelected] = useState('claude-opus-5-5')
  const pick = (id) => {
    setSelected(id)
    const el = document.getElementById('models')
    if (el) glideTo(el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0))
  }
  return (
    <>
      <style>{BOARD_STYLES}</style>
      <Intro />
      <HeroStage models={models} live={live} onPick={pick} />
      <Marquee models={models} onPick={pick} />
      <ModelBoard models={models} live={live} checkedAt={checkedAt} selected={selected} setSelected={setSelected} />
      <TopUps models={models} selected={selected} setSelected={setSelected} />
      <Workflow models={models} />
      <Features models={models} selected={selected} />
      <FaqIndex models={models} />
      <Close models={models} />
    </>
  )
}

