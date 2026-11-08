import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/utils/utils'

export type AnimatedTabItem = {
  value: string
  label: ReactNode
  /** 可选角标，如「年付 8 折」/「周末特惠」 */
  badge?: ReactNode
  disabled?: boolean
}

export type AnimatedTabsSize = 'sm' | 'md' | 'lg'

/**
 * - `pill`：胶囊分段（滑动高亮条），适合筛选/账户中心等
 * - `folder`：灰底凹角白底页签 + 底部短指示条，适合接白底内容区
 */
export type AnimatedTabsVariant = 'pill' | 'folder'

type AnimatedTabsProps = {
  value: string
  onValueChange: (value: string) => void
  items: AnimatedTabItem[]
  /** 默认：2 个 Tab → `folder` 凹槽；更多 → `pill` 胶囊。可显式覆盖 */
  variant?: AnimatedTabsVariant
  /** 默认 `md`，也可传 `sm` / `lg` */
  size?: AnimatedTabsSize
  /** 占满容器宽度，子项均分 */
  fullWidth?: boolean
  className?: string
  listClassName?: string
  triggerClassName?: string
}

const pillSizeStyles: Record<
  AnimatedTabsSize,
  {
    list: string
    indicatorInset: string
    trigger: string
  }
> = {
  sm: {
    list: 'gap-0.5 rounded-full p-1',
    indicatorInset: 'top-1 bottom-1',
    // 约容纳 4 个汉字（如「最近使用」），短标签（如「欧盟」）也拉齐
    trigger:
      'h-7 min-w-20 whitespace-nowrap gap-1 rounded-full px-3 text-xs font-semibold',
  },
  md: {
    list: 'gap-1 rounded-full p-1',
    indicatorInset: 'top-1 bottom-1',
    trigger:
      'h-8 min-w-24 whitespace-nowrap gap-1.5 rounded-full px-4 text-sm font-semibold',
  },
  lg: {
    list: 'gap-1 rounded-full p-1.5',
    indicatorInset: 'top-1.5 bottom-1.5',
    trigger:
      'h-10 min-w-28 whitespace-nowrap gap-1.5 rounded-full px-5 text-sm font-semibold sm:min-w-32 sm:px-6 sm:text-base',
  },
}

const folderSizeStyles: Record<
  AnimatedTabsSize,
  { list: string; trigger: string; underline: string }
> = {
  sm: {
    list: 'h-10 rounded-t-xl',
    trigger: 'h-10 w-[110px] px-3 text-xs font-medium',
    underline: 'h-0.5 w-4',
  },
  md: {
    list: 'h-11 rounded-t-2xl',
    trigger: 'h-11 w-[126px] px-4 text-sm font-medium',
    underline: 'h-1 w-5',
  },
  lg: {
    list: 'h-12 rounded-t-2xl',
    trigger: 'h-12 w-[140px] px-5 text-base font-medium',
    underline: 'h-1 w-6',
  },
}

/**
 * 公共 Tab：`pill` 胶囊分段 / `folder` 凹角页签。
 */
const PillTabs = ({
  value,
  onValueChange,
  items,
  size,
  fullWidth,
  className,
  listClassName,
  triggerClassName,
}: Omit<AnimatedTabsProps, 'variant'> & { size: AnimatedTabsSize }) => {
  const styles = pillSizeStyles[size]
  const listRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  )

  useLayoutEffect(() => {
    const measure = () => {
      const button = buttonRefs.current[activeIndex]
      if (!button) {
        setIndicator({ left: 0, width: 0 })
        setReady(false)
        return
      }
      const next = { left: button.offsetLeft, width: button.offsetWidth }
      setIndicator((prev) =>
        prev.left === next.left && prev.width === next.width ? prev : next
      )
      setReady(true)
    }

    measure()
    const frame = requestAnimationFrame(measure)
    const list = listRef.current
    const button = buttonRefs.current[activeIndex]
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null
    if (observer && list) observer.observe(list)
    if (observer && button) observer.observe(button)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeIndex, fullWidth, items, size, value])

  useLayoutEffect(() => {
    const button = buttonRefs.current[activeIndex]
    if (!button) return
    button.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [activeIndex, value])

  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-fit max-w-full', className)}>
      <div
        ref={listRef}
        role='tablist'
        className={cn(
          'bg-muted relative inline-flex max-w-full items-center overflow-x-auto',
          fullWidth ? 'w-full' : 'w-max max-w-full',
          styles.list,
          listClassName
        )}
      >
        <span
          aria-hidden
          className={cn(
            'bg-primary absolute rounded-full',
            styles.indicatorInset,
            ready && 'transition-all duration-300 ease-out'
          )}
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: ready && indicator.width > 0 ? 1 : 0,
          }}
        />
        {items.map((item, index) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              ref={(node) => {
                buttonRefs.current[index] = node
              }}
              type='button'
              role='tab'
              aria-selected={selected}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && item.value !== value) {
                  onValueChange(item.value)
                }
              }}
              className={cn(
                'relative z-10 inline-flex items-center justify-center transition-colors',
                styles.trigger,
                fullWidth && 'min-w-0 flex-1',
                selected
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                item.disabled && 'pointer-events-none opacity-50',
                triggerClassName
              )}
            >
              {item.label}
              {item.badge != null ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold',
                    selected
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/20 text-primary'
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const FolderTabs = ({
  value,
  onValueChange,
  items,
  size,
  fullWidth,
  className,
  listClassName,
  triggerClassName,
}: Omit<AnimatedTabsProps, 'variant'> & { size: AnimatedTabsSize }) => {
  const styles = folderSizeStyles[size]

  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-fit', className)}>
      <div
        role='tablist'
        className={cn(
          'bg-muted relative inline-flex items-end overflow-visible',
          fullWidth ? 'w-full' : 'w-fit',
          styles.list,
          listClassName
        )}
      >
        {items.map((item) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              type='button'
              role='tab'
              aria-selected={selected}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && item.value !== value) {
                  onValueChange(item.value)
                }
              }}
              className={cn(
                'animated-tabs-folder-trigger relative z-10 inline-flex shrink-0 items-center justify-center transition-colors',
                styles.trigger,
                selected
                  ? 'animated-tabs-folder-trigger--active bg-card text-slate-900'
                  : 'text-muted-foreground hover:text-foreground',
                item.disabled && 'pointer-events-none opacity-50',
                triggerClassName
              )}
            >
              <span className='relative inline-flex flex-col items-center gap-1'>
                {item.badge != null ? (
                  <span className='animated-tabs-folder-badge absolute -top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white shadow-sm'>
                    {item.badge}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'font-medium',
                    selected && 'font-semibold text-foreground'
                  )}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'rounded-full transition-all duration-200',
                    styles.underline,
                    selected
                      ? 'bg-amber-400 opacity-100'
                      : 'bg-transparent opacity-0'
                  )}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const AnimatedTabs = ({
  value,
  onValueChange,
  items,
  variant,
  size = 'md',
  fullWidth = false,
  className,
  listClassName,
  triggerClassName,
}: AnimatedTabsProps) => {
  /** 模块仅两个 Tab 时默认凹槽页签；可显式传 variant 覆盖 */
  const resolvedVariant: AnimatedTabsVariant =
    variant ?? (items.length === 2 ? 'folder' : 'pill')

  if (resolvedVariant === 'folder') {
    return (
      <FolderTabs
        value={value}
        onValueChange={onValueChange}
        items={items}
        size={size}
        fullWidth={fullWidth}
        className={className}
        listClassName={listClassName}
        triggerClassName={triggerClassName}
      />
    )
  }

  return (
    <PillTabs
      value={value}
      onValueChange={onValueChange}
      items={items}
      size={size}
      fullWidth={fullWidth}
      className={className}
      listClassName={listClassName}
      triggerClassName={triggerClassName}
    />
  )
}
