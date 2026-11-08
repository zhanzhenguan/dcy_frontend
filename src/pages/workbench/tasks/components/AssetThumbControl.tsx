import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '@/utils/utils'

export type AssetThumbValue = 'up' | 'down' | null

type AssetThumbControlProps = {
  value?: AssetThumbValue
  defaultValue?: AssetThumbValue
  onChange?: (next: AssetThumbValue) => void
  className?: string
  /**
   * compact：列表卡片，默认暗色拇指，hover 展开
   * pair：详情页，始终展示向上 / 向下两个拇指
   */
  variant?: 'compact' | 'pair'
  /** 为 false 时不可取消当前评价（再次点击同项无效）；默认可取消 */
  allowClear?: boolean
}

/** 视频赞/踩：compact 用于卡片，pair 用于详情 */
export const AssetThumbControl = ({
  value: valueProp,
  defaultValue = null,
  onChange,
  className,
  variant = 'compact',
  allowClear = true,
}: AssetThumbControlProps) => {
  const [uncontrolled, setUncontrolled] = useState<AssetThumbValue>(defaultValue)
  const value = valueProp !== undefined ? valueProp : uncontrolled

  const setValue = (next: AssetThumbValue) => {
    if (valueProp === undefined) setUncontrolled(next)
    onChange?.(next)
  }

  const handleSelect = (next: Exclude<AssetThumbValue, null>) => {
    if (value === next) {
      if (!allowClear) return
      setValue(null)
      return
    }
    setValue(next)
  }

  if (variant === 'pair') {
    return (
      <div
        className={cn('flex shrink-0 items-center gap-1', className)}
        role='group'
        aria-label='评价'
      >
        <button
          type='button'
          aria-label='赞'
          aria-pressed={value === 'up'}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect('up')
          }}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full transition-colors',
            value === 'up'
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          <ThumbsUp className='size-4' strokeWidth={2.25} />
        </button>
        <button
          type='button'
          aria-label='踩'
          aria-pressed={value === 'down'}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect('down')
          }}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full transition-colors',
            value === 'down'
              ? 'bg-rose-500/20 text-rose-400'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          <ThumbsDown className='size-4' strokeWidth={2.25} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group/thumb relative flex h-6 w-[3.25rem] shrink-0 items-center justify-end',
        className
      )}
    >
      <button
        type='button'
        aria-label={
          value === 'up' ? '已赞' : value === 'down' ? '已踩' : '评价'
        }
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-md transition-colors',
          'group-hover/thumb:pointer-events-none group-hover/thumb:opacity-0',
          value === 'up'
            ? 'text-amber-500'
            : value === 'down'
              ? 'text-rose-500'
              : 'text-muted-foreground/55 hover:text-muted-foreground'
        )}
      >
        {value === 'down' ? (
          <ThumbsDown className='size-3.5' strokeWidth={2.25} />
        ) : (
          <ThumbsUp className='size-3.5' strokeWidth={2.25} />
        )}
      </button>

      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-end gap-0.5 rounded-md',
          'bg-card opacity-0',
          'pointer-events-none group-hover/thumb:pointer-events-auto group-hover/thumb:opacity-100',
          'transition-opacity'
        )}
      >
        <button
          type='button'
          aria-label='赞'
          aria-pressed={value === 'up'}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect('up')
          }}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-md transition-colors',
            value === 'up'
              ? 'bg-amber-500/15 text-amber-500'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <ThumbsUp className='size-3.5' strokeWidth={2.25} />
        </button>
        <button
          type='button'
          aria-label='踩'
          aria-pressed={value === 'down'}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect('down')
          }}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-md transition-colors',
            value === 'down'
              ? 'bg-rose-500/15 text-rose-500'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <ThumbsDown className='size-3.5' strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}
