// Animated Beam, Magic Card and Border Beam from Magic UI (https://magicui.design), MIT License,
// Copyright (c) Dillion Verma. Ported to plain JSX and lenar's colours: no next-themes, no
// shadcn tokens; each component takes the colours it needs as props.
import { useEffect, useId, useState } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'motion/react'

const cn = (...c) => c.filter(Boolean).join(' ')

/** A curved line between two elements with a beam of light travelling along it. */
export function AnimatedBeam({
  className, containerRef, fromRef, toRef, curvature = 0, reverse = false, duration = 5, delay = 0,
  pathColor = '#f3efe7', pathWidth = 2, pathOpacity = 0.12, gradientStartColor = '#cd8a4c', gradientStopColor = '#f3efe7',
  repeat = Infinity, repeatDelay = 0, startXOffset = 0, startYOffset = 0, endXOffset = 0, endYOffset = 0,
}) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const [pathD, setPathD] = useState('')
  const [size, setSize] = useState({ width: 0, height: 0 })
  const coords = reverse
    ? { x1: ['90%', '-10%'], x2: ['100%', '0%'], y1: ['0%', '0%'], y2: ['0%', '0%'] }
    : { x1: ['10%', '110%'], x2: ['0%', '100%'], y1: ['0%', '0%'], y2: ['0%', '0%'] }

  useEffect(() => {
    const update = () => {
      const c = containerRef.current, a = fromRef.current, b = toRef.current
      if (!c || !a || !b) return
      const cr = c.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      setSize({ width: cr.width, height: cr.height })
      const sx = ra.left - cr.left + ra.width / 2 + startXOffset
      const sy = ra.top - cr.top + ra.height / 2 + startYOffset
      const ex = rb.left - cr.left + rb.width / 2 + endXOffset
      const ey = rb.top - cr.top + rb.height / 2 + endYOffset
      setPathD(`M ${sx},${sy} Q ${(sx + ex) / 2},${sy - curvature} ${ex},${ey}`)
    }
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    update()
    return () => ro.disconnect()
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset])

  return (
    <svg fill="none" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} className={cn('pointer-events-none absolute left-0 top-0 transform-gpu', className)} aria-hidden>
      <path d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      {reduce ? null : <path d={pathD} strokeWidth={pathWidth} stroke={`url(#${id})`} strokeOpacity="1" strokeLinecap="round" />}
      <defs>
        <motion.linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
          animate={coords}
          transition={{ delay, duration, ease: [0.16, 1, 0.3, 1], repeat, repeatDelay }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}

/** A card whose edge and surface light up under the cursor. */
export function MagicCard({
  children, className, style, background = '#14120f', border = 'rgba(243,239,231,0.06)',
  gradientSize = 260, gradientColor = 'rgba(205,138,76,0.22)', gradientFrom = '#cd8a4c', gradientTo = '#f3efe7', ...rest
}) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - r.left)
    mouseY.set(e.clientY - r.top)
  }
  const reset = () => { mouseX.set(-gradientSize); mouseY.set(-gradientSize) }
  const edge = useMotionTemplate`linear-gradient(${background} 0 0) padding-box, radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo} 40%, ${border} 100%) border-box`
  const glow = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)`
  return (
    <motion.div
      onPointerMove={move}
      onPointerLeave={reset}
      className={cn('group relative isolate overflow-hidden border border-transparent', className)}
      style={{ background: edge, ...style }}
      {...rest}
    >
      <motion.div className="pointer-events-none absolute inset-px z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glow }} />
      <div className="relative z-20 flex h-full flex-col">{children}</div>
    </motion.div>
  )
}

/** A short beam of light that travels around the edge of its parent (which needs position: relative). */
export function BorderBeam({ size = 90, duration = 7, delay = 0, colorFrom = '#cd8a4c', colorTo = '#f3efe7', borderWidth = 1.5, reverse = false, initialOffset = 0 }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] border-(length:--bb-w) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
      style={{ '--bb-w': `${borderWidth}px` }}
    >
      <motion.div
        className="absolute aspect-square bg-linear-to-l from-(--bb-from) via-(--bb-to) to-transparent"
        style={{ width: size, offsetPath: `rect(0 auto auto 0 round ${size}px)`, '--bb-from': colorFrom, '--bb-to': colorTo }}
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{ offsetDistance: reverse ? [`${100 - initialOffset}%`, `${-initialOffset}%`] : [`${initialOffset}%`, `${100 + initialOffset}%`] }}
        transition={{ repeat: Infinity, ease: 'linear', duration, delay: -delay }}
      />
    </div>
  )
}
