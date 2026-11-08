import {
  extractCreativeFileKey,
  presignCreativeAssets,
} from '@/services/api/creativeApi'

type PresignWaiter = {
  url: string
  fileKey: string
  resolve: (nextUrl: string) => void
  reject: (error: Error) => void
}

const waiters: PresignWaiter[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPresignQueue()
  }, 80)
}

async function flushPresignQueue() {
  if (waiters.length === 0) return
  const batch = waiters.splice(0, waiters.length)
  const file_keys = Array.from(
    new Set(batch.map((item) => item.fileKey).filter(Boolean))
  )
  const urls = Array.from(
    new Set(batch.map((item) => item.url).filter(Boolean))
  )

  try {
    const items = await presignCreativeAssets({ file_keys, urls })
    const byKey = new Map<string, string>()

    items.forEach((item, index) => {
      const key =
        item.file_key ||
        file_keys[index] ||
        extractCreativeFileKey(urls[index] || item.url)
      if (key && item.url) {
        byKey.set(key, item.url)
        const base = key.split('/').pop()
        if (base) byKey.set(base, item.url)
      }
      // 同序映射：请求 urls[i] → 返回 items[i]
      if (urls[index] && item.url) {
        byKey.set(urls[index], item.url)
        byKey.set(extractCreativeFileKey(urls[index]), item.url)
      }
      if (file_keys[index] && item.url) {
        byKey.set(file_keys[index], item.url)
      }
      if (item.url) {
        byKey.set(extractCreativeFileKey(item.url), item.url)
      }
    })

    for (const waiter of batch) {
      const base = waiter.fileKey.split('/').pop() || ''
      const next =
        (waiter.fileKey && byKey.get(waiter.fileKey)) ||
        byKey.get(waiter.url) ||
        byKey.get(extractCreativeFileKey(waiter.url)) ||
        (base ? byKey.get(base) : undefined)

      if (next) waiter.resolve(next)
      else waiter.reject(new Error('换签结果中未找到对应链接'))
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('素材链接换签失败')
    for (const waiter of batch) waiter.reject(err)
  }
}

/**
 * 图片加载失败时请求换签；短时间内多次失败会合并为一次批量 presign。
 */
export function requestCreativeUrlPresign(
  url: string,
  fileKey?: string
): Promise<string> {
  const key = extractCreativeFileKey(fileKey || url)
  if (!url && !key) {
    return Promise.reject(new Error('缺少可换签的素材地址'))
  }

  return new Promise((resolve, reject) => {
    waiters.push({
      url,
      fileKey: key,
      resolve,
      reject,
    })
    scheduleFlush()
  })
}

/** 批量主动换签（不经过失败队列） */
export async function refreshCreativeUrls(input: {
  urls?: string[]
  file_keys?: string[]
}) {
  const items = await presignCreativeAssets(input)
  const map = new Map<string, string>()
  for (const item of items) {
    if (item.file_key) map.set(item.file_key, item.url)
    map.set(extractCreativeFileKey(item.url), item.url)
  }
  return { items, map }
}
