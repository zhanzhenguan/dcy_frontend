import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { DatePicker } from '@/components/common/DatePicker'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/utils/utils'
import {
  TIME_RANGE_PRESETS,
  formatTimeRangeLabel,
  type TimeRangeFilter,
  type TimeRangePreset,
} from '@/utils/timeRangeFilter'

type TimeRangeFilterPopoverProps = {
  value: TimeRangeFilter
  onChange: (next: TimeRangeFilter) => void
  className?: string
  /** 未筛选时触发器文案 */
  idleLabel?: string
}

/** 时间筛选：触发器 + 弹层内「开始/结束区间」与快捷预设。 */
export const TimeRangeFilterPopover = ({
  value,
  onChange,
  className,
  idleLabel = '全部时间',
}: TimeRangeFilterPopoverProps) => {
  const [open, setOpen] = useState(false)
  const label = formatTimeRangeLabel(value) || idleLabel

  const handlePresetChange = (key: Exclude<TimeRangePreset, 'custom'>) => {
    onChange({
      preset: key,
      startDate: undefined,
      endDate: undefined,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className={cn(
            'h-9 min-w-36 justify-between gap-2 px-3 font-normal',
            !formatTimeRangeLabel(value) && 'text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>{label}</span>
          <ChevronDown className='text-muted-foreground size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-80 space-y-3 p-3'>
        <div className='grid grid-cols-2 gap-2'>
          <DatePicker
            placeholder='开始时间'
            selected={value.startDate}
            displayFormat='yy-MM-dd'
            className={cn(
              'h-9 w-full justify-between px-2.5 text-xs font-normal',
              !value.startDate && 'text-muted-foreground'
            )}
            onSelect={(date) =>
              onChange({
                preset: 'custom',
                startDate: date,
                endDate: value.endDate,
              })
            }
          />
          <DatePicker
            placeholder='结束时间'
            selected={value.endDate}
            displayFormat='yy-MM-dd'
            className={cn(
              'h-9 w-full justify-between px-2.5 text-xs font-normal',
              !value.endDate && 'text-muted-foreground'
            )}
            onSelect={(date) =>
              onChange({
                preset: 'custom',
                startDate: value.startDate,
                endDate: date,
              })
            }
          />
        </div>
        <div className='space-y-0.5'>
          {TIME_RANGE_PRESETS.map((option) => {
            const active = value.preset === option.key
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
                onClick={() => handlePresetChange(option.key)}
              >
                {option.label}
                {active ? <Check className='size-4' /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
