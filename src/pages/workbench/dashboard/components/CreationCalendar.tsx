import { Fragment, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardCalendar } from '@/services/api/dashboardApi'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 五档颜色：0 为空，其余按当日计数相对最大值分档 */
const LEVEL_CLASSES = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
]

const LEVEL_LEGEND = ['无', '少', '中', '多', '最多']

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

type CalendarCell = { date: string; count: number }

type HeatmapCell = CalendarCell & { level: number }

type CreationCalendarProps = {
  days?: number
}

/**
 * 创作日历：按周排列的方格热力图，颜色深浅表示当日视频生成量。
 */
export const CreationCalendar = ({ days = 30 }: CreationCalendarProps) => {
  const tenantPublicId = useAuthStore(
    (state) => state.auth.session?.tenant?.public_id
  )
  const calendarQuery = useQuery({
    queryKey: ['dashboard', 'calendar', tenantPublicId, days],
    queryFn: () => getDashboardCalendar(days),
  })

  const items = calendarQuery.data?.items ?? []
  const totalCount = items.reduce((sum, item) => sum + item.count, 0)
  const activeDays = items.filter((item) => item.count > 0).length

  const { weeks, monthMarkers } = useMemo(
    () => buildHeatmapWeeks(items),
    [items]
  )
  const today = formatLocalDate(new Date())
  const weekCount = weeks.length

  return (
    <article className='bg-card rounded-2xl border p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h2 className='text-base font-semibold'>创作日历</h2>
          <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
            近 {days} 天共生成{' '}
            <span className='text-foreground font-medium tabular-nums'>
              {totalCount}
            </span>{' '}
            个视频，活跃{' '}
            <span className='text-foreground font-medium tabular-nums'>
              {activeDays}
            </span>{' '}
            天
          </p>
        </div>
        {calendarQuery.isFetching ? (
          <span className='text-muted-foreground shrink-0 text-xs'>刷新中…</span>
        ) : null}
      </div>

      {calendarQuery.isLoading ? (
        <Skeleton className='mt-5 h-[168px] w-full rounded-lg' />
      ) : (
        <TooltipProvider delayDuration={100}>
          <div className='mt-5 w-full min-w-0'>
            {weekCount > 0 ? (
              <div
                className='relative mb-1.5 h-3.5 ms-8'
                aria-hidden='true'
              >
                {monthMarkers.map(({ weekIndex, label }) => (
                  <span
                    key={`${label}-${weekIndex}`}
                    className='text-muted-foreground absolute top-0 text-[10px] leading-none whitespace-nowrap sm:text-[11px]'
                    style={{
                      left: `${(weekIndex / weekCount) * 100}%`,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <div
              className='grid w-full min-h-[148px] gap-1.5'
              style={{
                gridTemplateColumns: `2rem repeat(${weekCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(7, minmax(14px, 1fr))`,
              }}
            >
              {WEEKDAY_LABELS.map((label, dayIndex) => (
                <Fragment key={label}>
                  <div
                    className='text-muted-foreground flex items-center justify-end pe-1 text-[10px] leading-none sm:text-[11px]'
                  >
                    {dayIndex % 2 === 0 ? label : ''}
                  </div>
                  {weeks.map((week, weekIndex) => {
                    const cell = week[dayIndex]
                    if (!cell) {
                      return <div key={`empty-${weekIndex}-${dayIndex}`} />
                    }
                    return (
                      <HeatmapDayCell
                        key={cell.date}
                        cell={cell}
                        isTodayRing={cell.date === today && cell.level >= 0}
                      />
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}

      <div className='text-muted-foreground mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs'>
        <div className='flex items-center gap-1.5'>
          {LEVEL_CLASSES.map((levelClass, index) => (
            <div key={levelClass} className='flex items-center gap-1'>
              <span
                className={cn(
                  'size-3 rounded-[3px] sm:size-3.5',
                  levelClass
                )}
              />
              <span className='hidden sm:inline'>{LEVEL_LEGEND[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function HeatmapDayCell({
  cell,
  isTodayRing,
}: {
  cell: HeatmapCell
  isTodayRing: boolean
}) {
  const isBlank = cell.level < 0

  if (isBlank) {
    return <div className='aspect-square w-full min-w-[12px]' />
  }

  const dateLabel = formatCellDateLabel(cell.date)
  const cellClassName = cn(
    'aspect-square w-full min-w-[12px] rounded-[4px] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:rounded-[5px]',
    LEVEL_CLASSES[cell.level],
    isTodayRing && 'ring-primary ring-2 ring-offset-1 ring-offset-card'
  )

  if (cell.count === 0) {
    return (
      <button
        type='button'
        className={cellClassName}
        title={dateLabel}
        aria-label={dateLabel}
      />
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className={cellClassName}
          aria-label={formatCellAriaLabel(cell)}
        />
      </TooltipTrigger>
      <TooltipContent side='top' className='text-center'>
        <p className='font-medium'>{dateLabel}</p>
        <p className='text-background/80 mt-0.5'>
          生成 {cell.count} 个视频
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function formatCellDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  const weekday = WEEKDAY_LABELS[(date.getDay() + 6) % 7]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`
}

function formatCellAriaLabel(cell: HeatmapCell) {
  return `${formatCellDateLabel(cell.date)}，${
    cell.count > 0 ? `生成 ${cell.count} 个视频` : '未生成视频'
  }`
}

function buildHeatmapWeeks(items: CalendarCell[]) {
  const maxCount = Math.max(1, ...items.map((item) => item.count))

  const firstDate =
    items.length > 0 ? new Date(`${items[0].date}T00:00:00`) : null
  let leadingBlanks = 0
  if (firstDate && !Number.isNaN(firstDate.getTime())) {
    leadingBlanks = (firstDate.getDay() + 6) % 7
  }

  const cells: HeatmapCell[] = []
  for (let blank = 0; blank < leadingBlanks; blank += 1) {
    cells.push({ date: `blank-${blank}`, count: -1, level: -1 })
  }
  for (const item of items) {
    const ratio = item.count / maxCount
    let level = 0
    if (item.count > 0) {
      level = ratio > 0.6 ? 4 : ratio > 0.35 ? 3 : ratio > 0.15 ? 2 : 1
    }
    cells.push({ ...item, level })
  }

  const weeks: HeatmapCell[][] = []
  const monthMarkers: { weekIndex: number; label: string }[] = []
  let lastMonth = -1

  for (let index = 0; index < cells.length; index += 7) {
    const weekIndex = weeks.length
    const week = cells.slice(index, index + 7)
    weeks.push(week)

    const firstValid = week.find((cell) => cell.count >= 0)
    if (firstValid) {
      const month = Number(firstValid.date.slice(5, 7)) - 1
      if (month !== lastMonth) {
        monthMarkers.push({ weekIndex, label: MONTH_LABELS[month] })
        lastMonth = month
      }
    }
  }

  return { weeks, maxCount, monthMarkers }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
