import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Check, ChevronDown, X } from 'lucide-react'
import { DatePicker } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/utils/utils'
import {
  resolveTimeRangeBounds,
  type TimeRangeFilter,
  type TimeRangePreset,
} from '@/utils/timeRangeFilter'
import type { AssetViewFilter } from '../types/assetViewFilter'
import { AssetViewScopeControl } from './AssetViewScopeControl'

export type AssetTimePreset = TimeRangePreset
export type AssetSortOrder = 'newest' | 'oldest'
/** @deprecated 请使用 AssetViewFilter */
export type AssetSubmitterFilter = 'all' | 'self'
export type AssetStatusFilter =
  | 'all'
  | 'succeeded'
  | 'running'
  | 'queued'
  | 'draft'
  | 'failed'

export type AssetTimeRange = TimeRangeFilter

/** @deprecated 请使用 `@/utils/timeRangeFilter` 的 resolveTimeRangeBounds */
export function resolveAssetTimeBounds(
  range: AssetTimeRange,
  nowMs = Date.now()
) {
  return resolveTimeRangeBounds(range, nowMs)
}

const TIME_PRESETS: Array<{ key: Exclude<AssetTimePreset, 'custom'>; label: string }> =
  [
    { key: 'all', label: '全部' },
    { key: 'week', label: '过去一周' },
    { key: 'month', label: '过去一个月' },
    { key: 'quarter', label: '过去三个月' },
  ]

const STATUS_OPTIONS: Array<{ key: AssetStatusFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'succeeded', label: '已完成' },
  { key: 'running', label: '渲染中' },
  { key: 'queued', label: '生成中' },
  { key: 'draft', label: '草稿' },
  { key: 'failed', label: '失败' },
]

const SORT_OPTIONS: Array<{ key: AssetSortOrder; label: string }> = [
  { key: 'newest', label: '近-远' },
  { key: 'oldest', label: '远-近' },
]

type AssetFilterBarProps = {
  status: AssetStatusFilter
  onStatusChange: (next: AssetStatusFilter) => void
  timeRange: AssetTimeRange
  onTimeRangeChange: (next: AssetTimeRange) => void
  sortOrder: AssetSortOrder
  onSortOrderChange: (next: AssetSortOrder) => void
  onEnterBatchMode: () => void
  /** 企业员工可见：范围筛选（所有 / 自己 / 分组 / 人员） */
  showViewScope?: boolean
  viewFilter?: AssetViewFilter
  onViewFilterChange?: (next: AssetViewFilter) => void
}

function formatShortDate(date: Date) {
  return format(date, 'yy-MM-dd')
}

function isTimeFiltered(range: AssetTimeRange) {
  if (range.preset === 'all') return false
  if (range.preset === 'custom') {
    return Boolean(range.startDate || range.endDate)
  }
  return true
}

export const AssetFilterBar = ({
  status,
  onStatusChange,
  timeRange,
  onTimeRangeChange,
  sortOrder,
  onSortOrderChange,
  onEnterBatchMode,
  showViewScope = false,
  viewFilter,
  onViewFilterChange,
}: AssetFilterBarProps) => {
  const [timeOpen, setTimeOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const timeFiltered = isTimeFiltered(timeRange)
  const timeLabel = timeFiltered
    ? timeRange.preset === 'custom'
      ? [
          timeRange.startDate ? formatShortDate(timeRange.startDate) : '开始',
          timeRange.endDate ? formatShortDate(timeRange.endDate) : '结束',
        ].join(' ~ ')
      : (TIME_PRESETS.find((item) => item.key === timeRange.preset)?.label ?? '')
    : ''

  const statusFiltered = status !== 'all'
  const statusLabel = statusFiltered
    ? (STATUS_OPTIONS.find((item) => item.key === status)?.label ?? '')
    : ''

  const sortFiltered = sortOrder !== 'newest'
  const sortLabel = sortFiltered
    ? (SORT_OPTIONS.find((item) => item.key === sortOrder)?.label ?? '')
    : ''

  const clearTime = () =>
    onTimeRangeChange({
      preset: 'all',
      startDate: undefined,
      endDate: undefined,
    })

  const handleTimePresetChange = (key: Exclude<AssetTimePreset, 'custom'>) => {
    onTimeRangeChange({
      preset: key,
      startDate: undefined,
      endDate: undefined,
    })
    setTimeOpen(false)
  }

  const handleStatusChange = (next: AssetStatusFilter) => {
    onStatusChange(next)
    setStatusOpen(false)
  }

  const handleSortChange = (next: AssetSortOrder) => {
    onSortOrderChange(next)
    setSortOpen(false)
  }

  return (
    <div className='flex flex-wrap items-stretch gap-3'>
      <div className='bg-card flex min-w-0 flex-1 flex-wrap items-center gap-0 overflow-hidden rounded-lg border px-1 py-1 shadow-xs'>
        <FilterSegment>
          {timeFiltered ? (
            <ActiveChip
              label={timeLabel}
              onClear={clearTime}
              trigger={
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type='button'
                      className='min-w-0 truncate outline-none'
                    >
                      {timeLabel}
                    </button>
                  </PopoverTrigger>
                  <TimePopoverContent
                    timeRange={timeRange}
                    onTimeRangeChange={onTimeRangeChange}
                    onPresetChange={handleTimePresetChange}
                  />
                </Popover>
              }
            />
          ) : (
            <Popover open={timeOpen} onOpenChange={setTimeOpen}>
              <PopoverTrigger asChild>
                <IdleTrigger label='时间' />
              </PopoverTrigger>
              <TimePopoverContent
                timeRange={timeRange}
                onTimeRangeChange={onTimeRangeChange}
                onPresetChange={handleTimePresetChange}
              />
            </Popover>
          )}
        </FilterSegment>

        {showViewScope && viewFilter && onViewFilterChange ? (
          <>
            <Divider />
            <FilterSegment>
              <AssetViewScopeControl
                value={viewFilter}
                onChange={onViewFilterChange}
              />
            </FilterSegment>
          </>
        ) : null}

        <Divider />

        <FilterSegment>
          {statusFiltered ? (
            <ActiveChip
              label={statusLabel}
              onClear={() => onStatusChange('all')}
              trigger={
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type='button'
                      className='min-w-0 truncate outline-none'
                    >
                      {statusLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align='start' className='w-44 p-1.5'>
                    <OptionList
                      options={STATUS_OPTIONS}
                      value={status}
                      onChange={handleStatusChange}
                    />
                  </PopoverContent>
                </Popover>
              }
            />
          ) : (
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <IdleTrigger label='状态' />
              </PopoverTrigger>
              <PopoverContent align='start' className='w-44 p-1.5'>
                <OptionList
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={handleStatusChange}
                />
              </PopoverContent>
            </Popover>
          )}
        </FilterSegment>

        <Divider />

        <FilterSegment>
          {sortFiltered ? (
            <ActiveChip
              label={sortLabel}
              onClear={() => onSortOrderChange('newest')}
              trigger={
                <Popover open={sortOpen} onOpenChange={setSortOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type='button'
                      className='min-w-0 truncate outline-none'
                    >
                      {sortLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align='start' className='w-40 space-y-1 p-1.5'>
                    <p className='text-muted-foreground px-2.5 py-1 text-xs'>
                      顺序
                    </p>
                    <OptionList
                      options={SORT_OPTIONS}
                      value={sortOrder}
                      onChange={handleSortChange}
                    />
                  </PopoverContent>
                </Popover>
              }
            />
          ) : (
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <IdleTrigger label='排序' />
              </PopoverTrigger>
              <PopoverContent align='start' className='w-40 space-y-1 p-1.5'>
                <p className='text-muted-foreground px-2.5 py-1 text-xs'>顺序</p>
                <OptionList
                  options={SORT_OPTIONS}
                  value={sortOrder}
                  onChange={handleSortChange}
                />
              </PopoverContent>
            </Popover>
          )}
        </FilterSegment>
      </div>

      <Button
        type='button'
        variant='secondary'
        size='sm'
        className='bg-card hover:bg-muted !h-auto min-h-0 shrink-0 self-stretch rounded-lg border px-3.5 text-xs font-medium shadow-xs'
        onClick={onEnterBatchMode}
      >
        批量操作
      </Button>
    </div>
  )
}

const FilterSegment = ({ children }: { children: ReactNode }) => (
  <div className='flex min-w-0 items-center px-1'>{children}</div>
)

const Divider = () => (
  <span className='bg-border mx-0.5 hidden h-5 w-px shrink-0 sm:block' />
)

const IdleTrigger = ({
  label,
  className,
  ...props
}: React.ComponentProps<'button'> & { label: string }) => (
  <button
    type='button'
    className={cn(
      'text-foreground hover:bg-muted/70 inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors',
      className
    )}
    {...props}
  >
    {label}
    <ChevronDown className='text-muted-foreground size-3.5' />
  </button>
)

const ActiveChip = ({
  label,
  onClear,
  trigger,
}: {
  label: string
  onClear: () => void
  trigger: ReactNode
}) => (
  <span className='bg-primary/10 text-primary inline-flex h-8 max-w-48 items-center gap-1 rounded-md py-0.5 ps-2.5 pe-1 text-sm font-medium'>
    {trigger}
    <button
      type='button'
      aria-label={`清除 ${label}`}
      className='bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-5 shrink-0 items-center justify-center rounded-full'
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClear()
      }}
    >
      <X className='size-3' strokeWidth={2.5} />
    </button>
  </span>
)

const TimePopoverContent = ({
  timeRange,
  onTimeRangeChange,
  onPresetChange,
}: {
  timeRange: AssetTimeRange
  onTimeRangeChange: (next: AssetTimeRange) => void
  onPresetChange: (key: Exclude<AssetTimePreset, 'custom'>) => void
}) => (
  <PopoverContent align='start' className='w-80 space-y-3 p-3'>
    <div className='grid grid-cols-2 gap-2'>
      <DatePicker
        placeholder='开始日期'
        selected={timeRange.startDate}
        displayFormat='yy-MM-dd'
        className={cn(
          'h-9 w-full justify-between px-2.5 text-xs font-normal',
          !timeRange.startDate && 'text-muted-foreground'
        )}
        onSelect={(date) =>
          onTimeRangeChange({
            preset: 'custom',
            startDate: date,
            endDate: timeRange.endDate,
          })
        }
      />
      <DatePicker
        placeholder='结束日期'
        selected={timeRange.endDate}
        displayFormat='yy-MM-dd'
        className={cn(
          'h-9 w-full justify-between px-2.5 text-xs font-normal',
          !timeRange.endDate && 'text-muted-foreground'
        )}
        onSelect={(date) =>
          onTimeRangeChange({
            preset: 'custom',
            startDate: timeRange.startDate,
            endDate: date,
          })
        }
      />
    </div>
    <OptionList
      options={TIME_PRESETS}
      value={timeRange.preset}
      onChange={onPresetChange}
    />
  </PopoverContent>
)

type OptionListProps<T extends string> = {
  options: Array<{ key: T; label: string }>
  value: string
  onChange: (next: T) => void
}

const OptionList = <T extends string>({
  options,
  value,
  onChange,
}: OptionListProps<T>) => {
  return (
    <div className='space-y-0.5'>
      {options.map((option) => {
        const active = value === option.key
        return (
          <button
            key={option.key}
            type='button'
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-foreground hover:bg-muted/70'
            )}
            onClick={() => onChange(option.key)}
          >
            {option.label}
            {active ? <Check className='size-4' /> : null}
          </button>
        )
      })}
    </div>
  )
}
