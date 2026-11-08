/** 张数/大小：未配置用 fallback；0=不限 */
export function resolveCountOrSizeBound(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return Number.POSITIVE_INFINITY
  if (value === 0) return Number.POSITIVE_INFINITY
  return value > 0 ? value : Number.POSITIVE_INFINITY
}

/** 时长下限：未配置用 fallback；0=不限制（按 0 秒） */
export function resolveDurationMinBound(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  if (value === 0) return 0
  return value > 0 ? value : 0
}

/** 时长上限：未配置用 fallback；0=不限 */
export function resolveDurationMaxBound(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return Number.POSITIVE_INFINITY
  if (value === 0) return Number.POSITIVE_INFINITY
  return value > 0 ? value : Number.POSITIVE_INFINITY
}

/** 合计上限：0 或未配置 = 与单段上限相同 */
export function resolveTotalDurationBound(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return Number.POSITIVE_INFINITY
  }
  return value > 0 ? value : Number.POSITIVE_INFINITY
}

export function formatLimit(value: number, suffix = ''): string {
  if (!Number.isFinite(value)) return '不限'
  return `${value}${suffix}`
}
