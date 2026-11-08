import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/utils'

type InfiniteScrollLoadMoreProps = {
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  /** 没有更多时的提示；传空字符串则隐藏 */
  noMoreHint?: string
  /** IntersectionObserver rootMargin，提前触发加载 */
  rootMargin?: string
  disabled?: boolean
  className?: string
  /** 加载中展示卡片骨架过渡，避免内容突然顶入 */
  showSkeleton?: boolean
}

/**
 * 通用「滚到底加载更多」哨兵。
 * 放到列表底部；进入视口且 hasMore 时调用 onLoadMore。
 */
export const InfiniteScrollLoadMore = ({
  hasMore,
  isLoadingMore,
  onLoadMore,
  noMoreHint = '没有更多了',
  rootMargin = '240px',
  disabled = false,
  className,
  showSkeleton = false,
}: InfiniteScrollLoadMoreProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled || !hasMore || isLoadingMore) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore()
        }
      },
      { root: null, rootMargin, threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [disabled, hasMore, isLoadingMore, onLoadMore, rootMargin])

  if (disabled) return null

  return (
    <div
      ref={sentinelRef}
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-3 py-3 text-xs',
        className
      )}
      aria-hidden={!hasMore && !isLoadingMore}
    >
      {isLoadingMore && showSkeleton ? (
        <div
          className='grid w-full animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7'
          aria-hidden
        >
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className='bg-muted/70 aspect-square rounded-xl'
              style={{ animationDelay: `${index * 40}ms` }}
            />
          ))}
        </div>
      ) : null}

      {isLoadingMore ? (
        <span className='inline-flex items-center gap-2 transition-opacity duration-200'>
          <Loader2 className='size-3.5 animate-spin' />
          加载中…
        </span>
      ) : hasMore ? (
        <span className='opacity-60'>向下滚动加载更多</span>
      ) : noMoreHint ? (
        <span className='opacity-50'>{noMoreHint}</span>
      ) : null}
    </div>
  )
}
