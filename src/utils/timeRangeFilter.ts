/** 通用时间筛选预设（资产列表、管理后台列表等共用）。 */
export type TimeRangePreset = 'all' | 'week' | 'month' | 'quarter' | 'custom'

export type TimeRangeFilter = {
  preset: TimeRangePreset
  startDate?: Date
  endDate?: Date
}

export const TIME_RANGE_PRESETS: Array<{
  key: Exclude<TimeRangePreset, 'custom'>
  label: string
}> = [
  { key: 'all', label: '全部时间' },
  { key: 'week', label: '过去一周' },
  { key: 'month', label: '过去一个月' },
  { key: 'quarter', label: '过去三个月' },
]

function formatShortDate(date: Date) {
  const y = String(date.getFullYear()).slice(-2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 筛选触发器上的时间文案；未筛选时返回空字符串。 */
export function formatTimeRangeLabel(range: TimeRangeFilter): string {
  if (range.preset === 'all') return ''
  if (range.preset === 'custom') {
    if (!range.startDate && !range.endDate) return ''
    return [
      range.startDate ? formatShortDate(range.startDate) : '开始',
      range.endDate ? formatShortDate(range.endDate) : '结束',
    ].join(' ~ ')
  }
  return TIME_RANGE_PRESETS.find((item) => item.key === range.preset)?.label ?? ''
}

/** 根据时间筛选配置，得到 [startSec, endSec]（含端点整天）；null 表示不限 */
export function resolveTimeRangeBounds(
  range: TimeRangeFilter,
  nowMs = Date.now()
): { startSec: number; endSec: number } | null {
  const endOfDay = (date: Date) => {
    const copy = new Date(date)
    copy.setHours(23, 59, 59, 999)
    return copy
  }
  const startOfDay = (date: Date) => {
    const copy = new Date(date)
    copy.setHours(0, 0, 0, 0)
    return copy
  }

  if (range.preset === 'all') return null

  if (range.preset === 'custom') {
    if (!range.startDate && !range.endDate) return null
    const start = range.startDate
      ? startOfDay(range.startDate)
      : new Date('1900-01-01')
    const end = range.endDate ? endOfDay(range.endDate) : endOfDay(new Date(nowMs))
    return {
      startSec: Math.floor(start.getTime() / 1000),
      endSec: Math.floor(end.getTime() / 1000),
    }
  }

  const end = endOfDay(new Date(nowMs))
  const start = startOfDay(new Date(nowMs))
  if (range.preset === 'week') start.setDate(start.getDate() - 7)
  if (range.preset === 'month') start.setMonth(start.getMonth() - 1)
  if (range.preset === 'quarter') start.setMonth(start.getMonth() - 3)

  return {
    startSec: Math.floor(start.getTime() / 1000),
    endSec: Math.floor(end.getTime() / 1000),
  }
}
