export type AccountStatusTag = {
  id: string
  label: string
  /** 预设色 Tailwind class；自定义色时为空字符串 */
  className: string
  /** 自定义色 #RRGGBB（大写）；有值时优先于 className */
  colorHex?: string
}

export type ManagedAccount = {
  id: string
  name: string
  avatarUrl?: string
  region: string
  platform: string
  accountType: string
  email: string
  password: string
  /** 2FA 密钥 */
  twoFactorSecret: string
  followers: number
  deviceSerial: string
  networkIp: string
  nodeName: string
  /** 节点链接；上传二维码时由服务端解析写入，前端据此生成二维码 */
  nodeLink: string
  /** @deprecated 历史字段：旧数据可能仍存原图地址；新流程请使用 nodeLink */
  nodeQrUrl?: string
  /** 网络节点续费到期日（YYYY-MM-DD） */
  nodeExpiresAt?: string
  /** 状态标签 id 列表（可多选） */
  statuses: string[]
  tags: string[]
  remark?: string
  storeLinked: boolean
  /** 账号归属用户 public_id；self 表示当前登录用户 */
  ownerUserId: string
}

export type AccountScopeKind = 'personal' | 'enterprise' | 'group' | 'member'

export type AccountScopeSelection = {
  kind: AccountScopeKind
  label: string
  groupPublicId?: string
  /** 查看某成员时 */
  userPublicId?: string
  memberPublicId?: string
}

export const statusTagColorPresets = [
  {
    id: 'emerald',
    label: '绿色',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'amber',
    label: '黄色',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  {
    id: 'orange',
    label: '橙色',
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  },
  {
    id: 'red',
    label: '红色',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  {
    id: 'blue',
    label: '蓝色',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  },
  {
    id: 'violet',
    label: '紫色',
    className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
  {
    id: 'slate',
    label: '灰色',
    className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  },
] as const

const HEX_COLOR_KEY_RE = /^#[0-9A-Fa-f]{6}$/

export function isHexColorKey(value: string) {
  return HEX_COLOR_KEY_RE.test(value)
}

export function normalizeHexColor(value: string) {
  return value.toUpperCase()
}

export function hexWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Badge / 色块的 className + style（自定义色用内联样式） */
export function getStatusTagToneProps(
  tag: Pick<AccountStatusTag, 'className' | 'colorHex'>
): { className?: string; style?: { backgroundColor: string; color: string } } {
  if (tag.colorHex) {
    return {
      style: {
        backgroundColor: hexWithAlpha(tag.colorHex, 0.15),
        color: tag.colorHex,
      },
    }
  }
  return { className: tag.className }
}

export function resolveAccountStatusTags(
  statusIds: string[],
  tags: AccountStatusTag[]
) {
  const map = new Map(tags.map((tag) => [tag.id, tag]))
  return statusIds
    .map((id) => map.get(id))
    .filter((tag): tag is AccountStatusTag => Boolean(tag))
}

/** 粉丝量缩写：K=千 · M=百萬 · B=十億 · T=萬億 */
const FOLLOWERS_T = 1_000_000_000_000
const FOLLOWERS_B = 1_000_000_000
const FOLLOWERS_M = 1_000_000
const FOLLOWERS_K = 1_000

const FOLLOWER_UNIT_MULTIPLIER: Record<string, number> = {
  K: FOLLOWERS_K,
  M: FOLLOWERS_M,
  B: FOLLOWERS_B,
  T: FOLLOWERS_T,
}

export function formatFollowerCount(count: number) {
  if (!Number.isFinite(count) || count < 0) return '0'
  const formatCompact = (value: number, suffix: string) => {
    const text =
      value >= 100
        ? value.toFixed(0)
        : value.toFixed(1).replace(/\.0$/, '')
    return `${text}${suffix}`
  }

  if (count >= FOLLOWERS_T) return formatCompact(count / FOLLOWERS_T, 'T')
  if (count >= FOLLOWERS_B) return formatCompact(count / FOLLOWERS_B, 'B')
  if (count >= FOLLOWERS_M) return formatCompact(count / FOLLOWERS_M, 'M')
  if (count >= FOLLOWERS_K) return formatCompact(count / FOLLOWERS_K, 'K')
  return String(Math.trunc(count))
}

/**
 * 解析粉丝数输入：支持纯数字，或带单位（K/M/B/T，大小写均可）。
 * 例：`128600`、`128.6K`、`1.5M`、`2B`
 */
export function parseFollowerInput(raw: string): number | null {
  const text = raw.trim().replace(/,/g, '').replace(/\s+/g, '')
  if (!text) return 0
  const matched = text.match(/^(\d+(?:\.\d+)?)([kKmMbBtT])?$/)
  if (!matched) return null
  const value = Number.parseFloat(matched[1])
  if (!Number.isFinite(value) || value < 0) return null
  const unit = (matched[2] ?? '').toUpperCase()
  const multiplier = unit ? FOLLOWER_UNIT_MULTIPLIER[unit] : 1
  return Math.round(value * multiplier)
}

/** 供 date 输入回填（YYYY-MM-DD） */
export function toDateInputValue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatNodeExpiresAt(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getExpiryStartOfDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isNodeExpired(value?: string) {
  const expiryDay = value ? getExpiryStartOfDay(value) : null
  if (!expiryDay) return false
  const today = new Date()
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  return expiryDay.getTime() < todayStart.getTime()
}

export function getDaysUntilNodeExpiry(value?: string) {
  const expiryDay = value ? getExpiryStartOfDay(value) : null
  if (!expiryDay) return null
  const today = new Date()
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  return Math.round(
    (expiryDay.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
  )
}

/** 是否进入提前提醒窗口（含已到期） */
export function isNodeExpiryAlert(
  value: string | undefined,
  remindDays: number
) {
  const diffDays = getDaysUntilNodeExpiry(value)
  if (diffDays === null) return false
  const safeDays = Math.max(0, Math.floor(remindDays))
  return diffDays <= safeDays
}

export function getNodeExpiryHint(
  value: string | undefined,
  remindDays: number
) {
  const diffDays = getDaysUntilNodeExpiry(value)
  if (diffDays === null) return ''
  if (diffDays < 0) return '已到期'
  if (diffDays > Math.max(0, Math.floor(remindDays))) return ''
  if (diffDays === 0) return '今天到期'
  return `还剩 ${diffDays} 天`
}

export const DEFAULT_NODE_EXPIRY_REMIND_DAYS = 7
