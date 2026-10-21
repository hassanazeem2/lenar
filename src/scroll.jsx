// Scroll-linked animation helpers for the landing page. Everything here is driven by scroll
// position (not a one-off fade), so it moves with you and reverses when you scroll back up.
import { useRef } from 'react'
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'

const SPRING = { stiffness: 160, damping: 32, mass: 0.4 }

function useEnter(ref, start = 'start 0.98', end = 'start 0.55') {
  const { scrollYProgress } = useScroll({ target: ref, offset: [start, end] })
  return useSpring(scrollYProgress, SPRING)
}

/**
 * Rises, unblurs and fades in as it scrolls into view. `i` staggers siblings.
 * `tilt` adds the 3D lay-down used for product screenshots.
 */
export function ScrollIn({ children, i = 0, tilt = false, className }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const p = useEnter(ref)
  const from = Math.min(0.5, i * 0.12)
  const opacity = useTransform(p, [from, from + 0.5], [0, 1])
  const y = useTransform(p, [from, 1], [tilt ? 90 : 60, 0])
  const blur = useTransform(p, [from, from + 0.6], [8, 0])
  const filter = useMotionTemplate`blur(${blur}px)`
  const scale = useTransform(p, [from, 1], [tilt ? 0.86 : 0.97, 1])
  const rotateX = useTransform(p, [from, 1], [tilt ? 26 : 0, 0])

  if (reduce) return <div className={className}>{children}</div>
  return (
    <div ref={ref} className={className} style={tilt ? { perspective: 1400 } : undefined}>
      <motion.div style={{ opacity, y, filter, scale, rotateX, transformOrigin: '50% 30%' }}>
        {children}
      </motion.div>
    </div>
  )
}

function Word({ p, range, children, dim }) {
  const opacity = useTransform(p, range, [0.12, 1])
  const y = useTransform(p, range, [10, 0])
  return (
    <motion.span className="inline-block" style={{ opacity, y, color: dim ? 'rgba(244,245,246,0.35)' : '#f4f5f6', marginRight: '0.25em' }}>
      {children}
    </motion.span>
  )
}

/** Section title whose words light up one by one as you scroll to it. */
export function ScrollTitle({ lead, claim, className }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const p = useEnter(ref, 'start 0.95', 'start 0.45')
  const words = [...lead.split(' ').map((w) => [w, false]), ...claim.split(' ').map((w) => [w, true])]
  const style = { fontSize: 'clamp(30px, 4.4vw, 46px)', letterSpacing: '-0.03em', textWrap: 'balance' }

  if (reduce) {
    return (
      <h2 className={`font-medium leading-tight ${className ?? ''}`} style={style}>
        <span style={{ color: '#f4f5f6' }}>{lead} </span><span style={{ color: 'rgba(244,245,246,0.35)' }}>{claim}</span>
      </h2>
    )
  }
  return (
    <h2 ref={ref} className={`font-medium leading-tight ${className ?? ''}`} style={style} aria-label={`${lead} ${claim}`}>
      {words.map(([w, dim], k) => {
        const a = (k / words.length) * 0.7
        return <Word key={k} p={p} range={[a, a + 0.3]} dim={dim}>{w}</Word>
      })}
    </h2>
  )
}

/** Thin bar under the nav showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 })
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-16 z-50 h-px origin-left"
      style={{ scaleX, background: 'linear-gradient(90deg, rgba(205,138,76,0), rgba(205,138,76,0.9), rgba(244,245,246,0.9))' }}
    />
  )
}

/** The closing ASCII ridge climbs up from the bottom as you reach the end of the page. */
export function RisingFooterArt({ children }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const p = useSpring(scrollYProgress, SPRING)
  const y = useTransform(p, [0, 1], [160, 0])
  const opacity = useTransform(p, [0, 0.7], [0, 1])
  if (reduce) return <div>{children}</div>
  return <motion.div ref={ref} style={{ y, opacity }}>{children}</motion.div>
}
