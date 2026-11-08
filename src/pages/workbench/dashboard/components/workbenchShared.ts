export function formatAssetBytes(size: number) {
  if (size <= 0) return '0 MB'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function formatPlanLabel(plan: string) {
  const normalized = plan.trim().toLowerCase()
  if (normalized.includes('pro') || normalized.includes('专业')) return '专业版'
  if (normalized.includes('basic') || normalized.includes('基础')) return '基础版'
  if (normalized.includes('enterprise') || normalized.includes('企业'))
    return '企业版'
  if (normalized.includes('free') || normalized.includes('免费')) return '免费版'
  return plan
}

export function subscriptionExpireLabel(expiresAt?: string) {
  if (expiresAt?.trim()) {
    const date = new Date(expiresAt)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10)
    }
  }
  return '—'
}

export function formatRelativeTime(timestamp: number) {
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `今天 ${new Date(ms).toTimeString().slice(0, 5)}`
  if (hours < 48) return `昨天 ${new Date(ms).toTimeString().slice(0, 5)}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(ms).toLocaleDateString('zh-CN')
}

export function buildMonthCalendar(monthOffset: number) {
  const now = new Date()
  const cursor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // 设计稿按周日开头
  const firstWeekday = cursor.getDay()
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return {
    monthLabel: `${month + 1}月`,
    yearMonthLabel: `${year}年 ${month + 1}月`,
    today: now.getDate(),
    cells,
  }
}

/** 个人工作台月历占位标记 */
export const personalCalendarMarks: Record<number, true> = {
  2: true,
  5: true,
  8: true,
  11: true,
  14: true,
  17: true,
  19: true,
  22: true,
  24: true,
  26: true,
  29: true,
}

export const personalWeekTrend = [
  { date: '一', count: 4 },
  { date: '二', count: 6 },
  { date: '三', count: 3 },
  { date: '四', count: 8 },
  { date: '五', count: 5 },
  { date: '六', count: 2 },
  { date: '日', count: 4 },
]
