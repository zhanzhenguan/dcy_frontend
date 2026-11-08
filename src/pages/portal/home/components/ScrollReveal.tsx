import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '@/utils/utils'

/** Set true to freeze all scroll reveals (e.g. for full-page screenshots). */
const DISABLE_SCROLL_REVEAL = false

/** Stagger start as a fraction of scroll progress (0–1). Keep < 1 so items can finish. */
export function revealDelay(index: number, step = 0.08): CSSProperties {
  return {
    ['--reveal-start' as string]: String(
      Math.min(0.72, Math.max(0, index) * step)
    ),
  }
}

/** Slow start → fast finish (ease-in cubic). */
function easeInCubic(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x
}

/**
 * Scroll-linked reveal: progress 0→1 as section enters,
 * and reverses on scroll back (fade / slide retreat).
 */
export const ScrollReveal = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(DISABLE_SCROLL_REVEAL ? 1 : 0)

  useEffect(() => {
    if (DISABLE_SCROLL_REVEAL) {
      setProgress(1)
      return
    }

    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return
    }

    let raf = 0
    let active = true

    const update = () => {
      raf = 0
      if (!active) return

      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // 更早完成渐入，配合导航锚点落点（顶栏 + scroll-margin）
      const start = vh * 1.15
      const end = vh * 0.28
      const raw = (start - rect.top) / (start - end)
      const next = easeInCubic(raw)

      setProgress((prev) => (Math.abs(prev - next) < 0.002 ? prev : next))
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      active = false
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn('portal-reveal', className)}
      style={{ ['--reveal-progress' as string]: String(progress) }}
    >
      {children}
    </div>
  )
}
