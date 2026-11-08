import { useEffect, useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/utils/utils'

type HoverVideoThumbProps = {
  src: string
  /** 列表静态封面（图片）。强烈建议后端给缩略图，不要靠 video 解码首帧 */
  poster?: string
  className?: string
  alt?: string
}

/**
 * 视频列表缩略图（性能优先）：
 * - 默认只渲染封面图，列表不挂 N 个 video
 * - 悬停稳定后再挂载并播放；封面一直盖住直到有可绘制帧
 * - 移开先盖回封面，再延迟卸载，减少来回划过时的闪烁
 */
export const HoverVideoThumb = ({
  src,
  poster,
  className,
  alt = '',
}: HoverVideoThumbProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const enterTimer = useRef<number | null>(null)
  const leaveTimer = useRef<number | null>(null)
  const unmountTimer = useRef<number | null>(null)
  /** 是否处于悬停意图（含进入防抖后） */
  const [active, setActive] = useState(false)
  /** video 是否挂在 DOM 上 */
  const [mounted, setMounted] = useState(false)
  /** 是否已有可展示帧，才把 video 盖到封面之上 */
  const [ready, setReady] = useState(false)
  const mediaKey = `${src}\0${poster ?? ''}`
  const [seenMediaKey, setSeenMediaKey] = useState(mediaKey)

  const clearTimers = () => {
    if (enterTimer.current != null) {
      window.clearTimeout(enterTimer.current)
      enterTimer.current = null
    }
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    if (unmountTimer.current != null) {
      window.clearTimeout(unmountTimer.current)
      unmountTimer.current = null
    }
  }

  if (seenMediaKey !== mediaKey) {
    clearTimers()
    setSeenMediaKey(mediaKey)
    setActive(false)
    setMounted(false)
    setReady(false)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!active || !mounted) return
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    const markReady = () => {
      if (!cancelled) setReady(true)
    }

    const onLoadedData = () => {
      if (video.readyState >= 2) markReady()
    }

    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('playing', markReady)
    if (video.readyState >= 2) markReady()

    void video.play().catch(() => {
      if (cancelled) return
      setActive(false)
      setReady(false)
      setMounted(false)
    })

    return () => {
      cancelled = true
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('playing', markReady)
      video.pause()
    }
  }, [active, mounted, src])

  const onEnter = () => {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    if (unmountTimer.current != null) {
      window.clearTimeout(unmountTimer.current)
      unmountTimer.current = null
    }
    // 已挂载则直接恢复播放，避免来回进同一格重复解码
    if (mounted) {
      setActive(true)
      return
    }
    if (enterTimer.current != null) return
    // 短防抖：快速划过多个格子时不立刻挂载 video
    enterTimer.current = window.setTimeout(() => {
      enterTimer.current = null
      setMounted(true)
      setActive(true)
    }, 100)
  }

  const onLeave = () => {
    if (enterTimer.current != null) {
      window.clearTimeout(enterTimer.current)
      enterTimer.current = null
    }
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null
      // 先停播并盖回封面，下一拍再卸载，避免卸 video 时露底闪一下
      setActive(false)
      setReady(false)
      unmountTimer.current = window.setTimeout(() => {
        unmountTimer.current = null
        setMounted(false)
      }, 160)
    }, 120)
  }

  return (
    <div
      className={cn('relative size-full overflow-hidden bg-zinc-900', className)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {poster ? (
        <img
          src={poster}
          alt={alt}
          draggable={false}
          decoding='async'
          className={cn(
            'pointer-events-none absolute inset-0 size-full object-cover',
            ready ? 'z-0' : 'z-10'
          )}
        />
      ) : (
        <div
          className={cn(
            'text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-900',
            ready ? 'z-0' : 'z-10'
          )}
        >
          <Film className='size-8 opacity-40' />
        </div>
      )}

      {mounted ? (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload='metadata'
          className={cn(
            'pointer-events-none absolute inset-0 size-full object-cover',
            ready ? 'z-20 opacity-100' : 'z-0 opacity-0'
          )}
        />
      ) : null}
    </div>
  )
}
