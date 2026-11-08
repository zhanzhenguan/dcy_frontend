import type { ReactNode } from 'react'
import { Clock, Focus, RectangleHorizontal, Sparkles } from 'lucide-react'
import { cn } from '@/utils/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type VideoOutputSettingsProps = {
  ratio: string
  resolution: string
  duration: number
  ratios: string[]
  resolutions: string[]
  durations: number[]
  onRatioChange: (value: string) => void
  onResolutionChange: (value: string) => void
  onDurationChange: (value: number) => void
  className?: string
}

/** 将接口分辨率映射为工具栏展示文案（如 4k → 2K） */
export function formatResolutionLabel(resolution: string) {
  const value = resolution.trim().toLowerCase()
  if (value === '4k' || value === '2160p') return '2K'
  if (value === '1440p' || value === '2k') return '2K'
  return value.toUpperCase()
}

/** 解析分辨率档位数值，用于从小到大排序 */
export function resolutionRank(value: string) {
  const v = value.trim().toLowerCase()
  if (v === '4k' || v === '2160p') return 2160
  if (v === '2k' || v === '1440p') return 1440
  const match = /^(\d+)\s*p$/.exec(v)
  if (match) return Number(match[1])
  return Number.MAX_SAFE_INTEGER
}

export function sortResolutionsAsc(values: string[]) {
  return [...values].sort(
    (a, b) => resolutionRank(a) - resolutionRank(b)
  )
}

function RatioGlyph({ ratio }: { ratio: string }) {
  const normalized = ratio.trim().toLowerCase()
  if (normalized === 'auto' || normalized === 'adaptive' || normalized === '自动') {
    return <Focus className='size-3.5' strokeWidth={1.75} />
  }

  const match = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(normalized)
  const width = match ? Number(match[1]) : 16
  const height = match ? Number(match[2]) : 9
  const max = 18
  const scale = max / Math.max(width, height)
  const boxWidth = Math.max(6, Math.round(width * scale))
  const boxHeight = Math.max(6, Math.round(height * scale))

  return (
    <span
      className='border-foreground/70 block rounded-[2px] border'
      style={{ width: boxWidth, height: boxHeight }}
      aria-hidden
    />
  )
}

function OptionChip({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs transition-colors',
        selected
          ? 'bg-background text-foreground font-medium shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

export const VideoOutputSettings = ({
  ratio,
  resolution,
  duration,
  ratios,
  resolutions,
  durations,
  onRatioChange,
  onResolutionChange,
  onDurationChange,
  className,
}: VideoOutputSettingsProps) => {
  const resolutionLabel = resolution
    ? formatResolutionLabel(resolution)
    : '清晰度'
  const durationLabel = duration ? `${duration}s` : '时长'
  const ratioLabel = ratio || '比例'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'border-border bg-muted/40 hover:bg-muted/70 inline-flex h-9 items-center gap-0 rounded-full border px-1 text-xs font-medium transition-colors',
            className
          )}
          aria-label='输出设置'
        >
          <span className='inline-flex items-center gap-1 px-2.5 py-1'>
            <Sparkles className='text-muted-foreground size-3.5 shrink-0' />
            <span>{resolutionLabel}</span>
          </span>
          <span className='bg-border h-3.5 w-px shrink-0' />
          <span className='inline-flex items-center gap-1 px-2.5 py-1'>
            <Clock className='text-muted-foreground size-3.5 shrink-0' />
            <span>{durationLabel}</span>
          </span>
          <span className='bg-border h-3.5 w-px shrink-0' />
          <span className='inline-flex items-center gap-1 px-2.5 py-1'>
            <RectangleHorizontal className='text-muted-foreground size-3.5 shrink-0' />
            <span>{ratioLabel}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={8}
        className='w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-lg'
      >
        <div className='space-y-3'>
          <section className='space-y-1.5'>
            <p className='text-muted-foreground text-xs'>比例</p>
            <div className='bg-muted/60 flex flex-wrap gap-1 rounded-xl p-1'>
              {ratios.map((item) => {
                const label =
                  item === 'adaptive' || item === 'auto' ? '自动' : item
                return (
                  <OptionChip
                    key={item}
                    selected={ratio === item}
                    onClick={() => onRatioChange(item)}
                    className='min-w-[3.25rem] flex-col gap-1 px-2 py-2'
                  >
                    <RatioGlyph ratio={item} />
                    <span>{label}</span>
                  </OptionChip>
                )
              })}
            </div>
          </section>

          <section className='space-y-1.5'>
            <p className='text-muted-foreground text-xs'>分辨率</p>
            <div className='bg-muted/60 flex flex-wrap gap-1 rounded-xl p-1'>
              {resolutions.map((item) => (
                <OptionChip
                  key={item}
                  selected={resolution.toLowerCase() === item.toLowerCase()}
                  onClick={() => onResolutionChange(item)}
                  className='min-w-[4.5rem] flex-1'
                >
                  {formatResolutionLabel(item)}
                </OptionChip>
              ))}
            </div>
          </section>

          <section className='space-y-1.5'>
            <p className='text-muted-foreground text-xs'>时长</p>
            <div className='bg-muted/60 grid grid-cols-6 gap-1 rounded-xl p-1'>
              {durations.map((seconds) => (
                <OptionChip
                  key={seconds}
                  selected={duration === seconds}
                  onClick={() => onDurationChange(seconds)}
                  className='w-full px-1'
                >
                  {seconds}s
                </OptionChip>
              ))}
            </div>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  )
}
