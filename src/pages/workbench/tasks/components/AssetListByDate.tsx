import type { ReactNode } from 'react'
import { InfiniteScrollLoadMore } from '@/components/common'
import { cn } from '@/utils/utils'
import {
  groupByRelativeDate,
  type RelativeDateGroup,
} from '@/utils/groupByRelativeDate'
import type { AssetListItem } from '../types'

type AssetListByDateProps = {
  items: AssetListItem[]
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  /** 没有更多时的提示；传空字符串则隐藏 */
  noMoreHint?: string
  /** 关闭滚动加载（如仅草稿列表） */
  disableLoadMore?: boolean
  /** 日期组排序：近-远 desc / 远-近 asc */
  dateOrder?: 'desc' | 'asc'
  renderGroup: (group: RelativeDateGroup<AssetListItem>) => ReactNode
}

export const AssetListByDate = ({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  noMoreHint = '没有更多了',
  disableLoadMore = false,
  dateOrder = 'desc',
  renderGroup,
}: AssetListByDateProps) => {
  const groups = groupByRelativeDate(
    items,
    (item) => item.createdAt,
    Date.now(),
    dateOrder
  )

  if (groups.length === 0) return null

  return (
    <div className='space-y-10'>
      {groups.map((group) => (
        <section
          key={group.key}
          className={cn(
            'space-y-4 transition-opacity duration-300',
            isLoadingMore ? 'opacity-90' : 'opacity-100'
          )}
        >
          <header className='flex items-center gap-2 py-1'>
            <div className='flex min-w-0 flex-1 items-baseline gap-2'>
              <h2 className='text-foreground text-base font-bold tracking-tight'>
                {group.label}
              </h2>
              <span className='text-muted-foreground text-xs'>
                {group.items.length} 项
              </span>
            </div>
          </header>
          {renderGroup(group)}
        </section>
      ))}

      <InfiniteScrollLoadMore
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        noMoreHint={noMoreHint}
        disabled={disableLoadMore}
        showSkeleton
      />
    </div>
  )
}
