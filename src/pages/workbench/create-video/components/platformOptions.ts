/**
 * 创建视频第 3 步"投放平台"的可选项配置。
 * 单独抽出工具函数 `normalizePlatforms`，避免与 `VideoConfigPanel`
 * 组件文件耦合触发 react-refresh 警告。
 */

export type PlatformOption = {
  id: string
  name: string
}

export const platformOptions: PlatformOption[] = [
  { id: 'tiktok', name: 'TikTok' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'shopify', name: 'Shopify' },
]

/**
 * 归一化草稿中读取到的 platform 字段。
 * 兼容旧版单字符串（string）与多选数组（string[]）以及缺失值。
 */
export function normalizePlatforms(
  value: string | string[] | null | undefined
): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.length > 0)
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  return []
}
