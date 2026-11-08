import { useCallback, useMemo, useState } from 'react'

export type DeferredSearchState<T extends object> = {
  /** 输入中的草稿条件，变更不会触发请求 */
  draft: T
  /** 已提交、用于请求的条件 */
  applied: T
  setDraft: (updater: T | ((prev: T) => T)) => void
  /** 将草稿提交为已应用条件；可选对 keyword 字段做 trim */
  submit: () => T
  /** 重置草稿与已应用条件 */
  reset: (next?: T) => void
  /** 是否存在已提交的非空条件（用于显示清除） */
  hasAppliedFilters: boolean
}

type UseDeferredSearchOptions<T extends object> = {
  /** 提交时需要 trim 的字符串字段，默认尝试处理 `keyword` */
  trimKeys?: (keyof T)[]
  /** 判断是否显示「清除」；默认：任一字符串字段非空且非 all */
  isActive?: (applied: T) => boolean
}

function defaultIsActive<T extends object>(applied: T) {
  return Object.entries(applied as Record<string, unknown>).some(
    ([key, value]) => {
      if (typeof value !== 'string') return false
      const trimmed = value.trim()
      if (!trimmed) return false
      if (key.toLowerCase().includes('type') || key === 'status') {
        return trimmed !== 'all'
      }
      return true
    }
  )
}

/** 多条件搜索：草稿与已提交条件分离，仅 submit/reset 时同步。 */
export function useDeferredSearch<T extends object>(
  initial: T,
  options: UseDeferredSearchOptions<T> = {}
): DeferredSearchState<T> {
  const trimKeys = useMemo(() => {
    if (options.trimKeys) return options.trimKeys
    return 'keyword' in initial ? (['keyword'] as (keyof T)[]) : []
  }, [initial, options.trimKeys])
  const isActive = options.isActive ?? defaultIsActive

  const [draft, setDraftState] = useState(initial)
  const [applied, setApplied] = useState(initial)

  const setDraft = useCallback((updater: T | ((prev: T) => T)) => {
    setDraftState((prev) =>
      typeof updater === 'function'
        ? (updater as (prev: T) => T)(prev)
        : updater
    )
  }, [])

  const submit = useCallback(() => {
    const next = { ...draft }
    for (const key of trimKeys) {
      const value = next[key]
      if (typeof value === 'string') {
        next[key] = value.trim() as T[keyof T]
      }
    }
    setDraftState(next)
    setApplied(next)
    return next
  }, [draft, trimKeys])

  const reset = useCallback(
    (next: T = initial) => {
      setDraftState(next)
      setApplied(next)
    },
    [initial]
  )

  return {
    draft,
    applied,
    setDraft,
    submit,
    reset,
    hasAppliedFilters: isActive(applied),
  }
}
