function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function formatClock(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function formatYearDateTime(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatClock(date)}`
}

/**
 * 相对当前时间的友好展示：
 * - 1 小时内：刚刚 / N 分钟前
 * - 昨天 / 前天：带「昨天」「前天」+ 时间
 * - 今年更早：月-日 + 时间
 * - 非今年：年-月-日 + 时间
 */
export function formatRelativeDateTime(
  date: Date,
  nowMs = Date.now()
): string {
  if (Number.isNaN(date.getTime())) return '-'

  const now = new Date(nowMs)
  const diffMs = now.getTime() - date.getTime()
  const oneHourMs = 60 * 60 * 1000
  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) /
      86400000
  )

  if (diffMs >= 0 && diffMs < oneHourMs && dayDiff === 0) {
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return '刚刚'
    return `${minutes}分钟前`
  }

  if (dayDiff === 1) return `昨天 ${formatClock(date)}`
  if (dayDiff === 2) return `前天 ${formatClock(date)}`

  if (date.getFullYear() !== now.getFullYear()) {
    return formatYearDateTime(date)
  }

  if (dayDiff === 0) {
    return formatClock(date)
  }

  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatClock(date)}`
}

/** Unix 秒时间戳 */
export function formatRelativeUnixTime(
  value: number | null | undefined,
  nowMs = Date.now()
): string {
  if (!value) return '-'
  return formatRelativeDateTime(new Date(value * 1000), nowMs)
}
