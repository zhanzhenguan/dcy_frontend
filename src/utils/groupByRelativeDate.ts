function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export type RelativeDateBucket =
  | 'today'
  | 'yesterday'
  | 'dayBeforeYesterday'
  | 'earlier'

export type RelativeDateGroup<T> = {
  key: string
  bucket: RelativeDateBucket
  label: string
  items: T[]
}

/**
 * 按本地日历日分组：今天 / 昨天 / 前天 / 其它（按具体日期）。
 * 组内保持传入顺序；组间按日期从新到旧。
 */
export function groupByRelativeDate<T>(
  items: T[],
  getUnixSeconds: (item: T) => number,
  nowMs = Date.now(),
  order: 'desc' | 'asc' = 'desc'
): RelativeDateGroup<T>[] {
  const now = new Date(nowMs)
  const todayStart = startOfLocalDay(now).getTime()
  const buckets = new Map<string, RelativeDateGroup<T>>()

  for (const item of items) {
    const unix = getUnixSeconds(item)
    if (!unix) continue
    const date = new Date(unix * 1000)
    if (Number.isNaN(date.getTime())) continue

    const dayStart = startOfLocalDay(date).getTime()
    const dayDiff = Math.floor((todayStart - dayStart) / 86400000)
    let bucket: RelativeDateBucket
    let label: string
    let key: string

    if (dayDiff === 0) {
      bucket = 'today'
      label = '今天'
      key = 'today'
    } else if (dayDiff === 1) {
      bucket = 'yesterday'
      label = '昨天'
      key = 'yesterday'
    } else if (dayDiff === 2) {
      bucket = 'dayBeforeYesterday'
      label = '前天'
      key = 'day-before-yesterday'
    } else {
      bucket = 'earlier'
      const y = date.getFullYear()
      const m = pad2(date.getMonth() + 1)
      const d = pad2(date.getDate())
      key = `day-${y}-${m}-${d}`
      // 今年：月/日；非今年：年/月/日
      label =
        y === now.getFullYear()
          ? `${m}/${d}`
          : `${y}/${m}/${d}`
    }

    const group = buckets.get(key)
    if (group) {
      group.items.push(item)
    } else {
      buckets.set(key, { key, bucket, label, items: [item] })
    }
  }

  const groups = Array.from(buckets.values()).sort((a, b) => {
    const aTime = getUnixSeconds(a.items[0]!) * 1000
    const bTime = getUnixSeconds(b.items[0]!) * 1000
    return order === 'asc' ? aTime - bTime : bTime - aTime
  })

  if (order === 'asc') {
    for (const group of groups) {
      group.items = [...group.items].sort(
        (a, b) => getUnixSeconds(a) - getUnixSeconds(b)
      )
    }
  }

  return groups
}
